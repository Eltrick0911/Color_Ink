-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 03-10-2025 a las 04:35:49
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

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_categoria` (IN `p_id_categoria` INT, IN `p_descripcion` VARCHAR(100))   BEGIN
    UPDATE categoriaproducto SET descripcion = p_descripcion WHERE id_categoria = p_id_categoria;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_detalle_pedido` (IN `p_id_detalle` INT, IN `p_producto_solicitado` VARCHAR(255), IN `p_cantidad_nueva` INT, IN `p_precio_unitario_nuevo` DECIMAL(10,2), IN `p_descuento_nuevo` DECIMAL(10,2), IN `p_impuesto_nuevo` DECIMAL(10,2), IN `p_id_usuario` INT)   BEGIN
    DECLARE v_old_cantidad INT;
    DECLARE v_id_producto INT;
    DECLARE v_id_movimiento INT;
    DECLARE v_stock_actual INT;
    DECLARE v_diferencia_stock INT;
    DECLARE v_total_bruto DECIMAL(12,2);
    DECLARE v_total_neto DECIMAL(12,2);
    
    -- 1. Iniciar Transacción para garantizar atomicidad
    START TRANSACTION;
    
    -- 2. Obtener datos antiguos (cantidad, producto, movimiento) y bloquear la fila (FOR UPDATE)
    SELECT 
        dp.cantidad, dp.id_producto, dp.id_movimiento
    INTO 
        v_old_cantidad, v_id_producto, v_id_movimiento
    FROM detallepedido dp
    WHERE dp.id_detalle = p_id_detalle FOR UPDATE;

    -- 3. Obtener stock actual del producto
    SELECT stock INTO v_stock_actual 
    FROM producto 
    WHERE id_producto = v_id_producto;

    -- 4. Calcular la diferencia de stock
    -- Diferencia = Cantidad Nueva - Cantidad Antigua. Si es +5, se sacan 5 más. Si es -5, se devuelven 5 al stock.
    SET v_diferencia_stock = p_cantidad_nueva - v_old_cantidad;
    
    -- 5. Validar Stock: Asegurarse de que el nuevo stock no sea negativo
    IF (v_stock_actual - v_diferencia_stock) < 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente: La nueva cantidad solicitada causaría inventario negativo.';
    ELSE
        -- 6. Recálculo de Totales
        SET v_total_bruto = p_cantidad_nueva * p_precio_unitario_nuevo; 
        SET v_total_neto = (v_total_bruto - p_descuento_nuevo) * (1 + p_impuesto_nuevo);

        -- 7. Establecer el usuario para auditoría (Será capturado por el trigger AFTER UPDATE)
        SET @usuario_id = p_id_usuario;

        -- 8. Actualizar el Detalle del Pedido
        UPDATE detallepedido
        SET 
            producto_solicitado = p_producto_solicitado,
            cantidad = p_cantidad_nueva,
            precio_unitario = p_precio_unitario_nuevo,
            descuento = p_descuento_nuevo,
            impuesto = p_impuesto_nuevo,
            total_linea = v_total_neto
        WHERE id_detalle = p_id_detalle;

        -- 9. Actualizar el Movimiento de Inventario asociado (Kardex)
        UPDATE movimientoinventario
        SET 
            cantidad = p_cantidad_nueva,
            id_usuario = p_id_usuario 
        WHERE id_movimiento = v_id_movimiento;

        -- 10. Actualizar el Stock del Producto
        -- Se resta la diferencia (ej: si la diferencia es +3, se resta 3 del stock; si es -3, se suma 3 al stock).
        UPDATE producto
        SET stock = stock - v_diferencia_stock 
        WHERE id_producto = v_id_producto;
        
        -- 11. Finalizar Transacción
        COMMIT;
    END IF;
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_estado` (IN `p_id_estado` INT, IN `p_codigo` VARCHAR(10), IN `p_nombre` VARCHAR(50), IN `p_es_final` TINYINT(1), IN `p_orden` INT)   BEGIN
    UPDATE cat_estado_pedido 
    SET 
        codigo = p_codigo, 
        nombre = p_nombre, 
        es_final = p_es_final, 
        orden = p_orden 
    WHERE 
        id_estado = p_id_estado;
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_alerta_stock_minimo` ()   BEGIN
    -- 1. Eliminar alertas antiguas que ya fueron atendidas para no duplicar datos
    DELETE FROM alerta_stock 
    WHERE atendida = 1;

    -- 2. Insertar nuevos registros de productos con stock bajo
    INSERT INTO alerta_stock (
        id_producto, 
        stock_actual, 
        stock_minimo_establecido, 
        mensaje, 
        fecha_alerta
    )
    SELECT 
        p.id_producto, 
        p.stock, 
        p.stock_minimo, 
        CONCAT('Stock crítico: ', p.nombre_producto, ' (', p.stock, ' unidades).'),
        NOW()
    FROM 
        producto p
    WHERE 
        p.stock < p.stock_minimo
        -- Evita duplicar alertas para el mismo producto que aún no ha sido atendido
        AND p.id_producto NOT IN (
            SELECT id_producto 
            FROM alerta_stock 
            WHERE atendida = 0
        );

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cambiar_estado_pedido` (IN `p_id_pedido` INT, IN `p_id_estado_nuevo` INT, IN `p_id_usuario` INT)   BEGIN
    DECLARE v_es_final TINYINT(1);
    
    -- 1. Obtener la bandera 'es_final' del nuevo estado
    SELECT es_final INTO v_es_final 
    FROM cat_estado_pedido 
    WHERE id_estado = p_id_estado_nuevo;
    
    -- ** [PENDIENTE DE IMPLEMENTAR: LÓGICA DE TRANSICIÓN] **
    -- Aquí iría la lógica para validar si el estado actual puede transicionar al p_id_estado_nuevo
    -- (si implementas una tabla de transiciones como `estado_transicion_pedido`).

    -- 2. Establecer el usuario de auditoría para el trigger
    SET @usuario_id = p_id_usuario;
    
    -- 3. Actualizar el estado y, si es final, registrar la fecha de finalización
    UPDATE pedido 
    SET 
        id_estado = p_id_estado_nuevo,
        -- Si el nuevo estado es 'final' (Entregado/Cancelado), se registra la fecha
        fecha_entrega = IF(v_es_final = 1, CURDATE(), fecha_entrega) 
    WHERE 
        id_pedido = p_id_pedido 
        AND id_estado != p_id_estado_nuevo; -- Optimización: solo actualiza si hay cambio de estado
        
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_categoria` (IN `p_descripcion` VARCHAR(100))   BEGIN
    INSERT INTO categoriaproducto (descripcion) VALUES (p_descripcion);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_detalle_pedido` (IN `p_producto_solicitado` VARCHAR(255), IN `p_precio_unitario` DECIMAL(10,2), IN `p_descuento` DECIMAL(10,2), IN `p_impuesto` DECIMAL(10,2), IN `p_id_pedido` INT, IN `p_id_producto` INT, IN `p_cantidad` INT, IN `p_id_usuario` INT)   BEGIN
    DECLARE v_idmovimiento INT;
    DECLARE v_total_bruto DECIMAL(12,2);
    DECLARE v_total_neto DECIMAL(12,2);
    DECLARE v_stock_actual INT;
    DECLARE v_nueva_cantidad INT;

    -- 1. VALIDACIÓN DE STOCK
    SELECT stock INTO v_stock_actual FROM producto WHERE id_producto = p_id_producto;
    SET v_nueva_cantidad = v_stock_actual - p_cantidad;

    IF v_nueva_cantidad < 0 THEN
        -- Evitar stock negativo en SALIDA
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente para crear el detalle del pedido.';
    ELSE
        -- 2. Cálculo del total de la línea
        SET v_total_bruto = p_cantidad * p_precio_unitario; 
        SET v_total_neto = (v_total_bruto - p_descuento) * (1 + p_impuesto);

        -- 3. Inserta el movimiento de inventario (USANDO NUEVA ESTRUCTURA)
        INSERT INTO movimientoinventario (
            id_producto, 
            tipo_movimiento, 
            origen, 
            id_origen, 
            fecha_movimiento, 
            cantidad, 
            id_usuario
        ) VALUES (
            p_id_producto, 
            'SALIDA', 
            'PEDIDO', 
            p_id_pedido, -- Se enlaza directamente al ID del pedido
            NOW(), 
            p_cantidad, -- Cantidad positiva, el tipo_movimiento define la acción
            p_id_usuario
        );

        SET v_idmovimiento = LAST_INSERT_ID();

        -- 4. Inserta el detalle del pedido (Sin cambios, solo para referencia)
        INSERT INTO detallepedido (
            producto_solicitado, precio_unitario, descuento, impuesto, total_linea,
            id_pedido, id_producto, cantidad, id_movimiento
        ) VALUES (
            p_producto_solicitado, p_precio_unitario, p_descuento, p_impuesto, v_total_neto,
            p_id_pedido, p_id_producto, p_cantidad, v_idmovimiento
        );

        -- 5. Actualiza el stock del producto
        UPDATE producto
        SET stock = v_nueva_cantidad
        WHERE id_producto = p_id_producto;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_estado` (IN `p_proceso` VARCHAR(50), IN `p_entregado` TINYINT(1), IN `p_cancelado` TINYINT(1))   BEGIN
    INSERT INTO estadopedido (proceso, entregado, cancelado) VALUES (p_proceso, p_entregado, p_cancelado);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_movimiento` (IN `p_id_producto` INT, IN `p_cantidad` INT, IN `p_tipo_movimiento` ENUM('ENTRADA','AJUSTE','TRANSFERENCIA'), IN `p_origen` ENUM('COMPRA','AJUSTE','TRANSFERENCIA'), IN `p_id_origen` INT, IN `p_id_usuario` INT)   BEGIN
    
    -- 1. Inserta el movimiento de inventario
    INSERT INTO movimientoinventario (
        id_producto, 
        tipo_movimiento, 
        origen, 
        id_origen, 
        fecha_movimiento, 
        cantidad, 
        id_usuario
    ) VALUES (
        p_id_producto, 
        p_tipo_movimiento, 
        p_origen, 
        p_id_origen,
        NOW(), 
        p_cantidad, 
        p_id_usuario
    );

    -- 2. Actualiza el stock del producto
    -- Esta lógica aplica tanto para ENTRADA (suma) como para AJUSTE positivo.
    -- Para SALIDA, el proceso es diferente (se usa sp_crear_detalle_pedido).
    UPDATE producto
    SET stock = stock + p_cantidad
    WHERE id_producto = p_id_producto;
    
    SELECT LAST_INSERT_ID() AS id_movimiento;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_pedido` (IN `p_numero_pedido` VARCHAR(50), IN `p_fecha_compromiso` DATE, IN `p_observaciones` TEXT, IN `p_id_estado_inicial` INT, IN `p_id_usuario` INT)   BEGIN
    DECLARE v_id_pedido INT;
    
    -- 1. Insertar Cabecera del Pedido
    INSERT INTO pedido (
        numero_pedido, 
        id_usuario, 
        fecha_pedido,        -- Se usa la fecha actual (NOW())
        fecha_compromiso, 
        observaciones, 
        id_estado
    ) VALUES (
        p_numero_pedido, 
        p_id_usuario, 
        NOW(), 
        p_fecha_compromiso, 
        p_observaciones, 
        p_id_estado_inicial
    );
    
    SET v_id_pedido = LAST_INSERT_ID();

    -- 2. Devolver el ID del pedido recién creado
    SELECT v_id_pedido AS id_pedido_creado;
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_producto` (IN `p_id_categoria` INT, IN `p_id_proveedor` INT, IN `p_sku` VARCHAR(50), IN `p_nombre_producto` VARCHAR(255), IN `p_activo` TINYINT(1), IN `p_stock` INT, IN `p_stock_minimo` INT, IN `p_costo_unitario` DECIMAL(12,2), IN `p_precio_venta_base` DECIMAL(12,2), IN `p_fecha_registro` DATETIME)   BEGIN
    INSERT INTO producto (
        id_categoria, id_proveedor, sku, nombre_producto, activo, stock, stock_minimo, 
        costo_unitario, precio_venta_base, fecha_registro
    )
    VALUES (
        p_id_categoria, p_id_proveedor, p_sku, p_nombre_producto, p_activo, p_stock, 
        p_stock_minimo, p_costo_unitario, p_precio_venta_base, p_fecha_registro
    );
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_proveedor` (IN `p_descripcion` VARCHAR(100), IN `p_contacto` VARCHAR(100), IN `p_direccion` VARCHAR(150))   BEGIN
    INSERT INTO proveedor (descripcion_proveedor, forma_contacto, direccion)
    VALUES (p_descripcion, p_contacto, p_direccion);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_rol` (IN `p_descripcion` VARCHAR(100), IN `p_estado` VARCHAR(20))   BEGIN
    INSERT INTO rol (descripcion, estado) VALUES (p_descripcion, p_estado);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_usuario` (IN `p_nombre_usuario` VARCHAR(100), IN `p_correo` VARCHAR(100), IN `p_contrasena` VARCHAR(255), IN `p_telefono` VARCHAR(20), IN `p_id_rol` INT)   BEGIN
    INSERT INTO usuario (
        nombre_usuario, 
        correo, 
        contrasena, 
        password_updated_at, -- Nuevo campo
        telefono, 
        fecha_ingreso, 
        ultimo_acceso, 
        id_rol -- Campo de rol original (1:N)
    )
    VALUES (
        p_nombre_usuario, 
        p_correo, 
        p_contrasena, 
        NOW(), -- Se establece la fecha de creación/actualización de la contraseña
        p_telefono, 
        NOW(), 
        NOW(), 
        p_id_rol
    );
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

    -- Intentamos encontrar un usuario que no esté bloqueado y coincida con el usuario/teléfono
    SELECT id_usuario INTO v_id_usuario
    FROM usuario
    WHERE (correo = p_usuario OR telefono = p_usuario)
      AND contrasena = p_contrasena 
      AND (bloqueado_hasta IS NULL OR bloqueado_hasta < NOW())
    LIMIT 1;

    IF v_id_usuario IS NOT NULL THEN
        -- Login Exitoso
        UPDATE usuario
        SET 
            ultimo_acceso = NOW(), 
            intentos_fallidos = 0 -- Resetea intentos fallidos
        WHERE id_usuario = v_id_usuario;

        SELECT id_usuario, nombre_usuario, id_rol
        FROM usuario
        WHERE id_usuario = v_id_usuario;
    ELSE
        -- Login Fallido: Incrementa intentos y potencialmente bloquea.
        UPDATE usuario
        SET 
            intentos_fallidos = intentos_fallidos + 1,
            -- Bloquea por 2 minutos si los intentos fallidos superan un umbral (ej. 5)
            bloqueado_hasta = IF(intentos_fallidos + 1 >= 5, DATE_ADD(NOW(), INTERVAL 2 MINUTE), bloqueado_hasta) 
        WHERE (correo = p_usuario OR telefono = p_usuario);

        SELECT 'ERROR' AS mensaje;
    END IF;
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
-- Estructura de tabla para la tabla `alerta_stock`
--

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

CREATE TABLE IF NOT EXISTS `categoriaproducto` (
  `id_categoria` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `idx_categoria_descripcion` (`descripcion`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cat_estado_pedido`
--

CREATE TABLE IF NOT EXISTS `cat_estado_pedido` (
  `id_estado` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `es_final` tinyint(1) DEFAULT 0 COMMENT '1 si es un estado final (Entregado o Cancelado), 0 en caso contrario',
  `orden` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_estado`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detallepedido`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `detallepedido`
--
DELIMITER $$
CREATE TRIGGER `tr_detallepedido_after_delete` AFTER DELETE ON `detallepedido` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1); -- MODIFICADO
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
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_detallepedido_after_insert` AFTER INSERT ON `detallepedido` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1); -- MODIFICADO
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
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_detallepedido_after_update` AFTER UPDATE ON `detallepedido` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1); -- MODIFICADO
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
END
$$
DELIMITER ;
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

CREATE TABLE IF NOT EXISTS `detallepedido_aud` (
  `id_aud` int(11) NOT NULL AUTO_INCREMENT,
  `id_detalle` int(11) DEFAULT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp(),
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `usuario_accion` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_aud`),
  KEY `fk_aud_usuario_accion_detallepedido` (`usuario_accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientoinventario`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `pedido`
--
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_delete` AFTER DELETE ON `pedido` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 0;
    SET v_usuario_accion = IFNULL(@usuario_id, 0); 
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
            -- Campo de total ELIMINADO
            'id_estado', OLD.id_estado, 
            'id_usuario', OLD.id_usuario
        )
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_insert` AFTER INSERT ON `pedido` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 0;
    SET v_usuario_accion = IFNULL(@usuario_id, 0); 
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
            -- Campo de total ELIMINADO
            'id_estado', NEW.id_estado, 
            'id_usuario', NEW.id_usuario
        )
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_update` AFTER UPDATE ON `pedido` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 0;
    SET v_usuario_accion = IFNULL(@usuario_id, 0); 
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
            -- Campo de total ELIMINADO
            'id_estado', OLD.id_estado, 
            'id_usuario', OLD.id_usuario
        ),
        JSON_OBJECT(
            'id_pedido', NEW.id_pedido, 
            'numero_pedido', NEW.numero_pedido, 
            'fecha_pedido', NEW.fecha_pedido,
            'fecha_compromiso', NEW.fecha_compromiso, 
            'observaciones', NEW.observaciones, 
            -- Campo de total ELIMINADO
            'id_estado', NEW.id_estado, 
            'id_usuario', NEW.id_usuario
        )
    );
END
$$
DELIMITER ;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto`
--

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
DELIMITER $$
CREATE TRIGGER `tr_producto_after_delete` AFTER DELETE ON `producto` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1); -- MODIFICADO
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
DELIMITER $$
CREATE TRIGGER `tr_producto_after_insert` AFTER INSERT ON `producto` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1); -- MODIFICADO
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
DELIMITER $$
CREATE TRIGGER `tr_producto_after_update` AFTER UPDATE ON `producto` FOR EACH ROW BEGIN
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1); -- MODIFICADO
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

CREATE TABLE IF NOT EXISTS `rol` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) NOT NULL,
  `estado` varchar(20) NOT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Filtros para la tabla `detallepedido_aud`
--
ALTER TABLE `detallepedido_aud`
  ADD CONSTRAINT `fk_aud_usuario_accion_detallepedido` FOREIGN KEY (`usuario_accion`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE;

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

DELIMITER $$
--
-- Eventos
--
CREATE DEFINER=`root`@`localhost` EVENT `evt_alerta_stock_minimo` ON SCHEDULE EVERY 1 DAY STARTS '2025-09-28 00:00:00' ON COMPLETION NOT PRESERVE ENABLE DO CALL sp_alerta_stock_minimo()$$

CREATE DEFINER=`root`@`localhost` EVENT `evt_purgado_auditoria` ON SCHEDULE EVERY 1 MONTH STARTS '2025-10-01 01:00:00' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    CALL sp_purgar_auditoria();
END$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;