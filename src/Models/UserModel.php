<?php

namespace App\Models;

use App\DB\connectionDB;
use App\Config\responseHTTP;
use App\Config\Security;
use PDO;

class UserModel
{
    private $db;

    public function __construct()
    {
        $this->db = connectionDB::getConnection();
    }

    public function createUser(string $nombreUsuario, string $correo, string $contrasenaHash, ?string $telefono, int $idRol): array
    {
        try {
            error_log('UserModel - createUser: Iniciando creación de usuario');
            error_log('UserModel - createUser: Parámetros - Nombre: ' . $nombreUsuario . ', Email: ' . $correo . ', Rol: ' . $idRol);
            
            // Verificar conexión a la base de datos
            if (!$this->db) {
                error_log('UserModel - createUser: Error - No hay conexión a la base de datos');
                return responseHTTP::status500();
            }
            
            // Usar consulta directa para obtener ID correctamente
            $stmt = $this->db->prepare("INSERT INTO usuario (nombre_usuario, correo, contrasena, password_updated_at, telefono, fecha_ingreso, ultimo_acceso, id_rol) VALUES (?, ?, ?, NOW(), ?, NOW(), NOW(), ?)");
            $stmt->bindParam(1, $nombreUsuario, PDO::PARAM_STR);
            $stmt->bindParam(2, $correo, PDO::PARAM_STR);
            $stmt->bindParam(3, $contrasenaHash, PDO::PARAM_STR);
            $stmt->bindParam(4, $telefono, PDO::PARAM_STR);
            $stmt->bindParam(5, $idRol, PDO::PARAM_INT);
            
            error_log('UserModel - createUser: Ejecutando consulta directa');
            $result = $stmt->execute();
            error_log('UserModel - createUser: Resultado de execute: ' . ($result ? 'true' : 'false'));

            // Obtener el último ID insertado
            $id = $this->db->lastInsertId();
            error_log('UserModel - createUser: ID insertado: ' . $id);
            
            return responseHTTP::status201() + [
                'data' => [
                    'id_usuario' => $id,
                    'correo' => $correo,
                    'nombre_usuario' => $nombreUsuario,
                    'id_rol' => $idRol
                ]
            ];
        } catch (\Throwable $e) {
            error_log('Error createUser: ' . $e->getMessage());
            error_log('Error createUser - Stack trace: ' . $e->getTraceAsString());
            return responseHTTP::status500();
        }
    }

    public function getUserByEmailOrPhone(string $usuario): ?array
    {
        try {
            $sql = "SELECT * FROM usuario WHERE correo = :usuario OR telefono = :usuario LIMIT 1";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':usuario', $usuario, PDO::PARAM_STR);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            return $user ?: null;
        } catch (\Throwable $e) {
            error_log('Error getUserByEmailOrPhone: ' . $e->getMessage());
            return null;
        }
    }

    public function getUserById(int $idUsuario): ?array
    {
        try {
            $stmt = $this->db->prepare("CALL sp_obtener_usuario(:id)");
            $stmt->bindParam(':id', $idUsuario, PDO::PARAM_INT);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            // Limpiar cursores adicionales de CALL
            while ($stmt->nextRowset()) { /* noop */ }
            return $user ?: null;
        } catch (\Throwable $e) {
            error_log('Error getUserById: ' . $e->getMessage());
            return null;
        }
    }

    public function listUsers(): array
    {
        try {
            error_log('UserModel - listUsers: Ejecutando consulta SQL');
            $stmt = $this->db->query("SELECT id_usuario, nombre_usuario, correo, telefono, fecha_ingreso, ultimo_acceso, id_rol, bloqueado_hasta FROM usuario ORDER BY id_usuario");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Verificar Lista Negra para cada usuario
            foreach ($users as &$user) {
                $user['is_blacklisted'] = $this->isUserBlacklisted($user['correo']);
            }
            
            error_log('UserModel - listUsers: Usuarios encontrados: ' . count($users));
            error_log('UserModel - listUsers: Datos: ' . json_encode($users));
            return $users ?: [];
        } catch (\Throwable $e) {
            error_log('Error listUsers: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Verifica si un usuario está en la lista negra
     */
    private function isUserBlacklisted(string $email): bool
    {
        try {
            $stmt = $this->db->prepare("CALL sp_verificar_lista_negra(:email)");
            $stmt->bindParam(':email', $email, PDO::PARAM_STR);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Limpiar cursores adicionales de CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            return isset($result['en_lista_negra']) && $result['en_lista_negra'] == 1;
        } catch (\Throwable $e) {
            error_log('Error isUserBlacklisted: ' . $e->getMessage());
            return false;
        }
    }

    public function updateUser(int $idUsuario, string $nombreUsuario, string $correo, ?string $contrasenaHash, ?string $telefono, int $idRol): bool
    {
        try {
            // Usar procedimiento almacenado sp_actualizar_usuario
            $actualizarPassword = ($contrasenaHash !== null && $contrasenaHash !== '') ? 1 : 0;
            
            $stmt = $this->db->prepare("CALL sp_actualizar_usuario(:id, :nombre, :correo, :contrasena, :telefono, :id_rol, :actualizar_password)");
            $stmt->bindParam(':id', $idUsuario, PDO::PARAM_INT);
            $stmt->bindParam(':nombre', $nombreUsuario, PDO::PARAM_STR);
            $stmt->bindParam(':correo', $correo, PDO::PARAM_STR);
            $stmt->bindParam(':contrasena', $contrasenaHash, PDO::PARAM_STR);
            $stmt->bindParam(':telefono', $telefono, PDO::PARAM_STR);
            $stmt->bindParam(':id_rol', $idRol, PDO::PARAM_INT);
            $stmt->bindParam(':actualizar_password', $actualizarPassword, PDO::PARAM_INT);
            
            $result = $stmt->execute();
            // Limpiar cursores adicionales de CALL
            while ($stmt->nextRowset()) { /* noop */ }
            return $result;
        } catch (\Throwable $e) {
            error_log('Error updateUser: ' . $e->getMessage());
            return false;
        }
    }

    public function deleteUser(int $idUsuario): bool
    {
        try {
            error_log('UserModel - deleteUser: Eliminando usuario ID: ' . $idUsuario);
            
            // Usar procedimiento almacenado sp_eliminar_usuario
            $stmt = $this->db->prepare("CALL sp_eliminar_usuario(:id)");
            $stmt->bindParam(':id', $idUsuario, PDO::PARAM_INT);
            $result = $stmt->execute();
            
            error_log('UserModel - deleteUser: Resultado: ' . ($result ? 'Éxito' : 'Falló'));
            return $result;
        } catch (\Throwable $e) {
            error_log('Error deleteUser: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Deshabilita un usuario (más seguro que eliminar)
     */
    public function disableUser(int $idUsuario): bool
    {
        try {
            error_log('UserModel - disableUser: Deshabilitando usuario ID: ' . $idUsuario);
            
            // Usar consulta SQL directa para deshabilitar
            $stmt = $this->db->prepare("UPDATE usuario SET activo = 0 WHERE id_usuario = :id");
            $stmt->bindParam(':id', $idUsuario, PDO::PARAM_INT);
            $result = $stmt->execute();
            
            error_log('UserModel - disableUser: Resultado: ' . ($result ? 'Éxito' : 'Falló'));
            return $result;
        } catch (\Throwable $e) {
            error_log('Error disableUser: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Autentica un usuario usando el procedimiento sp_login_usuario
     * que incluye control de intentos fallidos y bloqueo temporal
     */
    public function authenticateUser(string $usuario, string $contrasena): array
    {
        try {
            // Usar procedimiento almacenado sp_login_usuario
            $stmt = $this->db->prepare("CALL sp_login_usuario(:usuario, :contrasena)");
            $stmt->bindParam(':usuario', $usuario, PDO::PARAM_STR);
            $stmt->bindParam(':contrasena', $contrasena, PDO::PARAM_STR);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            // Limpiar cursores adicionales de CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            if ($result && isset($result['id_usuario'])) {
                // Login exitoso
                return [
                    'success' => true,
                    'user' => [
                        'id_usuario' => (int)$result['id_usuario'],
                        'nombre_usuario' => $result['nombre_usuario'],
                        'id_rol' => (int)$result['id_rol']
                    ]
                ];
            } else {
                // Login fallido
                return [
                    'success' => false,
                    'message' => 'Credenciales incorrectas o usuario bloqueado'
                ];
            }
        } catch (\Throwable $e) {
            error_log('Error authenticateUser: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error interno del servidor'
            ];
        }
    }
}


