-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 14-10-2025 a las 19:20:49
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `color_ink`
--
CREATE DATABASE IF NOT EXISTS `color_ink` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `color_ink`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alerta_stock`
--

DROP TABLE IF EXISTS `alerta_stock`;
CREATE TABLE IF NOT EXISTS `alerta_stock` (
  `id_alerta` int(11) NOT NULL AUTO_INCREMENT,
  `id_producto` int(11) NOT NULL,
  `stock_actual` int(11) NOT NULL,
  `stock_minimo_establecido` int(11) NOT NULL,
  `mensaje` varchar(255) NOT NULL,
  `fecha_alerta` datetime NOT NULL,
  `atendida` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0=Pendiente, 1=Atendida/Revisada',
  PRIMARY KEY (`id_alerta`),
  KEY `fk_alerta_producto` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categoriaproducto`
--

DROP TABLE IF EXISTS `categoriaproducto`;
CREATE TABLE IF NOT EXISTS `categoriaproducto` (
  `id_categoria` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `idx_categoria_descripcion` (`descripcion`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categoriaproducto`
--

INSERT INTO `categoriaproducto` (`id_categoria`, `descripcion`) VALUES
(1, 'Material'),
(2, 'Producto Final');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cat_estado_pedido`
--

DROP TABLE IF EXISTS `cat_estado_pedido`;
CREATE TABLE IF NOT EXISTS `cat_estado_pedido` (
  `id_estado` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `es_final` tinyint(1) DEFAULT 0 COMMENT '1 si es un estado final (Entregado o Cancelado), 0 en caso contrario',
  `orden` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_estado`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `cat_estado_pedido`
--

INSERT INTO `cat_estado_pedido` (`id_estado`, `codigo`, `nombre`, `es_final`, `orden`) VALUES
(1, 'ENTRG', 'Entregado', 1, 3),
(2, 'CANC', 'Cancelado', 1, 4),
(3, 'PROCESO', 'En Proceso', 0, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detallepedido`
--

DROP TABLE IF EXISTS `detallepedido`;
CREATE TABLE IF NOT EXISTS `detallepedido` (
  `id_detalle` int(11) NOT NULL AUTO_INCREMENT,
  `producto_solicitado` varchar(100) DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  `descuento` decimal(10,2) DEFAULT 0.00,
  `impuesto` decimal(10,2) DEFAULT 0.00,
  `total_linea` decimal(12,2) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `id_movimiento` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_detalle`),
  KEY `fk_detalle_pedido` (`id_pedido`),
  KEY `fk_detalle_producto` (`id_producto`),
  KEY `fk_detalle_movimiento` (`id_movimiento`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `detallepedido`
--
DROP TRIGGER IF EXISTS `tr_detallepedido_after_delete`;
DELIMITER $$
CREATE TRIGGER `tr_detallepedido_after_delete` AFTER DELETE ON `detallepedido` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `tr_detallepedido_after_insert`;
DELIMITER $$
CREATE TRIGGER `tr_detallepedido_after_insert` AFTER INSERT ON `detallepedido` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `tr_detallepedido_after_update`;
DELIMITER $$
CREATE TRIGGER `tr_detallepedido_after_update` AFTER UPDATE ON `detallepedido` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detallepedido_aud`
--

DROP TABLE IF EXISTS `detallepedido_aud`;
CREATE TABLE IF NOT EXISTS `detallepedido_aud` (
  `id_aud` int(11) NOT NULL AUTO_INCREMENT,
  `id_detalle` int(11) NOT NULL,
  `accion` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `fecha_accion` datetime NOT NULL DEFAULT current_timestamp(),
  `usuario_accion` int(11) NOT NULL DEFAULT 1,
  `json_antes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_antes`)),
  `json_despues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_despues`)),
  PRIMARY KEY (`id_aud`),
  KEY `fk_aud_detalle` (`id_detalle`),
  KEY `fk_aud_usuario_accion_detallepedido` (`usuario_accion`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientoinventario`
--

DROP TABLE IF EXISTS `movimientoinventario`;
CREATE TABLE IF NOT EXISTS `movimientoinventario` (
  `id_movimiento` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_movimiento` enum('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  `origen` enum('PEDIDO','COMPRA','AJUSTE','TRANSFERENCIA') NOT NULL,
  `id_origen` int(11) DEFAULT NULL,
  `fecha_movimiento` date DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_movimiento_usuario` (`id_usuario`),
  KEY `fk_movimiento_producto` (`id_producto`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido`
--

DROP TABLE IF EXISTS `pedido`;
CREATE TABLE IF NOT EXISTS `pedido` (
  `id_pedido` int(11) NOT NULL AUTO_INCREMENT,
  `numero_pedido` varchar(50) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_pedido` date DEFAULT NULL,
  `fecha_compromiso` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_entrega` date DEFAULT NULL,
  `id_estado` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_pedido`),
  UNIQUE KEY `numero_pedido` (`numero_pedido`),
  KEY `fk_pedido_usuario` (`id_usuario`),
  KEY `fk_pedido_estado` (`id_estado`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `pedido`
--
DROP TRIGGER IF EXISTS `tr_pedido_after_delete`;
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_delete` AFTER DELETE ON `pedido` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `tr_pedido_after_insert`;
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_insert` AFTER INSERT ON `pedido` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `tr_pedido_after_update`;
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_update` AFTER UPDATE ON `pedido` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_aud`
--

DROP TABLE IF EXISTS `pedido_aud`;
CREATE TABLE IF NOT EXISTS `pedido_aud` (
  `id_aud` int(11) NOT NULL AUTO_INCREMENT,
  `fecha_accion` datetime NOT NULL,
  `usuario_accion` int(11) NOT NULL,
  `json_antes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_antes`)),
  `json_despues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_despues`)),
  `id_pedido` int(11) DEFAULT NULL,
  `id_estado` int(11) DEFAULT NULL,
  `fecha_pedido` datetime DEFAULT NULL,
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  PRIMARY KEY (`id_aud`),
  KEY `fk_aud_usuario_accion_pedido` (`usuario_accion`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto`
--

DROP TABLE IF EXISTS `producto`;
CREATE TABLE IF NOT EXISTS `producto` (
  `id_producto` int(11) NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) NOT NULL,
  `nombre_producto` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `descripcion` text DEFAULT NULL,
  `precio_venta_base` decimal(12,2) NOT NULL,
  `stock` int(11) DEFAULT 0,
  `stock_minimo` int(11) NOT NULL DEFAULT 3,
  `costo_unitario` decimal(12,2) DEFAULT 0.00,
  `id_proveedor` int(11) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `sku` (`sku`),
  KEY `fk_producto_proveedor` (`id_proveedor`),
  KEY `fk_producto_categoria` (`id_categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `producto`
--
DROP TRIGGER IF EXISTS `tr_producto_after_delete`;
DELIMITER $$
CREATE TRIGGER `tr_producto_after_delete` AFTER DELETE ON `producto` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `tr_producto_after_insert`;
DELIMITER $$
CREATE TRIGGER `tr_producto_after_insert` AFTER INSERT ON `producto` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `tr_producto_after_update`;
DELIMITER $$
CREATE TRIGGER `tr_producto_after_update` AFTER UPDATE ON `producto` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_aud`
--

DROP TABLE IF EXISTS `producto_aud`;
CREATE TABLE IF NOT EXISTS `producto_aud` (
  `id_aud` int(11) NOT NULL AUTO_INCREMENT,
  `fecha_accion` datetime NOT NULL,
  `usuario_accion` int(11) NOT NULL,
  `json_antes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_antes`)),
  `json_despues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_despues`)),
  `id_producto` int(11) DEFAULT NULL,
  `descripcion_producto` varchar(150) DEFAULT NULL,
  `id_proveedor` int(11) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `stock` int(11) DEFAULT NULL,
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  PRIMARY KEY (`id_aud`),
  KEY `fk_aud_usuario_accion_producto` (`usuario_accion`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedor`
--

DROP TABLE IF EXISTS `proveedor`;
CREATE TABLE IF NOT EXISTS `proveedor` (
  `id_proveedor` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion_proveedor` varchar(100) DEFAULT NULL,
  `forma_contacto` varchar(100) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `proveedor`
--
DROP TRIGGER IF EXISTS `trg_proveedor_delete`;
DELIMITER $$
CREATE TRIGGER `trg_proveedor_delete` AFTER DELETE ON `proveedor` FOR EACH ROW BEGIN
    INSERT INTO proveedor_aud (id_proveedor, descripcion_proveedor, forma_contacto, direccion, accion, usuario_accion)
    VALUES (OLD.id_proveedor, OLD.descripcion_proveedor, OLD.forma_contacto, OLD.direccion, 'DELETE', 1); -- CORREGIDO: default 1
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedor_aud`
--

DROP TABLE IF EXISTS `proveedor_aud`;
CREATE TABLE IF NOT EXISTS `proveedor_aud` (
  `id_aud` int(11) NOT NULL AUTO_INCREMENT,
  `id_proveedor` int(11) DEFAULT NULL,
  `descripcion_proveedor` varchar(100) DEFAULT NULL,
  `forma_contacto` varchar(100) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp(),
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `usuario_accion` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_aud`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registroconsulta`
--

DROP TABLE IF EXISTS `registroconsulta`;
CREATE TABLE IF NOT EXISTS `registroconsulta` (
  `id_consulta` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_consulta` varchar(50) DEFAULT NULL,
  `fecha_inicial` date DEFAULT NULL,
  `fecha_final` date DEFAULT NULL,
  `resultado_consulta` text DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_consulta`),
  KEY `fk_registroconsulta_usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol`
--

DROP TABLE IF EXISTS `rol`;
CREATE TABLE IF NOT EXISTS `rol` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) NOT NULL,
  `estado` varchar(20) NOT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rol`
--

INSERT INTO `rol` (`id_rol`, `descripcion`, `estado`) VALUES
(1, 'Gerente', 'Activo'),
(2, 'Administrador', 'Activo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

DROP TABLE IF EXISTS `usuario`;
CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `password_updated_at` datetime DEFAULT NULL,
  `intentos_fallidos` int(11) DEFAULT 0,
  `bloqueado_hasta` datetime DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `ultimo_acceso` datetime DEFAULT NULL,
  `id_rol` int(11) NOT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_usuario_correo` (`correo`),
  KEY `fk_usuario_rol` (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `usuario`
--
DROP TRIGGER IF EXISTS `trg_usuario_delete`;
DELIMITER $$
CREATE TRIGGER `trg_usuario_delete` AFTER DELETE ON `usuario` FOR EACH ROW BEGIN
    INSERT INTO usuario_aud (id_usuario, nombre, correo, id_rol, accion, usuario_accion)
    VALUES (OLD.id_usuario, OLD.nombre_usuario, OLD.correo, OLD.id_rol, 'DELETE', 1); -- CORREGIDO: default 1
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_aud`
--

DROP TABLE IF EXISTS `usuario_aud`;
CREATE TABLE IF NOT EXISTS `usuario_aud` (
  `id_aud` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `id_rol` int(11) DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp(),
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `usuario_accion` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_aud`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `alerta_stock`
--
ALTER TABLE `alerta_stock`
  ADD CONSTRAINT `fk_alerta_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detallepedido`
--
ALTER TABLE `detallepedido`
  ADD CONSTRAINT `fk_detalle_movimiento` FOREIGN KEY (`id_movimiento`) REFERENCES `movimientoinventario` (`id_movimiento`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id_pedido`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `movimientoinventario`
--
ALTER TABLE `movimientoinventario`
  ADD CONSTRAINT `fk_movimiento_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_movimiento_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD CONSTRAINT `fk_pedido_estado_nuevo` FOREIGN KEY (`id_estado`) REFERENCES `cat_estado_pedido` (`id_estado`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pedido_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedido_aud`
--
ALTER TABLE `pedido_aud`
  ADD CONSTRAINT `fk_aud_usuario_accion_pedido` FOREIGN KEY (`usuario_accion`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `producto`
--
ALTER TABLE `producto`
  ADD CONSTRAINT `fk_producto_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categoriaproducto` (`id_categoria`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_producto_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedor` (`id_proveedor`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `producto_aud`
--
ALTER TABLE `producto_aud`
  ADD CONSTRAINT `fk_aud_usuario_accion_producto` FOREIGN KEY (`usuario_accion`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `registroconsulta`
--
ALTER TABLE `registroconsulta`
  ADD CONSTRAINT `fk_registroconsulta_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
