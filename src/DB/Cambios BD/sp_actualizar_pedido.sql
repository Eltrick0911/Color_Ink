DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_actualizar_pedido`$$

CREATE PROCEDURE `sp_actualizar_pedido` (
    IN `p_id_pedido` INT, 
    IN `p_id_usuario` INT, 
    IN `p_fecha_pedido` DATETIME, 
    IN `p_fecha_entrega` DATETIME, 
    IN `p_id_estado` INT
)
BEGIN
    UPDATE pedido
    SET 
        id_usuario = p_id_usuario,
        fecha_pedido = p_fecha_pedido,
        fecha_entrega = p_fecha_entrega,
        id_estado = p_id_estado
    WHERE id_pedido = p_id_pedido;
    
    -- Devolver una confirmación de éxito
    SELECT 
        'Pedido actualizado correctamente' AS mensaje, 
        p_id_pedido AS id_pedido,
        ROW_COUNT() AS rows_affected;
END$$

DELIMITER ;