-- Corrección de los triggers de detallepedido

DELIMITER $$

-- Primero, eliminamos los triggers existentes
DROP TRIGGER IF EXISTS `tr_detallepedido_after_insert`$$
DROP TRIGGER IF EXISTS `tr_detallepedido_after_update`$$
DROP TRIGGER IF EXISTS `tr_detallepedido_after_delete`$$
DROP TRIGGER IF EXISTS `trg_detallepedido_delete`$$

-- Recreamos el trigger de inserción
CREATE TRIGGER `tr_detallepedido_after_insert` AFTER INSERT ON `detallepedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    
    INSERT INTO detallepedido_aud (
        id_detalle, 
        accion, 
        fecha_accion, 
        usuario_accion, 
        json_despues
    ) VALUES (
        NEW.id_detalle, 
        'INSERT', 
        NOW(), 
        v_usuario_accion,
        JSON_OBJECT(
            'id_detalle', NEW.id_detalle, 
            'producto_solicitado', NEW.producto_solicitado, 
            'cantidad', NEW.cantidad,
            'precio_unitario', NEW.precio_unitario, 
            'descuento', NEW.descuento, 
            'impuesto', NEW.impuesto,
            'total_linea', NEW.total_linea, 
            'id_pedido', NEW.id_pedido, 
            'id_producto', NEW.id_producto,
            'id_movimiento', NEW.id_movimiento
        )
    );
END$$

-- Recreamos el trigger de actualización
CREATE TRIGGER `tr_detallepedido_after_update` AFTER UPDATE ON `detallepedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    
    INSERT INTO detallepedido_aud (
        id_detalle, 
        accion, 
        fecha_accion, 
        usuario_accion, 
        json_antes, 
        json_despues
    ) VALUES (
        OLD.id_detalle, 
        'UPDATE', 
        NOW(), 
        v_usuario_accion,
        JSON_OBJECT(
            'id_detalle', OLD.id_detalle, 
            'producto_solicitado', OLD.producto_solicitado, 
            'cantidad', OLD.cantidad,
            'precio_unitario', OLD.precio_unitario, 
            'descuento', OLD.descuento, 
            'impuesto', OLD.impuesto,
            'total_linea', OLD.total_linea, 
            'id_pedido', OLD.id_pedido, 
            'id_producto', OLD.id_producto,
            'id_movimiento', OLD.id_movimiento
        ),
        JSON_OBJECT(
            'id_detalle', NEW.id_detalle, 
            'producto_solicitado', NEW.producto_solicitado, 
            'cantidad', NEW.cantidad,
            'precio_unitario', NEW.precio_unitario, 
            'descuento', NEW.descuento, 
            'impuesto', NEW.impuesto,
            'total_linea', NEW.total_linea, 
            'id_pedido', NEW.id_pedido, 
            'id_producto', NEW.id_producto,
            'id_movimiento', NEW.id_movimiento
        )
    );
END$$

-- Recreamos el trigger de eliminación
CREATE TRIGGER `tr_detallepedido_after_delete` AFTER DELETE ON `detallepedido` FOR EACH ROW 
BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    
    INSERT INTO detallepedido_aud (
        id_detalle, 
        accion, 
        fecha_accion, 
        usuario_accion, 
        json_antes
    ) VALUES (
        OLD.id_detalle, 
        'DELETE', 
        NOW(), 
        v_usuario_accion,
        JSON_OBJECT(
            'id_detalle', OLD.id_detalle, 
            'producto_solicitado', OLD.producto_solicitado, 
            'cantidad', OLD.cantidad,
            'precio_unitario', OLD.precio_unitario, 
            'descuento', OLD.descuento, 
            'impuesto', OLD.impuesto,
            'total_linea', OLD.total_linea, 
            'id_pedido', OLD.id_pedido, 
            'id_producto', OLD.id_producto,
            'id_movimiento', OLD.id_movimiento
        )
    );
END$$

DELIMITER ;