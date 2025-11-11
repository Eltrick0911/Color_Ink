<?php

namespace App\Config;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class S3Service {
    private $s3Client;
    private $bucket;
    private $region;
    private $baseUrl;

    public function __construct() {
        // Cargar .env si no está cargado
        if (!isset($_ENV['AWS_ACCESS_KEY_ID'])) {
            $dotenv = \Dotenv\Dotenv::createImmutable(dirname(__DIR__, 2));
            $dotenv->safeLoad(); // safeLoad no lanza error si ya está cargado
        }
        
        // Cargar variables de entorno
        $this->bucket = $_ENV['S3_BUCKET'] ?? 'color-ink-bucket';
        $this->region = $_ENV['AWS_REGION'] ?? 'us-east-2';
        $this->baseUrl = $_ENV['ASSET_BASE_URL'] ?? "https://{$this->bucket}.s3.{$this->region}.amazonaws.com";

        // Crear cliente S3
        $this->s3Client = new S3Client([
            'version' => 'latest',
            'region'  => $this->region,
            'credentials' => [
                'key'    => $_ENV['AWS_ACCESS_KEY_ID'] ?? '',
                'secret' => $_ENV['AWS_SECRET_ACCESS_KEY'] ?? '',
            ],
        ]);
    }

    /**
     * Subir archivo a S3
     * 
     * @param string $localFilePath Ruta local del archivo
     * @param string $s3Key Ruta/nombre del archivo en S3 (ejemplo: pedidos/imagen.jpg)
     * @param string $contentType Tipo MIME del archivo (ejemplo: image/jpeg)
     * @return array ['success' => bool, 'url' => string, 'message' => string]
     */
    public function uploadFile($localFilePath, $s3Key, $contentType = 'application/octet-stream') {
        try {
            if (!file_exists($localFilePath)) {
                return [
                    'success' => false,
                    'url' => null,
                    'message' => 'Archivo local no existe'
                ];
            }

            // Subir archivo a S3
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucket,
                'Key'    => $s3Key,
                'Body'   => fopen($localFilePath, 'rb'),
                'ContentType' => $contentType,
                // ACL removido - el bucket debe tener política de acceso público
            ]);

            // Construir URL pública
            $url = "{$this->baseUrl}/{$s3Key}";

            return [
                'success' => true,
                'url' => $url,
                'message' => 'Archivo subido exitosamente',
                'objectUrl' => $result->get('ObjectURL')
            ];

        } catch (AwsException $e) {
            error_log("Error S3: " . $e->getMessage());
            return [
                'success' => false,
                'url' => null,
                'message' => 'Error al subir a S3: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Eliminar archivo de S3
     * 
     * @param string $s3Key Ruta del archivo en S3
     * @return array ['success' => bool, 'message' => string]
     */
    public function deleteFile($s3Key) {
        try {
            $this->s3Client->deleteObject([
                'Bucket' => $this->bucket,
                'Key'    => $s3Key,
            ]);

            return [
                'success' => true,
                'message' => 'Archivo eliminado de S3'
            ];

        } catch (AwsException $e) {
            error_log("Error al eliminar de S3: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error al eliminar: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Verificar si un archivo existe en S3
     * 
     * @param string $s3Key Ruta del archivo en S3
     * @return bool
     */
    public function fileExists($s3Key) {
        try {
            $this->s3Client->headObject([
                'Bucket' => $this->bucket,
                'Key'    => $s3Key,
            ]);
            return true;
        } catch (AwsException $e) {
            return false;
        }
    }

    /**
     * Obtener URL pública de un archivo
     * 
     * @param string $s3Key Ruta del archivo en S3
     * @return string
     */
    public function getPublicUrl($s3Key) {
        return "{$this->baseUrl}/{$s3Key}";
    }

    /**
     * Extraer la key S3 desde una URL completa
     * 
     * @param string $url URL completa del archivo
     * @return string|null
     */
    public function extractS3KeyFromUrl($url) {
        // Ejemplo: https://color-ink-bucket.s3.us-east-2.amazonaws.com/pedidos/imagen.jpg
        // Retorna: pedidos/imagen.jpg
        $baseUrl = rtrim($this->baseUrl, '/');
        if (strpos($url, $baseUrl) === 0) {
            return ltrim(substr($url, strlen($baseUrl)), '/');
        }
        return null;
    }
}
