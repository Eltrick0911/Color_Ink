<?php

namespace App\Controllers;

use App\Config\responseHTTP;
use App\Config\S3Service;

class UploadController
{
    private $uploadDir;
    private $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    private $maxFileSize = 5242880; // 5MB
    private $s3Service;
    private $useS3;

    public function __construct()
    {
        // Directorio temporal para procesar uploads antes de S3
        $this->uploadDir = sys_get_temp_dir() . '/color_ink_uploads/';
        
        // Crear directorio temporal si no existe
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }

        // Inicializar servicio S3
        $this->s3Service = new S3Service();
        $this->useS3 = true; // Usar S3 por defecto
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
            
            // Determinar tipo MIME
            $mimeType = $this->getMimeType($extension);

            if ($this->useS3) {
                // Subir a S3
                $s3Key = 'pedidos/' . $nombreUnico;
                $result = $this->s3Service->uploadFile($file['tmp_name'], $s3Key, $mimeType);

                if (!$result['success']) {
                    error_log('UploadController - Error S3: ' . $result['message']);
                    echo json_encode(responseHTTP::status500($result['message']));
                    return;
                }

                $urlArchivo = $result['url'];
                error_log("UploadController - Archivo subido a S3: $urlArchivo");

            } else {
                // Fallback: guardar local (modo antiguo)
                $rutaDestino = $this->uploadDir . $nombreUnico;
                if (!move_uploaded_file($file['tmp_name'], $rutaDestino)) {
                    error_log('UploadController - Error al mover archivo');
                    echo json_encode(responseHTTP::status500('Error al guardar el archivo'));
                    return;
                }
                $urlArchivo = '/Color_Ink/uploads/pedidos/' . $nombreUnico;
            }

            $response = responseHTTP::status200('Imagen subida exitosamente');
            $response['data'] = [
                'filename' => $nombreUnico,
                'url' => $urlArchivo,
                'size' => $file['size'],
                'storage' => $this->useS3 ? 's3' : 'local'
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
            error_log('FILES recibido: ' . print_r($files, true));
            
            if (!isset($files['imagenes'])) {
                error_log('ERROR: No existe $files[imagenes]');
                echo json_encode(responseHTTP::status400('No se recibieron archivos - campo imagenes no encontrado'));
                return;
            }
            
            // Normalizar estructura: si es un solo archivo, convertirlo a array
            $filesArray = [];
            
            if (is_array($files['imagenes']['name'])) {
                // Múltiples archivos
                error_log('Múltiples archivos detectados');
                $totalFiles = count($files['imagenes']['name']);
                for ($i = 0; $i < $totalFiles; $i++) {
                    $filesArray[] = [
                        'name' => $files['imagenes']['name'][$i],
                        'type' => $files['imagenes']['type'][$i],
                        'tmp_name' => $files['imagenes']['tmp_name'][$i],
                        'error' => $files['imagenes']['error'][$i],
                        'size' => $files['imagenes']['size'][$i]
                    ];
                }
            } else {
                // Un solo archivo
                error_log('Un solo archivo detectado');
                $filesArray[] = [
                    'name' => $files['imagenes']['name'],
                    'type' => $files['imagenes']['type'],
                    'tmp_name' => $files['imagenes']['tmp_name'],
                    'error' => $files['imagenes']['error'],
                    'size' => $files['imagenes']['size']
                ];
            }
            
            error_log('Total de archivos a procesar: ' . count($filesArray));

            $uploadedFiles = [];
            $errors = [];
            
            foreach ($filesArray as $file) {

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

                // Generar nombre único
                $nombreUnico = 'pedido_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
                $mimeType = $this->getMimeType($extension);

                if ($this->useS3) {
                    // Subir a S3
                    $s3Key = 'pedidos/' . $nombreUnico;
                    $result = $this->s3Service->uploadFile($file['tmp_name'], $s3Key, $mimeType);

                    if ($result['success']) {
                        $uploadedFiles[] = [
                            'original_name' => $file['name'],
                            'filename' => $nombreUnico,
                            'url' => $result['url'],
                            'size' => $file['size'],
                            'storage' => 's3'
                        ];
                    } else {
                        $errors[] = $file['name'] . ': ' . $result['message'];
                    }

                } else {
                    // Fallback: guardar local
                    $rutaDestino = $this->uploadDir . $nombreUnico;
                    if (move_uploaded_file($file['tmp_name'], $rutaDestino)) {
                        $uploadedFiles[] = [
                            'original_name' => $file['name'],
                            'filename' => $nombreUnico,
                            'url' => '/Color_Ink/uploads/pedidos/' . $nombreUnico,
                            'size' => $file['size'],
                            'storage' => 'local'
                        ];
                    } else {
                        $errors[] = $file['name'] . ': Error al guardar';
                    }
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

    private function getMimeType(string $extension): string
    {
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp'
        ];
        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }
}
