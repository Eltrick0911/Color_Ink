// ===== FUNCIONALIDAD DEL TOGGLE DE CONTRASEÑA (Conservada de la API NUEVA) =====

const togglePassword = document.querySelector('#togglePassword');
const password = document.querySelector('#password');

if (togglePassword && password) {
    togglePassword.addEventListener('click', function() {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        const icon = this.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    });
}

// ===== SISTEMA COMPLETO DE AUTENTICACIÓN (Agregado de la API ACTUAL) =====

// Middleware de login con Firebase + backend
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#loginForm');
    if (!form) return;

    // Detectar base del proyecto (e.g., /api_colorINK)
    const projectBase = (() => {
        const parts = window.location.pathname.split('/');
        // path típico: /api_colorINK/src/Views/PHP/login.html
        const idx = parts.indexOf('src');
        if (idx > 1) {
            return '/' + parts.slice(1, idx).join('/');
        }
        // fallback al primer segmento
        return '/' + (parts[1] || '');
    })();
    const apiEntry = `${projectBase}/public/index.php`;
    const dashboardUrl = `${projectBase}/public/index`;

    // Navegación a registro
    const goRegister = document.querySelector('#goRegister');
    if (goRegister) {
        goRegister.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `${projectBase}/public/register`;
        });
    }

    // Recuperar contraseña
    const forgot = document.querySelector('#forgotPassword');
    if (forgot) {
        forgot.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const email = document.querySelector('#email')?.value?.trim();
                if (!email) {
                    alert('Escribe tu correo en el campo Correo Electrónico y vuelve a intentar.');
                    return;
                }
                await firebase.auth().sendPasswordResetEmail(email);
                alert('Te enviamos un correo para restablecer tu contraseña.');
            } catch (err) {
                alert(err.message || 'No se pudo enviar el correo de recuperación');
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.querySelector('#email')?.value || '';
        const pass = document.querySelector('#password')?.value || '';
        
        console.log('🔍 Iniciando proceso de login...');
        console.log('Email:', email);
        console.log('Dashboard URL:', dashboardUrl);
        console.log('API Entry:', apiEntry);

        try {
            let idToken = null;
            
            console.log('🔍 Verificando Firebase...');
            console.log('window.firebase:', typeof window.firebase);
            console.log('firebase.auth:', typeof firebase?.auth);
            console.log('firebase.apps:', firebase?.apps);
            
            // Si Firebase SDK está disponible, usarlo para obtener ID Token
            if (window.firebase && firebase.auth) {
                console.log('✅ Firebase SDK disponible');
                
                if (!firebase.apps || firebase.apps.length === 0) {
                    console.log('❌ Firebase no está inicializado');
                    alert('Firebase no está inicializado. Verifica tu firebaseConfig en login.html y recarga con Ctrl+F5.');
                    return;
                }
                
                console.log('✅ Firebase inicializado, intentando login...');
                const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
                console.log('✅ Firebase login exitoso');
                
                idToken = await cred.user.getIdToken();
                console.log('✅ ID Token obtenido de Firebase');
            } else {
                console.log('🔍 Firebase SDK no disponible, usando login tradicional...');
                // Fallback al endpoint local (JWT propio) si no hay Firebase SDK
                const resLocal = await fetch(`${apiEntry}?route=auth&caso=1&action=login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario: email, contrasena: pass })
                });
                console.log('Respuesta login tradicional:', resLocal.status, resLocal.statusText);
                
                const dataLocal = await resLocal.json();
                console.log('Datos respuesta:', dataLocal);
                
                if (resLocal.ok && dataLocal?.data?.token) {
                    console.log('✅ Login tradicional exitoso');
                    console.log('Token guardado:', dataLocal.data.token);
                    console.log('Usuario guardado:', dataLocal.data.user);
                    
                    sessionStorage.setItem('access_token', dataLocal.data.token);
                    sessionStorage.setItem('user', JSON.stringify(dataLocal.data.user));
                    
                    console.log('🔄 Redirigiendo a:', dashboardUrl);
                    window.location.href = dashboardUrl;
                    return;
                }
                console.log('❌ Login tradicional fallido:', dataLocal?.message);
                throw new Error(dataLocal?.message || 'Login fallido');
            }

            // Enviar idToken al backend para sesión
            console.log('🔍 Enviando ID Token al backend...');
            const res = await fetch(`${apiEntry}?route=firebase&caso=1&action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ idToken })
            });
            console.log('Respuesta backend Firebase:', res.status, res.statusText);
            
            const data = await res.json();
            console.log('Datos respuesta Firebase:', data);
            console.log('Tipo de data.data:', typeof data.data);
            console.log('Tipo de data.data.user:', typeof data.data?.user);
            console.log('Valor de data.data.user:', data.data?.user);
            
            if (!res.ok) {
                console.log('❌ Error en backend Firebase:', data?.message);
                throw new Error(data?.message || 'Firebase login fallido');
            }

            console.log('✅ Firebase login completo en backend');
            console.log('Usuario Firebase:', data.data?.user);
            
            // Verificar que el usuario no sea undefined
            if (!data.data || !data.data.user) {
                console.log('❌ Usuario es undefined o null');
                console.log('Datos recibidos:', data);
                throw new Error('Usuario no recibido del backend');
            }
            
            sessionStorage.setItem('firebase_id_token', idToken);
            if (data?.data?.token) {
                sessionStorage.setItem('access_token', data.data.token);
                console.log('✅ JWT del backend guardado');
            } else {
                console.log('ℹ️ Backend no devolvió JWT propio, se usará solo el ID Token de Firebase');
            }
            sessionStorage.setItem('user', JSON.stringify(data.data.user));
            if (data?.data?.token) {
                sessionStorage.setItem('access_token', data.data.token);
                console.log('✅ JWT del backend guardado');
            } else {
                console.log('ℹ️ Backend no devolvió JWT propio, se usará solo el ID Token de Firebase');
            }
            
            console.log('✅ Datos guardados en sessionStorage:');
            console.log('Firebase ID Token:', idToken ? 'Guardado' : 'No guardado');
            console.log('Usuario:', data.data.user);
            console.log('SessionStorage user:', sessionStorage.getItem('user'));
            
            console.log('🔄 Redirigiendo a dashboard...');
            console.log('URL destino:', dashboardUrl);
            window.location.href = dashboardUrl;
        } catch (err) {
            alert(err.message || 'Error de autenticación');
        }
    });
});

// Guard simple para páginas protegidas (importar en páginas privadas)
window.authGuard = function() {
    const token = sessionStorage.getItem('firebase_id_token') || sessionStorage.getItem('access_token');
    if (!token) {
        const parts = window.location.pathname.split('/');
        const pIdx = parts.indexOf('public');
        const base = pIdx > 1 ? '/' + parts.slice(1, pIdx).join('/') : '/' + (parts[1] || '');
        window.location.href = base + '/public/login';
    }
}