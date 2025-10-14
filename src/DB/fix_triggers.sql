-- ============================================
-- SCRIPT PARA CORREGIR TODOS LOS TRIGGERS
-- por si no recibe el id de usuario, cambiar default de usuario_accion de 0 a 1
-- ============================================

-- ==========================================
-- 1. ELIMINAR TODOS LOS TRIGGERS EXISTENTES
-- ==========================================

-- Triggers de detallepedido
DROP TRIGGER IF EXISTS `tr_detallepedido_after_delete`;
DROP TRIGGER IF EXISTS `tr_detallepedido_after_insert`;
DROP TRIGGER IF EXISTS `tr_detallepedido_after_update`;
DROP TRIGGER IF EXISTS `trg_detallepedido_delete`;

-- Triggers de pedido
DROP TRIGGER IF EXISTS `tr_pedido_after_delete`;
DROP TRIGGER IF EXISTS `tr_pedido_after_insert`;
DROP TRIGGER IF EXISTS `tr_pedido_after_update`;
DROP TRIGGER IF EXISTS `trg_pedido_delete`;

-- Triggers de producto
DROP TRIGGER IF EXISTS `tr_producto_after_delete`;
DROP TRIGGER IF EXISTS `tr_producto_after_insert`;
DROP TRIGGER IF EXISTS `tr_producto_after_update`;
DROP TRIGGER IF EXISTS `trg_producto_delete`;

-- Triggers de proveedor
DROP TRIGGER IF EXISTS `trg_proveedor_delete`;

-- Triggers de usuario
DROP TRIGGER IF EXISTS `trg_usuario_delete`;

-- ==========================================
-- 2. CREAR TODOS LOS TRIGGERS CORREGIDOS
-- ==========================================

DELIMITER $$

-- ==========================================
-- TRIGGERS PARA DETALLEPEDIDO (CORREGIDOS)
-- ==========================================

CREATE TRIGGER `tr_detallepedido_after_delete` AFTER DELETE ON `detallepedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    INSERT INTO detallepedido_aud (
        id_detalle, accion, fecha_accion, usuario_accion, json_antes 
    ) VALUES (
        OLD.id_detalle, 'DELETE', NOW(), v_usuario_accion,
        JSON_OBJECT(
            'id_detalle', OLD.id_detalle, 'producto_solicitado', OLD.producto_solicitado, 'cantidad', OLD.cantidad,
            'precio_unitario', OLD.precio_unitario, 'descuento', OLD.descuento, 'impuesto', OLD.impuesto,
            'total_linea', OLD.total_linea, 'id_pedido', OLD.id_pedido, 'id_producto', OLD.id_producto,
            'id_movimiento', OLD.id_movimiento
        )
    );
END$$

CREATE TRIGGER `tr_detallepedido_after_insert` AFTER INSERT ON `detallepedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    INSERT INTO detallepedido_aud (
        id_detalle, accion, fecha_accion, usuario_accion, json_despues 
    ) VALUES (
        NEW.id_detalle, 'INSERT', NOW(), v_usuario_accion,
        JSON_OBJECT(
            'id_detalle', NEW.id_detalle, 'producto_solicitado', NEW.producto_solicitado, 'cantidad', NEW.cantidad,
            'precio_unitario', NEW.precio_unitario, 'descuento', NEW.descuento, 'impuesto', NEW.impuesto,
            'total_linea', NEW.total_linea, 'id_pedido', NEW.id_pedido, 'id_producto', NEW.id_producto,
            'id_movimiento', NEW.id_movimiento
        )
    );
END$$

CREATE TRIGGER `tr_detallepedido_after_update` AFTER UPDATE ON `detallepedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    INSERT INTO detallepedido_aud (
        id_detalle, accion, fecha_accion, usuario_accion, json_antes, json_despues
    ) VALUES (
        OLD.id_detalle, 'UPDATE', NOW(), v_usuario_accion,
        JSON_OBJECT(
            'id_detalle', OLD.id_detalle, 'producto_solicitado', OLD.producto_solicitado, 'cantidad', OLD.cantidad,
            'precio_unitario', OLD.precio_unitario, 'descuento', OLD.descuento, 'impuesto', OLD.impuesto,
            'total_linea', OLD.total_linea, 'id_pedido', OLD.id_pedido, 'id_producto', OLD.id_producto,
            'id_movimiento', OLD.id_movimiento
        ),
        JSON_OBJECT(
            'id_detalle', NEW.id_detalle, 'producto_solicitado', NEW.producto_solicitado, 'cantidad', NEW.cantidad,
            'precio_unitario', NEW.precio_unitario, 'descuento', NEW.descuento, 'impuesto', NEW.impuesto,
            'total_linea', NEW.total_linea, 'id_pedido', NEW.id_pedido, 'id_producto', NEW.id_producto,
            'id_movimiento', NEW.id_movimiento
        )
    );
END$$

-- ==========================================
-- TRIGGERS PARA PEDIDO (CORREGIDOS)
-- ==========================================

CREATE TRIGGER `tr_pedido_after_delete` AFTER DELETE ON `pedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1); 
    INSERT INTO pedido_aud (
        id_pedido, accion, fecha_accion, usuario_accion, json_antes 
    )
    VALUES (
        OLD.id_pedido,
        'DELETE',
        NOW(),
        v_usuario_accion,
        JSON_OBJECT(
            'id_pedido', OLD.id_pedido, 
            'numero_pedido', OLD.numero_pedido, 
            'fecha_pedido', OLD.fecha_pedido,
            'fecha_compromiso', OLD.fecha_compromiso, 
            'observaciones', OLD.observaciones, 
            'id_estado', OLD.id_estado, 
            'id_usuario', OLD.id_usuario
        )
    );
END$$

CREATE TRIGGER `tr_pedido_after_insert` AFTER INSERT ON `pedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1); 
    INSERT INTO pedido_aud (
        id_pedido, accion, fecha_accion, usuario_accion, json_despues 
    )
    VALUES (
        NEW.id_pedido,
        'INSERT',
        NOW(),
        v_usuario_accion,
        JSON_OBJECT(
            'id_pedido', NEW.id_pedido, 
            'numero_pedido', NEW.numero_pedido, 
            'fecha_pedido', NEW.fecha_pedido,
            'fecha_compromiso', NEW.fecha_compromiso, 
            'observaciones', NEW.observaciones, 
            'id_estado', NEW.id_estado, 
            'id_usuario', NEW.id_usuario
        )
    );
END$$

CREATE TRIGGER `tr_pedido_after_update` AFTER UPDATE ON `pedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1); 
    INSERT INTO pedido_aud (
        id_pedido, accion, fecha_accion, usuario_accion, json_antes, json_despues
    )
    VALUES (
        OLD.id_pedido,
        'UPDATE',
        NOW(),
        v_usuario_accion,
        JSON_OBJECT(
            'id_pedido', OLD.id_pedido, 
            'numero_pedido', OLD.numero_pedido, 
            'fecha_pedido', OLD.fecha_pedido,
            'fecha_compromiso', OLD.fecha_compromiso, 
            'observaciones', OLD.observaciones, 
            'id_estado', OLD.id_estado, 
            'id_usuario', OLD.id_usuario
        ),
        JSON_OBJECT(
            'id_pedido', NEW.id_pedido, 
            'numero_pedido', NEW.numero_pedido, 
            'fecha_pedido', NEW.fecha_pedido,
            'fecha_compromiso', NEW.fecha_compromiso, 
            'observaciones', NEW.observaciones, 
            'id_estado', NEW.id_estado, 
            'id_usuario', NEW.id_usuario
        )
    );
END$$

-- ==========================================
-- TRIGGERS PARA PRODUCTO (CORREGIDOS)
-- ==========================================

CREATE TRIGGER `tr_producto_after_delete` AFTER DELETE ON `producto` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    INSERT INTO producto_aud (
        id_producto, accion, fecha_accion, usuario_accion, json_antes 
    ) VALUES (
        OLD.id_producto, 'DELETE', NOW(), v_usuario_accion,
        JSON_OBJECT(
            'id_producto', OLD.id_producto, 'sku', OLD.sku, 'nombre_producto', OLD.nombre_producto,
            'descripcion', OLD.descripcion, 'costo_unitario', OLD.costo_unitario, 'precio_venta_base', OLD.precio_venta_base,
            'stock', OLD.stock, 'stock_minimo', OLD.stock_minimo, 'activo', OLD.activo, 
            'id_categoria', OLD.id_categoria, 'id_proveedor', OLD.id_proveedor
        )
    );
END$$

CREATE TRIGGER `tr_producto_after_insert` AFTER INSERT ON `producto` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    INSERT INTO producto_aud (
        id_producto, accion, fecha_accion, usuario_accion, json_despues 
    ) VALUES (
        NEW.id_producto, 'INSERT', NOW(), v_usuario_accion,
        JSON_OBJECT(
            'id_producto', NEW.id_producto, 'sku', NEW.sku, 'nombre_producto', NEW.nombre_producto,
            'descripcion', NEW.descripcion, 'costo_unitario', NEW.costo_unitario, 'precio_venta_base', NEW.precio_venta_base,
            'stock', NEW.stock, 'stock_minimo', NEW.stock_minimo, 'activo', NEW.activo, 
            'id_categoria', NEW.id_categoria, 'id_proveedor', NEW.id_proveedor
        )
    );
END$$

CREATE TRIGGER `tr_producto_after_update` AFTER UPDATE ON `producto` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    INSERT INTO producto_aud (
        id_producto, accion, fecha_accion, usuario_accion, json_antes, json_despues
    ) VALUES (
        OLD.id_producto, 'UPDATE', NOW(), v_usuario_accion,
        JSON_OBJECT(
            'id_producto', OLD.id_producto, 'sku', OLD.sku, 'nombre_producto', OLD.nombre_producto,
            'descripcion', OLD.descripcion, 'costo_unitario', OLD.costo_unitario, 'precio_venta_base', OLD.precio_venta_base,
            'stock', OLD.stock, 'stock_minimo', OLD.stock_minimo, 'activo', OLD.activo, 
            'id_categoria', OLD.id_categoria, 'id_proveedor', OLD.id_proveedor
        ),
        JSON_OBJECT(
            'id_producto', NEW.id_producto, 'sku', NEW.sku, 'nombre_producto', NEW.nombre_producto,
            'descripcion', NEW.descripcion, 'costo_unitario', NEW.costo_unitario, 'precio_venta_base', NEW.precio_venta_base,
            'stock', NEW.stock, 'stock_minimo', NEW.stock_minimo, 'activo', NEW.activo, 
            'id_categoria', NEW.id_categoria, 'id_proveedor', NEW.id_proveedor
        )
    );
END$$

-- ==========================================
-- TRIGGERS PARA PROVEEDOR (CORREGIDOS)
-- ==========================================

CREATE TRIGGER `trg_proveedor_delete` AFTER DELETE ON `proveedor` FOR EACH ROW 
BEGIN
    INSERT INTO proveedor_aud (id_proveedor, descripcion_proveedor, forma_contacto, direccion, accion, usuario_accion)
    VALUES (OLD.id_proveedor, OLD.descripcion_proveedor, OLD.forma_contacto, OLD.direccion, 'DELETE', 1); -- CORREGIDO: default 1
END$$

-- ==========================================
-- TRIGGERS PARA USUARIO (CORREGIDOS)
-- ==========================================

CREATE TRIGGER `trg_usuario_delete` AFTER DELETE ON `usuario` FOR EACH ROW 
BEGIN
    INSERT INTO usuario_aud (id_usuario, nombre, correo, id_rol, accion, usuario_accion)
    VALUES (OLD.id_usuario, OLD.nombre_usuario, OLD.correo, OLD.id_rol, 'DELETE', 1); -- CORREGIDO: default 1
END$$

DELIMITER ;

-- ==========================================
-- CONFIRMACIÓN
-- ==========================================

SELECT 'Todos los triggers han sido recreados con usuario_accion default = 1' AS resultado;