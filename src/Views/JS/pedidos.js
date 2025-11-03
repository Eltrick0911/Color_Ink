// Variables globales para gestión de productos personalizados (modal nuevo pedido)
let productosPersonalizados = [];
let productoActivo = 0;

// Función helper para formatear moneda en lempiras
function formatoLempiras(valor) {
    return 'L ' + Number(valor).toFixed(2);
}

// Función para guardar el producto actual antes de cambiar a otro
function guardarProductoActual() {
    if (!productosPersonalizados[productoActivo]) {
        productosPersonalizados[productoActivo] = {};
    }
    
    const categoriaEl = document.getElementById('categoriaProducto');
    const coloresEl = document.getElementById('colores');
    const especificacionesEl = document.getElementById('especificaciones');
    const cantidadEl = document.getElementById('pdCantidad');
    const precioEl = document.getElementById('pdPrecio');
    const descuentoEl = document.getElementById('pdDescuento');
    const impuestoEl = document.getElementById('pdImpuesto');
    
    productosPersonalizados[productoActivo] = {
        categoria: categoriaEl ? categoriaEl.value : '',
        colores: coloresEl ? coloresEl.value : '',
        especificaciones: especificacionesEl ? especificacionesEl.value : '',
        cantidad: cantidadEl ? Number(cantidadEl.value) : 1,
        precio: precioEl ? Number(precioEl.value) : 0,
        descuento: descuentoEl ? Number(descuentoEl.value) : 0,
        impuesto: impuestoEl ? Number(impuestoEl.value) : 0,
        imagenesUrls: productosPersonalizados[productoActivo]?.imagenesUrls || ''
    };
}

// Función para actualizar el preview del total del producto en el modal
function updatePdTotalPreview() {
    const cantidadEl = document.getElementById('pdCantidad');
    const precioEl = document.getElementById('pdPrecio');
    const descuentoEl = document.getElementById('pdDescuento');
    const impuestoEl = document.getElementById('pdImpuesto');
    
    if (!cantidadEl || !precioEl) return;
    
    const cantidad = Number(cantidadEl.value) || 0;
    const precio = Number(precioEl.value) || 0;
    const descuento = Number(descuentoEl?.value) || 0;
    const impuesto = Number(impuestoEl?.value) || 0;
    
    let subtotal = cantidad * precio;
    const montoDescuento = subtotal * (descuento / 100);
    subtotal = subtotal - montoDescuento;
    const montoImpuesto = subtotal * (impuesto / 100);
    const total = subtotal + montoImpuesto;
    
    // Mostrar el total en el modal de detalles del producto
    const totalPreview = document.getElementById('pdTotalPreview');
    if (totalPreview) {
        totalPreview.textContent = formatoLempiras(total);
    }
}

// Inicialización principal: configurar acciones y selectores cuando cargue el DOM
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Configurar UI de pedidos
        setupActionButtons();
        setupFilters();
        setupSearch();
        setupStatusSelectors();
        setupDetailsModal(); // Configurar modal de detalles
    setupEditColorPickers(); // Configurar color pickers del modal de edición
        
        // Configurar botón "Nuevo Pedido"
        const btnNuevoPedido = document.querySelector('.btn-nuevo-pedido');
        console.log('Botón Nuevo Pedido encontrado:', btnNuevoPedido);
        if (btnNuevoPedido) {
            btnNuevoPedido.addEventListener('click', function() {
                console.log('Click en botón Nuevo Pedido');
                openModal();
            });
        } else {
            console.error('No se encontró el botón .btn-nuevo-pedido');
        }
        
        // Configurar modal de nuevo pedido
        setupModal();
        
        // Configurar modal de detalles del producto
        setupProductDetailsModal();
        
        // Configurar formulario de nuevo pedido
        const formNuevoPedido = document.getElementById('formNuevoPedido');
        if (formNuevoPedido) {
            formNuevoPedido.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Submit del formulario nuevo pedido disparado');
                await crearNuevoPedido();
            });
            console.log('Listener de submit configurado para formNuevoPedido');
        } else {
            console.error('No se encontró el formulario #formNuevoPedido');
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
        
        // Configurar upload de imágenes
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
    } catch (e) {
        console.error('Error inicializando página de pedidos:', e);
    }

    // Reconfigurar cuando la tabla se renderice de nuevo
    document.addEventListener('pedidos:rendered', function() {
        try {
            // Usar setTimeout para asegurar que las funciones estén disponibles
            setTimeout(() => {
                if (typeof setupStatusSelectors === 'function') {
                    setupStatusSelectors();
                } else {
                    console.warn('setupStatusSelectors no está definida aún');
                }
                if (typeof setupActionButtons === 'function') {
                    setupActionButtons();
                } else {
                    console.warn('setupActionButtons no está definida aún');
                }
            }, 0);
        } catch (e) {
            console.error('Error reconfigurando tras render:', e);
        }
    });
});

// ===== FUNCIONES DE INICIALIZACIÓN =====
// Estas funciones se llaman en DOMContentLoaded y deben estar disponibles inmediatamente

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

function setupDetailsModal() {
    const modal = document.getElementById('modalVerPedido');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.btn-cancelar');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

function setupEditColorPickers() {
    const editColorPickers = [
        { picker: 'editarColorPicker1', name: 'editarColorName1' },
        { picker: 'editarColorPicker2', name: 'editarColorName2' },
        { picker: 'editarColorPicker3', name: 'editarColorName3' }
    ];
    
    editColorPickers.forEach(({picker, name}) => {
        const pickerElement = document.getElementById(picker);
        const nameElement = document.getElementById(name);
        
        if (pickerElement && nameElement) {
            pickerElement.addEventListener('input', function() {
                nameElement.textContent = this.value;
                updateEditColorsField();
            });
        }
    });
    
    // Botón limpiar colores
    const btnLimpiar = document.querySelector('#modalEditarPedido .btn-limpiar-colores');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            editColorPickers.forEach(({picker, name}) => {
                const pickerElement = document.getElementById(picker);
                const nameElement = document.getElementById(name);
                if (pickerElement) pickerElement.value = '#000000';
                if (nameElement) nameElement.textContent = `Color ${picker.slice(-1)}`;
            });
            document.getElementById('editarColores').value = '';
        });
    }
}

function updateEditColorsField() {
    const colors = [];
    const pickerIds = ['editarColorPicker1', 'editarColorPicker2', 'editarColorPicker3'];
    
    pickerIds.forEach(id => {
        const picker = document.getElementById(id);
        if (picker && picker.value && picker.value !== '#000000') {
            colors.push(picker.value);
        }
    });
    
    document.getElementById('editarColores').value = colors.join(', ');
}

function setupModal() {
    modal = document.getElementById('modalNuevoPedido');
    form = document.getElementById('formNuevoPedido');
    
    if (!modal || !form) {
        console.error('setupModal: No se encontró el modal o el formulario', { modal, form });
        return;
    }
    
    console.log('setupModal: Modal y formulario encontrados correctamente');
    
    // Configurar botones de cerrar
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.btn-cancelar');
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
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
    
    // Los productos múltiples ahora se gestionan dentro del modal de Personalizado
}

function openModal() {
    console.log('openModal llamado, modal:', modal);
    if (!modal) {
        console.error('openModal: modal es null, intentando obtenerlo nuevamente');
        modal = document.getElementById('modalNuevoPedido');
    }
    
    if (modal) {
        console.log('openModal: Abriendo modal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        
        // Limpiar productos y resumen
        productosPersonalizados = [];
        productoActivo = 0;
        sessionStorage.removeItem('detalles_productos');
        sessionStorage.removeItem('observaciones');
        
        // Ocultar resumen de totales
        const resumenContainer = document.getElementById('resumenTotalesNuevoPedido');
        if (resumenContainer) {
            resumenContainer.style.display = 'none';
        }
        
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

function setupProductDetailsModal() {
    productDetailsModal = document.getElementById('modalDetallesProducto');
    productDetailsForm = document.getElementById('formDetallesProducto');
    if (!productDetailsModal || !productDetailsForm) return;

    // Botón para abrir modal
    const btnDetalles = document.getElementById('btnDetallesProducto');
    if (btnDetalles) {
        btnDetalles.addEventListener('click', openProductDetailsModal);
    }

    // Botones de cerrar
    const closeBtn = productDetailsModal.querySelector('.close');
    const cancelBtn = productDetailsModal.querySelector('.btn-cancelar');
    const guardarBtn = document.getElementById('guardarDetalles');
    if (closeBtn) closeBtn.addEventListener('click', closeProductDetailsModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeProductDetailsModal);
    
    // Botón guardar detalles
    if (guardarBtn) {
        guardarBtn.addEventListener('click', function() {
            console.log('Click en guardar detalles');
            guardarDetallesProducto();
        });
    } else {
        console.error('No se encontró el botón #guardarDetalles');
    }

    // Cerrar modal al hacer clic fuera de él
    productDetailsModal.addEventListener('click', function(e) {
        if (e.target === productDetailsModal) closeProductDetailsModal();
    });

    // Validación y funcionalidades
    setupProductDetailsValidation();
    setupProductDetailsImageUpload();
    setupProductDetailsColorPickers();

    // Configuración de total simple
    ['pdCantidad','pdPrecio','pdDescuento','pdImpuesto'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePdTotalPreview);
    });
    updatePdTotalPreview();
}

function productoVacio() {
    return {
        categoria: '', colores: '', especificaciones: '', imagenesUrls: '[]', cantidad: 1, precio: 0, descuento: 0, impuesto: 0
    };
}

function renderProductosNav() {
    const nav = document.getElementById('productosNav');
    if (!nav) return;
    
    nav.innerHTML = '';
    
    // Botones de productos numerados
    productosPersonalizados.forEach((prod, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-producto-nav';
        btn.textContent = (idx + 1);
        btn.style = 'padding: 4px 10px; border-radius: 50%; margin-right: 2px; border: 1px solid #ccc; cursor: pointer;';
        if (idx === productoActivo) {
            btn.style.background = '#b2f2e6';
            btn.style.fontWeight = 'bold';
        }
        btn.onclick = () => {
            guardarProductoActual();
            productoActivo = idx;
            cargarProductoEnFormulario(idx);
            renderProductosNav();
        };
        nav.appendChild(btn);
    });
    
    // Botón + para agregar
    const btnAdd = document.createElement('button');
    btnAdd.type = 'button';
    btnAdd.className = 'btn-add-producto';
    btnAdd.title = 'Agregar producto';
    btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i>';
    btnAdd.style = 'font-size:1.2em; padding:0 10px; border-radius:50%; background:#e0e0e0; border:none; margin-left:4px; cursor: pointer;';
    btnAdd.onclick = () => {
        guardarProductoActual();
        productosPersonalizados.push(productoVacio());
        productoActivo = productosPersonalizados.length - 1;
        cargarProductoEnFormulario(productoActivo);
        renderProductosNav();
    };
    nav.appendChild(btnAdd);
}

function cargarProductoEnFormulario(idx) {
    const prod = productosPersonalizados[idx] || productoVacio();
    document.getElementById('categoriaProducto').value = prod.categoria || '';
    document.getElementById('colores').value = prod.colores || '';
    document.getElementById('especificaciones').value = prod.especificaciones || '';
    document.getElementById('pdCantidad').value = prod.cantidad || 1;
    document.getElementById('pdPrecio').value = prod.precio || 0;
    document.getElementById('pdDescuento').value = prod.descuento || 0;
    document.getElementById('pdImpuesto').value = prod.impuesto || 0;
    updatePdTotalPreview();
    // Colores y preview imágenes pueden mejorarse aquí
}

function openProductDetailsModal() {
    // Si hay datos temporales en sessionStorage (vienen desde el modal de edición), cargarlos
    try {
        const ss = sessionStorage.getItem('detalles_productos');
        if (ss) {
            const parsed = JSON.parse(ss);
            if (Array.isArray(parsed) && parsed.length > 0) {
                productosPersonalizados = parsed;
                productoActivo = 0;
            }
        }
    } catch (e) {
        console.warn('No se pudieron cargar productos desde sessionStorage:', e);
    }

    if (!productosPersonalizados.length) {
        productosPersonalizados = [productoVacio()];
        productoActivo = 0;
    }
    cargarProductoEnFormulario(productoActivo);
    renderProductosNav();
    if (productDetailsModal) {
        productDetailsModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        // Enfocar el primer campo
        const firstInput = productDetailsForm.querySelector('input[required]');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
}

function closeProductDetailsModal() {
    if (productDetailsModal) {
        productDetailsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function guardarDetallesProducto() {
    guardarProductoActual();
    // Guardar en sessionStorage
    sessionStorage.setItem('detalles_productos', JSON.stringify(productosPersonalizados));
    // Guardar la cantidad total en observaciones (puedes ajustar esto según tu backend)
    sessionStorage.setItem('observaciones', productosPersonalizados.length);
    // Actualizar campos de totales en el modal de edición (si está abierto)
    try {
        actualizarCamposTotalesEnEdicion();
    } catch (e) {}
    
    // Actualizar resumen de totales en modal de nuevo pedido
    actualizarResumenNuevoPedido();

    closeProductDetailsModal();
    showNotification('Detalles de productos guardados', 'success');
}

// Función para actualizar el resumen de totales en el modal de nuevo pedido
function actualizarResumenNuevoPedido() {
    const resumenContainer = document.getElementById('resumenTotalesNuevoPedido');
    if (!resumenContainer) return;
    
    const productos = productosPersonalizados || [];
    
    if (productos.length === 0) {
        resumenContainer.style.display = 'none';
        return;
    }
    
    // Mostrar el resumen
    resumenContainer.style.display = 'block';
    
    // Calcular totales - cada producto con su propio descuento e impuesto
    let cantidadTotal = 0;
    let subtotalSinDescuentos = 0;
    let totalDescuentos = 0;
    let totalImpuestos = 0;
    let totalGeneral = 0;
    
    productos.forEach(prod => {
        const cantidad = Number(prod.cantidad || 0);
        const precio = Number(prod.precio || 0);
        const descuento = Number(prod.descuento || 0);
        const impuesto = Number(prod.impuesto || 0);
        
        cantidadTotal += cantidad;
        
        // Subtotal del producto
        let subtotalProducto = cantidad * precio;
        subtotalSinDescuentos += subtotalProducto;
        
        // Aplicar descuento del producto
        const montoDescuentoProducto = subtotalProducto * (descuento / 100);
        totalDescuentos += montoDescuentoProducto;
        subtotalProducto = subtotalProducto - montoDescuentoProducto;
        
        // Aplicar impuesto del producto
        const montoImpuestoProducto = subtotalProducto * (impuesto / 100);
        totalImpuestos += montoImpuestoProducto;
        
        // Total del producto
        totalGeneral += subtotalProducto + montoImpuestoProducto;
    });
    
    // Calcular porcentajes promedio para mostrar (solo visual)
    const descuentoPromedio = subtotalSinDescuentos > 0 ? (totalDescuentos / subtotalSinDescuentos * 100) : 0;
    const subtotalConDescuento = subtotalSinDescuentos - totalDescuentos;
    const impuestoPromedio = subtotalConDescuento > 0 ? (totalImpuestos / subtotalConDescuento * 100) : 0;
    
    // Actualizar los valores en el DOM
    document.getElementById('resumenCantidadProductos').textContent = productos.length;
    document.getElementById('resumenCantidadTotal').textContent = cantidadTotal;
    document.getElementById('resumenSubtotal').textContent = formatoLempiras(subtotalSinDescuentos);
    document.getElementById('resumenPorcentajeDescuento').textContent = descuentoPromedio.toFixed(1);
    document.getElementById('resumenMontoDescuento').textContent = formatoLempiras(totalDescuentos);
    document.getElementById('resumenPorcentajeImpuesto').textContent = impuestoPromedio.toFixed(1);
    document.getElementById('resumenMontoImpuesto').textContent = formatoLempiras(totalImpuestos);
    document.getElementById('resumenTotalGeneral').textContent = formatoLempiras(totalGeneral);
}

// Función para crear nuevo pedido
async function crearNuevoPedido() {
    console.log('Creando nuevo pedido...');
    
    try {
        // Obtener productos desde sessionStorage
        const detallesProductos = JSON.parse(sessionStorage.getItem('detalles_productos') || '[]');
        
        if (detallesProductos.length === 0) {
            showNotification('Debe agregar al menos un producto usando el botón "Personalizado"', 'warning');
            return;
        }
        
        // Calcular totales - cada producto con su propio descuento e impuesto
        let totalCantidad = 0;
        let subtotalSinDescuentos = 0;
        let totalDescuentos = 0;
        let totalImpuestos = 0;
        let totalGeneral = 0;
        
        detallesProductos.forEach(prod => {
            const cantidad = Number(prod.cantidad || 0);
            const precio = Number(prod.precio || 0);
            const descuento = Number(prod.descuento || 0);
            const impuesto = Number(prod.impuesto || 0);
            
            totalCantidad += cantidad;
            
            // Subtotal del producto
            let subtotalProducto = cantidad * precio;
            subtotalSinDescuentos += subtotalProducto;
            
            // Aplicar descuento del producto
            const montoDescuentoProducto = subtotalProducto * (descuento / 100);
            totalDescuentos += montoDescuentoProducto;
            subtotalProducto = subtotalProducto - montoDescuentoProducto;
            
            // Aplicar impuesto del producto
            const montoImpuestoProducto = subtotalProducto * (impuesto / 100);
            totalImpuestos += montoImpuestoProducto;
            
            // Total del producto
            totalGeneral += subtotalProducto + montoImpuestoProducto;
        });
        
        // Calcular porcentajes promedio (solo para referencia)
        const descuentoPromedio = subtotalSinDescuentos > 0 ? (totalDescuentos / subtotalSinDescuentos * 100) : 0;
        const subtotalConDescuento = subtotalSinDescuentos - totalDescuentos;
        const impuestoPromedio = subtotalConDescuento > 0 ? (totalImpuestos / subtotalConDescuento * 100) : 0;
        
        // Recopilar datos del formulario
        const pedidoData = {
            clienteNombre: document.getElementById('clienteNombre').value,
            clienteTelefono: document.getElementById('clienteTelefono').value,
            fechaEntrega: document.getElementById('fechaEntrega').value,
            canalVenta: document.getElementById('canalVenta').value,
            prioridad: document.getElementById('prioridad').value,
            observaciones: detallesProductos.length + ' producto(s)',
            detalles_producto: JSON.stringify(detallesProductos),
            cantidad: totalCantidad,
            precio_unitario: Number((subtotalSinDescuentos / (totalCantidad || 1)).toFixed(2)), // Precio unitario promedio
            precio: Number(totalGeneral.toFixed(2)), // Total general
            descuento: descuentoPromedio,
            impuesto: impuestoPromedio
        };
        
        console.log('Datos del nuevo pedido:', pedidoData);
        
        // Crear pedido
        const response = await PedidosMVC.crearPedido(pedidoData);
        
        console.log('Respuesta completa del servidor:', response);
        
        // Validar diferentes formatos de respuesta exitosa
        const isSuccess = response && (
            response.status === 'success' || 
            response.status === 'OK' || 
            (response.message && response.message.includes('exitosamente'))
        );
        
        if (isSuccess) {
            showNotification('Pedido creado exitosamente', 'success');
            
            // Cerrar modal
            closeModal();
            
            // Limpiar sessionStorage
            sessionStorage.removeItem('detalles_productos');
            sessionStorage.removeItem('observaciones');
            
            // Limpiar formulario
            document.getElementById('formNuevoPedido').reset();
            
            // Refrescar tabla
            await PedidosMVC.init({ tableSelector: '.pedidos-table tbody' });
        } else {
            throw new Error(response?.message || 'Error al crear pedido');
        }
        
    } catch (error) {
        console.error('Error al crear pedido:', error);
        showNotification('Error al crear el pedido: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Actualiza los campos visibles del modal de edición con los totales calculados
function actualizarCamposTotalesEnEdicion() {
    try {
        const detallesProductos = JSON.parse(sessionStorage.getItem('detalles_productos') || '[]');
        if (!Array.isArray(detallesProductos) || detallesProductos.length === 0) return;

        // Calcular totales - cada producto con su propio descuento e impuesto
        let totalCantidad = 0;
        let subtotalSinDescuentos = 0;
        let totalDescuentos = 0;
        let totalImpuestos = 0;
        let totalGeneral = 0;
        
        detallesProductos.forEach(prod => {
            const cantidad = Number(prod.cantidad || 0);
            const precio = Number(prod.precio || 0);
            const descuento = Number(prod.descuento || 0);
            const impuesto = Number(prod.impuesto || 0);
            
            totalCantidad += cantidad;
            
            // Subtotal del producto
            let subtotalProducto = cantidad * precio;
            subtotalSinDescuentos += subtotalProducto;
            
            // Aplicar descuento del producto
            const montoDescuentoProducto = subtotalProducto * (descuento / 100);
            totalDescuentos += montoDescuentoProducto;
            subtotalProducto = subtotalProducto - montoDescuentoProducto;
            
            // Aplicar impuesto del producto
            const montoImpuestoProducto = subtotalProducto * (impuesto / 100);
            totalImpuestos += montoImpuestoProducto;
            
            // Total del producto
            totalGeneral += subtotalProducto + montoImpuestoProducto;
        });

        // Calcular porcentajes promedio
        const descuentoPromedio = subtotalSinDescuentos > 0 ? (totalDescuentos / subtotalSinDescuentos * 100) : 0;
        const subtotalConDescuento = subtotalSinDescuentos - totalDescuentos;
        const impuestoPromedio = subtotalConDescuento > 0 ? (totalImpuestos / subtotalConDescuento * 100) : 0;

        // Actualizar inputs del modal de edición si existen
        const inpCantidad = document.getElementById('editarCantidad');
        const inpPrecio = document.getElementById('editarPrecioUnitario');
        const inpDescuento = document.getElementById('editarDescuento');
        const inpImpuesto = document.getElementById('editarImpuesto');

        if (inpCantidad) inpCantidad.value = totalCantidad;
        if (inpPrecio) inpPrecio.value = Number(totalGeneral.toFixed(2));
        if (inpDescuento) inpDescuento.value = descuentoPromedio.toFixed(2);
        if (inpImpuesto) inpImpuesto.value = impuestoPromedio.toFixed(2);
    } catch (e) {
        console.error('Error actualizando campos de totales en edición:', e);
    }
}

// ===== FIN FUNCIONES DE INICIALIZACIÓN =====

// ===== FUNCIONES CRÍTICAS PARA ACCIONES DE BOTONES =====

function getActionFromIcon(icon) {
    if (!icon) return null;
    
    const classList = icon.classList;
    if (classList.contains('fa-eye')) return 'view';
    if (classList.contains('fa-edit')) return 'edit';
    if (classList.contains('fa-trash')) return 'delete';
    
    return null;
}

function handleAction(action, pedidoId, row) {
    console.log(`Ejecutando acción: ${action} para pedido ${pedidoId}`);
    
    switch(action) {
        case 'view':
            viewPedido(pedidoId, row);
            break;
        case 'edit':
            editPedido(pedidoId);
            break;
        case 'delete':
            deletePedido(pedidoId, row);
            break;
        default:
            console.warn('Acción no reconocida:', action);
    }
}

async function viewPedido(pedidoId, row) {
    console.log('Mostrando detalles del pedido:', pedidoId);
    
    try {
        // Obtener datos completos desde la API
        const pedidoRes = await PedidosMVC.fetchOne(pedidoId);
        const detallesRes = await PedidosMVC.fetchDetalle(pedidoId);
        
        console.log('Respuesta del pedido:', pedidoRes);
        console.log('Respuesta del detalle:', detallesRes);
        
        if (!pedidoRes || !pedidoRes.data) {
            showNotification('No se pudieron cargar los detalles del pedido', 'error');
            return;
        }
        
        // La API devuelve un array, necesitamos encontrar el pedido específico
        let data = null;
        if (Array.isArray(pedidoRes.data)) {
            data = pedidoRes.data.find(p => p.id_pedido == pedidoId);
        } else {
            data = pedidoRes.data;
        }
        
        if (!data) {
            showNotification('No se encontró el pedido solicitado', 'error');
            return;
        }
        
        // Lo mismo para el detalle
        let detalle = null;
        if (detallesRes && detallesRes.data) {
            if (Array.isArray(detallesRes.data)) {
                detalle = detallesRes.data.find(d => d.id_pedido == pedidoId);
            } else {
                detalle = detallesRes.data;
            }
        }
        
        console.log('Pedido encontrado:', data);
        console.log('Detalle encontrado:', detalle);
        
        // Parsear detalles_producto (JSON en la tabla pedido)
        let detallesProducto = null;
        if (data.detalles_producto) {
            try {
                detallesProducto = typeof data.detalles_producto === 'string' 
                    ? JSON.parse(data.detalles_producto) 
                    : data.detalles_producto;
                console.log('Detalles producto parseados:', detallesProducto);
            } catch (e) {
                console.warn('Error al parsear detalles_producto:', e);
            }
        }
        
        // Parsear detalles_personalizados (JSON en la tabla detallepedido)
        let detallesPersonalizados = null;
        if (detalle && detalle.detalles_personalizados) {
            try {
                detallesPersonalizados = typeof detalle.detalles_personalizados === 'string' 
                    ? JSON.parse(detalle.detalles_personalizados) 
                    : detalle.detalles_personalizados;
                console.log('Detalles personalizados parseados:', detallesPersonalizados);
            } catch (e) {
                console.warn('Error al parsear detalles_personalizados:', e);
            }
        }
        
        // Construir objeto con datos completos
        const pedidoData = {
            id: data.id_pedido || pedidoId,
            numeroPedido: data.numero_pedido || '',
            cliente: data.cliente_nombre || 'Sin nombre',
            telefono: data.cliente_telefono || 'No especificado',
            email: data.email || 'No especificado',
            fecha: data.fecha_pedido || '',
            fechaEntrega: data.fecha_entrega || 'No especificada',
            estado: data.estado_codigo || data.id_estado || 'PROCESO',
            estadoNombre: data.estado_nombre || 'En Proceso',
            prioridad: data.prioridad || 'normal',
            canalVenta: data.canal_venta || 'No especificado',
            observaciones: data.observaciones || '',
            direccion: data.direccion || 'No especificada',
            
            // Datos del detalle
            cantidad: detalle ? detalle.cantidad : 1,
            precioUnitario: detalle ? parseFloat(detalle.precio_unitario) : 0,
            total: detalle ? (detalle.total_linea !== undefined && detalle.total_linea !== null ? parseFloat(detalle.total_linea).toFixed(2) : (parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario)).toFixed(2)) : '0.00',
            
            // *** IMPORTANTE: Pasar detalles_producto completo (array de productos) ***
            detalles_producto: detallesProducto || null,
            
            // Datos de detalles_producto (de la tabla pedido) - compatibilidad con vista antigua
            categoriaProducto: detallesProducto?.categoria || 'No especificado',
            colores: detallesProducto?.colores || 'No especificado',
            imagenes: detallesProducto?.imagenes || [],
            
            // Especificaciones desde observaciones de la tabla pedido
            especificaciones: data.observaciones || 'No especificadas'
        };
        
        // Si hay detalles personalizados, sobrescribir con esos valores
        if (detallesPersonalizados) {
            if (detallesPersonalizados.categoria) pedidoData.categoriaProducto = detallesPersonalizados.categoria;
            if (detallesPersonalizados.colores) pedidoData.colores = detallesPersonalizados.colores;
            if (detallesPersonalizados.imagenes) pedidoData.imagenes = detallesPersonalizados.imagenes;
        }
        
        console.log('Datos finales a mostrar:', pedidoData);
        console.log('detalles_producto:', pedidoData.detalles_producto);
        
        // Mostrar modal con los detalles
        showPedidoDetails(pedidoData);
    } catch (error) {
        console.error('Error al cargar detalles del pedido:', error);
        showNotification('Error al cargar los detalles del pedido', 'error');
    }
}

async function editPedido(pedidoId) {
    console.log('Editando pedido:', pedidoId);
    
    try {
        // Obtener datos completos desde la API
        const pedidoRes = await PedidosMVC.fetchOne(pedidoId);
        
        console.log('Respuesta del pedido para editar:', pedidoRes);
        
        if (!pedidoRes || !pedidoRes.data) {
            showNotification('No se pudieron cargar los datos del pedido', 'error');
            return;
        }
        
        // La API devuelve un array, necesitamos encontrar el pedido específico
        let data = null;
        if (Array.isArray(pedidoRes.data)) {
            data = pedidoRes.data.find(p => p.id_pedido == pedidoId);
        } else {
            data = pedidoRes.data;
        }
        
        if (!data) {
            showNotification('No se encontró el pedido solicitado', 'error');
            return;
        }
        
        // Obtener el detalle directamente del pedido (getPedidoById incluye 'detalles')
        let detalle = null;
        if (data && data.detalles) {
            if (Array.isArray(data.detalles) && data.detalles.length > 0) {
                detalle = data.detalles[0];
            } else if (typeof data.detalles === 'object') {
                detalle = data.detalles; // por si viene como objeto
            }
        }
        
        console.log('Pedido para editar:', data);
        console.log('Detalle para editar:', detalle);
        
        // Parsear detalles_producto (JSON en la tabla pedido - ARRAY de productos)
        let detallesProducto = [];
        if (data.detalles_producto) {
            console.log('detalles_producto RAW:', data.detalles_producto);
            console.log('Tipo de detalles_producto:', typeof data.detalles_producto);
            try {
                const parsed = typeof data.detalles_producto === 'string' 
                    ? JSON.parse(data.detalles_producto) 
                    : data.detalles_producto;
                // Asegurarse de que sea un array
                detallesProducto = Array.isArray(parsed) ? parsed : [parsed];
                console.log('detalles_producto PARSEADO:', detallesProducto);
                console.log('Cantidad de productos:', detallesProducto.length);
            } catch (e) {
                console.warn('Error al parsear detalles_producto:', e);
                detallesProducto = [];
            }
        } else {
            console.warn('NO HAY detalles_producto en data');
        }
        
        // Construir objeto con datos completos
        const pedidoData = {
            id: data.id_pedido || pedidoId,
            numeroPedido: data.numero_pedido || '',
            cliente: data.cliente_nombre || '',
            telefono: data.cliente_telefono || '',
            fecha: data.fecha_pedido || '',
            // Manejar diferentes formatos de fecha
            fechaEntrega: (() => {
                if (!data.fecha_entrega) return '';
                // Si tiene espacio, dividir por espacio (formato: 2025-10-27 00:00:00)
                if (data.fecha_entrega.includes(' ')) {
                    return data.fecha_entrega.split(' ')[0];
                }
                // Si tiene T, dividir por T (formato ISO: 2025-10-27T00:00:00)
                if (data.fecha_entrega.includes('T')) {
                    return data.fecha_entrega.split('T')[0];
                }
                // Si ya está en formato YYYY-MM-DD, devolverlo tal cual
                return data.fecha_entrega;
            })(),
            estado: data.estado_codigo || data.id_estado || 'PROCESO',
            estadoNombre: data.estado_nombre || 'En Proceso',
            prioridad: data.prioridad || 'normal',
            canalVenta: data.canal_venta || '',
            observaciones: data.observaciones || '',
            
            // Datos del detalle de detallepedido (totales globales)
            cantidad: detalle ? parseInt(detalle.cantidad) : 0,
            precioUnitario: detalle ? parseFloat(detalle.precio_unitario) : 0,
            descuento: detalle ? parseFloat(detalle.descuento || 0) : 0,
            impuesto: detalle ? parseFloat(detalle.impuesto || 0) : 0,
            idDetalle: detalle ? (detalle.id_detalle || detalle.id || null) : null,
            
            // Array de productos del pedido
            productos: detallesProducto,
            
            // Especificaciones desde observaciones
            especificaciones: data.observaciones || ''
        };
        
        console.log('Datos finales para edición:', pedidoData);
        
        // Mostrar modal de edición con los datos
        showEditPedidoModal(pedidoData);
    } catch (error) {
        console.error('Error al cargar datos para edición:', error);
        showNotification('Error al cargar los datos del pedido', 'error');
    }
}

// ===== FIN FUNCIONES CRÍTICAS PARA ACCIONES =====

// ===== FUNCIONES CRÍTICAS PARA RECONFIGURACIÓN =====
// Estas funciones deben estar disponibles inmediatamente

// Configurar botones de acción en tabla
function setupActionButtons() {
    console.log('Configurando botones de acción de tabla...');
    const actionButtons = document.querySelectorAll('.pedidos-table .btn-action');
    console.log(`Encontrados ${actionButtons.length} botones de acción`);
    
    actionButtons.forEach(button => {
        // Remover listeners existentes clonando el botón
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const icon = this.querySelector('i');
            const action = getActionFromIcon(icon);
            const row = this.closest('tr');
            const pedidoId = this.dataset.id || row.querySelector('.pedido-id')?.textContent?.trim() || null;
            
            console.log('Botón clickeado - Acción:', action, 'ID:', pedidoId);
            
            if (!pedidoId) {
                console.error('No se pudo obtener ID del pedido desde la fila');
                return;
            }
            
            handleAction(action, pedidoId, row);
        });
    });
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
                    
                    // Recargar la tabla
                    if (typeof PedidosMVC !== 'undefined') {
                        PedidosMVC.loadAll();
                    }
                } else {
                    throw new Error(data.message || 'Error al cambiar el estado');
                }
            } catch (error) {
                console.error('Error cambiando estado:', error);
                showNotification('Error al cambiar el estado del pedido', 'error');
                // Revertir el selector
                this.value = estadoAnterior;
            } finally {
                this.disabled = false;
            }
        });
    });
}

function updateSelectorStyle(selector, estadoId) {
    // Remover clases de estado anteriores
    selector.classList.remove('estado-pendiente', 'estado-proceso', 'estado-completado', 'estado-cancelado');
    
    // Agregar clase según el nuevo estado
    switch(parseInt(estadoId)) {
        case 1: // Pendiente
            selector.classList.add('estado-pendiente');
            break;
        case 2: // En proceso
            selector.classList.add('estado-proceso');
            break;
        case 3: // Completado
            selector.classList.add('estado-completado');
            break;
        case 4: // Cancelado
            selector.classList.add('estado-cancelado');
            break;
    }
}

// ===== FIN FUNCIONES CRÍTICAS =====

// Mostrar modal de edición con diseño similar al de vista
function showEditPedidoModal(pedido) {
    console.log('=== INICIANDO EDICIÓN DE PEDIDO ===');
    console.log('Datos completos del pedido:', pedido);
    
    const modal = document.getElementById('modalEditarPedido');
    const form = document.getElementById('formEditarPedido');
    const pedidoIdDisplay = document.getElementById('editarPedidoIdDisplay');
    
    if (!modal || !form) {
        console.error('Modal de edición no encontrado');
        return;
    }
    
    // Actualizar título con número de pedido
    if (pedidoIdDisplay) {
        pedidoIdDisplay.textContent = `#${pedido.numeroPedido || pedido.id}`;
    }
    
    // Llenar los campos del formulario con validación
    const setInputValue = (id, value) => {
        const input = document.getElementById(id);
        if (input) {
            input.value = value || '';
            console.log(`${id}: "${value}"`);
        } else {
            console.warn(`Input ${id} no encontrado`);
        }
    };
    
    console.log('--- LLENANDO FORMULARIO ---');
    setInputValue('editarUsuario', pedido.cliente);
    setInputValue('editarTelefono', pedido.telefono);
    setInputValue('editarFechaEntrega', pedido.fechaEntrega);
    setInputValue('editarCanalVenta', pedido.canalVenta);
    setInputValue('editarPrioridad', pedido.prioridad);
    
    // No ocultamos los campos del formulario: mantendremos la misma UI que 'Nuevo Pedido'
    
    // Cargar array de productos en sessionStorage para edición multi-producto
    const productosArray = Array.isArray(pedido.productos) && pedido.productos.length > 0 
        ? pedido.productos 
        : [];
    
    sessionStorage.setItem('detalles_productos', JSON.stringify(productosArray));
    console.log('Productos cargados en sessionStorage:', productosArray);
    
    // Renderizar la tabla de productos editables
    renderTablaProductosEditables();
    
    // Actualizar los campos de totales en el modal de edición con los datos cargados
    try {
        actualizarCamposTotalesEnEdicion();
    } catch (e) {
        console.warn('No se pudo actualizar campos de totales en edición:', e);
    }
    
    // Marcar que estamos en modo edición
    window.currentEditPedidoId = pedido.id;
    
    // Mostrar el modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Configurar botones de cerrar
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.btn-cancelar');
    
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            sessionStorage.removeItem('detalles_productos');
        };
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = function() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            sessionStorage.removeItem('detalles_productos');
        };
    }
    
    // Cerrar al hacer clic fuera del modal
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            sessionStorage.removeItem('detalles_productos');
        }
    };
    
    // Configurar el botón de guardar
    const btnGuardar = document.getElementById('btnGuardarEdicion');
    if (btnGuardar) {
        // Remover listeners anteriores clonando el botón
        const newBtnGuardar = btnGuardar.cloneNode(true);
        btnGuardar.parentNode.replaceChild(newBtnGuardar, btnGuardar);
        
        // Agregar el nuevo listener
        newBtnGuardar.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Botón guardar clickeado');
            await guardarEdicionPedido(pedido.id, pedido.idDetalle);
        });
        
        console.log('Listener de guardar configurado correctamente');
    } else {
        console.error('No se encontró el botón btnGuardarEdicion');
    }
    
    console.log('Modal de edición mostrado');

    // Botón para abrir modal personalizado en edición (ahora muestra todos los productos)
    const btnEditarPersonalizado = document.getElementById('btnEditarPersonalizado');
    if (btnEditarPersonalizado) {
        btnEditarPersonalizado.onclick = function() {
            openProductDetailsModal();
        };
    }
}

// Guardar los cambios del pedido editado
async function guardarEdicionPedido(pedidoId, detalleId) {
    console.log('Guardando cambios del pedido:', pedidoId);
    
    try {
        // Mostrar indicador de carga
        const btnGuardar = document.getElementById('btnGuardarEdicion');
        const textOriginal = btnGuardar.textContent;
        btnGuardar.textContent = 'Guardando...';
        btnGuardar.disabled = true;
        
        // Obtener todos los productos del sessionStorage
        const detallesProductos = JSON.parse(sessionStorage.getItem('detalles_productos') || '[]');
        
        if (detallesProductos.length === 0) {
            showNotification('Debe agregar al menos un producto', 'error');
            btnGuardar.textContent = textOriginal;
            btnGuardar.disabled = false;
            return;
        }
        
        // Calcular totales - cada producto con su propio descuento e impuesto
        let totalCantidad = 0;
        let subtotalSinDescuentos = 0;
        let totalDescuentos = 0;
        let totalImpuestos = 0;
        let totalGeneral = 0;
        
        detallesProductos.forEach(prod => {
            const cantidad = Number(prod.cantidad || 0);
            const precio = Number((prod.precio ?? prod.precio_unitario) || 0);
            const descuento = Number(prod.descuento || 0);
            const impuesto = Number(prod.impuesto || 0);
            
            totalCantidad += cantidad;
            
            // Subtotal del producto
            let subtotalProducto = cantidad * precio;
            subtotalSinDescuentos += subtotalProducto;
            
            // Aplicar descuento del producto
            const montoDescuentoProducto = subtotalProducto * (descuento / 100);
            totalDescuentos += montoDescuentoProducto;
            subtotalProducto = subtotalProducto - montoDescuentoProducto;
            
            // Aplicar impuesto del producto
            const montoImpuestoProducto = subtotalProducto * (impuesto / 100);
            totalImpuestos += montoImpuestoProducto;
            
            // Total del producto
            totalGeneral += subtotalProducto + montoImpuestoProducto;
        });
        
        // Calcular porcentajes promedio
        const descuentoPromedio = subtotalSinDescuentos > 0 ? (totalDescuentos / subtotalSinDescuentos * 100) : 0;
        const subtotalConDescuento = subtotalSinDescuentos - totalDescuentos;
        const impuestoPromedio = subtotalConDescuento > 0 ? (totalImpuestos / subtotalConDescuento * 100) : 0;
        
        // Recopilar datos del formulario
        const pedidoData = {
            clienteNombre: document.getElementById('editarUsuario').value,
            clienteTelefono: document.getElementById('editarTelefono').value,
            fechaEntrega: document.getElementById('editarFechaEntrega').value,
            canalVenta: document.getElementById('editarCanalVenta').value,
            prioridad: document.getElementById('editarPrioridad').value,
            observaciones: detallesProductos.length + ' producto(s)',
            detalles_producto: JSON.stringify(detallesProductos),
            cantidad: totalCantidad,
            precio: Number(totalGeneral.toFixed(2)),
            descuento: descuentoPromedio,
            impuesto: impuestoPromedio
        };
        
        console.log('Datos del pedido a actualizar:', pedidoData);
        console.log('Productos individuales a guardar:', detallesProductos);
        
        // Actualizar pedido (el Controller maneja la eliminación de detalles antiguos 
        // y la creación de nuevos registros individuales por cada producto)
        await PedidosMVC.updatePedido(pedidoId, pedidoData);
        
        // Cerrar modal
        const modal = document.getElementById('modalEditarPedido');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Limpiar sessionStorage
        sessionStorage.removeItem('detalles_productos');
        sessionStorage.removeItem('detallesProducto');
        
        showNotification('Pedido actualizado correctamente', 'success');
        
        // Refrescar tabla
        await PedidosMVC.init({ tableSelector: '.pedidos-table tbody' });
        
        // Restaurar botón
        btnGuardar.textContent = textOriginal;
        btnGuardar.disabled = false;
        
    } catch (error) {
        console.error('Error al actualizar pedido:', error);
        showNotification('Error al actualizar el pedido: ' + (error.message || 'Error desconocido'), 'error');
        
        // Restaurar botón
        const btnGuardar = document.getElementById('btnGuardarEdicion');
        btnGuardar.textContent = 'Guardar Cambios';
        btnGuardar.disabled = false;
    }
}

async function deletePedido(pedidoId, row) {
    // Asegurar que tenemos el ID numérico correcto
    const id = parseInt(pedidoId);
    
    if (!id || isNaN(id)) {
        console.error('ID de pedido inválido:', pedidoId);
        showNotification('Error: ID de pedido inválido', 'error');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres eliminar el pedido ${pedidoId}?\n\nEsta acción no se puede deshacer.`)) {
        try {
            console.log('Eliminando pedido ID:', id);
            
            // Llamar al API para eliminar
            const response = await PedidosMVC.deletePedido(id);
            console.log('Respuesta de eliminación:', response);
            
            // Remover fila de la tabla inmediatamente
            if (row) {
                row.remove();
            }
            
            showNotification('Pedido eliminado correctamente', 'success');
            
            // Refrescar tabla completa para asegurar consistencia
            await PedidosMVC.init({ tableSelector: '.pedidos-table tbody' });
        } catch (err) {
            console.error('Error al eliminar pedido:', err);
            const errorMsg = err.data?.message || err.message || 'Error desconocido';
            showNotification('Error al eliminar el pedido: ' + errorMsg, 'error');
            
            // Refrescar tabla en caso de error para mostrar estado real
            await PedidosMVC.init({ tableSelector: '.pedidos-table tbody' });
        }
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

// Función para el botón de nuevo pedido - ya configurado en el DOMContentLoaded principal

// Variables globales para el modal
let modal = null;
let form = null;
let productDetailsModal = null;
let productDetailsForm = null;
let productDetailsData = {};

// ================= Productos múltiples (nuevo pedido) =================
function setupProductosMultiples() {
    const tbody = document.getElementById('productosTBody');
    if (!tbody) return; // solo existe en el modal nuevo

    const btnAdd = document.getElementById('btnAgregarProducto');
    if (btnAdd) {
        btnAdd.onclick = function () {
            addProductoRow();
        };
    }

    // Si no hay filas, agregar una inicial
    if (!tbody.querySelector('tr')) {
        addProductoRow();
    }
}

function addProductoRow(prefill = {}) {
    const tbody = document.getElementById('productosTBody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="padding:6px;">
            <input type="text" class="prod-desc" placeholder="Descripción del producto" style="width:100%" value="${(prefill.descripcion||'').replace(/\"/g,'&quot;')}">
        </td>
        <td style="padding:6px; text-align:right;">
            <input type="number" class="prod-cant" min="1" value="${Number.isFinite(prefill.cantidad)?prefill.cantidad:1}" style="width:90px; text-align:right;">
        </td>
        <td style="padding:6px; text-align:right;">
            <input type="number" class="prod-precio" step="0.01" min="0" value="${Number.isFinite(prefill.precio)?prefill.precio:0}" style="width:110px; text-align:right;">
        </td>
        <td style="padding:6px; text-align:right;">
            <input type="number" class="prod-descuento" step="0.01" min="0" value="${Number.isFinite(prefill.descuento)?prefill.descuento:0}" style="width:90px; text-align:right;">
        </td>
        <td style="padding:6px; text-align:right;">
            <input type="number" class="prod-impuesto" step="0.01" min="0" value="${Number.isFinite(prefill.impuesto)?prefill.impuesto:0}" style="width:90px; text-align:right;">
        </td>
        <td style="padding:6px; text-align:right;">
            <span class="prod-total">$0.00</span>
        </td>
        <td style="padding:6px; text-align:center;">
            <button type="button" class="btn-action" title="Eliminar"><i class="fa fa-trash"></i></button>
        </td>
    `;

    tbody.appendChild(tr);

    const inputs = tr.querySelectorAll('input');
    inputs.forEach(inp => {
        inp.addEventListener('input', () => {
            recalcRow(tr);
            recalcTotalesPedido();
        });
    });

    const btnDel = tr.querySelector('button');
    btnDel.addEventListener('click', () => {
        tr.remove();
        recalcTotalesPedido();
        // Si no queda ninguna fila, agregar una en blanco
        if (!tbody.querySelector('tr')) {
            addProductoRow();
        }
    });

    // Calcular al crear
    recalcRow(tr);
    recalcTotalesPedido();
}

function recalcRow(tr) {
    const q = Math.max(1, parseInt(tr.querySelector('.prod-cant')?.value || '1'));
    const p = Math.max(0, parseFloat(tr.querySelector('.prod-precio')?.value || '0'));
    const d = Math.max(0, parseFloat(tr.querySelector('.prod-descuento')?.value || '0'));
    const t = Math.max(0, parseFloat(tr.querySelector('.prod-impuesto')?.value || '0'));
    let total = q * p;
    total = total * (1 - d / 100);
    total = total * (1 + t / 100);
    tr.querySelector('.prod-total').textContent = formatoLempiras(total);
}

function recalcTotalesPedido() {
    const spans = document.querySelectorAll('#productosTBody .prod-total');
    let suma = 0;
    spans.forEach(sp => {
        const val = sp.textContent.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
        const num = parseFloat(val) || 0;
        suma += num;
    });
    const totalSpan = document.getElementById('totalPedidoPreview');
    if (totalSpan) {
        totalSpan.textContent = formatoLempiras(suma);
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
        totalDisplay.textContent = `Total: ${formatoLempiras(total)}`;
        totalDisplay.style.display = 'block';
    } else {
        totalDisplay.style.display = 'none';
    }
}

// Legacy functions removed - using PedidosMVC for all CRUD operations

// ===== FUNCIONES PARA ACCIONES DE TABLA =====
// (Las funciones setupActionButtons y setupStatusSelectors están definidas arriba, junto al DOMContentLoaded)

// Mostrar detalles completos del pedido en el modal
function showPedidoDetails(pedido) {
    console.log('showPedidoDetails llamada con:', pedido);
    
    const modal = document.getElementById('modalVerPedido');
    const content = document.getElementById('pedidoDetailsContent');
    const pedidoIdDisplay = document.getElementById('pedidoIdDisplay');
    
    if (!modal || !content) {
        console.error('Modal de detalles no encontrado');
        console.log('modal:', modal, 'content:', content);
        return;
    }
    
    // Actualizar título con número de pedido
    if (pedidoIdDisplay) {
        pedidoIdDisplay.textContent = `#${pedido.numeroPedido || pedido.id}`;
    }
    
    // Función para generar los colores visuales
    function generarColoresHTML(coloresString) {
        if (!coloresString || coloresString === 'No especificados' || coloresString === '') {
            return '<span class="detail-value">No especificados</span>';
        }
        
        // Separar los colores si están separados por comas
        const coloresArray = coloresString.split(',').map(c => c.trim()).filter(c => c);
        
        if (coloresArray.length === 0) {
            return '<span class="detail-value">No especificados</span>';
        }
        
        let coloresHTML = '<div class="colores-container">';
        coloresArray.forEach(color => {
            coloresHTML += `
                <div class="color-item">
                    <div class="color-circle" style="background-color: ${color};" title="${color}"></div>
                    <span class="color-name">${color}</span>
                </div>
            `;
        });
        coloresHTML += '</div>';
        
        return coloresHTML;
    }
    
    // Obtener productos del pedido (puede ser array o un solo producto)
    let productos = [];
    
    // Primero intentar parsear detalles_producto si existe
    if (pedido.detalles_producto) {
        try {
            const detalles = typeof pedido.detalles_producto === 'string' 
                ? JSON.parse(pedido.detalles_producto) 
                : pedido.detalles_producto;
            
            // Si es un array, usarlo directamente
            if (Array.isArray(detalles)) {
                productos = detalles;
            } else if (detalles && typeof detalles === 'object') {
                // Si es un objeto, ponerlo en array
                productos = [detalles];
            }
        } catch (e) {
            console.warn('Error al parsear detalles_producto:', e);
        }
    }
    
    // Si no hay productos en detalles_producto, crear uno desde los datos simples
    if (productos.length === 0 && (pedido.categoriaProducto || pedido.cantidad || pedido.precioUnitario)) {
        productos = [{
            categoria: pedido.categoriaProducto || 'No especificada',
            cantidad: pedido.cantidad || 1,
            precio: pedido.precioUnitario || 0,
            colores: pedido.colores || '',
            especificaciones: pedido.especificaciones || '',
            imagenes: pedido.imagenes || []
        }];
    }
    
    // Generar HTML para todos los productos
    let productosHTML = '';
    
    // Calcular subtotal de todos los productos (suma de cantidad * precio de cada uno)
    const subtotalGeneral = productos.reduce((acc, prod) => {
        const cantidad = prod.cantidad || 1;
        const precio = parseFloat(prod.precio_unitario || prod.precio || 0);
        return acc + (cantidad * precio);
    }, 0);
    
    // Obtener descuento e impuesto global (del primer producto o del pedido)
    const descuentoGlobal = productos.length > 0 ? parseFloat(productos[0].descuento || 0) : 0;
    const impuestoGlobal = productos.length > 0 ? parseFloat(productos[0].impuesto || 0) : 0;
    
    // Calcular total general con descuento e impuesto
    const montoDescuento = subtotalGeneral * (descuentoGlobal / 100);
    const subtotalConDescuento = subtotalGeneral - montoDescuento;
    const montoImpuesto = subtotalConDescuento * (impuestoGlobal / 100);
    const totalGeneral = subtotalConDescuento + montoImpuesto;
    
    if (productos.length > 0) {
        productosHTML = productos.map((prod, idx) => {
            const cantidad = prod.cantidad || 1;
            const precio = parseFloat(prod.precio_unitario || prod.precio || 0);
            const subtotal = cantidad * precio;
            
            return `
                <div class="producto-card" style="border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 15px; background: rgba(255,255,255,0.02);">
                    <h4 style="color: #b2f2e6; margin-bottom: 12px;">
                        <i class="fa-solid fa-box"></i> Producto #${idx + 1}
                    </h4>
                    <div class="producto-detalle-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <div class="detail-item">
                            <span class="detail-label">Categoría:</span>
                            <span class="detail-value">${prod.categoria || 'No especificada'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Cantidad:</span>
                            <span class="detail-value">${cantidad} unidad(es)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Precio Unitario:</span>
                            <span class="detail-value">${formatoLempiras(precio)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Subtotal:</span>
                            <span class="detail-value" style="font-weight: bold;">${formatoLempiras(subtotal)}</span>
                        </div>
                        ${prod.colores ? `
                        <div class="detail-item full-width" style="grid-column: 1 / -1;">
                            <span class="detail-label">Colores:</span>
                            ${generarColoresHTML(prod.colores)}
                        </div>
                        ` : ''}
                        ${prod.especificaciones ? `
                        <div class="detail-item full-width" style="grid-column: 1 / -1;">
                            <span class="detail-label">Especificaciones:</span>
                            <span class="detail-value">${prod.especificaciones}</span>
                        </div>
                        ` : ''}
                        ${prod.imagenes && prod.imagenes.length > 0 ? `
                        <div class="detail-item full-width" style="grid-column: 1 / -1;">
                            <span class="detail-label">Imágenes:</span>
                            <div class="images-gallery" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                                ${prod.imagenes.map(img => `
                                    <img src="${img}" alt="Producto ${idx + 1}" 
                                         style="max-width: 80px; max-height: 80px; border-radius: 4px; cursor: pointer; object-fit: cover;"
                                         onclick="window.open('${img}', '_blank')">
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Agregar resumen de totales al final
        productosHTML += `
            <div class="totales-card" style="border: 2px solid #b2f2e6; border-radius: 8px; padding: 20px; margin-top: 15px; background: rgba(178, 242, 230, 0.05);">
                <h4 style="color: #b2f2e6; margin-bottom: 15px; text-align: center;">
                    <i class="fa-solid fa-calculator"></i> Resumen de Totales
                </h4>
                <div style="display: grid; gap: 10px; max-width: 400px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-weight: 500;">Subtotal:</span>
                        <span style="font-weight: bold;">${formatoLempiras(subtotalGeneral)}</span>
                    </div>
                    ${descuentoGlobal > 0 ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #ff6b6b;">
                        <span>Descuento (${descuentoGlobal}%):</span>
                        <span>-${formatoLempiras(montoDescuento)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>Subtotal con Descuento:</span>
                        <span style="font-weight: bold;">${formatoLempiras(subtotalConDescuento)}</span>
                    </div>
                    ` : ''}
                    ${impuestoGlobal > 0 ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #ffd93d;">
                        <span>Impuesto (${impuestoGlobal}%):</span>
                        <span>+${formatoLempiras(montoImpuesto)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #b2f2e6; margin-top: 5px;">
                        <span style="font-size: 1.2em; font-weight: bold; color: #b2f2e6;">TOTAL:</span>
                        <span style="font-size: 1.3em; font-weight: bold; color: #b2f2e6;">${formatoLempiras(totalGeneral)}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        productosHTML = '<div class="producto-card" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">No hay productos registrados en este pedido.</div>';
    }
    
    // Construir HTML con TODOS los datos del pedido
    const htmlContent = `
        <div class="pedido-details-grid">
            <!-- Información del Cliente -->
            <div class="details-section">
                <h3><i class="fa-solid fa-user"></i> Información del Cliente</h3>
                <div class="details-content">
                    <div class="detail-item">
                        <span class="detail-label">Nombre:</span>
                        <span class="detail-value">${pedido.cliente || 'No especificado'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Teléfono:</span>
                        <span class="detail-value">${pedido.telefono || 'No especificado'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Información del Pedido -->
            <div class="details-section">
                <h3><i class="fa-solid fa-shopping-cart"></i> Información del Pedido</h3>
                <div class="details-content">
                    <div class="detail-item">
                        <span class="detail-label">Número de Pedido:</span>
                        <span class="detail-value">${pedido.numeroPedido || pedido.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fecha del Pedido:</span>
                        <span class="detail-value">${pedido.fecha || 'No especificada'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fecha de Entrega:</span>
                        <span class="detail-value">${pedido.fechaEntrega || 'No especificada'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Estado:</span>
                        <span class="detail-value badge-${pedido.estado.toLowerCase()}">${pedido.estadoNombre || pedido.estado}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Prioridad:</span>
                        <span class="detail-value badge-prioridad-${pedido.prioridad}">${pedido.prioridad || 'Normal'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Canal de Venta:</span>
                        <span class="detail-value">${pedido.canalVenta || 'No especificado'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total del Pedido:</span>
                        <span class="detail-value total-price" style="font-size: 1.2em; font-weight: bold; color: #b2f2e6;">${formatoLempiras(totalGeneral)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Productos del Pedido -->
            <div class="details-section full-width">
                <h3><i class="fa-solid fa-boxes-stacked"></i> Productos del Pedido (${productos.length})</h3>
                <div class="details-content">
                    ${productosHTML}
                </div>
            </div>
            
            <!-- Observaciones/Especificaciones Generales -->
            ${pedido.observaciones || pedido.especificaciones ? `
            <div class="details-section full-width">
                <h3><i class="fa-solid fa-clipboard-list"></i> Observaciones Generales</h3>
                <div class="details-content">
                    <div class="detail-item full-width">
                        <p class="detail-text">${pedido.observaciones || pedido.especificaciones || 'No especificadas'}</p>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    content.innerHTML = htmlContent;
    
    console.log('Modal HTML actualizado');
    
    // Mostrar el modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    console.log('Modal mostrado');
}

// Obtener datos del pedido desde la tabla
function getPedidoData(pedidoId, row) {
    if (!row) {
        const rows = document.querySelectorAll('.pedidos-table tbody tr');
        for (let r of rows) {
            const id = r.querySelector('.pedido-id')?.textContent?.trim();
            if (id === pedidoId) {
                row = r;
                break;
            }
        }
        if (!row) return null;
    }
    
    const cells = row.querySelectorAll('td');
    if (cells.length < 6) return null;
    
    return {
        id: pedidoId,
        cliente: cells[1]?.textContent?.trim() || '',
        fecha: cells[2]?.textContent?.trim() || '',
        fechaEntrega: cells[3]?.textContent?.trim() || '',
        estado: cells[4]?.querySelector('select')?.value || '',
        total: cells[5]?.textContent?.trim() || '',
        telefono: row.dataset.telefono || '',
        email: row.dataset.email || '',
        observaciones: row.dataset.observaciones || '',
        prioridad: row.dataset.prioridad || 'normal',
        canalVenta: row.dataset.canal || '',
        categoriaProducto: row.dataset.categoria || ''
    };
}

// Generar HTML para las imágenes
function generateImagesHTML(data) {
    // Verificar si hay imágenes en los datos
    const imagenes = data.imagenes || [];
    
    if (imagenes.length === 0) {
        return '<div class="pedido-info-section"><h3>Imágenes de Referencia</h3><p style="color: rgba(255,255,255,0.6);">No hay imágenes disponibles</p></div>';
    }
    
    const imagenesItems = imagenes.map((img, index) => {
        return `
            <div class="detail-image-item">
                <img src="${img}" alt="Imagen ${index + 1}" class="detail-image" style="cursor: pointer;">
            </div>
        `;
    }).join('');
    
    return `
        <div class="pedido-info-section">
            <h3>Imágenes de Referencia</h3>
            <div class="detail-images-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
                ${imagenesItems}
            </div>
        </div>
    `;
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

// Configurar los selectores de color
function setupColorPickers() {
    // Esta función puede estar vacía por ahora o configurar color pickers si existen
    // Los color pickers se manejan directamente en el HTML con input type="color"
    console.log('Color pickers configurados (manejados por HTML nativo)');
}

// Funciones para modal de productos personalizados
function setupProductDetailsValidation() {
    // Validación básica para el modal de productos
    console.log('Validación de productos configurada');
}

function setupProductDetailsImageUpload() {
    // Upload de imágenes para el modal de productos
    console.log('Upload de imágenes de productos configurado');
}

function mostrarPreviewImagenes(urls, container) {
    if (!container || !urls || urls.length === 0) return;
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear previews para cada imagen
    urls.forEach((url, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview-item';
        previewDiv.style.cssText = 'position: relative; display: inline-block; margin: 5px;';
        
        const img = document.createElement('img');
        img.src = url;
        img.alt = `Preview ${index + 1}`;
        img.style.cssText = 'width: 100px; height: 100px; object-fit: cover; border: 2px solid #007bff; border-radius: 4px;';
        
        // Botón para eliminar imagen
        const btnEliminar = document.createElement('button');
        btnEliminar.type = 'button';
        btnEliminar.className = 'btn btn-danger btn-sm';
        btnEliminar.innerHTML = '<i class="fa-solid fa-times"></i>';
        btnEliminar.style.cssText = 'position: absolute; top: -5px; right: -5px; padding: 2px 6px; border-radius: 50%;';
        btnEliminar.onclick = function() {
            // Eliminar de la lista
            const imagenesGuardadas = JSON.parse(sessionStorage.getItem('imagenesSubidas') || '[]');
            const nuevasImagenes = imagenesGuardadas.filter(u => u !== url);
            sessionStorage.setItem('imagenesSubidas', JSON.stringify(nuevasImagenes));
            
            // Eliminar del DOM
            previewDiv.remove();
            
            // Si no quedan imágenes, mostrar placeholder
            if (container.children.length === 0) {
                container.innerHTML = '<div class="upload-placeholder"><i class="fa-solid fa-cloud-arrow-up"></i><p>Arrastra imágenes o haz clic para seleccionar</p></div>';
            }
        };
        
        previewDiv.appendChild(img);
        previewDiv.appendChild(btnEliminar);
        container.appendChild(previewDiv);
    });
}

function setupProductDetailsColorPickers() {
    // Configurar color pickers del modal de productos personalizados
    const colorPickers = [
        { picker: 'colorPicker1', name: 'colorName1' },
        { picker: 'colorPicker2', name: 'colorName2' },
        { picker: 'colorPicker3', name: 'colorName3' }
    ];
    
    colorPickers.forEach(({picker, name}) => {
        const pickerElement = document.getElementById(picker);
        const nameElement = document.getElementById(name);
        
        if (pickerElement && nameElement) {
            pickerElement.addEventListener('input', function() {
                nameElement.textContent = this.value;
                updateColorsField();
            });
        }
    });
    
    // Configurar input de colores
    const coloresInput = document.getElementById('colores');
    
    // Configurar botón de limpiar colores
    setupClearColorsButton();
    
    if (coloresInput) {
        coloresInput.addEventListener('input', function() {
            // Opcional: actualizar los color pickers basado en el texto
        });
    }
}

function setupClearColorsButton() {
    const colorPickers = [
        { picker: 'colorPicker1', name: 'colorName1' },
        { picker: 'colorPicker2', name: 'colorName2' },
        { picker: 'colorPicker3', name: 'colorName3' }
    ];
    
    const clearButton = document.querySelector('.btn-limpiar-colores');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            const colorPickers = document.querySelectorAll('.color-picker');
            colorPickers.forEach((picker, index) => {
                picker.value = '#000000';
                updateColorName(picker, index + 1);
            });
        });
    }
    
    // Botón limpiar colores del modal de productos
    const btnLimpiar = document.querySelector('#modalDetallesProducto .btn-limpiar-colores');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            console.log('Limpiando colores del modal de productos');
            colorPickers.forEach(({picker, name}) => {
                const pickerElement = document.getElementById(picker);
                const nameElement = document.getElementById(name);
                if (pickerElement) pickerElement.value = '#000000';
                if (nameElement) nameElement.textContent = `Color ${picker.slice(-1)}`;
            });
            const coloresField = document.getElementById('colores');
            if (coloresField) coloresField.value = '';
        });
    }
}

function updateColorsField() {
    const colors = [];
    const pickerIds = ['colorPicker1', 'colorPicker2', 'colorPicker3'];
    
    pickerIds.forEach(id => {
        const picker = document.getElementById(id);
        if (picker && picker.value && picker.value !== '#000000') {
            colors.push(picker.value);
        }
    });
    
    const coloresField = document.getElementById('colores');
    if (coloresField) {
        coloresField.value = colors.join(', ');
    }
}

// === CRUD visual de productos en edición ===
function renderTablaProductosEditables() {
    const container = document.getElementById('tablaProductosEditablesContainer');
    if (!container) return;
    let productos = [];
    try {
        productos = JSON.parse(sessionStorage.getItem('detalles_productos') || '[]');
    } catch (e) {}
    if (!Array.isArray(productos)) productos = [];

    console.log('=== RENDERIZANDO TABLA DE PRODUCTOS ===');
    console.log('Productos en sessionStorage:', productos);
    console.log('Cantidad de productos:', productos.length);
    if (productos.length > 0) {
        console.log('Primer producto:', productos[0]);
        console.log('Campos disponibles:', Object.keys(productos[0]));
    }

    let html = `<table class="tabla-productos-editable" style="width:100%; border-collapse:separate; border-spacing:0 6px; font-size:0.95em;">
        <thead>
            <tr style="background:#007bff; color:#fff;">
                <th style="padding:8px; border-radius:8px 0 0 0;">#</th>
                <th style="padding:8px;" title='Categoría'>Categoría</th>
                <th style="padding:8px;" title='Cantidad'>Cant.</th>
                <th style="padding:8px;" title='Precio unitario'>Precio</th>
                <th style="padding:8px;" title='Descuento (%)'>Desc.%</th>
                <th style="padding:8px;" title='Impuesto (%)'>Imp.%</th>
                <th style="padding:8px;">Total</th>
                <th style="padding:8px;" title='Colores'>Colores</th>
                <th style="padding:8px;" title='Especificaciones'>Especificaciones</th>
                <th style="padding:8px; border-radius:0 8px 0 0;">Acción</th>
            </tr>
        </thead>
        <tbody>`;
    
    if (productos.length === 0) {
        html += `<tr><td colspan="10" style="text-align:center; padding:20px; color:#999; font-style:italic;">
            No hay productos agregados. Haz clic en "Agregar Producto" para comenzar.
        </td></tr>`;
    } else {
        productos.forEach((prod, idx) => {
            // Mapear los campos que pueden venir con diferentes nombres
            const cantidad = Number(prod.cantidad || 0);
            const precio = Number(prod.precio || prod.precio_unitario || 0);
            const descuento = Number(prod.descuento || 0);
            const impuesto = Number(prod.impuesto || 0);
            let subtotal = cantidad * precio;
            let montoDescuento = subtotal * (descuento / 100);
            let subtotalConDescuento = subtotal - montoDescuento;
            let montoImpuesto = subtotalConDescuento * (impuesto / 100);
            let total = subtotalConDescuento + montoImpuesto;
            
            // Si categoría está vacía, usar "productos"
            const categoria = prod.categoria && prod.categoria.trim() !== '' ? prod.categoria : 'productos';
            
            console.log(`Producto ${idx + 1}:`, {
                categoria,
                cantidad,
                precio,
                descuento,
                impuesto,
                colores: prod.colores,
                especificaciones: prod.especificaciones
            });
            
            html += `<tr data-idx="${idx}" style="background:${idx%2===0?'#e8f4f8':'#f8f9fa'}; border: 1px solid #ddd;">
                <td style="text-align:center; font-weight:bold; padding:8px; color:#333;">${idx + 1}</td>
                <td style="padding:8px;"><input type="text" class="td-categoria" value="${categoria}" style="width:100px; padding:4px 6px; border:1px solid #007bff; border-radius:4px; background:#fff; color:#333;"></td>
                <td style="padding:8px;"><input type="number" class="td-cantidad" min="1" value="${cantidad}" style="width:60px; padding:4px 6px; border:1px solid #007bff; border-radius:4px; background:#fff; color:#333;"></td>
                <td style="padding:8px;"><input type="number" class="td-precio" min="0" step="0.01" value="${precio}" style="width:75px; padding:4px 6px; border:1px solid #007bff; border-radius:4px; background:#fff; color:#333;"></td>
                <td style="padding:8px;"><input type="number" class="td-descuento" min="0" step="0.01" value="${descuento}" style="width:55px; padding:4px 6px; border:1px solid #007bff; border-radius:4px; background:#fff; color:#333;"></td>
                <td style="padding:8px;"><input type="number" class="td-impuesto" min="0" step="0.01" value="${impuesto}" style="width:55px; padding:4px 6px; border:1px solid #007bff; border-radius:4px; background:#fff; color:#333;"></td>
                <td class="td-total" style="font-weight:bold; color:#28a745; padding:8px;">${formatoLempiras(total)}</td>
                <td style="padding:8px;"><input type="text" class="td-colores" value="${prod.colores || ''}" style="width:80px; padding:4px 6px; border:1px solid #007bff; border-radius:4px; background:#fff; color:#333;"></td>
                <td style="padding:8px;"><input type="text" class="td-especificaciones" value="${prod.especificaciones || ''}" style="width:120px; padding:4px 6px; border:1px solid #007bff; border-radius:4px; background:#fff; color:#333;"></td>
                <td style="padding:8px;"><button type="button" class="btn-eliminar-producto" data-idx="${idx}" style="color:#fff; background:#dc3545; border:none; border-radius:4px; padding:4px 10px; cursor:pointer; font-size:0.9em;" title="Eliminar producto"><i class="fa fa-trash"></i></button></td>
            </tr>`;
        });
    }
    
    html += `</tbody></table>`;
    container.innerHTML = html;

    // Enlazar eventos de edición en línea
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', onEditarProductoEditable);
    });
    // Enlazar eventos de eliminar
    container.querySelectorAll('.btn-eliminar-producto').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-idx'));
            eliminarProductoEditable(idx);
        });
    });
    
    renderResumenTotalesEdicion();
}

// Manejar la edición de un producto en la tabla editable
function onEditarProductoEditable(event) {
    const input = event.target;
    const row = input.closest('tr');
    if (!row) return;
    
    const idx = parseInt(row.getAttribute('data-idx'));
    
    let productos = [];
    try {
        productos = JSON.parse(sessionStorage.getItem('detalles_productos') || '[]');
    } catch (e) {
        productos = [];
    }
    
    if (!Array.isArray(productos) || idx >= productos.length) return;
    
    // Actualizar el campo correspondiente según la clase del input
    let descuentoChanged = false;
    let impuestoChanged = false;
    if (input.classList.contains('td-categoria')) {
        productos[idx].categoria = input.value;
    } else if (input.classList.contains('td-cantidad')) {
        productos[idx].cantidad = Number(input.value);
    } else if (input.classList.contains('td-precio')) {
        productos[idx].precio = Number(input.value);
    } else if (input.classList.contains('td-descuento')) {
        const newDesc = Number(input.value);
        productos[idx].descuento = newDesc;
        descuentoChanged = true;
    } else if (input.classList.contains('td-impuesto')) {
        const newImp = Number(input.value);
        productos[idx].impuesto = newImp;
        impuestoChanged = true;
    } else if (input.classList.contains('td-colores')) {
        productos[idx].colores = input.value;
    } else if (input.classList.contains('td-especificaciones')) {
        productos[idx].especificaciones = input.value;
    }
    
    // Guardar cambios en sessionStorage
    sessionStorage.setItem('detalles_productos', JSON.stringify(productos));

    // Si cambió descuento o impuesto, tratarlos como GLOBAL: propagar a todos los productos
    if (descuentoChanged || impuestoChanged) {
        try {
            const descGlobal = Number(productos[idx].descuento || 0);
            const impGlobal = Number(productos[idx].impuesto || 0);
            productos = productos.map(p => ({
                ...p,
                descuento: descGlobal,
                impuesto: impGlobal
            }));
            sessionStorage.setItem('detalles_productos', JSON.stringify(productos));
        } catch (e) {}
        // Re-renderizar toda la tabla para actualizar todos los totales y mantener consistencia global
        renderTablaProductosEditables();
        renderResumenTotalesEdicion();
        return;
    }

    // Recalcular y actualizar SOLO el total de la fila editada para no perder el foco
    const cantidad = Number(productos[idx].cantidad || 0);
    const precio = Number((productos[idx].precio ?? productos[idx].precio_unitario) || 0);
    const descuento = Number(productos[idx].descuento || 0);
    const impuesto = Number(productos[idx].impuesto || 0);
    const subtotal = cantidad * precio;
    const montoDescuento = subtotal * (descuento / 100);
    const subtotalConDescuento = subtotal - montoDescuento;
    const montoImpuesto = subtotalConDescuento * (impuesto / 100);
    const total = subtotalConDescuento + montoImpuesto;

    const tdTotal = row.querySelector('.td-total');
    if (tdTotal) tdTotal.textContent = formatoLempiras(total);

    // Actualizar resumen de totales sin re-renderizar la tabla
    renderResumenTotalesEdicion();
}

// Eliminar un producto de la tabla editable
function eliminarProductoEditable(idx) {
    let productos = [];
    try {
        productos = JSON.parse(sessionStorage.getItem('detalles_productos') || '[]');
    } catch (e) {
        productos = [];
    }
    
    if (!Array.isArray(productos)) return;
    
    // Confirmar eliminación
    if (confirm('¿Estás seguro de eliminar este producto?')) {
        productos.splice(idx, 1);
        sessionStorage.setItem('detalles_productos', JSON.stringify(productos));
        renderTablaProductosEditables();
    }
}

// Renderizar el resumen de totales en el modal de edición
function renderResumenTotalesEdicion() {
    const container = document.getElementById('resumenTotalesEdicion');
    if (!container) return;
    
    let productos = [];
    try {
        productos = JSON.parse(sessionStorage.getItem('detalles_productos') || '[]');
    } catch (e) {}
    if (!Array.isArray(productos)) productos = [];
    
    if (productos.length === 0) {
        container.innerHTML = '<p style="color:#999; font-style:italic; text-align:center;">No hay productos para calcular totales</p>';
        return;
    }
    
    // Calcular totales - con descuento e impuesto INDIVIDUAL por producto
    let totalCantidad = 0;
    let subtotalSinDescuentos = 0;
    let totalDescuentos = 0;
    let totalImpuestos = 0;
    let totalGeneral = 0;
    
    productos.forEach(prod => {
        const cantidad = Number(prod.cantidad || 0);
        const precio = Number((prod.precio ?? prod.precio_unitario) || 0);
        const descuento = Number(prod.descuento || 0);
        const impuesto = Number(prod.impuesto || 0);
        
        totalCantidad += cantidad;
        
        // Subtotal del producto
        let subtotalProducto = cantidad * precio;
        subtotalSinDescuentos += subtotalProducto;
        
        // Aplicar descuento del producto
        const montoDescuentoProducto = subtotalProducto * (descuento / 100);
        totalDescuentos += montoDescuentoProducto;
        subtotalProducto = subtotalProducto - montoDescuentoProducto;
        
        // Aplicar impuesto del producto
        const montoImpuestoProducto = subtotalProducto * (impuesto / 100);
        totalImpuestos += montoImpuestoProducto;
        
        // Total del producto
        totalGeneral += subtotalProducto + montoImpuestoProducto;
    });
    
    // Calcular porcentajes promedio para mostrar
    const descuentoPromedio = subtotalSinDescuentos > 0 ? (totalDescuentos / subtotalSinDescuentos * 100) : 0;
    const subtotalConDescuento = subtotalSinDescuentos - totalDescuentos;
    const impuestoPromedio = subtotalConDescuento > 0 ? (totalImpuestos / subtotalConDescuento * 100) : 0;
    
    // Renderizar resumen
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.95em;">
            <div style="text-align: right; font-weight: 500;">Total de productos:</div>
            <div style="font-weight: 600;">${productos.length}</div>
            
            <div style="text-align: right; font-weight: 500;">Cantidad total:</div>
            <div style="font-weight: 600;">${totalCantidad}</div>
            
            <div style="text-align: right; font-weight: 500;">Subtotal:</div>
            <div>${formatoLempiras(subtotalSinDescuentos)}</div>
            
            <div style="text-align: right; font-weight: 500;">Descuento (promedio ${descuentoPromedio.toFixed(1)}%):</div>
            <div style="color: #dc3545;">-${formatoLempiras(totalDescuentos)}</div>
            
            <div style="text-align: right; font-weight: 500;">Impuesto (promedio ${impuestoPromedio.toFixed(1)}%):</div>
            <div style="color: #28a745;">+${formatoLempiras(totalImpuestos)}</div>
            
            <div style="text-align: right; font-weight: 600; font-size: 1.1em; border-top: 2px solid #007bff; padding-top: 8px;">Total:</div>
            <div style="font-weight: 700; font-size: 1.2em; color: #007bff; border-top: 2px solid #007bff; padding-top: 8px;">${formatoLempiras(totalGeneral)}</div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Asegurar que el botón de agregar producto esté correctamente enlazado
document.addEventListener('DOMContentLoaded', function() {
    const btnAgregarProducto = document.getElementById('btnAgregarProductoEditable');
    if (btnAgregarProducto) {
        btnAgregarProducto.addEventListener('click', function() {
            let productos = [];
            try {
                productos = JSON.parse(sessionStorage.getItem('detalles_productos') || '[]');
            } catch (e) {}
            if (!Array.isArray(productos)) productos = [];
            const baseDesc = Number((productos[0] && productos[0].descuento) || 0);
            const baseImp = Number((productos[0] && productos[0].impuesto) || 0);
            productos.push({ categoria:'productos', cantidad:1, precio:0, descuento:baseDesc, impuesto:baseImp, colores:'', especificaciones:'', imagenesUrls:'' });
            sessionStorage.setItem('detalles_productos', JSON.stringify(productos));
            renderTablaProductosEditables();
            actualizarCamposTotalesEnEdicion();
            renderResumenTotalesEdicion();
        });
    }
});

// Inicializar tabla y resumen al abrir modal de edición
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tablaProductosEditablesContainer')) {
        renderTablaProductosEditables();
        renderResumenTotalesEdicion();
    }
});
