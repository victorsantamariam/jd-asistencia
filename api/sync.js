/**
 * /api/sync.js
 * Serverless function for Vercel
 * Protected by institutional key 'MiMejorElemnto'
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Access-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify access key
  const authKey = req.headers['x-access-key'] || (req.query && req.query.key);
  if (authKey !== 'MiMejorElemnto' && authKey !== 'MiMejorElemento') {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado. Contraseña requerida.' });
  }

  const PROJECT_TOKEN = 'AAAABNdd2QfFj8cv';
  const BASE_URL = 'https://gestorproyectos.esumer.edu.co/api/v1/public';

  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Referer': 'https://gestorproyectos.esumer.edu.co/tablero/proyecto/AAAABNdd2QfFj8cv'
  };

  try {
    const projRes = await fetch(`${BASE_URL}/proyectos/${PROJECT_TOKEN}/tablero`, {
      headers: BROWSER_HEADERS
    });
    if (!projRes.ok) {
      const errBody = await projRes.text();
      const cfRay = projRes.headers.get('cf-ray') || '';
      const server = projRes.headers.get('server') || '';
      throw new Error(`HTTP ${projRes.status} upstream (${server}, ray: ${cfRay}): ${errBody.slice(0, 150)}`);
    }

    const projectData = await projRes.json();
    const programas = projectData.programas || [];

    const parametros = {
      niveles: [
        { nivel: '🔴 CRÍTICO', hasta: 0.000, prioridad: 1, descripcion: '0% de asistencia (no ha asistido a ninguna clase)', accion: 'Contactar al estudiante esta semana y notificar a coordinación' },
        { nivel: '🟠 ALERTA', hasta: 0.033, prioridad: 2, descripcion: 'Más de 0% y hasta 3.3%', accion: 'Contactar al estudiante y acordar compromiso de asistencia' },
        { nivel: '🟡 SEGUIMIENTO', hasta: 0.067, prioridad: 3, descripcion: 'Más de 3.3% y hasta 6.7%', accion: 'Monitorear en las próximas clases; recordatorio al estudiante' },
        { nivel: '🟢 NORMAL', hasta: 1.000, prioridad: 4, descripcion: 'Más de 6.7%', accion: 'Sin acción' }
      ],
      faltasConsec: 3,
      ventanaTend: 14,
      caidaTend: 0.1,
      desvAnom: 1.5,
      prueba: 'Prueba'
    };

    const gruposList = [];
    const matriculasList = [];
    const asistenciaDiaria = [];
    const baseEstudiantes = [];
    const seenBase = new Set();

    const progResults = await Promise.all(programas.map(async (prog) => {
      const pName = (prog.varNombrePrograma || '').trim();
      try {
        const r = await fetch(`${BASE_URL}/programas/${prog.token}/tablero`, {
          headers: BROWSER_HEADERS
        });
        if (!r.ok) return null;
        const d = await r.json();
        return { pName, progData: d };
      } catch (e) {
        return null;
      }
    }));

    for (const item of progResults) {
      if (!item || !item.progData) continue;
      const { pName, progData } = item;
      const grupos = progData.grupos || [];

      for (const g of grupos) {
        const gCod = String(g.varCodigoGrupo || '').trim();
        const gNom = String(g.varNombreGrupo || '').trim();
        const gDoc = String(g.docente || '').trim();
        const gHor = String(g.varHorario || '').trim();

        gruposList.push({
          codigo: gCod,
          programa: pName,
          grupo: gNom,
          docente: gDoc,
          horario: gHor,
          clasesPlaneadas: null,
          clasesDictadasEst: null,
          clasesDictadasManual: null,
          clasesDictadas: null,
          matriculasActivas: 0,
          estudiantesEvaluados: 0,
          asistencias: 0,
          inasistencias: 0,
          porcAsistencia: null,
          criticos: 0,
          alerta: 0,
          seguimiento: 0,
          normal: 0,
          sinRegistro: 0,
          porcRiesgo: 0,
          nivelGrupo: ''
        });

        for (const est of (g.estudiantes || [])) {
          const doc = String(est.varNumeroDocumento || '').trim();
          const nom = String(est.varNombreEstudiante || '').trim();
          const estMatr = String(est.varEstadoMatricula || 'activa').trim().toLowerCase();
          const correo = String(est.varCorreoEstudiante || '').trim();
          const asist = est.intClasesAsistidas;
          const totClases = est.intTotalClases;
          const pctVal = est.floatPorcentajeAsistencia;
          const asistenciaRatio = (pctVal !== null && pctVal !== undefined) ? (pctVal / 100.0) : null;
          const clasesStr = (asist !== null && totClases !== null) ? `${asist}/${totClases}` : 'null/null';
          const esTraslado = est.blnEsTraslado || false;
          const origGrupo = est.varGrupoOrigen;
          const obs = (esTraslado && origGrupo) ? `Traslado desde ${origGrupo}` : '';

          matriculasList.push({
            cedula: doc,
            nombre: nom,
            estado: estMatr,
            grupo: gNom,
            codigo: gCod,
            horario: gHor,
            asistencia: asistenciaRatio,
            clases: clasesStr,
            programa: pName,
            docente: gDoc,
            observacion: obs,
            asistidas: asist,
            clasesPlaneadas: totClases,
            clasesDictadas: null,
            inasistencias: null,
            porcAsistencia: asistenciaRatio,
            incluir: null,
            nivel: null,
            ultimaAsistencia: null,
            ultimaInasistencia: null,
            faltasConsecutivas: null,
            tendencia: null,
            tipoAlerta: null,
            prioridad: null,
            enBaseEstudiantes: 'Sí',
            fechaMatricula: ''
          });

          if (!seenBase.has(doc)) {
            seenBase.add(doc);
            baseEstudiantes.push({
              num: baseEstudiantes.length + 1,
              nombre: nom,
              documento: doc,
              tipoDoc: 'CC',
              correo: correo,
              telefono: '',
              estadoMatricula: estMatr,
              fechaMatricula: '',
              codigoGrupo: gCod,
              nombreGrupo: gNom,
              horario: gHor
            });
          }
        }

        for (const c of (g.clases || [])) {
          const fecha = c.datFechaClase;
          for (const estC of (c.estudiantes || [])) {
            asistenciaDiaria.push({
              fecha: fecha,
              codigoGrupo: gCod,
              cedula: String(estC.documento || '').trim(),
              estudiante: String(estC.nombre || '').trim(),
              estado: estC.asistio ? 'Presente' : 'Ausente',
              observacion: estC.observaciones || ''
            });
          }
        }
      }
    }

    const payload = {
      parametros,
      grupos: gruposList,
      matriculas: matriculasList,
      baseEstudiantes,
      asistenciaDiaria
    };

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        grupos: gruposList.length,
        matriculas: matriculasList.length,
        estudiantes: baseEstudiantes.length,
        asistencias: asistenciaDiaria.length
      },
      data: payload
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}