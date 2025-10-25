<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inicio Color Ink </title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/index.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/sidebar.css">
     <link rel="icon" href="/Color_Ink/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
  
    <script>
        if (typeof window.authGuard === 'function') {
            window.authGuard();
        }
    </script>
    
    
    <header class="main">
        <i class="fa-solid fa-user user-icon" onclick="resetBarPosition()"></i>
        <div class="icon-bar-container" id="iconBarContainer">
            <div class="icon-bar">
                <a href="index"><i class="fa-solid fa-house" onclick="resetBarPosition()" title="Inicio"></i></a>
                <a href="pedidos"><i class="fa-solid fa-truck-ramp-box" onclick="moveBar()" title="Pedidos"></i></a>
                <a href="inve"><i class="fa-solid fa-truck" onclick="moveBar()" title="Inventario"></i></a>
                <a href="gestion_usu"><i class="fa-solid fa-credit-card" onclick="moveBar()" title="Gestión de Usuarios"></i></a>
            </div>
        </div>
      <a href="login"> <i class="fa-solid fa-arrow-right user-icon" title="Salir" ></i></a> 
    </header>

    <main class="login-section">
        <h1>COLOR INK</h1>
        <img src="/Color_Ink/src/Views/IMG/COLOR INK.gif" alt="Color Ink Logo"> <!-- Placeholder para el logo -->
    </main>

<script src="/Color_Ink/src/Views/JS/login.js"></script>
<script src="/Color_Ink/src/Views/JS/index.js"></script>
<script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
</body>
</html>