-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
<<<<<<<< HEAD:src/DB/color_ink .sql
-- Tiempo de generación: 21-10-2025 a las 11:01:21
========
-- Tiempo de generación: 24-10-2025 a las 02:01:52
>>>>>>>> main:src/DB/color_ink (19).sql
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

<<<<<<<< HEAD:src/DB/color_ink .sql
--
-- Base de datos: `color_ink`
--
========
CREATE DATABASE IF NOT EXISTS `color_ink` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `color_ink`;
>>>>>>>> main:src/DB/color_ink (19).sql

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `insertar_cliente_usuario` (IN `p_nombre_usuario` VARCHAR(100), IN `p_telefono` VARCHAR(20))   BEGIN
    INSERT INTO usuario (
        nombre_usuario, correo, contrasena, telefono, fecha_ingreso, id_rol
    ) VALUES (
        p_nombre_usuario, NULL, NULL, p_telefono, CURDATE(), 3 -- Asumiendo id_rol 3 es Cliente
    );
END$$

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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_usuario` (IN `p_id_usuario` INT, IN `p_nombre_usuario` VARCHAR(100), IN `p_correo` VARCHAR(100), IN `p_contrasena` VARCHAR(255), IN `p_telefono` VARCHAR(20), IN `p_id_rol` INT, IN `p_actualizar_password` TINYINT(1))   BEGIN
    -- Validar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario no existe';
    END IF;

    -- Validar que el correo no esté duplicado (excepto para el usuario actual)
    IF EXISTS (SELECT 1 FROM usuario WHERE correo = p_correo AND id_usuario != p_id_usuario) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El correo ya está registrado por otro usuario';
    END IF;

    -- Validar que el rol existe
    IF NOT EXISTS (SELECT 1 FROM rol WHERE id_rol = p_id_rol) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rol especificado no existe';
    END IF;

    -- Actualizar usuario
    IF p_actualizar_password = 1 THEN
        -- Actualizar incluyendo la contraseña
        UPDATE usuario 
        SET 
            nombre_usuario = p_nombre_usuario,
            correo = p_correo,
            contrasena = p_contrasena,
            password_updated_at = NOW(),
            telefono = p_telefono,
            id_rol = p_id_rol,
            intentos_fallidos = 0, -- Resetear intentos fallidos al actualizar
            bloqueado_hasta = NULL -- Desbloquear usuario al actualizar
        WHERE id_usuario = p_id_usuario;
    ELSE
        -- Actualizar sin cambiar la contraseña
        UPDATE usuario 
        SET 
            nombre_usuario = p_nombre_usuario,
            correo = p_correo,
            telefono = p_telefono,
            id_rol = p_id_rol
        WHERE id_usuario = p_id_usuario;
    END IF;

    -- Devolver confirmación
    SELECT 'Usuario actualizado correctamente' AS mensaje, p_id_usuario AS id_usuario;
END$$

<<<<<<<< HEAD:src/DB/color_ink .sql
========
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_agregar_lista_negra` (IN `p_email` VARCHAR(100), IN `p_eliminado_por` INT, IN `p_razon` TEXT)   BEGIN
    DECLARE v_existe INT DEFAULT 0;
    
    -- Verificar si el email ya existe
    SELECT COUNT(*) INTO v_existe FROM usuarios_eliminados WHERE email = p_email;
    
    IF v_existe = 0 THEN
        -- Agregar a lista negra
        INSERT INTO usuarios_eliminados (email, eliminado_por, razon) 
        VALUES (p_email, p_eliminado_por, p_razon);
        
        SELECT 'Usuario agregado a lista negra' AS mensaje;
    ELSE
        -- Actualizar razón si ya existe
        UPDATE usuarios_eliminados 
        SET razon = p_razon, eliminado_por = p_eliminado_por, fecha_eliminacion = NOW()
        WHERE email = p_email;
        
        SELECT 'Usuario actualizado en lista negra' AS mensaje;
    END IF;
END$$

>>>>>>>> main:src/DB/color_ink (19).sql
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_pedido` (IN `p_numero_pedido` VARCHAR(50), IN `p_fecha_entrega` DATE, IN `p_observaciones` TEXT, IN `p_id_estado_inicial` INT, IN `p_id_usuario` INT)   BEGIN
    DECLARE v_id_pedido INT;
    
    -- 1. Insertar Cabecera del Pedido
    INSERT INTO pedido (
        numero_pedido, 
        id_usuario, 
        fecha_pedido,
        fecha_entrega,  -- Cambiado de fecha_compromiso
        observaciones, 
        id_estado
    ) VALUES (
        p_numero_pedido, 
        p_id_usuario, 
        NOW(), 
        p_fecha_entrega,  -- Cambiado
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_venta` (IN `p_id_pedido` INT, IN `p_id_usuario` INT, IN `p_monto_cobrado` DECIMAL(12,2), IN `p_metodo_pago` VARCHAR(50), IN `p_nota` TEXT)   BEGIN
  DECLARE v_costo_total DECIMAL(12,2) DEFAULT 0.00;
  DECLARE v_estado_pedido VARCHAR(50);

  -- 1. Verificar el estado del pedido
  SELECT ep.nombre INTO v_estado_pedido
  FROM pedido p
  JOIN cat_estado_pedido ep ON p.id_estado = ep.id_estado
  WHERE p.id_pedido = p_id_pedido;

  IF v_estado_pedido <> 'Entregado' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El pedido no está en estado ENTREGADO para ser cerrado en VENTA.';
  END IF;

  -- 2. Calcular costo total (usando el costo unitario actual del producto)
  SELECT 
    SUM(p.costo_unitario * dp.cantidad) INTO v_costo_total
  FROM detallepedido dp
  JOIN producto p ON dp.id_producto = p.id_producto
  WHERE dp.id_pedido = p_id_pedido;

  -- 3. Inserción de la Venta
  INSERT INTO venta (
    id_pedido, id_usuario, monto_cobrado, costo_total, metodo_pago, nota
  ) VALUES (
    p_id_pedido, p_id_usuario, p_monto_cobrado, v_costo_total, p_metodo_pago, p_nota
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

    SELECT id_usuario INTO v_id_usuario 
    FROM usuario 
    WHERE (correo = p_usuario OR telefono = p_usuario) 
      AND contrasena = p_contrasena 
      AND (bloqueado_hasta IS NULL OR bloqueado_hasta < NOW()) 
    LIMIT 1; 

    IF v_id_usuario IS NOT NULL THEN 
        -- Login Exitoso 
        UPDATE usuario 
        SET ultimo_acceso = NOW(), 
            intentos_fallidos = 0
        WHERE id_usuario = v_id_usuario; 
        
        SELECT id_usuario, nombre_usuario, id_rol FROM usuario WHERE id_usuario = v_id_usuario; 
    ELSE 
        -- Login Fallido: Incrementa intentos y potencialmente bloquea (a los 5 intentos, 30 min)
        UPDATE usuario 
        SET intentos_fallidos = intentos_fallidos + 1, 
            bloqueado_hasta = IF(intentos_fallidos >= 5, DATE_ADD(NOW(), INTERVAL 30 MINUTE), NULL) 
        WHERE correo = p_usuario OR telefono = p_usuario; 

        SELECT NULL AS id_usuario, 'Credenciales inválidas o usuario bloqueado' AS nombre_usuario, NULL AS id_rol;
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_lista_negra` ()   BEGIN
    SELECT 
        id,
        email,
        fecha_eliminacion,
        eliminado_por,
        razon
    FROM usuarios_eliminados 
    ORDER BY fecha_eliminacion DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_pedido` (IN `p_id_pedido` INT)   BEGIN
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_purgar_auditoria` ()   BEGIN
    -- Eliminar registros de auditoría más antiguos de 6 meses
    DELETE FROM usuario_aud WHERE fecha_accion < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    DELETE FROM producto_aud WHERE fecha_accion < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    DELETE FROM pedido_aud WHERE fecha_accion < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    DELETE FROM venta_aud WHERE fecha_accion < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    DELETE FROM detallepedido_aud WHERE fecha_accion < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    DELETE FROM proveedor_aud WHERE fecha_accion < DATE_SUB(NOW(), INTERVAL 6 MONTH);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_remover_lista_negra` (IN `p_email` VARCHAR(100))   BEGIN
    DECLARE v_afectadas INT DEFAULT 0;
    
    -- Remover de lista negra
    DELETE FROM usuarios_eliminados WHERE email = p_email;
    
    -- Obtener filas afectadas
    SET v_afectadas = ROW_COUNT();
    
    IF v_afectadas > 0 THEN
        SELECT 'Usuario removido de lista negra' AS mensaje;
    ELSE
        SELECT 'Usuario no encontrado en lista negra' AS mensaje;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_verificar_lista_negra` (IN `p_email` VARCHAR(100))   BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_razon TEXT;
    
    -- Verificar si existe en lista negra
    SELECT COUNT(*), COALESCE(razon, '') INTO v_existe, v_razon 
    FROM usuarios_eliminados 
    WHERE email = p_email;
    
    IF v_existe > 0 THEN
        SELECT 1 AS en_lista_negra, v_razon AS razon;
    ELSE
        SELECT 0 AS en_lista_negra, '' AS razon;
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alerta_stock`
--

CREATE TABLE `alerta_stock` (
  `id_alerta` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `stock_actual` int(11) NOT NULL,
  `stock_minimo_establecido` int(11) NOT NULL,
  `mensaje` varchar(255) NOT NULL,
  `fecha_alerta` datetime NOT NULL,
  `atendida` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0=Pendiente, 1=Atendida/Revisada'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Estructura de tabla para la tabla `cat_estado_pedido`
--

CREATE TABLE `cat_estado_pedido` (
  `id_estado` int(11) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `es_final` tinyint(1) DEFAULT 0 COMMENT '1 si es un estado final (Entregado o Cancelado), 0 en caso contrario',
  `orden` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

CREATE TABLE `detallepedido` (
  `id_detalle` int(11) NOT NULL,
  `producto_solicitado` varchar(100) DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `descuento` decimal(10,2) DEFAULT 0.00,
  `impuesto` decimal(10,2) DEFAULT 0.00,
  `total_linea` decimal(12,2) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
<<<<<<<< HEAD:src/DB/color_ink .sql
  `id_movimiento` int(11) DEFAULT NULL,
  `detalles_personalizados` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detalles_personalizados`))
========
  `id_movimiento` int(11) DEFAULT NULL
>>>>>>>> main:src/DB/color_ink (19).sql
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `detallepedido`
--

<<<<<<<< HEAD:src/DB/color_ink .sql
INSERT INTO `detallepedido` (`id_detalle`, `producto_solicitado`, `cantidad`, `precio_unitario`, `descuento`, `impuesto`, `total_linea`, `id_pedido`, `id_producto`, `id_movimiento`, `detalles_personalizados`) VALUES
(4, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, NULL, NULL),
(5, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, NULL, NULL),
(6, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, NULL, NULL),
(7, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, NULL, NULL),
(8, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, 1, NULL),
(10, 'Camisa', 1, 20.00, 0.00, 0.00, 40.00, 1, 1, 3, NULL),
(26, 'Camisa', 1, 20.00, 0.00, 5.00, 21.00, 2, 1, NULL, NULL),
(27, 'Tinta Negra', 1, 250.00, 0.00, 16.00, 290.00, 3, 1, NULL, NULL);
========
INSERT INTO `detallepedido` (`id_detalle`, `producto_solicitado`, `cantidad`, `precio_unitario`, `descuento`, `impuesto`, `total_linea`, `id_pedido`, `id_producto`, `id_movimiento`) VALUES
(4, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, NULL),
(5, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, NULL),
(6, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, NULL),
(7, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, NULL),
(8, 'Camisa', 1, 15.00, 0.00, 0.00, 0.00, 1, 1, 1),
(10, 'Camisa', 1, 20.00, 0.00, 0.00, 40.00, 1, 1, 3),
(26, 'Camisa', 1, 20.00, 0.00, 5.00, 21.00, 2, 1, NULL),
(27, 'Tinta Negra', 1, 250.00, 0.00, 16.00, 290.00, 3, 1, NULL);
>>>>>>>> main:src/DB/color_ink (19).sql

--
-- Disparadores `detallepedido`
--
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

CREATE TABLE `detallepedido_aud` (
  `id_aud` int(11) NOT NULL,
  `id_detalle` int(11) NOT NULL,
  `accion` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `fecha_accion` datetime NOT NULL DEFAULT current_timestamp(),
  `usuario_accion` int(11) NOT NULL DEFAULT 1,
  `json_antes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_antes`)),
  `json_despues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_despues`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `detallepedido_aud`
--

INSERT INTO `detallepedido_aud` (`id_aud`, `id_detalle`, `accion`, `fecha_accion`, `usuario_accion`, `json_antes`, `json_despues`) VALUES
(1, 26, 'INSERT', '2025-10-14 11:11:38', 1, NULL, '{\"id_detalle\": 26, \"producto_solicitado\": \"Camisa\", \"cantidad\": 1, \"precio_unitario\": 20.00, \"descuento\": 0.00, \"impuesto\": 5.00, \"total_linea\": 21.00, \"id_pedido\": 2, \"id_producto\": 1, \"id_movimiento\": null}'),
(2, 27, 'INSERT', '2025-10-14 11:15:26', 1, NULL, '{\"id_detalle\": 27, \"producto_solicitado\": \"Tinta Negra\", \"cantidad\": 1, \"precio_unitario\": 250.00, \"descuento\": 0.00, \"impuesto\": 16.00, \"total_linea\": 290.00, \"id_pedido\": 3, \"id_producto\": 1, \"id_movimiento\": null}');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientoinventario`
--

CREATE TABLE `movimientoinventario` (
  `id_movimiento` int(11) NOT NULL,
  `tipo_movimiento` enum('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  `origen` enum('PEDIDO','COMPRA','AJUSTE','TRANSFERENCIA') NOT NULL,
  `id_origen` int(11) DEFAULT NULL,
  `fecha_movimiento` date DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `movimientoinventario`
--

INSERT INTO `movimientoinventario` (`id_movimiento`, `tipo_movimiento`, `origen`, `id_origen`, `fecha_movimiento`, `cantidad`, `id_usuario`, `id_producto`) VALUES
(1, 'ENTRADA', 'PEDIDO', NULL, '2025-08-09', 10, 1, 1),
(2, 'ENTRADA', 'PEDIDO', NULL, '2025-09-27', 2, 1, 1),
(3, 'ENTRADA', 'PEDIDO', NULL, '2025-09-27', 2, 1, 1),
(4, 'SALIDA', 'PEDIDO', 1, '2025-10-13', 2, 1, 1),
(5, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(6, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(7, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(8, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(9, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(10, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(11, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(12, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(13, 'SALIDA', 'PEDIDO', 2, '2025-10-13', 2, 1, 1),
(14, 'SALIDA', 'PEDIDO', 2, '2025-10-14', 2, 1, 1),
(15, 'SALIDA', 'PEDIDO', 2, '2025-10-14', 2, 1, 1),
(16, 'SALIDA', 'PEDIDO', 2, '2025-10-14', 2, 1, 1),
(17, 'SALIDA', 'PEDIDO', 2, '2025-10-14', 2, 1, 1),
(18, 'SALIDA', 'PEDIDO', 2, '2025-10-14', 1, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido`
--

CREATE TABLE `pedido` (
  `id_pedido` int(11) NOT NULL,
  `numero_pedido` varchar(50) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `cliente_nombre` varchar(100) DEFAULT NULL,
  `cliente_telefono` varchar(20) DEFAULT NULL,
  `canal_venta` enum('instagram','facebook','tienda','whatsapp','telefono') DEFAULT NULL,
  `prioridad` enum('normal','alta','urgente') DEFAULT 'normal',
  `fecha_pedido` datetime NOT NULL DEFAULT current_timestamp(),
  `observaciones` text DEFAULT NULL,
  `detalles_producto` text DEFAULT NULL,
  `fecha_entrega` date DEFAULT NULL,
  `id_estado` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedido`
--

<<<<<<<< HEAD:src/DB/color_ink .sql
INSERT INTO `pedido` (`id_pedido`, `numero_pedido`, `id_usuario`, `cliente_nombre`, `cliente_telefono`, `canal_venta`, `prioridad`, `fecha_pedido`, `observaciones`, `detalles_producto`, `fecha_entrega`, `id_estado`) VALUES
(1, '', 1, NULL, NULL, NULL, 'normal', '0000-00-00 00:00:00', NULL, NULL, '0000-00-00', 1),
(2, 'PED-002', 1, NULL, NULL, NULL, 'normal', '2025-10-14 00:00:00', 'Pedido de prueba desde Postman2', NULL, '2025-10-28', 3),
(3, 'PED-001', 1, NULL, NULL, NULL, 'normal', '2025-10-13 00:00:00', 'Pedido de prueba desde Postman', NULL, NULL, 1),
(4, 'PED-003', 1, NULL, NULL, NULL, 'normal', '2025-10-13 00:00:00', 'Pedido de prueba desde Postman', NULL, NULL, 1),
(6, 'PED-004', 1, NULL, NULL, NULL, 'normal', '2025-10-13 00:00:00', 'Pedido urgente para cliente VIP', NULL, NULL, 1),
(7, 'PED-005', 1, NULL, NULL, NULL, 'normal', '2025-10-13 00:00:00', 'Pedido urgente para cliente VIP', NULL, NULL, 1);
========
INSERT INTO `pedido` (`id_pedido`, `numero_pedido`, `id_usuario`, `fecha_pedido`, `fecha_compromiso`, `observaciones`, `fecha_entrega`, `id_estado`) VALUES
(1, '', 1, '0000-00-00', NULL, NULL, '0000-00-00', 1),
(2, 'PED-002', 1, '2025-10-14', '2025-12-31', 'Pedido de prueba desde Postman2', '2025-10-28', 3),
(3, 'PED-001', 1, '2025-10-13', '2025-10-25', 'Pedido de prueba desde Postman', NULL, 1),
(4, 'PED-003', 1, '2025-10-13', '2025-10-25', 'Pedido de prueba desde Postman', NULL, 1),
(6, 'PED-004', 1, '2025-10-13', '2025-10-30', 'Pedido urgente para cliente VIP', NULL, 1),
(7, 'PED-005', 1, '2025-10-13', '2025-10-30', 'Pedido urgente para cliente VIP', NULL, 1),
(10, 'PED-006', 1, '2025-10-21', '2025-12-31', 'Pedido de prueba desde Postman', NULL, 1),
(11, 'PED-007', 1, '2025-10-21', '2025-12-31', 'Pedido de prueba desde Postman', NULL, 1);
>>>>>>>> main:src/DB/color_ink (19).sql

--
-- Disparadores `pedido`
--
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_delete` AFTER DELETE ON `pedido` FOR EACH ROW BEGIN
<<<<<<<< HEAD:src/DB/color_ink .sql
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    
========
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1); 
>>>>>>>> main:src/DB/color_ink (19).sql
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
            'fecha_entrega', OLD.fecha_entrega, 
            'observaciones', OLD.observaciones, 
            'id_estado', OLD.id_estado, 
            'id_usuario', OLD.id_usuario,
            'cliente_nombre', OLD.cliente_nombre,
            'cliente_telefono', OLD.cliente_telefono,
            'canal_venta', OLD.canal_venta,
            'prioridad', OLD.prioridad,
            'detalles_producto', OLD.detalles_producto
        )
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_insert` AFTER INSERT ON `pedido` FOR EACH ROW BEGIN
<<<<<<<< HEAD:src/DB/color_ink .sql
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    
========
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1); 
>>>>>>>> main:src/DB/color_ink (19).sql
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
            'fecha_entrega', NEW.fecha_entrega, 
            'observaciones', NEW.observaciones, 
            'id_estado', NEW.id_estado, 
            'id_usuario', NEW.id_usuario,
            'cliente_nombre', NEW.cliente_nombre,
            'cliente_telefono', NEW.cliente_telefono,
            'canal_venta', NEW.canal_venta,
            'prioridad', NEW.prioridad,
            'detalles_producto', NEW.detalles_producto
        )
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_pedido_after_update` AFTER UPDATE ON `pedido` FOR EACH ROW BEGIN
<<<<<<<< HEAD:src/DB/color_ink .sql
    DECLARE v_usuario_accion INT DEFAULT 1;
    SET v_usuario_accion = IFNULL(@usuario_id, 1);
    
========
    DECLARE v_usuario_accion INT DEFAULT 1; -- CORREGIDO: default 1
    SET v_usuario_accion = IFNULL(@usuario_id, 1); 
>>>>>>>> main:src/DB/color_ink (19).sql
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
            'fecha_entrega', OLD.fecha_entrega, 
            'observaciones', OLD.observaciones, 
            'id_estado', OLD.id_estado, 
            'id_usuario', OLD.id_usuario,
            'cliente_nombre', OLD.cliente_nombre,
            'cliente_telefono', OLD.cliente_telefono,
            'canal_venta', OLD.canal_venta,
            'prioridad', OLD.prioridad,
            'detalles_producto', OLD.detalles_producto
        ),
        JSON_OBJECT(
            'id_pedido', NEW.id_pedido, 
            'numero_pedido', NEW.numero_pedido, 
            'fecha_pedido', NEW.fecha_pedido,
            'fecha_entrega', NEW.fecha_entrega, 
            'observaciones', NEW.observaciones, 
            'id_estado', NEW.id_estado, 
            'id_usuario', NEW.id_usuario,
            'cliente_nombre', NEW.cliente_nombre,
            'cliente_telefono', NEW.cliente_telefono,
            'canal_venta', NEW.canal_venta,
            'prioridad', NEW.prioridad,
            'detalles_producto', NEW.detalles_producto
        )
    );
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_aud`
--

CREATE TABLE `pedido_aud` (
  `id_aud` int(11) NOT NULL,
  `fecha_accion` datetime NOT NULL,
  `usuario_accion` int(11) NOT NULL,
  `json_antes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_antes`)),
  `json_despues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_despues`)),
  `id_pedido` int(11) DEFAULT NULL,
  `id_estado` int(11) DEFAULT NULL,
  `fecha_pedido` datetime DEFAULT NULL,
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedido_aud`
--

INSERT INTO `pedido_aud` (`id_aud`, `fecha_accion`, `usuario_accion`, `json_antes`, `json_despues`, `id_pedido`, `id_estado`, `fecha_pedido`, `accion`) VALUES
(1, '2025-10-13 22:00:40', 1, NULL, '{\"id_pedido\": 2, \"numero_pedido\": \"PED-002\", \"fecha_pedido\": \"2025-10-13\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman2\", \"id_estado\": 1, \"id_usuario\": 1}', 2, NULL, NULL, 'INSERT'),
(2, '2025-10-13 22:06:26', 1, NULL, '{\"id_pedido\": 3, \"numero_pedido\": \"PED-001\", \"fecha_pedido\": \"2025-10-13\", \"fecha_compromiso\": \"2025-10-25\", \"observaciones\": \"Pedido de prueba desde Postman\", \"id_estado\": 1, \"id_usuario\": 1}', 3, NULL, NULL, 'INSERT'),
(3, '2025-10-13 22:11:18', 1, NULL, '{\"id_pedido\": 4, \"numero_pedido\": \"PED-003\", \"fecha_pedido\": \"2025-10-13\", \"fecha_compromiso\": \"2025-10-25\", \"observaciones\": \"Pedido de prueba desde Postman\", \"id_estado\": 1, \"id_usuario\": 1}', 4, NULL, NULL, 'INSERT'),
(4, '2025-10-13 22:27:41', 1, NULL, '{\"id_pedido\": 6, \"numero_pedido\": \"PED-004\", \"fecha_pedido\": \"2025-10-13\", \"fecha_compromiso\": \"2025-10-30\", \"observaciones\": \"Pedido urgente para cliente VIP\", \"id_estado\": 1, \"id_usuario\": 1}', 6, NULL, NULL, 'INSERT'),
(5, '2025-10-13 22:41:26', 1, NULL, '{\"id_pedido\": 7, \"numero_pedido\": \"PED-005\", \"fecha_pedido\": \"2025-10-13\", \"fecha_compromiso\": \"2025-10-30\", \"observaciones\": \"Pedido urgente para cliente VIP\", \"id_estado\": 1, \"id_usuario\": 1}', 7, NULL, NULL, 'INSERT'),
(6, '2025-10-14 11:02:07', 1, '{\"id_pedido\": 2, \"numero_pedido\": \"PED-002\", \"fecha_pedido\": \"2025-10-13\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman2\", \"id_estado\": 1, \"id_usuario\": 1}', '{\"id_pedido\": 2, \"numero_pedido\": \"PED-002\", \"fecha_pedido\": \"0000-00-00\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman2\", \"id_estado\": 2, \"id_usuario\": 1}', 2, NULL, NULL, 'UPDATE'),
<<<<<<<< HEAD:src/DB/color_ink .sql
(7, '2025-10-14 17:54:49', 1, '{\"id_pedido\": 2, \"numero_pedido\": \"PED-002\", \"fecha_pedido\": \"0000-00-00\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman2\", \"id_estado\": 2, \"id_usuario\": 1}', '{\"id_pedido\": 2, \"numero_pedido\": \"PED-002\", \"fecha_pedido\": \"2025-10-14\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman2\", \"id_estado\": 3, \"id_usuario\": 1}', 2, NULL, NULL, 'UPDATE');
========
(7, '2025-10-14 17:54:49', 1, '{\"id_pedido\": 2, \"numero_pedido\": \"PED-002\", \"fecha_pedido\": \"0000-00-00\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman2\", \"id_estado\": 2, \"id_usuario\": 1}', '{\"id_pedido\": 2, \"numero_pedido\": \"PED-002\", \"fecha_pedido\": \"2025-10-14\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman2\", \"id_estado\": 3, \"id_usuario\": 1}', 2, NULL, NULL, 'UPDATE'),
(8, '2025-10-21 20:07:00', 1, NULL, '{\"id_pedido\": 10, \"numero_pedido\": \"PED-006\", \"fecha_pedido\": \"2025-10-21\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman\", \"id_estado\": 1, \"id_usuario\": 1}', 10, NULL, NULL, 'INSERT'),
(9, '2025-10-21 20:46:40', 1, NULL, '{\"id_pedido\": 11, \"numero_pedido\": \"PED-007\", \"fecha_pedido\": \"2025-10-21\", \"fecha_compromiso\": \"2025-12-31\", \"observaciones\": \"Pedido de prueba desde Postman\", \"id_estado\": 1, \"id_usuario\": 1}', 11, NULL, NULL, 'INSERT');
>>>>>>>> main:src/DB/color_ink (19).sql

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto`
--

CREATE TABLE `producto` (
  `id_producto` int(11) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `nombre_producto` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `descripcion` text DEFAULT NULL,
  `precio_venta_base` decimal(12,2) NOT NULL,
  `stock` int(11) DEFAULT 0,
  `stock_minimo` int(11) NOT NULL DEFAULT 3,
  `costo_unitario` decimal(12,2) DEFAULT 0.00,
  `id_proveedor` int(11) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `producto`
--

INSERT INTO `producto` (`id_producto`, `sku`, `nombre_producto`, `activo`, `descripcion`, `precio_venta_base`, `stock`, `stock_minimo`, `costo_unitario`, `id_proveedor`, `id_categoria`) VALUES
(1, '', 'Camisa', 1, 'Camisa Azu', 15.00, 8, 3, 0.00, 1, 2);

--
-- Disparadores `producto`
--
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

CREATE TABLE `producto_aud` (
  `id_aud` int(11) NOT NULL,
  `fecha_accion` datetime NOT NULL,
  `usuario_accion` int(11) NOT NULL,
  `json_antes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_antes`)),
  `json_despues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_despues`)),
  `id_producto` int(11) DEFAULT NULL,
  `descripcion_producto` varchar(150) DEFAULT NULL,
  `id_proveedor` int(11) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `stock` int(11) DEFAULT NULL,
  `accion` enum('INSERT','UPDATE','DELETE') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `producto_aud`
--

INSERT INTO `producto_aud` (`id_aud`, `fecha_accion`, `usuario_accion`, `json_antes`, `json_despues`, `id_producto`, `descripcion_producto`, `id_proveedor`, `id_categoria`, `stock`, `accion`) VALUES
(2, '2025-09-27 19:44:21', 1, '{\"id_producto\": 1, \"sku\": \"\", \"nombre_producto\": \"Camisa\", \"descripcion\": \"Camisa Azu\", \"costo_unitario\": 0.00, \"precio_venta_base\": 15.00, \"stock\": 8, \"stock_minimo\": 0, \"activo\": 1, \"id_categoria\": 2, \"id_proveedor\": 1}', '{\"id_producto\": 1, \"sku\": \"\", \"nombre_producto\": \"Camisa\", \"descripcion\": \"Camisa Azu\", \"costo_unitario\": 0.00, \"precio_venta_base\": 15.00, \"stock\": 8, \"stock_minimo\": 3, \"activo\": 1, \"id_categoria\": 2, \"id_proveedor\": 1}', 1, NULL, NULL, NULL, NULL, 'UPDATE');

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
    VALUES (OLD.id_proveedor, OLD.descripcion_proveedor, OLD.forma_contacto, OLD.direccion, 'DELETE', 1); -- CORREGIDO: default 1
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
<<<<<<<< HEAD:src/DB/color_ink .sql
(2, 'Administrador', 'Activo');
========
(2, 'Administrador', 'Activo'),
(3, 'Cliente', 'Activo');
>>>>>>>> main:src/DB/color_ink (19).sql

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `nombre_usuario` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `password_updated_at` datetime DEFAULT NULL,
  `intentos_fallidos` int(11) DEFAULT 0,
  `bloqueado_hasta` datetime DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `ultimo_acceso` datetime DEFAULT NULL,
  `id_rol` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nombre_usuario`, `correo`, `contrasena`, `password_updated_at`, `intentos_fallidos`, `bloqueado_hasta`, `telefono`, `fecha_ingreso`, `ultimo_acceso`, `id_rol`) VALUES
(1, 'Patrick', 'pat@gmail.com', 'prueba', '2025-09-27 10:49:54', 0, NULL, '98989890', '2025-08-08', '2025-08-08 21:46:14', 1),
(2, 'nuevo_usuario', 'nuevo@email.com', '123456', '2025-09-27 10:49:54', 0, NULL, '123456789', '2025-09-27', '2025-09-27 00:39:15', 1),
(3, 'SISTEMA/NO LOGUEADO', 'sistema@tuempresa.com', 'N/A', NULL, 0, NULL, NULL, '0000-00-00', NULL, 1);

--
-- Disparadores `usuario`
--
DELIMITER $$
CREATE TRIGGER `trg_usuario_delete` AFTER DELETE ON `usuario` FOR EACH ROW BEGIN
    INSERT INTO usuario_aud (id_usuario, nombre, correo, id_rol, accion, usuario_accion)
    VALUES (OLD.id_usuario, OLD.nombre_usuario, OLD.correo, OLD.id_rol, 'DELETE', 1); -- CORREGIDO: default 1
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios_eliminados`
--

CREATE TABLE `usuarios_eliminados` (
  `id_eliminado` int(11) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `fecha_eliminacion` datetime DEFAULT current_timestamp(),
  `eliminado_por` int(11) DEFAULT NULL COMMENT 'ID del admin que elimina',
  `razon` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
<<<<<<<< HEAD:src/DB/color_ink .sql

--
-- Índices para tablas volcadas
--

========

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta`
--

CREATE TABLE `venta` (
  `id_venta` int(11) NOT NULL,
  `id_pedido` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL COMMENT 'Usuario que finaliza la venta',
  `fecha_venta` datetime DEFAULT current_timestamp(),
  `monto_cobrado` decimal(12,2) NOT NULL,
  `costo_total` decimal(12,2) NOT NULL,
  `utilidad` decimal(12,2) GENERATED ALWAYS AS (`monto_cobrado` - `costo_total`) STORED,
  `utilidad_pct` decimal(5,2) GENERATED ALWAYS AS (case when `costo_total` > 0 then (`monto_cobrado` - `costo_total`) / `costo_total` * 100 else 0 end) STORED,
  `metodo_pago` varchar(50) NOT NULL,
  `nota` text DEFAULT NULL,
  `estado` enum('REGISTRADA','ANULADA') NOT NULL DEFAULT 'REGISTRADA'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta_aud`
--

CREATE TABLE `venta_aud` (
  `id_venta_aud` int(11) NOT NULL,
  `id_venta_original` int(11) NOT NULL,
  `id_pedido_original` int(11) NOT NULL,
  `fecha_venta_original` datetime NOT NULL,
  `monto_cobrado_original` decimal(12,2) NOT NULL,
  `estado_original` enum('REGISTRADA','ANULADA') NOT NULL,
  `accion` enum('ELIMINADA','ANULADA') NOT NULL,
  `usuario_admin` int(11) NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `fecha_accion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

>>>>>>>> main:src/DB/color_ink (19).sql
--
-- Indices de la tabla `alerta_stock`
--
ALTER TABLE `alerta_stock`
  ADD PRIMARY KEY (`id_alerta`),
  ADD KEY `fk_alerta_producto` (`id_producto`);

--
-- Indices de la tabla `categoriaproducto`
--
ALTER TABLE `categoriaproducto`
  ADD PRIMARY KEY (`id_categoria`),
  ADD UNIQUE KEY `idx_categoria_descripcion` (`descripcion`);

--
-- Indices de la tabla `cat_estado_pedido`
--
ALTER TABLE `cat_estado_pedido`
  ADD PRIMARY KEY (`id_estado`),
  ADD UNIQUE KEY `codigo` (`codigo`);

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
  ADD PRIMARY KEY (`id_aud`),
  ADD KEY `fk_aud_detalle` (`id_detalle`),
  ADD KEY `fk_aud_usuario_accion_detallepedido` (`usuario_accion`);

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
  ADD UNIQUE KEY `numero_pedido` (`numero_pedido`),
  ADD KEY `fk_pedido_usuario` (`id_usuario`),
  ADD KEY `fk_pedido_estado` (`id_estado`);

--
-- Indices de la tabla `pedido_aud`
--
ALTER TABLE `pedido_aud`
  ADD PRIMARY KEY (`id_aud`),
  ADD KEY `fk_aud_usuario_accion_pedido` (`usuario_accion`);

--
-- Indices de la tabla `producto`
--
ALTER TABLE `producto`
  ADD PRIMARY KEY (`id_producto`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `fk_producto_proveedor` (`id_proveedor`),
  ADD KEY `fk_producto_categoria` (`id_categoria`);

--
-- Indices de la tabla `producto_aud`
--
ALTER TABLE `producto_aud`
  ADD PRIMARY KEY (`id_aud`),
  ADD KEY `fk_aud_usuario_accion_producto` (`usuario_accion`);

--
-- Indices de la tabla `proveedor`
--
ALTER TABLE `proveedor`
  ADD PRIMARY KEY (`id_proveedor`);

--
-- Indices de la tabla `proveedor_aud`
--
ALTER TABLE `proveedor_aud`
<<<<<<<< HEAD:src/DB/color_ink .sql
  ADD PRIMARY KEY (`id_aud`);
========
  ADD PRIMARY KEY (`id_aud`),
  ADD KEY `fk_aud_usuario_accion_proveedor` (`usuario_accion`);
>>>>>>>> main:src/DB/color_ink (19).sql

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
<<<<<<<< HEAD:src/DB/color_ink .sql
-- Indices de la tabla `usuario_aud`
--
ALTER TABLE `usuario_aud`
  ADD PRIMARY KEY (`id_aud`);
========
-- Indices de la tabla `usuarios_eliminados`
--
ALTER TABLE `usuarios_eliminados`
  ADD PRIMARY KEY (`id_eliminado`);

--
-- Indices de la tabla `usuario_aud`
--
ALTER TABLE `usuario_aud`
  ADD PRIMARY KEY (`id_aud`),
  ADD KEY `fk_aud_usuario_accion_usuario` (`usuario_accion`);

--
-- Indices de la tabla `venta`
--
ALTER TABLE `venta`
  ADD PRIMARY KEY (`id_venta`),
  ADD UNIQUE KEY `id_pedido` (`id_pedido`),
  ADD KEY `fk_venta_usuario` (`id_usuario`);

--
-- Indices de la tabla `venta_aud`
--
ALTER TABLE `venta_aud`
  ADD PRIMARY KEY (`id_venta_aud`),
  ADD KEY `fk_venta_aud_usuario` (`usuario_admin`);
>>>>>>>> main:src/DB/color_ink (19).sql

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `alerta_stock`
--
ALTER TABLE `alerta_stock`
  MODIFY `id_alerta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `categoriaproducto`
--
ALTER TABLE `categoriaproducto`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `cat_estado_pedido`
--
ALTER TABLE `cat_estado_pedido`
<<<<<<<< HEAD:src/DB/color_ink .sql
  MODIFY `id_estado` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
========
  MODIFY `id_estado` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
>>>>>>>> main:src/DB/color_ink (19).sql

--
-- AUTO_INCREMENT de la tabla `detallepedido`
--
ALTER TABLE `detallepedido`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de la tabla `detallepedido_aud`
--
ALTER TABLE `detallepedido_aud`
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `movimientoinventario`
--
ALTER TABLE `movimientoinventario`
  MODIFY `id_movimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `pedido`
--
ALTER TABLE `pedido`
<<<<<<<< HEAD:src/DB/color_ink .sql
  MODIFY `id_pedido` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
========
  MODIFY `id_pedido` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
>>>>>>>> main:src/DB/color_ink (19).sql

--
-- AUTO_INCREMENT de la tabla `pedido_aud`
--
ALTER TABLE `pedido_aud`
<<<<<<<< HEAD:src/DB/color_ink .sql
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
========
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
>>>>>>>> main:src/DB/color_ink (19).sql

--
-- AUTO_INCREMENT de la tabla `producto`
--
ALTER TABLE `producto`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `producto_aud`
--
ALTER TABLE `producto_aud`
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
<<<<<<<< HEAD:src/DB/color_ink .sql
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
========
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
>>>>>>>> main:src/DB/color_ink (19).sql

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuario_aud`
--
ALTER TABLE `usuario_aud`
  MODIFY `id_aud` int(11) NOT NULL AUTO_INCREMENT;

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
-- Filtros para la tabla `proveedor_aud`
--
ALTER TABLE `proveedor_aud`
  ADD CONSTRAINT `fk_aud_usuario_accion_proveedor` FOREIGN KEY (`usuario_accion`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE;

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

--
-- Filtros para la tabla `usuario_aud`
--
ALTER TABLE `usuario_aud`
  ADD CONSTRAINT `fk_aud_usuario_accion_usuario` FOREIGN KEY (`usuario_accion`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE;

DELIMITER $$
--
-- Eventos
--
CREATE DEFINER=`root`@`localhost` EVENT `evt_purgado_auditoria` ON SCHEDULE EVERY 1 MONTH STARTS '2025-10-01 01:00:00' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    CALL sp_purgar_auditoria();
END$$

CREATE DEFINER=`root`@`localhost` EVENT `evt_alerta_stock_minimo` ON SCHEDULE EVERY 1 DAY STARTS '2025-09-28 00:00:00' ON COMPLETION NOT PRESERVE ENABLE DO CALL sp_alerta_stock_minimo()$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
