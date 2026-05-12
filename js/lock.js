// === unnamed-script-0 ===
blocks are intentional override patches from design iterations.
3. The current archive experience is controlled by:
   - final-archive-experience-css/js
   - final-archive-force-override-v2-css/js
   - marcus-stable-recovery-css/js
   - marcus-final-archive-png-css/js
   - marcus-final-empty-crate-css/js
4. The current song/detail page design is controlled by:
   - marcus-square-cover-patch-css
   - marcus-song-page-redesign-css
   - marcus-marker-color-visibility-patch-css
   - marcus-rating-bottom-cleanup-css
   - marcus-remove-bottom-rating-css
5. Large embedded image assets are intentionally downscaled PNG data URIs so the app remains portable.
6. DEAD CODE NOTE: The render/card/bind/updateDots functions inside final-archive-experience-js are
   superseded by mv-archive-demo-crates-js (which fully replaces window.renderArchiveView). The
   DOMContentLoaded setup and ensureTab() in final-archive-experience-js are still active.

Cleanup performed:
- Removed old, superseded archive modules and one rejected angular button redesign.
- Compressed/downscaled active embedded PNG assets.
- Kept the latest working archive, header, list, and song-page patches.
-->
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Music Vault</title>
<link rel="icon" type="image/png" sizes="256x256" href="assets/favicon.png" />
<style>
:root{
  --bg:#09090f;--border:rgba(255,255,255,.14);--text:#f6f4ff;--muted:#aaa4bd;
  --accent:#a855f7;--accent2:#22d3ee;--gold:#facc15;--danger:#fb7185;
  --shadow:0 24px 80px rgba(0,0,0,.45);--radius:24px;

  --mv-amber:#ff8a1f;--mv-amber-soft:#ffba5e;--mv-cream:#f7f0e8;--mv-tape:#c7b08a;
}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,sans-serif;
  padding-bottom:116px;
  background:radial-gradient(circle at 15% 10%,rgba(168,85,247,.28),transparent 32%),
             radial-gradient(circle at 85% 15%,rgba(34,211,238,.18),transparent 30%),
             radial-gradient(circle at 45% 95%,rgba(250,204,21,.12),transparent 36%),#09090f;
  color:var(--text);min-height:100vh}
button,input,textarea,select{font:inherit}button{cursor:pointer}a{color:inherit;text-decoration:none}
.app{width:min(1440px,calc(100% - 32px));margin:0 auto;padding:32px 0 56px}
.glass{background:linear-gradient(135deg,rgba(255,255,255,.11),rgba(255,255,255,.055));border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);backdrop-filter:blur(18px)}

/* HERO */
.hero{display:grid;grid-template-columns:1.25fr .75fr;gap:24px;align-items:stretch;margin-bottom:24px}
.hero-main{padding:32px;position:relative;overflow:hidden}
.hero-main::after{content:"";position:absolute;inset:auto -80px -140px auto;width:300px;height:300px;background:radial-gradient(circle,rgba(168,85,247,.28),transparent 65%);pointer-events:none}
.eyebrow{color:var(--accent2);text-transform:uppercase;letter-spacing:.16em;font-size:12px;font-weight:800;margin-bottom:12px}
h1{margin:0;font-size:clamp(36px,6vw,72px);line-height:.94;letter-spacing:-.07em}
.hero p{max-width:760px;color:var(--muted);font-size:16px;line-height:1.7;margin:20px 0 0}
.stats-card{padding:24px;display:grid;gap:14px}
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.stat{padding:18px;border-radius:18px;background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.1)}
.stat strong{display:block;font-size:28px;letter-spacing:-.04em}
.stat span{color:var(--muted);font-size:13px}

/* TABS */
.tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.tab-btn,.primary-btn,.ghost-btn,.small-btn{border:1px solid var(--border);background:rgba(255,255,255,.075);color:var(--text);border-radius:999px;padding:11px 16px;transition:.18s ease}
.tab-btn:hover,.ghost-btn:hover,.small-btn:hover{background:rgba(255,255,255,.13);transform:translateY(-1px)}
.tab-btn.active,.primary-btn{background:linear-gradient(135deg,var(--accent),#7c3aed);border-color:rgba(255,255,255,.24);box-shadow:0 14px 34px rgba(124,58,237,.32)}
.primary-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}

/* LAYOUT */
.layout{display:grid;grid-template-columns:360px 1fr;gap:18px;align-items:start}
.sidebar,.content-panel{padding:18px}
.section-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
.section-title h2,.section-title h3{margin:0;letter-spacing:-.04em}
.hint{color:var(--muted);font-size:13px;line-height:1.55}
.input-group{display:grid;gap:8px;margin-bottom:12px}
label{color:var(--muted);font-size:13px;font-weight:700}
input,textarea,select{width:100%;border:1px solid rgba(255,255,255,.14);color:var(--text);background:rgba(0,0,0,.24);border-radius:16px;padding:12px 14px;outline:none}
input:focus,textarea:focus,select:focus{border-color:rgba(168,85,247,.75);box-shadow:0 0 0 4px rgba(168,85,247,.16)}
textarea{resize:vertical;line-height:1.55}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}
.search{flex:1 1 260px}
.small-btn{padding:8px 11px;font-size:13px}
.danger{color:#fecdd3;border-color:rgba(251,113,133,.35);background:rgba(251,113,133,.12)}
.card-actions{display:flex;gap:8px;flex-wrap:wrap}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.empty{padding:36px;text-align:center;color:var(--muted);border:1px dashed rgba(255,255,255,.2);border-radius:20px;background:rgba(255,255,255,.045)}
.hidden{display:none!important}

/* BEATS — inline expand */
.beat-list{display:grid;gap:8px}
.beat-item{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.06);border-radius:18px;overflow:hidden;transition:border-color .18s}
.beat-item.expanded{border-color:rgba(168,85,247,.45)}
.beat-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;padding:14px;cursor:pointer}
.beat-row:hover{background:rgba(255,255,255,.04)}
.icon-pill{width:44px;height:44px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,rgba(168,85,247,.42),rgba(34,211,238,.22));flex-shrink:0}
.beat-meta strong{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.beat-meta span{color:var(--muted);font-size:12px}
.star-btn{background:transparent;border:0;color:rgba(255,255,255,.35);font-size:25px;padding:4px;line-height:1}
.star-btn.active{color:var(--gold);text-shadow:0 0 20px rgba(250,204,21,.36)}
.expand-arrow{background:transparent;border:0;color:var(--muted);font-size:16px;padding:4px;line-height:1;transition:transform .2s;display:flex;align-items:center}
.beat-item.expanded .expand-arrow{transform:rotate(180deg)}
.beat-expand{display:none;padding:0 16px 16px;border-top:1px solid rgba(255,255,255,.07);padding-top:14px}
.beat-item.expanded .beat-expand{display:block}
.beat-expand audio{width:100%;margin-bottom:14px;filter:saturate(1.1)}
.beat-expand textarea{min-height:560px;width:100%;margin-bottom:12px;font-size:14px}
.beat-expand-actions{display:flex;gap:8px;flex-wrap:wrap}

/* DEMOS */
.demo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.demo-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:22px;overflow:hidden;transition:.18s ease}
.demo-card:hover{transform:translateY(-2px);border-color:rgba(34,211,238,.35)}
.demo-cover{aspect-ratio:16/11;width:100%;object-fit:cover;background:linear-gradient(135deg,rgba(168,85,247,.32),rgba(34,211,238,.2))}
.demo-body{padding:15px;display:grid;gap:12px}
.demo-body h3{margin:0;letter-spacing:-.03em}
.stars{display:flex;gap:2px}
.stars button{border:0;background:transparent;color:rgba(255,255,255,.28);font-size:20px;padding:0 1px}
.stars button.active{color:var(--gold)}
.progress-wrap{display:grid;gap:6px}
.progress-label{display:flex;justify-content:space-between;color:var(--muted);font-size:13px}
.progress-bar{height:10px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.progress-bar div{height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.release-score{width:76px;height:76px;display:grid;place-items:center;border-radius:50%;font-size:22px;font-weight:900;background:conic-gradient(var(--accent2) calc(var(--score)*1%),rgba(255,255,255,.12) 0);position:relative;flex-shrink:0}
.release-score::after{content:"";position:absolute;inset:7px;background:#12121b;border-radius:inherit}
.release-score span{position:relative;z-index:1}

/* ALBUMS */
/* vinylSpin below */
.album-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:28px}
.album-card{display:flex;flex-direction:column;align-items:center;cursor:pointer;background:none;border:none;padding:0;gap:0;transition:transform .35s ease}
.album-card:hover .vinyl-disc{animation-play-state:running;filter:drop-shadow(0 0 22px rgba(168,85,247,.45))}
/* vinyl disc */
.vinyl-disc{width:170px;height:170px;border-radius:50%;position:relative;animation:vinylSpin 4s linear infinite;flex-shrink:0}
/* grooves via conic + radial */
.vinyl-groove{width:100%;height:100%;border-radius:50%;background:
  repeating-radial-gradient(circle,
    #111 0px, #1a1a1a 1.5px, #0d0d0d 3px, #181818 4.5px, #111 6px
  );
  position:absolute;inset:0}
/* subtle sheen */
.vinyl-groove::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 38% 30%,rgba(255,255,255,.07) 0%,transparent 50%),radial-gradient(ellipse at 68% 72%,rgba(255,255,255,.04) 0%,transparent 40%)}
/* center label ring */
.vinyl-label{position:absolute;inset:50%;transform:translate(-50%,-50%);width:54%;height:54%;border-radius:50%;border:3px solid rgba(168,85,247,.7);overflow:hidden;box-shadow:0 0 0 2px #111,inset 0 0 12px rgba(0,0,0,.6)}
.vinyl-label img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.vinyl-label-ph{width:100%;height:100%;background:linear-gradient(135deg,rgba(168,85,247,.5),rgba(34,211,238,.35));display:grid;place-items:center;font-size:22px}
/* center hole */
.vinyl-hole{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:#000;box-shadow:0 0 0 1.5px rgba(255,255,255,.15);z-index:2}
/* info below */
.album-info{padding:10px 4px 0;text-align:center;width:100%}
.album-info strong{display:block;font-size:13px;font-weight:700;letter-spacing:-.02em;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.album-info span{color:var(--muted);font-size:12px}
/* new album btn */
.album-new-btn{display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;padding:0}
.album-new-btn:hover .vinyl-disc-new{border-color:rgba(168,85,247,.7);background:rgba(168,85,247,.08)}
.vinyl-disc-new{width:170px;height:170px;border-radius:50%;border:2px dashed rgba(255,255,255,.2);display:grid;place-items:center;transition:.2s;font-size:28px;color:var(--muted);background:rgba(255,255,255,.03)}
.album-new-btn span{font-size:13px;color:var(--muted);padding-top:10px}
.album-detail-hd{display:flex;align-items:center;gap:18px;margin-bottom:24px;padding:20px;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:18px}
.album-detail-cover{width:90px;height:90px;border-radius:12px;object-fit:cover;flex-shrink:0}
.album-detail-cover-ph{width:90px;height:90px;border-radius:12px;background:linear-gradient(135deg,rgba(168,85,247,.4),rgba(34,211,238,.25));flex-shrink:0;display:grid;place-items:center;font-size:32px}
.album-detail-info h2{margin:0 0 4px;font-size:24px;letter-spacing:-.05em}
/* album beat cards */
.album-beat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.album-beat-card{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden;transition:border-color .18s,box-shadow .18s}
.album-beat-card:hover{border-color:rgba(168,85,247,.4)}
.album-beat-card.expanded{grid-column:1/-1;border-color:rgba(168,85,247,.55);box-shadow:0 0 0 1px rgba(168,85,247,.2),0 20px 60px rgba(168,85,247,.12)}
.ab-top{display:grid;grid-template-columns:220px 1fr;gap:0}
.album-beat-card:not(.expanded) .ab-top{display:block}
.ab-cover-wrap{cursor:pointer;flex-shrink:0;position:relative;overflow:hidden}
.ab-cover-wrap::after{content:"▾";position:absolute;bottom:8px;right:10px;font-size:18px;color:rgba(255,255,255,.5);line-height:1;transition:transform .2s}
.album-beat-card.expanded .ab-cover-wrap::after{content:"▴"}
.ab-cover{width:100%;display:block;object-fit:cover;background:linear-gradient(135deg,rgba(168,85,247,.3),rgba(34,211,238,.2))}
.album-beat-card:not(.expanded) .ab-cover{aspect-ratio:16/9}
.album-beat-card.expanded .ab-cover{aspect-ratio:unset;height:220px}
.ab-cover-ph{width:100%;background:linear-gradient(135deg,rgba(168,85,247,.25),rgba(34,211,238,.15));display:grid;place-items:center;font-size:32px}
.album-beat-card:not(.expanded) .ab-cover-ph{aspect-ratio:16/9}
.album-beat-card.expanded .ab-cover-ph{height:220px}
.ab-body{padding:13px 15px;display:grid;gap:10px;align-content:start}
.ab-title{font-size:14px;font-weight:700;letter-spacing:-.02em}
.ab-stars{display:flex;gap:2px}
.ab-stars button{border:0;background:transparent;color:rgba(255,255,255,.25);font-size:18px;padding:0 1px;cursor:pointer}
.ab-stars button.on{color:var(--gold)}
.ab-expand{display:none;padding:16px 18px 18px;border-top:1px solid rgba(255,255,255,.07)}
.album-beat-card.expanded .ab-expand{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.ab-expand-left{display:grid;gap:10px}
.ab-expand-right{display:grid;gap:10px;align-content:start}
.ab-expand textarea{width:100%;min-height:560px;font-size:14px;line-height:1.7;resize:vertical}
.ab-expand-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ab-cover-label{font-size:12px;color:var(--muted);font-weight:700}
.album-detail-info span{color:var(--muted);font-size:13px}

/* CASSETTE / MIXTAPES */
@keyframes reelSpin{to{transform:rotate(360deg)}}
.mixtape-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:34px 28px}
.cassette-card{display:flex;flex-direction:column;align-items:center;cursor:pointer;gap:0;transition:transform .28s ease,filter .28s ease}
.cassette-card:hover{transform:translateY(-7px);filter:drop-shadow(0 18px 30px rgba(0,0,0,.52))}
.cass-body{width:246px;height:154px;position:relative;overflow:hidden;border-radius:10px 10px 14px 14px;background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.16),transparent 34%),linear-gradient(180deg,#b9b8b3 0%,#989690 42%,#74716c 100%);border:1px solid rgba(0,0,0,.58);box-shadow:0 16px 34px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.38),inset 0 -2px 0 rgba(0,0,0,.18)}
.cass-body::before{content:"";position:absolute;inset:11px 11px 14px;border-radius:8px 8px 12px 12px;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.13),transparent 14%,transparent 78%,rgba(0,0,0,.12));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -1px 0 rgba(0,0,0,.1);opacity:.75}
.cass-body::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(140deg,rgba(255,255,255,.25),transparent 12%,transparent 68%,rgba(255,255,255,.08)),linear-gradient(320deg,transparent 0 76%,rgba(0,0,0,.24)),linear-gradient(180deg,rgba(255,255,255,.15),transparent 10%,transparent 88%,rgba(255,255,255,.05));box-shadow:inset 1px 1px 0 rgba(255,255,255,.24),inset -1px -1px 0 rgba(0,0,0,.22)}
.cass-screw,.cass-index,.cass-brand-row,.cass-window-ridge,.cass-label,.cass-bottom{z-index:3}
.cass-screw{position:absolute;width:11px;height:11px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fbfbfb,#b8b8b8 56%,#6b6b6b 100%);border:1px solid rgba(0,0,0,.52);box-shadow:inset 0 1px 1px rgba(255,255,255,.6),0 1px 1px rgba(0,0,0,.12)}
.cass-screw.tl{top:7px;left:9px}.cass-screw.tr{top:7px;right:9px}
.cass-screw.bl{bottom:10px;left:9px}.cass-screw.br{bottom:10px;right:9px}
.cass-screw::before{content:"";position:absolute;left:50%;top:50%;width:7px;height:1.6px;background:rgba(45,45,45,.75);transform:translate(-50%,-50%);border-radius:999px}
.cass-screw::after{content:"";position:absolute;left:50%;top:50%;width:1.6px;height:7px;background:rgba(45,45,45,.75);transform:translate(-50%,-50%);border-radius:999px}
.cass-index{position:absolute;top:13px;left:18px;right:18px;height:34px;background:linear-gradient(180deg,#fbf5e8 0%,#eee6d6 100%);border-radius:5px;border:1px solid rgba(0,0,0,.2);overflow:hidden;display:flex;box-shadow:0 1px 0 rgba(255,255,255,.35) inset}
.cass-index-left{width:26px;flex-shrink:0;border-right:1px solid rgba(0,0,0,.12);padding:4px 3px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(0,0,0,.03))}
.cass-side-num{font-size:11px;font-weight:900;color:#313131;line-height:1;font-family:Arial,sans-serif}
.cass-side-lbl{font-size:6px;font-weight:800;color:#5d5d5d;letter-spacing:.5px;text-transform:uppercase;margin-top:2px;font-family:Arial,sans-serif}
.cass-index-main{flex:1;padding:4px 6px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;min-width:0}
.cass-index-top-row{display:flex;align-items:center;gap:5px}
.cass-index-label{font-size:6px;font-weight:800;color:#777;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;white-space:nowrap}
.cass-index-line{flex:1;height:1px;background:rgba(0,0,0,.25);margin-top:1px}
.cass-name-on-card{font-size:9.5px;font-weight:800;color:#161616;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:Arial,sans-serif;line-height:1.15;margin-top:1px}
.cass-squiggle{width:100%;overflow:hidden;line-height:0}
.cass-index-right{width:46px;flex-shrink:0;border-left:1px solid rgba(0,0,0,.12);padding:4px 5px;display:flex;flex-direction:column;justify-content:center;gap:2px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(0,0,0,.03))}
.cass-noise-lbl{font-size:4.6px;font-weight:800;color:#666;letter-spacing:.35px;text-transform:uppercase;font-family:Arial,sans-serif;line-height:1.2}
.cass-noise-row{display:flex;align-items:center;gap:2px}
.cass-checkbox{width:5px;height:5px;border:1px solid rgba(0,0,0,.35);border-radius:1px;background:#fff}
.cass-noise-val{font-size:5.3px;color:#444;font-family:Arial,sans-serif}
.cass-brand-row{position:absolute;top:49px;left:19px;right:19px;display:flex;align-items:center;justify-content:space-between;font-family:Arial,sans-serif;text-transform:uppercase;font-weight:800;letter-spacing:1px;color:rgba(36,36,36,.62);font-size:6.4px}
.cass-brand-pill{padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.32);border:1px solid rgba(0,0,0,.09);box-shadow:0 1px 0 rgba(255,255,255,.35) inset}
.cass-window-ridge{position:absolute;top:55px;left:10px;right:10px;height:66px;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.11),rgba(0,0,0,.12));box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 0 0 1px rgba(0,0,0,.4)}
.cass-label{position:absolute;top:59px;left:15px;right:15px;height:58px;border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 9px;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.03) 24%,rgba(0,0,0,.12) 100%),var(--cass-color,#b95f33);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.35)}
.cass-label::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:1;background:linear-gradient(120deg,rgba(255,255,255,.18),transparent 16%,transparent 82%,rgba(255,255,255,.06)),linear-gradient(180deg,rgba(255,255,255,.06),transparent 60%,rgba(0,0,0,.1))}
.cass-label.has-cover::before{content:"";position:absolute;inset:0;background-image:var(--cass-cover);background-size:cover;background-position:center;opacity:.8;filter:saturate(1.1) contrast(1.05);mix-blend-mode:multiply;z-index:0;clip-path:inset(0 round 10px)}
.cass-label>*{position:relative;z-index:2}
.cass-reel{width:42px;height:42px;border-radius:50%;position:relative;flex-shrink:0;animation:reelSpin 3.6s linear infinite;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.12) 0 10%,rgba(50,50,50,.95) 10% 18%,rgba(111,78,55,.56) 18% 31%,rgba(10,10,10,.92) 31% 64%,rgba(255,255,255,.08) 64% 66%,rgba(16,16,16,.98) 66% 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 0 0 16px rgba(0,0,0,.72),0 0 0 1px rgba(0,0,0,.5)}
.cass-reel::before{content:"";position:absolute;inset:15px;border-radius:50%;background:radial-gradient(circle at 34% 34%,#f3f3f3,#a9a9a9 58%,#6f6f6f);box-shadow:0 0 0 1px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.5)}
.cass-reel-spokes{position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(rgba(236,236,236,.9) 0deg 9deg,transparent 9deg 60deg);mask:radial-gradient(circle,transparent 36%,#000 37%,#000 58%,transparent 59%);-webkit-mask:radial-gradient(circle,transparent 36%,#000 37%,#000 58%,transparent 59%);opacity:.92}
.cass-tape-win{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0}
.cass-tape-slot{width:100%;height:18px;background:linear-gradient(180deg,#090909,#242424);border-radius:999px;border:1px solid rgba(255,255,255,.05);position:relative;overflow:hidden;box-shadow:inset 0 3px 8px rgba(0,0,0,.82),0 0 0 1px rgba(0,0,0,.45)}
.cass-tape-slot::before{content:"";position:absolute;inset:5px 8px;border-radius:999px;background:linear-gradient(90deg,rgba(126,83,49,.78) 0 20%,rgba(32,32,32,.92) 22% 78%,rgba(126,83,49,.78) 80% 100%);box-shadow:0 0 0 1px rgba(255,255,255,.05) inset}
.cass-tape-slot::after{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(180deg,rgba(255,255,255,.08),transparent)}
.cass-counter{display:flex;justify-content:space-between;width:100%;padding:0 4px}
.cass-counter span{font-size:6px;color:rgba(255,255,255,.7);font-family:'Courier New',monospace;font-weight:700;letter-spacing:.4px}
.cass-bottom{position:absolute;left:18px;right:18px;bottom:13px;height:13px;display:flex;align-items:center;justify-content:center;gap:7px}
.cass-slot-rect{width:24px;height:7px;border-radius:3px;background:linear-gradient(180deg,rgba(20,20,20,.7),rgba(0,0,0,.55));border:1px solid rgba(0,0,0,.55);box-shadow:inset 0 1px 2px rgba(255,255,255,.04),inset 0 -1px 2px rgba(0,0,0,.5)}
.cass-center-bolt{width:11px;height:11px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#f8f8f8,#b7b7b7 56%,#6b6b6b);border:1px solid rgba(0,0,0,.5);position:relative;box-shadow:inset 0 1px 1px rgba(255,255,255,.6)}
.cass-center-bolt::before{content:"";position:absolute;left:50%;top:50%;width:6px;height:1.4px;background:rgba(45,45,45,.72);transform:translate(-50%,-50%);border-radius:999px}
.cass-center-bolt::after{content:"";position:absolute;left:50%;top:50%;width:1.4px;height:6px;background:rgba(45,45,45,.72);transform:translate(-50%,-50%);border-radius:999px}
.cass-info{padding:11px 4px 0;text-align:center;width:246px}
.cass-info strong{display:block;font-size:13px;font-weight:700;letter-spacing:-.02em;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cass-info span{color:var(--muted);font-size:12px}
.cass-new-card{display:flex;flex-direction:column;align-items:center;cursor:pointer;gap:0;transition:transform .28s ease}
.cass-new-card:hover{transform:translateY(-7px)}
.cass-new-body{width:246px;height:154px;background:rgba(255,255,255,.04);border:2px dashed rgba(255,255,255,.18);border-radius:10px 10px 14px 14px;display:grid;place-items:center;font-size:28px;color:rgba(255,255,255,.3);transition:.2s}
.cass-new-card:hover .cass-new-body{border-color:rgba(168,85,247,.6);background:rgba(168,85,247,.07);color:rgba(168,85,247,.8)}
.cass-new-card span{color:var(--muted);font-size:13px;padding-top:8px}
.cassette-preview{display:inline-block;position:relative}
.cassette-preview--sm{width:133px;height:84px}
.cassette-preview--sm .cass-body{transform:scale(.54);transform-origin:top left}
.mixtape-detail-head{display:flex;align-items:flex-end;gap:20px;width:100%;flex-wrap:wrap}
.mixtape-detail-visual{position:relative;flex-shrink:0}
.mixtape-detail-copy{flex:1;min-width:220px;padding-bottom:8px}
.mixtape-detail-kicker{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}
.mixtape-detail-copy h2{margin:0 0 4px;font-size:22px;letter-spacing:-.05em}
.mixtape-detail-actions{display:flex;gap:8px;flex-wrap:wrap;padding-bottom:8px}

.mixtape-sort-select,.beat-search-input{width:100%;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:999px;color:var(--text);padding:10px 14px;font:inherit;outline:none}
.mixtape-sort-select{width:auto;min-width:210px;cursor:pointer}
.beat-search-input{border-radius:12px;margin-bottom:2px}
.beat-search-input:focus,.mixtape-sort-select:focus{border-color:rgba(255,186,94,.45);box-shadow:0 0 0 3px rgba(255,186,94,.10)}
.mixtape-sort-select option{background:#17130f;color:#fff}

/* PIPELINE redesign */
.pipeline-album-section{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px 20px;margin-bottom:16px}
.pipeline-album-hd{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.pipeline-album-cover{width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0}
.pipeline-album-cover-ph{width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,rgba(168,85,247,.4),rgba(34,211,238,.25));flex-shrink:0;display:grid;place-items:center;font-size:20px}
.pipeline-album-info{flex:1}
.pipeline-album-info h3{margin:0 0 6px;font-size:16px;letter-spacing:-.03em}
.pipeline-avg{display:flex;align-items:center;gap:10px}
.pipeline-avg .progress-bar{flex:1;height:8px}
.pipeline-avg span{font-size:12px;color:var(--muted);white-space:nowrap;min-width:36px;text-align:right}
.pipeline-beat-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid rgba(255,255,255,.06)}
.pipeline-beat-name{font-size:13px;min-width:0;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.pipeline-beat-bar{flex:2;height:6px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.pipeline-beat-bar div{height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.pipeline-beat-pct{font-size:12px;color:var(--muted);min-width:34px;text-align:right}

/* DROP ZONE */
.drop-zone{border:2px dashed rgba(255,255,255,.18);border-radius:14px;padding:16px;text-align:center;margin-bottom:14px;transition:all .2s;display:none}
.drop-zone.active{display:block}
.drop-zone.drag-over{border-color:var(--accent);background:rgba(168,85,247,.08);box-shadow:0 0 0 3px rgba(168,85,247,.15)}
.drop-hint{color:var(--muted);font-size:13px}
/* HIGHLIGHT EDITOR */
.lyrics-editor-wrap{position:relative;margin-bottom:10px}
.highlight-toolbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px;padding:7px 10px;background:rgba(255,255,255,.06);border-radius:10px;border:1px solid rgba(255,255,255,.1);align-items:center}
.highlight-toolbar span{font-size:11px;color:var(--muted);font-weight:700;margin-right:4px}
.hl-btn{width:22px;height:22px;border-radius:5px;border:2px solid rgba(255,255,255,.2);cursor:pointer;transition:transform .1s;flex-shrink:0}
.hl-btn:hover{transform:scale(1.15)}
.hl-btn.hl-clear{background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text);width:auto;padding:0 7px;border-radius:6px}
.lyrics-editor{min-height:560px;width:100%;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:12px 14px;color:var(--text);font-size:14px;line-height:1.7;outline:none;white-space:pre-wrap;word-break:break-word;overflow-y:auto;font-family:inherit;resize:vertical;transition:border-color .2s}
.lyrics-editor:focus{border-color:rgba(168,85,247,.75);box-shadow:0 0 0 4px rgba(168,85,247,.16)}
.lyrics-editor::selection{background:rgba(168,85,247,.3)}

/* RICH LYRICS + GLOBAL PLAYER */
.lyrics-editor-wrap{margin-bottom:12px}
.rich-lyrics-editor{min-height:560px;width:100%;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:16px 18px;color:var(--text);font-size:15px;line-height:1.85;outline:none;white-space:pre-wrap;word-break:break-word;overflow-y:auto;font-family:inherit;resize:vertical}
.rich-lyrics-editor:focus{border-color:rgba(168,85,247,.75);box-shadow:0 0 0 4px rgba(168,85,247,.16)}
.rich-lyrics-editor:empty:before{content:attr(data-placeholder);color:rgba(255,255,255,.32);pointer-events:none}
.color-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px;padding:8px 10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;align-items:center}
.color-toolbar span{font-size:11px;color:var(--muted);font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-right:4px}
.color-chip{width:25px;height:25px;border-radius:7px;border:2px solid rgba(255,255,255,.22);cursor:pointer;transition:transform .12s,box-shadow .12s;background:var(--chip)}
.color-chip:hover{transform:scale(1.12);box-shadow:0 0 0 3px rgba(255,255,255,.08)}
.color-clear{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:var(--text);border-radius:8px;padding:5px 9px;font-size:12px;cursor:pointer}
.drag-handle{display:none}

.album-beat-card.dragging{opacity:.45}.album-beat-card.drag-over{border-color:rgba(34,211,238,.75);box-shadow:0 0 0 2px rgba(34,211,238,.22),0 20px 60px rgba(34,211,238,.1)}
.reorder-hint{display:none}
.bottom-player{position:fixed;left:0;right:0;bottom:0;z-index:60;background:rgba(8,8,12,.92);border-top:1px solid rgba(255,255,255,.14);backdrop-filter:blur(18px);box-shadow:0 -20px 60px rgba(0,0,0,.5);padding:12px 18px;display:none;align-items:center;gap:18px;color:var(--text)}
.bottom-player.show{display:flex}
.bp-track{display:flex;align-items:center;gap:12px;min-width:220px;max-width:360px;flex:1}
.bp-cover{width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,rgba(168,85,247,.45),rgba(34,211,238,.28));display:grid;place-items:center;font-size:24px;flex-shrink:0;overflow:hidden}
.bp-cover img{width:100%;height:100%;object-fit:cover}
.bp-meta{min-width:0}.bp-title{font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bp-sub{font-size:12px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bp-center{display:grid;gap:8px;justify-items:center;flex:2;min-width:260px}.bp-controls{display:flex;align-items:center;gap:12px}.bp-btn{border:0;background:transparent;color:var(--text);font-size:18px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;cursor:pointer}.bp-btn:hover{background:rgba(255,255,255,.1)}.bp-play{background:#fff;color:#07070b;font-size:17px;width:42px;height:42px}.bp-play:hover{background:#fff;filter:brightness(.92)}
.bp-progress{display:flex;align-items:center;gap:10px;width:min(640px,100%)}.bp-time{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;min-width:42px;text-align:center}.bp-seek{width:100%;padding:0;border:0;background:transparent;accent-color:#fff;cursor:pointer}
.bp-actions{display:flex;align-items:center;gap:8px;justify-content:flex-end;flex:1;min-width:180px}.bp-vol{width:110px;padding:0;border:0;background:transparent;accent-color:#fff}.bp-close{font-size:16px;color:var(--muted)}
@media(max-width:780px){.bottom-player{grid-template-columns:1fr;display:none;align-items:stretch}.bottom-player.show{display:grid}.bp-actions{display:none}.bp-track{max-width:none}.bp-center{min-width:0}.bp-progress{width:100%}}

/* VERSIONS */
.version-list{display:grid;gap:12px}
.version-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:18px;padding:15px;display:grid;gap:10px}
.version-card h3{margin:0;letter-spacing:-.03em}
.ver-item{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-bottom:8px}
.ver-date{font-size:10px;color:var(--muted);white-space:nowrap;padding-top:2px;min-width:90px}
.ver-text{flex:1;font-size:13px;line-height:1.5}
.ver-del{background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;opacity:.4;transition:opacity .15s;padding:0}
.ver-del:hover{opacity:1;color:var(--danger)}

/* RELEASE SCORE PAGE */
.release-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.release-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:22px;padding:15px;display:grid;gap:10px;transition:.18s ease}
.release-card:hover{transform:translateY(-2px);border-color:rgba(34,211,238,.35)}
.release-card h3{margin:0;letter-spacing:-.03em}
.score-explain{background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:18px;padding:22px 26px;margin-bottom:24px}
.score-explain h2{margin:0 0 10px;letter-spacing:-.04em}
.score-explain p{color:var(--muted);font-size:14px;line-height:1.65;margin:0 0 18px}
.score-factor{display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.score-factor:last-child{border-bottom:none;padding-bottom:0}
.score-pts{font-size:20px;font-weight:900;min-width:52px;text-align:center;background:rgba(34,211,238,.1);border-radius:10px;padding:5px 0;color:var(--accent2);flex-shrink:0}
.score-info strong{display:block;font-size:14px;margin-bottom:3px}
.score-info span{color:var(--muted);font-size:13px}
.tag-row{display:flex;gap:8px;flex-wrap:wrap}
.tag{font-size:12px;color:#ddd6fe;border:1px solid rgba(221,214,254,.18);background:rgba(168,85,247,.12);padding:5px 9px;border-radius:999px}

/* MODAL */
.modal{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(12px);display:none;place-items:center;padding:18px;z-index:3000}
.modal.open{display:grid}
.modal-card{background:linear-gradient(135deg,rgba(255,255,255,.11),rgba(255,255,255,.055));border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow);backdrop-filter:blur(18px);width:min(800px,100%);max-height:92vh;overflow-y:auto}
.modal-sm{max-width:460px}
.modal-hd{padding:22px 28px 0;display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
.modal-hd-left h2{margin:0;font-size:20px;letter-spacing:-.04em}
.modal-hd-right{display:flex;align-items:center;gap:14px;flex-shrink:0}
.modal-score-wrap{text-align:right}
.modal-score-num{font-size:28px;font-weight:900;line-height:1;letter-spacing:-.04em}
.modal-score-lbl{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-top:2px}
.close-btn{border:0;width:40px;height:40px;border-radius:999px;color:var(--text);background:rgba(255,255,255,.1);font-size:20px;flex-shrink:0}
.modal-tabs{display:flex;border-bottom:1px solid var(--border);padding:0 28px;margin-top:16px}
.mtab{padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;border-top:none;border-left:none;border-right:none;background:none;font-family:inherit;transition:all .15s;margin-bottom:-1px}
.mtab.active{color:var(--text);border-bottom-color:var(--gold)}
.mtab-content{display:none;padding:22px 28px 28px}
.mtab-content.active{display:block}
.pipeline-sel{display:flex;gap:7px;flex-wrap:wrap}
.p-btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:rgba(255,255,255,.06);color:var(--muted);transition:all .15s;font-family:inherit}
.p-btn.active{background:linear-gradient(135deg,rgba(168,85,247,.5),rgba(124,58,237,.4));border-color:rgba(168,85,247,.6);color:#fff}
.rating-stars{display:flex;gap:3px}
.rstar{font-size:26px;cursor:pointer;color:rgba(255,255,255,.2);line-height:1;background:none;border:none;padding:0;transition:color .1s}
.rstar.on{color:var(--gold);text-shadow:0 0 14px rgba(250,204,21,.35)}

/* Album beat checkbox list */
.beat-check-list{display:grid;gap:6px;max-height:320px;overflow-y:auto}
.beat-check-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.06);border-radius:12px;cursor:pointer;border:1px solid transparent;transition:.15s}
.beat-check-item:hover{background:rgba(255,255,255,.1)}
.beat-check-item input[type=checkbox]{width:16px;height:16px;flex-shrink:0;cursor:pointer;accent-color:var(--accent)}

.settings-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:22px;padding:20px;display:grid;gap:12px}
.settings-card h2{margin:0;letter-spacing:-.04em}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.2);border-top-color:var(--accent2);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:920px){.hero,.layout{grid-template-columns:1fr}}
@media(max-width:560px){.app{width:calc(100% - 20px);padding-top:16px}.hero-main,.stats-card,.sidebar,.content-panel{padding:16px}.row,.stat-grid{grid-template-columns:1fr}}


/* === Warm Midnight Vinyl redesign overrides === */
:root{
  --bg:#090705;
  --border:rgba(255,226,190,.12);
  --text:#f4ede4;
  --muted:#b9aa97;
  --accent:#df7f22;
  --accent2:#ffb357;
  --gold:#f3c56a;
  --danger:#fb7185;
  --shadow:0 26px 80px rgba(0,0,0,.56);
  --radius:26px;
}
body{
  padding-bottom:118px;
  background:
    radial-gradient(circle at 16% 10%,rgba(239,146,52,.30),transparent 28%),
    radial-gradient(circle at 84% 12%,rgba(184,89,21,.18),transparent 24%),
    radial-gradient(circle at 52% 88%,rgba(255,182,71,.08),transparent 34%),
    linear-gradient(180deg,#050403 0%,#090705 50%,#060504 100%);
  color:var(--text);
}
.glass,.content-panel,.sidebar,.stats-card,.hero-main,.modal-card,.settings-card,.album-beat-card,.version-card{
  background:linear-gradient(180deg,rgba(20,16,12,.96),rgba(10,9,7,.95));
  border:1px solid var(--border);
  box-shadow:var(--shadow);
  backdrop-filter:blur(18px);
}
.hero{grid-template-columns:1.2fr .8fr;gap:20px;margin-bottom:22px}
.hero-main{
  position:relative;overflow:hidden;min-height:360px;padding:40px 40px 34px;
  background:
    linear-gradient(180deg,rgba(16,12,10,.98),rgba(10,8,7,.96)),
    radial-gradient(circle at 78% 32%,rgba(244,156,58,.16),transparent 32%);
}
.hero-main::before{
  content:"";position:absolute;right:-130px;top:-30px;width:500px;height:500px;border-radius:50%;pointer-events:none;
  background:
    radial-gradient(circle at center,rgba(0,0,0,.0) 0 13%,rgba(0,0,0,.76) 13.8% 14.4%,transparent 14.5%),
    repeating-radial-gradient(circle,rgba(255,255,255,.04) 0 1.7px,rgba(0,0,0,0) 1.8px 11px),
    radial-gradient(circle at 34% 28%,rgba(255,190,95,.24),transparent 18%);
  box-shadow:inset 0 0 0 2px rgba(255,190,95,.12),0 0 120px rgba(213,109,26,.22);
  opacity:.92;
}
.hero-main::after{
  content:"";position:absolute;right:36px;bottom:28px;width:180px;height:180px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,182,78,.18),transparent 68%);
  filter:blur(6px);
}
.eyebrow{color:#f4c17e;text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:800;margin-bottom:12px}
h1{font-size:clamp(38px,6vw,74px);line-height:.92;letter-spacing:-.075em}
.hero p{max-width:560px;color:var(--muted);font-size:16px;line-height:1.72}
.stats-card{padding:24px;background:linear-gradient(180deg,rgba(17,13,10,.95),rgba(10,8,6,.95))}
.stat{padding:18px;border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid rgba(255,233,202,.08)}
.stat strong{font-size:30px;letter-spacing:-.05em}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px;padding:10px 12px;background:rgba(10,9,7,.85);border:1px solid var(--border);border-radius:999px;box-shadow:0 12px 34px rgba(0,0,0,.24)}
.tab-btn,.primary-btn,.ghost-btn,.small-btn{border:1px solid rgba(255,226,190,.12);background:rgba(255,255,255,.04);color:var(--text);border-radius:999px;padding:11px 16px;transition:.18s ease}
.tab-btn{color:var(--muted);background:transparent;border-color:transparent}
.tab-btn:hover,.ghost-btn:hover,.small-btn:hover{background:rgba(255,255,255,.08);transform:translateY(-1px)}
.tab-btn.active,.primary-btn{background:linear-gradient(135deg,#f4a443,#cb6e1a);border-color:rgba(255,212,160,.24);box-shadow:0 16px 34px rgba(203,110,26,.28);color:#fff}
.primary-btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
input,textarea,select{border:1px solid rgba(255,226,190,.14);color:var(--text);background:rgba(0,0,0,.22);border-radius:16px;padding:12px 14px;outline:none}
input:focus,textarea:focus,select:focus{border-color:rgba(255,167,76,.74);box-shadow:0 0 0 4px rgba(255,167,76,.14)}
.section-title h2,.section-title h3{letter-spacing:-.05em}
.hint,label,.album-info span,.bp-sub,.bp-time{color:var(--muted)}

/* vinyl / album direction */
.album-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:26px}
.album-card,.album-new-btn{
  display:flex;flex-direction:column;align-items:flex-start;gap:0;cursor:pointer;
  padding:16px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.0));
  border:1px solid rgba(255,255,255,.04);transition:transform .28s ease,border-color .24s ease,box-shadow .24s ease;
}
.album-card:hover,.album-new-btn:hover{transform:translateY(-5px);border-color:rgba(255,179,90,.18);box-shadow:0 22px 36px rgba(0,0,0,.28)}
.album-display{position:relative;width:100%;max-width:240px;height:194px;margin-bottom:12px;overflow:visible}
.album-card .vinyl-disc,.album-new-btn .vinyl-disc{position:absolute;right:6px;top:5px;width:166px;height:166px;border-radius:50%;animation:vinylSpin 6s linear infinite;transition:transform .34s ease,filter .34s ease}
.album-card:hover .vinyl-disc,.album-new-btn:hover .vinyl-disc{transform:translateX(18px) rotate(12deg);filter:drop-shadow(0 10px 22px rgba(0,0,0,.55))}
.vinyl-groove{width:100%;height:100%;border-radius:50%;background:repeating-radial-gradient(circle,#080808 0,#181818 2px,#0b0b0b 3.6px,#161616 5.3px,#090909 7px);position:absolute;inset:0}
.vinyl-groove::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 34% 30%,rgba(255,255,255,.10),transparent 40%),radial-gradient(ellipse at 67% 70%,rgba(255,255,255,.05),transparent 38%)}
.vinyl-label{position:absolute;inset:50%;transform:translate(-50%,-50%);width:54%;height:54%;border-radius:50%;border:3px solid rgba(244,179,91,.68);overflow:hidden;box-shadow:0 0 0 2px #111,inset 0 0 12px rgba(0,0,0,.6)}
.vinyl-label img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.vinyl-label-ph{width:100%;height:100%;background:linear-gradient(135deg,rgba(223,127,34,.58),rgba(255,186,94,.24));display:grid;place-items:center;font-size:22px}
.vinyl-hole{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:#000;box-shadow:0 0 0 1.5px rgba(255,255,255,.14);z-index:2}
.record-sleeve,.detail-sleeve{position:absolute;left:0;top:0;width:176px;height:176px;border-radius:0;overflow:hidden;background:linear-gradient(145deg,#241a13,#120f0c);border:1px solid rgba(255,248,235,.10);box-shadow:0 18px 36px rgba(0,0,0,.42),inset 1px 1px 0 rgba(255,255,255,.18),inset -1px -1px 0 rgba(0,0,0,.35);z-index:2}
.record-sleeve::after,.detail-sleeve::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.07),transparent 18%,transparent 76%,rgba(0,0,0,.18)),linear-gradient(90deg,rgba(255,255,255,.10),transparent 14%,transparent 86%,rgba(255,186,94,.10));pointer-events:none}
.record-sleeve img,.detail-sleeve img{width:100%;height:100%;object-fit:cover;display:block}
.record-sleeve-ph{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,rgba(223,127,34,.22),rgba(255,186,94,.08));font-size:36px;color:#f6dcc2}
.record-sleeve-new{display:grid;place-items:center;border-style:dashed;background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.02))}
.record-sleeve-new .record-sleeve-ph{font-size:42px;background:none;color:var(--muted)}
.album-info{padding:6px 4px 0;text-align:left;width:100%}
.album-info strong{display:block;font-size:15px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.album-new-btn span{padding:8px 4px 0;color:var(--muted);font-size:13px}
.album-detail-hd{display:flex;align-items:center;gap:24px;padding:8px 0 18px;margin-bottom:6px}
.detail-record{position:relative;width:214px;height:210px;flex-shrink:0}
.detail-record .vinyl-disc{position:absolute;right:14px;top:6px;width:172px;height:172px;border-radius:50%;animation:vinylSpin 7s linear infinite}
.detail-sleeve{width:184px;height:184px;border-radius:0}
.album-detail-info h2{margin:0 0 6px;font-size:28px;letter-spacing:-.05em}
.album-detail-info .eyebrow{margin-bottom:8px}
.album-detail-info span{color:var(--muted)}
.album-card .small-btn{margin-top:10px;padding:8px 12px;background:rgba(255,255,255,.05)}
.album-new-btn .small-btn{display:none}

/* mixtapes styled above */


/* album detail refresh */
#albumDetailView{padding:0}
#albumDetailHd.album-detail-hd{
  position:relative;
  display:flex;
  align-items:center;
  gap:34px;
  width:100%;
  margin:0 0 24px;
  padding:28px 32px;
  min-height:250px;
  border-radius:24px;
  overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018));
  border:1px solid rgba(255,179,90,.16);
  box-shadow:0 22px 54px rgba(0,0,0,.22),inset 1px 1px 0 rgba(255,255,255,.06);
}
#albumDetailHd.album-detail-hd::before{
  content:"";
  position:absolute;
  inset:-40% -20% auto auto;
  width:360px;
  height:360px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(223,127,34,.16),transparent 62%);
  pointer-events:none;
}
#albumDetailHd .detail-record{
  position:relative;
  width:280px;
  height:218px;
  flex:0 0 280px;
  overflow:visible;
  margin:0;
}
#albumDetailHd .detail-record .vinyl-disc{
  position:absolute;
  right:8px;
  top:15px;
  width:190px;
  height:190px;
  border-radius:50%;
  z-index:1;
  animation:vinylSpin 6s linear infinite;
  filter:drop-shadow(0 16px 22px rgba(0,0,0,.5));
}
#albumDetailHd .detail-sleeve{
  position:absolute;
  left:0;
  top:11px;
  width:196px;
  height:196px;
  border-radius:0;
  z-index:2;
}
#albumDetailHd .album-detail-info{position:relative;z-index:2;min-width:220px}
#albumDetailHd .album-detail-info .eyebrow{color:#ffc079;font-size:11px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:10px}
#albumDetailHd .album-detail-info h2{font-size:34px;line-height:1;letter-spacing:-.06em;margin:0 0 10px;max-width:520px}
#albumDetailHd .album-detail-info span{color:var(--muted);font-size:14px}
#albumDetailHd > div:last-child{position:relative;z-index:2;display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
@media(max-width:820px){
  #albumDetailHd.album-detail-hd{padding:22px;align-items:flex-start;gap:22px;flex-direction:column}
  #albumDetailHd .detail-record{width:260px;height:205px;flex-basis:auto}
  #albumDetailHd > div:last-child{margin-left:0}
}

/* darker realistic cassette shell */
.cass-body{
  background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.10),transparent 34%),linear-gradient(180deg,#9b9891 0%,#77736d 42%,#56534f 100%);
  border-color:rgba(0,0,0,.68);
  box-shadow:0 16px 34px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.24),inset 0 -2px 0 rgba(0,0,0,.25);
}
.cass-body::before{background:linear-gradient(180deg,rgba(255,255,255,.08),transparent 14%,transparent 78%,rgba(0,0,0,.18));opacity:.8}
.cass-body::after{background:linear-gradient(140deg,rgba(255,255,255,.16),transparent 12%,transparent 68%,rgba(255,255,255,.05)),linear-gradient(320deg,transparent 0 76%,rgba(0,0,0,.28)),linear-gradient(180deg,rgba(255,255,255,.08),transparent 10%,transparent 88%,rgba(255,255,255,.035))}
.cass-index{background:linear-gradient(180deg,#e7dfcf 0%,#d5cdbc 100%)}
.cass-brand-row{color:rgba(20,20,20,.7)}
.cass-brand-pill{background:rgba(255,255,255,.18);border-color:rgba(0,0,0,.14)}
.cass-window-ridge{background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(0,0,0,.18));box-shadow:inset 0 0 0 1px rgba(255,255,255,.06),0 0 0 1px rgba(0,0,0,.48)}

/* other UI */
.album-beat-card{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border-radius:20px;overflow:hidden;transition:border-color .18s,box-shadow .18s}
.album-beat-card:hover,.album-beat-card.expanded{border-color:rgba(255,168,78,.3)}
.album-beat-card.expanded{box-shadow:0 0 0 1px rgba(255,168,78,.14),0 20px 60px rgba(0,0,0,.24)}
.ab-cover{background:linear-gradient(135deg,rgba(223,127,34,.3),rgba(255,186,94,.12))}
.ab-cover-ph{background:linear-gradient(135deg,rgba(223,127,34,.26),rgba(255,186,94,.14))}
.drop-zone{border:2px dashed rgba(255,221,179,.18);border-radius:18px;padding:18px;background:rgba(255,255,255,.02)}
.drop-zone.drag-over{border-color:var(--accent);background:rgba(223,127,34,.08);box-shadow:0 0 0 3px rgba(223,127,34,.12)}
.settings-card,.version-card{border-radius:24px}
.close-btn{background:rgba(255,255,255,.06)}
.mtab.active{color:var(--text);border-bottom-color:var(--accent2)}
.p-btn.active{background:linear-gradient(135deg,rgba(223,127,34,.55),rgba(181,93,18,.38));border-color:rgba(255,167,76,.58);color:#fff}
.ab-stars button.on,.rstar.on{color:var(--gold);text-shadow:0 0 14px rgba(243,197,106,.25)}

.bottom-player{background:rgba(8,7,6,.94);border-top:1px solid var(--border);box-shadow:0 -18px 60px rgba(0,0,0,.55);padding:12px 18px}
.bp-cover{background:linear-gradient(135deg,rgba(223,127,34,.45),rgba(255,186,94,.18));border-radius:14px}
.bp-btn:hover{background:rgba(255,255,255,.08)}
.bp-play{background:linear-gradient(135deg,#f2a442,#cf7220);color:#fff}
.bp-play:hover{filter:brightness(.96)}
.bp-seek,.bp-vol{accent-color:#f2a442}

#lockScreen{background:radial-gradient(circle at 24% 18%,rgba(239,146,52,.28),transparent 34%),radial-gradient(circle at 76% 78%,rgba(184,89,21,.16),transparent 28%),#080605 !important}

@keyframes vinylSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@media(max-width:920px){.hero,.layout{grid-template-columns:1fr}.hero-main{min-height:auto}.hero-main::before{right:-180px;top:40px;width:420px;height:420px;opacity:.5}.album-detail-hd{align-items:flex-start;flex-direction:column}.detail-record{width:200px;height:192px}}
@media(max-width:560px){.app{width:calc(100% - 20px);padding-top:16px}.hero-main,.stats-card,.sidebar,.content-panel{padding:16px}.row,.stat-grid{grid-template-columns:1fr}.tabs{padding:8px}.album-grid{grid-template-columns:1fr 1fr}.album-display{height:180px}.record-sleeve{width:150px;height:150px}.album-card .vinyl-disc,.album-new-btn .vinyl-disc{width:142px;height:142px;top:4px}}


/* draggable collection cards + final cassette darkness */
.album-card,.cassette-card{user-select:none}
.album-card.dragging,.cassette-card.dragging{opacity:.42;filter:grayscale(.12) drop-shadow(0 8px 18px rgba(0,0,0,.45))}
.album-card.drag-over .album-display,.cassette-card.drag-over .cass-body{outline:2px solid rgba(255,192,121,.58);outline-offset:8px;box-shadow:0 0 0 1px rgba(255,192,121,.12),0 18px 44px rgba(223,127,34,.18)}
.cass-body{background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.09),transparent 34%),linear-gradient(180deg,#8f8b84 0%,#6d6963 42%,#4d4945 100%);border-color:rgba(0,0,0,.72);box-shadow:0 16px 34px rgba(0,0,0,.56),inset 0 1px 0 rgba(255,255,255,.20),inset 0 -2px 0 rgba(0,0,0,.28)}
.cass-body::before{background:linear-gradient(180deg,rgba(255,255,255,.07),transparent 14%,transparent 78%,rgba(0,0,0,.20));opacity:.85}
.cass-body::after{background:linear-gradient(140deg,rgba(255,255,255,.14),transparent 12%,transparent 68%,rgba(255,255,255,.045)),linear-gradient(320deg,transparent 0 76%,rgba(0,0,0,.30)),linear-gradient(180deg,rgba(255,255,255,.07),transparent 10%,transparent 88%,rgba(255,255,255,.03))}
.cass-index{background:linear-gradient(180deg,#ded6c6 0%,#cac2b2 100%)}
.cass-brand-row{color:rgba(18,18,18,.74)}
.cass-brand-pill{background:rgba(255,255,255,.16);border-color:rgba(0,0,0,.16)}
.cass-window-ridge{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.20));box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),0 0 0 1px rgba(0,0,0,.52)}

/* PRODUCER MODE */
body.producer-mode .tabs .tab-btn:not([data-tab="mixtapes"]):not([data-tab="pipeline"]),
body.producer-mode #albumsTab,
body.producer-mode #integrationsTab,
body.producer-mode #addBeatsToMixtapeBtn,
body.producer-mode #mixtapeCoverInput,
body.producer-mode #deleteMixtapeBtn,
body.producer-mode #exportBtn,
body.producer-mode #importInput,
body.producer-mode label:has(#importInput),
body.producer-mode label:has(#mixtapeCoverInput),
body.producer-mode .producer-hidden{display:none!important}
body.producer-mode .tabs{width:max-content}
body.producer-mode .hero-main p::after{content:" Produsentmodus: du kan se mixtapes, pipeline, opprette mixtapes og laste opp nye beats.";color:var(--accent)}
body.producer-mode .stats-card{display:none}
body.producer-mode .hero{grid-template-columns:1fr}
body.producer-mode .album-beat-card{cursor:default}
body.producer-mode #newMixtapeBtn{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
body.producer-mode #newMixtapeModal .primary-btn{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}

.producer-login-btn{position:fixed;top:18px;right:18px;z-index:2000;display:none;background:linear-gradient(135deg,#f4a443,#cb6e1a);border:0;border-radius:999px;padding:10px 15px;color:#fff;font-size:13px;font-weight:800;letter-spacing:.1px;cursor:pointer;box-shadow:0 12px 36px rgba(0,0,0,.34);font-family:inherit}
.producer-login-btn:hover{filter:brightness(1.05);transform:translateY(-1px)}
body.producer-mode .producer-login-btn{display:inline-flex;align-items:center;gap:8px}
.beat-check-item.mixtape-source{border-color:color-mix(in srgb,var(--source-mixtape-color) 72%,rgba(255,255,255,.1));box-shadow:inset 4px 0 0 var(--source-mixtape-color),0 0 0 1px color-mix(in srgb,var(--source-mixtape-color) 18%,transparent)}
.beat-check-item.mixtape-source:hover{border-color:color-mix(in srgb,var(--source-mixtape-color) 88%,white 8%);background:color-mix(in srgb,var(--source-mixtape-color) 15%,rgba(255,255,255,.06))}
.beat-check-meta{margin-left:auto;color:var(--muted);font-size:11px;font-weight:700;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis}
.beat-check-item.mixtape-source .beat-check-meta{color:color-mix(in srgb,var(--source-mixtape-color) 72%,white 20%)}


/* Favorite feedback + mixtape-colored song borders */
.star-btn{transition:color .12s ease,text-shadow .12s ease,transform .12s ease}
.star-btn:active{transform:scale(1.16)}
.album-beat-card.mixtape-colored{border-color:color-mix(in srgb,var(--song-border-color) 72%,rgba(255,255,255,.14));box-shadow:0 0 0 1px color-mix(in srgb,var(--song-border-color) 22%,transparent),0 18px 52px rgba(0,0,0,.22)}
.album-beat-card.mixtape-colored:hover,.album-beat-card.mixtape-colored.expanded{border-color:color-mix(in srgb,var(--song-border-color) 88%,white 10%);box-shadow:0 0 0 1px color-mix(in srgb,var(--song-border-color) 36%,transparent),0 20px 60px rgba(0,0,0,.28)}

/* Producer pipeline access fix */
body.producer-mode .tabs .tab-btn[data-tab="mixtapes"],
body.producer-mode .tabs .tab-btn[data-tab="pipeline"]{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
body.producer-mode .tabs .tab-btn:not([data-tab="mixtapes"]):not([data-tab="pipeline"]){display:none!important}
body.producer-mode #mixtapesTab.hidden,
body.producer-mode #pipelineTab.hidden{display:none!important}
body.producer-mode #mixtapesTab:not(.hidden),
body.producer-mode #pipelineTab:not(.hidden){display:block!important}
body.producer-mode #pipelineTab .content-panel{display:block!important}


/* === UX UPGRADE PACK === */
:root{--radius-xl:24px;--panel-blur:24px;--safe-bottom:92px}
body{--accent:#df7f22;--accent2:#ffba5e;background:radial-gradient(circle at 18% 8%,rgba(223,127,34,.16),transparent 32%),radial-gradient(circle at 86% 18%,rgba(104,70,255,.12),transparent 34%),#090806}
.glass,.content-panel,.stats-card,.hero-main{border-radius:var(--radius-xl)!important;backdrop-filter:blur(var(--panel-blur)) saturate(1.2);box-shadow:0 28px 80px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.08)}
.role-badge{position:fixed;top:18px;right:18px;z-index:2100;display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:999px;background:rgba(20,20,28,.86);border:1px solid rgba(255,255,255,.16);box-shadow:0 12px 32px rgba(0,0,0,.32);font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(16px)}
.role-badge::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent2);box-shadow:0 0 16px var(--accent2)}
.role-badge.producer::before{background:#34d399;box-shadow:0 0 16px #34d399}.role-badge.admin::before{background:#f59e0b;box-shadow:0 0 16px #f59e0b}
body.producer-mode .role-badge{right:102px}.producer-login-btn{top:18px!important;right:18px!important}
.autosave-indicator{position:fixed;right:20px;bottom:calc(var(--safe-bottom) + 12px);z-index:1800;padding:8px 12px;border-radius:999px;background:rgba(18,18,27,.82);border:1px solid rgba(255,255,255,.14);font-size:12px;color:var(--muted);opacity:0;transform:translateY(10px);transition:.22s;backdrop-filter:blur(16px)}.autosave-indicator.show{opacity:1;transform:translateY(0)}
.empty-state{grid-column:1/-1;min-height:210px;display:grid;place-items:center;text-align:center;padding:34px;border:1px dashed rgba(255,255,255,.18);border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))}.empty-state .empty-icon{font-size:42px;margin-bottom:10px}.empty-state h3{font-size:22px;letter-spacing:-.04em;margin:0 0 6px}.empty-state p{color:var(--muted);margin:0 0 18px;max-width:520px}
button.primary-btn,.primary-btn{background:linear-gradient(135deg,var(--accent),var(--accent2));border:0;color:#12100d;font-weight:900;box-shadow:0 12px 34px rgba(223,127,34,.20)}button.ghost-btn,.ghost-btn{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.14);color:var(--text)}button.small-btn,.small-btn{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.065);color:var(--text)}button.danger,.danger{background:rgba(239,68,68,.12)!important;border-color:rgba(239,68,68,.35)!important;color:#fecaca!important}
.toolbar{position:sticky;top:10px;z-index:50;background:rgba(14,12,10,.72);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:10px!important;box-shadow:0 14px 38px rgba(0,0,0,.18)}
.album-card,.cassette-card,.album-beat-card{transition:transform .22s ease,box-shadow .22s ease,filter .22s ease,border-color .22s ease}.album-card:hover .record-sleeve{transform:translateY(-6px) rotate(-1deg)}.album-card:hover .vinyl-disc{transform:translateX(16px) rotate(8deg)}.cassette-card:hover .cass-body::after{filter:brightness(1.22)}
.dragging{opacity:.62!important;transform:scale(.985) translateY(-6px)!important;filter:drop-shadow(0 20px 34px rgba(0,0,0,.42))!important}.drag-over{box-shadow:0 0 0 2px var(--accent2),0 0 0 8px rgba(255,186,94,.12)!important}.drop-zone.drag-over,.drop-zone.active{box-shadow:0 0 0 3px rgba(255,186,94,.12),0 16px 44px rgba(223,127,34,.10)!important}
.album-detail-layout{display:grid;grid-template-columns:minmax(260px,380px) minmax(0,1fr) 280px;gap:24px;align-items:start}.album-hero-vinyl{position:relative;min-height:340px}.album-hero-vinyl .vinyl-disc{width:260px;height:260px;position:absolute;right:0;top:32px;animation:none}.album-hero-vinyl .record-sleeve{width:260px;height:260px;position:absolute;left:0;top:20px;border-radius:0}.is-playing-album .album-hero-vinyl .vinyl-disc{animation:vinylSpin 7s linear infinite}.is-playing-mixtape .cass-reel{animation-play-state:running}
.meta-panel{border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(255,255,255,.045);padding:18px;display:grid;gap:12px}.meta-row{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:13px}.meta-row strong{color:var(--text);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.beat-chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 8px;background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.12);font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);max-width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.color-dot{width:9px;height:9px;min-width:9px;flex:0 0 9px;border-radius:50%;background:var(--chip-color,var(--accent));box-shadow:0 0 14px var(--chip-color,var(--accent))}.album-beat-card .ab-body{min-width:0;overflow:hidden}.album-beat-card .ab-title{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.album-beat-card .beat-chip-row{max-width:100%;min-width:0;overflow:hidden}.album-beat-card .beat-chip-row .beat-chip{max-width:100%;flex:0 1 auto}
.batch-bar{grid-column:1/-1;display:none;position:sticky;top:82px;z-index:48;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:rgba(18,18,27,.86);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(16px)}.batch-bar.active{display:flex}.ab-top{position:relative}.select-beat-check{appearance:none;-webkit-appearance:none;position:absolute;top:10px;left:10px;width:28px;height:28px;border-radius:999px;cursor:pointer;z-index:14;border:1px solid rgba(255,255,255,.18);background:linear-gradient(180deg,rgba(32,32,42,.98),rgba(16,16,24,.94));box-shadow:0 10px 20px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.12),0 0 0 1px rgba(255,168,78,.08);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}.select-beat-check:hover{transform:translateY(-1px) scale(1.03);box-shadow:0 12px 22px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.18),0 0 0 1px rgba(255,168,78,.18)}.select-beat-check:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(255,168,78,.22),0 12px 22px rgba(0,0,0,.36)}.select-beat-check:checked{border-color:rgba(255,186,94,.72);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%2317110a' d='M9.2 16.6 4.95 12.35l-1.4 1.4 5.65 5.65L20.45 8.15l-1.4-1.4z'/%3E%3C/svg%3E"),linear-gradient(180deg,#ffb652,#df7f22);background-repeat:no-repeat,no-repeat;background-position:center,center;background-size:13px 13px,100% 100%;box-shadow:0 12px 24px rgba(223,127,34,.34),inset 0 1px 0 rgba(255,255,255,.3),0 0 0 1px rgba(255,186,94,.28)}.album-beat-card.is-batch-selected{transform:translateY(-2px);border-color:rgba(255,186,94,.72)!important;box-shadow:0 0 0 1px rgba(255,186,94,.24),0 22px 54px rgba(223,127,34,.16)}.album-beat-card.is-batch-selected .ab-cover-wrap::after{background:rgba(255,186,94,.16);border-color:rgba(255,186,94,.32)}.album-display,.cass-body,.ab-cover-wrap{cursor:grab}.album-display:active,.cass-body:active,.ab-cover-wrap:active{cursor:grabbing}@media (max-width:720px){.select-beat-check{left:8px;top:8px;width:26px;height:26px;background-size:12px 12px,100% 100%}}.producer-dashboard{border-radius:24px;padding:20px;margin-bottom:18px;background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(34,211,238,.08));border:1px solid rgba(52,211,153,.18)}
.toast-action{margin-left:12px;border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:6px 10px;font-weight:800;cursor:pointer}.beat-item.flash,.album-beat-card.flash{animation:flashBeat 1.2s ease}@keyframes flashBeat{0%{box-shadow:0 0 0 0 rgba(255,186,94,.55)}45%{box-shadow:0 0 0 8px rgba(255,186,94,.10)}100%{box-shadow:inherit}}
.waveform{height:42px;border-radius:12px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.15) 0 3px,transparent 3px 7px),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025));mask:linear-gradient(180deg,transparent 2%,#000 12%,#000 88%,transparent 98%);opacity:.75}.loop-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}.mini-thumb{width:30px;height:30px;border-radius:8px;object-fit:cover;display:inline-grid;place-items:center;background:var(--chip-color,var(--accent));flex-shrink:0}.beat-check-item{border-left:4px solid var(--chip-color,var(--accent));gap:10px}.beat-check-item .mini-thumb{margin-right:4px}
.pipeline-filterbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;position:sticky;top:10px;z-index:40;padding:10px;border-radius:18px;background:rgba(14,12,10,.74);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px)}.pipeline-filterbar input,.pipeline-filterbar select,.ux-input{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:var(--text);border-radius:12px;padding:10px 12px;outline:none}.pipeline-beat-row{border-left:4px solid var(--chip-color,var(--accent));padding-left:10px!important}
@media(max-width:900px){.app{padding:16px 12px 118px}.hero{grid-template-columns:1fr!important}.mixtape-grid,.album-grid,.album-beat-grid{grid-template-columns:1fr!important}.album-detail-layout{grid-template-columns:1fr}.album-hero-vinyl{min-height:285px}.album-hero-vinyl .vinyl-disc,.album-hero-vinyl .record-sleeve{width:220px;height:220px}.toolbar{top:0;overflow:auto}.role-badge{top:auto;bottom:calc(var(--safe-bottom) + 58px);right:12px}.producer-login-btn{top:auto!important;bottom:calc(var(--safe-bottom) + 58px)!important;right:12px!important}.modal-card{width:calc(100vw - 20px)!important;max-height:92vh;overflow:auto}.tabs{overflow-x:auto;white-space:nowrap}.bottom-player{left:10px!important;right:10px!important;bottom:10px!important}}

/* === FIXED PREMIUM ALBUM DETAIL VIEW === */
#albumDetailHd.album-detail-hd{
  margin:0 0 24px!important;
  padding:32px!important;
  border-radius:28px!important;
  border:1px solid rgba(255,190,112,.20)!important;
  background:
    radial-gradient(circle at 18% 12%,rgba(255,176,86,.12),transparent 32%),
    linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.025))!important;
  box-shadow:0 24px 70px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.09)!important;
  overflow:hidden!important;
}
.album-detail-premium{
  width:100%;
  display:grid;
  grid-template-columns:minmax(300px,430px) minmax(260px,1fr) 260px;
  gap:34px;
  align-items:center;
}
.album-detail-art{
  position:relative;
  min-height:310px;
  display:flex;
  align-items:center;
  justify-content:center;
  isolation:isolate;
}
.album-detail-art::before{
  content:"";
  position:absolute;
  width:280px;
  height:280px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(255,184,96,.18),transparent 64%);
  filter:blur(20px);
  opacity:.65;
  z-index:0;
}
.album-detail-vinyl{
  position:absolute;
  width:278px;
  height:278px;
  left:50%;
  top:50%;
  transform:translate(-20%,-50%);
  border-radius:50%;
  background:
    radial-gradient(circle at center,#050505 0 7%,#151515 7.5% 13%,#080808 13.5% 100%),
    repeating-radial-gradient(circle at center,#141414 0 2px,#050505 2px 4px);
  box-shadow:0 28px 60px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.05),inset 0 0 34px rgba(0,0,0,.9);
  z-index:1;
  animation:none;
}
#albumDetailHd.is-playing-album .album-detail-vinyl,
body.is-playing-album #albumDetailHd .album-detail-vinyl{animation:vinylSpin 7s linear infinite}
.album-detail-vinyl::before{
  content:"";
  position:absolute;
  inset:0;
  border-radius:50%;
  background:repeating-radial-gradient(circle at center,rgba(255,255,255,.045) 0 1px,transparent 1px 8px);
  opacity:.7;
}
.album-detail-vinyl-label{
  position:absolute;
  inset:50%;
  transform:translate(-50%,-50%);
  width:92px;
  height:92px;
  border-radius:50%;
  overflow:hidden;
  border:3px solid rgba(235,166,82,.72);
  box-shadow:0 0 0 2px #080808,inset 0 0 18px rgba(0,0,0,.5);
  background:linear-gradient(135deg,rgba(223,127,34,.55),rgba(255,186,94,.22));
}
.album-detail-vinyl-label img{width:100%;height:100%;object-fit:cover;display:block}
.album-detail-vinyl-hole{position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;background:#050505;transform:translate(-50%,-50%);box-shadow:0 0 0 2px rgba(255,255,255,.08)}
.album-detail-cover-card{
  position:relative;
  width:250px;
  height:250px;
  z-index:2;
  transform:translateX(-54px);
  border-radius:0;
  overflow:hidden;
  background:linear-gradient(145deg,#241a13,#100d0a);
  border:1px solid rgba(255,241,218,.16);
  box-shadow:0 24px 60px rgba(0,0,0,.52),inset 1px 1px 0 rgba(255,255,255,.14),inset -1px -1px 0 rgba(0,0,0,.32);
  transition:transform .28s ease,box-shadow .28s ease;
}
#albumDetailHd:hover .album-detail-cover-card{transform:translateX(-60px) translateY(-5px);box-shadow:0 30px 74px rgba(0,0,0,.60),inset 1px 1px 0 rgba(255,255,255,.18)}
#albumDetailHd:hover .album-detail-vinyl{transform:translate(-14%,-50%)}
.album-detail-cover-card img{width:100%;height:100%;object-fit:cover;display:block}
.album-detail-cover-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.08),transparent 22%,transparent 78%,rgba(0,0,0,.22)),linear-gradient(90deg,rgba(255,255,255,.10),transparent 12%,transparent 88%,rgba(255,186,94,.10));pointer-events:none}
.album-detail-cover-ph{width:100%;height:100%;display:grid;place-items:center;font-size:48px;color:#f6dcc2;background:linear-gradient(135deg,rgba(223,127,34,.26),rgba(255,186,94,.10))}
.album-detail-main{min-width:0;position:relative;z-index:4;padding:12px 0}
.album-detail-main .eyebrow{color:#ffc079;font-size:12px;font-weight:950;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}
.album-detail-main h2{font-size:clamp(32px,5vw,58px);line-height:.94;letter-spacing:-.075em;margin:0 0 14px;max-width:680px;text-wrap:balance}
.album-detail-main .album-detail-sub{color:var(--muted);font-size:15px;margin:0 0 22px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.album-detail-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.album-detail-actions .primary-btn{padding:13px 18px;border-radius:999px;font-size:14px}.album-detail-actions .ghost-btn,.album-detail-actions .small-btn{padding:12px 15px;border-radius:999px;font-size:13px}
.album-detail-side{
  border:1px solid rgba(255,255,255,.13);
  border-radius:24px;
  background:rgba(255,255,255,.045);
  padding:20px;
  display:grid;
  gap:14px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
}
.album-detail-side .meta-row{display:flex;justify-content:space-between;gap:16px;color:var(--muted);font-size:13px}.album-detail-side .meta-row strong{color:var(--text);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.album-detail-side .progress-bar{height:10px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden}.album-detail-side .progress-bar>div{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:inherit}.album-detail-side .ux-input{width:100%;margin-top:2px}
@media(max-width:1100px){.album-detail-premium{grid-template-columns:360px 1fr}.album-detail-side{grid-column:1/-1;grid-template-columns:repeat(3,1fr);align-items:center}.album-detail-side .ux-input{grid-column:1/-1}.album-detail-art{justify-content:flex-start}}
@media(max-width:760px){#albumDetailHd.album-detail-hd{padding:20px!important}.album-detail-premium{grid-template-columns:1fr;gap:22px}.album-detail-art{min-height:265px;justify-content:center}.album-detail-vinyl{width:232px;height:232px;transform:translate(-12%,-50%)}.album-detail-cover-card{width:210px;height:210px;transform:translateX(-42px)}#albumDetailHd:hover .album-detail-cover-card{transform:translateX(-42px)}#albumDetailHd:hover .album-detail-vinyl{transform:translate(-12%,-50%)}.album-detail-side{grid-template-columns:1fr}.album-detail-actions .primary-btn,.album-detail-actions .ghost-btn,.album-detail-actions .small-btn{width:100%;justify-content:center;text-align:center}.album-detail-main h2{font-size:36px}}


/* Fix: cassette wheels should spin again, and global search must stay behind popups */
.cassette-card .cass-reel,.mixtape-detail-visual .cass-reel,.cassette-preview .cass-reel{animation-play-state:running!important}
.modal.open{z-index:3000!important}
.global-search-wrap{z-index:15!important}
body:has(.modal.open) .global-search-wrap{z-index:1!important;pointer-events:none}
body.modal-is-open .global-search-wrap{z-index:1!important;pointer-events:none}

</style>

<style id="cleanTrackCardsCss">
/* RENERE AVSPILLINGSSIDER + SANGKORT */
.album-beat-grid{
  grid-template-columns:repeat(auto-fill,minmax(230px,1fr))!important;
  gap:16px!important;
  align-items:start!important;
}
.album-beat-card{
  border-radius:24px!important;
  overflow:hidden!important;
  background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.032))!important;
  border:1px solid rgba(255,255,255,.115)!important;
  box-shadow:0 18px 46px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.06)!important;
}
.album-beat-card:hover{
  transform:translateY(-3px)!important;
  border-color:rgba(255,186,94,.38)!important;
  box-shadow:0 24px 60px rgba(0,0,0,.30),0 0 0 1px rgba(255,186,94,.08)!important;
}
.album-beat-card.expanded{
  grid-column:1/-1!important;
  transform:none!important;
}
.album-beat-card:not(.expanded) .ab-top{display:block!important}
.album-beat-card.expanded .ab-top{display:grid!important;grid-template-columns:minmax(230px,320px) 1fr!important}
.ab-cover-wrap{
  aspect-ratio:4/3!important;
  background:linear-gradient(135deg,rgba(255,186,94,.22),rgba(124,58,237,.16))!important;
  border-bottom:1px solid rgba(255,255,255,.08)!important;
}
.ab-cover,.ab-cover-ph{
  width:100%!important;
  height:100%!important;
  aspect-ratio:auto!important;
  object-fit:cover!important;
  object-position:center!important;
  display:block!important;
}
.album-beat-card.expanded .ab-cover,.album-beat-card.expanded .ab-cover-ph{height:100%!important;min-height:230px!important}
.ab-cover-wrap::after{
  content:"Åpne"!important;
  right:12px!important;
  bottom:12px!important;
  font-size:11px!important;
  font-weight:900!important;
  letter-spacing:.02em!important;
  padding:6px 9px!important;
  border-radius:999px!important;
  color:#fff!important;
  background:rgba(0,0,0,.46)!important;
  border:1px solid rgba(255,255,255,.14)!important;
  backdrop-filter:blur(10px)!important;
}
.album-beat-card.expanded .ab-cover-wrap::after{content:"Lukk"!important}
.ab-body{padding:14px 15px 15px!important;gap:8px!important}
.ab-title{font-size:15px!important;font-weight:900!important;letter-spacing:-.035em!important;line-height:1.2!important}
.album-beat-card:not(.expanded) .ab-body>.ab-stars,
.album-beat-card:not(.expanded) .ab-body>.progress-wrap,
.album-beat-card:not(.expanded) .hint:not(:first-child){display:none!important}
.album-beat-card:not(.expanded) .star-btn{opacity:.65!important}
.album-beat-card:not(.expanded) .star-btn.active{opacity:1!important;color:var(--gold)!important}
.album-beat-card:not(.expanded)::after{
  content:"Klikk på bildet for spiller, tekst og innstillinger";
  display:block;
  padding:0 15px 15px;
  color:var(--muted);
  font-size:12px;
}
.album-beat-card.expanded .ab-expand{
  display:grid!important;
  grid-template-columns:minmax(260px,1fr) minmax(220px,360px)!important;
  gap:18px!important;
  background:rgba(0,0,0,.16)!important;
}
.ab-expand textarea{min-height:320px!important}
.reorder-hint{
  padding:10px 14px!important;
  border-radius:16px!important;
  background:rgba(255,255,255,.045)!important;
  border:1px solid rgba(255,255,255,.08)!important;
  color:var(--muted)!important;
}
#albumDrop.active,#mixtapeDrop.active{padding:12px!important;min-height:auto!important;border-radius:18px!important}
#albumDrop.active .drop-hint,#mixtapeDrop.active .drop-hint{font-size:13px!important;opacity:.75!important}
.mixtape-detail-head{align-items:center!important;padding:4px 0 10px!important}
.mixtape-detail-copy h2{font-size:clamp(28px,4vw,46px)!important;line-height:1!important}
.mixtape-detail-kicker{opacity:.85!important}
.mixtape-detail-actions .primary-btn{border-radius:999px!important}
@media(max-width:760px){
  .album-beat-card.expanded .ab-top{grid-template-columns:1fr!important}
  .album-beat-card.expanded .ab-expand{grid-template-columns:1fr!important}
  .album-beat-grid{grid-template-columns:1fr!important}
}
/* merged from lyricsTextColorFixCss */

/* Fiks: lyrics/tekst under beats og demoer skal være lys/hvit på mørk bakgrunn */
.beat-expand textarea,
.ab-expand textarea,
.lyrics-editor,
.rich-lyrics-editor,
.rich-lyrics-editor *,
.lyrics-editor *{
  color:#f7f3ea !important;
  caret-color:#f7f3ea !important;
}
.beat-expand textarea::placeholder,
.ab-expand textarea::placeholder,
.lyrics-editor:empty:before,
.rich-lyrics-editor:empty:before{
  color:rgba(247,243,234,.45) !important;
}
.beat-expand textarea,
.ab-expand textarea,
.lyrics-editor,
.rich-lyrics-editor{
  background:rgba(0,0,0,.28) !important;
}
/* merged from trackCardSpacingActionsNoBatchOverride */

/* Finjustering: mer luft mellom cover og info, kortere progresjon, favoritt ved play, ingen masseredigering */
.batch-bar,
.select-beat-check{
  display:none!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
.album-beat-card.is-batch-selected{
  transform:none!important;
  border-color:rgba(255,255,255,.115)!important;
  box-shadow:0 18px 46px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.06)!important;
}
.album-beat-card:not(.expanded) .ab-top,
.album-beat-card.expanded .ab-top{
  column-gap:34px!important;
  grid-template-columns:minmax(170px,280px) minmax(0,1fr)!important;
}
.album-beat-card:not(.expanded) .ab-cover-wrap,
.album-beat-card.expanded .ab-cover-wrap{
  border-right:0!important;
}
.album-beat-card:not(.expanded) .ab-body,
.album-beat-card.expanded .ab-body{
  padding-left:0!important;
  padding-right:22px!important;
}
.album-beat-card .ab-body > div:first-child{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:14px!important;
}
.track-card-actions{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:flex-end!important;
  gap:8px!important;
  flex:0 0 auto!important;
  margin-left:auto!important;
}
.track-card-actions .quick-play-btn,
.track-card-actions .star-btn{
  width:34px!important;
  height:34px!important;
  min-width:34px!important;
  padding:0!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  border-radius:999px!important;
  font-size:14px!important;
  line-height:1!important;
}
.track-card-actions .star-btn{
  background:rgba(255,255,255,.08)!important;
  border:0!important;
  color:var(--muted)!important;
}
.track-card-actions .star-btn.active{
  color:var(--gold)!important;
  background:rgba(255,186,94,.12)!important;
}
.album-beat-listmode .quick-play-btn,
.album-beat-listmode .track-card-actions{
  position:static!important;
  right:auto!important;
  top:auto!important;
}
.album-beat-card:not(.expanded) .progress-wrap,
.album-beat-card.expanded .progress-wrap{
  max-width:300px!important;
  width:100%!important;
}
.album-beat-card:not(.expanded) .progress-wrap input[type="range"],
.album-beat-card.expanded .progress-wrap input[type="range"]{
  max-width:300px!important;
}
@media(max-width:720px){
  .album-beat-card:not(.expanded) .ab-top,
  .album-beat-card.expanded .ab-top{column-gap:0!important;}
  .album-beat-card:not(.expanded) .ab-body,
  .album-beat-card.expanded .ab-body{padding:18px 20px!important;}
  .album-beat-card:not(.expanded) .progress-wrap,
  .album-beat-card.expanded .progress-wrap{max-width:100%!important;}
}
/* merged from songCardOpenByCoverTitleOverride */

/* Oppdatert sangkort-layout: bilde til venstre, info ved siden av, ingen "Åpne"-badge/knapp */
.album-beat-grid{
  grid-template-columns:1fr!important;
  gap:14px!important;
}
.album-beat-card:not(.expanded) .ab-top,
.album-beat-card.expanded .ab-top{
  display:grid!important;
  grid-template-columns:minmax(150px,280px) minmax(0,1fr)!important;
  align-items:stretch!important;
}
.album-beat-card:not(.expanded) .ab-cover-wrap,
.album-beat-card.expanded .ab-cover-wrap{
  aspect-ratio:4/3!important;
  border-bottom:0!important;
  border-right:1px solid rgba(255,255,255,.08)!important;
  cursor:pointer!important;
}
.ab-cover-wrap::after,
.album-beat-card.expanded .ab-cover-wrap::after{
  content:none!important;
  display:none!important;
}
.album-beat-card:not(.expanded) .ab-body,
.album-beat-card.expanded .ab-body{
  padding:18px 20px!important;
  display:flex!important;
  flex-direction:column!important;
  justify-content:center!important;
  gap:10px!important;
  min-width:0!important;
}
.ab-title{
  cursor:pointer!important;
  width:max-content!important;
  max-width:100%!important;
}
.ab-title:hover{text-decoration:underline!important;text-underline-offset:3px!important;}
.album-beat-card:not(.expanded) .ab-body>.ab-stars,
.album-beat-card:not(.expanded) .ab-body>.progress-wrap,
.album-beat-card:not(.expanded) .hint:not(:first-child){
  display:flex!important;
}
.album-beat-card:not(.expanded) .progress-wrap{display:grid!important;max-width:460px!important;}
.album-beat-card:not(.expanded)::after{content:none!important;display:none!important;}
.album-beat-card:not(.expanded) .star-btn{opacity:1!important;}
.album-beat-card.expanded .ab-expand{border-top:1px solid rgba(255,255,255,.08)!important;}
@media(max-width:720px){
  .album-beat-card:not(.expanded) .ab-top,
  .album-beat-card.expanded .ab-top{grid-template-columns:1fr!important;}
  .album-beat-card:not(.expanded) .ab-cover-wrap,
  .album-beat-card.expanded .ab-cover-wrap{border-right:0!important;border-bottom:1px solid rgba(255,255,255,.08)!important;}
}
/* merged from marcus-minimal-track-list-fix */

/* Minimal listevisning: kun tittel, varighet, favoritt og play. */
.acp-minimal-list .acp-list-head{grid-template-columns:44px minmax(220px,1fr) 90px 92px!important;}
.acp-minimal-list .acp-list-row{grid-template-columns:44px minmax(220px,1fr) 90px 92px!important;min-height:54px!important;}
.acp-list-duration,.track-duration{color:#b9aa96;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;}
.acp-fav-action.active,.track-card-actions .star-btn.active{color:#ffd36d!important;background:rgba(255,211,109,.13)!important;}
.acp-minimal-list .acp-list-copy small{color:#8f8375!important;}
.acp-minimal-list .acp-list-kind,.acp-minimal-list .acp-list-progress,.acp-minimal-list .acp-list-date{display:none!important;}

.album-beat-listmode{gap:2px!important;padding:4px!important;}
.album-beat-listmode .album-beat-card:not(.expanded){min-height:50px!important;border-bottom:1px solid rgba(255,255,255,.045)!important;border-radius:8px!important;}
.album-beat-listmode .album-beat-card:not(.expanded) .ab-top{display:grid!important;grid-template-columns:46px minmax(0,1fr)!important;align-items:center!important;min-height:50px!important;padding:0!important;}
.album-beat-listmode .album-beat-card:not(.expanded) .ab-cover-wrap,.album-beat-listmode .album-beat-card:not(.expanded) .ab-cover,.album-beat-listmode .album-beat-card:not(.expanded) .ab-cover-ph{width:38px!important;height:38px!important;min-height:38px!important;border-radius:6px!important;}
.album-beat-listmode .album-beat-card:not(.expanded) .ab-cover-wrap{margin-left:6px!important;}
.album-beat-listmode .album-beat-card:not(.expanded) .ab-body{padding:0 8px!important;display:block!important;min-height:0!important;}
.album-beat-listmode .album-beat-card:not(.expanded) .ab-body::before{content:none!important;display:none!important;}
.album-beat-listmode .album-beat-card:not(.expanded) .ab-body>div:first-child{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;width:100%!important;}
.album-beat-listmode .album-beat-card:not(.expanded) .ab-title{font-size:14px!important;line-height:1.15!important;font-weight:850!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
.album-beat-listmode .album-beat-card:not(.expanded) .ab-stars,.album-beat-listmode .album-beat-card:not(.expanded) .progress-wrap,.album-beat-listmode .album-beat-card:not(.expanded) .beat-chip-row,.album-beat-listmode .album-beat-card:not(.expanded) .hint{display:none!important;}
.track-card-actions{display:flex!important;align-items:center!important;gap:8px!important;flex-shrink:0!important;margin-left:auto!important;}
.track-card-actions .track-duration{min-width:42px!important;text-align:right!important;}
.track-card-actions .star-btn,.track-card-actions .quick-play-btn{width:32px!important;height:32px!important;padding:0!important;border-radius:999px!important;display:inline-grid!important;place-items:center!important;margin:0!important;font-size:14px!important;}
.track-card-actions .star-btn{background:rgba(255,255,255,.06)!important;color:rgba(255,255,255,.42)!important;}
.track-card-actions .quick-play-btn{background:rgba(255,255,255,.09)!important;color:#fff!important;}
.track-card-actions .quick-play-btn:hover{background:#f2a13a!important;color:#160c04!important;}
@media(max-width:700px){.acp-minimal-list .acp-list-head{display:none!important}.acp-minimal-list .acp-list-row{grid-template-columns:32px minmax(0,1fr) 50px 72px!important}.album-beat-listmode .track-card-actions .track-duration{display:inline!important}.album-beat-listmode .album-beat-card:not(.expanded) .ab-cover-wrap{display:none!important}.album-beat-listmode .album-beat-card:not(.expanded) .ab-top{grid-template-columns:1fr!important}}
</style>
</head>
<body>
<!-- PASSWORD SCREEN -->
<div id="lockScreen" style="position:fixed;inset:0;background:radial-gradient(circle at 30% 20%,rgba(168,85,247,.3),transparent 40%),radial-gradient(circle at 80% 80%,rgba(34,211,238,.2),transparent 40%),#09090f;display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;gap:24px">
  <div style="text-align:center;margin-bottom:8px">
    <div style="font-size:48px;margin-bottom:12px">🎵</div>
    <div style="font-size:28px;font-weight:800;letter-spacing:-.05em;color:#f6f4ff">Music Vault</div>
    <div style="font-size:13px;color:#aaa4bd;margin-top:4px">Logg inn med passord, eller fortsett som produsent</div>
  </div>
  <div style="background:linear-gradient(135deg,rgba(255,255,255,.11),rgba(255,255,255,.055));border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:28px 32px;width:min(360px,90vw);display:grid;gap:14px;backdrop-filter:blur(18px);box-shadow:0 24px 80px rgba(0,0,0,.45)">
    <input id="pwInput" type="password" placeholder="Passord" onkeydown="if(event.key==='Enter')checkPw()" style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:13px 16px;color:#f6f4ff;font-size:16px;outline:none;width:100%;font-family:inherit" />
    <button onclick="checkPw()" style="background:linear-gradient(135deg,#f4a443,#cb6e1a);border:none;border-radius:14px;padding:13px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.2px">Lås opp</button>
    <button onclick="loginProducer()" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:13px;color:#f6f4ff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.2px">Logg inn som produsent</button>
    <div id="pwError" style="color:#fb7185;font-size:13px;text-align:center;display:none">Feil passord</div>
  </div>
</div>
<script>
// Prevent browser from auto-restoring scroll (conflicts with per-tab scroll memory)
if(history.scrollRestoration) history.scrollRestoration = 'manual';

const PW_HASH="961d21fae317a30cebd9998665d05708f29cecda65918b28640e0a348a957f79";
// Simple non-crypto fallback for file:// contexts
function simpleHash(s){let h=0;for(let i=0;i<s.length;i++){h=Math.imul(31,h)+s.charCodeAt(i)|0;}return(h>>>0).toString(16);}
const SIMPLE_PW="Mekkis123";
function getUserRole(){return sessionStorage.getItem('mv_role')||'';}
function isProducerUser(){return getUserRole()==='producer';}
function applyRoleMode(){
  const producer=isProducerUser();
  document.body.classList.toggle('producer-mode',producer);
  if(producer){
    const active=document.querySelector('.tab-btn.active');
    const activeTab=active?.dataset?.tab||'mixtapes';
    const allowed=['mixtapes','pipeline'];
    const target=allowed.includes(activeTab)?activeTab:'mixtapes';
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===target));
    document.querySelectorAll('.tab-view').forEach(v=>v.classList.add('hidden'));
    const view=document.getElementById(`${target}Tab`);if(view)view.classList.remove('hidden');
  }
}
function returnToPasswordScreen(){
  sessionStorage.removeItem('mv_unlocked');
  sessionStorage.removeItem('mv_role');
  document.body.classList.remove('producer-mode');
  const lock=document.getElementById('lockScreen');
  if(lock)lock.style.display='flex';
  const pw=document.getElementById('pwInput');
  if(pw){pw.value='';setTimeout(()=>pw.focus(),60);}
}
function unlockAs(role){
  sessionStorage.setItem('mv_unlocked','1');
  sessionStorage.setItem('mv_role',role);
  document.getElementById('lockScreen').style.display='none';
  document.getElementById('pwError').style.display='none';
  applyRoleMode();
}
function loginProducer(){unlockAs('producer');}
async function checkPw(){
  const val=document.getElementById('pwInput').value;
  let ok=false;
  try{
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(val));
    const h=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    ok=(h===PW_HASH || val===SIMPLE_PW);
  }catch(e){
    // Fallback for file:// contexts where crypto.subtle may be unavailable
    ok=(val===SIMPLE_PW);
  }
  if(ok){
    unlockAs('admin');
  }else{
    document.getElementById('pwError').style.display='block';
    document.getElementById('pwInput').value='';
    document.getElementById('pwInput').focus();
  }
}
function initLock(){
  if(sessionStorage.getItem('mv_unlocked')==='1'){
    document.getElementById('lockScreen').style.display='none';
    applyRoleMode();
    return;
  }
  document.getElementById('pwInput').focus();
}
initLock();