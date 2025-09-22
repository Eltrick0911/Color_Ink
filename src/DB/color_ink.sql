-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-09-2025 a las 08:25:40
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

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_categoria` (IN `p_id_categoria` INT, IN `p_descripcion` VARCHAR(100))   BEGIN
    UPDATE categoriaproducto SET descripcion = p_descripcion WHERE id_categoria = p_id_categoria;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_detalle_pedido` (IN `p_id_detalle` INT, IN `p_producto_solicitado` VARCHAR(255), IN `p_precio_unitario` DECIMAL(10,2), IN `p_precio_venta` DECIMAL(10,2), IN `p_id_pedido` INT, IN `p_id_producto` INT, IN `p_id_movimiento` INT)   BEGIN
    UPDATE detallepedido
    SET producto_solicitado = p_producto_solicitado,
        precio_unitario = p_precio_unitario,
        precio_venta = p_precio_venta,
        id_pedido = p_id_pedido,
        id_producto = p_id_producto,
        id_movimiento = p_id_movimiento
    WHERE id_detalle = p_id_detalle;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_estado` (IN `p_id_estado` INT, IN `p_proceso` VARCHAR(50), IN `p_entregado` TINYINT(1), IN `p_cancelado` TINYINT(1))   BEGIN
    UPDATE estadopedido SET proceso = p_proceso, entregado = p_entregado, cancelado = p_cancelado WHERE id_estado = p_id_estado;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_pedido` (IN `p_id_pedido` INT, IN `p_id_usuario` INT, IN `p_fecha_pedido` DATETIME, IN `p_fecha_entrega` DATETIME, IN `p_id_estado` INT)   BEGIN
    UPDATE pedido
    SET id_usuario = p_id_usuario,
        fecha_pedido = p_fecha_pedido,
        fecha_entrega = p_fecha_entrega,
        id_estado = p_id_estado
    WHERE id_pedido = p_id_pedido;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_producto` (IN `p_id_producto` INT, IN `p_nombre_producto` VARCHAR(255), IN `p_descripcion` TEXT, IN `p_precio` DECIMAL(10,2), IN `p_stock` INT, IN `p_id_proveedor` INT, IN `p_id_categoria` INT)   BEGIN
    UPDATE producto
    SET nombre_producto = p_nombre_producto,
        descripcion = p_descripcion,
        precio = p_precio,
        stock = p_stock,
        id_proveedor = p_id_proveedor,
        id_categoria = p_id_categoria
    WHERE id_producto = p_id_producto;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_rol` (IN `p_id_rol` INT, IN `p_descripcion` VARCHAR(100), IN `p_estado` VARCHAR(20))   BEGIN
    UPDATE rol SET descripcion = p_descripcion, estado = p_estado WHERE id_rol = p_id_rol;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_categoria` (IN `p_descripcion` VARCHAR(100))   BEGIN
    INSERT INTO categoriaproducto (descripcion) VALUES (p_descripcion);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_detallepedido` (IN `p_producto_solicitado` VARCHAR(255), IN `p_precio_unitario` DECIMAL(10,2), IN `p_precio_venta` DECIMAL(10,2), IN `p_id_pedido` INT, IN `p_id_producto` INT, IN `p_cantidad` INT, IN `p_id_usuario` INT)   BEGIN
    DECLARE v_iddetalle INT;
    DECLARE v_idmovimiento INT;

    -- 1. Inserta el movimiento de inventario por la salida del producto
    INSERT INTO movimientoinventario (
        id_producto,
        entrada,
        salida,
        fecha_movimiento,
        cantidad,
        id_usuario
    ) VALUES (
        p_id_producto,
        0,  -- No es una entrada
        p_cantidad,
        NOW(),
        p_cantidad,
        p_id_usuario
    );

    -- Obtener el ID del movimiento recién insertado
    SET v_idmovimiento = LAST_INSERT_ID();

    -- 2. Inserta el detalle del pedido
    INSERT INTO detallepedido (
        producto_solicitado,
        precio_unitario,
        precio_venta,
        id_pedido,
        id_producto,
        id_movimiento
    ) VALUES (
        p_producto_solicitado,
        p_precio_unitario,
        p_precio_venta,
        p_id_pedido,
        p_id_producto,
        v_idmovimiento
    );

    -- 3. Actualiza el stock del producto
    UPDATE producto
    SET stock = stock - p_cantidad
    WHERE id_producto = p_id_producto;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_estado` (IN `p_proceso` VARCHAR(50), IN `p_entregado` TINYINT(1), IN `p_cancelado` TINYINT(1))   BEGIN
    INSERT INTO estadopedido (proceso, entregado, cancelado) VALUES (p_proceso, p_entregado, p_cancelado);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_movimiento` (IN `p_id_producto` INT, IN `p_entrada` INT, IN `p_salida` INT, IN `p_id_usuario` INT)   BEGIN
    INSERT INTO movimientoinventario (id_producto, entrada, salida, fecha_movimiento, cantidad, id_usuario)
    VALUES (p_id_producto, p_entrada, p_salida, NOW(), p_entrada - p_salida, p_id_usuario);
    UPDATE producto SET stock = stock + p_entrada - p_salida WHERE id_producto = p_id_producto;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_pedido` (IN `p_id_usuario` INT, IN `p_fecha_pedido` DATETIME, IN `p_fecha_entrega` DATETIME, IN `p_id_estado` INT)   BEGIN
    INSERT INTO pedido (id_usuario, fecha_pedido, fecha_entrega, id_estado)
    VALUES (p_id_usuario, p_fecha_pedido, p_fecha_entrega, p_id_estado);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_producto` (IN `p_nombre_producto` VARCHAR(255), IN `p_descripcion` TEXT, IN `p_precio` DECIMAL(10,2), IN `p_stock` INT, IN `p_id_proveedor` INT, IN `p_id_categoria` INT)   BEGIN
    INSERT INTO producto (nombre_producto, descripcion, precio, stock, id_proveedor, id_categoria)
    VALUES (p_nombre_producto, p_descripcion, p_precio, p_stock, p_id_proveedor, p_id_categoria);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_proveedor` (IN `p_descripcion` VARCHAR(100), IN `p_contacto` VARCHAR(100), IN `p_direccion` VARCHAR(150))   BEGIN
    INSERT INTO proveedor (descripcion_proveedor, forma_contacto, direccion)
    VALUES (p_descripcion, p_contacto, p_direccion);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_rol` (IN `p_descripcion` VARCHAR(100), IN `p_estado` VARCHAR(20))   BEGIN
    INSERT INTO rol (descripcion, estado) VALUES (p_descripcion, p_estado);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_usuario` (IN `p_nombre_usuario` VARCHAR(100), IN `p_correo` VARCHAR(100), IN `p_contrasena` VARCHAR(255), IN `p_telefono` VARCHAR(20), IN `p_id_rol` INT)   BEGIN
    INSERT INTO usuario (nombre_usuario, correo, contrasena, telefono, fecha_ingreso, ultimo_acceso, id_rol)
    VALUES (p_nombre_usuario, p_correo, p_contrasena, p_telefono, NOW(), NOW(), p_id_rol);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_categoria` (IN `p_id_categoria` INT)   BEGIN
    DELETE FROM categoriaproducto WHERE id_categoria = p_id_categoria;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_detalle_pedido` (IN `p_id_detalle` INT)   BEGIN
    DELETE FROM detallepedido WHERE id_detalle = p_id_detalle;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_estado` (IN `p_id_estado` INT)   BEGIN
    DELETE FROM estadopedido WHERE id_estado = p_id_estado;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_pedido` (IN `p_id_pedido` INT)   BEGIN
    DELETE FROM pedido WHERE id_pedido = p_id_pedido;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_producto` (IN `p_id_producto` INT)   BEGIN
    DELETE FROM producto WHERE id_producto = p_id_producto;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_proveedor` (IN `p_id` INT)   BEGIN
    DELETE FROM proveedor WHERE id_proveedor = p_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_rol` (IN `p_id_rol` INT)   BEGIN
    DELETE FROM rol WHERE id_rol = p_id_rol;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_usuario` (IN `p_id` INT)   BEGIN
    DELETE FROM usuario WHERE id_usuario = p_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_login_usuario` (IN `p_usuario` VARCHAR(100), IN `p_contrasena` VARCHAR(255))   BEGIN
    DECLARE v_id_usuario INT;

    -- Verificar si existe el usuario por correo o teléfono y contraseña
    SELECT id_usuario INTO v_id_usuario
    FROM usuario
    WHERE (correo = p_usuario OR telefono = p_usuario)
      AND contrasena = p_contrasena
    LIMIT 1;

    -- Si existe, actualizamos ultimo_acceso y devolvemos datos
    IF v_id_usuario IS NOT NULL THEN
        UPDATE usuario
        SET ultimo_acceso = NOW()
        WHERE id_usuario = v_id_usuario;

        SELECT id_usuario, nombre_usuario, id_rol
        FROM usuario
        WHERE id_usuario = v_id_usuario;
    ELSE
        SELECT 'ERROR' AS mensaje;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_modificar_estado_pedido` (IN `p_id` INT, IN `p_id_estado` INT)   BEGIN
    UPDATE pedido SET id_estado = p_id_estado WHERE id_pedido = p_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_modificar_producto` (IN `p_id` INT, IN `p_desc` VARCHAR(150), IN `p_id_prov` INT, IN `p_id_cat` INT, IN `p_stock` INT)   BEGIN
    UPDATE producto SET descripcion_producto = p_desc, id_proveedor = p_id_prov, id_categoria = p_id_cat, stock = p_stock
    WHERE id_producto = p_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_modificar_proveedor` (IN `p_id` INT, IN `p_descripcion` VARCHAR(100), IN `p_contacto` VARCHAR(100), IN `p_direccion` VARCHAR(150))   BEGIN
    UPDATE proveedor SET descripcion_proveedor = p_descripcion, forma_contacto = p_contacto, direccion = p_direccion
    WHERE id_proveedor = p_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_modificar_usuario` (IN `p_id_usuario` INT, IN `p_nombre_usuario` VARCHAR(100), IN `p_correo` VARCHAR(100), IN `p_contrasena` VARCHAR(255), IN `p_telefono` VARCHAR(20), IN `p_id_rol` INT)   BEGIN
    UPDATE usuario
    SET nombre_usuario = p_nombre_usuario,
        correo = p_correo,
        contrasena = p_contrasena,
        telefono = p_telefono,
        id_rol = p_id_rol
    WHERE id_usuario = p_id_usuario;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_categoria` (IN `p_id_categoria` INT)   BEGIN
    SELECT * FROM categoriaproducto WHERE id_categoria = p_id_categoria;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_detalle_pedido` (IN `p_id_detalle` INT)   BEGIN
    SELECT
        dp.*,
        p.nombre_producto,
        pe.fecha_pedido,
        pe.id_usuario,
        mi.salida AS cantidad_salida,
        mi.entrada AS cantidad_entrada,
        mi.fecha_movimiento
    FROM detallepedido dp
    JOIN producto p ON dp.id_producto = p.id_producto
    JOIN pedido pe ON dp.id_pedido = pe.id_pedido
    JOIN movimientoinventario mi ON dp.id_movimiento = mi.id_movimiento
    WHERE dp.id_detalle = p_id_detalle;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_estado` (IN `p_id_estado` INT)   BEGIN
    SELECT * FROM estadopedido WHERE id_estado = p_id_estado;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_pedido` (IN `p_id_pedido` INT)   BEGIN
    SELECT
        pe.*,
        u.nombre_usuario,
        e.proceso AS estado_proceso
    FROM pedido pe
    JOIN usuario u ON pe.id_usuario = u.id_usuario
    JOIN estadopedido e ON pe.id_estado = e.id_estado
    WHERE pe.id_pedido = p_id_pedido;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_producto` (IN `p_id_producto` INT)   BEGIN
    SELECT
        p.*,
        pr.descripcion_proveedor AS nombre_proveedor,
        c.descripcion AS nombre_categoria
    FROM producto p
    JOIN proveedor pr ON p.id_proveedor = pr.id_proveedor
    JOIN categoriaproducto c ON p.id_categoria = c.id_categoria
    WHERE p.id_producto = p_id_producto;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_proveedor` (IN `p_id_proveedor` INT)   BEGIN
    SELECT * FROM proveedor WHERE id_proveedor = p_id_proveedor;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_usuario` (IN `p_id_usuario` INT)   BEGIN
    SELECT
        u.*,
        r.descripcion AS nombre_rol
    FROM usuario u
    JOIN rol r ON u.id_rol = r.id_rol
    WHERE u.id_usuario = p_id_usuario;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categoriaproducto`
--

CREATE TABLE `categoriaproducto` (
  `id_categoria` int(11) NOT NULL,
  `descripcion` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categoriaproducto`
--

INSERT INTO `categoriaproducto` (`id_categoria`, `descripcion`) VALUES
(1, 'Material'),
(2, 'Producto Final');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detallepedido`
--

CREATE TABLE `detallepedido` (
  `id_detalle` int(11) NOT NULL,
  `producto_solicitado` varchar(100) DEFAULT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  `precio_venta` decimal(10,2) DEFAULT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `id_movimiento` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `detallepedido`
--

INSERT INTO `detallepedido` (`id_detalle`, `producto_solicitado`, `precio_unitario`, `precio_venta`, `id_pedido`, `id_producto`, `id_movimiento`) VALUES
(4, 'Camisa', 15.00, 200.00, 1, 1, NULL),
(5, 'Camisa', 15.00, 200.00, 1, 1, NULL),
(6, 'Camisa', 15.00, 200.00, 1, 1, NULL),
(7, 'Camisa', 15.00, 200.00, 1, 1, NULL),
(8, 'Camisa', 15.00, 200.00, 1, 1, 1);

--
-- Disparadores `detallepedido`
--
DELIMITER $$
CREATE TRIGGER `trg_detallepedido_delete` AFTER DELETE ON `detallepedido` FOR EACH ROW BEGIN
    INSERT INTO detallepedido_aud (id_detalle, id_pedido, id_producto, accion, usuario_accion)
    VALUES (OLD.id_detalle, OLD.id_pedido, OLD.id_producto, 'DELETE', 1);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detallepedido_aud`
--

CREATE TABLE `detallepedido_aud` (
  `id_aud` int(11) NOT NULL,
  `id_detalle` int(11) DEFAULT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp(),
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `usuario_accion` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estadopedido`
--

CREATE TABLE `estadopedido` (
  `id_estado` int(11) NOT NULL,
  `proceso` varchar(50) DEFAULT NULL,
  `entregado` tinyint(1) DEFAULT 0,
  `cancelado` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estadopedido`
--

INSERT INTO `estadopedido` (`id_estado`, `proceso`, `entregado`, `cancelado`) VALUES
(1, NULL, 1, 0),
(2, NULL, 0, 1),
(3, 'En Proceso', 0, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientoinventario`
--

CREATE TABLE `movimientoinventario` (
  `id_movimiento` int(11) NOT NULL,
  `entrada` int(11) DEFAULT 0,
  `salida` int(11) DEFAULT 0,
  `fecha_movimiento` date DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `movimientoinventario`
--

INSERT INTO `movimientoinventario` (`id_movimiento`, `entrada`, `salida`, `fecha_movimiento`, `cantidad`, `id_usuario`, `id_producto`) VALUES
(1, 0, 10, '2025-08-09', 10, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido`
--

CREATE TABLE `pedido` (
  `id_pedido` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `fecha_pedido` date DEFAULT NULL,
  `fecha_entrega` date DEFAULT NULL,
  `id_estado` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedido`
--

INSERT INTO `pedido` (`id_pedido`, `id_usuario`, `fecha_pedido`, `fecha_entrega`, `id_estado`) VALUES
(1, 1, '0000-00-00', '0000-00-00', 1);

--
-- Disparadores `pedido`
--
DELIMITER $$
CREATE TRIGGER `trg_pedido_delete` AFTER DELETE ON `pedido` FOR EACH ROW BEGIN
    INSERT INTO pedido_aud (id_pedido, id_usuario, id_estado, fecha_pedido, accion, usuario_accion)
    VALUES (OLD.id_pedido, OLD.id_usuario, OLD.id_estado, OLD.fecha_pedido, 'DELETE', 1);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_aud`
--

CREATE TABLE `pedido_aud` (
  `id_aud` int(11) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_estado` int(11) DEFAULT NULL,
  `fecha_pedido` datetime DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp(),
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `usuario_accion` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto`
--

CREATE TABLE `producto` (
  `id_producto` int(11) NOT NULL,
  `nombre_producto` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  `stock` int(11) DEFAULT 0,
  `id_proveedor` int(11) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `producto`
--

INSERT INTO `producto` (`id_producto`, `nombre_producto`, `descripcion`, `precio`, `stock`, `id_proveedor`, `id_categoria`) VALUES
(1, 'Camisa', 'Camisa Azu', 15.00, 10, 1, 2);

--
-- Disparadores `producto`
--
DELIMITER $$
CREATE TRIGGER `trg_producto_delete` AFTER DELETE ON `producto` FOR EACH ROW BEGIN
    INSERT INTO producto_aud (id_producto, descripcion_producto, id_proveedor, id_categoria, stock, accion, usuario_accion)
    VALUES (OLD.id_producto, OLD.descripcion, OLD.id_proveedor, OLD.id_categoria, OLD.stock, 'DELETE', 1);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_aud`
--

CREATE TABLE `producto_aud` (
  `id_aud` int(11) NOT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `descripcion_producto` varchar(150) DEFAULT NULL,
  `id_proveedor` int(11) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `stock` int(11) DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp(),
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `usuario_accion` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedor`
--

CREATE TABLE `proveedor` (
  `id_proveedor` int(11) NOT NULL,
  `descripcion_proveedor` varchar(100) DEFAULT NULL,
  `forma_contacto` varchar(100) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `proveedor`
--

INSERT INTO `proveedor` (`id_proveedor`, `descripcion_proveedor`, `forma_contacto`, `direccion`) VALUES
(1, 'Utiles de Honduras', 'utileshonduras@uh.com', 'Cascadas Mall');

--
-- Disparadores `proveedor`
--
DELIMITER $$
CREATE TRIGGER `trg_proveedor_delete` AFTER DELETE ON `proveedor` FOR EACH ROW BEGIN
    INSERT INTO proveedor_aud (id_proveedor, descripcion_proveedor, forma_contacto, direccion, accion, usuario_accion)
    VALUES (OLD.id_proveedor, OLD.descripcion_proveedor, OLD.forma_contacto, OLD.direccion, 'DELETE', 1);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedor_aud`
--

CREATE TABLE `proveedor_aud` (
  `id_aud` int(11) NOT NULL,
  `id_proveedor` int(11) DEFAULT NULL,
  `descripcion_proveedor` varchar(100) DEFAULT NULL,
  `forma_contacto` varchar(100) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp(),
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `usuario_accion` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registroconsulta`
--

CREATE TABLE `registroconsulta` (
  `id_consulta` int(11) NOT NULL,
  `tipo_consulta` varchar(50) DEFAULT NULL,
  `fecha_inicial` date DEFAULT NULL,
  `fecha_final` date DEFAULT NULL,
  `resultado_consulta` text DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `registroconsulta`
--

INSERT INTO `registroconsulta` (`id_consulta`, `tipo_consulta`, `fecha_inicial`, `fecha_final`, `resultado_consulta`, `id_usuario`) VALUES
(1, 'Estado de Ventas', '2025-08-09', '2025-08-10', 'Ventas Totales 200', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol`
--

CREATE TABLE `rol` (
  `id_rol` int(11) NOT NULL,
  `descripcion` varchar(100) NOT NULL,
  `estado` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `nombre_usuario` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `ultimo_acceso` datetime DEFAULT NULL,
  `id_rol` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nombre_usuario`, `correo`, `contrasena`, `telefono`, `fecha_ingreso`, `ultimo_acceso`, `id_rol`) VALUES
(1, 'Patrick', 'pat@gmail.com', 'prueba', '98989890', '2025-08-08', '2025-08-08 21:46:14', 1);

--
-- Disparadores `usuario`
--
DELIMITER $$
CREATE TRIGGER `trg_usuario_delete` AFTER DELETE ON `usuario` FOR EACH ROW BEGIN
    INSERT INTO usuario_aud (id_usuario, nombre, correo, id_rol, accion, usuario_accion)
    VALUES (OLD.id_usuario, OLD.nombre_usuario, OLD.correo, OLD.id_rol, 'DELETE', 1);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_aud`
--

CREATE TABLE `usuario_aud` (
  `id_aud` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `id_rol` int(11) DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp(),
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `usuario_accion` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categoriaproducto`
--
ALTER TABLE `categoriaproducto`
  ADD PRIMARY KEY (`id_categoria`);

--
-- Indices de la tabla `detallepedido`
--
ALTER TABLE `detallepedido`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_detalle_pedido` (`id_pedido`),
  ADD KEY `fk_detalle_producto` (`id_producto`),
  ADD KEY `fk_detalle_movimiento` (`id_movimiento`);

--
-- Indices de la tabla `detallepedido_aud`
--
ALTER TABLE `detallepedido_aud`
  ADD PRIMARY KEY (`id_aud`);

--
-- Indices de la tabla `estadopedido`
--
ALTER TABLE `estadopedido`
  ADD PRIMARY KEY (`id_estado`);

--
-- Indices de la tabla `movimientoinventario`
--
ALTER TABLE `movimientoinventario`
  ADD PRIMARY KEY (`id_movimiento`),
  ADD KEY `fk_movimiento_usuario` (`id_usuario`),
  ADD KEY `fk_movimiento_producto` (`id_producto`);

--
-- Indices de la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD PRIMARY KEY (`id_pedido`),
  ADD KEY `fk_pedido_usuario` (`id_usuario`),
  ADD KEY `fk_pedido_estado` (`id_estado`);

--
-- Indices de la tabla `pedido_aud`
--
ALTER TABLE `pedido_aud`
  ADD PRIMARY KEY (`id_aud`);

--
-- Indices de la tabla `producto`
--
ALTER TABLE `producto`
  ADD PRIMARY KEY (`id_producto`),
  ADD KEY `fk_producto_proveedor` (`id_proveedor`),
  ADD KEY `fk_producto_categoria` (`id_categoria`);

--
-- Indices de la tabla `producto_aud`
--
ALTER TABLE `producto_aud`
  ADD PRIMARY KEY (`id_aud`);

--
-- Indices de la tabla `proveedor`
--
ALTER TABLE `proveedor`
  ADD PRIMARY KEY (`id_proveedor`);

--
-- Indices de la tabla `proveedor_aud`
--
ALTER TABLE `proveedor_aud`
  ADD PRIMARY KEY (`id_aud`);

--
-- Indices de la tabla `registroconsulta`
--
ALTER TABLE `registroconsulta`
  ADD PRIMARY KEY (`id_consulta`),
  ADD KEY `fk_registroconsulta_usuario` (`id_usuario`);

--
-- Indices de la tabla `rol`
--
ALTER TABLE `rol`
  ADD PRIMARY KEY (`id_rol`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `uk_usuario_correo` (`correo`),
  ADD KEY `fk_usuario_rol` (`id_rol`);

--
-- Indices de la tabla `usuario_aud`
--
ALTER TABLE `usuario_aud`
  ADD PRIMARY KEY (`id_aud`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categoriaproducto`
--
ALTER TABLE `categoriaproducto`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `detallepedido`
--
ALTER TABLE `detallepedido`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `detallepedido_aud`
--
ALTER TABLE `detallepedido_aud`
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `estadopedido`
--
ALTER TABLE `estadopedido`
  MODIFY `id_estado` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `movimientoinventario`
--
ALTER TABLE `movimientoinventario`
  MODIFY `id_movimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `pedido`
--
ALTER TABLE `pedido`
  MODIFY `id_pedido` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `pedido_aud`
--
ALTER TABLE `pedido_aud`
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `producto`
--
ALTER TABLE `producto`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `producto_aud`
--
ALTER TABLE `producto_aud`
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proveedor`
--
ALTER TABLE `proveedor`
  MODIFY `id_proveedor` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `proveedor_aud`
--
ALTER TABLE `proveedor_aud`
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `registroconsulta`
--
ALTER TABLE `registroconsulta`
  MODIFY `id_consulta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `rol`
--
ALTER TABLE `rol`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `usuario_aud`
--
ALTER TABLE `usuario_aud`
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

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
  ADD CONSTRAINT `fk_pedido_estado` FOREIGN KEY (`id_estado`) REFERENCES `estadopedido` (`id_estado`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pedido_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `producto`
--
ALTER TABLE `producto`
  ADD CONSTRAINT `fk_producto_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categoriaproducto` (`id_categoria`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_producto_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedor` (`id_proveedor`) ON DELETE SET NULL ON UPDATE CASCADE;

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
