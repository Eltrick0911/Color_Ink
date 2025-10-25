<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Config\Security;
use App\Config\responseHTTP;

class AuthController
{
    private $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Cargar variables de entorno si no están cargadas
        $this->loadEnvVariables();
    }
    
    private function loadEnvVariables(): void
    {
        if (empty($_ENV['FIREBASE_PROJECT_ID'])) {
            // Intentar cargar desde .env primero
            $envFile = dirname(__DIR__, 2) . '/.env';
            if (file_exists($envFile)) {
                $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                        list($key, $value) = explode('=', $line, 2);
                        $_ENV[trim($key)] = trim($value);
                    }
                }
            }
            
            // Si aún no están las variables, cargar desde firebase_config.php
            if (empty($_ENV['FIREBASE_PROJECT_ID'])) {
                $configFile = dirname(__DIR__) . '/Config/firebase_config.php';
                if (file_exists($configFile)) {
                    $config = require $configFile;
                    $_ENV['FIREBASE_PROJECT_ID'] = $config['project_id'];
                    $_ENV['FIREBASE_WEB_API_KEY'] = $config['web_api_key'];
                }
            }
        }
    }

    public function register(array $input): void
    {
        error_log('AuthController - register: Datos recibidos: ' . json_encode($input));
        
        $nombreUsuario = trim($input['nombre_usuario'] ?? '');
        $correo = trim($input['correo'] ?? '');
        $contrasena = (string)($input['contrasena'] ?? '');
        $telefono = $input['telefono'] ?? null;
        $idRol = isset($input['id_rol']) ? (int)$input['id_rol'] : 2; // Por defecto usuario común
        
        error_log('AuthController - register: Datos procesados - Nombre: ' . $nombreUsuario . ', Email: ' . $correo . ', Rol: ' . $idRol);

        // Validaciones
        if (empty($nombreUsuario)) {
            echo json_encode(responseHTTP::status400('El nombre es requerido'));
            return;
        }
        if (!$this->isValidEmail($correo)) {
            echo json_encode(responseHTTP::status400('Correo inválido'));
            return;
        }
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

        // Crear hash de la contraseña
        $hash = Security::createPassword($contrasena);
        
        // Crear el usuario en la base de datos
        $res = $this->userModel->createUser($nombreUsuario, $correo, $hash, $telefono, $idRol);
        
        if (isset($res['status']) && $res['status'] === 'OK') {
            // Crear el usuario también en Firebase
            $firebaseResult = $this->createFirebaseUser($correo, $contrasena, $nombreUsuario);
            
            if ($firebaseResult['success']) {
                // Usuario creado exitosamente en BD y Firebase
                http_response_code(201);
                $response = [
                    'status' => 'OK',
                    'message' => 'Usuario creado exitosamente en BD y Firebase',
                    'data' => $res['data']
                ];
                echo json_encode($response);
            } else {
                // Usuario creado en BD pero falló en Firebase
                error_log('AuthController - Error creando usuario en Firebase: ' . $firebaseResult['message']);
                http_response_code(201);
                $response = [
                    'status' => 'OK',
                    'message' => 'Usuario creado en BD, pero hubo un problema con Firebase',
                    'data' => $res['data']
                ];
                echo json_encode($response);
            }
        } else {
            echo json_encode(responseHTTP::status500());
        }
    }

    public function login(array $input): void
    {
        $usuario = trim($input['usuario'] ?? ''); // correo o telefono
        $contrasena = (string)($input['contrasena'] ?? '');
        if ($usuario === '' || $contrasena === '') {
            echo json_encode(responseHTTP::status400('Usuario y contraseña son requeridos'));
            return;
        }

        // Usar el nuevo método de autenticación que incluye control de intentos fallidos
        $authResult = $this->userModel->authenticateUser($usuario, $contrasena);
        
        if (!$authResult['success']) {
            echo json_encode(responseHTTP::status401($authResult['message']));
            return;
        }

        $user = $authResult['user'];
        $payload = [
            'id_usuario' => $user['id_usuario'],
            'nombre_usuario' => $user['nombre_usuario'],
            'id_rol' => $user['id_rol']
        ];
        $token = Security::createTokenJwt(Security::secretKey(), $payload);

        $_SESSION['token'] = $token;
        $_SESSION['user'] = $payload;

        echo json_encode(responseHTTP::status200('Login exitoso') + ['data' => ['token' => $token, 'user' => $payload]]);
    }

    public function me(): void
    {
        // Intentar obtener token desde headers primero (JWT)
        $headers = getallheaders();
        $token = null;
        
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }
        
        // Si hay token en headers, validarlo
        if ($token) {
            try {
                $tokenData = Security::validateTokenJwt($headers, Security::secretKey());
                $data = json_decode(json_encode($tokenData), true);
                $user = $data['data'] ?? null;
                
                if ($user) {
                    echo json_encode(responseHTTP::status200('OK') + ['data' => ['user' => $user]]);
                    return;
                }
            } catch (\Throwable $e) {
                error_log('Error validando JWT en /me: ' . $e->getMessage());
            }
        }
        
        // Fallback a sesión si no hay token válido en headers
        if (!isset($_SESSION['token'])) {
            echo json_encode(responseHTTP::status401('No autenticado'));
            return;
        }
        echo json_encode(responseHTTP::status200('OK') + ['data' => ['token' => $_SESSION['token'], 'user' => $_SESSION['user']]]);
    }

    public function logout(): void
    {
        $_SESSION = [];
        if (session_id() !== '' || isset($_COOKIE[session_name()])) {
            setcookie(session_name(), '', time() - 3600, '/');
        }
        session_destroy();
        echo json_encode(responseHTTP::status200('Sesión cerrada'));
    }

    private function isValidEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    private function isStrongPassword(string $password): bool
    {
        if (strlen($password) < 6) return false;
        if (!preg_match('/[A-Z]/', $password)) return false;
        if (!preg_match('/[0-9]/', $password)) return false;
        if (!preg_match('/[^a-zA-Z0-9]/', $password)) return false;
        return true;
    }

    /**
     * Determina el rol del usuario: primer usuario = administrador, resto = usuario común
     */
    private function getUserRole(): int
    {
        try {
            // Contar usuarios existentes en la base de datos
            $db = \App\DB\connectionDB::getConnection();
            $stmt = $db->query("SELECT COUNT(*) as total FROM usuario");
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            $totalUsuarios = (int)$result['total'];
            
            // Si no hay usuarios, este será el administrador
            if ($totalUsuarios === 0) {
                return 1; // Administrador
            }
            
            // Si ya hay usuarios, este será usuario común
            return 2; // Usuario común
            
        } catch (\Throwable $e) {
            error_log('Error getUserRole: ' . $e->getMessage());
            // En caso de error, asignar como usuario común por seguridad
            return 2;
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
            
            error_log('AuthController - createFirebaseUser: Config cargado: ' . json_encode($config));
            error_log('AuthController - createFirebaseUser: Project ID: ' . $projectId);
            error_log('AuthController - createFirebaseUser: Web API Key: ' . (empty($webApiKey) ? 'VACÍO' : 'CONFIGURADO'));
            
            error_log('AuthController - createFirebaseUser: Project ID: ' . $projectId);
            error_log('AuthController - createFirebaseUser: Web API Key: ' . (empty($webApiKey) ? 'VACÍO' : 'CONFIGURADO'));
            
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
                error_log('AuthController - Usuario creado en Firebase: ' . $email);
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


