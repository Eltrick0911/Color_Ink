-- Crear tabla para lista negra de usuarios eliminados
-- Esta tabla NO modifica la estructura existente de 'usuario'

CREATE TABLE IF NOT EXISTS usuarios_eliminados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    fecha_eliminacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    eliminado_por INT,
    razon TEXT,
    INDEX idx_email (email)
);

-- Insertar algunos emails de ejemplo (opcional)
-- INSERT INTO usuarios_eliminados (email, eliminado_por, razon) VALUES ('usuario@ejemplo.com', 1, 'Eliminado por administrador');
