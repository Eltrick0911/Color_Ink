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
    <title>Inicio Color Ink </title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/index.css">
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/sidebar.css">
     <link rel="icon" href="<?php echo $basePath; ?>/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
  
    <script>
        if (typeof window.authGuard === 'function') {
            window.authGuard();
        }
    </script>
    
    
    <header class="main">
        <i class="fa-solid fa-user user-icon" title="Mi Perfil / Gestión de Usuarios"></i>
        <div class="icon-bar-container" id="iconBarContainer">
            <div class="icon-bar">
                <a href="index"><i class="fa-solid fa-house" onclick="resetBarPosition()" title="Inicio"></i></a>
                <a href="pedidos"><i class="fa-solid fa-truck-ramp-box" onclick="moveBar()" title="Pedidos"></i></a>
                <a href="inve"><i class="fa-solid fa-truck" onclick="moveBar()" title="Inventario"></i></a>
                <a href="ventas"><i class="fa-solid fa-credit-card" onclick="moveBar()" title="Ventas"></i></a>
                <!-- Auditoría visible solo para admin: oculto por defecto y mostrado por JS si id_rol === 1 -->
                <a href="auditoria" style="display:none"><i class="fa-solid fa-clipboard-list" onclick="moveBar()" title="Auditoría"></i></a>
            </div>
        </div>
    <a href="#" id="btnLogout"> <i class="fa-solid fa-arrow-right user-icon" title="Salir" ></i></a> 
    </header>

    <main class="login-section">
        <h1>COLOR INK</h1>
        <img src="<?php echo $basePath; ?>/src/Views/IMG/COLOR INK.gif" alt="Color Ink Logo"> <!-- Placeholder para el logo -->
    </main>

<script src="<?php echo $basePath; ?>/src/Views/JS/login.js"></script>
<script src="<?php echo $basePath; ?>/src/Views/JS/index.js"></script>
<!-- No cargar sidebar.js en index porque tiene header estático -->
</body>
</html>