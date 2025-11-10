<?php

namespace App\Models;

use App\DB\connectionDB;
use App\Config\responseHTTP;
use PDO;

class inveModel
{
    private $db;

    public function __construct()
    {
        $this->db = connectionDB::getConnection();
    }

    /**
     * Agrega un nuevo producto al inventario usando el procedimiento almacenado sp_crear_producto
     * 
     * @param int $idCategoria ID de la categoría del producto
     * @param int $idProveedor ID del proveedor
     * @param string $sku SKU del producto
     * @param string $nombreProducto Nombre del producto
     * @param int $activo Estado activo del producto (1 = activo, 0 = inactivo)
     * @param int $stock Cantidad en stock
     * @param int $stockMinimo Stock mínimo permitido
     * @param float $costoUnitario Costo unitario del producto
     * @param float $precioVentaBase Precio de venta base
     * @param string $fechaRegistro Fecha de registro del producto
     * @param string|null $descripcion Descripción del producto (opcional)
     * @param int $idUsuario ID del usuario que crea el producto (para auditoría)
     * @return array Respuesta con el resultado de la operación
     */
    public function addProduct(
        int $idCategoria,
        int $idProveedor, 
        string $sku,
        string $nombreProducto, 
        int $activo,
        int $stock, 
        int $stockMinimo, 
        float $costoUnitario, 
        float $precioVentaBase,
        string $fechaRegistro,
        ?string $descripcion = null,
        int $idUsuario = 1
    ): array {
        try {
            error_log('inveModel - addProduct: Iniciando creación de producto');
            error_log('inveModel - addProduct: Parámetros - SKU: ' . $sku . ', Nombre: ' . $nombreProducto . ', Proveedor: ' . $idProveedor . ', Categoría: ' . $idCategoria);
            
            // Verificar conexión a la base de datos
            if (!$this->db) {
                error_log('inveModel - addProduct: Error - No hay conexión a la base de datos');
                return responseHTTP::status500();
            }

            // Validar que el proveedor existe
            if (!$this->validateProveedor($idProveedor)) {
                error_log('inveModel - addProduct: Error - Proveedor no válido: ' . $idProveedor);
                return responseHTTP::status400('El proveedor especificado no existe');
            }

            // Validar que la categoría existe
            if (!$this->validateCategoria($idCategoria)) {
                error_log('inveModel - addProduct: Error - Categoría no válida: ' . $idCategoria);
                return responseHTTP::status400('La categoría especificada no existe');
            }

            // Validar que no existe un producto con el mismo SKU
            if ($this->productExistsBySku($sku)) {
                error_log('inveModel - addProduct: Error - Producto con SKU ya existe: ' . $sku);
                return responseHTTP::status400('Ya existe un producto con este SKU');
            }

            // Usar procedimiento almacenado para crear el producto
            error_log('inveModel - addProduct: Llamando SP sp_crear_producto con usuario: ' . $idUsuario);
            $stmt = $this->db->prepare("CALL sp_crear_producto(:id_categoria, :id_proveedor, :sku, :nombre_producto, :activo, :stock, :stock_minimo, :costo_unitario, :precio_venta_base, :fecha_registro, :descripcion, :id_usuario)");
            
            $stmt->bindParam(':id_categoria', $idCategoria, PDO::PARAM_INT);
            $stmt->bindParam(':id_proveedor', $idProveedor, PDO::PARAM_INT);
            $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
            $stmt->bindParam(':nombre_producto', $nombreProducto, PDO::PARAM_STR);
            $stmt->bindParam(':activo', $activo, PDO::PARAM_INT);
            $stmt->bindParam(':stock', $stock, PDO::PARAM_INT);
            $stmt->bindParam(':stock_minimo', $stockMinimo, PDO::PARAM_INT);
            $stmt->bindParam(':costo_unitario', $costoUnitario, PDO::PARAM_STR);
            $stmt->bindParam(':precio_venta_base', $precioVentaBase, PDO::PARAM_STR);
            $stmt->bindParam(':fecha_registro', $fechaRegistro, PDO::PARAM_STR);
            $stmt->bindParam(':descripcion', $descripcion, PDO::PARAM_STR);
            $stmt->bindParam(':id_usuario', $idUsuario, PDO::PARAM_INT);
            
            $result = $stmt->execute();
            error_log('inveModel - addProduct: Resultado de execute: ' . ($result ? 'true' : 'false'));

            if (!$result) {
                $errorInfo = $stmt->errorInfo();
                error_log('inveModel - addProduct: Error en la inserción: ' . json_encode($errorInfo));
                return responseHTTP::status500();
            }

            // Obtener el último ID insertado
            $id = $this->db->lastInsertId();
            error_log('inveModel - addProduct: ID insertado: ' . $id);
            
            // Limpiar cursores adicionales del CALL (MySQL devuelve múltiples resultsets)
            while ($stmt->nextRowset()) { /* noop */ }
            
            $response = responseHTTP::status201('Producto creado exitosamente');
            $response['data'] = [
                'id_producto' => $id,
                'sku' => $sku,
                'nombre_producto' => $nombreProducto,
                'precio_venta_base' => $precioVentaBase,
                'stock' => $stock,
                'stock_minimo' => $stockMinimo,
                'costo_unitario' => $costoUnitario,
                'id_proveedor' => $idProveedor,
                'id_categoria' => $idCategoria,
                'activo' => $activo,
                'fecha_registro' => $fechaRegistro
            ];
            return $response;

        } catch (\Throwable $e) {
            error_log('Error addProduct: ' . $e->getMessage());
            error_log('Error addProduct - Stack trace: ' . $e->getTraceAsString());
            return responseHTTP::status500();
        }
    }

    /**
     * Valida que el proveedor existe en la base de datos usando stored procedure
     * 
     * @param int $idProveedor ID del proveedor a validar
     * @return bool True si el proveedor existe, false en caso contrario
     */
    private function validateProveedor(int $idProveedor): bool
    {
        try {
            error_log('inveModel - validateProveedor: Llamando SP sp_validar_proveedor con ID: ' . $idProveedor);
            $stmt = $this->db->prepare("CALL sp_validar_proveedor(:id_proveedor, @existe)");
            $stmt->bindParam(':id_proveedor', $idProveedor, PDO::PARAM_INT);
            $stmt->execute();
            
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            // Obtener el valor del parámetro OUT
            $result = $this->db->query("SELECT @existe AS existe")->fetch(PDO::FETCH_ASSOC);
            $existe = (bool)($result['existe'] ?? false);
            
            error_log('inveModel - validateProveedor: Resultado: ' . ($existe ? 'true' : 'false'));
            return $existe;
        } catch (\Throwable $e) {
            error_log('Error validateProveedor: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Valida que la categoría existe en la base de datos usando stored procedure
     * 
     * @param int $idCategoria ID de la categoría a validar
     * @return bool True si la categoría existe, false en caso contrario
     */
    private function validateCategoria(int $idCategoria): bool
    {
        try {
            error_log('inveModel - validateCategoria: Llamando SP sp_validar_categoria con ID: ' . $idCategoria);
            $stmt = $this->db->prepare("CALL sp_validar_categoria(:id_categoria, @existe)");
            $stmt->bindParam(':id_categoria', $idCategoria, PDO::PARAM_INT);
            $stmt->execute();
            
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            // Obtener el valor del parámetro OUT
            $result = $this->db->query("SELECT @existe AS existe")->fetch(PDO::FETCH_ASSOC);
            $existe = (bool)($result['existe'] ?? false);
            
            error_log('inveModel - validateCategoria: Resultado: ' . ($existe ? 'true' : 'false'));
            return $existe;
        } catch (\Throwable $e) {
            error_log('Error validateCategoria: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Verifica si ya existe un producto con el mismo SKU usando stored procedure
     * 
     * @param string $sku SKU del producto a verificar
     * @return bool True si el producto ya existe, false en caso contrario
     */
    private function productExistsBySku(string $sku): bool
    {
        try {
            error_log('inveModel - productExistsBySku: Llamando SP sp_validar_producto_por_sku con SKU: ' . $sku);
            $stmt = $this->db->prepare("CALL sp_validar_producto_por_sku(:sku, @existe)");
            $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
            $stmt->execute();
            
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            // Obtener el valor del parámetro OUT
            $result = $this->db->query("SELECT @existe AS existe")->fetch(PDO::FETCH_ASSOC);
            $existe = (bool)($result['existe'] ?? false);
            
            error_log('inveModel - productExistsBySku: Resultado: ' . ($existe ? 'true' : 'false'));
            return $existe;
        } catch (\Throwable $e) {
            error_log('Error productExistsBySku: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Verifica si ya existe un producto con el mismo nombre usando stored procedure
     * 
     * @param string $nombreProducto Nombre del producto a verificar
     * @return bool True si el producto ya existe, false en caso contrario
     */
    private function productExists(string $nombreProducto): bool
    {
        try {
            error_log('inveModel - productExists: Llamando SP sp_validar_producto_por_nombre con nombre: ' . $nombreProducto);
            $stmt = $this->db->prepare("CALL sp_validar_producto_por_nombre(:nombre_producto, @existe)");
            $stmt->bindParam(':nombre_producto', $nombreProducto, PDO::PARAM_STR);
            $stmt->execute();
            
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            // Obtener el valor del parámetro OUT
            $result = $this->db->query("SELECT @existe AS existe")->fetch(PDO::FETCH_ASSOC);
            $existe = (bool)($result['existe'] ?? false);
            
            error_log('inveModel - productExists: Resultado: ' . ($existe ? 'true' : 'false'));
            return $existe;
        } catch (\Throwable $e) {
            error_log('Error productExists: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Obtiene la lista de proveedores activos
     * 
     * @return array Lista de proveedores
     */
    public function getProveedores(): array
    {
        try {
            error_log('inveModel - getProveedores: Llamando SP sp_listar_proveedores');
            $stmt = $this->db->prepare("CALL sp_listar_proveedores()");
            $stmt->execute();
            $proveedores = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            return $proveedores ?: [];
        } catch (\Throwable $e) {
            error_log('Error getProveedores: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Obtiene el último ID de producto de la base de datos
     * 
     * @return int Último ID de producto, o 0 si no hay productos
     */
    public function getUltimoIdProducto(): int
    {
        try {
            error_log('inveModel - getUltimoIdProducto: Llamando SP sp_obtener_ultimo_id_producto');
            $stmt = $this->db->prepare("CALL sp_obtener_ultimo_id_producto()");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            $ultimoId = (int)($result['ultimo_id'] ?? 0);
            error_log('inveModel - getUltimoIdProducto: Último ID encontrado: ' . $ultimoId);
            return $ultimoId;
        } catch (\PDOException $e) {
            error_log('Error getUltimoIdProducto (PDO): ' . $e->getMessage());
            error_log('Error Info: ' . json_encode($e->errorInfo));
            return 0;
        } catch (\Throwable $e) {
            error_log('Error getUltimoIdProducto: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Obtiene la lista de categorías activas
     * 
     * @return array Lista de categorías
     */
    public function getCategorias(): array
    {
        try {
            error_log('inveModel - getCategorias: Llamando SP sp_listar_categorias');
            $stmt = $this->db->prepare("CALL sp_listar_categorias()");
            $stmt->execute();
            $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            return $categorias ?: [];
        } catch (\Throwable $e) {
            error_log('Error getCategorias: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Obtiene el siguiente número de SKU para una categoría específica
     * 
     * @param int $idCategoria ID de la categoría
     * @return array Array con prefijo, siguiente_numero y sku_completo
     */
    public function getSiguienteSkuPorCategoria(int $idCategoria): array
    {
        try {
            error_log('inveModel - getSiguienteSkuPorCategoria: Obteniendo SKU para categoría ID: ' . $idCategoria);
            
            // Obtener información de la categoría usando stored procedure
            error_log('inveModel - getSiguienteSkuPorCategoria: Llamando SP sp_obtener_categoria con ID: ' . $idCategoria);
            $stmt = $this->db->prepare("CALL sp_obtener_categoria(:id_categoria)");
            $stmt->bindParam(':id_categoria', $idCategoria, PDO::PARAM_INT);
            $stmt->execute();
            $categoria = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            error_log('inveModel - getSiguienteSkuPorCategoria: Resultado del SP: ' . json_encode($categoria));
            
            if (!$categoria) {
                error_log('inveModel - getSiguienteSkuPorCategoria: Categoría no encontrada para ID: ' . $idCategoria);
                return [
                    'prefijo' => 'PROD',
                    'siguiente_numero' => 1,
                    'sku_completo' => 'PROD-001'
                ];
            }
            
            // Generar prefijo basado en el nombre de la categoría
            $nombreCategoria = strtoupper(trim($categoria['descripcion']));
            error_log('inveModel - getSiguienteSkuPorCategoria: Nombre de categoría: ' . $nombreCategoria);
            $prefijo = $this->generarPrefijoDesdeNombre($nombreCategoria);
            error_log('inveModel - getSiguienteSkuPorCategoria: Prefijo generado: ' . $prefijo);
            
            // Buscar el último SKU con este prefijo
            $stmt = $this->db->prepare("
                SELECT sku 
                FROM producto 
                WHERE sku LIKE :prefijo_pattern 
                ORDER BY CAST(SUBSTRING_INDEX(sku, '-', -1) AS UNSIGNED) DESC 
                LIMIT 1
            ");
            $prefijoPattern = $prefijo . '-%';
            $stmt->bindParam(':prefijo_pattern', $prefijoPattern, PDO::PARAM_STR);
            $stmt->execute();
            $ultimoSku = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $siguienteNumero = 1;
            if ($ultimoSku && isset($ultimoSku['sku'])) {
                // Extraer el número del último SKU
                $partes = explode('-', $ultimoSku['sku']);
                $ultimoNumero = isset($partes[1]) ? (int)$partes[1] : 0;
                $siguienteNumero = $ultimoNumero + 1;
                error_log('inveModel - getSiguienteSkuPorCategoria: Último SKU encontrado: ' . $ultimoSku['sku'] . ', siguiente número: ' . $siguienteNumero);
            } else {
                error_log('inveModel - getSiguienteSkuPorCategoria: No se encontró SKU previo, empezando desde 1');
            }
            
            // Formatear el número: con ceros a la izquierda si < 100, sin ceros si >= 100
            if ($siguienteNumero < 100) {
                $numeroFormateado = str_pad($siguienteNumero, 3, '0', STR_PAD_LEFT);
            } else {
                $numeroFormateado = (string)$siguienteNumero;
            }
            
            $skuCompleto = $prefijo . '-' . $numeroFormateado;
            
            error_log('inveModel - getSiguienteSkuPorCategoria: SKU generado - ' . $skuCompleto);
            
            return [
                'prefijo' => $prefijo,
                'siguiente_numero' => $siguienteNumero,
                'sku_completo' => $skuCompleto
            ];
        } catch (\Throwable $e) {
            error_log('Error getSiguienteSkuPorCategoria: ' . $e->getMessage());
            return [
                'prefijo' => 'PROD',
                'siguiente_numero' => 1,
                'sku_completo' => 'PROD-001'
            ];
        }
    }

    /**
     * Genera un prefijo de SKU basado en el nombre de la categoría
     * 
     * @param string $nombreCategoria Nombre de la categoría
     * @return string Prefijo generado (siempre 4 caracteres)
     */
    private function generarPrefijoDesdeNombre(string $nombreCategoria): string
    {
        error_log('inveModel - generarPrefijoDesdeNombre: Nombre recibido: ' . $nombreCategoria);
        
        // Asegurar que esté en mayúsculas y sin espacios al inicio/final
        $nombre = strtoupper(trim($nombreCategoria));
        error_log('inveModel - generarPrefijoDesdeNombre: Nombre después de trim y mayúsculas: ' . $nombre);
        
        // Remover acentos
        $nombre = $this->removerAcentos($nombre);
        error_log('inveModel - generarPrefijoDesdeNombre: Nombre después de remover acentos: ' . $nombre);
        
        // Obtener solo letras (mayúsculas) - eliminar espacios, números y caracteres especiales
        $letras = preg_replace('/[^A-Z]/', '', $nombre);
        error_log('inveModel - generarPrefijoDesdeNombre: Letras extraídas: "' . $letras . '" (longitud: ' . strlen($letras) . ')');
        
        // Si el nombre tiene 4 o más letras, tomar las primeras 4
        if (strlen($letras) >= 4) {
            $prefijo = substr($letras, 0, 4);
            error_log('inveModel - generarPrefijoDesdeNombre: Prefijo generado (primeras 4 letras): ' . $prefijo);
            return $prefijo;
        }
        
        // Si tiene menos de 4 letras pero tiene algunas, usar todas y completar con X si es necesario hasta 4
        if (strlen($letras) > 0) {
            $prefijo = str_pad($letras, 4, 'X', STR_PAD_RIGHT);
            error_log('inveModel - generarPrefijoDesdeNombre: Prefijo generado (con relleno): ' . $prefijo);
            return $prefijo;
        }
        
        // Si no hay letras, usar prefijo genérico
        error_log('inveModel - generarPrefijoDesdeNombre: ERROR - No se encontraron letras en: "' . $nombreCategoria . '"');
        error_log('inveModel - generarPrefijoDesdeNombre: Procesado: "' . $nombre . '", Letras: "' . $letras . '"');
        return 'PROD';
    }

    /**
     * Remueve acentos de una cadena
     * 
     * @param string $texto Texto con acentos
     * @return string Texto sin acentos (mantiene mayúsculas/minúsculas originales)
     */
    private function removerAcentos(string $texto): string
    {
        $acentos = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U',
            'ñ' => 'n', 'Ñ' => 'N',
            'à' => 'a', 'è' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u',
            'À' => 'A', 'È' => 'E', 'Ì' => 'I', 'Ò' => 'O', 'Ù' => 'U',
            'ä' => 'a', 'ë' => 'e', 'ï' => 'i', 'ö' => 'o', 'ü' => 'u',
            'Ä' => 'A', 'Ë' => 'E', 'Ï' => 'I', 'Ö' => 'O', 'Ü' => 'U'
        ];
        $resultado = strtr($texto, $acentos);
        error_log('inveModel - removerAcentos: Entrada: "' . $texto . '", Salida: "' . $resultado . '"');
        return $resultado;
    }

    /**
     * Obtiene la lista de productos con información de categoría y proveedor
     * 
     * @return array Lista de productos
     */
    public function getProductos(): array
    {
        try {
            error_log('inveModel - getProductos: Llamando SP sp_listar_productos');
            $stmt = $this->db->prepare("CALL sp_listar_productos()");
            $stmt->execute();
            $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            return $productos ?: [];
        } catch (\Throwable $e) {
            error_log('Error getProductos: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Obtiene las estadísticas del inventario
     * 
     * @return array Estadísticas del inventario
     */
    public function getEstadisticas(): array
    {
        try {
            error_log('inveModel - getEstadisticas: Llamando SP sp_obtener_estadisticas_inventario');
            $stmt = $this->db->prepare("CALL sp_obtener_estadisticas_inventario()");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            return [
                'total_productos' => (int)($result['total_productos'] ?? 0),
                'stock_bajo' => (int)($result['stock_bajo'] ?? 0),
                'valor_total' => (float)($result['valor_total'] ?? 0)
            ];
        } catch (\Throwable $e) {
            error_log('Error getEstadisticas: ' . $e->getMessage());
            return [
                'total_productos' => 0,
                'stock_bajo' => 0,
                'valor_total' => 0.0
            ];
        }
    }

    /**
     * Obtiene un producto específico por ID
     * 
     * @param string $id ID del producto
     * @return array|null Datos del producto
     */
    public function getProducto(string $id): ?array
    {
        try {
            error_log('inveModel - getProducto: Llamando SP sp_obtener_producto con ID: ' . $id);
            $stmt = $this->db->prepare("CALL sp_obtener_producto(:id)");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            $producto = $stmt->fetch(PDO::FETCH_ASSOC);
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            // Mapear campos del SP a los nombres esperados
            if ($producto) {
                // El SP devuelve nombre_proveedor y nombre_categoria, mapear a proveedor y categoria
                $producto['proveedor'] = $producto['nombre_proveedor'] ?? null;
                $producto['categoria'] = $producto['nombre_categoria'] ?? null;
            }
            
            return $producto ?: null;
        } catch (\Throwable $e) {
            error_log('Error getProducto: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Actualiza un producto existente
     * 
     * @param array $data Datos del producto
     * @return bool|array Resultado de la operación
     */
    public function updateProduct(array $data): bool|array
    {
        error_log('========== INICIO inveModel::updateProduct ==========');
        error_log('inveModel - updateProduct: Datos recibidos: ' . json_encode($data));
        
        try {
            // Validar que el producto existe
            error_log('inveModel - updateProduct: Verificando que producto existe, ID: ' . ($data['id_producto'] ?? 'NO DEFINIDO'));
            $producto = $this->getProducto($data['id_producto']);
            if (!$producto) {
                error_log('inveModel - updateProduct: ERROR - Producto no encontrado');
                return false;
            }
            error_log('inveModel - updateProduct: Producto encontrado: ' . json_encode($producto));

            // Extraer id_usuario para auditoría (el SP lo establecerá internamente)
            $idUsuario = isset($data['id_usuario']) ? (int)$data['id_usuario'] : 1;
            error_log('inveModel - updateProduct: Usuario para auditoría: ' . $idUsuario);

            // Usar procedimiento almacenado para actualizar el producto
            // El SP sp_actualizar_producto solo actualiza: nombre_producto, descripcion, precio, stock, id_proveedor, id_categoria
            error_log('inveModel - updateProduct: Llamando SP sp_actualizar_producto');
            
            // Obtener descripcion si existe en los datos, si no usar la actual del producto o null
            $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : ($producto['descripcion'] ?? null);
            error_log('inveModel - updateProduct: Descripción procesada: ' . ($descripcion ?? 'NULL'));
            
            // El SP usa 'precio' pero en el formulario viene como 'precio_venta_base'
            // Si viene precio_venta_base, usarlo; si no, usar precio del producto actual
            $precio = isset($data['precio_venta_base']) ? (float)$data['precio_venta_base'] : ((float)($producto['precio_venta_base'] ?? $producto['precio'] ?? 0));
            error_log('inveModel - updateProduct: Precio procesado: ' . $precio);
            
            error_log('inveModel - updateProduct: Parámetros del SP:');
            error_log('  - id_producto: ' . $data['id_producto']);
            error_log('  - nombre_producto: ' . $data['nombre_producto']);
            error_log('  - descripcion: ' . ($descripcion ?? 'NULL'));
            error_log('  - precio: ' . $precio);
            error_log('  - stock: ' . $data['stock']);
            error_log('  - id_proveedor: ' . $data['id_proveedor']);
            error_log('  - id_categoria: ' . $data['id_categoria']);
            error_log('  - id_usuario: ' . $idUsuario);
            
            $stmt = $this->db->prepare("CALL sp_actualizar_producto(:id_producto, :nombre_producto, :descripcion, :precio, :stock, :id_proveedor, :id_categoria, :id_usuario)");
            
            $stmt->bindParam(':id_producto', $data['id_producto'], PDO::PARAM_INT);
            $stmt->bindParam(':nombre_producto', $data['nombre_producto'], PDO::PARAM_STR);
            $stmt->bindParam(':descripcion', $descripcion, PDO::PARAM_STR);
            $stmt->bindParam(':precio', $precio, PDO::PARAM_STR);
            $stmt->bindParam(':stock', $data['stock'], PDO::PARAM_INT);
            $stmt->bindParam(':id_proveedor', $data['id_proveedor'], PDO::PARAM_INT);
            $stmt->bindParam(':id_categoria', $data['id_categoria'], PDO::PARAM_INT);
            $stmt->bindParam(':id_usuario', $idUsuario, PDO::PARAM_INT);

            error_log('inveModel - updateProduct: Ejecutando SP...');
            $result = $stmt->execute();
            error_log('inveModel - updateProduct: SP ejecutado. Resultado: ' . ($result ? 'TRUE' : 'FALSE'));
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            if ($result) {
                error_log('inveModel - updateProduct: Obteniendo producto actualizado...');
                $productoActualizado = $this->getProducto($data['id_producto']);
                error_log('inveModel - updateProduct: Producto actualizado obtenido: ' . json_encode($productoActualizado));
                error_log('========== FIN inveModel::updateProduct (ÉXITO) ==========');
                return $productoActualizado;
            }
            
            error_log('inveModel - updateProduct: ERROR - SP retornó FALSE');
            error_log('========== FIN inveModel::updateProduct (FALLO) ==========');
            return false;
        } catch (\Throwable $e) {
            error_log('inveModel - updateProduct: EXCEPCIÓN: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            error_log('========== FIN inveModel::updateProduct (EXCEPCIÓN) ==========');
            return false;
        }
    }

    /**
     * Elimina un producto (marca como inactivo)
     * 
     * @param array $data Datos del producto
     * @return bool|array Resultado de la operación
     */
    public function deleteProduct(array $data): bool|array
    {
        try {
            // Validar que el producto existe
            $producto = $this->getProducto($data['id_producto']);
            if (!$producto) {
                return false;
            }

            // Extraer id_usuario para auditoría (el SP lo establecerá internamente)
            $idUsuario = isset($data['id_usuario']) ? (int)$data['id_usuario'] : 1;

            // Usar procedimiento almacenado para desactivar el producto (soft delete)
            error_log('inveModel - deleteProduct: Llamando SP sp_eliminar_producto con usuario: ' . $idUsuario);
            $stmt = $this->db->prepare("CALL sp_eliminar_producto(:id_producto, :id_usuario)");
            $stmt->bindParam(':id_producto', $data['id_producto'], PDO::PARAM_INT);
            $stmt->bindParam(':id_usuario', $idUsuario, PDO::PARAM_INT);

            $result = $stmt->execute();
            // Limpiar cursores adicionales del CALL
            while ($stmt->nextRowset()) { /* noop */ }
            
            if ($result) {
                return ['id_producto' => $data['id_producto'], 'eliminado' => true];
            }
            
            return false;
        } catch (\Throwable $e) {
            error_log('Error deleteProduct: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Descontar stock de un producto cuando se crea un pedido
     * 
     * @param int $idProducto ID del producto
     * @param int $cantidad Cantidad a descontar
     * @return array Respuesta con el resultado de la operación
     */
    public function descontarStock(int $idProducto, int $cantidad): array
    {
        try {
            $stmt = $this->db->prepare("CALL sp_descontar_stock_pedido(:id_producto, :cantidad, @stock_actualizado, @mensaje, @error)");
            $stmt->bindParam(':id_producto', $idProducto, PDO::PARAM_INT);
            $stmt->bindParam(':cantidad', $cantidad, PDO::PARAM_INT);
            $stmt->execute();
            
            // Obtener los valores de salida
            $result = $this->db->query("SELECT @stock_actualizado as stock_actualizado, @mensaje as mensaje, @error as error")->fetch(PDO::FETCH_ASSOC);
            
            if ($result['error'] == 1) {
                return responseHTTP::status400($result['mensaje']);
            }
            
            return responseHTTP::status200($result['mensaje'], [
                'stock_actualizado' => (int)$result['stock_actualizado'],
                'id_producto' => $idProducto
            ]);
        } catch (\Throwable $e) {
            error_log('inveModel - descontarStock ERROR: ' . $e->getMessage());
            return responseHTTP::status500('Error al descontar stock: ' . $e->getMessage());
        }
    }

    /**
     * Obtener alertas de stock bajo
     * 
     * @param bool $soloPendientes Si es true, solo retorna alertas no atendidas
     * @return array Lista de alertas de stock
     */
    public function obtenerAlertasStock(bool $soloPendientes = true): array
    {
        try {
            $stmt = $this->db->prepare("CALL sp_obtener_alertas_stock(:solo_pendientes)");
            $soloPendientesInt = $soloPendientes ? 1 : 0;
            $stmt->bindParam(':solo_pendientes', $soloPendientesInt, PDO::PARAM_INT);
            $stmt->execute();
            $alertas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return responseHTTP::status200('Alertas obtenidas exitosamente', $alertas);
        } catch (\Throwable $e) {
            error_log('inveModel - obtenerAlertasStock ERROR: ' . $e->getMessage());
            return responseHTTP::status500('Error al obtener alertas: ' . $e->getMessage());
        }
    }

    /**
     * Marcar una alerta de stock como atendida
     * 
     * @param int $idAlerta ID de la alerta
     * @return array Respuesta con el resultado
     */
    public function marcarAlertaAtendida(int $idAlerta): array
    {
        try {
            $stmt = $this->db->prepare("CALL sp_marcar_alerta_atendida(:id_alerta)");
            $stmt->bindParam(':id_alerta', $idAlerta, PDO::PARAM_INT);
            $stmt->execute();
            
            return responseHTTP::status200('Alerta marcada como atendida');
        } catch (\Throwable $e) {
            error_log('inveModel - marcarAlertaAtendida ERROR: ' . $e->getMessage());
            return responseHTTP::status500('Error al marcar alerta: ' . $e->getMessage());
        }
    }
}
