// === audio-compress.js ===
// DEAKTIVERT — shouldCompress() returnerer alltid false.
//
// Lydkomprimering via MediaRecorder fungerer ikke i praksis:
// MediaRecorder er sanntids-opptak, ikke raskere-enn-sanntid konvertering.
// En 3-minutters WAV tar 3 minutter å "komprimere" — uakseptabelt for opplasting.
//
// For ekte komprimering trenger vi WebAssembly (f.eks. ffmpeg.wasm).
// Filer lastes nå direkte opp til R2 uansett format og størrelse.
// Modulen er beholdt slik at fremtidig komprimering kan legges til.

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const TARGET_BITRATE = 128000; // 128 kbps
  const SKIP_TYPES = ['audio/mpeg', 'audio/mp3']; // already compressed, skip
  const SIZE_THRESHOLD_MB = 8; // only compress files larger than this
  // ───────────────────────────────────────────────────────────────────────

  // Check what MediaRecorder supports
  function getBestMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || null;
  }

  function fileSizeMB(file) {
    return file.size / (1024 * 1024);
  }

  function shouldCompress(file) {
    // MediaRecorder compresses in real-time — a 3-min WAV takes 3 minutes.
    // Disabled until a faster compression method is available (e.g. WebAssembly ffmpeg).
    return false;
  }

  // ── Core compression ────────────────────────────────────────────────────
  async function compress(file, onProgress) {
    if (!shouldCompress(file)) return file;

    const mimeType = getBestMimeType();
    const ext = mimeType.includes('ogg') ? '.ogg' : '.webm';
    const originalMB = fileSizeMB(file).toFixed(1);

    if (onProgress) onProgress(0, `Konverterer ${originalMB}MB ${file.type.split('/')[1].toUpperCase()}...`);

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    // Decode the audio
    const arrayBuffer = await file.arrayBuffer();
    let audioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn('[Compress] Could not decode audio, uploading original:', e);
      ctx.close();
      return file;
    }

    if (onProgress) onProgress(20, 'Koder til komprimert format...');

    // Create offline context to render audio
    const offlineCtx = new OfflineAudioContext(
      Math.min(audioBuffer.numberOfChannels, 2), // max stereo
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    ctx.close();

    if (onProgress) onProgress(50, 'Pakker fil...');

    // Convert rendered buffer to MediaRecorder stream
    const streamCtx = new AudioCtx();
    const dest = streamCtx.createMediaStreamDestination();
    const bufferSource = streamCtx.createBufferSource();
    bufferSource.buffer = renderedBuffer;
    bufferSource.connect(dest);

    const chunks = [];
    const recorder = new MediaRecorder(dest.stream, {
      mimeType,
      audioBitsPerSecond: TARGET_BITRATE,
    });

    await new Promise((resolve, reject) => {
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = resolve;
      recorder.onerror = reject;
      recorder.start(100); // collect every 100ms
      bufferSource.start(0);
      bufferSource.onended = () => {
        setTimeout(() => recorder.stop(), 200);
      };
    });

    streamCtx.close();

    const compressed = new Blob(chunks, { type: mimeType });
    const compressedMB = (compressed.size / (1024 * 1024)).toFixed(1);
    const ratio = Math.round((1 - compressed.size / file.size) * 100);

    if (onProgress) onProgress(90, `${originalMB}MB → ${compressedMB}MB (−${ratio}%)`);

    // Return as File object with new name
    const newName = file.name.replace(/\.[^/.]+$/, '') + ext;
    const compressedFile = new File([compressed], newName, { type: mimeType });

    console.log(`[Compress] ${file.name}: ${originalMB}MB → ${compressedMB}MB (${ratio}% smaller)`);
    return compressedFile;
  }

  // ── UI toast with progress ──────────────────────────────────────────────
  async function compressWithToast(file) {
    if (!shouldCompress(file)) return file;

    const sizeMB = fileSizeMB(file).toFixed(1);
    if (typeof showToast === 'function') {
      showToast(`🗜 Komprimerer ${sizeMB}MB fil...`);
    }

    try {
      const result = await compress(file, (pct, msg) => {
        if (pct === 90 && typeof showToast === 'function') {
          showToast(`✓ ${msg}`);
        }
      });
      return result;
    } catch (e) {
      console.warn('[Compress] Failed, using original:', e);
      return file;
    }
  }

  // ── Expose ────────────────────────────────────────────────────────────
  window.audioCompress = {
    compress: compressWithToast,
    shouldCompress,
    getBestMimeType,
    TARGET_BITRATE,
  };

  console.log('[AudioCompress] Ready. Supported output:', getBestMimeType() || 'none (will skip compression)');
})();
