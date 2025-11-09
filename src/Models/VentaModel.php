<?php

namespace App\Models;

use App\DB\connectionDB;
use App\Config\responseHTTP;
use PDO;

class VentaModel
{
    private $db;

    public function __construct()
    {
        $this->db = connectionDB::getConnection();
    }

    /**
     * Crear una nueva venta usando el procedimiento almacenado sp_crear_venta
     */
    public function crearVenta(int $idPedido, int $idUsuario, float $montoCobrado, string $metodoPago, ?string $nota): array
    {
        try {
            error_log('VentaModel - crearVenta: Iniciando con id_pedido=' . $idPedido . ', id_usuario=' . $idUsuario);
            
            $this->db->beginTransaction();
            
            // 1. Verificar estado del pedido
            $stmt = $this->db->prepare("
                SELECT ep.nombre as estado 
                FROM pedido p 
                JOIN cat_estado_pedido ep ON p.id_estado = ep.id_estado 
                WHERE p.id_pedido = ?
            ");
            $stmt->execute([$idPedido]);
            $pedido = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$pedido) {
                $this->db->rollBack();
                $response = responseHTTP::status404();
                $response['message'] = 'El pedido no existe';
                return $response;
            }
            
            if ($pedido['estado'] !== 'Entregado') {
                $this->db->rollBack();
                $response = responseHTTP::status400('El pedido debe estar en estado ENTREGADO');
                return $response;
            }
            
            // 2. Verificar que no exista venta
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM venta WHERE id_pedido = ?");
            $stmt->execute([$idPedido]);
            $existe = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existe['count'] > 0) {
                $this->db->rollBack();
                $response = responseHTTP::status400('Ya existe una venta para este pedido');
                return $response;
            }
            
            // 3. Calcular costo total
            $stmt = $this->db->prepare("
                SELECT COALESCE(SUM(p.costo_unitario * dp.cantidad), 0) as costo_total
                FROM detallepedido dp
                JOIN producto p ON dp.id_producto = p.id_producto
                WHERE dp.id_pedido = ?
            ");
            $stmt->execute([$idPedido]);
            $costoData = $stmt->fetch(PDO::FETCH_ASSOC);
            $costoTotal = $costoData['costo_total'] ?? 0;
            
            // 4. Configurar zona horaria y insertar venta
            $this->db->exec("SET time_zone = '-06:00'"); // Ajustar según tu zona horaria
            
            $stmt = $this->db->prepare("
                INSERT INTO venta (id_pedido, id_usuario, monto_cobrado, costo_total, metodo_pago, nota) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $result = $stmt->execute([$idPedido, $idUsuario, $montoCobrado, $costoTotal, $metodoPago, $nota]);
            
            if ($result) {
                $idVenta = $this->db->lastInsertId();
                $this->db->commit();
                
                error_log('VentaModel - crearVenta: Venta creada con ID: ' . $idVenta);
                
                $response = responseHTTP::status201();
                $response['data'] = [
                    'id_venta' => (int)$idVenta,
                    'id_pedido' => $idPedido,
                    'monto_cobrado' => $montoCobrado
                ];
                return $response;
            } else {
                $this->db->rollBack();
                $response = responseHTTP::status500();
                $response['message'] = 'No se pudo insertar la venta';
                return $response;
            }
            
            return responseHTTP::status500();
        } catch (\PDOException $e) {
            error_log('VentaModel - crearVenta ERROR: ' . $e->getMessage());
            
            // Verificar si es un error específico del procedimiento
            if (strpos($e->getMessage(), 'El pedido no está en estado ENTREGADO') !== false) {
                $response = responseHTTP::status400('El pedido debe estar en estado ENTREGADO para registrar la venta');
                return $response;
            }
            if (strpos($e->getMessage(), 'Ya existe una venta registrada') !== false) {
                $response = responseHTTP::status400('Ya existe una venta registrada para este pedido');
                return $response;
            }
            if (strpos($e->getMessage(), 'El pedido no existe') !== false) {
                $response = responseHTTP::status404();
                $response['message'] = 'El pedido especificado no existe';
                return $response;
            }
            
            $response = responseHTTP::status500();
            $response['message'] = 'Error interno del servidor: ' . $e->getMessage();
            return $response;
        }
    }

    /**
     * Listar todas las ventas - usando JOINs ya que la vista no existe en AWS
     */
    public function listarVentas(?string $filtro = null, ?string $fechaDesde = null, ?string $fechaHasta = null, int $pagina = 1, int $limite = 10): array
    {
        try {
            // Usar JOINs en lugar de la vista que no existe
            $sql = "
                SELECT 
                    v.id_venta,
                    v.fecha_venta,
                    v.monto_cobrado,
                    v.costo_total,
                    v.utilidad,
                    v.utilidad_pct,
                    v.metodo_pago,
                    v.estado,
                    u.nombre_usuario as usuario,
                    u_c.nombre_usuario as cliente,
                    p.id_pedido
                FROM venta v
                JOIN pedido p ON v.id_pedido = p.id_pedido
                JOIN usuario u ON v.id_usuario = u.id_usuario
                JOIN usuario u_c ON p.id_usuario = u_c.id_usuario
                WHERE 1=1
            ";
            $params = [];

            // Aplicar filtros
            if (!empty($filtro)) {
                $sql .= " AND (u_c.nombre_usuario LIKE :filtro OR u.nombre_usuario LIKE :filtro OR v.id_venta LIKE :filtro)";
                $params[':filtro'] = "%{$filtro}%";
            }

            if (!empty($fechaDesde)) {
                $sql .= " AND DATE(v.fecha_venta) >= :fechaDesde";
                $params[':fechaDesde'] = $fechaDesde;
            }

            if (!empty($fechaHasta)) {
                $sql .= " AND DATE(v.fecha_venta) <= :fechaHasta";
                $params[':fechaHasta'] = $fechaHasta;
            }

            // Contar total de registros con consulta separada
            $countSql = "
                SELECT COUNT(*)
                FROM venta v
                JOIN pedido p ON v.id_pedido = p.id_pedido
                JOIN usuario u ON v.id_usuario = u.id_usuario
                JOIN usuario u_c ON p.id_usuario = u_c.id_usuario
                WHERE 1=1
            ";
            
            // Aplicar los mismos filtros
            if (!empty($filtro)) {
                $countSql .= " AND (u_c.nombre_usuario LIKE :filtro OR u.nombre_usuario LIKE :filtro OR v.id_venta LIKE :filtro)";
            }
            if (!empty($fechaDesde)) {
                $countSql .= " AND DATE(v.fecha_venta) >= :fechaDesde";
            }
            if (!empty($fechaHasta)) {
                $countSql .= " AND DATE(v.fecha_venta) <= :fechaHasta";
            }
            
            $countStmt = $this->db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $totalRegistros = $countStmt->fetchColumn();
            
            $sql .= " ORDER BY v.id_venta DESC";
            
            // Agregar LIMIT y OFFSET
            $offset = ($pagina - 1) * $limite;
            $sql .= " LIMIT {$limite} OFFSET {$offset}";

            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log('VentaModel - listarVentas: Encontradas ' . count($ventas) . ' ventas de ' . $totalRegistros . ' total');
            
            $response = responseHTTP::status200('OK');
            $response['data'] = $ventas;
            $response['pagination'] = [
                'current_page' => $pagina,
                'per_page' => $limite,
                'total' => $totalRegistros,
                'total_pages' => ceil($totalRegistros / $limite)
            ];
            return $response;
        } catch (\Throwable $e) {
            error_log('VentaModel - listarVentas ERROR: ' . $e->getMessage());
            return responseHTTP::status500();
        }
    }

    /**
     * Obtener una venta específica por ID
     */
    public function obtenerVenta(int $idVenta): array
    {
        try {
            // Usar JOINs en lugar de la vista
            $stmt = $this->db->prepare("
                SELECT 
                    v.id_venta,
                    v.fecha_venta,
                    v.monto_cobrado,
                    v.costo_total,
                    v.utilidad,
                    v.utilidad_pct,
                    v.metodo_pago,
                    v.estado,
                    u.nombre_usuario as usuario,
                    u_c.nombre_usuario as cliente,
                    p.id_pedido
                FROM venta v
                JOIN pedido p ON v.id_pedido = p.id_pedido
                JOIN usuario u ON v.id_usuario = u.id_usuario
                JOIN usuario u_c ON p.id_usuario = u_c.id_usuario
                WHERE v.id_venta = :id
            ");
            $stmt->bindParam(':id', $idVenta, PDO::PARAM_INT);
            $stmt->execute();
            $venta = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$venta) {
                return responseHTTP::status404();
            }
            
            $response = responseHTTP::status200('OK');
            $response['data'] = $venta;
            return $response;
        } catch (\Throwable $e) {
            error_log('VentaModel - obtenerVenta ERROR: ' . $e->getMessage());
            return responseHTTP::status500();
        }
    }

    /**
     * Editar una venta
     */
    public function editarVenta(int $idVenta, float $montoCobrado, string $metodoPago, ?string $nota): array
    {
        try {
            error_log('VentaModel - editarVenta: ID=' . $idVenta . ', Monto=' . $montoCobrado);
            
            // Actualizar los campos modificables
            $stmt = $this->db->prepare("
                UPDATE venta 
                SET monto_cobrado = :monto,
                    metodo_pago = :metodo,
                    nota = :nota
                WHERE id_venta = :id
            ");
            
            $stmt->bindParam(':monto', $montoCobrado, PDO::PARAM_STR);
            $stmt->bindParam(':metodo', $metodoPago, PDO::PARAM_STR);
            $stmt->bindParam(':nota', $nota, PDO::PARAM_STR);
            $stmt->bindParam(':id', $idVenta, PDO::PARAM_INT);
            
            $result = $stmt->execute();
            
            if ($result) {
                $response = responseHTTP::status200('Venta actualizada correctamente');
                $response['data'] = ['id_venta' => $idVenta];
                return $response;
            }
            
            return responseHTTP::status500();
        } catch (\Throwable $e) {
            error_log('VentaModel - editarVenta ERROR: ' . $e->getMessage());
            return responseHTTP::status500();
        }
    }

    /**
     * Anular una venta
     */
    public function anularVenta(int $idVenta, int $usuarioAdmin, string $motivo): array
    {
        try {
            error_log('VentaModel - anularVenta: ID=' . $idVenta . ', Usuario=' . $usuarioAdmin);
            
            // Cambiar el estado a ANULADA
            $stmt = $this->db->prepare("UPDATE venta SET estado = 'ANULADA' WHERE id_venta = :id");
            $stmt->bindParam(':id', $idVenta, PDO::PARAM_INT);
            $result = $stmt->execute();
            
            if ($result) {
                $response = responseHTTP::status200('Venta anulada correctamente');
                $response['data'] = ['id_venta' => $idVenta];
                return $response;
            }
            
            return responseHTTP::status500();
        } catch (\Throwable $e) {
            error_log('VentaModel - anularVenta ERROR: ' . $e->getMessage());
            return responseHTTP::status500();
        }
    }

    /**
     * Obtener resumen de ventas para reportes - usando GROUP BY ya que la vista no existe
     */
    public function obtenerResumenVentas(?string $fechaDesde = null, ?string $fechaHasta = null): array
    {
        try {
            $sql = "
                SELECT 
                    CAST(v.fecha_venta AS DATE) as fecha,
                    COUNT(v.id_venta) as total_ventas,
                    SUM(v.monto_cobrado) as total_ingresos,
                    SUM(v.costo_total) as total_costos,
                    SUM(v.utilidad) as total_utilidad,
                    ROUND(AVG(v.utilidad_pct), 2) as utilidad_promedio
                FROM venta v
                WHERE v.estado = 'REGISTRADA'
            ";
            $params = [];

            if (!empty($fechaDesde)) {
                $sql .= " AND DATE(v.fecha_venta) >= :fechaDesde";
                $params[':fechaDesde'] = $fechaDesde;
            }

            if (!empty($fechaHasta)) {
                $sql .= " AND DATE(v.fecha_venta) <= :fechaHasta";
                $params[':fechaHasta'] = $fechaHasta;
            }

            $sql .= " GROUP BY DATE(v.fecha_venta) ORDER BY fecha DESC";

            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            $resumen = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = responseHTTP::status200('OK');
            $response['data'] = $resumen;
            return $response;
        } catch (\Throwable $e) {
            error_log('VentaModel - obtenerResumenVentas ERROR: ' . $e->getMessage());
            return responseHTTP::status500();
        }
    }

    /**
     * Obtener pedidos disponibles para crear ventas (estado "Entregado")
     */
    public function obtenerPedidosDisponibles(): array
    {
        try {
            error_log('VentaModel - obtenerPedidosDisponibles: Iniciando consulta');
            
            // Primero verificar qué estados existen
            $stmtEstados = $this->db->prepare("SELECT id_estado, nombre FROM cat_estado_pedido ORDER BY id_estado");
            $stmtEstados->execute();
            $estados = $stmtEstados->fetchAll(PDO::FETCH_ASSOC);
            error_log('VentaModel - Estados disponibles: ' . json_encode($estados));
            
            // Consulta con cálculo del total del pedido
            $sql = "
                SELECT 
                    p.id_pedido,
                    p.numero_pedido,
                    p.fecha_pedido,
                    p.id_usuario as id_cliente,
                    u.nombre_usuario as nombre_cliente,
                    ep.nombre as estado_nombre,
                    COALESCE((
                        SELECT SUM(dp.precio_unitario * dp.cantidad)
                        FROM detallepedido dp
                        WHERE dp.id_pedido = p.id_pedido
                    ), 0) as total_pedido,
                    CONCAT(COALESCE(p.numero_pedido, CONCAT('Pedido #', p.id_pedido)), ' - Cliente: ', u.nombre_usuario) as display_text
                FROM pedido p
                INNER JOIN usuario u ON p.id_usuario = u.id_usuario
                INNER JOIN cat_estado_pedido ep ON p.id_estado = ep.id_estado
                WHERE ep.nombre = 'Entregado'
                AND p.id_pedido NOT IN (
                    SELECT DISTINCT v.id_pedido FROM venta v WHERE v.id_pedido IS NOT NULL
                )
                ORDER BY p.id_pedido DESC
                LIMIT 50
            ";
            
            error_log('VentaModel - SQL Query: ' . $sql);
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log('VentaModel - obtenerPedidosDisponibles: Encontrados ' . count($pedidos) . ' pedidos disponibles');
            
            if (count($pedidos) === 0) {
                // Si no hay pedidos con "Entregado", buscar con cualquier estado para debug
                $sqlDebug = "SELECT p.id_pedido, p.numero_pedido, ep.nombre as estado FROM pedido p JOIN cat_estado_pedido ep ON p.id_estado = ep.id_estado ORDER BY p.id_pedido DESC LIMIT 10";
                $stmtDebug = $this->db->prepare($sqlDebug);
                $stmtDebug->execute();
                $pedidosDebug = $stmtDebug->fetchAll(PDO::FETCH_ASSOC);
                error_log('VentaModel - DEBUG - Últimos 10 pedidos: ' . json_encode($pedidosDebug));
            } else {
                error_log('VentaModel - Primer pedido encontrado: ' . json_encode($pedidos[0]));
            }
            
            $response = responseHTTP::status200('OK');
            $response['data'] = $pedidos;
            return $response;
        } catch (\Throwable $e) {
            error_log('VentaModel - obtenerPedidosDisponibles ERROR: ' . $e->getMessage());
            error_log('VentaModel - Stack trace: ' . $e->getTraceAsString());
            $response = responseHTTP::status500();
            $response['message'] = $e->getMessage();
            return $response;
        }
    }

    /**
     * Obtener el nombre de usuario por ID
     */
    private function obtenerNombreUsuario(int $idUsuario): string
    {
        try {
            $stmt = $this->db->prepare("SELECT nombre_usuario FROM usuario WHERE id_usuario = :id");
            $stmt->bindParam(':id', $idUsuario, PDO::PARAM_INT);
            $stmt->execute();
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
            return $usuario ? $usuario['nombre_usuario'] : 'Usuario desconocido';
        } catch (\Throwable $e) {
            error_log('VentaModel - obtenerNombreUsuario ERROR: ' . $e->getMessage());
            return 'Usuario desconocido';
        }
    }

    /**
     * Registrar auditoría de una acción sobre una venta
     */
    public function registrarAuditoria(int $idVenta, string $accion, int $usuarioAdmin, string $motivo): bool
    {
        try {
            error_log('VentaModel - registrarAuditoria: Intentando registrar auditoría para venta ID=' . $idVenta);
            
            // Insertar auditoría simple
            $stmt = $this->db->prepare("
                INSERT INTO venta_aud (
                    id_venta_original, id_pedido_original, fecha_venta_original,
                    monto_cobrado_original, estado_original, accion, usuario_admin, motivo
                )
                SELECT 
                    v.id_venta, v.id_pedido, v.fecha_venta, v.monto_cobrado, v.estado, 
                    'ANULADA', ?, ?
                FROM venta v
                WHERE v.id_venta = ?
            ");
            
            $result = $stmt->execute([$usuarioAdmin, $motivo, $idVenta]);
            
            if ($result) {
                error_log('VentaModel - registrarAuditoria: Auditoría registrada exitosamente');
            }
            
            return $result;
        } catch (\Throwable $e) {
            error_log('VentaModel - registrarAuditoria ERROR: ' . $e->getMessage());
            // No fallar si la auditoría falla
            return true;
        }
    }

    /**
     * Exportar ventas a Excel personalizado
     */
    public function exportarVentasExcel(?string $filtro = null, ?string $fechaDesde = null, ?string $fechaHasta = null): void
    {
        try {
            // Usar JOINs en lugar de la vista
            $sql = "
                SELECT 
                    v.id_venta,
                    v.fecha_venta,
                    v.monto_cobrado,
                    v.costo_total,
                    v.utilidad,
                    v.utilidad_pct,
                    v.metodo_pago,
                    v.estado,
                    u.nombre_usuario as usuario,
                    u_c.nombre_usuario as cliente,
                    p.id_pedido
                FROM venta v
                JOIN pedido p ON v.id_pedido = p.id_pedido
                JOIN usuario u ON v.id_usuario = u.id_usuario
                JOIN usuario u_c ON p.id_usuario = u_c.id_usuario
                WHERE 1=1
            ";
            $params = [];

            // Aplicar filtros
            if (!empty($filtro)) {
                $sql .= " AND (u_c.nombre_usuario LIKE :filtro OR u.nombre_usuario LIKE :filtro OR v.id_venta LIKE :filtro)";
                $params[':filtro'] = "%{$filtro}%";
            }

            if (!empty($fechaDesde)) {
                $sql .= " AND DATE(v.fecha_venta) >= :fechaDesde";
                $params[':fechaDesde'] = $fechaDesde;
            }

            if (!empty($fechaHasta)) {
                $sql .= " AND DATE(v.fecha_venta) <= :fechaHasta";
                $params[':fechaHasta'] = $fechaHasta;
            }

            $sql .= " ORDER BY v.fecha_venta DESC";

            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Generar Excel personalizado
            $this->generarArchivoExcelPersonalizado($ventas);
            
        } catch (\Throwable $e) {
            error_log('VentaModel - exportarVentasExcel ERROR: ' . $e->getMessage());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Generar archivo Excel personalizado
     */
    private function generarArchivoExcelPersonalizado(array $ventas): void
    {
        $filename = 'Ventas_ColorInk_' . date('Y-m-d_H-i-s') . '.xls';
        
        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        header('Pragma: public');
        header('Expires: 0');

        $totalMonto = array_sum(array_column($ventas, 'monto_cobrado'));
        $totalCosto = array_sum(array_column($ventas, 'costo_total'));
        $totalUtilidad = $totalMonto - $totalCosto;
        $margenPromedio = $totalMonto > 0 ? ($totalUtilidad / $totalMonto * 100) : 0;
        
        echo '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">';
        
        // Encabezado principal
        echo '<tr><td colspan="10" style="background-color: #d900bc; color: white; font-size: 16pt; font-weight: bold; text-align: center; padding: 15px;">REPORTE DE VENTAS - COLOR INK</td></tr>';
        
        // Información del reporte
        echo '<tr><td colspan="10" style="background-color: #f8f9fa; padding: 10px; border: 1px solid #dee2e6;">';
        echo '<b>Fecha:</b> ' . date('d/m/Y H:i:s') . ' | ';
        echo '<b>Ventas:</b> ' . count($ventas) . ' | ';
        echo '<b>Ingresos:</b> L ' . number_format($totalMonto, 2) . ' | ';
        echo '<b>Utilidad:</b> L ' . number_format($totalUtilidad, 2) . ' | ';
        echo '<b>Margen:</b> ' . number_format($margenPromedio, 1) . '%';
        echo '</td></tr>';
        
        // Fila vacía
        echo '<tr><td colspan="10" style="height: 10px;"></td></tr>';
        
        // Encabezados de columnas
        echo '<tr style="background-color: #d900bc; color: white; font-weight: bold; text-align: center;">';
        echo '<td>ID Venta</td>';
        echo '<td>Fecha</td>';
        echo '<td>Cliente</td>';
        echo '<td>ID Pedido</td>';
        echo '<td>Metodo Pago</td>';
        echo '<td>Monto Cobrado</td>';
        echo '<td>Costo Total</td>';
        echo '<td>Utilidad</td>';
        echo '<td>Margen %</td>';
        echo '<td>Estado</td>';
        echo '<td>Usuario</td>';
        echo '</tr>';

        // Datos de ventas
        foreach ($ventas as $index => $venta) {
            $bgColor = ($index % 2 === 0) ? '#f8f9fa' : '#ffffff';
            $utilidad = floatval($venta['utilidad'] ?? 0);
            $utilidadColor = $utilidad >= 0 ? '#28a745' : '#dc3545';
            $estadoColor = strtolower($venta['estado']) === 'anulada' ? '#dc3545' : '#28a745';
            
            echo '<tr style="background-color: ' . $bgColor . ';">';
            echo '<td style="text-align: center; font-weight: bold;">' . htmlspecialchars($venta['id_venta']) . '</td>';
            echo '<td style="text-align: center;">' . date('d/m/Y H:i', strtotime($venta['fecha_venta'])) . '</td>';
            echo '<td>' . htmlspecialchars($venta['cliente']) . '</td>';
            echo '<td style="text-align: center; color: #d900bc; font-weight: bold;">' . htmlspecialchars($venta['id_pedido']) . '</td>';
            echo '<td style="text-align: center;">' . htmlspecialchars($venta['metodo_pago']) . '</td>';
            echo '<td style="text-align: right; font-weight: bold;">L ' . number_format($venta['monto_cobrado'], 2) . '</td>';
            echo '<td style="text-align: right; font-weight: bold;">L ' . number_format($venta['costo_total'], 2) . '</td>';
            echo '<td style="text-align: right; font-weight: bold; color: ' . $utilidadColor . ';">L ' . number_format($utilidad, 2) . '</td>';
            echo '<td style="text-align: center; color: ' . $utilidadColor . '; font-weight: bold;">' . number_format($venta['utilidad_pct'] ?? 0, 1) . '%</td>';
            echo '<td style="text-align: center; color: ' . $estadoColor . '; font-weight: bold;">' . htmlspecialchars($venta['estado']) . '</td>';
            echo '<td>' . htmlspecialchars($venta['usuario']) . '</td>';
            echo '</tr>';
        }
        
        // Fila de totales
        echo '<tr style="background-color: #e9ecef; font-weight: bold; border-top: 3px solid #d900bc;">';
        echo '<td colspan="5" style="text-align: center; font-size: 12pt;">TOTALES</td>';
        echo '<td style="text-align: right; font-size: 12pt;">L ' . number_format($totalMonto, 2) . '</td>';
        echo '<td style="text-align: right; font-size: 12pt;">L ' . number_format($totalCosto, 2) . '</td>';
        echo '<td style="text-align: right; font-size: 12pt; color: ' . ($totalUtilidad >= 0 ? '#28a745' : '#dc3545') . ';">L ' . number_format($totalUtilidad, 2) . '</td>';
        echo '<td style="text-align: center; font-size: 12pt; color: ' . ($totalUtilidad >= 0 ? '#28a745' : '#dc3545') . ';">' . number_format($margenPromedio, 1) . '%</td>';
        echo '<td style="text-align: center; font-size: 12pt;">' . count($ventas) . ' ventas</td>';
        echo '</tr>';
        
        echo '</table>';
    }
}
