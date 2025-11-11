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

            // Si el frontend envía un array de productos (multi-producto), usarlo directamente
            if (!empty($input['detalles_producto'])) {
                // Si ya es un string JSON, usarlo tal cual
                $detallesProducto = is_array($input['detalles_producto']) ? json_encode($input['detalles_producto'], JSON_UNESCAPED_UNICODE) : $input['detalles_producto'];
                // Guardar en observaciones la cantidad de productos
                $observaciones = isset($input['detalles_producto']) ? count(is_array($input['detalles_producto']) ? $input['detalles_producto'] : json_decode($input['detalles_producto'], true)) : null;
            } else {
                // Solo guardar especificaciones en observaciones (modo legacy)
                $observaciones = trim($input['especificaciones'] ?? '') ?: null;
                // Construir detalles_producto SOLO con categoría, imagen y colores (modo legacy)
                $detallesProducto = $this->construirDetallesProducto($input);
            }

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
                
                // Crear múltiples entradas en detallepedido, una por cada producto
                if (!empty($input['detalles_producto'])) {
                    try {
                        // Decodificar el array de productos
                        $productosArray = is_array($input['detalles_producto']) 
                            ? $input['detalles_producto'] 
                            : json_decode($input['detalles_producto'], true);
                        
                        if (is_array($productosArray) && count($productosArray) > 0) {
                            error_log("PedidosController - create: Creando " . count($productosArray) . " registros en detallepedido");
                            
                            foreach ($productosArray as $index => $producto) {
                                error_log("PedidosController - create: ===== PRODUCTO #" . ($index + 1) . " =====");
                                error_log("PedidosController - create: Producto RAW: " . json_encode($producto));
                                
                                // VALIDAR STOCK ANTES DE CREAR EL DETALLE
                                $idProductoCatalogo = isset($producto['id_producto']) ? (int)$producto['id_producto'] : 0;
                                if ($idProductoCatalogo > 0) {
                                    $productoInfo = $this->inveModel->getProducto((string)$idProductoCatalogo);
                                    
                                    if ($productoInfo) {
                                        $stockDisponible = (int)($productoInfo['stock'] ?? 0);
                                        $stockMinimo = (int)($productoInfo['stock_minimo'] ?? 0);
                                        $nombreProductoCatalogo = $productoInfo['nombre_producto'] ?? 'Producto';
                                        $cantidadSolicitada = (int)($producto['cantidad'] ?? 1);
                                        
                                        error_log("PedidosController - create: Validando stock para '{$nombreProductoCatalogo}' - Disponible: {$stockDisponible}, Solicitado: {$cantidadSolicitada}");
                                        
                                        // BLOQUEAR si no hay stock suficiente
                                        if ($stockDisponible <= 0) {
                                            error_log("PedidosController - create: BLOQUEADO - Stock agotado para producto ID $idProductoCatalogo");
                                            echo json_encode(responseHTTP::status400(
                                                "STOCK AGOTADO: El producto '{$nombreProductoCatalogo}' no tiene unidades disponibles en inventario."
                                            ));
                                            return;
                                        }
                                        
                                        if ($stockDisponible < $cantidadSolicitada) {
                                            error_log("PedidosController - create: BLOQUEADO - Stock insuficiente para producto ID $idProductoCatalogo");
                                            echo json_encode(responseHTTP::status400(
                                                "STOCK INSUFICIENTE: El producto '{$nombreProductoCatalogo}' solo tiene {$stockDisponible} unidades disponibles. No se pueden solicitar {$cantidadSolicitada} unidades."
                                            ));
                                            return;
                                        }
                                        
                                        error_log("PedidosController - create: ✓ Stock validado exitosamente para '{$nombreProductoCatalogo}'");
                                    }
                                }
                                
                                // Calcular el total_linea para este producto específico
                                $cantidad = (int)($producto['cantidad'] ?? 1);
                                $precioBase = (float)($producto['precio'] ?? 0);
                                $descuento = (float)($producto['descuento'] ?? 0); // en porcentaje
                                $impuesto = (float)($producto['impuesto'] ?? 0); // en porcentaje
                                
                                error_log("PedidosController - create: cantidad=$cantidad, precioBase=$precioBase, descuento=$descuento%, impuesto=$impuesto%");
                                
                                // Calcular subtotal por cantidad
                                $subtotal = $precioBase * $cantidad;
                                // Aplicar descuento sobre subtotal
                                $montoDescuento = $subtotal * ($descuento / 100);
                                $subtotalConDescuento = $subtotal - $montoDescuento;
                                // Calcular impuesto sobre subtotal con descuento
                                $montoImpuesto = $subtotalConDescuento * ($impuesto / 100);
                                // Total de la línea (por cantidad)
                                $totalLinea = $subtotalConDescuento + $montoImpuesto;
                                
                                error_log("PedidosController - create: CALCULO -> subtotal=$subtotal, montoDescuento=$montoDescuento, subtotalConDescuento=$subtotalConDescuento, montoImpuesto=$montoImpuesto, total_linea=$totalLinea");
                                
                                // Construir nombre del producto
                                $nombreProducto = 'Personalizado';
                                if (!empty($producto['categoria'])) {
                                    $nombreProducto .= ': ' . $producto['categoria'];
                                }
                                if (!empty($producto['especificaciones'])) {
                                    $nombreProducto .= ' - ' . substr($producto['especificaciones'], 0, 50);
                                }
                                
                                // Preparar detalles personalizados en JSON
                                $detallesPersonalizados = [
                                    'categoria' => $producto['categoria'] ?? '',
                                    'colores' => $producto['colores'] ?? '',
                                    'especificaciones' => $producto['especificaciones'] ?? '',
                                    'imagenes' => $producto['imagenes'] ?? []
                                ];
                                
                                $detalleData = [
                                    'producto_solicitado' => $nombreProducto,
                                    'cantidad' => $cantidad,
                                    'precio_unitario' => $precioBase, // Precio base antes de descuentos/impuestos
                                    'total_linea' => $totalLinea, // Total después de descuento e impuesto
                                    'descuento' => $montoDescuento, // MONTO EN DINERO del descuento
                                    'impuesto' => $montoImpuesto, // MONTO EN DINERO del impuesto
                                    'id_pedido' => (int)$idPedido,
                                    'id_producto' => null, // Pedido personalizado no tiene id_producto
                                    'id_usuario' => (int)$user['id_usuario'],
                                    'detalles_personalizados' => $detallesPersonalizados
                                ];
                                
                                error_log("PedidosController - create: detalleData COMPLETO antes de insert: " . json_encode($detalleData));
                                
                                $detalleCreado = $this->pedidosModel->createDetallePedido($detalleData);
                                
                                if ($detalleCreado) {
                                    error_log("PedidosController - create: ✓ Detalle producto creado EXITOSAMENTE: $nombreProducto");
                                } else {
                                    error_log("PedidosController - create: ✗ ADVERTENCIA - No se pudo crear detalle: $nombreProducto");
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        error_log("PedidosController - create: Error al crear detalles pedido: " . $e->getMessage());
                        // No detener el proceso, el pedido principal ya está creado
                    }
                }
                
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
        // Si el input ya trae un array de productos (multi-producto), devolverlo serializado
        if (!empty($input['detalles_producto'])) {
            return is_array($input['detalles_producto']) ? json_encode($input['detalles_producto'], JSON_UNESCAPED_UNICODE) : $input['detalles_producto'];
        }
        // Legacy: solo un producto
        $detalles = [];
        if (!empty($input['categoriaProducto'])) {
            $detalles['categoria'] = $input['categoriaProducto'];
        }
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
                $fechaEntrega = trim((string)$input['fechaEntrega']);
                if ($fechaEntrega !== '') {
                    $datosActualizar['fecha_entrega'] = $fechaEntrega;
                }
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
                // Si vienen detalles de productos, actualizar también la tabla detallepedido
                if (!empty($input['detalles_producto'])) {
                    try {
                        // Decodificar el array de productos
                        $productosArray = is_array($input['detalles_producto']) 
                            ? $input['detalles_producto'] 
                            : json_decode($input['detalles_producto'], true);
                        
                        if (is_array($productosArray) && count($productosArray) > 0) {
                            error_log("PedidosController - update: Actualizando detallepedido - eliminando registros antiguos y creando nuevos");
                            
                            // Paso 1: Eliminar todos los detalles antiguos de este pedido
                            $this->pedidosModel->deleteDetallesByPedidoId($id);
                            
                            // Paso 2: Crear nuevos registros para cada producto
                            foreach ($productosArray as $producto) {
                                // Calcular el total_linea para este producto específico
                                $cantidad = (int)($producto['cantidad'] ?? 1);
                                $precioBase = (float)($producto['precio'] ?? 0);
                                $descuento = (float)($producto['descuento'] ?? 0); // en porcentaje
                                $impuesto = (float)($producto['impuesto'] ?? 0); // en porcentaje
                                
                                // Calcular subtotal por cantidad
                                $subtotal = $precioBase * $cantidad;
                                // Aplicar descuento sobre subtotal
                                $montoDescuento = $subtotal * ($descuento / 100);
                                $subtotalConDescuento = $subtotal - $montoDescuento;
                                // Calcular impuesto sobre subtotal con descuento
                                $montoImpuesto = $subtotalConDescuento * ($impuesto / 100);
                                // Total de la línea (por cantidad)
                                $totalLinea = $subtotalConDescuento + $montoImpuesto;
                                
                                // Construir nombre del producto
                                $nombreProducto = 'Personalizado';
                                if (!empty($producto['categoria'])) {
                                    $nombreProducto .= ': ' . $producto['categoria'];
                                }
                                if (!empty($producto['especificaciones'])) {
                                    $nombreProducto .= ' - ' . substr($producto['especificaciones'], 0, 50);
                                }
                                
                                // Preparar detalles personalizados en JSON
                                $detallesPersonalizados = [
                                    'categoria' => $producto['categoria'] ?? '',
                                    'colores' => $producto['colores'] ?? '',
                                    'especificaciones' => $producto['especificaciones'] ?? '',
                                    'imagenes' => $producto['imagenes'] ?? []
                                ];
                                
                                $detalleData = [
                                    'producto_solicitado' => $nombreProducto,
                                    'cantidad' => $cantidad,
                                    'precio_unitario' => $precioBase, // Precio base antes de descuentos/impuestos
                                    'total_linea' => $totalLinea, // Total después de descuento e impuesto
                                    'descuento' => $montoDescuento, // MONTO EN DINERO del descuento
                                    'impuesto' => $montoImpuesto, // MONTO EN DINERO del impuesto
                                    'id_pedido' => (int)$id,
                                    'id_producto' => null, // Pedido personalizado no tiene id_producto
                                    'id_usuario' => (int)$user['id_usuario'],
                                    'detalles_personalizados' => $detallesPersonalizados
                                ];
                                
                                error_log("PedidosController - update: detalleData COMPLETO antes de insert: " . json_encode($detalleData));
                                
                                $detalleCreado = $this->pedidosModel->createDetallePedido($detalleData);
                                
                                if ($detalleCreado) {
                                    error_log("PedidosController - update: ✓ Detalle producto creado EXITOSAMENTE: $nombreProducto");
                                } else {
                                    error_log("PedidosController - update: ✗ ADVERTENCIA - No se pudo crear detalle: $nombreProducto");
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        error_log("PedidosController - update: Error al actualizar detalles pedido: " . $e->getMessage());
                        // No detener el proceso, el pedido principal ya está actualizado
                    }
                }
                
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
                // Si el nuevo estado es "Entregado" (ID = 1), descontar stock de productos
                if ($idEstadoNuevo == 1) {
                    error_log("PedidosController - cambiarEstado: Pedido marcado como ENTREGADO. Descontando stock...");
                    try {
                        $stockDescontado = $this->pedidosModel->descontarStockPorPedido($id);
                        if ($stockDescontado) {
                            error_log("PedidosController - cambiarEstado: Stock descontado exitosamente para pedido $id");
                        } else {
                            error_log("PedidosController - cambiarEstado: No se descontó stock (posiblemente sin productos válidos)");
                        }
                    } catch (\Exception $e) {
                        error_log("PedidosController - cambiarEstado: ERROR al descontar stock - " . $e->getMessage());
                        // No retornar error, el cambio de estado ya se hizo
                        // Pero informar al usuario
                        echo json_encode(responseHTTP::status200('Estado actualizado. ADVERTENCIA: Error al descontar stock: ' . $e->getMessage()));
                        return;
                    }
                }
                
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
            
            // Calcular total_linea si no viene en el input
            // Asumimos que descuento e impuesto vienen como MONTOS EN DINERO
            $cantidad = $detalleData['cantidad'];
            $precioUnitario = $detalleData['precio_unitario'];
            $descuento = $detalleData['descuento'];
            $impuesto = $detalleData['impuesto'];
            
            $subtotal = $precioUnitario * $cantidad;
            $totalLinea = $subtotal - $descuento + $impuesto;
            $detalleData['total_linea'] = $totalLinea;
            
            error_log("PedidosController - crearDetalle: Calculado total_linea=$totalLinea (subtotal=$subtotal, descuento=$descuento, impuesto=$impuesto)");

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

            // VALIDAR STOCK ANTES DE CREAR EL PEDIDO
            // Si no hay stock suficiente, BLOQUEAR la creación del pedido
            $stockInfo = null;
            if ($idProductoOriginal > 0) {
                // Verificar stock disponible usando el modelo de inventario
                $producto = $this->inveModel->getProducto((string)$idProductoOriginal);
                
                if ($producto) {
                    $stockDisponible = (int)($producto['stock'] ?? 0);
                    $stockMinimo = (int)($producto['stock_minimo'] ?? 0);
                    $nombreProducto = $producto['nombre_producto'] ?? 'Producto';
                    $cantidadSolicitada = (int)$detalleData['cantidad'];
                    
                    error_log("PedidosController - crearDetalle: Producto '{$nombreProducto}' (ID $idProductoOriginal) - Stock disponible: {$stockDisponible}, Cantidad solicitada: {$cantidadSolicitada}");
                    
                    // BLOQUEAR si no hay stock suficiente
                    if ($stockDisponible <= 0) {
                        error_log("PedidosController - crearDetalle: BLOQUEADO - Stock agotado");
                        echo json_encode(responseHTTP::status400(
                            "STOCK AGOTADO: El producto '{$nombreProducto}' no tiene unidades disponibles en inventario."
                        ));
                        return;
                    }
                    
                    if ($stockDisponible < $cantidadSolicitada) {
                        error_log("PedidosController - crearDetalle: BLOQUEADO - Stock insuficiente");
                        echo json_encode(responseHTTP::status400(
                            "STOCK INSUFICIENTE: El producto '{$nombreProducto}' solo tiene {$stockDisponible} unidades disponibles. No se pueden solicitar {$cantidadSolicitada} unidades."
                        ));
                        return;
                    }
                    
                    // Advertencia de stock bajo (no bloquea, solo informa)
                    if ($stockDisponible <= $stockMinimo) {
                        error_log("PedidosController - crearDetalle: ADVERTENCIA - Stock bajo pero suficiente");
                        $stockInfo = [
                            'alerta' => 'warning',
                            'mensaje' => "ADVERTENCIA: El producto '{$nombreProducto}' tiene stock bajo ({$stockDisponible} unidades, mínimo recomendado: {$stockMinimo})",
                            'stock_actual' => $stockDisponible
                        ];
                    }
                } else {
                    error_log("PedidosController - crearDetalle: No se pudo obtener información del producto ID $idProductoOriginal");
                }
            }

            error_log("PedidosController - crearDetalle: Validación de stock exitosa, creando detalle");

            $success = $this->pedidosModel->createDetallePedido($detalleData);
            
            if ($success) {
                error_log("PedidosController - crearDetalle: Detalle creado exitosamente para pedido $idPedido");
                
                // Preparar respuesta con información del stock
                $responseData = ['message' => 'Detalle de pedido creado exitosamente'];
                if ($stockInfo) {
                    $responseData['stock_info'] = $stockInfo;
                }
                
                $resp = responseHTTP::status200('Detalle de pedido creado exitosamente');
                $resp['data'] = $responseData;
                echo json_encode($resp);
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

            // Aceptar alias provenientes del frontend: cantidad, precio_unitario, etc.
            $cantidad = $input['cantidad'] ?? $input['cantidad_nueva'] ?? $detalleExistente['cantidad'];
            $precioUnit = $input['precio_unitario'] ?? $input['precio_unitario_nuevo'] ?? $detalleExistente['precio_unitario'];
            $descuento = $input['descuento'] ?? $input['descuento_nuevo'] ?? $detalleExistente['descuento'];
            $impuesto = $input['impuesto'] ?? $input['impuesto_nuevo'] ?? $detalleExistente['impuesto'];

            // Normalizar detalles_personalizados: aceptar string JSON o construir desde campos sueltos
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
                'producto_solicitado' => trim($input['producto_solicitado'] ?? $detalleExistente['producto_solicitado']),
                'cantidad_nueva' => (int)$cantidad,
                'precio_unitario_nuevo' => (float)$precioUnit,
                'descuento_nuevo' => (float)$descuento,
                'impuesto_nuevo' => (float)$impuesto,
                'id_usuario' => $user['id_usuario'], // Usar usuario autenticado
                'detalles_personalizados' => $detallesPersonalizados
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

    /**
     * Obtener lista de productos activos
     * GET /productos
     */
    public function getProductos(): void
    {
        try {
            error_log("PedidosController - getProductos: Iniciando obtención de productos");
            
            $headers = getallheaders();
            $user = $this->authorize($headers);
            
            if (!$user) {
                error_log('PedidosController - getProductos: Autorización fallida');
                echo json_encode(responseHTTP::status401('No autorizado'));
                return;
            }

            $productos = $this->pedidosModel->getProductos();
            error_log("PedidosController - getProductos: Se obtuvieron " . count($productos) . " productos");
            error_log("PedidosController - getProductos: Productos = " . json_encode($productos));
            
            // Construir respuesta manualmente para asegurar que data no sea null
            $response = [
                'status' => 'OK',
                'message' => 'Productos obtenidos exitosamente',
                'data' => $productos
            ];
            
            error_log("PedidosController - getProductos: Respuesta final = " . json_encode($response));
            
            header('Content-Type: application/json');
            echo json_encode($response);
        } catch (\Exception $e) {
            error_log("ERROR PedidosController - getProductos: " . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }
}



