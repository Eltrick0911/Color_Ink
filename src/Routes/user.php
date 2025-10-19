<?php
use App\Controllers\UserController;
use App\Config\responseHTTP;

header('Content-Type: application/json');

$controller = new UserController();
$method = $_SERVER['REQUEST_METHOD'];
$headers = function_exists('getallheaders') ? getallheaders() : [];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'list') {
            $controller->listUsersAction($headers);
        } elseif ($action === 'get') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $controller->getById($headers, $id);
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
    case 'POST':
        if ($action === 'update') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $controller->update($headers, $id, $input);
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
    case 'DELETE':
        if ($action === 'delete') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $controller->delete($headers, $id);
        } elseif ($action === 'block') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $controller->block($headers, $id);
        } elseif ($action === 'unblock') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $controller->unblock($headers, $id);
        } else {
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción no válida']);
        }
        break;
    default:
        echo json_encode(['status' => 'ERROR', 'message' => 'Método no permitido']);
}

?>

