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
    <title>Inicio de Sesión</title>
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/login.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&family=Nunito:wght@300;400;600;700&family=Marcellus&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" href="<?php echo $basePath; ?>/src/Views/IMG/LOGO.png" type="image/png">

</head>
<body>
    <div class="container">
        <div class="login-box">
            <div class="login-header">
                <h1>Iniciar Sesión</h1>
                <img src="<?php echo $basePath; ?>/src/Views/IMG/COLOR INK.gif" alt="Color Ink Logo">
            </div>
            
            <!-- ===== FORMULARIO CON FUNCIONALIDADES COMPLETAS (Fusionado de ambas APIs) ===== -->
            <form class="login-form" id="loginForm" action="login" method="POST">
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
                
                <!-- ===== ENLACES ADICIONALES (Agregados de la API ACTUAL) ===== -->
                <div style="text-align:center;margin-top:12px;">
                    <div style="margin-bottom:8px;">
                        <a id="goRegister" href="#">¿No tienes cuenta? Regístrate</a>
                    </div>
                    <div>
                        <a id="forgotPassword" href="#">¿Olvidaste tu contraseña?</a>
                    </div>
                </div>
            </form>
        </div>
    </div>
    
    <!-- ===== FIREBASE SDK Y CONFIGURACIÓN (Agregado de la API ACTUAL) ===== -->
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js?v=20250923"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js?v=20250923"></script>
    <script>
        // Rellena con tu configuración real de Firebase
        const firebaseConfig = {
         apiKey: "AIzaSyBM1Wj1JSqHRHKoCwId-vhJ7eisM7ieTAY",
         authDomain: "miappwebinkproject.firebaseapp.com",
         projectId: "miappwebinkproject",
         storageBucket: "miappwebinkproject.appspot.com",
         messagingSenderId: "463926899015",
         appId: "1:463926899015:web:ce74827067d65ccc255c62",
         measurementId: "G-NBMVZPB4DR"
         };
        
        console.log('🔍 Inicializando Firebase...');
        console.log('Firebase disponible:', typeof firebase !== 'undefined');
        
        if (typeof firebase !== 'undefined') {
            console.log('Firebase apps:', firebase.apps);
            if (firebase.apps?.length === 0) {
                console.log('✅ Inicializando Firebase...');
                firebase.initializeApp(firebaseConfig);
                console.log('✅ Firebase inicializado correctamente');
            } else {
                console.log('✅ Firebase ya estaba inicializado');
            }
        } else {
            console.log('❌ Firebase SDK no está disponible');
        }
    </script>
    
    <!-- ===== SCRIPT DE LOGIN FUSIONADO ===== -->
    <script src="<?php echo $basePath; ?>/src/Views/JS/login.js?v=20250923"></script>
</body>
</html>