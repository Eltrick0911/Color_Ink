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
    
    // Configurar el icono de usuario según el rol
    setupUserIcon(user);
    
    // Mostrar información del usuario en la consola (para debugging)
    console.log(`Usuario: ${user.nombre_usuario}, Rol: ${user.id_rol === 1 ? 'Administrador' : 'Usuario'}`);
}

// Función para configurar el icono de usuario
function setupUserIcon(user) {
    const userIcon = document.querySelector('.user-icon.fa-user');
    if (!userIcon) {
        console.log('⚠️ Icono de usuario no encontrado');
        return;
    }
    
    // Remover el onclick anterior
    userIcon.removeAttribute('onclick');
    userIcon.style.cursor = 'pointer';
    
    // Agregar event listener según el rol
    userIcon.addEventListener('click', function(e) {
        e.preventDefault();
        handleUserIconClick(user);
    });
}

// Función para manejar el clic en el icono de usuario
function handleUserIconClick(user) {
    const userRole = Number(user.id_rol);
    
    // Obtener la base path correctamente
    const parts = window.location.pathname.split('/');
    const pIdx = parts.indexOf('public');
    let basePath;
    
    if (pIdx > 1) {
        // Si estamos en /public/, obtener la base antes de public
        basePath = '/' + parts.slice(1, pIdx).join('/');
    } else {
        // Si no hay public, usar getApiBase()
        basePath = getApiBase();
    }
    
    if (userRole === 1) {
        // Administrador: redirigir a Gestión de Usuarios
        console.log('🔧 Administrador: Redirigiendo a Gestión de Usuarios');
        window.location.href = `${basePath}/public/gestion_usu`;
    } else {
        // Usuario común: mostrar pantalla de restricción primero
        console.log('👤 Usuario común: Mostrando pantalla de restricción');
        showAccessRestriction(basePath);
    }
}

// Función para mostrar pantalla de restricción de acceso
function showAccessRestriction(basePath) {
    // Ocultar el contenido principal
    const mainContent = document.querySelector('main');
    const header = document.querySelector('header');
    
    if (mainContent) mainContent.style.display = 'none';
    if (header) header.style.display = 'none';
    
    // Crear contenedor de restricción
    const restrictionContainer = document.createElement('div');
    restrictionContainer.id = 'accessRestrictionContainer';
    restrictionContainer.style.cssText = `
        display: flex; 
        justify-content: center; 
        align-items: center; 
        height: 100vh; 
        flex-direction: column;
        background: #000000;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        overflow: hidden;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: white;
        text-align: center;
        padding: 20px;
    `;
    
    restrictionContainer.innerHTML = `
        <!-- Ondas abstractas de fondo -->
        <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            pointer-events: none;
        ">
            <!-- Onda superior -->
            <div style="
                position: absolute;
                top: -50px;
                left: -10%;
                width: 120%;
                height: 200px;
                background: linear-gradient(45deg, #8b5cf6, #a855f7, #c084fc);
                border-radius: 50% 50% 0 0;
                opacity: 0.3;
                transform: rotate(-5deg);
                filter: blur(20px);
            "></div>
            
            <!-- Onda media superior -->
            <div style="
                position: absolute;
                top: 100px;
                right: -20%;
                width: 80%;
                height: 300px;
                background: linear-gradient(135deg, #7c3aed, #8b5cf6, #a855f7);
                border-radius: 0 0 50% 50%;
                opacity: 0.4;
                transform: rotate(10deg);
                filter: blur(15px);
            "></div>
            
            <!-- Onda central -->
            <div style="
                position: absolute;
                top: 200px;
                left: -30%;
                width: 100%;
                height: 250px;
                background: linear-gradient(90deg, #6d28d9, #7c3aed, #8b5cf6);
                border-radius: 50%;
                opacity: 0.2;
                transform: rotate(-15deg);
                filter: blur(25px);
            "></div>
            
            <!-- Onda inferior -->
            <div style="
                position: absolute;
                bottom: -100px;
                left: -10%;
                width: 120%;
                height: 300px;
                background: linear-gradient(45deg, #4c1d95, #6d28d9, #7c3aed);
                border-radius: 50% 50% 0 0;
                opacity: 0.3;
                transform: rotate(5deg);
                filter: blur(20px);
            "></div>
            
            <!-- Onda lateral derecha -->
            <div style="
                position: absolute;
                top: 300px;
                right: -50%;
                width: 100%;
                height: 200px;
                background: linear-gradient(180deg, #3b82f6, #6366f1, #8b5cf6);
                border-radius: 0 50% 50% 0;
                opacity: 0.25;
                transform: rotate(-20deg);
                filter: blur(18px);
            "></div>
        </div>
        <div style="
            background: #3C096C;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(60, 9, 108, 0.5);
            border: 1px solid rgba(139, 92, 246, 0.3);
            max-width: 500px;
            width: 100%;
            position: relative;
            z-index: 10;
        ">
            <div style="
                background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                width: 120px;
                height: 120px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 30px;
                box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4);
                animation: pulse 2s infinite;
            ">
                <i class="fa-solid fa-lock" style="font-size: 3rem; color: white;"></i>
            </div>
            
            <h1 style="
                font-size: 2.5rem;
                margin: 0 0 20px 0;
                background: linear-gradient(45deg, #ff6b6b, #ffa726);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-weight: 700;
            ">Acceso Restringido</h1>
            
            <p style="
                font-size: 1.2rem;
                margin: 0 0 10px 0;
                opacity: 0.9;
                line-height: 1.6;
            ">No tienes permisos para acceder a esta página</p>
            
            <p style="
                font-size: 1rem;
                margin: 0 0 30px 0;
                opacity: 0.8;
                line-height: 1.5;
            ">Solo los administradores pueden gestionar usuarios del sistema</p>
            
            <div style="
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            ">
                <button onclick="window.location.href='${basePath}/public/index'" style="
                    padding: 15px 30px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)'">
                    <i class="fa-solid fa-home"></i>
                    Volver a Inicio
                </button>
                
                <button onclick="window.location.href='${basePath}/public/perfil'" style="
                    padding: 15px 30px;
                    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255, 107, 107, 0.6)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(255, 107, 107, 0.4)'">
                    <i class="fa-solid fa-user"></i>
                    Ver Mi Perfil
                </button>
            </div>
        </div>
        
        <style>
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        </style>
    `;
    
    document.body.appendChild(restrictionContainer);
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