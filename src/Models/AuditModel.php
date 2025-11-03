<?php

namespace App\Models;

use App\DB\connectionDB;
use PDO;

class AuditModel
{
    private array $allowed = [
        'producto' => 'producto_aud',
        'pedido' => 'pedido_aud',
        'detallepedido' => 'detallepedido_aud',
        'proveedor' => 'proveedor_aud',
        'venta' => 'venta_aud',
        'usuario' => 'usuario_aud',
    ];

    public function getAllowedTables(): array
    {
        return $this->allowed;
    }

    private function resolveTable(string $key): ?string
    {
        $key = strtolower(trim($key));
        return $this->allowed[$key] ?? null;
    }

    public function listAudits(string $tableKey, array $filters, int $page, int $limit): array
    {
        $table = $this->resolveTable($tableKey);
        if (!$table) {
            throw new \InvalidArgumentException('Tabla no permitida');
        }

        $pdo = connectionDB::getConnection();

        $where = [];
        $params = [];

        if (!empty($filters['usuario_accion'])) {
            $where[] = 'usuario_accion = :usuario_accion';
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
        $sql = "SELECT * FROM {$table} {$whereSql} ORDER BY fecha_accion DESC, id_aud DESC LIMIT :limit OFFSET :offset";
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
        $table = $this->resolveTable($tableKey);
        if (!$table) {
            throw new \InvalidArgumentException('Tabla no permitida');
        }

        // Solo columnas permitidas para evitar inyección
        $column = strtolower($column);
        if (!in_array($column, ['usuario_accion', 'accion'])) {
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
