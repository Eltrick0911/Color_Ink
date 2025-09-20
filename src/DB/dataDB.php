<?php

//Este archivo nos permitite preparar los datos para nuestra conexion

//referenciamos a nuestros objetos segun el nombre de espacios
use App\Config\errorlogs;
use App\Config\responseHTTP;
use App\DB\connectionDB;
use Dotenv\Dotenv;

//activamos la configuración de los errores 
errorlogs::activa_error_logs();

/* cargamos nuestras variables de entorno de nuestra conexion a BD*/
$dotenv = Dotenv::createImmutable(dirname(__DIR__,2));
$dotenv->load(); 

//definimos un arreglos para simplificar y pasar la cadena de caracteres necesaria para abrir la conexion PDO
$data = array(
    "user" => $_ENV['USER'],
    "password" => $_ENV['PASSWORD'],
    "DB" => $_ENV['DB'],
    "IP" => $_ENV['IP'], 
    "port" => $_ENV['PORT']
);

/* conectamos a la base de datos llamando al metodo de la clase que retorna PDO*/
$host = 'mysql:host='.$data['IP'].';'.'port='.$data['port'].';'.'dbname='.$data['DB']; //cadena necesaria

//inicializamos el objeto conexión
connectionDB::inicializar($host, $data['user'], $data['password']);