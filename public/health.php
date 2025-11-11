<?php
// Simple health check endpoint for Elastic Beanstalk
http_response_code(200);
header('Content-Type: application/json');
// Optionally verify DB connectivity minimal
$ok = true;
$details = [];
try {
    if (class_exists('App\\DB\\connectionDB')) {
        $db = App\DB\connectionDB::getConnection();
        if ($db) { $details['db'] = 'ok'; } else { $details['db'] = 'null'; }
    }
} catch (Throwable $e) {
    $ok = false;
    $details['db_error'] = $e->getMessage();
}

echo json_encode([
    'status' => $ok ? 'OK' : 'DEGRADED',
    'timestamp' => date('c'),
    'details' => $details
]);
