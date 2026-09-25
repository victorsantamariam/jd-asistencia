/**
 * views.js
 * HTML View Renderers for J.D. Attendance System
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AttendanceViews = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Helper formatters
  function formatPct(val) {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return (val * 100).toFixed(1) + "%";
  }

  function formatPctRound(val) {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return Math.round(val * 100) + "%";
  }

  function formatNum(val) {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return Number(val).toLocaleString();
  }

  function getNivelBadge(nivel) {
    if (!nivel) return "—";
    const n = String(nivel).trim();
    if (n.includes("CRÍTICO") || n.includes("CRITICO")) return `<span class="badge badge-critico">🔴 CRÍTICO</span>`;
    if (n.includes("ALERTA")) return `<span class="badge badge-alerta">🟠 ALERTA</span>`;
    if (n.includes("SEGUIMIENTO")) return `<span class="badge badge-seguimiento">🟡 SEGUIMIENTO</span>`;
    if (n.includes("NORMAL")) return `<span class="badge badge-normal">🟢 NORMAL</span>`;
    if (n.includes("SIN REGISTRO")) return `<span class="badge badge-sin-registro">⚪ SIN REGISTRO</span>`;
    if (n.includes("Retirado")) return `<span class="badge badge-retirado">Retirado</span>`;
    if (n.includes("Prueba")) return `<span class="badge badge-prueba">Prueba</span>`;
    return `<span class="badge">${n}</span>`;
  }

  function getPrioridadBadge(prio) {
    if (prio === null || prio === undefined) return "—";
    if (prio === 1) return `<span class="badge badge-critico">1 (Máx)</span>`;
    if (prio === 1.5) return `<span class="badge badge-critico">1.5</span>`;
    if (prio === 2) return `<span class="badge badge-alerta">2</span>`;
    if (prio === 2.5) return `<span class="badge badge-seguimiento">2.5</span>`;
    if (prio === 3) return `<span class="badge badge-seguimiento">3</span>`;
    if (prio === 3.5) return `<span class="badge badge-seguimiento">3.5</span>`;
    return `<span class="badge">${prio}</span>`;
  }

  // Active chart instances to avoid canvas reuse errors
  let activeCharts = {};
  function destroyChart(id) {
    if (activeCharts[id]) {
      activeCharts[id].destroy();
      delete activeCharts[id];
    }
  }

  /* =========================================================================
     1. INICIO / DASHBOARD GENERAL
     ========================================================================= */
  function renderInicioView(container, state, currentFilters, onFilterChange, onNavigate) {
    const kpis = AttendanceEngine.calculateDashboardKPIs(
      state,
      currentFilters.programa,
      currentFilters.grupo,
      currentFilters.docente
    );

    // Build filter options
    const allProgramas = ["(Todos)", ...Array.from(new Set(state.grupos.map(g => g.programa))).sort()];
    
    // Cascading grupos based on program
    const filteredGruposList = (currentFilters.programa && currentFilters.programa !== "(Todos)")
      ? state.grupos.filter(g => g.programa === currentFilters.programa)
      : state.grupos;
    const allGrupos = ["(Todos)", ...Array.from(new Set(filteredGruposList.map(g => g.codigo))).sort()];

    // Cascading docentes based on program
    const filteredDocentesList = (currentFilters.programa && currentFilters.programa !== "(Todos)")
      ? state.grupos.filter(g => g.programa === currentFilters.programa)
      : state.grupos;
    const allDocentes = ["(Todos)", ...Array.from(new Set(filteredDocentesList.map(g => g.docente))).sort()];

    let html = `
      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>Curso (Programa)</label>
          <select id="filter-inicio-programa" class="form-select">
            ${allProgramas.map(p => `<option value="${p}" ${p === currentFilters.programa ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Grupo</label>
          <select id="filter-inicio-grupo" class="form-select">
            ${allGrupos.map(g => `<option value="${g}" ${g === currentFilters.grupo ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Docente</label>
          <select id="filter-inicio-docente" class="form-select">
            ${allDocentes.map(d => `<option value="${d}" ${d === currentFilters.docente ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="filter-reset">
          <button id="btn-reset-inicio-filters" class="btn btn-outline">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Limpiar Filtros
          </button>
        </div>
      </div>

      <!-- Notice regarding dates -->
      <div class="alert-box">
        <svg style="width:20px;height:20px;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <div>
          <strong>Periodo / Fecha:</strong> El archivo original no contiene fechas de asistencia diaria (solo acumulados de clases asistidas/planeadas). Al cargar registros diarios en la hoja DATOS se activarán tendencias y faltas consecutivas.
        </div>
      </div>

      <!-- KPI Cards Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Cursos</span>
            <div class="kpi-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            </div>
          </div>
          <div class="kpi-value">${kpis.totalCursos}</div>
          <div class="kpi-subtitle">Programas académicos</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Grupos</span>
            <div class="kpi-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
          </div>
          <div class="kpi-value">${kpis.totalGrupos}</div>
          <div class="kpi-subtitle">Grupos activos evaluados</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Estudiantes Activos</span>
            <div class="kpi-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
          </div>
          <div class="kpi-value">${formatNum(kpis.estudiantesActivos)}</div>
          <div class="kpi-subtitle">${formatNum(kpis.matriculasActivas)} matrículas activas</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Clases Dictadas</span>
            <div class="kpi-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>
          <div class="kpi-value">${formatNum(kpis.clasesDictadas)}</div>
          <div class="kpi-subtitle">${formatNum(kpis.asistencias)} asistencias registradas</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Asistencia Promedio</span>
            <div class="kpi-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
          </div>
          <div class="kpi-value">${formatPct(kpis.asistenciaPromedio)}</div>
          <div class="kpi-subtitle">${getNivelBadge(kpis.semaforoGeneral)}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Inasistencia</span>
            <div class="kpi-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            </div>
          </div>
          <div class="kpi-value">${formatPct(kpis.inasistenciaTotal)}</div>
          <div class="kpi-subtitle">${formatNum(kpis.inasistencias)} faltas sobre sesiones</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">En Riesgo (🟡+🟠)</span>
            <div class="kpi-icon" style="color:var(--alerta);background-color:var(--alerta-bg);">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
          </div>
          <div class="kpi-value" style="color:var(--alerta);">${kpis.enRiesgo}</div>
          <div class="kpi-subtitle">${formatPctRound(kpis.porcEnRiesgo)} de las matrículas</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">🔴 Críticos</span>
            <div class="kpi-icon" style="color:var(--critico);background-color:var(--critico-bg);">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <div class="kpi-value" style="color:var(--critico);">${kpis.criticos}</div>
          <div class="kpi-subtitle">${formatPctRound(kpis.porcCriticos)} · ${kpis.sinRegistro} sin registro</div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-grid">
        <div class="content-card">
          <div class="card-header">
            <div class="card-title-box">
              <h3>Asistencia Promedio por Programa</h3>
              <p>Comparativo porcentual entre los cursos ofrecidos</p>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-wrapper">
              <canvas id="chart-inicio-programas"></canvas>
            </div>
          </div>
        </div>

        <div class="content-card">
          <div class="card-header">
            <div class="card-title-box">
              <h3>Distribución por Nivel de Riesgo</h3>
              <p>Desglose de matrículas según semáforo institucional</p>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-wrapper">
              <canvas id="chart-inicio-distribucion"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Table: GRUPOS CON MENOR ASISTENCIA -->
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>Grupos con Menor Asistencia</h3>
            <p>Monitoreo prioritario de los 12 grupos con porcentaje más bajo</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Programa</th>
                <th>Docente</th>
                <th class="td-right">% Asistencia</th>
                <th class="td-center">Críticos</th>
                <th class="td-right">% Riesgo</th>
                <th>Nivel</th>
                <th class="td-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              ${kpis.gruposMenorAsistencia.map(g => `
                <tr>
                  <td><span class="td-code">${g.codigo}</span></td>
                  <td>${g.programa}</td>
                  <td>${g.docente}</td>
                  <td class="td-right td-strong">${formatPct(g.porcAsistencia)}</td>
                  <td class="td-center"><span class="badge ${g.criticos > 0 ? 'badge-critico' : 'badge-normal'}">${g.criticos}</span></td>
                  <td class="td-right">${formatPct(g.porcRiesgo)}</td>
                  <td>${getNivelBadge(g.nivelGrupo)}</td>
                  <td class="td-center">
                    <button class="btn btn-outline btn-sm btn-view-group" data-codigo="${g.codigo}">
                      Ver grupo →
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach filter event listeners
    const selProg = document.getElementById("filter-inicio-programa");
    const selGrp = document.getElementById("filter-inicio-grupo");
    const selDoc = document.getElementById("filter-inicio-docente");
    const btnReset = document.getElementById("btn-reset-inicio-filters");

    selProg.addEventListener("change", () => {
      onFilterChange({ programa: selProg.value, grupo: "(Todos)", docente: "(Todos)" });
    });
    selGrp.addEventListener("change", () => {
      onFilterChange({ ...currentFilters, grupo: selGrp.value });
    });
    selDoc.addEventListener("change", () => {
      onFilterChange({ ...currentFilters, docente: selDoc.value });
    });
    btnReset.addEventListener("click", () => {
      onFilterChange({ programa: "(Todos)", grupo: "(Todos)", docente: "(Todos)" });
    });

    // Attach view group buttons
    container.querySelectorAll(".btn-view-group").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const codigo = e.currentTarget.getAttribute("data-codigo");
        if (onNavigate) onNavigate("cursos", { grupo: codigo });
      });
    });

    // Render Charts with Chart.js
    if (typeof Chart !== 'undefined') {
      // 1. Programas Bar Chart
      destroyChart("chart-inicio-programas");
      const ctxProg = document.getElementById("chart-inicio-programas");
      if (ctxProg) {
        activeCharts["chart-inicio-programas"] = new Chart(ctxProg, {
          type: "bar",
          data: {
            labels: kpis.asistenciaPorCurso.map(p => p.programa.length > 28 ? p.programa.slice(0, 26) + "…" : p.programa),
            datasets: [{
              label: "% Asistencia Promedio",
              data: kpis.asistenciaPorCurso.map(p => Number((p.asistenciaPromedio * 100).toFixed(1))),
              backgroundColor: "rgba(37, 99, 235, 0.8)",
              borderColor: "rgb(37, 99, 235)",
              borderWidth: 1,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.raw}% de asistencia promedio`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 30,
                ticks: { callback: (val) => val + "%" }
              },
              x: {
                ticks: { font: { size: 10 } }
              }
            }
          }
        });
      }

      // 2. Levels Doughnut Chart
      destroyChart("chart-inicio-distribucion");
      const ctxDist = document.getElementById("chart-inicio-distribucion");
      if (ctxDist) {
        activeCharts["chart-inicio-distribucion"] = new Chart(ctxDist, {
          type: "doughnut",
          data: {
            labels: ["🔴 Crítico", "🟠 Alerta", "🟡 Seguimiento", "🟢 Normal", "⚪ Sin Registro"],
            datasets: [{
              data: [kpis.criticos, kpis.alerta, kpis.seguimiento, kpis.normal, kpis.sinRegistro],
              backgroundColor: [
                "#ef4444",
                "#f97316",
                "#eab308",
                "#10b981",
                "#94a3b8"
              ],
              borderWidth: 2,
              borderColor: "#ffffff"
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "right" }
            }
          }
        });
      }
    }
  }

  /* =========================================================================
     2. CURSOS / VISTA POR GRUPO
     ========================================================================= */
  function renderCursosView(container, state, currentFilters, onFilterChange, onNavigate) {
    const allProgramas = ["(Todos)", ...Array.from(new Set(state.grupos.map(g => g.programa))).sort()];

    // Groups in current program
    let availableGrupos = state.grupos;
    if (currentFilters.programa && currentFilters.programa !== "(Todos)") {
      availableGrupos = state.grupos.filter(g => g.programa === currentFilters.programa);
    }
    const allGrupos = availableGrupos.map(g => g.codigo);

    // Default to first group if current selected group is not valid
    let selectedCodigo = currentFilters.grupo;
    if (!selectedCodigo || selectedCodigo === "(Todos)" || !state.grupos.some(g => g.codigo === selectedCodigo)) {
      selectedCodigo = allGrupos[0] || state.grupos[0].codigo;
    }

    const currentGroup = state.grupos.find(g => g.codigo === selectedCodigo) || state.grupos[0];

    // Students in this group
    const groupStudents = state.matriculas.filter(m => m.codigo === currentGroup.codigo && m.estado === 'activa');
    // Sort by attendance ascending
    groupStudents.sort((a, b) => {
      const pA = (typeof a.porcAsistencia === 'number') ? a.porcAsistencia : 999;
      const pB = (typeof b.porcAsistencia === 'number') ? b.porcAsistencia : 999;
      if (pA !== pB) return pA - pB;
      return a.nombre.localeCompare(b.nombre);
    });

    // Program ranking of groups
    const progGroups = state.grupos.filter(g => g.programa === currentGroup.programa);
    progGroups.sort((a, b) => {
      const pA = a.porcAsistencia !== null ? a.porcAsistencia : 999;
      const pB = b.porcAsistencia !== null ? b.porcAsistencia : 999;
      return pA - pB;
    });

    let html = `
      <div class="filter-bar">
        <div class="filter-group">
          <label>Programa (Curso)</label>
          <select id="filter-curso-programa" class="form-select">
            ${allProgramas.map(p => `<option value="${p}" ${p === currentGroup.programa ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Grupo</label>
          <select id="filter-curso-grupo" class="form-select">
            ${allGrupos.map(g => `<option value="${g}" ${g === selectedCodigo ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="filter-reset">
          <button id="btn-export-group-csv" class="btn btn-outline">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar Estudiantes CSV
          </button>
        </div>
      </div>

      <!-- Group Hero Card -->
      <div class="content-card" style="border-left: 4px solid var(--primary-light);">
        <div class="card-header" style="background-color:#ffffff;">
          <div>
            <span class="td-code" style="font-size:14px;">${currentGroup.codigo}</span>
            <h2 style="font-size:18px;font-weight:700;margin-top:4px;">${currentGroup.grupo}</h2>
            <p style="color:var(--text-muted);font-size:13px;margin-top:2px;">
              Docente: <strong>${currentGroup.docente}</strong> &nbsp;|&nbsp; Horario: <strong>${currentGroup.horario}</strong>
            </p>
          </div>
          <div>
            ${getNivelBadge(currentGroup.nivelGrupo)}
          </div>
        </div>

        <div class="kpi-grid" style="padding: 20px 24px 0; margin-bottom: 0;">
          <div class="kpi-card" style="box-shadow:none;background:var(--bg-subtle);">
            <span class="kpi-title">Estudiantes Evaluados</span>
            <div class="kpi-value">${currentGroup.estudiantesEvaluados}</div>
            <div class="kpi-subtitle">${currentGroup.matriculasActivas} matrículas activas</div>
          </div>
          <div class="kpi-card" style="box-shadow:none;background:var(--bg-subtle);">
            <span class="kpi-title">Clases Planeadas</span>
            <div class="kpi-value">${currentGroup.clasesPlaneadas}</div>
            <div class="kpi-subtitle">${currentGroup.clasesDictadas} clases dictadas</div>
          </div>
          <div class="kpi-card" style="box-shadow:none;background:var(--bg-subtle);">
            <span class="kpi-title">Asistencias Totales</span>
            <div class="kpi-value">${currentGroup.asistencias}</div>
            <div class="kpi-subtitle">${currentGroup.inasistencias} inasistencias</div>
          </div>
          <div class="kpi-card" style="box-shadow:none;background:var(--bg-subtle);">
            <span class="kpi-title">% Asistencia Grupo</span>
            <div class="kpi-value">${formatPct(currentGroup.porcAsistencia)}</div>
            <div class="kpi-subtitle">${formatPct(currentGroup.porcRiesgo)} en riesgo</div>
          </div>
        </div>

        <!-- Breakdown pills -->
        <div style="padding: 16px 24px 20px; display:flex; gap:12px; flex-wrap:wrap; border-top:1px solid var(--border-color); margin-top:20px;">
          <span style="font-weight:600;font-size:12px;text-transform:uppercase;color:var(--text-muted);align-self:center;">Desglose del Grupo:</span>
          <span class="badge badge-critico">🔴 Críticos: ${currentGroup.criticos}</span>
          <span class="badge badge-alerta">🟠 Alerta: ${currentGroup.alerta}</span>
          <span class="badge badge-seguimiento">🟡 Seguimiento: ${currentGroup.seguimiento}</span>
          <span class="badge badge-normal">🟢 Normal: ${currentGroup.normal}</span>
          <span class="badge badge-sin-registro">⚪ Sin registro: ${currentGroup.sinRegistro}</span>
        </div>
      </div>

      <!-- Main Section: Students and Ranking -->
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
        <!-- Students of Group -->
        <div class="content-card">
          <div class="card-header">
            <div class="card-title-box">
              <h3>Estudiantes del Grupo (${groupStudents.length})</h3>
              <p>Ordenados de menor a mayor asistencia</p>
            </div>
            <input type="text" id="input-filter-student" class="form-input" style="max-width:220px;" placeholder="Filtrar por nombre o cédula...">
          </div>
          <div class="table-responsive">
            <table class="data-table" id="table-group-students">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Cédula</th>
                  <th class="td-center">Dictadas</th>
                  <th class="td-center">Asistidas</th>
                  <th class="td-center">Faltas</th>
                  <th class="td-right">% Asistencia</th>
                  <th>Nivel</th>
                  <th>Tipo de Alerta</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                ${groupStudents.map(m => `
                  <tr>
                    <td>
                      <a href="#" class="link-student td-strong" data-cedula="${m.cedula}" style="color:var(--primary-light);text-decoration:none;">
                        ${m.nombre}
                      </a>
                    </td>
                    <td><span class="td-code">${m.cedula}</span></td>
                    <td class="td-center">${m.clasesDictadas || 0}</td>
                    <td class="td-center">${m.asistidas !== null ? m.asistidas : '—'}</td>
                    <td class="td-center">${m.inasistencias !== null ? m.inasistencias : '—'}</td>
                    <td class="td-right td-strong">${formatPct(m.porcAsistencia)}</td>
                    <td>${getNivelBadge(m.nivel)}</td>
                    <td>${m.tipoAlerta ? `<span class="badge badge-alerta">${m.tipoAlerta}</span>` : '—'}</td>
                    <td style="font-size:12px;color:var(--text-muted);">${m.observacion || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Ranking of Groups -->
        <div class="content-card">
          <div class="card-header">
            <div class="card-title-box">
              <h3>Ranking del Programa</h3>
              <p>Grupos ordenados por menor asistencia</p>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Docente</th>
                  <th class="td-right">% Asist.</th>
                  <th>Nivel</th>
                </tr>
              </thead>
              <tbody>
                ${progGroups.map(g => `
                  <tr style="${g.codigo === currentGroup.codigo ? 'background-color: var(--primary-bg); font-weight:600;' : ''}">
                    <td>
                      <a href="#" class="btn-select-ranking-group" data-codigo="${g.codigo}" style="color:var(--primary);text-decoration:none;">
                        <span class="td-code">${g.codigo}</span>
                      </a>
                    </td>
                    <td style="font-size:12px;">${g.docente}</td>
                    <td class="td-right">${formatPct(g.porcAsistencia)}</td>
                    <td>${getNivelBadge(g.nivelGrupo)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Filter events
    const selP = document.getElementById("filter-curso-programa");
    const selG = document.getElementById("filter-curso-grupo");

    selP.addEventListener("change", () => {
      onFilterChange({ programa: selP.value, grupo: "(Todos)" });
    });
    selG.addEventListener("change", () => {
      onFilterChange({ programa: selP.value, grupo: selG.value });
    });

    // In-table student quick filter
    const inputSearch = document.getElementById("input-filter-student");
    if (inputSearch) {
      inputSearch.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const rows = container.querySelectorAll("#table-group-students tbody tr");
        rows.forEach(r => {
          const text = r.textContent.toLowerCase();
          r.style.display = text.includes(query) ? "" : "none";
        });
      });
    }

    // Student link click -> navigate to Ficha
    container.querySelectorAll(".link-student").forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const cedula = e.currentTarget.getAttribute("data-cedula");
        if (onNavigate) onNavigate("ficha", { cedula });
      });
    });

    // Ranking group click
    container.querySelectorAll(".btn-select-ranking-group").forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const cod = e.currentTarget.getAttribute("data-codigo");
        onFilterChange({ programa: currentGroup.programa, grupo: cod });
      });
    });

    // Export CSV
    const btnExp = document.getElementById("btn-export-group-csv");
    if (btnExp) {
      btnExp.addEventListener("click", () => {
        exportTableToCSV(
          `Estudiantes_${currentGroup.codigo}.csv`,
          ["Estudiante", "Cédula", "Clases Dictadas", "Asistidas", "Inasistencias", "% Asistencia", "Nivel", "Tipo Alerta", "Observación"],
          groupStudents.map(m => [
            m.nombre,
            m.cedula,
            m.clasesDictadas,
            m.asistidas,
            m.inasistencias,
            m.porcAsistencia !== null ? (m.porcAsistencia * 100).toFixed(2) + "%" : "",
            m.nivel,
            m.tipoAlerta,
            m.observacion
          ])
        );
      });
    }
  }

  /* =========================================================================
     3. FICHA ESTUDIANTE
     ========================================================================= */
  function renderFichaView(container, state, selectedCedula, onSelectStudent) {
    let studentCedula = selectedCedula;
    // Default to first active student if none provided
    if (!studentCedula && state.matriculas.length > 0) {
      studentCedula = state.matriculas[0].cedula;
    }

    // Find student enrollments across matriculas
    const enrollments = state.matriculas.filter(m => m.cedula === studentCedula);
    const mainEnrollment = enrollments[0] || state.matriculas[0];

    // Contact info from Base Estudiantes
    const baseRecord = state.baseEstudiantes.find(b => b.documento === studentCedula);
    const email = baseRecord ? baseRecord.correo : "No está en Base Estudiantes";
    const phone = baseRecord ? baseRecord.telefono : "—";

    // Aggregated indicators for this student (across active enrollments)
    const activeEnrollments = enrollments.filter(m => m.estado === 'activa');
    const evalEnrollments = activeEnrollments.filter(m => m.incluir === true);

    let totalDictadas = 0;
    let totalAsist = 0;
    let totalInasist = 0;
    let sumPct = 0;
    evalEnrollments.forEach(m => {
      totalDictadas += (m.clasesDictadas || 0);
      totalAsist += (m.asistidas || 0);
      totalInasist += (m.inasistencias || 0);
      sumPct += (m.porcAsistencia || 0);
    });

    const avgAttendance = evalEnrollments.length > 0 ? (sumPct / evalEnrollments.length) : null;
    const studentNivel = AttendanceEngine.getNivel(avgAttendance, activeEnrollments.length > 0 ? "activa" : "retirado", mainEnrollment ? mainEnrollment.nombre : "", state.parametros);

    const activeGroupsStr = activeEnrollments.map(m => m.codigo).join(", ") || "Ninguno";
    const activeProgramsStr = Array.from(new Set(activeEnrollments.map(m => m.programa))).join(" | ") || "—";
    const activeDocentesStr = Array.from(new Set(activeEnrollments.map(m => m.docente))).join(", ") || "—";
    const allAlerts = Array.from(new Set(enrollments.map(m => m.tipoAlerta).filter(Boolean))).join(" | ") || "Ninguna";

    let html = `
      <!-- Enhanced Autocomplete Search Bar -->
      <div class="content-card search-card" style="padding:20px 24px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <div>
            <label style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">
              Buscar Estudiante por Nombre o Cédula
            </label>
            <div style="font-size:12px;color:var(--text-light);margin-top:2px;">
              Estudiante seleccionado actualmente: <strong style="color:var(--primary);">${mainEnrollment ? mainEnrollment.nombre : '—'}</strong> (Cédula: <span class="td-code">${studentCedula}</span>)
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="btn-toggle-student-browser" class="btn btn-outline btn-sm">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
              <span>Explorar Directorio Completo</span>
            </button>
          </div>
        </div>

        <div class="search-wrapper">
          <div class="search-input-box">
            <svg class="search-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="input-ficha-search" class="search-input-main"
              placeholder="Escriba el nombre, apellido o número de documento (ej. Juliana, 1013340045)..."
              autocomplete="off"
              value="">
            <button id="btn-clear-search" class="search-clear-btn" style="display:none;" title="Limpiar búsqueda">✕</button>
            <div id="ficha-suggestions" class="suggestions-dropdown" style="display:none;"></div>
          </div>
        </div>

        <!-- Inline Student Browser Drawer (hidden by default) -->
        <div id="student-browser-drawer" style="display:none;margin-top:18px;padding-top:18px;border-top:1px solid var(--border-color);">
          <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
            <div class="filter-group" style="flex:1;min-width:200px;">
              <label>Filtrar por Programa</label>
              <select id="browser-filter-programa" class="form-select">
                <option value="(Todos)">(Todos los programas)</option>
              </select>
            </div>
            <div class="filter-group" style="flex:1;min-width:140px;">
              <label>Filtrar por Grupo</label>
              <select id="browser-filter-grupo" class="form-select">
                <option value="(Todos)">(Todos los grupos)</option>
              </select>
            </div>
            <div class="filter-group" style="flex:1;min-width:180px;">
              <label>Filtrar en esta lista</label>
              <input type="text" id="browser-filter-query" class="form-input" placeholder="Escriba nombre o cédula...">
            </div>
          </div>
          <div class="table-responsive" style="max-height:300px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-sm);">
            <table class="data-table" id="table-browser-students">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Cédula</th>
                  <th>Grupo</th>
                  <th>Programa</th>
                  <th class="td-right">% Asist.</th>
                  <th>Nivel</th>
                  <th class="td-center">Acción</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Student 360 Profile Hero -->
      <div class="profile-hero">
        <!-- Personal and Academic Info -->
        <div class="profile-card">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);color:white;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;">
              ${mainEnrollment ? mainEnrollment.nombre.charAt(0) : 'E'}
            </div>
            <div>
              <h2 style="font-size:17px;font-weight:700;line-height:1.2;">${mainEnrollment ? mainEnrollment.nombre : '—'}</h2>
              <span class="td-code" style="font-size:13px;margin-top:4px;display:inline-block;">ID: ${studentCedula}</span>
            </div>
          </div>

          <div class="profile-field-grid">
            <div class="profile-field-label">Grupo(s) activo(s):</div>
            <div class="profile-field-value td-strong">${activeGroupsStr}</div>

            <div class="profile-field-label">Programa(s):</div>
            <div class="profile-field-value">${activeProgramsStr}</div>

            <div class="profile-field-label">Docente(s):</div>
            <div class="profile-field-value">${activeDocentesStr}</div>

            <div class="profile-field-label">Correo:</div>
            <div class="profile-field-value">
              <a href="mailto:${email}" style="color:var(--primary-light);text-decoration:none;">${email}</a>
            </div>

            <div class="profile-field-label">Teléfono:</div>
            <div class="profile-field-value">${phone}</div>
          </div>
        </div>

        <!-- Attendance Performance & Risk Indicators -->
        <div class="profile-card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">Indicadores de Asistencia</h3>
          
          <div class="kpi-grid" style="grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
            <div class="kpi-card" style="box-shadow:none;background:var(--bg-subtle);padding:12px 16px;">
              <span class="kpi-title">Clases Dictadas</span>
              <div class="kpi-value" style="font-size:20px;">${totalDictadas}</div>
            </div>
            <div class="kpi-card" style="box-shadow:none;background:var(--bg-subtle);padding:12px 16px;">
              <span class="kpi-title">Asistencias</span>
              <div class="kpi-value" style="font-size:20px;color:var(--normal);">${totalAsist}</div>
            </div>
            <div class="kpi-card" style="box-shadow:none;background:var(--bg-subtle);padding:12px 16px;">
              <span class="kpi-title">Inasistencias</span>
              <div class="kpi-value" style="font-size:20px;color:var(--critico);">${totalInasist}</div>
            </div>
            <div class="kpi-card" style="box-shadow:none;background:var(--bg-subtle);padding:12px 16px;">
              <span class="kpi-title">% Asistencia Global</span>
              <div class="kpi-value" style="font-size:20px;color:var(--primary-light);">${formatPct(avgAttendance)}</div>
            </div>
          </div>

          <div class="profile-field-grid">
            <div class="profile-field-label">Estado actual:</div>
            <div class="profile-field-value">${getNivelBadge(studentNivel)}</div>

            <div class="profile-field-label">Alertas activas:</div>
            <div class="profile-field-value">
              ${allAlerts !== "Ninguna" ? `<span class="badge badge-alerta">${allAlerts}</span>` : `<span class="badge badge-normal">Sin alertas activas</span>`}
            </div>

            <div class="profile-field-label">Faltas consecutivas:</div>
            <div class="profile-field-value" style="color:var(--text-muted);">Requiere hoja DATOS</div>

            <div class="profile-field-label">Última asistencia:</div>
            <div class="profile-field-value" style="color:var(--text-muted);">Requiere hoja DATOS</div>
          </div>
        </div>
      </div>

      <!-- Student Enrollments Table -->
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>Matrículas del Estudiante (${enrollments.length})</h3>
            <p>Historial completo incluyendo cursos activos, traslados y retiros</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Estado</th>
                <th class="td-center">Asistidas</th>
                <th class="td-center">Dictadas</th>
                <th class="td-center">Faltas</th>
                <th class="td-right">% Asistencia</th>
                <th>Nivel</th>
                <th>Tipo de Alerta</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              ${enrollments.map(m => `
                <tr>
                  <td><span class="td-code">${m.codigo}</span> ${m.grupo || ''}</td>
                  <td><span class="badge ${m.estado === 'activa' ? 'badge-normal' : 'badge-retirado'}">${m.estado}</span></td>
                  <td class="td-center">${m.asistidas !== null ? m.asistidas : '—'}</td>
                  <td class="td-center">${m.clasesDictadas !== null ? m.clasesDictadas : '—'}</td>
                  <td class="td-center">${m.inasistencias !== null ? m.inasistencias : '—'}</td>
                  <td class="td-right td-strong">${formatPct(m.porcAsistencia)}</td>
                  <td>${getNivelBadge(m.nivel)}</td>
                  <td>${m.tipoAlerta ? `<span class="badge badge-alerta">${m.tipoAlerta}</span>` : '—'}</td>
                  <td style="font-size:12px;color:var(--text-muted);">${m.observacion || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Daily Attendance History -->
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>Historial Diario de Asistencia (${(state.asistenciaDiaria || []).filter(r => r.cedula === studentCedula).length} sesiones)</h3>
            <p>Registro individual sesión por sesión sincronizado con las fechas reales</p>
          </div>
        </div>
        ${(() => {
          const studentDaily = (state.asistenciaDiaria || []).filter(r => r.cedula === studentCedula);
          if (studentDaily.length === 0) {
            return `
              <div class="card-body" style="text-align:center;padding:32px 20px;color:var(--text-muted);">
                <svg style="width:40px;height:40px;margin:0 auto 12px;color:var(--text-light);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <h4 style="font-size:14px;color:var(--text-main);margin-bottom:4px;">Sin registros diarios cargados</h4>
                <p style="font-size:13px;max-width:500px;margin:0 auto;">
                  No hay clases registradas aún para este estudiante o el grupo no ha reportado sesiones.
                </p>
              </div>
            `;
          }
          const sorted = [...studentDaily].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
          return `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Fecha de Clase</th>
                    <th>Grupo</th>
                    <th>Estado de Asistencia</th>
                    <th>Observación del Docente</th>
                  </tr>
                </thead>
                <tbody>
                  ${sorted.map(d => `
                    <tr>
                      <td class="td-strong">${d.fecha || '—'}</td>
                      <td><span class="td-code">${d.codigoGrupo}</span></td>
                      <td>
                        <span class="badge ${d.estado === 'Presente' ? 'badge-normal' : 'badge-critico'}">
                          ${d.estado === 'Presente' ? '✅ Presente' : '❌ Ausente'}
                        </span>
                      </td>
                      <td style="font-size:12.5px;color:var(--text-muted);">${d.observacion || '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        })()}
      </div>
    `;

    container.innerHTML = html;

    // Advanced Autocomplete logic
    const searchInput = document.getElementById("input-ficha-search");
    const suggestionsBox = document.getElementById("ficha-suggestions");
    const btnClear = document.getElementById("btn-clear-search");
    let activeSuggestionIndex = -1;
    let currentMatches = [];

    // Extract unique students with complete metadata
    const uniqueStudents = [];
    const seen = new Set();
    state.matriculas.forEach(m => {
      if (!seen.has(m.cedula)) {
        seen.add(m.cedula);
        uniqueStudents.push({
          cedula: m.cedula,
          nombre: m.nombre,
          grupo: m.codigo,
          programa: m.programa,
          porcAsistencia: m.porcAsistencia,
          nivel: m.nivel
        });
      }
    });
    uniqueStudents.sort((a, b) => a.nombre.localeCompare(b.nombre));

    function highlightText(text, query) {
      if (!query) return text;
      const qClean = query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${qClean})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    }

    function showSuggestions(q) {
      const qLower = q.toLowerCase();
      // Match by name, cedula or group
      currentMatches = uniqueStudents.filter(s => 
        s.nombre.toLowerCase().includes(qLower) || 
        s.cedula.includes(qLower) ||
        s.grupo.toLowerCase().includes(qLower)
      );

      // Sort: students whose name starts with query first
      currentMatches.sort((a, b) => {
        const aStarts = a.nombre.toLowerCase().startsWith(qLower);
        const bStarts = b.nombre.toLowerCase().startsWith(qLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.nombre.localeCompare(b.nombre);
      });

      const displayList = currentMatches.slice(0, 30);
      activeSuggestionIndex = -1;

      if (displayList.length === 0) {
        suggestionsBox.innerHTML = `
          <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">
            No se encontraron estudiantes para "<strong>${q}</strong>".<br>
            <span style="font-size:11.5px;color:var(--text-light);">Intente con otro nombre, apellido o número de cédula.</span>
          </div>
        `;
        suggestionsBox.style.display = "block";
        return;
      }

      suggestionsBox.innerHTML = `
        <div class="suggestions-header">
          <span>${currentMatches.length} estudiantes encontrados ${currentMatches.length > 30 ? '(mostrando primeros 30)' : ''}</span>
          <span style="font-weight:normal;color:var(--text-light);">Navegue con ↑ ↓ y pulse Enter</span>
        </div>
        ${displayList.map((s, idx) => `
          <div class="suggestion-item" data-idx="${idx}" data-cedula="${s.cedula}">
            <div style="flex:1;min-width:0;padding-right:12px;">
              <div style="font-weight:600;font-size:13.5px;color:var(--text-main);">
                ${highlightText(s.nombre, q)}
              </div>
              <div class="student-meta-line">
                <span class="td-code" style="font-size:11.5px;">${highlightText(s.cedula, q)}</span>
                <span class="badge" style="background:#f1f5f9;color:#334155;font-size:11px;padding:1px 6px;">${s.grupo}</span>
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${s.programa}</span>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-weight:700;font-size:13px;color:var(--primary);">${formatPct(s.porcAsistencia)}</div>
              ${getNivelBadge(s.nivel)}
            </div>
          </div>
        `).join('')}
      `;
      suggestionsBox.style.display = "block";

      suggestionsBox.querySelectorAll(".suggestion-item").forEach(item => {
        item.addEventListener("click", () => {
          const ced = item.getAttribute("data-cedula");
          suggestionsBox.style.display = "none";
          if (onSelectStudent) onSelectStudent(ced);
        });
      });
    }

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      if (btnClear) btnClear.style.display = q ? "flex" : "none";
      if (q.length < 1) {
        suggestionsBox.style.display = "none";
        return;
      }
      showSuggestions(q);
    });

    searchInput.addEventListener("focus", () => {
      const q = searchInput.value.trim();
      if (q.length >= 1) {
        showSuggestions(q);
      }
    });

    searchInput.addEventListener("keydown", (e) => {
      const items = suggestionsBox.querySelectorAll(".suggestion-item");
      if (items.length === 0 || suggestionsBox.style.display === "none") {
        if (e.key === "Enter") e.preventDefault();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
        updateActiveSuggestion(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
        updateActiveSuggestion(items);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
          const ced = items[activeSuggestionIndex].getAttribute("data-cedula");
          suggestionsBox.style.display = "none";
          if (onSelectStudent) onSelectStudent(ced);
        } else if (items.length > 0) {
          const ced = items[0].getAttribute("data-cedula");
          suggestionsBox.style.display = "none";
          if (onSelectStudent) onSelectStudent(ced);
        }
      } else if (e.key === "Escape") {
        suggestionsBox.style.display = "none";
      }
    });

    function updateActiveSuggestion(items) {
      items.forEach((it, idx) => {
        if (idx === activeSuggestionIndex) {
          it.classList.add("active");
          it.scrollIntoView({ block: "nearest" });
        } else {
          it.classList.remove("active");
        }
      });
    }

    if (btnClear) {
      btnClear.addEventListener("click", () => {
        searchInput.value = "";
        btnClear.style.display = "none";
        suggestionsBox.style.display = "none";
        searchInput.focus();
      });
    }

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = "none";
      }
    });

    // Student Browser Drawer Logic
    const btnToggleBrowser = document.getElementById("btn-toggle-student-browser");
    const browserDrawer = document.getElementById("student-browser-drawer");
    const browserProg = document.getElementById("browser-filter-programa");
    const browserGrp = document.getElementById("browser-filter-grupo");
    const browserQuery = document.getElementById("browser-filter-query");
    const tableBrowserBody = document.querySelector("#table-browser-students tbody");

    if (btnToggleBrowser && browserDrawer) {
      // Populate program dropdown
      const progList = Array.from(new Set(state.grupos.map(g => g.programa))).sort();
      progList.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        browserProg.appendChild(opt);
      });

      // Populate group dropdown
      function updateBrowserGroups() {
        browserGrp.innerHTML = `<option value="(Todos)">(Todos los grupos)</option>`;
        let gList = state.grupos;
        if (browserProg.value !== "(Todos)") {
          gList = state.grupos.filter(g => g.programa === browserProg.value);
        }
        gList.forEach(g => {
          const opt = document.createElement("option");
          opt.value = g.codigo;
          opt.textContent = `${g.codigo} - ${g.docente}`;
          browserGrp.appendChild(opt);
        });
      }
      updateBrowserGroups();

      function renderBrowserTable() {
        const pVal = browserProg.value;
        const gVal = browserGrp.value;
        const qVal = (browserQuery.value || "").toLowerCase().trim();

        const filtered = uniqueStudents.filter(s => {
          if (pVal !== "(Todos)" && s.programa !== pVal) return false;
          if (gVal !== "(Todos)" && s.grupo !== gVal) return false;
          if (qVal && !s.nombre.toLowerCase().includes(qVal) && !s.cedula.includes(qVal)) return false;
          return true;
        });

        tableBrowserBody.innerHTML = filtered.slice(0, 50).map(s => `
          <tr>
            <td class="td-strong">${s.nombre}</td>
            <td><span class="td-code">${s.cedula}</span></td>
            <td><span class="td-code">${s.grupo}</span></td>
            <td style="font-size:12px;">${s.programa}</td>
            <td class="td-right td-strong">${formatPct(s.porcAsistencia)}</td>
            <td>${getNivelBadge(s.nivel)}</td>
            <td class="td-center">
              <button class="btn btn-outline btn-sm btn-pick-browser-student" data-cedula="${s.cedula}">
                Ver Ficha →
              </button>
            </td>
          </tr>
        `).join('');

        tableBrowserBody.querySelectorAll(".btn-pick-browser-student").forEach(btn => {
          btn.addEventListener("click", () => {
            const ced = btn.getAttribute("data-cedula");
            if (onSelectStudent) onSelectStudent(ced);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        });
      }

      btnToggleBrowser.addEventListener("click", () => {
        const isHidden = browserDrawer.style.display === "none";
        browserDrawer.style.display = isHidden ? "block" : "none";
        btnToggleBrowser.classList.toggle("btn-primary", isHidden);
        if (isHidden) {
          renderBrowserTable();
        }
      });

      browserProg.addEventListener("change", () => {
        updateBrowserGroups();
        renderBrowserTable();
      });
      browserGrp.addEventListener("change", () => renderBrowserTable());
      browserQuery.addEventListener("input", () => renderBrowserTable());
    }
  }

  /* =========================================================================
     4. ALERTAS
     ========================================================================= */
  function renderAlertasView(container, state, currentFilters, onFilterChange, onNavigate) {
    const allProgramas = ["(Todos)", ...Array.from(new Set(state.grupos.map(g => g.programa))).sort()];

    let filteredDocentes = state.grupos;
    if (currentFilters.programa && currentFilters.programa !== "(Todos)") {
      filteredDocentes = state.grupos.filter(g => g.programa === currentFilters.programa);
    }
    const allDocentes = ["(Todos)", ...Array.from(new Set(filteredDocentes.map(g => g.docente))).sort()];

    const tiposAlerta = [
      "(Todos)",
      "🔴 CRÍTICO",
      "🟠 ALERTA",
      "🟡 SEGUIMIENTO",
      "⚪ SIN REGISTRO",
      "⚠️ AUSENCIAS CONSECUTIVAS",
      "📉 TENDENCIA NEGATIVA"
    ];

    // Filter students with alerts
    const pPrueba = (state.parametros && state.parametros.prueba) || "Prueba";
    const alertStudents = state.matriculas.filter(m => {
      if (m.estado !== 'activa') return false;
      if (m.nombre && m.nombre.toLowerCase().includes(pPrueba.toLowerCase())) return false;
      if (!m.tipoAlerta) return false;

      if (currentFilters.programa && currentFilters.programa !== "(Todos)" && m.programa !== currentFilters.programa) return false;
      if (currentFilters.docente && currentFilters.docente !== "(Todos)" && m.docente !== currentFilters.docente) return false;
      if (currentFilters.tipoAlerta && currentFilters.tipoAlerta !== "(Todos)") {
        if (!m.tipoAlerta.includes(currentFilters.tipoAlerta)) return false;
      }
      return true;
    });

    // Sort by priority ascending (1 = highest), then % attendance ascending, then faltas descending
    alertStudents.sort((a, b) => {
      const pA = a.prioridad || 99;
      const pB = b.prioridad || 99;
      if (pA !== pB) return pA - pB;
      const pctA = (typeof a.porcAsistencia === 'number') ? a.porcAsistencia : 99;
      const pctB = (typeof b.porcAsistencia === 'number') ? b.porcAsistencia : 99;
      if (pctA !== pctB) return pctA - pctB;
      return (b.inasistencias || 0) - (a.inasistencias || 0);
    });

    // Counts by alert type for quick badges
    const totalCriticos = state.matriculas.filter(m => m.estado === 'activa' && m.tipoAlerta && m.tipoAlerta.includes("🔴 CRÍTICO") && (currentFilters.programa === "(Todos)" || m.programa === currentFilters.programa)).length;
    const totalAlertas = state.matriculas.filter(m => m.estado === 'activa' && m.tipoAlerta && m.tipoAlerta.includes("🟠 ALERTA") && (currentFilters.programa === "(Todos)" || m.programa === currentFilters.programa)).length;
    const totalSeguimiento = state.matriculas.filter(m => m.estado === 'activa' && m.tipoAlerta && m.tipoAlerta.includes("🟡 SEGUIMIENTO") && (currentFilters.programa === "(Todos)" || m.programa === currentFilters.programa)).length;
    const totalSinReg = state.matriculas.filter(m => m.estado === 'activa' && m.tipoAlerta && m.tipoAlerta.includes("⚪ SIN REGISTRO") && (currentFilters.programa === "(Todos)" || m.programa === currentFilters.programa)).length;

    // Action lookup map
    const actionMap = {};
    if (state.parametros && state.parametros.niveles) {
      state.parametros.niveles.forEach(niv => {
        actionMap[niv.nivel] = niv.accion;
      });
    }
    actionMap["⚪ SIN REGISTRO"] = "Verificar el registro de asistencia con el docente";

    let html = `
      <div class="filter-bar">
        <div class="filter-group">
          <label>Programa</label>
          <select id="filter-alerta-programa" class="form-select">
            ${allProgramas.map(p => `<option value="${p}" ${p === currentFilters.programa ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Docente</label>
          <select id="filter-alerta-docente" class="form-select">
            ${allDocentes.map(d => `<option value="${d}" ${d === currentFilters.docente ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Tipo de Alerta</label>
          <select id="filter-alerta-tipo" class="form-select">
            ${tiposAlerta.map(t => `<option value="${t}" ${t === currentFilters.tipoAlerta ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="filter-reset">
          <button id="btn-export-alertas-csv" class="btn btn-outline">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar Alertas CSV
          </button>
        </div>
      </div>

      <!-- Quick Counter Filter Pills -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <button class="btn btn-outline btn-quick-alert" data-tipo="🔴 CRÍTICO" style="background-color:var(--critico-bg);border-color:var(--critico-border);color:var(--critico);">
          🔴 Críticos: <strong>${totalCriticos}</strong>
        </button>
        <button class="btn btn-outline btn-quick-alert" data-tipo="🟠 ALERTA" style="background-color:var(--alerta-bg);border-color:var(--alerta-border);color:var(--alerta);">
          🟠 Alerta: <strong>${totalAlertas}</strong>
        </button>
        <button class="btn btn-outline btn-quick-alert" data-tipo="🟡 SEGUIMIENTO" style="background-color:var(--seguimiento-bg);border-color:var(--seguimiento-border);color:#b45309;">
          🟡 Seguimiento: <strong>${totalSeguimiento}</strong>
        </button>
        <button class="btn btn-outline btn-quick-alert" data-tipo="⚪ SIN REGISTRO" style="background-color:var(--sin-registro-bg);border-color:var(--sin-registro-border);color:var(--sin-registro);">
          ⚪ Sin Registro: <strong>${totalSinReg}</strong>
        </button>
      </div>

      <!-- Alert Table -->
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>Listado de Alertas (${alertStudents.length} registros)</h3>
            <p>Ordenado por nivel de prioridad (1 = máxima atención requerida)</p>
          </div>
          <input type="text" id="input-search-alertas" class="form-input" style="max-width:240px;" placeholder="Buscar en alertas...">
        </div>
        <div class="table-responsive">
          <table class="data-table" id="table-alertas">
            <thead>
              <tr>
                <th class="td-center">Prioridad</th>
                <th>Estudiante</th>
                <th>Cédula</th>
                <th>Grupo</th>
                <th>Docente</th>
                <th class="td-right">% Asist.</th>
                <th class="td-center">Asist.</th>
                <th class="td-center">Faltas</th>
                <th>Tipo de Alerta</th>
                <th>Acción Sugerida</th>
              </tr>
            </thead>
            <tbody>
              ${alertStudents.map(m => {
                const accion = actionMap[m.nivel] || "Verificar el registro con el docente";
                return `
                  <tr>
                    <td class="td-center">${getPrioridadBadge(m.prioridad)}</td>
                    <td>
                      <a href="#" class="link-student td-strong" data-cedula="${m.cedula}" style="color:var(--primary-light);text-decoration:none;">
                        ${m.nombre}
                      </a>
                    </td>
                    <td><span class="td-code">${m.cedula}</span></td>
                    <td><span class="td-code">${m.codigo}</span></td>
                    <td style="font-size:12.5px;">${m.docente}</td>
                    <td class="td-right td-strong">${formatPct(m.porcAsistencia)}</td>
                    <td class="td-center">${m.asistidas !== null ? m.asistidas : '—'}</td>
                    <td class="td-center">${m.inasistencias !== null ? m.inasistencias : '—'}</td>
                    <td>${getNivelBadge(m.nivel)}</td>
                    <td style="font-size:12px;color:var(--text-muted);">${accion}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Filters
    const selP = document.getElementById("filter-alerta-programa");
    const selD = document.getElementById("filter-alerta-docente");
    const selT = document.getElementById("filter-alerta-tipo");

    selP.addEventListener("change", () => onFilterChange({ programa: selP.value, docente: "(Todos)", tipoAlerta: currentFilters.tipoAlerta }));
    selD.addEventListener("change", () => onFilterChange({ ...currentFilters, docente: selD.value }));
    selT.addEventListener("change", () => onFilterChange({ ...currentFilters, tipoAlerta: selT.value }));

    // Quick filter pills
    container.querySelectorAll(".btn-quick-alert").forEach(btn => {
      btn.addEventListener("click", () => {
        const tipo = btn.getAttribute("data-tipo");
        onFilterChange({ ...currentFilters, tipoAlerta: tipo });
      });
    });

    // In-table search
    const inputSearch = document.getElementById("input-search-alertas");
    if (inputSearch) {
      inputSearch.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        container.querySelectorAll("#table-alertas tbody tr").forEach(r => {
          r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none";
        });
      });
    }

    // Student link
    container.querySelectorAll(".link-student").forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const cedula = e.currentTarget.getAttribute("data-cedula");
        if (onNavigate) onNavigate("ficha", { cedula });
      });
    });

    // Export CSV
    const btnExp = document.getElementById("btn-export-alertas-csv");
    if (btnExp) {
      btnExp.addEventListener("click", () => {
        exportTableToCSV(
          "Alertas_Asistencia.csv",
          ["Prioridad", "Estudiante", "Cédula", "Grupo", "Docente", "% Asistencia", "Asistidas", "Faltas", "Nivel", "Tipo Alerta", "Acción Sugerida"],
          alertStudents.map(m => [
            m.prioridad,
            m.nombre,
            m.cedula,
            m.codigo,
            m.docente,
            m.porcAsistencia !== null ? (m.porcAsistencia * 100).toFixed(2) + "%" : "",
            m.asistidas,
            m.inasistencias,
            m.nivel,
            m.tipoAlerta,
            actionMap[m.nivel] || ""
          ])
        );
      });
    }
  }

  /* =========================================================================
     5. INCONSISTENCIAS / AUDITORÍA DE DATOS
     ========================================================================= */
  function renderInconsistenciasView(container, state, onNavigate) {
    const inc = AttendanceEngine.detectInconsistencias(state);

    let html = `
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>Detección Automática de Inconsistencias</h3>
            <p>Ningún dato original fue alterado. Esta sección señala anomalías y propone correcciones en la fuente.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="audit-list">
            ${inc.auditorias.map(item => `
              <div class="audit-item">
                <span class="audit-badge ${item.conteo > 0 || item.conteo === "Todo el archivo" ? 'warning' : 'info'}">
                  ${item.conteo} registros
                </span>
                <div class="audit-content">
                  <h4>${item.titulo}</h4>
                  <p><strong>Impacto:</strong> ${item.impacto}</p>
                  <div class="audit-solution">
                    <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    <strong>Solución propuesta:</strong> ${item.solucion}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Table A: Matrículas activas no en Base Estudiantes -->
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>A. Matrículas activas en Estudiantes que NO están en Base Estudiantes (${inc.tablaA.length})</h3>
            <p>La base general no refleja traslados recientes o registros directos</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cédula</th>
                <th>Nombre</th>
                <th>Grupo</th>
                <th>Clases</th>
                <th>Observación</th>
                <th>Grupo(s) en Base Estudiantes</th>
              </tr>
            </thead>
            <tbody>
              ${inc.tablaA.map(m => `
                <tr>
                  <td><span class="td-code">${m.cedula}</span></td>
                  <td class="td-strong">${m.nombre}</td>
                  <td><span class="td-code">${m.codigo}</span></td>
                  <td>${m.clases}</td>
                  <td>${m.observacion || '—'}</td>
                  <td><span class="badge badge-seguimiento">${m.gruposEnBase || '—'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Table B: Base Estudiantes no en Estudiantes -->
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>B. Registros de Base Estudiantes que NO están en Estudiantes (${inc.tablaB.length})</h3>
            <p>El estudiante figura en la base general asignado a un grupo anterior</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Grupo en Base</th>
                <th>Grupo Activo Actual en Matrículas</th>
              </tr>
            </thead>
            <tbody>
              ${inc.tablaB.map(b => `
                <tr>
                  <td><span class="td-code">${b.documento}</span></td>
                  <td class="td-strong">${b.nombre}</td>
                  <td><span class="td-code">${b.codigoGrupo}</span></td>
                  <td><span class="badge badge-normal">${b.grupoActivoEnMatriculas || '—'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Table C: Sin registro y pruebas -->
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>C. Activos sin Registro de Asistencia (null/null) y Usuarios de Prueba (${inc.tablaC.length})</h3>
            <p>Requiere verificación con el docente o limpieza en la plataforma</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cédula</th>
                <th>Nombre</th>
                <th>Grupo</th>
                <th>Clases</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              ${inc.tablaC.slice(0, 50).map(m => `
                <tr>
                  <td><span class="td-code">${m.cedula}</span></td>
                  <td class="td-strong">${m.nombre}</td>
                  <td><span class="td-code">${m.codigo}</span></td>
                  <td>${m.clases}</td>
                  <td>${getNivelBadge(m.nivel)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /* =========================================================================
     6. GRUPOS / DIRECTORIO MAESTRO
     ========================================================================= */
  function renderGruposView(container, state, onNavigate) {
    let html = `
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>Directorio Maestro de Grupos (${state.grupos.length})</h3>
            <p>Indicadores consolidados por cada grupo y docente</p>
          </div>
          <div style="display:flex;gap:12px;">
            <input type="text" id="input-search-grupos" class="form-input" style="max-width:240px;" placeholder="Buscar grupo o docente...">
            <button id="btn-export-all-grupos-csv" class="btn btn-outline">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Exportar CSV
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table" id="table-all-grupos">
            <thead>
              <tr>
                <th>Código</th>
                <th>Programa</th>
                <th>Docente</th>
                <th class="td-center">Plan.</th>
                <th class="td-center">Dict.</th>
                <th class="td-center">Activas</th>
                <th class="td-center">Eval.</th>
                <th class="td-center">Asist.</th>
                <th class="td-center">Faltas</th>
                <th class="td-right">% Asist.</th>
                <th class="td-center">Críticos</th>
                <th class="td-right">% Riesgo</th>
                <th>Nivel</th>
                <th class="td-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              ${state.grupos.map(g => `
                <tr>
                  <td><span class="td-code">${g.codigo}</span></td>
                  <td>${g.programa}</td>
                  <td>${g.docente}</td>
                  <td class="td-center">${g.clasesPlaneadas}</td>
                  <td class="td-center">${g.clasesDictadas}</td>
                  <td class="td-center">${g.matriculasActivas}</td>
                  <td class="td-center">${g.estudiantesEvaluados}</td>
                  <td class="td-center">${g.asistencias}</td>
                  <td class="td-center">${g.inasistencias}</td>
                  <td class="td-right td-strong">${formatPct(g.porcAsistencia)}</td>
                  <td class="td-center">${g.criticos > 0 ? `<span class="badge badge-critico">${g.criticos}</span>` : '0'}</td>
                  <td class="td-right">${formatPct(g.porcRiesgo)}</td>
                  <td>${getNivelBadge(g.nivelGrupo)}</td>
                  <td class="td-center">
                    <button class="btn btn-outline btn-sm btn-open-group" data-codigo="${g.codigo}">
                      Ver →
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Search
    const searchInput = document.getElementById("input-search-grupos");
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      container.querySelectorAll("#table-all-grupos tbody tr").forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });

    // View group
    container.querySelectorAll(".btn-open-group").forEach(b => {
      b.addEventListener("click", () => {
        const cod = b.getAttribute("data-codigo");
        if (onNavigate) onNavigate("cursos", { grupo: cod });
      });
    });

    // Export
    document.getElementById("btn-export-all-grupos-csv").addEventListener("click", () => {
      exportTableToCSV(
        "Grupos_Consolidado.csv",
        ["Código", "Programa", "Docente", "Horario", "Planeadas", "Dictadas", "Activas", "Evaluados", "Asistencias", "Inasistencias", "% Asistencia", "Críticos", "Alerta", "Seguimiento", "Normal", "Sin Registro", "% Riesgo", "Nivel"],
        state.grupos.map(g => [
          g.codigo,
          g.programa,
          g.docente,
          g.horario,
          g.clasesPlaneadas,
          g.clasesDictadas,
          g.matriculasActivas,
          g.estudiantesEvaluados,
          g.asistencias,
          g.inasistencias,
          g.porcAsistencia !== null ? (g.porcAsistencia * 100).toFixed(2) + "%" : "",
          g.criticos,
          g.alerta,
          g.seguimiento,
          g.normal,
          g.sinRegistro,
          (g.porcRiesgo * 100).toFixed(2) + "%",
          g.nivelGrupo
        ])
      );
    });
  }

  /* =========================================================================
     7. ESTUDIANTES / MATRÍCULAS DIRECTORY
     ========================================================================= */
  function renderEstudiantesView(container, state, onNavigate) {
    let currentPage = 1;
    const pageSize = 50;
    let currentQuery = "";
    let currentFilterEstado = "todos";

    function getFilteredMatriculas() {
      return state.matriculas.filter(m => {
        if (currentFilterEstado !== "todos" && m.estado !== currentFilterEstado) return false;
        if (currentQuery) {
          const match = m.nombre.toLowerCase().includes(currentQuery) ||
                        m.cedula.includes(currentQuery) ||
                        m.codigo.toLowerCase().includes(currentQuery) ||
                        m.docente.toLowerCase().includes(currentQuery);
          if (!match) return false;
        }
        return true;
      });
    }

    function renderTable() {
      const filtered = getFilteredMatriculas();
      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      const tbody = container.querySelector("#table-all-matriculas tbody");
      const paginationInfo = container.querySelector("#matriculas-pagination-info");

      if (paginationInfo) {
        paginationInfo.innerHTML = `Mostrando <strong>${start + 1} - ${Math.min(start + pageSize, filtered.length)}</strong> de <strong>${filtered.length}</strong> matrículas`;
      }

      if (tbody) {
        tbody.innerHTML = pageItems.map(m => `
          <tr>
            <td>
              <a href="#" class="link-student td-strong" data-cedula="${m.cedula}" style="color:var(--primary-light);text-decoration:none;">
                ${m.nombre}
              </a>
            </td>
            <td><span class="td-code">${m.cedula}</span></td>
            <td><span class="badge ${m.estado === 'activa' ? 'badge-normal' : 'badge-retirado'}">${m.estado}</span></td>
            <td><span class="td-code">${m.codigo}</span></td>
            <td style="font-size:12px;">${m.docente}</td>
            <td class="td-center">${m.clases}</td>
            <td class="td-center">${m.clasesDictadas !== null ? m.clasesDictadas : '—'}</td>
            <td class="td-center">${m.asistidas !== null ? m.asistidas : '—'}</td>
            <td class="td-center">${m.inasistencias !== null ? m.inasistencias : '—'}</td>
            <td class="td-right td-strong">${formatPct(m.porcAsistencia)}</td>
            <td>${getNivelBadge(m.nivel)}</td>
            <td>${m.tipoAlerta ? `<span class="badge badge-alerta">${m.tipoAlerta}</span>` : '—'}</td>
          </tr>
        `).join('');

        tbody.querySelectorAll(".link-student").forEach(a => {
          a.addEventListener("click", (e) => {
            e.preventDefault();
            const ced = a.getAttribute("data-cedula");
            if (onNavigate) onNavigate("ficha", { cedula: ced });
          });
        });
      }
    }

    let html = `
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>Directorio Completo de Estudiantes y Matrículas</h3>
            <p>Registro de las 2,127 matrículas en el sistema</p>
          </div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <select id="select-filter-matricula-estado" class="form-select" style="width:auto;">
              <option value="todos">Todos los Estados</option>
              <option value="activa" selected>Solo Activas</option>
              <option value="retirado">Solo Retirados</option>
            </select>
            <input type="text" id="input-search-matriculas" class="form-input" style="max-width:240px;" placeholder="Buscar nombre, cédula o grupo...">
            <button id="btn-export-all-matriculas-csv" class="btn btn-outline">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Exportar Todo CSV
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="table-all-matriculas">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Cédula</th>
                <th>Estado</th>
                <th>Código</th>
                <th>Docente</th>
                <th class="td-center">Clases</th>
                <th class="td-center">Dictadas</th>
                <th class="td-center">Asist.</th>
                <th class="td-center">Faltas</th>
                <th class="td-right">% Asist.</th>
                <th>Nivel</th>
                <th>Tipo Alerta</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-color);background-color:#ffffff;">
          <div id="matriculas-pagination-info" style="font-size:13px;color:var(--text-muted);"></div>
          <div style="display:flex;gap:8px;">
            <button id="btn-prev-page" class="btn btn-outline btn-sm">← Anterior</button>
            <button id="btn-next-page" class="btn btn-outline btn-sm">Siguiente →</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    currentFilterEstado = "activa"; // default filter to active
    renderTable();

    // Event listeners
    container.querySelector("#input-search-matriculas").addEventListener("input", (e) => {
      currentQuery = e.target.value.toLowerCase().trim();
      currentPage = 1;
      renderTable();
    });

    container.querySelector("#select-filter-matricula-estado").addEventListener("change", (e) => {
      currentFilterEstado = e.target.value;
      currentPage = 1;
      renderTable();
    });

    container.querySelector("#btn-prev-page").addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });

    container.querySelector("#btn-next-page").addEventListener("click", () => {
      const filtered = getFilteredMatriculas();
      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    });

    // Export full CSV
    container.querySelector("#btn-export-all-matriculas-csv").addEventListener("click", () => {
      exportTableToCSV(
        "Matriculas_Completo.csv",
        ["Cédula", "Nombre", "Estado", "Grupo", "Código", "Docente", "Horario", "Clases", "Asistidas", "Clases Planeadas", "Clases Dictadas", "Inasistencias", "% Asistencia", "Nivel", "Tipo Alerta", "Prioridad", "En Base Estudiantes", "Observación"],
        state.matriculas.map(m => [
          m.cedula,
          m.nombre,
          m.estado,
          m.grupo,
          m.codigo,
          m.docente,
          m.horario,
          m.clases,
          m.asistidas,
          m.clasesPlaneadas,
          m.clasesDictadas,
          m.inasistencias,
          m.porcAsistencia !== null ? (m.porcAsistencia * 100).toFixed(2) + "%" : "",
          m.nivel,
          m.tipoAlerta,
          m.prioridad,
          m.enBaseEstudiantes,
          m.observacion
        ])
      );
    });
  }

  /* =========================================================================
     8. PARÁMETROS Y UMBRALES
     ========================================================================= */
  function renderParametrosView(container, state, onSaveParams, onResetParams) {
    const params = state.parametros || AttendanceEngine.DEFAULT_PARAMETROS;
    const niveles = params.niveles || AttendanceEngine.DEFAULT_PARAMETROS.niveles;

    let html = `
      <div class="content-card">
        <div class="card-header">
          <div class="card-title-box">
            <h3>Parámetros del Sistema y Semáforo de Asistencia</h3>
            <p>Modifique los umbrales de alerta y recalculación dinámica en tiempo real</p>
          </div>
          <button id="btn-reset-params" class="btn btn-outline">Restablecer Valores Predeterminados</button>
        </div>
        <div class="card-body">
          <form id="form-parametros">
            <h4 style="font-size:14px;font-weight:700;margin-bottom:12px;">Semáforo sobre % de Asistencia</h4>
            
            <div class="table-responsive" style="margin-bottom:24px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nivel</th>
                    <th>Hasta (% asistencia, incluido)</th>
                    <th class="td-center">Prioridad</th>
                    <th>Descripción</th>
                    <th>Acción Sugerida</th>
                  </tr>
                </thead>
                <tbody>
                  ${niveles.map((niv, idx) => `
                    <tr>
                      <td class="td-strong">${niv.nivel}</td>
                      <td>
                        <input type="number" step="0.001" min="0" max="1" class="form-input param-nivel-hasta" data-idx="${idx}" value="${niv.hasta}" style="width:120px;">
                        <span style="font-size:12px;color:var(--text-muted);margin-left:6px;">(${formatPct(niv.hasta)})</span>
                      </td>
                      <td class="td-center">${niv.prioridad}</td>
                      <td style="font-size:13px;">${niv.descripcion}</td>
                      <td>
                        <input type="text" class="form-input param-nivel-accion" data-idx="${idx}" value="${niv.accion}">
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <h4 style="font-size:14px;font-weight:700;margin-bottom:12px;">Parámetros Adicionales de Alerta</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:20px;margin-bottom:24px;">
              <div class="filter-group">
                <label>Faltas consecutivas para alerta</label>
                <input type="number" id="param-faltas" class="form-input" value="${params.faltasConsec || 3}">
                <span style="font-size:11.5px;color:var(--text-muted);">Dispara ⚠️ AUSENCIAS CONSECUTIVAS</span>
              </div>
              <div class="filter-group">
                <label>Ventana de tendencia (días)</label>
                <input type="number" id="param-ventana" class="form-input" value="${params.ventanaTend || 14}">
                <span style="font-size:11.5px;color:var(--text-muted);">Días para comparar contra periodo anterior</span>
              </div>
              <div class="filter-group">
                <label>Caída mínima para tendencia negativa</label>
                <input type="number" step="0.01" id="param-caida" class="form-input" value="${params.caidaTend || 0.1}">
                <span style="font-size:11.5px;color:var(--text-muted);">Dispara 📉 TENDENCIA NEGATIVA</span>
              </div>
              <div class="filter-group">
                <label>Excluir usuarios de prueba (texto)</label>
                <input type="text" id="param-prueba" class="form-input" value="${params.prueba || 'Prueba'}">
                <span style="font-size:11.5px;color:var(--text-muted);">Registros con este nombre no cuentan en KPIs</span>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="padding:10px 24px;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Guardar y Recalcular Tablero
            </button>
          </form>
        </div>
      </div>
    `;

    container.innerHTML = html;

    const form = document.getElementById("form-parametros");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const updatedNiveles = niveles.map((niv, i) => {
        const hastaInput = container.querySelector(`.param-nivel-hasta[data-idx="${i}"]`);
        const accionInput = container.querySelector(`.param-nivel-accion[data-idx="${i}"]`);
        return {
          ...niv,
          hasta: parseFloat(hastaInput.value) || 0,
          accion: accionInput.value.trim()
        };
      });

      const updatedParams = {
        niveles: updatedNiveles,
        faltasConsec: parseInt(document.getElementById("param-faltas").value, 10) || 3,
        ventanaTend: parseInt(document.getElementById("param-ventana").value, 10) || 14,
        caidaTend: parseFloat(document.getElementById("param-caida").value) || 0.1,
        desvAnom: params.desvAnom || 1.5,
        prueba: document.getElementById("param-prueba").value.trim() || "Prueba"
      };

      if (onSaveParams) onSaveParams(updatedParams);
    });

    document.getElementById("btn-reset-params").addEventListener("click", () => {
      if (confirm("¿Desea restablecer todos los parámetros a sus valores predeterminados?")) {
        if (onResetParams) onResetParams();
      }
    });
  }

  function renderApiView(container, state, onDataLoaded) {
    let html = `
      <!-- Live Web Sync Hero Card -->
      <div class="content-card" style="border-left: 4px solid var(--accent); margin-bottom: 24px;">
        <div class="card-header" style="background-color: #f0f9ff;">
          <div class="card-title-box">
            <h3 style="color: #0369a1; display:flex; align-items:center; gap:8px;">
              <svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Sincronización Directa en Tiempo Real
            </h3>
            <p>Conexión directa para obtener las clases y asistencias en tiempo real.</p>
          </div>
          <div>
            <button id="btn-sync-live" class="btn btn-primary" style="background-color: #0284c7;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Sincronizar en Vivo Ahora
            </button>
          </div>
        </div>
        <div class="card-body">
          <div id="sync-live-status" style="margin-bottom:20px;"></div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div style="background:#f8fafc;border:1px solid var(--border-color);border-radius:var(--radius);padding:16px;">
              <h4 style="font-size:13.5px;font-weight:700;margin-bottom:6px;color:var(--text-main);">Método 1: Comando de Terminal (Recomendado)</h4>
              <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">
                Descarga automáticamente los 7 programas, 57 grupos y más de 9,600 asistencias sesión a sesión:
              </p>
              <pre class="code-block" style="padding:10px 14px;font-size:12px;"><code>python3 actualizar_desde_web.py</code></pre>
            </div>

            <div style="background:#f8fafc;border:1px solid var(--border-color);border-radius:var(--radius);padding:16px;">
              <h4 style="font-size:13.5px;font-weight:700;margin-bottom:6px;color:var(--text-main);">Método 2: Servidor Web con Sync Automático</h4>
              <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">
                Inicie el servidor local para que el botón de arriba sincronice con un solo clic:
              </p>
              <pre class="code-block" style="padding:10px 14px;font-size:12px;"><code>python3 server.py</code></pre>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
        <!-- Dropzone Card -->
        <div class="content-card">
          <div class="card-header">
            <div class="card-title-box">
              <h3>Actualizar Informe desde Archivo Excel</h3>
              <p>Arrastre un archivo Informe Asistencia.xlsx para recalcular al instante</p>
            </div>
          </div>
          <div class="card-body">
            <div id="excel-dropzone" class="dropzone">
              <svg class="dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              <h4 style="font-size:16px;font-weight:700;color:var(--text-main);margin-bottom:6px;">Arrastre su archivo Excel aquí</h4>
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Soporta archivos .xlsx o .xls con las tablas institucionales</p>
              <button class="btn btn-outline" onclick="document.getElementById('input-excel-file').click();">
                Seleccionar archivo del equipo
              </button>
              <input type="file" id="input-excel-file" accept=".xlsx, .xls" style="display:none;">
            </div>
            <div id="upload-status" style="margin-top:16px;display:none;"></div>
          </div>
        </div>

        <!-- Export Data -->
        <div class="content-card">
          <div class="card-header">
            <div class="card-title-box">
              <h3>Consumir Datos desde Otra Página Web / API</h3>
              <p>Descargue la base consolidada o use el script de consumo web</p>
            </div>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
              Los datos calculados están disponibles en formato JSON estructurado para alimentar cualquier página web, dashboard institucional o sistema académico.
            </p>

            <button id="btn-download-json" class="btn btn-primary" style="margin-bottom:20px;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Descargar data.json Consolidado
            </button>

            <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;">Ejemplo de Consumo Web (JavaScript):</h4>
            <pre class="code-block"><code>// Consumir el informe de asistencia desde otra página
fetch('data/data.json')
  .then(response =&gt; response.json())
  .then(data =&gt; {
    console.log('Total grupos:', data.grupos.length);
    console.log('Total matriculas:', data.matriculas.length);
    
    // Obtener los grupos en estado crítico
    const criticos = data.grupos.filter(g =&gt; g.nivelGrupo === '🔴 CRÍTICO');
    console.log('Grupos críticos:', criticos);
  });</code></pre>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Dropzone logic using SheetJS if available
    const dropzone = document.getElementById("excel-dropzone");
    const fileInput = document.getElementById("input-excel-file");
    const statusBox = document.getElementById("upload-status");

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert("Por favor seleccione un archivo Excel (.xlsx o .xls)");
        return;
      }

      statusBox.style.display = "block";
      statusBox.innerHTML = `<div class="badge badge-seguimiento">Procesando ${file.name}...</div>`;

      if (typeof XLSX === 'undefined') {
        statusBox.innerHTML = `<div class="badge badge-critico">Error: Librería SheetJS no encontrada para parsear Excel en el navegador.</div>`;
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Parse Estudiantes
          let matriculas = [];
          if (workbook.Sheets["Estudiantes"]) {
            const rawMatr = XLSX.utils.sheet_to_json(workbook.Sheets["Estudiantes"]);
            matriculas = rawMatr.map(r => ({
              cedula: String(r["Cédula"] || "").trim(),
              nombre: String(r["Nombre"] || "").trim(),
              estado: String(r["Estado"] || "").trim(),
              grupo: String(r["Grupo"] || "").trim(),
              codigo: String(r["Código"] || "").trim(),
              horario: String(r["Horario"] || "").trim(),
              asistencia: r["Asistencia"],
              clases: String(r["Clases"] || "").trim(),
              programa: String(r["Programa"] || "").trim(),
              docente: String(r["Docente"] || "").trim(),
              observacion: String(r["Observación"] || "").trim()
            }));
          }

          // Parse Grupos
          let grupos = [];
          if (workbook.Sheets["GRUPOS"]) {
            const rawG = XLSX.utils.sheet_to_json(workbook.Sheets["GRUPOS"]);
            grupos = rawG.map(r => ({
              codigo: String(r["Código"] || "").trim(),
              programa: String(r["Programa"] || "").trim(),
              grupo: String(r["Grupo"] || "").trim(),
              docente: String(r["Docente"] || "").trim(),
              horario: String(r["Horario"] || "").trim(),
              clasesPlaneadas: r["Clases planeadas"],
              clasesDictadasManual: r["Clases dictadas (manual)"]
            })).filter(g => g.codigo);
          }

          if (matriculas.length === 0 && grupos.length === 0) {
            statusBox.innerHTML = `<div class="badge badge-critico">No se encontraron las hojas 'Estudiantes' o 'GRUPOS' en el archivo.</div>`;
            return;
          }

          const newStateData = {
            parametros: state.parametros,
            grupos: grupos.length > 0 ? grupos : state.grupos,
            matriculas: matriculas.length > 0 ? matriculas : state.matriculas,
            baseEstudiantes: state.baseEstudiantes
          };

          const calculated = AttendanceEngine.recalculateAll(newStateData);
          statusBox.innerHTML = `<div class="badge badge-normal">✅ ¡Datos cargados con éxito! (${calculated.matriculas.length} matrículas, ${calculated.grupos.length} grupos)</div>`;

          if (onDataLoaded) onDataLoaded(calculated);
        } catch (err) {
          console.error(err);
          statusBox.innerHTML = `<div class="badge badge-critico">Error al procesar el archivo: ${err.message}</div>`;
        }
      };
      reader.readAsArrayBuffer(file);
    }

    // Live Sync Button and Timestamp Feedback Handler
    const btnSyncLive = document.getElementById("btn-sync-live");
    const syncStatus = document.getElementById("sync-live-status");

    function updateSidebarSync() {
      const syncTimeEl = document.getElementById("sidebar-sync-time");
      const syncTitleEl = document.getElementById("sidebar-status-title");
      const syncDotEl = document.getElementById("sidebar-status-dot");
      if (!syncTimeEl) return;

      const lastTime = localStorage.getItem("jd_last_sync_time");
      const lastStatus = localStorage.getItem("jd_last_sync_status");

      if (lastTime) {
        if (lastStatus === "success") {
          if (syncTitleEl) syncTitleEl.textContent = "Datos Sincronizados";
          syncTimeEl.textContent = lastTime;
          if (syncDotEl) {
            syncDotEl.style.backgroundColor = "var(--normal)";
            syncDotEl.style.boxShadow = "0 0 8px rgba(16, 185, 129, 0.6)";
          }
        } else {
          if (syncTitleEl) syncTitleEl.textContent = "Fallo de Sincronización";
          syncTimeEl.textContent = "Falló: " + lastTime;
          if (syncDotEl) {
            syncDotEl.style.backgroundColor = "var(--critico)";
            syncDotEl.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.6)";
          }
        }
      }
    }

    function renderSyncStatusBanner() {
      if (!syncStatus) return;
      const lastTime = localStorage.getItem("jd_last_sync_time");
      const lastStatus = localStorage.getItem("jd_last_sync_status");
      const lastSummary = localStorage.getItem("jd_last_sync_summary") || "57 grupos y 2,127 matrículas procesadas";
      const lastError = localStorage.getItem("jd_last_sync_error");

      if (lastStatus === "success" && lastTime) {
        syncStatus.innerHTML = `
          <div class="sync-banner sync-banner-success">
            <div class="sync-banner-icon">✅</div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <h4 style="font-size:15px;font-weight:700;color:#15803d;margin:0;">¡Sincronización Lograda con Éxito!</h4>
                <span class="badge badge-normal" style="font-size:11.5px;padding:3px 8px;">Estado: Confirmado</span>
              </div>
              <p style="font-size:13px;color:#166534;margin-top:6px;line-height:1.5;">
                <strong>Fecha y hora:</strong> ${lastTime}<br>
                <strong>Resultado:</strong> ${lastSummary} sincronizados y calculados correctamente.
              </p>
            </div>
          </div>
        `;
      } else if (lastStatus === "error" && lastTime) {
        syncStatus.innerHTML = `
          <div class="sync-banner sync-banner-error">
            <div class="sync-banner-icon">❌</div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <h4 style="font-size:15px;font-weight:700;color:#b91c1c;margin:0;">No se logró la sincronización</h4>
                <span class="badge badge-critico" style="font-size:11.5px;padding:3px 8px;">Estado: Falló</span>
              </div>
              <p style="font-size:13px;color:#991b1b;margin-top:6px;line-height:1.5;">
                <strong>Fecha y hora del intento:</strong> ${lastTime}<br>
                <strong>Motivo del fallo:</strong> ${lastError || "No se pudo establecer conexión con el servidor."}<br>
                <span style="font-size:12px;color:#7f1d1d;margin-top:4px;display:inline-block;">Los datos previos en pantalla se mantienen intactos. Pulse «Sincronizar en Vivo Ahora» para volver a intentarlo.</span>
              </p>
            </div>
          </div>
        `;
      } else {
        syncStatus.innerHTML = `
          <div class="sync-banner sync-banner-idle">
            <div class="sync-banner-icon">ℹ️</div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <h4 style="font-size:14.5px;font-weight:700;color:#334155;margin:0;">Estado del Sistema: Listo para sincronizar</h4>
                <span class="badge" style="background:#e2e8f0;color:#475569;font-size:11.5px;padding:3px 8px;">Datos Base</span>
              </div>
              <p style="font-size:12.5px;color:#64748b;margin-top:4px;line-height:1.5;">
                Los datos base de 57 grupos y 2,127 matrículas están activos en el tablero. Presione el botón <strong>«Sincronizar en Vivo Ahora»</strong> para obtener la última asistencia en tiempo real.
              </p>
            </div>
          </div>
        `;
      }
    }

    renderSyncStatusBanner();
    updateSidebarSync();

    function getNowFormatted() {
      const now = new Date();
      return now.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + ', ' + now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }

    if (btnSyncLive) {
      btnSyncLive.addEventListener("click", () => {
        btnSyncLive.disabled = true;
        btnSyncLive.style.opacity = "0.75";
        btnSyncLive.innerHTML = `
          <div class="sync-spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#ffffff;border-color:rgba(255,255,255,0.3);margin:0;"></div>
          <span>Sincronizando...</span>
        `;

        syncStatus.innerHTML = `
          <div class="sync-banner sync-banner-loading">
            <div class="sync-spinner"></div>
            <div style="flex:1;">
              <h4 style="font-size:14.5px;font-weight:700;color:#0369a1;margin:0;">Conectando y sincronizando con el servidor...</h4>
              <p style="font-size:12.5px;color:#0284c7;margin-top:4px;">
                Descargando en tiempo real las clases y asistencias sesión a sesión. Por favor espere unos segundos...
              </p>
            </div>
          </div>
        `;

        fetch("/api/sync", {
          headers: { "X-Access-Key": "MiMejorElemnto" }
        })
          .then(async res => {
            const data = await res.json().catch(() => null);
            if (!res.ok) {
              const msg = (data && data.error) ? data.error : ("El servidor respondió con código HTTP " + res.status);
              throw new Error(msg);
            }
            return data;
          })
          .then(result => {
            btnSyncLive.disabled = false;
            btnSyncLive.style.opacity = "1";
            btnSyncLive.innerHTML = `
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Sincronizar en Vivo Ahora</span>
            `;

            const timeStr = getNowFormatted();

            if (result.success) {
              function onSyncDone(calculated) {
                const summaryText = `${calculated.matriculas.length} matrículas, ${calculated.grupos.length} grupos y ${calculated.asistenciaDiaria ? calculated.asistenciaDiaria.length : 0} clases`;
                localStorage.setItem("jd_last_sync_time", timeStr);
                localStorage.setItem("jd_last_sync_status", "success");
                localStorage.setItem("jd_last_sync_summary", summaryText);
                localStorage.removeItem("jd_last_sync_error");

                renderSyncStatusBanner();
                updateSidebarSync();
                if (onDataLoaded) onDataLoaded(calculated);
              }

              if (result.data) {
                const calculated = AttendanceEngine.recalculateAll(result.data);
                onSyncDone(calculated);
              } else {
                fetch("data/data.json?v=" + Date.now())
                  .then(r => r.json())
                  .then(freshData => {
                    const calculated = AttendanceEngine.recalculateAll(freshData);
                    onSyncDone(calculated);
                  })
                  .catch(e => {
                    throw new Error("No se pudo leer el archivo de datos actualizado: " + e.message);
                  });
              }
            } else {
              const errStr = result.error || "El servidor no pudo procesar la solicitud.";
              localStorage.setItem("jd_last_sync_time", timeStr);
              localStorage.setItem("jd_last_sync_status", "error");
              localStorage.setItem("jd_last_sync_error", errStr);

              renderSyncStatusBanner();
              updateSidebarSync();
            }
          })
          .catch(err => {
            btnSyncLive.disabled = false;
            btnSyncLive.style.opacity = "1";
            btnSyncLive.innerHTML = `
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Sincronizar en Vivo Ahora</span>
            `;

            const timeStr = getNowFormatted();
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
            const detailMsg = isLocal 
              ? 'No se detectó el servidor local corriendo en http://localhost:8080. Inicie "python3 server.py" en la terminal.'
              : 'No se pudo comunicar con el endpoint serverless (/api/sync). Verifique la conexión a internet o el despliegue en Vercel.';

            localStorage.setItem("jd_last_sync_time", timeStr);
            localStorage.setItem("jd_last_sync_status", "error");
            localStorage.setItem("jd_last_sync_error", `${err.message}. ${detailMsg}`);

            renderSyncStatusBanner();
            updateSidebarSync();
          });
      });
    }

    // Download JSON
    document.getElementById("btn-download-json").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "informe-asistencia-jd.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Generic CSV exporter helper
  function exportTableToCSV(filename, headers, rows) {
    const csvContent = "\uFEFF" + [
      headers.map(h => `"${String(h || '').replace(/"/g, '""')}"`).join(","),
      ...rows.map(r => r.map(c => `"${String(c !== null && c !== undefined ? c : '').replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return {
    renderInicioView,
    renderCursosView,
    renderFichaView,
    renderAlertasView,
    renderInconsistenciasView,
    renderGruposView,
    renderEstudiantesView,
    renderParametrosView,
    renderApiView
  };
}));
