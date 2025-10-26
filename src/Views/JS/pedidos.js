/**
 * JavaScript para la página de pedidos
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades de pedidos
    initPedidosPage();
    
    // Escuchar cuando se rendericen los pedidos para reconfigurar los selectores
    document.addEventListener('pedidos:rendered', function(e) {
        console.log('Pedidos renderizados, reconfigurando selectores...');
        setupStatusSelectors();
        setupActionButtons();
    });
});

function initPedidosPage() {
    // Configurar botones de acción
    setupActionButtons();
    
    // Configurar filtros
    setupFilters();
    
    // Configurar búsqueda
    setupSearch();
    
    // Configurar selectores de estado
    setupStatusSelectors();
    
    console.log('Página de pedidos inicializada');
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
    console.log('Icono detectado:', icon);
    console.log('Clases del icono:', icon.className);
    if (icon.classList.contains('fa-eye')) return 'view';
    if (icon.classList.contains('fa-edit')) return 'edit';
    if (icon.classList.contains('fa-trash')) return 'delete';
    console.log('No se encontró acción para el icono');
    return null;
}

function handleAction(action, button) {
    console.log('Acción detectada:', action);
    const row = button.closest('tr');
    const pedidoId = row.querySelector('td:first-child').textContent;
    console.log('ID del pedido:', pedidoId);
    
    switch(action) {
        case 'view':
            console.log('Ejecutando viewPedido...');
            viewPedido(pedidoId);
            break;
        case 'edit':
            editPedido(pedidoId);
            break;
        case 'delete':
            deletePedido(pedidoId, row);
            break;
    }
}

function viewPedido(pedidoId) {
    console.log('Intentando ver pedido:', pedidoId);
    // Buscar datos del pedido en localStorage o en la tabla
    const pedidoData = getPedidoData(pedidoId);
    console.log('Datos del pedido encontrados:', pedidoData);
    if (pedidoData) {
        showPedidoDetails(pedidoData);
    } else {
        showNotification('No se encontraron los detalles del pedido', 'error');
    }
}

function getPedidoData(pedidoId) {
    // Intentar obtener de localStorage primero
    try {
        const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (pedido) return pedido;
    } catch (error) {
        console.error('Error al obtener datos del localStorage:', error);
    }
    
    // Si no está en localStorage, obtener de la tabla
    const rows = document.querySelectorAll('.pedidos-table tbody tr');
    for (let row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0 && cells[0].textContent.trim() === pedidoId.trim()) {
            const estadoSelector = cells[3].querySelector('.status-selector');
            const estado = estadoSelector ? estadoSelector.value : 'pendiente';
            
            return {
                id: cells[0].textContent.trim(),
                cliente: cells[1].textContent.trim(),
                fecha: cells[2].textContent.trim(),
                estado: estado,
                total: cells[4].textContent.trim(),
                // Datos adicionales por defecto para mostrar en el modal
                canalVenta: 'No especificado',
                categoriaProducto: 'No especificado',
                tipoTrabajo: 'No especificado',
                cantidad: '1',
                precioUnitario: '0.00',
                prioridad: 'normal',
                telefono: 'No especificado',
                email: 'No especificado',
                usuario: 'No especificado',
                direccion: 'No especificada',
                fechaEntrega: 'No especificada',
                especificaciones: 'No especificadas',
                textoPersonalizado: 'No especificado',
                observaciones: 'No especificado',
                tamano: 'No especificado',
                material: 'No especificado'
            };
        }
    }
    
    return null;
}

function showPedidoDetails(pedidoData) {
    console.log('Mostrando detalles del pedido:', pedidoData);
    const modal = document.getElementById('modalVerPedido');
    const content = document.getElementById('pedidoDetailsContent');
    const pedidoIdDisplay = document.getElementById('pedidoIdDisplay');
    
    console.log('Modal encontrado:', modal);
    console.log('Content encontrado:', content);
    
    if (!modal || !content) {
        console.error('Modal o content no encontrado');
        return;
    }
    
    // Mostrar ID del pedido en el header
    if (pedidoIdDisplay) {
        pedidoIdDisplay.textContent = `ID: ${pedidoData.id}`;
    }
    
    // Generar HTML con los detalles del pedido
    content.innerHTML = generatePedidoDetailsHTML(pedidoData);
    
    // Configurar el selector de estado en el modal
    const estadoSelector = document.getElementById('estadoPedido');
    if (estadoSelector && pedidoData.estado) {
        estadoSelector.value = pedidoData.estado;
    }
    
    // Configurar event listeners para el modal de detalles
    setupDetailsModal();
    
    // Configurar imágenes para hacer clic y ampliar
    setupImageClickHandlers();
    
    // Mostrar modal con animación
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Agregar clase de animación al contenido
    setTimeout(() => {
        content.style.animation = 'bounceIn 0.6s ease';
    }, 100);
}

function generatePedidoDetailsHTML(data) {
    const canalVenta = data.canalVenta || 'No especificado';
    const categoriaProducto = data.categoriaProducto || 'No especificado';
    const tipoTrabajo = data.tipoTrabajo || 'No especificado';
    const colores = data.colores || 'No especificado';
    const tamano = data.tamano || 'No especificado';
    const material = data.material || 'No especificado';
    const especificaciones = data.especificaciones || 'No especificado';
    const textoPersonalizado = data.textoPersonalizado || 'No especificado';
    const observaciones = data.observaciones || 'No especificado';
    const prioridad = data.prioridad || 'Normal';
    
    // Generar colores visuales si existen
    const coloresHTML = generateColorsHTML(data);
    
    // Generar imágenes si existen
    const imagenesHTML = generateImagesHTML(data);
    
    return `
        <div class="pedido-details">
            <div class="pedido-info-section">
                <h3>Información del Pedido</h3>
                <div class="detail-item">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value">${data.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Cliente:</span>
                    <span class="detail-value">${data.cliente}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Teléfono:</span>
                    <span class="detail-value">${data.telefono || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${data.email || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fecha:</span>
                    <span class="detail-value">${data.fecha}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fecha de Entrega:</span>
                    <span class="detail-value">${data.fechaEntrega || 'No especificada'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Estado:</span>
                    <span class="detail-value">
                        <span class="detail-status ${data.estado}">${data.estado.charAt(0).toUpperCase() + data.estado.slice(1)}</span>
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Prioridad:</span>
                    <span class="detail-value">${prioridad.charAt(0).toUpperCase() + prioridad.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total:</span>
                    <span class="detail-value">${data.total || '$0.00'}</span>
                </div>
            </div>
            
            <div class="pedido-info-section">
                <h3>Detalles del Producto</h3>
                <div class="detail-item">
                    <span class="detail-label">Canal de Venta:</span>
                    <span class="detail-value">${canalVenta.charAt(0).toUpperCase() + canalVenta.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Categoría:</span>
                    <span class="detail-value">${categoriaProducto.charAt(0).toUpperCase() + categoriaProducto.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tipo de Trabajo:</span>
                    <span class="detail-value">${tipoTrabajo.charAt(0).toUpperCase() + tipoTrabajo.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Cantidad:</span>
                    <span class="detail-value">${data.cantidad || '1'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Precio Unitario:</span>
                    <span class="detail-value">$${data.precioUnitario || '0.00'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tamaño:</span>
                    <span class="detail-value">${tamano.charAt(0).toUpperCase() + tamano.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Material:</span>
                    <span class="detail-value">${material.charAt(0).toUpperCase() + material.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Colores:</span>
                    <span class="detail-value">${colores}</span>
                </div>
                ${coloresHTML}
            </div>
        </div>
        
        <div class="pedido-info-section">
            <h3>Especificaciones y Detalles</h3>
            <div class="detail-item">
                <span class="detail-label">Especificaciones Técnicas:</span>
                <span class="detail-value">${especificaciones}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Texto Personalizado:</span>
                <span class="detail-value">${textoPersonalizado}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Observaciones:</span>
                <span class="detail-value">${observaciones}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Dirección de Entrega:</span>
                <span class="detail-value">${data.direccion || 'No especificada'}</span>
            </div>
        </div>
        
        ${imagenesHTML}
    `;
}

function generateColorsHTML(data) {
    const colors = [];
    
    // Recopilar colores
    if (data.colorPicker1 && data.colorPicker1 !== '#000000') {
        colors.push(data.colorPicker1);
    }
    if (data.colorPicker2 && data.colorPicker2 !== '#000000') {
        colors.push(data.colorPicker2);
    }
    if (data.colorPicker3 && data.colorPicker3 !== '#000000') {
        colors.push(data.colorPicker3);
    }
    if (data.colorPicker4 && data.colorPicker4 !== '#000000') {
        colors.push(data.colorPicker4);
    }
    if (data.colorPicker5 && data.colorPicker5 !== '#000000') {
        colors.push(data.colorPicker5);
    }
    
    if (colors.length === 0) return '';
    
    return `
        <div class="detail-item">
            <span class="detail-label">Colores Seleccionados:</span>
            <div class="detail-colors">
                ${colors.map((color, index) => 
                    `<div class="detail-color" 
                         style="background-color: ${color}" 
                         data-color-name="${color.toUpperCase()}"
                         title="${color.toUpperCase()}"></div>`
                ).join('')}
            </div>
        </div>
    `;
}

function generateImagesHTML(data) {
    if (!data.imagenes || data.imagenes.length === 0) return '';
    
    return `
        <div class="pedido-info-section">
            <h3>Imágenes de Referencia</h3>
            <div class="detail-images">
                ${data.imagenes.map(img => `<img src="${img}" alt="Imagen de referencia" class="detail-image">`).join('')}
            </div>
        </div>
    `;
}

function setupDetailsModal() {
    const modal = document.getElementById('modalVerPedido');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.btn-cancelar');
    
    // Remover event listeners existentes para evitar duplicados
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeDetailsModal);
        closeBtn.addEventListener('click', closeDetailsModal);
    }
    
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeDetailsModal);
        cancelBtn.addEventListener('click', closeDetailsModal);
    }
    
    // Remover event listener existente del modal
    modal.removeEventListener('click', handleModalClick);
    modal.addEventListener('click', handleModalClick);
}

function handleModalClick(e) {
    if (e.target === e.currentTarget) {
        closeDetailsModal();
    }
}

function closeDetailsModal() {
    const modal = document.getElementById('modalVerPedido');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function editPedido(pedidoId) {
    console.log('Editando pedido:', pedidoId);
    // Buscar datos del pedido
    const pedidoData = getPedidoData(pedidoId);
    if (pedidoData) {
        showEditModal(pedidoData);
    } else {
        showNotification('No se encontraron los datos del pedido para editar', 'error');
    }
}

function deletePedido(pedidoId, row) {
    if (confirm(`¿Estás seguro de que quieres eliminar el pedido ${pedidoId}?`)) {
        row.style.opacity = '0.5';
        row.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            row.remove();
            showNotification('Pedido eliminado correctamente', 'success');
        }, 300);
    }
}

function setupFilters() {
    const filterSelect = document.querySelector('.filter-select');
    
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            const status = this.value;
            filterPedidosByStatus(status);
        });
    }
}

function filterPedidosByStatus(status) {
    const rows = document.querySelectorAll('.pedidos-table tbody tr');
    
    rows.forEach(row => {
        const statusCell = row.querySelector('.status');
        const rowStatus = statusCell ? statusCell.textContent.toLowerCase() : '';
        
        if (status === '' || rowStatus.includes(status.toLowerCase())) {
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
            searchPedidos(searchTerm);
        });
    }
}

function searchPedidos(searchTerm) {
    const rows = document.querySelectorAll('.pedidos-table tbody tr');
    
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

// Función para el botón de nuevo pedido
document.addEventListener('DOMContentLoaded', function() {
    const nuevoPedidoBtn = document.querySelector('.btn-nuevo-pedido');
    
    if (nuevoPedidoBtn) {
        nuevoPedidoBtn.addEventListener('click', function() {
            openModal();
        });
    }
    
    // Configurar modal
    setupModal();
    
    // Configurar modal de detalles del producto
    setupProductDetailsModal();
});

// Variables globales para el modal
let modal = null;
let form = null;
let productDetailsModal = null;
let productDetailsForm = null;
let productDetailsData = {};

function setupModal() {
    modal = document.getElementById('modalNuevoPedido');
    form = document.getElementById('formNuevoPedido');
    
    if (!modal || !form) return;
    
    // Configurar botones de cerrar
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.btn-cancelar');
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Cerrar modal al hacer clic fuera de él
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // NOTA: El envío del formulario hacia el backend se gestiona más abajo
    // con crearNuevoPedido(). Evitamos el manejador antiguo para no duplicar
    // listeners ni realizar envíos locales sin API.
    // form.addEventListener('submit', handleFormSubmit);
    
    // Configurar validación en tiempo real
    setupFormValidation();
    
    // Configurar cálculo automático de total
    setupPriceCalculation();
    
    // Configurar subida de imágenes
    setupImageUpload();
    
    // Configurar selectores de color
    setupColorPickers();
}

function openModal() {
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        
        // Establecer fecha mínima para entrega (hoy)
        const fechaEntrega = document.getElementById('fechaEntrega');
        if (fechaEntrega) {
            const today = new Date().toISOString().split('T')[0];
            fechaEntrega.min = today;
            // Prefijar por defecto la fecha de hoy si está vacía
            if (!fechaEntrega.value) {
                fechaEntrega.value = today;
            }
        }
        
        // Enfocar el primer campo
        const firstInput = form.querySelector('input[required]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal() {
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restaurar scroll del body
        
        // Limpiar formulario
        form.reset();
        clearFormErrors();
    }
}

function setupFormValidation() {
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        field.addEventListener('blur', function() {
            validateField(this);
        });
        
        field.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.getAttribute('name');
    let isValid = true;
    let errorMessage = '';
    
    // Validar campos requeridos
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'Este campo es obligatorio';
    }
    
    // Validaciones específicas
    switch(fieldName) {
        case 'email':
            if (value && !isValidEmail(value)) {
                isValid = false;
                errorMessage = 'Ingrese un email válido';
            }
            break;
        case 'telefono':
            if (value && !isValidPhone(value)) {
                isValid = false;
                errorMessage = 'Ingrese un teléfono válido';
            }
            break;
        case 'cantidad':
            if (value && (isNaN(value) || parseInt(value) < 1)) {
                isValid = false;
                errorMessage = 'La cantidad debe ser mayor a 0';
            }
            break;
        case 'precioUnitario':
            if (value && (isNaN(value) || parseFloat(value) < 0)) {
                isValid = false;
                errorMessage = 'El precio debe ser mayor o igual a 0';
            }
            break;
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    } else {
        clearFieldError(field);
    }
    
    return isValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #ff6b6b;
        font-size: 0.85em;
        margin-top: 4px;
        font-weight: bold;
    `;
    
    field.parentNode.appendChild(errorDiv);
    field.style.borderColor = '#ff6b6b';
}

function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = 'rgba(20, 152, 0, 0.3)';
}

function clearFormErrors() {
    const errors = form.querySelectorAll('.field-error');
    errors.forEach(error => error.remove());
    
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.style.borderColor = 'rgba(20, 152, 0, 0.3)';
    });
}

function setupPriceCalculation() {
    const cantidadField = document.getElementById('cantidad');
    const precioField = document.getElementById('precioUnitario');
    
    if (cantidadField && precioField) {
        [cantidadField, precioField].forEach(field => {
            field.addEventListener('input', calculateTotal);
        });
    }
}

function calculateTotal() {
    // Usar cantidad de los detalles del producto si está disponible, sino del formulario principal
    let cantidad = 0;
    if (productDetailsData.cantidad) {
        cantidad = parseFloat(productDetailsData.cantidad) || 0;
    } else {
        cantidad = parseFloat(document.getElementById('cantidad')?.value) || 0;
    }
    
    const precio = parseFloat(document.getElementById('precioUnitario').value) || 0;
    const total = cantidad * precio;
    
    // Mostrar total calculado (opcional)
    let totalDisplay = document.getElementById('totalCalculado');
    if (!totalDisplay) {
        totalDisplay = document.createElement('div');
        totalDisplay.id = 'totalCalculado';
        totalDisplay.style.cssText = `
            background-color: rgba(20, 152, 0, 0.2);
            padding: 10px;
            border-radius: 6px;
            margin-top: 10px;
            font-weight: bold;
            color: white;
            text-align: center;
        `;
        document.getElementById('precioUnitario').parentNode.appendChild(totalDisplay);
    }
    
    if (total > 0) {
        totalDisplay.textContent = `Total: $${total.toFixed(2)}`;
        totalDisplay.style.display = 'block';
    } else {
        totalDisplay.style.display = 'none';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validar todos los campos
    const requiredFields = form.querySelectorAll('[required]');
    let isFormValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isFormValid = false;
        }
    });
    
    if (!isFormValid) {
        showNotification('Por favor, corrija los errores en el formulario', 'error');
        return;
    }
    
    // Recopilar datos del formulario
    const formData = new FormData(form);
    const pedidoData = {};
    
    for (let [key, value] of formData.entries()) {
        pedidoData[key] = value;
    }
    
    // Agregar colores seleccionados
    const colorPickers = document.querySelectorAll('.color-picker');
    colorPickers.forEach((picker, index) => {
        if (picker.value && picker.value !== '#000000') {
            pedidoData[`colorPicker${index + 1}`] = picker.value;
        }
    });
    
    // Agregar datos de detalles del producto
    Object.assign(pedidoData, productDetailsData);
    
    // Generar ID único para el pedido
    const pedidoId = generatePedidoId();
    
    // Crear nuevo pedido
    createNewPedido(pedidoData, pedidoId);
    
    // Cerrar modal y limpiar formulario
    closeModal();
    
    // Mostrar notificación de éxito
    showNotification('Pedido creado exitosamente', 'success');
}

function generatePedidoId() {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    return `#${timestamp}`;
}

function createNewPedido(data, pedidoId) {
    // Crear nueva fila en la tabla
    const tbody = document.querySelector('.pedidos-table tbody');
    const newRow = document.createElement('tr');
    
    // Determinar estado por defecto
    const estado = 'pendiente';
    const estadoClass = 'pendiente';
    
    // Calcular total
    const cantidadPedido = parseFloat(data.cantidad) || 0;
    const precio = parseFloat(data.precioUnitario) || 0;
    const total = cantidadPedido * precio;
    
    // Formatear fecha
    const fecha = new Date().toLocaleDateString('es-ES');
    
    // Obtener canal de venta y categoría para mostrar en la tabla
    const canalVenta = data.canalVenta || 'No especificado';
    const categoriaProducto = data.categoriaProducto || 'No especificado';
    const cantidad = data.cantidad || '1';
    
    newRow.innerHTML = `
        <td>${pedidoId}</td>
        <td>${data.cliente}</td>
        <td>${fecha}</td>
        <td>
            <select class="status-selector" data-pedido-id="${pedidoId}">
                <option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="procesando" ${estado === 'procesando' ? 'selected' : ''}>Procesando</option>
                <option value="enviado" ${estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                <option value="entregado" ${estado === 'entregado' ? 'selected' : ''}>Entregado</option>
            </select>
        </td>
        <td>$${total.toFixed(2)}</td>
        <td>
            <button class="btn-action" title="Ver detalles"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-action" title="Editar"><i class="fa-solid fa-edit"></i></button>
            <button class="btn-action" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    
    // Agregar atributos de datos para facilitar la búsqueda
    newRow.setAttribute('data-canal', canalVenta);
    newRow.setAttribute('data-categoria', categoriaProducto);
    newRow.setAttribute('data-prioridad', data.prioridad || 'normal');
    
    // Agregar la nueva fila al principio de la tabla
    tbody.insertBefore(newRow, tbody.firstChild);
    
    // Reconfigurar los event listeners para los nuevos botones
    setupActionButtons();
    
    // Reconfigurar selectores de estado
    reconfigureStatusSelectors();
    
    // Aplicar estilo inicial al selector
    const newSelector = newRow.querySelector('.status-selector');
    if (newSelector) {
        updateSelectorStyle(newSelector, estado);
    }
    
    // Guardar datos en localStorage (opcional)
    savePedidoToStorage(pedidoId, data);
}

function savePedidoToStorage(pedidoId, data) {
    try {
        const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
        const nuevoPedido = {
            id: pedidoId,
            ...data,
            fecha: new Date().toISOString(),
            estado: 'pendiente',
            total: (parseFloat(data.cantidad) || 0) * (parseFloat(data.precioUnitario) || 0)
        };
        
        pedidos.unshift(nuevoPedido);
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
    } catch (error) {
        console.error('Error al guardar pedido:', error);
    }
}

// Funciones para manejo de imágenes
function setupImageUpload() {
    const fileInput = document.getElementById('imagenReferencia');
    const previewContainer = document.getElementById('imagePreviewContainer');
    
    if (!fileInput || !previewContainer) return;
    
    // Configurar drag and drop
    previewContainer.addEventListener('dragover', handleDragOver);
    previewContainer.addEventListener('drop', handleDrop);
    previewContainer.addEventListener('click', () => fileInput.click());
    
    // Configurar selección de archivos
    fileInput.addEventListener('change', handleFileSelect);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'rgba(20, 152, 0, 0.8)';
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'rgba(20, 152, 0, 0.3)';
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

function handleFiles(files) {
    const previewContainer = document.getElementById('imagePreviewContainer');
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
        showNotification('Por favor selecciona solo archivos de imagen', 'error');
        return;
    }
    
    // Limpiar preview anterior
    const existingPreview = previewContainer.querySelector('.image-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Crear contenedor de preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    
    validFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-preview-item';
            
            imageItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button type="button" class="remove-image" onclick="removeImage(this)">×</button>
            `;
            
            previewDiv.appendChild(imageItem);
        };
        reader.readAsDataURL(file);
    });
    
    previewContainer.appendChild(previewDiv);
    
    // Ocultar placeholder
    const placeholder = previewContainer.querySelector('.upload-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

function removeImage(button) {
    const imageItem = button.parentElement;
    imageItem.remove();
    
    // Mostrar placeholder si no hay más imágenes
    const previewContainer = document.getElementById('imagePreviewContainer');
    const remainingImages = previewContainer.querySelectorAll('.image-preview-item');
    
    if (remainingImages.length === 0) {
        const placeholder = previewContainer.querySelector('.upload-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
}

// Funciones para manejo de colores
function setupColorPickers() {
    const colorPickers = document.querySelectorAll('.color-picker');
    const coloresInput = document.getElementById('colores');
    
    colorPickers.forEach((picker, index) => {
        picker.addEventListener('change', function() {
            updateColoresInput();
        });
    });
    
    if (coloresInput) {
        coloresInput.addEventListener('input', function() {
            // Opcional: actualizar los color pickers basado en el texto
        });
    }
}

function updateColoresInput() {
    const colorPickers = document.querySelectorAll('.color-picker');
    const coloresInput = document.getElementById('colores');
    
    if (!coloresInput) return;
    
    const colors = Array.from(colorPickers)
        .map(picker => picker.value)
        .filter(color => color && color !== '#000000');
    
    if (colors.length > 0) {
        coloresInput.value = colors.join(', ');
    }
}

// Función para obtener imágenes del formulario
function getFormImages() {
    const fileInput = document.getElementById('imagenReferencia');
    const images = [];
    
    if (fileInput && fileInput.files) {
        Array.from(fileInput.files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    images.push(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    return images;
}

// Funciones para el modal de detalles del producto
function setupProductDetailsModal() {
    productDetailsModal = document.getElementById('modalDetallesProducto');
    productDetailsForm = document.getElementById('formDetallesProducto');
    
    if (!productDetailsModal || !productDetailsForm) return;
    
    // Configurar botón para abrir modal
    const btnDetalles = document.getElementById('btnDetallesProducto');
    if (btnDetalles) {
        btnDetalles.addEventListener('click', openProductDetailsModal);
    }
    
    // Configurar botones de cerrar
    const closeBtn = productDetailsModal.querySelector('.close');
    const cancelBtn = productDetailsModal.querySelector('.btn-cancelar');
    const guardarBtn = document.getElementById('guardarDetalles');
    
    closeBtn.addEventListener('click', closeProductDetailsModal);
    cancelBtn.addEventListener('click', closeProductDetailsModal);
    guardarBtn.addEventListener('click', saveProductDetails);
    
    // Cerrar modal al hacer clic fuera de él
    productDetailsModal.addEventListener('click', function(e) {
        if (e.target === productDetailsModal) {
            closeProductDetailsModal();
        }
    });
    
    // Configurar validación y funcionalidades
    setupProductDetailsValidation();
    setupProductDetailsImageUpload();
    setupProductDetailsColorPickers();
}

function openProductDetailsModal() {
    if (productDetailsModal) {
        productDetailsModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Cargar datos existentes si los hay
        loadExistingProductDetails();
        
        // Enfocar el primer campo
        const firstInput = productDetailsForm.querySelector('input[required]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeProductDetailsModal() {
    if (productDetailsModal) {
        productDetailsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function loadExistingProductDetails() {
    // Cargar datos existentes en el formulario
    Object.keys(productDetailsData).forEach(key => {
        const field = productDetailsForm.querySelector(`[name="${key}"]`);
        if (field) {
            field.value = productDetailsData[key];
        }
    });
    
    // Cargar colores
    for (let i = 1; i <= 5; i++) {
        const colorPicker = document.getElementById(`colorPicker${i}`);
        if (colorPicker && productDetailsData[`colorPicker${i}`]) {
            colorPicker.value = productDetailsData[`colorPicker${i}`];
        }
    }
    
    // Cargar imágenes si existen
    if (productDetailsData.imagenes && productDetailsData.imagenes.length > 0) {
        displayExistingImages(productDetailsData.imagenes);
    }
}

function saveProductDetails() {
    // Validar campos requeridos
    const requiredFields = productDetailsForm.querySelectorAll('[required]');
    let isFormValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isFormValid = false;
            showFieldError(field, 'Este campo es obligatorio');
        } else {
            clearFieldError(field);
        }
    });
    
    if (!isFormValid) {
        showNotification('Por favor, complete todos los campos obligatorios', 'error');
        return;
    }
    
    // Recopilar datos del formulario
    const formData = new FormData(productDetailsForm);
    productDetailsData = {};
    
    for (let [key, value] of formData.entries()) {
        productDetailsData[key] = value;
    }
    
    // Agregar colores seleccionados
    const colorPickers = productDetailsForm.querySelectorAll('.color-picker');
    colorPickers.forEach((picker, index) => {
        if (picker.value && picker.value !== '#000000') {
            productDetailsData[`colorPicker${index + 1}`] = picker.value;
        }
    });
    
    // Agregar imágenes
    const images = getProductDetailsImages();
    if (images.length > 0) {
        productDetailsData.imagenes = images;
    }
    
    // Actualizar resumen
    updateProductDetailsSummary();
    
    // Cerrar modal
    closeProductDetailsModal();
    
    // Mostrar notificación
    showNotification('Detalles del producto guardados', 'success');
}

function setupProductDetailsValidation() {
    const requiredFields = productDetailsForm.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        field.addEventListener('blur', function() {
            validateField(this);
        });
        
        field.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

function setupProductDetailsImageUpload() {
    const fileInput = productDetailsForm.querySelector('#imagenReferencia');
    const previewContainer = productDetailsForm.querySelector('#imagePreviewContainer');
    
    if (!fileInput || !previewContainer) return;
    
    // Configurar drag and drop
    previewContainer.addEventListener('dragover', handleDragOver);
    previewContainer.addEventListener('drop', handleDrop);
    previewContainer.addEventListener('click', () => fileInput.click());
    
    // Configurar selección de archivos
    fileInput.addEventListener('change', handleFileSelect);
}

function setupProductDetailsColorPickers() {
    const colorPickers = productDetailsForm.querySelectorAll('.color-picker');
    const coloresInput = productDetailsForm.querySelector('#colores');
    
    colorPickers.forEach((picker, index) => {
        picker.addEventListener('change', function() {
            updateColoresInput();
        });
    });
    
    if (coloresInput) {
        coloresInput.addEventListener('input', function() {
            // Opcional: actualizar los color pickers basado en el texto
        });
    }
}

function getProductDetailsImages() {
    const fileInput = productDetailsForm.querySelector('#imagenReferencia');
    const images = [];
    
    if (fileInput && fileInput.files) {
        Array.from(fileInput.files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    images.push(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    return images;
}

function displayExistingImages(images) {
    const previewContainer = productDetailsForm.querySelector('#imagePreviewContainer');
    if (!previewContainer) return;
    
    // Limpiar preview anterior
    const existingPreview = previewContainer.querySelector('.image-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Crear contenedor de preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    
    images.forEach((imageSrc, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-preview-item';
        
        imageItem.innerHTML = `
            <img src="${imageSrc}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removeImage(this)">×</button>
        `;
        
        previewDiv.appendChild(imageItem);
    });
    
    previewContainer.appendChild(previewDiv);
    
    // Ocultar placeholder
    const placeholder = previewContainer.querySelector('.upload-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

function updateProductDetailsSummary() {
    const resumenDetalles = document.getElementById('resumenDetalles');
    const resumenContenido = document.getElementById('resumenContenido');
    
    if (!resumenDetalles || !resumenContenido) return;
    
    // Generar resumen
    let resumenHTML = '';
    
    if (productDetailsData.categoriaProducto) {
        resumenHTML += `
            <div class="resumen-item">
                <span class="resumen-label">Categoría:</span>
                <span class="resumen-value">${productDetailsData.categoriaProducto.charAt(0).toUpperCase() + productDetailsData.categoriaProducto.slice(1)}</span>
            </div>
        `;
    }
    
    if (productDetailsData.cantidad) {
        resumenHTML += `
            <div class="resumen-item">
                <span class="resumen-label">Cantidad:</span>
                <span class="resumen-value">${productDetailsData.cantidad}</span>
            </div>
        `;
    }
    
    if (productDetailsData.tamano) {
        resumenHTML += `
            <div class="resumen-item">
                <span class="resumen-label">Tamaño:</span>
                <span class="resumen-value">${productDetailsData.tamano.charAt(0).toUpperCase() + productDetailsData.tamano.slice(1)}</span>
            </div>
        `;
    }
    
    if (productDetailsData.material) {
        resumenHTML += `
            <div class="resumen-item">
                <span class="resumen-label">Material:</span>
                <span class="resumen-value">${productDetailsData.material.charAt(0).toUpperCase() + productDetailsData.material.slice(1)}</span>
            </div>
        `;
    }
    
    if (productDetailsData.estiloLetra) {
        resumenHTML += `
            <div class="resumen-item">
                <span class="resumen-label">Estilo de Letra:</span>
                <span class="resumen-value">${productDetailsData.estiloLetra.charAt(0).toUpperCase() + productDetailsData.estiloLetra.slice(1)}</span>
            </div>
        `;
    }
    
    if (productDetailsData.textoPersonalizado) {
        resumenHTML += `
            <div class="resumen-item">
                <span class="resumen-label">Texto:</span>
                <span class="resumen-value">${productDetailsData.textoPersonalizado.substring(0, 30)}${productDetailsData.textoPersonalizado.length > 30 ? '...' : ''}</span>
            </div>
        `;
    }
    
    // Agregar colores
    const colors = [];
    for (let i = 1; i <= 5; i++) {
        if (productDetailsData[`colorPicker${i}`]) {
            colors.push(productDetailsData[`colorPicker${i}`]);
        }
    }
    
    if (colors.length > 0) {
        resumenHTML += `
            <div class="resumen-item">
                <span class="resumen-label">Colores:</span>
                <div class="resumen-colors">
                    ${colors.map(color => `<div class="resumen-color" style="background-color: ${color}"></div>`).join('')}
                </div>
            </div>
        `;
    }
    
    // Agregar imágenes
    if (productDetailsData.imagenes && productDetailsData.imagenes.length > 0) {
        resumenHTML += `
            <div class="resumen-item">
                <span class="resumen-label">Imágenes:</span>
                <div class="resumen-images">
                    ${productDetailsData.imagenes.map(img => `<img src="${img}" alt="Imagen" class="resumen-image">`).join('')}
                </div>
            </div>
        `;
    }
    
    resumenContenido.innerHTML = resumenHTML;
    resumenDetalles.style.display = 'block';
}

// Funciones para manejo de cambio de estado
function setupStatusSelectors() {
    // Configurar selectores de estado en la tabla
    const statusSelectors = document.querySelectorAll('.status-selector');
    console.log('Configurando ' + statusSelectors.length + ' selectores de estado');
    
    statusSelectors.forEach(selector => {
        selector.addEventListener('change', async function(e) {
            const pedidoId = this.getAttribute('data-pedido-id');
            const nuevoEstadoId = this.value;
            const estadoAnterior = this.getAttribute('data-current-estado');
            
            console.log('Cambio de estado - Pedido:', pedidoId, 'Nuevo estado:', nuevoEstadoId);
            
            // Confirmar el cambio
            const opcionSeleccionada = this.options[this.selectedIndex];
            const nombreEstado = opcionSeleccionada.text;
            
            if (!confirm(`¿Cambiar estado del pedido #${pedidoId} a "${nombreEstado}"?`)) {
                // Revertir si cancela
                this.value = estadoAnterior;
                return;
            }
            
            try {
                // Deshabilitar el selector mientras se actualiza
                this.disabled = true;
                
                // Llamar a la API para actualizar el estado
                const response = await fetch(`/Color_Ink/public/index.php?route=pedidos/${pedidoId}/cambiar-estado&caso=1`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                    },
                    body: JSON.stringify({
                        id_estado_nuevo: parseInt(nuevoEstadoId)
                    })
                });
                
                const data = await response.json();
                
                // La API devuelve status: 'OK' para éxito, no 'success'
                if (response.ok && (data.status === 'OK' || data.status === 'success')) {
                    // Actualizar el data-current-estado
                    this.setAttribute('data-current-estado', nuevoEstadoId);
                    
                    // Actualizar estilo visual
                    updateSelectorStyle(this, nuevoEstadoId);
                    
                    showNotification(`Estado actualizado a: ${nombreEstado}`, 'success');
                    
                    // Recargar la tabla para reflejar cambios
                    await PedidosMVC.init({
                        apiEntry: '/Color_Ink/public/index.php',
                        tableSelector: '.pedidos-table tbody',
                        autoCreateToken: true
                    });
                    
                    // Reconfigurar los selectores después de recargar
                    setTimeout(setupStatusSelectors, 500);
                } else {
                    throw new Error(data.message || 'Error al actualizar estado');
                }
                
            } catch (error) {
                console.error('Error al actualizar estado:', error);
                showNotification('Error al actualizar estado: ' + error.message, 'error');
                // Revertir el selector
                this.value = estadoAnterior;
            } finally {
                this.disabled = false;
            }
        });
    });
    
    // Configurar botón de actualizar estado en el modal
    const btnActualizarEstado = document.querySelector('.btn-actualizar-estado');
    if (btnActualizarEstado) {
        btnActualizarEstado.addEventListener('click', function() {
            const estadoSelector = document.getElementById('estadoPedido');
            const nuevoEstado = estadoSelector.value;
            const pedidoId = getCurrentPedidoId();
            
            if (pedidoId && nuevoEstado) {
                updatePedidoStatusFromModal(pedidoId, nuevoEstado);
            }
        });
    }
}

function updatePedidoStatus(pedidoId, nuevoEstado, selector) {
    // Actualizar el selector visualmente
    updateSelectorStyle(selector, nuevoEstado);
    
    // Actualizar localStorage
    updatePedidoStatusInStorage(pedidoId, nuevoEstado);
    
    // Mostrar notificación
    showNotification(`Estado del pedido ${pedidoId} actualizado a: ${nuevoEstado.charAt(0).toUpperCase() + nuevoEstado.slice(1)}`, 'success');
    
    // Actualizar filtros si están activos
    const filterSelect = document.querySelector('.filter-select');
    if (filterSelect && filterSelect.value !== '') {
        filterPedidosByStatus(filterSelect.value);
    }
}

function updatePedidoStatusFromModal(pedidoId, nuevoEstado) {
    // Actualizar en la tabla
    const selector = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
    if (selector) {
        selector.value = nuevoEstado;
        updateSelectorStyle(selector, nuevoEstado);
    }
    
    // Actualizar localStorage
    updatePedidoStatusInStorage(pedidoId, nuevoEstado);
    
    // Actualizar el modal de detalles si está abierto
    updateModalStatusDisplay(nuevoEstado);
    
    // Mostrar notificación
    showNotification(`Estado del pedido ${pedidoId} actualizado a: ${nuevoEstado.charAt(0).toUpperCase() + nuevoEstado.slice(1)}`, 'success');
}

function updateSelectorStyle(selector, estadoId) {
    // Mapeo de IDs a códigos de estado
    // 1: ENTRG (Entregado), 2: CANC (Cancelado), 3: PROCESO (En Proceso)
    const estadoMap = {
        '1': { class: 'entregado', bg: 'rgba(40, 167, 69, 0.2)', color: '#28a745' },
        '2': { class: 'cancelado', bg: 'rgba(220, 53, 69, 0.2)', color: '#dc3545' },
        '3': { class: 'proceso', bg: 'rgba(0, 123, 255, 0.2)', color: '#007bff' }
    };
    
    const config = estadoMap[String(estadoId)] || estadoMap['3'];
    
    // Remover clases de estado anteriores
    selector.classList.remove('entregado', 'cancelado', 'proceso', 'pendiente', 'procesando', 'enviado');
    
    // Agregar nueva clase de estado
    selector.classList.add(config.class);
    
    // Aplicar estilos específicos
    selector.style.backgroundColor = config.bg;
    selector.style.color = config.color;
    selector.style.borderColor = config.color;
    selector.style.fontWeight = '500';
    selector.style.padding = '6px 12px';
    selector.style.borderRadius = '6px';
    selector.style.border = `2px solid ${config.color}`;
}

function updatePedidoStatusInStorage(pedidoId, nuevoEstado) {
    try {
        const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
        const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
        
        if (pedidoIndex !== -1) {
            pedidos[pedidoIndex].estado = nuevoEstado;
            pedidos[pedidoIndex].fechaActualizacion = new Date().toISOString();
            localStorage.setItem('pedidos', JSON.stringify(pedidos));
        }
    } catch (error) {
        console.error('Error al actualizar estado en localStorage:', error);
    }
}

function updateModalStatusDisplay(nuevoEstado) {
    // Actualizar el selector en el modal
    const estadoSelector = document.getElementById('estadoPedido');
    if (estadoSelector) {
        estadoSelector.value = nuevoEstado;
    }
    
    // Actualizar el display del estado en los detalles
    const statusDisplay = document.querySelector('.detail-status');
    if (statusDisplay) {
        statusDisplay.textContent = nuevoEstado.charAt(0).toUpperCase() + nuevoEstado.slice(1);
        statusDisplay.className = `detail-status ${nuevoEstado}`;
    }
}

function getCurrentPedidoId() {
    // Obtener el ID del pedido actualmente visible en el modal
    const modal = document.getElementById('modalVerPedido');
    if (modal && modal.style.display === 'block') {
        const content = document.getElementById('pedidoDetailsContent');
        if (content) {
            const idElement = content.querySelector('.detail-value');
            if (idElement) {
                return idElement.textContent.trim();
            }
        }
    }
    return null;
}

// Función para reconfigurar selectores después de agregar nuevos pedidos
function reconfigureStatusSelectors() {
    // Remover event listeners existentes
    const existingSelectors = document.querySelectorAll('.status-selector');
    existingSelectors.forEach(selector => {
        selector.replaceWith(selector.cloneNode(true));
    });
    
    // Reconfigurar selectores
    setupStatusSelectors();
}

// Funciones para manejo de colores mejorado
function getColorName(hexColor) {
    const colorMap = {
        '#3498db': 'Azul marino',
        '#e74c3c': 'Rojo coral',
        '#2ecc71': 'Verde esmeralda',
        '#f39c12': 'Naranja dorado',
        '#9b59b6': 'Morado real',
        '#34495e': 'Gris oscuro',
        '#ecf0f1': 'Gris claro',
        '#1abc9c': 'Turquesa',
        '#e67e22': 'Naranja',
        '#95a5a6': 'Gris plata',
        '#f1c40f': 'Amarillo dorado',
        '#8e44ad': 'Morado violeta',
        '#16a085': 'Verde azulado',
        '#27ae60': 'Verde bosque',
        '#2980b9': 'Azul cielo',
        '#c0392b': 'Rojo oscuro',
        '#d35400': 'Naranja oscuro',
        '#7f8c8d': 'Gris azulado'
    };
    
    return colorMap[hexColor.toLowerCase()] || hexColor;
}

function setupColorPickers() {
    const colorPickers = document.querySelectorAll('.color-picker');
    const coloresInput = document.getElementById('colores');
    
    colorPickers.forEach((picker, index) => {
        picker.addEventListener('change', function() {
            updateColorName(this, index + 1);
            updateColoresInput();
        });
    });
    
    // Configurar botón de limpiar colores
    setupClearColorsButton();
    
    if (coloresInput) {
        coloresInput.addEventListener('input', function() {
            // Opcional: actualizar los color pickers basado en el texto
        });
    }
}

function setupClearColorsButton() {
    const clearButton = document.querySelector('.btn-limpiar-colores');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            const colorPickers = document.querySelectorAll('.color-picker');
            colorPickers.forEach((picker, index) => {
                picker.value = '#000000';
                updateColorName(picker, index + 1);
            });
            updateColoresInput();
            
            // Efecto visual
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            showNotification('Colores limpiados', 'success');
        });
    }
}

function updateColorName(picker, index) {
    const colorName = document.getElementById(`colorName${index}`);
    if (colorName) {
        const color = picker.value;
        if (color === '#000000') {
            colorName.textContent = `Color ${index}`;
            colorName.style.color = 'rgba(255, 255, 255, 0.6)';
        } else {
            colorName.textContent = color.toUpperCase();
            colorName.style.color = color;
        }
    }
}

function updateColoresInput() {
    const colorPickers = document.querySelectorAll('.color-picker');
    const coloresInput = document.getElementById('colores');
    
    if (!coloresInput) return;
    
    const colors = [];
    colorPickers.forEach((picker, index) => {
        if (picker.value && picker.value !== '#000000') {
            colors.push(picker.value.toUpperCase());
        }
    });
    
    if (colors.length > 0) {
        coloresInput.value = colors.join(', ');
    } else {
        coloresInput.value = '';
    }
}

// Funciones para manejo de imágenes
function setupImageClickHandlers() {
    const images = document.querySelectorAll('.detail-image');
    images.forEach(image => {
        image.addEventListener('click', function() {
            showImageModal(this.src, this.alt);
        });
    });
}

function showImageModal(src, alt) {
    // Crear modal para imagen ampliada
    const imageModal = document.createElement('div');
    imageModal.className = 'modal image-modal';
    imageModal.innerHTML = `
        <div class="modal-content image-modal-content">
            <div class="modal-header">
                <h3>Imagen de Referencia</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <img src="${src}" alt="${alt}" class="enlarged-image">
            </div>
        </div>
    `;
    
    document.body.appendChild(imageModal);
    imageModal.style.display = 'block';
    
    // Configurar cierre del modal
    const closeBtn = imageModal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        imageModal.remove();
    });
    
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.remove();
        }
    });
}

// Funciones para el modal de edición
function showEditModal(pedidoData) {
    console.log('Mostrando modal de edición para:', pedidoData);
    const modal = document.getElementById('modalEditarPedido');
    const pedidoIdDisplay = document.getElementById('editarPedidoIdDisplay');
    
    if (!modal) {
        console.error('Modal de edición no encontrado');
        return;
    }
    
    // Mostrar ID del pedido en el header
    if (pedidoIdDisplay) {
        pedidoIdDisplay.textContent = `ID: ${pedidoData.id}`;
    }
    
    // Llenar el formulario con los datos existentes
    fillEditForm(pedidoData);
    
    // Configurar event listeners para el modal de edición
    setupEditModal();
    
    // Configurar color pickers del modal de edición
    setupEditColorPickers();
    
    // Configurar subida de imágenes del modal de edición
    setupEditImageUpload();
    
    // Mostrar modal con animación
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Enfocar el primer campo
    const firstInput = modal.querySelector('input[required]');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function fillEditForm(data) {
    // Llenar campos básicos
    const fields = {
        'editarCliente': data.cliente,
        'editarTelefono': data.telefono,
        'editarUsuario': data.usuario,
        'editarFechaEntrega': data.fechaEntrega,
        'editarCanalVenta': data.canalVenta,
        'editarPrecioUnitario': data.precioUnitario,
        'editarCantidad': data.cantidad,
        'editarPrioridad': data.prioridad,
        'editarCategoriaProducto': data.categoriaProducto,
        'editarTamano': data.tamano,
        'editarMaterial': data.material,
        'editarDireccion': data.direccion,
        'editarTextoPersonalizado': data.textoPersonalizado,
        'editarEspecificaciones': data.especificaciones,
        'editarObservaciones': data.observaciones
    };
    
    // Llenar campos del formulario
    Object.keys(fields).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && fields[fieldId]) {
            field.value = fields[fieldId];
        }
    });
    
    // Llenar colores
    for (let i = 1; i <= 5; i++) {
        const colorPicker = document.getElementById(`editarColorPicker${i}`);
        if (colorPicker && data[`colorPicker${i}`]) {
            colorPicker.value = data[`colorPicker${i}`];
            updateEditColorName(colorPicker, i);
        }
    }
    
    // Actualizar campo de colores
    updateEditColoresInput();
    
    // Cargar imágenes existentes si las hay
    if (data.imagenes && data.imagenes.length > 0) {
        displayEditExistingImages(data.imagenes);
    }
}

function setupEditModal() {
    const modal = document.getElementById('modalEditarPedido');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.btn-cancelar');
    const saveBtn = document.getElementById('btnGuardarEdicion');
    
    // Remover event listeners existentes para evitar duplicados
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeEditModal);
        closeBtn.addEventListener('click', closeEditModal);
    }
    
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeEditModal);
        cancelBtn.addEventListener('click', closeEditModal);
    }
    
    if (saveBtn) {
        saveBtn.removeEventListener('click', saveEditChanges);
        saveBtn.addEventListener('click', saveEditChanges);
    }
    
    // Remover event listener existente del modal
    modal.removeEventListener('click', handleEditModalClick);
    modal.addEventListener('click', handleEditModalClick);
}

function handleEditModalClick(e) {
    if (e.target === e.currentTarget) {
        closeEditModal();
    }
}

function closeEditModal() {
    const modal = document.getElementById('modalEditarPedido');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Limpiar formulario
        const form = document.getElementById('formEditarPedido');
        if (form) {
            form.reset();
        }
    }
}

function saveEditChanges() {
    console.log('Guardando cambios de edición...');
    
    const form = document.getElementById('formEditarPedido');
    if (!form) return;
    
    // Validar campos requeridos
    const requiredFields = form.querySelectorAll('[required]');
    let isFormValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isFormValid = false;
            showFieldError(field, 'Este campo es obligatorio');
        } else {
            clearFieldError(field);
        }
    });
    
    if (!isFormValid) {
        showNotification('Por favor, complete todos los campos obligatorios', 'error');
        return;
    }
    
    // Recopilar datos del formulario
    const formData = new FormData(form);
    const updatedData = {};
    
    for (let [key, value] of formData.entries()) {
        updatedData[key] = value;
    }
    
    // Agregar colores seleccionados
    const colorPickers = form.querySelectorAll('.color-picker');
    colorPickers.forEach((picker, index) => {
        if (picker.value && picker.value !== '#000000') {
            updatedData[`colorPicker${index + 1}`] = picker.value;
        }
    });
    
    // Obtener ID del pedido
    const pedidoIdDisplay = document.getElementById('editarPedidoIdDisplay');
    const pedidoId = pedidoIdDisplay ? pedidoIdDisplay.textContent.replace('ID: ', '') : null;
    
    if (!pedidoId) {
        showNotification('Error: No se pudo identificar el pedido', 'error');
        return;
    }
    
    // Actualizar pedido
    updatePedidoInTable(pedidoId, updatedData);
    updatePedidoInStorage(pedidoId, updatedData);
    
    // Cerrar modal
    closeEditModal();
    
    // Mostrar notificación de éxito
    showNotification('Pedido actualizado exitosamente', 'success');
}

function updatePedidoInTable(pedidoId, updatedData) {
    // Buscar la fila en la tabla
    const rows = document.querySelectorAll('.pedidos-table tbody tr');
    for (let row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0 && cells[0].textContent.trim() === pedidoId.trim()) {
            // Actualizar datos visibles en la tabla
            if (cells[1] && updatedData.cliente) {
                cells[1].textContent = updatedData.cliente;
            }
            
            // El total se puede recalcular si se cambió precio o cantidad
            if (updatedData.precioUnitario && updatedData.cantidad) {
                const total = parseFloat(updatedData.precioUnitario) * parseFloat(updatedData.cantidad);
                if (cells[4]) {
                    cells[4].textContent = `$${total.toFixed(2)}`;
                }
            }
            
            break;
        }
    }
}

function updatePedidoInStorage(pedidoId, updatedData) {
    try {
        const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
        const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
        
        if (pedidoIndex !== -1) {
            // Actualizar datos existentes
            pedidos[pedidoIndex] = {
                ...pedidos[pedidoIndex],
                ...updatedData,
                fechaActualizacion: new Date().toISOString()
            };
            
            localStorage.setItem('pedidos', JSON.stringify(pedidos));
        }
    } catch (error) {
        console.error('Error al actualizar pedido en localStorage:', error);
    }
}

// Funciones para manejo de colores en el modal de edición
function setupEditColorPickers() {
    const colorPickers = document.querySelectorAll('#formEditarPedido .color-picker');
    const coloresInput = document.getElementById('editarColores');
    
    colorPickers.forEach((picker, index) => {
        picker.addEventListener('change', function() {
            updateEditColorName(this, index + 1);
            updateEditColoresInput();
        });
    });
    
    // Configurar botón de limpiar colores del modal de edición
    setupEditClearColorsButton();
}

function setupEditClearColorsButton() {
    const clearButton = document.querySelector('#formEditarPedido .btn-limpiar-colores');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            const colorPickers = document.querySelectorAll('#formEditarPedido .color-picker');
            colorPickers.forEach((picker, index) => {
                picker.value = '#000000';
                updateEditColorName(picker, index + 1);
            });
            updateEditColoresInput();
            
            // Efecto visual
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            showNotification('Colores limpiados', 'success');
        });
    }
}

function updateEditColorName(picker, index) {
    const colorName = document.getElementById(`editarColorName${index}`);
    if (colorName) {
        const color = picker.value;
        if (color === '#000000') {
            colorName.textContent = `Color ${index}`;
            colorName.style.color = 'rgba(255, 255, 255, 0.6)';
        } else {
            colorName.textContent = color.toUpperCase();
            colorName.style.color = color;
        }
    }
}

function updateEditColoresInput() {
    const colorPickers = document.querySelectorAll('#formEditarPedido .color-picker');
    const coloresInput = document.getElementById('editarColores');
    
    if (!coloresInput) return;
    
    const colors = [];
    colorPickers.forEach((picker, index) => {
        if (picker.value && picker.value !== '#000000') {
            colors.push(picker.value.toUpperCase());
        }
    });
    
    if (colors.length > 0) {
        coloresInput.value = colors.join(', ');
    } else {
        coloresInput.value = '';
    }
}

// Funciones para manejo de imágenes en el modal de edición
function setupEditImageUpload() {
    const fileInput = document.getElementById('editarImagenReferencia');
    const previewContainer = document.getElementById('editarImagePreviewContainer');
    
    if (!fileInput || !previewContainer) return;
    
    // Configurar drag and drop
    previewContainer.addEventListener('dragover', handleDragOver);
    previewContainer.addEventListener('drop', handleEditDrop);
    previewContainer.addEventListener('click', () => fileInput.click());
    
    // Configurar selección de archivos
    fileInput.addEventListener('change', handleEditFileSelect);
}

function handleEditDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'rgba(20, 152, 0, 0.3)';
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    
    const files = Array.from(e.dataTransfer.files);
    handleEditFiles(files);
}

function handleEditFileSelect(e) {
    const files = Array.from(e.target.files);
    handleEditFiles(files);
}

function handleEditFiles(files) {
    const previewContainer = document.getElementById('editarImagePreviewContainer');
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
        showNotification('Por favor selecciona solo archivos de imagen', 'error');
        return;
    }
    
    // Limpiar preview anterior
    const existingPreview = previewContainer.querySelector('.image-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Crear contenedor de preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    
    validFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-preview-item';
            
            imageItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button type="button" class="remove-image" onclick="removeEditImage(this)">×</button>
            `;
            
            previewDiv.appendChild(imageItem);
        };
        reader.readAsDataURL(file);
    });
    
    previewContainer.appendChild(previewDiv);
    
    // Ocultar placeholder
    const placeholder = previewContainer.querySelector('.upload-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

function displayEditExistingImages(images) {
    const previewContainer = document.getElementById('editarImagePreviewContainer');
    if (!previewContainer) return;
    
    // Limpiar preview anterior
    const existingPreview = previewContainer.querySelector('.image-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Crear contenedor de preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    
    images.forEach((imageSrc, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-preview-item';
        
        imageItem.innerHTML = `
            <img src="${imageSrc}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removeEditImage(this)">×</button>
        `;
        
        previewDiv.appendChild(imageItem);
    });
    
    previewContainer.appendChild(previewDiv);
    
    // Ocultar placeholder
    const placeholder = previewContainer.querySelector('.upload-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

// Función global para remover imágenes en el modal de edición
function removeEditImage(button) {
    const imageItem = button.parentElement;
    imageItem.remove();
    
    // Mostrar placeholder si no hay más imágenes
    const previewContainer = document.getElementById('editarImagePreviewContainer');
    const remainingImages = previewContainer.querySelectorAll('.image-preview-item');
    
    if (remainingImages.length === 0) {
        const placeholder = previewContainer.querySelector('.upload-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
}

// ===== NUEVO: Funcionalidad para crear pedido =====
document.addEventListener('DOMContentLoaded', function() {
    // Configurar botón "Nuevo Pedido"
    const btnNuevoPedido = document.querySelector('.btn-nuevo-pedido');
    if (btnNuevoPedido) {
        btnNuevoPedido.addEventListener('click', function() {
            const modal = document.getElementById('modalNuevoPedido');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // Configurar formulario de nuevo pedido
    const formNuevoPedido = document.getElementById('formNuevoPedido');
    if (formNuevoPedido) {
        formNuevoPedido.addEventListener('submit', async function(e) {
            e.preventDefault();
            await crearNuevoPedido();
        });
    }

    // Configurar botón de detalles del producto
    const btnDetallesProducto = document.getElementById('btnDetallesProducto');
    if (btnDetallesProducto) {
        btnDetallesProducto.addEventListener('click', function() {
            const modalDetalles = document.getElementById('modalDetallesProducto');
            if (modalDetalles) {
                modalDetalles.style.display = 'block';
            }
        });
    }

    // Configurar botón guardar detalles
    const btnGuardarDetalles = document.getElementById('guardarDetalles');
    if (btnGuardarDetalles) {
        btnGuardarDetalles.addEventListener('click', function() {
            guardarDetallesProducto();
        });
    }
});

async function crearNuevoPedido() {
    try {
        // Mostrar indicador de carga
        const btnGuardar = document.querySelector('#modalNuevoPedido .btn-guardar');
        const textOriginal = btnGuardar.textContent;
        btnGuardar.textContent = 'Guardando...';
        btnGuardar.disabled = true;

        // Recoger datos del formulario
        const formData = new FormData(document.getElementById('formNuevoPedido'));
        
        // Obtener detalles del producto si fueron guardados
        const detallesProducto = sessionStorage.getItem('detallesProducto');
        let categoriaProducto = '', colores = '', especificaciones = '', imagenUrl = '';
        
        if (detallesProducto) {
            const detalles = JSON.parse(detallesProducto);
            categoriaProducto = detalles.categoria || '';
            colores = detalles.colores || '';
            especificaciones = detalles.especificaciones || '';
            
            // Parsear las URLs de imágenes
            if (detalles.imagenesUrls) {
                try {
                    const imagenesUrls = JSON.parse(detalles.imagenesUrls);
                    imagenUrl = imagenesUrls.length > 0 ? imagenesUrls[0] : '';
                } catch (e) {
                    imagenUrl = '';
                }
            }
        }

        // Construir objeto del pedido con los nombres correctos que espera el backend
        const pedidoData = {
            usuario: (formData.get('clienteNombre') || '').trim(),
            telefono: (formData.get('clienteTelefono') || '').trim(),
            fechaEntrega: (formData.get('fechaEntrega') || '').trim(),
            canalVenta: (formData.get('canalVenta') || '').trim(),
            prioridad: (formData.get('prioridad') || 'normal').trim(),
            observaciones: (formData.get('observaciones') || '').trim(),
            categoriaProducto: categoriaProducto,
            colores: colores,
            especificaciones: especificaciones,
            imagenUrl: imagenUrl
        };

        console.log('Enviando pedido:', pedidoData);

        // Validaciones mínimas en frontend para evitar 400 del backend
        const errores = [];
        const inputFecha = document.getElementById('fechaEntrega');
        if (!pedidoData.fechaEntrega) {
            errores.push('La fecha de entrega es obligatoria.');
            if (inputFecha) inputFecha.focus();
        }
        const inputNombre = document.getElementById('clienteNombre');
        if (!pedidoData.usuario) {
            errores.push('El nombre del cliente es obligatorio.');
            if (inputNombre && !inputFecha) inputNombre.focus();
        }
        const inputTel = document.getElementById('clienteTelefono');
        if (!pedidoData.telefono) {
            errores.push('El teléfono es obligatorio.');
            if (inputTel && !inputFecha && !inputNombre) inputTel.focus();
        }
        const inputCanal = document.getElementById('canalVenta');
        if (!pedidoData.canalVenta) {
            errores.push('El canal de venta es obligatorio.');
            if (inputCanal && !inputFecha && !inputNombre && !inputTel) inputCanal.focus();
        }

        if (errores.length > 0) {
            showNotification(errores[0], 'error');
            // Restaurar botón
            btnGuardar.textContent = textOriginal;
            btnGuardar.disabled = false;
            return;
        }

        // Llamar al API usando PedidosMVC - crear cabecera del pedido
        const response = await PedidosMVC.crearPedido(pedidoData);
        
        console.log('Respuesta del servidor:', response);

        // Intentar crear el detalle (cantidad y precio) si hay datos
        try {
            const idPedido = (response && response.data && response.data.id_pedido_creado) ? response.data.id_pedido_creado : null;
            if (idPedido) {
                // Recuperar datos guardados en detallesProducto
                const detallesProducto = sessionStorage.getItem('detallesProducto');
                let cantidad = 1;
                let precioUnitario = 0;
                let categoriaProducto = '';
                let especificaciones = '';

                let imagenes = [];
                if (detallesProducto) {
                    const d = JSON.parse(detallesProducto);
                    if (d.cantidad) cantidad = parseInt(d.cantidad) || 1;
                    if (d.precioUnitario) precioUnitario = parseFloat(d.precioUnitario) || 0;
                    if (d.categoria) categoriaProducto = String(d.categoria);
                    if (d.especificaciones) especificaciones = String(d.especificaciones);
                    if (d.imagenesUrls) {
                        try {
                            const imgs = JSON.parse(d.imagenesUrls);
                            if (Array.isArray(imgs)) imagenes = imgs;
                        } catch (err) {
                            console.warn('No se pudieron parsear imagenesUrls');
                        }
                    }
                }

                // Construir un nombre/descr. de producto solicitado
                const productoSolicitado = categoriaProducto ? `Personalizado: ${categoriaProducto}` : 'Pedido Personalizado';

                // Preparar payload del detalle
                const detallePersonalizado = {
                    categoria: categoriaProducto,
                    colores: colores,
                    especificaciones: especificaciones,
                    imagenes: imagenes
                };

                const detallePayload = {
                    producto_solicitado: productoSolicitado + (especificaciones ? ` - ${especificaciones.substring(0, 60)}` : ''),
                    cantidad: Math.max(1, cantidad),
                    precio_unitario: Math.max(0, precioUnitario),
                    descuento: 0,
                    impuesto: 0,
                    id_producto: 0, // permitir personalizado sin id_producto
                    detalles_personalizados: JSON.stringify(detallePersonalizado)
                };

                console.log('Creando detalle para pedido', idPedido, detallePayload);
                await PedidosMVC.createDetalle(idPedido, detallePayload)
                    .then(res => console.log('Detalle creado:', res))
                    .catch(err => { console.warn('No se pudo crear el detalle:', err); });
            }
        } catch (e) {
            console.warn('crearNuevoPedido - error creando detalle:', e);
        }

        // Cerrar modal
        const modal = document.getElementById('modalNuevoPedido');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Limpiar formulario y sessionStorage
        document.getElementById('formNuevoPedido').reset();
        sessionStorage.removeItem('detallesProducto');
        sessionStorage.removeItem('imagenesSubidas');

        // Mostrar notificación de éxito
        showNotification('Pedido creado exitosamente', 'success');

    // Recargar la tabla de pedidos (usar la firma correcta)
    await PedidosMVC.init({ tableSelector: '.pedidos-table tbody' });

        // Restaurar botón
        btnGuardar.textContent = textOriginal;
        btnGuardar.disabled = false;

    } catch (error) {
        console.error('Error al crear pedido:', error);
        const serverMsg = (error && error.data && (error.data.message || error.data.error)) ? (': ' + (error.data.message || error.data.error)) : '';
        showNotification('Error al crear el pedido' + serverMsg + ' (' + (error.message || 'Error desconocido') + ')', 'error');
        
        // Restaurar botón
        const btnGuardar = document.querySelector('#modalNuevoPedido .btn-guardar');
        btnGuardar.textContent = 'Guardar Pedido';
        btnGuardar.disabled = false;
    }
}

function guardarDetallesProducto() {
    const categoria = document.getElementById('categoriaProducto').value;
    const color1 = document.getElementById('colorPicker1').value;
    const color2 = document.getElementById('colorPicker2').value;
    const color3 = document.getElementById('colorPicker3').value;
    const especificaciones = document.getElementById('especificaciones').value;
    const cantidad = (document.getElementById('cantidadProducto')?.value || '').trim();
    const precioUnitario = (document.getElementById('precioUnitarioProducto')?.value || '').trim();
    
    // Combinar colores
    const colores = [color1, color2, color3].filter(c => c !== '#000000').join(', ');
    
    // Obtener las URLs de las imágenes subidas (guardadas en el preview)
    const imagenesSubidas = sessionStorage.getItem('imagenesSubidas') || '[]';
    
    // Guardar en sessionStorage
    const detalles = {
        categoria: categoria,
        colores: colores,
        especificaciones: especificaciones,
        imagenesUrls: imagenesSubidas,
        cantidad: cantidad,
        precioUnitario: precioUnitario
    };
    
    sessionStorage.setItem('detallesProducto', JSON.stringify(detalles));
    
    // Actualizar campo de colores en el formulario principal
    const campoColores = document.getElementById('colores');
    if (campoColores) {
        campoColores.value = colores;
    }
    
    // Cerrar modal
    const modal = document.getElementById('modalDetallesProducto');
    modal.style.display = 'none';
    
    showNotification('Detalles guardados correctamente', 'success');
}

// Manejar cambio en el input de archivo para upload de imágenes
document.addEventListener('DOMContentLoaded', function() {
    const imagenInput = document.getElementById('imagenReferencia');
    if (imagenInput) {
        imagenInput.addEventListener('change', async function(e) {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            try {
                // Mostrar indicador de carga
                const previewContainer = document.getElementById('imagePreviewContainer');
                const placeholder = previewContainer.querySelector('.upload-placeholder');
                if (placeholder) {
                    placeholder.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><p>Subiendo imágenes...</p>';
                }
                
                // Subir imágenes al servidor
                const response = await PedidosMVC.uploadMultiple(files);
                
                console.log('Respuesta upload:', response);
                
                if (response && response.data && response.data.uploaded) {
                    const urls = response.data.uploaded.map(img => img.url);
                    
                    // Guardar URLs en sessionStorage
                    sessionStorage.setItem('imagenesSubidas', JSON.stringify(urls));
                    
                    // Mostrar preview
                    mostrarPreviewImagenes(urls, previewContainer);
                    
                    showNotification(`${urls.length} imagen(es) subida(s) correctamente`, 'success');
                } else {
                    throw new Error('Respuesta inválida del servidor');
                }
                
            } catch (error) {
                console.error('Error al subir imágenes:', error);
                showNotification('Error al subir imágenes: ' + error.message, 'error');
                
                // Restaurar placeholder
                const previewContainer = document.getElementById('imagePreviewContainer');
                const placeholder = previewContainer.querySelector('.upload-placeholder');
                if (placeholder) {
                    placeholder.innerHTML = '<i class="fa-solid fa-cloud-upload-alt"></i><p>Arrastra imágenes aquí o haz clic para seleccionar</p>';
                }
            }
        });
    }
});

function mostrarPreviewImagenes(urls, previewContainer) {
    // Limpiar preview anterior
    const existingPreview = previewContainer.querySelector('.image-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Ocultar placeholder
    const placeholder = previewContainer.querySelector('.upload-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // Crear contenedor de preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    previewDiv.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; width: 100%;';
    
    urls.forEach((url, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-preview-item';
        imageItem.style.cssText = 'position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 2px solid rgba(20, 152, 0, 0.3);';
        
        imageItem.innerHTML = `
            <img src="${url}" alt="Preview ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" class="remove-image" onclick="removeUploadedImage(this, '${url}')" style="position: absolute; top: -5px; right: -5px; background-color: #ff6b6b; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
        `;
        
        previewDiv.appendChild(imageItem);
    });
    
    previewContainer.appendChild(previewDiv);
}

// Función para remover imagen subida
window.removeUploadedImage = function(button, url) {
    const imageItem = button.parentElement;
    imageItem.remove();
    
    // Actualizar sessionStorage
    try {
        const imagenesSubidas = JSON.parse(sessionStorage.getItem('imagenesSubidas') || '[]');
        const nuevasImagenes = imagenesSubidas.filter(imgUrl => imgUrl !== url);
        sessionStorage.setItem('imagenesSubidas', JSON.stringify(nuevasImagenes));
    } catch (e) {
        console.error('Error al actualizar imágenes:', e);
    }
    
    // Mostrar placeholder si no hay más imágenes
    const previewContainer = document.getElementById('imagePreviewContainer');
    const remainingImages = previewContainer.querySelectorAll('.image-preview-item');
    
    if (remainingImages.length === 0) {
        const placeholder = previewContainer.querySelector('.upload-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
};
