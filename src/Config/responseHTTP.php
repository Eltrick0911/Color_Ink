<?php
//creamos un espacio de nombres 
//mas adelante lo configuraremos para que el autoload de composer pueda cargarlo de forma dinamica
namespace App\Config; //este sera nuestro espacio de nombres

class responseHTTP{
    // Genera una respuesta base sin estado compartido (evita efectos colaterales)
    private static function base(string $status, string $message, $data = null): array {
        return [
            'status' => $status,
            'message' => $message,
            'data' => $data
        ];
    }

    public static function sendResponse($data) {
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    // Códigos de estado HTTP

    final public static function status200(string $res = 'OK'): array {
        http_response_code(200);
        return self::base('OK', $res);
    }

    final public static function status201(string $res = 'Recurso creado exitosamente!'): array {
        http_response_code(201);
        return self::base('OK', $res);
    }

    final public static function status400(string $res): array {
        http_response_code(400);
        return self::base('ERROR', $res);
    }

    final public static function status401(string $str = 'No autenticado'): array {
        http_response_code(401);
        $res = 'No tiene privilegios para acceder al recurso! ' . $str;
        return self::base('ERROR', $res);
    }

    final public static function status404(string $res = 'No existe el recurso solicitado!'): array {
        http_response_code(404);
        return self::base('ERROR', $res);
    }

    final public static function status500(string $res = 'Se ha producido un error en el servidor!'): array {
        http_response_code(500);
        return self::base('ERROR', $res);
    }
}