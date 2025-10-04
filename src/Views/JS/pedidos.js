/**
 * JavaScript para la página de pedidos
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades de pedidos
    initPedidosPage();
});

function initPedidosPage() {
    // Configurar botones de acción
    setupActionButtons();
    
    // Configurar filtros
    setupFilters();
    
    // Configurar búsqueda
    setupSearch();
    
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
    if (icon.classList.contains('fa-eye')) return 'view';
    if (icon.classList.contains('fa-edit')) return 'edit';
    if (icon.classList.contains('fa-trash')) return 'delete';
    return null;
}

function handleAction(action, button) {
    const row = button.closest('tr');
    const pedidoId = row.querySelector('td:first-child').textContent;
    
    switch(action) {
        case 'view':
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
    // Buscar datos del pedido en localStorage o en la tabla
    const pedidoData = getPedidoData(pedidoId);
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
    const row = document.querySelector(`tr:has(td:first-child:contains("${pedidoId}"))`);
    if (row) {
        const cells = row.querySelectorAll('td');
        return {
            id: cells[0].textContent,
            cliente: cells[1].textContent,
            fecha: cells[2].textContent,
            estado: cells[3].querySelector('.status').textContent.toLowerCase(),
            total: cells[4].textContent
        };
    }
    
    return null;
}

function showPedidoDetails(pedidoData) {
    const modal = document.getElementById('modalVerPedido');
    const content = document.getElementById('pedidoDetailsContent');
    
    if (!modal || !content) return;
    
    // Generar HTML con los detalles del pedido
    content.innerHTML = generatePedidoDetailsHTML(pedidoData);
    
    // Configurar event listeners para el modal de detalles
    setupDetailsModal();
    
    // Mostrar modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
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
    if (data.colorPicker1) colors.push(data.colorPicker1);
    if (data.colorPicker2) colors.push(data.colorPicker2);
    if (data.colorPicker3) colors.push(data.colorPicker3);
    
    if (colors.length === 0) return '';
    
    return `
        <div class="detail-item">
            <span class="detail-label">Colores Seleccionados:</span>
            <div class="detail-colors">
                ${colors.map(color => `<div class="detail-color" style="background-color: ${color}"></div>`).join('')}
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
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.btn-cancelar');
    
    closeBtn.addEventListener('click', closeDetailsModal);
    cancelBtn.addEventListener('click', closeDetailsModal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeDetailsModal();
        }
    });
}

function closeDetailsModal() {
    const modal = document.getElementById('modalVerPedido');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function editPedido(pedidoId) {
    alert(`Editar pedido ${pedidoId}`);
    // Aquí se implementaría la lógica para editar
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
    
    // Configurar envío del formulario
    form.addEventListener('submit', handleFormSubmit);
    
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
        <td><span class="status ${estadoClass}">${estado.charAt(0).toUpperCase() + estado.slice(1)}</span></td>
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
