/**
 * Módulo de barra lateral reutilizable para Color Ink
 * Replica exacta de la funcionalidad de index.html
 */

class SidebarManager {
    constructor() {
        this.header = null;
        this.body = null;
        this.isInitialized = false;
        this.currentPage = this.getCurrentPage();
        this.baseUrl = this.getBaseUrl();
    }

    /**
     * Obtiene la URL base del proyecto
     */
    getBaseUrl() {
        // Detecta automáticamente la URL base
        const path = window.location.pathname;
        const pathSegments = path.split('/');
        
        // Buscar el segmento 'public' en la URL
        const publicIndex = pathSegments.findIndex(segment => segment === 'public');
        
        if (publicIndex !== -1) {
            // Si encontramos 'public', construir la URL base hasta ese punto
            return pathSegments.slice(0, publicIndex + 1).join('/');
        }
        
        // Fallback: usar la estructura conocida
        return '/Color_Ink/public';
    }

    /**
     * Obtiene la página actual basada en el nombre del archivo
     */
    getCurrentPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const route = urlParams.get('route');
        
        if (route) {
            return route;
        }
        
        const path = window.location.pathname;
        const page = path.split('/').pop().split('.')[0];
        return page || 'index';
    }

    /**
     * Inicializa la barra lateral en la página actual
     */
    init() {
        if (this.isInitialized) {
            console.warn('Sidebar ya está inicializada');
            return;
        }

        console.log('Inicializando sidebar...');
        console.log('URL base detectada:', this.baseUrl);
        console.log('Página actual:', this.currentPage);
        console.log('URL actual:', window.location.href);

        this.createSidebar();
        this.attachEventListeners();
        
        // Si no estamos en index.html, mostrar la barra en posición vertical
        if (this.currentPage !== 'index') {
            this.moveBar();
        }
        
        this.isInitialized = true;
        console.log('Sidebar inicializada correctamente');
    }

    /**
     * Crea la estructura HTML de la barra lateral - Replica exacta de index.html
     */
    createSidebar() {
        // Crear el header con la misma estructura que index.html
        this.header = document.createElement('header');
        this.header.className = 'main';
        this.header.id = 'sidebarHeader';

        // Crear el icono de usuario - Replica exacta
        const userIcon = document.createElement('i');
        userIcon.className = 'fa-solid fa-user user-icon';
<<<<<<< Updated upstream
        userIcon.onclick = () => this.resetBarPosition();
=======
        userIcon.title = 'Gestión de Usuarios';
        userIcon.onclick = () => {
            window.location.href = `${this.baseUrl}/gestion_usu`;
        };
>>>>>>> Stashed changes

        // Crear el contenedor de iconos - Replica exacta
        const iconContainer = document.createElement('div');
        iconContainer.className = 'icon-bar-container';
        iconContainer.id = 'sidebarIconContainer';

        // Crear la barra de iconos - Replica exacta
        const iconBar = document.createElement('div');
        iconBar.className = 'icon-bar';

        // Definir los iconos con la misma lógica que index.html
        const icons = [
            { 
                class: 'fa-house', 
                onclick: () => this.handleHouseClick(),
                title: 'Inicio'
            },
            { 
<<<<<<< Updated upstream
                class: 'fa-truck-ramp-box', 
                onclick: () => this.handleOtherClick('inve.html'),
=======
                 class: 'fa-truck-ramp-box', 
                onclick: () => this.handleOtherClick(`${this.baseUrl}/pedidos`),
                title: 'Pedidos'
            },
            { 
                class: 'fa-truck', 
                onclick: () => this.handleOtherClick(`${this.baseUrl}/inve`),
>>>>>>> Stashed changes
                title: 'Inventario'
            },
            { 
                class: 'fa-truck', 
                onclick: () => this.handleOtherClick('pedidos.html'),
                title: 'Pedidos'
            },
            { 
                class: 'fa-credit-card', 
<<<<<<< Updated upstream
                onclick: () => this.handleOtherClick('gestion_usu.html'),
                title: 'Gestión de Usuarios'
=======
                onclick: () => this.handleOtherClick(`${this.baseUrl}/ventas`),
                title: 'Ventas'
>>>>>>> Stashed changes
            }
        ];

        // Crear los iconos
        icons.forEach(iconData => {
            const icon = document.createElement('i');
            icon.className = `fa-solid ${iconData.class}`;
            icon.onclick = iconData.onclick;
            icon.title = iconData.title;
            iconBar.appendChild(icon);
        });

        // Crear el icono de salida - Replica exacta
        const exitLink = document.createElement('a');
<<<<<<< Updated upstream
        exitLink.href = 'login.html';
=======
        exitLink.href = `${this.baseUrl}/login`;
>>>>>>> Stashed changes
        const exitIcon = document.createElement('i');
        exitIcon.className = 'fa-solid fa-arrow-right user-icon';
        exitIcon.title = 'Salir';
        exitLink.appendChild(exitIcon);

        // Ensamblar la estructura - Replica exacta de index.html
        iconContainer.appendChild(iconBar);
        this.header.appendChild(userIcon);
        this.header.appendChild(iconContainer);
        this.header.appendChild(exitLink);

        // Insertar al inicio del body
        document.body.insertBefore(this.header, document.body.firstChild);

        // Obtener referencia al body
        this.body = document.body;

        // Aplicar clase sidebar-content al contenido principal
        this.addSidebarContentClass();
    }

    /**
     * Maneja el click en el icono de casa (inicio) - Replica exacta de index.html
     */
    handleHouseClick() {
        if (this.currentPage === 'index') {
            // Si estamos en index, solo resetear la barra
            this.resetBarPosition();
        } else {
            // Si estamos en otra página, navegar a index
<<<<<<< Updated upstream
            window.location.href = 'index.html';
        }
    }
=======
            window.location.href = `${this.baseUrl}/index`;
    }}
>>>>>>> Stashed changes

    /**
     * Maneja el click en otros iconos - Replica exacta de index.html
     */
    handleOtherClick(url) {
        // Extraer el nombre de la página de la URL
        const pageName = url.split('/').pop();
        
        if (this.currentPage === pageName) {
            // Si estamos en la misma página, solo resetear la barra
            this.resetBarPosition();
        } else {
            // Si estamos en otra página, navegar
            window.location.href = url;
        }
    }

    /**
     * Añade la clase sidebar-content al contenido principal
     */
    addSidebarContentClass() {
        // Buscar el main o el contenido principal
        const main = document.querySelector('main');
        if (main) {
            main.classList.add('sidebar-content');
        } else {
            // Si no hay main, aplicar a body
            const bodyContent = document.body;
            bodyContent.classList.add('sidebar-content');
        }
    }

    /**
     * Adjunta los event listeners
     */
    attachEventListeners() {
        // Los event listeners ya están adjuntos en createSidebar()
        // Aquí se pueden añadir listeners adicionales si es necesario
    }

    /**
     * Mueve la barra a posición lateral - Replica exacta de index.js
     */
    moveBar() {
        if (this.header) {
            this.header.classList.add('sidebar');
            this.body.classList.add('sidebar-active');
        }
    }

    /**
     * Resetea la barra a posición horizontal - Replica exacta de index.js
     */
    resetBarPosition() {
        if (this.header) {
            this.header.classList.remove('sidebar');
            this.body.classList.remove('sidebar-active');
        }
    }

    /**
     * Destruye la barra lateral (útil para limpieza)
     */
    destroy() {
        if (this.header && this.header.parentNode) {
            this.header.parentNode.removeChild(this.header);
        }
        this.body.classList.remove('sidebar-active');
        this.isInitialized = false;
    }
}

// Crear instancia global
window.sidebarManager = new SidebarManager();

// Función de conveniencia para inicializar
window.initSidebar = function() {
    window.sidebarManager.init();
};

// Función de conveniencia para mover la barra - Replica exacta de index.js
window.moveBar = function() {
    window.sidebarManager.moveBar();
};

// Función de conveniencia para resetear la barra - Replica exacta de index.js
window.resetBarPosition = function() {
    window.sidebarManager.resetBarPosition();
};

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.sidebarManager.init();
});