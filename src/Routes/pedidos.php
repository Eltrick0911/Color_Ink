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

// Debugging para ver la ruta exacta
error_log("PedidosRoute - URL raw: " . $_GET['route']);
error_log("PedidosRoute - URL segments: " . implode(', ', $url));

// Nueva lógica mejorada para determinar action, id, etc.
if (count($url) > 0) {
    // Si el primer segmento es 'pedidos', ajustar índices
    if ($url[0] === 'pedidos') {
        // Caso: pedidos/accion/id o pedidos/id
        if (isset($url[1])) {
            if (is_numeric($url[1])) {
                // Es un ID: pedidos/123
                $action = null;
                $id = (int)$url[1];
            } else {
                // Es una acción: pedidos/accion
                $action = $url[1];
                $id = isset($url[2]) ? (int)$url[2] : null;
            }
        } else {
            // Solo 'pedidos'
            $action = null;
            $id = null;
        }
    } else if (is_numeric($url[0])) {
        // Caso directo con ID: /123
        $action = null;
        $id = (int)$url[0];
    } else {
        // Caso: accion/id
        $action = $url[0];
        $id = isset($url[1]) ? (int)$url[1] : null;
    }
    
    // Subacción y subid
    if ($action !== null && $id !== null) {
        $subaction = $url[3] ?? null;
        $subid = isset($url[4]) ? (int)$url[4] : null;
    } else if ($action !== null) {
        $subaction = $url[2] ?? null;
        $subid = isset($url[3]) ? (int)$url[3] : null;
    } else if ($id !== null) {
        $subaction = $url[1] ?? null;
        $subid = isset($url[2]) ? (int)$url[2] : null;
    } else {
        $subaction = null;
        $subid = null;
    }
}

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
error_log("PedidosRoute - Method: $method, Action: " . ($action ?? "null") . ", ID: " . ($id ?? "null") . ", SubAction: " . ($subaction ?? "null") . ", SubID: " . ($subid ?? "null"));
error_log("PedidosRoute - Original URL: " . $_GET['route']);
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
            if ($id && $action === 'detalle') {
                // POST /pedidos/{id_pedido}/detalle
                $pedidosController->crearDetalle($headers, $id, $input);
                
            } elseif (!$action && !$id) {
                // POST /pedidos
                $pedidosController->create($headers, $input);
                
            } else {
                echo json_encode(responseHTTP::status404('Endpoint no encontrado'));
            }
            break;

        case 'PUT':
            if ($action === 'detalle' && $id) {
                // PUT /pedidos/detalle/{id_detalle}
                $pedidosController->actualizarDetalle($headers, $id, $input);
                
            } elseif ($id && $action === 'cambiar-estado') {
                // PUT /pedidos/{id}/cambiar-estado
                $pedidosController->cambiarEstado($headers, $id, $input);
                
            } elseif ($id && !$action) {
                // PUT /pedidos/{id}
                $pedidosController->update($headers, $id, $input);
                
            } else {
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