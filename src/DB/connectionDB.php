<?php

namespace App\DB; //nombre de espacios con la carpeta donde esta ubicado este archivo
use App\Config\responseHTTP;
use PDO; //usaremos el objeto PDO para interactuar con la BD
//requerimos la preparacion de este objeto incluyendo este archivo
require __DIR__.'/dataDB.php'; //__DIR__ estamos en la misma carpeta

class connectionDB{
    private static $host = ''; //arreglo de datos (servidor, puerto, etc...)
    private static $user = '';
    private static $pass = '';

    final public static function inicializar($host, $user, $pass){
        //this or self?
        //self hace referencia a la clase para así mandar llamar funciones estáticas.
        //this hace referencia a un objeto ya instanciado para mandar llamar funciones de cualquier otro tipo
        self::$host = $host;
        self::$user = $user;
        self::$pass = $pass;
    }
    //metodo que retorna la conexion
    final public static function getConnection(){
        try{
            //opciones de conexion
            $opt = [\PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC];
            $pdo = new PDO(self::$host,self::$user,self::$pass, $opt);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            error_log("Conexión exitosa");
            return $pdo;
        }catch(\PDOException $e){
            error_log("Error en la conexión a la BD! ERROR: ".$e);
            die(json_encode(resposeHTTP::status500()));

        }
    }
   
}