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
        <h1>Gestión de Ventas</h1>
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
                <input type="date" id="desde" class="date-input" title="Filtrar por fecha">
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

    <!-- Modal para Confirmar Anulación -->
    <div id="modalAnularVenta" class="modal">
        <div class="modal-content modal-small">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon warning">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2>Anular Venta</h2>
                        <span class="modal-subtitle">Esta acción no se puede deshacer</span>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="formAnularVenta">
                    <div class="form-group">
                        <label for="motivoAnulacion">Motivo de Anulación *</label>
                        <textarea id="motivoAnulacion" name="motivo" rows="3" required placeholder="Especifique el motivo de la anulación..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">
                    <i class="fa-solid fa-times"></i> Cancelar
                </button>
                <button type="button" class="btn-anular" id="btnConfirmarAnulacion">
                    <i class="fa-solid fa-ban"></i> Anular Venta
                </button>
            </div>
        </div>
    </div>

    <script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
    <script src="/Color_Ink/src/Views/JS/ventas.js"></script>
</body>
</html>
