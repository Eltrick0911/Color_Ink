// Script para ejecutar en la consola del navegador para forzar actualización del margen
// Copiar y pegar en la consola de Chrome/Firefox en la página de ventas

console.log('🔧 Iniciando corrección del margen...');

// Función para recalcular KPIs con datos frescos
async function corregirMargen() {
    try {
        // Obtener token
        const token = sessionStorage.getItem('firebase_id_token') || sessionStorage.getItem('access_token');
        
        if (!token) {
            console.error('❌ No hay token de autenticación');
            return;
        }
        
        // Hacer petición fresca a la API
        const url = `/Color_Ink/public/index.php?route=ventas&caso=1&action=listar&_t=${Date.now()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.data) {
            const ventas = data.data.filter(v => v.estado === 'REGISTRADA');
            
            const totalIngresos = ventas.reduce((acc, v) => acc + parseFloat(v.monto_cobrado || 0), 0);
            const totalCostos = ventas.reduce((acc, v) => acc + parseFloat(v.costo_total || 0), 0);
            const totalUtilidad = totalIngresos - totalCostos;
            const margenReal = totalIngresos > 0 ? (totalUtilidad / totalIngresos * 100) : 0;
            
            console.log('📊 Datos calculados:');
            console.log(`💰 Total Ingresos: L${totalIngresos.toFixed(2)}`);
            console.log(`💸 Total Costos: L${totalCostos.toFixed(2)}`);
            console.log(`📈 Total Utilidad: L${totalUtilidad.toFixed(2)}`);
            console.log(`📊 Margen Real: ${margenReal.toFixed(1)}%`);
            
            // Actualizar elementos del DOM directamente
            const kpiIngresos = document.getElementById('kpiIngresos');
            const kpiResultado = document.getElementById('kpiResultado');
            const kpiMargen = document.getElementById('kpiMargen');
            
            if (kpiIngresos) {
                kpiIngresos.textContent = `L${totalIngresos.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
                console.log('✅ Ingresos actualizados');
            }
            
            if (kpiResultado) {
                kpiResultado.textContent = `L${totalUtilidad.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
                kpiResultado.className = 'stat-number ' + (totalUtilidad >= 0 ? 'resultado-positivo' : 'resultado-negativo');
                console.log('✅ Utilidad actualizada');
            }
            
            if (kpiMargen) {
                kpiMargen.textContent = `${margenReal.toFixed(1)}%`;
                console.log('✅ Margen actualizado a:', margenReal.toFixed(1) + '%');
            }
            
            console.log('🎉 Corrección completada exitosamente');
            
        } else {
            console.error('❌ Error en respuesta de API:', data);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Ejecutar la corrección
corregirMargen();