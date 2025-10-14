<?php

namespace App\Models;

use App\DB\connectionDB;
use PDO;
use PDOException;
use Exception;

class PedidosModel
{
    private $connection;

    public function __construct()
    {
        $this->connection = connectionDB::getConnection();
    }

    // ===== MÉTODOS PARA PEDIDOS =====

    /**
     * Crear un nuevo pedido
     */
    public function createPedido(string $numeroPedido, string $fechaCompromiso, ?string $observaciones, int $idUsuario): ?int
    {
        try {
            $stmt = $this->connection->prepare("CALL sp_crear_pedido(?, ?, ?, 1, ?)");
            $stmt->execute([$numeroPedido, $fechaCompromiso, $observaciones, $idUsuario]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['id_pedido_creado'] ?? null;
        } catch (PDOException $e) {
            error_log("Error creando pedido: " . $e->getMessage());
            throw new Exception("Error al crear pedido: " . $e->getMessage());
        }
    }

    /**
     * Obtener todos los pedidos con información relacionada
     */
    public function getAllPedidos(): array
    {
        try {
            error_log("PedidosModel - Iniciando consulta getAllPedidos");
            
            // Primero verificar si hay pedidos en la tabla
            $checkSql = "SELECT COUNT(*) AS total FROM pedido";
            $checkStmt = $this->connection->query($checkSql);
            $count = $checkStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            error_log("PedidosModel - Total de pedidos en la tabla: " . $count);
            
            if ($count == 0) {
                error_log("PedidosModel - No hay pedidos en la base de datos. Insertando pedido de ejemplo...");
                
                // Crear un pedido de ejemplo si no hay ninguno
                $this->createPedido(
                    "PED-" . date('Ymd') . "-001", 
                    date('Y-m-d', strtotime('+7 days')), 
                    "Pedido de ejemplo creado automáticamente", 
                    1
                );
                
                error_log("PedidosModel - Pedido de ejemplo creado.");
            }
            
            $sql = "SELECT 
                        p.id_pedido,
                        p.numero_pedido,
                        p.fecha_pedido,
                        p.fecha_compromiso,
                        p.fecha_entrega,
                        p.observaciones,
                        u.nombre_usuario,
                        e.nombre as estado_nombre,
                        e.codigo as estado_codigo,
                        COALESCE(SUM(dp.total_linea), 0) as total_pedido
                    FROM pedido p
                    LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
                    LEFT JOIN cat_estado_pedido e ON p.id_estado = e.id_estado
                    LEFT JOIN detallepedido dp ON p.id_pedido = dp.id_pedido
                    GROUP BY p.id_pedido, p.numero_pedido, p.fecha_pedido, p.fecha_compromiso, 
                             p.fecha_entrega, p.observaciones, u.nombre_usuario, e.nombre, e.codigo
                    ORDER BY p.fecha_pedido DESC";
            
            error_log("PedidosModel - SQL: " . $sql);
            
            $stmt = $this->connection->query($sql);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("PedidosModel - Resultado: " . json_encode($result));
            error_log("PedidosModel - Número de registros: " . count($result));
            
            return $result;
        } catch (PDOException $e) {
            error_log("Error obteniendo pedidos: " . $e->getMessage() . " - Traza: " . $e->getTraceAsString());
            return [];
        }
    }

    /**
     * Obtener pedidos por usuario
     */
    public function getPedidosByUser(int $idUsuario): array
    {
        try {
            error_log("PedidosModel - getPedidosByUser: Buscando pedidos para usuario ID: " . $idUsuario);
            
            // Verificar si existe el usuario
            $checkUserSql = "SELECT COUNT(*) AS existe FROM usuario WHERE id_usuario = ?";
            $checkUserStmt = $this->connection->prepare($checkUserSql);
            $checkUserStmt->execute([$idUsuario]);
            $userExists = $checkUserStmt->fetch(PDO::FETCH_ASSOC)['existe'];
            
            if ($userExists == 0) {
                error_log("PedidosModel - getPedidosByUser: El usuario ID " . $idUsuario . " no existe");
                return [];
            }
            
            error_log("PedidosModel - getPedidosByUser: Usuario encontrado, buscando sus pedidos");
            
            $sql = "SELECT 
                        p.id_pedido,
                        p.numero_pedido,
                        p.fecha_pedido,
                        p.fecha_compromiso,
                        p.fecha_entrega,
                        p.observaciones,
                        u.nombre_usuario,
                        e.nombre as estado_nombre,
                        e.codigo as estado_codigo,
                        COALESCE(SUM(dp.total_linea), 0) as total_pedido
                    FROM pedido p
                    LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
                    LEFT JOIN cat_estado_pedido e ON p.id_estado = e.id_estado
                    LEFT JOIN detallepedido dp ON p.id_pedido = dp.id_pedido
                    WHERE p.id_usuario = ?
                    GROUP BY p.id_pedido, p.numero_pedido, p.fecha_pedido, p.fecha_compromiso, 
                             p.fecha_entrega, p.observaciones, u.nombre_usuario, e.nombre, e.codigo
                    ORDER BY p.fecha_pedido DESC";
            
            error_log("PedidosModel - getPedidosByUser: SQL: " . $sql);
            error_log("PedidosModel - getPedidosByUser: Parámetro idUsuario: " . $idUsuario);
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([$idUsuario]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("PedidosModel - getPedidosByUser: Número de registros encontrados: " . count($result));
            if (count($result) > 0) {
                error_log("PedidosModel - getPedidosByUser: Primer pedido ID: " . ($result[0]['id_pedido'] ?? 'N/A'));
            }
            
            return $result;
        } catch (PDOException $e) {
            error_log("PedidosModel - getPedidosByUser: Error obteniendo pedidos por usuario: " . $e->getMessage() . " - Traza: " . $e->getTraceAsString());
            return [];
        }
    }

    /**
     * Obtener un pedido específico con detalles
     */
    public function getPedidoById(int $idPedido): ?array
    {
        try {
            // Obtener información básica del pedido
            $stmt = $this->connection->prepare("CALL sp_obtener_pedido(?)");
            $stmt->execute([$idPedido]);
            $pedido = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$pedido) {
                return null;
            }

            // Obtener detalles del pedido
            $sql = "SELECT 
                        dp.*,
                        p.nombre_producto,
                        p.sku
                    FROM detallepedido dp
                    LEFT JOIN producto p ON dp.id_producto = p.id_producto
                    WHERE dp.id_pedido = ?
                    ORDER BY dp.id_detalle";
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([$idPedido]);
            $detalles = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $pedido['detalles'] = $detalles;
            $pedido['total_pedido'] = array_sum(array_column($detalles, 'total_linea'));
            
            return $pedido;
        } catch (PDOException $e) {
            error_log("Error obteniendo pedido por ID: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Actualizar pedido
     */
    public function updatePedido(int $idPedido, int $idUsuario, string $fechaPedido, ?string $fechaEntrega, int $idEstado): bool
    {
        try {
            $stmt = $this->connection->prepare("CALL sp_actualizar_pedido(?, ?, ?, ?, ?)");
            return $stmt->execute([$idPedido, $idUsuario, $fechaPedido, $fechaEntrega, $idEstado]);
        } catch (PDOException $e) {
            error_log("Error actualizando pedido: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Cambiar estado del pedido
     */
    public function cambiarEstadoPedido(int $idPedido, int $idEstadoNuevo, int $idUsuario): bool
    {
        try {
            $stmt = $this->connection->prepare("CALL sp_cambiar_estado_pedido(?, ?, ?)");
            return $stmt->execute([$idPedido, $idEstadoNuevo, $idUsuario]);
        } catch (PDOException $e) {
            error_log("Error cambiando estado del pedido: " . $e->getMessage());
            throw new Exception("Error al cambiar estado: " . $e->getMessage());
        }
    }

    /**
     * Eliminar pedido
     */
    public function deletePedido(int $idPedido): bool
    {
        try {
            $stmt = $this->connection->prepare("CALL sp_eliminar_pedido(?)");
            return $stmt->execute([$idPedido]);
        } catch (PDOException $e) {
            error_log("Error eliminando pedido: " . $e->getMessage());
            return false;
        }
    }

    // ===== MÉTODOS PARA DETALLES DE PEDIDOS =====

    /**
     * Crear detalle de pedido
     */
    public function createDetallePedido(array $detalleData): bool
    {
        try {
            $stmt = $this->connection->prepare("CALL sp_crear_detalle_pedido(?, ?, ?, ?, ?, ?, ?, ?)");
            return $stmt->execute([
                $detalleData['producto_solicitado'],
                $detalleData['precio_unitario'],
                $detalleData['descuento'],
                $detalleData['impuesto'],
                $detalleData['id_pedido'],
                $detalleData['id_producto'],
                $detalleData['cantidad'],
                $detalleData['id_usuario']
            ]);
        } catch (PDOException $e) {
            error_log("Error creando detalle de pedido: " . $e->getMessage());
            throw new Exception("Error al crear detalle: " . $e->getMessage());
        }
    }

    /**
     * Obtener detalle específico
     */
    public function getDetalleById(int $idDetalle): ?array
    {
        try {
            $stmt = $this->connection->prepare("CALL sp_obtener_detalle_pedido(?)");
            $stmt->execute([$idDetalle]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (PDOException $e) {
            error_log("Error obteniendo detalle: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Actualizar detalle de pedido
     */
    public function updateDetallePedido(int $idDetalle, array $detalleData): bool
    {
        try {
            $stmt = $this->connection->prepare("CALL sp_actualizar_detalle_pedido(?, ?, ?, ?, ?, ?, ?)");
            return $stmt->execute([
                $idDetalle,
                $detalleData['producto_solicitado'],
                $detalleData['cantidad_nueva'],
                $detalleData['precio_unitario_nuevo'],
                $detalleData['descuento_nuevo'],
                $detalleData['impuesto_nuevo'],
                $detalleData['id_usuario']
            ]);
        } catch (PDOException $e) {
            error_log("Error actualizando detalle: " . $e->getMessage());
            throw new Exception("Error al actualizar detalle: " . $e->getMessage());
        }
    }

    /**
     * Eliminar detalle de pedido
     */
    public function deleteDetallePedido(int $idDetalle): bool
    {
        try {
            $stmt = $this->connection->prepare("CALL sp_eliminar_detalle_pedido(?)");
            return $stmt->execute([$idDetalle]);
        } catch (PDOException $e) {
            error_log("Error eliminando detalle: " . $e->getMessage());
            return false;
        }
    }

    // ===== MÉTODOS AUXILIARES =====

    /**
     * Obtener estados disponibles
     */
    public function getEstados(): array
    {
        try {
            $sql = "SELECT * FROM cat_estado_pedido ORDER BY orden ASC";
            $stmt = $this->connection->query($sql);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Error obteniendo estados: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Test de conexión
     */
    public function testConnection(): array
    {
        try {
            $stmt = $this->connection->query("SELECT 'Conexión exitosa' as status, NOW() as timestamp");
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: ['status' => 'Error', 'timestamp' => null];
        } catch (PDOException $e) {
            error_log("Error en test de conexión: " . $e->getMessage());
            return ['status' => 'Error: ' . $e->getMessage(), 'timestamp' => null];
        }
    }
}