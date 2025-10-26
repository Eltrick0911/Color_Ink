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
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Si es una petición OPTIONS, terminamos aquí
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

use App\Controllers\UploadController;
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

// Obtener headers
$headers = getallheaders();

// Instanciar controlador
$uploadController = new UploadController();

// Obtener método HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Obtener parámetros de la URL
$url = $_GET['route'] ?? '';
$urlSegments = explode('/', $url);

error_log("=== UPLOAD ROUTE ===");
error_log("UploadRoute - Method: $method");
error_log("UploadRoute - URL: $url");

// Configurar manejo de errores
set_error_handler(function($severity, $message, $file, $line) {
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

try {
    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(responseHTTP::status400('Método no permitido'));
        exit;
    }

    $action = $urlSegments[1] ?? 'single';

    switch ($action) {
        case 'multiple':
        case 'multi':
            error_log("UploadRoute - Routing: POST /upload/multiple");
            $uploadController->uploadMultiple($headers, $_FILES);
            break;
            
        case 'single':
        default:
            error_log("UploadRoute - Routing: POST /upload");
            $uploadController->uploadImage($headers, $_FILES);
            break;
    }
    
} catch (\Exception $e) {
    error_log("ERROR CRÍTICO UPLOAD: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    header('Content-Type: application/json');
    echo json_encode(responseHTTP::status500('Error interno del servidor'));
} finally {
    restore_error_handler();
}

?>
