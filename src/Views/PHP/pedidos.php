<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pedidos - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/pedidos.css">
    <link rel="icon" href="/Color_Ink/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
    <main class="sidebar-content">
        <h1>Gestión de Pedidos</h1>
        <div class="pedidos-container">
            <div class="pedidos-header">
                <h2>Lista de Pedidos</h2>
                <button class="btn-nuevo-pedido">
                    <i class="fa-solid fa-plus"></i> Nuevo Pedido
                </button>
            </div>
            
            <div class="pedidos-filters">
                <input type="text" placeholder="Buscar pedidos..." class="search-input">
                <select class="filter-select">
                    <option value="">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="enviado">Enviado</option>
                 
                </select>
            </div>

            <div class="pedidos-table">
                <table>
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Cliente</th>
                            <th>Fecha del pedido</th>
                            <th>Fecha de entrega</th>
                            <th>Estado</th>
                            <th>Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($pedidos) && is_array($pedidos)): ?>
                            <?php foreach ($pedidos as $pedido): ?>
                                <tr>
                                    <td><?= htmlspecialchars($pedido['numero_pedido'] ?? $pedido['id_pedido']) ?></td>
                                    <td><?= htmlspecialchars($pedido['cliente_nombre'] ?? '') ?></td>
                                    <td><?= htmlspecialchars($pedido['fecha_pedido'] ?? '') ?></td>
                                    <td><?= htmlspecialchars($pedido['fecha_entrega'] ?? '') ?></td>
                                    <td>
                                        <select class="status-selector" data-pedido-id="<?= $pedido['id_pedido'] ?>">
                                            <option value="pendiente" <?= ($pedido['estado_codigo'] ?? $pedido['id_estado']) == 'pendiente' ? 'selected' : '' ?>>Pendiente</option>
                                            <option value="procesando" <?= ($pedido['estado_codigo'] ?? $pedido['id_estado']) == 'procesando' ? 'selected' : '' ?>>Procesando</option>
                                            <option value="enviado" <?= ($pedido['estado_codigo'] ?? $pedido['id_estado']) == 'enviado' ? 'selected' : '' ?>>Enviado</option>
                                            <option value="entregado" <?= ($pedido['estado_codigo'] ?? $pedido['id_estado']) == 'entregado' ? 'selected' : '' ?>>Entregado</option>
                                        </select>
                                    </td>
                                    <td>
                                        <?php
                                        // Mostrar el total de la BD (total_linea del detallepedido principal)
                                        $totalLinea = isset($pedido['total_linea']) ? $pedido['total_linea'] : null;
                                        echo $totalLinea !== null ? '$' . number_format($totalLinea, 2) : '<span style="color:#888">-</span>';
                                        ?>
                                    </td>
                                    <td>
                                        <button class="btn-action"><i class="fa-solid fa-eye"></i></button>
                                        <button class="btn-action"><i class="fa-solid fa-edit"></i></button>
                                        <button class="btn-action"><i class="fa-solid fa-trash"></i></button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr><td colspan="7" style="text-align:center; color:#888;">No hay pedidos registrados.</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- Modal para Ver Detalles del Pedido -->
    <div id="modalVerPedido" class="modal modal-enhanced">
        <div class="modal-content modal-large modal-floating">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fa-solid fa-receipt"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2>Detalles del Pedido</h2>
                        <span class="pedido-id-display" id="pedidoIdDisplay"></span>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body" id="pedidoDetailsContent">
                <!-- El contenido se llenará dinámicamente -->
            </div>
            <div class="modal-footer">
                <div class="status-change-section">
                    <label for="estadoPedido">Cambiar Estado:</label>
                    <select id="estadoPedido" class="status-selector-modal">
                        <option value="pendiente">Pendiente</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="enviado">Enviado</option>
                    </select>
                    <button type="button" class="btn-actualizar-estado">
                        <i class="fa-solid fa-sync-alt"></i> Actualizar
                    </button>
                </div>
                <button type="button" class="btn-cancelar">
                    <i class="fa-solid fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    </div>

    <!-- Modal para Nuevo Pedido -->
    <div id="modalNuevoPedido" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Nuevo Pedido</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="formNuevoPedido" class="pedido-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="clienteNombre">Nombre del Cliente *</label>
                            <input type="text" id="clienteNombre" name="clienteNombre" required>
                        </div>
                        <div class="form-group">
                            <label for="clienteTelefono">Teléfono</label>
                            <input type="tel" id="clienteTelefono" name="clienteTelefono">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="fechaEntrega">Fecha de Entrega *</label>
                            <input type="date" id="fechaEntrega" name="fechaEntrega" required>
                        </div>
                        <div class="form-group">
                            <label for="prioridad">Prioridad</label>
                            <select id="prioridad" name="prioridad">
                                <option value="normal">Normal</option>
                                <option value="urgente">Urgente</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="canalVenta">Canal de Venta *</label>
                        <select id="canalVenta" name="canalVenta" required>
                            <option value="">Seleccionar canal</option>
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                            <option value="tienda">Tienda Física</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="telefono">Teléfono</option>
                        </select>
                    </div>

                    <!-- Nota: los productos se gestionan ahora dentro del modal "Personalizado" -->

                    <!-- Botón para abrir detalles del producto -->
                    <div class="form-group">
                        <button type="button" class="btn-detalles-producto" id="btnDetallesProducto">
                            <i class="fa-solid fa-cog"></i> Personalizado
                        </button>
                    </div>

                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">Cancelar</button>
                <button type="submit" form="formNuevoPedido" class="btn-guardar">Guardar Pedido</button>
            </div>
        </div>
    </div>

       <!-- Modal para Detalles del Producto -->
    <div id="modalDetallesProducto" class="modal">
        <div class="modal-content modal-medium">
            <div class="modal-header">
                <h2>Detalles de Productos</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <!-- Barra superior: botones numerados y cruz para agregar -->
                <div id="productosNav" class="productos-nav" style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
                    <!-- Botones de productos se generan por JS -->
                    <button type="button" class="btn-add-producto" title="Agregar producto" style="font-size:1.2em; padding:0 10px; border-radius:50%; background:#e0e0e0; border:none; margin-left:4px;"><i class="fa-solid fa-plus"></i></button>
                </div>
                <!-- Contenedor de detalles del producto seleccionado -->
                <form id="formDetallesProducto" class="product-details-form">
                    <div id="productoDetalleContainer">
                        <div class="form-group">
                            <label for="categoriaProducto">Categoría de Producto *</label>
                            <select id="categoriaProducto" name="categoriaProducto" required>
                                <option value="">Seleccionar categoría</option>
                                <option value="camisas">Camisas/Playeras</option>
                                <option value="retratos">Retratos</option>
                                <option value="arreglos-florales">Arreglos Florales</option>
                                <option value="vinil">Vinil Adhesivo</option>
                                <option value="banner">Banner</option>
                                <option value="tarjetas">Tarjetas de Presentación</option>
                                <option value="volantes">Volantes</option>
                                <option value="invitaciones">Invitaciones</option>
                                <option value="decoracion">Decoración</option>
                                <option value="otros">Otros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="imagenReferencia">Imagen de Referencia</label>
                            <div class="image-upload-container">
                                <input type="file" id="imagenReferencia" name="imagenReferencia" accept="image/*" multiple>
                                <div class="image-preview-container" id="imagePreviewContainer">
                                    <div class="upload-placeholder">
                                        <i class="fa-solid fa-cloud-upload-alt"></i>
                                        <p>Arrastra imágenes aquí o haz clic para seleccionar</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="colores">Paleta de Colores</label>
                            <div class="color-selection">
                                <input type="text" id="colores" name="colores" placeholder="Selecciona los colores que deseas usar" readonly>
                                <div class="color-picker-container">
                                    <div class="color-picker-item">
                                        <input type="color" id="colorPicker1" class="color-picker" title="Color 1" value="#000000">
                                        <span class="color-name" id="colorName1">Color 1</span>
                                    </div>
                                    <div class="color-picker-item">
                                        <input type="color" id="colorPicker2" class="color-picker" title="Color 2" value="#000000">
                                        <span class="color-name" id="colorName2">Color 2</span>
                                    </div>
                                    <div class="color-picker-item">
                                        <input type="color" id="colorPicker3" class="color-picker" title="Color 3" value="#000000">
                                        <span class="color-name" id="colorName3">Color 3</span>
                                    </div>
                                </div>
                                <div class="color-actions">
                                    <button type="button" class="btn-limpiar-colores">
                                        <i class="fa-solid fa-eraser"></i> Limpiar Colores
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="especificaciones">Especificaciones Técnicas/Detalles del producto</label>
                            <textarea id="especificaciones" name="especificaciones" rows="4" placeholder="Tamaño específico, acabados, técnicas de impresión,talla etc."></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="pdCantidad">Cantidad</label>
                                <input type="number" id="pdCantidad" min="1" value="1">
                            </div>
                            <div class="form-group">
                                <label for="pdPrecio">Precio Unitario</label>
                                <input type="number" id="pdPrecio" step="0.01" min="0" value="0">
                            </div>
                        </div>
                    </div>
                    <!-- Descuento, impuesto y total SIEMPRE visibles abajo -->
                    <div class="form-group" style="margin-top:16px; border-top:1px solid #eee; padding-top:12px;">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="pdDescuento">Descuento (%)</label>
                                <input type="number" id="pdDescuento" step="0.01" min="0" value="0">
                            </div>
                            <div class="form-group">
                                <label for="pdImpuesto">Impuesto (%)</label>
                                <input type="number" id="pdImpuesto" step="0.01" min="0" value="0">
                            </div>
                        </div>
                        <div style="margin-top:8px; font-weight:600;">Total: <span id="pdTotalPreview">$0.00</span></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">Cancelar</button>
                <button type="button" class="btn-guardar" id="guardarDetalles">Guardar Detalles</button>
            </div>
        </div>
    </div>

    <!-- Modal para Editar Pedido -->
    <div id="modalEditarPedido" class="modal modal-enhanced">
        <div class="modal-content modal-large modal-floating">
            <div class="modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fa-solid fa-edit"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2>Editar Pedido</h2>
                        <span class="pedido-id-display" id="editarPedidoIdDisplay"></span>
                    </div>
                </div>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="formEditarPedido" class="pedido-form">
                    <!-- SOLO CAMPOS GENERALES DEL PEDIDO -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editarUsuario">Usuario</label>
                            <input type="text" id="editarUsuario" name="usuario">
                        </div>
                        <div class="form-group">
                            <label for="editarTelefono">Teléfono</label>
                            <input type="tel" id="editarTelefono" name="telefono">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editarFechaEntrega">Fecha de Entrega</label>
                            <input type="date" id="editarFechaEntrega" name="fechaEntrega">
                        </div>
                        <div class="form-group">
                            <label for="editarPrioridad">Prioridad</label>
                            <select id="editarPrioridad" name="prioridad">
                                <option value="normal">Normal</option>
                                <option value="alta">Alta</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editarCanalVenta">Canal de Venta *</label>
                        <select id="editarCanalVenta" name="canalVenta" required>
                            <option value="">Seleccionar canal</option>
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                            <option value="tienda">Tienda Física</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="telefono">Teléfono</option>
                        </select>
                    </div>
                    <!-- TABLA EDITABLE DE PRODUCTOS -->
                    <div class="form-group" style="margin-top: 20px;">
                        <label style="font-size: 1.1em; font-weight: 600; margin-bottom: 10px; display: block;">Productos del Pedido</label>
                        <div id="tablaProductosEditablesContainer" style="margin-bottom: 15px;"></div>
                        <button type="button" class="btn-agregar-producto" id="btnAgregarProductoEditable" style="background:#007bff; color:#fff; border:none; border-radius:5px; padding:8px 20px; font-size:0.95em; cursor:pointer; transition: all 0.3s;">
                            <i class="fa-solid fa-plus"></i> Agregar Producto
                        </button>
                    </div>
                    <!-- RESUMEN DE TOTALES -->
                    <div class="form-group" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                        <label style="font-size: 1.1em; font-weight: 600; margin-bottom: 10px; display: block;">Resumen del Pedido</label>
                        <div id="resumenTotalesEdicion"></div>
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

    <script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
    <script src="/Color_Ink/src/Views/JS/pedidosmvc.js"></script>
    <script src="/Color_Ink/src/Views/JS/pedidos.js"></script>
    <script>
        // Inicializar PedidosMVC cuando cargue la página
        document.addEventListener('DOMContentLoaded', function() {
            PedidosMVC.init({
                apiEntry: '/Color_Ink/public/index.php',
                tableSelector: '.pedidos-table tbody',
                autoCreateToken: true
            }).then(function(pedidos) {
                console.log('Pedidos cargados:', pedidos.length);
            }).catch(function(error) {
                console.error('Error al cargar pedidos:', error);
            });
        });
    </script>
</body>
</html>


