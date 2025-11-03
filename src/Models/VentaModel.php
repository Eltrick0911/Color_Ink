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
    public function listarVentas(?string $filtro = null, ?string $fechaDesde = null, ?string $fechaHasta = null): array
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

            $sql .= " ORDER BY v.fecha_venta DESC";

            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log('VentaModel - listarVentas: Encontradas ' . count($ventas) . ' ventas');
            
            $response = responseHTTP::status200('OK');
            $response['data'] = $ventas;
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
            
            // Consulta simplificada para obtener pedidos
            $sql = "
                SELECT 
                    p.id_pedido,
                    p.numero_pedido,
                    p.fecha_pedido,
                    p.id_usuario as id_cliente,
                    u.nombre_usuario as nombre_cliente,
                    ep.nombre as estado_nombre,
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
     * Exportar ventas a Excel usando la vista vw_registro_ventas
     */
    public function exportarVentasExcel(?string $filtro = null, ?string $fechaDesde = null, ?string $fechaHasta = null): array
    {
        try {
            // Usar la vista vw_registro_ventas que ya tiene todos los JOINs
            $sql = "SELECT * FROM vw_registro_ventas WHERE 1=1";
            $params = [];

            // Aplicar filtros
            if (!empty($filtro)) {
                $sql .= " AND (cliente LIKE :filtro OR usuario LIKE :filtro OR id_venta LIKE :filtro)";
                $params[':filtro'] = "%{$filtro}%";
            }

            if (!empty($fechaDesde)) {
                $sql .= " AND DATE(fecha_venta) >= :fechaDesde";
                $params[':fechaDesde'] = $fechaDesde;
            }

            if (!empty($fechaHasta)) {
                $sql .= " AND DATE(fecha_venta) <= :fechaHasta";
                $params[':fechaHasta'] = $fechaHasta;
            }

            $sql .= " ORDER BY fecha_venta DESC";

            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Generar Excel
            $this->generarArchivoExcel($ventas);
            
            return responseHTTP::status200('Excel generado exitosamente');
        } catch (\Throwable $e) {
            error_log('VentaModel - exportarVentasExcel ERROR: ' . $e->getMessage());
            return responseHTTP::status500();
        }
    }

    /**
     * Generar archivo Excel simple
     */
    private function generarArchivoExcel(array $ventas): void
    {
        $filename = 'ventas_' . date('Y-m-d_H-i-s') . '.xls';
        
        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        header('Pragma: public');
        header('Expires: 0');

        echo "<table border='1'>";
        echo "<tr style='background-color: #d900bc; color: white; font-weight: bold;'>";
        echo "<th>ID Venta</th>";
        echo "<th>Fecha</th>";
        echo "<th>Cliente</th>";
        echo "<th>ID Pedido</th>";
        echo "<th>Método Pago</th>";
        echo "<th>Monto Cobrado</th>";
        echo "<th>Costo Total</th>";
        echo "<th>Utilidad</th>";
        echo "<th>Margen %</th>";
        echo "<th>Estado</th>";
        echo "<th>Usuario</th>";
        echo "</tr>";

        foreach ($ventas as $venta) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($venta['id_venta']) . "</td>";
            echo "<td>" . date('d/m/Y H:i', strtotime($venta['fecha_venta'])) . "</td>";
            echo "<td>" . htmlspecialchars($venta['cliente']) . "</td>";
            echo "<td>" . htmlspecialchars($venta['id_pedido']) . "</td>";
            echo "<td>" . htmlspecialchars($venta['metodo_pago']) . "</td>";
            echo "<td>$" . number_format($venta['monto_cobrado'], 2) . "</td>";
            echo "<td>$" . number_format($venta['costo_total'], 2) . "</td>";
            echo "<td>$" . number_format($venta['utilidad'], 2) . "</td>";
            echo "<td>" . number_format($venta['utilidad_pct'], 1) . "%</td>";
            echo "<td>" . htmlspecialchars($venta['estado']) . "</td>";
            echo "<td>" . htmlspecialchars($venta['usuario']) . "</td>";
            echo "</tr>";
        }
        
        // Fila de totales
        $totalMonto = array_sum(array_column($ventas, 'monto_cobrado'));
        $totalCosto = array_sum(array_column($ventas, 'costo_total'));
        $totalUtilidad = $totalMonto - $totalCosto;
        $margenPromedio = $totalCosto > 0 ? ($totalUtilidad / $totalCosto * 100) : 0;
        
        echo "<tr style='background-color: #f8f9fa; font-weight: bold;'>";
        echo "<td colspan='5'>TOTALES</td>";
        echo "<td>$" . number_format($totalMonto, 2) . "</td>";
        echo "<td>$" . number_format($totalCosto, 2) . "</td>";
        echo "<td>$" . number_format($totalUtilidad, 2) . "</td>";
        echo "<td>" . number_format($margenPromedio, 1) . "%</td>";
        echo "<td colspan='2'>" . count($ventas) . " ventas</td>";
        echo "</tr>";
        
        echo "</table>";
    }
}
