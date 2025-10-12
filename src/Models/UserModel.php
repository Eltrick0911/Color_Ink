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
            error_log('UserModel - createUser: Iniciando creación de usuario');
            error_log('UserModel - createUser: Parámetros - Nombre: ' . $nombreUsuario . ', Email: ' . $correo . ', Rol: ' . $idRol);
            
            // Verificar conexión a la base de datos
            if (!$this->db) {
                error_log('UserModel - createUser: Error - No hay conexión a la base de datos');
                return responseHTTP::status500();
            }
            
            // Usar consulta SQL directa (el procedimiento no existe en la BD)
            $stmt = $this->db->prepare("INSERT INTO usuario (nombre_usuario, correo, contrasena, telefono, fecha_ingreso, ultimo_acceso, id_rol) VALUES (:nombre, :correo, :contrasena, :telefono, NOW(), NOW(), :id_rol)");
            $stmt->bindParam(':nombre', $nombreUsuario, PDO::PARAM_STR);
            $stmt->bindParam(':correo', $correo, PDO::PARAM_STR);
            $stmt->bindParam(':contrasena', $contrasenaHash, PDO::PARAM_STR);
            $stmt->bindParam(':telefono', $telefono, PDO::PARAM_STR);
            $stmt->bindParam(':id_rol', $idRol, PDO::PARAM_INT);
            
            error_log('UserModel - createUser: Ejecutando procedimiento almacenado');
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
            error_log('UserModel - listUsers: Usuarios encontrados: ' . count($users));
            error_log('UserModel - listUsers: Datos: ' . json_encode($users));
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
                // Actualizar con nueva contraseña
                $sql = "UPDATE usuario SET nombre_usuario = :nombre, correo = :correo, contrasena = :contrasena, telefono = :telefono, id_rol = :id_rol WHERE id_usuario = :id";
                $stmt = $this->db->prepare($sql);
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
            error_log('UserModel - deleteUser: Eliminando usuario ID: ' . $idUsuario);
            
            // Usar consulta SQL directa (el procedimiento no existe en la BD)
            $stmt = $this->db->prepare("DELETE FROM usuario WHERE id_usuario = :id");
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
     * Autentica un usuario usando el procedimiento sp_login_usuario
     * que incluye control de intentos fallidos y bloqueo temporal
     */
    public function authenticateUser(string $usuario, string $contrasena): array
    {
        try {
            // Primero buscar el usuario y su contraseña hasheada
            $sql = "SELECT id_usuario, nombre_usuario, id_rol, contrasena, bloqueado_hasta, intentos_fallidos 
                    FROM usuario 
                    WHERE (correo = :usuario OR telefono = :usuario) 
                    LIMIT 1";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':usuario', $usuario, PDO::PARAM_STR);
            $stmt->execute();
            
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ];
            }
            
            // Verificar si el usuario está bloqueado
            if ($user['bloqueado_hasta'] && strtotime($user['bloqueado_hasta']) > time()) {
                return [
                    'success' => false,
                    'message' => 'Usuario bloqueado temporalmente'
                ];
            }
            
            // Verificar la contraseña usando el hash
            if (Security::validatePassword($contrasena, $user['contrasena'])) {
                // Login exitoso - actualizar último acceso y resetear intentos
                $updateSql = "UPDATE usuario SET ultimo_acceso = NOW(), intentos_fallidos = 0 WHERE id_usuario = :id";
                $updateStmt = $this->db->prepare($updateSql);
                $updateStmt->bindParam(':id', $user['id_usuario'], PDO::PARAM_INT);
                $updateStmt->execute();
                
                return [
                    'success' => true,
                    'user' => [
                        'id_usuario' => (int)$user['id_usuario'],
                        'nombre_usuario' => $user['nombre_usuario'],
                        'id_rol' => (int)$user['id_rol']
                    ]
                ];
            } else {
                // Login fallido - incrementar intentos y posible bloqueo
                $intentosFallidos = (int)$user['intentos_fallidos'] + 1;
                $bloqueadoHasta = null;
                
                if ($intentosFallidos >= 5) {
                    $bloqueadoHasta = date('Y-m-d H:i:s', strtotime('+2 minutes'));
                }
                
                $updateSql = "UPDATE usuario SET intentos_fallidos = :intentos, bloqueado_hasta = :bloqueado WHERE id_usuario = :id";
                $updateStmt = $this->db->prepare($updateSql);
                $updateStmt->bindParam(':intentos', $intentosFallidos, PDO::PARAM_INT);
                $updateStmt->bindParam(':bloqueado', $bloqueadoHasta, PDO::PARAM_STR);
                $updateStmt->bindParam(':id', $user['id_usuario'], PDO::PARAM_INT);
                $updateStmt->execute();
                
                return [
                    'success' => false,
                    'message' => 'Credenciales inválidas' . ($bloqueadoHasta ? ' - Usuario bloqueado por 2 minutos' : '')
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


