<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventario - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/inve.css">
    <link rel="icon" href="/Color_Ink/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
    <main class="sidebar-content">
        <h1>Gestión de Inventario</h1>
        <div class="inventario-container">
            <div class="inventario-header">
                <h2>Control de Stock</h2>
                <button class="btn-nuevo-producto">
                    <i class="fa-solid fa-plus"></i> Nuevo Producto
                </button>
            </div>
            
            <div class="inventario-stats">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-boxes"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Productos</h3>
                        <p class="stat-number">156</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Stock Bajo</h3>
                        <p class="stat-number">8</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Valor Total</h3>
                        <p class="stat-number">$45,230</p>
                    </div>
                </div>
            </div>

            <div class="inventario-filters">
                <input type="text" placeholder="Buscar productos..." class="search-input">
                <select class="filter-select">
                    <option value="">Todas las categorías</option>
                    <option value="tinta">Tintas</option>
                    <option value="papel">Papel</option>
                    <option value="accesorios">Accesorios</option>
                    <option value="equipos">Equipos</option>
                </select>
                <select class="filter-select">
                    <option value="">Todos los estados</option>
                    <option value="disponible">Disponible</option>
                    <option value="bajo-stock">Bajo Stock</option>
                    <option value="agotado">Agotado</option>
                </select>
            </div>

            <div class="inventario-table">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Stock</th>
                            <th>Precio</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>INK-001</td>
                            <td>Tinta Negra Canon</td>
                            <td>Tintas</td>
                            <td>25</td>
                            <td>$45.00</td>
                            <td><span class="status disponible">Disponible</span></td>
                            <td>
                                <button class="btn-action"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>PAP-002</td>
                            <td>Papel A4 500 hojas</td>
                            <td>Papel</td>
                            <td>3</td>
                            <td>$12.50</td>
                            <td><span class="status bajo-stock">Bajo Stock</span></td>
                            <td>
                                <button class="btn-action"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>ACC-003</td>
                            <td>Cartucho HP 305</td>
                            <td>Accesorios</td>
                            <td>0</td>
                            <td>$35.99</td>
                            <td><span class="status agotado">Agotado</span></td>
                            <td>
                                <button class="btn-action"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>EQP-004</td>
                            <td>Impresora Laser HP</td>
                            <td>Equipos</td>
                            <td>2</td>
                            <td>$299.99</td>
                            <td><span class="status disponible">Disponible</span></td>
                            <td>
                                <button class="btn-action"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
    <script src="/Color_Ink/src/Views/JS/inve.js"></script>
</body>
</html>
