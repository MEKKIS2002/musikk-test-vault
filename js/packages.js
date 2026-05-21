/* ================================================================
   packages.js — Music Vault pakke-system
   Definerer hvilke tabs og funksjoner hver pakke har tilgang til.

   Pakker lagres som 'package'-kolonne i Supabase profiles-tabellen.
   Leses ved innlogging og lagres i sessionStorage.

   Legg til nye pakker her — resten av appen tilpasser seg automatisk.
================================================================ */

window.MV_PACKAGES = {

  // ── Alle tabs og funksjoner (admin/eier) ─────────────────────
  admin: {
    label: 'Admin',
    tabs: '*',          // alle tabs
    features: '*'       // alle funksjoner
  },

  // ── Artist: mixtapes, album, lyric lab ───────────────────────
  artist: {
    label: 'Artist',
    tabs: ['mixtapes', 'albums', 'lyriclab'],
    features: ['upload', 'lyrics', 'share_mixtape', 'ai_inspire', 'rhymes']
  },

  // ── Produsent: beats, mixtapes, album, pipeline ──────────────
  producer: {
    label: 'Produsent',
    tabs: ['beats', 'mixtapes', 'albums', 'pipeline'],
    features: ['upload', 'share_mixtape', 'pitch', 'r2_upload', 'download']
  },

  // ── Tekstforfatter: beats + lyric lab ────────────────────────
  lyricist: {
    label: 'Tekstforfatter',
    tabs: ['beats', 'lyriclab'],
    features: ['lyrics', 'ai_inspire', 'rhymes']
  },

  // ── Label: oversikt over alt + pipeline ──────────────────────
  label: {
    label: 'Label',
    tabs: ['beats', 'mixtapes', 'albums', 'pipeline'],
    features: ['upload', 'share_mixtape', 'pitch', 'r2_upload', 'download', 'multi_artist']
  },

  // ── Kun lytting (ingen innlogging / viewer) ───────────────────
  viewer: {
    label: 'Lytter',
    tabs: ['mixtapes'],
    features: []
  }
};

// ── Hjelpefunksjoner ─────────────────────────────────────────────────────────

/**
 * Hent gjeldende pakke for innlogget bruker.
 * Returnerer pakke-objektet, eller admin-pakken som fallback.
 */
window.getCurrentPackage = function() {
  const pkg = sessionStorage.getItem('mv_package') || 'admin';
  return window.MV_PACKAGES[pkg] || window.MV_PACKAGES['admin'];
};

/**
 * Sjekk om gjeldende bruker har tilgang til en funksjon.
 * Bruk: if (hasFeature('pitch')) { ... }
 */
window.hasFeature = function(feature) {
  const pkg = window.getCurrentPackage();
  if (pkg.features === '*') return true;
  return Array.isArray(pkg.features) && pkg.features.includes(feature);
};

/**
 * Sjekk om gjeldende bruker har tilgang til en tab.
 * Bruk: if (hasTab('lyriclab')) { ... }
 */
window.hasTab = function(tab) {
  const pkg = window.getCurrentPackage();
  if (pkg.tabs === '*') return true;
  return Array.isArray(pkg.tabs) && pkg.tabs.includes(tab);
};

/**
 * Sett pakke for gjeldende bruker (kalles ved innlogging).
 */
window.setPackage = function(packageKey) {
  const key = packageKey && window.MV_PACKAGES[packageKey] ? packageKey : 'viewer';
  sessionStorage.setItem('mv_package', key);
  applyPackage();
};

/**
 * Anvend pakke-begrensninger på UI:
 * - Skjul tabs som ikke er inkludert
 * - Legg til body-klasse for CSS-targeting
 */
window.applyPackage = function() {
  const pkg = window.getCurrentPackage();
  const pkgKey = sessionStorage.getItem('mv_package') || 'admin';

  // Body-klasse for CSS (fjern gamle)
  Object.keys(window.MV_PACKAGES).forEach(k => document.body.classList.remove('pkg-' + k));
  document.body.classList.add('pkg-' + pkgKey);

  // Vis/skjul tabs
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    const tab = btn.dataset.tab;
    const allowed = hasTab(tab);
    btn.style.display = allowed ? '' : 'none';
  });

  // Vis/skjul funksjoner via data-feature attributter
  document.querySelectorAll('[data-feature]').forEach(el => {
    const feat = el.dataset.feature;
    el.style.display = hasFeature(feat) ? '' : 'none';
  });

  // Oppdater rolle-badge
  const badge = document.getElementById('roleBadge');
  if (badge) {
    const pkgLabel = pkg.label || pkgKey;
    const roleText = sessionStorage.getItem('mv_role') === 'admin' ? 'Admin' : pkgLabel;
    badge.textContent = roleText;
    badge.title = `Pakke: ${pkgLabel}`;
  }

  // Naviger til første tilgjengelige tab hvis aktiv tab ikke er tilgjengelig
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab && !hasTab(activeTab.dataset.tab)) {
    const tabs = pkg.tabs === '*'
      ? null
      : (Array.isArray(pkg.tabs) ? pkg.tabs : []);
    if (tabs && tabs.length > 0) {
      const firstTab = document.querySelector(`.tab-btn[data-tab="${tabs[0]}"]`);
      if (firstTab) firstTab.click();
    }
  }

  console.log(`[MV Packages] Pakke: ${pkgKey} | Tabs: ${JSON.stringify(pkg.tabs)} | Features: ${JSON.stringify(pkg.features)}`);
};

// Kjør applyPackage når DOM er klar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.applyPackage());
} else {
  // Liten forsinkelse så tab-knapper er rendret
  setTimeout(() => window.applyPackage(), 100);
}
