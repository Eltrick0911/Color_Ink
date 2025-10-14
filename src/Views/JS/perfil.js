/**
 * JavaScript para la página de perfil personal
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación y cargar perfil
    checkAuthAndLoadProfile();
});

async function checkAuthAndLoadProfile() {
    try {
        console.log('🔍 PERFIL: Verificando autenticación...');
        
        // Verificar tokens disponibles
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        const jwtToken = sessionStorage.getItem('access_token');
        const storedUser = sessionStorage.getItem('user');
        
        console.log('Firebase token:', firebaseToken ? 'Presente' : 'No presente');
        console.log('JWT token:', jwtToken ? 'Presente' : 'No presente');
        console.log('Usuario almacenado:', storedUser ? 'Presente' : 'No presente');
        
        // Verificar si el usuario está autenticado
        const user = await getCurrentUser();
        console.log('Usuario obtenido en perfil:', user);
        
        if (!user) {
            console.log('❌ No se pudo obtener usuario, redirigiendo al login');
            console.log('🔍 Estado de sessionStorage antes de redirigir:');
            console.log('- firebase_id_token:', sessionStorage.getItem('firebase_id_token') ? 'Presente' : 'No presente');
            console.log('- access_token:', sessionStorage.getItem('access_token') ? 'Presente' : 'No presente');
            console.log('- user:', sessionStorage.getItem('user'));
            
            window.location.href = 'login';
            return;
        }
        
        console.log('✅ Usuario autenticado en perfil:', user.nombre_usuario, 'Rol:', user.id_rol);
        
        // Cargar información del perfil
        loadUserProfile(user);
        
    } catch (error) {
        console.error('❌ Error verificando autenticación en perfil:', error);
        window.location.href = 'login.html';
    }
}

// Función para obtener el usuario actual
async function getCurrentUser() {
    try {
        console.log('🔍 PERFIL getCurrentUser: Iniciando...');
        
        // PRIMERO: Intentar obtener desde sessionStorage (más rápido y confiable)
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                console.log('✅ PERFIL: Usuario obtenido desde sessionStorage:', user);
                return user;
            } catch (parseError) {
                console.log('❌ PERFIL: Error parseando usuario desde sessionStorage:', parseError);
            }
        }
        
        console.log('🔍 PERFIL: Intentando con Firebase...');
        // Intentar obtener token de Firebase
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        if (firebaseToken) {
            console.log('🔍 PERFIL: Token Firebase presente, haciendo petición...');
            const response = await fetch(`${getApiBase()}/public/index.php?route=firebase&action=me`, {
                headers: { 'Authorization': `Bearer ${firebaseToken}` }
            });
            console.log('🔍 PERFIL: Respuesta Firebase:', response.status, response.statusText);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ PERFIL: Usuario obtenido via Firebase:', data.data);
                return data.data;
            } else {
                const errorText = await response.text();
                console.log('❌ PERFIL: Error Firebase:', errorText);
            }
        } else {
            console.log('🔍 PERFIL: No hay token Firebase');
        }
        
        console.log('🔍 PERFIL: Intentando con JWT...');
        // Intentar obtener token JWT local
        const jwtToken = sessionStorage.getItem('access_token');
        if (jwtToken) {
            console.log('🔍 PERFIL: Token JWT presente, haciendo petición...');
            const response = await fetch(`${getApiBase()}/public/index.php?route=auth&action=me`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            console.log('🔍 PERFIL: Respuesta JWT:', response.status, response.statusText);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ PERFIL: Usuario obtenido via JWT:', data.data.user);
                return data.data.user;
            } else {
                const errorText = await response.text();
                console.log('❌ PERFIL: Error JWT:', errorText);
            }
        } else {
            console.log('🔍 PERFIL: No hay token JWT');
        }
        
        // Fallback: intentar obtener usuario desde sessionStorage si está disponible
        const storedUserFallback = sessionStorage.getItem('user');
        if (storedUserFallback) {
            try {
                const user = JSON.parse(storedUserFallback);
                console.log('✅ Usuario obtenido desde sessionStorage en perfil (fallback):', user);
                return user;
            } catch (parseError) {
                console.log('❌ Error parseando usuario desde sessionStorage en perfil:', parseError);
            }
        }
        
        console.log('❌ No se pudo obtener usuario de ninguna fuente');
        return null;
    } catch (error) {
        console.error('❌ Error obteniendo usuario actual en perfil:', error);
        return null;
    }
}

// Función para cargar el perfil del usuario
async function loadUserProfile(user) {
    try {
        // Obtener información completa del usuario (priorizar JWT, luego Firebase)
        const jwtToken = sessionStorage.getItem('access_token');
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        const token = jwtToken || firebaseToken;
        const authHeader = token ? `Bearer ${token}` : '';
        
        console.log('🔍 PERFIL: Token para API:', jwtToken ? 'JWT' : firebaseToken ? 'Firebase' : 'Ninguno');
        
        const response = await fetch(`${getApiBase()}/public/index.php?route=user&action=getById&id=${user.id_usuario}`, {
            headers: { 'Authorization': authHeader }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayUserProfile(data.data);
        } else {
            // Si no se puede obtener información completa, usar la básica
            displayUserProfile(user);
        }
    } catch (error) {
        console.error('Error cargando perfil:', error);
        displayUserProfile(user);
    }
}

// Función para mostrar el perfil del usuario
function displayUserProfile(user) {
    // Actualizar información básica
    document.getElementById('userName').textContent = user.nombre_usuario || 'No disponible';
    document.getElementById('userEmail').textContent = user.correo || 'No disponible';
    document.getElementById('userRole').textContent = user.id_rol === 1 ? 'Administrador' : 'Usuario';
    
    // Actualizar estadísticas
    document.getElementById('fechaRegistro').textContent = user.fecha_ingreso || 'No disponible';
    document.getElementById('ultimoAcceso').textContent = formatLastAccess(user.ultimo_acceso);
    document.getElementById('estadoCuenta').textContent = getAccountStatus(user);
    
    // Configurar formulario de edición
    setupEditForm(user);
}

// Función para formatear último acceso
function formatLastAccess(dateString) {
    if (!dateString) return 'Nunca';
    
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

// Función para determinar el estado de la cuenta
function getAccountStatus(user) {
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
        return 'Bloqueada';
    }
    return 'Activa';
}

// Función para configurar el formulario de edición
function setupEditForm(user) {
    document.getElementById('nombre').value = user.nombre_usuario || '';
    document.getElementById('email').value = user.correo || '';
    document.getElementById('telefono').value = user.telefono || '';
    
    // Configurar eventos
    document.getElementById('editProfileBtn').addEventListener('click', showEditForm);
    document.getElementById('cancelEditBtn').addEventListener('click', hideEditForm);
    document.getElementById('editProfileForm').addEventListener('submit', saveProfile);
}

// Función para mostrar formulario de edición
function showEditForm() {
    document.getElementById('perfilForm').style.display = 'block';
    document.getElementById('editProfileBtn').style.display = 'none';
}

// Función para ocultar formulario de edición
function hideEditForm() {
    document.getElementById('perfilForm').style.display = 'none';
    document.getElementById('editProfileBtn').style.display = 'block';
}

// Función para guardar cambios del perfil
async function saveProfile(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        nombre_usuario: formData.get('nombre_usuario'),
        correo: formData.get('correo'),
        telefono: formData.get('telefono')
    };
    
    // Solo incluir contraseña si se proporcionó
    const contrasena = formData.get('contrasena');
    if (contrasena && contrasena.trim() !== '') {
        userData.contrasena = contrasena;
    }
    
    try {
        const user = await getCurrentUser();
        const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('firebase_id_token');
        const authHeader = token ? `Bearer ${token}` : '';
        
        const response = await fetch(`${getApiBase()}/public/index.php?route=user&action=update&id=${user.id_usuario}`, {
            method: 'POST',
            headers: { 
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            showSuccess('Perfil actualizado exitosamente');
            hideEditForm();
            // Recargar perfil
            loadUserProfile(user);
        } else {
            const errorData = await response.json();
            showError(errorData.message || 'Error actualizando perfil');
        }
    } catch (error) {
        console.error('Error guardando perfil:', error);
        showError('Error de conexión');
    }
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

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    showNotification(message, 'success');
}

// Función para mostrar errores
function showError(message) {
    showNotification(message, 'error');
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función authGuard para compatibilidad
window.authGuard = function() {
    checkAuthAndLoadProfile();
};
