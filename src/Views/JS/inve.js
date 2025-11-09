// Utilidades de autenticación para diagnosticar tokens/usuario almacenados
function getStoredAuth() {
    const firebaseIdToken = sessionStorage.getItem('firebase_id_token');
    const accessToken = sessionStorage.getItem('access_token');
    let user = null;
    try {
        const raw = sessionStorage.getItem('user');
        user = raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('auth: no se pudo parsear sessionStorage.user', e);
    }
    return { firebaseIdToken, accessToken, user };
}

function logAuthState(context = 'Inventario') {
    const { firebaseIdToken, accessToken, user } = getStoredAuth();
    console.group(`Estado de autenticación · ${context}`);
    console.log('firebase_id_token:', firebaseIdToken ? 'presente' : 'ausente');
    console.log('access_token:', accessToken ? 'presente' : 'ausente');
    if (user) {
        console.log('user objeto completo:', user);
        console.log('id_usuario:', user.id_usuario ?? '(no definido)');
        console.log('id_rol:', user.id_rol ?? '(no definido)');
        console.log('email/correo:', user.email || user.correo || '(no definido)');
    } else {
        console.warn('user: ausente en sessionStorage');
    }
    console.groupEnd();
}

// Exponer util para depuración manual desde consola
window.authDebugDump = logAuthState;

// Construir header Authorization desde sessionStorage (Firebase o JWT local)
function getAuthHeader() {
    const { firebaseIdToken, accessToken } = getStoredAuth();
    const token = firebaseIdToken || accessToken;
    if (token) {
        return { 'Authorization': `Bearer ${token}` };
    }
    return {};
}

// Agregar estilos personalizados para SweetAlert (igual que gestión de usuarios)
const swalStyle = document.createElement('style');
swalStyle.textContent = `
    /* Estilos para modales de eliminar (igual a pedidos y gestión de usuarios) */
    .swal-delete-popup {
        background: #1a1a1a !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        padding: 0 !important;
        max-width: 450px !important;
        width: 90% !important;
    }
    
    .swal-delete-title {
        color: #ffffff !important;
        font-size: 24px !important;
        font-weight: 600 !important;
        margin: 0 !important;
        padding: 0 30px 20px !important;
        text-align: center !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    
    .swal-delete-popup .swal2-header {
        padding: 30px 30px 20px !important;
        text-align: center !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    
    .swal-delete-content {
        color: rgba(255, 255, 255, 0.9) !important;
        font-size: 16px !important;
        line-height: 1.5 !important;
        padding: 25px 30px !important;
        text-align: center !important;
        margin: 0 !important;
    }
    
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
    
    .swal-delete-icon.swal2-icon-warning .swal2-icon-content {
        color: #ffffff !important;
        font-size: 2.5rem !important;
        font-weight: bold !important;
        line-height: 1 !important;
        margin-top: 0 !important;
    }
    
    .swal-delete-icon.swal2-icon-warning .swal2-warning-ring {
        border-color: transparent !important;
        display: none !important;
    }
    
    .swal-delete-icon.swal2-icon-warning::before {
        display: none !important;
    }
    
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
    
    .swal-delete-confirm:hover {
        background: linear-gradient(135deg, #ff5555 0%, #dd0000 100%) !important;
        box-shadow: 0 6px 16px rgba(255, 68, 68, 0.4) !important;
        transform: translateY(-2px) !important;
    }
    
    .swal-delete-confirm:active {
        transform: translateY(0) !important;
        box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3) !important;
    }
    
    .swal-delete-cancel {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 8px !important;
        padding: 12px 24px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        color: rgba(255, 255, 255, 0.9) !important;
        box-shadow: none !important;
        transition: all 0.2s ease !important;
        flex: 1 !important;
    }
    
    .swal-delete-cancel:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
        transform: translateY(-1px) !important;
    }
    
    .swal-delete-popup .swal2-actions {
        padding: 20px 30px 30px !important;
        display: flex !important;
        gap: 12px !important;
        justify-content: center !important;
        margin: 0 !important;
        border-top: none !important;
    }
`;
document.head.appendChild(swalStyle);

// Función para obtener la base URL de la API
function getApiBase() {
    const path = window.location.pathname;
    if (path.includes('/public/')) {
        const parts = path.split('/public/');
        return parts[0];
    }
    return '/Color_Ink';
}

// Función para obtener el usuario actual
async function getCurrentUser() {
    try {
        console.log('INVENTARIO: Intentando obtener usuario...');
        
        // PRIMERO: Intentar obtener desde sessionStorage (más rápido y confiable)
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                console.log('Usuario obtenido desde sessionStorage:', user);
                return user;
            } catch (parseError) {
                console.log(' Error parseando usuario desde sessionStorage:', parseError);
            }
        }
        
        // SEGUNDO: Intentar obtener token de Firebase
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        if (firebaseToken) {
            console.log('Intentando con token Firebase...');
            try {
                const response = await fetch(`${getApiBase()}/public/index.php?route=firebase&caso=1&action=me`, {
                    headers: { 'Authorization': `Bearer ${firebaseToken}` }
                });
                console.log('Respuesta Firebase:', response.status, response.statusText);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Usuario obtenido via Firebase:', data.data);
                    return data.data;
                } else {
                    const errorText = await response.text();
                    console.log('Error Firebase:', errorText);
                }
            } catch (firebaseError) {
                console.log('Error en petición Firebase:', firebaseError);
            }
        }
        
        // TERCERO: Intentar obtener token JWT local
        const jwtToken = sessionStorage.getItem('access_token');
        if (jwtToken) {
            console.log('Intentando con token JWT...');
            try {
                const response = await fetch(`${getApiBase()}/public/index.php?route=auth&caso=1&action=me`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                console.log('Respuesta JWT:', response.status, response.statusText);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Usuario obtenido via JWT:', data.data.user);
                    return data.data.user;
                } else {
                    const errorText = await response.text();
                    console.log('Error JWT:', errorText);
                }
            } catch (jwtError) {
                console.log('Error en petición JWT:', jwtError);
            }
        }
        
        console.log('No se pudo obtener usuario de ninguna fuente');
        return null;
    } catch (error) {
        console.error('Error obteniendo usuario actual en inventario:', error);
        return null;
    }
}

// Función para verificar autenticación antes de inicializar
async function checkAuthAndInit() {
    try {
        console.log('INVENTARIO: Verificando autenticación...');
        
        // Verificar tokens disponibles
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        const jwtToken = sessionStorage.getItem('access_token');
        const storedUser = sessionStorage.getItem('user');
        
        console.log('Firebase token:', firebaseToken ? 'Presente' : 'No presente');
        console.log('JWT token:', jwtToken ? 'Presente' : 'No presente');
        console.log('Usuario almacenado:', storedUser ? 'Presente' : 'No presente');
        
        // Verificar si el usuario está autenticado
        const user = await getCurrentUser();
        console.log('Usuario obtenido en inventario:', user);
        
        if (!user) {
            console.log('No se pudo obtener usuario, redirigiendo al login');
            // Limpiar sessionStorage antes de redirigir
            sessionStorage.removeItem('firebase_id_token');
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user');
            window.location.href = 'login';
            return;
        }
        
        console.log('Usuario autenticado:', user.nombre_usuario, 'Rol:', user.id_rol);
        
        // Verificar que el usuario tiene los campos necesarios
        if (!user.id_usuario || !user.nombre_usuario) {
            console.log('Usuario incompleto, redirigiendo al login');
            sessionStorage.removeItem('firebase_id_token');
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user');
            window.location.href = 'login';
            return;
        }
        
        // Si el usuario está autenticado, inicializar la página
        console.log('Usuario autenticado correctamente, inicializando inventario');
        logAuthState('DOMContentLoaded');
        initInventarioPage();
        
    } catch (error) {
        console.error('Error verificando autenticación en inventario:', error);
        sessionStorage.removeItem('firebase_id_token');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user');
        window.location.href = 'login';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación antes de inicializar
    checkAuthAndInit();
});

// Variables globales para paginación y filtros
let allProductos = [];
let filteredProductos = [];
let currentPage = 1;
const itemsPerPage = 10;

function initInventarioPage() {
    // Segundo log al iniciar la página de inventario (por si hay race con sessionStorage)
    logAuthState('initInventarioPage');
    // Configurar botones de acción
    setupActionButtons();

    // Configurar filtros
    setupFilters();

    // Configurar búsqueda
    setupSearch();

    // Configurar modal
    setupModal();

    // Configurar paginación
    setupPagination();

    // Cargar datos para formularios
    loadFormData();

    // Cargar productos en la tabla
    loadProductos();

    // Cargar estadísticas reales
    loadEstadisticas();

    console.log('Página de inventario inicializada');
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
    if (icon.classList.contains('fa-trash')) return 'delete';
    return null;
}

function handleAction(action, button) {
    const id = button.getAttribute('data-id');
    const row = button.closest('tr');
    const codigo = row.querySelector('td:first-child').textContent;
    const producto = row.querySelector('td:nth-child(2)').textContent;
    
    switch(action) {
        case 'view':
            viewProducto(id, codigo, producto);
            break;
        case 'edit':
            editProducto(id, codigo, producto);
            break;
        case 'delete':
            deleteProducto(id, codigo, producto, row);
            break;
    }
}

async function viewProducto(id, codigo, producto) {
    console.log(` Ver producto ID: ${id}`);
    try {
        const response = await fetch(`/Color_Ink/public/index.php?route=inve&caso=1&action=producto&id=${id}`);
        const data = await response.json();

        if (data.status === 'OK') {
            showProductoDetalles(data.data);
        } else {
            showNotification(' Error al cargar producto: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error cargando producto:', error);
        showNotification(' Error de conexión', 'error');
    }
}

async function editProducto(id, codigo, producto) {
    console.log(` Editar producto ID: ${id}`);
    try {
        const response = await fetch(`/Color_Ink/public/index.php?route=inve&caso=1&action=producto&id=${id}`);
        const data = await response.json();

        if (data.status === 'OK') {
            openEditarProductoModal(data.data);
        } else {
            showNotification(' Error al cargar producto: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error cargando producto:', error);
        showNotification(' Error de conexión', 'error');
    }
}

async function deleteProducto(id, codigo, producto, row) {
    const result = await Swal.fire({
        title: '¿Eliminar Producto?',
        html: `¿Estás seguro de que quieres eliminar el producto "${producto}" (${codigo})?<br><br><span style="color: #999; font-size: 14px; font-weight: 500;">Esta acción no se puede deshacer</span>`,
        icon: 'warning',
        iconColor: '#dc3545',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ff4444',
        cancelButtonColor: '#f5f5f5',
        buttonsStyling: false,
        reverseButtons: true,
        customClass: {
            popup: 'swal-delete-popup',
            title: 'swal-delete-title',
            htmlContainer: 'swal-delete-content',
            confirmButton: 'swal-delete-confirm',
            cancelButton: 'swal-delete-cancel',
            icon: 'swal-delete-icon'
        },
        background: '#1a1a1a',
        color: '#ffffff',
        focusCancel: true
    });
    
    if (result.isConfirmed) {
        try {
            const authHeader = getAuthHeader();
            console.log('Eliminar producto - Auth header:', authHeader);
            
            const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader,
                },
                body: JSON.stringify({ id_producto: id })
            });

            const deleteResult = await response.json();
            console.log('Eliminar producto - Respuesta:', deleteResult);

            if (deleteResult.status === 'OK') {
                showNotification(' Producto eliminado exitosamente', 'success');
                // Recargar productos para actualizar la lista
                await loadProductos();
                // Aplicar filtros actuales después de recargar
                applyFilters();
                loadEstadisticas(); // Actualizar estadísticas
            } else {
                showNotification(' Error al eliminar producto: ' + deleteResult.message, 'error');
            }
        } catch (error) {
            console.error('Error eliminando producto:', error);
            showNotification(' Error de conexión', 'error');
        }
    }
}

function setupFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            applyFilters();
        });
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFilters();
        });
    }
}

// Función unificada para aplicar todos los filtros
function applyFilters() {
    const searchInput = document.querySelector('.search-input');
    const categoriaFilter = document.getElementById('filter-categoria');
    const estadoFilter = document.querySelector('.filter-select:last-of-type');
    
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const categoriaValue = (categoriaFilter?.value || '').toLowerCase();
    const estadoValue = (estadoFilter?.value || '').toLowerCase();
    
    // Filtrar productos
    filteredProductos = allProductos.filter(producto => {
        // Filtro de búsqueda
        const searchMatch = !searchTerm || 
            (producto.sku || '').toLowerCase().includes(searchTerm) ||
            (producto.nombre_producto || '').toLowerCase().includes(searchTerm) ||
            (producto.categoria || '').toLowerCase().includes(searchTerm);
        
        // Filtro de categoría
        const categoriaMatch = !categoriaValue || 
            (producto.categoria || '').toLowerCase() === categoriaValue;
        
        // Filtro de estado
        let estadoMatch = true;
        if (estadoValue) {
            const stock = producto.stock || 0;
            const stockMinimo = producto.stock_minimo || 0;
            
            if (estadoValue === 'disponible') {
                estadoMatch = stock > stockMinimo;
            } else if (estadoValue === 'bajo-stock') {
                estadoMatch = stock > 0 && stock <= stockMinimo;
            } else if (estadoValue === 'agotado') {
                estadoMatch = stock <= 0;
            }
        }
        
        return searchMatch && categoriaMatch && estadoMatch;
    });
    
    // Resetear a la primera página cuando se aplican filtros
    currentPage = 1;
    
    // Renderizar productos filtrados
    renderProductos(filteredProductos);
    
    // Actualizar paginación
    updatePagination();
}

function updateStats() {
    const rows = document.querySelectorAll('.inventario-table tbody tr');
    let totalProductos = 0;
    let stockBajo = 0;
    let valorTotal = 0;
    
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            totalProductos++;
            
            const stock = parseInt(row.querySelector('td:nth-child(4)').textContent);
            const precio = parseFloat(row.querySelector('td:nth-child(5)').textContent.replace('L.', '').replace(/[^\d.]/g, '').trim());
            const estado = row.querySelector('.status').textContent.toLowerCase();
            
            if (estado.includes('bajo') || stock < 5) {
                stockBajo++;
            }
            
            valorTotal += stock * precio;
        }
    });
    
    // Actualizar las estadísticas en la interfaz
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers[0]) statNumbers[0].textContent = totalProductos;
    if (statNumbers[1]) statNumbers[1].textContent = stockBajo;
    if (statNumbers[2]) statNumbers[2].textContent = `L. ${valorTotal.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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


// Función para actualizar estadísticas en tiempo real
function refreshStats() {
    updateStats();
}

// =====================================================
// FUNCIONES PARA MODAL
// =====================================================

function setupModal() {
    // Configurar botón de nuevo producto
    const nuevoProductoBtn = document.querySelector('.btn-nuevo-producto');
    if (nuevoProductoBtn) {
        console.log(' Botón nuevo producto encontrado, configurando evento');
        nuevoProductoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(' Click en botón nuevo producto');
            openNuevoProductoModal();
        });
    } else {
        console.error(' No se encontró el botón nuevo producto');
        // Intentar encontrar el botón de otra manera
        const allButtons = document.querySelectorAll('button');
        console.log(' Todos los botones encontrados:', allButtons.length);
        allButtons.forEach((btn, index) => {
            console.log(`Botón ${index}:`, btn.textContent, btn.className);
        });
    }
    
    // Configurar botones de cerrar después de un pequeño delay para asegurar que los elementos estén disponibles
    setTimeout(() => {
        setupCloseButtons();
        setupModalClickOutside();
        setupNuevoProveedorButton();
    }, 100);
    
    // Configurar formulario de nuevo producto
    const formNuevoProducto = document.getElementById('formNuevoProducto');
    if (formNuevoProducto) {
        formNuevoProducto.addEventListener('submit', handleNuevoProducto);
    }
    
    // Configurar formulario de nuevo proveedor
    const formNuevoProveedor = document.getElementById('formNuevoProveedor');
    if (formNuevoProveedor) {
        formNuevoProveedor.addEventListener('submit', handleNuevoProveedor);
    }
    
    // Configurar formulario de editar proveedor
    const formEditarProveedor = document.getElementById('formEditarProveedor');
    if (formEditarProveedor) {
        formEditarProveedor.addEventListener('submit', handleEditarProveedor);
    }

    // Configurar formulario de edición
    setupEditarProducto();
    
    // Configurar listener de categoría para generar SKU (se configura una vez al inicio)
    setupCategoriaSkuListener();
}

// Función para manejar el cambio de categoría en el modal de editar
async function handleCategoriaChangeEdit(e) {
    const idCategoria = e.target.value;
    const selectElement = e.target;
    const categoriaTexto = selectElement.options[selectElement.selectedIndex]?.text || 'N/A';
    
    console.log(' Categoría cambiada en editar (delegación de eventos):');
    console.log('   - ID:', idCategoria);
    console.log('   - Texto:', categoriaTexto);
    console.log('   - Elemento completo:', selectElement);
    
    if (idCategoria && idCategoria !== '') {
        await generarSkuPorCategoria(idCategoria, 'edit_sku');
    } else {
        // Si no hay categoría seleccionada, limpiar SKU
        const skuInput = document.getElementById('edit_sku');
        if (skuInput) {
            skuInput.value = '';
        }
    }
}

// Función para configurar el listener de categoría que genera SKU automáticamente
function setupCategoriaSkuListener() {
    // Usar delegación de eventos para que funcione incluso si el select se recrea
    document.addEventListener('change', async function(e) {
        if (e.target && e.target.id === 'id_categoria') {
            const idCategoria = e.target.value;
            const selectElement = e.target;
            const categoriaTexto = selectElement.options[selectElement.selectedIndex]?.text || 'N/A';
            
            console.log('  Categoría seleccionada (delegación de eventos):');
            console.log('   - ID:', idCategoria);
            console.log('   - Texto:', categoriaTexto);
            console.log('   - Elemento completo:', selectElement);
            
            if (idCategoria && idCategoria !== '') {
                await generarSkuPorCategoria(idCategoria, 'sku');
            } else {
                // Si no hay categoría seleccionada, limpiar SKU
                const skuInput = document.getElementById('sku');
                if (skuInput) {
                    skuInput.value = '';
                }
            }
        }
    });
    console.log(' Listener de categoría configurado (delegación de eventos)');
}

async function openNuevoProductoModal() {
    console.log(' Abriendo modal nuevo producto');
    const modal = document.getElementById('modalNuevoProducto');
    if (modal) {
        console.log(' Modal encontrado, configurando...');
        
        // Limpiar formulario
        const form = document.getElementById('formNuevoProducto');
        if (form) {
            form.reset();
            console.log('🧹 Formulario limpiado');
            
            // Establecer fecha actual
            const fechaInput = document.getElementById('fecha_registro');
            if (fechaInput) {
                const now = new Date();
                const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                fechaInput.value = localDateTime;
                console.log(' Fecha establecida:', localDateTime);
            }
            
            // Limpiar SKU al abrir el modal (se generará automáticamente cuando se seleccione una categoría)
            const skuInput = document.getElementById('sku');
            if (skuInput) {
                skuInput.value = '';
            }
        }
        
        // Mostrar modal - usar solo la clase show para evitar conflictos
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        console.log(' Modal mostrado con clase show');
        
        // Reconfigurar botones de cerrar para este modal específico
        setupCloseButtons();
        
        // Cargar datos del formulario si no están cargados
        loadFormData();
    } else {
        console.error(' No se encontró el modal modalNuevoProducto');
    }
}

// Función para generar SKU automáticamente basado en la categoría
async function generarSkuPorCategoria(idCategoria, skuInputId = 'sku') {
    const skuInput = document.getElementById(skuInputId);
    
    if (!skuInput || !idCategoria) {
        console.error(' Error: skuInput o idCategoria no válidos', { skuInput: !!skuInput, idCategoria });
        return;
    }
    
    try {
        console.log(' Generando SKU para categoría ID:', idCategoria, 'en input:', skuInputId);
        const url = `/Color_Ink/public/index.php?route=inve&caso=1&action=siguiente-sku&id_categoria=${idCategoria}`;
        console.log(' URL de petición:', url);
        
        const response = await fetch(url);
        console.log(' Respuesta recibida, status:', response.status);
        
        const data = await response.json();
        console.log(' Datos recibidos:', data);
        
        if (data.status === 'OK' && data.data && data.data.sku_completo) {
            skuInput.value = data.data.sku_completo;
            console.log(' SKU generado automáticamente por categoría:', data.data.sku_completo);
        } else {
            console.error('  Error generando SKU:', data.message || 'Datos incompletos');
            console.error(' Datos recibidos:', data);
            skuInput.value = '';
        }
    } catch (error) {
        console.error(' Error obteniendo SKU por categoría:', error);
        console.error(' Stack trace:', error.stack);
        skuInput.value = '';
    }
}

// Función para generar SKU automáticamente basado en el nombre del producto (mantenida por compatibilidad)
function generarSKU() {
    const nombreInput = document.getElementById('nombre_producto');
    const skuInput = document.getElementById('sku');
    
    if (!nombreInput || !skuInput) return;
    
    // Si ya hay un SKU generado por categoría, no sobrescribirlo
    if (skuInput.value && skuInput.value.includes('-')) {
        return;
    }
    
    const nombre = nombreInput.value.trim();
    const siguienteId = window.siguienteIdProducto || 1;
    
    if (nombre.length === 0) {
        // Si el nombre está vacío, usar prefijo genérico
        skuInput.value = `PROD-${siguienteId}`;
        return;
    }
    
    // Obtener solo las letras del nombre (sin espacios, números ni caracteres especiales)
    const letras = nombre.replace(/[^a-zA-Z]/g, '');
    
    if (letras.length >= 4) {
        // Si hay al menos 4 letras, usar las primeras 4 en mayúsculas
        const prefijo = letras.substring(0, 4).toUpperCase();
        const nuevoSKU = `${prefijo}-${siguienteId}`;
        skuInput.value = nuevoSKU;
        console.log(' SKU generado automáticamente:', nuevoSKU);
    } else if (letras.length > 0) {
        // Si hay menos de 4 letras pero hay algunas, usar las que haya y completar con X
        const prefijo = (letras.toUpperCase() + 'XXXX').substring(0, 4);
        const nuevoSKU = `${prefijo}-${siguienteId}`;
        skuInput.value = nuevoSKU;
        console.log(' SKU generado automáticamente (con relleno):', nuevoSKU);
    } else {
        // Si no hay letras (solo números o caracteres especiales), usar prefijo genérico
        skuInput.value = `PROD-${siguienteId}`;
        console.log(' SKU generado automáticamente (sin letras, usando prefijo genérico):', skuInput.value);
    }
}

function setupCloseButtons() {
    console.log('🔧 Configurando botones de cerrar modal');
    
    // Configurar botones de cerrar existentes
    const closeButtons = document.querySelectorAll('.close');
    console.log(` Encontrados ${closeButtons.length} botones de cerrar`);
    
    closeButtons.forEach((button, index) => {
        console.log(` Configurando botón de cerrar ${index + 1}`);
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(' Botón de cerrar clickeado');
            closeModal();
        });
    });
    
    // Configurar botones de cancelar
    const cancelButtons = document.querySelectorAll('.btn-cancelar');
    console.log(` Encontrados ${cancelButtons.length} botones de cancelar`);
    
    cancelButtons.forEach((button, index) => {
        console.log(` Configurando botón de cancelar ${index + 1}`);
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(' Botón de cancelar clickeado');
            closeModal();
        });
    });
}

function setupModalClickOutside() {
    console.log(' Configurando clic fuera del modal');
    
    const modals = document.querySelectorAll('.modal');
    console.log(` Encontrados ${modals.length} modales`);
    
    modals.forEach((modal, index) => {
        console.log(` Configurando modal ${index + 1}`);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                console.log(' Clic fuera del modal detectado');
                closeModal();
            }
        });
    });
}

function closeModal() {
    console.log(' Cerrando modal');
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('show');
    });
    document.body.style.overflow = 'auto'; // Restaurar scroll del body
    console.log(' Modal cerrado');
}

// Configurar tecla Escape para cerrar modales
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        console.log(' Tecla Escape presionada');
        closeModal();
    }
});

async function loadFormData() {
    console.log(' Cargando datos de formulario...');
    try {
        // Cargar categorías y proveedores en paralelo
        await Promise.all([
            loadCategorias(),
            loadProveedores()
        ]);
        console.log(' Datos de formulario cargados exitosamente');
    } catch (error) {
        console.error(' Error cargando datos de formulario:', error);
    }
}

async function loadCategorias() {
    try {
        console.log(' Cargando categorías...');
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=categorias');
        const data = await response.json();
        
        if (data.status === 'OK') {
            // Cargar en el filtro de categorías
            const filterCategoria = document.getElementById('filter-categoria');
            if (filterCategoria) {
                // Mantener la opción "Todas las categorías"
                const todasLasCategoriasOption = filterCategoria.querySelector('option[value=""]');
                filterCategoria.innerHTML = '';
                if (todasLasCategoriasOption) {
                    filterCategoria.appendChild(todasLasCategoriasOption);
                } else {
                    filterCategoria.innerHTML = '<option value="">Todas las categorías</option>';
                }
                
                // Agregar categorías desde la base de datos
                data.data.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.descripcion.toLowerCase(); // Usar descripción para el filtro
                    option.textContent = categoria.descripcion;
                    filterCategoria.appendChild(option);
                });
                console.log(' Categorías cargadas en filtro:', filterCategoria.children.length);
            } else {
                console.error(' No se encontró el select filter-categoria');
            }
            
            // Cargar en el select de nuevo producto
            const selectCategoria = document.getElementById('id_categoria');
            if (selectCategoria) {
                selectCategoria.innerHTML = '<option value="">Seleccionar categoría</option>';
                data.data.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.id_categoria;
                    option.textContent = categoria.descripcion;
                    selectCategoria.appendChild(option);
                });
            }
            
            // Cargar en el select de editar producto
            const selectCategoriaEdit = document.getElementById('edit_id_categoria');
            console.log(' Select categoría editar encontrado:', selectCategoriaEdit);
            if (selectCategoriaEdit) {
                selectCategoriaEdit.innerHTML = '<option value="">Seleccionar categoría</option>';
                data.data.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.id_categoria;
                    option.textContent = categoria.descripcion;
                    selectCategoriaEdit.appendChild(option);
                });
                console.log('Categorías cargadas en select de editar:', selectCategoriaEdit.children.length);
            } else {
                console.error(' No se encontró el select edit_id_categoria');
            }
            
            console.log(' Categorías cargadas en filtro y formularios');
            return data.data; // Retornar los datos para uso posterior
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
        throw error;
    }
}

async function loadProveedores() {
    try {
        console.log(' Cargando proveedores...');
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=proveedores');
        const data = await response.json();
        
        if (data.status === 'OK') {
            // Cargar en el select de nuevo producto
            const selectProveedor = document.getElementById('id_proveedor');
            if (selectProveedor) {
                selectProveedor.innerHTML = '<option value="">Seleccionar proveedor</option>';
                data.data.forEach(proveedor => {
                    const option = document.createElement('option');
                    option.value = proveedor.id_proveedor;
                    option.textContent = proveedor.descripcion_proveedor;
                    selectProveedor.appendChild(option);
                });
            }
            
            // Cargar en el select de editar producto
            const selectProveedorEdit = document.getElementById('edit_id_proveedor');
            console.log('Select proveedor editar encontrado:', selectProveedorEdit);
            if (selectProveedorEdit) {
                selectProveedorEdit.innerHTML = '<option value="">Seleccionar proveedor</option>';
                data.data.forEach(proveedor => {
                    const option = document.createElement('option');
                    option.value = proveedor.id_proveedor;
                    option.textContent = proveedor.descripcion_proveedor;
                    selectProveedorEdit.appendChild(option);
                });
                console.log('Proveedores cargados en select de editar:', selectProveedorEdit.children.length);
            } else {
                console.error(' No se encontró el select edit_id_proveedor');
            }
            
            console.log(' Proveedores cargados en ambos formularios');
            return data.data; // Retornar los datos para uso posterior
        }
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        throw error;
    }
}

async function handleNuevoProducto(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Convertir fecha al formato requerido
    if (data.fecha_registro) {
        const fecha = new Date(data.fecha_registro);
        data.fecha_registro = fecha.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    try {
        // Log rápido del estado de auth justo antes de enviar
        logAuthState('handleNuevoProducto submit');
        console.log('Enviando datos:', data);
        
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
            },
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        // Verificar si la respuesta es ok antes de parsear JSON
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            let errorMessage = 'Error del servidor';
            
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = errorText || `Error HTTP ${response.status}`;
            }
            
            showNotification(' Error al crear producto: ' + errorMessage, 'error');
            return;
        }
        
        const result = await response.json();
        console.log('Result:', result);
        
        if (result.status === 'OK') {
            showNotification(' ¡Producto creado exitosamente!', 'success');
            closeModal();
            // Recargar la tabla de productos y estadísticas
            await loadProductos();
            // Aplicar filtros actuales después de recargar
            applyFilters();
            loadEstadisticas();
        } else {
            const errorMsg = result.message || 'Error desconocido';
            const errors = result.errors ? result.errors.join(', ') : '';
            showNotification(' Error al crear producto: ' + errorMsg + (errors ? ' - ' + errors : ''), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(' Error de conexión: ' + error.message, 'error');
    }
}

// =====================================================
// FUNCIONES PARA CARGAR PRODUCTOS
// =====================================================

async function loadProductos() {
    console.log(' Cargando productos...');
    try {
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=productos');
        const data = await response.json();
        
        console.log(' Respuesta de la API:', data);

        if (data.status === 'OK') {
            console.log('Productos obtenidos:', data.data.length);
            // Guardar todos los productos
            allProductos = data.data;
            // Inicialmente, todos los productos están filtrados
            filteredProductos = [...allProductos];
            // Renderizar productos
            renderProductos(filteredProductos);
            // Actualizar paginación
            updatePagination();
            // Verificar productos con bajo stock y mostrar alertas
            checkBajoStock();
        } else {
            console.error(' Error cargando productos:', data.message);
            showNotification(' Error cargando productos: ' + data.message, 'error');
        }
    } catch (error) {
        console.error(' Error cargando productos:', error);
        showNotification(' Error de conexión al cargar productos', 'error');
    }
}

// Variable global para controlar la posición de las notificaciones
let notificationOffset = 0;

// Función para verificar productos con bajo stock y agotados
function checkBajoStock() {
    const productosBajoStock = allProductos.filter(producto => {
        const stock = parseFloat(producto.stock) || 0;
        const stockMinimo = parseFloat(producto.stock_minimo) || 0;
        return stock > 0 && stock <= stockMinimo;
    });
    
    const productosAgotados = allProductos.filter(producto => {
        const stock = parseFloat(producto.stock) || 0;
        return stock <= 0;
    });
    
    // Resetear offset de notificaciones
    notificationOffset = 0;
    
    // Mostrar notificaciones en cascada
    let delay = 0;
    
    if (productosAgotados.length > 0) {
        setTimeout(() => {
            showStockNotification(productosAgotados, 'agotado');
        }, delay);
        delay += 150;
    }
    
    if (productosBajoStock.length > 0) {
        setTimeout(() => {
            showStockNotification(productosBajoStock, 'bajo');
        }, delay);
    }
}

// Función para mostrar notificaciones de stock
function showStockNotification(productos, tipo) {
    const notification = document.createElement('div');
    notification.className = `${tipo}-stock-notification`;
    
    let content = '';
    let borderColor = '';
    let titleColor = '';
    let title = '';
    
    if (tipo === 'agotado') {
        borderColor = '#dc3545';
        titleColor = '#dc3545';
        title = 'Producto Agotado';
    } else {
        borderColor = '#ffc107';
        titleColor = '#ffc107';
        title = 'Stock Bajo';
    }
    
    if (productos.length === 1) {
        const producto = productos[0];
        const stock = parseFloat(producto.stock) || 0;
        const stockMinimo = parseFloat(producto.stock_minimo) || 0;
        content = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-text">${producto.nombre_producto} (${producto.sku})</div>
                <div class="notification-details">${tipo === 'agotado' ? 'Sin stock disponible' : `Stock: ${stock} / Mínimo: ${stockMinimo}`}</div>
            </div>
        `;
    } else {
        content = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-text">${productos.length} productos ${tipo === 'agotado' ? 'agotados' : 'con stock bajo'}</div>
                <div class="notification-details">Revisar inventario</div>
            </div>
        `;
    }
    
    notification.innerHTML = content;
    
    // Calcular posición vertical
    const topPosition = 20 + notificationOffset;
    notificationOffset += 100; // Incrementar para la siguiente notificación
    
    // Estilos de la notificación
    notification.style.cssText = `
        position: fixed;
        top: ${topPosition}px;
        right: 20px;
        background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
        color: #ffffff;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 350px;
        min-width: 280px;
        border-left: 4px solid ${borderColor};
        backdrop-filter: blur(10px);
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
    `;
    
    // Estilos para el contenido
    const style = document.createElement('style');
    style.textContent = `
        .${tipo}-stock-notification .notification-content {
            flex: 1;
        }
        .${tipo}-stock-notification .notification-title {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
            color: ${titleColor};
        }
        .${tipo}-stock-notification .notification-text {
            font-size: 14px;
            margin-bottom: 2px;
            color: rgba(255, 255, 255, 0.9);
        }
        .${tipo}-stock-notification .notification-details {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.6);
        }
    `;
    document.head.appendChild(style);
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover automáticamente después de 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 300);
    }, 5000);
}

function renderProductos(productos) {
    console.log('Renderizando productos:', productos);
    
    const tbody = document.querySelector('.inventario-table tbody');
    console.log(' Tbody encontrado:', tbody);
    
    if (!tbody) {
        console.error(' No se encontró el tbody de la tabla de inventario');
        return;
    }

    // Limpiar tabla
    tbody.innerHTML = '';
    console.log('🧹 Tabla limpiada');

    if (productos.length === 0) {
        console.log(' No hay productos, mostrando mensaje vacío');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div style="padding: 40px; color: rgba(255, 255, 255, 0.6);">
                        <i class="fas fa-box-open" style="font-size: 3em; margin-bottom: 10px; opacity: 0.5;"></i>
                        <p>No hay productos registrados</p>
                        <p style="font-size: 0.9em; opacity: 0.7;">Haz clic en "Nuevo Producto" para agregar el primero</p>
                    </div>
                </td>
            </tr>
        `;
        // Ocultar paginación si no hay productos
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        return;
    }

    // Calcular productos para la página actual
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productosPagina = productos.slice(startIndex, endIndex);

    console.log(` Procesando ${productosPagina.length} productos de la página ${currentPage} (total: ${productos.length})`);
    
    productosPagina.forEach((producto, index) => {
        console.log(` Producto ${index + 1}:`, producto);
        
        const row = document.createElement('tr');
        
        // Determinar el estado del stock
        let estadoStock = 'disponible';
        let textoEstado = 'Disponible';
        
        if (producto.stock <= 0) {
            estadoStock = 'agotado';
            textoEstado = 'Agotado';
        } else if (producto.stock <= producto.stock_minimo) {
            estadoStock = 'bajo-stock';
            textoEstado = 'Bajo Stock';
        }
        
        row.innerHTML = `
            <td>${producto.sku || 'N/A'}</td>
            <td>${producto.nombre_producto || 'N/A'}</td>
            <td>${producto.categoria || 'Sin categoría'}</td>
            <td>${producto.stock || 0}</td>
            <td>L. ${parseFloat(producto.precio_venta_base || 0).toFixed(2)}</td>
            <td><span class="status ${estadoStock}">${textoEstado}</span></td>
            <td>
                <button class="btn-action btn-ver" data-id="${producto.id_producto}" title="Ver detalles">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn-action btn-editar" data-id="${producto.id_producto}" title="Editar">
                    <i class="fa-solid fa-edit"></i>
                </button>
                <button class="btn-action btn-eliminar" data-id="${producto.id_producto}" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    console.log(` Productos renderizados: ${productosPagina.length}`);
    
    // Configurar event listeners para los botones de acción
    setupActionButtons();
}

// =====================================================
// FUNCIONES PARA ESTADÍSTICAS
// =====================================================

async function loadEstadisticas() {
    console.log(' Cargando estadísticas...');
    try {
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=estadisticas');
        const data = await response.json();
        
        console.log(' Respuesta de estadísticas:', data);

        if (data.status === 'OK') {
            updateEstadisticas(data.data);
        } else {
            console.error(' Error cargando estadísticas:', data.message);
        }
    } catch (error) {
        console.error(' Error cargando estadísticas:', error);
    }
}

function updateEstadisticas(estadisticas) {
    console.log('Actualizando estadísticas:', estadisticas);
    
    // Actualizar total de productos
    const totalProductos = document.getElementById('total-productos');
    if (totalProductos) {
        totalProductos.textContent = estadisticas.total_productos || 0;
    }

    // Actualizar stock bajo
    const stockBajo = document.getElementById('stock-bajo');
    if (stockBajo) {
        stockBajo.textContent = estadisticas.stock_bajo || 0;
    }

    // Actualizar valor total
    const valorTotal = document.getElementById('valor-total');
    if (valorTotal) {
        const valor = parseFloat(estadisticas.valor_total || 0);
        console.log('💰 Valor total calculado:', valor);
        // Formato más claro para Honduras
        valorTotal.textContent = `L. ${valor.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        console.log('💰 Valor total formateado:', valorTotal.textContent);
    }

    console.log(' Estadísticas actualizadas');
}

// =====================================================
// FUNCIONES PARA MODALES DE PRODUCTOS
// =====================================================

// Función para calcular el estado del stock
function calcularEstadoStock(stock, stockMinimo) {
    const stockNum = parseFloat(stock) || 0;
    const stockMinimoNum = parseFloat(stockMinimo) || 0;
    
    if (stockNum <= 0) {
        return { estado: 'agotado', texto: 'Agotado' };
    } else if (stockNum <= stockMinimoNum) {
        return { estado: 'bajo-stock', texto: 'Bajo Stock' };
    } else {
        return { estado: 'disponible', texto: 'Disponible' };
    }
}

function showProductoDetalles(producto) {
    const modal = document.getElementById('modalVerProducto');
    const detalles = document.getElementById('producto-detalles');
    const productoIdDisplay = document.getElementById('productoIdDisplay');
    
    if (modal && detalles) {
        // Calcular estado del stock
        const estadoStock = calcularEstadoStock(producto.stock, producto.stock_minimo);
        
        // Mostrar ID del producto en el header
        if (productoIdDisplay) {
            productoIdDisplay.textContent = `ID: ${producto.id_producto} | SKU: ${producto.sku}`;
        }
        detalles.innerHTML = `
            <div class="producto-detalle">
                <div class="detalle-row">
                    <div class="detalle-item">
                        <label>SKU:</label>
                        <span>${producto.sku || 'N/A'}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Nombre:</label>
                        <span>${producto.nombre_producto || 'N/A'}</span>
                    </div>
                </div>
                <div class="detalle-row">
                    <div class="detalle-item">
                        <label>Categoría:</label>
                        <span>${producto.categoria || 'Sin categoría'}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Proveedor:</label>
                        <span>${producto.proveedor || 'Sin proveedor'}</span>
                    </div>
                </div>
                <div class="detalle-row">
                    <div class="detalle-item">
                        <label>Stock Actual:</label>
                        <span class="stock-value">${producto.stock || 0}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Stock Mínimo:</label>
                        <span>${producto.stock_minimo || 0}</span>
                    </div>
                </div>
                <div class="detalle-row">
                    <div class="detalle-item">
                        <label>Costo Unitario:</label>
                        <span>L. ${parseFloat(producto.costo_unitario || 0).toFixed(2)}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Precio de Venta:</label>
                        <span>L. ${parseFloat(producto.precio_venta_base || 0).toFixed(2)}</span>
                    </div>
                </div>
                <div class="detalle-row">
                    <div class="detalle-item">
                        <label>Estado de Stock:</label>
                        <span class="status ${estadoStock.estado}">${estadoStock.texto}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Fecha de Registro:</label>
                        <span>${new Date(producto.fecha_registro).toLocaleString()}</span>
                    </div>
                </div>
                ${producto.descripcion ? `
                <div class="detalle-row">
                    <div class="detalle-item" style="width: 100%;">
                        <label>Descripción:</label>
                        <span style="display: block; margin-top: 5px; white-space: pre-wrap;">${producto.descripcion}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        modal.classList.add('show');
    }
}

function openEditarProductoModal(producto) {
    console.log('Abriendo modal de editar producto:', producto);
    const modal = document.getElementById('modalEditarProducto');
    const editarProductoIdDisplay = document.getElementById('editarProductoIdDisplay');
    
    if (modal) {
        // Mostrar ID del producto en el header
        if (editarProductoIdDisplay) {
            editarProductoIdDisplay.textContent = `ID: ${producto.id_producto} | SKU: ${producto.sku}`;
        }
        
        
        // Mostrar modal
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Reconfigurar botones de cerrar
        setupCloseButtons();
        
        console.log(' Modal de editar mostrado');
        
        // Esperar a que el modal esté completamente visible antes de cargar datos
        setTimeout(() => {
            console.log(' Modal visible, cargando datos de formulario...');
            loadFormData().then(() => {
                console.log(' Datos de formulario cargados, llenando campos...');
                
                // Llenar campos de texto primero
                document.getElementById('edit_id_producto').value = producto.id_producto;
                document.getElementById('edit_sku').value = producto.sku || '';
                document.getElementById('edit_nombre_producto').value = producto.nombre_producto || '';
                document.getElementById('edit_stock').value = producto.stock || 0;
                document.getElementById('edit_stock_minimo').value = producto.stock_minimo || 0;
                document.getElementById('edit_costo_unitario').value = producto.costo_unitario || 0;
                document.getElementById('edit_precio_venta_base').value = producto.precio_venta_base || 0;
                
                // Calcular y mostrar estado de stock
                actualizarEstadoStockEdit();
                
                // Llenar descripción
                const editDescripcion = document.getElementById('edit_descripcion');
                if (editDescripcion) {
                    editDescripcion.value = producto.descripcion || '';
                    console.log(' Descripción cargada:', producto.descripcion || '(vacía)');
                }
                
                // Formatear fecha para el input datetime-local
                if (producto.fecha_registro) {
                    const fecha = new Date(producto.fecha_registro);
                    const localDateTime = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    document.getElementById('edit_fecha_registro').value = localDateTime;
                }
                
                // Establecer valores de selects usando requestAnimationFrame para asegurar que el DOM esté actualizado
                requestAnimationFrame(() => {
                    console.log('Estableciendo valores de selects...');
                    console.log('Categoría ID:', producto.id_categoria);
                    console.log('Proveedor ID:', producto.id_proveedor);
                    
                    // Establecer categoría
                    const selectCategoria = document.getElementById('edit_id_categoria');
                    if (selectCategoria && producto.id_categoria) {
                        selectCategoria.value = producto.id_categoria;
                        console.log(' Categoría establecida:', selectCategoria.value, 'Texto:', selectCategoria.options[selectCategoria.selectedIndex]?.text);
                        
                        // Agregar listener para actualizar SKU cuando cambie la categoría
                        selectCategoria.removeEventListener('change', handleCategoriaChangeEdit);
                        selectCategoria.addEventListener('change', handleCategoriaChangeEdit);
                    }
                    
                    // Establecer proveedor
                    const selectProveedor = document.getElementById('edit_id_proveedor');
                    if (selectProveedor && producto.id_proveedor) {
                        selectProveedor.value = producto.id_proveedor;
                        console.log(' Proveedor establecido:', selectProveedor.value, 'Texto:', selectProveedor.options[selectProveedor.selectedIndex]?.text);
                    }
                    
                    // Configurar listeners para actualizar el estado de stock cuando cambien stock o stock_minimo
                    const stockInput = document.getElementById('edit_stock');
                    const stockMinimoInput = document.getElementById('edit_stock_minimo');
                    
                    if (stockInput) {
                        // Remover listeners anteriores si existen
                        stockInput.removeEventListener('input', actualizarEstadoStockEdit);
                        stockInput.removeEventListener('change', actualizarEstadoStockEdit);
                        // Agregar nuevos listeners
                        stockInput.addEventListener('input', actualizarEstadoStockEdit);
                        stockInput.addEventListener('change', actualizarEstadoStockEdit);
                    }
                    
                    if (stockMinimoInput) {
                        // Remover listeners anteriores si existen
                        stockMinimoInput.removeEventListener('input', actualizarEstadoStockEdit);
                        stockMinimoInput.removeEventListener('change', actualizarEstadoStockEdit);
                        // Agregar nuevos listeners
                        stockMinimoInput.addEventListener('input', actualizarEstadoStockEdit);
                        stockMinimoInput.addEventListener('change', actualizarEstadoStockEdit);
                    }
                    
                    console.log(' Campos del formulario llenados completamente');
                });
            });
        }, 200);
    } else {
        console.error(' No se encontró el modal modalEditarProducto');
    }
}

// Función para actualizar el estado de stock en el modal de editar
function actualizarEstadoStockEdit() {
    const stockInput = document.getElementById('edit_stock');
    const stockMinimoInput = document.getElementById('edit_stock_minimo');
    const estadoStockInput = document.getElementById('edit_estado_stock');
    
    if (!stockInput || !stockMinimoInput || !estadoStockInput) {
        return;
    }
    
    const stock = parseFloat(stockInput.value) || 0;
    const stockMinimo = parseFloat(stockMinimoInput.value) || 0;
    const estadoStock = calcularEstadoStock(stock, stockMinimo);
    
    // Actualizar el input con el estado
    estadoStockInput.value = estadoStock.texto;
    
    // Aplicar clases CSS según el estado
    estadoStockInput.className = 'status ' + estadoStock.estado;
    estadoStockInput.style.cssText = `
        background-color: ${estadoStock.estado === 'disponible' ? 'rgba(40, 167, 69, 0.2)' : 
                           estadoStock.estado === 'bajo-stock' ? 'rgba(255, 193, 7, 0.2)' : 
                           'rgba(220, 53, 69, 0.2)'};
        color: ${estadoStock.estado === 'disponible' ? '#28a745' : 
                estadoStock.estado === 'bajo-stock' ? '#ffc107' : 
                '#dc3545'};
        border: none;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 0.9em;
        font-weight: bold;
        text-transform: uppercase;
        text-align: center;
        cursor: not-allowed;
        width: 100%;
    `;
}

// Configurar formulario de edición
function setupEditarProducto() {
    const formEditar = document.getElementById('formEditarProducto');
    if (formEditar) {
        formEditar.addEventListener('submit', handleEditarProducto);
    }
    
    // Agregar listeners para actualizar el estado de stock cuando cambien stock o stock_minimo
    const stockInput = document.getElementById('edit_stock');
    const stockMinimoInput = document.getElementById('edit_stock_minimo');
    
    if (stockInput) {
        stockInput.addEventListener('input', actualizarEstadoStockEdit);
        stockInput.addEventListener('change', actualizarEstadoStockEdit);
    }
    
    if (stockMinimoInput) {
        stockMinimoInput.addEventListener('input', actualizarEstadoStockEdit);
        stockMinimoInput.addEventListener('change', actualizarEstadoStockEdit);
    }
}

async function handleEditarProducto(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.status === 'OK') {
            showNotification(' ¡Producto actualizado exitosamente!', 'success');
            closeModal();
            // Recargar la tabla de productos y estadísticas
            await loadProductos();
            // Aplicar filtros actuales después de recargar
            applyFilters();
            loadEstadisticas();
        } else {
            showNotification(' Error al actualizar producto: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(' Error de conexión', 'error');
    }
}

// Función para exportar a Excel
async function exportarExcel() {
    try {
        showNotification(' Generando archivo Excel...', 'info');
        
        // Crear un enlace temporal para descargar
        const link = document.createElement('a');
        link.href = '/Color_Ink/public/index.php?route=inve&caso=1&action=exportar-excel';
        link.download = 'inventario_productos_' + new Date().toISOString().slice(0, 10) + '.xls';
        link.style.display = 'none';
        
        // Agregar al DOM, hacer clic y remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mostrar notificación después de un pequeño delay
        setTimeout(() => {
            showNotification(' Archivo Excel descargado exitosamente', 'success');
        }, 500);
        
    } catch (error) {
        console.error('Error exportando Excel:', error);
        showNotification(' Error al exportar Excel', 'error');
    }
}

// Configurar botón de exportar Excel
function setupExportarExcel() {
    const btnExportar = document.querySelector('.btn-exportar-excel');
    if (btnExportar) {
        btnExportar.addEventListener('click', function(e) {
            e.preventDefault();
            exportarExcel();
        });
        console.log(' Botón exportar Excel configurado');
    }
}

// Llamar a setupExportarExcel cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    setupExportarExcel();
});

// Actualizar estadísticas cada 30 segundos
setInterval(loadEstadisticas, 30000);

// =====================================================
// FUNCIONES PARA AGREGAR PROVEEDORES
// =====================================================

function setupNuevoProveedorButton() {
    const nuevoProveedorBtn = document.querySelector('.btn-nuevo-proveedor');
    if (nuevoProveedorBtn) {
        nuevoProveedorBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openNuevoProveedorModal();
        });
    }
    
    const verProveedoresBtn = document.querySelector('.btn-ver-proveedores');
    if (verProveedoresBtn) {
        verProveedoresBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openVerProveedoresModal();
        });
    }
    
    const nuevoProveedorModalBtn = document.querySelector('.btn-nuevo-proveedor-modal');
    if (nuevoProveedorModalBtn) {
        nuevoProveedorModalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openNuevoProveedorModal();
        });
    }
}

function openNuevoProveedorModal() {
    const modal = document.getElementById('modalNuevoProveedor');
    if (modal) {
        // Limpiar formulario
        const form = document.getElementById('formNuevoProveedor');
        if (form) {
            form.reset();
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        setupCloseButtons();
        loadProveedoresTable();
    }
}

async function handleNuevoProveedor(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = {
        descripcion_proveedor: formData.get('descripcion_proveedor'),
        forma_contacto: '',
        direccion: ''
    };
    
    try {
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=add-proveedor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', response.status, errorText);
            showNotification(' Error del servidor: ' + response.status, 'error');
            return;
        }

        const result = await response.json();

        if (result.status === 'OK') {
            showNotification(' Proveedor agregado exitosamente', 'success');
            form.reset();
            await loadProveedores();
            loadProveedoresTable();
        } else {
            showNotification(' Error al agregar proveedor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error agregando proveedor:', error);
        showNotification(' Error de conexión: ' + error.message, 'error');
    }
}

// =====================================================
// FUNCIONES PARA GESTIÓN DE PROVEEDORES
// =====================================================

function openVerProveedoresModal() {
    const modal = document.getElementById('modalVerProveedores');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        setupCloseButtons();
        loadProveedoresTable();
        setupProveedoresSearch();
    }
}

async function loadProveedoresTable() {
    try {
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=proveedores-completos');
        const data = await response.json();
        
        if (data.status === 'OK') {
            renderProveedoresTable(data.data);
        } else {
            showNotification(' Error cargando proveedores: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        showNotification(' Error de conexión', 'error');
    }
}

function renderProveedoresTable(proveedores) {
    const tbody = document.getElementById('proveedores-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (proveedores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" class="text-center">
                    <div style="padding: 40px; color: rgba(255, 255, 255, 0.6);">
                        <i class="fas fa-truck" style="font-size: 3em; margin-bottom: 10px; opacity: 0.5;"></i>
                        <p>No hay proveedores registrados</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    proveedores.forEach(proveedor => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${proveedor.descripcion_proveedor || 'N/A'}</td>
            <td>
                <button class="btn-action btn-eliminar" data-id="${proveedor.id_proveedor}" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    setupProveedoresActionButtons();
}

function setupProveedoresActionButtons() {
    const deleteButtons = document.querySelectorAll('#proveedores-tbody .btn-eliminar');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const row = this.closest('tr');
            const nombre = row.querySelector('td:nth-child(1)').textContent;
            deleteProveedor(id, nombre);
        });
    });
}

async function editProveedor(id) {
    try {
        const response = await fetch(`/Color_Ink/public/index.php?route=inve&caso=1&action=proveedor&id=${id}`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            openEditarProveedorModal(data.data);
        } else {
            showNotification(' Error al cargar proveedor: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error cargando proveedor:', error);
        showNotification(' Error de conexión', 'error');
    }
}

function openEditarProveedorModal(proveedor) {
    const modal = document.getElementById('modalEditarProveedor');
    const idDisplay = document.getElementById('editarProveedorIdDisplay');
    
    if (modal) {
        if (idDisplay) {
            idDisplay.textContent = `ID: ${proveedor.id_proveedor}`;
        }
        
        document.getElementById('edit_id_proveedor').value = proveedor.id_proveedor;
        document.getElementById('edit_descripcion_proveedor').value = proveedor.descripcion_proveedor || '';
        document.getElementById('edit_forma_contacto').value = proveedor.forma_contacto || '';
        document.getElementById('edit_direccion').value = proveedor.direccion || '';
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        setupCloseButtons();
    }
}

async function deleteProveedor(id, nombre) {
    const result = await Swal.fire({
        title: '¿Eliminar Proveedor?',
        html: `¿Estás seguro de que quieres eliminar el proveedor "${nombre}"?<br><br><span style="color: #999; font-size: 14px; font-weight: 500;">Esta acción no se puede deshacer</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ff4444',
        background: '#1a1a1a',
        color: '#ffffff'
    });
    
    if (result.isConfirmed) {
        try {
            const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=delete-proveedor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader(),
                },
                body: JSON.stringify({ id_proveedor: id })
            });
            
            const result = await response.json();
            
            if (result.status === 'OK') {
                showNotification(' Proveedor eliminado exitosamente', 'success');
                loadProveedoresTable();
                await loadProveedores(); // Actualizar selects
            } else {
                showNotification(' Error al eliminar proveedor: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error eliminando proveedor:', error);
            showNotification(' Error de conexión', 'error');
        }
    }
}

function setupProveedoresSearch() {
    const searchInput = document.getElementById('search-proveedores');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#proveedores-tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

async function handleEditarProveedor(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = {
        id_proveedor: formData.get('id_proveedor'),
        descripcion_proveedor: formData.get('descripcion_proveedor'),
        forma_contacto: formData.get('forma_contacto') || '',
        direccion: formData.get('direccion') || ''
    };
    
    try {
        const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=update-proveedor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.status === 'OK') {
            showNotification(' Proveedor actualizado exitosamente', 'success');
            closeModal();
            loadProveedoresTable();
            await loadProveedores(); // Actualizar selects
        } else {
            showNotification(' Error al actualizar proveedor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error actualizando proveedor:', error);
        showNotification(' Error de conexión: ' + error.message, 'error');
    }
}

// =====================================================
// FUNCIONES PARA PAGINACIÓN
// =====================================================

function setupPagination() {
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderProductos(filteredProductos);
                updatePagination();
                // Scroll suave hacia arriba de la tabla
                document.querySelector('.inventario-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderProductos(filteredProductos);
                updatePagination();
                // Scroll suave hacia arriba de la tabla
                document.querySelector('.inventario-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
}

function updatePagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    
    if (!paginationContainer || !paginationInfo || !pageNumbers || !prevBtn || !nextBtn) {
        return;
    }
    
    const totalItems = filteredProductos.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Mostrar/ocultar paginación
    if (totalItems > 0) {
        paginationContainer.style.display = 'flex';
        
        // Actualizar información de paginación (formato como ventas)
        const inicio = (currentPage - 1) * itemsPerPage + 1;
        const fin = Math.min(currentPage * itemsPerPage, totalItems);
        paginationInfo.textContent = `Mostrando ${inicio}-${fin} de ${totalItems} productos`;
        
        // Botones anterior/siguiente
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
        
        // Números de página
        pageNumbers.innerHTML = '';
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                currentPage = i;
                renderProductos(filteredProductos);
                updatePagination();
                document.querySelector('.inventario-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            pageNumbers.appendChild(pageBtn);
        }
    } else {
        paginationContainer.style.display = 'none';
    }
}
