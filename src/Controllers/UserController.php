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


    public function list(array $headers): void
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
        $ok = $this->userModel->deleteUser($id);
        echo json_encode($ok ? responseHTTP::status200('Eliminado') : responseHTTP::status500());
    }
}


