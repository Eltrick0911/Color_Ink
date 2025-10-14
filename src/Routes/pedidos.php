<?php

use App\Controllers\PedidosController;
use App\Config\responseHTTP;

// Obtener headers
$headers = getallheaders();

// Instanciar controlador
$pedidosController = new PedidosController();

// Obtener método HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Obtener parámetros de la URL
$url = explode('/', $_GET['route']);
<<<<<<< Updated upstream
$action = $url[1] ?? null;
$id = isset($url[2]) ? (int)$url[2] : null;
$subaction = $url[3] ?? null;
$subid = isset($url[4]) ? (int)$url[4] : null;
=======

// Comprobar si el primer segmento es 'pedidos' y ajustar los índices en consecuencia
if ($url[0] === 'pedidos') {
    $action = $url[1] ?? null;
    $id = isset($url[2]) ? (int)$url[2] : null;
    $subaction = $url[3] ?? null;
    $subid = isset($url[4]) ? (int)$url[4] : null;
} else {
    // Si la ruta no comienza con 'pedidos', asumimos que es la estructura antigua
    $action = $url[0] ?? null;
    $id = isset($url[1]) ? (int)$url[1] : null;
    $subaction = $url[2] ?? null;
    $subid = isset($url[3]) ? (int)$url[3] : null;
}
>>>>>>> Stashed changes

// Obtener datos del cuerpo de la petición
$input = [];
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
    
    // También incluir datos de $_POST si existen
    if (!empty($_POST)) {
        $input = array_merge($input, $_POST);
    }
}

// Logging para debugging
<<<<<<< Updated upstream
=======
error_log("PedidosRoute - Raw route: " . $_GET['route']);
error_log("PedidosRoute - URL array: " . json_encode($url));
>>>>>>> Stashed changes
error_log("PedidosRoute - Method: $method, Action: $action, ID: $id, SubAction: $subaction, SubID: $subid");
error_log("PedidosRoute - Input: " . json_encode($input));

try {
    switch ($method) {
        case 'GET':
            if ($action === 'test-connection') {
                // GET /pedidos/test-connection
                $pedidosController->testConnection();
                
            } elseif ($action === 'usuario' && $id) {
                // GET /pedidos/usuario/{id_usuario}
                $pedidosController->findByUser($headers, $id);
                
            } elseif ($action === 'detalle' && $id) {
                // GET /pedidos/detalle/{id_detalle}
                $pedidosController->obtenerDetalle($headers, $id);
                
            } elseif ($action === 'estados') {
                // GET /pedidos/estados
                $pedidosController->getEstados($headers);
                
            } elseif ($id && !$action) {
                // GET /pedidos/{id}
                $pedidosController->findOne($headers, $id);
                
            } elseif (!$action && !$id) {
                // GET /pedidos
                $pedidosController->findAll($headers);
                
            } else {
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        case 'POST':
<<<<<<< Updated upstream
=======
            error_log("POST request - action: " . ($action ?? 'null') . ", id: " . ($id ?? 'null'));
            error_log("POST request - input: " . json_encode($input));

>>>>>>> Stashed changes
            if ($id && $action === 'detalle') {
                // POST /pedidos/{id_pedido}/detalle
                $pedidosController->crearDetalle($headers, $id, $input);
                
<<<<<<< Updated upstream
=======
            } elseif ($action === 'detalle' && !$id && isset($input['id_pedido'])) {
                // POST /pedidos/detalle (con id_pedido en el JSON)
                error_log("POST request - Creando detalle con id_pedido desde JSON: " . $input['id_pedido']);
                $pedidosController->crearDetalle($headers, (int)$input['id_pedido'], $input);
                
>>>>>>> Stashed changes
            } elseif (!$action && !$id) {
                // POST /pedidos
                $pedidosController->create($headers, $input);
                
            } else {
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        case 'PUT':
<<<<<<< Updated upstream
            if ($action === 'detalle' && $id) {
=======
            error_log("PUT request - action: " . ($action ?? 'null') . ", id: " . ($id ?? 'null'));
            error_log("PUT request - input: " . json_encode($input));
            
            if ($action === 'detalle' && $id) {
                error_log("PUT request - Ejecutando actualizarDetalle para detalle con ID: " . $id);
>>>>>>> Stashed changes
                // PUT /pedidos/detalle/{id_detalle}
                $pedidosController->actualizarDetalle($headers, $id, $input);
                
            } elseif ($id && $action === 'cambiar-estado') {
<<<<<<< Updated upstream
=======
                error_log("PUT request - Ejecutando cambiarEstado para pedido con ID: " . $id);
>>>>>>> Stashed changes
                // PUT /pedidos/{id}/cambiar-estado
                $pedidosController->cambiarEstado($headers, $id, $input);
                
            } elseif ($id && !$action) {
<<<<<<< Updated upstream
=======
                error_log("PUT request - Ejecutando update para pedido con ID: " . $id);
>>>>>>> Stashed changes
                // PUT /pedidos/{id}
                $pedidosController->update($headers, $id, $input);
                
            } else {
<<<<<<< Updated upstream
=======
                error_log("PUT request - Endpoint no encontrado");
>>>>>>> Stashed changes
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        case 'DELETE':
            if ($action === 'detalle' && $id) {
                // DELETE /pedidos/detalle/{id_detalle}
                $pedidosController->eliminarDetalle($headers, $id);
                
            } elseif ($id && !$action) {
                // DELETE /pedidos/{id}
                $pedidosController->remove($headers, $id);
                
            } else {
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(responseHTTP::status400('Método no permitido'));
            break;
    }
    
} catch (\Exception $e) {
    error_log("Error en rutas de pedidos: " . $e->getMessage());
    echo json_encode(responseHTTP::status500('Error interno del servidor: ' . $e->getMessage()));
}

?>