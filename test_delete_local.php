<?php
/**
 * Test de operación DELETE en la base de datos local
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__ . '/vendor/autoload.php';

use App\DB\connectionDB;
use App\Models\PedidosModel;

echo "<h2>🗑️ Test de Eliminación de Pedidos</h2>";

// Conectar a BD
try {
    $pdo = connectionDB::getConnection();
    echo "✅ Conexión establecida<br><br>";
} catch (Exception $e) {
    echo "❌ Error de conexión: " . $e->getMessage();
    exit;
}

// Listar pedidos actuales
echo "<h3>📋 Pedidos Actuales en la Base de Datos</h3>";
try {
    $stmt = $pdo->query("SELECT id_pedido, numero_pedido, fecha_pedido, id_estado FROM pedido ORDER BY id_pedido DESC LIMIT 10");
    $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($pedidos) > 0) {
        echo "<table border='1' cellpadding='8' style='border-collapse: collapse;'>";
        echo "<tr style='background: #4CAF50; color: white;'>";
        echo "<th>ID</th><th>Número</th><th>Fecha</th><th>Estado</th><th>Acción</th>";
        echo "</tr>";
        
        foreach ($pedidos as $p) {
            echo "<tr>";
            echo "<td>{$p['id_pedido']}</td>";
            echo "<td>{$p['numero_pedido']}</td>";
            echo "<td>{$p['fecha_pedido']}</td>";
            echo "<td>{$p['id_estado']}</td>";
            echo "<td>";
            echo "<a href='?delete={$p['id_pedido']}' onclick='return confirm(\"¿Eliminar pedido {$p['numero_pedido']}?\")' style='color: red; text-decoration: none;'>";
            echo "🗑️ Eliminar";
            echo "</a>";
            echo "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>⚠️ No hay pedidos en la base de datos</p>";
        echo "<p><a href='src/Views/PHP/pedidos.php'>Ir a crear un pedido</a></p>";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
}

// Procesar eliminación si se solicita
if (isset($_GET['delete'])) {
    $idPedido = (int)$_GET['delete'];
    
    echo "<hr>";
    echo "<h3>🔥 Procesando eliminación del pedido ID: $idPedido</h3>";
    
    try {
        $model = new PedidosModel();
        
        // Mostrar detalles antes de eliminar
        echo "<p><strong>Verificando pedido antes de eliminar...</strong></p>";
        $stmt = $pdo->prepare("SELECT * FROM pedido WHERE id_pedido = ?");
        $stmt->execute([$idPedido]);
        $pedidoAntes = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($pedidoAntes) {
            echo "<pre style='background: #f0f0f0; padding: 10px;'>";
            print_r($pedidoAntes);
            echo "</pre>";
            
            // Intentar eliminar
            echo "<p><strong>Ejecutando eliminación...</strong></p>";
            $resultado = $model->deletePedido($idPedido);
            
            if ($resultado) {
                echo "<div style='background: #4CAF50; color: white; padding: 15px; margin: 10px 0;'>";
                echo "✅ <strong>PEDIDO ELIMINADO EXITOSAMENTE</strong>";
                echo "</div>";
                
                // Verificar que realmente se eliminó
                $stmt = $pdo->prepare("SELECT * FROM pedido WHERE id_pedido = ?");
                $stmt->execute([$idPedido]);
                $pedidoDespues = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$pedidoDespues) {
                    echo "<p style='color: green;'>✅ Confirmado: El pedido ya NO existe en la base de datos</p>";
                } else {
                    echo "<p style='color: orange;'>⚠️ Advertencia: El pedido aún existe en la BD</p>";
                }
                
                echo "<p><a href='test_delete_local.php'>Recargar lista</a></p>";
            } else {
                echo "<div style='background: #f44336; color: white; padding: 15px; margin: 10px 0;'>";
                echo "❌ <strong>ERROR: No se pudo eliminar el pedido</strong>";
                echo "</div>";
            }
        } else {
            echo "<p style='color: orange;'>⚠️ El pedido con ID $idPedido no existe</p>";
        }
        
    } catch (Exception $e) {
        echo "<div style='background: #f44336; color: white; padding: 15px; margin: 10px 0;'>";
        echo "❌ <strong>EXCEPCIÓN:</strong> " . $e->getMessage();
        echo "</div>";
        echo "<pre>" . $e->getTraceAsString() . "</pre>";
    }
}

echo "<hr>";
echo "<h3>📌 Notas Importantes:</h3>";
echo "<ul>";
echo "<li>Estás trabajando con la base de datos: <strong>LOCAL (localhost)</strong></li>";
echo "<li>Los cambios aquí SE REFLEJARÁN en phpMyAdmin</li>";
echo "<li>Los pedidos eliminados aquí DESAPARECERÁN de la tabla</li>";
echo "</ul>";

echo "<p><a href='test_connection_local.php'>Test de conexión</a> | ";
echo "<a href='src/Views/PHP/pedidos.php'>Ver módulo de pedidos</a> | ";
echo "<a href='http://localhost/phpmyadmin'>phpMyAdmin</a></p>";
?>
