
/*
 * How it works: on reddit.com an IntersectionObserver watches every Reddit
 * <video>/<shreddit-player> and every embedded RedGifs iframe. The clip that is
 * in view is played with sound; the previous one is paused and muted. RedGifs
 * runs inside a cross-origin iframe (in shadow DOM), so the script talks to its
 * own copy inside that iframe via postMessage.
 *
 * REQUIREMENT: allow autoplay-with-sound for these sites, or the browser blocks
 * the unmuted play() and clips stay paused. In Brave/Chrome:
 *   brave://settings/content/autoplay  ->  Allowed  ->  add [*.]reddit.com and [*.]redgifs.com
 * See the README for details.
 */
(() => {
  // ---------- config ----------
  const VOLUME = 0.6;         // 0–1, volume of the active clip
  const THRESHOLD = 0.6;      // fraction of the clip that must be visible …
  const VIEWPORT_FILL = 0.5;  // … OR fraction of screen height it fills (for tall/portrait clips)
  const PAUSE_WHEN_HIDDEN = true; // pause everything when the tab is hidden / screen is locked
  const DEBUG = false;        // set true for a small status line (helps when troubleshooting an install)

  // ---------- status box (only when DEBUG) ----------
  const box = (() => {
    if (!DEBUG) return { el: null, set() {} };
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;z-index:2147483647;right:6px;bottom:6px;max-width:46vw;font:11px/1.35 monospace;background:#000c;color:#0f0;padding:4px 6px;border-radius:4px;white-space:pre-wrap;pointer-events:none';
    (document.body || document.documentElement).appendChild(el);
    const lines = {};
    return { el, set(k, v) { if (lines[k] === v) return; lines[k] = v; el.textContent = Object.entries(lines).map(([a, b]) => a + ': ' + b).join('\n'); } };
  })();
  const inIframe = window.top !== window;
  const onlyBox = recs => box.el && recs.every(r => r.target === box.el || box.el.contains(r.target));

  // Keep a <video> in the desired state even when the player pauses/mutes itself
  // (loop, quality change). If the user clicks in the player, the next pause is
  // treated as intentional until the next explicit 'play' command.
  const makeKeeper = (getState, report) => {
    let userPaused = false, lastClick = 0;
    document.addEventListener('pointerdown', () => { lastClick = Date.now(); }, true);
    const hook = new WeakSet();
    const enforce = (v) => {
      const want = (PAUSE_WHEN_HIDDEN && document.hidden) ? 'pause' : getState(v);
      if (want === 'play') {
        if (userPaused) { report('paused (you clicked)'); return; }
        if (v.muted || v.volume === 0) { v.muted = false; v.volume = VOLUME; }
        if (v.paused) v.play().then(() => report('PLAY ok, muted=' + v.muted)).catch(e => report('PLAY FAIL ' + e.name + ': ' + e.message));
        else report('playing, muted=' + v.muted);
      } else {
        if (!v.muted) v.muted = true;
        if (!v.paused) v.pause();
        report('paused');
      }
    };
    const attach = (v) => {
      if (hook.has(v)) return; hook.add(v);
      v.addEventListener('pause', () => { if (getState(v) === 'play') { if (Date.now() - lastClick < 1500) userPaused = true; else setTimeout(() => enforce(v), 50); } });
      v.addEventListener('volumechange', () => { if (getState(v) === 'play' && !userPaused && (v.muted || v.volume === 0)) setTimeout(() => enforce(v), 50); });
      v.addEventListener('ended', () => { if (getState(v) === 'play' && !userPaused) v.play().catch(() => {}); });
    };
    return { enforce, attach, reset() { userPaused = false; } };
  };

  // ---------- Inside the RedGifs player (iframe on Reddit, or a /watch page) ----------
  if (location.hostname.endsWith('redgifs.com')) {
    const standalone = location.pathname.startsWith('/watch/');
    let last = standalone ? 'play' : 'pause';
    const report = (msg) => { box.set('rg', msg); if (inIframe) window.parent.postMessage({ rrgAck: msg }, '*'); };
    const keeper = makeKeeper(() => last, report);
    let armed = standalone; // in an iframe: touch nothing until the Reddit page sends a command
    // After Reddit removes RedGifs iframes that have played sound, the clips that follow stall (seen in
    // Chrome 154): they still count as playing, but neither sound nor picture moves until the page is
    // reloaded. Sound routed through an AudioContext in the clip's own iframe is not affected, so the
    // clips we play with sound go that way.
    let ctx = null, on = false; // on: what we last asked the context to be
    const wired = new WeakSet();
    const wire = () => {
      if (!on || ctx.state !== 'running') return; // not (yet) allowed to start: clips stay on the normal path
      for (const v of document.querySelectorAll('video')) {
        // only same-origin (blob:) media may be routed; anything else would come out silent
        if (wired.has(v) || !v.currentSrc.startsWith('blob:')) continue;
        wired.add(v);
        try { ctx.createMediaElementSource(v).connect(ctx.destination); } catch (e) {}
      }
    };
    const ownAudio = () => {
      if (!inIframe) return;
      try { ctx = ctx || new AudioContext(); } catch (e) { return; }
      if (!on) { on = true; ctx.resume().then(wire, () => {}); }
      wire();
    };
    const apply = () => {
      if (!armed) return;
      if (last === 'play' && !(PAUSE_WHEN_HIDDEN && document.hidden)) ownAudio();
      else if (ctx && on) { on = false; ctx.suspend().catch(() => {}); }
      const vids = document.querySelectorAll('video');
      if (!vids.length) { report('no <video> yet'); return; }
      for (const v of vids) { keeper.attach(v); keeper.enforce(v); }
    };
    window.addEventListener('message', e => {
      if (e.data && e.data.rrgCmd) { armed = true; last = e.data.rrgCmd; if (last === 'play') keeper.reset(); apply(); }
    });
    new MutationObserver(recs => { if (!onlyBox(recs)) apply(); }).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(apply, 1000); // fallback if the player changes state without a DOM event
    document.addEventListener('visibilitychange', () => { if (document.hidden) apply(); else if (last === 'play') { keeper.reset(); apply(); } });
    report('script loaded, waiting for ' + (standalone ? 'nothing (watch)' : 'reddit'));
    apply();
    // Commands sent before this script finished loading are lost (Reddit creates the
    // iframe lazily, and the userscript manager can inject at document-idle = sometimes
    // AFTER load) -> ask the parent for the current state once we're ready.
    if (inIframe) window.parent.postMessage({ rrgHello: true }, '*');
    return;
  }

  // ---------- On Reddit: drive playback from what is in view ----------
  box.set('script', 'loaded on reddit (ON)');
  window.addEventListener('message', e => {
    if (!e.data) return;
    if (e.data.rrgAck) box.set('iframe reply', e.data.rrgAck);
    if (e.data.rrgHello) { const f = iframes.find(el => el.isConnected && el.contentWindow === e.source); if (f) control(f, f === active ? 'play' : 'pause'); }
  });

  let active = null;
  const findVideo = el => el.tagName === 'VIDEO' ? el
    : (el.shadowRoot && el.shadowRoot.querySelector('video')) || el.querySelector('video');
  // keeper only keeps the ACTIVE Reddit clip going; the others are left paused
  const keeper = makeKeeper(v => (active && findVideo(active) === v) ? 'play' : 'pause', msg => box.set('reddit-video', msg));
  const control = (el, cmd) => {
    if (el.tagName === 'IFRAME') {
      box.set('sending', cmd + ' -> iframe ' + (el.src || '').slice(0, 50));
      el.contentWindow && el.contentWindow.postMessage({ rrgCmd: cmd }, '*'); return;
    }
    const v = findVideo(el);
    if (!v) { box.set('sending', cmd + ' -> ' + el.tagName + ' (no <video> found)'); return; }
    if (cmd === 'play') { keeper.reset(); keeper.attach(v); keeper.enforce(v); }
    else { v.pause(); v.muted = true; box.set('sending', 'pause -> ' + el.tagName); }
  };
  const visibleEnough = en => en.intersectionRatio >= THRESHOLD
    || (en.isIntersecting && en.intersectionRect.height >= VIEWPORT_FILL * window.innerHeight);
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (visibleEnough(en)) {
        if (active && active !== en.target) control(active, 'pause');
        if (active !== en.target) { active = en.target; box.set('active', active.tagName.toLowerCase()); control(active, 'play'); }
      } else if (en.target === active) {
        control(active, 'pause'); active = null; box.set('active', '-');
      }
    }
  }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });

  const SEL = 'iframe[src*="redgifs.com"], shreddit-player, shreddit-player-2, video';
  const counts = { iframe: 0, player: 0, video: 0 };
  const seen = new WeakSet();   // elements already handed to the IntersectionObserver
  const roots = new WeakSet();  // shadow roots already being watched
  const iframes = [];           // registered RedGifs iframes (for the hello lookup)

  const register = (el) => {
    if (seen.has(el)) return; seen.add(el); io.observe(el);
    counts[el.tagName === 'IFRAME' ? 'iframe' : el.tagName === 'VIDEO' ? 'video' : 'player']++;
    if (el.tagName === 'IFRAME') { iframes.push(el); el.addEventListener('load', () => control(el, el === active ? 'play' : 'pause')); }
    box.set('tracking', `redgifs-iframes ${counts.iframe}, reddit-players ${counts.player}, video ${counts.video}`);
  };

  // Scan ONE subtree — cost is proportional to that subtree, never the whole page. Registers
  // matching elements and hooks any shadow roots so their internal changes arrive as events
  // instead of forcing a full-document re-walk (that O(DOM) re-walk on every mutation was what
  // made the page lag more and more the longer you scrolled).
  const process = (node) => {
    if (!node) return;
    if (node.nodeType === 1) {                 // an element
      if (node.matches(SEL)) register(node);
      if (node.shadowRoot) hookRoot(node.shadowRoot);
    } else if (node.nodeType !== 11) return;   // allow shadow roots / fragments (11); skip text etc.
    if (node.querySelectorAll) {
      node.querySelectorAll(SEL).forEach(register);
      node.querySelectorAll('*').forEach(el => { if (el.shadowRoot) hookRoot(el.shadowRoot); });
    }
  };
  // Reddit builds the RedGifs embed inside shadow DOM, which a document-level observer can't
  // see — so watch each shadow root directly. Only fires on real changes, so it stays cheap.
  const hookRoot = (root) => {
    if (roots.has(root)) return; roots.add(root);
    process(root);
    new MutationObserver(recs => { for (const r of recs) r.addedNodes.forEach(process); }).observe(root, { childList: true, subtree: true });
  };

  document.addEventListener('visibilitychange', () => { if (active) control(active, document.hidden ? 'pause' : 'play'); });
  process(document.documentElement); // initial sweep
  // A few catch-up sweeps in the first seconds cover injection-timing races (the userscript
  // manager may run before Reddit finished its first paint). Startup only, so no ongoing cost.
  [400, 1200, 3000].forEach(t => setTimeout(() => process(document.documentElement), t));
  // Re-assert play on the active RedGifs iframe (postMessage has no delivery guarantee, and an
  // iframe may have reloaded). No DOM walk here, so this stays cheap however far you scroll.
  setInterval(() => { if (active && active.tagName === 'IFRAME') control(active, 'play'); }, 1500);
  // React only to what was ADDED — never re-walk the whole (growing) document.
  new MutationObserver(recs => { if (onlyBox(recs)) return; for (const r of recs) r.addedNodes.forEach(process); }).observe(document.documentElement, { childList: true, subtree: true });
})();
