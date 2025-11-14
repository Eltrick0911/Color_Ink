<?php

//Este archivo nos permitite preparar los datos para nuestra conexion

//referenciamos a nuestros objetos segun el nombre de espacios
use App\Config\errorlogs;
use App\Config\responseHTTP;
use App\DB\connectionDB;
use Dotenv\Dotenv;

//activamos la configuración de los errores 
errorlogs::activa_error_logs();

// Establecer zona horaria de PHP para que coincida con MySQL
date_default_timezone_set('America/Tegucigalpa');

/* cargamos variables de entorno desde .env cuando exista (no fallar si falta) */
$envDir = dirname(__DIR__, 2);
$dotenv = Dotenv::createImmutable($envDir);
if (method_exists($dotenv, 'safeLoad')) {
    // PhpDotenv v5+: no lanza excepción si .env no existe
    $dotenv->safeLoad();
} else {
    // Compatibilidad: solo cargar si el archivo existe
    $envFile = $envDir . DIRECTORY_SEPARATOR . '.env';
    if (is_readable($envFile)) {
        try { $dotenv->load(); } catch (\Throwable $e) { /* ignorar en producción */ }
    }
}

//definimos un arreglos para simplificar y pasar la cadena de caracteres necesaria para abrir la conexion PDO
$data = array(
    // Credenciales y parámetros - priorizar .env sobre variables del sistema
    "user" => $_ENV['USER'] ?? $_ENV['DB_USER'] ?? '',
    "password" => $_ENV['PASSWORD'] ?? $_ENV['DB_PASSWORD'] ?? '',
    "DB" => $_ENV['DB'] ?? $_ENV['DB_NAME'] ?? '',
    "IP" => $_ENV['IP'] ?? $_ENV['DB_HOST'] ?? '',
    "port" => $_ENV['PORT'] ?? $_ENV['DB_PORT'] ?? '3306',
    "charset" => $_ENV['DB_CHARSET'] ?? 'utf8mb4',
    "ssl_ca" => $_ENV['DB_SSL_CA'] ?? '',
    "ssl_verify" => $_ENV['DB_SSL_VERIFY'] ?? 'true'
);

// Construir DSN con charset explícito
$host = 'mysql:host='.$data['IP'].';port='.$data['port'].';dbname='.$data['DB'].';charset='.$data['charset'];

// Opciones PDO adicionales (SSL si se configura)
$pdoOptions = [];
if (!empty($data['ssl_ca'])) {
    $pdoOptions[\PDO::MYSQL_ATTR_SSL_CA] = $data['ssl_ca'];
    // Permitir desactivar verificación del cert si explícito
    if (strtolower($data['ssl_verify']) === 'false') {
        $pdoOptions[\PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
    }
}

// Inicializamos conexión
connectionDB::inicializar($host, $data['user'], $data['password'], $pdoOptions);