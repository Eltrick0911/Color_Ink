# 📋 Sistema de Auditoría

## 📖 Descripción General

El sistema de auditoría de Color Ink registra automáticamente todos los cambios realizados en las tablas principales de la base de datos, permitiendo rastrear quién, cuándo y qué cambios se realizaron.

## 🗄️ Tablas Auditadas

### Tablas con Auditoría Completa:
- **`producto`** → `producto_aud`
- **`pedido`** → `pedido_aud`
- **`detallepedido`** → `detallepedido_aud`
- **`proveedor`** → `proveedor_aud`
- **`usuario`** → `usuario_aud`
- **`venta`** → `venta_aud`

## 🔧 Componentes del Sistema

### 1. **Triggers de Base de Datos**
Los triggers capturan automáticamente las operaciones:
- `AFTER INSERT` → Registra creaciones
- `AFTER UPDATE` → Registra modificaciones
- `AFTER DELETE` → Registra eliminaciones

```sql
-- Ejemplo de trigger para producto
CREATE TRIGGER trg_producto_audit_insert
AFTER INSERT ON producto
FOR EACH ROW
BEGIN
    INSERT INTO producto_aud (
        id_producto, accion, fecha_accion, 
        usuario_accion, json_antes, json_despues
    ) VALUES (
        NEW.id_producto, 'INSERT', NOW(),
        COALESCE(@usuario_id, 1), NULL,
        JSON_OBJECT(
            'id_producto', NEW.id_producto,
            'sku', NEW.sku,
            'nombre_producto', NEW.nombre_producto,
            'activo', NEW.activo,
            'descripcion', NEW.descripcion,
            'precio_venta_base', NEW.precio_venta_base,
            'stock', NEW.stock,
            -- ... más campos
        )
    );
END;
```

### 2. **Variable de Sesión `@usuario_id`**
Los Stored Procedures establecen el ID del usuario que realiza la acción:

```sql
-- En cada SP que modifica datos
SET @usuario_id = p_id_usuario;
```

### 3. **Stored Procedures Modificados**
Todos los SP que modifican datos ahora incluyen el parámetro `p_id_usuario`:

#### Ejemplos:
- `sp_crear_producto(... , IN p_id_usuario INT)`
- `sp_actualizar_producto(... , IN p_id_usuario INT)`
- `sp_eliminar_producto(IN p_id_producto INT, IN p_id_usuario INT)`
- `sp_crear_pedido(... , IN p_id_usuario INT)`
- `sp_actualizar_pedido(... , IN p_id_usuario INT)`

### 4. **Controladores (Backend)**
Los controladores inyectan el `id_usuario` autenticado:

```php
// inveController.php - Ejemplo
public function addProduct(array $headers, array $input): void
{
    // Autorizar usuario
    $auth = $this->authorize($headers, [1, 2]);
    if (!$auth) return;
    
    // Inyectar id_usuario para auditoría
    $idUsuario = (int)($auth['id_usuario'] ?? 1);
    
    // Pasar al modelo
    $result = $this->inveModel->addProduct($input, $idUsuario);
}
```

### 5. **Modelos (Backend)**
Los modelos pasan el `id_usuario` a los Stored Procedures:

```php
// inveModel.php - Ejemplo
public function addProduct(array $data, int $idUsuario = 1): bool|array
{
    $stmt = $this->db->prepare(
        "CALL sp_crear_producto(
            :sku, :nombre_producto, :descripcion, 
            :precio, :stock, :id_proveedor, 
            :id_categoria, :id_usuario
        )"
    );
    
    // Bind de todos los parámetros
    $stmt->bindParam(':id_usuario', $idUsuario, PDO::PARAM_INT);
    $stmt->execute();
}
```

### 6. **Frontend (Autorización)**
El frontend envía el token JWT en las peticiones:

```javascript
// inve.js - Ejemplo
const response = await fetch('/Color_Ink/public/index.php?route=inve&caso=1&action=add', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Token de autenticación
    },
    body: JSON.stringify(data)
});
```

## 📊 Interfaz de Auditoría

### Características:
1. **Filtros Avanzados:**
   - Por tabla (Producto, Pedido, etc.)
   - Por usuario
   - Por tipo de transacción (Creación, Actualización, Eliminación)
   - Por rango de fechas

2. **Traducciones en Español:**
   - `INSERT` → **Creación** (verde)
   - `UPDATE` → **Actualización** (azul)
   - `DELETE` → **Eliminación** (rojo)

3. **Eliminación Lógica Inteligente:**
   - Productos con `activo: 1 → 0` se muestran como **Eliminación**
   - Filtro "Actualización" excluye productos inactivados
   - Filtro "Eliminación" incluye DELETE + productos inactivados

4. **Detalles Completos:**
   - JSON "Antes" con valores anteriores
   - JSON "Después" con valores nuevos
   - Comparación lado a lado

5. **Exportación a Excel:**
   - Formato vertical (campo por campo)
   - Colores según tipo de acción
   - Cada registro con sus cambios detallados

## 🔐 Seguridad y Permisos

### Acceso a Auditoría:
- **Solo administradores** (rol 1) pueden ver auditoría
- Guard de autenticación en `auditoria.js`
- Validación de token en backend

### Roles para Operaciones:
- **Crear producto:** Roles 1 (Gerente) y 2 (Usuario)
- **Actualizar producto:** Roles 1 (Gerente) y 2 (Usuario)
- **Eliminar producto:** Roles 1 (Gerente) y 2 (Usuario)

## 🛠️ Mantenimiento

### Verificar Auditoría:
```sql
-- Ver registros de auditoría de un producto específico
SELECT * FROM producto_aud 
WHERE id_producto = 17 
ORDER BY fecha_accion DESC;

-- Ver todas las eliminaciones de productos
SELECT * FROM producto_aud 
WHERE accion = 'UPDATE' 
  AND JSON_EXTRACT(json_antes, '$.activo') = 1
  AND JSON_EXTRACT(json_despues, '$.activo') = 0;
```

### Limpiar Auditoría Antigua:
```sql
-- Eliminar registros de auditoría mayores a 1 año
DELETE FROM producto_aud 
WHERE fecha_accion < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

## 📝 Ejemplo de Flujo Completo

### Escenario: Usuario actualiza precio de producto

1. **Frontend:** Usuario cambia precio de $10 a $12
   ```javascript
   // inve.js envía petición con Authorization header
   ```

2. **Backend (Controller):** Valida token y extrae usuario
   ```php
   $auth = $this->authorize($headers, [1, 2]); // Usuario ID: 8
   $input['id_usuario'] = 8;
   ```

3. **Backend (Model):** Llama al SP con usuario
   ```php
   CALL sp_actualizar_producto(..., 8);
   ```

4. **Base de Datos (SP):** Establece usuario
   ```sql
   SET @usuario_id = 8;
   UPDATE producto SET precio_venta_base = 12 WHERE id_producto = 17;
   ```

5. **Base de Datos (Trigger):** Registra en auditoría
   ```sql
   INSERT INTO producto_aud (
       usuario_accion = 8,
       json_antes = '{"precio_venta_base": 10, ...}',
       json_despues = '{"precio_venta_base": 12, ...}'
   );
   ```

6. **Interfaz de Auditoría:** Muestra cambio
   - Usuario: `8 - Admin`
   - Acción: `Actualización` (azul)
   - Campo: `precio_venta_base`
   - Antes: `10`
   - Después: `12`

## ⚠️ Notas Importantes

### ✅ Buenas Prácticas:
- Siempre pasar `id_usuario` real desde el frontend
- Nunca usar valores hardcoded (ej: `@usuario_id = 1`)
- Verificar que los SP establezcan `@usuario_id` correctamente
- Probar eliminaciones lógicas para verificar que aparecen como "Eliminación"

### ❌ Errores Comunes:
- **Auditoría registra usuario 1:** SP no establece `@usuario_id` o no recibe `p_id_usuario`
- **401 Unauthorized:** Frontend no envía token de autorización
- **Eliminaciones no aparecen:** Filtro no incluye UPDATE con activo 1→0

## 🔄 Actualizar un SP para Auditoría

Si necesitas agregar auditoría a un SP nuevo:

```sql
-- 1. Agregar parámetro al final
CREATE PROCEDURE sp_mi_operacion(
    IN p_parametro1 VARCHAR(255),
    IN p_parametro2 INT,
    IN p_id_usuario INT  -- ← Agregar esto
)
BEGIN
    -- 2. Establecer variable de sesión
    SET @usuario_id = p_id_usuario;
    
    -- 3. Realizar operaciones
    UPDATE mi_tabla SET campo = valor WHERE id = p_id;
    
    -- El trigger captura automáticamente con @usuario_id
END;
```

## 📞 Soporte

Para dudas sobre auditoría, revisar:
- `src/Controllers/AuditController.php` - Backend de consultas
- `src/Views/JS/auditoria.js` - Frontend e interfaz
- Triggers en la base de datos `color_ink`
