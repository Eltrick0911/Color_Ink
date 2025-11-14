
/*
 * pedidosmvc.js
 * Capa JS ligera MVC para Pedidos (solo lectura)
 * Provee: Model (API), Controller (normaliza + cachea) y View (render tabla/modal helpers)
 * Uso:
 *   PedidosMVC.init({ apiEntry: '/public/index.php', token: 'BEARER...', tableSelector: '#pedidosTable' })
 */
(function (window, document) {
    'use strict';

    const defaultApiEntry = (function () {
        // Apuntar a public/index.php que es el punto de entrada del enrutador
        const parts = window.location.pathname.split('/');
        const pIdx = parts.indexOf('public');
        const base = pIdx > 1 ? '/' + parts.slice(1, pIdx).join('/') : '';
        return base + '/public/index.php';
    })();

    function safeJSON(res) {
        return res.text().then(text => {
            try { return JSON.parse(text); } catch (e) { return text; }
        });
    }

    function generateRandomToken() {
        // UUID v4 simple
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ===== Model =====
    const Model = {
        // Actualizar pedido (PUT)
        updatePedido: function (idPedido, pedidoData) {
            const url = this.apiEntry + '?route=pedidos/' + encodeURIComponent(idPedido) + '&caso=1';
            return this.request(url, {
                method: 'PUT',
                body: JSON.stringify(pedidoData)
            });
        },

        // Actualizar detalle de pedido (PUT)
        updateDetalle: function (idDetalle, detalleData) {
            const url = this.apiEntry + '?route=pedidos/detalle/' + encodeURIComponent(idDetalle) + '&caso=1';
            return this.request(url, {
                method: 'PUT',
                body: JSON.stringify(detalleData)
            });
        },
        // Eliminar pedido (DELETE)
        deletePedido: function (idPedido) {
            const url = this.apiEntry + '?route=pedidos/' + encodeURIComponent(idPedido) + '&caso=1';
            return this.request(url, {
                method: 'DELETE'
            });
        },
        apiEntry: defaultApiEntry,
        token: null,

        request: async function (url, opts = {}) {
            const headers = opts.headers || {};
            if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
            if (!headers['Content-Type'] && opts.body) headers['Content-Type'] = 'application/json';

            console.log('PedidosMVC - request:', { url, method: opts.method || 'GET', headers });

            const response = await fetch(url, Object.assign({}, opts, { headers }));
            
            console.log('PedidosMVC - response status:', response.status);
            console.log('PedidosMVC - response headers:', {
                contentType: response.headers.get('Content-Type'),
                contentLength: response.headers.get('Content-Length')
            });
            
            const data = await safeJSON(response);
            
            console.log('PedidosMVC - response data:', data);
            
            if (!response.ok) {
                console.error('PedidosMVC - HTTP Error:', response.status, data);
                const serverMsg = (data && typeof data === 'object' && (data.message || data.error)) ? (data.message || data.error) : '';
                const err = new Error('HTTP ' + response.status + (serverMsg ? (': ' + serverMsg) : ''));
                err.response = response;
                err.data = data;
                throw err;
            }
            return data;
        },

        // Try both route patterns when there is ambiguity
        getAllPedidos: function () {
            // Agregar timestamp para evitar caché del navegador
            const timestamp = new Date().getTime();
            const url = this.apiEntry + '?route=pedidos&caso=1&_t=' + timestamp;
            console.log('PedidosMVC - getAllPedidos: URL:', url);
            console.log('PedidosMVC - getAllPedidos: Token:', this.token ? 'Presente' : 'Ausente');
            return this.request(url, { method: 'GET' })
                .then(response => {
                    console.log('PedidosMVC - getAllPedidos: Respuesta recibida:', response);
                    return response;
                })
                .catch(error => {
                    console.error('PedidosMVC - getAllPedidos: Error:', error);
                    throw error;
                });
        },

        getPedidoById: function (id) {
            const url = this.apiEntry + '?route=pedidos/' + encodeURIComponent(id) + '&caso=1';
            return this.request(url, { method: 'GET' });
        },

        getDetalle: async function (id) {
            const url = this.apiEntry + '?route=pedidos/detalle/' + encodeURIComponent(id) + '&caso=1';
            return this.request(url, { method: 'GET' });
        },

        getEstados: function () {
            const url = this.apiEntry + '?route=pedidos/estados&caso=1';
            return this.request(url, { method: 'GET' });
        },
        
        // Crear nuevo pedido
        createPedido: function (pedidoData) {
            const url = this.apiEntry + '?route=pedidos&caso=1';
            return this.request(url, { 
                method: 'POST', 
                body: JSON.stringify(pedidoData) 
            });
        },
        
        // Crear detalle para un pedido específico
        createDetalle: function (idPedido, detalleData) {
            const url = this.apiEntry + '?route=pedidos/' + encodeURIComponent(idPedido) + '/detalle&caso=1';
            return this.request(url, {
                method: 'POST',
                body: JSON.stringify(detalleData)
            });
        },

        // Actualizar pedido (PUT)
        updatePedido: function (idPedido, pedidoData) {
            const url = this.apiEntry + '?route=pedidos/' + encodeURIComponent(idPedido) + '&caso=1';
            return this.request(url, {
                method: 'PUT',
                body: JSON.stringify(pedidoData)
            });
        },

        // Actualizar detalle de pedido (PUT)
        updateDetalle: function (idDetalle, detalleData) {
            const url = this.apiEntry + '?route=pedidos/detalle/' + encodeURIComponent(idDetalle) + '&caso=1';
            return this.request(url, {
                method: 'PUT',
                body: JSON.stringify(detalleData)
            });
        },
        
        // Upload de imagen
        uploadImage: async function (file) {
            const url = this.apiEntry + '?route=upload&caso=1';
            const formData = new FormData();
            formData.append('imagen', file);
            
            const headers = {};
            if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            const data = await safeJSON(response);
            if (!response.ok) {
                const err = new Error('HTTP ' + response.status);
                err.response = response;
                err.data = data;
                throw err;
            }
            return data;
        },
        
        // Upload múltiple de imágenes
        uploadMultiple: async function (files) {
            const url = this.apiEntry + '?route=upload/multiple&caso=1';
            const formData = new FormData();
            
            // PHP espera 'imagenes' sin brackets - FormData maneja múltiples archivos automáticamente
            for (let i = 0; i < files.length; i++) {
                formData.append('imagenes', files[i]);
            }
            
            const headers = {};
            if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            const data = await safeJSON(response);
            if (!response.ok) {
                const err = new Error('HTTP ' + response.status);
                err.response = response;
                err.data = data;
                throw err;
            }
            return data;
        }
        ,
        // Autenticación contra el endpoint auth
        login: function (usuario, contrasena) {
            const url = this.apiEntry + '?route=auth&action=login';
            const body = { usuario: String(usuario), contrasena: String(contrasena) };
            return this.request(url, { method: 'POST', body: JSON.stringify(body) });
        },
        me: function () {
            const url = this.apiEntry + '?route=auth&action=me';
            return this.request(url, { method: 'GET' });
        }
    };

    // ===== Controller =====
    const Controller = {
        normalizePedido: function (raw) {
            // raw puede venir con distintas claves según el backend; mapear seguros
            // ID SIEMPRE del campo id_pedido (no usar numero_pedido como fallback)
            const idPedido = raw.id_pedido || raw.id || raw.ID || raw.idPedido || '';
            // Mostrar como "Número" el ID autoincremental de la BD por requerimiento
            const numeroPedido = (raw.id_pedido || raw.id || raw.ID) ?? (raw.numero_pedido || raw.numeroPedido || '');
            const cliente = raw.cliente_nombre || raw.nombre_usuario || raw.cliente || raw.usuario || '';
            const fecha = raw.fecha_pedido || raw.fecha || raw.fecha || '';
            const fechaEntrega = raw.fecha_entrega || raw.fechaEntrega || '';
            
            // Para el estado, guardar tanto el código como el ID para poder seleccionar correctamente
            const estadoCodigo = raw.estado_codigo || '';
            const estadoNombre = raw.estado_nombre || raw.nombre || '';
            const estadoId = raw.id_estado || '';
            
            const total = (raw.total_pedido !== undefined ? raw.total_pedido : (raw.total || 0));

            return {
                id: String(idPedido),
                idPedido: String(idPedido),
                numeroPedido: String(numeroPedido || ''),
                cliente: cliente || 'Cliente sin nombre',
                fecha: Controller.formatDate(fecha),
                fechaEntrega: Controller.formatDate(fechaEntrega),
                estado: estadoCodigo || 'PROCESO',
                estadoId: estadoId,
                estadoNombre: estadoNombre || 'Sin estado',
                total: Controller.formatCurrency(total),
                telefono: raw.cliente_telefono || raw.telefono || '',
                email: raw.email || '',
                observaciones: raw.observaciones || raw.detalles_producto || '',
                prioridad: raw.prioridad || 'normal',
                raw: raw
            };
        },

        formatDate: function (d) {
            if (!d) return '';
            // Aceptar 'YYYY-MM-DD' o DATETIME
            try {
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return String(d);
                // Formato: DD/MM/YYYY
                const day = String(dt.getDate()).padStart(2, '0');
                const month = String(dt.getMonth() + 1).padStart(2, '0');
                const year = dt.getFullYear();
                return `${day}/${month}/${year}`;
            } catch (e) { return String(d); }
        },

        formatCurrency: function (v) {
            if (v === null || v === undefined || v === '') return 'L 0.00';
            const num = Number(v) || 0;
            return 'L ' + num.toFixed(2);
        }
    };

    // ===== View =====
    const View = {
        tableSelector: null,
        estados: [],

        cachePedidos: function (list) {
            try { localStorage.setItem('pedidos', JSON.stringify(list)); } catch (e) { console.warn('No se pudo cachear localmente', e); }
        },

        getCachedPedidos: function () {
            try { return JSON.parse(localStorage.getItem('pedidos') || '[]'); } catch (e) { return []; }
        },

        // Variables de paginación
        currentPage: 1,
        itemsPerPage: 10,
        allPedidos: [],

        renderTable: function (selector, pedidos, isFiltered = false) {
            console.log('PedidosMVC - renderTable: Selector:', selector, 'Pedidos:', pedidos.length, 'isFiltered:', isFiltered);
            this.tableSelector = selector;
            
            // Solo actualizar allPedidos si NO es una vista filtrada
            if (!isFiltered) {
                this.allPedidos = pedidos; // Guardar todos los pedidos solo cuando viene data fresca
                this.filteredPedidos = pedidos; // Inicialmente, los filtrados son todos
            }
            
            const table = document.querySelector(selector);
            if (!table) {
                console.warn('Tabla de pedidos no encontrada:', selector);
                return;
            }
            const tbody = table.querySelector('tbody') || table;
            
            if (!pedidos || pedidos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.6);">No hay pedidos para mostrar</td></tr>';
                this.renderPagination(0);
                return;
            }

            // Calcular paginación
            const totalPages = Math.ceil(pedidos.length / this.itemsPerPage);
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedPedidos = pedidos.slice(startIndex, endIndex);

            // Limpiar
            tbody.innerHTML = '';
            console.log('PedidosMVC - renderTable: Mostrando', paginatedPedidos.length, 'de', pedidos.length, 'pedidos (Página', this.currentPage, 'de', totalPages + ')');

            paginatedPedidos.forEach(p => {
                const tr = document.createElement('tr');
                // Añadir atributos de filtrado y búsqueda
                tr.dataset.estadoId = p.estadoId || '';
                tr.dataset.estadoNombre = (p.estadoNombre || '').toLowerCase();
                tr.dataset.searchIndex = (
                    (p.numeroPedido || '') + ' ' + (p.cliente || '') + ' ' + (p.fecha || '') + ' ' +
                    (p.fechaEntrega || '') + ' ' + (p.total || '') + ' ' + (p.estadoNombre || '')
                ).toLowerCase();
                tr.innerHTML = `
                    <td class="pedido-id">${p.numeroPedido || ''}</td>
                    <td class="pedido-cliente">${p.cliente}</td>
                    <td class="pedido-fecha">${p.fecha}</td>
                    <td class="pedido-fecha-entrega">${p.fechaEntrega}</td>
                    <td class="pedido-estado">${View.renderEstadoSelect(p.estadoId, p.id)}</td>
                    <td class="pedido-total">${p.total}</td>
                    <td class="pedido-actions">
                        <button class="btn-action btn-view" title="Ver" data-id="${p.id}"><i class="fa fa-eye"></i></button>
                        <button class="btn-action btn-edit" title="Editar" data-id="${p.id}"><i class="fa fa-edit"></i></button>
                        <button class="btn-action btn-delete" title="Eliminar" data-id="${p.id}"><i class="fa fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
                const selector = tr.querySelector('.status-selector');
                if (selector && p.estadoId) {
                    View.applyEstadoStyle(selector, p.estadoId);
                }
            });

            // Renderizar controles de paginación
            this.renderPagination(pedidos.length);

            // Dejar que la vista original maneje los botones; opcionalmente emitir evento
            document.dispatchEvent(new CustomEvent('pedidos:rendered', { detail: { count: paginatedPedidos.length, total: pedidos.length } }));
        },

        renderPagination: function(totalItems) {
            const totalPages = Math.ceil(totalItems / this.itemsPerPage);
            
            // Buscar el contenedor específico de paginación
            let paginationContainer = document.querySelector('#paginationWrapper .pagination-container');
            
            if (!paginationContainer) {
                // Buscar el wrapper principal
                const wrapper = document.querySelector('#paginationWrapper');
                if (!wrapper) {
                    console.warn('No se encontró el contenedor #paginationWrapper');
                    return;
                }
                
                // Crear el contenedor de paginación
                paginationContainer = document.createElement('div');
                paginationContainer.className = 'pagination-container';
                wrapper.appendChild(paginationContainer);
            }
            
            if (totalPages <= 1) {
                paginationContainer.innerHTML = `
                    <div class="pagination-info">
                        Mostrando ${totalItems} pedido${totalItems !== 1 ? 's' : ''}
                    </div>
                `;
                return;
            }
            
            const startItem = ((this.currentPage - 1) * this.itemsPerPage) + 1;
            const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
            
            // Generar números de página (máximo 5 visibles)
            let pageNumbers = [];
            let startPage, endPage;
            
            if (totalPages <= 5) {
                // Mostrar todas las páginas si son 5 o menos
                startPage = 1;
                endPage = totalPages;
            } else {
                // Mostrar 5 páginas alrededor de la actual
                if (this.currentPage <= 3) {
                    startPage = 1;
                    endPage = 5;
                } else if (this.currentPage >= totalPages - 2) {
                    startPage = totalPages - 4;
                    endPage = totalPages;
                } else {
                    startPage = this.currentPage - 2;
                    endPage = this.currentPage + 2;
                }
            }
            
            // Generar los botones de números
            let pageButtonsHTML = '';
            
            // Botón Primera página
            pageButtonsHTML += `
                <button class="btn-pagination btn-first" ${this.currentPage === 1 ? 'disabled' : ''} 
                    title="Primera página">
                    <i class="fa fa-angle-double-left"></i>
                </button>
            `;
            
            // Botón Anterior
            pageButtonsHTML += `
                <button class="btn-pagination btn-prev" ${this.currentPage === 1 ? 'disabled' : ''}
                    title="Página anterior">
                    <i class="fa fa-angle-left"></i>
                </button>
            `;
            
            // Números de página
            for (let i = startPage; i <= endPage; i++) {
                const isActive = i === this.currentPage;
                pageButtonsHTML += `
                    <button class="btn-pagination btn-page ${isActive ? 'active' : ''}" 
                        data-page="${i}"
                        title="Ir a página ${i}">
                        ${i}
                    </button>
                `;
            }
            
            // Botón Siguiente
            pageButtonsHTML += `
                <button class="btn-pagination btn-next" ${this.currentPage === totalPages ? 'disabled' : ''}
                    title="Página siguiente">
                    <i class="fa fa-angle-right"></i>
                </button>
            `;
            
            // Botón Última página
            pageButtonsHTML += `
                <button class="btn-pagination btn-last" ${this.currentPage === totalPages ? 'disabled' : ''}
                    title="Última página">
                    <i class="fa fa-angle-double-right"></i>
                </button>
            `;
            
            paginationContainer.innerHTML = `
                <div class="pagination-info">
                    ${startItem}-${endItem} de ${totalItems}
                </div>
                <div class="pagination-buttons">
                    ${pageButtonsHTML}
                </div>
            `;
            
            // Agregar event listeners
            const btnFirst = paginationContainer.querySelector('.btn-first');
            const btnPrev = paginationContainer.querySelector('.btn-prev');
            const btnNext = paginationContainer.querySelector('.btn-next');
            const btnLast = paginationContainer.querySelector('.btn-last');
            const pageButtons = paginationContainer.querySelectorAll('.btn-page');
            
            if (btnFirst) btnFirst.addEventListener('click', () => this.goToPage(1));
            if (btnPrev) btnPrev.addEventListener('click', () => this.goToPage(this.currentPage - 1));
            if (btnNext) btnNext.addEventListener('click', () => this.goToPage(this.currentPage + 1));
            if (btnLast) btnLast.addEventListener('click', () => this.goToPage(totalPages));
            
            pageButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.dataset.page);
                    this.goToPage(page);
                });
            });
        },

        goToPage: function(pageNumber) {
            const totalPages = Math.ceil(this.filteredPedidos.length / this.itemsPerPage);
            if (pageNumber < 1 || pageNumber > totalPages) return;
            
            this.currentPage = pageNumber;
            this.renderTable(this.tableSelector, this.filteredPedidos);
            
            // Scroll suave hacia arriba de la tabla
            const table = document.querySelector(this.tableSelector);
            if (table) {
                table.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        
        filteredPedidos: [],
        
        // Filtro compuesto (estado + texto) - ahora trabaja con paginación
        applyCompositeFilter: function({ estado = '', search = '' } = {}) {
            if (!this.allPedidos || this.allPedidos.length === 0) return;
            
            const estadoFilter = String(estado).trim();
            const searchTerm = search.toLowerCase();
            
            console.log('🔍 Filtro aplicado:', { estadoFilter, searchTerm, totalPedidos: this.allPedidos.length });
            
            // Debug: mostrar primer pedido para ver estructura
            if (this.allPedidos.length > 0) {
                console.log('📦 Ejemplo de pedido:', {
                    estadoId: this.allPedidos[0].estadoId,
                    estadoNombre: this.allPedidos[0].estadoNombre,
                    estado: this.allPedidos[0].estado,
                    raw: this.allPedidos[0].raw?.id_estado
                });
            }
            
            // Filtrar los pedidos
            this.filteredPedidos = this.allPedidos.filter(pedido => {
                // Crear índice de búsqueda
                const searchIndex = (
                    (pedido.numeroPedido || '') + ' ' + 
                    (pedido.cliente || '') + ' ' + 
                    (pedido.fecha || '') + ' ' +
                    (pedido.fechaEntrega || '') + ' ' + 
                    (pedido.total || '') + ' ' + 
                    (pedido.estadoNombre || '')
                ).toLowerCase();
                
                const matchEstado = !estadoFilter || String(pedido.estadoId) === estadoFilter;
                const matchSearch = !searchTerm || searchIndex.includes(searchTerm);
                
                return matchEstado && matchSearch;
            });
            
            console.log('✅ Pedidos filtrados:', this.filteredPedidos.length);
            
            // Resetear a la primera página
            this.currentPage = 1;
            
            // Re-renderizar la tabla con los pedidos filtrados
            this.renderTable(this.tableSelector, this.filteredPedidos, true); // ← true = isFiltered
            
            // Emitir evento
            document.dispatchEvent(new CustomEvent('pedidos:filtered', { 
                detail: { 
                    visible: this.filteredPedidos.length,
                    total: this.allPedidos.length
                } 
            }));
        },

        renderEstadoSelect: function (currentEstadoId, pedidoId) {
            // Opciones fijas (catálogo controlado): 1=Entregado, 2=Cancelado, 3=En Proceso
            const options = [
                { id: 1, codigo: 'ENTRG', nombre: 'Entregado' },
                { id: 2, codigo: 'CANC', nombre: 'Cancelado' },
                { id: 3, codigo: 'PROCESO', nombre: 'En Proceso' }
            ];

            const optsHtml = options.map(opt => {
                const sel = String(opt.id) === String(currentEstadoId) ? 'selected' : '';
                return `<option value="${opt.id}" data-codigo="${opt.codigo}" ${sel}>${opt.nombre}</option>`;
            }).join('');

            return `<select class="status-selector" data-pedido-id="${pedidoId}" data-current-estado="${currentEstadoId}">${optsHtml}</select>`;
        },
        
        applyEstadoStyle: function(selector, estadoId) {
            // Mapeo de IDs a códigos de estado
            // 1: ENTRG (Entregado), 2: CANC (Cancelado), 3: PROCESO (En Proceso)
            const estadoMap = {
                '1': { class: 'entregado', bg: 'rgba(40, 167, 69, 0.2)', color: '#28a745', border: '#28a745' },
                '2': { class: 'cancelado', bg: 'rgba(220, 53, 69, 0.2)', color: '#dc3545', border: '#dc3545' },
                '3': { class: 'proceso', bg: 'rgba(0, 123, 255, 0.2)', color: '#007bff', border: '#007bff' }
            };
            
            const config = estadoMap[String(estadoId)] || estadoMap['3'];
            
            // Aplicar estilos al selector
            selector.style.backgroundColor = config.bg;
            selector.style.color = config.color;
            selector.style.borderColor = config.border;
            selector.style.fontWeight = '600';
            selector.style.cursor = 'pointer';
            selector.style.padding = '8px';
            selector.style.borderRadius = '4px';
            
            // Estilos críticos para hacer las opciones visibles con tema oscuro
            const options = selector.querySelectorAll('option');
            options.forEach(opt => {
                // Fondo oscuro y texto claro para integrarlo al diseño
                opt.style.backgroundColor = '#1f1f1f';
                opt.style.color = '#f3f3f3';
                opt.style.padding = '10px';
                opt.style.fontSize = '14px';
            });
        }
    };

    // ===== Public API =====
    const PedidosMVC = {
        init: async function (opts = {}) {
            Model.apiEntry = opts.apiEntry || Model.apiEntry;
            const tableSelector = opts.tableSelector || '#pedidosTable';

            // Token priority: opts.token -> existing Model.token -> localStorage
            Model.token = opts.token || Model.token || (localStorage.getItem('token') || null);

            // Auto-generate a dev token if none exists (can disable with autoCreateToken:false)
            if (!Model.token && opts.autoCreateToken !== false) {
                Model.token = generateRandomToken();
                try { localStorage.setItem('token', Model.token); } catch (e) { /* ignore */ }
                console.warn('PedidosMVC: token auto generado para desarrollo');
            }

            try {
                console.log('PedidosMVC.init: Obteniendo estados...');
                const estadosRes = await Model.getEstados().catch((err) => {
                    console.warn('PedidosMVC.init: Error al obtener estados:', err);
                    return null;
                });
                if (estadosRes && estadosRes.data) {
                    View.estados = estadosRes.data;
                    console.log('PedidosMVC.init: Estados cargados:', View.estados.length);
                }

                console.log('PedidosMVC.init: Obteniendo pedidos...');
                const res = await Model.getAllPedidos();
                console.log('PedidosMVC.init: Respuesta completa:', res);
                
                // respuesta puede venir en varias formas: data, response, o directamente array
                let rawList = [];
                if (res && res.data) {
                    rawList = res.data;
                    console.log('PedidosMVC.init: Usando res.data, cantidad:', rawList.length);
                } else if (Array.isArray(res)) {
                    rawList = res;
                    console.log('PedidosMVC.init: Usando res directo (array), cantidad:', rawList.length);
                } else if (res && res.pedidos) {
                    rawList = res.pedidos;
                    console.log('PedidosMVC.init: Usando res.pedidos, cantidad:', rawList.length);
                } else {
                    console.warn('PedidosMVC.init: Estructura de respuesta no reconocida:', res);
                }

                console.log('PedidosMVC.init: rawList:', rawList);
                const normalized = rawList.map(Controller.normalizePedido);
                console.log('PedidosMVC.init: normalized:', normalized);
                
                View.cachePedidos(normalized);
                View.renderTable(tableSelector, normalized);
                return normalized;
            } catch (e) {
                console.error('PedidosMVC.init error:', e);
                console.error('PedidosMVC.init error stack:', e.stack);
                console.error('PedidosMVC.init error data:', e.data);
                return [];
            }
        },

        // expose model/controller/view small helpers
        fetchAll: () => Model.getAllPedidos(),
        fetchOne: (id) => Model.getPedidoById(id),
        fetchDetalle: (id) => Model.getDetalle(id),
        // Autenticación: login y validate
        login: async (usuario, contrasena) => {
            const res = await Model.login(usuario, contrasena);
            // Respuesta esperada: { status: 'OK', data: { token: '...' , user: {...} } }
            const token = res && res.data && res.data.token ? res.data.token : null;
            if (token) {
                PedidosMVC.setToken(token);
            }
            return res;
        },
        me: () => Model.me(),
        getCached: () => View.getCachedPedidos(),
        renderCached: (selector) => View.renderTable(selector, View.getCachedPedidos()),
        setToken: (t) => { Model.token = t; localStorage.setItem('token', t); },
        // Exponer filtrado compuesto a la vista principal
        filter: function({ estado = '', search = '' } = {}) {
            View.applyCompositeFilter({ estado, search });
        },
        
        // Crear pedido desde formulario
        crearPedido: async (pedidoData) => {
            try {
                const res = await Model.createPedido(pedidoData);
                // No recargar aquí para evitar usar selector por defecto; dejar que el llamador controle el refresh
                return res;
            } catch (e) {
                console.error('Error al crear pedido:', e);
                throw e;
            }
        },
        // Crear detalle de pedido
        createDetalle: (idPedido, detalleData) => Model.createDetalle(idPedido, detalleData),
        
        // Actualizar pedido
        updatePedido: (idPedido, pedidoData) => Model.updatePedido(idPedido, pedidoData),
        
        // Actualizar detalle
        updateDetalle: (idDetalle, detalleData) => Model.updateDetalle(idDetalle, detalleData),
        
        // Eliminar pedido
        deletePedido: (idPedido) => Model.deletePedido(idPedido),
        
        // Upload de imagen
        uploadImage: (file) => Model.uploadImage(file),
        
        // Upload múltiple
        uploadMultiple: (files) => Model.uploadMultiple(files),
        
        // Exponer Model directamente para acceso avanzado
        Model: Model
    };

    // Exportar globalmente
    window.PedidosMVC = PedidosMVC;

})(window, document);
