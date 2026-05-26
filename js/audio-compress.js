// === audio-compress.js ===
// Konverterer WAV/AIFF til MP3 før R2-opplasting
// Bruker lamejs (MP3-encoder i ren JavaScript)
// Lastes inn via CDN — ingen npm/build-steg

(function(){
  'use strict';

  // Last lamejs fra CDN
  const LAME_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js';
  let lameLoaded = false;
  let lameLoading = null;

  function loadLame(){
    if(lameLoaded) return Promise.resolve();
    if(lameLoading) return lameLoading;
    lameLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LAME_CDN;
      s.onload = () => { lameLoaded = true; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return lameLoading;
  }

  // Filtyper som bør komprimeres
  const COMPRESS_TYPES = ['audio/wav','audio/wave','audio/x-wav','audio/aiff','audio/x-aiff','audio/flac','audio/x-flac'];
  const COMPRESS_EXTS  = ['.wav','.wave','.aif','.aiff','.flac'];

  function shouldCompress(file){
    if(!file) return false;
    const type = (file.type||'').toLowerCase();
    const name = (file.name||'').toLowerCase();
    if(COMPRESS_TYPES.some(t => type.includes(t))) return true;
    if(COMPRESS_EXTS.some(e => name.endsWith(e))) return true;
    // Komprimer store filer uansett (>5MB)
    if(file.size > 5 * 1024 * 1024 && type.startsWith('audio')) return true;
    return false;
  }

  async function compress(file, opts = {}){
    const { kbps = 192, onProgress } = opts;

    if(typeof showToast === 'function') showToast('🔄 Konverterer til MP3...');

    try {
      await loadLame();
    } catch(e) {
      console.warn('[AudioCompress] Kunne ikke laste lamejs, laster opp original:', e);
      return file;
    }

    // Les filen som ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Dekod med Web Audio API
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch(e) {
      console.warn('[AudioCompress] Klarte ikke dekode lyd, laster opp original:', e);
      audioCtx.close();
      return file;
    }
    audioCtx.close();

    const sampleRate  = audioBuffer.sampleRate;
    const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
    const leftChannel  = audioBuffer.getChannelData(0);
    const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

    // Konverter Float32 til Int16
    function floatTo16bit(floatArr){
      const int16 = new Int16Array(floatArr.length);
      for(let i = 0; i < floatArr.length; i++){
        const s = Math.max(-1, Math.min(1, floatArr[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return int16;
    }

    const leftInt16  = floatTo16bit(leftChannel);
    const rightInt16 = floatTo16bit(rightChannel);

    // Initialiser lamejs encoder
    // eslint-disable-next-line no-undef
    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
    const mp3Data = [];
    const blockSize = 1152; // lamejs chunk size
    const totalSamples = leftInt16.length;

    for(let i = 0; i < totalSamples; i += blockSize){
      const leftChunk  = leftInt16.subarray(i, i + blockSize);
      const rightChunk = rightInt16.subarray(i, i + blockSize);
      const encoded    = numChannels > 1
        ? mp3encoder.encodeBuffer(leftChunk, rightChunk)
        : mp3encoder.encodeBuffer(leftChunk);
      if(encoded.length > 0) mp3Data.push(encoded);
      if(onProgress && i % (blockSize * 100) === 0){
        onProgress(Math.round(i / totalSamples * 100));
      }
    }

    const flushed = mp3encoder.flush();
    if(flushed.length > 0) mp3Data.push(flushed);

    // Bygg MP3 Blob
    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
    const origMB  = (file.size / 1024 / 1024).toFixed(1);
    const newMB   = (mp3Blob.size / 1024 / 1024).toFixed(1);
    console.log(`[AudioCompress] ${file.name}: ${origMB}MB WAV → ${newMB}MB MP3 (${kbps}kbps)`);

    if(typeof showToast === 'function') showToast(`✓ Konvertert: ${origMB}MB → ${newMB}MB`);

    // Lag ny File med .mp3 extension
    const newName = file.name.replace(/\.(wav|wave|aif|aiff|flac)$/i, '.mp3');
    return new File([mp3Blob], newName, { type: 'audio/mpeg' });
  }

  // Eksponér globalt
  window.audioCompress = { shouldCompress, compress };
  console.log('[AudioCompress] Klar — WAV/AIFF/FLAC konverteres til MP3 ved opplasting');

})();
