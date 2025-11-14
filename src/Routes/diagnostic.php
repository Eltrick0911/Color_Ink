<?php
use App\DB\connectionDB;
use App\Config\responseHTTP;

header('Content-Type: application/json');

$action = $_GET['action'] ?? 'dbping';
$tokenHeader = $_SERVER['HTTP_X_DIAG_TOKEN'] ?? '';
$expected = $_ENV['DIAG_TOKEN'] ?? '';

if ($expected !== '' && !hash_equals($expected, $tokenHeader)) {
    http_response_code(401);
    echo json_encode(['status' => 'ERROR', 'message' => 'No autorizado']);
    return;
}

try {
    switch ($action) {
        case 'dbping':
            $pdo = connectionDB::getConnection();
            $stmt = $pdo->query('SELECT 1 AS ok, NOW() AS ahora, @@session.time_zone AS tz');
            $row = $stmt->fetch();
            $dsnParts = [];
            $ref = (new ReflectionClass($pdo))->getProperty('attributes'); // fallback if needed
            $host = $_ENV['DB_HOST'] ?? $_ENV['IP'] ?? 'unknown';
            $port = $_ENV['DB_PORT'] ?? '3306';
            $db   = $_ENV['DB_NAME'] ?? $_ENV['DB'] ?? '';
            $maskedHost = preg_replace('/^(..).*?(..)$/', '$1***$2', $host);
            echo json_encode([
                'status' => 'OK',
                'message' => 'DB ping exitoso',
                'data' => [
                    'result' => $row,
                    'host' => $maskedHost,
                    'port' => $port,
                    'database' => $db
                ]
            ]);
            break;
        case 'logtail':
            $logFile = dirname(__DIR__,2) . '/src/Logs/php-error.log';
            if (!is_readable($logFile)) {
                echo json_encode(['status' => 'ERROR', 'message' => 'Log no legible']);
                return;
            }
            $lines = @file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            $tail = array_slice($lines, -100);
            echo json_encode(['status' => 'OK', 'message' => 'Tail log', 'data' => $tail]);
            break;
        default:
            echo json_encode(['status' => 'ERROR', 'message' => 'Acción inválida']);
    }
} catch (Throwable $e) {
    error_log('Diagnostic error: '.$e->getMessage());
    echo json_encode(responseHTTP::status500() + ['debug' => 'Diag fallo']);
}
?>
