document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación y configurar interfaz según rol
    checkAuthAndSetupUI();

    // Enlazar botón de salir si existe
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await performLogout();
        });
    }
});

async function checkAuthAndSetupUI() {
    try {
        console.log('🔍 Dashboard: Verificando autenticación...');
        
        // Verificar tokens disponibles
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        const jwtToken = sessionStorage.getItem('access_token');
        const storedUser = sessionStorage.getItem('user');
        
        console.log('Firebase token:', firebaseToken ? 'Presente' : 'No presente');
        console.log('JWT token:', jwtToken ? 'Presente' : 'No presente');
        console.log('Usuario almacenado:', storedUser ? 'Presente' : 'No presente');
        
        // Verificar si el usuario está autenticado
        const user = await getCurrentUser();
        console.log('Usuario obtenido:', user);
        
        if (!user) {
            console.log('❌ No se pudo obtener usuario, redirigiendo al login');
            // Limpiar sessionStorage antes de redirigir
            sessionStorage.removeItem('firebase_id_token');
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user');
            window.location.href = 'login';
            return;
        }
        
        console.log('✅ Usuario autenticado en dashboard:', user.nombre_usuario, 'Rol:', user.id_rol);
        
        // Verificar que el usuario tiene los campos necesarios
        if (!user.id_usuario || !user.nombre_usuario) {
            console.log('❌ Usuario incompleto, redirigiendo al login');
            sessionStorage.removeItem('firebase_id_token');
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user');
            window.location.href = 'login';
            return;
        }
        
        // Configurar interfaz según el rol del usuario
        setupUIForUser(user);
        
    } catch (error) {
        console.error('❌ Error verificando autenticación en dashboard:', error);
        window.location.href = 'login';
    }
}

// Función para obtener el usuario actual
async function getCurrentUser() {
    try {
        console.log('🔍 Dashboard: Intentando obtener usuario...');
        
        // PRIMERO: Intentar obtener desde sessionStorage (más rápido y confiable)
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                console.log('✅ Usuario obtenido desde sessionStorage:', user);
                return user;
            } catch (parseError) {
                console.log('❌ Error parseando usuario desde sessionStorage:', parseError);
            }
        }
        
        // SEGUNDO: Intentar obtener token de Firebase
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        if (firebaseToken) {
            console.log('🔍 Intentando con token Firebase...');
            try {
                const response = await fetch(`${getApiBase()}/public/index.php?route=firebase&caso=1&action=me`, {
                    headers: { 'Authorization': `Bearer ${firebaseToken}` }
                });
                console.log('Respuesta Firebase:', response.status, response.statusText);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Usuario obtenido via Firebase:', data.data);
                    return data.data;
                } else {
                    const errorText = await response.text();
                    console.log('❌ Error Firebase:', errorText);
                }
            } catch (firebaseError) {
                console.log('❌ Error en petición Firebase:', firebaseError);
            }
        }
        
        // TERCERO: Intentar obtener token JWT local
        const jwtToken = sessionStorage.getItem('access_token');
        if (jwtToken) {
            console.log('🔍 Intentando con token JWT...');
            try {
                const response = await fetch(`${getApiBase()}/public/index.php?route=auth&caso=1&action=me`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                console.log('Respuesta JWT:', response.status, response.statusText);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Usuario obtenido via JWT:', data.data.user);
                    return data.data.user;
                } else {
                    const errorText = await response.text();
                    console.log('❌ Error JWT:', errorText);
                }
            } catch (jwtError) {
                console.log('❌ Error en petición JWT:', jwtError);
            }
        }
        
        console.log('❌ No se pudo obtener usuario de ninguna fuente');
        return null;
    } catch (error) {
        console.error('❌ Error obteniendo usuario actual en dashboard:', error);
        return null;
    }
}

// Función para configurar la interfaz según el rol del usuario
function setupUIForUser(user) {
    console.log('Usuario autenticado:', user);
    
    // Mostrar/ocultar botón Auditoría según rol (sólo en index, header estático)
    const auditAnchor = document.querySelector('a[href="auditoria"]');
    if (auditAnchor) {
        if (Number(user.id_rol) === 1) {
            auditAnchor.style.display = 'inline-block';
        } else {
            auditAnchor.style.display = 'none';
        }
    }
    
    // Mostrar información del usuario en la consola (para debugging)
    console.log(`Usuario: ${user.nombre_usuario}, Rol: ${user.id_rol === 1 ? 'Administrador' : 'Usuario'}`);
}

// Función para obtener la base de la API
function getApiBase() {
    const parts = window.location.pathname.split('/');
    const idx = parts.indexOf('src');
    if (idx > 1) {
        return '/' + parts.slice(1, idx).join('/');
    }
    return '/' + (parts[1] || '');
}

// Logout global reutilizable
async function performLogout() {
    try {
        const base = getApiBase();
        const apiEntry = `${base}/public/index.php`;
        const loginUrl = `${base}/public/login`;

        // Intentar cerrar sesión en backend si hay token JWT
        const jwtToken = sessionStorage.getItem('access_token');
        if (jwtToken) {
            try {
                await fetch(`${apiEntry}?route=auth&caso=1&action=logout`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
            } catch (_) {}
        }

        // Cerrar sesión de Firebase si está disponible
        try {
            if (window.firebase && firebase.auth) {
                await firebase.auth().signOut();
            }
        } catch (_) {}

        // Limpiar almacenamiento local
        sessionStorage.removeItem('firebase_id_token');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user');

        // Redirigir al login
        window.location.replace(loginUrl);
    } catch (e) {
        // Fallback: limpiar y redirigir
        sessionStorage.clear();
        const parts = window.location.pathname.split('/');
        const pIdx = parts.indexOf('public');
        const base = pIdx > 1 ? '/' + parts.slice(1, pIdx).join('/') : '/' + (parts[1] || '');
        window.location.replace(base + '/public/login');
    }
}

// Exponer por compatibilidad
window.performLogout = performLogout;

// Función authGuard para compatibilidad
window.authGuard = function() {
    checkAuthAndSetupUI();
};

// ===== FUNCIONALIDADES DEL SIDEBAR (Conservadas de la API NUEVA) =====

const iconBarContainer = document.getElementById('iconBarContainer');
const header = document.querySelector('header');
const body = document.querySelector('body');

function moveBar() {
    header.classList.add('sidebar');
    body.classList.add('sidebar-active');
}

function resetBarPosition() {
    header.classList.remove('sidebar');
    body.classList.remove('sidebar-active');
}