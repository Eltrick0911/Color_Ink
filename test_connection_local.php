<?php
/**
 * Script de prueba para verificar conexión a BD local
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Test de Conexión a Base de Datos Local</h2>";

// Test 1: Conexión básica con PDO
echo "<h3>1. Test de conexión directa PDO</h3>";
try {
    $host = 'mysql:host=localhost;port=3306;dbname=color_ink';
    $user = 'root';
    $pass = '';
    
    $pdo = new PDO($host, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ <strong>Conexión exitosa a MySQL local</strong><br>";
    
    // Verificar versión de MySQL
    $stmt = $pdo->query('SELECT VERSION()');
    $version = $stmt->fetchColumn();
    echo "📊 Versión de MySQL: $version<br>";
    
} catch (PDOException $e) {
    echo "❌ <strong>Error de conexión:</strong> " . $e->getMessage() . "<br>";
    echo "<p style='color: orange;'>Verifica que:</p>";
    echo "<ul>";
    echo "<li>XAMPP esté iniciado</li>";
    echo "<li>MySQL esté corriendo</li>";
    echo "<li>Exista la base de datos 'color_ink' en phpMyAdmin</li>";
    echo "</ul>";
    exit;
}

// Test 2: Verificar tablas
echo "<h3>2. Tablas en la base de datos</h3>";
try {
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($tables) > 0) {
        echo "✅ <strong>Tablas encontradas (" . count($tables) . "):</strong><br>";
        echo "<ul>";
        foreach ($tables as $table) {
            echo "<li>$table</li>";
        }
        echo "</ul>";
    } else {
        echo "⚠️ <strong>No hay tablas en la base de datos</strong><br>";
        echo "<p>Necesitas importar el archivo SQL con la estructura</p>";
    }
} catch (PDOException $e) {
    echo "❌ Error al listar tablas: " . $e->getMessage() . "<br>";
}

// Test 3: Verificar tabla pedido
echo "<h3>3. Estructura de tabla 'pedido'</h3>";
try {
    $stmt = $pdo->query("DESCRIBE pedido");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✅ <strong>Columnas de tabla 'pedido':</strong><br>";
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
    echo "<tr><th>Campo</th><th>Tipo</th><th>Null</th><th>Key</th><th>Default</th></tr>";
    foreach ($columns as $col) {
        echo "<tr>";
        echo "<td>{$col['Field']}</td>";
        echo "<td>{$col['Type']}</td>";
        echo "<td>{$col['Null']}</td>";
        echo "<td>{$col['Key']}</td>";
        echo "<td>{$col['Default']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
} catch (PDOException $e) {
    echo "⚠️ Tabla 'pedido' no existe: " . $e->getMessage() . "<br>";
}

// Test 4: Contar pedidos existentes
echo "<h3>4. Datos en tabla 'pedido'</h3>";
try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM pedido");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $total = $result['total'];
    
    echo "📊 <strong>Total de pedidos:</strong> $total<br>";
    
    if ($total > 0) {
        // Mostrar últimos 5 pedidos
        $stmt = $pdo->query("SELECT id_pedido, numero_pedido, fecha_pedido, id_estado FROM pedido ORDER BY id_pedido DESC LIMIT 5");
        $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<br><strong>Últimos pedidos:</strong><br>";
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Número</th><th>Fecha</th><th>Estado</th></tr>";
        foreach ($pedidos as $p) {
            echo "<tr>";
            echo "<td>{$p['id_pedido']}</td>";
            echo "<td>{$p['numero_pedido']}</td>";
            echo "<td>{$p['fecha_pedido']}</td>";
            echo "<td>{$p['id_estado']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
} catch (PDOException $e) {
    echo "❌ Error al consultar pedidos: " . $e->getMessage() . "<br>";
}

// Test 5: Test de eliminación (simulado)
echo "<h3>5. Test de operación DELETE (simulado)</h3>";
echo "<p>Para probar eliminación real, ejecuta este SQL en phpMyAdmin:</p>";
echo "<pre style='background: #f5f5f5; padding: 10px;'>";
echo "-- Ver pedidos actuales\n";
echo "SELECT * FROM pedido;\n\n";
echo "-- Eliminar un pedido específico (cambia el ID)\n";
echo "DELETE FROM detallepedido WHERE id_pedido = 1;\n";
echo "DELETE FROM pedido WHERE id_pedido = 1;\n";
echo "</pre>";

echo "<hr>";
echo "<h3>✅ Test completado</h3>";
echo "<p><a href='public/index.php'>Ir a la aplicación</a> | <a href='test_connection_local.php'>Recargar test</a></p>";
?>
