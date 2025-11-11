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

    /**
     * Crear o buscar un usuario cliente (rol 3) con nombre y teléfono
     * Permite duplicados de nombre y teléfono
     */
    public function crearCliente(?string $nombreCliente, ?string $telefonoCliente): int
    {
        try {
            // Siempre crear un nuevo usuario cliente (permitir duplicados)
            error_log("PedidosModel - crearCliente: Creando nuevo cliente - Nombre: $nombreCliente, Teléfono: " . ($telefonoCliente ?? 'NULL'));
            
            // Generar un correo único temporal (requerido por la tabla pero no se usa)
            $correoTemp = 'cliente_' . bin2hex(random_bytes(8)) . '@temp.local';
            
            $sql = "INSERT INTO usuario (
                        nombre_usuario,
                        correo,
                        contrasena,
                        telefono,
                        fecha_ingreso,
                        id_rol
                    ) VALUES (?, ?, '', ?, CURDATE(), 3)";
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([
                $nombreCliente ?: 'Cliente sin nombre',
                $correoTemp,
                $telefonoCliente
            ]);
            
            $idCliente = (int)$this->connection->lastInsertId();
            error_log("PedidosModel - crearCliente: Cliente creado con ID: $idCliente");
            
            return $idCliente;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - crearCliente: " . $e->getMessage());
            throw new Exception("Error al crear cliente: " . $e->getMessage());
        }
    }

    /**
     * Crear un nuevo pedido (con todos los campos de la BD actual)
     */
    public function createPedido(
        string $numeroPedido, 
        int $idUsuario,
        ?string $clienteNombre = null,
        ?string $clienteTelefono = null,
        ?string $canalVenta = null,
        ?string $prioridad = 'normal',
        ?string $observaciones = null,
        ?string $detallesProducto = null,
        ?string $fechaEntrega = null
    ): ?int
    {
        try {
            error_log("PedidosModel - createPedido: Creando pedido - Usuario: $idUsuario");

            // Calcular el siguiente numero_pedido incremental (máximo actual + 1)
            $sqlMax = "SELECT MAX(CAST(numero_pedido AS UNSIGNED)) as max_num FROM pedido";
            $maxNum = 0;
            $stmtMax = $this->connection->query($sqlMax);
            if ($row = $stmtMax->fetch(PDO::FETCH_ASSOC)) {
                $maxNum = (int)($row['max_num'] ?? 0);
            }
            $nextNumeroPedido = strval($maxNum + 1);

            $observacionesFinal = $observaciones;

            $sql = "INSERT INTO pedido (
                        numero_pedido,
                        id_usuario,
                        fecha_pedido,
                        fecha_entrega,
                        observaciones,
                        id_estado,
                        cliente_nombre,
                        cliente_telefono,
                        canal_venta,
                        prioridad,
                        detalles_producto
                    ) VALUES (?, ?, NOW(), ?, ?, 3, ?, ?, ?, ?, ?)";

            $stmt = $this->connection->prepare($sql);
            $stmt->execute([
                $nextNumeroPedido,
                $idUsuario,
                $fechaEntrega,
                $observacionesFinal,
                $clienteNombre,
                $clienteTelefono,
                $canalVenta,
                $prioridad,
                $detallesProducto
            ]);

            $idPedido = (int)$this->connection->lastInsertId();

            error_log("PedidosModel - createPedido: Pedido creado con ID: " . ($idPedido ?? 'NULL'));
            return $idPedido ?: null;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - createPedido: " . $e->getMessage());
            throw new Exception("Error al crear pedido: " . $e->getMessage());
        }
    }

    /**
     * Obtener todos los pedidos con información relacionada
     */
    public function getAllPedidos(): array
    {
        try {
            error_log("PedidosModel - getAllPedidos: Obteniendo todos los pedidos");
            
            // Consulta alineada con el esquema actual (sin fecha_compromiso)
            $sql = "SELECT 
                        p.id_pedido,
                        p.numero_pedido,
                        p.id_usuario,
                        p.fecha_pedido,
                        p.fecha_entrega,
                        p.observaciones,
                        p.id_estado,
                        p.cliente_nombre,
                        p.cliente_telefono,
                        p.canal_venta,
                        p.prioridad,
                        p.detalles_producto,
                        u.nombre_usuario,
                        u.telefono,
                        e.id_estado AS id_estado,
                        e.nombre AS estado_nombre,
                        e.codigo AS estado_codigo,
                        COALESCE(SUM(dp.total_linea), 0) AS total_pedido
                    FROM pedido p
                    LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
                    LEFT JOIN cat_estado_pedido e ON p.id_estado = e.id_estado
                    LEFT JOIN detallepedido dp ON p.id_pedido = dp.id_pedido
                    GROUP BY p.id_pedido, p.numero_pedido, p.id_usuario, p.fecha_pedido, 
                             p.fecha_entrega, p.observaciones, p.id_estado,
                             p.cliente_nombre, p.cliente_telefono, p.canal_venta, p.prioridad, p.detalles_producto,
                             u.nombre_usuario, u.telefono, e.nombre, e.codigo
                    ORDER BY p.fecha_pedido DESC";
            
            $stmt = $this->connection->query($sql);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("PedidosModel - getAllPedidos: Se encontraron " . count($result) . " pedidos");
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - getAllPedidos: " . $e->getMessage());
            return [];
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - getAllPedidos: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Obtener pedidos por usuario
     */
    public function getPedidosByUser(int $idUsuario): array
    {
        try {
            error_log("PedidosModel - getPedidosByUser: Buscando pedidos para usuario ID: $idUsuario");
            
            $sql = "SELECT 
                        p.id_pedido,
                        p.numero_pedido,
                        p.fecha_pedido,
                        p.fecha_entrega,
                        p.observaciones,
                        p.cliente_nombre,
                        p.cliente_telefono,
                        p.canal_venta,
                        p.prioridad,
                        p.detalles_producto,
                        u.nombre_usuario,
                        e.nombre as estado_nombre,
                        e.codigo as estado_codigo,
                        COALESCE(SUM(dp.total_linea), 0) as total_pedido
                    FROM pedido p
                    LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
                    LEFT JOIN cat_estado_pedido e ON p.id_estado = e.id_estado
                    LEFT JOIN detallepedido dp ON p.id_pedido = dp.id_pedido
                    WHERE p.id_usuario = ?
                    GROUP BY p.id_pedido, p.numero_pedido, p.fecha_pedido, 
                             p.fecha_entrega, p.observaciones, p.cliente_nombre, p.cliente_telefono,
                             p.canal_venta, p.prioridad, p.detalles_producto, u.nombre_usuario, e.nombre, e.codigo
                    ORDER BY p.fecha_pedido DESC";
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([$idUsuario]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("PedidosModel - getPedidosByUser: Se encontraron " . count($result) . " pedidos para usuario $idUsuario");
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - getPedidosByUser: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Obtener un pedido específico con detalles
     */
    public function getPedidoById(int $idPedido): ?array
    {
        try {
            error_log("PedidosModel - getPedidoById: Obteniendo pedido ID: $idPedido");
            
            // Obtener información básica del pedido (sin depender de SP)
            $sqlPedido = "SELECT p.*, u.nombre_usuario, e.nombre as estado_nombre, e.codigo as estado_codigo
                          FROM pedido p
                          LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
                          LEFT JOIN cat_estado_pedido e ON p.id_estado = e.id_estado
                          WHERE p.id_pedido = ?";
            $stmt = $this->connection->prepare($sqlPedido);
            $stmt->execute([$idPedido]);
            $pedido = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$pedido) {
                error_log("PedidosModel - getPedidoById: Pedido $idPedido no encontrado");
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
            
            error_log("PedidosModel - getPedidoById: Pedido $idPedido obtenido con " . count($detalles) . " detalles");
            return $pedido;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - getPedidoById: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Actualizar pedido (SOLO fecha_entrega y estado - fecha_pedido INMUTABLE)
     */
    public function updatePedido(int $idPedido, ?string $fechaEntrega, int $idEstado): bool
    {
        try {
            error_log("PedidosModel - updatePedido: Actualizando pedido $idPedido - FechaEntrega: $fechaEntrega, Estado: $idEstado");
            
            // Usar SQL directo en lugar del SP para mayor control
            $sql = "UPDATE pedido 
                    SET fecha_entrega = ?, id_estado = ? 
                    WHERE id_pedido = ?";
            
            $stmt = $this->connection->prepare($sql);
            $result = $stmt->execute([$fechaEntrega, $idEstado, $idPedido]);
            
            error_log("PedidosModel - updatePedido: Actualización " . ($result ? "exitosa" : "fallida"));
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - updatePedido: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Actualizar pedido completo con todos sus campos
     */
    public function updatePedidoCompleto(int $idPedido, array $datos): bool
    {
        try {
            error_log("PedidosModel - updatePedidoCompleto: Actualizando pedido $idPedido");
            error_log("Datos a actualizar: " . json_encode($datos));
            
            $campos = [];
            $valores = [];
            
            // Campos permitidos para actualizar
            $camposPermitidos = [
                'cliente_nombre',
                'cliente_telefono',
                'fecha_entrega',
                'prioridad',
                'canal_venta',
                'observaciones',
                'detalles_producto',
                'id_estado'
            ];
            
            foreach ($camposPermitidos as $campo) {
                if (isset($datos[$campo])) {
                    $campos[] = "$campo = ?";
                    $valores[] = $datos[$campo];
                }
            }
            
            if (empty($campos)) {
                error_log("PedidosModel - updatePedidoCompleto: No hay campos para actualizar");
                return false;
            }
            
            $valores[] = $idPedido; // WHERE
            
            $sql = "UPDATE pedido SET " . implode(', ', $campos) . " WHERE id_pedido = ?";
            error_log("SQL: $sql");
            
            $stmt = $this->connection->prepare($sql);
            $result = $stmt->execute($valores);
            
            error_log("PedidosModel - updatePedidoCompleto: Actualización " . ($result ? "exitosa" : "fallida"));
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - updatePedidoCompleto: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Cambiar estado del pedido
     */
    public function cambiarEstadoPedido(int $idPedido, int $idEstadoNuevo, int $idUsuario): bool
    {
        try {
            error_log("PedidosModel - cambiarEstadoPedido: Cambiando estado pedido $idPedido a $idEstadoNuevo por usuario $idUsuario");
            
            try {
                $stmt = $this->connection->prepare("CALL sp_cambiar_estado_pedido(?, ?, ?)");
                $result = $stmt->execute([$idPedido, $idEstadoNuevo, $idUsuario]);
            } catch (PDOException $e) {
                // Fallback directo
                $sql = "UPDATE pedido SET id_estado = ? WHERE id_pedido = ?";
                $stmt = $this->connection->prepare($sql);
                $result = $stmt->execute([$idEstadoNuevo, $idPedido]);
            }
            
            error_log("PedidosModel - cambiarEstadoPedido: Cambio de estado " . ($result ? "exitoso" : "fallido"));
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - cambiarEstadoPedido: " . $e->getMessage());
            throw new Exception("Error al cambiar estado: " . $e->getMessage());
        }
    }

    /**
     * Eliminar pedido
     */
    public function deletePedido(int $idPedido): bool
    {
        try {
            error_log("PedidosModel - deletePedido: Eliminando pedido ID: $idPedido");
            
            try {
                $stmt = $this->connection->prepare("CALL sp_eliminar_pedido(?)");
                $result = $stmt->execute([$idPedido]);
            } catch (PDOException $e) {
                // Fallback directo (borrado de detalles y cabecera)
                $this->connection->beginTransaction();
                try {
                    $stmt = $this->connection->prepare("DELETE FROM detallepedido WHERE id_pedido = ?");
                    $stmt->execute([$idPedido]);
                    $stmt = $this->connection->prepare("DELETE FROM pedido WHERE id_pedido = ?");
                    $stmt->execute([$idPedido]);
                    $this->connection->commit();
                    $result = true;
                } catch (PDOException $ie) {
                    $this->connection->rollBack();
                    throw $ie;
                }
            }
            
            error_log("PedidosModel - deletePedido: Eliminación " . ($result ? "exitosa" : "fallida"));
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - deletePedido: " . $e->getMessage());
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
            error_log("PedidosModel - createDetallePedido: Creando detalle para pedido " . $detalleData['id_pedido']);
            error_log("PedidosModel - createDetallePedido: DATOS COMPLETOS RECIBIDOS: " . json_encode($detalleData));
            
            // Preparar JSON de detalles personalizados si viene como array
            $detallesPersonalizados = null;
            if (isset($detalleData['detalles_personalizados'])) {
                if (is_array($detalleData['detalles_personalizados'])) {
                    $detallesPersonalizados = json_encode($detalleData['detalles_personalizados'], JSON_UNESCAPED_UNICODE);
                } else {
                    $detallesPersonalizados = $detalleData['detalles_personalizados'];
                }
            }

            // Si se proveen detalles_personalizados, forzamos inserción directa para incluir la columna (el SP no la contempla)
            if ($detallesPersonalizados !== null) {
                // Usar total_linea provisto (ya calculado en el Controller)
                $totalLinea = $detalleData['total_linea'] ?? 0;

                error_log("PedidosModel - createDetallePedido: INSERTANDO con total_linea=$totalLinea (cantidad=" . $detalleData['cantidad'] . ", precio_unitario=" . $detalleData['precio_unitario'] . ", descuento=" . $detalleData['descuento'] . ", impuesto=" . $detalleData['impuesto'] . ")");

                $sql = "INSERT INTO detallepedido (
                            producto_solicitado, cantidad, precio_unitario, descuento, impuesto, total_linea, id_pedido, id_producto, detalles_personalizados
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $this->connection->prepare($sql);
                $result = $stmt->execute([
                    $detalleData['producto_solicitado'],
                    $detalleData['cantidad'],
                    $detalleData['precio_unitario'],
                    $detalleData['descuento'],
                    $detalleData['impuesto'],
                    $totalLinea,
                    $detalleData['id_pedido'],
                    $detalleData['id_producto'] ?? null,
                    $detallesPersonalizados
                ]);
                
                error_log("PedidosModel - createDetallePedido: INSERT resultado=" . ($result ? 'EXITOSO' : 'FALLIDO') . ", id_detalle insertado=" . $this->connection->lastInsertId());
            } else {
                // Intentar usar SP; si falla, inserción directa sin columna extra
                try {
                    $stmt = $this->connection->prepare("CALL sp_crear_detalle_pedido(?, ?, ?, ?, ?, ?, ?, ?)");
                    $result = $stmt->execute([
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
                    // Fallback a SQL directo
                    // Usar total_linea provisto (ya calculado en el Controller)
                    $totalLinea = $detalleData['total_linea'] ?? 0;

                    $sql = "INSERT INTO detallepedido (
                                producto_solicitado, cantidad, precio_unitario, descuento, impuesto, total_linea, id_pedido, id_producto
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                    $stmt = $this->connection->prepare($sql);
                    $result = $stmt->execute([
                        $detalleData['producto_solicitado'],
                        $detalleData['cantidad'],
                        $detalleData['precio_unitario'],
                        $detalleData['descuento'],
                        $detalleData['impuesto'],
                        $totalLinea,
                        $detalleData['id_pedido'],
                        $detalleData['id_producto']
                    ]);
                }
            }
            
            error_log("PedidosModel - createDetallePedido: Creación de detalle " . ($result ? "exitosa" : "fallida"));
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - createDetallePedido: " . $e->getMessage());
            throw new Exception("Error al crear detalle: " . $e->getMessage());
        }
    }

    /**
     * Obtener detalle específico
     */
    public function getDetalleById(int $idDetalle): ?array
    {
        try {
            error_log("PedidosModel - getDetalleById: Obteniendo detalle ID: $idDetalle");
            
        // Sin depender de SP
        $sql = "SELECT dp.*, p.nombre_producto, p.sku
            FROM detallepedido dp
            LEFT JOIN producto p ON dp.id_producto = p.id_producto
            WHERE dp.id_detalle = ?";
        $stmt = $this->connection->prepare($sql);
        $stmt->execute([$idDetalle]);
        $detalle = $stmt->fetch(PDO::FETCH_ASSOC);
            
            error_log("PedidosModel - getDetalleById: Detalle " . ($detalle ? "encontrado" : "no encontrado"));
            return $detalle ?: null;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - getDetalleById: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Actualizar detalle de pedido
     */
    public function updateDetallePedido(int $idDetalle, array $detalleData): bool
    {
        try {
            error_log("PedidosModel - updateDetallePedido: Actualizando detalle ID: $idDetalle");
            
            // Si se proporciona detalles_personalizados, usamos UPDATE directo para incluir la columna
            $usarDirecto = array_key_exists('detalles_personalizados', $detalleData) && $detalleData['detalles_personalizados'] !== null;

            if (!$usarDirecto) {
                try {
                    $stmt = $this->connection->prepare("CALL sp_actualizar_detalle_pedido(?, ?, ?, ?, ?, ?, ?)");
                    $result = $stmt->execute([
                        $idDetalle,
                        $detalleData['producto_solicitado'],
                        $detalleData['cantidad_nueva'],
                        $detalleData['precio_unitario_nuevo'],
                        $detalleData['descuento_nuevo'],
                        $detalleData['impuesto_nuevo'],
                        $detalleData['id_usuario']
                    ]);
                } catch (PDOException $e) {
                    $usarDirecto = true;
                }
            }

            if ($usarDirecto) {
                $totalLinea = ($detalleData['precio_unitario_nuevo'] * $detalleData['cantidad_nueva']);
                $totalLinea = ($totalLinea * (1 - ($detalleData['descuento_nuevo'] / 100)));
                $totalLinea = ($totalLinea * (1 + ($detalleData['impuesto_nuevo'] / 100)));

                $campos = [
                    'producto_solicitado = ?',
                    'cantidad = ?',
                    'precio_unitario = ?',
                    'descuento = ?',
                    'impuesto = ?',
                    'total_linea = ?'
                ];
                $valores = [
                    $detalleData['producto_solicitado'],
                    $detalleData['cantidad_nueva'],
                    $detalleData['precio_unitario_nuevo'],
                    $detalleData['descuento_nuevo'],
                    $detalleData['impuesto_nuevo'],
                    $totalLinea
                ];

                if (array_key_exists('detalles_personalizados', $detalleData)) {
                    $campos[] = 'detalles_personalizados = ?';
                    $valores[] = $detalleData['detalles_personalizados'];
                }

                $valores[] = $idDetalle; // WHERE

                $sql = 'UPDATE detallepedido SET ' . implode(', ', $campos) . ' WHERE id_detalle = ?';
                $stmt = $this->connection->prepare($sql);
                $result = $stmt->execute($valores);
            }
            
            error_log("PedidosModel - updateDetallePedido: Actualización " . ($result ? "exitosa" : "fallida"));
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - updateDetallePedido: " . $e->getMessage());
            throw new Exception("Error al actualizar detalle: " . $e->getMessage());
        }
    }

    /**
     * Eliminar detalle de pedido
     */
    public function deleteDetallePedido(int $idDetalle): bool
    {
        try {
            error_log("PedidosModel - deleteDetallePedido: Eliminando detalle ID: $idDetalle");
            
            // Intentar SP; si falla, DELETE directo
            try {
                $stmt = $this->connection->prepare("CALL sp_eliminar_detalle_pedido(?)");
                $result = $stmt->execute([$idDetalle]);
            } catch (PDOException $e) {
                $stmt = $this->connection->prepare("DELETE FROM detallepedido WHERE id_detalle = ?");
                $result = $stmt->execute([$idDetalle]);
            }
            
            error_log("PedidosModel - deleteDetallePedido: Eliminación " . ($result ? "exitosa" : "fallida"));
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - deleteDetallePedido: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Eliminar todos los detalles de un pedido específico
     */
    public function deleteDetallesByPedidoId(int $idPedido): bool
    {
        try {
            error_log("PedidosModel - deleteDetallesByPedidoId: Eliminando todos los detalles del pedido ID: $idPedido");
            
            $stmt = $this->connection->prepare("DELETE FROM detallepedido WHERE id_pedido = ?");
            $result = $stmt->execute([$idPedido]);
            
            $rowCount = $stmt->rowCount();
            error_log("PedidosModel - deleteDetallesByPedidoId: Se eliminaron $rowCount registros");
            
            return $result;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - deleteDetallesByPedidoId: " . $e->getMessage());
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
            error_log("PedidosModel - getEstados: Obteniendo estados disponibles");
            
            $sql = "SELECT * FROM cat_estado_pedido ORDER BY orden ASC";
            $stmt = $this->connection->query($sql);
            $estados = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("PedidosModel - getEstados: Se encontraron " . count($estados) . " estados");
            return $estados;
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - getEstados: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Test de conexión
     */
    public function testConnection(): array
    {
        try {
            error_log("PedidosModel - testConnection: Probando conexión a BD");
            
            // Test simple de conexión
            $stmt = $this->connection->query("SELECT 1 as connected, NOW() as timestamp");
            if (!$stmt) {
                throw new PDOException("No se pudo ejecutar la consulta de prueba");
            }
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$result) {
                throw new PDOException("No se obtuvieron resultados de la consulta de prueba");
            }
            
            error_log("PedidosModel - testConnection: Conexión exitosa");
            return [
                'status' => 'OK',
                'connected' => true,
                'timestamp' => $result['timestamp'],
                'server_info' => $this->connection->getAttribute(PDO::ATTR_SERVER_VERSION)
            ];
        } catch (PDOException $e) {
            error_log("ERROR PedidosModel - testConnection: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return [
                'status' => 'ERROR',
                'connected' => false,
                'message' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }

    /**
     * Mapear estados del frontend a IDs de BD
     */
    public function mapEstadoFrontendToId(string $estadoFrontend): int
    {
        $map = [
            'pendiente' => 3,    // PROCESO
            'procesando' => 3,   // PROCESO  
            'enviado' => 3,      // PROCESO
            'entregado' => 1,    // ENTRG
            'cancelado' => 2     // CANC
        ];
        
        $idEstado = $map[strtolower($estadoFrontend)] ?? 3;
        error_log("PedidosModel - mapEstadoFrontendToId: '$estadoFrontend' -> $idEstado");
        return $idEstado;
    }

    /**
     * Mapear IDs de BD a estados del frontend
     */
    public function mapEstadoIdToFrontend(int $idEstado): string
    {
        $map = [
            1 => 'entregado',    // ENTRG
            2 => 'cancelado',    // CANC
            3 => 'procesando'    // PROCESO
        ];
        
        $estadoFrontend = $map[$idEstado] ?? 'pendiente';
        error_log("PedidosModel - mapEstadoIdToFrontend: $idEstado -> '$estadoFrontend'");
        return $estadoFrontend;
    }

    /**
     * Obtener lista de productos activos
     * Retorna id_producto y nombre_producto de la tabla producto
     */
    public function getProductos(): array
    {
        try {
            error_log("PedidosModel - getProductos: Obteniendo lista de productos activos");
            error_log("PedidosModel - getProductos: Connection = " . ($this->connection ? 'OK' : 'NULL'));
            
            $sql = "SELECT id_producto, nombre_producto, stock, stock_minimo
                    FROM producto 
                    WHERE activo = 1 
                    ORDER BY nombre_producto ASC";
            
            error_log("PedidosModel - getProductos: SQL = " . $sql);
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute();
            
            $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("PedidosModel - getProductos: Se encontraron " . count($productos) . " productos");
            
            if (count($productos) > 0) {
                error_log("PedidosModel - getProductos: Primer producto = " . json_encode($productos[0]));
            } else {
                error_log("PedidosModel - getProductos: ADVERTENCIA - No se encontraron productos activos");
                
                // Verificar si hay productos sin filtro de activo
                $stmtAll = $this->connection->prepare("SELECT COUNT(*) as total FROM producto");
                $stmtAll->execute();
                $total = $stmtAll->fetch(PDO::FETCH_ASSOC);
                error_log("PedidosModel - getProductos: Total de productos en tabla (sin filtro): " . $total['total']);
            }
            
            return $productos;
        } catch (PDOException $e) {
            error_log("PedidosModel - getProductos: Error PDO - " . $e->getMessage());
            error_log("PedidosModel - getProductos: SQL State - " . $e->getCode());
            throw new Exception('Error al obtener la lista de productos: ' . $e->getMessage());
        } catch (Exception $e) {
            error_log("PedidosModel - getProductos: Error general - " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Descontar stock de productos cuando un pedido se marca como entregado
     * Retorna true si se actualizó correctamente, false en caso contrario
     */
    public function descontarStockPorPedido(int $idPedido): bool
    {
        try {
            error_log("PedidosModel - descontarStockPorPedido: Iniciando descuento de stock para pedido ID: $idPedido");
            
            // 1. Obtener los detalles del pedido
            $sqlPedido = "SELECT detalles_producto FROM pedido WHERE id_pedido = ?";
            $stmtPedido = $this->connection->prepare($sqlPedido);
            $stmtPedido->execute([$idPedido]);
            $pedido = $stmtPedido->fetch(PDO::FETCH_ASSOC);
            
            if (!$pedido) {
                error_log("PedidosModel - descontarStockPorPedido: Pedido no encontrado");
                return false;
            }
            
            // 2. Parsear detalles_producto
            $detallesProducto = json_decode($pedido['detalles_producto'], true);
            
            if (!$detallesProducto || !is_array($detallesProducto)) {
                error_log("PedidosModel - descontarStockPorPedido: No hay detalles de producto válidos");
                return false;
            }
            
            error_log("PedidosModel - descontarStockPorPedido: Productos a procesar: " . json_encode($detallesProducto));
            
            // 3. Iniciar transacción
            $this->connection->beginTransaction();
            
            $productosActualizados = 0;
            
            // 4. Por cada producto, descontar el stock
            foreach ($detallesProducto as $index => $detalle) {
                error_log("PedidosModel - Procesando detalle #$index: " . json_encode($detalle));
                
                // Extraer id_producto - solo productos del catálogo tienen id_producto > 0
                $idProducto = isset($detalle['id_producto']) ? intval($detalle['id_producto']) : 0;
                $cantidad = isset($detalle['cantidad']) ? intval($detalle['cantidad']) : 0;
                
                // Validar que sea un producto del catálogo (no personalizado)
                if ($idProducto <= 0) {
                    error_log("PedidosModel - Detalle #$index: Producto personalizado (id_producto=$idProducto), no se descuenta stock");
                    continue;
                }
                
                if ($cantidad <= 0) {
                    error_log("PedidosModel - Detalle #$index: Cantidad inválida ($cantidad)");
                    continue;
                }
                
                error_log("PedidosModel - Descontando $cantidad unidades del producto ID: $idProducto");
                
                // 5. Verificar stock actual
                $sqlStock = "SELECT stock, nombre_producto FROM producto WHERE id_producto = ?";
                $stmtStock = $this->connection->prepare($sqlStock);
                $stmtStock->execute([$idProducto]);
                $producto = $stmtStock->fetch(PDO::FETCH_ASSOC);
                
                if (!$producto) {
                    error_log("PedidosModel - descontarStockPorPedido: Producto ID $idProducto no encontrado en la tabla producto");
                    continue;
                }
                
                $stockActual = intval($producto['stock']);
                $nombreProducto = $producto['nombre_producto'];
                
                error_log("PedidosModel - descontarStockPorPedido: Producto '$nombreProducto' - Stock actual: $stockActual, A descontar: $cantidad");
                
                // 6. Verificar si hay suficiente stock
                if ($stockActual < $cantidad) {
                    error_log("PedidosModel - descontarStockPorPedido: ADVERTENCIA - Stock insuficiente para '$nombreProducto'. Disponible: $stockActual, Requerido: $cantidad");
                    // Continuar de todos modos y permitir stock negativo (se puede cambiar si se desea)
                }
                
                // 7. Actualizar stock
                $sqlUpdate = "UPDATE producto SET stock = stock - ? WHERE id_producto = ?";
                $stmtUpdate = $this->connection->prepare($sqlUpdate);
                $stmtUpdate->execute([$cantidad, $idProducto]);
                
                $productosActualizados++;
                error_log("PedidosModel - descontarStockPorPedido: Stock actualizado para '$nombreProducto'. Nuevo stock: " . ($stockActual - $cantidad));
            }
            
            // 8. Confirmar transacción
            $this->connection->commit();
            
            error_log("PedidosModel - descontarStockPorPedido: Transacción completada. $productosActualizados productos actualizados");
            
            return $productosActualizados > 0;
            
        } catch (PDOException $e) {
            // Revertir transacción en caso de error
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            error_log("PedidosModel - descontarStockPorPedido: Error PDO - " . $e->getMessage());
            throw new Exception('Error al descontar stock: ' . $e->getMessage());
        } catch (Exception $e) {
            // Revertir transacción en caso de error
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            error_log("PedidosModel - descontarStockPorPedido: Error general - " . $e->getMessage());
            throw $e;
        }
    }
}



