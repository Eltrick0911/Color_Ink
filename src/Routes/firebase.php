<?php
use App\Controllers\FirebaseController;

header('Content-Type: application/json');

$controller = new FirebaseController();
$method = $_SERVER['REQUEST_METHOD'];
$headers = function_exists('getallheaders') ? getallheaders() : [];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'POST':
        if ($action === 'login') {
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $controller->login($headers, $input);
        } elseif ($action === 'logout') {
            $controller->logout();
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
    case 'GET':
        if ($action === 'me') {
            $controller->me();
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
    default:
        echo json_encode(['status' => 'ERROR', 'message' => 'Método no permitido']);
}


