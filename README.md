# Music Vault

Personlig musikk-produksjons-app — ett komplett demo-arkiv og studioassistent.
En portabel webapp som kjører direkte i nettleseren uten server.

## Prosjektstruktur

```
music-vault/
├── index.html          # Hoved-HTML (ren markup, ingen inline kode)
├── css/
│   ├── main.css        # Basisstiler, CSS-variabler, @keyframes, layout
│   ├── ui.css          # UI-komponenter: knapper, header, statuskort, kort
│   ├── track-cards.css # Beat/sangliste-kort og sangside-visning
│   ├── archive.css     # Arkiv-tabben (kasse-animasjoner, fa-* selektorer)
│   └── mixtape.css     # Mixtape-grid og søkefelt
├── js/
│   ├── lock.js         # Passordlås og påloggingsskjerm
│   ├── db.js           # IndexedDB-lyd-lager + hoved-app (state, render*)
│   ├── app.js          # Produsentmodus, rolle-badge, arkiv-installer IIFE
│   ├── track-cards.js  # Beat-kort, listevisning, sangside, pipeline-fix
│   ├── archive.js      # Arkiv-renderer, kasse-animasjoner, samlinger
│   ├── mixtape.js      # Mixtape-søk (performance-versjon)
│   └── supabase.js     # Supabase admin-innlogging + skysynkronisering
└── assets/
    ├── favicon.png     # App-ikon (256×256)
    ├── crate-back.png  # Arkiv: bakside av trekassen
    ├── crate-front.png # Arkiv: frontside av trekassen
    ├── crate-empty.png # Arkiv: tom kasseanvisning
    └── vinyl-label.png # Vinyl-plate-label (stor PNG)
```

## Funksjoner

| Tab | Beskrivelse |
|-----|-------------|
| 📼 **Mixtapes** | Kasett-grensesnitt. Lag kasetter, last opp beats, rating og lyrics. |
| 📁 **Albumer** | Offisielle utgivelser. Vinyl-animasjoner, tre visningsmoduser. |
| 📊 **Pipeline** | Kanban-oversikt over alle aktive albums med ferdigstillelsesprosent. |
| 🗄️ **Arkivert** | Fysisk trekasse-grensesnitt. Arkiverte demoer, mixtapes og album. |
| 🔌 **Integrasjoner** | Supabase-tilkobling, import/eksport, admin-innlogging. |

## Teknisk stack

- **Null avhengigheter** — ren HTML/CSS/JS, ingen build-steg
- **Lagring** — `localStorage` for state, `IndexedDB` for lydfiler
- **Sky** — valgfri Supabase-synk (kun for admin-brukere)
- **CDN** — Supabase JS-klient lastes fra `cdn.jsdelivr.net`

## Kjøre lokalt

Åpne `index.html` direkte i nettleseren, eller bruk en lokal server:

```bash
npx serve .
# eller
python3 -m http.server 8080
```

> ⚠️ IndexedDB og noen Web APIs krever at filen serveres over HTTP (ikke `file://`).

## GitHub Pages

Push til `main`-grenen og aktiver GitHub Pages fra **Settings → Pages → Deploy from branch**.
Appen vil være tilgjengelig på `https://<brukernavn>.github.io/<repo-navn>/`.

---

*Sist ryddet: v10 — 31 blokker slettet/fusjonert, base64-bilder spluttet ut til assets/*
