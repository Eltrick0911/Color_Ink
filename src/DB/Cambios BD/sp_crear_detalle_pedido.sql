-- Corrección del procedimiento almacenado sp_crear_detalle_pedido

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_crear_detalle_pedido`$$

CREATE PROCEDURE `sp_crear_detalle_pedido` (
    IN `p_producto_solicitado` VARCHAR(255),
    IN `p_precio_unitario` DECIMAL(10,2),
    IN `p_descuento` DECIMAL(10,2),
    IN `p_impuesto` DECIMAL(10,2),
    IN `p_id_pedido` INT,
    IN `p_id_producto` INT,
    IN `p_cantidad` INT,
    IN `p_id_usuario` INT
)
BEGIN
    DECLARE v_total_linea DECIMAL(10,2);
    DECLARE v_id_detalle INT;
    
    -- Calcular el total de la línea
    SET v_total_linea = (p_precio_unitario * p_cantidad) * (1 - (p_descuento / 100)) * (1 + (p_impuesto / 100));
    
    -- Establecer el ID de usuario para auditoría
    SET @usuario_id = p_id_usuario;
    
    -- Insertar el detalle del pedido
    INSERT INTO detallepedido (
        producto_solicitado,
        cantidad,
        precio_unitario,
        descuento,
        impuesto,
        total_linea,
        id_pedido,
        id_producto
    ) VALUES (
        p_producto_solicitado,
        p_cantidad,
        p_precio_unitario,
        p_descuento,
        p_impuesto,
        v_total_linea,
        p_id_pedido,
        p_id_producto
    );
    
    -- Obtener el ID del detalle insertado
    SET v_id_detalle = LAST_INSERT_ID();
    
    -- Retornar el ID del detalle insertado
    SELECT v_id_detalle AS id_detalle_creado;
    
END$$

DELIMITER ;