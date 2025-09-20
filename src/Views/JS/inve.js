/**
 * JavaScript para la página de inventario
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades de inventario
    initInventarioPage();
});

function initInventarioPage() {
    // Configurar botones de acción
    setupActionButtons();
    
    // Configurar filtros
    setupFilters();
    
    // Configurar búsqueda
    setupSearch();
    
    // Actualizar estadísticas
    updateStats();
    
    console.log('Página de inventario inicializada');
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
    if (icon.classList.contains('fa-trash')) return 'delete';
    return null;
}

function handleAction(action, button) {
    const row = button.closest('tr');
    const codigo = row.querySelector('td:first-child').textContent;
    const producto = row.querySelector('td:nth-child(2)').textContent;
    
    switch(action) {
        case 'view':
            viewProducto(codigo, producto);
            break;
        case 'edit':
            editProducto(codigo, producto);
            break;
        case 'delete':
            deleteProducto(codigo, producto, row);
            break;
    }
}

function viewProducto(codigo, producto) {
    alert(`Ver detalles del producto: ${producto} (${codigo})`);
    // Aquí se implementaría la lógica para mostrar los detalles
}

function editProducto(codigo, producto) {
    alert(`Editar producto: ${producto} (${codigo})`);
    // Aquí se implementaría la lógica para editar
}

function deleteProducto(codigo, producto, row) {
    if (confirm(`¿Estás seguro de que quieres eliminar el producto "${producto}" (${codigo})?`)) {
        row.style.opacity = '0.5';
        row.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            row.remove();
            updateStats();
            showNotification('Producto eliminado correctamente', 'success');
        }, 300);
    }
}

function setupFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            filterInventario();
        });
    });
}

function filterInventario() {
    const categoriaFilter = document.querySelector('.filter-select:first-of-type').value;
    const estadoFilter = document.querySelector('.filter-select:last-of-type').value;
    const rows = document.querySelectorAll('.inventario-table tbody tr');
    
    rows.forEach(row => {
        const categoria = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        const estado = row.querySelector('.status').textContent.toLowerCase();
        
        const categoriaMatch = categoriaFilter === '' || categoria.includes(categoriaFilter.toLowerCase());
        const estadoMatch = estadoFilter === '' || estado.includes(estadoFilter.toLowerCase().replace('-', ' '));
        
        if (categoriaMatch && estadoMatch) {
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
            searchProductos(searchTerm);
        });
    }
}

function searchProductos(searchTerm) {
    const rows = document.querySelectorAll('.inventario-table tbody tr');
    
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
    const rows = document.querySelectorAll('.inventario-table tbody tr');
    let totalProductos = 0;
    let stockBajo = 0;
    let valorTotal = 0;
    
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            totalProductos++;
            
            const stock = parseInt(row.querySelector('td:nth-child(4)').textContent);
            const precio = parseFloat(row.querySelector('td:nth-child(5)').textContent.replace('$', ''));
            const estado = row.querySelector('.status').textContent.toLowerCase();
            
            if (estado.includes('bajo') || stock < 5) {
                stockBajo++;
            }
            
            valorTotal += stock * precio;
        }
    });
    
    // Actualizar las estadísticas en la interfaz
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers[0]) statNumbers[0].textContent = totalProductos;
    if (statNumbers[1]) statNumbers[1].textContent = stockBajo;
    if (statNumbers[2]) statNumbers[2].textContent = `$${valorTotal.toLocaleString()}`;
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

// Función para el botón de nuevo producto
document.addEventListener('DOMContentLoaded', function() {
    const nuevoProductoBtn = document.querySelector('.btn-nuevo-producto');
    
    if (nuevoProductoBtn) {
        nuevoProductoBtn.addEventListener('click', function() {
            // Aquí se implementaría la lógica para crear un nuevo producto
            alert('Funcionalidad de nuevo producto - Por implementar');
        });
    }
});

// Función para actualizar estadísticas en tiempo real
function refreshStats() {
    updateStats();
}

// Actualizar estadísticas cada 30 segundos
setInterval(refreshStats, 30000);
