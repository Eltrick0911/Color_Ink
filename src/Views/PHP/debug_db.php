<?php
// Endpoint de diagnóstico usando dataDB.php
header('Content-Type: application/json');

require_once dirname(dirname(dirname(__DIR__))) . '/vendor/autoload.php';
require_once dirname(dirname(__DIR__)) . '/DB/dataDB.php';

use App\DB\connectionDB;

$result = [
    'timestamp' => date('Y-m-d H:i:s'),
    'datadb_loaded' => false,
    'connection_test' => false,
    'table_test' => false,
    'errors' => []
];

try {
    $result['datadb_loaded'] = true;
    
    // Usar dataDB.php para obtener conexión
    $pdo = connectionDB::getConnection();
    $result['connection_test'] = true;
    $result['server_info'] = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
    
    // Mostrar configuración desde variables de entorno
    $result['config'] = [
        'host' => $_ENV['IP'] ?? 'not_found',
        'port' => $_ENV['PORT'] ?? 'not_found',
        'database' => $_ENV['DB'] ?? 'not_found',
        'user' => $_ENV['USER'] ?? 'not_found',
        'password_set' => !empty($_ENV['PASSWORD'] ?? '')
    ];
    
    // Test tabla pedido
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM pedido LIMIT 1");
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    $result['table_test'] = true;
    $result['pedido_count'] = $count['count'];
    
} catch (Exception $e) {
    $result['errors'][] = $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT);
?>