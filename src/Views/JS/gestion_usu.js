/**
 * JavaScript para la página de gestión de usuarios
 * Comentario de prueba
 * 
 */

// Variables globales para manejo de tokens
let tokenRenewalInterval = null;
let isRenewingToken = false;

// Variables globales para paginación
let allUsers = []; // Todos los usuarios cargados
let filteredUsers = []; // Usuarios filtrados
let currentPage = 1; // Página actual
const usersPerPage = 10; // Usuarios por página

// Configuración global de SweetAlert2
Swal.mixin({
    customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        content: 'swal-custom-content',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
        actions: 'swal-custom-actions'
    },
    buttonsStyling: false,
    showCancelButton: true,
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    focusCancel: true
});

// Agregar estilos personalizados
const style = document.createElement('style');
style.textContent = `
    .swal-custom-popup {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
        border: 2px solid rgba(106, 13, 173, 0.3) !important;
        border-radius: 20px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
        backdrop-filter: blur(10px) !important;
    }
    
    .swal-custom-title {
        color: #ff6b6b !important;
        font-size: 1.8rem !important;
        font-weight: 700 !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }
    
    .swal-custom-content {
        color: #ffffff !important;
        font-size: 1.1rem !important;
        line-height: 1.6 !important;
    }
    
    .swal-custom-confirm {
        background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
        border: none !important;
        border-radius: 25px !important;
        padding: 12px 30px !important;
        font-size: 1rem !important;
        font-weight: 600 !important;
        color: white !important;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4) !important;
        transition: all 0.3s ease !important;
    }
    
    .swal-custom-confirm:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6) !important;
    }
    
    .swal-custom-cancel {
        background: linear-gradient(45deg, #667eea, #764ba2) !important;
        border: none !important;
        border-radius: 25px !important;
        padding: 12px 30px !important;
        font-size: 1rem !important;
        font-weight: 600 !important;
        color: white !important;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
        transition: all 0.3s ease !important;
    }
    
    .swal-custom-cancel:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
    }
    
    .swal-custom-actions {
        gap: 15px !important;
        margin-top: 25px !important;
    }
    
    .swal2-icon {
        border-color: #ff6b6b !important;
        color: #ff6b6b !important;
    }
    
    .swal2-icon.swal2-warning {
        border-color: #ffa726 !important;
        color: #ffa726 !important;
    }
    
    .swal2-icon.swal2-success {
        border-color: #4caf50 !important;
        color: #4caf50 !important;
    }
    
    /* Estilos para modales de bloquear y eliminar (igual a pedidos) */
    .swal-block-popup,
    .swal-delete-popup {
        background: #ffffff !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
        padding: 0 !important;
        max-width: 450px !important;
        width: 90% !important;
    }
    
    .swal-block-title,
    .swal-delete-title {
        color: #333 !important;
        font-size: 24px !important;
        font-weight: 600 !important;
        margin: 0 !important;
        padding: 0 30px 20px !important;
        text-align: center !important;
        border-bottom: 1px solid #e5e5e5 !important;
    }
    
    .swal-block-popup .swal2-header,
    .swal-delete-popup .swal2-header {
        padding: 30px 30px 20px !important;
        text-align: center !important;
        border-bottom: 1px solid #e5e5e5 !important;
    }
    
    .swal-block-content,
    .swal-delete-content {
        color: #555 !important;
        font-size: 16px !important;
        line-height: 1.5 !important;
        padding: 25px 30px !important;
        text-align: center !important;
        margin: 0 !important;
    }
    
    .swal-block-icon.swal2-icon-warning,
    .swal-delete-icon.swal2-icon-warning {
        width: 70px !important;
        height: 70px !important;
        border: 3px solid #dc3545 !important;
        border-radius: 50% !important;
        background: #dc3545 !important;
        margin: 0 auto 15px !important;
        color: #ffffff !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    
    .swal-block-icon.swal2-icon-warning .swal2-icon-content,
    .swal-delete-icon.swal2-icon-warning .swal2-icon-content {
        color: #ffffff !important;
        font-size: 2.5rem !important;
        font-weight: bold !important;
        line-height: 1 !important;
        margin-top: 0 !important;
    }
    
    .swal-block-icon.swal2-icon-warning .swal2-warning-ring,
    .swal-delete-icon.swal2-icon-warning .swal2-warning-ring {
        border-color: transparent !important;
        display: none !important;
    }
    
    .swal-block-icon.swal2-icon-warning::before,
    .swal-delete-icon.swal2-icon-warning::before {
        display: none !important;
    }
    
    .swal-block-confirm,
    .swal-delete-confirm {
        background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%) !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 12px 24px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3) !important;
        transition: all 0.2s ease !important;
        flex: 1 !important;
    }
    
    .swal-block-confirm:hover,
    .swal-delete-confirm:hover {
        background: linear-gradient(135deg, #ff5555 0%, #dd0000 100%) !important;
        box-shadow: 0 6px 16px rgba(255, 68, 68, 0.4) !important;
        transform: translateY(-2px) !important;
    }
    
    .swal-block-confirm:active,
    .swal-delete-confirm:active {
        transform: translateY(0) !important;
        box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3) !important;
    }
    
    .swal-block-cancel,
    .swal-delete-cancel {
        background: #f5f5f5 !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 12px 24px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        color: #666 !important;
        box-shadow: none !important;
        transition: all 0.2s ease !important;
        flex: 1 !important;
    }
    
    .swal-block-cancel:hover,
    .swal-delete-cancel:hover {
        background: #e0e0e0 !important;
        transform: translateY(-1px) !important;
    }
    
    .swal-block-popup .swal2-actions,
    .swal-delete-popup .swal2-actions {
        padding: 20px 30px 30px !important;
        display: flex !important;
        gap: 12px !important;
        justify-content: center !important;
        margin: 0 !important;
        border-top: none !important;
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación y autorización antes de inicializar
    checkAuthAndInit();
});

/**
 * Inicializa la renovación automática de tokens
 */
function initTokenRenewal() {
    console.log('🔄 Iniciando renovación automática de tokens...');
    
    // Renovar token cada 50 minutos (antes de que expire a la hora)
    tokenRenewalInterval = setInterval(async () => {
        await renewFirebaseToken();
    }, 50 * 60 * 1000); // 50 minutos
    
    // También renovar inmediatamente si el token está cerca de expirar
    checkTokenExpiration();
}

/**
 * Renueva el token de Firebase
 */
async function renewFirebaseToken() {
    if (isRenewingToken) {
        console.log('🔄 Renovación de token ya en progreso, saltando...');
        return;
    }
    
    try {
        isRenewingToken = true;
        console.log('🔄 Renovando token de Firebase...');
        
        // Verificar si Firebase está disponible
        if (typeof firebase === 'undefined' || !firebase.auth().currentUser) {
            console.log('⚠️ Firebase no disponible o usuario no autenticado');
            return;
        }
        
        // Obtener nuevo token
        const newToken = await firebase.auth().currentUser.getIdToken(true);
        
        // Guardar el nuevo token
        sessionStorage.setItem('firebase_id_token', newToken);
        
        console.log('✅ Token de Firebase renovado exitosamente');
        
        // Actualizar el usuario en sessionStorage si es necesario
        const user = firebase.auth().currentUser;
        if (user) {
            const userData = {
                id_usuario: user.uid,
                nombre_usuario: user.displayName || user.email,
                id_rol: 1, // Asumir admin por ahora
                email: user.email
            };
            sessionStorage.setItem('user', JSON.stringify(userData));
        }
        
    } catch (error) {
        console.error('❌ Error renovando token de Firebase:', error);
        
        // Si el error es por token expirado o usuario no autenticado
        if (error.code === 'auth/id-token-expired' || 
            error.code === 'auth/user-token-expired' ||
            error.code === 'auth/user-disabled' ||
            error.code === 'auth/user-not-found') {
            
            console.log('🔄 Token expirado o usuario no válido, redirigiendo al login...');
            redirectToLogin();
        }
    } finally {
        isRenewingToken = false;
    }
}

/**
 * Verifica si el token está cerca de expirar y lo renueva si es necesario
 */
async function checkTokenExpiration() {
    try {
        const token = sessionStorage.getItem('firebase_id_token');
        if (!token) return;
        
        // Decodificar el token para verificar expiración
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convertir a milisegundos
        const now = Date.now();
        const timeUntilExpiry = exp - now;
        
        console.log('🕐 Token expira en:', Math.round(timeUntilExpiry / 1000 / 60), 'minutos');
        
        // Si el token expira en menos de 10 minutos, renovarlo
        if (timeUntilExpiry < 10 * 60 * 1000) {
            console.log('⚠️ Token expira pronto, renovando...');
            await renewFirebaseToken();
        }
        
    } catch (error) {
        console.error('❌ Error verificando expiración del token:', error);
    }
}

/**
 * Redirige al usuario al login
 */
function redirectToLogin() {
    console.log('🔄 Redirigiendo al login...');
    
    // Limpiar tokens y datos de usuario
    sessionStorage.removeItem('firebase_id_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    
    // Detener renovación automática
    if (tokenRenewalInterval) {
        clearInterval(tokenRenewalInterval);
        tokenRenewalInterval = null;
    }
    
    // Redirigir al login
    window.location.href = 'login';
}

/**
 * Maneja errores de API relacionados con tokens
 */
function handleTokenError(error) {
    console.error('❌ Error de token en API:', error);
    
    if (error.status === 401 || 
        (error.message && error.message.includes('Token invalido'))) {
        
        console.log('🔄 Token inválido detectado, intentando renovar...');
        
        // Intentar renovar el token
        renewFirebaseToken().then(() => {
            console.log('✅ Token renovado, reintentando operación...');
            // Aquí podrías reintentar la operación que falló
        }).catch(() => {
            console.log('❌ No se pudo renovar token, redirigiendo al login...');
            redirectToLogin();
        });
    }
}

async function checkAuthAndInit() {
    try {
        console.log('🔍 GESTIÓN USUARIOS: Verificando autenticación...');
        
        // Verificar tokens disponibles
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        const jwtToken = sessionStorage.getItem('access_token');
        const storedUser = sessionStorage.getItem('user');
        
        console.log('Firebase token:', firebaseToken ? 'Presente' : 'No presente');
        console.log('JWT token:', jwtToken ? 'Presente' : 'No presente');
        console.log('Usuario almacenado:', storedUser ? 'Presente' : 'No presente');
        console.log('Valor usuario almacenado:', storedUser);
        
        // Verificar si el usuario está autenticado
        const user = await getCurrentUser();
        console.log('Usuario obtenido en gestión:', user);
        
        if (!user) {
            console.log('❌ No se pudo obtener usuario, redirigiendo al login');
            console.log('🔍 Estado de sessionStorage antes de redirigir:');
            console.log('- firebase_id_token:', sessionStorage.getItem('firebase_id_token') ? 'Presente' : 'No presente');
            console.log('- access_token:', sessionStorage.getItem('access_token') ? 'Presente' : 'No presente');
            console.log('- user:', sessionStorage.getItem('user'));
            
            window.location.href = 'login';
            return;
        }
        
        console.log('✅ Usuario autenticado:', user.nombre_usuario, 'Rol:', user.id_rol);
        console.log('🔍 Verificando permisos de administrador...');
        console.log('ID Rol del usuario:', user.id_rol, 'Tipo:', typeof user.id_rol);
        console.log('¿Es administrador?', user.id_rol === 1);
        
        // Verificar si tiene permisos de administrador
        if (user.id_rol !== 1) {
            console.log('❌ Usuario no es administrador, mostrando acceso denegado');
            showAccessDenied();
            return;
        }
        
        console.log('✅ Usuario es administrador, inicializando página');
        
        // Inicializar renovación automática de tokens
        initTokenRenewal();
        
        // Mostrar información del usuario en la página para debugging
        showUserInfo(user);
        
        // Configurar interfaz solo para administradores
        setupAdminInterface();
        
        // Si es administrador, inicializar la página
        initGestionUsuariosPage();
        
    } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        window.location.href = 'login';
    }
}

function initGestionUsuariosPage() {
    // Configurar botones de acción
    setupActionButtons();
    
    // Configurar filtros
    setupFilters();
    
    // Configurar búsqueda
    setupSearch();
    
    // Configurar botones de paginación
    setupPaginationButtons();
    
    // Cargar usuarios desde la API
    loadUsersFromAPI();
    
    // Actualizar estadísticas
    updateStats();
    
    console.log('Página de gestión de usuarios inicializada');
}

// Función para configurar los botones de paginación
function setupPaginationButtons() {
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                goToPage(currentPage - 1);
            }
        });
    }
    
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(allUsers.length / usersPerPage);
            if (currentPage < totalPages) {
                goToPage(currentPage + 1);
            }
        });
    }
}

// Función para obtener el usuario actual
async function getCurrentUser() {
    try {
        console.log('🔍 GESTIÓN getCurrentUser: Iniciando...');
        
        // PRIMERO: Intentar obtener desde sessionStorage (más rápido y confiable)
        const storedUserData = sessionStorage.getItem('user');
        if (storedUserData) {
            try {
                const user = JSON.parse(storedUserData);
                console.log('✅ GESTIÓN: Usuario obtenido desde sessionStorage:', user);
                return user;
            } catch (parseError) {
                console.log('❌ GESTIÓN: Error parseando usuario desde sessionStorage:', parseError);
            }
        }
        
        console.log('🔍 GESTIÓN: Intentando con Firebase...');
        // Intentar obtener token de Firebase
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        if (firebaseToken) {
            console.log('🔍 GESTIÓN: Token Firebase presente, haciendo petición...');
            try {
                const response = await fetch(`${getApiBase()}/public/index.php?route=firebase&caso=1&action=me`, {
                    headers: { 'Authorization': `Bearer ${firebaseToken}` }
                });
                console.log('🔍 GESTIÓN: Respuesta Firebase:', response.status, response.statusText);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ GESTIÓN: Usuario obtenido via Firebase:', data.data);
                    return data.data;
                } else {
                    const errorText = await response.text();
                    console.log('❌ GESTIÓN: Error Firebase:', errorText);
                }
            } catch (firebaseError) {
                console.log('❌ GESTIÓN: Error en petición Firebase:', firebaseError);
            }
        } else {
            console.log('🔍 GESTIÓN: No hay token Firebase');
        }
        
        console.log('🔍 GESTIÓN: Intentando con JWT...');
        // Intentar obtener token JWT local
        const jwtToken = sessionStorage.getItem('access_token');
        if (jwtToken) {
            console.log('🔍 GESTIÓN: Token JWT presente, haciendo petición...');
            try {
                const response = await fetch(`${getApiBase()}/public/index.php?route=auth&caso=1&action=me`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                console.log('🔍 GESTIÓN: Respuesta JWT:', response.status, response.statusText);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ GESTIÓN: Usuario obtenido via JWT:', data.data.user);
                    return data.data.user;
                } else {
                    const errorText = await response.text();
                    console.log('❌ GESTIÓN: Error JWT:', errorText);
                }
            } catch (jwtError) {
                console.log('❌ GESTIÓN: Error en petición JWT:', jwtError);
            }
        } else {
            console.log('🔍 GESTIÓN: No hay token JWT');
        }
        
        // Fallback: intentar obtener usuario desde sessionStorage si está disponible
        const storedUser = getStoredUser();
        if (storedUser) {
            console.log('✅ Usuario obtenido desde sessionStorage (fallback):', storedUser);
            return storedUser;
        }
        
        console.log('❌ No se pudo obtener usuario con ningún método');
        
        return null;
    } catch (error) {
        console.error('❌ Error general obteniendo usuario actual:', error);
        return null;
    }
}

// Función para mostrar acceso denegado
function showAccessDenied() {
    document.body.innerHTML = `
        <div style="
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            flex-direction: column;
            background: #000000;
            position: relative;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            text-align: center;
            padding: 20px;
        ">
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
                background: #4a148c;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 8px 32px rgba(74, 20, 140, 0.5);
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
                    <button onclick="window.location.href='index'" style="
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
                    
                    <button onclick="window.location.href='perfil'" style="
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
        </div>
        
        <style>
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        </style>
    `;
}

// Función para mostrar información del usuario (debugging)
function showUserInfo(user) {
    // Crear banner de información del usuario
    const userInfoBanner = document.createElement('div');
    userInfoBanner.style.cssText = `
        background: linear-gradient(45deg, rgba(255, 115, 0, 0.9), rgba(255, 115, 0, 0.7));
        color: white;
        padding: 15px 20px;
        text-align: center;
        font-weight: 600;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(255, 115, 0, 0.3);
        font-size: 1.1rem;
        letter-spacing: 0.5px;
    `;
    
    const roleText = user.id_rol === 1 ? 'Administrador' : 'Usuario';
    
    userInfoBanner.innerHTML = `
        <span style="color: white; font-weight: 600;">${user.nombre_usuario}</span>
        <span style="color: rgba(255, 255, 255, 0.9); margin: 0 15px;">•</span>
        <span style="color: white; font-weight: 600;">${roleText}</span>
    `;
    
    document.body.insertBefore(userInfoBanner, document.body.firstChild);
    
    // Ajustar el contenido principal para el banner
    const mainContent = document.querySelector('.sidebar-content');
    if (mainContent) {
        mainContent.style.marginTop = '60px';
    }
}

// Función para configurar interfaz de administrador
function setupAdminInterface() {
    // Mostrar todas las funcionalidades de administrador
    const nuevoUsuarioBtn = document.querySelector('.btn-nuevo-usuario');
    if (nuevoUsuarioBtn) {
        nuevoUsuarioBtn.style.display = 'block';
    }
    
    // Configurar botón de nuevo usuario
    if (nuevoUsuarioBtn) {
        nuevoUsuarioBtn.addEventListener('click', function() {
            showNewUserModal();
        });
    }
}

// Función para obtener la base de la API
function getApiBase() {
    // Obtener la URL base desde la ubicación actual
    const currentPath = window.location.pathname;
    
    // Si estamos en /Color_Ink/public/gestion_usu, la base es /Color_Ink
    if (currentPath.includes('/public/')) {
        const parts = currentPath.split('/public/');
        return parts[0]; // Retorna /Color_Ink
    }
    
    // Fallback: usar la lógica anterior
    const parts = currentPath.split('/');
    const idx = parts.indexOf('src');
    if (idx > 1) {
        return '/' + parts.slice(1, idx).join('/');
    }
    return '/' + (parts[1] || '');
}

// Función para obtener el token actual
function getCurrentToken() {
    // Priorizar JWT, luego Firebase
    const jwtToken = sessionStorage.getItem('access_token');
    const firebaseToken = sessionStorage.getItem('firebase_id_token');
    return jwtToken || firebaseToken || '';
}

// Función para obtener usuario desde sessionStorage
function getStoredUser() {
    try {
        const userStr = sessionStorage.getItem('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
    } catch (e) {
        console.log('Error parseando usuario:', e);
    }
    return null;
}

// Función para obtener un usuario por ID
async function getUserById(userId) {
    try {
        const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('firebase_id_token');
        const authHeader = token ? `Bearer ${token}` : '';
        
        const response = await fetch(`${getApiBase()}/public/index.php?route=user&caso=1&action=get&id=${userId}`, {
            headers: { 'Authorization': authHeader }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.data;
        } else {
            console.error('Error obteniendo usuario:', await response.text());
            return null;
        }
    } catch (error) {
        console.error('Error en getUserById:', error);
        return null;
    }
}

// Función para cargar usuarios desde la API
async function loadUsersFromAPI() {
    try {
        const user = await getCurrentUser();
        if (!user) return;
        
        // Obtener token de autenticación (priorizar JWT, luego Firebase)
        const jwtToken = sessionStorage.getItem('access_token');
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        const token = jwtToken || firebaseToken;
        const authHeader = token ? `Bearer ${token}` : '';
        
        console.log('🔍 GESTIÓN: Token para API:', jwtToken ? 'JWT' : firebaseToken ? 'Firebase' : 'Ninguno');
        
        const response = await fetch(`${getApiBase()}/public/index.php?route=user&caso=1&action=list`, {
            headers: { 'Authorization': authHeader }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Guardar todos los usuarios
            allUsers = data.data || [];
            // Inicializar usuarios filtrados con todos los usuarios
            filteredUsers = [...allUsers];
            // Resetear a página 1
                currentPage = 1;
            // Aplicar filtros actuales si existen
            applyFilters();
            displayUsers();
            updateStatsFromData(allUsers);
        } else {
            const errorText = await response.text();
            console.error('Error cargando usuarios:', errorText);
            
            // Si es error 401, intentar renovar token
            if (response.status === 401) {
                console.log('🔄 Error 401 detectado, intentando renovar token...');
                try {
                    await renewFirebaseToken();
                    // Reintentar la operación después de renovar
                    console.log('🔄 Reintentando carga de usuarios...');
                    setTimeout(() => loadUsersFromAPI(), 1000);
                    return;
                } catch (renewError) {
                    console.error('❌ No se pudo renovar token:', renewError);
                    redirectToLogin();
                    return;
                }
            }
            
            showError('Error cargando usuarios');
        }
    } catch (error) {
        console.error('Error en loadUsersFromAPI:', error);
        showError('Error de conexión');
    }
}

// Función para mostrar usuarios en la tabla con paginación
function displayUsers() {
    const tbody = document.querySelector('.usuarios-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Calcular índices para la página actual usando usuarios filtrados
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToShow = filteredUsers.slice(startIndex, endIndex);
    
    // Mostrar usuarios de la página actual
    usersToShow.forEach(user => {
        const row = createUserRow(user);
        tbody.appendChild(row);
    });
    
    // Reconfigurar botones de acción después de actualizar la tabla
    setupActionButtons();
    
    // Actualizar controles de paginación
    updatePaginationControls();
}

// Función para actualizar los controles de paginación (estilo auditoría)
function updatePaginationControls() {
    const totalUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    
    // Obtener contenedor de números de página
    const paginationNumbers = document.getElementById('paginationNumbers');
    if (!paginationNumbers) return;
    
    // Ocultar contenedor completo si solo hay una página o menos
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        if (totalPages > 1) {
            paginationContainer.style.display = 'flex';
        } else {
            paginationContainer.style.display = 'none';
        }
    }
    
    // Actualizar números de página
    updatePageNumbers(totalPages);
}

// Función para actualizar los números de página (estilo auditoría - mostrar todos)
function updatePageNumbers(totalPages) {
    const paginationNumbers = document.getElementById('paginationNumbers');
    if (!paginationNumbers) return;
    
    paginationNumbers.innerHTML = '';
    
    // Mostrar todos los números de página como en auditoría
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = createPageButton(i);
        paginationNumbers.appendChild(pageBtn);
    }
}

// Función para crear un botón de página (estilo auditoría con naranja)
function createPageButton(pageNumber) {
    const button = document.createElement('button');
    button.textContent = pageNumber;
    
    // Estilo similar a auditoría pero con naranja para el activo
    if (pageNumber === currentPage) {
        button.classList.add('active');
    button.style.cssText = `
            padding: 6px 10px;
            border-radius: 6px;
            background: rgba(255, 115, 0, 0.6);
        color: white;
            border: 1px solid rgba(255, 115, 0, 0.35);
        cursor: pointer;
            font-weight: 600;
        `;
    } else {
        button.style.cssText = `
            padding: 6px 10px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.05);
            color: white;
            border: 1px solid rgba(255, 115, 0, 0.35);
            cursor: pointer;
        `;
        
        button.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255, 115, 0, 0.2)';
        });
        button.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255, 255, 255, 0.05)';
        });
    }
    
    button.addEventListener('click', () => goToPage(pageNumber));
    
    return button;
}

// Función para cambiar de página
function goToPage(page) {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayUsers();
    
    // Scroll hacia arriba de la tabla
    const table = document.querySelector('.usuarios-table');
    if (table) {
        table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Función para crear una fila de usuario
function createUserRow(user) {
    const row = document.createElement('tr');
    
    const roleText = user.id_rol === 1 ? 'Administrador' : 'Usuario';
    const roleClass = user.id_rol === 1 ? 'admin' : 'empleado';
    
    // Determinar estado basado en bloqueado_hasta y Lista Negra
    let statusText = 'Activo';
    let statusClass = 'activo';
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
        statusText = 'Bloqueado';
        statusClass = 'bloqueado';
    }
    
    // Verificar si el usuario está en la Lista Negra
    if (user.is_blacklisted) {
        statusText = 'Bloqueado';
        statusClass = 'bloqueado';
    }
    
    // Formatear último acceso
    const lastAccess = user.ultimo_acceso ? formatLastAccess(user.ultimo_acceso) : 'Nunca';
    
    row.innerHTML = `
        <td>#${user.id_usuario.toString().padStart(3, '0')}</td>
        <td>
            <div class="user-info">
                <div class="user-avatar">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div class="user-details">
                    <strong>${user.nombre_usuario}</strong>
                    <small title="${user.correo}">${user.correo}</small>
                </div>
            </div>
        </td>
        <td class="cell-email" title="${user.correo}">${user.correo}</td>
        <td><span class="role ${roleClass}">${roleText}</span></td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>${lastAccess}</td>
        <td>
            <button class="btn-action" title="Ver perfil" data-user-id="${user.id_usuario}">
                <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-action" title="Editar" data-user-id="${user.id_usuario}">
                <i class="fa-solid fa-edit"></i>
            </button>
            <button class="btn-action" title="${statusText === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}" data-user-id="${user.id_usuario}">
                <i class="fa-solid fa-${statusText === 'Bloqueado' ? 'unlock' : 'lock'}"></i>
            </button>
            <button class="btn-action" title="Eliminar" data-user-id="${user.id_usuario}">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;
    
    return row;
}

// Función para formatear último acceso
function formatLastAccess(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return `Hace ${diffDays} días`;
}

// Función para actualizar estadísticas desde datos reales
function updateStatsFromData(users) {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => !u.bloqueado_hasta || new Date(u.bloqueado_hasta) <= new Date()).length;
    const adminUsers = users.filter(u => u.id_rol === 1).length;
    
    // Calcular el último acceso más reciente
    let lastAccess = '-';
    if (users.length > 0) {
        const lastAccesses = users
            .filter(u => u.ultimo_acceso)
            .map(u => new Date(u.ultimo_acceso))
            .sort((a, b) => b - a);
        
        if (lastAccesses.length > 0) {
            const now = new Date();
            const diffMs = now - lastAccesses[0];
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffMins < 1) lastAccess = 'Ahora';
            else if (diffMins < 60) lastAccess = `Hace ${diffMins} min`;
            else if (diffHours < 24) lastAccess = `Hace ${diffHours} h`;
            else lastAccess = `Hace ${diffDays} días`;
        }
    }
    
    // Actualizar números en las tarjetas de estadísticas
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers[0]) statNumbers[0].textContent = totalUsers;
    if (statNumbers[1]) statNumbers[1].textContent = activeUsers;
    if (statNumbers[2]) statNumbers[2].textContent = adminUsers;
    if (statNumbers[3]) statNumbers[3].textContent = lastAccess;
}

// Función para mostrar errores
function showError(message) {
    // Crear o actualizar mensaje de error
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
        `;
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function setupActionButtons() {
    const actionButtons = document.querySelectorAll('.btn-action');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const icon = this.querySelector('i');
            const action = getActionFromIcon(icon);
            
            if (action) {
                handleAction(action, this);
            }
        });
    });
}

function getActionFromIcon(icon) {
    if (icon.classList.contains('fa-eye')) return 'view';
    if (icon.classList.contains('fa-edit')) return 'edit';
    if (icon.classList.contains('fa-lock')) return 'block';
    if (icon.classList.contains('fa-unlock')) return 'unblock';
    if (icon.classList.contains('fa-trash')) return 'delete';
    return null;
}

function handleAction(action, button) {
    const userId = button.getAttribute('data-user-id');
    const row = button.closest('tr');
    const userName = row.querySelector('.user-details strong').textContent;
    const userStatus = row.querySelector('.status').textContent.toLowerCase();
    
    switch(action) {
        case 'view':
            viewUsuario(userId, userName);
            break;
        case 'edit':
            editUsuario(userId, userName);
            break;
        case 'block':
            blockUsuario(userId, userName, row);
            break;
        case 'unblock':
            unblockUsuario(userId, userName, row);
            break;
        case 'delete':
            deleteUsuario(userId, userName, row);
            break;
    }
}

function viewUsuario(userId, userName) {
    // Obtener datos del usuario desde la API
    getUserById(userId).then(user => {
        if (user) {
            showUserModal(user, 'view');
        } else {
            showError('No se pudo cargar la información del usuario');
        }
    });
}

function editUsuario(userId, userName) {
    // Obtener datos del usuario desde la API
    getUserById(userId).then(user => {
        if (user) {
            showUserModal(user, 'edit');
        } else {
            showError('No se pudo cargar la información del usuario');
        }
    });
}

async function blockUsuario(userId, userName, row) {
    const result = await Swal.fire({
        title: '¿Bloquear Usuario?',
        html: `¿Estás seguro de que quieres bloquear al usuario "${userName}" (ID: ${userId})?<br><br><span style="color: #999; font-size: 14px; font-weight: 500;">Esta acción puede restringir el acceso del usuario</span>`,
        icon: 'warning',
        iconColor: '#dc3545',
        showCancelButton: true,
        confirmButtonText: 'Bloquear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ff4444',
        cancelButtonColor: '#f5f5f5',
        buttonsStyling: true,
        reverseButtons: false,
        customClass: {
            popup: 'swal-block-popup',
            title: 'swal-block-title',
            htmlContainer: 'swal-block-content',
            confirmButton: 'swal-block-confirm',
            cancelButton: 'swal-block-cancel',
            icon: 'swal-block-icon'
        },
        background: '#ffffff',
        color: '#333'
    });
    
    if (result.isConfirmed) {
        // Llamar al backend para bloquear usuario
        const apiUrl = `${getApiBase()}/public/index.php?route=user&caso=1&action=block&id=${userId}`;
        console.log('🔍 URL de bloqueo:', apiUrl);
        fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getCurrentToken()}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'OK') {
        const statusCell = row.querySelector('.status');
                const lockButton = row.querySelector('.fa-lock')?.parentElement;
        
        // Cambiar estado a bloqueado
                if (statusCell) {
        statusCell.textContent = 'Bloqueado';
        statusCell.className = 'status bloqueado';
                }
        
        // Cambiar icono de bloqueo
        if (lockButton) {
            lockButton.innerHTML = '<i class="fa-solid fa-unlock"></i>';
            lockButton.title = 'Desbloquear';
        }
        
        // Recargar usuarios para mantener filtros y paginación
        loadUsersFromAPI();
        showNotification(`Usuario ${userName} bloqueado correctamente`, 'success');
            } else {
                showNotification(`Error bloqueando usuario: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error bloqueando usuario:', error);
            showNotification('Error bloqueando usuario', 'error');
        });
    }
}

async function unblockUsuario(userId, userName, row) {
    const result = await Swal.fire({
        title: '¿Desbloquear Usuario?',
        html: `¿Estás seguro de que quieres <strong>desbloquear</strong> al usuario <br><strong>"${userName}"</strong> (ID: ${userId})?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, desbloquear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4caf50',
        cancelButtonColor: '#667eea'
    });
    
    if (result.isConfirmed) {
        // Llamar al backend para desbloquear usuario
        const apiUrl = `${getApiBase()}/public/index.php?route=user&caso=1&action=unblock&id=${userId}`;
        console.log('🔍 URL de desbloqueo:', apiUrl);
        fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getCurrentToken()}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'OK') {
        const statusCell = row.querySelector('.status');
                const unlockButton = row.querySelector('.fa-unlock')?.parentElement;
        
        // Cambiar estado a activo
                if (statusCell) {
        statusCell.textContent = 'Activo';
        statusCell.className = 'status activo';
                }
        
        // Cambiar icono de desbloqueo
        if (unlockButton) {
            unlockButton.innerHTML = '<i class="fa-solid fa-lock"></i>';
            unlockButton.title = 'Bloquear';
        }
        
        // Recargar usuarios para mantener filtros y paginación
        loadUsersFromAPI();
        showNotification(`Usuario ${userName} desbloqueado correctamente`, 'success');
            } else {
                showNotification(`Error desbloqueando usuario: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error desbloqueando usuario:', error);
            showNotification('Error desbloqueando usuario', 'error');
        });
    }
}

async function deleteUsuario(userId, userName, row) {
    const result = await Swal.fire({
        title: '¿Eliminar Usuario?',
        html: `¿Estás seguro de que quieres eliminar al usuario "${userName}" (ID: ${userId})?<br><br><span style="color: #999; font-size: 14px; font-weight: 500;">Esta acción no se puede deshacer</span>`,
        icon: 'warning',
        iconColor: '#dc3545',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ff4444',
        cancelButtonColor: '#f5f5f5',
        buttonsStyling: true,
        reverseButtons: false,
        customClass: {
            popup: 'swal-delete-popup',
            title: 'swal-delete-title',
            htmlContainer: 'swal-delete-content',
            confirmButton: 'swal-delete-confirm',
            cancelButton: 'swal-delete-cancel',
            icon: 'swal-delete-icon'
        },
        background: '#ffffff',
        color: '#333',
        focusCancel: true
    });
    
    if (result.isConfirmed) {
        try {
            const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('firebase_id_token');
            const authHeader = token ? `Bearer ${token}` : '';
            
            const apiUrl = `${getApiBase()}/public/index.php?route=user&caso=1&action=delete&id=${userId}`;
            console.log('🔍 URL de eliminación:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: { 'Authorization': authHeader }
            });
            
            if (response.ok) {
                row.style.opacity = '0.5';
                row.style.transition = 'opacity 0.3s ease';
                
                // Recargar usuarios para mantener filtros y paginación
                loadUsersFromAPI();
                    showNotification(`Usuario ${userName} eliminado correctamente`, 'success');
            } else {
                // Si es error 401, intentar renovar token
                if (response.status === 401) {
                    console.log('🔄 Error 401 en eliminación de usuario, intentando renovar token...');
                    try {
                        await renewFirebaseToken();
                        // Reintentar la operación después de renovar
                        console.log('🔄 Reintentando eliminación de usuario...');
                        setTimeout(() => deleteUsuario(userId, userName, row), 1000);
                        return;
                    } catch (renewError) {
                        console.error('❌ No se pudo renovar token:', renewError);
                        redirectToLogin();
                        return;
                    }
                }
                
                const errorData = await response.json();
                showError(errorData.message || 'Error eliminando usuario');
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            showError('Error de conexión');
        }
    }
}

function setupFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            // Resetear a página 1 cuando se cambia un filtro
            currentPage = 1;
            applyFilters();
            displayUsers();
        });
    });
}

// Función para aplicar filtros a los usuarios
function applyFilters() {
    const rolSelect = document.querySelector('.filter-select:first-of-type');
    const estadoSelect = document.querySelector('.filter-select:last-of-type');
    
    const rolFilter = rolSelect?.value || '';
    const estadoFilter = estadoSelect?.value || '';
    
    // Filtrar usuarios basándose en los criterios seleccionados
    filteredUsers = allUsers.filter(user => {
        // Filtrar por rol
        let rolMatch = true;
        if (rolFilter !== '') {
            if (rolFilter === 'administrador') {
                rolMatch = user.id_rol === 1;
            } else if (rolFilter === 'usuario') {
                rolMatch = user.id_rol === 2;
            }
        }
        
        // Filtrar por estado
        let estadoMatch = true;
        if (estadoFilter !== '') {
            const isBlocked = (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) || user.is_blacklisted;
            
            if (estadoFilter === 'activo') {
                estadoMatch = !isBlocked;
            } else if (estadoFilter === 'bloqueado') {
                estadoMatch = isBlocked;
            }
        }
        
        return rolMatch && estadoMatch;
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            searchUsuarios(searchTerm);
        });
    }
}

function searchUsuarios(searchTerm) {
    if (searchTerm === '') {
        // Si no hay término de búsqueda, aplicar solo los filtros
        applyFilters();
    } else {
        // Aplicar filtros primero
        applyFilters();
        
        // Luego filtrar por término de búsqueda
        filteredUsers = filteredUsers.filter(user => {
            const searchLower = searchTerm.toLowerCase();
            return (
                user.nombre_usuario?.toLowerCase().includes(searchLower) ||
                user.correo?.toLowerCase().includes(searchLower) ||
                user.telefono?.toLowerCase().includes(searchLower) ||
                user.id_usuario?.toString().includes(searchLower)
            );
        });
    }
    
    // Resetear a página 1 cuando se busca
    currentPage = 1;
    displayUsers();
}

function updateStats() {
    const rows = document.querySelectorAll('.usuarios-table tbody tr');
    let totalUsuarios = 0;
    let usuariosActivos = 0;
    let administradores = 0;
    
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            totalUsuarios++;
            
            const rol = row.querySelector('.role').textContent.toLowerCase();
            const estado = row.querySelector('.status').textContent.toLowerCase();
            
            if (estado.includes('activo')) {
                usuariosActivos++;
            }
            
            if (rol.includes('admin')) {
                administradores++;
            }
        }
    });
    
    // Actualizar las estadísticas en la interfaz
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers[0]) statNumbers[0].textContent = totalUsuarios;
    if (statNumbers[1]) statNumbers[1].textContent = usuariosActivos;
    if (statNumbers[2]) statNumbers[2].textContent = administradores;
    if (statNumbers[3]) statNumbers[3].textContent = '2 min'; // Simulado
}

function showNotification(message, type = 'info') {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos de la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#28a745' : '#007bff'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función para el botón de nuevo usuario
document.addEventListener('DOMContentLoaded', function() {
    const nuevoUsuarioBtn = document.querySelector('.btn-nuevo-usuario');
    
    if (nuevoUsuarioBtn) {
        // Remover cualquier event listener existente
        nuevoUsuarioBtn.replaceWith(nuevoUsuarioBtn.cloneNode(true));
        const newBtn = document.querySelector('.btn-nuevo-usuario');
        
        newBtn.addEventListener('click', function() {
            // Llamar a la funcionalidad real de crear usuario
            showNewUserModal();
        });
    }
});

// Función para actualizar estadísticas en tiempo real
function refreshStats() {
    updateStats();
}

// Actualizar estadísticas cada 30 segundos
setInterval(refreshStats, 30000);

// Función para exportar datos de usuarios
function exportUsuarios() {
    const rows = document.querySelectorAll('.usuarios-table tbody tr');
    let csvContent = "ID,Usuario,Email,Rol,Estado,Último Acceso\n";
    
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            const cells = row.querySelectorAll('td');
            const rowData = [];
            
            cells.forEach((cell, index) => {
                if (index < 6) { // Solo las primeras 6 columnas
                    let cellText = cell.textContent.trim();
                    if (cellText.includes(',')) {
                        cellText = `"${cellText}"`;
                    }
                    rowData.push(cellText);
                }
            });
            
            csvContent += rowData.join(',') + '\n';
        }
    });
    
    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Datos de usuarios exportados correctamente', 'success');
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    showNotification(message, 'success');
}

// Función para mostrar modal de usuario
function showUserModal(user, mode) {
    const modal = document.createElement('div');
    modal.className = 'user-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: #000000;
        padding: 0;
        border-radius: 20px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        border: 2px solid rgba(255, 115, 0, 0.3);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        color: white;
    `;
    
    modalContent.innerHTML = `
            <div style="
            background: linear-gradient(135deg, rgba(255, 115, 0, 1), rgba(255, 115, 0, 0.9));
            color: white;
            padding: 25px 30px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(255, 255, 255, 0.2);
            position: relative;
            overflow: hidden;
        ">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="
                    background: rgba(255, 255, 255, 0.2);
                    padding: 14px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                    border: 2px solid rgba(255, 255, 255, 0.3);
            ">
                    <i class="fa-solid fa-${mode === 'view' ? 'eye' : 'edit'}" style="font-size: 1.5em; color: white;"></i>
        </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.8em; font-weight: bold; color: white;">
                        ${mode === 'view' ? 'Ver Usuario' : 'Editar Usuario'}
                    </h2>
                    <span style="font-size: 0.9em; opacity: 0.8; font-weight: 500; color: rgba(255, 255, 255, 0.9);">
                        ID: ${user.id_usuario}
                    </span>
        </div>
            </div>
            <span class="close" onclick="this.closest('.user-modal').remove()" style="
                color: white;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            " onmouseover="this.style.backgroundColor='rgba(255, 255, 255, 0.2)'; this.style.transform='rotate(90deg)'" 
               onmouseout="this.style.backgroundColor='transparent'; this.style.transform='rotate(0deg)'">&times;</span>
        </div>
        <div style="padding: 35px; background: linear-gradient(135deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05));">
        <div style="margin: 20px 0;">
            <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Nombre:</label>
            <input type="text" value="${user.nombre_usuario}" ${mode === 'view' ? 'readonly' : ''} style="
                width: 100%; 
                padding: 12px 15px; 
                border: 2px solid rgba(255, 115, 0, 0.3);
                border-radius: 10px;
                background: #000000;
                color: white;
                font-size: 1rem;
            " placeholder="Nombre del usuario">
        </div>
        <div style="margin: 20px 0;">
            <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Email:</label>
            <input type="email" value="${user.correo}" ${mode === 'view' ? 'readonly' : ''} style="
                width: 100%; 
                padding: 12px 15px; 
                border: 2px solid rgba(255, 115, 0, 0.3);
                border-radius: 10px;
                background: #000000;
                color: white;
                font-size: 1rem;
            " placeholder="usuario@ejemplo.com">
        </div>
        <div style="margin: 20px 0;">
            <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Teléfono:</label>
            <input type="text" value="${user.telefono || ''}" ${mode === 'view' ? 'readonly' : ''} style="
                width: 100%; 
                padding: 12px 15px; 
                border: 2px solid rgba(255, 115, 0, 0.3);
                border-radius: 10px;
                background: #000000;
                color: white;
                font-size: 1rem;
            " placeholder="1234-5678">
        </div>
        <div style="margin: 20px 0;">
            <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Rol:</label>
            <select ${mode === 'view' ? 'disabled' : ''} style="
                width: 100%; 
                padding: 12px 15px; 
                border: 2px solid rgba(255, 115, 0, 0.3);
                border-radius: 10px;
                background: #000000;
                color: white;
                font-size: 1rem;
            ">
                <option value="1" ${user.id_rol === 1 ? 'selected' : ''} style="background: #000000; color: white;">Administrador</option>
                <option value="2" ${user.id_rol === 2 ? 'selected' : ''} style="background: #000000; color: white;">Usuario</option>
            </select>
        </div>
        <div style="margin: 20px 0;">
            <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Último Acceso:</label>
            <input type="text" value="${user.ultimo_acceso || 'Nunca'}" readonly style="
                width: 100%; 
                padding: 12px 15px; 
                border: 2px solid rgba(255, 115, 0, 0.3);
                border-radius: 10px;
                background: #000000;
                color: white;
                font-size: 1rem;
            " placeholder="Fecha de último acceso">
        </div>
        ${mode === 'edit' ? `<input type="hidden" name="id_usuario" value="${user.id_usuario}">` : ''}
        </div>
        <div style="padding: 25px 30px; background: rgba(180, 70, 0, 0.95); border-top: 2px solid rgba(255, 115, 0, 0.3); text-align: center; display: flex; gap: 15px; justify-content: center; border-radius: 0 0 20px 20px;">
            <button onclick="this.closest('.user-modal').remove()" style="
                padding: 12px 25px;
                background: linear-gradient(45deg, #e74c3c, #c0392b);
                color: white;
                border: none;
                border-radius: 25px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(231, 76, 60, 0.6)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(231, 76, 60, 0.4)'">
                Cerrar
            </button>
            ${mode === 'edit' ? `
                <button onclick="saveUserChanges(this)" style="
                    padding: 12px 25px;
                    background: linear-gradient(45deg, #27ae60, #229954);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(39, 174, 96, 0.6)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(39, 174, 96, 0.4)'">
                    Guardar
                </button>
            ` : ''}
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Función para guardar cambios de usuario
async function saveUserChanges(button) {
    const modal = button.closest('.user-modal');
    const inputs = modal.querySelectorAll('input, select');
    
    const userData = {
        nombre_usuario: inputs[0].value,
        correo: inputs[1].value,
        telefono: inputs[2].value,
        id_rol: parseInt(inputs[3].value)
    };
    
    // Obtener el ID del usuario desde el modal
    const userId = modal.querySelector('[data-user-id]')?.getAttribute('data-user-id') || 
                   modal.querySelector('input[name="id_usuario"]')?.value;
    
    console.log('🔍 ID del usuario a actualizar:', userId);
    
    try {
        const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('firebase_id_token');
        const authHeader = token ? `Bearer ${token}` : '';
        
        const response = await fetch(`${getApiBase()}/public/index.php?route=user&caso=1&action=update&id=${userId}`, {
            method: 'POST',
            headers: { 
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            showSuccess('Usuario actualizado exitosamente');
            modal.remove();
            loadUsersFromAPI(); // Recargar la lista
        } else {
            showError('Error actualizando usuario');
        }
    } catch (error) {
        console.error('Error en saveUserChanges:', error);
        showError('Error de conexión');
    }
}

// Función para mostrar modal de nuevo usuario (solo administradores)
function showNewUserModal() {
    const modal = document.createElement('div');
    modal.className = 'user-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: #000000;
        padding: 0;
        border-radius: 20px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        border: 2px solid rgba(255, 115, 0, 0.3);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        color: white;
    `;
    
    modalContent.innerHTML = `
            <div style="
            background: linear-gradient(135deg, rgba(255, 115, 0, 1), rgba(255, 115, 0, 0.9));
            color: white;
            padding: 25px 30px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(255, 255, 255, 0.2);
            position: relative;
            overflow: hidden;
        ">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="
                    background: rgba(255, 255, 255, 0.2);
                    padding: 14px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                    border: 2px solid rgba(255, 255, 255, 0.3);
            ">
                    <i class="fa-solid fa-user-plus" style="font-size: 1.5em; color: white;"></i>
            </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.8em; font-weight: bold; color: white;">
                        Crear Nuevo Usuario
                    </h2>
        </div>
            </div>
            <span class="close" onclick="this.closest('.user-modal').remove()" style="
                color: white;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            " onmouseover="this.style.backgroundColor='rgba(255, 255, 255, 0.2)'; this.style.transform='rotate(90deg)'" 
               onmouseout="this.style.backgroundColor='transparent'; this.style.transform='rotate(0deg)'">&times;</span>
        </div>
        <div style="padding: 35px; background: linear-gradient(135deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05));">
        <form id="newUserForm">
            <div style="margin: 20px 0;">
                <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Nombre Completo:</label>
                <input type="text" name="nombre_usuario" required style="
                    width: 100%; 
                    padding: 12px 15px; 
                    border: 2px solid rgba(255, 115, 0, 0.3);
                    border-radius: 10px;
                    background: #000000;
                    color: white;
                    font-size: 1rem;
                " placeholder="Ingresa el nombre completo">
            </div>
            <div style="margin: 20px 0;">
                <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Email:</label>
                <input type="email" name="correo" required style="
                    width: 100%; 
                    padding: 12px 15px; 
                    border: 2px solid rgba(255, 115, 0, 0.3);
                    border-radius: 10px;
                    background: #000000;
                    color: white;
                    font-size: 1rem;
                " placeholder="usuario@ejemplo.com">
            </div>
            <div style="margin: 20px 0;">
                <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Teléfono:</label>
                <input type="text" name="telefono" style="
                    width: 100%; 
                    padding: 12px 15px; 
                    border: 2px solid rgba(255, 115, 0, 0.3);
                    border-radius: 10px;
                    background: #000000;
                    color: white;
                    font-size: 1rem;
                " placeholder="1234-5678">
            </div>
            <div style="margin: 20px 0;">
                <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Contraseña:</label>
                <input type="password" name="contrasena" required style="
                    width: 100%; 
                    padding: 12px 15px; 
                    border: 2px solid rgba(255, 115, 0, 0.3);
                    border-radius: 10px;
                    background: #000000;
                    color: white;
                    font-size: 1rem;
                " placeholder="Mínimo 6 caracteres">
            </div>
            <div style="margin: 20px 0;">
                <label style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 8px;">Rol:</label>
                <select name="id_rol" style="
                    width: 100%; 
                    padding: 12px 15px; 
                    border: 2px solid rgba(255, 115, 0, 0.3);
                    border-radius: 10px;
                    background: #000000;
                    color: white;
                    font-size: 1rem;
                ">
                    <option value="2" style="background: #000000; color: white;">Usuario</option>
                    <option value="1" style="background: #000000; color: white;">Administrador</option>
                </select>
            </div>
        </form>
        </div>
        <div style="padding: 25px 30px; background: rgba(180, 70, 0, 0.95); border-top: 2px solid rgba(255, 115, 0, 0.3); text-align: center; display: flex; gap: 15px; justify-content: center; border-radius: 0 0 20px 20px;">
                <button type="button" onclick="this.closest('.user-modal').remove()" style="
                    padding: 12px 25px;
                background: linear-gradient(45deg, #e74c3c, #c0392b);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(231, 76, 60, 0.6)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(231, 76, 60, 0.4)'">
                    Cancelar
                </button>
            <button type="button" onclick="document.getElementById('newUserForm').requestSubmit()" style="
                    padding: 12px 25px;
                background: linear-gradient(45deg, #27ae60, #229954);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(39, 174, 96, 0.6)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(39, 174, 96, 0.4)'">
                    Crear Usuario
                </button>
            </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Configurar formulario
    document.getElementById('newUserForm').addEventListener('submit', createNewUser);
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Función para crear nuevo usuario
async function createNewUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        nombre_usuario: formData.get('nombre_usuario'),
        correo: formData.get('correo'),
        telefono: formData.get('telefono'),
        contrasena: formData.get('contrasena'),
        id_rol: parseInt(formData.get('id_rol'))
    };
    
    try {
        const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('firebase_id_token');
        const authHeader = token ? `Bearer ${token}` : '';
        
        const response = await fetch(`${getApiBase()}/public/index.php?route=user&caso=1&action=create`, {
            method: 'POST',
            headers: { 
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            showSuccess('Usuario creado exitosamente');
            e.target.closest('.user-modal').remove();
            loadUsersFromAPI(); // Recargar la lista
        } else {
            // Si es error 401, intentar renovar token
            if (response.status === 401) {
                console.log('🔄 Error 401 en creación de usuario, intentando renovar token...');
                try {
                    await renewFirebaseToken();
                    // Reintentar la operación después de renovar
                    console.log('🔄 Reintentando creación de usuario...');
                    setTimeout(() => createNewUser(e), 1000);
                    return;
                } catch (renewError) {
                    console.error('❌ No se pudo renovar token:', renewError);
                    redirectToLogin();
                    return;
                }
            }
            
            const errorData = await response.json();
            showError(errorData.message || 'Error creando usuario');
        }
    } catch (error) {
        console.error('Error creando usuario:', error);
        showError('Error de conexión');
    }
}