<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventario - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/inve.css">
    <link rel="icon" href="/Color_Ink/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
    <main class="sidebar-content">
        <h1>Gestión de Inventario</h1>
        <div class="inventario-container">
            <div class="inventario-header">
                <h2>Control de Stock</h2>
                <div class="header-buttons">
                    <button class="btn-exportar-excel" title="Exportar a Excel">
                        <i class="fa-solid fa-file-excel"></i> Exportar Excel
                    </button>
                    <button class="btn-nuevo-producto">
                        <i class="fa-solid fa-plus"></i> Nuevo Producto
                    </button>
                </div>
            </div>
            
            <div class="inventario-stats">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-boxes"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Productos</h3>
                        <p class="stat-number" id="total-productos">0</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Stock Bajo</h3>
                        <p class="stat-number" id="stock-bajo">0</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Valor Total</h3>
                        <p class="stat-number" id="valor-total">L. 0.00</p>
                    </div>
                </div>
            </div>

            <div class="inventario-filters">
                <input type="text" placeholder="Buscar productos..." class="search-input">
                <select class="filter-select" id="filter-categoria">
                    <option value="">Todas las categorías</option>
                    <!-- Las categorías se cargarán dinámicamente desde la base de datos -->
                </select>
                <select class="filter-select">
                    <option value="">Todos los estados</option>
                    <option value="disponible">Disponible</option>
                    <option value="bajo-stock">Bajo Stock</option>
                    <option value="agotado">Agotado</option>
                </select>
            </div>

            <div class="inventario-table">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Stock</th>
                            <th>Precio</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Los productos se cargarán dinámicamente desde la base de datos -->
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- Modal para Ver Producto -->
    <div id="modalVerProducto" class="modal modal-enhanced">
        <div class="modal-content modal-large modal-floating">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fa-solid fa-box"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2>Detalles del Producto</h2>
                        <span class="producto-id-display" id="productoIdDisplay"></span>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div id="producto-detalles">
                    <!-- Los detalles se cargarán dinámicamente -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">Cerrar</button>
            </div>
        </div>
    </div>

    <!-- Modal para Editar Producto -->
    <div id="modalEditarProducto" class="modal modal-enhanced">
        <div class="modal-content modal-large modal-floating">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fa-solid fa-edit"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2>Editar Producto</h2>
                        <span class="producto-id-display" id="editarProductoIdDisplay"></span>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="formEditarProducto" class="producto-form">
                    <input type="hidden" id="edit_id_producto" name="id_producto">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit_sku">SKU *</label>
                            <input type="text" id="edit_sku" name="sku" required placeholder="Ej: PROD001">
                        </div>
                        <div class="form-group">
                            <label for="edit_nombre_producto">Nombre del Producto *</label>
                            <input type="text" id="edit_nombre_producto" name="nombre_producto" required placeholder="Ej: Papel A4 500 hojas">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit_id_categoria">Categoría *</label>
                            <select id="edit_id_categoria" name="id_categoria" required>
                                <option value="">Seleccionar categoría</option>
                                <!-- Las opciones se cargarán dinámicamente -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit_id_proveedor">Proveedor *</label>
                            <select id="edit_id_proveedor" name="id_proveedor" required>
                                <option value="">Seleccionar proveedor</option>
                                <!-- Las opciones se cargarán dinámicamente -->
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit_stock">Stock Actual *</label>
                            <input type="number" id="edit_stock" name="stock" required min="0" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label for="edit_stock_minimo">Stock Mínimo *</label>
                            <input type="number" id="edit_stock_minimo" name="stock_minimo" required min="0" placeholder="0">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit_costo_unitario">Costo Unitario *</label>
                            <input type="number" id="edit_costo_unitario" name="costo_unitario" required min="0" step="0.01" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label for="edit_precio_venta_base">Precio de Venta *</label>
                            <input type="number" id="edit_precio_venta_base" name="precio_venta_base" required min="0" step="0.01" placeholder="0.00">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit_activo">Estado del Producto *</label>
                            <select id="edit_activo" name="activo" required>
                                <option value="1">Activo</option>
                                <option value="0">Inactivo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit_fecha_registro">Fecha de Registro</label>
                            <input type="datetime-local" id="edit_fecha_registro" name="fecha_registro" readonly>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="edit_descripcion">Descripción del Producto</label>
                        <textarea id="edit_descripcion" name="descripcion" rows="3" placeholder="Descripción detallada del producto..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">Cancelar</button>
                <button type="submit" form="formEditarProducto" class="btn-guardar">Actualizar Producto</button>
            </div>
        </div>
    </div>

    <!-- Modal para Agregar Nuevo Producto -->
    <div id="modalNuevoProducto" class="modal modal-enhanced">
        <div class="modal-content modal-large modal-floating">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2>Nuevo Producto</h2>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="formNuevoProducto" class="producto-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="sku">SKU *</label>
                            <input type="text" id="sku" name="sku" required placeholder="Ej: PROD001">
                        </div>
                        <div class="form-group">
                            <label for="nombre_producto">Nombre del Producto *</label>
                            <input type="text" id="nombre_producto" name="nombre_producto" required placeholder="Ej: Papel A4 500 hojas">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="id_categoria">Categoría *</label>
                            <select id="id_categoria" name="id_categoria" required>
                                <option value="">Seleccionar categoría</option>
                                <!-- Las opciones se cargarán dinámicamente -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="id_proveedor">Proveedor *</label>
                            <select id="id_proveedor" name="id_proveedor" required>
                                <option value="">Seleccionar proveedor</option>
                                <!-- Las opciones se cargarán dinámicamente -->
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="stock">Stock Inicial *</label>
                            <input type="number" id="stock" name="stock" required min="0" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label for="stock_minimo">Stock Mínimo *</label>
                            <input type="number" id="stock_minimo" name="stock_minimo" required min="0" placeholder="0">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="costo_unitario">Costo Unitario *</label>
                            <input type="number" id="costo_unitario" name="costo_unitario" required min="0" step="0.01" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label for="precio_venta_base">Precio de Venta *</label>
                            <input type="number" id="precio_venta_base" name="precio_venta_base" required min="0" step="0.01" placeholder="0.00">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="fecha_registro">Fecha de Registro *</label>
                            <input type="datetime-local" id="fecha_registro" name="fecha_registro" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="descripcion">Descripción del Producto</label>
                        <textarea id="descripcion" name="descripcion" rows="3" placeholder="Descripción detallada del producto..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">Cancelar</button>
                <button type="submit" form="formNuevoProducto" class="btn-guardar">Guardar Producto</button>
            </div>
        </div>
    </div>

    <script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
    <script src="/Color_Ink/src/Views/JS/inve.js"></script>
</body>
</html>
