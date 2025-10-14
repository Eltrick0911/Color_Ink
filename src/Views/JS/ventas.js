// Lógica de Ventas: calcula ingresos, costos, resultado y margen
(function() {
    const data = [
        // tipo: "pedido" = venta entregada; "inventario" = ajuste/movimiento
        { id: 'V-001', tipo: 'pedido', ref: '#001', descripcion: 'Juan Pérez', fecha: '2024-01-15', ingreso: 150.00, costo: 90.00 },
        { id: 'V-002', tipo: 'pedido', ref: '#002', descripcion: 'María García', fecha: '2024-01-14', ingreso: 275.50, costo: 180.00 },
        { id: 'V-003', tipo: 'inventario', ref: 'Ajuste INK-001', descripcion: 'Tinta Negra Canon', fecha: '2024-01-14', ingreso: 0.00, costo: 45.00 },
        { id: 'V-004', tipo: 'pedido', ref: '#003', descripcion: 'Carlos López', fecha: '2024-01-13', ingreso: 89.99, costo: 55.00 },
        { id: 'V-005', tipo: 'inventario', ref: 'Reposición PAP-002', descripcion: 'Papel A4', fecha: '2024-01-13', ingreso: 0.00, costo: 12.50 }
    ];

    const body = document.getElementById('ventasBody');
    const kpiIngresos = document.getElementById('kpiIngresos');
    const kpiCostos = document.getElementById('kpiCostos');
    const kpiResultado = document.getElementById('kpiResultado');
    const kpiMargen = document.getElementById('kpiMargen');

    const searchInput = document.getElementById('searchInput');
    const estadoSelect = document.getElementById('estadoSelect');
    const desde = document.getElementById('desde');
    const hasta = document.getElementById('hasta');

    function formatMoney(value) {
        return `$${value.toFixed(2)}`;
    }

    function withinDate(dateStr) {
        if (!desde.value && !hasta.value) return true;
        const d = new Date(dateStr);
        if (desde.value) {
            const from = new Date(desde.value);
            if (d < from) return false;
        }
        if (hasta.value) {
            const to = new Date(hasta.value);
            if (d > to) return false;
        }
        return true;
    }

    function filterData() {
        const q = (searchInput.value || '').toLowerCase();
        const tipo = estadoSelect.value;
        return data.filter(item => {
            const matchesQuery = !q || item.descripcion.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q);
            const matchesTipo = !tipo || item.tipo === tipo;
            const matchesDate = withinDate(item.fecha);
            return matchesQuery && matchesTipo && matchesDate;
        });
    }

    function computeKPIs(rows) {
        const ingresos = rows.reduce((acc, r) => acc + r.ingreso, 0);
        const costos = rows.reduce((acc, r) => acc + r.costo, 0);
        const resultado = ingresos - costos;
        const margen = ingresos > 0 ? (resultado / ingresos) * 100 : 0;
        kpiIngresos.textContent = formatMoney(ingresos);
        kpiCostos.textContent = formatMoney(costos);
        kpiResultado.textContent = formatMoney(resultado);
        kpiMargen.textContent = `${margen.toFixed(1)}%`;
        kpiResultado.className = 'stat-number ' + (resultado >= 0 ? 'resultado-positivo' : 'resultado-negativo');
    }

    function renderTable(rows) {
        body.innerHTML = '';
        rows.forEach(r => {
            const tr = document.createElement('tr');
            const resultado = r.ingreso - r.costo;
            tr.innerHTML = `
                <td>${r.id}</td>
                <td>${r.tipo === 'pedido' ? 'Pedido Entregado' : 'Movimiento Inventario'}</td>
                <td>${r.ref}</td>
                <td>${r.descripcion}</td>
                <td>${r.fecha}</td>
                <td>${formatMoney(r.ingreso)}</td>
                <td>${formatMoney(r.costo)}</td>
                <td class="${resultado >= 0 ? 'resultado-positivo' : 'resultado-negativo'}">${formatMoney(resultado)}</td>
                <td>
                    <button class="btn-action" title="Ver"><i class="fa-solid fa-eye"></i></button>
                </td>
            `;
            body.appendChild(tr);
        });
    }

    function update() {
        const rows = filterData();
        computeKPIs(rows);
        renderTable(rows);
    }

    document.addEventListener('DOMContentLoaded', update);
    [searchInput, estadoSelect, desde, hasta].forEach(el => el.addEventListener('input', update));
})();


