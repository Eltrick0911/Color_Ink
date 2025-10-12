<?php

namespace App\Controllers;

use App\Config\responseHTTP;
use Firebase\JWT\JWT;
use Firebase\JWT\JWK;
use App\Models\UserModel;
use App\Config\Security;

class FirebaseController
{
    private $projectId;
    private $jwksUrl = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

    public function __construct()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        // Si no se puede usar .env, permitimos derivar el projectId desde el token (claim 'aud')
        $this->projectId = $_ENV['FIREBASE_PROJECT_ID'] ?? '';
    }

    public function login(array $headers, array $input): void
    {
        $idToken = $this->extractBearer($headers) ?: ($input['idToken'] ?? '');
        if ($idToken === '') {
            echo json_encode(responseHTTP::status400('idToken requerido'));
            return;
        }
        $claims = $this->verifyIdToken($idToken);
        if (!$claims) {
            echo json_encode(responseHTTP::status401('Token inválido'));
            return;
        }
        // Sincronizar con BD por correo
        $correo = $claims['email'] ?? null;
        $nombre = $claims['name'] ?? ($claims['email'] ?? 'Usuario');
        $telefono = null;
        $userModel = new UserModel();
        $user = $correo ? $userModel->getUserByEmailOrPhone($correo) : null;
        if (!$user && $correo) {
            // Determinar el rol: primer usuario = administrador, resto = usuario común
            $idRol = $this->getUserRole();
            
            // Crear usuario con rol determinado automáticamente
            $randomPass = bin2hex(random_bytes(8));
            $hash = Security::createPassword($randomPass);
            $createRes = $userModel->createUser($nombre, $correo, $hash, $telefono, $idRol);
            // Intentar leerlo de nuevo
            $user = $userModel->getUserByEmailOrPhone($correo);
        }

        // Actualizar último acceso para usuarios existentes (Firebase login exitoso)
        if ($user && isset($user['id_usuario'])) {
            $this->updateLastAccess($user['id_usuario']);
        }

        // Preparar payload de sesión (si hay fila en BD usamos su id y rol)
        $payload = [
            'id_usuario' => isset($user['id_usuario']) ? (int)$user['id_usuario'] : ($claims['user_id'] ?? 0),
            'nombre_usuario' => $nombre,
            'id_rol' => isset($user['id_rol']) ? (int)$user['id_rol'] : 2,
            'email' => $correo
        ];

        // Debug: Log del payload antes de enviar
        error_log('FirebaseController - Payload a enviar: ' . json_encode($payload));
        error_log('FirebaseController - User desde BD: ' . json_encode($user));

        $_SESSION['firebase_token'] = $idToken;
        $_SESSION['firebase_user'] = $payload;
        
        // Construir respuesta correctamente
        $response = [
            'status' => 'OK',
            'message' => 'Login Firebase OK',
            'data' => [
                'user' => $payload
            ]
        ];
        
        error_log('FirebaseController - Respuesta completa: ' . json_encode($response));
        
        echo json_encode($response);
    }

    public function me(): void
    {
        if (!isset($_SESSION['firebase_user'])) {
            echo json_encode(responseHTTP::status401('No autenticado'));
            return;
        }
        echo json_encode(responseHTTP::status200('OK') + ['data' => $_SESSION['firebase_user']]);
    }

    public function logout(): void
    {
        unset($_SESSION['firebase_token'], $_SESSION['firebase_user']);
        echo json_encode(responseHTTP::status200('Sesión Firebase cerrada'));
    }

    public function verifyIdToken(string $idToken): ?array
    {
        try {
            $jwks = $this->fetchJwks();
            $keys = JWK::parseKeySet($jwks);
            // Firebase ID Tokens están firmados con RS256
            $decoded = JWT::decode($idToken, $keys, ['RS256']);
            $claims = json_decode(json_encode($decoded), true);
            if (!$this->validateFirebaseClaims($claims)) {
                return null;
            }
            return $claims;
        } catch (\Throwable $e) {
            error_log('Firebase verify error: ' . $e->getMessage());
            return null;
        }
    }

    private function fetchJwks(): array
    {
        $ctx = stream_context_create(['http' => ['timeout' => 3]]);
        $json = file_get_contents($this->jwksUrl, false, $ctx);
        return json_decode($json, true);
    }

    private function validateFirebaseClaims(array $claims): bool
    {
        $aud = $claims['aud'] ?? '';
        $iss = $claims['iss'] ?? '';

        // Si no tenemos projectId configurado, usar el 'aud' del token
        $projectId = $this->projectId !== '' ? $this->projectId : $aud;

        if ($aud !== $projectId) return false;
        $issExpected = 'https://securetoken.google.com/' . $projectId;
        if ($iss !== $issExpected) return false;
        if (!isset($claims['sub']) || $claims['sub'] === '') return false;
        return true;
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

    /**
     * Actualiza el último acceso del usuario en la base de datos
     */
    private function updateLastAccess(int $idUsuario): void
    {
        try {
            $userModel = new UserModel();
            // Usar una consulta directa para actualizar último acceso
            $db = \App\DB\connectionDB::getConnection();
            $stmt = $db->prepare("UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = :id");
            $stmt->bindParam(':id', $idUsuario, \PDO::PARAM_INT);
            $stmt->execute();
        } catch (\Throwable $e) {
            error_log('Error updateLastAccess: ' . $e->getMessage());
        }
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


