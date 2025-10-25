<?php

namespace App\Config;

/**
 * Logger específico para el sistema de pedidos
 */
class PedidosLogger
{
    private static $logFile = 'logs/pedidos.log';
    
    public static function info($message, $context = [])
    {
        self::log('INFO', $message, $context);
    }
    
    public static function error($message, $context = [])
    {
        self::log('ERROR', $message, $context);
    }
    
    public static function debug($message, $context = [])
    {
        self::log('DEBUG', $message, $context);
    }
    
    public static function warning($message, $context = [])
    {
        self::log('WARNING', $message, $context);
    }
    
    private static function log($level, $message, $context = [])
    {
        // Crear directorio de logs si no existe
        $logDir = dirname(self::$logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
        $logEntry = "[$timestamp] [$level] $message$contextStr" . PHP_EOL;
        
        file_put_contents(self::$logFile, $logEntry, FILE_APPEND | LOCK_EX);
        
        // También mostrar en pantalla para debugging
        if (php_sapi_name() === 'cli') {
            echo "[$level] $message$contextStr\n";
        }
    }
    
    public static function clearLog()
    {
        if (file_exists(self::$logFile)) {
            unlink(self::$logFile);
        }
    }
    
    public static function getLogs($lines = 50)
    {
        if (!file_exists(self::$logFile)) {
            return [];
        }
        
        $logs = file(self::$logFile, FILE_IGNORE_NEW_LINES);
        return array_slice($logs, -$lines);
    }
}