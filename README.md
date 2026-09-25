# J.D. — Sistema de Asistencia (Web / HTML5)

Este proyecto es una aplicación web personal, interactiva y de alto rendimiento para el control y análisis de asistencia académica a partir del informe en Excel **`Informe Asistencia.xlsx`**. 

Permite visualizar, filtrar, auditar y consumir toda la información del sistema de asistencia directamente desde cualquier navegador web, sin requerir licencias de Excel ni software especializado, y con capacidad de despliegue inmediato en cualquier servidor web (Apache, Nginx, GitHub Pages, Netlify, Vercel o intranet institucional).

---

## 🚀 Características Principales

1. **Reproducción 100% Exacta de Fórmulas y Cálculos**:
   - Cálculos idénticos a los del Excel original (denominadores de asistencia, estimaciones de clases dictadas por grupo, tratamiento de traslados con ajuste proporcional o suma del grupo de origen, indicadores de inclusión, semáforo institucional y prioridades de riesgo).
   - Verificado con 0 discrepancias frente a las 2,127 matrículas y los 57 grupos académicos.

2. **Vistas y Módulos Disponibles (Páginas del Excel)**:
   - **Inicio (Dashboard General)**:
     - Filtros interactivos en cascada por **Programa**, **Grupo** y **Docente**.
     - Tarjetas de KPIs globales: Cursos, Grupos, Estudiantes únicos, Matrículas, Clases dictadas, Asistencias, Inasistencias, Estudiantes en riesgo (🟡+🟠) y Críticos (🔴).
     - Gráfica interactiva de barras con asistencia promedio por programa y gráfica de dona con la distribución por nivel de riesgo.
     - Tabla de los **Grupos con Menor Asistencia** con acceso directo al detalle del grupo.
   - **Cursos (Vista Detallada por Grupo)**:
     - Selección de programa y grupo.
     - Ficha técnica del curso: docente, horario, estudiantes evaluados, clases planeadas y dictadas, y semáforo.
     - Listado completo de estudiantes del grupo ordenado de menor a mayor asistencia, con buscador rápido y botón de exportación a CSV.
     - Ranking comparativo de todos los grupos del mismo programa.
   - **Ficha Estudiante (Perfil 360°)**:
     - Buscador inteligente en tiempo real por **Nombre** o **Cédula** con autocompletado interactivo.
     - Información académica y de contacto (correo y teléfono cruzados con la Base de Estudiantes).
     - Tarjetas de indicadores consolidados de asistencia.
     - Tabla de todas las matrículas del estudiante (activas, traslados y retiros).
     - Contenedor para historial sesión a sesión (plantilla diaria).
   - **Alertas (Atención Prioritaria)**:
     - Filtros por Programa, Docente y Tipo de Alerta.
     - Botones contadores de acceso rápido: 🔴 Crítico, 🟠 Alerta, 🟡 Seguimiento, ⚪ Sin Registro, ⚠️ Ausencias Consecutivas, 📉 Tendencia Negativa.
     - Tabla ordenada por prioridad (1 = Máxima) con la **Acción Sugerida** institucional según el protocolo oficial.
   - **Inconsistencias (Auditoría de Calidad de Datos)**:
     - Detección automática en vivo de las **11 anomalías y alertas de calidad** del archivo de origen.
     - **Tabla A**: Matrículas activas en Estudiantes no presentes en Base Estudiantes.
     - **Tabla B**: Registros en Base Estudiantes que no coinciden con las matrículas activas.
     - **Tabla C**: Estudiantes sin registro (`null/null`) y usuarios de prueba.
   - **Directorio de Grupos (`GRUPOS`)**:
     - Tabla maestra de los 57 grupos con métricas de asistencia, porcentajes de riesgo y exportación a CSV.
   - **Directorio de Estudiantes (`Estudiantes`)**:
     - Base completa de 2,127 registros con paginación, filtros por estado (Activa / Retirado), buscador global y exportación total a CSV.
   - **Parámetros y Umbrales (`PARAMETROS`)**:
     - Permite ajustar interactivamente los porcentajes del semáforo (🔴 Crítico, 🟠 Alerta, 🟡 Seguimiento, 🟢 Normal) y el umbral de faltas consecutivas, recalculando todo el tablero en tiempo real.
   - **Cargar Datos / Integración API**:
     - Arrastre y suelte un nuevo archivo `Informe Asistencia.xlsx` directamente en el navegador para actualizar todo el tablero al instante (usando SheetJS localmente en el cliente).
     - Botón para descargar el dataset consolidado en formato `data.json`.
     - Ejemplos de código para consumir la información desde otras páginas web o aplicaciones.

---

## 📁 Estructura del Proyecto

```
j-d-asistencia/
├── index.html              # Página web principal (Single Page Application responsive)
├── README.md               # Documentación y guía de integración
├── css/
│   └── styles.css          # Estilos institucionales modernos y responsivos
├── js/
│   ├── app.js              # Controlador principal, navegación y gestión de estado
│   ├── engine.js           # Motor de cálculo que replica 100% de las fórmulas de Excel
│   ├── views.js            # Renderizadores HTML de cada una de las vistas
│   └── data.js             # Base de datos empaquetada para uso offline inmediato
└── data/
    └── data.json           # Base de datos estructurada en formato JSON estándar
```

---

## 💻 Cómo Usar y Ejecutar el Proyecto

### Opción 1: Abrir directamente (Sin Servidor)
Puede hacer doble clic en el archivo **`index.html`** en su explorador de archivos. Gracias a que los datos están precargados en `js/data.js`, la aplicación funciona inmediatamente de forma offline en cualquier navegador moderno (Chrome, Edge, Safari, Firefox).

### Opción 2: Servidor Web Local (Recomendado para desarrollo)
Abra una terminal en esta carpeta y ejecute:

```bash
# Con Python 3:
python3 -m http.server 8080

# O con Node.js:
npx serve .
```

Luego abra en su navegador: `http://localhost:8080`

### Opción 3: Subirlo a la Web / Hosting
Copie o suba todos los archivos de esta carpeta a su proveedor de hosting o servidor:
- **GitHub Pages**: Suba los archivos a un repositorio y active GitHub Pages en la rama principal.
- **Vercel / Netlify**: Conecte la carpeta o arrastre la carpeta completa para desplegar en 10 segundos.
- **Servidor Institucional (Apache / Nginx)**: Copie los archivos en la ruta pública (`/var/www/html/` o subcarpeta).

---

## 🌐 Cómo Consumir la Información desde Otra Página Web

Para integrar estos datos en otra página web o aplicación de la institución, puede consumir el archivo `data/data.json` o interactuar directamente con el motor `engine.js`:

### 1. Consumo vía `fetch` en JavaScript (Frontend)

```javascript
fetch('https://su-dominio.edu.co/asistencia/data/data.json')
  .then(response => response.json())
  .then(data => {
    console.log("Total grupos:", data.grupos.length);
    console.log("Total matrículas:", data.matriculas.length);

    // Filtrar grupos con menor asistencia
    const gruposEnRiesgo = data.grupos.filter(g => g.porcRiesgo > 0.15);
    console.log("Grupos con más del 15% de estudiantes en riesgo:", gruposEnRiesgo);

    // Buscar la ficha de un estudiante específico por cédula
    const cedulaBuscada = "1013340045";
    const matriculasEstudiante = data.matriculas.filter(m => m.cedula === cedulaBuscada);
    console.log("Matrículas del estudiante:", matriculasEstudiante);
  })
  .catch(error => console.error("Error al cargar datos:", error));
```

### 2. Uso del Motor de Fórmulas (`engine.js`) en Node.js o Backend

El archivo `js/engine.js` está diseñado con compatibilidad universal (UMD / CommonJS / Browser). Si desea correr los cálculos en su propio servidor Node.js o procesar nuevos archivos automáticamente:

```javascript
const Engine = require('./js/engine.js');
const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('./data/data.json', 'utf8'));

// Recalcular todo el informe con las fórmulas de Excel
const estadoCalculado = Engine.recalculateAll(rawData);

// Obtener los KPIs del dashboard para un programa o docente
const kpis = Engine.calculateDashboardKPIs(estadoCalculado, "(Todos)", "(Todos)", "(Todos)");
console.log("Asistencia promedio global:", (kpis.asistenciaPromedio * 100).toFixed(2) + "%");
console.log("Total estudiantes en estado crítico:", kpis.criticos);
```

---

## 📡 Sincronización en Vivo de Clases y Asistencias

El proyecto cuenta con integración directa a la plataforma web:  
**`https://gestorproyectos.esumer.edu.co/tablero/proyecto/AAAABNdd2QfFj8cv`**

### Método A: Comando de Terminal (Rápido y Automático)
En la terminal dentro de esta carpeta, ejecute:

```bash
python3 actualizar_desde_web.py
```

El script se conecta a la API (`/api/v1/public/proyectos/AAAABNdd2QfFj8cv/tablero`), descarga los 7 programas, los 57 grupos y más de 9,600 asistencias sesión a sesión con sus fechas reales, y actualiza automáticamente `data/data.json` y `js/data.js` en 4 segundos.

### Método B: Servidor Local con Botón de 1 Clic
Inicie el servidor local:

```bash
python3 server.py
```

Abra `http://localhost:8080`, vaya a la pestaña **"Cargar Datos / API"** y presione el botón **"Sincronizar en Vivo Ahora"**. La aplicación consultará los datos y recargará todo el tablero automáticamente.

---

## 🔄 Actualización de Datos con Archivos de Excel

En la pestaña **"Cargar Datos / API"** de la aplicación web también encontrará un área de arrastre de archivos. Si en lugar de la web recibe un archivo Excel (`Informe Asistencia.xlsx`), simplemente arrástrelo y suéltelo en esa área:
- La aplicación leerá las hojas `Estudiantes` y `GRUPOS` directamente en el navegador del usuario.
- Recalculará al instante todos los indicadores, semáforos, alertas y rankings sin necesidad de reiniciar nada.
- Podrá descargar el nuevo `data.json` actualizado con un solo clic.

---

## ☁️ Despliegue en la Nube (Vercel / Netlify)

El proyecto está 100% preparado para ser subido a **Vercel** o **Netlify**:

### 1. Despliegue en Vercel
1. Suba este repositorio a su cuenta de GitHub.
2. Inicie sesión en [Vercel](https://vercel.com) e importe el repositorio.
3. Vercel detectará automáticamente `vercel.json` y la función serverless en `api/sync.js`.
4. Haga clic en **Deploy**.
5. ¡Listo! Su tablero estará en línea en `https://su-proyecto.vercel.app`.
   - El botón **«Sincronizar en Vivo Ahora»** funcionará en la nube con un solo clic llamando a `api/sync.js`.

### 2. Despliegue en Netlify
1. Suba este repositorio a GitHub y conéctelo en [Netlify](https://netlify.com) (o arrastre la carpeta del proyecto a Netlify Drop).
2. Netlify detectará el archivo `netlify.toml` y desplegará la función en `netlify/functions/sync.js`.
3. Haga clic en **Deploy**.
4. ¡Listo! Su tablero estará disponible en línea en `https://su-proyecto.netlify.app`.

---

## 🔐 Seguridad y Control de Acceso (Protección de Datos Personales)

En cumplimiento de la **Ley 1581 de 2012** (Protección de Datos Personales):
- La aplicación cuenta con una pantalla de bloqueo institucional de acceso seguro.
- Ninguna información académica, listado o ficha de estudiante se renderiza ni se expone hasta que el usuario se autentique.
- **Contraseña configurada**: `MiMejorElemnto`
- **Cierre de sesión seguro**: Botón **"Cerrar Sesión"** en la barra lateral y en la barra superior (**"Salir"**).
- **Protección de API**: Los endpoints serverless `/api/sync` exigen la cabecera autorizada `X-Access-Key`.

