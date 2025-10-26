# Correcciones Realizadas al Sistema de Pedidos

## Fecha: 26 de octubre de 2025

### 1. Formulario de Nuevo Pedido (pedidos.php)

**Problema**: Los campos del formulario no coincidían con lo que esperaba el backend.

**Solución**: Actualizado el formulario con los campos correctos:
- `clienteNombre` (requerido) - Nombre del cliente
- `clienteTelefono` (requerido) - Teléfono del cliente
- `fechaEntrega` (requerido) - Fecha de entrega
- `prioridad` - Prioridad del pedido (normal, urgente, alta)
- `canalVenta` (requerido) - Canal de venta
- `observaciones` - Observaciones adicionales

**Eliminado**: Campos duplicados de `precioUnitario` y `cantidad` que causaban conflictos.

### 2. JavaScript de Creación de Pedidos (pedidos.js)

**Problema**: Los datos enviados no coincidían con los nombres de campo esperados por el backend.

**Solución**: Actualizada la función `crearNuevoPedido()` para enviar:
```javascript
const pedidoData = {
    usuario: formData.get('clienteNombre'),     // Mapeo correcto
    telefono: formData.get('clienteTelefono'),  // Mapeo correcto
    fechaEntrega: formData.get('fechaEntrega'),
    canalVenta: formData.get('canalVenta'),
    prioridad: formData.get('prioridad'),
    observaciones: formData.get('observaciones'),
    categoriaProducto: categoriaProducto,
    colores: colores,
    especificaciones: especificaciones,
    imagenUrl: imagenUrl                        // Primera imagen
};
```

**Agregado**: Recarga automática de la tabla después de crear un pedido con `await PedidosMVC.init()`.

### 3. Renderizado de Tabla (pedidosmvc.js)

**Problema**: La tabla no mostraba todas las columnas requeridas (ID, Cliente, Fecha del pedido, Fecha de entrega, Estado, Total).

**Solución**: Actualizada la función `renderTable()` para mostrar todas las columnas:
```javascript
tr.innerHTML = `
    <td class="pedido-id">#${p.id}</td>
    <td class="pedido-cliente">${p.cliente}</td>
    <td class="pedido-fecha">${p.fecha}</td>
    <td class="pedido-fecha-entrega">${p.fechaEntrega}</td>  // ✅ NUEVO
    <td class="pedido-estado">${View.renderEstadoSelect(p.estado)}</td>
    <td class="pedido-total">${p.total}</td>
    <td class="pedido-actions">...</td>
`;
```

**Agregado**: Manejo de listas vacías con mensaje "No hay pedidos para mostrar".

### 4. Formato de Fechas (pedidosmvc.js)

**Problema**: Las fechas se mostraban en formato largo `toLocaleString()`.

**Solución**: Cambio a formato `DD/MM/YYYY`:
```javascript
formatDate: function (d) {
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
}
```

### 5. Sistema de Upload de Imágenes

**Completado**:
- ✅ UploadController.php - Upload individual y múltiple
- ✅ upload.php - Rutas de API
- ✅ pedidosmvc.js - Métodos `uploadImage()` y `uploadMultiple()`
- ✅ pedidos.js - Event listeners y preview de imágenes
- ✅ Integración con formulario de detalles del producto

### 6. Estructura de la Tabla

**Columnas Correctas**:
1. ID - Identificador del pedido (#001, #002, etc.)
2. Cliente - Nombre del cliente
3. Fecha del pedido - Formato DD/MM/YYYY
4. Fecha de entrega - Formato DD/MM/YYYY
5. Estado - Selector dropdown
6. Total - Formato moneda ($0.00)
7. Acciones - Botones Ver/Editar/Eliminar

### Pruebas Pendientes

1. **Cargar pedidos existentes**: Verificar que los pedidos de la BD se muestren correctamente
2. **Crear nuevo pedido**: Probar el flujo completo con upload de imágenes
3. **Actualizar estado**: Verificar cambio de estado desde la tabla
4. **Filtros**: Probar búsqueda y filtrado por estado

### Comandos para Probar

```bash
# Abrir en navegador
http://localhost/Color_Ink/src/Views/PHP/pedidos.php

# Verificar API de pedidos (consola del navegador)
fetch('/Color_Ink/public/index.php?route=pedidos&caso=1', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
}).then(r => r.json()).then(console.log);
```

### Notas Importantes

- **Autenticación**: Actualmente usa usuario mock (id_usuario=1) para desarrollo
- **Token**: Se genera automáticamente si no existe
- **Directorio uploads**: Ya creado en `/uploads/pedidos/` con permisos
- **CORS**: Headers configurados en todas las rutas

### Archivos Modificados

1. `src/Views/PHP/pedidos.php` - Formulario actualizado
2. `src/Views/JS/pedidos.js` - Función crearNuevoPedido()
3. `src/Views/JS/pedidosmvc.js` - renderTable() y formatDate()
4. `src/Controllers/UploadController.php` - NUEVO
5. `src/Routes/upload.php` - NUEVO
6. `public/index.php` - Agregado 'upload' a rutas permitidas
