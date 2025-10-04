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
                    <option value="procesando">Procesando</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                </select>
            </div>

            <div class="pedidos-table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>#001</td>
                            <td>Juan Pérez</td>
                            <td>2024-01-15</td>
                            <td><span class="status pendiente">Pendiente</span></td>
                            <td>$150.00</td>
                            <td>
                                <button class="btn-action"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>#002</td>
                            <td>María García</td>
                            <td>2024-01-14</td>
                            <td><span class="status procesando">Procesando</span></td>
                            <td>$275.50</td>
                            <td>
                                <button class="btn-action"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>#003</td>
                            <td>Carlos López</td>
                            <td>2024-01-13</td>
                            <td><span class="status enviado">Enviado</span></td>
                            <td>$89.99</td>
                            <td>
                                <button class="btn-action"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- Modal para Ver Detalles del Pedido -->
    <div id="modalVerPedido" class="modal">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>Detalles del Pedido</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body" id="pedidoDetailsContent">
                <!-- El contenido se llenará dinámicamente -->
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">Cerrar</button>
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
                            <label for="cliente">Cliente *</label>
                            <input type="text" id="cliente" name="cliente" required>
                        </div>
                        <div class="form-group">
                            <label for="telefono">Teléfono</label>
                            <input type="tel" id="telefono" name="telefono">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="email">Usuario</label>
                            <input type="redes" id="redes" name="email">
                        </div>
                        <div class="form-group">
                            <label for="fechaEntrega">Fecha de Entrega</label>
                            <input type="date" id="fechaEntrega" name="fechaEntrega">
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

                    <div class="form-row">
                        <div class="form-group">
                            <label for="precioUnitario">Precio Personalizado</label>
                            <input type="number" id="precioUnitario" name="precioUnitario" step="0.01" min="0">
                        </div>
                         <div class="form-group">
                            <label for="precioUnitario">Cantidad</label>
                            <input type="number" id="precioUnitario" name="precioUnitario" step="0.01" min="0">
                        </div>
                        <div class="form-group">
                            <label for="prioridad">Prioridad</label>
                            <select id="prioridad" name="prioridad">
                                <option value="normal">Normal</option>
                                <option value="alta">Alta</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>

                         <div class="form-group">
                            <label for="prioridad">Estado</label>
                            <select id="prioridad" name="prioridad">
                                <option value="normal">Pendiente</option>
                                <option value="alta">Proceso</option>
                                <option value="urgente">Entregado</option>
                            </select>
                        </div>
                    </div>

                    <!-- Botón para abrir detalles del producto -->
                    <div class="form-group">
                        <button type="button" class="btn-detalles-producto" id="btnDetallesProducto">
                            <i class="fa-solid fa-cog"></i> Personalizado
                        </button>
                        <div id="resumenDetalles" class="resumen-detalles" style="display: none;">
                            <h4>Resumen de Detalles:</h4>
                            <div id="resumenContenido"></div>
                        </div>
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
                <h2>Detalles del Producto</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="formDetallesProducto" class="product-details-form">
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
                        <label for="textoPersonalizado">Texto Personalizado</label>
                        <textarea id="textoPersonalizado" name="textoPersonalizado" rows="3" placeholder="Texto que se imprimirá o incluirá en el diseño"></textarea>
                    </div>

                    <div class="form-group">
                        <label for="estiloLetra">Estilo de Letra</label>
                        <select id="estiloLetra" name="estiloLetra">
                            <option value="">Seleccionar estilo</option>
                            <option value="arial">Arial</option>
                            <option value="times">Times New Roman</option>
                            <option value="helvetica">Helvetica</option>
                            <option value="calibri">Calibri</option>
                            <option value="comic-sans">Comic Sans MS</option>
                            <option value="courier">Courier New</option>
                            <option value="georgia">Georgia</option>
                            <option value="verdana">Verdana</option>
                            <option value="impact">Impact</option>
                            <option value="trebuchet">Trebuchet MS</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="colores">Paleta de Colores</label>
                        <div class="color-selection">
                            <input type="text" id="colores" name="colores" placeholder="Ej: Azul, Rojo, Verde">
                            <div class="color-picker-container">
                                <input type="color" id="colorPicker1" class="color-picker" title="Color 1">
                                <input type="color" id="colorPicker2" class="color-picker" title="Color 2">
                                <input type="color" id="colorPicker3" class="color-picker" title="Color 3">
                                <input type="color" id="colorPicker4" class="color-picker" title="Color 4">
                                <input type="color" id="colorPicker5" class="color-picker" title="Color 5">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="especificaciones">Especificaciones Técnicas</label>
                        <textarea id="especificaciones" name="especificaciones" rows="4" placeholder="Tamaño específico, acabados, técnicas de impresión,talla etc."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancelar">Cancelar</button>
                <button type="button" class="btn-guardar" id="guardarDetalles">Guardar Detalles</button>
            </div>
        </div>
    </div>

    <script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
    <script src="/Color_Ink/src/Views/JS/pedidos.js"></script>
</body>
</html>
