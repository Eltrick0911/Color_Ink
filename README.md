# Color_Ink
Preoject_Ink desarrollo de aplicación de gestión de actividades

## Tests rápidos de base de datos

Se añadieron dos scripts en la carpeta raíz para verificar la conexión a MySQL y la existencia de datos en la tabla `pedido` de la base de datos `color_ink`.

- `test_db_connection.php`: verifica la conexión y muestra información del servidor.
- `test_pedidos_exists.php`: comprueba que la tabla `pedido` exista y tenga al menos un registro.

Requisitos:

- Tener configurado el archivo `.env` en la raíz con las variables: `USER`, `PASSWORD`, `DB` (por ejemplo `color_ink`), `IP` (por ejemplo `127.0.0.1`) y `PORT` (por ejemplo `3306`).
- PHP CLI disponible (por ejemplo, con XAMPP).

Ejecución (PowerShell):

```
php .\test_db_connection.php
php .\test_pedidos_exists.php
```

Los scripts devuelven código de salida `0` en caso de PASS y distinto de `0` en FAIL.
