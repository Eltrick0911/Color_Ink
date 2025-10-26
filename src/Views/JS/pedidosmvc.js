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
        const origin = window.location.origin || '';
        return origin + '/Color_Ink/public/index.php';
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
            const url = this.apiEntry + '?route=pedidos&caso=1';
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
            
            for (let i = 0; i < files.length; i++) {
                formData.append('imagenes[]', files[i]);
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
            const numeroPedido = raw.numero_pedido || raw.numeroPedido || '';
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
            if (v === null || v === undefined || v === '') return '$0.00';
            const num = Number(v) || 0;
            return num.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
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

        renderTable: function (selector, pedidos) {
            this.tableSelector = selector;
            const table = document.querySelector(selector);
            if (!table) {
                console.warn('Tabla de pedidos no encontrada:', selector);
                return;
            }
            const tbody = table.querySelector('tbody') || table;
            // Limpiar
            tbody.innerHTML = '';

            if (!pedidos || pedidos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.6);">No hay pedidos para mostrar</td></tr>';
                return;
            }

            pedidos.forEach(p => {
                const tr = document.createElement('tr');
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
                
                // Aplicar estilo al selector recién creado
                const selector = tr.querySelector('.status-selector');
                if (selector && p.estadoId) {
                    View.applyEstadoStyle(selector, p.estadoId);
                }
            });

            // Dejar que la vista original maneje los botones; opcionalmente emitir evento
            document.dispatchEvent(new CustomEvent('pedidos:rendered', { detail: { count: pedidos.length } }));
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
        
        // Upload de imagen
        uploadImage: (file) => Model.uploadImage(file),
        
        // Upload múltiple
        uploadMultiple: (files) => Model.uploadMultiple(files)
    };

    // Exportar globalmente
    window.PedidosMVC = PedidosMVC;

})(window, document);
