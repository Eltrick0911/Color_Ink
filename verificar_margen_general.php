<?php
require_once 'vendor/autoload.php';

// Cargar variables de entorno
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

try {
    // Conexión a la base de datos
    $host = $_ENV['IP'];
    $port = $_ENV['PORT'];
    $dbname = $_ENV['DB'];
    $username = $_ENV['USER'];
    $password = $_ENV['PASSWORD'];
    
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== VERIFICACIÓN DEL MARGEN GENERAL ===\n\n";
    
    // Obtener todas las ventas registradas
    $stmt = $pdo->prepare("
        SELECT 
            id_venta,
            monto_cobrado,
            costo_total,
            utilidad,
            utilidad_pct
        FROM venta 
        WHERE estado = 'REGISTRADA'
        ORDER BY id_venta
    ");
    $stmt->execute();
    $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($ventas)) {
        echo "No hay ventas registradas.\n";
        exit(0);
    }
    
    echo "Ventas individuales:\n";
    echo "ID | Monto    | Costo    | Utilidad | Margen Individual\n";
    echo "---|----------|----------|----------|------------------\n";
    
    $totalIngresos = 0;
    $totalCostos = 0;
    $totalUtilidad = 0;
    
    foreach ($ventas as $venta) {
        $monto = floatval($venta['monto_cobrado']);
        $costo = floatval($venta['costo_total']);
        $utilidad = floatval($venta['utilidad']);
        $margenIndividual = floatval($venta['utilidad_pct']);
        
        $totalIngresos += $monto;
        $totalCostos += $costo;
        $totalUtilidad += $utilidad;
        
        printf("%2d | L%7.2f | L%7.2f | L%7.2f | %6.1f%%\n", 
            $venta['id_venta'], $monto, $costo, $utilidad, $margenIndividual);
    }
    
    echo "\n=== TOTALES ===\n";
    echo "Total Ingresos: L" . number_format($totalIngresos, 2) . "\n";
    echo "Total Costos:   L" . number_format($totalCostos, 2) . "\n";
    echo "Total Utilidad: L" . number_format($totalUtilidad, 2) . "\n";
    
    // Calcular margen general (como lo hace el frontend)
    $margenGeneral = $totalIngresos > 0 ? ($totalUtilidad / $totalIngresos) * 100 : 0;
    
    echo "\n=== CÁLCULO DEL MARGEN GENERAL ===\n";
    echo "Fórmula: (Total Utilidad / Total Ingresos) × 100\n";
    echo "Cálculo: (L" . number_format($totalUtilidad, 2) . " / L" . number_format($totalIngresos, 2) . ") × 100\n";
    echo "Margen General: " . number_format($margenGeneral, 1) . "%\n";
    
    // Verificar si coincide con el promedio de márgenes individuales
    $promedioMargenes = 0;
    if (count($ventas) > 0) {
        $sumaMargenes = array_sum(array_column($ventas, 'utilidad_pct'));
        $promedioMargenes = $sumaMargenes / count($ventas);
    }
    
    echo "\n=== COMPARACIÓN ===\n";
    echo "Margen General (Totales):     " . number_format($margenGeneral, 1) . "%\n";
    echo "Promedio Márgenes Individuales: " . number_format($promedioMargenes, 1) . "%\n";
    
    if (abs($margenGeneral - $promedioMargenes) > 0.1) {
        echo "⚠️  DIFERENCIA DETECTADA: Los valores no coinciden\n";
        echo "Diferencia: " . number_format(abs($margenGeneral - $promedioMargenes), 1) . " puntos porcentuales\n";
    } else {
        echo "✅ Los valores coinciden (diferencia menor a 0.1%)\n";
    }
    
    echo "\n=== CONCLUSIÓN ===\n";
    if ($margenGeneral == 89.0 || abs($margenGeneral - 89.0) < 0.5) {
        echo "✅ El margen general del 89% está CORRECTO\n";
    } else {
        echo "❌ El margen general mostrado (89%) NO coincide con el calculado (" . number_format($margenGeneral, 1) . "%)\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>