/*
  Supabase admin-login for Music Vault
  1) Bytt ut SUPABASE_URL og SUPABASE_ANON_KEY med verdiene fra Supabase.
  2) Brukeren må finnes i Authentication -> Users.
  3) Brukeren må ha role = 'admin' i public.profiles.
*/
const SUPABASE_URL = "https://ylvqkfdvijqnecuqznyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdnFrZmR2aWpxbmVjdXF6bnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzA4MzIsImV4cCI6MjA5MzkwNjgzMn0.bYPTaxQK8n7I7w5Ri2DVYW5_LbFHg2IXkuhHsLTDDqc";

const isSupabaseConfigured =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("DIN_SUPABASE") &&
  !SUPABASE_ANON_KEY.includes("DIN_SUPABASE");

const supabaseClient = isSupabaseConfigured && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

window.supabaseClient = supabaseClient;
window.currentAdminUser = null;
window.isAdminMode = false;

function showAdminMessage(message, type = "info") {
  const el = document.getElementById("adminLoginMessage");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
}

function withTimeout(promise, ms = 15000, message = "Supabase bruker for lang tid på å svare.") {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

async function checkAdminRole(userId) {
  if (!supabaseClient || !userId) return false;

  const { data, error } = await withTimeout(
    supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle(),
    15000,
    "Klarte ikke å sjekke admin-rollen. Sjekk RLS-policy på profiles."
  );

  if (error) {
    console.error("Kunne ikke sjekke admin-rolle:", error);
    showAdminMessage(`Kunne ikke sjekke admin-rolle: ${error.message}`, "error");
    return false;
  }

  return data?.role === "admin";
}

async function updateAdminUi() {
  const statusEl = document.getElementById("adminLoginStatus");
  const loginBox = document.getElementById("adminLoginBox");
  const logoutBox = document.getElementById("adminLogoutBox");
  const emailEl = document.getElementById("adminLoggedInEmail");

  try {
    if (!supabaseClient) {
      if (statusEl) statusEl.textContent = "Supabase er ikke konfigurert ennå.";
      if (loginBox) loginBox.style.display = "grid";
      if (logoutBox) logoutBox.style.display = "none";
      showAdminMessage("Fyll inn SUPABASE_URL og SUPABASE_ANON_KEY i HTML-filen først.", "warning");
      return;
    }

    if (statusEl) statusEl.textContent = "Sjekker...";

    const { data, error } = await withTimeout(
      supabaseClient.auth.getSession(),
      15000,
      "Klarte ikke å hente Supabase-session. Sjekk URL/key og nettverk."
    );

    if (error) throw error;

    const user = data?.session?.user || null;
    window.currentAdminUser = user;
    window.isAdminMode = user ? await checkAdminRole(user.id) : false;

    if (window.isAdminMode) {
      if (statusEl) statusEl.textContent = "Admin-modus aktiv";
      if (emailEl) emailEl.textContent = user.email || "Innlogget admin";
      if (loginBox) loginBox.style.display = "none";
      if (logoutBox) logoutBox.style.display = "grid";
      showAdminMessage("Du er logget inn som admin.", "success");
      document.body.classList.add("admin-mode");
    } else if (user) {
      if (statusEl) statusEl.textContent = "Innlogget, men ikke admin";
      if (emailEl) emailEl.textContent = user.email || "Innlogget bruker";
      if (loginBox) loginBox.style.display = "none";
      if (logoutBox) logoutBox.style.display = "grid";
      showAdminMessage("Denne brukeren finnes, men har ikke role = 'admin' i profiles-tabellen.", "warning");
      document.body.classList.remove("admin-mode");
    } else {
      if (statusEl) statusEl.textContent = "Ikke innlogget";
      if (loginBox) loginBox.style.display = "grid";
      if (logoutBox) logoutBox.style.display = "none";
      showAdminMessage("Logg inn for å legge til, endre, arkivere eller slette innhold.", "info");
      document.body.classList.remove("admin-mode");
    }
  } catch (err) {
    console.error("Admin UI-feil:", err);
    if (statusEl) statusEl.textContent = "Feil ved sjekk";
    if (loginBox) loginBox.style.display = "grid";
    if (logoutBox) logoutBox.style.display = "none";
    showAdminMessage(err.message || "Noe gikk galt ved Supabase-sjekk.", "error");
  }
}

async function loginAdmin(email, password) {
  if (!supabaseClient) {
    showAdminMessage("Supabase er ikke konfigurert. Fyll inn URL og anon public key i HTML-filen.", "warning");
    return null;
  }

  const loginBtn = document.getElementById("adminLoginBtn");
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = "Logger inn...";
  }

  try {
    const { data, error } = await withTimeout(
      supabaseClient.auth.signInWithPassword({ email, password }),
      15000,
      "Innloggingen tok for lang tid. Sjekk Supabase URL, anon key og at Authentication er aktivert."
    );

    if (error) {
      console.error("Admin-login feilet:", error);
      showAdminMessage(`Login-feil: ${error.message}`, "error");
      return null;
    }

    await updateAdminUi();

    if (!window.isAdminMode) {
      showAdminMessage("Du er logget inn, men brukeren er ikke satt som admin i Supabase.", "warning");
    }

    return data.user;
  } catch (err) {
    console.error("Admin-login stoppet:", err);
    showAdminMessage(err.message || "Login stoppet. Åpne Console for mer info.", "error");
    return null;
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Logg inn som admin";
    }
  }
}

async function logoutAdmin() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  window.currentAdminUser = null;
  window.isAdminMode = false;
  await updateAdminUi();
}

function installAdminLoginPanel() {
  if (document.getElementById("supabaseAdminPanel")) return;

  const integrationsPanel = document.querySelector("#integrationsTab .content-panel") || document.querySelector("#integrationsTab") || document.body;

  integrationsPanel.insertAdjacentHTML("afterbegin", `
    <div id="supabaseAdminPanel" class="settings-card supabase-admin-card">
      <h2>🔐 Admin-login</h2>
      <p class="hint">Bruk Supabase Auth for å låse redigering, arkivering og sletting til admin-brukeren din.</p>

      <div class="admin-status-row">
        <strong>Status:</strong>
        <span id="adminLoginStatus">Sjekker...</span>
      </div>

      <div id="adminLoginBox" class="admin-login-box">
        <div class="input-group">
          <label>E-post</label>
          <input id="adminEmailInput" type="email" autocomplete="username" placeholder="din-epost@example.com" />
        </div>
        <div class="input-group">
          <label>Passord</label>
          <input id="adminPasswordInput" type="password" autocomplete="current-password" placeholder="Passord" />
        </div>
        <button class="primary-btn" id="adminLoginBtn">Logg inn som admin</button>
      </div>

      <div id="adminLogoutBox" class="admin-login-box" style="display:none">
        <p class="hint">Innlogget som <strong id="adminLoggedInEmail"></strong></p>
        <button class="ghost-btn" id="adminLogoutBtn">Logg ut</button>
      </div>

      <p id="adminLoginMessage" class="hint admin-login-message"></p>
    </div>
  `);

  const style = document.createElement("style");
  style.textContent = `
    .supabase-admin-card{margin-bottom:14px;border:1px solid rgba(52,211,153,.18)!important;background:rgba(52,211,153,.055)!important}
    .admin-status-row{display:flex;gap:8px;align-items:center;margin:10px 0 14px;font-size:13px;color:var(--muted)}
    .admin-status-row strong{color:var(--text)}
    .admin-login-box{display:grid;gap:10px;margin-top:10px}
    .admin-login-message{margin-top:10px;min-height:18px}
    .admin-login-message[data-type="success"]{color:#34d399}
    .admin-login-message[data-type="warning"]{color:#fbbf24}
    .admin-login-message[data-type="error"]{color:#fb7185}
    #adminLoginBtn:disabled{opacity:.65;cursor:not-allowed}
  `;
  document.head.appendChild(style);

  document.getElementById("adminLoginBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("adminEmailInput")?.value.trim();
    const password = document.getElementById("adminPasswordInput")?.value;

    if (!email || !password) {
      showAdminMessage("Skriv inn e-post og passord.", "warning");
      return;
    }

    showAdminMessage("Logger inn...", "info");
    await loginAdmin(email, password);
  });

  document.getElementById("adminLogoutBtn")?.addEventListener("click", logoutAdmin);
}

window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.updateAdminUi = updateAdminUi;

installAdminLoginPanel();

if (supabaseClient) {
  // Viktig: ikke kall Supabase-metoder direkte inne i onAuthStateChange-callbacken.
  // setTimeout hindrer at auth-callbacken låser seg.
  supabaseClient.auth.onAuthStateChange(() => {
    setTimeout(updateAdminUi, 0);
  });
}

setTimeout(updateAdminUi, 50);
