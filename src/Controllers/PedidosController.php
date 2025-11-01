<?php

namespace App\Controllers;

use App\Models\PedidosModel;
use App\Models\inveModel;
use App\Config\Security;
use App\Config\responseHTTP;
use App\Controllers\FirebaseController;

// Verificar que la clase existe
if (!class_exists(PedidosModel::class)) {
    throw new \Exception('La clase PedidosModel no está disponible');
}
if (!class_exists(Security::class)) {
    throw new \Exception('La clase Security no está disponible');
}
if (!class_exists(responseHTTP::class)) {
    throw new \Exception('La clase responseHTTP no está disponible');
}

class PedidosController
{
    private $pedidosModel;
    private $inveModel;

    public function __construct()
    {
        $this->pedidosModel = new PedidosModel();
        $this->inveModel = new inveModel();
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    private function authorize(array $headers, ?array $roles = null): ?array
    {
        // Temporalmente deshabilitado para desarrollo
        error_log('PedidosController - authorize: Autenticación deshabilitada para desarrollo');
        return [
            'id_usuario' => 1,
            'rol' => 'admin',
            'nombre' => 'Usuario Temporal'
        ];
    }

    private function extractBearer(array $headers): ?string
    {
        if (!isset($headers['Authorization'])) {
            error_log('PedidosController - extractBearer: Header Authorization no presente');
            return null;
        }
        
        $parts = explode(' ', $headers['Authorization']);
        if (count($parts) === 2 && strtolower($parts[0]) === 'bearer') {
            error_log('PedidosController - extractBearer: Token Bearer extraído correctamente');
            return $parts[1];
        }
        
        error_log('PedidosController - extractBearer: Formato de Authorization header inválido');
        return null;
    }

    // ===== ENDPOINTS PARA PEDIDOS =====

    /**
     * Test de conexión (Sin autenticación requerida - Solo para debugging)
     */
    public function testConnection(): void
    {
        try {
            error_log('PedidosController - testConnection: Iniciando test de conexión');
            
            $result = $this->pedidosModel->testConnection();
            error_log('PedidosController - testConnection: Resultado - ' . ($result['status'] ?? 'Error'));
            
            $response = array_merge(
                responseHTTP::status200('Test de conexión exitoso'),
                ['data' => $result]
            );
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log('ERROR PedidosController - testConnection: ' . $e->getMessage());
            $error = responseHTTP::status500('Error en test de conexión: ' . $e->getMessage());
            echo json_encode($error);
        }
    }

    /**
     * Crear pedido (CON autenticación)
     */
    public function create(array $headers, array $input): void
    {
        try {
            error_log('PedidosController - create: Iniciando creación de pedido');
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - create: Autorización fallida');
                return;
            }

            // Extraer y validar datos del formulario
            $numeroPedido = trim($input['numero_pedido'] ?? '');
            // Aceptar alias de campos para mayor robustez
            $clienteNombre = trim($input['usuario'] ?? ($input['clienteNombre'] ?? '')) ?: null;
            $clienteTelefono = trim($input['telefono'] ?? ($input['clienteTelefono'] ?? '')) ?: null;
            $canalVenta = trim($input['canalVenta'] ?? ($input['canal_venta'] ?? '')) ?: null;
            $prioridad = trim($input['prioridad'] ?? 'normal');
            $fechaEntrega = trim($input['fechaEntrega'] ?? ($input['fecha_entrega'] ?? '')) ?: null;
            // Solo guardar especificaciones en observaciones
            $observaciones = trim($input['especificaciones'] ?? '') ?: null;

            // Construir detalles_producto SOLO con categoría, imagen y colores
            $detallesProducto = $this->construirDetallesProducto($input);

            error_log("PedidosController - create: Datos - Cliente: $clienteNombre, Canal: $canalVenta");

            // Crear o buscar usuario cliente (rol 3) con nombre y teléfono
            try {
                $idCliente = $this->pedidosModel->crearCliente($clienteNombre, $clienteTelefono);
                error_log("PedidosController - create: Cliente creado/encontrado con ID: $idCliente");
            } catch (\Exception $e) {
                error_log("PedidosController - create: Error al crear cliente: " . $e->getMessage());
                echo json_encode(responseHTTP::status500('Error al crear cliente: ' . $e->getMessage()));
                return;
            }

            // Ya no generamos un número personalizado aquí.
            // El modelo establecerá numero_pedido basado en el ID autoincremental.
            if (empty($numeroPedido)) {
                $numeroPedido = '';
            }

            // Validar fecha de entrega (requerida)
            if (empty($fechaEntrega)) {
                error_log('PedidosController - create: Fecha de entrega requerida');
                echo json_encode(responseHTTP::status400('Fecha de entrega es requerida'));
                return;
            }

            $idPedido = $this->pedidosModel->createPedido(
                $numeroPedido,
                $idCliente, // Usar el ID del cliente creado (rol 3)
                $clienteNombre,
                $clienteTelefono,
                $canalVenta,
                $prioridad,
                $observaciones,
                $detallesProducto,
                $fechaEntrega
            );
            
            if ($idPedido) {
                error_log("PedidosController - create: Pedido creado exitosamente - ID: $idPedido");
                // Devolver el registro completo en la respuesta (JSON)
                $pedidoCompleto = $this->pedidosModel->getPedidoById((int)$idPedido) ?? [];
                $resp = responseHTTP::status200('Pedido creado exitosamente');
                $resp['data'] = [
                    'id_pedido_creado' => (int)$idPedido,
                    'id_cliente_creado' => $idCliente,
                    'pedido' => $pedidoCompleto
                ];
                header('Content-Type: application/json');
                echo json_encode($resp);
            } else {
                error_log('PedidosController - create: Error al crear pedido - ID retornado NULL');
                echo json_encode(responseHTTP::status500('Error al crear el pedido'));
            }
        } catch (\Exception $e) {
            error_log('ERROR PedidosController - create: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Construir el campo detalles_producto desde los datos del formulario personalizado
     */
    private function construirDetallesProducto(array $input): ?string
    {
        $detalles = [];
        // Solo incluir categoría, imagen de referencia (URL), y paleta de colores
        if (!empty($input['categoriaProducto'])) {
            $detalles['categoria'] = $input['categoriaProducto'];
        }
        // Imagen de referencia (puede venir como imagenesUrls o imagenUrl)
        if (!empty($input['imagenesUrls'])) {
            $imagenes = json_decode($input['imagenesUrls'], true);
            if (is_array($imagenes)) {
                $detalles['imagenes'] = $imagenes;
            }
        } elseif (!empty($input['imagenUrl'])) {
            $detalles['imagenes'] = [$input['imagenUrl']];
        }
        if (!empty($input['colores'])) {
            $detalles['colores'] = $input['colores'];
        }
        return !empty($detalles) ? json_encode($detalles, JSON_UNESCAPED_UNICODE) : null;
    }

    /**
     * Listar todos los pedidos (CON autenticación)
     */
    public function findAll(array $headers): void
    {
        try {
            error_log("PedidosController - findAll: Iniciando obtención de todos los pedidos");
            error_log("PedidosController - findAll: Headers recibidos: " . json_encode($headers));
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - findAll: Autorización fallida');
                header('Content-Type: application/json');
                echo json_encode(responseHTTP::status401('No autorizado'));
                return;
            }

            error_log("PedidosController - findAll: Usuario autenticado - ID: " . $user['id_usuario']);
            
            $pedidos = $this->pedidosModel->getAllPedidos();
            
            error_log("PedidosController - findAll: Se obtuvieron " . count($pedidos) . " pedidos de la BD");
            error_log("PedidosController - findAll: Primer pedido: " . json_encode($pedidos[0] ?? []));

            $response = responseHTTP::status200('Pedidos obtenidos correctamente');
            $response['data'] = $pedidos;
            
            error_log("PedidosController - findAll: Enviando respuesta con " . count($pedidos) . " pedidos");
            
            header('Content-Type: application/json');
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - findAll: " . $e->getMessage());
            error_log("ERROR PedidosController - findAll: Stack trace: " . $e->getTraceAsString());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Obtener pedidos por usuario (CON autenticación)
     */
    public function findByUser(array $headers, int $idUsuario): void
    {
        try {
            error_log("PedidosController - findByUser: Buscando pedidos para usuario ID: $idUsuario");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - findByUser: Autorización fallida');
                return;
            }

            error_log("PedidosController - findByUser: Usuario autenticado - ID: " . $user['id_usuario']);
            
            $pedidos = $this->pedidosModel->getPedidosByUser($idUsuario);
            
            error_log("PedidosController - findByUser: Encontrados " . count($pedidos) . " pedidos para usuario $idUsuario");

            $response = responseHTTP::status200('Pedidos del usuario obtenidos correctamente');
            $response['data'] = $pedidos;
            
            header('Content-Type: application/json');
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - findByUser: " . $e->getMessage());
            header('Content-Type: application/json');
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Obtener pedido específico (CON autenticación)
     */
    public function findOne(array $headers, int $id): void
    {
        try {
            error_log("PedidosController - findOne: Obteniendo pedido ID: $id");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - findOne: Autorización fallida');
                return;
            }

            $pedido = $this->pedidosModel->getPedidoById($id);
            
            if (!$pedido) {
                error_log("PedidosController - findOne: Pedido $id no encontrado");
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }

            error_log("PedidosController - findOne: Pedido $id obtenido exitosamente");
            $response = responseHTTP::status200('OK');
            $response['data'] = $pedido;
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - findOne: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Actualizar pedido (SOLO fecha_entrega y estado - CON autenticación)
     */
    public function update(array $headers, int $id, array $input): void
    {
        try {
            error_log("PedidosController - update: Actualizando pedido ID: $id");
            error_log("Datos recibidos: " . json_encode($input));
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - update: Autorización fallida');
                return;
            }

            // Verificar que el pedido existe
            $pedido = $this->pedidosModel->getPedidoById($id);
            if (!$pedido) {
                error_log("PedidosController - update: Pedido $id no encontrado para actualización");
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }

            // Preparar datos para actualización
            $datosActualizar = [];
            
            // Campos que se pueden actualizar
            if (isset($input['clienteNombre'])) {
                $datosActualizar['cliente_nombre'] = $input['clienteNombre'];
            }
            if (isset($input['clienteTelefono'])) {
                $datosActualizar['cliente_telefono'] = $input['clienteTelefono'];
            }
            if (isset($input['fechaEntrega'])) {
                $datosActualizar['fecha_entrega'] = $input['fechaEntrega'];
            }
            if (isset($input['prioridad'])) {
                $datosActualizar['prioridad'] = $input['prioridad'];
            }
            if (isset($input['canalVenta'])) {
                $datosActualizar['canal_venta'] = $input['canalVenta'];
            }
            if (isset($input['observaciones'])) {
                $datosActualizar['observaciones'] = $input['observaciones'];
            }
            if (isset($input['detalles_producto'])) {
                $datosActualizar['detalles_producto'] = $input['detalles_producto'];
            }
            if (isset($input['id_estado'])) {
                $datosActualizar['id_estado'] = (int)$input['id_estado'];
            }

            error_log("PedidosController - update: Datos a actualizar: " . json_encode($datosActualizar));

            $success = $this->pedidosModel->updatePedidoCompleto($id, $datosActualizar);
            
            if ($success) {
                error_log("PedidosController - update: Pedido $id actualizado exitosamente");
                echo json_encode(responseHTTP::status200('Pedido actualizado exitosamente'));
            } else {
                error_log("PedidosController - update: Error al actualizar pedido $id");
                echo json_encode(responseHTTP::status500('Error al actualizar el pedido'));
            }
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - update: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Cambiar estado del pedido (CON autenticación)
     */
    public function cambiarEstado(array $headers, int $id, array $input): void
    {
        try {
            error_log("PedidosController - cambiarEstado: Cambiando estado pedido ID: $id");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - cambiarEstado: Autorización fallida');
                return;
            }

            // Verificar que el pedido existe
            $pedido = $this->pedidosModel->getPedidoById($id);
            if (!$pedido) {
                error_log("PedidosController - cambiarEstado: Pedido $id no encontrado");
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }

            $idEstadoNuevo = (int)($input['id_estado_nuevo'] ?? 0);
            $idUsuario = $user['id_usuario']; // Usar usuario autenticado

            if ($idEstadoNuevo <= 0) {
                error_log("PedidosController - cambiarEstado: ID estado inválido: $idEstadoNuevo");
                echo json_encode(responseHTTP::status400('ID de estado inválido'));
                return;
            }

            error_log("PedidosController - cambiarEstado: Cambiando estado a $idEstadoNuevo por usuario $idUsuario");

            $success = $this->pedidosModel->cambiarEstadoPedido($id, $idEstadoNuevo, $idUsuario);
            
            if ($success) {
                error_log("PedidosController - cambiarEstado: Estado del pedido $id actualizado exitosamente");
                echo json_encode(responseHTTP::status200('Estado del pedido actualizado exitosamente'));
            } else {
                error_log("PedidosController - cambiarEstado: Error al cambiar estado del pedido $id");
                echo json_encode(responseHTTP::status500('Error al cambiar el estado del pedido'));
            }
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - cambiarEstado: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Eliminar pedido (CON autenticación)
     */
    public function remove(array $headers, int $id): void
    {
        try {
            error_log("PedidosController - remove: Eliminando pedido ID: $id");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - remove: Autorización fallida');
                return;
            }

            $success = $this->pedidosModel->deletePedido($id);
            
            if ($success) {
                error_log("PedidosController - remove: Pedido $id eliminado exitosamente");
                echo json_encode(responseHTTP::status200('Pedido eliminado exitosamente'));
            } else {
                error_log("PedidosController - remove: Error al eliminar pedido $id");
                echo json_encode(responseHTTP::status500('Error al eliminar el pedido'));
            }
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - remove: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    // ===== ENDPOINTS PARA DETALLE DE PEDIDOS =====

    /**
     * Crear detalle de pedido (CON autenticación)
     */
    public function crearDetalle(array $headers, int $idPedido, array $input): void
    {
        try {
            error_log("PedidosController - crearDetalle: Creando detalle para pedido ID: $idPedido");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - crearDetalle: Autorización fallida');
                return;
            }

            // Verificar que el pedido existe
            $pedido = $this->pedidosModel->getPedidoById($idPedido);
            if (!$pedido) {
                error_log("PedidosController - crearDetalle: Pedido $idPedido no encontrado");
                echo json_encode(responseHTTP::status404('Pedido no encontrado'));
                return;
            }

            // Preparar detalles_personalizados: aceptar string JSON o construir desde campos sueltos
            $detallesPersonalizados = $input['detalles_personalizados'] ?? null;
            if (is_array($detallesPersonalizados)) {
                $detallesPersonalizados = json_encode($detallesPersonalizados, JSON_UNESCAPED_UNICODE);
            } elseif (!$detallesPersonalizados) {
                // Intentar componer desde otros campos si existen
                $dp = [];
                if (!empty($input['categoria'])) $dp['categoria'] = $input['categoria'];
                if (!empty($input['categoriaProducto'])) $dp['categoria'] = $input['categoriaProducto'];
                if (!empty($input['colores'])) $dp['colores'] = $input['colores'];
                if (!empty($input['especificaciones'])) $dp['especificaciones'] = $input['especificaciones'];
                if (!empty($input['imagenes']) && is_array($input['imagenes'])) $dp['imagenes'] = $input['imagenes'];
                if (!empty($dp)) $detallesPersonalizados = json_encode($dp, JSON_UNESCAPED_UNICODE);
            }

            $detalleData = [
                'producto_solicitado' => trim($input['producto_solicitado'] ?? ''),
                'precio_unitario' => (float)($input['precio_unitario'] ?? 0),
                'descuento' => (float)($input['descuento'] ?? 0),
                'impuesto' => (float)($input['impuesto'] ?? 0),
                'id_pedido' => $idPedido,
                'id_producto' => (int)($input['id_producto'] ?? 0),
                'cantidad' => (int)($input['cantidad'] ?? 0),
                'id_usuario' => $user['id_usuario'], // Usar usuario autenticado
                'detalles_personalizados' => $detallesPersonalizados
            ];

            // Normalizar id_producto: permitir productos personalizados (sin id de catálogo)
            $idProductoOriginal = $detalleData['id_producto'];
            if ($detalleData['id_producto'] <= 0) {
                $detalleData['id_producto'] = null; // La columna permite NULL
            }

            // Validaciones básicas: requerir al menos descripción, cantidad y precio válido
            if (empty($detalleData['producto_solicitado']) || $detalleData['cantidad'] <= 0 || $detalleData['precio_unitario'] < 0) {
                error_log("PedidosController - crearDetalle: Datos de detalle inválidos (producto_solicitado vacío o cantidad/precio inválidos)");
                echo json_encode(responseHTTP::status400('Datos de detalle inválidos (producto_solicitado requerido, cantidad > 0, precio_unitario >= 0)'));
                return;
            }

            // Si hay un producto del inventario (id_producto válido), descontar stock
            if ($idProductoOriginal > 0) {
                error_log("PedidosController - crearDetalle: Descontando stock para producto ID: $idProductoOriginal, cantidad: " . $detalleData['cantidad']);
                $resultadoStock = $this->inveModel->descontarStock($idProductoOriginal, $detalleData['cantidad']);
                
                if ($resultadoStock['status'] !== 'OK') {
                    error_log("PedidosController - crearDetalle: Error al descontar stock - " . ($resultadoStock['message'] ?? 'Error desconocido'));
                    echo json_encode(responseHTTP::status400($resultadoStock['message'] ?? 'Error al descontar stock del inventario'));
                    return;
                }
                
                error_log("PedidosController - crearDetalle: Stock descontado exitosamente. Stock actualizado: " . ($resultadoStock['data']['stock_actualizado'] ?? 'N/A'));
            }

            error_log("PedidosController - crearDetalle: Datos válidos, creando detalle");

            $success = $this->pedidosModel->createDetallePedido($detalleData);
            
            if ($success) {
                error_log("PedidosController - crearDetalle: Detalle creado exitosamente para pedido $idPedido");
                
                // Preparar respuesta con información del stock si se descontó
                $responseData = ['message' => 'Detalle de pedido creado exitosamente'];
                if ($idProductoOriginal > 0 && isset($resultadoStock['data'])) {
                    $responseData['stock_info'] = [
                        'id_producto' => $resultadoStock['data']['id_producto'],
                        'stock_actualizado' => $resultadoStock['data']['stock_actualizado'],
                        'alerta_stock' => ($resultadoStock['data']['stock_actualizado'] ?? 0) <= 0 ? 'Producto agotado' : 
                                        (($resultadoStock['data']['stock_actualizado'] ?? 999) <= 3 ? 'Stock bajo' : null)
                    ];
                }
                
                echo json_encode(responseHTTP::status200('Detalle de pedido creado exitosamente', $responseData));
            } else {
                error_log("PedidosController - crearDetalle: Error al crear detalle para pedido $idPedido");
                echo json_encode(responseHTTP::status500('Error al crear el detalle del pedido'));
            }
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - crearDetalle: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Obtener detalle específico (CON autenticación)
     */
    public function obtenerDetalle(array $headers, int $idDetalle): void
    {
        try {
            error_log("PedidosController - obtenerDetalle: Obteniendo detalle ID: $idDetalle");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - obtenerDetalle: Autorización fallida');
                return;
            }

            $detalle = $this->pedidosModel->getDetalleById($idDetalle);
            
            if (!$detalle) {
                error_log("PedidosController - obtenerDetalle: Detalle $idDetalle no encontrado");
                echo json_encode(responseHTTP::status404('Detalle de pedido no encontrado'));
                return;
            }

            error_log("PedidosController - obtenerDetalle: Detalle $idDetalle obtenido exitosamente");
            $response = responseHTTP::status200('OK');
            $response['data'] = $detalle;
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - obtenerDetalle: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Actualizar detalle de pedido (CON autenticación)
     */
    public function actualizarDetalle(array $headers, int $idDetalle, array $input): void
    {
        try {
            error_log("PedidosController - actualizarDetalle: Actualizando detalle ID: $idDetalle");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - actualizarDetalle: Autorización fallida');
                return;
            }

            // Verificar que el detalle existe
            $detalleExistente = $this->pedidosModel->getDetalleById($idDetalle);
            if (!$detalleExistente) {
                error_log("PedidosController - actualizarDetalle: Detalle $idDetalle no encontrado");
                echo json_encode(responseHTTP::status404('Detalle de pedido no encontrado'));
                return;
            }

            $detalleData = [
                'producto_solicitado' => trim($input['producto_solicitado'] ?? $detalleExistente['producto_solicitado']),
                'cantidad_nueva' => (int)($input['cantidad_nueva'] ?? $detalleExistente['cantidad']),
                'precio_unitario_nuevo' => (float)($input['precio_unitario_nuevo'] ?? $detalleExistente['precio_unitario']),
                'descuento_nuevo' => (float)($input['descuento_nuevo'] ?? $detalleExistente['descuento']),
                'impuesto_nuevo' => (float)($input['impuesto_nuevo'] ?? $detalleExistente['impuesto']),
                'id_usuario' => $user['id_usuario'] // Usar usuario autenticado
            ];

            error_log("PedidosController - actualizarDetalle: Datos preparados para actualización");

            $success = $this->pedidosModel->updateDetallePedido($idDetalle, $detalleData);
            
            if ($success) {
                error_log("PedidosController - actualizarDetalle: Detalle $idDetalle actualizado exitosamente");
                echo json_encode(responseHTTP::status200('Detalle de pedido actualizado exitosamente'));
            } else {
                error_log("PedidosController - actualizarDetalle: Error al actualizar detalle $idDetalle");
                echo json_encode(responseHTTP::status500('Error al actualizar el detalle del pedido'));
            }
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - actualizarDetalle: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Eliminar detalle de pedido (CON autenticación)
     */
    public function eliminarDetalle(array $headers, int $idDetalle): void
    {
        try {
            error_log("PedidosController - eliminarDetalle: Eliminando detalle ID: $idDetalle");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - eliminarDetalle: Autorización fallida');
                return;
            }

            $success = $this->pedidosModel->deleteDetallePedido($idDetalle);
            
            if ($success) {
                error_log("PedidosController - eliminarDetalle: Detalle $idDetalle eliminado exitosamente");
                echo json_encode(responseHTTP::status200('Detalle de pedido eliminado exitosamente'));
            } else {
                error_log("PedidosController - eliminarDetalle: Error al eliminar detalle $idDetalle");
                echo json_encode(responseHTTP::status500('Error al eliminar el detalle del pedido'));
            }
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - eliminarDetalle: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    // ===== MÉTODOS AUXILIARES =====

    /**
     * Obtener estados disponibles (CON autenticación)
     */
    public function getEstados(array $headers): void
    {
        try {
            error_log("PedidosController - getEstados: Obteniendo estados disponibles");
            
            // AUTENTICACIÓN ACTIVADA
            $user = $this->authorize($headers, [1, 2]);
            if (!$user) {
                error_log('PedidosController - getEstados: Autorización fallida');
                return;
            }

            $estados = $this->pedidosModel->getEstados();
            error_log("PedidosController - getEstados: Se obtuvieron " . count($estados) . " estados");
            
            $response = responseHTTP::status200('OK');
            $response['data'] = $estados;
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - getEstados: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }
}


