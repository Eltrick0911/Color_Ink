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
    // Preferir variables con prefijo DB_ si existen (más específicas en producción)
    "user" => $_ENV['DB_USER'] ?? $_ENV['USER'] ?? '',
    "password" => $_ENV['DB_PASSWORD'] ?? $_ENV['PASSWORD'] ?? '',
    "DB" => $_ENV['DB_NAME'] ?? $_ENV['DB'] ?? '',
    "IP" => $_ENV['DB_HOST'] ?? $_ENV['IP'] ?? '127.0.0.1', 
    // Prefer DB_PORT if present to avoid conflicts with platform PORT
    "port" => $_ENV['DB_PORT'] ?? $_ENV['PORT'] ?? '3306'
);

/* conectamos a la base de datos llamando al metodo de la clase que retorna PDO*/
$host = 'mysql:host='.$data['IP'].';'.'port='.$data['port'].';'.'dbname='.$data['DB']; //cadena necesaria

//inicializamos el objeto conexión
connectionDB::inicializar($host, $data['user'], $data['password']);