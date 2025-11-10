<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ventas - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/ventas.css">
    <link rel="icon" href="/Color_Ink/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
    <main class="sidebar-content">
        <div class="ventas-container">
            <div class="ventas-header">
                <h2>Registro de Ventas</h2>
                <button class="btn-nueva-venta">
                    <i class="fa-solid fa-plus"></i> Nueva Venta
                </button>
            </div>

            <div class="ventas-stats">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Ingresos Totales</h3>
                        <p class="stat-number" id="kpiIngresos">$0.00</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Ventas del Mes</h3>
                        <p class="stat-number" id="kpiVentasMes">0</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Utilidad</h3>
                        <p class="stat-number" id="kpiResultado">$0.00</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-percent"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Margen</h3>
                        <p class="stat-number" id="kpiMargen">0%</p>
                    </div>
                </div>
            </div>

            <div class="ventas-filters">
                <input type="text" placeholder="Buscar ventas..." class="search-input" id="searchInput">
                <select class="filter-select" id="estadoSelect">
                    <option value="">Todos los estados</option>
                    <option value="REGISTRADA">Registrada</option>
                    <option value="ANULADA">Anulada</option>
                </select>
                <select class="filter-select" id="metodoPagoSelect">
                    <option value="">Todos los métodos</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Cheque">Cheque</option>
                </select>
                <input type="text" id="fechaRange" class="date-input" title="Seleccionar fecha o rango" placeholder="Seleccionar fecha" readonly style="color: white;">
                <button class="btn-export btn-excel" id="btnExportarExcel" title="Exportar a Excel">
                    <i class="fa-solid fa-file-excel"></i> Excel
                </button>
                <button class="btn-limpiar-filtros" id="btnLimpiarFiltros" title="Limpiar Filtros">
                    <i class="fa-solid fa-eraser"></i>
                </button>
            </div>

            <div class="ventas-table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Estado</th>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Fecha</th>
                            <th>Método Pago</th>
                            <th>Monto</th>
                            <th>Utilidad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="ventasBody">
                        <!-- Filas dinámicas -->
                    </tbody>
                </table>
            </div>
            
            <!-- Paginación -->
            <div class="pagination-container" id="paginationContainer" style="display: none;">
                <div class="pagination-info">
                    <span id="paginationInfo">Mostrando 0 de 0 ventas</span>
                </div>
                <div class="pagination-controls">
                    <button id="btnPrevPage" class="btn-pagination" disabled>
                        <i class="fa-solid fa-chevron-left"></i> Anterior
                    </button>
                    <div id="pageNumbers" class="page-numbers"></div>
                    <button id="btnNextPage" class="btn-pagination" disabled>
                        Siguiente <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </main>

    <!-- Modal para Nueva Venta -->
    <div id="modalNuevaVenta" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fa-solid fa-cash-register"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2>Registrar Nueva Venta</h2>
                        <span class="modal-subtitle">Complete los datos de la venta</span>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="formNuevaVenta" class="venta-form">
                    <div class="form-group">
                        <label for="pedido">Pedido a Facturar *</label>
                        <select id="pedido" name="id_pedido" required onchange="mostrarInfoPedido()">
                            <option value="">Seleccione un pedido...</option>
                        </select>
                        <div id="infoPedido" class="info-pedido-container">
                            <div id="infoPedidoDetalle"></div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="monto">Monto Cobrado *</label>
                            <input type="number" id="monto" name="monto_cobrado" step="0.01" min="0" required placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label for="metodo">Método de Pago *</label>
                            <select id="metodo" name="metodo_pago" required>
                                <option value="">Seleccionar método</option>
                                <option value="Efectivo">💵 Efectivo</option>
                                <option value="Tarjeta">💳 Tarjeta</option>
                                <option value="Transferencia">🏦 Transferencia</option>
                                <option value="Cheque">📄 Cheque</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="nota">Observaciones (Opcional)</label>
                        <textarea id="nota" name="nota" rows="3" placeholder="Notas adicionales sobre la venta..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">
                    <i class="fa-solid fa-times"></i> Cancelar
                </button>
                <button type="submit" form="formNuevaVenta" class="btn-guardar">
                    <i class="fa-solid fa-save"></i> Registrar Venta
                </button>
            </div>
        </div>
    </div>

    <!-- Modal para Ver Detalles de Venta -->
    <div id="modalVerVenta" class="modal modal-enhanced">
        <div class="modal-content modal-large modal-floating">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fa-solid fa-receipt"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2 id="ventaIdDisplay">Detalles de la Venta</h2>
                        <span class="modal-subtitle">Información completa de la transacción</span>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body" id="ventaDetailsContent">
                <!-- Contenido dinámico -->
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">
                    <i class="fa-solid fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    </div>

    <!-- Modal para Editar Venta -->
    <div id="modalEditarVenta" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fa-solid fa-edit"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2 id="editarVentaIdDisplay">Editar Venta</h2>
                        <span class="modal-subtitle">Modificar datos de la venta</span>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="formEditarVenta" class="venta-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editarMonto">Monto Cobrado *</label>
                            <input type="number" id="editarMonto" name="monto_cobrado" step="0.01" min="0" required placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label for="editarMetodo">Método de Pago *</label>
                            <select id="editarMetodo" name="metodo_pago" required>
                                <option value="Efectivo">💵 Efectivo</option>
                                <option value="Tarjeta">💳 Tarjeta</option>
                                <option value="Transferencia">🏦 Transferencia</option>
                                <option value="Cheque">📄 Cheque</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editarNota">Observaciones</label>
                        <textarea id="editarNota" name="nota" rows="3" placeholder="Notas adicionales..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">
                    <i class="fa-solid fa-times"></i> Cancelar
                </button>
                <button type="button" class="btn-guardar" id="btnGuardarEdicion">
                    <i class="fa-solid fa-save"></i> Guardar Cambios
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de confirmación de anulación (estilo SweetAlert) -->
    <div id="modalConfirmAnular" class="modal-confirm-delete">
        <div class="modal-confirm-content">
            <div class="modal-confirm-header">
                <svg class="icon-warning" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>¿Anular venta?</h3>
            </div>
            <div class="modal-confirm-body">
                <p id="confirmAnularMessage">¿Estás seguro de que quieres anular esta venta?</p>
                <div class="form-group" style="margin-top: 15px;">
                    <label for="confirmAnularMotivo" style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">Motivo de anulación *</label>
                    <textarea id="confirmAnularMotivo" rows="3" placeholder="Especifique el motivo de la anulación..." style="width: 100%; padding: 10px; border: 2px solid #555; border-radius: 6px; font-family: inherit; resize: vertical; min-height: 80px; background: #2a2a2a; color: #fff; box-shadow: none !important;"></textarea>
                </div>
                <p class="warning-text">Esta acción no se puede deshacer</p>
            </div>
            <div class="modal-confirm-footer">
                <button class="btn-cancel" id="btnCancelAnular">Cancelar</button>
                <button class="btn-delete" id="btnConfirmAnular">Anular Venta</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://npmcdn.com/flatpickr/dist/l10n/es.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
    <script src="/Color_Ink/src/Views/JS/ventas.js"></script>
    
    <style>
    /* Estilos para el modal de confirmación estilo SweetAlert - Tema Negro */
    .modal-confirm-delete {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        z-index: 10000;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(3px);
        animation: fadeIn 0.2s ease-out;
    }
    
    .modal-confirm-delete.show {
        display: flex;
    }
    
    .modal-confirm-content {
        background: #1a1a1a;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 105, 180, 0.4);
        max-width: 450px;
        width: 90%;
        padding: 0;
        animation: slideDown 0.3s ease-out;
        border: 1px solid #333;
    }
    
    .modal-confirm-header {
        padding: 30px 30px 20px;
        text-align: center;
        border-bottom: 1px solid #333;
    }
    
    .icon-warning {
        width: 70px;
        height: 70px;
        color: #ff4444;
        margin: 0 auto 15px;
        animation: pulse 0.6s ease-in-out;
    }
    
    .modal-confirm-header h3 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        color: #fff;
    }
    
    .modal-confirm-body {
        padding: 25px 30px;
        text-align: center;
    }
    
    .modal-confirm-body p {
        margin: 0 0 10px 0;
        font-size: 16px;
        color: #ccc;
        line-height: 1.5;
    }
    
    .warning-text {
        font-size: 14px !important;
        color: #999 !important;
        font-weight: 500;
    }
    
    .modal-confirm-footer {
        padding: 20px 30px 30px;
        display: flex;
        gap: 12px;
        justify-content: center;
    }
    
    .btn-cancel, .btn-delete {
        flex: 1;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .btn-cancel {
        background: #333;
        color: #ccc;
    }
    
    .btn-cancel:hover {
        background: #444;
        transform: translateY(-1px);
    }
    
    .btn-delete {
        background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
    }
    
    .btn-delete:hover {
        background: linear-gradient(135deg, #ff5555 0%, #dd0000 100%);
        box-shadow: 0 6px 16px rgba(255, 68, 68, 0.4);
        transform: translateY(-2px);
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    /* Estilos de paginación */
    .pagination-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
        padding: 15px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .pagination-info {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
    }
    
    .pagination-controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .btn-pagination {
        background: rgba(217, 0, 188, 0.2);
        border: 1px solid rgba(217, 0, 188, 0.5);
        color: #fff;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
    }
    
    .btn-pagination:hover:not(:disabled) {
        background: rgba(217, 0, 188, 0.4);
        border-color: rgba(217, 0, 188, 0.8);
    }
    
    .btn-pagination:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .page-numbers {
        display: flex;
        gap: 5px;
    }
    
    .page-number {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        min-width: 40px;
        text-align: center;
    }
    
    .page-number:hover {
        background: rgba(217, 0, 188, 0.3);
        border-color: rgba(217, 0, 188, 0.6);
    }
    
    .page-number.active {
        background: linear-gradient(135deg, #d900bc, #ba419c);
        border-color: #d900bc;
        font-weight: bold;
    }
    
    /* Estilos para Flatpickr */
    .flatpickr-calendar {
        background: #1a1a1a !important;
        border: 1px solid rgba(217, 0, 188, 0.3) !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4) !important;
    }
    
    .flatpickr-day {
        color: #fff !important;
        border: none !important;
    }
    
    .flatpickr-day:hover {
        background: rgba(217, 0, 188, 0.3) !important;
        border-color: rgba(217, 0, 188, 0.5) !important;
    }
    
    .flatpickr-day.selected {
        background: linear-gradient(135deg, #d900bc, #ba419c) !important;
        border-color: #d900bc !important;
    }
    
    .flatpickr-day.inRange {
        background: rgba(217, 0, 188, 0.2) !important;
        border-color: rgba(217, 0, 188, 0.4) !important;
    }
    
    .flatpickr-months .flatpickr-month {
        color: #fff !important;
    }
    
    .flatpickr-weekday {
        color: rgba(255, 255, 255, 0.7) !important;
    }
    
    .flatpickr-day.prevMonthDay,
    .flatpickr-day.nextMonthDay {
        color: rgba(255, 255, 255, 0.3) !important;
    }
    
    .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay) {
        color: rgba(255, 255, 255, 0.9) !important;
    }
    
    #fechaRange {
        color: white !important;
        cursor: pointer;
    }
    
    #fechaRange::placeholder {
        color: rgba(255, 255, 255, 0.7) !important;
    }
    </style>
</body>
</html>
