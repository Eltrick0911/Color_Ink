//Actualizacion de SP
DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_usuario` (
    IN `p_id_usuario` INT, 
    IN `p_nombre_usuario` VARCHAR(100), 
    IN `p_correo` VARCHAR(100), 
    IN `p_contrasena` VARCHAR(255), 
    IN `p_telefono` VARCHAR(20), 
    IN `p_id_rol` INT,
    IN `p_actualizar_password` TINYINT(1) -- 1 = actualizar contraseña, 0 = mantener la actual
)
BEGIN
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

DELIMITER ;