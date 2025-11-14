<?php
// Endpoint de diagnóstico para verificar conexión RDS
header('Content-Type: application/json');

// Cargar variables de entorno
function loadEnv($path) {
    if (!file_exists($path)) return false;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim(trim($value), '"');
    }
    return true;
}

$result = [
    'timestamp' => date('Y-m-d H:i:s'),
    'env_loaded' => false,
    'connection_test' => false,
    'table_test' => false,
    'errors' => []
];

try {
    // Usar variables de entorno del sistema (Render) primero, luego .env como fallback
    $envPath = dirname(dirname(dirname(__DIR__))) . '/.env';
    $result['env_loaded'] = loadEnv($envPath);
    
    $host = getenv('IP') ?: ($_ENV['IP'] ?? 'not_found');
    $port = getenv('PORT') ?: ($_ENV['PORT'] ?? 'not_found');
    $db = getenv('DB') ?: ($_ENV['DB'] ?? 'not_found');
    $user = getenv('USER') ?: ($_ENV['USER'] ?? 'not_found');
    $pass = getenv('PASSWORD') ?: ($_ENV['PASSWORD'] ?? 'not_found');
    
    $result['config'] = [
        'host' => $host,
        'port' => $port,
        'database' => $db,
        'user' => $user,
        'password_set' => !empty($pass)
    ];
    
    // Test conexión
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 10
    ]);
    
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