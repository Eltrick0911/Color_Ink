<?php
// Detectar base path dinámicamente
$uri = $_SERVER['REQUEST_URI'];
$basePath = '';
if (strpos($uri, '/public/') !== false) {
    $parts = explode('/public/', $uri);
    $basePath = $parts[0];
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ventas - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/ventas.css">
    <link rel="icon" href="<?php echo $basePath; ?>/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
    <main class="sidebar-content">
        <h1>Gestión de Ventas</h1>
        <div class="ventas-container">
            <div class="ventas-header">
                <h2>Resumen de Ganancias y Pérdidas</h2>
                <button class="btn-nueva-venta">
                    <i class="fa-solid fa-plus"></i> Nueva Venta
                </button>
            </div>

            <div class="ventas-stats">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Ingresos</h3>
                        <p class="stat-number" id="kpiIngresos">$0.00</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-box"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Costos</h3>
                        <p class="stat-number" id="kpiCostos">$0.00</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-scale-balanced"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Resultado</h3>
                        <p class="stat-number" id="kpiResultado">$0.00</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-percent"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Margen</h3>
                        <p class="stat-number" id="kpiMargen">0%</p>
                    </div>
                </div>
            </div>

            <div class="ventas-filters">
                <input type="text" placeholder="Buscar por cliente o producto..." class="search-input" id="searchInput">
                <select class="filter-select" id="estadoSelect">
                    <option value="">Todos los tipos</option>
                    <option value="pedido">Pedido Entregado</option>
                    <option value="inventario">Movimiento Inventario</option>
                </select>
                <input type="date" id="desde">
                <input type="date" id="hasta">
            </div>

            <div class="ventas-table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tipo</th>
                            <th>Referencia</th>
                            <th>Cliente/Producto</th>
                            <th>Fecha</th>
                            <th>Ingreso</th>
                            <th>Costo</th>
                            <th>Resultado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="ventasBody">
                        <!-- Filas dinámicas -->
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <script src="<?php echo $basePath; ?>/src/Views/JS/sidebar.js"></script>
    <script src="<?php echo $basePath; ?>/src/Views/JS/ventas.js"></script>
</body>
</html>
