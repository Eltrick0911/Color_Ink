<?php

namespace App\Controllers;

use App\Models\AuditModel;
use App\Config\responseHTTP;
use App\Config\Security;

class AuditController
{
    private AuditModel $model;

    public function __construct()
    {
        $this->model = new AuditModel();
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    private function extractBearer(array $headers): ?string
    {
        if (!isset($headers['Authorization'])) return null;
        $parts = explode(' ', $headers['Authorization']);
        if (count($parts) === 2 && strtolower($parts[0]) === 'bearer') {
            return $parts[1];
        }
        return null;
    }

    private function authorize(array $headers, ?array $roles = null): ?array
    {
        // Auditoría: exigir SOLO JWT local emitido por el backend
        try {
            $token = $this->extractBearer($headers);
            if (!$token) {
                echo json_encode(responseHTTP::status401('Token requerido (JWT local)'));
                return null;
            }

            // Rechazar tokens RS256 de Firebase explícitamente
            if (str_contains($token, 'eyJhbGciOiJSUzI1NiIs')) {
                echo json_encode(responseHTTP::status401('Use el token local de la plataforma para acceder a auditoría'));
                return null;
            }

            $tokenData = Security::validateTokenJwt($headers, Security::secretKey());
            $data = json_decode(json_encode($tokenData), true);
            $user = $data['data'] ?? null;

            if (!$user) {
                echo json_encode(responseHTTP::status401('Token inválido o expirado'));
                return null;
            }

            if ($roles && !in_array((int)$user['id_rol'], $roles)) {
                echo json_encode(responseHTTP::status401('No tiene privilegios para acceder al recurso!'));
                return null;
            }

            return $user;
        } catch (\Throwable $e) {
            error_log('Audit authorize error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status401('No autorizado'));
            return null;
        }
    }

    public function list(array $headers, array $query): void
    {
        $auth = $this->authorize($headers, [1]); // Solo admin
        if (!$auth) return;

        $table = $query['table'] ?? '';
        $filters = [
            'usuario_accion' => isset($query['user_id']) && $query['user_id'] !== '' ? (int)$query['user_id'] : null,
            'accion' => $query['transaction'] ?? null,
            'start_date' => $query['start_date'] ?? null,
            'end_date' => $query['end_date'] ?? null,
        ];
        $page = isset($query['page']) ? max(1, (int)$query['page']) : 1;
        $limit = isset($query['limit']) ? max(1, min(200, (int)$query['limit'])) : 50;

        try {
            $result = $this->model->listAudits($table, $filters, $page, $limit);
            http_response_code(200);
            echo json_encode([
                'status' => 'OK',
                'message' => 'OK',
                'data' => $result['rows'],
                'pagination' => $result['pagination']
            ]);
        } catch (\Throwable $e) {
            error_log('AuditController list error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    public function filters(array $headers, array $query): void
    {
        $auth = $this->authorize($headers, [1]);
        if (!$auth) return;

        $table = $query['table'] ?? '';
        try {
            $usuarios = $this->model->getDistinct($table, 'usuario_accion');
            $acciones = $this->model->getDistinct($table, 'accion');
            http_response_code(200);
            echo json_encode([
                'status' => 'OK',
                'message' => 'OK',
                'data' => [
                    'usuarios' => $usuarios,
                    'acciones' => $acciones
                ]
            ]);
        } catch (\Throwable $e) {
            error_log('AuditController filters error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    public function tables(array $headers): void
    {
        $auth = $this->authorize($headers, [1]);
        if (!$auth) return;
        $tables = $this->model->getAllowedTables();
        http_response_code(200);
        echo json_encode([
            'status' => 'OK',
            'message' => 'OK',
            'data' => array_keys($tables)
        ]);
    }
}
