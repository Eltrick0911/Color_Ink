<?php
// Ping simple a RDS
header('Content-Type: text/plain');

function loadEnv($path) {
    if (!file_exists($path)) return false;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value, '"');
    }
    return true;
}

loadEnv('.env');

$host = $_ENV['IP'];
$port = $_ENV['PORT'];

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
    $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
    $pdo = new PDO($dsn, $_ENV['USER'], $_ENV['PASSWORD'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 10
    ]);
    echo "MySQL connection: SUCCESS\n";
} catch (Exception $e) {
    echo "MySQL connection: FAILED - " . $e->getMessage() . "\n";
}
?>