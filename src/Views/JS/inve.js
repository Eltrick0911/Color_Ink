/**
 * JavaScript para la página de inventario
 */

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
    console.group(`🔐 Estado de autenticación · ${context}`);
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

document.addEventListener('DOMContentLoaded', function() {
    // Log de autenticación al entrar a inventario
    logAuthState('DOMContentLoaded');
    // Inicializar funcionalidades de inventario
    initInventarioPage();
});

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
    if (confirm(`¿Estás seguro de que quieres eliminar el producto "${producto}" (${codigo})?`)) {
        try {
            const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader(),
                },
                body: JSON.stringify({ id_producto: id })
            });

            const result = await response.json();

            if (result.status === 'OK') {
                showNotification(' Producto eliminado exitosamente', 'success');
                row.style.opacity = '0.5';
                row.style.transition = 'opacity 0.3s ease';
                
                setTimeout(() => {
                    row.remove();
                    loadEstadisticas(); // Actualizar estadísticas
                }, 300);
            } else {
                showNotification(' Error al eliminar producto: ' + result.message, 'error');
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
            filterInventario();
        });
    });
}

function filterInventario() {
    const categoriaFilter = document.querySelector('.filter-select:first-of-type').value;
    const estadoFilter = document.querySelector('.filter-select:last-of-type').value;
    const rows = document.querySelectorAll('.inventario-table tbody tr');
    
    rows.forEach(row => {
        const categoria = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        const estado = row.querySelector('.status').textContent.toLowerCase();
        
        const categoriaMatch = categoriaFilter === '' || categoria.includes(categoriaFilter.toLowerCase());
        const estadoMatch = estadoFilter === '' || estado.includes(estadoFilter.toLowerCase().replace('-', ' '));
        
        if (categoriaMatch && estadoMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            searchProductos(searchTerm);
        });
    }
}

function searchProductos(searchTerm) {
    const rows = document.querySelectorAll('.inventario-table tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let found = false;
        
        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(searchTerm)) {
                found = true;
            }
        });
        
        if (found || searchTerm === '') {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
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
    }, 100);
    
    // Configurar formulario de nuevo producto
    const formNuevoProducto = document.getElementById('formNuevoProducto');
    if (formNuevoProducto) {
        formNuevoProducto.addEventListener('submit', handleNuevoProducto);
    }

    // Configurar formulario de edición
    setupEditarProducto();
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
            
            // Obtener último ID y configurar generación automática de SKU
            try {
                const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=ultimo-id');
                const data = await response.json();
                
                if (data.status === 'OK' && data.data) {
                    const siguienteId = data.data.siguiente_id || 1;
                    console.log(' Siguiente ID de producto:', siguienteId);
                    
                    // Guardar el siguiente ID en una variable global
                    window.siguienteIdProducto = siguienteId;
                    
                    // Auto-llenar SKU inicial con formato temporal (se actualizará cuando se escriba el nombre)
                    const skuInput = document.getElementById('sku');
                    if (skuInput) {
                        skuInput.value = `PROD-${siguienteId}`;
                        console.log(' SKU inicial generado:', skuInput.value);
                    }
                    
                    // Configurar listener para generar SKU automáticamente cuando se escriba el nombre
                    const nombreInput = document.getElementById('nombre_producto');
                    
                    if (nombreInput && skuInput) {
                        // Remover listener anterior si existe
                        nombreInput.removeEventListener('input', generarSKU);
                        
                        // Agregar nuevo listener
                        nombreInput.addEventListener('input', generarSKU);
                        
                        console.log(' Listener para generar SKU configurado');
                    }
                }
            } catch (error) {
                console.error(' Error obteniendo último ID:', error);
                window.siguienteIdProducto = 1; // Valor por defecto
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

// Función para generar SKU automáticamente basado en el nombre del producto
function generarSKU() {
    const nombreInput = document.getElementById('nombre_producto');
    const skuInput = document.getElementById('sku');
    
    if (!nombreInput || !skuInput) return;
    
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
            loadProductos();
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
            renderProductos(data.data);
        } else {
            console.error(' Error cargando productos:', data.message);
            showNotification(' Error cargando productos: ' + data.message, 'error');
        }
    } catch (error) {
        console.error(' Error cargando productos:', error);
        showNotification(' Error de conexión al cargar productos', 'error');
    }
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
                    <div style="padding: 40px; color: #666;">
                        <i class="fas fa-box-open" style="font-size: 3em; margin-bottom: 10px; opacity: 0.5;"></i>
                        <p>No hay productos registrados</p>
                        <p style="font-size: 0.9em; opacity: 0.7;">Haz clic en "Nuevo Producto" para agregar el primero</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    console.log(` Procesando ${productos.length} productos`);
    
    productos.forEach((producto, index) => {
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

    console.log(` Productos renderizados: ${productos.length}`);
    
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

function showProductoDetalles(producto) {
    const modal = document.getElementById('modalVerProducto');
    const detalles = document.getElementById('producto-detalles');
    const productoIdDisplay = document.getElementById('productoIdDisplay');
    
    if (modal && detalles) {
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
                        <label>Estado:</label>
                        <span class="status ${producto.activo == 1 ? 'activo' : 'inactivo'}">
                            ${producto.activo == 1 ? 'Activo' : 'Inactivo'}
                        </span>
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
                document.getElementById('edit_activo').value = producto.activo || 1;
                
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
                    }
                    
                    // Establecer proveedor
                    const selectProveedor = document.getElementById('edit_id_proveedor');
                    if (selectProveedor && producto.id_proveedor) {
                        selectProveedor.value = producto.id_proveedor;
                        console.log(' Proveedor establecido:', selectProveedor.value, 'Texto:', selectProveedor.options[selectProveedor.selectedIndex]?.text);
                    }
                    
                    console.log(' Campos del formulario llenados completamente');
                });
            });
        }, 200);
    } else {
        console.error(' No se encontró el modal modalEditarProducto');
    }
}

// Configurar formulario de edición
function setupEditarProducto() {
    const formEditar = document.getElementById('formEditarProducto');
    if (formEditar) {
        formEditar.addEventListener('submit', handleEditarProducto);
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
            loadProductos();
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
