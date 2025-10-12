<?php

namespace App\Models;

use App\DB\connectionDB;
use App\Config\responseHTTP;
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
            $stmt = $this->db->prepare("CALL sp_crear_usuario(:nombre, :correo, :contrasena, :telefono, :id_rol)");
            $stmt->bindParam(':nombre', $nombreUsuario, PDO::PARAM_STR);
            $stmt->bindParam(':correo', $correo, PDO::PARAM_STR);
            $stmt->bindParam(':contrasena', $contrasenaHash, PDO::PARAM_STR);
            $stmt->bindParam(':telefono', $telefono, PDO::PARAM_STR);
            $stmt->bindParam(':id_rol', $idRol, PDO::PARAM_INT);
            $stmt->execute();

            // Obtener el último ID insertado
            $id = $this->db->lastInsertId();
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
            $stmt = $this->db->query("SELECT id_usuario, nombre_usuario, correo, telefono, fecha_ingreso, ultimo_acceso, id_rol FROM usuario");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $users ?: [];
        } catch (\Throwable $e) {
            error_log('Error listUsers: ' . $e->getMessage());
            return [];
        }
    }

    public function updateUser(int $idUsuario, string $nombreUsuario, string $correo, ?string $contrasenaHash, ?string $telefono, int $idRol): bool
    {
        try {
            if ($contrasenaHash !== null && $contrasenaHash !== '') {
                $stmt = $this->db->prepare("CALL sp_modificar_usuario(:id, :nombre, :correo, :contrasena, :telefono, :id_rol)");
                $stmt->bindParam(':contrasena', $contrasenaHash, PDO::PARAM_STR);
            } else {
                // Si no se envía contraseña, mantenemos la misma
                $sql = "UPDATE usuario SET nombre_usuario = :nombre, correo = :correo, telefono = :telefono, id_rol = :id_rol WHERE id_usuario = :id";
                $stmt = $this->db->prepare($sql);
            }
            $stmt->bindParam(':id', $idUsuario, PDO::PARAM_INT);
            $stmt->bindParam(':nombre', $nombreUsuario, PDO::PARAM_STR);
            $stmt->bindParam(':correo', $correo, PDO::PARAM_STR);
            $stmt->bindParam(':telefono', $telefono, PDO::PARAM_STR);
            $stmt->bindParam(':id_rol', $idRol, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (\Throwable $e) {
            error_log('Error updateUser: ' . $e->getMessage());
            return false;
        }
    }

    public function deleteUser(int $idUsuario): bool
    {
        try {
            $stmt = $this->db->prepare("CALL sp_eliminar_usuario(:id)");
            $stmt->bindParam(':id', $idUsuario, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (\Throwable $e) {
            error_log('Error deleteUser: ' . $e->getMessage());
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
                    'message' => 'Credenciales inválidas o usuario bloqueado'
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


