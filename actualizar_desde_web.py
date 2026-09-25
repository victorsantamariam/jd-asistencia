#!/usr/bin/env python3
"""
actualizar_desde_web.py
Sincronizador automático de asistencia - J.D.:
https://gestorproyectos.esumer.edu.co/tablero/proyecto/AAAABNdd2QfFj8cv
"""

import urllib.request
import ssl
import json
import os
import sys
from datetime import datetime

PROJECT_TOKEN = "AAAABNdd2QfFj8cv"
BASE_URL = "https://gestorproyectos.esumer.edu.co/api/v1/public"

def sync_data():
    print(f"📡 Conectando a {BASE_URL}/proyectos/{PROJECT_TOKEN}/tablero ...")
    ctx = ssl._create_unverified_context()
    
    req = urllib.request.Request(
        f"{BASE_URL}/proyectos/{PROJECT_TOKEN}/tablero",
        headers={"User-Agent": "Mozilla/5.0"}
    )
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            project_data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ Error al conectar al proyecto: {e}")
        return False

    proyecto = project_data.get('proyecto', {})
    programas = project_data.get('programas', [])
    print(f"✅ Proyecto detectado: {proyecto.get('varNombreProyecto')} ({proyecto.get('varCodigoProyecto')})")
    print(f"📚 Total programas: {len(programas)}\n")

    # Load existing parameters or defaults
    parametros = {
        "niveles": [
            {"nivel": "🔴 CRÍTICO", "hasta": 0.000, "prioridad": 1, "descripcion": "0% de asistencia (no ha asistido a ninguna clase)", "accion": "Contactar al estudiante esta semana y notificar a coordinación"},
            {"nivel": "🟠 ALERTA", "hasta": 0.033, "prioridad": 2, "descripcion": "Más de 0% y hasta 3.3%", "accion": "Contactar al estudiante y acordar compromiso de asistencia"},
            {"nivel": "🟡 SEGUIMIENTO", "hasta": 0.067, "prioridad": 3, "descripcion": "Más de 3.3% y hasta 6.7%", "accion": "Monitorear en las próximas clases; recordatorio al estudiante"},
            {"nivel": "🟢 NORMAL", "hasta": 1.000, "prioridad": 4, "descripcion": "Más de 6.7%", "accion": "Sin acción"}
        ],
        "faltasConsec": 3,
        "ventanaTend": 14,
        "caidaTend": 0.1,
        "desvAnom": 1.5,
        "prueba": "Prueba"
    }

    if os.path.exists("data/data.json"):
        try:
            with open("data/data.json", "r", encoding="utf-8") as f:
                old_d = json.load(f)
                if "parametros" in old_d:
                    parametros = old_d["parametros"]
        except Exception:
            pass

    grupos_list = []
    matriculas_list = []
    asistencia_diaria = []
    base_estudiantes = []
    seen_base = set()

    for prog in programas:
        p_name = prog.get('varNombrePrograma', '').strip()
        p_token = prog.get('token')
        print(f"📥 Descargando: {p_name} ...")

        prog_req = urllib.request.Request(
            f"{BASE_URL}/programas/{p_token}/tablero",
            headers={"User-Agent": "Mozilla/5.0"}
        )

        try:
            with urllib.request.urlopen(prog_req, context=ctx, timeout=60) as resp:
                prog_data = json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f"⚠️ Error descargando programa {p_token}: {e}")
            continue

        grupos = prog_data.get('grupos', [])
        print(f"   -> {len(grupos)} grupos encontrados")

        for g in grupos:
            g_cod = str(g.get('varCodigoGrupo') or '').strip()
            g_nom = str(g.get('varNombreGrupo') or '').strip()
            g_doc = str(g.get('docente') or '').strip()
            g_hor = str(g.get('varHorario') or '').strip()
            
            # Group object
            grupo_obj = {
                "codigo": g_cod,
                "programa": p_name,
                "grupo": g_nom,
                "docente": g_doc,
                "horario": g_hor,
                "clasesPlaneadas": None,
                "clasesDictadasEst": None,
                "clasesDictadasManual": None,
                "clasesDictadas": None,
                "matriculasActivas": 0,
                "estudiantesEvaluados": 0,
                "asistencias": 0,
                "inasistencias": 0,
                "porcAsistencia": None,
                "criticos": 0,
                "alerta": 0,
                "seguimiento": 0,
                "normal": 0,
                "sinRegistro": 0,
                "porcRiesgo": 0,
                "nivelGrupo": ""
            }
            grupos_list.append(grupo_obj)

            # Estudiantes del grupo
            estudiantes = g.get('estudiantes', [])
            for est in estudiantes:
                doc = str(est.get('varNumeroDocumento') or '').strip()
                nom = str(est.get('varNombreEstudiante') or '').strip()
                est_matr = str(est.get('varEstadoMatricula') or 'activa').strip().lower()
                correo = str(est.get('varCorreoEstudiante') or '').strip()
                
                asist = est.get('intClasesAsistidas')
                tot_clases = est.get('intTotalClases')
                pct_val = est.get('floatPorcentajeAsistencia')
                asistencia_ratio = (pct_val / 100.0) if pct_val is not None else None

                clases_str = f"{asist}/{tot_clases}" if asist is not None and tot_clases is not None else "null/null"
                
                # Check traslado
                es_traslado = est.get('blnEsTraslado', False)
                orig_grupo = est.get('varGrupoOrigen')
                obs = f"Traslado desde {orig_grupo}" if (es_traslado and orig_grupo) else ""

                matricula_obj = {
                    "cedula": doc,
                    "nombre": nom,
                    "estado": est_matr,
                    "grupo": g_nom,
                    "codigo": g_cod,
                    "horario": g_hor,
                    "asistencia": asistencia_ratio,
                    "clases": clases_str,
                    "programa": p_name,
                    "docente": g_doc,
                    "observacion": obs,
                    "asistidas": asist,
                    "clasesPlaneadas": tot_clases,
                    "clasesDictadas": None,
                    "inasistencias": None,
                    "porcAsistencia": asistencia_ratio,
                    "incluir": None,
                    "nivel": None,
                    "ultimaAsistencia": None,
                    "ultimaInasistencia": None,
                    "faltasConsecutivas": None,
                    "tendencia": None,
                    "tipoAlerta": None,
                    "prioridad": None,
                    "enBaseEstudiantes": "Sí",
                    "fechaMatricula": ""
                }
                matriculas_list.append(matricula_obj)

                # Collect Base Estudiantes
                if doc not in seen_base:
                    seen_base.add(doc)
                    base_estudiantes.append({
                        "num": len(base_estudiantes) + 1,
                        "nombre": nom,
                        "documento": doc,
                        "tipoDoc": "CC",
                        "correo": correo,
                        "telefono": "",
                        "estadoMatricula": est_matr,
                        "fechaMatricula": "",
                        "codigoGrupo": g_cod,
                        "nombreGrupo": g_nom,
                        "horario": g_hor
                    })

            # Clases fecha a fecha (asistencia diaria)
            clases = g.get('clases', [])
            for c in clases:
                fecha = c.get('datFechaClase')
                for est_c in c.get('estudiantes', []):
                    c_doc = str(est_c.get('documento') or '').strip()
                    c_nom = str(est_c.get('nombre') or '').strip()
                    asistio = est_c.get('asistio')
                    obs_c = est_c.get('observaciones') or ""
                    
                    asistencia_diaria.append({
                        "fecha": fecha,
                        "codigoGrupo": g_cod,
                        "cedula": c_doc,
                        "estudiante": c_nom,
                        "estado": "Presente" if asistio else "Ausente",
                        "observacion": obs_c
                    })

    print(f"\n📊 Total recolectado:")
    print(f"   - Grupos: {len(grupos_list)}")
    print(f"   - Matrículas: {len(matriculas_list)}")
    print(f"   - Estudiantes base: {len(base_estudiantes)}")
    print(f"   - Registros diarios de asistencia (sesión a sesión): {len(asistencia_diaria)}")

    now_str = datetime.now().strftime("%d/%m/%Y, %I:%M:%S %p")
    dataset = {
        "metadata": {
            "ultimaActualizacion": now_str,
            "totalMatriculas": len(matriculas_list),
            "totalGrupos": len(grupos_list),
            "totalEstudiantes": len(base_estudiantes),
            "totalAsistencias": len(asistencia_diaria)
        },
        "parametros": parametros,
        "grupos": grupos_list,
        "matriculas": matriculas_list,
        "baseEstudiantes": base_estudiantes,
        "asistenciaDiaria": asistencia_diaria
    }

    # Save to data/data.json
    os.makedirs("data", exist_ok=True)
    with open("data/data.json", "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
    print("💾 Guardado en data/data.json")

    # Save to js/data.js
    os.makedirs("js", exist_ok=True)
    with open("js/data.js", "w", encoding="utf-8") as f:
        f.write("window.INITIAL_DATA = " + json.dumps(dataset, ensure_ascii=False) + ";")
    print("💾 Guardado en js/data.js")

    # Mirror to public/ for Vercel
    if os.path.exists("public"):
        os.makedirs("public/data", exist_ok=True)
        with open("public/data/data.json", "w", encoding="utf-8") as f:
            json.dump(dataset, f, ensure_ascii=False, indent=2)
        os.makedirs("public/js", exist_ok=True)
        with open("public/js/data.js", "w", encoding="utf-8") as f:
            f.write("window.INITIAL_DATA = " + json.dumps(dataset, ensure_ascii=False) + ";")
        print("💾 Guardado en public/data/data.json y public/js/data.js")

    print(f"\n🎉 ¡Sincronización completada exitosamente a las {now_str}!")
    return True

if __name__ == "__main__":
    sync_data()
