<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Usuarios - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/gestion_usu.css">
    <link rel="icon" href="/Color_Ink/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
    <main class="sidebar-content">
        <h1>Gestión de Usuarios</h1>
        <div class="usuarios-container">
            <div class="usuarios-header">
                <h2>Control de Usuarios</h2>
                <button class="btn-nuevo-usuario">
                    <i class="fa-solid fa-user-plus"></i> Nuevo Usuario
                </button>
            </div>
            
            <div class="usuarios-stats">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Usuarios</h3>
                        <p class="stat-number">24</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Activos</h3>
                        <p class="stat-number">22</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-lock"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Administradores</h3>
                        <p class="stat-number">3</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Último Acceso</h3>
                        <p class="stat-number">2 min</p>
                    </div>
                </div>
            </div>

            <div class="usuarios-filters">
                <input type="text" placeholder="Buscar usuarios..." class="search-input">
                <select class="filter-select">
                    <option value="">Todos los roles</option>
                    <option value="admin">Administrador</option>
                    <option value="empleado">Empleado</option>
                    <option value="cliente">Cliente</option>
                </select>
                <select class="filter-select">
                    <option value="">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                </select>
            </div>

            <div class="usuarios-table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Último Acceso</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>#001</td>
                            <td>
                                <div class="user-info">
                                    <div class="user-avatar">
                                        <i class="fa-solid fa-user"></i>
                                    </div>
                                    <div class="user-details">
                                        <strong>Juan Pérez</strong>
                                        <small>juan.perez</small>
                                    </div>
                                </div>
                            </td>
                            <td>juan.perez@colorink.com</td>
                            <td><span class="role admin">Administrador</span></td>
                            <td><span class="status activo">Activo</span></td>
                            <td>Hace 2 min</td>
                            <td>
                                <button class="btn-action" title="Ver perfil"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action" title="Editar"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action" title="Bloquear"><i class="fa-solid fa-lock"></i></button>
                                <button class="btn-action" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>#002</td>
                            <td>
                                <div class="user-info">
                                    <div class="user-avatar">
                                        <i class="fa-solid fa-user"></i>
                                    </div>
                                    <div class="user-details">
                                        <strong>María García</strong>
                                        <small>maria.garcia</small>
                                    </div>
                                </div>
                            </td>
                            <td>maria.garcia@colorink.com</td>
                            <td><span class="role empleado">Empleado</span></td>
                            <td><span class="status activo">Activo</span></td>
                            <td>Hace 15 min</td>
                            <td>
                                <button class="btn-action" title="Ver perfil"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action" title="Editar"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action" title="Bloquear"><i class="fa-solid fa-lock"></i></button>
                                <button class="btn-action" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>#003</td>
                            <td>
                                <div class="user-info">
                                    <div class="user-avatar">
                                        <i class="fa-solid fa-user"></i>
                                    </div>
                                    <div class="user-details">
                                        <strong>Carlos López</strong>
                                        <small>carlos.lopez</small>
                                    </div>
                                </div>
                            </td>
                            <td>carlos.lopez@colorink.com</td>
                            <td><span class="role cliente">Cliente</span></td>
                            <td><span class="status inactivo">Inactivo</span></td>
                            <td>Hace 2 horas</td>
                            <td>
                                <button class="btn-action" title="Ver perfil"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action" title="Editar"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action" title="Desbloquear"><i class="fa-solid fa-unlock"></i></button>
                                <button class="btn-action" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>#004</td>
                            <td>
                                <div class="user-info">
                                    <div class="user-avatar">
                                        <i class="fa-solid fa-user"></i>
                                    </div>
                                    <div class="user-details">
                                        <strong>Ana Martínez</strong>
                                        <small>ana.martinez</small>
                                    </div>
                                </div>
                            </td>
                            <td>ana.martinez@colorink.com</td>
                            <td><span class="role empleado">Empleado</span></td>
                            <td><span class="status bloqueado">Bloqueado</span></td>
                            <td>Hace 1 día</td>
                            <td>
                                <button class="btn-action" title="Ver perfil"><i class="fa-solid fa-eye"></i></button>
                                <button class="btn-action" title="Editar"><i class="fa-solid fa-edit"></i></button>
                                <button class="btn-action" title="Desbloquear"><i class="fa-solid fa-unlock"></i></button>
                                <button class="btn-action" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
    <script src="/Color_Ink/src/Views/JS/gestion_usu.js"></script>
</body>
</html>
