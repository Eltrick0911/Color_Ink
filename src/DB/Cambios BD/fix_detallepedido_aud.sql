-- Corrección de la estructura de la tabla detallepedido_aud

DELIMITER $$

-- Primero, verifiquemos si la tabla existe
DROP TABLE IF EXISTS `detallepedido_aud`$$

-- Creamos la tabla con las columnas necesarias para la auditoría
CREATE TABLE `detallepedido_aud` (
  `id_aud` int(11) NOT NULL AUTO_INCREMENT,
  `id_detalle` int(11) NOT NULL,
  `accion` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `fecha_accion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_accion` int(11) NOT NULL DEFAULT 1,
  `json_antes` JSON NULL,
  `json_despues` JSON NULL,
  PRIMARY KEY (`id_aud`),
  KEY `fk_aud_detalle` (`id_detalle`),
  KEY `fk_aud_usuario_accion_detallepedido` (`usuario_accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci$$

DELIMITER ;