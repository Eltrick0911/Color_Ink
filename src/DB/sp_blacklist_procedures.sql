-- Procedimientos almacenados para Lista Negra de usuarios
-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS usuarios_eliminados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    fecha_eliminacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    eliminado_por INT,
    razon TEXT,
    INDEX idx_email (email)
);

-- Procedimiento para agregar usuario a lista negra
DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE sp_agregar_lista_negra(
    IN p_email VARCHAR(100),
    IN p_eliminado_por INT,
    IN p_razon TEXT
)
BEGIN
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
DELIMITER ;

-- Procedimiento para remover usuario de lista negra
DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE sp_remover_lista_negra(
    IN p_email VARCHAR(100)
)
BEGIN
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
DELIMITER ;

-- Procedimiento para verificar si usuario está en lista negra
DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE sp_verificar_lista_negra(
    IN p_email VARCHAR(100)
)
BEGIN
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

-- Procedimiento para obtener lista negra completa
DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE sp_obtener_lista_negra()
BEGIN
    SELECT 
        id,
        email,
        fecha_eliminacion,
        eliminado_por,
        razon
    FROM usuarios_eliminados 
    ORDER BY fecha_eliminacion DESC;
END$$
DELIMITER ;
