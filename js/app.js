/**
 * app.js
 * Main Controller for J.D. Attendance Web Application
 */

document.addEventListener("DOMContentLoaded", function () {
  // Global State
  let state = null;
  let currentTab = "inicio";

  // Filter States
  const filters = {
    inicio: { programa: "(Todos)", grupo: "(Todos)", docente: "(Todos)" },
    cursos: { programa: "(Todos)", grupo: "DAT-01" },
    alertas: { programa: "(Todos)", docente: "(Todos)", tipoAlerta: "(Todos)" },
    ficha: { cedula: null }
  };

  const navTitles = {
    inicio: { title: "Inicio — Tablero General de Asistencia", desc: "Monitoreo general de programas, grupos e indicadores" },
    cursos: { title: "Cursos — Vista Detallada por Grupo", desc: "Desglose por grupo, listado de estudiantes y ranking del programa" },
    ficha: { title: "Ficha Estudiante — Perfil 360°", desc: "Búsqueda interactiva de estudiantes, historial de asistencia y contacto" },
    alertas: { title: "Alertas — Estudiantes que Requieren Atención", desc: "Sistema de alerta temprana ordenado por nivel de prioridad" },
    inconsistencias: { title: "Inconsistencias — Auditoría y Calidad de Datos", desc: "Detección automática de anomalías en la fuente de datos" },
    grupos: { title: "Grupos — Directorio Maestro", desc: "Consolidado de los 57 grupos académicos con métricas de riesgo" },
    estudiantes: { title: "Estudiantes — Directorio de Matrículas", desc: "Base de datos completa de las 2,127 matrículas registradas" },
    parametros: { title: "Parámetros y Umbrales", desc: "Configuración de semáforos, alertas y tolerancias" },
    api: { title: "Cargar Datos & Integración", desc: "Actualización vía archivo Excel o consumo vía API JSON" }
  };

  const viewContainer = document.getElementById("view-container");
  const pageTitle = document.getElementById("page-title");
  const pageDesc = document.getElementById("page-desc");
  const navItems = document.querySelectorAll(".nav-item");

  // Mobile Sidebar Drawer Control
  const sidebar = document.getElementById("app-sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
  const btnCloseSidebar = document.getElementById("btn-close-sidebar");

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (sidebarOverlay) sidebarOverlay.classList.add("active");
    if (window.innerWidth <= 1024) {
      document.body.style.overflow = "hidden";
    }
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (sidebarOverlay) sidebarOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener("click", () => {
      if (sidebar && sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  if (btnCloseSidebar) {
    btnCloseSidebar.addEventListener("click", closeSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar && sidebar.classList.contains("open")) {
      closeSidebar();
    }
  });

  // Navigation Click Handlers
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.getAttribute("data-tab");
      switchTab(tab);
    });
  });

  function switchTab(tab, params) {
    currentTab = tab;
    if (params) {
      if (tab === "cursos" && params.grupo) filters.cursos.grupo = params.grupo;
      if (tab === "ficha" && params.cedula) filters.ficha.cedula = params.cedula;
    }

    // Auto-close sidebar drawer on mobile
    closeSidebar();

    // Update active nav state
    navItems.forEach(item => {
      if (item.getAttribute("data-tab") === tab) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update page title
    const meta = navTitles[tab] || { title: "Informe de Asistencia", desc: "Sistema J.D." };
    pageTitle.textContent = meta.title;
    pageDesc.textContent = meta.desc;

    // Render active view
    renderCurrentView();
  }

  function renderCurrentView() {
    if (!state) {
      viewContainer.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">Cargando datos del informe...</div>`;
      return;
    }

    if (currentTab === "inicio") {
      AttendanceViews.renderInicioView(
        viewContainer,
        state,
        filters.inicio,
        (newFilters) => {
          filters.inicio = newFilters;
          renderCurrentView();
        },
        (targetTab, params) => switchTab(targetTab, params)
      );
    } else if (currentTab === "cursos") {
      AttendanceViews.renderCursosView(
        viewContainer,
        state,
        filters.cursos,
        (newFilters) => {
          filters.cursos = newFilters;
          renderCurrentView();
        },
        (targetTab, params) => switchTab(targetTab, params)
      );
    } else if (currentTab === "ficha") {
      AttendanceViews.renderFichaView(
        viewContainer,
        state,
        filters.ficha.cedula,
        (selectedCedula) => {
          filters.ficha.cedula = selectedCedula;
          renderCurrentView();
        }
      );
    } else if (currentTab === "alertas") {
      AttendanceViews.renderAlertasView(
        viewContainer,
        state,
        filters.alertas,
        (newFilters) => {
          filters.alertas = newFilters;
          renderCurrentView();
        },
        (targetTab, params) => switchTab(targetTab, params)
      );
    } else if (currentTab === "inconsistencias") {
      AttendanceViews.renderInconsistenciasView(
        viewContainer,
        state,
        (targetTab, params) => switchTab(targetTab, params)
      );
    } else if (currentTab === "grupos") {
      AttendanceViews.renderGruposView(
        viewContainer,
        state,
        (targetTab, params) => switchTab(targetTab, params)
      );
    } else if (currentTab === "estudiantes") {
      AttendanceViews.renderEstudiantesView(
        viewContainer,
        state,
        (targetTab, params) => switchTab(targetTab, params)
      );
    } else if (currentTab === "parametros") {
      AttendanceViews.renderParametrosView(
        viewContainer,
        state,
        (newParams) => {
          state.parametros = newParams;
          state = AttendanceEngine.recalculateAll(state);
          alert("¡Parámetros actualizados y cálculos recalculados con éxito!");
          updateSidebarBadges();
          renderCurrentView();
        },
        () => {
          state.parametros = AttendanceEngine.DEFAULT_PARAMETROS;
          state = AttendanceEngine.recalculateAll(state);
          updateSidebarBadges();
          renderCurrentView();
        }
      );
    } else if (currentTab === "api") {
      AttendanceViews.renderApiView(
        viewContainer,
        state,
        (newState) => {
          state = newState;
          updateSidebarBadges();
          renderCurrentView();
        }
      );
    }
  }

  function updateSidebarSyncStatus() {
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
    } else {
      if (syncTitleEl) syncTitleEl.textContent = "Datos Sincronizados";
      syncTimeEl.textContent = "Cálculo dinámico activo";
    }
  }

  function updateSidebarBadges() {
    if (!state) return;
    const pPrueba = (state.parametros && state.parametros.prueba) || "Prueba";
    const totalAlertas = state.matriculas.filter(m => m.estado === 'activa' && m.tipoAlerta && !m.nombre.toLowerCase().includes(pPrueba.toLowerCase())).length;
    const badgeAlertas = document.getElementById("badge-nav-alertas");
    if (badgeAlertas) badgeAlertas.textContent = totalAlertas;

    const inc = AttendanceEngine.detectInconsistencias(state);
    const badgeInc = document.getElementById("badge-nav-inconsistencias");
    if (badgeInc) badgeInc.textContent = inc.auditorias.length;

    updateSidebarSyncStatus();
  }

  // Initialize Data
  function init() {
    if (typeof window.INITIAL_DATA !== 'undefined' && window.INITIAL_DATA) {
      state = AttendanceEngine.recalculateAll(window.INITIAL_DATA);
      updateSidebarBadges();
      switchTab("inicio");
    } else {
      fetch("data/data.json")
        .then(res => res.json())
        .then(jsonData => {
          state = AttendanceEngine.recalculateAll(jsonData);
          updateSidebarBadges();
          switchTab("inicio");
        })
        .catch(err => {
          console.error("Error cargando data.json:", err);
          viewContainer.innerHTML = `
            <div class="alert-box" style="background:#fef2f2;border-color:#fecaca;color:#b91c1c;">
              <strong>Error al cargar los datos:</strong> ${err.message}. Asegúrese de abrir el proyecto mediante un servidor web local o usar los datos incrustados en js/data.js.
            </div>
          `;
        });
    }
  }

  // =========================================================================
  // AUTHENTICATION & ACCESS CONTROL
  // =========================================================================
  const AUTH_STORAGE_KEY = "jd_attendance_auth_v1";
  const PRIMARY_PASSWORD = "MiMejorElemnto";
  const ALLOWED_HASHES = [
    "0040da2758c3ad01814c96e27186a9c2226dd3eab52357e51c4e64316b16fe24", // MiMejorElemnto
    "9c92460ba2bf167d1b3868d8cbd125b6cf8de58d42566c41cd15730f000d0119"  // MiMejorElemento (tolerante a typo)
  ];

  const authOverlay = document.getElementById("auth-overlay");
  const authCard = document.getElementById("auth-card");
  const authForm = document.getElementById("auth-form");
  const authPasswordInput = document.getElementById("auth-password");
  const authErrorMsg = document.getElementById("auth-error-msg");
  const authTogglePwd = document.getElementById("auth-toggle-pwd");
  const appSidebar = document.getElementById("app-sidebar");
  const appMain = document.getElementById("app-main");
  const btnLogoutSidebar = document.getElementById("btn-logout-sidebar");
  const btnLogoutTop = document.getElementById("btn-logout-top");

  async function sha256Hex(text) {
    if (window.crypto && crypto.subtle) {
      const buffer = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    }
    return null;
  }

  async function checkPassword(inputPwd) {
    if (!inputPwd) return false;
    const trimmed = inputPwd.trim();
    if (trimmed === PRIMARY_PASSWORD || trimmed === "MiMejorElemento") return true;
    try {
      const hex = await sha256Hex(trimmed);
      if (hex && ALLOWED_HASHES.includes(hex)) return true;
    } catch (e) {}
    return false;
  }

  function setAuthenticated(isAuth) {
    if (isAuth) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "authenticated");
      if (authOverlay) authOverlay.classList.add("hidden");
      if (appSidebar) appSidebar.classList.remove("auth-locked");
      if (appMain) appMain.classList.remove("auth-locked");
      if (!state) {
        init();
      }
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      if (authOverlay) authOverlay.classList.remove("hidden");
      if (appSidebar) appSidebar.classList.add("auth-locked");
      if (appMain) appMain.classList.add("auth-locked");
      if (authPasswordInput) {
        authPasswordInput.value = "";
        setTimeout(() => authPasswordInput.focus(), 50);
      }
      if (authErrorMsg) authErrorMsg.style.display = "none";
    }
  }

  // Toggle show/hide password
  if (authTogglePwd && authPasswordInput) {
    authTogglePwd.addEventListener("click", () => {
      const isPwd = authPasswordInput.type === "password";
      authPasswordInput.type = isPwd ? "text" : "password";
      authTogglePwd.innerHTML = isPwd
        ? `<svg class="icon-eye" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>`
        : `<svg class="icon-eye" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
    });
  }

  // Handle Form Submit
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const entered = authPasswordInput ? authPasswordInput.value : "";
      const valid = await checkPassword(entered);

      if (valid) {
        if (authErrorMsg) authErrorMsg.style.display = "none";
        setAuthenticated(true);
      } else {
        if (authErrorMsg) {
          authErrorMsg.innerHTML = `
            <svg style="width:16px;height:16px;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>Contraseña incorrecta. Por favor verifique e intente nuevamente.</span>
          `;
          authErrorMsg.style.display = "flex";
        }
        if (authCard) {
          authCard.classList.remove("shake");
          void authCard.offsetWidth; // trigger reflow
          authCard.classList.add("shake");
        }
        if (authPasswordInput) {
          authPasswordInput.select();
        }
      }
    });
  }

  // Logout Handlers
  if (btnLogoutSidebar) {
    btnLogoutSidebar.addEventListener("click", () => {
      if (confirm("¿Desea cerrar la sesión de acceso seguro?")) {
        setAuthenticated(false);
      }
    });
  }
  if (btnLogoutTop) {
    btnLogoutTop.addEventListener("click", () => {
      if (confirm("¿Desea cerrar la sesión de acceso seguro?")) {
        setAuthenticated(false);
      }
    });
  }

  // Startup: verify if session is already active
  const isPreviouslyAuth = sessionStorage.getItem(AUTH_STORAGE_KEY) === "authenticated";
  if (isPreviouslyAuth) {
    setAuthenticated(true);
  } else {
    setAuthenticated(false);
  }
});
