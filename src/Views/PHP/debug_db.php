<?php
// Diagnóstico de dataDB.php y connectionDB.php
header('Content-Type: application/json');

use App\DB\connectionDB;

$result = [
    'timestamp' => date('Y-m-d H:i:s'),
    'env_before_datadb' => [],
    'datadb_loaded' => false,
    'env_after_datadb' => [],
    'connection_test' => false,
    'table_test' => false,
    'errors' => []
];

try {
    // Capturar estado antes de cargar dataDB.php
    $result['env_before_datadb'] = [
        'IP' => $_ENV['IP'] ?? 'not_set',
        'PORT' => $_ENV['PORT'] ?? 'not_set',
        'DB' => $_ENV['DB'] ?? 'not_set',
        'USER' => $_ENV['USER'] ?? 'not_set',
        'PASSWORD_set' => !empty($_ENV['PASSWORD'] ?? '')
    ];
    
    // Cargar dataDB.php
    require_once dirname(dirname(dirname(__DIR__))) . '/vendor/autoload.php';
    require_once dirname(dirname(__DIR__)) . '/DB/dataDB.php';
    $result['datadb_loaded'] = true;
    
    // Capturar estado después de cargar dataDB.php
    $result['env_after_datadb'] = [
        'IP' => $_ENV['IP'] ?? 'not_set',
        'PORT' => $_ENV['PORT'] ?? 'not_set', 
        'DB' => $_ENV['DB'] ?? 'not_set',
        'USER' => $_ENV['USER'] ?? 'not_set',
        'PASSWORD_set' => !empty($_ENV['PASSWORD'] ?? '')
    ];
    
    // Test connectionDB::getConnection()
    $pdo = connectionDB::getConnection();
    $result['connection_test'] = true;
    $result['server_info'] = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
    
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