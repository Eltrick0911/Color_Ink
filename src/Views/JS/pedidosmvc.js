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
        // Intentar inferir la entrada de la API; puede sobrescribirse en init
        const origin = window.location.origin || '';
        return origin + '/public/index.php';
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

            const response = await fetch(url, Object.assign({}, opts, { headers }));
            const data = await safeJSON(response);
            if (!response.ok) {
                const err = new Error('HTTP ' + response.status);
                err.response = response;
                err.data = data;
                throw err;
            }
            return data;
        },

        // Try both route patterns when there is ambiguity
        getAllPedidos: function () {
            const url = this.apiEntry + '?route=pedidos';
            return this.request(url, { method: 'GET' });
        },

        getPedidoById: function (id) {
            const candidates = [
                this.apiEntry + '?route=pedidos/' + encodeURIComponent(id),
                this.apiEntry + '?route=pedidos/' + encodeURIComponent(id) + '/'
            ];
            // Try first candidate then fallback
            return this.request(candidates[0], { method: 'GET' });
        },

        getDetalle: async function (id) {
            const tryUrls = [
                this.apiEntry + '?route=pedidos/detalle/' + encodeURIComponent(id),
                this.apiEntry + '?route=pedidos/' + encodeURIComponent(id) + '/detalle'
            ];
            for (let u of tryUrls) {
                try {
                    return await this.request(u, { method: 'GET' });
                } catch (e) {
                    // continuar al siguiente
                }
            }
            throw new Error('No se pudo obtener detalle del pedido ' + id);
        },

        getEstados: function () {
            const url = this.apiEntry + '?route=pedidos/estados';
            return this.request(url, { method: 'GET' });
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
            const id = raw.id_pedido || raw.id || raw.numero_pedido || raw.ID || raw.idPedido || '';
            const cliente = raw.cliente_nombre || raw.nombre_usuario || raw.cliente || raw.usuario || '';
            const fecha = raw.fecha_pedido || raw.fecha || raw.fecha || '';
            const fechaEntrega = raw.fecha_entrega || raw.fechaEntrega || '';
            const estado = (raw.estado_codigo || raw.estado || raw.estado_nombre || raw.nombre || '').toString();
            const total = (raw.total_pedido !== undefined ? raw.total_pedido : (raw.total || 0));

            return {
                id: String(id),
                cliente: cliente || 'Cliente sin nombre',
                fecha: Controller.formatDate(fecha),
                fechaEntrega: Controller.formatDate(fechaEntrega),
                estado: estado || 'pendiente',
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
                return dt.toLocaleString();
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

            pedidos.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="pedido-id">${p.id}</td>
                    <td class="pedido-cliente">${p.cliente}</td>
                    <td class="pedido-fecha">${p.fecha}</td>
                    <td class="pedido-estado">${View.renderEstadoSelect(p.estado)}</td>
                    <td class="pedido-total">${p.total}</td>
                    <td class="pedido-actions">
                        <button class="btn-action btn-view" title="Ver"><i class="fa fa-eye"></i></button>
                        <button class="btn-action btn-edit" title="Editar"><i class="fa fa-edit"></i></button>
                        <button class="btn-action btn-delete" title="Eliminar"><i class="fa fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Dejar que la vista original maneje los botones; opcionalmente emitir evento
            document.dispatchEvent(new CustomEvent('pedidos:rendered', { detail: { count: pedidos.length } }));
        },

        renderEstadoSelect: function (current) {
            const options = (this.estados && this.estados.length) ? this.estados : [{ id: 'pendiente', nombre: 'Pendiente' }];
            const optsHtml = options.map(opt => {
                const val = opt.codigo || opt.id || opt.nombre || opt;
                const name = opt.nombre || opt.nombre_estado || opt.label || opt;
                const sel = String(val) === String(current) ? 'selected' : '';
                return `<option value="${val}" ${sel}>${name}</option>`;
            }).join('');
            return `<select class="status-selector">${optsHtml}</select>`;
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
                const estadosRes = await Model.getEstados().catch(() => null);
                if (estadosRes && estadosRes.data) View.estados = estadosRes.data;

                const res = await Model.getAllPedidos();
                // respuesta puede venir en varias formas: data, response, o directamente array
                let rawList = [];
                if (res && res.data) rawList = res.data;
                else if (Array.isArray(res)) rawList = res;
                else if (res && res.pedidos) rawList = res.pedidos;

                const normalized = rawList.map(Controller.normalizePedido);
                View.cachePedidos(normalized);
                View.renderTable(tableSelector, normalized);
                return normalized;
            } catch (e) {
                console.error('PedidosMVC.init error:', e);
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
        setToken: (t) => { Model.token = t; localStorage.setItem('token', t); }
    };

    // Exportar globalmente
    window.PedidosMVC = PedidosMVC;

})(window, document);
