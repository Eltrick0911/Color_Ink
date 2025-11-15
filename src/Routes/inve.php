<?php

ob_start();

$autoloadPath = realpath(__DIR__ . '/../../vendor/autoload.php');
if (!$autoloadPath || !file_exists($autoloadPath)) {
    header('Content-Type: application/json');
    echo json_encode([
        'error' => true,
        'message' => 'Error de configuración: No se pudo encontrar el autoloader'
    ]);
    exit;
}
require_once $autoloadPath;

// Configuración de errores
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Headers CORS y JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Si es una petición OPTIONS, terminamos aquí
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

use App\Controllers\inveController;
use App\Config\responseHTTP;

// Manejar errores fatales
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
        $response = [
            'status' => 'ERROR',
            'code' => 500,
            'message' => 'Error fatal: ' . $error['message'],
            'file' => $error['file'],
            'line' => $error['line']
        ];
        header('Content-Type: application/json');
        echo json_encode($response);
    }
    ob_end_flush();
});

error_log('inve route: Iniciando');
error_log('inve route: Headers enviados');

try { 
    error_log('inve route: Imports cargados');
    
    $controller = new inveController();
    error_log('inve route: Controller creado');
    
    $method = $_SERVER['REQUEST_METHOD'];
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $action = $_GET['action'] ?? '';
    
    error_log('inve route: Método: ' . $method . ', Acción: ' . $action);
   
    
    switch ($method) {
        case 'GET':
            if ($action === 'proveedores') {
                error_log('inve route: Llamando getProveedores');
                $controller->getProveedores($headers);
            } elseif ($action === 'proveedores-completos') {
                error_log('inve route: Llamando getProveedoresCompletos');
                $controller->getProveedoresCompletos($headers);
            } elseif ($action === 'categorias') {
                error_log('inve route: Llamando getCategorias');
                $controller->getCategorias($headers);
            } elseif ($action === 'productos') {
                error_log('inve route: Llamando getProductos');
                $controller->getProductos($headers);
            } elseif ($action === 'estadisticas') {
                error_log('inve route: Llamando getEstadisticas');
                $controller->getEstadisticas($headers);
            } elseif ($action === 'exportar-excel') {
                error_log('inve route: Llamando exportarExcel');
                $controller->exportarExcel($headers);
            } elseif ($action === 'producto') {
                error_log('inve route: Llamando getProducto');
                $id = $_GET['id'] ?? '';
                $controller->getProducto($headers, $id);
            } elseif ($action === 'ultimo-id') {
                error_log('inve route: Llamando getUltimoIdProducto');
                $controller->getUltimoIdProducto($headers);
            } elseif ($action === 'siguiente-sku') {
                error_log('inve route: Llamando getSiguienteSkuPorCategoria');
                $controller->getSiguienteSkuPorCategoria($headers);
            } elseif ($action === 'alertas-stock') {
                error_log('inve route: Llamando getAlertasStock');
                $controller->getAlertasStock($headers);
            } elseif ($action === 'proveedor') {
                error_log('inve route: Llamando getProveedor');
                $id = $_GET['id'] ?? '';
                $controller->getProveedor($headers, $id);
            } else {
                error_log('inve route: Acción GET no válida: ' . $action);
                http_response_code(400);
                echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida: ' . $action]);
            }
            break;
        case 'POST':
            if ($action === 'add') {
                error_log('inve route: Llamando addProduct');
                $input = json_decode(file_get_contents('php://input'), true);
                if ($input === null && json_last_error() !== JSON_ERROR_NONE) {
                    // Si no se pudo decodificar JSON, usar $_POST
                    $input = $_POST;
                    error_log('inve route: JSON decode falló, usando $_POST');
                }
                if (empty($input)) {
                    error_log('inve route: Input vacío');
                    http_response_code(400);
                    echo json_encode(['status' => 'ERROR', 'message' => 'No se recibieron datos del producto']);
                    break;
                }
                error_log('inve route: Input recibido: ' . json_encode($input));
                $controller->addProduct($headers, $input);
            } elseif ($action === 'update') {
                error_log('inve route: Llamando updateProduct');
                $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
                error_log('inve route: Input recibido: ' . json_encode($input));
                $controller->updateProduct($headers, $input);
            } elseif ($action === 'delete') {
                error_log('inve route: Llamando deleteProduct');
                $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
                error_log('inve route: Input recibido: ' . json_encode($input));
                $controller->deleteProduct($headers, $input);
            } elseif ($action === 'marcar-alerta') {
                error_log('inve route: Llamando marcarAlertaAtendida');
                $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
                error_log('inve route: Input recibido: ' . json_encode($input));
                $controller->marcarAlertaAtendida($headers, $input);
            } elseif ($action === 'add-proveedor') {
                error_log('inve route: Llamando addProveedor');
                $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
                error_log('inve route: Input recibido: ' . json_encode($input));
                $controller->addProveedor($headers, $input);
            } elseif ($action === 'delete-proveedor') {
                error_log('inve route: Llamando deleteProveedor');
                $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
                error_log('inve route: Input recibido: ' . json_encode($input));
                $controller->deleteProveedor($headers, $input);
            } elseif ($action === 'update-proveedor') {
                error_log('inve route: Llamando updateProveedor');
                $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
                error_log('inve route: Input recibido: ' . json_encode($input));
                $controller->updateProveedor($headers, $input);
            } else {
                error_log('inve route: Acción POST no válida: ' . $action);
                http_response_code(400);
                echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida: ' . $action]);
            }
            break;
        default:
            error_log('inve route: Método no permitido: ' . $method);
            http_response_code(405);
            echo json_encode(['status' => 'ERROR', 'message' => 'Método no permitido']);
    }
    
    error_log('inve route: Proceso completado');
    
} catch (\Throwable $e) {
    error_log('inve route: Error: ' . $e->getMessage());
    error_log('inve route: Stack trace: ' . $e->getTraceAsString());
    error_log('inve route: File: ' . $e->getFile() . ' Line: ' . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'status' => 'ERROR', 
        'message' => 'Error interno: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

?>
