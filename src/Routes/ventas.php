<?php
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

use App\Controllers\VentaController;
use App\Config\responseHTTP;

header('Content-Type: application/json');

// Habilitar CORS si es necesario
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$controller = new VentaController();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pathInfo = $_SERVER['PATH_INFO'] ?? '';

// Si hay PATH_INFO, extraer el ID de la URL
$id = null;
if ($pathInfo) {
    preg_match('/\/(\d+)/', $pathInfo, $matches);
    $id = isset($matches[1]) ? (int)$matches[1] : null;
}

switch ($method) {
    case 'POST':
        if ($action === 'crear' || strpos($_SERVER['REQUEST_URI'], '/api/ventas') !== false && !$action) {
            $controller->crearVenta();
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
        
    case 'GET':
        if ($action === 'listar' || (strpos($_SERVER['REQUEST_URI'], '/api/ventas') !== false && !$action && !$id)) {
            $controller->listarVentas();
        } elseif ($action === 'obtener' || $id !== null) {
            $controller->obtenerVenta($id);
        } elseif ($action === 'reporte' || strpos($_SERVER['REQUEST_URI'], '/reporte') !== false) {
            $controller->obtenerReporte();
        } elseif ($action === 'exportar-excel' || $action === 'export_excel' || strpos($_SERVER['REQUEST_URI'], '/export/excel') !== false) {
            $controller->exportarExcel();
        } elseif ($action === 'pedidos-disponibles' || strpos($_SERVER['REQUEST_URI'], '/pedidos-disponibles') !== false) {
            $controller->obtenerPedidosDisponibles();
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
        
    case 'PUT':
        if ($action === 'editar') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : $id;
            if ($id) {
                $controller->editarVenta($id);
            } else {
                echo json_encode(['status' => 'ERROR', 'message' => 'ID requerido']);
            }
        } elseif (strpos($_SERVER['REQUEST_URI'], '/anular') !== false || $action === 'anular') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : $id;
            if ($id) {
                $controller->anularVenta($id);
            } else {
                echo json_encode(['status' => 'ERROR', 'message' => 'ID requerido']);
            }
        } else {
            // Intentar editar si hay ID en la URL
            if ($id) {
                $controller->editarVenta($id);
            } else {
                echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
            }
        }
        break;
        
    case 'DELETE':
        if ($action === 'eliminar') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : $id;
            if ($id) {
                // En este caso, eliminar es anular
                $controller->anularVenta($id);
            } else {
                echo json_encode(['status' => 'ERROR', 'message' => 'ID requerido']);
            }
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
        
    default:
        echo json_encode(['status' => 'ERROR', 'message' => 'Método no permitido']);
}

?>

