/* ═══════════════════════════════════════════════
   GEITHUS BINGO — flare.js  (v3)
   Visual polish + per-effect settings panel.
   No edits to main files beyond two include tags.
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════
    //  SETTINGS SCHEMA  (drives UI + defaults)
    // ════════════════════════════════════════════════════════
    const SCHEMA = [
        { group: 'Bakgrunn', items: [
            { key: 'particles',     label: 'Svevende partikler', desc: 'Lysende prikker stiger opp',
              sliders: [{ key: 'particlesDensity',   label: 'Tetthet',   min: 5,  max: 100, step: 5  }] },
            { key: 'numberRain',    label: 'Tallregn',            desc: 'Bingotall 1–90 faller ned',
              sliders: [{ key: 'numberRainDensity',  label: 'Tetthet',   min: 5,  max: 60,  step: 5  }] },
            { key: 'shootingStars', label: 'Stjerneskudd',        desc: 'Lysspor skyter over bakgrunnen',
              sliders: [{ key: 'shootingStarsFreq',  label: 'Frekvens',  min: 3,  max: 40,  step: 1,  unit: 's' }] },
            { key: 'aurora',        label: 'Aurora',              desc: 'Store lysende fargeflekker i bakgrunnen',
              sliders: [{ key: 'auroraOpacity',      label: 'Styrke',    min: 10, max: 200, step: 10  }] },
            { key: 'vignette',      label: 'Vignett',             desc: 'Mørke kanter rundt skjermen',
              sliders: [{ key: 'vignetteIntensity',  label: 'Styrke',    min: 0,  max: 80,  step: 5   }] },
            { key: 'scanlines',     label: 'Skannelinjer',        desc: 'Diskret CRT-linjetekstur',
              sliders: [{ key: 'scanlinesIntensity', label: 'Styrke',    min: 5,  max: 100, step: 5   }] },
        ]},
        { group: 'Header', items: [
            { key: 'headerShimmer', label: 'Glimmer-streif',      desc: 'Periodisk lysstreif over topplinjen',
              sliders: [{ key: 'headerShimmerFreq',  label: 'Frekvens',  min: 4,  max: 60,  step: 1,  unit: 's' }] },
        ]},
        { group: 'Klikk-effekter', items: [
            { key: 'ballRipple',    label: 'Klikk-ring',          desc: 'Ekspanderende ring ved ballklikk' },
            { key: 'ballBurst',     label: 'Partikkeleksplosjon',  desc: 'Partikler spruter ut ved klikk',
              sliders: [{ key: 'ballBurstCount',     label: 'Antall',    min: 4,  max: 30,  step: 2   }] },
            { key: 'ghostNumber',   label: 'Tallspøkelse',         desc: 'Tall flyter opp ved nytt kall' },
            { key: 'ballPulseRing', label: 'Pulserende ring',      desc: 'Klikkede baller har en pustende glødring' },
            { key: 'rekkeFlash',    label: 'Rekke-glimmer',        desc: 'Glimt på rekke-knapper' },
        ]},
        { group: 'Stortall', items: [
            { key: 'bigNumberGlow', label: 'Glødstråle',           desc: 'Lyseksplosjon rundt stortallet ved nytt kall' },
        ]},
        { group: 'Mus', items: [
            { key: 'cursorTrail',   label: 'Musespor',             desc: 'Lysende prikker etter pekeren',
              sliders: [{ key: 'cursorTrailDensity', label: 'Forsinkelse', min: 15, max: 200, step: 5, unit: 'ms' }] },
        ]},
        { group: 'Vinnere', items: [
            { key: 'confetti',      label: 'Konfetti',             desc: 'Fargeregn når vinner logges',
              sliders: [{ key: 'confettiCount',      label: 'Mengde',    min: 20, max: 200, step: 10  }] },
        ]},
    ];

    const DEFAULTS = {
        particles: true,        particlesDensity: 65,
        numberRain: true,       numberRainDensity: 28,
        shootingStars: true,    shootingStarsFreq: 10,
        aurora: true,           auroraOpacity: 70,
        vignette: true,         vignetteIntensity: 52,
        scanlines: true,        scanlinesIntensity: 35,
        headerShimmer: true,    headerShimmerFreq: 13,
        ballRipple: true,
        ballBurst: true,        ballBurstCount: 14,
        ghostNumber: true,
        ballPulseRing: true,
        rekkeFlash: true,
        bigNumberGlow: true,
        cursorTrail: true,      cursorTrailDensity: 42,
        confetti: true,         confettiCount: 100,
    };

    // Active settings (mutated by UI)
    let S = { ...DEFAULTS };

    function loadSettings() {
        try {
            const raw = localStorage.getItem('bingoFlareSettings');
            if (raw) Object.assign(S, JSON.parse(raw));
        } catch(e) {}
    }

    function saveSettings() {
        localStorage.setItem('bingoFlareSettings', JSON.stringify(S));
    }

    loadSettings();

    // ── Helpers ──────────────────────────────────────────────
    function getAccent() {
        return getComputedStyle(document.body)
            .getPropertyValue('--accent-color').trim() || '#F1B924';
    }

    function hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [241,185,36];
    }

    // Cached RGB — avoids per-frame getComputedStyle calls in the animation loop
    let cachedRGB = [241, 185, 36];

    // ════════════════════════════════════════════════════════
    //  APPLY ALL SETTINGS  (CSS vars + body classes + timers)
    // ════════════════════════════════════════════════════════
    function applyAllSettings() {
        const root = document.documentElement;

        root.style.setProperty('--flare-vignette',
            S.vignette  ? (S.vignetteIntensity  / 100).toFixed(2)  : '0');
        root.style.setProperty('--flare-scanlines',
            S.scanlines ? (S.scanlinesIntensity  / 1000).toFixed(4) : '0');
        root.style.setProperty('--flare-aurora-opacity',
            S.aurora    ? (S.auroraOpacity       / 1000).toFixed(4) : '0');

        // CSS-controlled toggle
        document.body.classList.toggle('flare-no-pulse-ring', !S.ballPulseRing);

        // Refresh cached accent colour and aurora blob backgrounds
        cachedRGB = hexToRgb(getAccent());
        const [r, g, b] = cachedRGB;
        blobs.forEach(blob => { blob.el.style.background = `rgba(${r},${g},${b},1)`; });

        // Restart schedulers so frequency changes take effect immediately
        scheduleNextStar();
        scheduleNextShimmer();
    }

    // ════════════════════════════════════════════════════════
    //  CANVAS  (particles · number rain · shooting stars)
    // ════════════════════════════════════════════════════════
    const MAX_PARTS = 100;
    const MAX_RAIN  = 60;

    const cvs = document.createElement('canvas');
    cvs.id = 'flare-canvas';
    document.body.prepend(cvs);
    const ctx = cvs.getContext('2d');
    let W, H;

    function resize() { W = cvs.width = window.innerWidth; H = cvs.height = window.innerHeight; }
    window.addEventListener('resize', resize);
    resize();

    const particles = Array.from({ length: MAX_PARTS }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.4,
        vy: -(Math.random() * 0.22 + 0.06),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.007 + 0.002,
        alpha: Math.random() * 0.28 + 0.04,
    }));

    const rainDrops = Array.from({ length: MAX_RAIN }, () => ({
        x:    Math.random() * window.innerWidth,
        y:    Math.random() * window.innerHeight,
        num:  Math.floor(Math.random() * 90) + 1,
        vy:   Math.random() * 0.28 + 0.08,
        alpha: Math.random() * 0.09 + 0.02,
        size: Math.floor(Math.random() * 6) + 10,
    }));

    // — Shooting stars —
    let stars      = [];
    let starTimer  = null;

    function spawnStar() {
        stars.push({
            x: Math.random() * W * 0.65, y: Math.random() * H * 0.55,
            len: Math.random() * 130 + 60, speed: Math.random() * 7 + 4,
            alpha: 1, angle: Math.PI / 5 + (Math.random() - 0.5) * 0.35,
        });
    }

    function scheduleNextStar() {
        clearTimeout(starTimer);
        if (!S.shootingStars) return;
        const delay = (S.shootingStarsFreq || 10) * 1000 * (0.5 + Math.random());
        starTimer = setTimeout(() => { spawnStar(); scheduleNextStar(); }, delay);
    }

    function mainLoop() {
        ctx.clearRect(0, 0, W, H);
        const [r, g, b] = cachedRGB;

        // Particles
        const pCount = S.particles
            ? Math.round(S.particlesDensity * MAX_PARTS / 100) : 0;
        for (let i = 0; i < pCount; i++) {
            const p = particles[i];
            p.wobble += p.wobbleSpeed;
            p.x += Math.sin(p.wobble) * 0.45;
            p.y += p.vy;
            if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
            ctx.fill();
        }

        // Number rain
        const rCount = S.numberRain
            ? Math.round(S.numberRainDensity * MAX_RAIN / 60) : 0;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < rCount; i++) {
            const d = rainDrops[i];
            d.y += d.vy;
            if (d.y > H + 20) {
                d.y = -20; d.x = Math.random() * W;
                d.num = Math.floor(Math.random() * 90) + 1;
            }
            ctx.font      = `bold ${d.size}px "Trebuchet MS", sans-serif`;
            ctx.fillStyle = `rgba(${r},${g},${b},${d.alpha})`;
            ctx.fillText(d.num, d.x, d.y);
        }

        // Shooting stars
        if (S.shootingStars) {
            stars = stars.filter(s => s.alpha > 0.015);
            for (const s of stars) {
                s.x += Math.cos(s.angle) * s.speed;
                s.y += Math.sin(s.angle) * s.speed;
                s.alpha *= 0.962;
                const tx = s.x - Math.cos(s.angle) * s.len;
                const ty = s.y - Math.sin(s.angle) * s.len;
                const g2 = ctx.createLinearGradient(s.x, s.y, tx, ty);
                g2.addColorStop(0,   `rgba(${r},${g},${b},${s.alpha})`);
                g2.addColorStop(0.4, `rgba(${r},${g},${b},${s.alpha * 0.35})`);
                g2.addColorStop(1,   `rgba(${r},${g},${b},0)`);
                ctx.strokeStyle = g2;
                ctx.lineWidth   = 1.6;
                ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
            }
        }

        // Aurora blob position animation (merged here to share a single rAF + cachedRGB)
        blobs.forEach(blob => {
            blob.phase += 0.004;
            blob.el.style.left = `${blob.baseX + Math.sin(blob.phase) * 10}%`;
            blob.el.style.top  = `${blob.baseY + Math.cos(blob.phase * 0.65) * 5}%`;
        });

        requestAnimationFrame(mainLoop);
    }
    // mainLoop() is started after blobs are initialised below

    // ════════════════════════════════════════════════════════
    //  OVERLAY  (vignette + scanlines — opacity via CSS vars)
    // ════════════════════════════════════════════════════════
    const overlay = document.createElement('div');
    overlay.id = 'flare-overlay';
    document.body.appendChild(overlay);

    // ════════════════════════════════════════════════════════
    //  AURORA BLOBS
    // ════════════════════════════════════════════════════════
    const auroraWrap = document.createElement('div');
    auroraWrap.id = 'flare-aurora';
    document.body.appendChild(auroraWrap);

    const blobs = Array.from({ length: 3 }, (_, i) => {
        const el = document.createElement('div');
        el.className = 'flare-aurora-blob';
        auroraWrap.appendChild(el);
        return { el, phase: (i / 3) * Math.PI * 2, baseX: 18 + i * 28, baseY: 80 };
    });

    mainLoop(); // Unified animation loop (canvas + aurora)

    // ════════════════════════════════════════════════════════
    //  HEADER SHIMMER
    // ════════════════════════════════════════════════════════
    let shimmerTimer = null;

    function doHeaderShimmer() {
        const header = document.querySelector('.flex-container');
        if (header) {
            const sh = document.createElement('div');
            sh.className = 'flare-header-shimmer';
            header.appendChild(sh);
            sh.addEventListener('animationend', () => sh.remove(), { once: true });
        }
    }

    function scheduleNextShimmer() {
        clearTimeout(shimmerTimer);
        if (!S.headerShimmer) return;
        const delay = (S.headerShimmerFreq || 13) * 1000 * (0.7 + Math.random() * 0.6);
        shimmerTimer = setTimeout(() => { doHeaderShimmer(); scheduleNextShimmer(); }, delay);
    }

    // ════════════════════════════════════════════════════════
    //  EVENT-DRIVEN EFFECTS
    // ════════════════════════════════════════════════════════

    // Ball click: ripple + burst + ghost
    document.addEventListener('click', e => {
        const ball = e.target.closest?.('.balls');
        if (!ball) return;
        const rect = ball.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;

        // Ripple
        if (S.ballRipple) {
            const el = document.createElement('div');
            el.className     = 'flare-ripple';
            el.style.cssText = `left:${cx}px;top:${cy}px`;
            document.body.appendChild(el);
            el.addEventListener('animationend', () => el.remove(), { once: true });
        }

        // Particle burst
        if (S.ballBurst) {
            const N = S.ballBurstCount;
            for (let i = 0; i < N; i++) {
                const angle = (i / N) * Math.PI * 2 + Math.random() * 0.4;
                const dist  = Math.random() * 55 + 18;
                const size  = Math.random() * 4 + 2;
                const dot   = document.createElement('div');
                dot.className     = 'flare-burst-dot';
                dot.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;`
                                  + `--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px`;
                document.body.appendChild(dot);
                dot.addEventListener('animationend', () => dot.remove(), { once: true });
            }
        }

        // Ghost (only on fresh select — check after main handler fires)
        if (S.ghostNumber) {
            setTimeout(() => {
                if (!ball.classList.contains('clicked')) return;
                const num = ball.textContent.trim();
                if (!num) return;
                const ghost = document.createElement('div');
                ghost.className    = 'flare-ghost';
                ghost.textContent  = num;
                ghost.style.cssText = `left:${cx}px;top:${rect.top}px`;
                document.body.appendChild(ghost);
                ghost.addEventListener('animationend', () => ghost.remove(), { once: true });
            }, 0);
        }
    });

    // Big-number glow burst
    const bigNum  = document.getElementById('big-number');
    const bigText = document.getElementById('big-number-text');
    if (bigNum && bigText) {
        new MutationObserver(() => {
            if (!S.bigNumberGlow) return;
            const txt = bigText.textContent.replace(/\u200B/g, '').trim();
            if (!txt) return;
            const rect = bigNum.getBoundingClientRect();
            const glow = document.createElement('div');
            glow.className    = 'flare-big-glow';
            glow.style.cssText = `left:${rect.left + rect.width/2}px;top:${rect.top + rect.height/2}px`;
            document.body.appendChild(glow);
            glow.addEventListener('animationend', () => glow.remove(), { once: true });
        }).observe(bigText, { childList: true, characterData: true, subtree: true });
    }

    // Cursor sparkle trail
    let lastTrail = 0;
    document.addEventListener('mousemove', e => {
        if (!S.cursorTrail) return;
        const now = Date.now();
        if (now - lastTrail < S.cursorTrailDensity) return;
        lastTrail = now;
        const dot = document.createElement('div');
        dot.className    = 'flare-cursor-dot';
        dot.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
        document.body.appendChild(dot);
        dot.addEventListener('animationend', () => dot.remove(), { once: true });
    });

    // Confetti on winner modal open
    const CONFETTI_COLORS = [
        '#f0c030','#ff4444','#00aeff','#ff0096',
        '#44ff88','#ffffff','#ff8800','#cc44ff',
    ];

    function spawnConfetti() {
        const count = S.confettiCount;
        let i = 0;
        function next() {
            if (i >= count) return;
            const clr = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
            const c   = document.createElement('div');
            c.className     = 'flare-confetti';
            c.style.cssText = `left:${Math.random()*100}vw;top:-20px;`
                + `width:${Math.random()*9+4}px;height:${Math.random()*5+3}px;`
                + `background:${clr};border-radius:${Math.random()>.5?'50%':'2px'};`
                + `--fall:${Math.random()*55+65}vh;`
                + `--drift:${(Math.random()-.5)*130}px;`
                + `--rot:${Math.random()*720-360}deg;`
                + `animation-duration:${Math.random()*1.8+1.4}s;`
                + `animation-delay:${Math.random()*0.6}s`;
            document.body.appendChild(c);
            c.addEventListener('animationend', () => c.remove(), { once: true });
            i++;
            setTimeout(next, 20);
        }
        next();
    }

    const winnerModal = document.getElementById('winner-modal');
    if (winnerModal) {
        let wasHidden = true;
        new MutationObserver(() => {
            const visible = winnerModal.style.display === 'flex';
            if (visible && wasHidden && S.confetti) spawnConfetti();
            wasHidden = !visible;
        }).observe(winnerModal, { attributes: true, attributeFilter: ['style'] });
    }

    // Rekke button flash
    document.addEventListener('click', e => {
        if (!S.rekkeFlash) return;
        const btn = e.target.closest?.('.rekke-btn, .rekke-confirm-btn');
        if (!btn) return;
        btn.classList.remove('flare-rekke-flash');
        void btn.offsetWidth;
        btn.classList.add('flare-rekke-flash');
        btn.addEventListener('animationend', () => btn.classList.remove('flare-rekke-flash'), { once: true });
    });

    // ════════════════════════════════════════════════════════
    //  SETTINGS PANEL  (injected into the existing modal)
    // ════════════════════════════════════════════════════════

    const SLIDER_UNITS = new Map(
        SCHEMA.flatMap(sec => sec.items)
              .flatMap(item => (item.sliders || []).map(sl => [sl.key, sl.unit || '']))
    );
    function sliderUnit(key) { return SLIDER_UNITS.get(key) ?? ''; }

    function buildPanelHTML() {
        let h = '<h3 class="settings-panel-title">✨ Visuelle effekter</h3>';
        for (const sec of SCHEMA) {
            h += `<div class="flare-group-label">${sec.group}</div>`;
            for (const item of sec.items) {
                h += `
                  <div class="settings-row">
                    <div class="settings-label">
                      <span>${item.label}</span>
                      <span class="settings-desc">${item.desc}</span>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" class="flare-chk" data-key="${item.key}"
                             ${S[item.key] ? 'checked' : ''}>
                      <span class="settings-toggle-track"></span>
                    </label>
                  </div>`;
                if (item.sliders) {
                    for (const sl of item.sliders) {
                        const hidden = S[item.key] ? '' : 'style="display:none"';
                        h += `
                          <div class="settings-row flare-sl-row" data-parent="${item.key}" ${hidden}>
                            <span class="settings-desc" style="flex:1;padding-left:8px">
                              ↳ ${sl.label}
                            </span>
                            <input type="range" class="flare-range" style="width:110px"
                                   data-key="${sl.key}"
                                   min="${sl.min}" max="${sl.max}" step="${sl.step||1}"
                                   value="${S[sl.key]}">
                            <span class="flare-val" data-key="${sl.key}"
                                  style="min-width:42px;text-align:right;font-size:.82rem;
                                         color:rgba(255,255,255,.55)">
                              ${S[sl.key]}${sl.unit||''}
                            </span>
                          </div>`;
                    }
                }
            }
        }
        h += `<div class="settings-row" style="margin-top:6px;padding-top:14px;
                    border-top:1px solid rgba(255,255,255,.07)">
                <button class="modal-btn session-action-btn session-edit-btn"
                        id="flare-reset-btn"
                        style="font-size:.78rem;padding:5px 14px">
                  ↩ Tilbakestill alle effekter
                </button>
              </div>`;
        return h;
    }

    function syncSliderRow(panel, parentKey, visible) {
        panel.querySelectorAll(`.flare-sl-row[data-parent="${parentKey}"]`)
             .forEach(r => r.style.display = visible ? '' : 'none');
    }

    function wirePanel(panel) {
        // Toggles
        panel.querySelectorAll('.flare-chk').forEach(chk => {
            chk.addEventListener('change', () => {
                const key = chk.dataset.key;
                S[key] = chk.checked;
                syncSliderRow(panel, key, chk.checked);
                saveSettings();
                applyAllSettings();
            });
        });

        // Sliders
        panel.querySelectorAll('.flare-range').forEach(rng => {
            rng.addEventListener('input', () => {
                const key = rng.dataset.key;
                S[key] = Number(rng.value);
                const valEl = panel.querySelector(`.flare-val[data-key="${key}"]`);
                if (valEl) valEl.textContent = rng.value + sliderUnit(key);
                saveSettings();
                applyAllSettings();
            });
        });

        // Reset all
        panel.querySelector('#flare-reset-btn')?.addEventListener('click', () => {
            Object.assign(S, DEFAULTS);
            saveSettings();
            // Refresh all controls
            panel.querySelectorAll('.flare-chk').forEach(chk => {
                chk.checked = S[chk.dataset.key];
                syncSliderRow(panel, chk.dataset.key, chk.checked);
            });
            panel.querySelectorAll('.flare-range').forEach(rng => {
                rng.value = S[rng.dataset.key];
                const valEl = panel.querySelector(`.flare-val[data-key="${rng.dataset.key}"]`);
                if (valEl) valEl.textContent = rng.value + sliderUnit(rng.dataset.key);
            });
            applyAllSettings();
        });
    }

    function injectSettingsPanel() {
        const nav     = document.querySelector('.settings-nav');
        const content = document.querySelector('.settings-content');
        if (!nav || !content) return;

        // Nav button (will be auto-bound by openSettingsModal since it uses querySelectorAll)
        const btn = document.createElement('button');
        btn.className    = 'settings-nav-item';
        btn.dataset.panel = 'sg-flare';
        btn.textContent  = '✨ Effekter';
        const spacer = nav.querySelector('.settings-nav-spacer');
        spacer ? nav.insertBefore(btn, spacer) : nav.appendChild(btn);

        // Panel
        const panel = document.createElement('div');
        panel.className = 'settings-panel';
        panel.id        = 'sg-flare';
        panel.innerHTML = buildPanelHTML();
        content.appendChild(panel);

        wirePanel(panel);
    }

    injectSettingsPanel();

    // ── Kick everything off ──────────────────────────────────
    applyAllSettings();
    scheduleNextStar();
    scheduleNextShimmer();

})();
