// Lógica de Ventas: conectado a la API REST y Firebase
(function() {
    const API_BASE_URL = '/Color_Ink/public/index.php?route=ventas&caso=1';
    
    let ventasData = [];
    let currentUser = null;
    let token = null;

    // Elementos del DOM
    const body = document.getElementById('ventasBody');
    const kpiIngresos = document.getElementById('kpiIngresos');
    const kpiResultado = document.getElementById('kpiResultado');
    const kpiMargen = document.getElementById('kpiMargen');
    const searchInput = document.getElementById('searchInput');
    const estadoSelect = document.getElementById('estadoSelect');
    const desde = document.getElementById('desde');
    const btnNuevaVenta = document.querySelector('.btn-nueva-venta');
    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

    /**
     * Inicializar sesión desde sessionStorage
     */
      function getProjectBase(){
    const parts = window.location.pathname.split('/');
    const pIdx = parts.indexOf('public');
    if (pIdx > 1) return '/' + parts.slice(1, pIdx).join('/');
    const sIdx = parts.indexOf('src');
    return sIdx > 1 ? '/' + parts.slice(1, sIdx).join('/') : '/' + (parts[1] || '');
  }
    function initSession() {
        // Buscar usuario en sessionStorage (como los demás módulos)
        const storedUser = sessionStorage.getItem('user');
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        const jwtToken = sessionStorage.getItem('access_token');
        
        if (storedUser && (firebaseToken || jwtToken)) {
            currentUser = JSON.parse(storedUser);
            token = firebaseToken || jwtToken;
            
            console.log('✅ Usuario cargado:', currentUser.nombre_usuario, 'Rol:', currentUser.id_rol);
            
            // Validar que el usuario tenga acceso al módulo de ventas
            // Solo Gerente (id_rol=1) y Administrador (id_rol=2) tienen acceso
            if (currentUser.id_rol === 3) { // Cliente no tiene acceso
                console.log('❌ Usuario sin permisos para acceder a ventas');
                mostrarNotificacion('Acceso denegado. Solo Gerente y Administrador pueden acceder a ventas.', 'error');
                // Redirigir al dashboard después de 3 segundos
                setTimeout(() => {
                    window.location.href = 'http://localhost/Color_Ink/public/index';
                }, 3000);
                return false;
            }
            
            return true;
        } else {
            console.log('❌ No hay sesión activa, redirigiendo al login');
            // Redirigir al login si no hay sesión
            window.location.replace(getProjectBase() + '/public/login');
            return false;
        }
    }

    /**
     * Hacer peticiones a la API con autenticación
     */
    async function apiCall(method, url, data = null) {
        try {
            // Obtener token actual (verificar cada vez por si expiró)
            const currentToken = getCurrentToken();
            
            if (!currentToken) {
                console.error('❌ No hay token disponible');
                window.location.replace(getProjectBase() + '/public/login');
                return null;
            }
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            };

            const options = {
                method: method,
                headers: headers
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            console.log(`🔐 Haciendo petición ${method} a: ${url}`);
            console.log(`🔑 Token usado: ${currentToken.substring(0, 20)}...`);
            
            const response = await fetch(url, options);
            
            console.log(`📡 Respuesta recibida: ${response.status} ${response.statusText}`);
            
            // Verificar si la respuesta es JSON
            const contentType = response.headers.get("content-type");
            console.log(`📄 Content-Type: ${contentType}`);
            
            if (contentType && contentType.includes("application/json")) {
                const textResult = await response.text();
                console.log('📥 Respuesta cruda:', textResult.substring(0, 200));
                const result = JSON.parse(textResult);
                console.log('✅ JSON parseado:', result);
                return result;
            } else {
                // Si no es JSON, leer como texto
                const textResult = await response.text();
                console.error('❌ Respuesta no JSON:', textResult.substring(0, 500));
                throw new Error('Respuesta del servidor no es JSON');
            }
        } catch (error) {
            console.error('❌ Error en petición API:', error);
            mostrarNotificacion('Error de conexión con el servidor', 'error');
            return null;
        }
    }
    
    /**
     * Obtener el token actual
     */
    function getCurrentToken() {
        const jwtToken = sessionStorage.getItem('access_token');
        const firebaseToken = sessionStorage.getItem('firebase_id_token');
        return jwtToken || firebaseToken || '';
    }

    /**
     * Cargar ventas desde la API
     */
    async function cargarVentas() {
        mostrarLoading();
        
        const params = new URLSearchParams();
        if (desde && desde.value) params.append('fecha_desde', desde.value);
        
        const url = `${API_BASE_URL}&action=listar&${params.toString()}`;
        console.log('📥 URL de ventas:', url);
        const result = await apiCall('GET', url);
        
        if (result && result.status === 'OK') {
            ventasData = result.data || [];
            console.log('✅ Ventas cargadas:', ventasData.length);
            actualizarVista();
        } else {
            console.error('❌ Error cargando ventas:', result);
            mostrarNotificacion(result?.message || 'Error al cargar las ventas', 'error');
        }
    }

    /**
     * Mostrar indicador de carga
     */
    function mostrarLoading() {
        if (body) {
            body.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</td></tr>';
        }
    }

    /**
     * Formatear dinero
     */
    function formatMoney(value) {
        return `L${parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }

    /**
     * Filtrar datos
     */
    function filterData() {
        const q = (searchInput.value || '').toLowerCase();
        const estado = estadoSelect.value;
        const metodoPago = document.getElementById('metodoPagoSelect')?.value || '';
        
        return ventasData.filter(item => {
            const matchesQuery = !q || 
                (item.cliente && item.cliente.toLowerCase().includes(q)) || 
                (item.usuario && item.usuario.toLowerCase().includes(q)) ||
                (item.id_venta && item.id_venta.toString().includes(q)) ||
                (item.id_pedido && item.id_pedido.toString().includes(q));
            
            const matchesEstado = !estado || item.estado === estado;
            const matchesMetodo = !metodoPago || item.metodo_pago === metodoPago;
            
            const matchesDate = !item.fecha_venta || withinDate(item.fecha_venta);
            
            return matchesQuery && matchesEstado && matchesMetodo && matchesDate;
        });
    }

    /**
     * Verificar si una fecha coincide con el filtro
     */
    function withinDate(dateStr) {
        if (!desde || !desde.value) return true;
        
        try {
            // Extraer solo la parte de fecha (YYYY-MM-DD) de ambas fechas
            const ventaDateStr = dateStr.split(' ')[0]; // Tomar solo la parte de fecha
            const filterDateStr = desde.value; // Ya está en formato YYYY-MM-DD
            
            return ventaDateStr === filterDateStr;
        } catch (error) {
            console.error('Error comparando fechas:', error);
            return true;
        }
    }

    /**
     * Calcular KPIs
     */
    function computeKPIs(rows) {
        const ingresos = rows.reduce((acc, r) => acc + parseFloat(r.monto_cobrado || 0), 0);
        const costos = rows.reduce((acc, r) => acc + parseFloat(r.costo_total || 0), 0);
        const resultado = ingresos - costos;
        const margen = ingresos > 0 ? (resultado / ingresos) * 100 : 0;
        
        // Calcular ventas del mes actual
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const ventasMes = rows.filter(r => {
            const fechaVenta = new Date(r.fecha_venta);
            return fechaVenta.getMonth() === currentMonth && fechaVenta.getFullYear() === currentYear;
        }).length;
        
        if (kpiIngresos) kpiIngresos.textContent = formatMoney(ingresos);
        const kpiVentasMes = document.getElementById('kpiVentasMes');
        if (kpiVentasMes) kpiVentasMes.textContent = ventasMes;
        if (kpiResultado) kpiResultado.textContent = formatMoney(resultado);
        if (kpiMargen) kpiMargen.textContent = `${margen.toFixed(1)}%`;
        
        if (kpiResultado) kpiResultado.className = 'stat-number ' + (resultado >= 0 ? 'resultado-positivo' : 'resultado-negativo');
    }

    /**
     * Renderizar tabla
     */
    function renderTable(rows) {
        body.innerHTML = '';
        
        if (rows.length === 0) {
            body.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.6);"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;"><i class="fa-solid fa-inbox" style="font-size: 2em; opacity: 0.5;"></i><span>No hay ventas registradas</span></div></td></tr>';
            return;
        }
        
        rows.forEach(r => {
            const tr = document.createElement('tr');
            const resultado = parseFloat(r.utilidad || 0);
            const fecha = new Date(r.fecha_venta).toLocaleDateString('es-ES');
            
            tr.innerHTML = `
                <td><strong>#${r.id_venta || 'N/A'}</strong></td>
                <td><span class="status ${r.estado.toLowerCase()}">${r.estado}</span></td>
                <td><span style="color: rgba(217, 0, 188, 0.8);">#${r.id_pedido || 'N/A'}</span></td>
                <td>${r.cliente || 'Cliente no especificado'}</td>
                <td>${fecha}</td>
                <td><span class="metodo-pago">${r.metodo_pago || 'N/A'}</span></td>
                <td><strong>${formatMoney(r.monto_cobrado || 0)}</strong></td>
                <td class="${resultado >= 0 ? 'resultado-positivo' : 'resultado-negativo'}">
                    <strong>${formatMoney(resultado)}</strong>
                </td>
                <td>
                    <button class="btn-action" title="Ver Detalles" onclick="verVenta(${r.id_venta})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    ${currentUser && currentUser.id_rol === 1 ? `
                        <button class="btn-action" title="Editar" onclick="editarVenta(${r.id_venta})">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        ${r.estado !== 'ANULADA' ? `
                            <button class="btn-action" title="Anular Venta" onclick="mostrarModalAnular(${r.id_venta})" style="border-color: #dc3545; color: #dc3545;">
                                <i class="fa-solid fa-ban"></i>
                            </button>
                        ` : ''}
                    ` : ''}
                </td>
            `;
            body.appendChild(tr);
        });
    }

    /**
     * Actualizar vista
     */
    function actualizarVista() {
        const rows = filterData();
        computeKPIs(rows);
        renderTable(rows);
    }

    /**
     * Ver detalles de una venta
     */
    window.verVenta = async function(id) {
        const venta = ventasData.find(v => v.id_venta == id);
        if (!venta) {
            mostrarNotificacion('Venta no encontrada', 'error');
            return;
        }

        const modal = document.getElementById('modalVerVenta');
        const content = document.getElementById('ventaDetailsContent');
        const idDisplay = document.getElementById('ventaIdDisplay');
        
        if (modal && content && idDisplay) {
            idDisplay.textContent = `Venta #${venta.id_venta}`;
            
            const fecha = new Date(venta.fecha_venta).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const utilidad = parseFloat(venta.utilidad || 0);
            const margen = parseFloat(venta.monto_cobrado) > 0 ? 
                (utilidad / parseFloat(venta.monto_cobrado) * 100).toFixed(1) : 0;
            
            content.innerHTML = `
                <div class="venta-details">
                    <div class="venta-info-section">
                        <h3>Información General</h3>
                        <div class="detail-item">
                            <span class="detail-label">ID Venta:</span>
                            <span class="detail-value">#${venta.id_venta}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Estado:</span>
                            <span class="detail-value">
                                <span class="status ${venta.estado.toLowerCase()}">${venta.estado}</span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Fecha:</span>
                            <span class="detail-value">${fecha}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Pedido Ref.:</span>
                            <span class="detail-value">#${venta.id_pedido || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Cliente:</span>
                            <span class="detail-value">${venta.cliente || 'No especificado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Usuario Registro:</span>
                            <span class="detail-value">${venta.usuario || 'Sistema'}</span>
                        </div>
                    </div>
                    
                    <div class="venta-info-section">
                        <h3>Información Financiera</h3>
                        <div class="detail-item">
                            <span class="detail-label">Método de Pago:</span>
                            <span class="detail-value">${venta.metodo_pago || 'No especificado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Monto Cobrado:</span>
                            <span class="detail-value">${formatMoney(venta.monto_cobrado || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Costo Total:</span>
                            <span class="detail-value">${formatMoney(venta.costo_total || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Utilidad:</span>
                            <span class="detail-value ${utilidad >= 0 ? 'resultado-positivo' : 'resultado-negativo'}">
                                ${formatMoney(utilidad)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Margen:</span>
                            <span class="detail-value ${utilidad >= 0 ? 'resultado-positivo' : 'resultado-negativo'}">
                                ${margen}%
                            </span>
                        </div>
                        ${venta.nota ? `
                        <div class="detail-item">
                            <span class="detail-label">Observaciones:</span>
                            <span class="detail-value">${venta.nota}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            modal.style.display = 'block';
        }
    };

    /**
     * Editar una venta (solo administradores)
     */
    window.editarVenta = function(id) {
        const venta = ventasData.find(v => v.id_venta == id);
        if (!venta) {
            mostrarNotificacion('Venta no encontrada', 'error');
            return;
        }

        if (venta.estado === 'ANULADA') {
            mostrarNotificacion('No se puede editar una venta anulada', 'error');
            return;
        }

        const modal = document.getElementById('modalEditarVenta');
        const idDisplay = document.getElementById('editarVentaIdDisplay');
        
        if (modal && idDisplay) {
            idDisplay.textContent = `Venta #${venta.id_venta}`;
            
            // Llenar formulario con datos actuales
            document.getElementById('editarMonto').value = venta.monto_cobrado || '';
            document.getElementById('editarMetodo').value = venta.metodo_pago || '';
            document.getElementById('editarNota').value = venta.nota || '';
            
            // Guardar ID para la actualización
            modal.dataset.ventaId = venta.id_venta;
            
            modal.style.display = 'block';
        }
    };

    /**
     * Mostrar modal para anular venta (estilo SweetAlert como pedidos)
     */
    window.mostrarModalAnular = function(id) {
        const venta = ventasData.find(v => v.id_venta == id);
        if (!venta) {
            mostrarNotificacion('Venta no encontrada', 'error');
            return;
        }

        showConfirmAnular(
            `¿Estás seguro de que quieres anular la venta #${id}?`,
            async (motivo) => {
                await anularVenta(id, motivo);
            }
        );
    };

    /**
     * Anular una venta (solo administradores)
     */
    window.anularVenta = async function(id, motivo) {
        const url = `${API_BASE_URL}&action=anular&id=${id}`;
        const result = await apiCall('PUT', url, { motivo });
        
        if (result && result.status === 'OK') {
            mostrarNotificacion('Venta anulada correctamente', 'success');
            cargarVentas();
        } else {
            mostrarNotificacion(result.message || 'Error al anular la venta', 'error');
        }
    };

    /**
     * Mostrar modal de confirmación de anulación (estilo SweetAlert)
     * @param {string} message - Mensaje principal
     * @param {Function} onConfirm - Función a ejecutar si se confirma
     */
    function showConfirmAnular(message, onConfirm) {
        return new Promise((resolve, reject) => {
            const modal = document.getElementById('modalConfirmAnular');
            const messageElement = document.getElementById('confirmAnularMessage');
            const motivoInput = document.getElementById('confirmAnularMotivo');
            const btnConfirm = document.getElementById('btnConfirmAnular');
            const btnCancel = document.getElementById('btnCancelAnular');
            
            if (!modal || !messageElement || !btnConfirm || !motivoInput) {
                console.error('Elementos del modal de confirmación no encontrados');
                reject(new Error('Modal no disponible'));
                return;
            }
            
            // Establecer mensaje
            messageElement.textContent = message;
            
            // Limpiar motivo
            motivoInput.value = '';
            
            // Mostrar modal
            modal.classList.add('show');
            
            // Enfocar el campo de motivo
            setTimeout(() => motivoInput.focus(), 100);
            
            // Función para limpiar event listeners
            const cleanup = () => {
                btnConfirm.replaceWith(btnConfirm.cloneNode(true));
                btnCancel.replaceWith(btnCancel.cloneNode(true));
                modal.classList.remove('show');
                // Reconfigurar listeners básicos
                setupConfirmAnularModal();
            };
            
            // Configurar botón confirmar
            const newBtnConfirm = document.getElementById('btnConfirmAnular');
            newBtnConfirm.addEventListener('click', async function() {
                const motivo = document.getElementById('confirmAnularMotivo').value.trim();
                
                if (!motivo) {
                    mostrarNotificacion('Debe especificar un motivo para la anulación', 'error');
                    return;
                }
                
                cleanup();
                try {
                    if (onConfirm) await onConfirm(motivo);
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            });
            
            // Configurar botón cancelar
            const newBtnCancel = document.getElementById('btnCancelAnular');
            newBtnCancel.addEventListener('click', function() {
                cleanup();
                resolve(false);
            });
            
            // Cerrar con ESC
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    /**
     * Configurar modal de confirmación de anulación
     */
    function setupConfirmAnularModal() {
        const modal = document.getElementById('modalConfirmAnular');
        const btnCancel = document.getElementById('btnCancelAnular');
        
        if (!modal) {
            console.error('Modal de confirmación de anulación no encontrado');
            return;
        }
        
        // Cerrar modal con botón cancelar
        if (btnCancel) {
            btnCancel.addEventListener('click', function() {
                modal.classList.remove('show');
            });
        }
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }

    /**
     * Registrar nueva venta
     */
    if (btnNuevaVenta) {
        btnNuevaVenta.addEventListener('click', abrirModalNuevaVenta);
    }

    // Variable para almacenar datos de pedidos
    let pedidosData = [];

    /**
     * Cargar pedidos disponibles para venta
     */
    async function cargarPedidosDisponibles() {
        const select = document.getElementById('pedido');
        if (select) {
            select.innerHTML = '<option value="">Cargando pedidos...</option>';
            
            try {
                const url = '/Color_Ink/public/index.php?route=ventas&caso=1&action=pedidos-disponibles';
                console.log('🔗 URL para pedidos:', url);
                const result = await apiCall('GET', url);
                
                console.log('📥 Respuesta de pedidos:', result);
                
                if (result && result.status === 'OK' && result.data) {
                    pedidosData = result.data; // Guardar datos para uso posterior
                    select.innerHTML = '<option value="">Seleccione un pedido...</option>';
                    result.data.forEach(pedido => {
                        const option = document.createElement('option');
                        option.value = pedido.id_pedido;
                        option.textContent = pedido.display_text || `${pedido.numero_pedido} - Cliente: ${pedido.nombre_cliente}`;
                        select.appendChild(option);
                    });
                    console.log('✅ Pedidos cargados exitosamente:', result.data.length);
                } else {
                    select.innerHTML = '<option value="">No hay pedidos disponibles</option>';
                    console.warn('⚠️ No se pudieron cargar los pedidos - Respuesta:', result);
                }
            } catch (error) {
                console.error('❌ Error cargando pedidos:', error);
                select.innerHTML = '<option value="">Error al cargar pedidos</option>';
            }
        }
    }



    /**
     * Abrir modal para crear nueva venta
     */
    async function abrirModalNuevaVenta() {
        const modal = document.getElementById('modalNuevaVenta');
        if (modal) {
            modal.style.display = 'block';
            await cargarPedidosDisponibles();
        }
    }

    /**
     * Cerrar modales
     */
    function cerrarModales() {
        const modales = ['modalNuevaVenta', 'modalVerVenta', 'modalEditarVenta'];
        modales.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Event listeners para cerrar modales
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') || e.target.classList.contains('close') || e.target.classList.contains('btn-cancelar')) {
            cerrarModales();
        }
    });

    // Mostrar información del pedido seleccionado
    window.mostrarInfoPedido = function() {
        const select = document.getElementById('pedido');
        const infoDiv = document.getElementById('infoPedido');
        const detalleDiv = document.getElementById('infoPedidoDetalle');
        
        if (select && infoDiv && detalleDiv) {
            if (select.value && select.options[select.selectedIndex]) {
                infoDiv.style.display = 'block';
                const selectedText = select.options[select.selectedIndex].text;
                detalleDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(186, 65, 156, 0.1); border-radius: 6px; border-left: 4px solid rgba(186, 65, 156, 0.8);">
                        <i class="fa-solid fa-info-circle" style="color: rgba(186, 65, 156, 0.8);"></i>
                        <div>
                            <p style="margin: 0; font-weight: bold;">${selectedText}</p>
                            <p style="margin: 5px 0 0 0; color: #28a745; font-size: 0.9em;"><i class="fa-solid fa-check-circle"></i> Pedido listo para facturar</p>
                        </div>
                    </div>
                `;
            } else {
                infoDiv.style.display = 'none';
            }
        }
    };

    /**
     * Registrar venta desde el formulario
     */
    async function registrarVenta() {
        const formData = {
            id_pedido: document.getElementById('pedido').value,
            monto_cobrado: document.getElementById('monto').value,
            metodo_pago: document.getElementById('metodo').value,
            nota: document.getElementById('nota').value
        };

        if (!formData.id_pedido || !formData.monto_cobrado || !formData.metodo_pago) {
            mostrarNotificacion('Por favor, complete todos los campos requeridos', 'error');
            return;
        }

        mostrarLoading();
        
        const url = `${API_BASE_URL}&action=crear`;
        const result = await apiCall('POST', url, formData);
        
        if (result && result.status === 'OK') {
            mostrarNotificacion('Venta registrada exitosamente', 'success');
            cerrarModales();
            cargarVentas();
            document.getElementById('formNuevaVenta').reset();
        } else {
            mostrarNotificacion(result.message || 'Error al registrar la venta', 'error');
        }
    }

    /**
     * Actualizar venta editada
     */
    async function actualizarVenta() {
        const modal = document.getElementById('modalEditarVenta');
        const ventaId = modal.dataset.ventaId;
        
        if (!ventaId) {
            mostrarNotificacion('Error: ID de venta no encontrado', 'error');
            return;
        }

        const formData = {
            monto_cobrado: document.getElementById('editarMonto').value,
            metodo_pago: document.getElementById('editarMetodo').value,
            nota: document.getElementById('editarNota').value
        };

        if (!formData.monto_cobrado || !formData.metodo_pago) {
            mostrarNotificacion('Por favor, complete todos los campos requeridos', 'error');
            return;
        }

        const url = `${API_BASE_URL}&action=actualizar&id=${ventaId}`;
        const result = await apiCall('PUT', url, formData);
        
        if (result && result.status === 'OK') {
            mostrarNotificacion('Venta actualizada exitosamente', 'success');
            cerrarModales();
            cargarVentas();
        } else {
            mostrarNotificacion(result.message || 'Error al actualizar la venta', 'error');
        }
    }

    /**
     * Limpiar filtros
     */
    function limpiarFiltros() {
        if (searchInput) searchInput.value = '';
        if (estadoSelect) estadoSelect.value = '';
        const metodoPagoSelect = document.getElementById('metodoPagoSelect');
        if (metodoPagoSelect) metodoPagoSelect.value = '';
        if (desde) desde.value = '';
        
        // Efecto visual en el botón
        const btnLimpiar = document.getElementById('btnLimpiarFiltros');
        if (btnLimpiar) {
            btnLimpiar.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btnLimpiar.style.transform = 'scale(1)';
            }, 150);
        }
        
        // Recargar datos
        cargarVentas();
        mostrarNotificacion('Filtros limpiados', 'success');
    }

    /**
     * Exportar ventas a Excel personalizado
     */
    async function exportarExcel() {
        try {
            const params = new URLSearchParams();
            if (searchInput && searchInput.value) params.append('filtro', searchInput.value);
            if (desde && desde.value) params.append('fecha_desde', desde.value);
            
            const url = `${API_BASE_URL}&action=exportar-excel&${params.toString()}`;
            
            // Obtener token para autenticación
            const currentToken = getCurrentToken();
            if (!currentToken) {
                mostrarNotificacion('Error de autenticación', 'error');
                return;
            }
            
            // Hacer petición con fetch para incluir headers de autenticación
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            
            if (response.ok) {
                // Crear blob y descargar
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `Ventas_ColorInk_${new Date().toISOString().slice(0,10)}.xls`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
                
                mostrarNotificacion('📊 Reporte Excel descargado exitosamente', 'success');
            } else {
                const errorText = await response.text();
                console.error('Error en respuesta:', errorText);
                mostrarNotificacion('Error al generar el reporte Excel', 'error');
            }
        } catch (error) {
            console.error('Error exportando Excel:', error);
            mostrarNotificacion('Error al exportar a Excel', 'error');
        }
    }

    /**
     * Mostrar notificación
     */
    function mostrarNotificacion(mensaje, tipo = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${tipo}`;
        
        const icon = tipo === 'success' ? 'fa-check-circle' : 
                    tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        
        notification.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${mensaje}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${tipo === 'success' ? 'linear-gradient(45deg, #28a745, #20c997)' : 
                         tipo === 'error' ? 'linear-gradient(45deg, #dc3545, #e74c3c)' : 
                         'linear-gradient(45deg, #17a2b8, #20c997)'};
            color: white;
            border-radius: 10px;
            z-index: 10001;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
        
        // Agregar estilos de animación si no existen
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Event listeners
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🔍 VENTAS: Verificando autenticación...');
        
        const sessionValid = initSession();
        
        if (sessionValid) {
            console.log('✅ Sesión válida, cargando ventas...');
            await cargarVentas();
            
            // Event listeners para formularios
            const formNuevaVenta = document.getElementById('formNuevaVenta');
            if (formNuevaVenta) {
                formNuevaVenta.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await registrarVenta();
                });
            }
            
            const btnGuardarEdicion = document.getElementById('btnGuardarEdicion');
            if (btnGuardarEdicion) {
                btnGuardarEdicion.addEventListener('click', actualizarVenta);
            }
            
            if (btnLimpiarFiltros) {
                btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
            }
            
            // Event listener para exportación Excel
            const btnExportarExcel = document.getElementById('btnExportarExcel');
            if (btnExportarExcel) {
                btnExportarExcel.addEventListener('click', exportarExcel);
            }
            
            // Event listener para filtro de método de pago
            const metodoPagoSelect = document.getElementById('metodoPagoSelect');
            if (metodoPagoSelect) {
                metodoPagoSelect.addEventListener('change', actualizarVista);
            }
            
            // Configurar modal de confirmación de anulación
            setupConfirmAnularModal();
            
            // Event listener para mostrar info del pedido
            const selectPedido = document.getElementById('pedido');
            if (selectPedido) {
                selectPedido.addEventListener('change', mostrarInfoPedido);
            }
        } else {
            console.log('❌ Sesión inválida o usuario sin permisos');
        }
    });

    // Event listeners para filtros (fuera del DOMContentLoaded para evitar duplicados)
    if (searchInput) searchInput.addEventListener('input', actualizarVista);
    if (estadoSelect) estadoSelect.addEventListener('change', actualizarVista);
    if (desde) desde.addEventListener('change', actualizarVista);
})();
