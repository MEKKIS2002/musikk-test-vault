// === r2-storage.js ===
// Cloudflare R2 audio storage via Cloudflare Worker proxy
// Worker handles signing and CORS — browser never touches R2 credentials directly
//
// Setup:
//  1. Create R2 bucket "music-vault-audio" in Cloudflare
//  2. Deploy the Worker (see README for worker code)
//  3. Set R2_WORKER_URL below to your deployed worker URL

(function () {
  'use strict';

  // ── CONFIG — fill these in ──────────────────────────────────────────
  const R2_WORKER_URL = window.R2_WORKER_URL || '';
  // ────────────────────────────────────────────────────────────────────

  const ready = () => !!R2_WORKER_URL && !R2_WORKER_URL.includes('DIN_WORKER');

  // r2Key(beat, archived) → "active/beat-id.mp3" or "archived/beat-id.mp3"
  function r2Key(beatId, archived) {
    const folder = archived ? 'archived' : 'active';
    return `${folder}/${beatId}`;
  }

  // ── UPLOAD ──────────────────────────────────────────────────────────
  // Returns the public URL of the uploaded file, or throws on error.
  async function upload(beatId, file, archived = false, onProgress = null) {
    if (!ready()) throw new Error('R2 Worker URL ikke konfigurert');
    const key = r2Key(beatId, archived);
    const url = `${R2_WORKER_URL}/upload/${encodeURIComponent(key)}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
      if (onProgress) {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
        });
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.url || `${R2_WORKER_URL}/file/${encodeURIComponent(key)}`);
          } catch {
            resolve(`${R2_WORKER_URL}/file/${encodeURIComponent(key)}`);
          }
        } else {
          reject(new Error(`R2 opplasting feilet: HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('R2 opplasting: nettverksfeil'));
      xhr.send(file);
    });
  }

  // ── DELETE ──────────────────────────────────────────────────────────
  async function remove(beatId, archived = false) {
    if (!ready()) return;
    const key = r2Key(beatId, archived);
    const res = await fetch(`${R2_WORKER_URL}/delete/${encodeURIComponent(key)}`, { method: 'DELETE' });
    if (!res.ok) console.warn('R2 sletting feilet:', res.status);
  }

  // ── MOVE (archive / restore) ─────────────────────────────────────────
  // Copies from src key to dst key via Worker, then deletes src.
  async function move(beatId, toArchived) {
    if (!ready()) return null;
    const from = r2Key(beatId, !toArchived);
    const to   = r2Key(beatId,  toArchived);
    const res = await fetch(`${R2_WORKER_URL}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to })
    });
    if (!res.ok) { console.warn('R2 move feilet:', res.status); return null; }
    const { url } = await res.json();
    return url || `${R2_WORKER_URL}/file/${encodeURIComponent(to)}`;
  }

  // ── PUBLIC URL ───────────────────────────────────────────────────────
  function getUrl(beatId, archived = false) {
    if (!ready()) return null;
    return `${R2_WORKER_URL}/file/${encodeURIComponent(r2Key(beatId, archived))}`;
  }

  // ── EXPOSE ───────────────────────────────────────────────────────────
  window.r2Storage = { upload, remove, move, getUrl, ready };

  // ── HOOK INTO EXISTING AUDIO UPLOAD ──────────────────────────────────
  // Wraps the existing createBeatFromFile to also upload to R2
  const _origCreate = window.createBeatFromFile;
  if (typeof _origCreate === 'function') {
    window.createBeatFromFile = async function (file, albumId) {
      await _origCreate(file, albumId);
      // Find the beat that was just created (newest)
      const beat = [...(state.beats || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      if (beat && ready()) {
        try {
          showToast('⬆ Laster opp til R2...');
          const url = await upload(beat.id, file, !!beat.archived, pct => {
            if (pct % 25 === 0) showToast(`⬆ ${pct}%`);
          });
          beat.audio_url = url;
          beat.r2_key = r2Key(beat.id, !!beat.archived);
          saveState();
          if (window.supabaseClient && window.isAdminMode && typeof pushToSupabase === 'function') {
            pushToSupabase();
          }
          showToast('✓ Lastet opp til R2');
        } catch (e) {
          console.error('R2 opplasting feilet:', e);
          showToast('⚠ R2 opplasting feilet — lydfil lagret lokalt');
        }
      }
    };
  }

  // ── HOOK INTO ARCHIVE/RESTORE ─────────────────────────────────────────
  // Moves file in R2 when a beat is archived or restored
  const _origToggle = window.toggleArchiveItem;
  if (typeof _origToggle === 'function') {
    window.toggleArchiveItem = async function (id, type) {
      _origToggle(id, type);
      if (type !== 'beat' && type !== undefined) return;
      const beat = (state.beats || []).find(b => b.id === id);
      if (!beat || !ready()) return;
      try {
        const newUrl = await move(id, !!beat.archived);
        if (newUrl) {
          beat.audio_url = newUrl;
          beat.r2_key = r2Key(id, !!beat.archived);
          saveState();
          if (window.supabaseClient && window.isAdminMode && typeof pushToSupabase === 'function') {
            pushToSupabase();
          }
        }
      } catch (e) {
        console.warn('R2 move feilet:', e);
      }
    };
  }

  console.log('[R2 Storage]', ready() ? 'Klar ✓' : 'Worker URL ikke konfigurert ⚠');
})();
