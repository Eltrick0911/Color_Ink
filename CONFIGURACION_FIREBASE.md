# 🔥 Configuración de Firebase

## ⚠️ IMPORTANTE: Seguridad
- **NUNCA** subir `firebase_config.php` a GitHub
- **SIEMPRE** usar `firebase_config.example.php` como plantilla
- **ROTAR** las claves API periódicamente

## 🚀 Configuración inicial

### 1. Copiar archivo de ejemplo:
```bash
cp src/Config/firebase_config.example.php src/Config/firebase_config.php
```

### 2. Editar `firebase_config.php`:
```php
return [
    'project_id' => 'tu_project_id_aqui',
    'web_api_key' => 'tu_web_api_key_aqui',
];
```

### 3. Obtener claves desde Google Cloud Console:
- Ir a [Google Cloud Console](https://console.cloud.google.com/)
- Seleccionar proyecto `miappwebinkproject`
- APIs & Services → Credentials
- Crear nueva API key con restricciones

## 🔒 Restricciones recomendadas:
- **Application restrictions**: HTTP referrers
  - `localhost/*`
  - `127.0.0.1/*`
  - Tu dominio de producción
- **API restrictions**: Solo Firebase Authentication API

## 🚨 En caso de exposición:
1. **REVOCAR** inmediatamente la clave en Google Cloud Console
2. Crear nueva clave con restricciones
3. Actualizar `firebase_config.php`
4. Verificar que la aplicación funcione
