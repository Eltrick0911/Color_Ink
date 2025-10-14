<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Perfil - Color Ink</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/sidebar.css">
    <link rel="stylesheet" href="/Color_Ink/src/Views/CSS/gestion_usu.css">
    <link rel="icon" href="/Color_Ink/src/Views/IMG/LOGO.png" type="image/png">
</head>
<body>
    <script>
        if (typeof window.authGuard === 'function') {
            window.authGuard();
        }
    </script>
    <main class="sidebar-content">
        <h1>Mi Perfil</h1>
        <div class="usuarios-container">
            <div class="usuarios-header">
                <h2>Información Personal</h2>
                <button class="btn-editar-perfil" id="editProfileBtn">
                    <i class="fa-solid fa-edit"></i> Editar Perfil
                </button>
            </div>
            
            <div class="perfil-info">
                <div class="perfil-card">
                    <div class="perfil-avatar">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <div class="perfil-details">
                        <h3 id="userName">Cargando...</h3>
                        <p id="userEmail">Cargando...</p>
                        <p id="userRole">Cargando...</p>
                    </div>
                </div>
                
                <div class="perfil-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fa-solid fa-calendar"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Fecha de Registro</h3>
                            <p class="stat-number" id="fechaRegistro">-</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fa-solid fa-clock"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Último Acceso</h3>
                            <p class="stat-number" id="ultimoAcceso">-</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fa-solid fa-shield"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Estado de Cuenta</h3>
                            <p class="stat-number" id="estadoCuenta">-</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="perfil-form" id="perfilForm" style="display: none;">
                <h3>Editar Información Personal</h3>
                <form id="editProfileForm">
                    <div class="form-group">
                        <label for="nombre">Nombre Completo:</label>
                        <input type="text" id="nombre" name="nombre_usuario" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="correo" required>
                    </div>
                    <div class="form-group">
                        <label for="telefono">Teléfono:</label>
                        <input type="text" id="telefono" name="telefono">
                    </div>
                    <div class="form-group">
                        <label for="contrasena">Nueva Contraseña (opcional):</label>
                        <input type="password" id="contrasena" name="contrasena" placeholder="Dejar vacío para mantener la actual">
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancelEditBtn" class="btn-cancel">Cancelar</button>
                        <button type="submit" class="btn-save">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="/Color_Ink/src/Views/JS/login.js"></script>
    <script src="/Color_Ink/src/Views/JS/sidebar.js"></script>
    <script src="/Color_Ink/src/Views/JS/perfil.js"></script>
</body>
</html>
