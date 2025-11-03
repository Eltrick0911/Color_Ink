<?php
use App\Controllers\AuditController;

header('Content-Type: application/json');

$controller = new AuditController();
$method = $_SERVER['REQUEST_METHOD'];
$headers = function_exists('getallheaders') ? getallheaders() : [];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'list') {
            $controller->list($headers, $_GET);
        } elseif ($action === 'filters') {
            $controller->filters($headers, $_GET);
        } elseif ($action === 'tables') {
            $controller->tables($headers);
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
    default:
        echo json_encode(['status' => 'ERROR', 'message' => 'Método no permitido']);
}
