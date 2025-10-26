<?php

namespace App\Controllers;

use App\Config\responseHTTP;

class UploadController
{
    private $uploadDir;
    private $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    private $maxFileSize = 5242880; // 5MB

    public function __construct()
    {
        // Directorio de uploads relativo a la raíz del proyecto
        $this->uploadDir = dirname(__DIR__, 2) . '/uploads/pedidos/';
        
        // Crear directorio si no existe
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }

    /**
     * Upload de imagen para pedidos
     */
    public function uploadImage(array $headers, array $files): void
    {
        try {
            error_log('UploadController - uploadImage: Iniciando upload');
            
            // Verificar que se subió un archivo
            if (!isset($files['imagen']) || $files['imagen']['error'] === UPLOAD_ERR_NO_FILE) {
                echo json_encode(responseHTTP::status400('No se recibió ningún archivo'));
                return;
            }

            $file = $files['imagen'];

            // Verificar errores de upload
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $errorMsg = $this->getUploadErrorMessage($file['error']);
                error_log("UploadController - Error de upload: $errorMsg");
                echo json_encode(responseHTTP::status400($errorMsg));
                return;
            }

            // Validar tamaño
            if ($file['size'] > $this->maxFileSize) {
                echo json_encode(responseHTTP::status400('El archivo es demasiado grande. Máximo 5MB'));
                return;
            }

            // Validar extensión
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($extension, $this->allowedExtensions)) {
                echo json_encode(responseHTTP::status400('Tipo de archivo no permitido. Solo se permiten imágenes (jpg, png, gif, webp)'));
                return;
            }

            // Generar nombre único
            $nombreUnico = 'pedido_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
            $rutaDestino = $this->uploadDir . $nombreUnico;

            // Mover archivo
            if (!move_uploaded_file($file['tmp_name'], $rutaDestino)) {
                error_log('UploadController - Error al mover archivo');
                echo json_encode(responseHTTP::status500('Error al guardar el archivo'));
                return;
            }

            // URL relativa para guardar en BD
            $urlRelativa = '/Color_Ink/uploads/pedidos/' . $nombreUnico;

            error_log("UploadController - Archivo subido exitosamente: $nombreUnico");

            $response = responseHTTP::status200('Imagen subida exitosamente');
            $response['data'] = [
                'filename' => $nombreUnico,
                'url' => $urlRelativa,
                'size' => $file['size']
            ];

            header('Content-Type: application/json');
            echo json_encode($response);

        } catch (\Exception $e) {
            error_log('ERROR UploadController - uploadImage: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    /**
     * Upload múltiple de imágenes
     */
    public function uploadMultiple(array $headers, array $files): void
    {
        try {
            error_log('UploadController - uploadMultiple: Iniciando upload múltiple');
            
            if (!isset($files['imagenes']) || !is_array($files['imagenes']['name'])) {
                echo json_encode(responseHTTP::status400('No se recibieron archivos'));
                return;
            }

            $uploadedFiles = [];
            $errors = [];
            
            $totalFiles = count($files['imagenes']['name']);
            
            for ($i = 0; $i < $totalFiles; $i++) {
                // Reconstruir array de archivo individual
                $file = [
                    'name' => $files['imagenes']['name'][$i],
                    'type' => $files['imagenes']['type'][$i],
                    'tmp_name' => $files['imagenes']['tmp_name'][$i],
                    'error' => $files['imagenes']['error'][$i],
                    'size' => $files['imagenes']['size'][$i]
                ];

                // Saltar si no se subió archivo
                if ($file['error'] === UPLOAD_ERR_NO_FILE) {
                    continue;
                }

                // Validaciones
                if ($file['error'] !== UPLOAD_ERR_OK) {
                    $errors[] = $file['name'] . ': ' . $this->getUploadErrorMessage($file['error']);
                    continue;
                }

                if ($file['size'] > $this->maxFileSize) {
                    $errors[] = $file['name'] . ': Archivo demasiado grande (máx 5MB)';
                    continue;
                }

                $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                if (!in_array($extension, $this->allowedExtensions)) {
                    $errors[] = $file['name'] . ': Tipo de archivo no permitido';
                    continue;
                }

                // Guardar archivo
                $nombreUnico = 'pedido_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
                $rutaDestino = $this->uploadDir . $nombreUnico;

                if (move_uploaded_file($file['tmp_name'], $rutaDestino)) {
                    $uploadedFiles[] = [
                        'original_name' => $file['name'],
                        'filename' => $nombreUnico,
                        'url' => '/Color_Ink/uploads/pedidos/' . $nombreUnico,
                        'size' => $file['size']
                    ];
                } else {
                    $errors[] = $file['name'] . ': Error al guardar';
                }
            }

            $response = responseHTTP::status200('Upload completado');
            $response['data'] = [
                'uploaded' => $uploadedFiles,
                'total_uploaded' => count($uploadedFiles),
                'errors' => $errors,
                'total_errors' => count($errors)
            ];

            header('Content-Type: application/json');
            echo json_encode($response);

        } catch (\Exception $e) {
            error_log('ERROR UploadController - uploadMultiple: ' . $e->getMessage());
            echo json_encode(responseHTTP::status500('Error: ' . $e->getMessage()));
        }
    }

    private function getUploadErrorMessage(int $errorCode): string
    {
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return 'El archivo excede el tamaño máximo permitido';
            case UPLOAD_ERR_PARTIAL:
                return 'El archivo se subió parcialmente';
            case UPLOAD_ERR_NO_FILE:
                return 'No se subió ningún archivo';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'Falta el directorio temporal';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Error al escribir el archivo en disco';
            case UPLOAD_ERR_EXTENSION:
                return 'Una extensión de PHP detuvo la subida del archivo';
            default:
                return 'Error desconocido al subir el archivo';
        }
    }
}
