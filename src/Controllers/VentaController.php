<?php

namespace App\Controllers;

use App\Models\VentaModel;
use App\Models\UserModel;
use App\Config\Security;
use App\Config\responseHTTP;
use App\Controllers\FirebaseController;

class VentaController
{
    private $ventaModel;

    public function __construct()
    {
        $this->ventaModel = new VentaModel();
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Validar autenticación y obtener datos del usuario
     */
    private function validarAutenticacion(): ?array
    {
        try {
            $headers = getallheaders();
            
            // 1) Intentar token desde GET (para exportaciones)
            $tokenFromGet = $_GET['token'] ?? null;
            if ($tokenFromGet) {
                error_log('VentaController - Token desde GET: Presente');
                
                // Intentar Firebase
                $fb = new FirebaseController();
                $claims = $fb->verifyIdToken($tokenFromGet);
                
                if ($claims) {
                    $correo = $claims['email'] ?? null;
                    $userModel = new UserModel();
                    $row = $correo ? $userModel->getUserByEmailOrPhone($correo) : null;
                    
                    if ($row) {
                        return [
                            'id_usuario' => (int)$row['id_usuario'],
                            'nombre_usuario' => $row['nombre_usuario'],
                            'id_rol' => (int)$row['id_rol'],
                            'email' => $row['correo']
                        ];
                    }
                }
            }
            
            // 2) Intentar Firebase ID Token desde headers
            $fb = new FirebaseController();
            $idToken = $this->extractBearer($headers);
            
            if ($idToken) {
                $claims = $fb->verifyIdToken($idToken);
                
                if ($claims) {
                    $correo = $claims['email'] ?? null;
                    $userModel = new UserModel();
                    $row = $correo ? $userModel->getUserByEmailOrPhone($correo) : null;
                    
                    if ($row) {
                        return [
                            'id_usuario' => (int)$row['id_usuario'],
                            'nombre_usuario' => $row['nombre_usuario'],
                            'id_rol' => (int)$row['id_rol'],
                            'email' => $row['correo']
                        ];
                    }
                }
            }
            
            // 3) Intentar JWT local como fallback
            try {
                $token = $this->extractBearer($headers);
                if ($token && !str_contains($token, 'eyJhbGciOiJSUzI1NiIs')) {
                    $tokenData = Security::validateTokenJwt($headers, Security::secretKey());
                    $data = json_decode(json_encode($tokenData), true);
                    $user = $data['data'] ?? null;
                    if ($user) {
                        return $user;
                    }
                }
            } catch (\Throwable $e) {
                error_log('VentaController - JWT inválido: ' . $e->getMessage());
            }
            
            return null;
        } catch (\Throwable $e) {
            error_log('VentaController - Error validando autenticación: ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Extraer token Bearer de headers
     */
    private function extractBearer(array $headers): ?string
    {
        if (!isset($headers['Authorization'])) return null;
        $authHeader = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Validar rol de usuario
     */
    private function validarRol(int $idRol, bool $soloAdmin = false): bool
    {
        if ($soloAdmin) {
            return $idRol === 1; // Solo Gerente (administrador principal)
        }
        return $idRol === 1 || $idRol === 2; // Gerente o Administrador
    }

    /**
     * POST /api/ventas - Registrar nueva venta
     */
    public function crearVenta(): void
    {
        try {
            $usuario = $this->validarAutenticacion();
            
            if (!$usuario) {
                echo json_encode(responseHTTP::status401('No autenticado'));
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id_pedido']) || !isset($input['monto_cobrado']) || !isset($input['metodo_pago'])) {
                echo json_encode(responseHTTP::status400('Faltan datos requeridos'));
                return;
            }

            $idPedido = (int)$input['id_pedido'];
            $montoCobrado = (float)$input['monto_cobrado'];
            $metodoPago = trim($input['metodo_pago']);
            $nota = $input['nota'] ?? null;

            if (!$this->validarRol($usuario['id_rol'], false)) {
                echo json_encode(responseHTTP::status401('No tiene permisos para registrar ventas'));
                return;
            }

            $result = $this->ventaModel->crearVenta($idPedido, $usuario['id_usuario'], $montoCobrado, $metodoPago, $nota);
            echo json_encode($result);
        } catch (\Throwable $e) {
            error_log('VentaController - crearVenta ERROR: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * GET /api/ventas - Listar ventas
     */
    public function listarVentas(): void
    {
        try {
            $usuario = $this->validarAutenticacion();
            
            if (!$usuario) {
                echo json_encode(responseHTTP::status401('No autenticado'));
                return;
            }

            $filtro = $_GET['filtro'] ?? null;
            $fechaDesde = $_GET['fecha_desde'] ?? null;
            $fechaHasta = $_GET['fecha_hasta'] ?? null;
            $estado = $_GET['estado'] ?? null;
            $metodoPago = $_GET['metodo_pago'] ?? null;
            $pagina = (int)($_GET['pagina'] ?? 1);
            $limite = (int)($_GET['limite'] ?? 10);

            error_log('VentaController - Filtros: estado=' . $estado . ', metodoPago=' . $metodoPago);

            $result = $this->ventaModel->listarVentas($filtro, $fechaDesde, $fechaHasta, $estado, $metodoPago, $pagina, $limite);
            echo json_encode($result);
        } catch (\Throwable $e) {
            error_log('VentaController - listarVentas ERROR: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * GET /api/ventas/{id} - Obtener una venta específica
     */
    public function obtenerVenta(int $id): void
    {
        try {
            $usuario = $this->validarAutenticacion();
            
            if (!$usuario) {
                echo json_encode(responseHTTP::status401('No autenticado'));
                return;
            }

            $result = $this->ventaModel->obtenerVenta($id);
            echo json_encode($result);
        } catch (\Throwable $e) {
            error_log('VentaController - obtenerVenta ERROR: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * PUT /api/ventas/{id} - Editar una venta
     */
    public function editarVenta(int $id): void
    {
        try {
            $usuario = $this->validarAutenticacion();
            
            if (!$usuario) {
                echo json_encode(responseHTTP::status401('No autenticado'));
                return;
            }

            if (!$this->validarRol($usuario['id_rol'], true)) {
                echo json_encode(responseHTTP::status401('Solo Administrador puede editar ventas'));
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['monto_cobrado']) || !isset($input['metodo_pago'])) {
                echo json_encode(responseHTTP::status400('Faltan datos requeridos'));
                return;
            }

            $montoCobrado = (float)$input['monto_cobrado'];
            $metodoPago = trim($input['metodo_pago']);
            $nota = $input['nota'] ?? null;

            $result = $this->ventaModel->editarVenta($id, $montoCobrado, $metodoPago, $nota);
            
            if ($result['status'] === 'OK') {
                try {
                    // Para ediciones, podemos usar 'ANULADA' como acción genérica o crear un trigger
                    // Por ahora, registramos como comentario en el motivo
                    error_log('VentaController - Venta editada ID=' . $id . ' por usuario=' . $usuario['id_usuario']);
                } catch (\Throwable $e) {
                    error_log('VentaController - Error en auditoría: ' . $e->getMessage());
                }
            }
            
            echo json_encode($result);
        } catch (\Throwable $e) {
            error_log('VentaController - editarVenta ERROR: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * PUT /api/ventas/{id}/anular - Anular una venta
     */
    public function anularVenta(int $id): void
    {
        try {
            $usuario = $this->validarAutenticacion();
            
            if (!$usuario) {
                echo json_encode(responseHTTP::status401('No autenticado'));
                return;
            }

            if (!$this->validarRol($usuario['id_rol'], true)) {
                echo json_encode(responseHTTP::status401('Solo Administrador puede anular ventas'));
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $motivo = $input['motivo'] ?? 'Venta anulada por el administrador';

            $result = $this->ventaModel->anularVenta($id, $usuario['id_usuario'], $motivo);
            
            // Intentar registrar auditoría (no crítico)
            if ($result['status'] === 'OK') {
                try {
                    $this->ventaModel->registrarAuditoria($id, 'ANULADA', $usuario['id_usuario'], $motivo);
                } catch (\Throwable $e) {
                    error_log('VentaController - Error en auditoría: ' . $e->getMessage());
                    // Continuar sin fallar
                }
            }
            
            echo json_encode($result);
        } catch (\Throwable $e) {
            error_log('VentaController - anularVenta ERROR: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * GET /api/ventas/reporte - Generar reportes
     */
    public function obtenerReporte(): void
    {
        try {
            $usuario = $this->validarAutenticacion();
            
            if (!$usuario) {
                echo json_encode(responseHTTP::status401('No autenticado'));
                return;
            }

            $fechaDesde = $_GET['fecha_desde'] ?? null;
            $fechaHasta = $_GET['fecha_hasta'] ?? null;

            $result = $this->ventaModel->obtenerResumenVentas($fechaDesde, $fechaHasta);
            echo json_encode($result);
        } catch (\Throwable $e) {
            error_log('VentaController - obtenerReporte ERROR: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Exportar ventas a Excel
     */
    public function exportarExcel(): void
    {
        try {
            $usuario = $this->validarAutenticacion();
            
            if (!$usuario) {
                echo json_encode(responseHTTP::status401('No autenticado'));
                return;
            }

            $filtro = $_GET['filtro'] ?? null;
            $fechaDesde = $_GET['fecha_desde'] ?? null;
            $fechaHasta = $_GET['fecha_hasta'] ?? null;
            $estado = $_GET['estado'] ?? null;
            $metodoPago = $_GET['metodo_pago'] ?? null;

            $this->ventaModel->exportarVentasExcel($filtro, $fechaDesde, $fechaHasta, $estado, $metodoPago);
        } catch (\Throwable $e) {
            error_log('VentaController - exportarExcel ERROR: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Obtener pedidos disponibles para crear ventas
     */
    public function obtenerPedidosDisponibles(): void
    {
        try {
            $usuario = $this->validarAutenticacion();
            
            if (!$usuario) {
                echo json_encode(responseHTTP::status401('No autenticado'));
                return;
            }

            $result = $this->ventaModel->obtenerPedidosDisponibles();
            echo json_encode($result);
        } catch (\Throwable $e) {
            error_log('VentaController - obtenerPedidosDisponibles ERROR: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }
}