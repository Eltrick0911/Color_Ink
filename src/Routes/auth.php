<?php
use App\Controllers\AuthController;

header('Content-Type: application/json');

$controller = new AuthController();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        if ($action === 'register') {
            $controller->register($input);
        } elseif ($action === 'login') {
            $controller->login($input);
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
    case 'DELETE':
        if ($action === 'logout') {
            $controller->logout();
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
    default:
        echo json_encode(['status' => 'ERROR', 'message' => 'Método no permitido']);
}