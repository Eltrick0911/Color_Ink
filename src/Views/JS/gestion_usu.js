/**
 * JavaScript para la página de gestión de usuarios
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades de gestión de usuarios
    initGestionUsuariosPage();
});

function initGestionUsuariosPage() {
    // Configurar botones de acción
    setupActionButtons();
    
    // Configurar filtros
    setupFilters();
    
    // Configurar búsqueda
    setupSearch();
    
    // Actualizar estadísticas
    updateStats();
    
    console.log('Página de gestión de usuarios inicializada');
}

function setupActionButtons() {
    const actionButtons = document.querySelectorAll('.btn-action');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const icon = this.querySelector('i');
            const action = getActionFromIcon(icon);
            
            if (action) {
                handleAction(action, this);
            }
        });
    });
}

function getActionFromIcon(icon) {
    if (icon.classList.contains('fa-eye')) return 'view';
    if (icon.classList.contains('fa-edit')) return 'edit';
    if (icon.classList.contains('fa-lock')) return 'block';
    if (icon.classList.contains('fa-unlock')) return 'unblock';
    if (icon.classList.contains('fa-trash')) return 'delete';
    return null;
}

function handleAction(action, button) {
    const row = button.closest('tr');
    const userId = row.querySelector('td:first-child').textContent;
    const userName = row.querySelector('.user-details strong').textContent;
    const userStatus = row.querySelector('.status').textContent.toLowerCase();
    
    switch(action) {
        case 'view':
            viewUsuario(userId, userName);
            break;
        case 'edit':
            editUsuario(userId, userName);
            break;
        case 'block':
            blockUsuario(userId, userName, row);
            break;
        case 'unblock':
            unblockUsuario(userId, userName, row);
            break;
        case 'delete':
            deleteUsuario(userId, userName, row);
            break;
    }
}

function viewUsuario(userId, userName) {
    alert(`Ver perfil del usuario: ${userName} (${userId})`);
    // Aquí se implementaría la lógica para mostrar el perfil
}

function editUsuario(userId, userName) {
    alert(`Editar usuario: ${userName} (${userId})`);
    // Aquí se implementaría la lógica para editar
}

function blockUsuario(userId, userName, row) {
    if (confirm(`¿Estás seguro de que quieres bloquear al usuario "${userName}" (${userId})?`)) {
        const statusCell = row.querySelector('.status');
        const lockButton = row.querySelector('.fa-lock').parentElement;
        const unlockButton = row.querySelector('.fa-unlock').parentElement;
        
        // Cambiar estado a bloqueado
        statusCell.textContent = 'Bloqueado';
        statusCell.className = 'status bloqueado';
        
        // Cambiar icono de bloqueo
        if (lockButton) {
            lockButton.innerHTML = '<i class="fa-solid fa-unlock"></i>';
            lockButton.title = 'Desbloquear';
        }
        
        updateStats();
        showNotification(`Usuario ${userName} bloqueado correctamente`, 'success');
    }
}

function unblockUsuario(userId, userName, row) {
    if (confirm(`¿Estás seguro de que quieres desbloquear al usuario "${userName}" (${userId})?`)) {
        const statusCell = row.querySelector('.status');
        const unlockButton = row.querySelector('.fa-unlock').parentElement;
        
        // Cambiar estado a activo
        statusCell.textContent = 'Activo';
        statusCell.className = 'status activo';
        
        // Cambiar icono de desbloqueo
        if (unlockButton) {
            unlockButton.innerHTML = '<i class="fa-solid fa-lock"></i>';
            unlockButton.title = 'Bloquear';
        }
        
        updateStats();
        showNotification(`Usuario ${userName} desbloqueado correctamente`, 'success');
    }
}

function deleteUsuario(userId, userName, row) {
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}" (${userId})?\n\nEsta acción no se puede deshacer.`)) {
        row.style.opacity = '0.5';
        row.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            row.remove();
            updateStats();
            showNotification(`Usuario ${userName} eliminado correctamente`, 'success');
        }, 300);
    }
}

function setupFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            filterUsuarios();
        });
    });
}

function filterUsuarios() {
    const rolFilter = document.querySelector('.filter-select:first-of-type').value;
    const estadoFilter = document.querySelector('.filter-select:last-of-type').value;
    const rows = document.querySelectorAll('.usuarios-table tbody tr');
    
    rows.forEach(row => {
        const rol = row.querySelector('.role').textContent.toLowerCase();
        const estado = row.querySelector('.status').textContent.toLowerCase();
        
        const rolMatch = rolFilter === '' || rol.includes(rolFilter.toLowerCase());
        const estadoMatch = estadoFilter === '' || estado.includes(estadoFilter.toLowerCase());
        
        if (rolMatch && estadoMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            searchUsuarios(searchTerm);
        });
    }
}

function searchUsuarios(searchTerm) {
    const rows = document.querySelectorAll('.usuarios-table tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let found = false;
        
        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(searchTerm)) {
                found = true;
            }
        });
        
        if (found || searchTerm === '') {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function updateStats() {
    const rows = document.querySelectorAll('.usuarios-table tbody tr');
    let totalUsuarios = 0;
    let usuariosActivos = 0;
    let administradores = 0;
    
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            totalUsuarios++;
            
            const rol = row.querySelector('.role').textContent.toLowerCase();
            const estado = row.querySelector('.status').textContent.toLowerCase();
            
            if (estado.includes('activo')) {
                usuariosActivos++;
            }
            
            if (rol.includes('admin')) {
                administradores++;
            }
        }
    });
    
    // Actualizar las estadísticas en la interfaz
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers[0]) statNumbers[0].textContent = totalUsuarios;
    if (statNumbers[1]) statNumbers[1].textContent = usuariosActivos;
    if (statNumbers[2]) statNumbers[2].textContent = administradores;
    if (statNumbers[3]) statNumbers[3].textContent = '2 min'; // Simulado
}

function showNotification(message, type = 'info') {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos de la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#28a745' : '#007bff'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función para el botón de nuevo usuario
document.addEventListener('DOMContentLoaded', function() {
    const nuevoUsuarioBtn = document.querySelector('.btn-nuevo-usuario');
    
    if (nuevoUsuarioBtn) {
        nuevoUsuarioBtn.addEventListener('click', function() {
            // Aquí se implementaría la lógica para crear un nuevo usuario
            alert('Funcionalidad de nuevo usuario - Por implementar');
        });
    }
});

// Función para actualizar estadísticas en tiempo real
function refreshStats() {
    updateStats();
}

// Actualizar estadísticas cada 30 segundos
setInterval(refreshStats, 30000);

// Función para exportar datos de usuarios
function exportUsuarios() {
    const rows = document.querySelectorAll('.usuarios-table tbody tr');
    let csvContent = "ID,Usuario,Email,Rol,Estado,Último Acceso\n";
    
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            const cells = row.querySelectorAll('td');
            const rowData = [];
            
            cells.forEach((cell, index) => {
                if (index < 6) { // Solo las primeras 6 columnas
                    let cellText = cell.textContent.trim();
                    if (cellText.includes(',')) {
                        cellText = `"${cellText}"`;
                    }
                    rowData.push(cellText);
                }
            });
            
            csvContent += rowData.join(',') + '\n';
        }
    });
    
    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Datos de usuarios exportados correctamente', 'success');
}