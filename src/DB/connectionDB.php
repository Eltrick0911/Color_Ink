<?php

namespace App\DB; //nombre de espacios con la carpeta donde esta ubicado este archivo
use App\Config\responseHTTP;
use PDO; //usaremos el objeto PDO para interactuar con la BD
//requerimos la preparacion de este objeto incluyendo este archivo
require __DIR__.'/dataDB.php'; //__DIR__ estamos en la misma carpeta

class connectionDB{
    private static $host = ''; // DSN
    private static $user = '';
    private static $pass = '';
    private static $options = []; // Opciones PDO adicionales (SSL, fetch mode, etc.)

    /**
     * Inicializa credenciales y opciones PDO.
     */
    final public static function inicializar($host, $user, $pass, array $options = []){
        self::$host = $host;
        self::$user = $user;
        self::$pass = $pass;
        self::$options = $options;
    }
    //metodo que retorna la conexion
    final public static function getConnection(){
        try{
            $start = microtime(true);
            // Merge opciones por defecto + específicas
            $opt = [\PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC] + self::$options;
            $pdo = new PDO(self::$host,self::$user,self::$pass, $opt);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $pdo->exec("SET time_zone = '-06:00'");
            $tz = $pdo->query("SELECT @@session.time_zone AS tz, NOW() AS hora_actual")->fetch();
            $dur = round((microtime(true)-$start)*1000,2);
            // Mask credentials in DSN log
            $dsnMask = preg_replace('/password=[^;]+/i','password=***', self::$host);
            error_log("[DB-CONNECT] OK dur={$dur}ms tz={$tz['tz']} hora={$tz['hora_actual']} dsn=".$dsnMask);
            return $pdo;
        }catch(\PDOException $e){
            error_log("[DB-CONNECT] FAIL msg=".$e->getMessage());
            echo json_encode(responseHTTP::status500()+['debug'=>'DB connection failed']);
            exit;
        }
    }
   
}