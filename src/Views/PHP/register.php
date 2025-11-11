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
    <title>Registro</title>
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/login.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" href="<?php echo $basePath; ?>/src/Views/IMG/LOGO.png" type="image/png">
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        .swal-dark-popup {
            background: rgba(18, 18, 22, 0.6) !important;
            backdrop-filter: blur(16px) saturate(120%) !important;
            border: 1px solid rgba(186, 104, 200, 0.25) !important;
            border-radius: 16px !important;
            max-width: 400px !important;
            width: 90% !important;
            padding: 35px !important;
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.02) !important;
        }
        .swal-dark-title {
            color: #ffffff !important;
            font-family: 'Times New Roman', serif !important;
        }
        .swal-dark-content {
            color: #ffffff !important;
            font-family: 'Times New Roman', serif !important;
        }
        .swal-dark-confirm {
            background: linear-gradient(135deg, #2a0731, #7e0091) !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 10px !important;
            font-weight: 700 !important;
            letter-spacing: 0.3px !important;
            box-shadow: 0 8px 22px rgba(66, 28, 73, 0.35) !important;
            transition: transform 0.15s ease, box-shadow 0.25s ease, filter 0.25s ease !important;
        }
        .swal-dark-confirm:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 12px 28px rgba(121, 1, 176, 0.35) !important;
            filter: brightness(1.03) !important;
        }
        .swal2-icon.swal2-success {
            border-color: #27ae60 !important;
            color: #27ae60 !important;
        }
        .swal2-icon.swal2-error {
            border-color: #ff00ff !important;
            color: #ff00ff !important;
            width: 50px !important;
            height: 50px !important;
            margin: 10px auto 15px !important;
        }
        .swal2-icon.swal2-error .swal2-x-mark {
            width: 30px !important;
            height: 30px !important;
            position: relative !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
        }
        .swal2-icon.swal2-error [class*="swal2-x-mark-line"] {
            width: 20px !important;
            height: 3px !important;
            background-color: #ff00ff !important;
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
        }
        .swal2-icon.swal2-error .swal2-x-mark-line-left {
            transform: translate(-50%, -50%) rotate(45deg) !important;
        }
        .swal2-icon.swal2-error .swal2-x-mark-line-right {
            transform: translate(-50%, -50%) rotate(-45deg) !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="login-box">
            <div class="login-header">
                <h1>Crear Cuenta</h1>
                <img src="<?php echo $basePath; ?>/src/Views/IMG/COLOR INK.gif" alt="Color Ink Logo">
            </div>
            <form id="registerForm" action="#" method="POST">
                <div class="form-group">
                    <label for="r_nombre">Nombre</label>
                    <input type="text" id="r_nombre" required>
                </div>
                <div class="form-group">
                    <label for="r_apellido">Apellido</label>
                    <input type="text" id="r_apellido" required>
                </div>
                <div class="form-group">
                    <label for="r_email">Correo Electrónico</label>
                    <input type="email" id="r_email" required>
                </div>
                <div class="form-group">
                    <label for="r_password">Contraseña</label>
                    <input type="password" id="r_password" required>
                </div>
                <div class="form-group">
                    <label for="r_tel">Teléfono (opcional)</label>
                    <input type="text" id="r_tel">
                </div>
                <button type="submit" class="login-btn">Registrarme</button>
                <div style="text-align:center;margin-top:12px;">
                    <a id="goLogin" href="#">¿Ya tienes cuenta? Inicia sesión</a>
                </div>
            </form>
        </div>
    </div>

    <!-- Firebase SDK (modular v9) -->
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js?v=20250923"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js?v=20250923"></script>
    <script>
        const firebaseConfig = {
            apiKey: "AIzaSyBM1Wj1JSqHRHKoCwId-vhJ7eisM7ieTAY",
            authDomain: "miappwebinkproject.firebaseapp.com",
            projectId: "miappwebinkproject"
        };
        if (typeof firebase !== 'undefined' && firebase.apps?.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
    </script>
    <script>
        (function(){
            const parts = window.location.pathname.split('/');
            let base;
            // Si estamos en /Color_Ink/public/register, devolver /Color_Ink
            if (parts.includes('public')) {
                const publicIdx = parts.indexOf('public');
                base = '/' + parts.slice(1, publicIdx).join('/');
            } else {
                // Fallback para rutas con 'src'
                const idx = parts.indexOf('src');
                base = idx > 1 ? '/' + parts.slice(1, idx).join('/') : '/' + (parts[1]||'');
            }

            document.querySelector('#goLogin').addEventListener('click', (e)=>{
                e.preventDefault();
                window.location.href = `${base}/public/login`;
            });

            document.querySelector('#registerForm').addEventListener('submit', async (e)=>{
                e.preventDefault();
                const nombre = document.querySelector('#r_nombre').value.trim();
                const apellido = document.querySelector('#r_apellido').value.trim();
                const email = document.querySelector('#r_email').value.trim();
                const pass = document.querySelector('#r_password').value;
                const tel = document.querySelector('#r_tel').value.trim() || null;
                try{
                    if (pass.length < 6 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass) || !/[^a-zA-Z0-9]/.test(pass)){
                        await Swal.fire({
                            title: 'Contraseña insegura',
                            text: 'La contraseña debe tener mínimo 6 caracteres, mayúsculas, números y símbolo',
                            icon: 'error',
                            confirmButtonText: 'Entendido',
                            background: '#000000',
                            color: '#ffffff',
                            confirmButtonColor: '#8b5cf6',
                            customClass: {
                                popup: 'swal-dark-popup',
                                title: 'swal-dark-title',
                                htmlContainer: 'swal-dark-content',
                                confirmButton: 'swal-dark-confirm'
                            }
                        });
                        return;
                    }
                    const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
                    await cred.user.updateProfile({ displayName: `${nombre} ${apellido}`.trim() });
                    // Cerrar sesión para forzar flujo de login
                    await firebase.auth().signOut();
                    await Swal.fire({
                        title: 'Registro exitoso',
                        text: 'Ahora inicia sesión con tus credenciales',
                        icon: 'success',
                        confirmButtonText: 'Ir a inicio de sesión',
                        background: '#000000',
                        color: '#ffffff',
                        confirmButtonColor: '#8b5cf6',
                        customClass: {
                            popup: 'swal-dark-popup',
                            title: 'swal-dark-title',
                            htmlContainer: 'swal-dark-content',
                            confirmButton: 'swal-dark-confirm'
                        }
                    });
                    window.location.href = `${base}/public/login`;
                }catch(err){
                    let errorMessage = 'Error en registro';
                    if (err.message.includes('email-already-in-use') || err.message.includes('already exists')) {
                        errorMessage = 'Este correo electrónico ya está registrado';
                    } else {
                        errorMessage = err.message || 'Error en registro';
                    }
                    await Swal.fire({
                        title: 'Error en registro',
                        text: errorMessage,
                        icon: 'error',
                        confirmButtonText: 'Entendido',
                        background: '#000000',
                        color: '#ffffff',
                        confirmButtonColor: '#8b5cf6',
                        customClass: {
                            popup: 'swal-dark-popup',
                            title: 'swal-dark-title',
                            htmlContainer: 'swal-dark-content',
                            confirmButton: 'swal-dark-confirm'
                        }
                    });
                }
            });
        })();
    </script>
</body>
</html>


