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
    }

    public function register(array $input): void
    {
        $nombre = trim($input['nombre'] ?? '');
        $apellido = trim($input['apellido'] ?? '');
        $correo = trim($input['correo'] ?? '');
        $contrasena = (string)($input['contrasena'] ?? '');
        $telefono = $input['telefono'] ?? null;

        if (!$this->isValidEmail($correo)) {
            echo json_encode(responseHTTP::status400('Correo inválido'));
            return;
        }
        if (!$this->isStrongPassword($contrasena)) {
            echo json_encode(responseHTTP::status400('Contraseña insegura: mínimo 6 caracteres, mayúsculas, números y símbolos'));
            return;
        }

        $existente = $this->userModel->getUserByEmailOrPhone($correo);
        if ($existente) {
            echo json_encode(responseHTTP::status400('El correo ya está registrado'));
            return;
        }

        $nombreCompleto = trim($nombre . ' ' . $apellido);
        $hash = Security::createPassword($contrasena);
        
        // Determinar el rol: primer usuario = administrador (1), resto = usuario común (2)
        $idRol = $this->getUserRole();
        
        $res = $this->userModel->createUser($nombreCompleto, $correo, $hash, $telefono, $idRol);
        echo json_encode($res);
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
}


