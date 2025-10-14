DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_obtener_pedido`$$

CREATE PROCEDURE `sp_obtener_pedido` (IN `p_id_pedido` INT)
BEGIN
    SELECT
        p.id_pedido,
        p.numero_pedido,
        p.fecha_pedido,
        p.fecha_compromiso,
        p.fecha_entrega,
        p.observaciones,
        p.id_estado,
        e.nombre as estado_nombre,
        e.codigo as estado_codigo,
        p.id_usuario,
        u.nombre_usuario
    FROM pedido p
    LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
    LEFT JOIN cat_estado_pedido e ON p.id_estado = e.id_estado
    WHERE p.id_pedido = p_id_pedido;
END$$

DELIMITER ;