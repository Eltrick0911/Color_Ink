<?php

namespace App\Models;

use App\DB\connectionDB;
use PDO;

class AuditModel
{
    // Allowed tables with metadata to handle schema differences per entity
    // - table: physical table name
    // - idCol: primary audit id column to order by
    // - userCol: column that stores the user id who performed the action
    private array $allowed = [
        'producto' => ['table' => 'producto_aud',      'idCol' => 'id_aud',        'userCol' => 'usuario_accion'],
        'pedido' => ['table' => 'pedido_aud',          'idCol' => 'id_aud',        'userCol' => 'usuario_accion'],
        'detallepedido' => ['table' => 'detallepedido_aud','idCol' => 'id_aud',    'userCol' => 'usuario_accion'],
        'proveedor' => ['table' => 'proveedor_aud',    'idCol' => 'id_aud',        'userCol' => 'usuario_accion'],
        // venta_aud tiene columnas distintas: id_venta_aud y usuario_admin
        'venta' => ['table' => 'venta_aud',            'idCol' => 'id_venta_aud',  'userCol' => 'usuario_admin'],
        'usuario' => ['table' => 'usuario_aud',        'idCol' => 'id_aud',        'userCol' => 'usuario_accion'],
    ];

    public function getAllowedTables(): array
    {
        // Return just the mapping key => table name for listing available tables
        $result = [];
        foreach ($this->allowed as $k => $meta) {
            $result[$k] = $meta['table'];
        }
        return $result;
    }

    private function resolveMeta(string $key): ?array
    {
        $key = strtolower(trim($key));
        return $this->allowed[$key] ?? null;
    }

    public function listAudits(string $tableKey, array $filters, int $page, int $limit): array
    {
        $meta = $this->resolveMeta($tableKey);
        if (!$meta) {
            throw new \InvalidArgumentException('Tabla no permitida');
        }
        $table = $meta['table'];
        $idCol = $meta['idCol'];
        $userCol = $meta['userCol'];

        $pdo = connectionDB::getConnection();

        $where = [];
        $params = [];

        if (!empty($filters['usuario_accion'])) {
            // Mapear a la columna real de usuario según la tabla
            $where[] = $userCol . ' = :usuario_accion';
            $params[':usuario_accion'] = (int)$filters['usuario_accion'];
        }
        if (!empty($filters['accion'])) {
            $where[] = 'accion = :accion';
            $params[':accion'] = $filters['accion'];
        }
        if (!empty($filters['start_date'])) {
            $where[] = 'fecha_accion >= :start_date';
            $start = $filters['start_date'];
            if (strlen($start) === 10) { // YYYY-MM-DD
                $start .= ' 00:00:00';
            }
            $params[':start_date'] = $start;
        }
        if (!empty($filters['end_date'])) {
            $where[] = 'fecha_accion <= :end_date';
            $end = $filters['end_date'];
            if (strlen($end) === 10) { // YYYY-MM-DD
                $end .= ' 23:59:59';
            }
            $params[':end_date'] = $end;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        // Count total
        $countSql = "SELECT COUNT(*) as total FROM {$table} {$whereSql}";
        $stmt = $pdo->prepare($countSql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        $total = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];

        $offset = ($page - 1) * $limit;
    $sql = "SELECT * FROM {$table} {$whereSql} ORDER BY fecha_accion DESC, {$idCol} DESC LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'rows' => $rows,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => $limit > 0 ? (int)ceil($total / $limit) : 1
            ]
        ];
    }

    public function getDistinct(string $tableKey, string $column): array
    {
        $meta = $this->resolveMeta($tableKey);
        if (!$meta) {
            throw new \InvalidArgumentException('Tabla no permitida');
        }
        $table = $meta['table'];
        // Solo columnas permitidas para evitar inyección
        $column = strtolower($column);
        if ($column === 'usuario_accion') {
            $column = $meta['userCol'];
        } elseif ($column !== 'accion') {
            throw new \InvalidArgumentException('Columna no permitida');
        }

        $pdo = connectionDB::getConnection();
        $sql = "SELECT DISTINCT {$column} FROM {$table} WHERE {$column} IS NOT NULL ORDER BY {$column}";
        $stmt = $pdo->query($sql);
        $values = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $values[] = $row[$column];
        }
        return $values;
    }
}
