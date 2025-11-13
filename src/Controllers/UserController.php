<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Config\Security;
use App\Config\responseHTTP;
use App\Controllers\FirebaseController;

class UserController
{
    private $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    private function authorize(array $headers, ?array $roles = null): ?array
    {
        error_log('UserController - authorize: Iniciando autorización');
        error_log('UserController - Headers recibidos: ' . json_encode($headers));
        
        // 1) Intentar Firebase ID Token primero (más común en este sistema)
        $fb = new FirebaseController();
        $idToken = $this->extractBearer($headers);
        error_log('UserController - Firebase token extraído: ' . ($idToken ? 'Presente' : 'No presente'));
        
        if ($idToken) {
            $claims = $fb->verifyIdToken($idToken);
            error_log('UserController - Firebase claims: ' . json_encode($claims));
            if ($claims) {
                // Mapear a usuario real de BD si existe por correo
                $correo = $claims['email'] ?? null;
                $nombre = $claims['name'] ?? ($claims['email'] ?? 'FirebaseUser');
                $userModel = new UserModel();
                $row = $correo ? $userModel->getUserByEmailOrPhone($correo) : null;
                
                if ($row) {
                    $user = [
                        'id_usuario' => (int)$row['id_usuario'],
                        'nombre_usuario' => $row['nombre_usuario'],
                        'id_rol' => (int)$row['id_rol'],
                        'email' => $row['correo']
                    ];
                    error_log('UserController - Usuario encontrado en BD: ' . json_encode($user));
                } else {
                    error_log('UserController - Usuario no encontrado en BD, usando claims de Firebase');
                    // Usar datos de Firebase como fallback
                    $user = [
                        'id_usuario' => $claims['user_id'] ?? ($claims['sub'] ?? 0),
                        'nombre_usuario' => $nombre,
                        'id_rol' => 2, // Usuario común por defecto
                        'email' => $correo
                    ];
                }
            } else {
                error_log('UserController - Token Firebase expirado o inválido');
            }
        }

        // 2) Intentar JWT local si no hay Firebase válido
        if (!isset($user)) {
            try {
                error_log('UserController - Intentando validar JWT local');
                // Solo intentar JWT local si el token no parece ser de Firebase
                $token = $this->extractBearer($headers);
                if ($token && !str_contains($token, 'eyJhbGciOiJSUzI1NiIs')) {
                    $tokenData = Security::validateTokenJwt($headers, Security::secretKey());
                    $data = json_decode(json_encode($tokenData), true);
                    $user = $data['data'] ?? null;
                    error_log('UserController - JWT válido, usuario: ' . json_encode($user));
                } else {
                    error_log('UserController - Token parece ser de Firebase, saltando validación JWT local');
                    $user = null;
                }
            } catch (\Throwable $e) {
                error_log('UserController - JWT inválido: ' . $e->getMessage());
                $user = null;
            }
        }

        if (!$user) {
            error_log('UserController - No se pudo obtener usuario válido');
            echo json_encode(responseHTTP::status401('No tiene privilegios para acceder al recurso! Token invalido o ha expirado'));
            return null;
        }
        
        error_log('UserController - Usuario autorizado: ' . json_encode($user));
        error_log('UserController - Roles requeridos: ' . json_encode($roles));
        error_log('UserController - Rol del usuario: ' . $user['id_rol']);
        
        if ($roles && !in_array((int)$user['id_rol'], $roles)) {
            error_log('UserController - Usuario no tiene permisos para esta acción');
            echo json_encode(responseHTTP::status401('No tiene privilegios para acceder al recurso!'));
            return null;
        }
        
        error_log('UserController - Autorización exitosa');
        return $user;
    }

    private function extractBearer(array $headers): ?string
    {
        if (!isset($headers['Authorization'])) return null;
        $parts = explode(' ', $headers['Authorization']);
        if (count($parts) === 2 && strtolower($parts[0]) === 'bearer') {
            return $parts[1];
        }
        return null;
    }


    // Nota: evitar nombre reservado 'list' en PHP
    public function listUsersAction(array $headers): void
    {
        $auth = $this->authorize($headers, [1]); // solo admin
        if (!$auth) return;
        
        error_log('UserController - list: Obteniendo lista de usuarios');
        $users = $this->userModel->listUsers();
        error_log('UserController - list: Usuarios obtenidos: ' . json_encode($users));
        
        // Crear respuesta personalizada
        http_response_code(200);
        $response = [
            'status' => 'OK',
            'message' => 'OK',
            'data' => $users
        ];
        error_log('UserController - list: Respuesta final: ' . json_encode($response));
        
        echo json_encode($response);
    }

    public function create(array $headers, array $input): void
    {
        $auth = $this->authorize($headers, [1]); // solo admin
        if (!$auth) return;
        
        error_log('UserController - create: Iniciando creación de usuario');
        
        // Validar datos requeridos
        $nombreUsuario = trim($input['nombre_usuario'] ?? '');
        $correo = trim($input['correo'] ?? '');
        $contrasena = (string)($input['contrasena'] ?? '');
        $telefono = $input['telefono'] ?? null;
        $idRol = (int)($input['id_rol'] ?? 2);
        
        if (empty($nombreUsuario) || empty($correo) || empty($contrasena)) {
            echo json_encode(responseHTTP::status400('Datos requeridos faltantes'));
            return;
        }
        
        // Validar email
        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(responseHTTP::status400('Correo inválido'));
            return;
        }
        
        // Validar longitud de contraseña
        if (strlen($contrasena) < 6) {
            echo json_encode(responseHTTP::status400('La contraseña debe tener al menos 6 caracteres'));
            return;
        }
        
        // Verificar si el correo ya existe
        $existente = $this->userModel->getUserByEmailOrPhone($correo);
        if ($existente) {
            echo json_encode(responseHTTP::status400('El correo ya está registrado'));
            return;
        }
        
        // Crear hash de la contraseña (IMPORTANTE: hashear antes de guardar)
        $hash = Security::createPassword($contrasena);
        
        // Crear usuario en BD con la contraseña hasheada
        $result = $this->userModel->createUser($nombreUsuario, $correo, $hash, $telefono, $idRol);
        
        if (isset($result['status']) && $result['status'] === 'OK') {
            // Crear usuario también en Firebase
            $firebaseResult = $this->createFirebaseUser($correo, $contrasena, $nombreUsuario);
            
            if ($firebaseResult['success']) {
                // Usuario creado exitosamente en BD y Firebase
                http_response_code(201);
                $response = [
                    'status' => 'OK',
                    'message' => 'Usuario creado exitosamente en BD y Firebase',
                    'data' => $result['data']
                ];
                echo json_encode($response);
            } else {
                // Usuario creado en BD pero falló en Firebase
                error_log('UserController - create: Error creando usuario en Firebase: ' . $firebaseResult['message']);
                http_response_code(201);
                $response = [
                    'status' => 'OK',
                    'message' => 'Usuario creado en BD, pero hubo un problema con Firebase',
                    'data' => $result['data']
                ];
                echo json_encode($response);
            }
        } else {
            echo json_encode(responseHTTP::status500());
        }
    }

    public function getById(array $headers, int $id): void
    {
        $auth = $this->authorize($headers, [1, 2]);
        if (!$auth) return;
        if ((int)$auth['id_rol'] !== 1 && (int)$auth['id_usuario'] !== $id) {
            echo json_encode(responseHTTP::status401('No autorizado'));
            return;
        }
        $user = $this->userModel->getUserById($id);
        // Crear respuesta personalizada
        http_response_code(200);
        $response = [
            'status' => 'OK',
            'message' => 'OK',
            'data' => $user
        ];
        echo json_encode($response);
    }

    public function update(array $headers, int $id, array $input): void
    {
        $auth = $this->authorize($headers, [1, 2]);
        if (!$auth) return;
        if ((int)$auth['id_rol'] !== 1 && (int)$auth['id_usuario'] !== $id) {
            echo json_encode(responseHTTP::status401('No autorizado'));
            return;
        }
        
        $nombreUsuario = trim($input['nombre_usuario'] ?? '');
        $correo = trim($input['correo'] ?? '');
        $telefono = $input['telefono'] ?? null;
        $contrasena = $input['contrasena'] ?? '';
        $idRol = isset($input['id_rol']) ? (int)$input['id_rol'] : (int)$auth['id_rol'];

        $hash = $contrasena ? Security::createPassword($contrasena) : null;
        $ok = $this->userModel->updateUser($id, $nombreUsuario, $correo, $hash, $telefono, $idRol);
        echo json_encode($ok ? responseHTTP::status200('Usuario actualizado correctamente') : responseHTTP::status500());
    }

    public function delete(array $headers, int $id): void
    {
        $auth = $this->authorize($headers, [1, 2]);
        if (!$auth) return;
        if ((int)$auth['id_rol'] !== 1 && (int)$auth['id_usuario'] !== $id) {
            echo json_encode(responseHTTP::status401('No autorizado'));
            return;
        }
        
        // Obtener información del usuario antes de eliminarlo
        $user = $this->userModel->getUserById($id);
        if (!$user) {
            echo json_encode(responseHTTP::status404('Usuario no encontrado'));
            return;
        }
        
        error_log('UserController - delete: Usuario encontrado - ID: ' . $id . ', Email: ' . ($user['correo'] ?? 'N/A'));
        
        // Primero agregar a lista negra para prevenir re-login
        if (isset($user['correo']) && !empty($user['correo'])) {
            $this->addToBlacklist($user['correo'], $auth['id_usuario'], 'Usuario eliminado');
        }
        
        // Luego intentar eliminar de BD
        // Si tiene FK constraints, quedará bloqueado por blacklist pero permanecerá en la BD
        // Si no tiene FK, se eliminará y el trigger registrará en usuario_aud
        $ok = $this->userModel->deleteUser($id);
        
        if ($ok) {
            error_log('UserController - delete: Usuario eliminado exitosamente de la BD y agregado a blacklist');
            echo json_encode(responseHTTP::status200('Usuario eliminado correctamente'));
        } else {
            error_log('UserController - delete: Usuario agregado a blacklist (no se pudo eliminar de BD por FK constraints)');
            // Aunque el DELETE falle, el usuario está bloqueado por blacklist
            echo json_encode(responseHTTP::status200('Usuario bloqueado en lista negra (tiene registros asociados)'));
        }
    }

    public function block(array $headers, int $id): void
    {
        $auth = $this->authorize($headers, [1, 2]);
        if (!$auth) return;
        if ((int)$auth['id_rol'] !== 1 && (int)$auth['id_usuario'] !== $id) {
            echo json_encode(responseHTTP::status401('No autorizado'));
            return;
        }
        
        // Obtener información del usuario
        $user = $this->userModel->getUserById($id);
        if (!$user) {
            echo json_encode(responseHTTP::status404('Usuario no encontrado'));
            return;
        }
        
        error_log('UserController - block: Usuario encontrado - ID: ' . $id . ', Email: ' . ($user['correo'] ?? 'N/A'));
        
        // Solo agregar a lista negra, mantener en BD
        if (isset($user['correo']) && !empty($user['correo'])) {
            $this->addToBlacklist($user['correo'], $auth['id_usuario'], 'Usuario bloqueado');
        }
        
        error_log('UserController - block: Usuario bloqueado exitosamente');
        echo json_encode(responseHTTP::status200('Usuario bloqueado correctamente'));
    }

    public function unblock(array $headers, int $id): void
    {
        $auth = $this->authorize($headers, [1, 2]);
        if (!$auth) return;
        if ((int)$auth['id_rol'] !== 1 && (int)$auth['id_usuario'] !== $id) {
            echo json_encode(responseHTTP::status401('No autorizado'));
            return;
        }
        
        // Obtener información del usuario
        $user = $this->userModel->getUserById($id);
        if (!$user) {
            echo json_encode(responseHTTP::status404('Usuario no encontrado'));
            return;
        }
        
        error_log('UserController - unblock: Usuario encontrado - ID: ' . $id . ', Email: ' . ($user['correo'] ?? 'N/A'));
        
        // Remover de lista negra
        if (isset($user['correo']) && !empty($user['correo'])) {
            $this->removeFromBlacklist($user['correo']);
        }
        
        error_log('UserController - unblock: Usuario desbloqueado exitosamente');
        echo json_encode(responseHTTP::status200('Usuario desbloqueado correctamente'));
    }

    /**
     * Elimina un usuario de Firebase usando Firebase Admin SDK
     */
    private function deleteFirebaseUserByEmail(string $email): array
    {
        try {
            error_log('UserController - deleteFirebaseUserByEmail: Iniciando eliminación de Firebase para: ' . $email);
            
            // Cargar configuración de Firebase Admin
            $configFile = dirname(__DIR__) . '/Config/firebase_admin_config.php';
            if (!file_exists($configFile)) {
                error_log('UserController - deleteFirebaseUserByEmail: Archivo de configuración de Firebase Admin no encontrado');
                return [
                    'success' => false,
                    'message' => 'Archivo de configuración de Firebase Admin no encontrado'
                ];
            }
            
            $config = require $configFile;
            
            // Obtener token de acceso de Google
            $accessToken = $this->getGoogleAccessToken($config);
            if (!$accessToken) {
                return [
                    'success' => false,
                    'message' => 'No se pudo obtener token de acceso de Google'
                ];
            }
            
            // Buscar el UID del usuario por email
            $uid = $this->getFirebaseUserUIDByEmail($email, $accessToken);
            if (!$uid) {
                error_log('UserController - deleteFirebaseUserByEmail: Usuario no encontrado en Firebase: ' . $email);
                return [
                    'success' => false,
                    'message' => 'Usuario no encontrado en Firebase'
                ];
            }
            
            // Eliminar el usuario usando Firebase Admin API
            $deleteResult = $this->deleteFirebaseUserByUID($uid, $accessToken);
            
            if ($deleteResult['success']) {
                error_log('UserController - deleteFirebaseUserByEmail: Usuario eliminado exitosamente de Firebase: ' . $email);
                return [
                    'success' => true,
                    'message' => 'Usuario eliminado de Firebase'
                ];
            } else {
                error_log('UserController - deleteFirebaseUserByEmail: Error eliminando usuario: ' . $deleteResult['message']);
                return $deleteResult;
            }

        } catch (\Throwable $e) {
            error_log('Error deleteFirebaseUserByEmail: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error interno: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Elimina un usuario de Firebase usando la REST API (método anterior)
     */
    private function deleteFirebaseUser(string $email): array
    {
        try {
            error_log('UserController - deleteFirebaseUser: Iniciando eliminación para email: ' . $email);
            
            // Cargar configuración de Firebase
            $configFile = dirname(__DIR__) . '/Config/firebase_config.php';
            if (!file_exists($configFile)) {
                error_log('UserController - deleteFirebaseUser: Archivo de configuración no encontrado');
                return [
                    'success' => false,
                    'message' => 'Archivo de configuración de Firebase no encontrado'
                ];
            }
            
            $config = require $configFile;
            $webApiKey = $config['web_api_key'] ?? '';
            
            error_log('UserController - deleteFirebaseUser: Web API Key cargado: ' . (empty($webApiKey) ? 'VACÍO' : 'PRESENTE'));
            
            if (empty($webApiKey)) {
                return [
                    'success' => false,
                    'message' => 'FIREBASE_WEB_API_KEY no configurado'
                ];
            }

            // Primero, obtener el UID del usuario por email
            error_log('UserController - deleteFirebaseUser: Buscando UID para email: ' . $email);
            $uid = $this->getFirebaseUserUID($email, $webApiKey);
            
            if (!$uid) {
                error_log('UserController - deleteFirebaseUser: UID no encontrado para email: ' . $email);
                return [
                    'success' => false,
                    'message' => 'Usuario no encontrado en Firebase'
                ];
            }
            
            error_log('UserController - deleteFirebaseUser: UID encontrado: ' . $uid);

            // Eliminar el usuario usando el UID
            $url = "https://identitytoolkit.googleapis.com/v1/accounts:delete?key=" . $webApiKey;
            error_log('UserController - deleteFirebaseUser: URL de eliminación: ' . $url);
            
            $data = [
                'localId' => $uid
            ];

            $options = [
                'http' => [
                    'header' => "Content-Type: application/json\r\n",
                    'method' => 'POST',
                    'content' => json_encode($data),
                    'timeout' => 10
                ]
            ];

            $context = stream_context_create($options);
            $result = file_get_contents($url, false, $context);

            if ($result === false) {
                return [
                    'success' => false,
                    'message' => 'Error de conexión con Firebase'
                ];
            }

            $response = json_decode($result, true);

            if (isset($response['error'])) {
                error_log('Firebase Delete Error: ' . json_encode($response['error']));
                return [
                    'success' => false,
                    'message' => 'Firebase: ' . ($response['error']['message'] ?? 'Error desconocido')
                ];
            }

            return [
                'success' => true,
                'message' => 'Usuario eliminado de Firebase'
            ];

        } catch (\Throwable $e) {
            error_log('Error deleteFirebaseUser: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error interno: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Obtiene el UID de un usuario de Firebase por email
     */
    private function getFirebaseUserUID(string $email, string $webApiKey): ?string
    {
        try {
            error_log('UserController - getFirebaseUserUID: Buscando UID para email: ' . $email);
            
            // Usar la API de Firebase Admin REST para buscar usuarios
            $url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" . $webApiKey;
            error_log('UserController - getFirebaseUserUID: URL de búsqueda: ' . $url);
            
            // Formato correcto para la API de Firebase
            $data = [
                'email' => [$email]  // Firebase espera un array de emails
            ];

            $options = [
                'http' => [
                    'header' => "Content-Type: application/json\r\n",
                    'method' => 'POST',
                    'content' => json_encode($data),
                    'timeout' => 10
                ]
            ];

            $context = stream_context_create($options);
            $result = file_get_contents($url, false, $context);

            if ($result === false) {
                error_log('UserController - getFirebaseUserUID: Error en la petición HTTP');
                return null;
            }

            error_log('UserController - getFirebaseUserUID: Respuesta de Firebase: ' . $result);
            $response = json_decode($result, true);

            if (isset($response['users']) && count($response['users']) > 0) {
                $uid = $response['users'][0]['localId'] ?? null;
                error_log('UserController - getFirebaseUserUID: UID encontrado: ' . $uid);
                return $uid;
            }

            error_log('UserController - getFirebaseUserUID: No se encontraron usuarios en la respuesta');
            return null;

        } catch (\Throwable $e) {
            error_log('Error getFirebaseUserUID: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Obtiene un token de acceso de Google usando las credenciales de servicio
     */
    private function getGoogleAccessToken(array $config): ?string
    {
        try {
            error_log('UserController - getGoogleAccessToken: Obteniendo token de acceso de Google');
            
            $url = 'https://oauth2.googleapis.com/token';
            
            $data = [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $this->createJWT($config)
            ];
            
            $options = [
                'http' => [
                    'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                    'method' => 'POST',
                    'content' => http_build_query($data),
                    'timeout' => 30
                ]
            ];
            
            $context = stream_context_create($options);
            $result = file_get_contents($url, false, $context);
            
            if ($result === false) {
                error_log('UserController - getGoogleAccessToken: Error en la petición HTTP');
                return null;
            }
            
            $response = json_decode($result, true);
            
            if (isset($response['access_token'])) {
                error_log('UserController - getGoogleAccessToken: Token obtenido exitosamente');
                return $response['access_token'];
            }
            
            error_log('UserController - getGoogleAccessToken: Error en respuesta: ' . $result);
            return null;
            
        } catch (\Throwable $e) {
            error_log('Error getGoogleAccessToken: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Crea un JWT para autenticación con Google
     */
    private function createJWT(array $config): string
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'RS256']);
        $now = time();
        
        $payload = json_encode([
            'iss' => $config['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now
        ]);
        
        $headerEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $payloadEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = '';
        openssl_sign($headerEncoded . '.' . $payloadEncoded, $signature, $config['private_key'], 'SHA256');
        $signatureEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    }

    /**
     * Busca el UID de un usuario en Firebase por email usando Firebase Admin API
     */
    private function getFirebaseUserUIDByEmail(string $email, string $accessToken): ?string
    {
        try {
            error_log('UserController - getFirebaseUserUIDByEmail: Buscando UID para email: ' . $email);
            
            $url = 'https://identitytoolkit.googleapis.com/v1/projects/miappwebinkproject/accounts:query';
            
            $data = [
                'expression' => [
                    'email' => $email
                ]
            ];
            
            $options = [
                'http' => [
                    'header' => "Authorization: Bearer " . $accessToken . "\r\nContent-Type: application/json\r\n",
                    'method' => 'POST',
                    'content' => json_encode($data),
                    'timeout' => 10
                ]
            ];
            
            $context = stream_context_create($options);
            $result = file_get_contents($url, false, $context);
            
            if ($result === false) {
                error_log('UserController - getFirebaseUserUIDByEmail: Error en la petición HTTP');
                return null;
            }
            
            $response = json_decode($result, true);
            
            if (isset($response['users']) && count($response['users']) > 0) {
                $uid = $response['users'][0]['localId'] ?? null;
                error_log('UserController - getFirebaseUserUIDByEmail: UID encontrado: ' . $uid);
                return $uid;
            }
            
            error_log('UserController - getFirebaseUserUIDByEmail: Usuario no encontrado');
            return null;
            
        } catch (\Throwable $e) {
            error_log('Error getFirebaseUserUIDByEmail: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Elimina un usuario de Firebase usando su UID
     */
    private function deleteFirebaseUserByUID(string $uid, string $accessToken): array
    {
        try {
            error_log('UserController - deleteFirebaseUserByUID: Eliminando usuario con UID: ' . $uid);
            
            $url = 'https://identitytoolkit.googleapis.com/v1/projects/miappwebinkproject/accounts:delete';
            
            $data = [
                'localId' => $uid
            ];
            
            $options = [
                'http' => [
                    'header' => "Authorization: Bearer " . $accessToken . "\r\nContent-Type: application/json\r\n",
                    'method' => 'POST',
                    'content' => json_encode($data),
                    'timeout' => 10
                ]
            ];
            
            $context = stream_context_create($options);
            $result = file_get_contents($url, false, $context);
            
            if ($result === false) {
                return [
                    'success' => false,
                    'message' => 'Error de conexión con Firebase'
                ];
            }
            
            $response = json_decode($result, true);
            
            if (isset($response['error'])) {
                error_log('Firebase Delete Error: ' . json_encode($response['error']));
                return [
                    'success' => false,
                    'message' => 'Firebase: ' . ($response['error']['message'] ?? 'Error desconocido')
                ];
            }
            
            return [
                'success' => true,
                'message' => 'Usuario eliminado de Firebase'
            ];
            
        } catch (\Throwable $e) {
            error_log('Error deleteFirebaseUserByUID: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error interno: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Agrega un email a la lista negra usando procedimiento almacenado
     */
    private function addToBlacklist(string $email, int $eliminadoPor, string $razon = 'Eliminado por administrador'): void
    {
        try {
            $db = \App\DB\connectionDB::getConnection();
            $stmt = $db->prepare("CALL sp_agregar_lista_negra(:email, :eliminado_por, :razon)");
            $stmt->bindParam(':email', $email, \PDO::PARAM_STR);
            $stmt->bindParam(':eliminado_por', $eliminadoPor, \PDO::PARAM_INT);
            $stmt->bindParam(':razon', $razon, \PDO::PARAM_STR);
            $stmt->execute();
            
            // Limpiar cursores adicionales de CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            error_log('UserController - addToBlacklist: Email agregado a lista negra: ' . $email . ' - Razón: ' . $razon);
        } catch (\Throwable $e) {
            error_log('Error addToBlacklist: ' . $e->getMessage());
        }
    }

    /**
     * Remueve un email de la lista negra usando procedimiento almacenado
     */
    private function removeFromBlacklist(string $email): void
    {
        try {
            $db = \App\DB\connectionDB::getConnection();
            $stmt = $db->prepare("CALL sp_remover_lista_negra(:email)");
            $stmt->bindParam(':email', $email, \PDO::PARAM_STR);
            $stmt->execute();
            
            // Limpiar cursores adicionales de CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            error_log('UserController - removeFromBlacklist: Email removido de lista negra: ' . $email);
        } catch (\Throwable $e) {
            error_log('Error removeFromBlacklist: ' . $e->getMessage());
        }
    }

    /**
     * Crea un usuario en Firebase usando la REST API
     */
    private function createFirebaseUser(string $email, string $password, string $displayName): array
    {
        try {
            // Cargar configuración desde firebase_config.php
            $configPath = __DIR__ . '/../Config/firebase_config.php';
            if (!file_exists($configPath)) {
                return [
                    'success' => false,
                    'message' => 'Archivo firebase_config.php no encontrado'
                ];
            }
            
            $config = require_once $configPath;
            $projectId = $config['project_id'] ?? '';
            $webApiKey = $config['web_api_key'] ?? '';
            
            error_log('UserController - createFirebaseUser: Project ID: ' . $projectId);
            error_log('UserController - createFirebaseUser: Web API Key: ' . (empty($webApiKey) ? 'VACÍO' : 'CONFIGURADO'));
            
            if (empty($projectId)) {
                return [
                    'success' => false,
                    'message' => 'project_id no configurado en firebase_config.php'
                ];
            }
            
            if (empty($webApiKey)) {
                return [
                    'success' => false,
                    'message' => 'web_api_key no configurado en firebase_config.php'
                ];
            }

            // URL de la Firebase Auth REST API
            $url = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" . $webApiKey;
            
            // Datos para crear el usuario
            $data = [
                'email' => $email,
                'password' => $password,
                'displayName' => $displayName,
                'returnSecureToken' => true
            ];

            // Configurar la petición HTTP
            $options = [
                'http' => [
                    'header' => "Content-Type: application/json\r\n",
                    'method' => 'POST',
                    'content' => json_encode($data),
                    'timeout' => 10
                ]
            ];

            $context = stream_context_create($options);
            $result = file_get_contents($url, false, $context);

            if ($result === false) {
                return [
                    'success' => false,
                    'message' => 'Error de conexión con Firebase'
                ];
            }

            $response = json_decode($result, true);

            if (isset($response['error'])) {
                error_log('Firebase Auth Error: ' . json_encode($response['error']));
                return [
                    'success' => false,
                    'message' => 'Firebase: ' . ($response['error']['message'] ?? 'Error desconocido')
                ];
            }

            if (isset($response['localId'])) {
                error_log('UserController - createFirebaseUser: Usuario creado en Firebase: ' . $email);
                return [
                    'success' => true,
                    'message' => 'Usuario creado en Firebase',
                    'uid' => $response['localId']
                ];
            }

            return [
                'success' => false,
                'message' => 'Respuesta inesperada de Firebase'
            ];

        } catch (\Throwable $e) {
            error_log('Error createFirebaseUser: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error interno: ' . $e->getMessage()
            ];
        }
    }

}


