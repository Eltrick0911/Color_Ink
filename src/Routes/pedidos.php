<?php
// Prevenir cualquier salida antes de los headers
ob_start();

// Incluir el autoloader de Composer
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

use App\Controllers\PedidosController;
use App\Config\responseHTTP;
use App\Config\PedidosLogger;

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
$pedidosController = new PedidosController();

// Obtener método HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Obtener parámetros de la URL
$url = $_GET['route'] ?? '';
$urlSegments = explode('/', $url);

// Log inicial para debugging
error_log("=== PEDIDOS ROUTE ===");
error_log("PedidosRoute - Method: $method");
error_log("PedidosRoute - URL: $url");
error_log("PedidosRoute - Segments: " . json_encode($urlSegments));

// Obtener datos del cuerpo de la petición
$input = [];
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
    
    // También incluir datos de $_POST si existen
    if (!empty($_POST)) {
        $input = array_merge($input, $_POST);
    }
    
    error_log("PedidosRoute - Input data: " . json_encode($input));
}

// Configurar manejo de errores
set_error_handler(function($severity, $message, $file, $line) {
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

// Lógica simplificada de routing
try {
    // Para peticiones sin ruta, asumir 'pedidos'
    if (empty($url)) {
        $url = 'pedidos';
        $urlSegments = ['pedidos'];
    }

    // Log de información de la petición
    $logger = new PedidosLogger();
    $logger->info("Nueva petición - Método: $method, URL: $url");
    $logger->debug("Headers: " . json_encode($headers));
    
    if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
        $logger->debug("Datos de entrada: " . json_encode($input));
    }

    // Caso 1: Test de conexión (siempre disponible)
    if ($method === 'GET' && isset($urlSegments[0]) && $urlSegments[0] === 'test-connection') {
        $logger->info("Routing: GET /test-connection");
        $pedidosController->testConnection();
        return;
    }

    // Caso 2: Listado de pedidos (ruta por defecto)
    if ($method === 'GET' && (empty($urlSegments[0]) || $urlSegments[0] === 'pedidos')) {
        error_log("PedidosRoute - Routing: GET /pedidos");
        $pedidosController->findAll($headers);
        exit;
    }

    // Determinar acción principal basada en segmentos de URL
    $action = $urlSegments[0] ?? '';
    $id = isset($urlSegments[1]) && is_numeric($urlSegments[1]) ? (int)$urlSegments[1] : null;
    $subaction = $urlSegments[2] ?? null;
    $subid = isset($urlSegments[3]) && is_numeric($urlSegments[3]) ? (int)$urlSegments[3] : null;

    error_log("PedidosRoute - Parsed: Action='$action', ID=$id, SubAction='$subaction', SubID=$subid");

    switch ($method) {
        case 'GET':
            if ($action === 'pedidos') {
                if ($subaction === 'usuario' && $id) {
                    // GET /pedidos/{id}/usuario
                    error_log("PedidosRoute - Routing: GET /pedidos/$id/usuario");
                    $pedidosController->findByUser($headers, $id);
                } elseif ($subaction === 'detalle' && $id) {
                    // GET /pedidos/detalle/{id}
                    error_log("PedidosRoute - Routing: GET /pedidos/detalle/$id");
                    $pedidosController->obtenerDetalle($headers, $id);
                } elseif ($subaction === 'estados') {
                    // GET /pedidos/estados
                    error_log("PedidosRoute - Routing: GET /pedidos/estados");
                    $pedidosController->getEstados($headers);
                } elseif ($id) {
                    // GET /pedidos/{id}
                    error_log("PedidosRoute - Routing: GET /pedidos/$id");
                    $pedidosController->findOne($headers, $id);
                } else {
                    // GET /pedidos
                    error_log("PedidosRoute - Routing: GET /pedidos");
                    $pedidosController->findAll($headers);
                }
            } elseif ($action === 'estados') {
                // GET /estados
                error_log("PedidosRoute - Routing: GET /estados");
                $pedidosController->getEstados($headers);
            } else {
                error_log("PedidosRoute - ERROR: Endpoint GET no encontrado - Action: $action");
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        case 'POST':
            if ($action === 'pedidos') {
                if ($subaction === 'detalle' && $id) {
                    // POST /pedidos/{id}/detalle
                    error_log("PedidosRoute - Routing: POST /pedidos/$id/detalle");
                    $pedidosController->crearDetalle($headers, $id, $input);
                } else {
                    // POST /pedidos
                    error_log("PedidosRoute - Routing: POST /pedidos");
                    $pedidosController->create($headers, $input);
                }
            } else {
                error_log("PedidosRoute - ERROR: Endpoint POST no encontrado - Action: $action");
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        case 'PUT':
            if ($action === 'pedidos') {
                if ($subaction === 'detalle' && $id) {
                    // PUT /pedidos/detalle/{id}
                    error_log("PedidosRoute - Routing: PUT /pedidos/detalle/$id");
                    $pedidosController->actualizarDetalle($headers, $id, $input);
                } elseif ($subaction === 'cambiar-estado' && $id) {
                    // PUT /pedidos/{id}/cambiar-estado
                    error_log("PedidosRoute - Routing: PUT /pedidos/$id/cambiar-estado");
                    $pedidosController->cambiarEstado($headers, $id, $input);
                } elseif ($id) {
                    // PUT /pedidos/{id}
                    error_log("PedidosRoute - Routing: PUT /pedidos/$id");
                    $pedidosController->update($headers, $id, $input);
                } else {
                    error_log("PedidosRoute - ERROR: Endpoint PUT no encontrado - ID requerido");
                    echo json_encode(responseHTTP::status404('Endpoint no encontrado - ID requerido'));
                }
            } else {
                error_log("PedidosRoute - ERROR: Endpoint PUT no encontrado - Action: $action");
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        case 'DELETE':
            if ($action === 'pedidos') {
                if ($subaction === 'detalle' && $id) {
                    // DELETE /pedidos/detalle/{id}
                    error_log("PedidosRoute - Routing: DELETE /pedidos/detalle/$id");
                    $pedidosController->eliminarDetalle($headers, $id);
                } elseif ($id) {
                    // DELETE /pedidos/{id}
                    error_log("PedidosRoute - Routing: DELETE /pedidos/$id");
                    $pedidosController->remove($headers, $id);
                } else {
                    error_log("PedidosRoute - ERROR: Endpoint DELETE no encontrado - ID requerido");
                    echo json_encode(responseHTTP::status404('Endpoint no encontrado - ID requerido'));
                }
            } else {
                error_log("PedidosRoute - ERROR: Endpoint DELETE no encontrado - Action: $action");
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        default:
            error_log("PedidosRoute - ERROR: Método no permitido - $method");
            http_response_code(405);
            echo json_encode(responseHTTP::status400('Método no permitido'));
            break;
    }
    
} catch (\PDOException $e) {
    $logger->error("ERROR DE BASE DE DATOS: " . $e->getMessage());
    $logger->error("Stack trace: " . $e->getTraceAsString());
    responseHTTP::sendResponse(
        responseHTTP::status500('Error de base de datos: ' . $e->getMessage()),
        500
    );
} catch (\Exception $e) {
    $logger->error("ERROR CRÍTICO: " . $e->getMessage());
    $logger->error("Stack trace: " . $e->getTraceAsString());
    responseHTTP::sendResponse(
        responseHTTP::status500('Error interno del servidor'),
        500
    );
} finally {
    $logger->info("Fin de la petición");
    restore_error_handler();
}

?>