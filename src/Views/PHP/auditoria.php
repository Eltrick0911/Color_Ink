<?php
// Detectar base path dinámicamente
$uri = $_SERVER['REQUEST_URI'];
$scriptName = $_SERVER['SCRIPT_NAME'];
$basePath = '';
if (strpos($uri, '/public/') !== false) {
    $parts = explode('/public/', $uri);
    $basePath = $parts[0];
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auditoría - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="<?php echo $basePath; ?>/src/Views/CSS/auditoria.css">
    <link rel="icon" href="<?php echo $basePath; ?>/src/Views/IMG/LOGO.png" type="image/png">
    <!-- Librería para exportar a Excel -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <!-- Date picker (Flatpickr) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <!-- Locale ES para Flatpickr (evita 'invalid locale undefined') -->
    <script src="https://npmcdn.com/flatpickr/dist/l10n/es.js"></script>
</head>
<body>
    <main class="sidebar-content">
        <div class="auditoria-container">
            <div class="auditoria-header">
                <h2>Auditoría de Cambios</h2>
                <div class="header-actions">
                    <button id="btnExport" class="btn btn-export"><i class="fa-solid fa-file-excel"></i> Exportar a Excel</button>
                    <button id="btnPrint" class="btn btn-print"><i class="fa-solid fa-print"></i> Imprimir</button>
                </div>
            </div>

            <div class="auditoria-filters">
                <div class="filter-group">
                    <label>Tabla</label>
                    <select id="tableSelect" class="filter-select"></select>
                </div>
                <div class="filter-group">
                    <label>Usuario</label>
                    <select id="userSelect" class="filter-select">
                        <option value="">Todos</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Transacción</label>
                    <select id="txSelect" class="filter-select">
                        <option value="">Todas</option>
                    </select>
                </div>
                <div class="filter-group" style="min-width:220px;">
                    <label>Rango de Fechas</label>
                    <input id="fechaRange" type="text" class="date-input" placeholder="Seleccionar fecha o rango" readonly style="color: white;" />
                </div>
                <div class="filter-actions">
                    
                    <button id="btnClear" class="btn btn-clear"><i class="fa-solid fa-eraser"></i> Limpiar</button>
                </div>
            </div>

            <div class="auditoria-table" id="tableWrapper">
                <table>
                    <thead id="tableHead"></thead>
                    <tbody id="tableBody"></tbody>
                </table>
                <div id="pagination" class="pagination"></div>
            </div>
        </div>

        <div id="detailModal" class="modal hidden">
            <div class="modal-content">
                <span id="modalClose" class="modal-close">&times;</span>
                <h3>Detalles de Registro</h3>
                <div class="modal-body">
                    <div class="json-block">
                        <h4>Antes</h4>
                        <pre id="jsonAntes"></pre>
                    </div>
                    <div class="json-block">
                        <h4>Después</h4>
                        <pre id="jsonDespues"></pre>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="<?php echo $basePath; ?>/src/Views/JS/sidebar.js"></script>
    <script src="<?php echo $basePath; ?>/src/Views/JS/auditoria.js"></script>
</body>
</html>
