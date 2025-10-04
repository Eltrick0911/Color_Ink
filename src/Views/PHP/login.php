<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inicio de Sesión</title>
    <link rel="stylesheet" href="../CSS/login.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&family=Nunito:wght@300;400;600;700&family=Marcellus&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" href="../IMG/LOGO.png" type="image/png">

</head>
<body>
    <div class="container">
        <div class="login-box">
            <div class="login-header">
                <h1>Iniciar Sesión</h1>
                <img src="../IMG/COLOR INK.gif" alt="Color Ink Logo">
            </div>
            
            <form class="login-form" action="login.php" method="POST">
                <div class="form-group">
                    <label for="email">Correo Electrónico</label>
                    <input type="email" id="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Contraseña</label>
                    <div class="input-wrapper">
                        <input type="password" id="password" name="password" required>
                        <button type="button" id="togglePassword" class="toggle-password">
                            <i class="far fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="form-options">
                    <label class="checkbox-container">
                        <input type="checkbox" name="remember">
                        <span class="checkmark"></span>
                        Recordarme
                    </label>
                </div>
                
                <button type="submit" class="login-btn">INGRESAR</button>
            </form>
        </div>
    </div>
    
    <script src="../JS/login.js"></script>
</body>
</html>
