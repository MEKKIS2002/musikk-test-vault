// === changelog.js ===
// Music Vault changelog — add new entries at the TOP of VERSIONS array

(function () {
  'use strict';

  const VERSIONS = [
    {
      version: 'v2.1',
      date: '14. mai 2026',
      label: 'PNG-kassetter, arkiv-fix og view modes',
      color: '#f4a443',
      changes: [
        'Kassettdesign byttet fra CSS til realistiske PNG-bilder — 4 varianter (velges deterministisk per mixtape)',
        '"Ny mixtape"-kortet bruker kassett-PNG med + NY MIXTAPE-tekst på labelen',
        'Mixtape-detaljsiden viser kassetbildet i headeren i stedet for liten preview',
        'Tekst-overlay på kassett-label: navn og beat-antall med tynt font på papirfeltet',
        'Arkivert-tabben fungerer nå korrekt — var usynlig pga. manglende tab-visible opacity',
        'Tab-bytte: tab-visible fjernes nå fra gammel tab slik at fade-overgang fungerer på alle tabs',
        'Visningsmodus (list/kort/studio) fungerer endelig — rotårsakene var 4 konkurrerende setTrackViewMode-definisjoner og hardkodet album-beat-grid i renderAlbumBeats',
        'track-cards.js fullstendig omskrevet (774 → 387 linjer) — én IIFE, én click-lytter, ingen konflikter',
        'Spotify-stil listevisning: 44px kompakte rader med thumbnail, tittel, varighet',
        'beatsFromIds() filtrerer nå arkiverte beats — beat-telling er korrekt overalt',
        'toggleAlbumBeat bruker kontekst-bevisst oppslag — samme sang i mixtape og album åpner riktig kort',
        'Vedlikeholdsnotater oppdatert i alle JS-filer og index.html',
      ],
    },

    {
      version: 'v2.1',
      date: '14. mai 2026',
      label: 'PNG-kassetter, notater og feilfikser',
      color: '#f4a443',
      changes: [
        'Kassettdesign byttet fra CSS-tegnet kassett til realistiske PNG-bilder (4 varianter)',
        'Kassettvariant velges deterministisk per mixtape-ID — samme kassett alltid for samme mixtape',
        'Tekst (navn + beat-antall) overlayert på hvit papir-label på kassetten',
        '"Ny mixtape"-kortet bruker kassett-PNG med + NY MIXTAPE på labelen',
        'Mixtape detail-header viser stor kassett-PNG istedenfor mini CSS-kassett',
        'Arkivert-tabben var blank — fikset tab-handler til å kalle renderArchiveView() direkte',
        'Arkiverte beats teller ikke lenger i mixtape/album-oversikter',
        'Samme sang i mixtape og album fungerer nå (kontekst-bevisst card lookup)',
        'Hero-vinyl clippes via clip-path — påvirker ingenting annet på siden',
        'Tab-fade-overgang fungerer nå for alle tabs',
        'Alle JS/CSS-filer oppdatert med vedlikeholdsnotater og arkitektur-dokumentasjon',
      ],
    },
    {
      version: 'v2.0',
      date: '13. mai 2026',
      label: 'Tab-rekkefølge, visningsmoduser og viewer-forbedringer',
      color: '#f4a443',
      changes: [
        'Tab-rekkefølge endret til: Beats → Mixtapes → Albumer → Pipeline → Integrasjoner',
        'Mixtapes er nå standard startside',
        'Visningsmodus (viewer): gir nå tilgang til både Beats og Mixtapes — kun lytting',
        'Innloggingsikon (🔐 Admin) vises øverst til høyre i visningsmodus for rask admin-innlogging',
        '"ADMIN"-boblen skjules i visningsmodus',
        'Alle tre visningsmoduser synlige i toggle: ☰ Rader · ▦ Kort · ▤ Studio',
        'Tab-flimring fikset med dirty-flagg system — kun aktiv tab re-rendres',
        'Myk fade-overgang (150ms) ved tab-bytte',
      ],
    },

    {
      version: 'v1.9',
      date: '13. mai 2026',
      label: 'Lydkomprimering',
      color: '#34d399',
      changes: [
        'WAV, FLAC og andre ukomprimerte lydfiler komprimeres automatisk til WebM/Opus (128kbps) før opplasting til R2',
        'Typisk besparelse: WAV ~50MB → ~5MB (−90%), FLAC ~25MB → ~5MB (−80%)',
        'MP3-filer og filer under 8MB hoppes over — allerede komprimert',
        'Toast-meldinger viser fremgang og resultat under konvertering',
      ],
    },
    {
      version: 'v1.8',
      date: '13. mai 2026',
      label: 'Beats-tab + listvisning',
      color: '#a855f7',
      changes: [
        'Ny "Beats"-tab som første tab — total oversikt over alle sanger med søk og sortering',
        'Beats-tabellen viser: navn, samlinger (mixtape/album), hvem som lastet opp, dato og varighet',
        'Klikk ⋯ på en beat for nedtrekksmeny med: Spill, Favoritt, Arkiver, Slett permanent',
        'Standardvisning i mixtapes og albumer endret til radvisning (Spotify-stil)',
        'Toggle mellom ▦ Kortvisning og ☰ Listevisning',
        'Albumer er nå første tab man ser ved innlasting',
        'Integrasjonssiden oppdatert og ryddet — Google Drive-seksjoner fjernet',
      ],
    },
    {
      version: 'v1.7',
      date: '13. mai 2026',
      label: 'Sletting + opplasternavn',
      color: '#fb7185',
      changes: [
        '"Slett sang"-knapp lagt til i alle visninger — kun synlig for admin',
        'Sletting fjerner sangen fra R2, Supabase og lokal state i én operasjon',
        'Brukernavnet til den som laster opp en sang vises på beat-kortet med 👤-ikon',
        'Brukernavnet lagres automatisk fra innloggingssession',
      ],
    },
    {
      version: 'v1.6',
      date: '13. mai 2026',
      label: 'Nytt innloggingssystem',
      color: '#f97316',
      changes: [
        'Passordlåsskjermen erstattet med brukernavn/passord-innlogging via Supabase',
        'To moduser på innloggingsskjermen: Admin og Visningsmodus',
        'Visningsmodus: kun mixtapes synlig, ingen tekster, ingen opplasting eller redigering',
        'Admin-tilgang kobler til Supabase-profil med role = "admin"',
        'Brukernavn mappes til Supabase-epost i koden — passordet er aldri synlig i repo',
        'Kun admin kan laste opp lydfiler',
        'Støtte for flere admin-brukere (f.eks. marcus og erik)',
      ],
    },
    {
      version: 'v1.5',
      date: '13. mai 2026',
      label: 'Cloudflare R2 + Supabase-synk',
      color: '#22d3ee',
      changes: [
        'Cloudflare R2 integrert for lagring av lydfiler (10GB gratis, ingen egress-kostnad)',
        'Lydfiler organiseres i active/ og archived/ mapper i R2',
        'Arkivering av sang flytter lydfilen mellom mapper i R2 automatisk',
        'Supabase-database synker metadata (beats, albumer, mixtapes) på tvers av enheter',
        'saveState() pusher automatisk til Supabase ved alle endringer',
        'R2-lagringswidget i Integrasjoner viser brukt plass med progress-bar',
        'Cloudflare Worker fungerer som sikker proxy mellom appen og R2',
      ],
    },
    {
      version: 'v1.4',
      date: '13. mai 2026',
      label: 'Prosjektstruktur splitt',
      color: '#818cf8',
      changes: [
        'Én stor HTML-fil (2MB) splittet til organisert prosjektstruktur',
        'css/: main.css, ui.css, track-cards.css, archive.css, mixtape.css',
        'js/: lock.js, db.js, app.js, track-cards.js, archive.js, mixtape.js, supabase.js',
        'assets/: favicon.png, crate-back.png, crate-front.png, crate-empty.png, vinyl-label.png',
        'Base64-bilder (~1.5MB) ekstrahert til egne PNG-filer',
        'Cache-busting versjonsnummer på alle CSS- og JS-lenker',
        'README.md med dokumentasjon og oppsettguide lagt til',
      ],
    },
    {
      version: 'v1.3',
      date: '13. mai 2026',
      label: 'Stor kode-opprydding (runde 2)',
      color: '#f4a443',
      changes: [
        '3 konkurrerende mixtape-søk-scripts (hotfix, single, visibility) slettet — erstattet av performance-versjon',
        'Duplikat @keyframes vinylSpin fjernet',
        'Ubrukte window-exports (advancedTrackFilter, advancedTrackSearch, advancedOpenCurrentTrack) renset',
        '10 CSS-blokker fusjonert til færre og mer logiske filer',
        '25 funksjoner i dead-code-blokk slettet (final-archive-experience-js)',
        'Totalt: 70 navngitte blokker redusert til 39 — over halvparten borte',
      ],
    },
    {
      version: 'v1.2',
      date: '13. mai 2026',
      label: 'Scroll-fiksing',
      color: '#67e8f9',
      changes: [
        'Tab-bytte forårsaket ikke lenger scroll-hopp opp/ned på siden',
        'Scroll-posisjon bevares nå på tvers av alle tabs',
        'Gammel "scheduleRestore"-løsning (5 overlappende setTimeout-kall) erstattet med double-rAF',
        'history.scrollRestoration satt til "manual" for å hindre browser-innblanding',
        'Arkiv-tab hadde konkurrerende scrollTo-kall — alle fjernet',
      ],
    },
    {
      version: 'v1.1',
      date: '13. mai 2026',
      label: 'Kode-opprydding (runde 1)',
      color: '#a3e635',
      changes: [
        'Duplikat .album-card:hover .vinyl-disc CSS-regel fjernet',
        'marcus-hero-vinyl-cleanup-patch fusjonert inn i imperfections-patch',
        '2 store alignment-patcher (~310 linjer) erstattet av én patch',
        'Tre mixtape-søk-CSS-blokker fusjonert til én',
        'scheduleRestore redusert fra 5 til 3 restoreY-kall',
        'try/catch lagt til saveState og setTrackViewMode (guard mot private browsing)',
        'MutationObserver i tab-order-script disconnecter nå etter suksess',
      ],
    },
    {
      version: 'v1.0',
      date: '13. mai 2026',
      label: 'Første versjon (denne chatten)',
      color: '#94a3b8',
      changes: [
        'Music Vault lansert som én portabel HTML-fil',
        'Mixtapes med kassett-grensesnitt, albumer med vinyl-animasjoner, pipeline og arkiv',
        'Supabase admin-innlogging og synk-funksjonalitet',
        'Arkiv-tab med trekasse-animasjoner og samlinger',
        'Bottom player med kø, seek og volum',
        'Lyrics-editor med fargemarkering',
        'Rating og ferdigstillelsesprosent per beat',
      ],
    },
    {
      version: 'v0.9',
      date: 'mai 2026',
      label: 'Lydfiler, sikkerhetsfeatures og polering',
      color: '#64748b',
      changes: [
        'IndexedDB for varig lagring av lydfiler mellom sesjoner — filer forsvinner ikke lenger ved reload',
        'Lydavspilling direkte i mixtapes og albumer inne i beat-kortene',
        'Sletting med bekreftelse — må skrive "slett" + confirm for album og mixtape',
        'SHA-256-hashet passordlås — klartekstpassord aldri synlig i koden',
        'Drag-and-drop: slipp lydfiler direkte inn i album eller mixtape',
        'Bottom player med kø, seek, volum og "nå spilles"-indikator',
        'Pipeline redesignet til album-oversikt med individuell og gjennomsnittlig progress per album',
      ],
    },
    {
      version: 'v0.8',
      date: 'mai 2026',
      label: 'Rich editor, vinyl og kasett-design',
      color: '#475569',
      changes: [
        'Albumer redesignet som vinyl — spinner konstant, coverbilde plassert som label i midten',
        'Mixtapes redesignet som kassetter — detaljert kassett-art med label, roterende hjul og tapespor',
        'Hover på album skalerer vinyl 10% opp med glow-effekt',
        'Rich text editor i beat-kortene med 6-fargers highlighting (gul, grønn, blå, rosa, rød, lilla)',
        'Tekstboks ekspanderer nedover som dropdown når man klikker på et beat',
        'Lukke/åpne styres kun av coverbildet — stjerner og slider trigger ikke toggle',
        'Beat-kort i album viser coverbilde, 1-10 stjernerangering, ferdigstillelse % og tekstfelt',
      ],
    },
    {
      version: 'v0.7',
      date: 'mai 2026',
      label: 'Første versjon (forrige chat)',
      color: '#334155',
      changes: [
        'Beats-fane med Google Drive API-integrasjon, stjernemerking og tekstboks per beat',
        'Demoer-fane med SoundCloud oEmbed, pipeline-status (Idé→Klar), 1-10 rangering og ferdigstillelsesprosent',
        'Release Score (0-100) basert på pipeline, rating, ferdigstillelse, moodboard og versjonslogg',
        'Albumer med enkel mappestruktur og kvadratisk forsidebilde',
        'Lydavspilling via Google Drive-delelenker og direkte URL-er',
        'Moodboards, Prompts og A/B-rating (senere fjernet)',
        'Demo-modal med fem tabs: Oversikt, Moodboard, Versjonslogg, A/B og Notater',
        'Dagsbasert skrivepromt med historikk',
        'Sortering etter Release Score, rangering, ferdigstillelse og dato',
      ],
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  function renderChangelog() {
    const el = document.getElementById('changelogPanel');
    if (!el) return;

    const latest = VERSIONS[0];

    el.innerHTML = `
      <div class="cl-header">
        <div>
          <h2 style="margin:0 0 4px">📋 Changelog</h2>
          <p class="hint" style="margin:0">Siste: <strong style="color:${latest.color}">${latest.version} — ${latest.label}</strong> · ${latest.date}</p>
        </div>
        <button class="ghost-btn cl-toggle" onclick="changelogToggle()" id="clToggleBtn">
          Vis alle versjoner ▾
        </button>
      </div>
      <div id="clBody" style="display:none;margin-top:16px">
        ${VERSIONS.map((v, i) => `
          <div class="cl-version ${i === 0 ? 'cl-latest' : ''}">
            <div class="cl-version-header">
              <span class="cl-badge" style="background:${v.color}22;color:${v.color};border-color:${v.color}44">${v.version}</span>
              <strong class="cl-label">${v.label}</strong>
              <span class="cl-date">${v.date}</span>
            </div>
            <ul class="cl-list">
              ${v.changes.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `;
  }

  window.changelogToggle = function () {
    const body = document.getElementById('clBody');
    const btn = document.getElementById('clToggleBtn');
    if (!body || !btn) return;
    const open = body.style.display === 'none';
    body.style.display = open ? 'block' : 'none';
    btn.textContent = open ? 'Skjul ▴' : 'Vis alle versjoner ▾';
  };

  // ── Install ───────────────────────────────────────────────────────────────
  function install() {
    // Inject into integrations tab content-panel
    const panel = document.querySelector('#integrationsTab .content-panel');
    if (!panel || document.getElementById('changelogPanel')) return;

    const card = document.createElement('div');
    card.className = 'settings-card';
    card.id = 'changelogPanel';
    panel.appendChild(card);
    renderChangelog();

    // Inject styles
    if (document.getElementById('cl-style')) return;
    const style = document.createElement('style');
    style.id = 'cl-style';
    style.textContent = `
      .cl-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; }
      .cl-toggle { font-size:12px !important; padding:6px 12px !important; white-space:nowrap; }

      .cl-version { padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
      .cl-version:last-child { border-bottom: none; padding-bottom: 0; }
      .cl-latest { padding-top: 0; }

      .cl-version-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
      .cl-badge {
        font-size: 11px; font-weight: 900; letter-spacing: .06em;
        padding: 3px 10px; border-radius: 999px; border: 1px solid;
        flex-shrink: 0;
      }
      .cl-label { font-size: 14px; font-weight: 800; }
      .cl-date { font-size: 11px; color: var(--muted); margin-left: auto; white-space: nowrap; }

      .cl-list {
        margin: 0; padding-left: 18px;
        display: flex; flex-direction: column; gap: 4px;
      }
      .cl-list li {
        font-size: 12px; color: var(--muted); line-height: 1.55;
        list-style: disc;
      }
    `;
    document.head.appendChild(style);
  }

  // Install when integrations tab is opened
  document.addEventListener('click', e => {
    if (e.target.closest('.tab-btn[data-tab="integrations"]')) {
      setTimeout(install, 80);
    }
  });

  // Also try on load
  if (document.readyState !== 'loading') setTimeout(install, 800);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(install, 800));
})();
