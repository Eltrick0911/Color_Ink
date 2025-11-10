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
  let fechaDesde = null; // fecha inicio seleccionada (YYYY-MM-DD)
  let fechaHasta = null; // fecha fin seleccionada (YYYY-MM-DD)
  let loadingEl = null; // overlay de carga
  let isFirstDataLoad = true; // mostrar overlay solo en la primera carga de datos
  let pendingLoads = 0; // contador para anidar llamadas durante la carga inicial

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

  function showLoading(){
    // Inline loading: insertar mensaje directamente en el tbody de la tabla
    if (!isFirstDataLoad) return;
    const tbody = document.getElementById('tableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando auditoría...</td></tr>';
    }
  }
  function hideLoading(){
    // Al terminar, isFirstDataLoad se desactiva para ya no mostrar loading en siguientes consultas
    if (!isFirstDataLoad) return;
    isFirstDataLoad = false;
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

  function translateOperacion(accion, jsonAntes, jsonDespues, table){
    // Traduce el tipo de operación al español
    // Si es UPDATE en producto y cambió activo de 1 a 0, mostrar como Eliminación
    const upper = (accion || '').toUpperCase();
    
    if (upper === 'UPDATE' && table === 'producto') {
      try {
        const antes = jsonAntes ? JSON.parse(jsonAntes) : {};
        const despues = jsonDespues ? JSON.parse(jsonDespues) : {};
        
        // Detectar si cambió de activo=1 a activo=0
        if (antes.activo === 1 && despues.activo === 0) {
          return 'Eliminación';
        }
      } catch (e) {
        // Si hay error al parsear, continuar con traducción normal
      }
    }
    
    const translations = {
      'INSERT': 'Creación',
      'UPDATE': 'Actualización',
      'DELETE': 'Eliminación'
    };
    return translations[upper] || accion;
  }

  function toTag(accion, jsonAntes, jsonDespues, table){
    if(!accion) return '';
    const texto = translateOperacion(accion, jsonAntes, jsonDespues, table);
    
    // Determinar clase CSS: si el texto es "Eliminación", usar clase delete
    const upper = (accion || '').toUpperCase();
    let cls = 'update'; // default
    if (upper === 'INSERT') cls = 'insert';
    else if (upper === 'DELETE' || texto === 'Eliminación') cls = 'delete';
    
    return `<span class="tag ${cls}">${texto}</span>`;
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
    const transaction = document.getElementById('txSelect').value;
    const entityIdCol = getEntityIdColumn(table);
    const body = document.getElementById('tableBody');
    if (!rows || rows.length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="no-data">No se encontraron registros de auditoría para los filtros seleccionados.</td></tr>`;
      return;
    }
    
    // Aplicar filtro inteligente en el frontend para tabla producto
    let filteredRows = rows;
    if (table === 'producto') {
      filteredRows = rows.filter(r => {
        const accion = (r.accion || '').toUpperCase();
        let antes = r.json_antes || '';
        let despues = r.json_despues || '';
        
        // Parsear JSON para detectar cambio de activo
        let antesObj = {};
        let despuesObj = {};
        try { antesObj = antes ? JSON.parse(antes) : {}; } catch(e) {}
        try { despuesObj = despues ? JSON.parse(despues) : {}; } catch(e) {}
        
        const esEliminacionLogica = (antesObj.activo === 1 && despuesObj.activo === 0);
        
        // Si NO hay filtro de transacción, mostrar todo
        if (!transaction) {
          return true;
        }
        
        const transUpper = transaction.toUpperCase();
        
        // Si buscan UPDATE: excluir eliminaciones lógicas (mostrar solo updates reales)
        if (transUpper === 'UPDATE') {
          return (accion === 'UPDATE' && !esEliminacionLogica);
        }
        
        // Si buscan DELETE: mostrar DELETE reales Y eliminaciones lógicas (UPDATE con activo 1→0)
        if (transUpper === 'DELETE') {
          return (accion === 'DELETE') || (accion === 'UPDATE' && esEliminacionLogica);
        }
        
        // Para INSERT u otros casos, mostrar si la acción coincide exactamente
        return accion === transUpper;
      });
    } else if (transaction) {
      // Para otras tablas, filtrar normalmente por acción
      const transUpper = transaction.toUpperCase();
      filteredRows = rows.filter(r => {
        const accion = (r.accion || '').toUpperCase();
        return accion === transUpper;
      });
    }
    
    body.innerHTML = filteredRows.map(r => {
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
        <td>${toTag(accion, antes, despues, table)}</td>
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
    const modalBody = modal.querySelector('.modal-body');
    
    // Parsear JSON
    let antesObj = {};
    let despuesObj = {};
    try { antesObj = antes ? JSON.parse(antes) : {}; } catch(e) { console.error('Error parsing antes:', e); }
    try { despuesObj = despues ? JSON.parse(despues) : {}; } catch(e) { console.error('Error parsing despues:', e); }
    
    // Obtener todos los campos únicos
    const allKeys = new Set([...Object.keys(antesObj), ...Object.keys(despuesObj)]);
    
    if(allKeys.size === 0) {
      modalBody.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px;">No hay datos para mostrar</p>';
      modal.classList.remove('hidden');
      return;
    }
    
    // Crear tabla estructurada
    let tableHTML = `
      <div class="detail-table-wrapper">
        <table class="detail-comparison-table">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Valor Anterior</th>
              <th>Valor Nuevo</th>
            </tr>
          </thead>
          <tbody>`;
    
    // Generar filas por cada campo
    allKeys.forEach(key => {
      const valorAntes = antesObj[key] !== undefined ? antesObj[key] : '-';
      const valorDespues = despuesObj[key] !== undefined ? despuesObj[key] : '-';
      
      // Detectar si el valor cambió
      const changed = valorAntes !== valorDespues;
      const rowClass = changed ? 'row-changed' : '';
      
      // Formatear valores (convertir objetos/arrays a string legible)
      const formatValue = (val) => {
        if(val === null || val === undefined) return '-';
        if(typeof val === 'object') return JSON.stringify(val, null, 2);
        if(typeof val === 'boolean') return val ? 'Sí' : 'No';
        return String(val);
      };
      
      tableHTML += `
        <tr class="${rowClass}">
          <td class="field-name"><strong>${key}</strong></td>
          <td class="value-before">${formatValue(valorAntes)}</td>
          <td class="value-after">${formatValue(valorDespues)}</td>
        </tr>`;
    });
    
    tableHTML += `
          </tbody>
        </table>
      </div>`;
    
    modalBody.innerHTML = tableHTML;
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
    if(!p || p.total === 0) return;
    
    // Calcular rango de registros mostrados
    const start = p.total === 0 ? 0 : (p.page - 1) * p.limit + 1;
    const end = Math.min(p.page * p.limit, p.total);
    
    // Crear contenedor con contador y botones
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = 'space-between';
    container.style.alignItems = 'center';
    container.style.gap = '16px';
    container.style.flexWrap = 'wrap';
    
    // Contador de registros
    const counter = document.createElement('div');
    counter.style.color = 'rgba(255, 255, 255, 0.85)';
    counter.style.fontSize = '0.95em';
    counter.style.fontWeight = '500';
    counter.textContent = `Mostrando ${start}–${end} de ${p.total} registros`;
    container.appendChild(counter);
    
    // Contenedor de botones de paginación
    const btnWrap = document.createElement('div');
    btnWrap.style.display = 'flex';
    btnWrap.style.gap = '8px';
    btnWrap.style.alignItems = 'center';
    
    // Botón Anterior
    if(p.pages > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Anterior';
      prevBtn.disabled = p.page === 1;
      prevBtn.style.opacity = p.page === 1 ? '0.5' : '1';
      prevBtn.style.cursor = p.page === 1 ? 'not-allowed' : 'pointer';
      prevBtn.addEventListener('click', () => {
        if(p.page > 1) loadData(p.page - 1);
      });
      btnWrap.appendChild(prevBtn);
    }
    
    // Botones numéricos (mostrar máximo 5 páginas a la vez)
    if(p.pages > 1) {
      let startPage = Math.max(1, p.page - 2);
      let endPage = Math.min(p.pages, startPage + 4);
      
      // Ajustar si estamos cerca del final
      if(endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
      }
      
      // Primera página si no está en el rango
      if(startPage > 1) {
        const btn = document.createElement('button');
        btn.textContent = '1';
        btn.addEventListener('click', () => loadData(1));
        btnWrap.appendChild(btn);
        
        if(startPage > 2) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.padding = '0 8px';
          ellipsis.style.color = 'rgba(255, 255, 255, 0.6)';
          btnWrap.appendChild(ellipsis);
        }
      }
      
      // Páginas en el rango
      for(let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if(i === p.page) btn.classList.add('active');
        btn.addEventListener('click', () => loadData(i));
        btnWrap.appendChild(btn);
      }
      
      // Última página si no está en el rango
      if(endPage < p.pages) {
        if(endPage < p.pages - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.padding = '0 8px';
          ellipsis.style.color = 'rgba(255, 255, 255, 0.6)';
          btnWrap.appendChild(ellipsis);
        }
        
        const btn = document.createElement('button');
        btn.textContent = p.pages;
        btn.addEventListener('click', () => loadData(p.pages));
        btnWrap.appendChild(btn);
      }
    }
    
    // Botón Siguiente
    if(p.pages > 1) {
      const nextBtn = document.createElement('button');
      nextBtn.innerHTML = 'Siguiente <i class="fa-solid fa-chevron-right"></i>';
      nextBtn.disabled = p.page === p.pages;
      nextBtn.style.opacity = p.page === p.pages ? '0.5' : '1';
      nextBtn.style.cursor = p.page === p.pages ? 'not-allowed' : 'pointer';
      nextBtn.addEventListener('click', () => {
        if(p.page < p.pages) loadData(p.page + 1);
      });
      btnWrap.appendChild(nextBtn);
    }
    
    container.appendChild(btnWrap);
    wrap.appendChild(container);
  }

  async function loadTables(){
    showLoading();
    try{
      const json = await apiGet({ action: 'tables' });
      const tables = json.data || [];
      const sel = document.getElementById('tableSelect');
      sel.innerHTML = tables.map(t => `<option value="${t}">${titleCase(t)}</option>`).join('');
      await onTableChanged();
    }catch(e){
      console.error(e);
      alert('No se pudieron cargar las tablas');
    } finally {
      hideLoading();
    }
  }

  async function onTableChanged(){
    const table = document.getElementById('tableSelect').value;
    showLoading();
    try{
      const json = await apiGet({ action: 'filters', table });
      const selU = document.getElementById('userSelect');
      const selT = document.getElementById('txSelect');
      const usuarios = json.data?.usuarios || [];
      const acciones = json.data?.acciones || [];
      selU.innerHTML = `<option value="">Todos</option>` + usuarios.map(u => `<option value="${u}">${u}</option>`).join('');
      // Traducir acciones a español en el select
      selT.innerHTML = `<option value="">Todas</option>` + acciones.map(a => {
        const traducido = translateOperacion(a, '', '', table);
        return `<option value="${a}">${traducido}</option>`;
      }).join('');
      await loadData(1);
    }catch(e){
      console.error(e);
    } finally {
      hideLoading();
    }
  }

  async function loadData(page){
  const table = document.getElementById('tableSelect').value;
  const user_id = document.getElementById('userSelect').value;
  const transaction = document.getElementById('txSelect').value;
  // fechas globales
    showLoading();
    try{
      let backendTransaction = transaction;
      if (table === 'producto' && transaction && transaction.toUpperCase() === 'DELETE') {
        backendTransaction = '';
      }
      const params = { action: 'list', table, user_id, transaction: backendTransaction, page, limit: 15 };
      if (fechaDesde) params.start_date = fechaDesde;
      if (fechaHasta) params.end_date = fechaHasta;
      const json = await apiGet(params);
      renderTableHead();
      renderRows(json.data || []);
      renderPagination(json.pagination);
    }catch(e){
      console.error(e);
      alert('Error al cargar auditoría');
    } finally {
      hideLoading();
    }
  }

  function clearFilters(){
    document.getElementById('userSelect').value = '';
    document.getElementById('txSelect').value = '';
    const fechaRange = document.getElementById('fechaRange');
    if (fechaRange && fechaRange._flatpickr) fechaRange._flatpickr.clear();
    fechaDesde = null;
    fechaHasta = null;
    loadData(1);
  }
  

  function titleCase(s){
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async function exportToExcel(){
    const table = document.getElementById('tableSelect').value;
    const user_id = document.getElementById('userSelect').value;
    const transaction = document.getElementById('txSelect').value;
    try {
      showLoading();
      await ensureUsersMap();
      const params = { action: 'list', table, user_id, transaction, page: 1, limit: 10000 };
      if (fechaDesde) params.start_date = fechaDesde;
      if (fechaHasta) params.end_date = fechaHasta;
      const json = await apiGet(params);
      
      const rows = json.data || [];
      if(rows.length === 0){
        alert('No hay datos para exportar');
        return;
      }

      const entityIdCol = getEntityIdColumn(table);
      const entityLabel = getEntityIdLabel(table);
      
      // Preparar datos para Excel en formato vertical (cada registro con sus atributos expandidos)
      const excelData = [];
      
      rows.forEach((r, idx) => {
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

        // Parsear JSON para expandir atributos
        let antesObj = {};
        let despuesObj = {};
        try { antesObj = antes ? JSON.parse(antes) : {}; } catch(e) {}
        try { despuesObj = despues ? JSON.parse(despues) : {}; } catch(e) {}

        // Obtener todos los campos únicos entre antes y después
        const allKeys = new Set([...Object.keys(antesObj), ...Object.keys(despuesObj)]);
        
        // Si hay datos, agregar fila de encabezado del registro
        if (allKeys.size > 0) {
          // Fila de separación/encabezado
          excelData.push({
            'Registro': `#${idx + 1}`,
            'ID Auditoría': idAud,
            [entityLabel]: entityId,
            'Fecha': formatDateTime(r.fecha_accion ?? ''),
            'Usuario': `${userId} - ${userName}`,
            'Acción': translateOperacion(r.accion ?? '', antes, despues, table),
            'Campo': '',
            'Valor Anterior': '',
            'Valor Nuevo': ''
          });

          // Agregar una fila por cada campo modificado
          allKeys.forEach(key => {
            const valorAntes = antesObj[key] !== undefined ? antesObj[key] : '';
            const valorDespues = despuesObj[key] !== undefined ? despuesObj[key] : '';
            
            excelData.push({
              'Registro': '',
              'ID Auditoría': '',
              [entityLabel]: '',
              'Fecha': '',
              'Usuario': '',
              'Acción': '',
              'Campo': key,
              'Valor Anterior': valorAntes,
              'Valor Nuevo': valorDespues
            });
          });

          // Fila vacía como separador entre registros
          excelData.push({
            'Registro': '',
            'ID Auditoría': '',
            [entityLabel]: '',
            'Fecha': '',
            'Usuario': '',
            'Acción': '',
            'Campo': '',
            'Valor Anterior': '',
            'Valor Nuevo': ''
          });
        }
      });

      // Generar HTML-Excel con colores y formato
      let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        table { 
            border-collapse: collapse; 
            width: 100%; 
            font-family: Arial, sans-serif; 
        }
        th { 
            background-color: #0192B3; 
            color: #FFFFFF; 
            font-weight: bold; 
            padding: 10px; 
            border: 1px solid #0164B5;
            text-align: center;
        }
        td { 
            padding: 8px; 
            border: 1px solid #CCCCCC; 
        }
        .header-registro { 
            background-color: #E3F2FD; 
            font-weight: bold; 
            font-size: 11pt;
        }
        .accion-creacion { 
            background-color: #C8E6C9; 
        }
        .accion-actualizacion { 
            background-color: #BBDEFB; 
        }
        .accion-eliminacion { 
            background-color: #FFCDD2; 
            font-weight: bold;
        }
        .campo-detalle { 
            background-color: #FFFFFF; 
        }
        .fila-separador { 
            background-color: #F5F5F5; 
            height: 5px; 
        }
        .titulo-principal {
            background-color: #0192B3;
            color: #FFFFFF;
            font-size: 18pt;
            font-weight: bold;
            text-align: center;
            padding: 15px;
            border: 2px solid #0164B5;
        }
    </style>
</head>
<body>
    <table>
        <tr>
            <td colspan="9" class="titulo-principal">
                Auditoría de ${titleCase(table)} - ${new Date().toLocaleDateString('es-HN')}
            </td>
        </tr>
        <tr>
            <th>Registro</th>
            <th>ID Auditoría</th>
            <th>${entityLabel}</th>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Campo</th>
            <th>Valor Anterior</th>
            <th>Valor Nuevo</th>
        </tr>`;

      // Generar filas con colores según tipo de operación
      excelData.forEach(row => {
        const esHeader = row['Registro'] !== '';
        const esSeparador = row['Registro'] === '' && row['Campo'] === '';
        
        let cssClass = 'campo-detalle';
        if (esSeparador) {
          cssClass = 'fila-separador';
        } else if (esHeader) {
          const accion = row['Acción'];
          if (accion === 'Creación') cssClass = 'accion-creacion header-registro';
          else if (accion === 'Eliminación') cssClass = 'accion-eliminacion header-registro';
          else if (accion === 'Actualización') cssClass = 'accion-actualizacion header-registro';
          else cssClass = 'header-registro';
        }

        html += `\n        <tr class="${cssClass}">`;
        html += `<td>${row['Registro'] ?? ''}</td>`;
        html += `<td>${row['ID Auditoría'] ?? ''}</td>`;
        html += `<td>${row[entityLabel] ?? ''}</td>`;
        html += `<td>${row['Fecha'] ?? ''}</td>`;
        html += `<td>${row['Usuario'] ?? ''}</td>`;
        html += `<td><b>${row['Acción'] ?? ''}</b></td>`;
        html += `<td><b>${row['Campo'] ?? ''}</b></td>`;
        html += `<td>${row['Valor Anterior'] ?? ''}</td>`;
        html += `<td>${row['Valor Nuevo'] ?? ''}</td>`;
        html += `</tr>`;
      });

      html += `
    </table>
</body>
</html>`;

      // Crear Blob y descargar
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fecha = new Date().toISOString().slice(0,10);
      link.href = url;
      link.download = `Auditoria_${titleCase(table)}_${fecha}.xls`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Exportados ${rows.length} registros a Excel`);
    } catch(e) {
      console.error(e);
      alert('Error al exportar: ' + e.message);
    } finally {
      hideLoading();
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
    document.getElementById('userSelect').addEventListener('change', () => loadData(1));
    document.getElementById('txSelect').addEventListener('change', () => loadData(1));
    const fechaRange = document.getElementById('fechaRange');
    if (fechaRange && window.flatpickr) {
      window.flatpickr(fechaRange, {
        mode: 'range',
        dateFormat: 'Y-m-d',
        locale: window.flatpickr.l10ns.es,
        allowInput: false,
        onChange: function(selectedDates) {
          if (selectedDates.length === 1) {
            fechaDesde = selectedDates[0].toISOString().split('T')[0];
            fechaHasta = null;
          } else if (selectedDates.length === 2) {
            fechaDesde = selectedDates[0].toISOString().split('T')[0];
            fechaHasta = selectedDates[1].toISOString().split('T')[0];
          } else {
            fechaDesde = null;
            fechaHasta = null;
          }
          loadData(1);
        }
      });
    }
    document.getElementById('btnClear').addEventListener('click', clearFilters);
    document.getElementById('btnExport').addEventListener('click', exportToExcel);
    document.getElementById('btnPrint').addEventListener('click', () => window.print());
    document.getElementById('modalClose').addEventListener('click', () => document.getElementById('detailModal').classList.add('hidden'));
    document.addEventListener('keydown', e => { if(e.key === 'Escape') document.getElementById('detailModal').classList.add('hidden'); });
  }

  // Mostrar loading inmediatamente al cargar el script (antes de DOMContentLoaded)
  showLoading();

  document.addEventListener('DOMContentLoaded', function(){
    initEvents();
    renderTableHead();
    // Cargar mapa de usuarios en segundo plano y luego tablas
    ensureUsersMap().finally(() => {
      loadTables();
    });
  });
})();
