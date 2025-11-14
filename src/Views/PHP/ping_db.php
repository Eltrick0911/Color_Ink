<?php
// Ping simple a RDS
header('Content-Type: text/plain');

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

// Cargar .env desde la raíz del proyecto
$envPath = dirname(dirname(dirname(__DIR__))) . '/.env';
loadEnv($envPath);

$host = getenv('IP') ?: $_ENV['IP'];
$port = getenv('PORT') ?: $_ENV['PORT'];

echo "Testing connection to: $host:$port\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";

// Test socket connection
$socket = @fsockopen($host, $port, $errno, $errstr, 10);
if ($socket) {
    echo "Socket connection: SUCCESS\n";
    fclose($socket);
} else {
    echo "Socket connection: FAILED - $errstr ($errno)\n";
}

// Test MySQL connection
try {
    $user = getenv('USER') ?: $_ENV['USER'];
    $pass = getenv('PASSWORD') ?: $_ENV['PASSWORD'];
    $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 10
    ]);
    echo "MySQL connection: SUCCESS\n";
} catch (Exception $e) {
    echo "MySQL connection: FAILED - " . $e->getMessage() . "\n";
}
?>