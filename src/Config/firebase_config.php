<?php

/**
 * Configuración de Firebase
 * Configuración segura para la aplicación Color Ink
 */

return [
    'project_id' => 'miappwebinkproject',
    'web_api_key' => 'AIzaSyBM1Wj1JSqHRHKoCwId-vhJ7eisM7ieTAY',
];

// Debug: Verificar que se carga correctamente
error_log('Firebase Config cargado: ' . json_encode([
    'project_id' => 'miappwebinkproject',
    'web_api_key' => 'AIzaSyBM1Wj1JSqHRHKoCwId-vhJ7eisM7ieTAY'
]));
