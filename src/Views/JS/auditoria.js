(function(){
  function getProjectBase(){
    const parts = window.location.pathname.split('/');
    const pIdx = parts.indexOf('public');
    if (pIdx > 1) return '/' + parts.slice(1, pIdx).join('/');
    const sIdx = parts.indexOf('src');
    return sIdx > 1 ? '/' + parts.slice(1, sIdx).join('/') : '/' + (parts[1] || '');
  }
  // Guard de acceso: requiere login y rol administrador (id_rol === 1)
  (function guardAuditoria(){
    try {
      const base = getProjectBase();
      const loginUrl = base + '/public/login';
      const indexUrl = base + '/public/index';

      const tokenLocal = sessionStorage.getItem('access_token');
      const tokenFirebase = sessionStorage.getItem('firebase_id_token');
      const hasToken = !!(tokenLocal || tokenFirebase);

      if (!hasToken) {
        // No autenticado: ir a login
        window.location.replace(loginUrl);
        return;
      }

      const userStr = sessionStorage.getItem('user');
      let user = null;
      try { user = userStr ? JSON.parse(userStr) : null; } catch(_) {}

      // Si no hay usuario o no es admin, regresar al index
      if (!user || Number(user.id_rol) !== 1) {
        window.location.replace(indexUrl);
        return;
      }
    } catch (e) {
      // En caso de fallo inesperado, forzar login
      window.location.replace(getProjectBase() + '/public/login');
      return;
    }
  })();
  const projectBase = getProjectBase();
  const apiEntry = projectBase + '/public/index.php';
  const apiBase = apiEntry + '?route=audit&caso=1';
  const apiUserBase = apiEntry + '?route=user&caso=1';
  let usersMapCache = null; // cache de id_usuario -> nombre_usuario
  let fpStart = null; // instancia flatpickr para startDate
  let fpEnd = null;   // instancia flatpickr para endDate

  function getAuthToken(){
    // Auditoría exige SOLO token local del backend
    const local = sessionStorage.getItem('access_token');
    return local || '';
  }

  async function apiGet(params){
    // Evitar respuestas en caché cuando se cambia de tabla o filtros
    const qp = new URLSearchParams(params);
    qp.append('_ts', Date.now().toString());
    const url = apiBase + '&' + qp.toString();
    const token = getAuthToken();
    if(!token){
      throw new Error('Se requiere iniciar sesión (token local) para ver Auditoría. Inicia sesión nuevamente.');
    }
    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      cache: 'no-store'
    });
    if(!res.ok){
      const msg = await res.text();
      throw new Error('Error ' + res.status + ': ' + msg);
    }
    return res.json();
  }

  async function apiGetUsers(params){
    // Evitar caché del listado de usuarios para etiquetas en exportación
    const qp = new URLSearchParams(params);
    qp.append('_ts', Date.now().toString());
    const url = apiUserBase + '&' + qp.toString();
    const token = getAuthToken();
    if(!token){
      throw new Error('Se requiere iniciar sesión (token local).');
    }
    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      cache: 'no-store'
    });
    if(!res.ok){
      const msg = await res.text();
      throw new Error('Error ' + res.status + ': ' + msg);
    }
    return res.json();
  }

  function toTag(accion){
    if(!accion) return '';
    const cls = accion.toLowerCase() === 'insert' ? 'insert' : accion.toLowerCase() === 'delete' ? 'delete' : 'update';
    return `<span class="tag ${cls}">${accion}</span>`;
  }

  function formatDateTime(dt){
    if(!dt) return '';
    // Assume server returns 'YYYY-MM-DD HH:MM:SS'
    return dt.replace('T',' ').substring(0,19);
  }

  function getEntityIdColumn(table){
    // Mapeo de tabla a columna de ID de entidad
    const mapping = {
      'producto': 'id_producto',
      'pedido': 'id_pedido',
      'detallepedido': 'id_detalle',
      'proveedor': 'id_proveedor',
      // En venta_aud el id de la entidad original es id_venta_original
      'venta': 'id_venta_original',
      'usuario': 'id_usuario'
    };
    return mapping[table] || null;
  }

  function getEntityIdLabel(table){
    // Mapeo de tabla a etiqueta legible
    const labels = {
      'producto': 'ID Producto',
      'pedido': 'ID Pedido',
      'detallepedido': 'ID Detalle',
      'proveedor': 'ID Proveedor',
      'venta': 'ID Venta',
      'usuario': 'ID Usuario'
    };
    return labels[table] || 'ID Registro';
  }

  function renderTableHead(){
    const table = document.getElementById('tableSelect').value;
    const entityLabel = getEntityIdLabel(table);
    const head = document.getElementById('tableHead');
    head.innerHTML = `
      <tr>
        <th>ID Aud</th>
        <th>${entityLabel}</th>
        <th>Fecha</th>
        <th>Usuario</th>
        <th>Acción</th>
        <th>Detalles</th>
      </tr>`;
  }

  function renderRows(rows){
    const table = document.getElementById('tableSelect').value;
    const entityIdCol = getEntityIdColumn(table);
    const body = document.getElementById('tableBody');
    if (!rows || rows.length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="no-data">No se encontraron registros de auditoría para los filtros seleccionados.</td></tr>`;
      return;
    }
    body.innerHTML = rows.map(r => {
      const id = r.id_aud ?? r.id_venta_aud ?? '';
      const entityId = entityIdCol && r[entityIdCol] ? r[entityIdCol] : '-';
      const fecha = formatDateTime(r.fecha_accion ?? '');
      // Resolver columna de usuario según la tabla
      const rawUserId = table === 'venta' ? (r.usuario_admin ?? '') : (r.usuario_accion ?? '');
      const usuario = (usersMapCache && usersMapCache[rawUserId]) ? `${rawUserId} - ${usersMapCache[rawUserId]}` : `${rawUserId}`;
      const accion = r.accion ?? '';

      // Preparar detalles
      let antes = r.json_antes ?? '';
      let despues = r.json_despues ?? '';
      if ((!antes && !despues) && table === 'venta') {
        // Sintetizar detalles para venta_aud usando su esquema
        const beforeObj = {
          id_venta: r.id_venta_original ?? null,
          id_pedido: r.id_pedido_original ?? null,
          fecha_venta: r.fecha_venta_original ? formatDateTime(r.fecha_venta_original) : null,
          monto_cobrado: r.monto_cobrado_original ?? null,
          estado: r.estado_original ?? null
        };
        const afterObj = {
          accion: r.accion ?? null,
          motivo: r.motivo ?? '',
          usuario_admin: r.usuario_admin ?? null
        };
        try { antes = JSON.stringify(beforeObj); } catch(_) { antes = ''; }
        try { despues = JSON.stringify(afterObj); } catch(_) { despues = ''; }
      }

      return `<tr>
        <td>${id}</td>
        <td><strong>${entityId}</strong></td>
        <td>${fecha}</td>
        <td>${usuario}</td>
        <td>${toTag(accion)}</td>
        <td><button class="btn btn-clear btn-sm" data-antes='${htmlEscape(antes)}' data-despues='${htmlEscape(despues)}'>Ver</button></td>
      </tr>`;
    }).join('');

    // Attach detail handlers
    body.querySelectorAll('button[data-antes]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.getAttribute('data-antes');
        const d = btn.getAttribute('data-despues');
        showDetails(a, d);
      });
    });
  }

  function htmlEscape(str){
    if(str == null) return '';
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function showDetails(antes, despues){
    const modal = document.getElementById('detailModal');
    const preA = document.getElementById('jsonAntes');
    const preD = document.getElementById('jsonDespues');

    preA.textContent = prettyJson(antes);
    preD.textContent = prettyJson(despues);

    modal.classList.remove('hidden');
  }

  function prettyJson(txt){
    if(!txt) return '';
    try{
      return JSON.stringify(JSON.parse(txt), null, 2);
    }catch(e){
      return txt;
    }
  }

  function renderPagination(p){
    const wrap = document.getElementById('pagination');
    wrap.innerHTML = '';
    if(!p || p.pages <= 1) return;
    const frag = document.createDocumentFragment();
    for(let i=1;i<=p.pages;i++){
      const btn = document.createElement('button');
      btn.textContent = i;
      if(i === p.page) btn.classList.add('active');
      btn.addEventListener('click', () => loadData(i));
      frag.appendChild(btn);
    }
    wrap.appendChild(frag);
  }

  async function loadTables(){
    try{
      const json = await apiGet({ action: 'tables' });
      const tables = json.data || [];
      const sel = document.getElementById('tableSelect');
      sel.innerHTML = tables.map(t => `<option value="${t}">${titleCase(t)}</option>`).join('');
      await onTableChanged();
    }catch(e){
      console.error(e);
      alert('No se pudieron cargar las tablas');
    }
  }

  async function onTableChanged(){
    const table = document.getElementById('tableSelect').value;
    try{
      const json = await apiGet({ action: 'filters', table });
      const selU = document.getElementById('userSelect');
      const selT = document.getElementById('txSelect');
      const usuarios = json.data?.usuarios || [];
      const acciones = json.data?.acciones || [];
      selU.innerHTML = `<option value="">Todos</option>` + usuarios.map(u => `<option value="${u}">${u}</option>`).join('');
      selT.innerHTML = `<option value="">Todas</option>` + acciones.map(a => `<option value="${a}">${a}</option>`).join('');
      await loadData(1);
    }catch(e){
      console.error(e);
    }
  }

  async function loadData(page){
    const table = document.getElementById('tableSelect').value;
    const user_id = document.getElementById('userSelect').value;
    const transaction = document.getElementById('txSelect').value;
    const start_date = document.getElementById('startDate').value;
    const end_date = document.getElementById('endDate').value;
    try{
      const json = await apiGet({ action: 'list', table, user_id, transaction, start_date, end_date, page, limit: 20 });
      renderTableHead(); // Llamar primero para actualizar headers según tabla seleccionada
      renderRows(json.data || []);
      renderPagination(json.pagination);
    }catch(e){
      console.error(e);
      alert('Error al cargar auditoría');
    }
  }

  function clearFilters(){
    document.getElementById('userSelect').value = '';
    document.getElementById('txSelect').value = '';
    // Limpiar correctamente flatpickr y valores visibles
    try { if (fpStart) fpStart.clear(); } catch(_) {}
    try { if (fpEnd) fpEnd.clear(); } catch(_) {}
    // Asegurar inputs base también queden vacíos
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    loadData(1);
  }

  function titleCase(s){
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async function exportToExcel(){
    const table = document.getElementById('tableSelect').value;
    const user_id = document.getElementById('userSelect').value;
    const transaction = document.getElementById('txSelect').value;
    const start_date = document.getElementById('startDate').value;
    const end_date = document.getElementById('endDate').value;
    
    try {
      // Asegurar mapa de usuarios (id -> nombre) una sola vez
      await ensureUsersMap();

      // Obtener TODOS los datos sin paginación
      const json = await apiGet({ 
        action: 'list', 
        table, 
        user_id, 
        transaction, 
        start_date, 
        end_date, 
        page: 1, 
        limit: 10000 // Límite alto para obtener todos los registros
      });
      
      const rows = json.data || [];
      if(rows.length === 0){
        alert('No hay datos para exportar');
        return;
      }

      const entityIdCol = getEntityIdColumn(table);
      const entityLabel = getEntityIdLabel(table);
      
      // Preparar datos para Excel (compatibles con esquemas por tabla)
      const excelData = rows.map(r => {
        const entityId = entityIdCol && r[entityIdCol] ? r[entityIdCol] : '-';
        const idAud = r.id_aud ?? r.id_venta_aud ?? '';
        // Columna de usuario según tabla
        const userCol = table === 'venta' ? 'usuario_admin' : 'usuario_accion';
        const userId = r[userCol] ?? '';
        const userName = usersMapCache && usersMapCache[userId] ? usersMapCache[userId] : '';

        // Detalles antes/después: si no existen y es venta, sintetizar
        let antes = r.json_antes || '';
        let despues = r.json_despues || '';
        if ((!antes && !despues) && table === 'venta') {
          const beforeObj = {
            id_venta: r.id_venta_original ?? null,
            id_pedido: r.id_pedido_original ?? null,
            fecha_venta: r.fecha_venta_original ? formatDateTime(r.fecha_venta_original) : null,
            monto_cobrado: r.monto_cobrado_original ?? null,
            estado: r.estado_original ?? null
          };
          const afterObj = {
            accion: r.accion ?? null,
            motivo: r.motivo ?? '',
            usuario_admin: r.usuario_admin ?? null
          };
          try { antes = JSON.stringify(beforeObj); } catch(_) {}
          try { despues = JSON.stringify(afterObj); } catch(_) {}
        }

        return {
          'ID Auditoría': idAud,
          [entityLabel]: entityId,
          'Fecha': formatDateTime(r.fecha_accion ?? ''),
          'ID Usuario': userId,
          'Usuario': userName,
          'Acción': r.accion ?? '',
          'Datos Antes': prettyJson(antes),
          'Datos Después': prettyJson(despues)
        };
      });

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 12 }, // ID Auditoría
        { wch: 12 }, // ID Entidad
        { wch: 20 }, // Fecha
        { wch: 12 }, // ID Usuario
        { wch: 24 }, // Usuario (nombre)
        { wch: 10 }, // Acción
        { wch: 50 }, // Datos Antes
        { wch: 50 }  // Datos Después
      ];
      ws['!cols'] = colWidths;
      
      // Agregar hoja al libro
      const sheetName = `Auditoría ${titleCase(table)}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generar nombre de archivo con fecha
      const fecha = new Date().toISOString().slice(0,10);
      const fileName = `Auditoria_${titleCase(table)}_${fecha}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, fileName);
      
      console.log(`Exportados ${rows.length} registros a Excel`);
    } catch(e) {
      console.error(e);
      alert('Error al exportar: ' + e.message);
    }
  }

  async function ensureUsersMap(){
    if (usersMapCache !== null) return; // ya cargado o intentado
    try {
      const usersResp = await apiGetUsers({ action: 'list' });
      const users = usersResp.data || usersResp || [];
      usersMapCache = {};
      users.forEach(u => {
        const id = Number(u.id_usuario || u.id);
        const name = u.nombre_usuario || u.nombre || u.name || '';
        if (id) usersMapCache[id] = name;
      });
    } catch(e) {
      console.warn('No se pudo obtener lista de usuarios para nombres visibles en tabla/exportación.', e);
      usersMapCache = {}; // evitar reintentos constantes
    }
  }

  function initEvents(){
    document.getElementById('tableSelect').addEventListener('change', onTableChanged);
    document.getElementById('btnSearch').addEventListener('click', () => loadData(1));
    document.getElementById('btnClear').addEventListener('click', clearFilters);
    document.getElementById('btnExport').addEventListener('click', exportToExcel);
    document.getElementById('btnPrint').addEventListener('click', () => window.print());
    document.getElementById('modalClose').addEventListener('click', () => document.getElementById('detailModal').classList.add('hidden'));
    document.addEventListener('keydown', e => { if(e.key === 'Escape') document.getElementById('detailModal').classList.add('hidden'); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    initEvents();
    // Inicializar calendario si está disponible
    try {
      if (window.flatpickr) {
        fpStart = window.flatpickr('#startDate', {
          dateFormat: 'Y-m-d',
          altInput: true,
          altFormat: 'd/m/Y',
          allowInput: true,
        });
        fpEnd = window.flatpickr('#endDate', {
          dateFormat: 'Y-m-d',
          altInput: true,
          altFormat: 'd/m/Y',
          allowInput: true,
        });
      }
    } catch (e) { console.warn('Flatpickr no disponible:', e); }
    renderTableHead();
    // Cargar mapa de usuarios en segundo plano y luego tablas
    ensureUsersMap().finally(() => {
      loadTables();
    });
  });
})();
