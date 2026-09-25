/**
 * engine.js
 * Attendance Calculation Engine for J.D. Attendance Report
 * Reproduces 100% of Excel formulas, lookups, and aggregations.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AttendanceEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const DEFAULT_PARAMETROS = {
    niveles: [
      { nivel: "🔴 CRÍTICO", hasta: 0.000, prioridad: 1, descripcion: "0% de asistencia (no ha asistido a ninguna clase)", accion: "Contactar al estudiante esta semana y notificar a coordinación" },
      { nivel: "🟠 ALERTA", hasta: 0.033, prioridad: 2, descripcion: "Más de 0% y hasta 3.3%", accion: "Contactar al estudiante y acordar compromiso de asistencia" },
      { nivel: "🟡 SEGUIMIENTO", hasta: 0.067, prioridad: 3, descripcion: "Más de 3.3% y hasta 6.7%", accion: "Monitorear en las próximas clases; recordatorio al estudiante" },
      { nivel: "🟢 NORMAL", hasta: 1.000, prioridad: 4, descripcion: "Más de 6.7%", accion: "Sin acción" }
    ],
    faltasConsec: 3,
    ventanaTend: 14,
    caidaTend: 0.1,
    desvAnom: 1.5,
    prueba: "Prueba"
  };

  /**
   * Helper to parse "4/45" into { asistidas: 4, clasesPlaneadas: 45 }
   */
  function parseClases(clasesStr) {
    if (!clasesStr || typeof clasesStr !== 'string') return { asistidas: null, clasesPlaneadas: null };
    const str = clasesStr.trim();
    if (str.toLowerCase().includes('null') || !str.includes('/')) {
      return { asistidas: null, clasesPlaneadas: null };
    }
    const parts = str.split('/');
    const a = parseInt(parts[0], 10);
    const p = parseInt(parts[1], 10);
    return {
      asistidas: isNaN(a) ? null : a,
      clasesPlaneadas: isNaN(p) ? null : p
    };
  }

  /**
   * Calculate student nivel based on attendance %
   */
  function getNivel(pct, estado, nombre, parametros) {
    if (estado !== 'activa') return "Retirado";
    const pPrueba = (parametros && parametros.prueba) || "Prueba";
    if (nombre && nombre.toLowerCase().includes(pPrueba.toLowerCase())) return "Prueba";
    if (pct === null || pct === undefined || isNaN(pct)) return "⚪ SIN REGISTRO";

    const niveles = (parametros && parametros.niveles) || DEFAULT_PARAMETROS.niveles;
    for (let i = 0; i < niveles.length; i++) {
      if (pct <= niveles[i].hasta + 1e-9) {
        return niveles[i].nivel;
      }
    }
    return "🟢 NORMAL";
  }

  /**
   * Calculate group nivel based on group % asistencia (rounded to 3 decimals)
   */
  function getNivelGrupo(pct, parametros) {
    if (pct === null || pct === undefined || isNaN(pct)) return "⚪ SIN REGISTRO";
    const rPct = Math.round(pct * 1000) / 1000;
    const niveles = (parametros && parametros.niveles) || DEFAULT_PARAMETROS.niveles;
    for (let i = 0; i < niveles.length; i++) {
      if (rPct <= niveles[i].hasta + 1e-9) {
        return niveles[i].nivel;
      }
    }
    return "🟢 NORMAL";
  }

  /**
   * Calculate tipoAlerta and prioridad
   */
  function getAlertaAndPrioridad(nivel, faltasConsec, tendencia, parametros) {
    if (nivel === "Retirado" || nivel === "Prueba") {
      return { tipoAlerta: "", prioridad: null };
    }
    const pFaltas = (parametros && parametros.faltasConsec) || 3;
    const parts = [];

    if (nivel === "🔴 CRÍTICO" || nivel === "🟠 ALERTA" || nivel === "🟡 SEGUIMIENTO") {
      parts.push(nivel);
    }
    if (nivel === "⚪ SIN REGISTRO") {
      parts.push("⚪ SIN REGISTRO");
    }
    if (typeof faltasConsec === 'number' && faltasConsec >= pFaltas) {
      parts.push("⚠️ AUSENCIAS CONSECUTIVAS");
    }
    if (tendencia === "📉 Negativa") {
      parts.push("📉 TENDENCIA NEGATIVA");
    }

    const tipoAlerta = parts.join(" + ");
    if (!tipoAlerta) {
      return { tipoAlerta: "", prioridad: null };
    }

    const scores = [];
    if (nivel === "🔴 CRÍTICO") scores.push(1);
    else if (nivel === "🟠 ALERTA") scores.push(2);
    else if (nivel === "🟡 SEGUIMIENTO") scores.push(3);
    else if (nivel === "🟢 NORMAL") scores.push(4);
    else if (nivel === "⚪ SIN REGISTRO") scores.push(2.5);

    if (typeof faltasConsec === 'number' && faltasConsec >= pFaltas) scores.push(1.5);
    if (tendencia === "📉 Negativa") scores.push(3.5);

    const prioridad = scores.length > 0 ? Math.min(...scores) : 9;
    return { tipoAlerta, prioridad };
  }

  /**
   * Recalculate all formulas across groups and matriculas
   */
  function recalculateAll(data) {
    const parametros = Object.assign({}, DEFAULT_PARAMETROS, data.parametros || {});
    const grupos = (data.grupos || []).map(g => Object.assign({}, g));
    const matriculas = (data.matriculas || []).map(m => Object.assign({}, m));
    const baseEstudiantes = data.baseEstudiantes || [];
    const asistenciaDiaria = data.asistenciaDiaria || [];

    const gruposMap = {};
    grupos.forEach(g => {
      gruposMap[g.codigo] = g;
    });

    // Index daily attendance by (cedula, codigoGrupo)
    const dailyMap = {};
    asistenciaDiaria.forEach(r => {
      const key = `${r.cedula}__${r.codigoGrupo}`;
      if (!dailyMap[key]) dailyMap[key] = [];
      dailyMap[key].push(r);
    });

    // 1. First pass on matriculas to extract asistidas & planeadas
    matriculas.forEach(m => {
      const parsed = parseClases(m.clases);
      if (m.asistidas === undefined || m.asistidas === null) m.asistidas = parsed.asistidas;
      if (m.clasesPlaneadas === undefined || m.clasesPlaneadas === null) m.clasesPlaneadas = parsed.clasesPlaneadas;
    });

    // 2. Compute group base numbers (clasesPlaneadas, clasesDictadasEst, clasesDictadas)
    grupos.forEach(g => {
      const cod = g.codigo;
      const inGrp = matriculas.filter(m => m.codigo === cod);

      // Clases planeadas: MINIFS
      const plList = inGrp.map(m => m.clasesPlaneadas).filter(v => typeof v === 'number');
      if (g.clasesPlaneadas === undefined || g.clasesPlaneadas === null) {
        g.clasesPlaneadas = plList.length > 0 ? Math.min(...plList) : 30;
      }

      // Clases dictadas est: MAXIFS of active students with group's planeadas
      const activeSamePlan = inGrp.filter(m => m.estado === 'activa' && m.clasesPlaneadas === g.clasesPlaneadas && typeof m.asistidas === 'number');
      const maxAsist = activeSamePlan.length > 0 ? Math.max(...activeSamePlan.map(m => m.asistidas)) : 0;
      g.clasesDictadasEst = maxAsist;

      // Clases dictadas: manual override or est
      if (g.clasesDictadasManual !== null && g.clasesDictadasManual !== "" && g.clasesDictadasManual !== undefined && !isNaN(parseInt(g.clasesDictadasManual, 10))) {
        g.clasesDictadas = parseInt(g.clasesDictadasManual, 10);
      } else {
        g.clasesDictadas = g.clasesDictadasEst;
      }
    });

    // 3. Compute student clasesDictadas, inasistencias, porcAsistencia, incluir, nivel, alerta, prioridad
    const baseSet = new Set(baseEstudiantes.map(b => `${b.documento}__${b.codigoGrupo}`));

    matriculas.forEach(m => {
      const grp = gruposMap[m.codigo];
      const c = grp ? grp.clasesDictadas : 0;
      const bp = grp ? grp.clasesPlaneadas : 0;

      let od = 0;
      if (m.observacion && m.observacion.startsWith("Traslado desde ")) {
        const origCod = m.observacion.replace("Traslado desde ", "").trim();
        if (gruposMap[origCod]) {
          od = gruposMap[origCod].clasesDictadas;
        }
      }

      let cd = null;
      if (m.asistidas !== null && typeof m.asistidas === 'number') {
        if (bp === 0 || (m.clasesPlaneadas && m.clasesPlaneadas <= bp)) {
          cd = c;
        } else if (od > 0) {
          cd = c + od;
        } else {
          cd = Math.round(c * (m.clasesPlaneadas || 0) / bp);
        }
      }
      m.clasesDictadas = cd;

      // Inasistencias
      if (m.estado !== 'activa' || cd === null || m.asistidas === null) {
        m.inasistencias = null;
      } else {
        m.inasistencias = Math.max(0, cd - m.asistidas);
      }

      // Porcentaje de asistencia
      if (m.estado !== 'activa' || m.asistidas === null || m.asistidas === undefined) {
        m.porcAsistencia = null;
      } else if (typeof m.asistencia === 'number') {
        m.porcAsistencia = m.asistencia;
      } else if (m.clasesPlaneadas && m.clasesPlaneadas > 0) {
        m.porcAsistencia = m.asistidas / m.clasesPlaneadas;
      } else {
        m.porcAsistencia = 0;
      }

      // Process daily attendance if available
      const studentDaily = dailyMap[`${m.cedula}__${m.codigo}`];
      if (studentDaily && studentDaily.length > 0) {
        const sortedDaily = [...studentDaily].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
        const attendedDates = sortedDaily.filter(d => d.estado === 'Presente').map(d => d.fecha);
        const absentDates = sortedDaily.filter(d => d.estado === 'Ausente').map(d => d.fecha);

        m.ultimaAsistencia = attendedDates.length > 0 ? attendedDates[attendedDates.length - 1] : null;
        m.ultimaInasistencia = absentDates.length > 0 ? absentDates[absentDates.length - 1] : null;

        // Faltas consecutivas at the tail
        let consec = 0;
        for (let i = sortedDaily.length - 1; i >= 0; i--) {
          if (sortedDaily[i].estado === 'Ausente') {
            consec++;
          } else {
            break;
          }
        }
        m.faltasConsecutivas = consec;
      }

      // Incluir
      m.incluir = (m.estado === 'activa' && typeof m.porcAsistencia === 'number' && !m.nombre.toLowerCase().includes(parametros.prueba.toLowerCase()));

      // Nivel
      m.nivel = getNivel(m.porcAsistencia, m.estado, m.nombre, parametros);

      // Alerta y Prioridad
      const ap = getAlertaAndPrioridad(m.nivel, m.faltasConsecutivas, m.tendencia, parametros);
      m.tipoAlerta = ap.tipoAlerta;
      m.prioridad = ap.prioridad;

      // En Base Estudiantes
      m.enBaseEstudiantes = baseSet.has(`${m.cedula}__${m.codigo}`) ? "Sí" : "No";
    });

    // 4. Compute group final aggregations
    grupos.forEach(g => {
      const inGrp = matriculas.filter(m => m.codigo === g.codigo);
      g.matriculasActivas = inGrp.filter(m => m.estado === 'activa').length;

      const evalList = inGrp.filter(m => m.incluir === true);
      g.estudiantesEvaluados = evalList.length;

      let sumAsist = 0;
      let sumInasist = 0;
      let sumPct = 0;
      evalList.forEach(m => {
        if (typeof m.asistidas === 'number') sumAsist += m.asistidas;
        if (typeof m.inasistencias === 'number') sumInasist += m.inasistencias;
        if (typeof m.porcAsistencia === 'number') sumPct += m.porcAsistencia;
      });

      g.asistencias = sumAsist;
      g.inasistencias = sumInasist;
      g.porcAsistencia = evalList.length > 0 ? (sumPct / evalList.length) : null;

      g.criticos = inGrp.filter(m => m.nivel === "🔴 CRÍTICO").length;
      g.alerta = inGrp.filter(m => m.nivel === "🟠 ALERTA").length;
      g.seguimiento = inGrp.filter(m => m.nivel === "🟡 SEGUIMIENTO").length;
      g.normal = inGrp.filter(m => m.nivel === "🟢 NORMAL").length;
      g.sinRegistro = inGrp.filter(m => m.nivel === "⚪ SIN REGISTRO").length;

      g.porcRiesgo = g.estudiantesEvaluados > 0 ? (g.criticos + g.alerta + g.seguimiento) / g.estudiantesEvaluados : 0;
      g.nivelGrupo = getNivelGrupo(g.porcAsistencia, parametros);
    });

    return {
      parametros,
      grupos,
      matriculas,
      baseEstudiantes,
      asistenciaDiaria,
      resumenGrupo: data.resumenGrupo || []
    };
  }

  /**
   * Filter and aggregate for INICIO dashboard KPIs
   */
  function calculateDashboardKPIs(state, filterProg, filterGrp, filterDoc) {
    const isAll = (v) => !v || v === "(Todos)" || v === "*";

    // Matching groups
    const matchingGrupos = state.grupos.filter(g => {
      if (!isAll(filterProg) && g.programa !== filterProg) return false;
      if (!isAll(filterGrp) && g.codigo !== filterGrp) return false;
      if (!isAll(filterDoc) && g.docente !== filterDoc) return false;
      return true;
    });

    // Matching matriculas
    const matchingMatriculas = state.matriculas.filter(m => {
      if (!isAll(filterProg) && m.programa !== filterProg) return false;
      if (!isAll(filterGrp) && m.codigo !== filterGrp) return false;
      if (!isAll(filterDoc) && m.docente !== filterDoc) return false;
      return true;
    });

    const pPrueba = (state.parametros && state.parametros.prueba) || "Prueba";
    const activeMatriculas = matchingMatriculas.filter(m => m.estado === 'activa' && !m.nombre.toLowerCase().includes(pPrueba.toLowerCase()));

    const uniqueCedulas = new Set(activeMatriculas.map(m => m.cedula));
    const uniquePrograms = new Set(matchingGrupos.map(g => g.programa));

    const totalCursos = uniquePrograms.size;
    const totalGrupos = matchingGrupos.length;
    const estudiantesActivos = uniqueCedulas.size;
    const matriculasActivas = activeMatriculas.length;

    let clasesDictadas = 0;
    matchingGrupos.forEach(g => {
      clasesDictadas += (g.clasesDictadas || 0);
    });

    const evalMatriculas = activeMatriculas.filter(m => m.incluir === true);
    let asistencias = 0;
    let inasistencias = 0;
    let sumPct = 0;
    evalMatriculas.forEach(m => {
      if (typeof m.asistidas === 'number') asistencias += m.asistidas;
      if (typeof m.inasistencias === 'number') inasistencias += m.inasistencias;
      if (typeof m.porcAsistencia === 'number') sumPct += m.porcAsistencia;
    });

    const asistenciaPromedio = evalMatriculas.length > 0 ? (sumPct / evalMatriculas.length) : null;
    const inasistenciaTotal = (asistencias + inasistencias > 0) ? (inasistencias / (asistencias + inasistencias)) : 0;

    let criticos = 0;
    let alerta = 0;
    let seguimiento = 0;
    let normal = 0;
    let sinRegistro = 0;

    matchingMatriculas.forEach(m => {
      if (m.nivel === "🔴 CRÍTICO") criticos++;
      else if (m.nivel === "🟠 ALERTA") alerta++;
      else if (m.nivel === "🟡 SEGUIMIENTO") seguimiento++;
      else if (m.nivel === "🟢 NORMAL") normal++;
      else if (m.nivel === "⚪ SIN REGISTRO") sinRegistro++;
    });

    const enRiesgo = alerta + seguimiento;
    const porcEnRiesgo = matriculasActivas > 0 ? enRiesgo / matriculasActivas : 0;
    const porcCriticos = matriculasActivas > 0 ? criticos / matriculasActivas : 0;
    const semaforoGeneral = getNivelGrupo(asistenciaPromedio, state.parametros);

    // Groups with lowest attendance
    const evaluatedGroups = matchingGrupos.filter(g => g.estudiantesEvaluados > 0);
    evaluatedGroups.sort((a, b) => {
      const pA = a.porcAsistencia !== null ? a.porcAsistencia : 999;
      const pB = b.porcAsistencia !== null ? b.porcAsistencia : 999;
      return pA - pB;
    });
    const gruposMenorAsistencia = evaluatedGroups.slice(0, 12);

    // Attendance by course (for bar chart)
    const allPrograms = Array.from(new Set(state.grupos.map(g => g.programa))).sort();
    const asistenciaPorCurso = allPrograms.map(prog => {
      const progMatr = state.matriculas.filter(m => m.programa === prog && m.incluir === true && (isAll(filterDoc) || m.docente === filterDoc));
      let pSum = 0;
      progMatr.forEach(m => { pSum += m.porcAsistencia; });
      const avg = progMatr.length > 0 ? pSum / progMatr.length : 0;
      return {
        programa: prog,
        asistenciaPromedio: avg,
        estudiantes: progMatr.length
      };
    });

    return {
      totalCursos,
      totalGrupos,
      estudiantesActivos,
      matriculasActivas,
      clasesDictadas,
      asistencias,
      inasistencias,
      asistenciaPromedio,
      inasistenciaTotal,
      criticos,
      alerta,
      seguimiento,
      normal,
      sinRegistro,
      enRiesgo,
      porcEnRiesgo,
      porcCriticos,
      semaforoGeneral,
      gruposMenorAsistencia,
      asistenciaPorCurso,
      matchingGrupos,
      matchingMatriculas
    };
  }

  /**
   * Detect data inconsistencies (matching INCONSISTENCIAS sheet)
   */
  function detectInconsistencias(state) {
    const matriculas = state.matriculas;
    const grupos = state.grupos;
    const base = state.baseEstudiantes;
    const gMap = {};
    grupos.forEach(g => { gMap[g.codigo] = g; });

    // 1. Fechas de asistencia
    const hasDaily = state.asistenciaDiaria && state.asistenciaDiaria.length > 0;
    const sinFechas = {
      titulo: "Fechas de asistencia sesión a sesión",
      conteo: hasDaily ? `${state.asistenciaDiaria.length} cargadas` : "0 (Solo acumulados)",
      impacto: hasDaily ? "Historial por clase y ausencias consecutivas activadas" : "No se puede calcular historial detallado",
      solucion: hasDaily ? "Sincronizado en tiempo real" : "Sincronizar directamente con el botón de la API"
    };

    // 2. Clases dictadas manuales no registradas
    const sinManual = grupos.filter(g => g.clasesDictadasManual === null || g.clasesDictadasManual === "" || g.clasesDictadasManual === undefined).length;
    const inconsistenciaManual = {
      titulo: "No se registran las clases dictadas manuales por grupo",
      conteo: sinManual,
      impacto: "El % se calcula sobre una estimación (máx. asistencias del grupo)",
      solucion: "Ingresar el número real en la configuración de grupos"
    };

    // 3. Activos sin registro (null/null)
    const sinRegMatriculas = matriculas.filter(m => m.nivel === "⚪ SIN REGISTRO");
    const inconsistenciaSinReg = {
      titulo: "Activos sin registro de asistencia (Clases = null/null)",
      conteo: sinRegMatriculas.length,
      impacto: "No tienen % de asistencia; aparecen como ⚪ SIN REGISTRO en ALERTAS",
      solucion: "Verificar con el docente (concentrado en IAA-02 e IAA-06)"
    };

    // 4. Usuarios de prueba
    const pPrueba = (state.parametros && state.parametros.prueba) || "Prueba";
    const pruebas = matriculas.filter(m => m.nombre && m.nombre.toLowerCase().includes(pPrueba.toLowerCase()));
    const inconsistenciaPrueba = {
      titulo: "Usuario de prueba en la base",
      conteo: pruebas.length,
      impacto: "Distorsiona conteos si no se excluye (ya se excluye de indicadores)",
      solucion: "Eliminar de la plataforma de origen"
    };

    // 5. Planeadas > planeadas de grupo (traslados)
    const trasladosExceso = [];
    const trasladosSinObs = [];
    matriculas.forEach(m => {
      const g = gMap[m.codigo];
      if (g && m.clasesPlaneadas && g.clasesPlaneadas && m.clasesPlaneadas > g.clasesPlaneadas) {
        trasladosExceso.push(m);
        if (!m.observacion || m.observacion.trim() === "") {
          trasladosSinObs.push(m);
        }
      }
    });

    const inconsistenciaTraslados = {
      titulo: "Clases acumuladas por traslado (planeadas > planeadas del grupo)",
      conteo: trasladosExceso.length,
      impacto: "Asistencias del grupo de origen se suman al de destino",
      solucion: "Ya se ajusta el denominador; idealmente separar asistencias por grupo en origen"
    };

    const inconsistenciaTrasladosSinObs = {
      titulo: "…de ellos, sin observación de traslado",
      conteo: trasladosSinObs.length,
      impacto: "No se sabe el grupo de origen; se estima proporcionalmente",
      solucion: "Registrar 'Traslado desde X' en la observación"
    };

    // 7. Asistencias > dictadas
    const asistExceso = matriculas.filter(m => m.estado === 'activa' && m.asistidas > m.clasesDictadas);
    const inconsistenciaAsistExceso = {
      titulo: "Asistencias mayores que clases dictadas estimadas",
      conteo: asistExceso.length,
      impacto: "% limitado a 100%",
      solucion: "Cargar clases dictadas reales en grupos"
    };

    // 8. Activas que no están en Base Estudiantes (Table A)
    const tablaA = matriculas.filter(m => m.estado === 'activa' && m.enBaseEstudiantes === 'No');
    tablaA.forEach(m => {
      const inBase = base.filter(b => b.documento === m.cedula);
      m.gruposEnBase = inBase.length > 0 ? inBase.map(b => b.codigoGrupo).join(", ") : "—";
    });

    const inconsistenciaNoEnBase = {
      titulo: "Matrículas activas que no están en Base Estudiantes",
      conteo: tablaA.length,
      impacto: "Base Estudiantes no refleja traslados recientes",
      solucion: "Actualizar Base Estudiantes (ver lista abajo)"
    };

    // 9. Registros de Base no en Estudiantes (Table B)
    const matrSet = new Set(matriculas.map(m => `${m.cedula}__${m.codigo}`));
    const tablaB = base.filter(b => !matrSet.has(`${b.documento}__${b.codigoGrupo}`));
    tablaB.forEach(b => {
      const inMatr = matriculas.filter(m => m.cedula === b.documento && m.estado === 'activa');
      b.grupoActivoEnMatriculas = inMatr.length > 0 ? inMatr.map(m => m.codigo).join(", ") : "—";
    });

    const inconsistenciaBaseNoEnMatr = {
      titulo: "Registros de Base Estudiantes que no están en Estudiantes",
      conteo: tablaB.length,
      impacto: "Estudiante figura en un grupo en el que ya no está",
      solucion: "Actualizar el grupo en Base Estudiantes (ver lista abajo)"
    };

    // 10. Espacios dobles
    const espacios = matriculas.filter(m => m.nombre && (m.nombre !== m.nombre.trim() || m.nombre.includes('  ')));
    const inconsistenciaEspacios = {
      titulo: "Nombres con espacios dobles o sobrantes",
      conteo: espacios.length,
      impacto: "Dificulta búsquedas exactas (la búsqueda de la ficha tolera esto automáticamente)",
      solucion: "Limpiar en la plataforma de origen"
    };

    // 11. Resumen por grupo estático
    const inconsistenciaResumenFijo = {
      titulo: "'Resumen por grupo' contiene valores fijos",
      conteo: "1 hoja",
      impacto: "No se actualiza al cambiar los datos",
      solucion: "Usar GRUPOS / CURSOS, que son 100% dinámicos"
    };

    // Table C: Sin registro (null/null) and pruebas
    const tablaC = matriculas.filter(m => m.nivel === "⚪ SIN REGISTRO" || m.nivel === "Prueba");

    return {
      auditorias: [
        sinFechas,
        inconsistenciaManual,
        inconsistenciaSinReg,
        inconsistenciaPrueba,
        inconsistenciaTraslados,
        inconsistenciaTrasladosSinObs,
        inconsistenciaAsistExceso,
        inconsistenciaNoEnBase,
        inconsistenciaBaseNoEnMatr,
        inconsistenciaEspacios,
        inconsistenciaResumenFijo
      ],
      tablaA,
      tablaB,
      tablaC
    };
  }

  return {
    DEFAULT_PARAMETROS,
    parseClases,
    getNivel,
    getNivelGrupo,
    getAlertaAndPrioridad,
    recalculateAll,
    calculateDashboardKPIs,
    detectInconsistencias
  };
}));
