<?php
require_once 'vendor/autoload.php';

// Cargar variables de entorno
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

try {
    // Simular una petición a la API de ventas
    $url = 'http://localhost/Color_Ink/public/index.php?route=ventas&caso=1&action=listar';
    
    echo "=== PRUEBA DE API DE VENTAS ===\n\n";
    echo "URL: $url\n\n";
    
    // Hacer petición sin autenticación para ver qué pasa
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Content-Type: application/json'
        ]
    ]);
    
    $response = file_get_contents($url, false, $context);
    
    if ($response === false) {
        echo "❌ Error: No se pudo hacer la petición\n";
        exit(1);
    }
    
    echo "Respuesta cruda:\n";
    echo $response . "\n\n";
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "❌ Error: Respuesta no es JSON válido\n";
        echo "Error JSON: " . json_last_error_msg() . "\n";
        exit(1);
    }
    
    echo "Respuesta parseada:\n";
    print_r($data);
    
    // Verificar estructura esperada
    if (isset($data['status']) && $data['status'] === 'OK' && isset($data['data'])) {
        echo "\n✅ API responde correctamente\n";
        echo "Número de ventas: " . count($data['data']) . "\n";
        
        if (!empty($data['data'])) {
            echo "\nPrimera venta:\n";
            print_r($data['data'][0]);
        }
    } else {
        echo "\n⚠️ Estructura de respuesta inesperada\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>