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
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Si es una petición OPTIONS, terminamos aquí
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

use App\Controllers\PedidosController;
use App\Config\responseHTTP;

error_log("=== PRODUCTOS ROUTE ===");
error_log("ProductosRoute - Method: " . $_SERVER['REQUEST_METHOD']);

try {
    // Solo permitir GET
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(responseHTTP::status400('Método no permitido'));
        exit;
    }

    // Obtener headers
    $headers = getallheaders();
    
    // Instanciar controlador de pedidos
    $pedidosController = new PedidosController();
    
    error_log("ProductosRoute - Llamando a getProductos()");
    
    // Llamar al método para obtener productos
    $pedidosController->getProductos();
    
} catch (\Exception $e) {
    error_log("ERROR CRÍTICO en ProductosRoute: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    echo json_encode(responseHTTP::status500('Error interno del servidor: ' . $e->getMessage()));
} finally {
    ob_end_flush();
}

?>
