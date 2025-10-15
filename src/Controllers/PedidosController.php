<?php

namespace App\Controllers;

use App\Models\PedidosModel;
use App\Config\Security;
use App\Config\responseHTTP;
use App\Controllers\FirebaseController;

class PedidosController
{
    private $pedidosModel;

    public function __construct()
    {
        $this->pedidosModel = new PedidosModel();
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    private function authorize(array $headers, ?array $roles = null): ?array
    {
        error_log('PedidosController - authorize: Iniciando autorización');
        error_log('PedidosController - Headers recibidos: ' . json_encode($headers));
        
        // 1) Intentar JWT local
        try {
            error_log('PedidosController - Intentando validar JWT local');
            $tokenData = Security::validateTokenJwt($headers, Security::secretKey());
            $data = json_decode(json_encode($tokenData), true);
            $user = $data['data'] ?? null;
            error_log('PedidosController - JWT válido, usuario: ' . json_encode($user));
        } catch (\Throwable $e) {
            error_log('PedidosController - JWT inválido: ' . $e->getMessage());
            $user = null;
        }

        // 2) Intentar Firebase ID Token si no hay JWT local válido
        if (!$user) {
            error_log('PedidosController - Intentando validar Firebase token');
            $fb = new FirebaseController();
            $idToken = $this->extractBearer($headers);
            error_log('PedidosController - Firebase token extraído: ' . ($idToken ? 'Presente' : 'No presente'));
            
            if ($idToken) {
                $claims = $fb->verifyIdToken($idToken);
                error_log('PedidosController - Firebase claims: ' . json_encode($claims));
                if ($claims) {
                    // Mapear a usuario real de BD si existe por correo
                    $correo = $claims['email'] ?? null;
                    $nombre = $claims['name'] ?? ($claims['email'] ?? 'FirebaseUser');
                    $userModel = new \App\Models\UserModel();
                    $row = $correo ? $userModel->getUserByEmailOrPhone($correo) : null;
                    if (!$row && $correo) {
                        $randomPass = bin2hex(random_bytes(8));
                        $hash = Security::createPassword($randomPass);
                        $userModel->createUser($nombre, $correo, $hash, null, 2);
                        $row = $userModel->getUserByEmailOrPhone($correo);
                    }
                    if ($row) {
                        $user = [
                            'id_usuario' => (int)$row['id_usuario'],
                            'nombre_usuario' => $row['nombre_usuario'],
                            'id_rol' => (int)$row['id_rol']
                        ];
                    } else {
                        // Último recurso: claims
                        $user = [
                            'id_usuario' => $claims['user_id'] ?? ($claims['sub'] ?? 0),
                            'nombre_usuario' => $nombre,
                            'id_rol' => 2
                        ];
                    }
                }
            }
        }

        if (!$user) {
            error_log('PedidosController - No se pudo obtener usuario válido');
            echo json_encode(responseHTTP::status401('Token inválido'));
            return null;
        }
        
        error_log('PedidosController - Usuario autorizado: ' . json_encode($user));
        error_log('PedidosController - Roles requeridos: ' . json_encode($roles));
        error_log('PedidosController - Rol del usuario: ' . $user['id_rol']);
        
        if ($roles && !in_array((int)$user['id_rol'], $roles)) {
            error_log('PedidosController - Usuario no tiene permisos para esta acción');
            echo json_encode(responseHTTP::status401('No autorizado'));
            return null;
        }
        
        error_log('PedidosController - Autorización exitosa');
        return $user;
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

    // ===== ENDPOINTS PARA PEDIDOS =====

    /**
     * Test de conexión (Sin autenticación requerida)
     */
    public function testConnection(): void
    {
        try {
            error_log('PedidosController - testConnection: Iniciando test');
            
            // Test básico sin autenticación para debugging
            $result = $this->pedidosModel->testConnection();
            error_log('PedidosController - testConnection: Resultado: ' . json_encode($result));
            
            echo json_encode(responseHTTP::status200('Test de conexión exitoso') + ['data' => $result]);
        } catch (\Exception $e) {
            error_log('PedidosController - testConnection: Error: ' . $e->getMessage());
            error_log('PedidosController - testConnection: Stack trace: ' . $e->getTraceAsString());
            echo json_encode(responseHTTP::status500('Error en test de conexión: ' . $e->getMessage()));
        }
    }

    /**
     * Crear pedido (Sin autenticación - Testing)
     */
    public function create(array $headers, array $input): void
    {
        try {
            error_log("PedidosController - create: Iniciando creación de pedido");
            error_log("PedidosController - create: Input recibido: " . json_encode($input));
            
            $numeroPedido = trim($input['numero_pedido'] ?? '');
            $fechaCompromiso = $input['fecha_compromiso'] ?? '';
            $observaciones = trim($input['observaciones'] ?? '') ?: null;
            $idUsuario = (int)($input['id_usuario'] ?? 1); // Default usuario 1 si no se especifica

            error_log("PedidosController - create: Datos procesados - Número: $numeroPedido, Fecha: $fechaCompromiso, Usuario: $idUsuario");
            
            // Validar campos requeridos
            if (empty($numeroPedido) || empty($fechaCompromiso) || $idUsuario <= 0) {
                error_log("PedidosController - create: Validación fallida - Campos requeridos faltantes");
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status400('Número de pedido, fecha de compromiso e id_usuario son requeridos'));
                return;
            }

            $idPedido = $this->pedidosModel->createPedido($numeroPedido, $fechaCompromiso, $observaciones, $idUsuario);
            error_log("PedidosController - create: Resultado de creación, ID: " . ($idPedido ?? 'null'));
            
            if ($idPedido) {
                // Corregimos el formato de respuesta para que sea consistente
                $response = responseHTTP::status200('Pedido creado exitosamente');
                $response['data'] = ['id_pedido_creado' => $idPedido];
                
                // Establecemos los headers adecuados
                header('Content-Type: application/json');
                
                // Devolvemos la respuesta
                echo json_encode($response);
            } else {
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status500('Error al crear el pedido'));
            }
        } catch (\Exception $e) {
            error_log("PedidosController - create: Error: " . $e->getMessage() . " - Traza: " . $e->getTraceAsString());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Listar todos los pedidos (Sin autenticación - Testing)
     */
    public function findAll(array $headers): void
    {
        try {
            error_log("PedidosController - findAll: Iniciando obtención de todos los pedidos");
            
            // En testing, siempre devolver todos los pedidos
            $pedidos = $this->pedidosModel->getAllPedidos();
            
            error_log("PedidosController - findAll: Se encontraron " . count($pedidos) . " pedidos");
            
            // Corregimos el formato de respuesta para que sea consistente
            $response = responseHTTP::status200('Pedidos obtenidos correctamente');
            $response['data'] = $pedidos;
            
            // Establecemos los headers adecuados
            header('Content-Type: application/json');
            
            // Devolvemos la respuesta
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("PedidosController - findAll: Error: " . $e->getMessage());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Obtener pedidos por usuario (Sin autenticación - Testing)
     */
    public function findByUser(array $headers, int $idUsuario): void
    {
        try {
            error_log("PedidosController - findByUser: Buscando pedidos para usuario ID: " . $idUsuario);
            
            $pedidos = $this->pedidosModel->getPedidosByUser($idUsuario);
            
            error_log("PedidosController - findByUser: Se encontraron " . count($pedidos) . " pedidos para el usuario");
            
            // Corregimos el formato de respuesta para que sea consistente
            $response = responseHTTP::status200('Pedidos del usuario obtenidos correctamente');
            $response['data'] = $pedidos;
            
            // Establecemos los headers adecuados
            header('Content-Type: application/json');
            
            // Devolvemos la respuesta
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("PedidosController - findByUser: Error: " . $e->getMessage());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Obtener pedido específico (Sin autenticación - Testing)
     */
    public function findOne(array $headers, int $id): void
    {
        try {
            error_log("PedidosController - findOne: Buscando pedido con ID: " . $id);
            
            $pedido = $this->pedidosModel->getPedidoById($id);
            
            if (!$pedido) {
                error_log("PedidosController - findOne: Pedido no encontrado con ID: " . $id);
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }
            
            error_log("PedidosController - findOne: Pedido encontrado con ID: " . $id);
            
            // Corregimos el formato de respuesta para que sea consistente
            $response = responseHTTP::status200('Pedido obtenido correctamente');
            $response['data'] = $pedido;
            
            // Establecemos los headers adecuados
            header('Content-Type: application/json');
            
            // Devolvemos la respuesta
            echo json_encode($response);
        } catch (\Exception $e) {
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Actualizar pedido (Sin autenticación - Testing)
     */
    public function update(array $headers, int $id, array $input): void
    {
        try {
            error_log("PedidosController - update: Iniciando actualización del pedido ID: " . $id);
            error_log("PedidosController - update: Input recibido: " . json_encode($input));
            
            // Verificar que el pedido existe
            $pedido = $this->pedidosModel->getPedidoById($id);
            if (!$pedido) {
                error_log("PedidosController - update: Pedido no encontrado con ID: " . $id);
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }
            
            error_log("PedidosController - update: Pedido encontrado con ID: " . $id);

            $idUsuario = (int)($input['id_usuario'] ?? $pedido['id_usuario']);
            $fechaPedido = $input['fecha_pedido'] ?? $pedido['fecha_pedido'];
            $fechaEntrega = $input['fecha_entrega'] ?? null;
            $idEstado = (int)($input['id_estado'] ?? $pedido['id_estado']);

            error_log("PedidosController - update: Datos procesados - Usuario: $idUsuario, FechaPedido: $fechaPedido, FechaEntrega: " . ($fechaEntrega ?? 'null') . ", Estado: $idEstado");

            $success = $this->pedidosModel->updatePedido($id, $idUsuario, $fechaPedido, $fechaEntrega, $idEstado);
            error_log("PedidosController - update: Resultado de actualización: " . ($success ? 'Exitoso' : 'Fallido'));
            
            if ($success) {
                // Corregimos el formato de respuesta para que sea consistente
                $response = responseHTTP::status200('Pedido actualizado exitosamente');
                
                // Establecemos los headers adecuados
                header('Content-Type: application/json');
                
                // Devolvemos la respuesta
                echo json_encode($response);
            } else {
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status500('Error al actualizar el pedido'));
            }
        } catch (\Exception $e) {
            error_log("PedidosController - update: Error: " . $e->getMessage() . " - Traza: " . $e->getTraceAsString());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Cambiar estado del pedido (Sin autenticación - Testing)
     */
    public function cambiarEstado(array $headers, int $id, array $input): void
    {
        try {
            error_log("PedidosController - cambiarEstado: Iniciando cambio de estado para pedido ID: " . $id);
            error_log("PedidosController - cambiarEstado: Input recibido: " . json_encode($input));
            
            // Verificar que el pedido existe
            $pedido = $this->pedidosModel->getPedidoById($id);
            if (!$pedido) {
                error_log("PedidosController - cambiarEstado: Pedido no encontrado con ID: " . $id);
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }
            
            error_log("PedidosController - cambiarEstado: Pedido encontrado con ID: " . $id);

            $idEstadoNuevo = (int)($input['id_estado'] ?? 0); // Cambiado a 'id_estado' para ser consistente
            $idUsuario = (int)($input['id_usuario'] ?? 1); // Default usuario 1 si no se especifica

            error_log("PedidosController - cambiarEstado: Datos procesados - Estado nuevo: $idEstadoNuevo, Usuario: $idUsuario");
            
            if ($idEstadoNuevo <= 0) {
                error_log("PedidosController - cambiarEstado: ID de estado inválido");
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status400('ID de estado inválido'));
                return;
            }

            if ($idUsuario <= 0) {
                error_log("PedidosController - cambiarEstado: ID de usuario inválido");
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status400('ID de usuario requerido'));
                return;
            }

            $success = $this->pedidosModel->cambiarEstadoPedido($id, $idEstadoNuevo, $idUsuario);
            error_log("PedidosController - cambiarEstado: Resultado del cambio de estado: " . ($success ? 'Exitoso' : 'Fallido'));
            
            if ($success) {
                // Corregimos el formato de respuesta para que sea consistente
                $response = responseHTTP::status200('Estado del pedido actualizado exitosamente');
                
                // Establecemos los headers adecuados
                header('Content-Type: application/json');
                
                // Devolvemos la respuesta
                echo json_encode($response);
            } else {
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status500('Error al cambiar el estado del pedido'));
            }
        } catch (\Exception $e) {
            error_log("PedidosController - cambiarEstado: Error: " . $e->getMessage() . " - Traza: " . $e->getTraceAsString());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Eliminar pedido (Sin autenticación - Testing)
     */
    public function remove(array $headers, int $id): void
    {
        try {
            error_log("PedidosController - remove: Iniciando eliminación de pedido con ID: " . $id);
            
            // Verificar primero que el pedido existe
            $pedido = $this->pedidosModel->getPedidoById($id);
            if (!$pedido) {
                error_log("PedidosController - remove: Pedido no encontrado con ID: " . $id);
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }
            
            $success = $this->pedidosModel->deletePedido($id);
            error_log("PedidosController - remove: Resultado de eliminación: " . ($success ? 'Exitoso' : 'Fallido'));
            
            if ($success) {
                // Corregimos el formato de respuesta para que sea consistente
                $response = responseHTTP::status200('Pedido eliminado exitosamente');
                
                // Establecemos los headers adecuados
                header('Content-Type: application/json');
                
                // Devolvemos la respuesta
                echo json_encode($response);
            } else {
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status500('Error al eliminar el pedido'));
            }
        } catch (\Exception $e) {
            error_log("PedidosController - remove: Error: " . $e->getMessage() . " - Traza: " . $e->getTraceAsString());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    // ===== ENDPOINTS PARA DETALLE DE PEDIDOS =====

    /**
     * Crear detalle de pedido (Sin autenticación - Testing)
     */
    public function crearDetalle(array $headers, int $idPedido, array $input): void
    {
        try {
            // Verificar que el pedido existe
            $pedido = $this->pedidosModel->getPedidoById($idPedido);
            if (!$pedido) {
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }

            $detalleData = [
                'producto_solicitado' => trim($input['producto_solicitado'] ?? ''),
                'precio_unitario' => (float)($input['precio_unitario'] ?? 0),
                'descuento' => (float)($input['descuento'] ?? 0),
                'impuesto' => (float)($input['impuesto'] ?? 0),
                'id_pedido' => $idPedido,
                'id_producto' => (int)($input['id_producto'] ?? 0),
                'cantidad' => (int)($input['cantidad'] ?? 0),
                'id_usuario' => (int)($input['id_usuario'] ?? 1) // Default usuario 1 si no se especifica
            ];

            // Validaciones básicas
            if (empty($detalleData['producto_solicitado']) || $detalleData['cantidad'] <= 0 || $detalleData['id_producto'] <= 0 || $detalleData['id_usuario'] <= 0) {
                echo json_encode(responseHTTP::status400('Datos de detalle inválidos (producto_solicitado, cantidad, id_producto, id_usuario son requeridos)'));
                return;
            }

            $success = $this->pedidosModel->createDetallePedido($detalleData);
            
            if ($success) {
                echo json_encode(responseHTTP::status200('Detalle de pedido creado exitosamente'));
            } else {
                echo json_encode(responseHTTP::status500('Error al crear el detalle del pedido'));
            }
        } catch (\Exception $e) {
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Obtener detalle específico (Sin autenticación - Testing)
     */
    public function obtenerDetalle(array $headers, int $idDetalle): void
    {
        try {
            error_log("PedidosController - obtenerDetalle: Buscando detalle con ID: " . $idDetalle);
            
            $detalle = $this->pedidosModel->getDetalleById($idDetalle);
            
            if (!$detalle) {
                error_log("PedidosController - obtenerDetalle: Detalle no encontrado con ID: " . $idDetalle);
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status404('Detalle de pedido no encontrado'));
                return;
            }
            
            error_log("PedidosController - obtenerDetalle: Detalle encontrado con ID: " . $idDetalle);
            
            // Corregimos el formato de respuesta para que sea consistente
            $response = responseHTTP::status200('Detalle de pedido obtenido correctamente');
            $response['data'] = $detalle;
            
            // Establecemos los headers adecuados
            header('Content-Type: application/json');
            
            // Devolvemos la respuesta
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("PedidosController - obtenerDetalle: Error: " . $e->getMessage() . " - Traza: " . $e->getTraceAsString());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Actualizar detalle de pedido (Sin autenticación - Testing)
     */
    public function actualizarDetalle(array $headers, int $idDetalle, array $input): void
    {
        try {
            // Verificar que el detalle existe
            $detalleExistente = $this->pedidosModel->getDetalleById($idDetalle);
            if (!$detalleExistente) {
                echo json_encode(responseHTTP::status404('Detalle de pedido no encontrado'));
                return;
            }

            $detalleData = [
                'producto_solicitado' => trim($input['producto_solicitado'] ?? $detalleExistente['producto_solicitado']),
                'cantidad_nueva' => (int)($input['cantidad_nueva'] ?? $detalleExistente['cantidad']),
                'precio_unitario_nuevo' => (float)($input['precio_unitario_nuevo'] ?? $detalleExistente['precio_unitario']),
                'descuento_nuevo' => (float)($input['descuento_nuevo'] ?? $detalleExistente['descuento']),
                'impuesto_nuevo' => (float)($input['impuesto_nuevo'] ?? $detalleExistente['impuesto']),
                'id_usuario' => (int)($input['id_usuario'] ?? 1) // Default usuario 1 si no se especifica
            ];

            if ($detalleData['id_usuario'] <= 0) {
                echo json_encode(responseHTTP::status400('ID de usuario requerido'));
                return;
            }

            $success = $this->pedidosModel->updateDetallePedido($idDetalle, $detalleData);
            
            if ($success) {
                echo json_encode(responseHTTP::status200('Detalle de pedido actualizado exitosamente'));
            } else {
                echo json_encode(responseHTTP::status500('Error al actualizar el detalle del pedido'));
            }
        } catch (\Exception $e) {
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Eliminar detalle de pedido (Sin autenticación - Testing)
     */
    public function eliminarDetalle(array $headers, int $idDetalle): void
    {
        try {
            $success = $this->pedidosModel->deleteDetallePedido($idDetalle);
            
            if ($success) {
                echo json_encode(responseHTTP::status200('Detalle de pedido eliminado exitosamente'));
            } else {
                echo json_encode(responseHTTP::status500('Error al eliminar el detalle del pedido'));
            }
        } catch (\Exception $e) {
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    // ===== MÉTODOS AUXILIARES =====

    /**
     * Obtener estados disponibles
     */
    public function getEstados(array $headers): void
    {
        error_log("PedidosController - getEstados: Iniciando obtención de estados");
        
        // Temporalmente deshabilitamos autenticación para testing
        // $auth = $this->authorize($headers, [1, 2]);
        // if (!$auth) return;

        try {
            $estados = $this->pedidosModel->getEstados();
            error_log("PedidosController - getEstados: Se encontraron " . count($estados) . " estados");
            
            // Corregimos el formato de respuesta para que sea consistente
            $response = responseHTTP::status200('Estados de pedido obtenidos correctamente');
            $response['data'] = $estados;
            
            // Establecemos los headers adecuados
            header('Content-Type: application/json');
            
            // Devolvemos la respuesta
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("PedidosController - getEstados: Error: " . $e->getMessage() . " - Traza: " . $e->getTraceAsString());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }
}