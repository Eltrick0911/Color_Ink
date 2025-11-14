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
    }

    /**
     * Obtiene la página actual basada en el nombre del archivo
     */
    getCurrentPage() {
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

        // En index.php ya existe un header estático, no lo toques
        if (this.currentPage === 'index') {
            // Verificar si ya existe un header antes de intentar nada
            const existingHeader = document.querySelector('header.main');
            if (existingHeader) {
                this.header = existingHeader;
                this.body = document.body;
                this.isInitialized = true;
                console.log('Sidebar: usando header existente en index');
                return;
            }
        }

        // En otras páginas, crear el sidebar dinámicamente
        this.createSidebar();
        this.attachEventListeners();
        this.moveBar(); // Mostrar en posición vertical
        
        this.isInitialized = true;
        console.log('Sidebar: creada correctamente para ' + this.currentPage);
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
        userIcon.title = 'Gestión de Usuarios';
        userIcon.onclick = () => {
            window.location.href = '/gestion_usu';
        };

        // Crear el contenedor de iconos - Replica exacta
        const iconContainer = document.createElement('div');
        iconContainer.className = 'icon-bar-container';
        iconContainer.id = 'sidebarIconContainer';

        // Crear la barra de iconos - Replica exacta
        const iconBar = document.createElement('div');
        iconBar.className = 'icon-bar';

        // Calcular si el usuario es admin (rol 1)
        const isAdmin = (() => {
            try {
                const u = sessionStorage.getItem('user');
                if (u) {
                    const ju = JSON.parse(u);
                    return Number(ju.id_rol) === 1;
                }
            } catch (e) {}
            // Fallback: intentar decodificar el JWT local (sin validar) sólo para UI
            try {
                const t = sessionStorage.getItem('access_token');
                if (t && t.split('.').length === 3) {
                    const payload = JSON.parse(atob(t.split('.')[1]));
                    const data = payload.data || payload;
                    return Number(data.id_rol) === 1;
                }
            } catch (e) {}
            return false;
        })();

        // Calcular base path para todas las rutas
        const getBase = () => {
            const parts = window.location.pathname.split('/');
            const pIdx = parts.indexOf('public');
            if (pIdx > 1) {
                return '/' + parts.slice(1, pIdx).join('/');
            }
            // Para rutas en la raíz como /auditoria, /ventas, etc.
            return '';
        };
        const basePath = getBase();

        // Definir los iconos con rutas directas para Render
        const icons = [
            { 
                class: 'fa-house', 
                onclick: () => this.handleHouseClick(),
                title: 'Inicio'
            },
            { 
                class: 'fa-truck-ramp-box', 
                onclick: () => this.handleOtherClick('/pedidos'),
                title: 'Pedidos'
            },
            { 
                class: 'fa-truck', 
                onclick: () => this.handleOtherClick('/inve'),
                title: 'Inventario'
            },
            { 
                class: 'fa-credit-card', 
                onclick: () => this.handleOtherClick('/ventas'),
                title: 'Ventas'
            }
        ];

        // Agregar Auditoría sólo para admins
        if (isAdmin) {
            icons.push({
                class: 'fa-clipboard-list',
                onclick: () => this.handleOtherClick('/auditoria'),
                title: 'Auditoría'
            });
        }

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
        exitLink.href = '#';
        const exitIcon = document.createElement('i');
        exitIcon.className = 'fa-solid fa-arrow-right user-icon';
        exitIcon.title = 'Salir';
        exitLink.appendChild(exitIcon);

        // Manejar logout limpiando tokens y redirigiendo
        exitLink.addEventListener('click', async (e) => {
            e.preventDefault();
            // Si existe función global, usarla
            if (typeof window.performLogout === 'function') {
                await window.performLogout();
                return;
            }
            // Fallback local
            try {
                const apiEntry = `/public/index.php`;
                const loginUrl = `/login`;
                const jwtToken = sessionStorage.getItem('access_token');
                if (jwtToken) {
                    try {
                        await fetch(`${apiEntry}?route=auth&caso=1&action=logout`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${jwtToken}` }
                        });
                    } catch (_) {}
                }
                try { if (window.firebase && firebase.auth) await firebase.auth().signOut(); } catch(_) {}
                sessionStorage.removeItem('firebase_id_token');
                sessionStorage.removeItem('access_token');
                sessionStorage.removeItem('user');
                window.location.replace(loginUrl);
            } catch (_) {
                sessionStorage.clear();
                window.location.replace('/login');
            }
        });

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
            window.location.href = '/index';
        }
    }

    /**
     * Maneja el click en otros iconos - Replica exacta de index.html
     */
    handleOtherClick(page) {
        if (this.currentPage === page.split('.')[0]) {
            // Si estamos en la misma página, solo resetear la barra
            this.resetBarPosition();
        } else {
            // Si estamos en otra página, navegar
            window.location.href = page;
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