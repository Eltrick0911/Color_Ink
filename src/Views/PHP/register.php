<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registro</title>
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/login.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" href="/Color_Ink/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
    <div class="container">
        <div class="login-box">
            <div class="login-header">
                <h1>Crear cuenta</h1>
                <img src="/Color_Ink/src/Views/IMG/COLOR INK.gif" alt="Color Ink Logo">
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
  apiKey: "AIzaSyAn66xkpFEzcdkmkp3iX4VrEUZCd3sI4sk",
  authDomain: "colorink-a3c91.firebaseapp.com",
  projectId: "colorink-a3c91",
  storageBucket: "colorink-a3c91.firebasestorage.app",
  messagingSenderId: "676988193109",
  appId: "1:676988193109:web:21e1b37ffdc6e2cb12c7dc"
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
                        alert('Contraseña insegura: mínimo 6, mayúsculas, números y símbolo');
                        return;
                    }
                    const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
                    await cred.user.updateProfile({ displayName: `${nombre} ${apellido}`.trim() });
                    // También registrar en la BD privada
                    const backendRes = await fetch(`${base}/public/index.php?route=auth&caso=1&action=register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre_usuario: `${nombre} ${apellido}`.trim(),
                            correo: email,
                            contrasena: pass,
                            telefono: tel
                        })
                    });
                    if (!backendRes.ok) {
                        const errData = await backendRes.json().catch(()=>({message:'Error desconocido'}));
                        alert('Error al registrar en la base de datos: ' + (errData.message || backendRes.statusText));
                        return;
                    }
                    // Cerrar sesión para forzar flujo de login
                    await firebase.auth().signOut();
                    alert('Registro exitoso. Ahora inicia sesión con tus credenciales.');
                    window.location.href = `${base}/public/login`;
                }catch(err){
                    alert(err.message || 'Error en registro');
                }
            });
        })();
    </script>
</body>
</html>


