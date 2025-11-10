<?php

namespace App\Controllers;

use App\Models\inveModel;
use App\Config\Security;
use App\Config\responseHTTP;
use App\Controllers\FirebaseController;

class inveController
{
    private $inveModel;

    public function __construct()
    {
        $this->inveModel = new inveModel();
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    private function authorize(array $headers, ?array $roles = null): ?array
    {
        error_log('inveController - authorize: Iniciando autorización');
        error_log('inveController - Headers recibidos: ' . json_encode($headers));
        
        // 1) Intentar Firebase ID Token primero (más común en este sistema)
        $fb = new FirebaseController();
        $idToken = $this->extractBearer($headers);
        error_log('inveController - Firebase token extraído: ' . ($idToken ? 'Presente' : 'No presente'));
        
        if ($idToken) {
            $claims = $fb->verifyIdToken($idToken);
            error_log('inveController - Firebase claims: ' . json_encode($claims));
            if ($claims) {
                // Mapear a usuario real de BD si existe por correo
                $correo = $claims['email'] ?? null;
                $nombre = $claims['name'] ?? ($claims['email'] ?? 'FirebaseUser');
                $userModel = new \App\Models\UserModel();
                $row = $correo ? $userModel->getUserByEmailOrPhone($correo) : null;
                
                if ($row) {
                    $user = [
                        'id_usuario' => (int)$row['id_usuario'],
                        'nombre_usuario' => $row['nombre_usuario'],
                        'id_rol' => (int)$row['id_rol'],
                        'email' => $row['correo']
                    ];
                    error_log('inveController - Usuario encontrado en BD: ' . json_encode($user));
                } else {
                    error_log('inveController - Usuario no encontrado en BD, usando claims de Firebase');
                    // Usar datos de Firebase como fallback
                    $user = [
                        'id_usuario' => $claims['user_id'] ?? ($claims['sub'] ?? 0),
                        'nombre_usuario' => $nombre,
                        'id_rol' => 2, // Usuario común por defecto
                        'email' => $correo
                    ];
                }
            } else {
                error_log('inveController - Token Firebase expirado o inválido');
            }
        }

        // 2) Intentar JWT local si no hay Firebase válido
        if (!isset($user)) {
            try {
                error_log('inveController - Intentando validar JWT local');
                // Solo intentar JWT local si el token no parece ser de Firebase
                $token = $this->extractBearer($headers);
                if ($token && !str_contains($token, 'eyJhbGciOiJSUzI1NiIs')) {
                    $tokenData = Security::validateTokenJwt($headers, Security::secretKey());
                    $data = json_decode(json_encode($tokenData), true);
                    $user = $data['data'] ?? null;
                    error_log('inveController - JWT válido, usuario: ' . json_encode($user));
                } else {
                    error_log('inveController - Token parece ser de Firebase, saltando validación JWT local');
                    $user = null;
                }
            } catch (\Throwable $e) {
                error_log('inveController - JWT inválido: ' . $e->getMessage());
                $user = null;
            }
        }

        if (!$user) {
            error_log('inveController - No se pudo obtener usuario válido');
            echo json_encode(responseHTTP::status401('No tiene privilegios para acceder al recurso! Token invalido o ha expirado'));
            return null;
        }
        
        error_log('inveController - Usuario autorizado: ' . json_encode($user));
        error_log('inveController - Roles requeridos: ' . json_encode($roles));
        error_log('inveController - Rol del usuario: ' . $user['id_rol']);
        
        if ($roles && !in_array((int)$user['id_rol'], $roles)) {
            error_log('inveController - Usuario no tiene permisos para esta acción');
            echo json_encode(responseHTTP::status401('No tiene privilegios para acceder al recurso!'));
            return null;
        }
        
        error_log('inveController - Autorización exitosa');
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

    /**
     * Valida los datos de entrada para crear un producto
     * 
     * @param array $input Datos de entrada
     * @return array Array con errores de validación o null si es válido
     */
    private function validateProductData(array $input): ?array
    {
        $errors = [];

        // Validar id_categoria
        if (!isset($input['id_categoria']) || !is_numeric($input['id_categoria']) || (int)$input['id_categoria'] <= 0) {
            $errors[] = 'El ID de categoría es requerido y debe ser un número positivo';
        }

        // Validar id_proveedor
        if (!isset($input['id_proveedor']) || !is_numeric($input['id_proveedor']) || (int)$input['id_proveedor'] <= 0) {
            $errors[] = 'El ID de proveedor es requerido y debe ser un número positivo';
        }

        // Validar sku
        if (!isset($input['sku']) || empty(trim($input['sku']))) {
            $errors[] = 'El SKU es requerido';
        } elseif (strlen(trim($input['sku'])) > 50) {
            $errors[] = 'El SKU no puede exceder 50 caracteres';
        }

        // Validar nombre_producto
        if (!isset($input['nombre_producto']) || empty(trim($input['nombre_producto']))) {
            $errors[] = 'El nombre del producto es requerido';
        } elseif (strlen(trim($input['nombre_producto'])) > 255) {
            $errors[] = 'El nombre del producto no puede exceder 255 caracteres';
        }

        // NOTA: El campo activo no se valida porque los productos nuevos siempre se crean como activos (activo = 1)
        // No es necesario que el usuario lo seleccione en el formulario

        // Validar stock
        if (!isset($input['stock']) || !is_numeric($input['stock']) || (int)$input['stock'] < 0) {
            $errors[] = 'El stock debe ser un número mayor o igual a 0';
        }

        // Validar stock_minimo
        if (!isset($input['stock_minimo']) || !is_numeric($input['stock_minimo']) || (int)$input['stock_minimo'] < 0) {
            $errors[] = 'El stock mínimo debe ser un número mayor o igual a 0';
        }

        // Validar costo_unitario
        if (!isset($input['costo_unitario']) || !is_numeric($input['costo_unitario']) || (float)$input['costo_unitario'] < 0) {
            $errors[] = 'El costo unitario debe ser un número mayor o igual a 0';
        }

        // Validar precio_venta_base
        if (!isset($input['precio_venta_base']) || !is_numeric($input['precio_venta_base']) || (float)$input['precio_venta_base'] < 0) {
            $errors[] = 'El precio de venta base debe ser un número mayor o igual a 0';
        }

        // Validar fecha_registro
        if (!isset($input['fecha_registro']) || empty(trim($input['fecha_registro']))) {
            $errors[] = 'La fecha de registro es requerida';
        } else {
            $fecha = \DateTime::createFromFormat('Y-m-d H:i:s', $input['fecha_registro']);
            if (!$fecha || $fecha->format('Y-m-d H:i:s') !== $input['fecha_registro']) {
                $errors[] = 'La fecha de registro debe tener el formato Y-m-d H:i:s';
            }
        }

        return empty($errors) ? null : $errors;
    }

    /**
     * Agrega un nuevo producto al inventario
     * 
     * @param array $headers Headers de la petición
     * @param array $input Datos del producto a crear
     * @return void
     */
    public function addProduct(array $headers, array $input): void
    {
        // Autorización: administradores (1) y operadores (2) pueden crear productos
        $auth = $this->authorize($headers, [1, 2]);
        if (!$auth) return;

        error_log('inveController - addProduct: Iniciando creación de producto');
        error_log('inveController - addProduct: Datos recibidos: ' . json_encode($input));

        // Validar datos de entrada
        $validationErrors = $this->validateProductData($input);
        if ($validationErrors) {
            error_log('inveController - addProduct: Errores de validación: ' . json_encode($validationErrors));
            http_response_code(400);
            $response = [
                'status' => 'ERROR',
                'message' => 'Datos de entrada inválidos',
                'errors' => $validationErrors
            ];
            echo json_encode($response);
            return;
        }

        try {
            // Extraer y limpiar datos
            $idCategoria = (int)$input['id_categoria'];
            $idProveedor = (int)$input['id_proveedor'];
            $sku = trim($input['sku']);
            $nombreProducto = trim($input['nombre_producto']);
            // Los productos nuevos siempre se crean como activos
            $activo = 1;
            $stock = (int)$input['stock'];
            $stockMinimo = (int)$input['stock_minimo'];
            $costoUnitario = (float)$input['costo_unitario'];
            $precioVentaBase = (float)$input['precio_venta_base'];
            $fechaRegistro = trim($input['fecha_registro']);
            // Descripción es opcional
            $descripcion = isset($input['descripcion']) ? trim($input['descripcion']) : null;
            // ID de usuario autenticado (para auditoría en triggers)
            $idUsuario = (int)($auth['id_usuario'] ?? 1);

            // Llamar al modelo para crear el producto
            $result = $this->inveModel->addProduct(
                $idCategoria,
                $idProveedor,
                $sku,
                $nombreProducto,
                $activo,
                $stock,
                $stockMinimo,
                $costoUnitario,
                $precioVentaBase,
                $fechaRegistro,
                $descripcion,
                $idUsuario
            );

            error_log('inveController - addProduct: Resultado del modelo: ' . json_encode($result));

            // Enviar respuesta
            echo json_encode($result);

        } catch (\Throwable $e) {
            error_log('inveController - addProduct: Error inesperado: ' . $e->getMessage());
            error_log('inveController - addProduct: Stack trace: ' . $e->getTraceAsString());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Obtiene la lista de proveedores activos
     * 
     * @param array $headers Headers de la petición
     * @return void
     */
    public function getProveedores(array $headers): void
    {
        // TEMPORAL: Desactivar autorización para testing
        // $auth = $this->authorize($headers, [1, 2]);
        // if (!$auth) return;
        
        error_log('inveController - getProveedores: MODO TESTING - Autorización desactivada');

        error_log('inveController - getProveedores: Obteniendo lista de proveedores');
        
        try {
            $proveedores = $this->inveModel->getProveedores();
            error_log('inveController - getProveedores: Proveedores obtenidos: ' . json_encode($proveedores));
            
            // Crear respuesta personalizada
            http_response_code(200);
            $response = [
                'status' => 'OK',
                'message' => 'Proveedores obtenidos exitosamente',
                'data' => $proveedores
            ];
            error_log('inveController - getProveedores: Respuesta final: ' . json_encode($response));
            
            echo json_encode($response);

        } catch (\Throwable $e) {
            error_log('inveController - getProveedores: Error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Obtiene la lista de categorías activas
     * 
     * @param array $headers Headers de la petición
     * @return void
     */
    public function getCategorias(array $headers): void
    {
        // TEMPORAL: Desactivar autorización para testing
        // $auth = $this->authorize($headers, [1, 2]);
        // if (!$auth) return;
        
        error_log('inveController - getCategorias: MODO TESTING - Autorización desactivada');

        error_log('inveController - getCategorias: Obteniendo lista de categorías');
        
        try {
            $categorias = $this->inveModel->getCategorias();
            error_log('inveController - getCategorias: Categorías obtenidas: ' . json_encode($categorias));
            
            // Crear respuesta personalizada
            http_response_code(200);
            $response = [
                'status' => 'OK',
                'message' => 'Categorías obtenidas exitosamente',
                'data' => $categorias
            ];
            error_log('inveController - getCategorias: Respuesta final: ' . json_encode($response));
            
            echo json_encode($response);

        } catch (\Throwable $e) {
            error_log('inveController - getCategorias: Error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Obtiene la lista de productos
     * 
     * @param array $headers Headers de la petición
     * @return void
     */
    public function getProductos(array $headers): void
    {
        // TEMPORAL: Desactivar autorización para testing
        // $auth = $this->authorize($headers, [1, 2]);
        // if (!$auth) return;
        
        error_log('inveController - getProductos: MODO TESTING - Autorización desactivada');

        error_log('inveController - getProductos: Obteniendo lista de productos');
        
        try {
            $productos = $this->inveModel->getProductos();
            error_log('inveController - getProductos: Productos obtenidos: ' . json_encode($productos));
            
            // Crear respuesta personalizada
            http_response_code(200);
            $response = [
                'status' => 'OK',
                'message' => 'Productos obtenidos exitosamente',
                'data' => $productos
            ];
            error_log('inveController - getProductos: Respuesta final: ' . json_encode($response));
            
            echo json_encode($response);

        } catch (\Throwable $e) {
            error_log('inveController - getProductos: Error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Obtiene las estadísticas del inventario
     * 
     * @param array $headers Headers de la petición
     * @return void
     */
    public function getEstadisticas(array $headers): void
    {
        // TEMPORAL: Desactivar autorización para testing
        // $auth = $this->authorize($headers, [1, 2]);
        // if (!$auth) return;
        
        error_log('inveController - getEstadisticas: MODO TESTING - Autorización desactivada');

        error_log('inveController - getEstadisticas: Obteniendo estadísticas del inventario');
        
        try {
            $estadisticas = $this->inveModel->getEstadisticas();
            error_log('inveController - getEstadisticas: Estadísticas obtenidas: ' . json_encode($estadisticas));
            
            // Crear respuesta personalizada
            http_response_code(200);
            $response = [
                'status' => 'OK',
                'message' => 'Estadísticas obtenidas exitosamente',
                'data' => $estadisticas
            ];
            error_log('inveController - getEstadisticas: Respuesta final: ' . json_encode($response));
            
            echo json_encode($response);

        } catch (\Throwable $e) {
            error_log('inveController - getEstadisticas: Error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Obtiene un producto específico por ID
     * 
     * @param array $headers Headers de la petición
     * @param string $id ID del producto
     * @return void
     */
    public function getProducto(array $headers, string $id): void
    {
        // TEMPORAL: Desactivar autorización para testing
        // $auth = $this->authorize($headers, [1, 2]);
        // if (!$auth) return;
        
        error_log('inveController - getProducto: MODO TESTING - Autorización desactivada');

        if (empty($id) || !is_numeric($id)) {
            echo json_encode(['status' => 'ERROR', 'message' => 'ID de producto inválido']);
            return;
        }

        error_log('inveController - getProducto: Obteniendo producto ID: ' . $id);
        
        try {
            $producto = $this->inveModel->getProducto($id);
            
            if (empty($producto)) {
                echo json_encode(['status' => 'ERROR', 'message' => 'Producto no encontrado']);
                return;
            }
            
            error_log('inveController - getProducto: Producto obtenido: ' . json_encode($producto));
            
            // Crear respuesta personalizada
            http_response_code(200);
            $response = [
                'status' => 'OK',
                'message' => 'Producto obtenido exitosamente',
                'data' => $producto
            ];
            error_log('inveController - getProducto: Respuesta final: ' . json_encode($response));
            
            echo json_encode($response);

        } catch (\Throwable $e) {
            error_log('inveController - getProducto: Error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Obtiene el último ID de producto
     * 
     * @param array $headers Headers de la petición
     * @return void
     */
    public function getUltimoIdProducto(array $headers): void
    {
        // TEMPORAL: Desactivar autorización para testing
        error_log('inveController - getUltimoIdProducto: MODO TESTING - Autorización desactivada');
        
        try {
            $ultimoId = $this->inveModel->getUltimoIdProducto();
            
            http_response_code(200);
            $response = [
                'status' => 'OK',
                'message' => 'Último ID obtenido exitosamente',
                'data' => [
                    'ultimo_id' => $ultimoId,
                    'siguiente_id' => $ultimoId + 1
                ]
            ];
            
            echo json_encode($response);
        } catch (\Throwable $e) {
            error_log('inveController - getUltimoIdProducto: Error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Obtiene el siguiente SKU para una categoría específica
     * 
     * @param array $headers Headers de la petición
     * @return void
     */
    public function getSiguienteSkuPorCategoria(array $headers): void
    {
        // TEMPORAL: Desactivar autorización para testing
        error_log('inveController - getSiguienteSkuPorCategoria: MODO TESTING - Autorización desactivada');
        error_log('inveController - getSiguienteSkuPorCategoria: $_GET completo: ' . json_encode($_GET));
        
        try {
            $idCategoria = isset($_GET['id_categoria']) ? (int)$_GET['id_categoria'] : 0;
            error_log('inveController - getSiguienteSkuPorCategoria: ID de categoría recibido: ' . $idCategoria);
            
            if ($idCategoria <= 0) {
                error_log('inveController - getSiguienteSkuPorCategoria: ID de categoría inválido: ' . $idCategoria);
                http_response_code(400);
                echo json_encode([
                    'status' => 'ERROR',
                    'message' => 'ID de categoría inválido'
                ]);
                return;
            }
            
            error_log('inveController - getSiguienteSkuPorCategoria: Llamando al modelo con ID: ' . $idCategoria);
            $result = $this->inveModel->getSiguienteSkuPorCategoria($idCategoria);
            error_log('inveController - getSiguienteSkuPorCategoria: Resultado del modelo: ' . json_encode($result));
            
            http_response_code(200);
            $response = [
                'status' => 'OK',
                'message' => 'SKU obtenido exitosamente',
                'data' => $result
            ];
            
            error_log('inveController - getSiguienteSkuPorCategoria: Respuesta final: ' . json_encode($response));
            echo json_encode($response);
        } catch (\Throwable $e) {
            error_log('inveController - getSiguienteSkuPorCategoria: Error: ' . $e->getMessage());
            error_log('inveController - getSiguienteSkuPorCategoria: Stack trace: ' . $e->getTraceAsString());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Exporta los productos a Excel con formato (HTML/Excel compatible)
     * 
     * @param array $headers Headers de la petición
     * @return void
     */
    public function exportarExcel(array $headers): void
    {
        // TEMPORAL: Desactivar autorización para testing
        error_log('inveController - exportarExcel: MODO TESTING - Autorización desactivada');
        
        try {
            $productos = $this->inveModel->getProductos();
            
            // Configurar headers para descarga de Excel
            $filename = 'inventario_productos_' . date('Y-m-d_His') . '.xls';
            
            // Headers para Excel HTML
            header('Content-Type: application/vnd.ms-excel; charset=UTF-8');
            header('Content-Disposition: attachment;filename="' . $filename . '"');
            header('Cache-Control: max-age=0');
            header('Pragma: public');
            header('Expires: 0');
            
            // Generar Excel con formato
            $this->generarExcelFormateado($productos);
            
        } catch (\Throwable $e) {
            error_log('inveController - exportarExcel: Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Genera el archivo Excel con formato HTML (compatible con Excel)
     * Usa los colores del sistema para la fila de encabezados
     * 
     * @param array $productos Lista de productos
     * @return void
     */
    private function generarExcelFormateado(array $productos): void
    {
        // Colores del sistema (convertidos de RGBA a RGB/hex)
        // rgba(1, 146, 179) = #0192B3
        // rgba(1, 100, 181) = #0164B5
        $colorHeaderBg = '#0192B3'; // Color principal del sistema
        $colorHeaderText = '#FFFFFF'; // Texto blanco
        
        echo '<!DOCTYPE html>';
        echo '<html>';
        echo '<head>';
        echo '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
        echo '<style>';
        echo 'table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }';
        echo '.header-title { background-color: ' . $colorHeaderBg . '; color: ' . $colorHeaderText . '; font-size: 24px; font-weight: bold; text-align: center; padding: 20px; border: 2px solid #0164B5; }';
        echo '.header-info { text-align: center; color: #666; font-size: 12px; padding: 10px; }';
        echo 'th { background-color: ' . $colorHeaderBg . '; color: ' . $colorHeaderText . '; font-weight: bold; text-align: center; padding: 10px; border: 1px solid #0164B5; }';
        echo 'td { padding: 8px; border: 1px solid #CCCCCC; text-align: left; }';
        echo 'tr:nth-child(even) { background-color: #F5F5F5; }';
        echo 'tr:hover { background-color: #E8F4F8; }';
        echo '</style>';
        echo '</head>';
        echo '<body>';
        echo '<table>';
        
        // Encabezado con el nombre de la empresa (fila que ocupa todas las columnas)
        echo '<tr>';
        echo '<td colspan="11" class="header-title">Inventario Color Ink</td>';
        echo '</tr>';
        echo '<tr>';
        echo '<td colspan="11" class="header-info">Fecha de exportación: ' . date('d/m/Y H:i:s') . '</td>';
        echo '</tr>';
        
        // Fila de encabezados con colores del sistema
        echo '<tr style="background-color: ' . $colorHeaderBg . '; color: ' . $colorHeaderText . '; font-weight: bold;">';
        echo '<th>Código SKU</th>';
        echo '<th>Nombre del Producto</th>';
        echo '<th>Categoría</th>';
        echo '<th>Proveedor</th>';
        echo '<th>Stock</th>';
        echo '<th>Stock Mínimo</th>';
        echo '<th>Costo Unitario (L.)</th>';
        echo '<th>Precio de Venta (L.)</th>';
        echo '<th>Estado</th>';
        echo '<th>Fecha de Registro</th>';
        echo '<th>Descripción</th>';
        echo '</tr>';
        
        // Datos de productos
        foreach ($productos as $producto) {
            // Determinar estado
            $estado = 'Disponible';
            $estadoColor = '#28a745'; // Verde
            if (($producto['stock'] ?? 0) <= 0) {
                $estado = 'Agotado';
                $estadoColor = '#dc3545'; // Rojo
            } else if (($producto['stock'] ?? 0) <= ($producto['stock_minimo'] ?? 0)) {
                $estado = 'Bajo Stock';
                $estadoColor = '#ffc107'; // Amarillo
            }
            
            // Fecha de Registro en formato legible
            $fechaRegistro = !empty($producto['fecha_registro']) 
                ? date('d/m/Y H:i', strtotime($producto['fecha_registro'])) 
                : 'N/A';
            
            // Limpiar descripción de saltos de línea y caracteres problemáticos
            $descripcion = isset($producto['descripcion']) ? $producto['descripcion'] : '';
            $descripcion = str_replace(["\r\n", "\r", "\n"], ' ', $descripcion);
            $descripcion = htmlspecialchars($descripcion, ENT_QUOTES, 'UTF-8');
            $descripcion = trim($descripcion);
            
            // Formatear números con formato internacional (punto decimal, sin separador de miles para Excel)
            $costoUnitario = number_format((float)($producto['costo_unitario'] ?? 0), 2, '.', '');
            $precioVenta = number_format((float)($producto['precio_venta_base'] ?? 0), 2, '.', '');
            
            echo '<tr>';
            echo '<td>' . htmlspecialchars($producto['sku'] ?? 'N/A', ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . htmlspecialchars($producto['nombre_producto'] ?? 'N/A', ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . htmlspecialchars($producto['categoria'] ?? 'Sin categoría', ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . htmlspecialchars($producto['proveedor'] ?? 'Sin proveedor', ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td style="text-align: center;">' . (int)($producto['stock'] ?? 0) . '</td>';
            echo '<td style="text-align: center;">' . (int)($producto['stock_minimo'] ?? 0) . '</td>';
            echo '<td style="text-align: right;">L. ' . $costoUnitario . '</td>';
            echo '<td style="text-align: right;">L. ' . $precioVenta . '</td>';
            echo '<td style="text-align: center; color: ' . $estadoColor . '; font-weight: bold;">' . htmlspecialchars($estado, ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . htmlspecialchars($fechaRegistro, ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . $descripcion . '</td>';
            echo '</tr>';
        }
        
        echo '</table>';
        echo '</body>';
        echo '</html>';
        exit;
    }

    /**
     * Obtener alertas de stock bajo
     * 
     * @param array $headers Headers de la petición
     * @return void
     */
    public function getAlertasStock(array $headers): void
    {
        // TEMPORAL: Desactivar autorización para testing
        error_log('inveController - getAlertasStock: MODO TESTING - Autorización desactivada');
        
        try {
            $soloPendientes = isset($_GET['solo_pendientes']) ? (bool)$_GET['solo_pendientes'] : true;
            $resultado = $this->inveModel->obtenerAlertasStock($soloPendientes);
            
            header('Content-Type: application/json');
            echo json_encode($resultado);
        } catch (\Throwable $e) {
            error_log('inveController - getAlertasStock: Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Marcar alerta como atendida
     * 
     * @param array $headers Headers de la petición
     * @param array $input Datos de la alerta
     * @return void
     */
    public function marcarAlertaAtendida(array $headers, array $input): void
    {
        // TEMPORAL: Desactivar autorización para testing
        error_log('inveController - marcarAlertaAtendida: MODO TESTING - Autorización desactivada');
        
        try {
            $idAlerta = (int)($input['id_alerta'] ?? 0);
            
            if ($idAlerta <= 0) {
                echo json_encode(responseHTTP::status400('ID de alerta inválido'));
                return;
            }
            
            $resultado = $this->inveModel->marcarAlertaAtendida($idAlerta);
            
            header('Content-Type: application/json');
            echo json_encode($resultado);
        } catch (\Throwable $e) {
            error_log('inveController - marcarAlertaAtendida: Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Actualiza un producto existente
     * 
     * @param array $headers Headers de la petición
     * @param array $input Datos del producto
     * @return void
     */
    public function updateProduct(array $headers, array $input): void
    {
        error_log('========== INICIO updateProduct ==========');
        error_log('inveController - updateProduct: Headers recibidos: ' . json_encode(array_keys($headers)));
        error_log('inveController - updateProduct: Input recibido: ' . json_encode($input));
        
        // Autorización: administradores (1) y operadores (2) pueden actualizar
        try {
            $auth = $this->authorize($headers, [1, 2]);
            if (!$auth) {
                error_log('inveController - updateProduct: Autorización FALLIDA');
                return;
            }
            error_log('inveController - updateProduct: Autorización exitosa. Usuario: ' . json_encode($auth));
        } catch (\Throwable $e) {
            error_log('inveController - updateProduct: EXCEPCIÓN en authorize: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            responseHTTP::status500('Error de autorización: ' . $e->getMessage());
            return;
        }
        
        try {
            // Inyectar id_usuario autenticado para auditoría
            $input['id_usuario'] = (int)($auth['id_usuario'] ?? 1);
            error_log('inveController - updateProduct: id_usuario inyectado: ' . $input['id_usuario']);

            $result = $this->inveModel->updateProduct($input);
            
            error_log('inveController - updateProduct: Resultado del modelo: ' . json_encode($result));
            
            if ($result) {
                error_log('inveController - updateProduct: Producto actualizado exitosamente');
                http_response_code(200);
                $response = [
                    'status' => 'OK',
                    'message' => 'Producto actualizado exitosamente',
                    'data' => $result
                ];
            } else {
                error_log('inveController - updateProduct: Error - No se pudo actualizar el producto');
                http_response_code(400);
                $response = [
                    'status' => 'ERROR',
                    'message' => 'Error al actualizar el producto'
                ];
            }
            
            error_log('inveController - updateProduct: Respuesta: ' . json_encode($response));
            echo json_encode($response);

        } catch (\Throwable $e) {
            error_log('inveController - updateProduct: EXCEPCIÓN: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(responseHTTP::status500('Error interno: ' . $e->getMessage()));
        }
        error_log('========== FIN updateProduct ==========');
    }

    /**
     * Elimina un producto
     * 
     * @param array $headers Headers de la petición
     * @param array $input Datos del producto
     * @return void
     */
    public function deleteProduct(array $headers, array $input): void
    {
        // Autorización: administradores (1) y operadores (2) pueden eliminar productos
        $auth = $this->authorize($headers, [1, 2]);
        if (!$auth) return;

        error_log('inveController - deleteProduct: Datos recibidos: ' . json_encode($input));
        
        try {
            // Inyectar id_usuario autenticado para auditoría
            $input['id_usuario'] = (int)($auth['id_usuario'] ?? 1);
            
            $result = $this->inveModel->deleteProduct($input);
            
            if ($result) {
                http_response_code(200);
                $response = [
                    'status' => 'OK',
                    'message' => 'Producto eliminado exitosamente',
                    'data' => $result
                ];
            } else {
                http_response_code(400);
                $response = [
                    'status' => 'ERROR',
                    'message' => 'Error al eliminar el producto'
                ];
            }
            
            error_log('inveController - deleteProduct: Respuesta: ' . json_encode($response));
            echo json_encode($response);

        } catch (\Throwable $e) {
            error_log('inveController - deleteProduct: Error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }

    /**
     * Agrega un nuevo proveedor
     * 
     * @param array $headers Headers de la petición
     * @param array $input Datos del proveedor
     * @return void
     */
    public function addProveedor(array $headers, array $input): void
    {
        // TEMPORAL: Desactivar autorización para testing
        // $auth = $this->authorize($headers, [1, 2]);
        // if (!$auth) return;
        
        error_log('inveController - addProveedor: MODO TESTING - Autorización desactivada');

        error_log('inveController - addProveedor: Datos recibidos: ' . json_encode($input));
        
        // Validar datos
        if (!isset($input['descripcion_proveedor']) || empty(trim($input['descripcion_proveedor']))) {
            http_response_code(400);
            echo json_encode([
                'status' => 'ERROR',
                'message' => 'El nombre del proveedor es requerido'
            ]);
            return;
        }
        
        try {
            $descripcion = trim($input['descripcion_proveedor']);
            $contacto = trim($input['forma_contacto'] ?? '');
            $direccion = trim($input['direccion'] ?? '');
            $idUsuario = 1; // Usuario por defecto para testing
            
            $result = $this->inveModel->addProveedor($descripcion, $contacto, $direccion, $idUsuario);
            
            if ($result) {
                http_response_code(200);
                $response = [
                    'status' => 'OK',
                    'message' => 'Proveedor agregado exitosamente',
                    'data' => $result
                ];
            } else {
                http_response_code(400);
                $response = [
                    'status' => 'ERROR',
                    'message' => 'Error al agregar el proveedor'
                ];
            }
            
            error_log('inveController - addProveedor: Respuesta: ' . json_encode($response));
            echo json_encode($response);

        } catch (\Throwable $e) {
            error_log('inveController - addProveedor: Error: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500());
        }
    }
}
