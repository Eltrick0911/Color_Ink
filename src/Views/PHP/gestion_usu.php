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
    <title>Gestión de Usuarios - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/gestion_usu.css">
    <link rel="icon" href="<?php echo $basePath; ?>/src/Views/IMG/LOGO.png" type="image/png">
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
    <!-- ===== SISTEMA DE AUTENTICACIÓN (Agregado de la API ACTUAL) ===== -->
    <script>
        if (typeof window.authGuard === 'function') {
            window.authGuard();
        }
    </script>
    
    <main class="sidebar-content">
        <div class="usuarios-container">
            <h1>Gestión de Usuarios</h1>
            <div class="usuarios-header">
                <h2>Control de Usuarios</h2>
                <button class="btn-nuevo-usuario">
                    <i class="fa-solid fa-user-plus"></i> Nuevo Usuario
                </button>
            </div>
            
            <!-- ===== ESTADÍSTICAS DINÁMICAS (Mejoradas de la API ACTUAL) ===== -->
            <div class="usuarios-stats">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Usuarios</h3>
                        <p class="stat-number">0</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Activos</h3>
                        <p class="stat-number">0</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-lock"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Administradores</h3>
                        <p class="stat-number">0</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Último Acceso</h3>
                        <p class="stat-number">-</p>
                    </div>
                </div>
            </div>

            <!-- ===== FILTROS MEJORADOS (Conservados de la API NUEVA con mejoras de la API ACTUAL) ===== -->
            <div class="usuarios-filters">
                <input type="text" placeholder="Buscar usuarios..." class="search-input">
                <select class="filter-select">
                    <option value="">Todos los roles</option>
                    <option value="administrador">Administrador</option>
                    <option value="usuario">Usuario</option>
                </select>
                <select class="filter-select">
                    <option value="">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="bloqueado">Bloqueado</option>
                </select>
            </div>

            <!-- ===== TABLA DINÁMICA (Mejorada de la API ACTUAL) ===== -->
            <div class="usuarios-table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Último Acceso</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Los usuarios se cargarán dinámicamente desde la API -->
                    </tbody>
                </table>
                <!-- ===== PAGINACIÓN (Estilo Auditoría) ===== -->
                <div class="pagination-container" id="paginationContainer" style="display: none;">
                    <div class="pagination-info">
                        <span id="paginationInfo">Mostrando 0 de 0 usuarios</span>
                    </div>
                    <div class="pagination-controls">
                        <button id="btnPrevPage" class="pagination-btn" disabled>
                            <i class="fa-solid fa-chevron-left"></i> Anterior
                        </button>
                        <div class="pagination-numbers" id="paginationNumbers"></div>
                        <button id="btnNextPage" class="pagination-btn">
                            Siguiente <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- ===== SCRIPTS FUSIONADOS ===== -->
    <script src="<?php echo $basePath; ?>/src/Views/JS/login.js"></script>
    <script src="<?php echo $basePath; ?>/src/Views/JS/sidebar.js"></script>
    <script src="<?php echo $basePath; ?>/src/Views/JS/gestion_usu.js"></script>
</body>
</html>