/* =====================================================
   ERROR LOG — captures runtime errors to localStorage
   ring buffer of last 50, viewable from nav menu.
   ===================================================== */
(function () {
    const KEY = 'bingoErrorLog';
    const MAX = 50;
    function read() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
    }
    function write(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (e) {}
    }
    function record(kind, msg, stack, extra) {
        const list = read();
        list.push({
            ts: Date.now(),
            kind,
            msg: String(msg || '').slice(0, 500),
            stack: String(stack || '').slice(0, 2000),
            url: location.href,
            ua: navigator.userAgent,
            extra: extra || null,
        });
        write(list);
        // Notify if a viewer is open
        if (typeof window.__bingoErrLogChanged === 'function') {
            try { window.__bingoErrLogChanged(); } catch (e) {}
        }
    }
    window.addEventListener('error', e => {
        record('error', e.message, e.error && e.error.stack, {
            file: e.filename, line: e.lineno, col: e.colno,
        });
    });
    window.addEventListener('unhandledrejection', e => {
        const r = e.reason;
        record('promise', r && r.message ? r.message : String(r), r && r.stack);
    });
    window.bingoErrorLog = {
        get: read,
        clear: () => { write([]); if (typeof window.__bingoErrLogChanged === 'function') window.__bingoErrLogChanged(); },
        record,
    };
})();

const RE4_HOVER_WAV = 'Sounds/re4-hover.wav';
const RE4_CANCEL_WAV = 'Sounds/re4-cancel.wav';
const RE4_CANCEL_BIG_WAV = 'Sounds/re4-cancel-big.wav';
const RE4_HOVER_LOUD_WAV = 'Sounds/re4-hover-loud.wav';
const RE4_SELECT_WAV = 'Sounds/re4-select.wav';
const RE4_SELECT_NUMBER_WAV = 'Sounds/re4-select-number.wav';
const RE4_SWITCH_WAV = 'Sounds/re4-switch.wav';
const RE4_SWITCH_2_WAV = 'Sounds/re4-switch-2.wav';
const CLICK_WAV = 'Sounds/click.wav';
const CLICK_2_WAV = 'Sounds/click_2.wav';
const CLICK_AND_HOVER_WAV = 'Sounds/click_and_hover.wav';
const CLICK_AND_HOVER_2_WAV = 'Sounds/click_and_hover_2.wav';
const CLICK_AND_HOVER_3_WAV = 'Sounds/click_and_hover_3.wav';
const CLICK_JACKPOT_WAV = 'Sounds/click__and_for_clicking_on_a_number_with_jackpot_active.wav';
const CLOSE_WAV = 'Sounds/close.wav';
const SAVE_CONFIRM_2_WAV = 'Sounds/save_and_confirm_2.wav';
const OVERTIME_WAV = 'Sounds/when_you_enter_overtime__should_play_after_the_number_click_sound_is_done.wav';
const FIRSTNUMBER_WAV = 'Sounds/fxprosound-metal-plate-gong-4-248610.wav';

// All bundled sounds available for selection in the upload modal
const BUNDLED_SOUNDS = [
    { src: CLICK_WAV,             name: 'Click' },
    { src: CLICK_2_WAV,           name: 'Click 2' },
    { src: CLICK_AND_HOVER_WAV,   name: 'Click + Hover' },
    { src: CLICK_AND_HOVER_2_WAV, name: 'Click + Hover 2' },
    { src: CLICK_AND_HOVER_3_WAV, name: 'Click + Hover 3' },
    { src: CLICK_JACKPOT_WAV,     name: 'Click (jackpot)' },
    { src: CLOSE_WAV,             name: 'Close' },
    { src: RE4_HOVER_WAV,         name: 'RE4 Hover' },
    { src: RE4_HOVER_LOUD_WAV,    name: 'RE4 Hover Loud' },
    { src: RE4_SELECT_WAV,        name: 'RE4 Select' },
    { src: RE4_SELECT_NUMBER_WAV, name: 'RE4 Select Number' },
    { src: RE4_SWITCH_WAV,        name: 'RE4 Switch' },
    { src: RE4_SWITCH_2_WAV,      name: 'RE4 Switch 2' },
    { src: RE4_CANCEL_WAV,        name: 'RE4 Cancel' },
    { src: RE4_CANCEL_BIG_WAV,    name: 'RE4 Cancel Big' },
    { src: SAVE_CONFIRM_2_WAV,    name: 'Save / Confirm 2' },
    { src: OVERTIME_WAV,          name: 'Overtid' },
    { src: 'Sounds/62274159.wav', name: '62274159' },
    { src: FIRSTNUMBER_WAV,       name: 'Metal Plate Gong' },
];

/* =====================================================
   GEITHUS BINGO — script.js
   ===================================================== */

// Game themes in order: default = no game, others = game 1-4
const GAME_THEMES = ['blue', 'yellow', 'pink', 'grey'];
const COLOR_THEMES = ['default', 'blue', 'yellow', 'pink', 'grey']; // includes editable default
const GAME_NAMES  = { default: 'Standard', blue: 'Spill 1', yellow: 'Spill 2', pink: 'Spill 3', grey: 'Spill 4' };
const THEME_COLORS = { blue: '#007bff', yellow: '#ffdd00', pink: '#ff0095', grey: '#ffcd9e' };
const DEFAULT_THEME_COLORS = {
    default: { accent: '#F1B924', primary: '#101c2d', balls: '#4c586b', danger: '#ff4444', winner: '#f0c030' },
    blue:    { accent: '#007bff', primary: '#0c0d32', balls: '#323867', danger: '#fe345c', winner: '#f9da3e' },
    yellow:  { accent: '#ffdd00', primary: '#121216', balls: '#42424d', danger: '#ff4444', winner: '#d58907' },
    pink:    { accent: '#ff0095', primary: '#140c27', balls: '#60395e', danger: '#ff2450', winner: '#ef8c2e' },
    grey:    { accent: '#ffcd9e', primary: '#16161d', balls: '#4b464e', danger: '#ff4444', winner: '#f0c030' },
};
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    return m ? `${parseInt(m[1],16)}, ${parseInt(m[2],16)}, ${parseInt(m[3],16)}` : null;
}

// Prize amounts per game (index 0=blue/spill1, 1=yellow/spill2, 2=pink/spill3, 3=grey/spill4)
const PRIZES = {
    blue:   { Rekke1: 300, Rekke2: 500, Rekke3: 1000 },
    yellow: { Rekke1: 300, Rekke2: 500, Rekke3: 1000 },
    pink:   { Rekke1: 300, Rekke2: 500, Rekke3: 1500 },
    grey:   { Rekke1: 300, Rekke2: 500, Rekke3: 2000 },
};

const DEFAULT_THRESHOLDS = {
    Rekke1: { threshold: 16, startingPoint: 0  },
    Rekke2: { threshold: 39, startingPoint: 16 },
    Rekke3: { threshold: 57, startingPoint: 39 },
};

// Creates a fresh per-slot state
function freshSlotState() {
    return {
        selectedNumbers:            [],   // array so we can serialize to localStorage
        currentRekke:               'Rekke1',
        countAtLastRekkeChange:     0,    // for tooltip suppression
        thresholds:      JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS)),
        bigNumber:       '',
        jackpotNumber:   null,
        loggedRekkes:    { Rekke1: null, Rekke2: null, Rekke3: null },
        overtimeFired:   { Rekke1: false, Rekke2: false, Rekke3: false },
    };
}

class BingoApp {
    constructor() {
        // 5 slots: default + 4 game themes
        this.slots        = {};
        this.currentTheme = 'default';
        this.jackpotMode  = false;
        this.resetConfirm = false;
        // Custom theme colors (loaded from storage, fallback to defaults)
        this.themeColors = {
            default: { ...DEFAULT_THEME_COLORS.default },
            blue:    { ...DEFAULT_THEME_COLORS.blue },
            yellow:  { ...DEFAULT_THEME_COLORS.yellow },
            pink:    { ...DEFAULT_THEME_COLORS.pink },
            grey:    { ...DEFAULT_THEME_COLORS.grey },
        };
        this.inactivityTimer = null;

        // Pending rekke change (waiting for modal confirmation)
        this.pendingRekke = null;

        // Keyboard input state
        this.typingBuffer        = '';
        this.typingTimer         = null;
        this._typingHighlighted  = new Set(); // tracks balls with typing-preview/digit-match

        // Winner logging state
        this.winnerSplitCount      = 1;
        this.winnerSelectedPlayers = [];  // array for multi-select
        this.editingSessionIdx     = null;
        this.deletingPlayerIdx     = null;
        this.currentHistoryPlayer  = null;
        this.unsavedDiscardFn      = null;  // callback for confirmed discard

        // Average filter (null = all sessions)
        this.avgFilter = null;

        // BingoView Firebase channel — listeners are registered on child
        // paths; their detach functions live here so a reconnect can remove
        // them (parent ref.off() does NOT detach child-path listeners).
        this._bvChannelDetachFns = [];

        // Win being edited in the edit-win modal:
        // { source: 'pending'|'session'|'manual', sessionIdx?, winIdx }
        this._editWinCtx = null;

        // Settings
        this.settings = {
            progressEnabled: true,
            progressDuration: 14,
            progressStyle: 'doubleWave',
            countdownFixed:  false,
            countdownTime:   '22:08',
            oneWay:          false,
            tooltipEnabled:  true,
            chancesVisible:  false,
            countdownVisible: true,
            soundEnabled:    true,
            hoverStyle:      're4-loud',
            callStyle:       're4-select-number',
            selectStyle:     're4-select',
            switchStyle:     're4-switch',
            confirmStyle:    're4-switch',
            cancelStyle:     're4-cancel',
            resetStyle:      're4-cancel-big',
            resetHardStyle:  're4-cancel-big',
            overtimeStyle:   'custom-62274159',
            overtimeEnabled: true,
            volOvertime: 1,
            typingDelay: 5,
            typingOverwrite: false,
            typingOverwriteDelay: 10,
            ballAnimStyle: 'spin',
            gridLayout: 'horizontal',
            volHover:   1,
            volCall:    1,
            volSelect:  1,
            volSwitch:  1,
            volConfirm: 1,
            volCancel:  1,
            volReset:   1,
            volResetHard: 1,
            firstRekkeStyle: 'gong',
            volFirstRekke: 1,
            mutedSounds: { 'first-rekke': false },
            overAverageBlinkEnabled: true,
            nextGameCountdownEnabled: true,
            nextGameCountdownMinutes: 4,
            nextGameCountdownSeconds: 0,
            blurEnabled: true,
            randomBtnEnabled: true,
            bvHighlightEnabled:    true,
            bvHighlightRekke:      'current',
            bvHighlightThreshold:  2,
            // Length of the phones' countdown ring, in seconds. The host owns
            // the pace; each phone decides for itself whether to show the ring.
            bvCallTimerSeconds:    30,
            bvWinNotifyEnabled:    true,
            bvWinAutoOpenWinModal: false,
            autoBackupDownload:    true,
            // Bottom block-bar: when true, chips are ordered by how many
            // numbers each block is missing (fewest = leftmost).
            bvBlockBarSort:        false,
        };

        // Init all slots
        ['default', ...GAME_THEMES].forEach(t => {
            this.slots[t] = freshSlotState();
        });

        // In-memory mirror of the user-sound library. Backed by IndexedDB
        // (store 'sounds' in db 'bingoSounds') so big base64 WAVs don't eat
        // the ~5MB localStorage quota. Populated async by loadUserSoundsIntoPool.
        this._userSounds = {};

        // Debounced-write registry: key → { timer, build }. Coalesces bursts of
        // writes (e.g. dragging a slider fires input events every frame) into a
        // single setItem per key. Flushed on pagehide so no state is lost.
        this._pendingWrites = new Map();

        this.init();
    }

    // ── Initialisation ──────────────────────────────
    init() {
        // Opened directly from disk? fetch() of the bundled Sounds/*.wav files
        // is blocked on file:// — every non-synth sound goes silent. Surface
        // it instead of failing quietly.
        if (location.protocol === 'file:') {
            console.warn('[Lyd] Siden kjører fra file:// — nettleseren blokkerer lasting av lydfilene i Sounds/. Kjør via en lokal server (f.eks. "npx http-server") for å få lyd.');
        }
        this.renderThemeColorBlocks();
        this.cacheElements();
        this.populateBundledSoundSelect();
        this.setupDropdownPortal();
        this.bindEvents();
        this.loadFromStorage();
        this.preloadSounds();
        this.initBackupFolder();
        // Inject user-sound <option>s BEFORE applySettings — otherwise dropdowns
        // whose saved style is a user sound can't sync (no matching option yet).
        this.loadUserSoundsIntoPool();
        this.applySettings();
        this.applySlotToDOM();
        this.updateAverages();
        this.updateAverageHighlight();
        this.updateGameIndicator();
        this.checkSaveSessionButton();
        this.startCountdown();
        this.resetInactivityTimer();
        this.initBingoView();

        // Ensure any pending debounced writes are persisted before unload.
        // Also flush on hide: iOS Safari can kill a backgrounded tab without
        // ever firing pagehide, which would drop the last ~300ms of state.
        window.addEventListener('pagehide', () => this.flushPendingWrites());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') this.flushPendingWrites();
        });
    }

    // Schedule a localStorage write, coalescing rapid repeat calls for the same
    // key into one setItem ~300ms after the last call. build() is invoked at
    // flush time so the value reflects the latest state, not state at call time.
    scheduleWrite(key, build, delay = 300) {
        const existing = this._pendingWrites.get(key);
        if (existing) clearTimeout(existing.timer);
        const timer = setTimeout(() => {
            this._pendingWrites.delete(key);
            try { localStorage.setItem(key, build()); } catch(e) {}
        }, delay);
        this._pendingWrites.set(key, { timer, build });
    }

    flushPendingWrites() {
        this._pendingWrites.forEach(({ timer, build }, key) => {
            clearTimeout(timer);
            try { localStorage.setItem(key, build()); } catch(e) {}
        });
        this._pendingWrites.clear();
    }

    // Build the five per-theme colour editors in the settings panel from
    // COLOR_THEMES/DEFAULT_THEME_COLORS. Must run before cacheElements/
    // bindEvents so the generated inputs get their listeners.
    renderThemeColorBlocks() {
        const wrap = document.getElementById('theme-color-blocks');
        if (!wrap) return;
        const SWATCHES = [
            ['accent',  'Aksent',   'Aksentfarge'],
            ['primary', 'Bakgrunn', 'Bakgrunnsfarge'],
            ['balls',   'Baller',   'Ballerfarge'],
            ['danger',  'Fare',     'Fare / rød farge'],
            ['winner',  'Vinner',   'Vinner / gull farge'],
        ];
        wrap.innerHTML = COLOR_THEMES.map(theme => {
            const label = GAME_NAMES[theme];
            const c = DEFAULT_THEME_COLORS[theme];
            const pickers = SWATCHES.map(([key, name, title]) =>
                `<label class="theme-color-swatch-label" title="${title}">` +
                `<input type="color" class="theme-color-input" data-theme="${theme}" data-key="${key}" value="${c[key]}">` +
                `<span>${name}</span>` +
                `</label>`).join('');
            return `<div class="theme-color-block" data-theme="${theme}">` +
                `<div class="theme-color-row" data-theme="${theme}">` +
                `<span class="theme-color-label">${label}</span>` +
                `<div class="theme-color-pickers">${pickers}</div>` +
                `<button class="theme-color-reset-btn" data-theme="${theme}" title="Tilbakestill ${label}">↩</button>` +
                `</div>` +
                `<div class="color-preset-section" data-theme="${theme}">` +
                `<div class="color-preset-save-row">` +
                `<input type="text" class="color-preset-name-input" data-theme="${theme}" placeholder="Navn på fargesett…" maxlength="30">` +
                `<button class="color-preset-save-btn" data-theme="${theme}">💾 Lagre</button>` +
                `</div>` +
                `<div class="color-preset-list" data-theme="${theme}"></div>` +
                `</div></div>`;
        }).join('');
    }

    // Fill the upload-modal's bundled-sound <select> from BUNDLED_SOUNDS so
    // the list can't drift from the sound files the app actually knows about.
    populateBundledSoundSelect() {
        const sel = this.el.bundledSoundSelect;
        if (!sel) return;
        BUNDLED_SOUNDS.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.src;
            opt.textContent = s.name;
            sel.appendChild(opt);
        });
    }

    cacheElements() {
        this.el = {
            balls:           document.querySelectorAll('.balls:not(.spacer)'),
            bigNumber:       document.getElementById('big-number'),
            bigNumberText:   document.getElementById('big-number-text'),
            bigNumberFill:   document.getElementById('big-number-fill'),
            recentNumbers:   document.getElementById('recent-numbers'),
            resetButton:     document.getElementById('reset-button'),
            jackpotButton:   document.getElementById('jackpot-button'),
            randomButton:    document.getElementById('random-button'),
            randomBtnCell:   document.getElementById('random-btn-cell'),
            circle:          document.querySelector('.circle'),
            difference:      document.getElementById('difference'),
            rekkeBtns:       document.querySelectorAll('.rekke-btn'),
            rekkeButtonsDiv: document.getElementById('rekke-buttons'),
            spillFerdig:     document.getElementById('spill-ferdig'),
            themeButtons:    document.querySelectorAll('.theme-button'),
            countdown:       document.getElementById('countdown'),
            rekkeTooltip:    document.getElementById('rekke-tooltip'),
            chance1:         document.getElementById('chance1'),
            chance2:         document.getElementById('chance2'),
            chance3:         document.getElementById('chance3'),
            avgBox1:         document.getElementById('avg-box-1'),
            avgBox2:         document.getElementById('avg-box-2'),
            avgBox3:         document.getElementById('avg-box-3'),
            gameIndicator:   document.getElementById('game-indicator'),
            saveSessionBtn:  document.getElementById('save-session-btn'),
            // Rekke confirm modal
            rekkeModal:      document.getElementById('rekke-modal'),
            rekkeConfirm:    document.getElementById('rekke-confirm'),
            rekkeBackdrop:   document.getElementById('rekke-backdrop'),
            rekkeAdjustCount: document.getElementById('rekke-adjust-count'),
            rekkeAdjustPlus:  document.getElementById('rekke-adjust-plus'),
            rekkeAdjustMinus: document.getElementById('rekke-adjust-minus'),
            modalText:       document.getElementById('rekke-confirm-text'),
            modalYes:        document.getElementById('modal-yes'),
            modalNo:         document.getElementById('modal-no'),
            // Session save modal
            sessionModal:    document.getElementById('session-modal'),
            sessionGrid:     document.getElementById('session-grid'),
            sessionDateLabel:document.getElementById('session-date-label'),
            sessionSave:     document.getElementById('session-save'),
            sessionCancel:   document.getElementById('session-cancel'),
            // Reset all modal
            resetAllBtn:     document.getElementById('reset-all-btn'),
            resetAllModal:   document.getElementById('reset-all-modal'),
            resetAllConfirm: document.getElementById('reset-all-confirm'),
            resetAllCancel:  document.getElementById('reset-all-cancel'),
            // Session viewer
            viewSessionsBtn:    document.getElementById('view-sessions-btn'),
            viewerModal:        document.getElementById('viewer-modal'),
            viewerClose:        document.getElementById('viewer-close'),
            sessionList:        document.getElementById('session-list'),
            // Edit session modal
            editSessionModal:     document.getElementById('edit-session-modal'),
            editSessionDateLabel: document.getElementById('edit-session-date-label'),
            editSessionDateInput: document.getElementById('edit-session-date-input'),
            editSessionGrid:      document.getElementById('edit-session-grid'),
            editSessionSave:      document.getElementById('edit-session-save'),
            editSessionCancel:    document.getElementById('edit-session-cancel'),
            // Delete confirm modal
            deleteModal:   document.getElementById('delete-modal'),
            deleteModalText: document.getElementById('delete-modal-text'),
            deleteConfirm: document.getElementById('delete-confirm'),
            deleteCancel:   document.getElementById('delete-cancel'),
            exportBtn:          document.getElementById('export-btn'),
            importInput:        document.getElementById('import-input'),
            viewerIoToggle:     document.getElementById('viewer-io-toggle'),
            viewerIoDropdown:   document.getElementById('viewer-io-dropdown'),
            viewerSessionCount: document.getElementById('viewer-session-count'),
            viewerGameCount:    document.getElementById('viewer-game-count'),
            viewerAvg1:         document.getElementById('viewer-avg-1'),
            viewerAvg2:         document.getElementById('viewer-avg-2'),
            viewerAvg3:         document.getElementById('viewer-avg-3'),
            settingsBtn:        document.getElementById('settings-btn'),
            settingsModal:      document.getElementById('settings-modal'),
            settingsClose:      document.getElementById('settings-close'),
            settingsIoToggle:   document.getElementById('settings-io-toggle'),
            settingsIoDropdown: document.getElementById('settings-io-dropdown'),
            settingsExportBtn:  document.getElementById('settings-export-btn'),
            settingsImportFile: document.getElementById('settings-import-file'),
            settingProgress:      document.getElementById('setting-progress-enabled'),
            settingProgressDur:   document.getElementById('progress-dur-value'),
            settingDurPlus:       document.getElementById('progress-dur-plus'),
            settingDurMinus:      document.getElementById('progress-dur-minus'),
            progressDurRow:       document.getElementById('progress-duration-row'),
            settingProgressStyle: document.getElementById('setting-progress-style'),
            settingCountdownFixed: document.getElementById('setting-countdown-fixed'),
            settingCountdownVisible: document.getElementById('setting-countdown-visible'),
            settingCountdownTime:  document.getElementById('setting-countdown-time'),
            countdownTimeRow:   document.getElementById('countdown-time-row'),
            settingOneway:      document.getElementById('setting-oneway'),
            settingTooltip:     document.getElementById('setting-tooltip'),
            settingChances:     document.getElementById('setting-chances'),
            settingSound:       document.getElementById('setting-sound'),
            settingHoverStyle:  document.getElementById('setting-hover-style'),
            settingCallStyle:   document.getElementById('setting-call-style'),
            settingSelectStyle: document.getElementById('setting-select-style'),
            settingSwitchStyle: document.getElementById('setting-switch-style'),
            settingConfirmStyle:document.getElementById('setting-confirm-style'),
            settingCancelStyle: document.getElementById('setting-cancel-style'),
            settingResetStyle:  document.getElementById('setting-reset-style'),
            settingResetHardStyle: document.getElementById('setting-reset-hard-style'),
            volHover:    document.getElementById('vol-hover'),
            volCall:     document.getElementById('vol-call'),
            volSelect:   document.getElementById('vol-select'),
            volSwitch:   document.getElementById('vol-switch'),
            volConfirm:  document.getElementById('vol-confirm'),
            volCancel:   document.getElementById('vol-cancel'),
            volReset:    document.getElementById('vol-reset'),
            volResetHard:document.getElementById('vol-reset-hard'),
            settingOvertimeStyle:    document.getElementById('setting-overtime-style'),
            volOvertime:             document.getElementById('vol-overtime'),
            settingFirstRekkeStyle:  document.getElementById('setting-first-rekke-style'),
            volFirstRekke:           document.getElementById('vol-first-rekke'),
            settingTypingDelay:   document.getElementById('setting-typing-delay'),
            settingTypingDelayPlus:  document.getElementById('typing-delay-plus'),
            settingTypingDelayMinus: document.getElementById('typing-delay-minus'),
            settingTypingOverwrite:      document.getElementById('setting-typing-overwrite'),
            settingOverwriteDelay:       document.getElementById('setting-overwrite-delay'),
            settingOverwriteDelayPlus:   document.getElementById('overwrite-delay-plus'),
            settingOverwriteDelayMinus:  document.getElementById('overwrite-delay-minus'),
            overwriteDelayRow:           document.getElementById('overwrite-delay-row'),
            settingBallAnim:             document.getElementById('setting-ball-anim'),
            settingGridLayout:           document.getElementById('setting-grid-layout'),
            statsRow:           document.querySelector('.stats-row'),
            undoBtnCell:        document.getElementById('undo-btn-cell'),
            undoButton:         document.getElementById('undo-button'),
            avgFilterAllBtn:    document.getElementById('avg-filter-all'),
            avgFilterInput:     document.getElementById('avg-filter-input'),
            avgFilterPlus:      document.getElementById('avg-filter-plus'),
            avgFilterMinus:     document.getElementById('avg-filter-minus'),
            fullscreenBtn:       document.getElementById('fullscreen-btn'),
            jackpotFlash:        document.getElementById('jackpot-flash'),
            uploadSoundBtn:      document.getElementById('upload-sound-btn'),
            uploadSoundModal:    document.getElementById('upload-sound-modal'),
            uploadSoundInput:    document.getElementById('upload-sound-input'),
            uploadSoundCancel:   document.getElementById('upload-sound-cancel'),
            uploadSoundCats:        document.getElementById('upload-sound-categories'),
            bundledSoundSelect:     document.getElementById('bundled-sound-select'),
            bundledSoundPreviewBtn: document.getElementById('bundled-sound-preview-btn'),
            bundledSoundUseBtn:     document.getElementById('bundled-sound-use-btn'),
            // Winner system
            logWinnerBtn:        document.getElementById('log-winner-btn-2'),
            winnerAddBtn:        document.getElementById('winner-add-btn'),
            winnerSelectedList:  document.getElementById('winner-selected-list'),
            // Player delete confirm
            playerDeleteModal:   document.getElementById('player-delete-modal'),
            playerDeleteText:    document.getElementById('player-delete-text'),
            playerDeleteConfirm: document.getElementById('player-delete-confirm'),
            playerDeleteCancel:  document.getElementById('player-delete-cancel'),
            winnerIndicator:     document.getElementById('winner-indicator'),
            winnerModal:         document.getElementById('winner-modal'),
            winnerModalTitle:    document.getElementById('winner-modal-title'),
            winnerModalSubtitle: document.getElementById('winner-modal-subtitle'),
            playerQuickselect:   document.getElementById('player-quickselect'),
            winnerNameInput:     document.getElementById('winner-name-input'),
            winnerSplitInput:    document.getElementById('winner-split-input'),
            winnerSplitDisplay:  document.getElementById('winner-split-display'),
            winnerSplitPlus:     document.getElementById('winner-split-plus'),
            winnerSplitMinus:    document.getElementById('winner-split-minus'),
            winnerSave:          document.getElementById('winner-save'),
            winnerCancel:        document.getElementById('winner-cancel'),
            suggestSaveModal:    document.getElementById('suggest-save-modal'),
            suggestSaveYes:      document.getElementById('suggest-save-yes'),
            suggestSaveNo:       document.getElementById('suggest-save-no'),
            // Player management
            playersModal:        document.getElementById('players-modal'),
            playersList:         document.getElementById('players-list'),
            newPlayerInput:      document.getElementById('new-player-input'),
            addPlayerBtn:        document.getElementById('add-player-btn'),
            playersClose:        document.getElementById('players-close'),
            managePlayers:       document.getElementById('manage-players-btn'),
            // Leaderboard
            leaderboardModal:    document.getElementById('leaderboard-modal'),
            leaderboardList:     document.getElementById('leaderboard-list'),
            leaderboardBtn:      document.getElementById('leaderboard-btn'),
            leaderboardClose:    document.getElementById('leaderboard-close'),
            // Player history
            playerHistoryModal:  document.getElementById('player-history-modal'),
            playerHistoryTitle:  document.getElementById('player-history-title'),
            playerHistorySubtitle: document.getElementById('player-history-subtitle'),
            playerHistoryList:   document.getElementById('player-history-list'),
            playerHistoryClose:  document.getElementById('player-history-close'),
            addPrevWinFromHistory: document.getElementById('add-prev-win-from-history'),
            // Add win modal
            addWinModal:         document.getElementById('add-win-modal'),
            addWinPlayerLabel:   document.getElementById('add-win-player-label'),
            addWinPresets:       document.getElementById('add-win-presets'),
            addWinCustomRow:     document.getElementById('add-win-custom-row'),
            addWinCustomAmount:  document.getElementById('add-win-custom-amount'),
            addWinYear:          document.getElementById('add-win-year'),
            addWinYearMinus:     document.getElementById('add-win-year-minus'),
            addWinYearPlus:      document.getElementById('add-win-year-plus'),
            addWinMonth:         document.getElementById('add-win-month'),
            addWinSave:          document.getElementById('add-win-save'),
            addWinCancel:        document.getElementById('add-win-cancel'),

            // Edit-win modal (edits a single win from pending/session/manual)
            editWinModal:        document.getElementById('edit-win-modal'),
            editWinSubtitle:     document.getElementById('edit-win-subtitle'),
            editWinName:         document.getElementById('edit-win-name'),
            editWinPlayers:      document.getElementById('edit-win-players'),
            editWinGameRows:     document.getElementById('edit-win-game-rows'),
            editWinGame:         document.getElementById('edit-win-game'),
            editWinRekke:        document.getElementById('edit-win-rekke'),
            editWinBalls:        document.getElementById('edit-win-balls'),
            editWinPrize:        document.getElementById('edit-win-prize'),
            editWinSplit:        document.getElementById('edit-win-split'),
            editWinSplitWrap:    document.getElementById('edit-win-split-wrap'),
            editWinDateRow:      document.getElementById('edit-win-date-row'),
            editWinYear:         document.getElementById('edit-win-year'),
            editWinMonth:        document.getElementById('edit-win-month'),
            editWinSave:         document.getElementById('edit-win-save'),
            editWinCancel:       document.getElementById('edit-win-cancel'),
            // Recent numbers expand
            recentExpandBtn:     document.getElementById('recent-expand-btn'),
            recentNumbersAll:    document.getElementById('recent-numbers-all'),
            // Graph
            graphBtn:            document.getElementById('graph-btn'),
            graphModal:          document.getElementById('graph-modal'),
            graphCanvas:         document.getElementById('avg-graph-canvas'),
            graphLegend:         document.getElementById('graph-legend'),
            graphClose:          document.getElementById('graph-close'),
            // Unsaved confirm
            unsavedModal:        document.getElementById('unsaved-modal'),
            unsavedDiscard:      document.getElementById('unsaved-discard'),
            unsavedCancel:       document.getElementById('unsaved-cancel'),
            // Over-average blink + next-game countdown
            bvHighlightEnabled:       document.getElementById('bv-highlight-enabled'),
            bvHighlightRekke:         document.getElementById('bv-highlight-rekke'),
            bvHighlightRekkeRow:      document.getElementById('bv-highlight-rekke-row'),
            bvHighlightThresholdRow:  document.getElementById('bv-highlight-threshold-row'),
            bvThresholdValue:         document.getElementById('bv-threshold-value'),
            bvThresholdPlus:          document.getElementById('bv-threshold-plus'),
            bvThresholdMinus:         document.getElementById('bv-threshold-minus'),
            bvCallTimerValue:         document.getElementById('bv-call-timer-value'),
            bvCallTimerPlus:          document.getElementById('bv-call-timer-plus'),
            bvCallTimerMinus:         document.getElementById('bv-call-timer-minus'),
            bvWinNotifyEnabled:       document.getElementById('bv-win-notify-enabled'),
            bvWinModal:               document.getElementById('bv-win-modal'),
            bvWinAutoOpen:            document.getElementById('bv-win-auto-open'),
            settingOverAverageBlink:    document.getElementById('setting-over-average-blink'),
            settingBlur:                document.getElementById('setting-blur'),
            settingNextGameCountdown:   document.getElementById('setting-next-game-countdown'),
            settingRandomBtn:           document.getElementById('setting-random-btn'),
            nextGameCdDurRow:           document.getElementById('next-game-countdown-dur-row'),
            nextGameCdMin:              document.getElementById('next-game-cd-min'),
            nextGameCdSec:              document.getElementById('next-game-cd-sec'),
            nextGameCdMinPlus:          document.getElementById('next-game-cd-min-plus'),
            nextGameCdMinMinus:         document.getElementById('next-game-cd-min-minus'),
            nextGameCdSecPlus:          document.getElementById('next-game-cd-sec-plus'),
            nextGameCdSecMinus:         document.getElementById('next-game-cd-sec-minus'),
            nextGameCdWrap:             document.getElementById('next-game-cd-wrap'),
            nextGameCdDisplay:          document.getElementById('next-game-cd-display'),
            nextGameCdBar:              document.getElementById('next-game-cd-bar'),
            // Phone-count badge
            bvNavBadge:                 document.getElementById('bv-nav-badge'),
            // Frequency heatmap
            navFrequency:               document.getElementById('nav-frequency'),
            frequencyModal:             document.getElementById('frequency-modal'),
            frequencyClose:             document.getElementById('frequency-close'),
            frequencyScope:             document.getElementById('frequency-scope'),
            frequencyDisplay:           document.getElementById('frequency-display'),
            frequencySummary:           document.getElementById('frequency-summary'),
            frequencyDisplayWrap:       document.getElementById('frequency-display-wrap'),
            // Error log
            navErrorLog:                document.getElementById('nav-errorlog'),
            errorLogModal:              document.getElementById('error-log-modal'),
            errorLogList:               document.getElementById('error-log-list'),
            errorLogSubtitle:           document.getElementById('error-log-subtitle'),
            errorLogCopy:               document.getElementById('error-log-copy'),
            errorLogClear:              document.getElementById('error-log-clear'),
            errorLogClose:              document.getElementById('error-log-close'),
            frequencyBtn:               document.getElementById('frequency-btn'),
            // Statistics modal
            statsBtn:                   document.getElementById('stats-btn'),
            statsModal:                 document.getElementById('stats-modal'),
            statsSubtitle:              document.getElementById('stats-subtitle'),
            statsContent:               document.getElementById('stats-content'),
            statsClose:                 document.getElementById('stats-close'),
            // Backups
            backupNowBtn:               document.getElementById('backup-now-btn'),
            backupsOpenBtn:             document.getElementById('backups-open-btn'),
            backupsModal:               document.getElementById('backups-modal'),
            backupsList:                document.getElementById('backups-list'),
            backupsClose:               document.getElementById('backups-close'),
            viewerBackupStatus:         document.getElementById('viewer-backup-status'),
            settingAutoBackup:          document.getElementById('setting-auto-backup'),
        };

        // Wrap each ball's text in an inner span so hover/clicked scale
        // transforms target the inner element. The parent's hit-area then
        // stays fixed at its layout size and can't flicker hover state when
        // the cursor sits right on the edge.
        this.el.balls.forEach(ball => {
            if (ball.classList.contains('grid-btn-cell')) return;
            if (ball.querySelector(':scope > .ball-inner')) return;
            for (const node of [...ball.childNodes]) {
                if (node.nodeType === 3 && node.textContent.trim()) {
                    const span = document.createElement('span');
                    span.className = 'ball-inner';
                    span.textContent = node.textContent;
                    ball.replaceChild(span, node);
                    break;
                }
            }
        });

        // O(1) number→element lookup — avoids spread+find across all 90 balls.
        // Also stash the number on data-num so callers read it cleanly even
        // when child elements (like BV watch labels) get appended to the ball.
        this.el.ballMap = new Map();
        this.el.balls.forEach(ball => {
            const n = ball.textContent.trim();
            ball.dataset.num = n;
            this.el.ballMap.set(n, ball);
        });

        // O(1) rekke/theme button lookups — avoids spread+find on every keypress
        this.el.rekkeBtnMap    = new Map([...this.el.rekkeBtns].map(b => [b.dataset.rekke, b]));
        this.el.themeButtonMap = new Map([...this.el.themeButtons].map(b => [b.dataset.theme, b]));
    }

    bindEvents() {
        this.el.balls.forEach(ball => {
            ball.addEventListener('click', e => this.handleBallClick(e));
        });
        this.el.resetButton.addEventListener('click', e => {
            if (!this.resetConfirm) this.playSound('select');
            this.handleReset(e);
        });
        this.el.resetButton.addEventListener('mousedown', () => {
            this._resetHoldTimer = setTimeout(() => {
                this._resetHoldTimer = null;
                this.openResetAllModal();
            }, 800);
        });
        this.el.resetButton.addEventListener('mouseup', () => {
            clearTimeout(this._resetHoldTimer);
        });
        this.el.resetButton.addEventListener('mouseleave', () => {
            clearTimeout(this._resetHoldTimer);
        });
        this.el.jackpotButton.addEventListener('click', () => {
            this.playSound('select');
            this.toggleJackpotMode();
        });
        this.el.rekkeBtns.forEach(btn =>
            btn.addEventListener('click', e => this.handleRekkeChangeRequest(e))
        );
        this.el.themeButtons.forEach(btn =>
            btn.addEventListener('click', e => this.handleThemeSwitch(e))
        );

        // Global delegated hover — covers every button/anchor on the page
        // Throttled to avoid audio spam when moving quickly across many balls/buttons
        let _lastHoverSound = 0;
        document.addEventListener('mouseenter', e => {
            const t = e.target;
            if (t && t.classList && (t.tagName === 'BUTTON' || t.tagName === 'A' ||
                t.tagName === 'LABEL' || (t.classList.contains('balls') && !t.classList.contains('clicked')))) {
                const now = Date.now();
                if (now - _lastHoverSound < 50) return;
                _lastHoverSound = now;
                this.playSound('hover');
            }
        }, true);

        document.body.addEventListener('click', () => this.cancelResetConfirm());

        // Close modals on backdrop click
        const backdropMap = [
            ['rekke-modal',          () => this.cancelRekkeChange()],
            ['session-modal',        () => this.promptUnsavedClose(() => this.closeSessionModal())],
            ['winner-modal',         () => this.closeWinnerModal()],
            ['viewer-modal',         () => this.closeViewerModal()],
            ['edit-session-modal',   () => this.maybePromptEditSessionClose()],
            ['delete-modal',         () => this.closeDeleteModal()],
            ['reset-all-modal',      () => this.closeResetAllModal()],
            ['leaderboard-modal',    () => this.closeLeaderboard()],
            ['players-modal',        () => this.closePlayersModal()],
            ['player-history-modal', () => this.closePlayerHistory()],
            ['player-delete-modal',  () => this.closePlayerDeleteModal()],
            ['add-win-modal',        () => this.closeAddWinModal()],
            ['edit-win-modal',       () => this.closeEditWinModal()],
            ['graph-modal',          () => this.closeGraph()],
            ['unsaved-modal',        () => this.closeUnsavedModal()],
            ['upload-sound-modal',   () => this.closeUploadSoundModal()],
            ['settings-modal',       () => this.closeSettingsModal()],
            ['stats-modal',          () => this.closeStatsModal()],
            ['backups-modal',        () => this.closeBackupsModal()],
            ['suggest-save-modal',   () => { this.playSound('cancel'); this.el.suggestSaveModal.style.display = 'none'; }],
        ];
        backdropMap.forEach(([id, closeFn]) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', e => {
                if (e.target === el) closeFn();
            });
        });

        // Keyboard input
        document.addEventListener('keydown', e => this.handleKeyInput(e));
        document.addEventListener('keyup', e => {
            if (e.key === ',') {
                clearTimeout(this._resetKeyHoldTimer);
                this._resetKeyHeld = false;
            }
        });

        // Export / Import
        this.el.exportBtn.addEventListener('click',        () => { this.exportSessions(); this.el.viewerIoDropdown.classList.remove('open'); });
        this.el.importInput.addEventListener('change', e => this.importSessions(e));
        this.el.viewerIoToggle.addEventListener('click', e => {
            e.stopPropagation();
            this.el.viewerIoDropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => {
            this.el.viewerIoDropdown.classList.remove('open');
            this.el.settingsIoDropdown.classList.remove('open');
        });

        // Average filter
        this.el.avgFilterInput.addEventListener('input', () => this.handleAvgFilterInput());
        this.el.avgFilterAllBtn.addEventListener('click', () => { this.playSound('select'); this.setAvgFilter(null); });
        this.el.avgFilterPlus.addEventListener('click', () => { this.playSound('select'); this.stepAvgFilter(1); });
        this.el.avgFilterMinus.addEventListener('click', () => { this.playSound('select'); this.stepAvgFilter(-1); });

        // Winner logging
        this.el.logWinnerBtn.addEventListener('click',  () => this.openWinnerModal());

        // Pending-winner edit/remove buttons in the game indicator (delegated;
        // the indicator is re-rendered on every update)
        this.el.gameIndicator.addEventListener('click', e => {
            const btn = e.target.closest('.gi-win-btn');
            if (!btn) return;
            const idx = Number(btn.closest('.gi-win-line')?.dataset.pidx);
            if (!Number.isInteger(idx)) return;
            if (btn.classList.contains('gi-win-del')) {
                if (btn.dataset.confirming === '1') {
                    this.playSound('confirm');
                    const pending = this.getPendingWinners();
                    pending.splice(idx, 1);
                    localStorage.setItem('bingoPendingWinners', JSON.stringify(pending));
                    this.updateGameIndicator();
                } else {
                    this.playSound('select');
                    btn.dataset.confirming = '1';
                    btn.textContent = 'Sikker?';
                    setTimeout(() => {
                        if (!btn.isConnected) return;
                        btn.dataset.confirming = '';
                        btn.textContent = '✕';
                    }, 2500);
                }
            } else if (btn.classList.contains('gi-win-edit')) {
                this.openEditWinModal({ source: 'pending', winIdx: idx });
            }
        });

        // Edit-win modal
        this.el.editWinSave.addEventListener('click',   () => this.saveEditWin());
        this.el.editWinCancel.addEventListener('click', () => this.closeEditWinModal());
        this.el.editWinName.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.saveEditWin();
        });
        // Changing the split recomputes this winner's share of the full prize
        this.el.editWinSplit.addEventListener('input', () => {
            const split = parseInt(this.el.editWinSplit.value);
            const full  = this._editWinFullPrize;
            if (split >= 1 && full != null) {
                this.el.editWinPrize.value = Math.round((full / split) * 100) / 100;
            }
        });

        // Edit buttons on win rows inside the player-history modal (delegated;
        // the list is re-rendered on every open)
        this.el.playerHistoryList.addEventListener('click', e => {
            const btn = e.target.closest('.win-edit-btn');
            if (!btn) return;
            const ctx = { source: btn.dataset.src, winIdx: Number(btn.dataset.widx) };
            if (btn.dataset.sidx !== undefined) ctx.sessionIdx = Number(btn.dataset.sidx);
            this.openEditWinModal(ctx);
        });

        this.el.winnerSave.addEventListener('click',    () => this.saveWinner());
        this.el.winnerCancel.addEventListener('click',  () => this.closeWinnerModal());
        const updateSplitCount = (n) => {
            this.winnerSplitCount = Math.max(1, Math.min(10, n));
            this.el.winnerSplitInput.value = this.winnerSplitCount;
            if (this.el.winnerSplitDisplay) this.el.winnerSplitDisplay.textContent = this.winnerSplitCount;
            if (this.winnerSelectedPlayers.length > this.winnerSplitCount) {
                this.winnerSelectedPlayers = this.winnerSelectedPlayers.slice(0, this.winnerSplitCount);
                this.renderPlayerQuickselect();
                this.renderWinnerSelectedList();
            }
            this.updateWinnerModalState();
        };
        if (this.el.winnerSplitPlus) {
            this.el.winnerSplitPlus.addEventListener('click', () => { this.playSound('select'); updateSplitCount(this.winnerSplitCount + 1); });
            this.el.winnerSplitMinus.addEventListener('click', () => { this.playSound('select'); updateSplitCount(this.winnerSplitCount - 1); });
        }
        this.el.winnerSplitInput.addEventListener('input', () => {
            updateSplitCount(parseInt(this.el.winnerSplitInput.value) || 1);
        });
        this.el.winnerAddBtn.addEventListener('click', () => this.addWinnerFromInput());
        this.el.winnerNameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                if (this.winnerSplitCount > 1 && this.winnerSelectedPlayers.length < this.winnerSplitCount) {
                    this.addWinnerFromInput();
                } else {
                    this.saveWinner();
                }
            }
        });
        this.el.winnerNameInput.addEventListener('input', () => {
            this.updateWinnerModalState();
            this.renderPlayerQuickselect();
        });

        // Player delete confirm
        this.el.playerDeleteConfirm.addEventListener('click', () => { this.playSound('confirm'); this.confirmPlayerDelete(); });
        this.el.playerDeleteCancel.addEventListener('click',  () => this.closePlayerDeleteModal());

        // Player management
        this.el.addPlayerBtn.addEventListener('click',  () => { this.playSound('select'); this.addNewPlayer(); });
        this.el.newPlayerInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.addNewPlayer(); });
        this.el.playersClose.addEventListener('click',  () => this.closePlayersModal());
        this.el.managePlayers.addEventListener('click', () => this.openPlayersModal());

        // Leaderboard
        this.el.leaderboardBtn.addEventListener('click',   () => this.openLeaderboard());
        this.el.leaderboardClose.addEventListener('click', () => this.closeLeaderboard());
        this.el.playerHistoryClose.addEventListener('click', () => this.closePlayerHistory());
        this.el.addPrevWinFromHistory.addEventListener('click', () => this.openAddWinModal(this.currentHistoryPlayer));
        this.el.addWinSave.addEventListener('click',   () => { this.playSound('confirm'); this.saveManualWin(); });
        this.el.addWinCancel.addEventListener('click', () => this.closeAddWinModal());
        this.el.addWinYearMinus.addEventListener('click', () => {
            const v = parseInt(this.el.addWinYear.value) || new Date().getFullYear();
            this.el.addWinYear.value = Math.max(2000, v - 1);
        });
        this.el.addWinYearPlus.addEventListener('click', () => {
            const v = parseInt(this.el.addWinYear.value) || new Date().getFullYear();
            this.el.addWinYear.value = Math.min(2100, v + 1);
        });

        // Recent numbers expand
        this.el.recentExpandBtn.addEventListener('click', () => { this.playSound('select'); this.toggleRecentExpand(); });

        // Graph
        this.el.graphBtn.addEventListener('click',   () => this.openGraph());
        this.el.graphClose.addEventListener('click', () => this.closeGraph());

        // Statistics
        if (this.el.statsBtn) {
            this.el.statsBtn.addEventListener('click',   () => this.openStatsModal());
            this.el.statsClose.addEventListener('click', () => this.closeStatsModal());
        }

        // Backups
        if (this.el.backupNowBtn) {
            this.el.backupNowBtn.addEventListener('click', () => {
                this.playSound('confirm');
                this.el.viewerIoDropdown.classList.remove('open');
                this.performAutoBackup({ download: true });
            });
            this.el.backupsOpenBtn.addEventListener('click', () => {
                this.playSound('select');
                this.el.viewerIoDropdown.classList.remove('open');
                this.openBackupsModal();
            });
            this.el.backupsClose.addEventListener('click', () => this.closeBackupsModal());
        }
        if (this.el.settingAutoBackup) {
            this.el.settingAutoBackup.addEventListener('change', () => {
                this.settings.autoBackupDownload = this.el.settingAutoBackup.checked;
                this.saveSettings();
            });
        }

        // Backup folder (File System Access API — row hidden when unsupported)
        const backupFolderPick = document.getElementById('backup-folder-pick');
        if (backupFolderPick) {
            backupFolderPick.addEventListener('click', async () => {
                this.playSound('select');
                try {
                    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                    this._backupDirHandle = handle;
                    await this._idbMetaTx('readwrite', s => s.put(handle, 'backupDir'));
                } catch(e) { /* user cancelled the picker */ }
                this._updateBackupFolderStatus();
            });
            document.getElementById('backup-folder-clear').addEventListener('click', async () => {
                this.playSound('cancel');
                this._backupDirHandle = null;
                try { await this._idbMetaTx('readwrite', s => s.delete('backupDir')); } catch(e) {}
                this._updateBackupFolderStatus();
            });
        }

        // Statistikk (session viewer) from nav menu
        const navStatistikk = document.getElementById('nav-statistikk');
        if (navStatistikk) {
            navStatistikk.addEventListener('click', e => { e.preventDefault(); this.openViewerModal(); });
        }

        // Frequency heatmap
        if (this.el.navFrequency) {
            this.el.navFrequency.addEventListener('click', e => { e.preventDefault(); this.openFrequencyModal(); });
        }
        if (this.el.frequencyBtn) {
            this.el.frequencyBtn.addEventListener('click', () => this.openFrequencyModal());
        }
        if (this.el.frequencyClose) {
            this.el.frequencyClose.addEventListener('click', () => this.closeFrequencyModal());
        }
        if (this.el.frequencyScope) {
            this.el.frequencyScope.addEventListener('change', () => this.renderFrequency());
        }
        if (this.el.frequencyDisplay) {
            this.el.frequencyDisplay.addEventListener('change', () => this.renderFrequency());
        }
        const freqOverlay = document.getElementById('frequency-modal');
        if (freqOverlay) {
            freqOverlay.addEventListener('click', e => {
                if (e.target === freqOverlay) this.closeFrequencyModal();
            });
        }

        // Error log
        if (this.el.navErrorLog) {
            this.el.navErrorLog.addEventListener('click', e => { e.preventDefault(); this.openErrorLogModal(); });
        }
        if (this.el.errorLogClose) {
            this.el.errorLogClose.addEventListener('click', () => this.closeErrorLogModal());
        }
        if (this.el.errorLogCopy) {
            this.el.errorLogCopy.addEventListener('click', () => this.copyErrorLog());
        }
        if (this.el.errorLogClear) {
            this.el.errorLogClear.addEventListener('click', () => this.clearErrorLog());
        }
        const errOverlay = document.getElementById('error-log-modal');
        if (errOverlay) {
            errOverlay.addEventListener('click', e => {
                if (e.target === errOverlay) this.closeErrorLogModal();
            });
        }
        // Live-refresh the error list when new errors come in while open
        window.__bingoErrLogChanged = () => {
            if (this.el.errorLogModal && this.el.errorLogModal.style.display === 'flex') {
                this.renderErrorLog();
            }
        };

        // Unsaved confirm
        this.el.unsavedDiscard.addEventListener('click', () => this.confirmUnsavedDiscard());
        this.el.unsavedCancel.addEventListener('click',  () => this.closeUnsavedModal());
        this.el.addWinPresets.addEventListener('click', e => {
            const btn = e.target.closest('.add-win-preset-btn');
            if (!btn) return;
            this.el.addWinPresets.querySelectorAll('.add-win-preset-btn')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const isCustom = btn.dataset.amount === 'custom';
            this.el.addWinCustomRow.style.display = isCustom ? 'block' : 'none';
            if (!isCustom) this.el.addWinCustomAmount.value = '';
        });

        // Suggest save
        if (this.el.suggestSaveYes) {
            this.el.suggestSaveYes.addEventListener('click', () => {
                this.playSound('confirm');
                this.el.suggestSaveModal.style.display = 'none';
                this.openSessionModal();
            });
            this.el.suggestSaveNo.addEventListener('click', () => {
                this.playSound('cancel');
                this.el.suggestSaveModal.style.display = 'none';
            });
        }

        // Upload sound
        this.el.uploadSoundBtn.addEventListener('click', () => this.openUploadSoundModal());
        this.el.uploadSoundCancel.addEventListener('click', () => this.closeUploadSoundModal());
        this.el.uploadSoundInput.addEventListener('change', e => this.handleSoundUpload(e));
        this.el.bundledSoundPreviewBtn.addEventListener('click', () => this.previewBundledSound());
        this.el.bundledSoundUseBtn.addEventListener('click', () => this.useBundledSound());

        // Mute buttons (event delegation)
        document.getElementById('sg-sound').addEventListener('click', e => {
            const btn = e.target.closest('.sound-mute-btn');
            if (!btn) return;
            const type = btn.dataset.soundType;
            if (!this.settings.mutedSounds) this.settings.mutedSounds = {};
            this.settings.mutedSounds[type] = !this.settings.mutedSounds[type];
            btn.classList.toggle('muted', !!this.settings.mutedSounds[type]);
            btn.textContent = this.settings.mutedSounds[type] ? '🔇' : '🔊';
            this.saveSettings();
        });

        // Fullscreen
        this.el.fullscreenBtn.addEventListener('click', () => { this.playSound('select'); this.toggleFullscreen(); });
        document.addEventListener('fullscreenchange',   () => this.onFullscreenChange());

        // Rekke modal
        this.el.modalYes.addEventListener('click', () => this.confirmRekkeChange());
        this.el.modalNo.addEventListener('click',  () => this.cancelRekkeChange());
        this.el.rekkeAdjustPlus.addEventListener('click',  () => { this.playSound('select'); this.adjustRekkeCount(1); });
        this.el.rekkeAdjustMinus.addEventListener('click', () => { this.playSound('select'); this.adjustRekkeCount(-1); });

        // Session modal
        this.el.saveSessionBtn.addEventListener('click', () => this.openSessionModal());
        this.el.sessionSave.addEventListener('click',    () => this.saveSession());
        this.el.sessionCancel.addEventListener('click',  () => this.promptUnsavedClose(() => this.closeSessionModal()));

        // Reset all
        this.el.resetAllBtn.addEventListener('click',     () => this.openResetAllModal());
        this.el.resetAllConfirm.addEventListener('click', () => this.performResetAll());
        this.el.resetAllCancel.addEventListener('click',  () => this.closeResetAllModal());

        // Session viewer
        this.el.viewSessionsBtn.addEventListener('click', () => this.openViewerModal());
        this.el.viewerClose.addEventListener('click',     () => this.closeViewerModal());

        // Edit session
        this.el.editSessionSave.addEventListener('click',   () => this.saveEditedSession());
        this.el.editSessionCancel.addEventListener('click', () => this.maybePromptEditSessionClose());
        document.getElementById('edit-session-add-winner').addEventListener('click', () => {
            const container = document.getElementById('edit-session-winners');
            const idx = container.children.length;
            container.appendChild(this.createWinnerRow({ name: '', game: GAME_THEMES[0], rekke: 'Rekke1', ballCount: '' }, idx));
        });

        // Delete confirm
        this.el.deleteConfirm.addEventListener('click', () => this.confirmDelete());
        this.el.deleteCancel.addEventListener('click',  () => this.closeDeleteModal());

        // Settings
        this.el.settingsBtn.addEventListener('click',   () => this.openSettingsModal());
        this.el.settingsClose.addEventListener('click', () => this.closeSettingsModal());
        this.el.settingsIoToggle.addEventListener('click', e => {
            e.stopPropagation();
            this.el.settingsIoDropdown.classList.toggle('open');
        });
        this.el.settingsExportBtn.addEventListener('click', () => {
            this.exportSettings();
            this.el.settingsIoDropdown.classList.remove('open');
        });
        this.el.settingsImportFile.addEventListener('change', (e) => {
            this.importSettings(e.target.files[0]);
            e.target.value = '';
            this.el.settingsIoDropdown.classList.remove('open');
        });

        this.el.settingProgress.addEventListener('change', () => {
            this.settings.progressEnabled = this.el.settingProgress.checked;
            this.el.progressDurRow.style.display = this.settings.progressEnabled ? '' : 'none';
            if (!this.settings.progressEnabled) {
                if (this._progressRaf) cancelAnimationFrame(this._progressRaf);
                this.el.bigNumberFill.innerHTML = '';
                this.el.bigNumber.style.transition = 'none';
                this.el.bigNumber.style.backgroundColor = 'white';
                void this.el.bigNumber.offsetWidth;
                this.el.bigNumber.style.transition = '';
                this._progressCompleted = false;
                clearTimeout(this._progressTimer);
            }
            this.saveSettings();
        });
        this.el.settingDurPlus.addEventListener('click', () => {
            this.settings.progressDuration = Math.min(60, this.settings.progressDuration + 1);
            this.el.settingProgressDur.textContent = this.settings.progressDuration;
            this.saveSettings();
        });
        this.el.settingDurMinus.addEventListener('click', () => {
            this.settings.progressDuration = Math.max(1, this.settings.progressDuration - 1);
            this.el.settingProgressDur.textContent = this.settings.progressDuration;
            this.saveSettings();
        });
        if (this.el.settingProgressStyle) {
            this.el.settingProgressStyle.addEventListener('change', () => {
                this.settings.progressStyle = this.el.settingProgressStyle.value;
                this.saveSettings();
            });
        }
        this.el.settingCountdownFixed.addEventListener('change', () => {
            this.settings.countdownFixed = this.el.settingCountdownFixed.checked;
            this.el.countdownTimeRow.style.display = this.settings.countdownFixed ? '' : 'none';
            this.saveSettings();
            this.startCountdown(); // apply new mode immediately without requiring a reload
        });
        this.el.settingCountdownVisible.addEventListener('change', () => {
            this.settings.countdownVisible = this.el.settingCountdownVisible.checked;
            const show = this.settings.countdownVisible;
            this.el.countdown.style.display = show ? '' : 'none';
            document.querySelector('.igjen').style.display = show ? '' : 'none';
            this.saveSettings();
        });
        this.el.settingCountdownTime.addEventListener('change', () => {
            this.settings.countdownTime = this.el.settingCountdownTime.value;
            this.saveSettings();
            if (this.settings.countdownFixed) this.startCountdown(); // reflect new fixed time live
        });
        this.el.settingOneway.addEventListener('change', () => {
            this.settings.oneWay = this.el.settingOneway.checked;
            // undo always active
            this.saveSettings();
        });
        this.el.settingTooltip.addEventListener('change', () => {
            this.settings.tooltipEnabled = this.el.settingTooltip.checked;
            if (!this.settings.tooltipEnabled) this.hideRekkeTooltip();
            this.saveSettings();
        });
        this.el.settingChances.addEventListener('change', () => {
            this.settings.chancesVisible = this.el.settingChances.checked;
            this.el.statsRow.classList.toggle('hidden', !this.settings.chancesVisible);
            this.saveSettings();
        });
        this.el.settingSound.addEventListener('change', () => {
            this.settings.soundEnabled = this.el.settingSound.checked;
            this.saveSettings();
        });
        this.el.settingHoverStyle.addEventListener('change', () => {
            this.settings.hoverStyle = this.el.settingHoverStyle.value;
            this.playSound('hover');
            this.saveSettings();
        });
        const bindSoundStyle = (el, key, type) => {
            if (!el) return;
            el.addEventListener('change', () => {
                this.settings[key] = el.value;
                this.playSound(type);
                this.saveSettings();
            });
        };
        bindSoundStyle(this.el.settingCallStyle,      'callStyle',      'call');
        bindSoundStyle(this.el.settingSelectStyle,    'selectStyle',    'select');
        bindSoundStyle(this.el.settingSwitchStyle,    'switchStyle',    'switch');
        bindSoundStyle(this.el.settingConfirmStyle,   'confirmStyle',   'confirm');
        bindSoundStyle(this.el.settingCancelStyle,    'cancelStyle',    'cancel');
        bindSoundStyle(this.el.settingResetStyle,     'resetStyle',     'reset');
        bindSoundStyle(this.el.settingResetHardStyle, 'resetHardStyle', 'reset-hard');
        bindSoundStyle(this.el.settingOvertimeStyle,   'overtimeStyle',   'overtime');
        bindSoundStyle(this.el.settingFirstRekkeStyle, 'firstRekkeStyle', 'first-rekke');

        const bindVol = (el, key, type) => {
            if (!el) return;
            el.addEventListener('input', () => {
                const v = parseFloat(el.value);
                this.settings[key] = Number.isFinite(v) ? v : 1;
                this.saveSettings();
            });
            el.addEventListener('change', () => this.playSound(type));
        };
        bindVol(this.el.volHover,     'volHover',     'hover');
        bindVol(this.el.volCall,      'volCall',      'call');
        bindVol(this.el.volSelect,    'volSelect',    'select');
        bindVol(this.el.volSwitch,    'volSwitch',    'switch');
        bindVol(this.el.volConfirm,   'volConfirm',   'confirm');
        bindVol(this.el.volCancel,    'volCancel',    'cancel');
        bindVol(this.el.volReset,     'volReset',     'reset');
        bindVol(this.el.volResetHard, 'volResetHard', 'reset-hard');
        bindVol(this.el.volOvertime,    'volOvertime',    'overtime');
        bindVol(this.el.volFirstRekke,  'volFirstRekke',  'first-rekke');
        if (this.el.settingTypingDelayPlus) {
            this.el.settingTypingDelayPlus.addEventListener('click', () => {
                this.settings.typingDelay = Math.min(30, (this.settings.typingDelay ?? 8) + 1);
                this.el.settingTypingDelay.textContent = this.settings.typingDelay;
                this.saveSettings();
            });
            this.el.settingTypingDelayMinus.addEventListener('click', () => {
                this.settings.typingDelay = Math.max(1, (this.settings.typingDelay ?? 8) - 1);
                this.el.settingTypingDelay.textContent = this.settings.typingDelay;
                this.saveSettings();
            });
        }
        if (this.el.settingTypingOverwrite) {
            this.el.settingTypingOverwrite.addEventListener('change', () => {
                this.settings.typingOverwrite = this.el.settingTypingOverwrite.checked;
                this.el.overwriteDelayRow.style.display = this.settings.typingOverwrite ? '' : 'none';
                this.saveSettings();
            });
            this.el.settingOverwriteDelayPlus.addEventListener('click', () => {
                this.settings.typingOverwriteDelay = Math.min(30, (this.settings.typingOverwriteDelay ?? 10) + 1);
                this.el.settingOverwriteDelay.textContent = this.settings.typingOverwriteDelay;
                this.saveSettings();
            });
            this.el.settingOverwriteDelayMinus.addEventListener('click', () => {
                this.settings.typingOverwriteDelay = Math.max(1, (this.settings.typingOverwriteDelay ?? 10) - 1);
                this.el.settingOverwriteDelay.textContent = this.settings.typingOverwriteDelay;
                this.saveSettings();
            });
        }
        if (this.el.settingBallAnim) {
            this.el.settingBallAnim.addEventListener('change', () => {
                this.settings.ballAnimStyle = this.el.settingBallAnim.value;
                this.el.bigNumber.dataset.ballAnim = this.settings.ballAnimStyle;
                // Preview the animation
                this.el.bigNumber.classList.remove('number-update');
                void this.el.bigNumber.offsetWidth;
                this.el.bigNumber.classList.add('number-update');
                setTimeout(() => this.el.bigNumber.classList.remove('number-update'), 800);
                this.saveSettings();
            });
        }
        this.el.undoButton.addEventListener('click', () => { this.playSound('close'); this.undoLastNumber(); });
        if (this.el.settingGridLayout) {
            this.el.settingGridLayout.addEventListener('change', () => {
                this.settings.gridLayout = this.el.settingGridLayout.value;
                this.applyGridLayout();
                this.saveSettings();
            });
        }

        // Over-average blink toggle
        if (this.el.settingOverAverageBlink) {
            this.el.settingOverAverageBlink.addEventListener('change', () => {
                this.settings.overAverageBlinkEnabled = this.el.settingOverAverageBlink.checked;
                document.body.classList.toggle('no-over-average-blink', !this.settings.overAverageBlinkEnabled);
                this.saveSettings();
            });
        }

        // Blur toggle
        if (this.el.settingBlur) {
            this.el.settingBlur.addEventListener('change', () => {
                this.settings.blurEnabled = this.el.settingBlur.checked;
                document.body.classList.toggle('no-blur', !this.settings.blurEnabled);
                this.saveSettings();
            });
        }

        // Next-game countdown settings
        if (this.el.randomButton) {
            this.el.randomButton.addEventListener('click', () => this.drawRandomNumber());
        }

        if (this.el.settingRandomBtn) {
            this.el.settingRandomBtn.addEventListener('change', () => {
                this.settings.randomBtnEnabled = this.el.settingRandomBtn.checked;
                this.el.randomBtnCell.style.display = this.settings.randomBtnEnabled ? '' : 'none';
                this.saveSettings();
            });
        }

        if (this.el.settingNextGameCountdown) {
            this.el.settingNextGameCountdown.addEventListener('change', () => {
                this.settings.nextGameCountdownEnabled = this.el.settingNextGameCountdown.checked;
                this.el.nextGameCdDurRow.style.display = this.settings.nextGameCountdownEnabled ? '' : 'none';
                if (!this.settings.nextGameCountdownEnabled) this.stopNextGameCountdown();
                this.saveSettings();
            });
            this.el.nextGameCdMinPlus.addEventListener('click', () => {
                this.settings.nextGameCountdownMinutes = Math.min(59, (this.settings.nextGameCountdownMinutes ?? 3) + 1);
                this.el.nextGameCdMin.textContent = this.settings.nextGameCountdownMinutes;
                this.saveSettings();
            });
            this.el.nextGameCdMinMinus.addEventListener('click', () => {
                this.settings.nextGameCountdownMinutes = Math.max(0, (this.settings.nextGameCountdownMinutes ?? 3) - 1);
                this.el.nextGameCdMin.textContent = this.settings.nextGameCountdownMinutes;
                this.saveSettings();
            });
            this.el.nextGameCdSecPlus.addEventListener('click', () => {
                this.settings.nextGameCountdownSeconds = Math.min(59, (this.settings.nextGameCountdownSeconds ?? 0) + 1);
                this.el.nextGameCdSec.textContent = String(this.settings.nextGameCountdownSeconds).padStart(2, '0');
                this.saveSettings();
            });
            this.el.nextGameCdSecMinus.addEventListener('click', () => {
                this.settings.nextGameCountdownSeconds = Math.max(0, (this.settings.nextGameCountdownSeconds ?? 0) - 1);
                this.el.nextGameCdSec.textContent = String(this.settings.nextGameCountdownSeconds).padStart(2, '0');
                this.saveSettings();
            });
        }

        // Settings panel theme switcher buttons
        document.querySelectorAll('.settings-theme-btn[data-theme]').forEach(btn => {
            btn.addEventListener('click', () => this.switchTheme(btn.dataset.theme));
        });

        // Theme color pickers
        document.querySelectorAll('.theme-color-input').forEach(input => {
            input.addEventListener('input', () => {
                const theme = input.dataset.theme;
                const key   = input.dataset.key;
                this.themeColors[theme][key] = input.value;
                this.saveThemeColors();
                if (this.currentTheme === theme) this.applyThemeColors();
            });
        });
        document.querySelectorAll('.theme-color-reset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.themeColors[theme] = { ...DEFAULT_THEME_COLORS[theme] };
                this.saveThemeColors();
                this.syncThemeColorUI();
                if (this.currentTheme === theme) this.applyThemeColors();
            });
        });
        const resetAllBtn = document.getElementById('theme-colors-reset-all');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                COLOR_THEMES.forEach(t => {
                    this.themeColors[t] = { ...DEFAULT_THEME_COLORS[t] };
                });
                this.saveThemeColors();
                this.syncThemeColorUI();
                this.applyThemeColors();
            });
        }

        // BingoView highlight settings
        if (this.el.bvHighlightEnabled) {
            this.el.bvHighlightEnabled.addEventListener('change', () => {
                this.settings.bvHighlightEnabled = this.el.bvHighlightEnabled.checked;
                const on = this.settings.bvHighlightEnabled;
                if (this.el.bvHighlightRekkeRow)      this.el.bvHighlightRekkeRow.style.display      = on ? '' : 'none';
                if (this.el.bvHighlightThresholdRow)  this.el.bvHighlightThresholdRow.style.display  = on ? '' : 'none';
                this.saveSettings();
                try { this._bvUpdatePaperHighlights(); } catch(e) {}
            });
        }
        if (this.el.bvHighlightRekke) {
            this.el.bvHighlightRekke.addEventListener('change', () => {
                this.settings.bvHighlightRekke = this.el.bvHighlightRekke.value;
                this.saveSettings();
                try { this._bvUpdatePaperHighlights(); } catch(e) {}
            });
        }
        // BingoView call-countdown length. Pushed straight out so the phones'
        // rings retime without waiting for the next number.
        const bvBumpCallTimer = (delta) => {
            const next = Math.min(300, Math.max(1, (this.settings.bvCallTimerSeconds ?? 30) + delta));
            this.settings.bvCallTimerSeconds = next;
            if (this.el.bvCallTimerValue) this.el.bvCallTimerValue.textContent = next;
            this.saveSettings();
            try { this.bvSendState(); } catch(e) {}
        };
        if (this.el.bvCallTimerPlus) {
            this.el.bvCallTimerPlus.addEventListener('click', () => bvBumpCallTimer(1));
        }
        if (this.el.bvCallTimerMinus) {
            this.el.bvCallTimerMinus.addEventListener('click', () => bvBumpCallTimer(-1));
        }
        if (this.el.bvThresholdPlus) {
            this.el.bvThresholdPlus.addEventListener('click', () => {
                this.settings.bvHighlightThreshold = Math.min(9, (this.settings.bvHighlightThreshold ?? 2) + 1);
                if (this.el.bvThresholdValue) this.el.bvThresholdValue.textContent = this.settings.bvHighlightThreshold;
                this.saveSettings();
                try { this._bvUpdatePaperHighlights(); } catch(e) {}
            });
        }
        if (this.el.bvThresholdMinus) {
            this.el.bvThresholdMinus.addEventListener('click', () => {
                this.settings.bvHighlightThreshold = Math.max(1, (this.settings.bvHighlightThreshold ?? 2) - 1);
                if (this.el.bvThresholdValue) this.el.bvThresholdValue.textContent = this.settings.bvHighlightThreshold;
                this.saveSettings();
                try { this._bvUpdatePaperHighlights(); } catch(e) {}
            });
        }
        if (this.el.bvWinNotifyEnabled) {
            this.el.bvWinNotifyEnabled.addEventListener('change', () => {
                this.settings.bvWinNotifyEnabled = this.el.bvWinNotifyEnabled.checked;
                this.saveSettings();
                if (!this.settings.bvWinNotifyEnabled) this._bvClearWinNotices();
            });
        }
        if (this.el.bvWinAutoOpen) {
            this.el.bvWinAutoOpen.addEventListener('change', () => {
                this.settings.bvWinAutoOpenWinModal = this.el.bvWinAutoOpen.checked;
                this.saveSettings();
            });
        }

        // Per-theme color preset save buttons
        document.querySelectorAll('.color-preset-save-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                const nameInput = document.querySelector(`.color-preset-name-input[data-theme="${theme}"]`);
                const name = nameInput.value.trim();
                if (!name) { nameInput.focus(); return; }
                this.saveColorPreset(theme, name);
                nameInput.value = '';
                this.renderColorPresets(theme);
            });
        });
    }

    // ── Settings ─────────────────────────────────────
    saveSettings() {
        this.scheduleWrite('bingoSettings', () => JSON.stringify(this.settings));
    }

    saveThemeColors() {
        this.scheduleWrite('bingoThemeColors', () => JSON.stringify(this.themeColors));
        this.updateThemeButtonColors();
    }

    updateThemeButtonColors() {
        this.el.themeButtons.forEach(btn => {
            const theme = btn.dataset.theme;
            const c = this.themeColors[theme] || DEFAULT_THEME_COLORS[theme];
            if (!c) return;
            btn.style.setProperty('--btn-accent',  c.accent);
            btn.style.setProperty('--btn-primary', c.primary);
        });
    }

    // ── Color presets (per-theme) ─────────────────────
    getAllColorPresets() {
        try {
            const parsed = JSON.parse(localStorage.getItem('bingoColorPresets') || '{}');
            // Reject old array format from previous implementation
            if (Array.isArray(parsed)) {
                localStorage.removeItem('bingoColorPresets');
                return {};
            }
            return parsed;
        } catch(e) { return {}; }
    }

    saveColorPreset(theme, name) {
        const all = this.getAllColorPresets();
        if (!all[theme]) all[theme] = [];
        const idx = all[theme].findIndex(p => p.name === name);
        const entry = { name, colors: { ...this.themeColors[theme] } };
        if (idx >= 0) all[theme][idx] = entry;
        else all[theme].push(entry);
        localStorage.setItem('bingoColorPresets', JSON.stringify(all));
    }

    deleteColorPreset(theme, name) {
        const all = this.getAllColorPresets();
        if (all[theme]) all[theme] = all[theme].filter(p => p.name !== name);
        localStorage.setItem('bingoColorPresets', JSON.stringify(all));
    }

    loadColorPreset(theme, name) {
        const all = this.getAllColorPresets();
        const preset = (all[theme] || []).find(p => p.name === name);
        if (!preset) return;
        Object.assign(this.themeColors[theme], preset.colors);
        this.saveThemeColors();
        this.syncThemeColorUI();
        if (this.currentTheme === theme) this.applyThemeColors();
    }

    renderColorPresets(theme) {
        const themes = theme ? [theme] : COLOR_THEMES;
        const all = this.getAllColorPresets();

        // Cache list containers once and reuse across re-renders. Also wire a
        // single delegated click listener per list instead of 2N listeners
        // (load + delete) every time the list re-renders.
        if (!this._colorPresetLists) {
            this._colorPresetLists = new Map();
            document.querySelectorAll('.color-preset-list').forEach(list => {
                const t = list.dataset.theme;
                this._colorPresetLists.set(t, list);
                list.addEventListener('click', e => {
                    const item = e.target.closest('.color-preset-item');
                    if (!item) return;
                    const name = item.dataset.presetName;
                    if (e.target.closest('.color-preset-load-btn')) {
                        this.loadColorPreset(t, name);
                    } else if (e.target.closest('.color-preset-delete-btn')) {
                        this.deleteColorPreset(t, name);
                        this.renderColorPresets(t);
                    }
                });
            });
        }

        themes.forEach(t => {
            const list = this._colorPresetLists.get(t);
            if (!list) return;
            const presets = all[t] || [];
            const fallbackAccent = DEFAULT_THEME_COLORS[t].accent;
            // Build markup as a single string to avoid N createElement passes.
            list.innerHTML = presets.map(p => {
                const swatch = p.colors.accent || fallbackAccent;
                const name = this._escapeHtml(p.name);
                return `<div class="color-preset-item" data-preset-name="${name}">`
                     + `<span class="color-preset-swatch" style="background:${swatch}"></span>`
                     + `<span class="color-preset-name">${name}</span>`
                     + `<button class="color-preset-load-btn">Last inn</button>`
                     + `<button class="color-preset-delete-btn" title="Slett">✕</button>`
                     + `</div>`;
            }).join('');
        });
    }

    _escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
        }[c]));
    }

    applyThemeColors() {
        const body = document.body;
        const c = this.themeColors[this.currentTheme] || this.themeColors.default;
        body.style.setProperty('--accent-color',  c.accent);
        body.style.setProperty('--primary-color', c.primary);
        body.style.setProperty('--balls-color',   c.balls);
        const rgb = hexToRgb(c.accent);
        if (rgb) body.style.setProperty('--accent-rgb', rgb);

        // The background particle field caches the accent as an RGB triple and
        // only refreshes on flare-setting edits — tell it the accent moved so
        // the particles don't keep the previous theme's colour.
        window.dispatchEvent(new Event('accentchange'));

        const danger = c.danger || '#ff4444';
        body.style.setProperty('--danger-color', danger);
        const dangerRgb = hexToRgb(danger);
        if (dangerRgb) body.style.setProperty('--danger-rgb', dangerRgb);

        const winner = c.winner || '#f0c030';
        body.style.setProperty('--winner-color', winner);
        const winnerRgb = hexToRgb(winner);
        if (winnerRgb) body.style.setProperty('--winner-rgb', winnerRgb);

        // Sync completed ball fill with new colour (no RAF is running after completion)
        if (this._progressCompleted) {
            if (this._fillIsWhite) {
                // State: white fill on canvas, accent-coloured bg
                this.el.bigNumber.style.backgroundColor = c.accent;
            } else {
                // State: accent-coloured fill on canvas, white bg
                const canvas = this.el.bigNumberFill
                    ? this.el.bigNumberFill.querySelector('canvas')
                    : null;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = c.accent;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                this.el.bigNumber.style.backgroundColor = '#ffffff';
            }
        }
    }

    applyGridLayout() {
        const isVertical = this.settings.gridLayout === 'vertical';
        document.body.classList.toggle('layout-vertical', isVertical);

        // Move undo button next to 90 in vertical mode, restore it in horizontal
        const allRows   = document.querySelectorAll('.ball-grid .row1');
        const row1First = allRows[0];   // decade 1–9 (holds undo in horizontal mode)
        const row1Last  = allRows[9];   // decade 90 + Reset + Jackpot
        if (!row1First || !row1Last) return;

        const undoCell = this.el.undoBtnCell;

        if (isVertical) {
            // Move undo to the END of column 1 (after number 9) so all 10 columns have equal cell count
            if (undoCell !== row1First.lastElementChild) {
                row1First.appendChild(undoCell);
            }
        } else {
            // Restore undo to the very front of the first row
            if (undoCell !== row1First.firstElementChild) {
                row1First.insertBefore(undoCell, row1First.firstChild);
            }
        }
    }

    syncThemeColorUI() {
        COLOR_THEMES.forEach(theme => {
            const c = this.themeColors[theme];
            document.querySelectorAll(`.theme-color-input[data-theme="${theme}"]`).forEach(input => {
                input.value = c[input.dataset.key] || DEFAULT_THEME_COLORS[theme][input.dataset.key];
            });
            // Highlight the block whose theme is currently active
            const block = document.querySelector(`.theme-color-block[data-theme="${theme}"]`);
            if (block) block.classList.toggle('active-theme', theme === this.currentTheme);
        });
    }

    applySettings() {
        const s = this.settings;

        // Sync toggle UI
        this.el.settingProgress.checked       = s.progressEnabled;
        this.el.settingProgressDur.textContent = s.progressDuration;
        this.el.progressDurRow.style.display  = s.progressEnabled ? '' : 'none';
        if (this.el.settingProgressStyle) this.el.settingProgressStyle.value = s.progressStyle || 'wave';
        this.el.settingCountdownFixed.checked = s.countdownFixed;
        this.el.settingCountdownVisible.checked = s.countdownVisible;
        this.el.settingCountdownTime.value    = s.countdownTime;
        this.el.countdownTimeRow.style.display = s.countdownFixed ? '' : 'none';
        this.el.countdown.style.display       = s.countdownVisible ? '' : 'none';
        const igjen = document.querySelector('.igjen');
        if (igjen) igjen.style.display        = s.countdownVisible ? '' : 'none';
        this.el.settingOneway.checked         = s.oneWay;
        this.el.undoBtnCell.style.display     = 'flex';
        this.el.settingTooltip.checked        = s.tooltipEnabled;
        this.el.settingChances.checked        = s.chancesVisible;
        this.el.statsRow.classList.toggle('hidden', !s.chancesVisible);
        this.el.settingSound.checked          = s.soundEnabled;
        this.el.settingHoverStyle.value       = s.hoverStyle;
        this.el.settingCallStyle.value        = s.callStyle;
        this.el.settingSelectStyle.value      = s.selectStyle;
        this.el.settingSwitchStyle.value      = s.switchStyle;
        this.el.settingConfirmStyle.value     = s.confirmStyle;
        this.el.settingCancelStyle.value      = s.cancelStyle;
        this.el.settingResetStyle.value       = s.resetStyle;
        this.el.settingResetHardStyle.value   = s.resetHardStyle;
        if (this.el.settingOvertimeStyle)   this.el.settingOvertimeStyle.value   = s.overtimeStyle;
        if (this.el.volOvertime)            this.el.volOvertime.value            = s.volOvertime;
        if (this.el.settingFirstRekkeStyle) this.el.settingFirstRekkeStyle.value = s.firstRekkeStyle;
        if (this.el.volFirstRekke)          this.el.volFirstRekke.value          = s.volFirstRekke;
        // Restore mute button states
        document.querySelectorAll('.sound-mute-btn').forEach(btn => {
            const muted = !!(s.mutedSounds?.[btn.dataset.soundType]);
            btn.classList.toggle('muted', muted);
            btn.textContent = muted ? '🔇' : '🔊';
        });
        if (this.el.settingTypingDelay) this.el.settingTypingDelay.textContent = s.typingDelay ?? 8;
        if (this.el.settingTypingOverwrite) {
            this.el.settingTypingOverwrite.checked = s.typingOverwrite ?? false;
            this.el.settingOverwriteDelay.textContent = s.typingOverwriteDelay ?? 10;
            this.el.overwriteDelayRow.style.display = s.typingOverwrite ? '' : 'none';
        }
        this.el.bigNumber.dataset.ballAnim = s.ballAnimStyle ?? 'spin';
        if (this.el.settingBallAnim) this.el.settingBallAnim.value = s.ballAnimStyle ?? 'spin';
        if (this.el.settingGridLayout) this.el.settingGridLayout.value = s.gridLayout || 'horizontal';
        this.applyGridLayout();
        this.el.volHover.value     = s.volHover;
        this.el.volCall.value      = s.volCall;
        this.el.volSelect.value    = s.volSelect;
        this.el.volSwitch.value    = s.volSwitch;
        this.el.volConfirm.value   = s.volConfirm;
        this.el.volCancel.value    = s.volCancel;
        this.el.volReset.value     = s.volReset;
        this.el.volResetHard.value = s.volResetHard;
        this.syncThemeColorUI();

        // Over-average blink
        if (this.el.settingOverAverageBlink) {
            this.el.settingOverAverageBlink.checked = s.overAverageBlinkEnabled ?? true;
            document.body.classList.toggle('no-over-average-blink', !(s.overAverageBlinkEnabled ?? true));
        }

        // Auto backup
        if (this.el.settingAutoBackup) {
            this.el.settingAutoBackup.checked = s.autoBackupDownload ?? true;
        }

        // Blur
        if (this.el.settingBlur) {
            this.el.settingBlur.checked = s.blurEnabled ?? true;
            document.body.classList.toggle('no-blur', !(s.blurEnabled ?? true));
        }

        // Random button
        if (this.el.settingRandomBtn) {
            const enabled = s.randomBtnEnabled ?? true;
            this.el.settingRandomBtn.checked = enabled;
            this.el.randomBtnCell.style.display = enabled ? '' : 'none';
        }

        // BingoView highlight
        if (this.el.bvHighlightEnabled) {
            const hlOn = s.bvHighlightEnabled ?? true;
            this.el.bvHighlightEnabled.checked = hlOn;
            if (this.el.bvHighlightRekkeRow)
                this.el.bvHighlightRekkeRow.style.display = hlOn ? '' : 'none';
            if (this.el.bvHighlightThresholdRow)
                this.el.bvHighlightThresholdRow.style.display = hlOn ? '' : 'none';
        }
        if (this.el.bvHighlightRekke)
            this.el.bvHighlightRekke.value = s.bvHighlightRekke || 'current';
        if (this.el.bvThresholdValue)
            this.el.bvThresholdValue.textContent = s.bvHighlightThreshold ?? 2;
        if (this.el.bvCallTimerValue)
            this.el.bvCallTimerValue.textContent = s.bvCallTimerSeconds ?? 30;
        if (this.el.bvWinNotifyEnabled)
            this.el.bvWinNotifyEnabled.checked = s.bvWinNotifyEnabled ?? true;
        if (this.el.bvWinAutoOpen)
            this.el.bvWinAutoOpen.checked = s.bvWinAutoOpenWinModal ?? false;

        // Next-game countdown
        if (this.el.settingNextGameCountdown) {
            this.el.settingNextGameCountdown.checked = s.nextGameCountdownEnabled ?? false;
            this.el.nextGameCdDurRow.style.display = (s.nextGameCountdownEnabled ?? false) ? '' : 'none';
            this.el.nextGameCdMin.textContent = s.nextGameCountdownMinutes ?? 3;
            this.el.nextGameCdSec.textContent = String(s.nextGameCountdownSeconds ?? 0).padStart(2, '0');
        }
    }

    openSettingsModal() {
        this.playSound('select');
        document.body.style.overflow = 'hidden';

        // Cache once — this function is called every time the modal opens
        const navItems    = document.querySelectorAll('.settings-nav-item[data-panel]');
        const navPanels   = document.querySelectorAll('.settings-panel');

        // Wire up nav item panel switching (idempotent)
        navItems.forEach(btn => {
            if (btn._navBound) return;
            btn._navBound = true;
            btn.addEventListener('click', () => {
                // Deactivate all
                navItems.forEach(b => b.classList.remove('active'));
                navPanels.forEach(p => p.classList.remove('active'));
                // Activate clicked
                btn.classList.add('active');
                const panel = document.getElementById(btn.dataset.panel);
                if (panel) panel.classList.add('active');
                // Color preview mode when on Spillfarger panel
                this.el.settingsModal.classList.toggle('color-preview-mode', btn.dataset.panel === 'sg-themecolors');
            });
        });

        // Restore last active panel
        const lastPanel = localStorage.getItem('bingoSettingsPanel') || 'sg-progress';
        navItems.forEach(b => {
            b.classList.toggle('active', b.dataset.panel === lastPanel);
        });
        navPanels.forEach(p => {
            p.classList.toggle('active', p.id === lastPanel);
        });
        this.el.settingsModal.classList.toggle('color-preview-mode', lastPanel === 'sg-themecolors');

        // Save active panel on switch
        navItems.forEach(btn => {
            if (btn._navPersistBound) return;
            btn._navPersistBound = true;
            btn.addEventListener('click', () => {
                localStorage.setItem('bingoSettingsPanel', btn.dataset.panel);
            });
        });

        this.el.settingsModal.style.display = 'flex';
        this.renderColorPresets();
        this.syncSettingsThemeSwitcher();
    }

    closeSettingsModal() {
        this.playSound('cancel');
        this.el.settingsModal.style.display = 'none';
        this.restoreBodyScroll();
    }

    exportSettings() {
        const jsonKeys  = ['bingoSettings', 'bingoThemeColors', 'bingoColorPresets', 'bingoFlareSettings'];
        const plainKeys = ['bingoTheme'];
        const data = {};
        jsonKeys.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) try { data[k] = JSON.parse(val); } catch(e) {}
        });
        // User sounds live in IndexedDB now — export from the in-memory mirror
        if (Object.keys(this._userSounds || {}).length) {
            data.bingoUserSounds = this._userSounds;
        }
        plainKeys.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) data[k] = val;
        });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'bingo-innstillinger.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    importSettings(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const jsonKeys  = ['bingoSettings', 'bingoThemeColors', 'bingoColorPresets', 'bingoFlareSettings'];
                const plainKeys = ['bingoTheme'];
                let imported = 0;
                jsonKeys.forEach(k => {
                    if (k in data) { localStorage.setItem(k, JSON.stringify(data[k])); imported++; }
                });
                plainKeys.forEach(k => {
                    if (k in data) { localStorage.setItem(k, data[k]); imported++; }
                });
                // User sounds go straight to IndexedDB (too big for localStorage).
                // Await the writes so they survive the reload below.
                if (data.bingoUserSounds && typeof data.bingoUserSounds === 'object') {
                    for (const [key, snd] of Object.entries(data.bingoUserSounds)) {
                        await this._idbPutSound(key, snd);
                    }
                    imported++;
                }
                if (imported === 0) {
                    alert('Ingen gyldige innstillinger funnet i filen.');
                    return;
                }
                // Reload the page so all settings apply cleanly from scratch
                window.location.reload();
            } catch {
                alert('Kunne ikke lese filen. Kontroller at det er en gyldig JSON-fil.');
            }
        };
        reader.readAsText(file);
    }

    // ── Slot helpers ────────────────────────────────
    get slot() { return this.slots[this.currentTheme]; }

    saveSlotToStorage() {
        this.scheduleWrite('bingoSlots', () => JSON.stringify(this.slots));
        this.scheduleWrite('bingoTheme', () => this.currentTheme);
    }

    loadFromStorage() {
        const savedSlots = localStorage.getItem('bingoSlots');
        const savedTheme = localStorage.getItem('bingoTheme') || 'default';
        if (savedSlots) {
            try {
                const parsed = JSON.parse(savedSlots);
                // Merge in case new keys were added
                ['default', ...GAME_THEMES].forEach(t => {
                    if (parsed[t]) this.slots[t] = parsed[t];
                });
            } catch(e) {}
        }
        this.currentTheme = savedTheme;

        // Restore average filter
        const savedFilter = localStorage.getItem('bingoAvgFilter');
        this.avgFilter = (savedFilter && savedFilter !== '') ? parseInt(savedFilter, 10) : null;

        // Load settings
        const savedSettings = localStorage.getItem('bingoSettings');
        if (savedSettings) {
            try { Object.assign(this.settings, JSON.parse(savedSettings)); } catch(e) {}
        }
        // Repair corrupt volume values. Old builds could persist NaN (JSON
        // null) from parseFloat on an empty slider, and a null/NaN volume
        // makes every sound of that type silently fail — gain ends up 0 or
        // assignment throws inside playSound's try/catch.
        Object.keys(this.settings).forEach(k => {
            if (k.startsWith('vol') && !Number.isFinite(this.settings[k])) {
                this.settings[k] = 1;
            }
        });
        const savedThemeColors = localStorage.getItem('bingoThemeColors');
        if (savedThemeColors) {
            try {
                const parsed = JSON.parse(savedThemeColors);
                COLOR_THEMES.forEach(t => {
                    if (parsed[t]) Object.assign(this.themeColors[t], parsed[t]);
                });
            } catch(e) {}
        }
    }

    // ── Apply current slot state to the DOM ─────────
    applySlotToDOM() {
        const s = this.slot;

        // Restore theme visually
        document.body.classList.remove('theme-blue','theme-yellow','theme-pink','theme-grey');
        if (this.currentTheme !== 'default') {
            document.body.classList.add(`theme-${this.currentTheme}`);
        }
        this.applyThemeColors();
        this.updateThemeButtonColors();
        this.el.themeButtons.forEach(btn =>
            btn.classList.toggle('active', btn.dataset.theme === this.currentTheme)
        );
        this.syncSettingsThemeSwitcher();

        // Restore ball states
        this._lastClickedBall = null;
        this.el.balls.forEach(ball => {
            ball.classList.remove('clicked', 'recently-selected', 'jackpot', 'last-clicked');
            const num = ball.dataset.num;
            if (s.selectedNumbers.includes(num)) {
                ball.classList.add('clicked');
                if (num === s.bigNumber) {
                    ball.classList.add('last-clicked');
                    this._lastClickedBall = ball;
                }
            }
            if (s.jackpotNumber === num) {
                ball.classList.add('jackpot');
            }
        });

        // Restore big number
        this.el.bigNumberText.textContent = s.bigNumber || '';

        // Restore rekke buttons
        const rekkeOrder  = ['Rekke1','Rekke2','Rekke3'];
        const activeIndex = rekkeOrder.indexOf(s.currentRekke);
        this.el.rekkeBtns.forEach((btn, i) =>
            btn.classList.toggle('active', i <= activeIndex)
        );

        // Jackpot mode always off on slot switch
        this.jackpotMode = false;
        this.el.jackpotButton.textContent = 'Jackpot';
        this.el.jackpotButton.classList.remove('active');

        this.updateRecentNumbers();
        this.updateCounter();
        this.updateChances();
        this.updateAverageHighlight();
        this.updateGameIndicator();
        this.checkSaveSessionButton();
        this.updateRekke3BtnState();
        this.updateSpillFerdig();
        this.updateWinnerIndicator();
    }

    // ── Ball Click Handling ──────────────────────────
    handleBallClick(event) {
        const ball = event.currentTarget;
        if (ball.dataset.skipBall) return;  // ignore grid button cells
        const number = ball.dataset.num;
        if (!number) return;  // safety: ball wasn't initialised
        if (this.jackpotMode) {
            this.handleJackpotClick(ball, number);
        } else {
            this.handleNormalClick(ball, number);
        }
    }

    handleJackpotClick(ball, number) {
        const isToggleOff = this.slot.jackpotNumber === number;
        if (isToggleOff) {
            // Animate circle breaking before removing it
            ball.classList.add('jackpot-break');
            setTimeout(() => {
                ball.classList.remove('jackpot', 'jackpot-break');
            }, 400);
        } else {
            this.el.balls.forEach(b => b.classList.remove('jackpot', 'jackpot-break'));
        }
        this.slot.jackpotNumber = isToggleOff ? null : number;
        if (!isToggleOff) {
            ball.classList.add('jackpot');
            this.playSound('call');
        }

        // Capture prevTheme before any state reset
        const prevTheme = this.jackpotPrevTheme;
        this.jackpotPrevTheme = null;
        this.clearJackpotHighlight();
        this.saveSlotToStorage();
        this.bvSendJackpot();

        // Switch back to previous theme if we auto-switched and a number was set
        if (!isToggleOff && prevTheme) {
            this.currentTheme = prevTheme;
            this.saveSlotToStorage();
            this.applySlotToDOM();
            this.showJackpotFlash(number);
        }
    }

    showJackpotFlash(number) {
        const flash = this.el.jackpotFlash;
        flash.textContent = `Jackpot satt på ${number} i Spill 4`;
        flash.style.display = 'block';
        flash.style.animation = 'none';
        void flash.offsetWidth;
        flash.style.animation = 'jackpotFlashIn .3s ease-out';
        clearTimeout(this._jackpotFlashTimer);
        this._jackpotFlashTimer = setTimeout(() => {
            flash.style.display = 'none';
        }, 3000);
    }

    handleNormalClick(ball, number) {
        const nums = this.slot.selectedNumbers;
        if (nums.includes(number)) {
            if (this.settings.oneWay) return; // one-way: ignore deselect clicks
            this.playSound('close');
            this.slot.selectedNumbers = nums.filter(n => n !== number);
            ball.classList.remove('clicked', 'recently-selected', 'last-clicked');
            if (this._lastClickedBall === ball) this._lastClickedBall = null;
            // Fall back to the most recent remaining call — deselecting an OLD
            // number shouldn't blank the big display; only deselecting the
            // latest call should step the display back to the previous one.
            const remaining = this.slot.selectedNumbers;
            this.slot.bigNumber = remaining.length ? remaining[remaining.length - 1] : '';
            this.el.bigNumberText.textContent = this.slot.bigNumber;
            if (this.slot.bigNumber && !this._lastClickedBall) {
                const newLast = this.el.ballMap.get(this.slot.bigNumber);
                if (newLast) {
                    newLast.classList.add('last-clicked');
                    this._lastClickedBall = newLast;
                }
            }
            this.bvSendUncall(number);
        } else {
            // If this is the jackpot number being called, break the circle
            if (number === this.slot.jackpotNumber) {
                ball.classList.add('jackpot-break');
                setTimeout(() => {
                    ball.classList.remove('jackpot', 'jackpot-break');
                    this.slot.jackpotNumber = null;
                    this.saveSlotToStorage();
                    this.bvSendJackpot();
                }, 400);
            }
            const isFirstOfRekke = nums.length === (this.slot.countAtLastRekkeChange || 0);
            this.slot.selectedNumbers.push(number);
            // Remove last-clicked from previous ball
            if (this._lastClickedBall && this._lastClickedBall !== ball) {
                this._lastClickedBall.classList.remove('last-clicked');
            }
            this._lastClickedBall = ball;
            ball.classList.add('clicked', 'recently-selected', 'last-clicked');
            this.slot.bigNumber = number;
            this.el.bigNumberText.textContent = number;
            this.el.bigNumber.classList.add('number-update');
            // If the "Neste spill om" countdown is running, a new call means
            // the next game hasn't actually started yet — cancel the timer.
            this.stopNextGameCountdown();
            this.bvSend(number);
            this.playSound('call');
            if (isFirstOfRekke) setTimeout(() => this.playSound('first-rekke'), 80);
            this.checkOvertimeSound();
            this.startBigNumberProgress();
            setTimeout(() => {
                ball.classList.remove('recently-selected');
                this.el.bigNumber.classList.remove('number-update');
            }, 800);
        }
        this.updateDisplay();
        this.saveSlotToStorage();
    }

    checkOvertimeSound() {
        if (!this.settings.soundEnabled) return;
        if (this.settings.overtimeStyle === 'off') return;
        const rekke = this.slot.currentRekke;
        if (!this.slot.overtimeFired) this.slot.overtimeFired = { Rekke1: false, Rekke2: false, Rekke3: false };
        if (this.slot.overtimeFired[rekke]) return;
        const count = this.slot.selectedNumbers.length;
        const threshold = this.slot.thresholds[rekke].threshold;
        if (count > threshold) {
            this.slot.overtimeFired[rekke] = true;
            // Delay so it plays after the call sound finishes
            setTimeout(() => this.playSound('overtime'), 400);
        }
    }

    startBigNumberProgress() {
        if (!this.settings.progressEnabled) return;
        const duration  = this.settings.progressDuration;
        const style     = this.settings.progressStyle || 'wave';
        const fill      = this.el.bigNumberFill;

        clearTimeout(this._progressTimer);
        if (this._progressRaf) cancelAnimationFrame(this._progressRaf);

        // Flip the fill direction on every call. Using a dedicated toggle
        // rather than _progressCompleted avoids the bug where _progressCompleted
        // is always true from the 2nd completed animation onwards, making every
        // subsequent fill white instead of alternating.
        this._fillIsWhite = !this._fillIsWhite;
        const isWhite = !!this._fillIsWhite;
        this._progressCompleted = false;

        // Read initial colours for background setup. We snapshot the accent
        // once at run start instead of re-reading each frame: getComputedStyle
        // forces a style flush, which on iPad costs measurable time at 60fps.
        // Live accent edits during a single ~5s progress run are vanishingly
        // rare; the next call picks up the new value.
        const initAccent = getComputedStyle(document.body)
            .getPropertyValue('--accent-color').trim() || '#F1B924';
        const initBgColor = isWhite ? initAccent : '#ffffff';

        this.el.bigNumber.style.transition = 'none';
        this.el.bigNumber.style.backgroundColor = initBgColor;
        void this.el.bigNumber.offsetWidth;
        this.el.bigNumber.style.transition = '';

        fill.innerHTML = '';
        const canvas = document.createElement('canvas');
        fill.appendChild(canvas);

        // Read dimensions once — avoids a forced reflow on every animation frame
        canvas.width  = fill.offsetWidth;
        canvas.height = fill.offsetHeight;

        const ctx = canvas.getContext('2d');
        const startTime = performance.now();
        const fillColor = isWhite ? '#ffffff' : initAccent;
        const bigNumberBg = isWhite ? initAccent : '#ffffff';
        // Apply once; no need to re-set every frame
        this.el.bigNumber.style.backgroundColor = bigNumberBg;

        const drawFrame = (p, elapsed) => {
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = fillColor;

            if (style === 'wave') {
                const surfaceY = h * (1 - p);
                const amp    = h * 0.04;
                const freq   = w * 0.7;
                // Scale speed proportionally to width so it looks the same as the 160px test ball
                const offset = (elapsed * w * 0.375) % freq;
                ctx.beginPath();
                ctx.moveTo(0, h);
                for (let x = 0; x <= w; x++) {
                    ctx.lineTo(x, surfaceY + Math.sin((x + offset) / freq * Math.PI * 2) * amp);
                }
                ctx.lineTo(w, h);
                ctx.closePath();
                ctx.fill();

            } else if (style === 'doubleWave') {
                const surfaceY = h * (1 - p);
                const drawWave = (amp, freq, speedFactor, alpha) => {
                    const offset = (elapsed * w * speedFactor) % freq;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = fillColor;
                    ctx.beginPath();
                    ctx.moveTo(0, h);
                    for (let x = 0; x <= w; x++) {
                        ctx.lineTo(x, surfaceY + Math.sin((x + offset) / freq * Math.PI * 2) * amp);
                    }
                    ctx.lineTo(w, h);
                    ctx.closePath();
                    ctx.fill();
                };
                drawWave(h * 0.05, w * 0.65, 0.344, 0.5);
                drawWave(h * 0.03, w * 0.85, 0.5, 1);
                ctx.globalAlpha = 1;

            } else if (style === 'radialCW') {
                const cx = w / 2, cy = h / 2, r = Math.max(w, h);
                const endAngle = -Math.PI / 2 + p * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, -Math.PI / 2, endAngle);
                ctx.closePath();
                ctx.fill();

            } else if (style === 'radialCCW') {
                const cx = w / 2, cy = h / 2, r = Math.max(w, h);
                const endAngle = Math.PI / 2 - p * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, Math.PI / 2, endAngle, true);
                ctx.closePath();
                ctx.fill();

            } else if (style === 'iris') {
                const cx = w / 2, cy = h / 2;
                const maxR = Math.sqrt(cx * cx + cy * cy);
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * p + 2, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const draw = (now) => {
            const elapsed  = (now - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);

            drawFrame(progress, elapsed);

            if (progress < 1) {
                this._progressRaf = requestAnimationFrame(draw);
            } else {
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                this._progressCompleted = true;
            }
        };

        this._progressRaf = requestAnimationFrame(draw);
    }

    // ── Display Updates ──────────────────────────────
    updateDisplay() {
        this.updateRecentNumbers();
        this.updateCounter();
        this.updateChances();
        this.resetInactivityTimer();
        this.cancelResetConfirm();
    }

    updateRecentNumbers() {
        const all    = [...this.slot.selectedNumbers].reverse();
        const recent = all.slice(0, 9);
        this.el.recentNumbers.innerHTML = '';

        const cutoff = all.length - (this.slot.countAtLastRekkeChange || 0);
        recent.forEach((num, i) => {
            const div = document.createElement('div');
            div.textContent = num;
            if (i === 0) div.classList.add('new-number');
            if (this.slot.countAtLastRekkeChange > 0 && i >= cutoff) div.classList.add('prev-rekke');
            this.el.recentNumbers.appendChild(div);
        });

        setTimeout(() => {
            this.el.recentNumbers.querySelectorAll('.new-number')
                .forEach(el => el.classList.remove('new-number'));
        }, 600);

        // Show/hide expand button
        this.el.recentExpandBtn.style.display = all.length > 9 ? 'block' : 'none';

        // Update full list if expanded
        if (this.el.recentNumbersAll.style.display !== 'none') {
            this.renderFullRecentNumbers(all);
        }
    }

    renderFullRecentNumbers(all) {
        this.el.recentNumbersAll.innerHTML = '';
        all.forEach(num => {
            const div = document.createElement('div');
            div.textContent = num;
            this.el.recentNumbersAll.appendChild(div);
        });
        this.el.recentNumbersAll.scrollTop = 0;
    }

    toggleRecentExpand() {
        const isOpen = this.el.recentNumbersAll.style.display !== 'none';
        if (isOpen) {
            this.el.recentNumbersAll.style.display = 'none';
            this.el.recentExpandBtn.classList.remove('expanded');
        } else {
            const all = [...this.slot.selectedNumbers].reverse();
            this.renderFullRecentNumbers(all);
            this.el.recentNumbersAll.style.display = 'grid';
            this.el.recentExpandBtn.classList.add('expanded');
        }
    }

    updateCounter() {
        const count = this.slot.selectedNumbers.length;
        const { threshold, startingPoint } = this.slot.thresholds[this.slot.currentRekke];

        const rangeSize = Math.max(threshold - startingPoint, 1);
        const progress  = Math.min(Math.max(count - startingPoint, 0) / rangeSize, 1);
        this.el.circle.style.setProperty('--progress-angle', `${progress * 360}deg`);

        const rekke3Threshold = this.slot.thresholds["Rekke3"].threshold;
        const outerProgress = Math.min(count / rekke3Threshold, 1);
        this.el.circle.style.setProperty('--outer-progress-angle', `${outerProgress * 360}deg`);

        this.el.circle.textContent = count;
        const gameDone = this.slot.loggedRekkes.Rekke3 !== null;
        this.el.circle.classList.toggle('over-average', count > threshold);
        this.el.circle.classList.toggle('game-done', gameDone);
        this.el.circle.classList.add('count-update');
        setTimeout(() => this.el.circle.classList.remove('count-update'), 500);

        const diff = count - threshold;
        this.el.difference.textContent = diff > 0 ? `+${diff}` : `${diff}`;
        this.el.difference.classList.toggle('positive', diff > 0);
        this.el.difference.classList.toggle('negative', diff < 0);
    }

    updateChances() {
        const remaining = 90 - this.slot.selectedNumbers.length;
        if (remaining <= 0) {
            ['chance1','chance2','chance3'].forEach(id => this.el[id].textContent = '0%');
            return;
        }
        [1,2,3].forEach((n, i) => {
            this.el[`chance${i+1}`].textContent = ((n / remaining) * 100).toFixed(2) + '%';
        });
    }

    // ── Rekke Change (with confirmation) ────────────
    handleRekkeChangeRequest(event) {
        const newRekke = event.currentTarget.dataset.rekke;
        this.hideRekkeTooltip();
        this.resetInactivityTimer();
        if (this.jackpotMode) this.clearJackpotHighlight();
        if (newRekke === this.slot.currentRekke) {
            if (newRekke === 'Rekke3'
                && this.currentTheme !== 'default'
                && this.slot.loggedRekkes.Rekke3 === null) {
                this.handleLogRekke3();
            }
            return;
        }

        // Only confirm if switching forward (1→2 or 2→3) — backwards is just navigation
        const order = ['Rekke1','Rekke2','Rekke3'];
        const currentIdx = order.indexOf(this.slot.currentRekke);
        const newIdx     = order.indexOf(newRekke);
        const isForward  = newIdx > currentIdx;

        // Only show prompt when moving forward and in an active game (not default)
        if (isForward && this.currentTheme !== 'default') {
            this.playSound('select');
            this.pendingRekke = newRekke;
            const label = this.slot.currentRekke.replace('Rekke','Rekke ');
            this.showRekkeConfirm(label, this.slot.selectedNumbers.length);
        } else {
            this.playSound('select');
            this.applyRekkeChange(newRekke, false);
        }
    }

    showRekkeConfirm(label, count) {
        this.pendingCount = count;
        this.el.modalText.textContent = `Lagre ${label}: ${count} tall?`;
        this.el.rekkeAdjustCount.textContent = count;
        this.el.rekkeConfirm.style.display = 'block';
        this.el.rekkeBackdrop.style.display = 'block';
    }

    adjustRekkeCount(delta) {
        this.pendingCount = Math.max(0, Math.min(90, (this.pendingCount || 0) + delta));
        this.el.rekkeAdjustCount.textContent = this.pendingCount;
    }

    confirmRekkeChange() {
        this.playSound('confirm');
        this.el.rekkeConfirm.style.display = 'none';
        this.el.rekkeBackdrop.style.display = 'none';
        if (this.pendingRekke === null) {
            // Logging Rekke3 in place (no rekke switch)
            this.slot.loggedRekkes['Rekke3'] = this.pendingCount;
            this.checkSaveSessionButton();
            this.saveSlotToStorage();
            this.startNextGameCountdown();
        } else {
            // Log current rekke and switch to next
            if (this.currentTheme !== 'default') {
                this.slot.loggedRekkes[this.slot.currentRekke] = this.pendingCount;
            }
            this.applyRekkeChange(this.pendingRekke, true);
            this.pendingRekke = null;
            this.checkSaveSessionButton();
            this.saveSlotToStorage();
        }
    }

    cancelRekkeChange() {
        this.playSound('cancel');
        this.el.rekkeConfirm.style.display = 'none';
        this.el.rekkeBackdrop.style.display = 'none';
        this.pendingRekke = null;
    }

    applyRekkeChange(newRekke, wasLogged) {
        const rekkeData = this.slot.thresholds[newRekke];
        const count     = this.slot.selectedNumbers.length;
        const defaultSP = DEFAULT_THRESHOLDS[newRekke].startingPoint;
        rekkeData.startingPoint = count > rekkeData.threshold ? defaultSP : count;

        this.slot.currentRekke = newRekke;
        this.slot.countAtLastRekkeChange = this.slot.selectedNumbers.length;
        if (!this.slot.overtimeFired) this.slot.overtimeFired = { Rekke1: false, Rekke2: false, Rekke3: false };

        const order = ['Rekke1','Rekke2','Rekke3'];
        const idx   = order.indexOf(newRekke);
        this.el.rekkeBtns.forEach((btn, i) =>
            btn.classList.toggle('active', i <= idx)
        );

        this.updateRecentNumbers();
        this.updateCounter();
        this.updateAverageHighlight();
        this.checkSaveSessionButton();
        this.saveSlotToStorage();
        this.bvSendState();
    }

    // ── Theme Switching ──────────────────────────────
    handleThemeSwitch(event) {
        this.switchTheme(event.currentTarget.dataset.theme);
    }

    switchTheme(newTheme) {
        if (newTheme === this.currentTheme) return;
        if (this.jackpotMode) this.clearJackpotHighlight();
        this.currentTheme = newTheme;
        this.playSound('switch');
        this.resetProgressBar();
        this.saveSlotToStorage();
        this.applySlotToDOM();
        this.updateAverages();
        this.syncSettingsThemeSwitcher();
        this.bvSendState();
    }

    syncSettingsThemeSwitcher() {
        document.querySelectorAll('.settings-theme-btn[data-theme]').forEach(btn => {
            const c = this.themeColors[btn.dataset.theme] || DEFAULT_THEME_COLORS[btn.dataset.theme];
            if (c) {
                btn.style.setProperty('--btn-accent',  c.accent);
                btn.style.setProperty('--btn-primary', c.primary);
            }
            btn.classList.toggle('active', btn.dataset.theme === this.currentTheme);
        });
        // Also refresh block highlights in the colour editor
        COLOR_THEMES.forEach(theme => {
            const block = document.querySelector(`.theme-color-block[data-theme="${theme}"]`);
            if (block) block.classList.toggle('active-theme', theme === this.currentTheme);
        });
    }

    resetProgressBar() {
        if (this._progressRaf) cancelAnimationFrame(this._progressRaf);
        clearTimeout(this._progressTimer);
        this._progressRaf      = null;
        this._progressCompleted = false;
        this._fillIsWhite       = false;  // next fill starts with theme colour
        this.el.bigNumberFill.innerHTML = '';
        this.el.bigNumber.style.transition = 'none';
        this.el.bigNumber.style.backgroundColor = 'white';
        void this.el.bigNumber.offsetWidth;
        this.el.bigNumber.style.transition = '';
    }

    // ── Average boxes ────────────────────────────────
    updateAverageHighlight() {
        const order = ['Rekke1','Rekke2','Rekke3'];
        [this.el.avgBox1, this.el.avgBox2, this.el.avgBox3].forEach((box, i) => {
            box.classList.toggle('active-rekke', order[i] === this.slot.currentRekke);
        });
    }

    updateAverages(sessions = null) {
        if (!sessions) sessions = this.getSessions();
        const avgs = this.computeAverages(sessions, this.avgFilter);

        // Resolved averages (fall back to defaults if no data yet)
        const resolved = [
            avgs[0] !== null ? avgs[0] : 16,
            avgs[1] !== null ? avgs[1] : 39,
            avgs[2] !== null ? avgs[2] : 57,
        ];

        // Update display boxes
        this.el.avgBox1.textContent = resolved[0];
        this.el.avgBox2.textContent = resolved[1];
        this.el.avgBox3.textContent = resolved[2];

        // Update thresholds in ALL slots so difference counter + progress ring use real averages
        const keys = ['Rekke1', 'Rekke2', 'Rekke3'];
        ['default', ...GAME_THEMES].forEach(t => {
            keys.forEach((k, i) => {
                this.slots[t].thresholds[k].threshold = resolved[i];
            });
        });

        // Re-render counter with updated thresholds
        this.updateCounter();
    }

    computeAverages(sessions, lastN = null) {
        const src = lastN ? sessions.slice(-lastN) : sessions;
        const sums  = [0, 0, 0];
        const counts = [0, 0, 0];
        const keys = ['rekke1', 'rekke2', 'rekke3'];
        src.forEach(session => {
            session.games.forEach(game => {
                keys.forEach((k, i) => {
                    if (game[k] !== null && game[k] !== undefined && game[k] !== '') {
                        sums[i]  += Number(game[k]);
                        counts[i]++;
                    }
                });
            });
        });
        return sums.map((s, i) => counts[i] > 0 ? Math.round(s / counts[i]) : null);
    }

    // ── Game Indicator ───────────────────────────────
    updateGameIndicator() {
        const theme = this.currentTheme;
        if (theme === 'default') {
            this.el.gameIndicator.innerHTML = '';
            return;
        }
        const logged  = this.slot.loggedRekkes;
        const parts   = [];
        if (logged.Rekke1 !== null) parts.push(`R1: ${logged.Rekke1}`);
        if (logged.Rekke2 !== null) parts.push(`R2: ${logged.Rekke2}`);
        if (logged.Rekke3 !== null) parts.push(`R3: ${logged.Rekke3}`);
        const name    = GAME_NAMES[theme];
        let html      = parts.length ? `${name} — ${parts.join(' · ')}` : name;

        // Append winner info for current game. Each line carries its index
        // into the FULL pending array plus edit/remove buttons so a
        // mis-logged winner can be fixed before the session is saved.
        const pending     = this.getPendingWinners();
        const gameWinners = [];
        pending.forEach((w, i) => { if (w.game === theme) gameWinners.push({ w, i }); });
        if (gameWinners.length > 0) {
            const winnerLines = gameWinners
                .map(({ w, i }) =>
                    `<span class="gi-win-line" data-pidx="${i}">` +
                    `🏆 ${this._escapeHtml(w.name)} · ${w.rekke.replace('Rekke','R')} · ${w.prize} kr${w.split > 1 ? ` (1/${w.split})` : ''}` +
                    `<button class="gi-win-btn gi-win-edit" title="Rediger vinner">✎</button>` +
                    `<button class="gi-win-btn gi-win-del" title="Fjern vinner">✕</button>` +
                    `</span>`)
                .join('<br>');
            html += `<br><span style="font-size:.8rem;opacity:.85">${winnerLines}</span>`;
        }
        this.el.gameIndicator.innerHTML = html;
    }

    // ── Save Session ─────────────────────────────────
    handleLogRekke3() {
        if (this.currentTheme === 'default') return;
        if (this.slot.currentRekke !== 'Rekke3') return;
        this.pendingRekke = null;
        this.showRekkeConfirm('Rekke 3', this.slot.selectedNumbers.length);
    }

    checkSaveSessionButton() {
        const allDone = GAME_THEMES.every(t => this.slots[t].loggedRekkes.Rekke3 !== null);
        const wasDone = this._allGamesDone || false;
        this._allGamesDone = allDone;
        this.el.saveSessionBtn.style.display = allDone ? 'block' : 'none';
        // Show suggestion modal when all 4 games become done
        if (allDone && !wasDone && this.el.suggestSaveModal) {
            setTimeout(() => {
                this.el.suggestSaveModal.style.display = 'flex';
            }, 600);
        }

        const isGame       = this.currentTheme !== 'default';

        // Winner button: always visible in active game
        this.el.logWinnerBtn.style.display = isGame ? 'inline-flex' : 'none';

        // Update rekke3 button visual
        this.updateRekke3BtnState();
        this.updateSpillFerdig();

        this.updateWinnerIndicator();
        this.updateGameIndicator();
    }

    openSessionModal() {
        const now = new Date();
        this.el.sessionDateLabel.textContent =
            now.toLocaleDateString('no-NO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

        // Build grid
        const grid = this.el.sessionGrid;
        grid.innerHTML = '';

        // Header row
        ['', 'Rekke 1', 'Rekke 2', 'Rekke 3'].forEach(h => {
            const div = document.createElement('div');
            div.className   = 'session-grid-header';
            div.textContent = h;
            grid.appendChild(div);
        });

        // One row per game theme
        const pending = this.getPendingWinners();
        GAME_THEMES.forEach(theme => {
            const label = document.createElement('div');
            label.className   = 'session-game-label';
            label.textContent = GAME_NAMES[theme];
            label.style.color = this.themeColors[theme]?.accent || THEME_COLORS[theme];
            grid.appendChild(label);

            const logged = this.slots[theme].loggedRekkes;
            ['Rekke1','Rekke2','Rekke3'].forEach(rk => {
                const cell = document.createElement('div');
                cell.style.position = 'relative';
                cell.style.display  = 'flex';
                cell.style.alignItems = 'center';
                cell.style.gap = '4px';

                const input = document.createElement('input');
                input.type          = 'number';
                input.min           = '1';
                input.max           = '90';
                input.className     = 'session-input';
                input.placeholder   = '–';
                input.dataset.theme = theme;
                input.dataset.rekke = rk;
                input.style.flex    = '1';
                if (logged[rk] !== null) input.value = logged[rk];
                cell.appendChild(input);

                // Trophy icon if a winner was logged for this game+rekke
                const won = pending.find(w => w.game === theme && w.rekke === rk);
                if (won) {
                    const trophy = document.createElement('span');
                    trophy.className   = 'session-rekke-won';
                    trophy.textContent = '🏆';
                    trophy.title       = won.name;
                    cell.appendChild(trophy);
                }
                grid.appendChild(cell);
            });
        });

        this.el.sessionModal.style.display = 'flex';
    }

    saveSession() {
        this.playSound('confirm');
        const inputs = this.el.sessionGrid.querySelectorAll('.session-input');
        const games  = {};
        GAME_THEMES.forEach(t => {
            games[t] = { rekke1: null, rekke2: null, rekke3: null };
        });

        inputs.forEach(input => {
            const { theme, rekke } = input.dataset;
            const val = input.value.trim();
            const key = rekke.toLowerCase();
            games[theme][key] = val !== '' ? Number(val) : null;
        });

        const session = {
            date:    new Date().toISOString(),
            games:   GAME_THEMES.map(t => games[t]),
            winners: this.getPendingWinners(),
        };

        const sessions = this.getSessions().slice();
        sessions.push(session);
        this.saveSessions(sessions);

        // Record called-number history (used by frequency heatmap).
        // Snapshots numbers from each game slot at session-save time.
        try {
            const callHist = this.getCallHistory();
            const callEntry = { date: session.date, games: {} };
            COLOR_THEMES.forEach(t => {
                const slot = this.slots[t];
                if (slot && Array.isArray(slot.selectedNumbers) && slot.selectedNumbers.length) {
                    callEntry.games[t] = slot.selectedNumbers.slice();
                }
            });
            // Only record if at least one game had calls
            if (Object.keys(callEntry.games).length) {
                callHist.push(callEntry);
                localStorage.setItem('bingoCallHistory', JSON.stringify(callHist));
            }
        } catch (e) {}

        // Clear all game slot loggedRekkes after saving
        GAME_THEMES.forEach(t => {
            this.slots[t].loggedRekkes = { Rekke1: null, Rekke2: null, Rekke3: null };
        });
        this.saveSlotToStorage();
        // Clear pending winners after save
        localStorage.removeItem('bingoPendingWinners');
        this.closeSessionModal();
        this.checkSaveSessionButton();
        this.updateAverages();
        this.updateGameIndicator();
        this.updateViewerCounts();
        // If dynamic mode, the new session shifts the average — restart so it's live
        if (!this.settings.countdownFixed) this.startCountdown();
        this.updateWinnerIndicator();

        // Automatic backup: internal IndexedDB snapshot always; file download
        // too unless the user switched it off in settings.
        this.performAutoBackup();
    }

    closeSessionModal() {
        this.playSound('cancel');
        this.el.sessionModal.style.display = 'none';
    }

    restoreBodyScroll() {
        // Only restore if no other modals are open
        const modals = ['winner-modal','viewer-modal','session-modal','reset-all-modal',
                        'edit-session-modal','delete-modal','leaderboard-modal',
                        'players-modal','player-history-modal','player-delete-modal','add-win-modal',
                        'edit-win-modal',
                        'settings-modal','upload-sound-modal','bingoview-modal'];
        const anyOpen = modals.some(id => document.getElementById(id).style.display === 'flex');
        if (!anyOpen) document.body.style.overflow = '';
    }

    // ── Fullscreen ───────────────────────────────────
    toggleFullscreen() {
        const isFs = document.body.classList.toggle('fullscreen');
        // Also attempt native fullscreen alongside CSS mode
        if (isFs) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        }
        this.updateFullscreenBtn();
    }

    onFullscreenChange() {
        // Sync CSS class if user exits native fullscreen via Escape key
        if (!document.fullscreenElement) {
            document.body.classList.remove('fullscreen');
            this.updateFullscreenBtn();
        }
    }

    updateFullscreenBtn() {
        const isFs = document.body.classList.contains('fullscreen');
        this.el.fullscreenBtn.textContent = isFs ? '✕' : '⛶';
        this.el.fullscreenBtn.title = isFs ? 'Avslutt fullskjerm' : 'Fullskjerm';
    }

    // ── Winner System ────────────────────────────────

    // Log a new winner for the current game/rekke.
    // (Editing an already-logged win happens in the edit-win modal.)
    openWinnerModal() {
        if (this.currentTheme === 'default') return;
        this.playSound('select');
        const game  = GAME_NAMES[this.currentTheme];
        const rekke = this.slot.currentRekke.replace('Rekke', 'Rekke ');
        const prize = PRIZES[this.currentTheme][this.slot.currentRekke];
        this.el.winnerModalTitle.textContent = `🏆 Vinner — ${game}`;
        this.winnerSelectedPlayers = [];
        this.el.winnerModalSubtitle.textContent = `${rekke} · ${prize} kr`;

        // Reset state
        this.winnerSplitCount      = 1;
        this.el.winnerNameInput.value  = '';
        this.el.winnerSplitInput.value = 1;
        if (this.el.winnerSplitDisplay) this.el.winnerSplitDisplay.textContent = 1;

        this.renderPlayerQuickselect();
        this.renderWinnerSelectedList();
        this.updateWinnerModalState();
        document.body.style.overflow = 'hidden';
        this.el.winnerModal.style.display = 'flex';
        setTimeout(() => this.el.winnerNameInput.focus(), 100);
    }

    closeWinnerModal() {
        this.playSound('cancel');
        this.el.winnerModal.style.display = 'none';
        this.restoreBodyScroll();
    }

    // Add a winner name from the text input to the selected list
    addWinnerFromInput() {
        const name = this.el.winnerNameInput.value.trim();
        if (!name) return;
        if (!this.winnerSelectedPlayers.includes(name)) {
            this.winnerSelectedPlayers.push(name);
            this.addPlayerIfNew(name);
        }
        this.el.winnerNameInput.value = '';
        this.renderPlayerQuickselect();
        this.renderWinnerSelectedList();
        this.updateWinnerModalState();
    }

    // Build the chip list once per player set. Subsequent typing only updates
    // CSS classes / highlight spans on the existing chips — no DOM rebuild,
    // no listener churn. Click is handled via delegation on the container.
    renderPlayerQuickselect() {
        const players   = this.getPlayers();
        const container = this.el.playerQuickselect;

        const playersKey = players.join('\x1f');
        const needsRebuild = container._playersKey !== playersKey;

        if (needsRebuild) {
            container._playersKey = playersKey;
            container.innerHTML = '';
            players.forEach(name => {
                const chip = document.createElement('button');
                chip.className = 'player-chip';
                chip.dataset.name = name;
                // Pre-build the highlight wrapper inside the chip so we can
                // restyle without recreating elements on every keystroke.
                const text = document.createElement('span');
                text.className = 'chip-text';
                text.textContent = name;
                chip.appendChild(text);
                container.appendChild(chip);
            });

            // One-time delegated click handler
            if (!container._delegatedClick) {
                container._delegatedClick = true;
                container.addEventListener('click', e => {
                    const chip = e.target.closest('.player-chip');
                    if (!chip || !container.contains(chip)) return;
                    const name = chip.dataset.name;
                    const idx  = this.winnerSelectedPlayers.indexOf(name);
                    if (idx > -1) {
                        this.winnerSelectedPlayers.splice(idx, 1);
                    } else if (this.winnerSelectedPlayers.length < this.winnerSplitCount) {
                        this.winnerSelectedPlayers.push(name);
                    }
                    this.renderPlayerQuickselect();
                    this.renderWinnerSelectedList();
                    this.updateWinnerModalState();
                });
            }
        }

        // Update each chip's selected/highlight state in place
        const query = this.el.winnerNameInput.value.trim().toLowerCase();
        const chips = container.children;
        for (let i = 0; i < chips.length; i++) {
            const chip = chips[i];
            const name = chip.dataset.name;
            chip.classList.toggle('active', this.winnerSelectedPlayers.includes(name));
            const text = chip.firstElementChild;
            if (query && name.toLowerCase().includes(query)) {
                const idx   = name.toLowerCase().indexOf(query);
                const pre   = name.slice(0, idx);
                const match = name.slice(idx, idx + query.length);
                const post  = name.slice(idx + query.length);
                text.innerHTML = `${this._escapeHtml(pre)}<span class="chip-match">${this._escapeHtml(match)}</span>${this._escapeHtml(post)}`;
            } else if (text.textContent !== name) {
                text.textContent = name;
            }
        }
    }

    renderWinnerSelectedList() {
        const list = this.el.winnerSelectedList;
        list.innerHTML = '';
        if (this.winnerSelectedPlayers.length === 0) return;
        this.winnerSelectedPlayers.forEach((name, i) => {
            const tag = document.createElement('span');
            tag.className = 'winner-selected-tag';
            tag.innerHTML = `${this._escapeHtml(name)} <button class="winner-tag-remove" data-idx="${i}">✕</button>`;
            tag.querySelector('.winner-tag-remove').addEventListener('click', () => {
                this.winnerSelectedPlayers.splice(i, 1);
                this.renderPlayerQuickselect();
                this.renderWinnerSelectedList();
                this.updateWinnerModalState();
            });
            list.appendChild(tag);
        });
    }

    updateWinnerModalState() {
        const split     = this.winnerSplitCount;
        const selected  = this.winnerSelectedPlayers.length;
        const typedName = this.el.winnerNameInput.value.trim();

        const slotsLeft = split - selected;

        // Show + button whenever there's text in the field
        this.el.winnerAddBtn.style.display = typedName ? 'inline-flex' : 'none';

        // Disable input when no slots remain
        const inputDisabled = slotsLeft <= 0;
        this.el.winnerNameInput.disabled    = inputDisabled;
        this.el.winnerNameInput.placeholder = inputDisabled
            ? (split === 1 ? 'Deselekter navn for å endre' : 'Alle plasser fylt')
            : (split > 1 ? `Legg til navn (${selected}/${split})...` : 'Navn...');
    }

    saveWinner() {
        this.playSound('confirm');

        this.winnerSplitCount = Math.max(1, parseInt(this.el.winnerSplitInput.value) || 1);
        const typedName = this.el.winnerNameInput.value.trim();

        // Build final winners list
        const allNames = [...this.winnerSelectedPlayers];
        const slotsRemaining = this.winnerSplitCount - allNames.length;
        if (typedName && slotsRemaining > 0 && !allNames.includes(typedName)) {
            allNames.push(typedName);
            this.addPlayerIfNew(typedName);
        }
        if (allNames.length === 0) { this.el.winnerNameInput.focus(); return; }

        const prize      = PRIZES[this.currentTheme][this.slot.currentRekke];
        const actualSplit = Math.max(allNames.length, this.winnerSplitCount);
        const splitPrize = Math.round((prize / actualSplit) * 100) / 100;

        const pending    = this.getPendingWinners();
        const currentRekke = this.slot.currentRekke;
        const ballCount    = this.slot.selectedNumbers.length;

        allNames.forEach(name => {
            const entry = {
                name,
                game:      this.currentTheme,
                gameName:  GAME_NAMES[this.currentTheme],
                rekke:     currentRekke,
                split:     actualSplit,
                prize:     splitPrize,
                fullPrize: prize,
                ballCount,
                date:      new Date().toISOString(),
            };
            pending.push(entry);
        });

        localStorage.setItem('bingoPendingWinners', JSON.stringify(pending));

        // Auto-log rekke and advance (skip confirmation prompt)
        this.slot.loggedRekkes[currentRekke] = ballCount;
        const order   = ['Rekke1','Rekke2','Rekke3'];
        const currIdx = order.indexOf(currentRekke);
        if (currIdx < 2) {
            this.applyRekkeChange(order[currIdx + 1], true);
        }

        this.closeWinnerModal();
        this.checkSaveSessionButton();
        this.saveSlotToStorage();
        this.showWinnerFlash();
    }

    showWinnerFlash() {
        const ind = this.el.gameIndicator;
        ind.style.animation = 'none';
        void ind.offsetWidth;
        ind.style.animation = 'winnerFlash .8s ease-out';
        this.updateGameIndicator();
    }

    updateSpillFerdig() {
        const isGame   = this.currentTheme !== 'default';
        const allLogged = isGame &&
            this.slot.loggedRekkes.Rekke1 !== null &&
            this.slot.loggedRekkes.Rekke2 !== null &&
            this.slot.loggedRekkes.Rekke3 !== null;

        if (allLogged) {
            this.el.rekkeButtonsDiv.style.display = 'none';
            this.el.spillFerdig.style.display     = 'block';
            this.el.spillFerdig.textContent       = `${GAME_NAMES[this.currentTheme]} ferdig`;
        } else {
            this.el.rekkeButtonsDiv.style.display = '';
            this.el.spillFerdig.style.display     = 'none';
        }
    }

    updateRekke3BtnState() {
        const btn = [...this.el.rekkeBtns].find(b => b.dataset.rekke === 'Rekke3');
        if (!btn) return;
        const onRekke3     = this.slot.currentRekke === 'Rekke3';
        const notYetLogged = this.slot.loggedRekkes.Rekke3 === null;
        const isGame       = this.currentTheme !== 'default';
        const ready        = isGame && onRekke3 && notYetLogged;
        btn.classList.toggle('rekke3-ready', ready);
        btn.textContent = ready ? '3 ✓' : '3';
    }

    updateWinnerIndicator() {
        // Winner info is now shown in the game indicator
        // Keep the separate indicator hidden
        this.el.winnerIndicator.style.display = 'none';
    }

    getPendingWinners() {
        try { return JSON.parse(localStorage.getItem('bingoPendingWinners') || '[]'); }
        catch(e) { return []; }
    }

    // ── Edit Win ─────────────────────────────────────
    // One modal edits a single win regardless of where it lives:
    //   pending — logged this session, not yet saved (game indicator)
    //   session — inside a saved session's winners array
    //   manual  — 'bingoManualWins' (added via "+ Legg til seier")
    _getEditWinTarget(ctx) {
        if (!ctx) return null;
        if (ctx.source === 'pending') return this.getPendingWinners()[ctx.winIdx];
        if (ctx.source === 'session') return (this.getSessions()[ctx.sessionIdx]?.winners || [])[ctx.winIdx];
        if (ctx.source === 'manual')  return this.getManualWins()[ctx.winIdx];
        return null;
    }

    openEditWinModal(ctx) {
        const w = this._getEditWinTarget(ctx);
        if (!w) return;
        this.playSound('select');
        this._editWinCtx = ctx;
        const isManual = ctx.source === 'manual';

        // Context line under the title
        if (ctx.source === 'pending') {
            this.el.editWinSubtitle.textContent = 'Denne økten (ikke lagret enda)';
        } else if (ctx.source === 'session') {
            const s = this.getSessions()[ctx.sessionIdx];
            this.el.editWinSubtitle.textContent = new Date(s.date).toLocaleDateString('no-NO',
                { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } else {
            this.el.editWinSubtitle.textContent = 'Manuelt lagt til seier';
        }

        // Player suggestions for the name field
        this.el.editWinPlayers.innerHTML = this.getPlayers()
            .map(p => `<option value="${this._escapeHtml(p)}">`).join('');

        this.el.editWinName.value  = w.name || '';
        this.el.editWinPrize.value = w.prize ?? '';
        this.el.editWinSplit.value = w.split || 1;
        this._editWinFullPrize     = w.fullPrize ?? null;

        this.el.editWinGameRows.style.display  = isManual ? 'none' : '';
        this.el.editWinSplitWrap.style.display = isManual ? 'none' : '';
        this.el.editWinDateRow.style.display   = isManual ? '' : 'none';
        if (isManual) {
            const d = new Date(w.date);
            this.el.editWinYear.value  = w.year  || d.getFullYear();
            this.el.editWinMonth.value = w.month || (d.getMonth() + 1);
        } else {
            this.el.editWinGame.innerHTML = GAME_THEMES
                .map(t => `<option value="${t}">${GAME_NAMES[t]}</option>`).join('');
            this.el.editWinGame.value  = GAME_THEMES.includes(w.game) ? w.game : GAME_THEMES[0];
            this.el.editWinRekke.value = ['Rekke1','Rekke2','Rekke3'].includes(w.rekke) ? w.rekke : 'Rekke1';
            this.el.editWinBalls.value = w.ballCount ?? '';
        }

        document.body.style.overflow = 'hidden';
        this.el.editWinModal.style.display = 'flex';
        setTimeout(() => this.el.editWinName.focus(), 100);
    }

    closeEditWinModal() {
        this.playSound('cancel');
        this._editWinCtx = null;
        this.el.editWinModal.style.display = 'none';
        this.restoreBodyScroll();
    }

    saveEditWin() {
        const ctx = this._editWinCtx;
        const w   = this._getEditWinTarget(ctx);
        if (!w) { this.closeEditWinModal(); return; }

        const name = this.el.editWinName.value.trim();
        if (!name) { this.el.editWinName.focus(); return; }
        this.playSound('confirm');
        this.addPlayerIfNew(name);

        w.name = name;
        // Empty prize field keeps the stored prize — never zero out
        // leaderboard money by accident.
        const prizeRaw = this.el.editWinPrize.value.trim();
        if (prizeRaw !== '' && !isNaN(Number(prizeRaw))) w.prize = Number(prizeRaw);

        if (ctx.source === 'manual') {
            const year  = parseInt(this.el.editWinYear.value);
            const month = parseInt(this.el.editWinMonth.value);
            if (year && month) {
                w.year  = year;
                w.month = month;
                w.date  = new Date(year, month - 1, 15).toISOString();
            }
            const manuals = this.getManualWins();
            manuals[ctx.winIdx] = w;
            localStorage.setItem('bingoManualWins', JSON.stringify(manuals));
        } else {
            const game = this.el.editWinGame.value;
            w.game     = game;
            w.gameName = GAME_NAMES[game];
            w.rekke    = this.el.editWinRekke.value;
            const balls = parseInt(this.el.editWinBalls.value);
            w.ballCount = balls > 0 ? balls : w.ballCount;
            const split = parseInt(this.el.editWinSplit.value);
            if (split >= 1) w.split = split;

            if (ctx.source === 'pending') {
                const pending = this.getPendingWinners();
                pending[ctx.winIdx] = w;
                localStorage.setItem('bingoPendingWinners', JSON.stringify(pending));
                this.updateGameIndicator();
            } else {
                // 'session': w is a reference into the cached sessions array
                this.saveSessions(this.getSessions());
                this.renderSessionList();
            }
        }

        this._editWinCtx = null;
        this.el.editWinModal.style.display = 'none';
        this.restoreBodyScroll();

        // Refresh whatever win-derived views are open behind the modal
        this.renderLeaderboard();
        if (this.el.playerHistoryModal.style.display === 'flex' && this.currentHistoryPlayer) {
            this.openPlayerHistory(this.currentHistoryPlayer);
        }
    }

    // ── Player Management ─────────────────────────────
    getPlayers() {
        try { return JSON.parse(localStorage.getItem('bingoPlayers') || '[]'); }
        catch(e) { return []; }
    }

    savePlayers(players) {
        localStorage.setItem('bingoPlayers', JSON.stringify(players));
    }

    addPlayerIfNew(name) {
        const players = this.getPlayers();
        if (!players.includes(name)) {
            players.push(name);
            this.savePlayers(players);
        }
    }

    addNewPlayer() {
        const name = this.el.newPlayerInput.value.trim();
        if (!name) return;
        this.addPlayerIfNew(name);
        this.el.newPlayerInput.value = '';
        this.renderPlayersList();
    }

    closePlayersModal() {
        this.el.playersModal.style.display = 'none';
    }

    renderPlayersList() {
        const players  = this.getPlayers();
        const list     = this.el.playersList;
        list.innerHTML = '';
        if (players.length === 0) {
            list.innerHTML = '<div style="color:rgba(255,255,255,.3);text-align:center;padding:16px;font-size:.9rem">Ingen spillere lagt til</div>';
            return;
        }
        players.forEach((name, i) => {
            const item = document.createElement('div');
            item.className = 'player-list-item';
            item.innerHTML = `<span>${this._escapeHtml(name)}</span>`;
            const del = document.createElement('button');
            const addWin = document.createElement('button');
            addWin.className   = 'player-add-win-btn';
            addWin.textContent = '+ Seier';
            addWin.addEventListener('click', () => {
                this.openAddWinModal(name);
            });
            item.appendChild(addWin);

            del.className   = 'player-remove-btn';
            del.textContent = '✕';
            del.addEventListener('click', () => this.openPlayerDeleteModal(i));
            item.appendChild(del);
            list.appendChild(item);
        });
    }

    // ── Add Previous Win ─────────────────────────────
    openAddWinModal(playerName) {
        if (!playerName) return;
        this.currentHistoryPlayer = playerName;
        this.el.addWinPlayerLabel.textContent = playerName;

        // Reset form
        this.el.addWinPresets.querySelectorAll('.add-win-preset-btn')
            .forEach(b => b.classList.remove('active'));
        this.el.addWinCustomRow.style.display = 'none';
        this.el.addWinCustomAmount.value = '';
        this.el.addWinYear.value  = new Date().getFullYear();
        this.el.addWinMonth.value = new Date().getMonth() + 1;

        this.el.addWinModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeAddWinModal() {
        this.el.addWinModal.style.display = 'none';
        this.restoreBodyScroll();
    }

    saveManualWin() {
        const name = this.currentHistoryPlayer;
        if (!name) return;

        // Get amount
        const activePreset = this.el.addWinPresets.querySelector('.add-win-preset-btn.active');
        let amount = null;
        if (activePreset) {
            if (activePreset.dataset.amount === 'custom') {
                amount = parseFloat(this.el.addWinCustomAmount.value);
            } else {
                amount = parseFloat(activePreset.dataset.amount);
            }
        }
        if (!amount || isNaN(amount) || amount <= 0) {
            this.el.addWinCustomAmount.focus();
            return;
        }

        // Get date
        const year  = parseInt(this.el.addWinYear.value);
        const month = parseInt(this.el.addWinMonth.value);
        if (!year || !month) { this.el.addWinYear.focus(); return; }

        // Build a synthetic session entry
        // Store as a special "manual" session in localStorage
        const manualKey  = 'bingoManualWins';
        const manuals    = this.getManualWins();
        manuals.push({
            name,
            prize:   amount,
            year,
            month,
            manual:  true,
            date:    new Date(year, month - 1, 15).toISOString(),
        });
        localStorage.setItem(manualKey, JSON.stringify(manuals));

        this.closeAddWinModal();
        // Refresh history and leaderboard
        this.openPlayerHistory(name);
        this.renderLeaderboard();
    }

    getManualWins() {
        try { return JSON.parse(localStorage.getItem('bingoManualWins') || '[]'); }
        catch(e) { return []; }
    }

    // ── Player Delete Confirm ────────────────────────
    openPlayerDeleteModal(idx) {
        this.deletingPlayerIdx = idx;
        const players = this.getPlayers();
        const name    = players[idx];

        // Check if this player has wins in saved sessions
        const sessions  = this.getSessions();
        const winCount  = sessions.reduce((sum, s) =>
            sum + (s.winners || []).filter(w => w.name === name).length, 0);

        let text = `Slett "${name}" fra spillerlisten?`;
        if (winCount > 0) {
            text += `

OBS: ${name} har ${winCount} registrerte seier${winCount !== 1 ? 'er' : ''} i loggen. Disse forblir i statistikken.`;
        }
        this.el.playerDeleteText.textContent = text;
        this.el.playerDeleteModal.style.display = 'flex';
    }

    confirmPlayerDelete() {
        const players = this.getPlayers();
        players.splice(this.deletingPlayerIdx, 1);
        this.savePlayers(players);
        this.deletingPlayerIdx = null;
        this.el.playerDeleteModal.style.display = 'none';
        this.renderPlayersList();
    }

    closePlayerDeleteModal() {
        this.el.playerDeleteModal.style.display = 'none';
        this.deletingPlayerIdx = null;
    }

    // ── Leaderboard ───────────────────────────────────
    openLeaderboard() {
        this.playSound('select');
        this.renderLeaderboard();
        this.el.leaderboardModal.style.display = 'flex';
    }

    openPlayersModal() {
        this.renderPlayersList();
        this.el.playersModal.style.display = 'flex';
    }

    closeLeaderboard() {
        this.playSound('cancel');
        this.el.leaderboardModal.style.display = 'none';
    }

    buildLeaderboardData() {
        const sessions = this.getSessions();
        const totals   = {};
        sessions.forEach(s => {
            (s.winners || []).forEach(w => {
                if (!totals[w.name]) totals[w.name] = { wins: 0, money: 0 };
                totals[w.name].wins++;
                totals[w.name].money += w.prize || 0;
            });
        });
        // Include manual wins
        this.getManualWins().forEach(w => {
            if (!totals[w.name]) totals[w.name] = { wins: 0, money: 0 };
            totals[w.name].wins++;
            totals[w.name].money += w.prize || 0;
        });
        return Object.entries(totals)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.wins - a.wins || b.money - a.money);
    }

    renderLeaderboard() {
        const data = this.buildLeaderboardData();
        const list = this.el.leaderboardList;
        list.innerHTML = '';

        if (data.length === 0) {
            list.innerHTML = '<div class="leaderboard-empty">Ingen vinnere registrert enda.</div>';
            return;
        }

        data.forEach((entry, i) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.addEventListener('click', () => this.openPlayerHistory(entry.name));

            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const medal     = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;

            const dry = this._drySpellText(entry.name);
            item.innerHTML = `
                <div class="leaderboard-rank ${rankClass}">${medal}</div>
                <div class="leaderboard-name">${this._escapeHtml(entry.name)}${
                    dry ? `<span class="leaderboard-last">Sist seier: ${dry}</span>` : ''
                }</div>
                <div class="leaderboard-stats">
                    <div class="leaderboard-wins">${entry.wins} seier${entry.wins !== 1 ? 'er' : ''}</div>
                    <div class="leaderboard-money">${entry.money.toLocaleString('no-NO')} kr</div>
                </div>`;
            list.appendChild(item);
        });
    }

    // ── Player History ────────────────────────────────
    openPlayerHistory(name) {
        this.currentHistoryPlayer = name;
        const sessions  = this.getSessions();
        const playerWins = [];

        sessions.forEach((s, si) => {
            const wins = [];
            (s.winners || []).forEach((w, wi) => {
                if (w.name === name) wins.push({ ...w, _src: { source: 'session', sessionIdx: si, winIdx: wi } });
            });
            if (wins.length > 0) playerWins.push({ date: s.date, wins, games: s.games });
        });

        // Include manual wins
        this.getManualWins().forEach((w, mi) => {
            if (w.name !== name) return;
            playerWins.push({
                date: w.date,
                wins: [{ ...w, rekke: '–', gameName: '–', manual: true, _src: { source: 'manual', winIdx: mi } }],
                manual: true,
            });
        });

        // Sort by date descending
        playerWins.sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalMoney = playerWins.reduce((sum, s) =>
            sum + s.wins.reduce((a, w) => a + (w.prize || 0), 0), 0);
        const totalWins  = playerWins.reduce((sum, s) => sum + s.wins.length, 0);

        this.el.playerHistoryTitle.textContent    = `🏆 ${name}`;
        const drySpell = this._drySpellText(name);
        this.el.playerHistorySubtitle.textContent =
            `${totalWins} seier${totalWins !== 1 ? 'er' : ''} · ${totalMoney.toLocaleString('no-NO')} kr totalt`
            + (drySpell ? ` · Sist seier: ${drySpell}` : '');

        const list     = this.el.playerHistoryList;
        list.innerHTML = '';

        if (playerWins.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,.3);padding:24px">Ingen seiere funnet.</div>';
        } else {
            [...playerWins].reverse().forEach(session => {
                const date    = new Date(session.date);
                const dateStr = date.toLocaleDateString('no-NO', { day:'numeric', month:'short', year:'numeric' });
                const sessionMoney = session.wins.reduce((a, w) => a + (w.prize || 0), 0);

                const item = document.createElement('div');
                item.className = 'player-history-item';

                const winsHtml = session.wins.map(w => {
                    const splitText = w.split > 1 ? ` (delt på ${w.split})` : '';
                    const rc = w.rekke.replace('Rekke','Rekke ');
                    const line = w.manual
                        ? `Manuell seier · ${w.prize} kr`
                        : `${this._escapeHtml(w.gameName)} · ${rc} · ${w.ballCount} tall · ${w.prize} kr${splitText}`;
                    const src = w._src;
                    const editBtn = src
                        ? `<button class="win-edit-btn" title="Rediger seier" data-src="${src.source}"` +
                          `${src.sessionIdx !== undefined ? ` data-sidx="${src.sessionIdx}"` : ''}` +
                          ` data-widx="${src.winIdx}">✎</button>`
                        : '';
                    return `<div class="win-line"><span>${line}</span>${editBtn}</div>`;
                }).join('');

                item.innerHTML = `
                    <div class="player-history-date">${dateStr}</div>
                    <div class="player-history-wins">${winsHtml}</div>
                    <div class="player-history-money">${sessionMoney.toLocaleString('no-NO')} kr</div>`;
                list.appendChild(item);
            });
        }

        this.el.playerHistoryModal.style.display = 'flex';
    }

    closePlayerHistory() {
        this.el.playerHistoryModal.style.display = 'none';
    }

    getSessions() {
        // Parsed result is cached because getSessions() is called from many
        // places (~14) and the JSON grows linearly with session history. The
        // cache is invalidated by saveSessions() and any other site that
        // writes to 'bingoSessions'. Callers must NOT mutate the returned
        // array — treat it as read-only. Use saveSessions() to persist.
        if (this._sessionsCache) return this._sessionsCache;
        try {
            this._sessionsCache = JSON.parse(localStorage.getItem('bingoSessions') || '[]');
        } catch(e) {
            this._sessionsCache = [];
        }
        return this._sessionsCache;
    }

    saveSessions(sessions) {
        this._sessionsCache = sessions;
        localStorage.setItem('bingoSessions', JSON.stringify(sessions));
    }

    getCallHistory() {
        try {
            return JSON.parse(localStorage.getItem('bingoCallHistory') || '[]');
        } catch(e) { return []; }
    }

    // ── Automatic backups ─────────────────────────────
    // Rolling snapshots in IndexedDB (db 'bingoBackups') + optional file
    // download. One snapshot per session save, last 10 kept. The payload is
    // compatible with BOTH existing importers: the session importer reads
    // .sessions/.players/..., the settings importer reads bingoSettings etc.
    _backupDB() {
        if (this._backupDBPromise) return this._backupDBPromise;
        this._backupDBPromise = new Promise((resolve, reject) => {
            // v2 adds the 'meta' store (holds the backup-folder handle)
            const req = indexedDB.open('bingoBackups', 2);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups');
                if (!db.objectStoreNames.contains('meta'))    db.createObjectStore('meta');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => reject(req.error);
        });
        return this._backupDBPromise;
    }

    async _idbMetaTx(mode, fn) {
        const db = await this._backupDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('meta', mode);
            const result = fn(tx.objectStore('meta'));
            tx.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
            tx.onerror    = () => reject(tx.error);
        });
    }

    // ── Silent backups via the File System Access API ─
    // Chrome/Edge only; the directory handle survives restarts in IndexedDB.
    // On unsupported browsers (iPad Safari) the row stays hidden and the
    // download flow is used as before.
    async initBackupFolder() {
        if (!('showDirectoryPicker' in window)) return;
        const row = document.getElementById('backup-folder-row');
        if (row) row.style.display = '';
        try {
            this._backupDirHandle = await this._idbMetaTx('readonly', s => s.get('backupDir'));
        } catch(e) {}
        this._updateBackupFolderStatus();
    }

    _updateBackupFolderStatus() {
        const el = document.getElementById('backup-folder-status');
        if (!el) return;
        el.textContent = this._backupDirHandle
            ? `Backuper skrives stille til mappen «${this._backupDirHandle.name}»`
            : 'Ingen mappe valgt — backup lastes ned som fil';
    }

    // Write the payload into the chosen folder. Returns false when no folder
    // is set, permission is denied, or the write fails — caller falls back
    // to the classic download.
    async _writeBackupToFolder(payload) {
        const dir = this._backupDirHandle;
        if (!dir) return false;
        try {
            let perm = await dir.queryPermission({ mode: 'readwrite' });
            if (perm === 'prompt') perm = await dir.requestPermission({ mode: 'readwrite' });
            if (perm !== 'granted') return false;
            const name = `geithus-bingo-backup-${new Date().toISOString().slice(0, 10)}.json`;
            const fh = await dir.getFileHandle(name, { create: true });
            const w  = await fh.createWritable();
            await w.write(JSON.stringify(payload, null, 2));
            await w.close();
            return true;
        } catch(e) { return false; }
    }

    async _idbBackupTx(mode, fn) {
        const db = await this._backupDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('backups', mode);
            const result = fn(tx.objectStore('backups'));
            tx.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
            tx.onerror    = () => reject(tx.error);
        });
    }

    async _idbListBackups() {
        const db = await this._backupDB();
        return new Promise((resolve, reject) => {
            const out = [];
            const cur = db.transaction('backups', 'readonly').objectStore('backups').openCursor();
            cur.onsuccess = () => {
                const c = cur.result;
                if (c) {
                    const v = c.value || {};
                    out.push({
                        ts: c.key,
                        sessions: Array.isArray(v.sessions) ? v.sessions.length : 0,
                        players:  Array.isArray(v.players)  ? v.players.length  : 0,
                    });
                    c.continue();
                } else resolve(out.sort((a, b) => b.ts - a.ts));
            };
            cur.onerror = () => reject(cur.error);
        });
    }

    buildBackupPayload() {
        const payload = {
            format:      'geithus-bingo-backup-v1',
            exported:    new Date().toISOString(),
            sessions:    this.getSessions(),
            players:     this.getPlayers(),
            manualWins:  this.getManualWins(),
            callHistory: this.getCallHistory(),
        };
        ['bingoSettings', 'bingoThemeColors', 'bingoColorPresets', 'bingoFlareSettings'].forEach(k => {
            const v = localStorage.getItem(k);
            if (v !== null) try { payload[k] = JSON.parse(v); } catch(e) {}
        });
        const theme = localStorage.getItem('bingoTheme');
        if (theme) payload.bingoTheme = theme;
        return payload;
    }

    async performAutoBackup(opts = {}) {
        const download = opts.download ?? (this.settings.autoBackupDownload ?? true);
        const payload  = this.buildBackupPayload();
        const ts       = Date.now();
        try {
            await this._idbBackupTx('readwrite', store => store.put(payload, ts));
            // Prune to the 10 newest snapshots
            const list = await this._idbListBackups();
            for (const old of list.slice(10)) {
                await this._idbBackupTx('readwrite', store => store.delete(old.ts));
            }
            try { localStorage.setItem('bingoLastBackupTs', String(ts)); } catch(e) {}
        } catch(e) { /* IndexedDB unavailable — file download below still works */ }
        if (download) {
            // Prefer the silent folder write; fall back to a download when no
            // folder is configured or the write fails.
            const wrote = await this._writeBackupToFolder(payload);
            if (!wrote) this._downloadBackupFile(payload);
        }
        this.updateBackupStatus();
    }

    _downloadBackupFile(payload) {
        try {
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `geithus-bingo-backup-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch(e) {}
    }

    updateBackupStatus() {
        const el = this.el.viewerBackupStatus;
        if (!el) return;
        let ts = 0;
        try { ts = parseInt(localStorage.getItem('bingoLastBackupTs') || '0', 10); } catch(e) {}
        if (!ts) {
            el.textContent = 'Backup: aldri';
            el.style.color = 'var(--danger-color, #ff4444)';
            return;
        }
        const days = Math.floor((Date.now() - ts) / 86_400_000);
        el.textContent = days === 0 ? 'Backup: i dag' : `Backup: ${days} d siden`;
        el.style.color = days > 21 ? 'var(--danger-color, #ff4444)' : '';
    }

    async openBackupsModal() {
        const list = this.el.backupsList;
        list.innerHTML = '<div class="error-log-empty">Laster…</div>';
        this.el.backupsModal.style.display = 'flex';

        // One-time delegated handler for download buttons
        if (!list._bound) {
            list._bound = true;
            list.addEventListener('click', async e => {
                const btn = e.target.closest('.backup-dl-btn');
                if (!btn) return;
                this.playSound('confirm');
                const ts = Number(btn.dataset.ts);
                try {
                    const payload = await this._idbBackupTx('readonly', store => store.get(ts));
                    if (payload) this._downloadBackupFile(payload);
                } catch(err) {}
            });
        }

        let items = [];
        try { items = await this._idbListBackups(); } catch(e) {}
        if (!items.length) {
            list.innerHTML = '<div class="error-log-empty">Ingen interne backuper ennå — de tas automatisk når en sesjon lagres.</div>';
            return;
        }
        list.innerHTML = '';
        items.forEach(it => {
            const row = document.createElement('div');
            row.className = 'backup-row';
            const label = document.createElement('span');
            label.className = 'backup-row-label';
            label.textContent = new Date(it.ts).toLocaleString('no-NO') +
                ` · ${it.sessions} sesjon${it.sessions === 1 ? '' : 'er'}`;
            const dl = document.createElement('button');
            dl.className = 'modal-btn session-action-btn session-edit-btn backup-dl-btn';
            dl.dataset.ts = it.ts;
            dl.textContent = 'Last ned';
            row.appendChild(label);
            row.appendChild(dl);
            list.appendChild(row);
        });
    }

    closeBackupsModal() {
        this.playSound('cancel');
        this.el.backupsModal.style.display = 'none';
    }

    // ── Statistics modal ──────────────────────────────
    openStatsModal() {
        this.playSound('select');
        this.renderStats();
        this.el.statsModal.style.display = 'flex';
    }

    closeStatsModal() {
        this.playSound('cancel');
        this.el.statsModal.style.display = 'none';
    }

    renderStats() {
        const sessions = this.getSessions();
        const wrap = this.el.statsContent;
        wrap.innerHTML = '';
        this.el.statsSubtitle.textContent = sessions.length === 1
            ? 'Basert på 1 lagret sesjon'
            : `Basert på ${sessions.length} lagrede sesjoner`;
        if (!sessions.length) {
            wrap.innerHTML = '<div class="error-log-empty">Ingen sesjoner lagret enda.</div>';
            return;
        }

        const intro = document.createElement('p');
        intro.className = 'stats-intro';
        intro.textContent = 'Hvor mange tall som måtte trekkes for å fullføre hver rekke, '
            + 'samlet fra alle lagrede sesjoner.';
        wrap.appendChild(intro);

        const rekkeKeys  = ['rekke1', 'rekke2', 'rekke3'];
        const rekkeNames = ['Rekke 1', 'Rekke 2', 'Rekke 3'];
        const fmtDate = d => new Date(d).toLocaleDateString('no-NO', { day:'numeric', month:'short', year:'numeric' });

        // Collect every logged rekke value with its date and game index
        const vals = [[], [], []];
        sessions.forEach(s => {
            (s.games || []).forEach((g, gi) => {
                if (!g) return;
                rekkeKeys.forEach((k, i) => {
                    const v = g[k];
                    if (v !== null && v !== undefined && v !== '') {
                        vals[i].push({ v: Number(v), date: s.date, gameIdx: gi });
                    }
                });
            });
        });

        const median = nums => {
            const a = [...nums].sort((x, y) => x - y);
            const m = Math.floor(a.length / 2);
            return a.length % 2 ? a[m] : Math.round((a[m-1] + a[m]) / 2);
        };

        // ── Per-rekke sections: records + histogram ──
        rekkeNames.forEach((name, i) => {
            const list = vals[i];
            if (!list.length) return;
            const nums = list.map(e => e.v);
            const min = Math.min(...nums), max = Math.max(...nums);
            const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10;
            const fastest = list.find(e => e.v === min);
            const slowest = list.find(e => e.v === max);

            const sec = document.createElement('div');
            sec.className = 'stats-section';
            const h = document.createElement('div');
            h.className = 'stats-section-title';
            h.textContent = name;
            sec.appendChild(h);

            const rec = document.createElement('div');
            rec.className = 'stats-records';
            rec.innerHTML =
                `<span>⚡ Raskest: <strong>${min}</strong> (${fmtDate(fastest.date)})</span>` +
                `<span>🐢 Tregest: <strong>${max}</strong> (${fmtDate(slowest.date)})</span>` +
                `<span>Median: <strong>${median(nums)}</strong></span>` +
                `<span>Snitt: <strong>${avg}</strong></span>`;
            sec.appendChild(rec);

            const desc = document.createElement('div');
            desc.className = 'stats-section-desc';
            desc.textContent = `Fordeling: venstre = antall trukne tall, høyre = hvor mange `
                + `ganger ${name} ble fullført akkurat der.`;
            sec.appendChild(desc);

            // Histogram — bucket so we get at most ~12 bars
            const bw = Math.max(1, Math.ceil((max - min + 1) / 12));
            const buckets = [];
            for (let b = min; b <= max; b += bw) {
                buckets.push({ from: b, to: Math.min(b + bw - 1, max), count: 0 });
            }
            nums.forEach(v => { buckets[Math.floor((v - min) / bw)].count++; });
            const bmax = Math.max(...buckets.map(b => b.count));
            buckets.forEach(b => {
                const row = document.createElement('div');
                row.className = 'freq-bar-row';
                const pct = bmax > 0 ? Math.round((b.count / bmax) * 100) : 0;
                const label = b.from === b.to ? `${b.from}` : `${b.from}–${b.to}`;
                row.innerHTML =
                    `<span class="freq-bar-num stats-bucket-label">${label}</span>` +
                    `<div class="freq-bar-track"><div class="freq-bar-fill" style="width:${pct}%"></div></div>` +
                    `<span class="freq-bar-count">${b.count}</span>`;
                sec.appendChild(row);
            });
            wrap.appendChild(sec);
        });

        // ── Per-spill comparison table ──
        const sec = document.createElement('div');
        sec.className = 'stats-section';
        const h = document.createElement('div');
        h.className = 'stats-section-title';
        h.textContent = 'Snitt per spill';
        sec.appendChild(h);
        const gdesc = document.createElement('div');
        gdesc.className = 'stats-section-desc';
        gdesc.textContent = 'Gjennomsnittlig antall trukne tall for å fullføre hver rekke, '
            + 'delt opp per spill.';
        sec.appendChild(gdesc);
        const table = document.createElement('div');
        table.className = 'stats-game-table';
        table.innerHTML = '<div class="stats-game-cell stats-game-head"></div>' +
            rekkeNames.map(n => `<div class="stats-game-cell stats-game-head">${n.replace('Rekke ', 'R')}</div>`).join('');
        GAME_THEMES.forEach((theme, gi) => {
            const nameCell = document.createElement('div');
            nameCell.className = 'stats-game-cell stats-game-name';
            nameCell.textContent = GAME_NAMES[theme];
            nameCell.style.color = this.themeColors[theme]?.accent || THEME_COLORS[theme];
            table.appendChild(nameCell);
            rekkeKeys.forEach((k, ri) => {
                const entries = vals[ri].filter(e => e.gameIdx === gi);
                const cell = document.createElement('div');
                cell.className = 'stats-game-cell';
                cell.textContent = entries.length
                    ? Math.round(entries.reduce((a, e) => a + e.v, 0) / entries.length * 10) / 10
                    : '–';
                table.appendChild(cell);
            });
        });
        sec.appendChild(table);
        wrap.appendChild(sec);
    }

    // Sessions since a player's last win (0 = won in the latest session).
    // Based on saved sessions only — manual wins have no session index.
    getDrySpell(name) {
        const sessions = this.getSessions();
        for (let i = sessions.length - 1; i >= 0; i--) {
            if ((sessions[i].winners || []).some(w => w.name === name)) {
                return { sessionsAgo: sessions.length - 1 - i, date: sessions[i].date };
            }
        }
        return null;
    }

    _drySpellText(name) {
        const ds = this.getDrySpell(name);
        if (!ds) return null;
        return ds.sessionsAgo === 0 ? 'siste sesjon'
             : `${ds.sessionsAgo} sesjon${ds.sessionsAgo === 1 ? '' : 'er'} siden`;
    }

    // Portal the .dropdown-content to <body> so it escapes the nav's
    // backdrop-filter stacking context (which otherwise traps it behind
    // the ball grid). JS-positions it under the trigger button.
    setupDropdownPortal() {
        const dropdown = document.querySelector('.dropdown');
        const content  = document.querySelector('.dropdown-content');
        const button   = dropdown && dropdown.querySelector('.dropbtn');
        if (!dropdown || !content || !button) return;

        document.body.appendChild(content);

        const place = () => {
            const r  = button.getBoundingClientRect();
            const cw = content.offsetWidth || 200;
            content.style.top  = `${r.bottom + 4}px`;
            content.style.left = `${Math.max(8, r.right - cw)}px`;
        };
        const show = () => { content.classList.add('open'); place(); };
        const hide = () => { content.classList.remove('open'); };

        let hideTimer = null;
        const onEnter = () => { clearTimeout(hideTimer); show(); };
        const onLeave = () => { hideTimer = setTimeout(hide, 200); };

        dropdown.addEventListener('mouseenter', onEnter);
        dropdown.addEventListener('mouseleave', onLeave);
        content.addEventListener('mouseenter',  onEnter);
        content.addEventListener('mouseleave',  onLeave);

        // Tap/click toggle for touch devices
        button.addEventListener('click', e => {
            e.stopPropagation();
            if (content.classList.contains('open')) hide();
            else show();
        });
        document.addEventListener('click', e => {
            if (content.classList.contains('open') &&
                !content.contains(e.target) &&
                !dropdown.contains(e.target)) {
                hide();
            }
        });
        window.addEventListener('resize', () => {
            if (content.classList.contains('open')) place();
        });
        window.addEventListener('scroll', () => {
            if (content.classList.contains('open')) place();
        }, { passive: true });
    }

    // ── Frequency heatmap ─────────────────────────────────
    openFrequencyModal() {
        this.playSound('select');
        this.el.frequencyModal.style.display = 'flex';
        this.renderFrequency();
    }
    closeFrequencyModal() {
        this.playSound('cancel');
        this.el.frequencyModal.style.display = 'none';
    }
    getFrequencyData(scope) {
        const counts = new Array(91).fill(0); // 1..90
        let callsTotal = 0;
        let sessionsTotal = 0;
        const addNums = (nums) => {
            nums.forEach(n => {
                const v = Number(n);
                if (v >= 1 && v <= 90) { counts[v]++; callsTotal++; }
            });
        };
        if (scope === 'current') {
            // Live state across all 5 slots (default + 4 games)
            COLOR_THEMES.forEach(t => {
                const s = this.slots[t];
                if (s && Array.isArray(s.selectedNumbers)) addNums(s.selectedNumbers);
            });
            sessionsTotal = 1;
        } else {
            let hist = this.getCallHistory();
            if (scope === 'last10') hist = hist.slice(-10);
            else if (scope === 'lastSession') hist = hist.slice(-1);
            sessionsTotal = hist.length;
            hist.forEach(entry => {
                if (!entry || !entry.games) return;
                Object.values(entry.games).forEach(nums => {
                    if (Array.isArray(nums)) addNums(nums);
                });
            });
        }
        let max = 0;
        for (let i = 1; i <= 90; i++) if (counts[i] > max) max = counts[i];
        return { counts, callsTotal, sessionsTotal, max };
    }
    // Call-order lists for the chosen scope. Each entry is one game's numbers
    // in the order they were called, tagged with its session index (oldest=0).
    // Used by the order-aware displays: overdue / opening / avg position.
    getScopedCallLists(scope) {
        const lists = [];
        if (scope === 'current') {
            COLOR_THEMES.forEach(t => {
                const s = this.slots[t];
                if (s && Array.isArray(s.selectedNumbers) && s.selectedNumbers.length) {
                    lists.push({ numbers: s.selectedNumbers.map(Number), sessionIdx: 0 });
                }
            });
            return { lists, sessionCount: 1 };
        }
        let hist = this.getCallHistory();
        if (scope === 'last10') hist = hist.slice(-10);
        else if (scope === 'lastSession') hist = hist.slice(-1);
        hist.forEach((entry, idx) => {
            if (!entry || !entry.games) return;
            Object.values(entry.games).forEach(nums => {
                if (Array.isArray(nums) && nums.length) {
                    lists.push({ numbers: nums.map(Number), sessionIdx: idx });
                }
            });
        });
        return { lists, sessionCount: hist.length };
    }
    _freqColor(value, max) {
        if (max <= 0 || value <= 0) return '#2a3340';
        const t = Math.min(1, value / max);
        // Cold (blue) → warm (gold) → hot (red)
        const stops = [
            [0.00, [42, 51, 64]],     // cold base
            [0.15, [58, 120, 200]],   // blue
            [0.55, [241, 185, 36]],   // gold
            [1.00, [255, 85, 68]],    // red
        ];
        let a = stops[0], b = stops[stops.length - 1];
        for (let i = 0; i < stops.length - 1; i++) {
            if (t >= stops[i][0] && t <= stops[i+1][0]) { a = stops[i]; b = stops[i+1]; break; }
        }
        const span = b[0] - a[0] || 1;
        const k = (t - a[0]) / span;
        const r = Math.round(a[1][0] + (b[1][0] - a[1][0]) * k);
        const g = Math.round(a[1][1] + (b[1][1] - a[1][1]) * k);
        const bl = Math.round(a[1][2] + (b[1][2] - a[1][2]) * k);
        return `rgb(${r}, ${g}, ${bl})`;
    }
    renderFrequency() {
        if (!this.el.frequencyModal) return;
        const scope   = this.el.frequencyScope.value;
        const display = this.el.frequencyDisplay.value;
        const { counts, callsTotal, sessionsTotal, max } = this.getFrequencyData(scope);

        const scopeLabel =
            scope === 'current'     ? 'aktiv sesjon'  :
            scope === 'lastSession' ? 'siste sesjon'  :
            scope === 'last10'      ? 'siste 10 sesjoner' :
                                      'alle sesjoner';
        const displayDesc = {
            grid:     'Hvor ofte hvert tall (1–90) har blitt trukket. Varmere farge = oftere.',
            bars:     'Hvor mange ganger hvert tall har blitt trukket, som søyler.',
            decades:  'Snitt antall kall per tall innen hvert tiår (1–9, 10–19 …).',
            topbottom:'De 10 mest og 10 minst trukne tallene.',
            ranked:   'Alle tall sortert fra mest til minst trukket.',
            overdue:  'Hvor lenge siden hvert tall sist ble trukket. Øverst = lengst på «overtid».',
            opening:  'Tall som oftest dukker opp blant de 5 første som trekkes i et spill.',
            avgpos:   'Gjennomsnittlig trekkrekkefølge per tall. Lavt = trekkes typisk tidlig.',
        }[display] || '';
        this.el.frequencySummary.innerHTML =
            `${callsTotal} kall fordelt på ${sessionsTotal} ${sessionsTotal === 1 ? 'sesjon' : 'sesjoner'} (${scopeLabel}).`
            + (displayDesc ? `<span class="freq-display-desc">${displayDesc}</span>` : '');

        const wrap = this.el.frequencyDisplayWrap;
        wrap.innerHTML = '';

        if (callsTotal === 0) {
            wrap.innerHTML = '<div class="error-log-empty">Ingen data ennå — spill og lagre en sesjon for å bygge historikk.</div>';
            return;
        }

        if (display === 'grid') {
            const grid = document.createElement('div');
            grid.className = 'freq-grid';
            for (let n = 1; n <= 90; n++) {
                const cell = document.createElement('div');
                cell.className = 'freq-cell';
                cell.style.backgroundColor = this._freqColor(counts[n], max);
                cell.title = `Tall ${n}: ${counts[n]} kall`;
                cell.innerHTML = `<div>${n}</div><div class="freq-cell-count">${counts[n]}</div>`;
                grid.appendChild(cell);
            }
            wrap.appendChild(grid);
            const legend = document.createElement('div');
            legend.className = 'freq-legend';
            legend.innerHTML = `<span>Sjelden</span><div class="freq-legend-bar"></div><span>Ofte</span>`;
            wrap.appendChild(legend);
        } else if (display === 'bars') {
            for (let n = 1; n <= 90; n++) {
                const row = document.createElement('div');
                row.className = 'freq-bar-row';
                const pct = max > 0 ? Math.round((counts[n] / max) * 100) : 0;
                row.innerHTML =
                    `<span class="freq-bar-num">${n}</span>` +
                    `<div class="freq-bar-track"><div class="freq-bar-fill" style="width:${pct}%"></div></div>` +
                    `<span class="freq-bar-count">${counts[n]}</span>`;
                wrap.appendChild(row);
            }
        } else if (display === 'decades') {
            const buckets = [
                { label: '1–9',   from: 1,  to: 9  },
                { label: '10–19', from: 10, to: 19 },
                { label: '20–29', from: 20, to: 29 },
                { label: '30–39', from: 30, to: 39 },
                { label: '40–49', from: 40, to: 49 },
                { label: '50–59', from: 50, to: 59 },
                { label: '60–69', from: 60, to: 69 },
                { label: '70–79', from: 70, to: 79 },
                { label: '80–90', from: 80, to: 90 },
            ];
            const totals = buckets.map(b => {
                let sum = 0;
                for (let i = b.from; i <= b.to; i++) sum += counts[i];
                return { ...b, sum, span: b.to - b.from + 1 };
            });
            const bMax = Math.max(...totals.map(t => t.sum / t.span));
            totals.forEach(b => {
                const avg = b.sum / b.span;
                const pct = bMax > 0 ? Math.round((avg / bMax) * 100) : 0;
                const row = document.createElement('div');
                row.className = 'freq-decade-row';
                row.innerHTML =
                    `<span class="freq-decade-label">${b.label}</span>` +
                    `<div class="freq-bar-track"><div class="freq-bar-fill" style="width:${pct}%"></div></div>` +
                    `<span class="freq-bar-count">${b.sum} (${avg.toFixed(1)}/tall)</span>`;
                wrap.appendChild(row);
            });
        } else if (display === 'topbottom') {
            const list = [];
            for (let n = 1; n <= 90; n++) list.push({ n, c: counts[n] });
            const top = list.slice().sort((a, b) => b.c - a.c || a.n - b.n).slice(0, 10);
            const bot = list.slice().sort((a, b) => a.c - b.c || a.n - b.n).slice(0, 10);
            const mkSection = (title, items) => {
                const sec = document.createElement('div');
                sec.className = 'freq-topbottom-section';
                const t = document.createElement('div');
                t.className = 'freq-topbottom-title';
                t.textContent = title;
                sec.appendChild(t);
                items.forEach(({ n, c }) => {
                    const row = document.createElement('div');
                    row.className = 'freq-bar-row';
                    const pct = max > 0 ? Math.round((c / max) * 100) : 0;
                    row.innerHTML =
                        `<span class="freq-bar-num">${n}</span>` +
                        `<div class="freq-bar-track"><div class="freq-bar-fill" style="width:${pct}%"></div></div>` +
                        `<span class="freq-bar-count">${c}</span>`;
                    sec.appendChild(row);
                });
                return sec;
            };
            wrap.appendChild(mkSection('Topp 10 mest trukket', top));
            wrap.appendChild(mkSection('Bunn 10 minst trukket', bot));
        } else if (display === 'ranked') {
            // Every number sorted by frequency (most → least, ties by ascending number)
            const ranked = [];
            for (let n = 1; n <= 90; n++) ranked.push({ n, c: counts[n] });
            ranked.sort((a, b) => b.c - a.c || a.n - b.n);
            ranked.forEach(({ n, c }, i) => {
                const row = document.createElement('div');
                row.className = 'freq-bar-row freq-bar-row-ranked';
                const pct = max > 0 ? Math.round((c / max) * 100) : 0;
                row.innerHTML =
                    `<span class="freq-bar-rank">#${i + 1}</span>` +
                    `<span class="freq-bar-num">${n}</span>` +
                    `<div class="freq-bar-track"><div class="freq-bar-fill" style="width:${pct}%"></div></div>` +
                    `<span class="freq-bar-count">${c}</span>`;
                wrap.appendChild(row);
            });
        } else if (display === 'overdue') {
            // Sessions since each number was last called (never-called first)
            const { lists, sessionCount } = this.getScopedCallLists(scope);
            const lastSeen = new Array(91).fill(-1);
            lists.forEach(({ numbers, sessionIdx }) => {
                numbers.forEach(n => {
                    if (n >= 1 && n <= 90 && sessionIdx > lastSeen[n]) lastSeen[n] = sessionIdx;
                });
            });
            const rows = [];
            for (let n = 1; n <= 90; n++) {
                rows.push({ n, overdue: lastSeen[n] === -1 ? Infinity : (sessionCount - 1 - lastSeen[n]) });
            }
            rows.sort((a, b) => (b.overdue - a.overdue) || (a.n - b.n));
            const finite = rows.map(r => r.overdue).filter(Number.isFinite);
            const oMax = Math.max(1, ...finite);
            rows.forEach(({ n, overdue }) => {
                const never = !Number.isFinite(overdue);
                const pct = never ? 100 : Math.round((overdue / oMax) * 100);
                const label = never ? 'aldri kalt'
                            : overdue === 0 ? 'i siste sesjon'
                            : `${overdue} sesjon${overdue === 1 ? '' : 'er'} siden`;
                const row = document.createElement('div');
                row.className = 'freq-bar-row freq-bar-row-wide';
                row.innerHTML =
                    `<span class="freq-bar-num">${n}</span>` +
                    `<div class="freq-bar-track"><div class="freq-bar-fill" style="width:${pct}%"></div></div>` +
                    `<span class="freq-bar-count freq-wide-label">${label}</span>`;
                wrap.appendChild(row);
            });
        } else if (display === 'opening') {
            // Numbers that most often appear in a game's first 5 calls
            const { lists } = this.getScopedCallLists(scope);
            const counts5 = new Array(91).fill(0);
            lists.forEach(({ numbers }) => {
                numbers.slice(0, 5).forEach(n => { if (n >= 1 && n <= 90) counts5[n]++; });
            });
            const rows = [];
            for (let n = 1; n <= 90; n++) if (counts5[n] > 0) rows.push({ n, c: counts5[n] });
            rows.sort((a, b) => b.c - a.c || a.n - b.n);
            const top = rows.slice(0, 15);
            if (!top.length) {
                wrap.innerHTML = '<div class="error-log-empty">Ingen åpningsdata i dette omfanget.</div>';
                return;
            }
            const m = top[0].c;
            top.forEach(({ n, c }, i) => {
                const row = document.createElement('div');
                row.className = 'freq-bar-row freq-bar-row-ranked';
                row.innerHTML =
                    `<span class="freq-bar-rank">#${i + 1}</span>` +
                    `<span class="freq-bar-num">${n}</span>` +
                    `<div class="freq-bar-track"><div class="freq-bar-fill" style="width:${Math.round((c / m) * 100)}%"></div></div>` +
                    `<span class="freq-bar-count">${c}×</span>`;
                wrap.appendChild(row);
            });
        } else if (display === 'avgpos') {
            // Average draw position per number (earliest first). Position 1 =
            // first number called in a game.
            const { lists } = this.getScopedCallLists(scope);
            const sums = new Array(91).fill(0), cnts = new Array(91).fill(0);
            lists.forEach(({ numbers }) => {
                numbers.forEach((n, i) => {
                    if (n >= 1 && n <= 90) { sums[n] += i + 1; cnts[n]++; }
                });
            });
            const rows = [];
            for (let n = 1; n <= 90; n++) if (cnts[n]) rows.push({ n, avg: sums[n] / cnts[n] });
            rows.sort((a, b) => a.avg - b.avg || a.n - b.n);
            if (!rows.length) {
                wrap.innerHTML = '<div class="error-log-empty">Ingen posisjonsdata i dette omfanget.</div>';
                return;
            }
            const aMax = rows[rows.length - 1].avg;
            rows.forEach(({ n, avg }) => {
                const row = document.createElement('div');
                row.className = 'freq-bar-row freq-bar-row-wide';
                row.innerHTML =
                    `<span class="freq-bar-num">${n}</span>` +
                    `<div class="freq-bar-track"><div class="freq-bar-fill" style="width:${Math.round((avg / aMax) * 100)}%"></div></div>` +
                    `<span class="freq-bar-count freq-wide-label">~${avg.toFixed(1)}. trekk</span>`;
                wrap.appendChild(row);
            });
        }
    }

    // ── Error log ─────────────────────────────────────────
    openErrorLogModal() {
        this.playSound('select');
        this.el.errorLogModal.style.display = 'flex';
        this.renderErrorLog();
    }
    closeErrorLogModal() {
        this.playSound('cancel');
        this.el.errorLogModal.style.display = 'none';
    }
    renderErrorLog() {
        const list = (window.bingoErrorLog && window.bingoErrorLog.get()) || [];
        this.el.errorLogSubtitle.textContent =
            list.length === 0 ? 'Ingen feil registrert' :
            list.length === 1 ? '1 feil registrert' :
                                `${list.length} feil registrert`;
        const wrap = this.el.errorLogList;
        wrap.innerHTML = '';
        if (!list.length) {
            wrap.innerHTML = '<div class="error-log-empty">Alt fungerer som det skal.</div>';
            return;
        }
        // Newest first
        list.slice().reverse().forEach(err => {
            const entry = document.createElement('div');
            entry.className = 'error-log-entry';
            const t = new Date(err.ts);
            const time = t.toLocaleString('no-NO');
            entry.innerHTML =
                `<div class="error-log-entry-head">` +
                    `<span class="error-log-entry-kind">${err.kind || 'error'}</span>` +
                    `<span class="error-log-entry-time">${time}</span>` +
                `</div>` +
                `<div class="error-log-entry-msg"></div>` +
                (err.stack ? `<div class="error-log-entry-stack"></div>` : '');
            entry.querySelector('.error-log-entry-msg').textContent = err.msg || '';
            if (err.stack) entry.querySelector('.error-log-entry-stack').textContent = err.stack;
            wrap.appendChild(entry);
        });
    }
    copyErrorLog() {
        const list = (window.bingoErrorLog && window.bingoErrorLog.get()) || [];
        const text = JSON.stringify(list, null, 2);
        const finish = (ok) => {
            this.playSound(ok ? 'confirm' : 'cancel');
            const btn = this.el.errorLogCopy;
            const orig = btn.textContent;
            btn.textContent = ok ? 'Kopiert ✓' : 'Feil';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => finish(true), () => finish(false));
        } else {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                finish(true);
            } catch (e) { finish(false); }
        }
    }
    clearErrorLog() {
        if (window.bingoErrorLog) window.bingoErrorLog.clear();
        this.playSound('reset');
        this.renderErrorLog();
    }

    // ── Keyboard Input ───────────────────────────────

    // One table drives Enter (confirm), Backspace/Escape (close) and +/-
    // (adjust) for every modal. Order = stacking priority: overlays that
    // appear on top of other modals must come first so keys hit the topmost.
    _getModalKeyTable() {
        if (this._modalKeyTable) return this._modalKeyTable;
        const t = [];
        const add = (el, opts) => { if (el) t.push({ el, ...opts }); };
        add(this.el.unsavedModal,       { close: () => this.closeUnsavedModal() });
        add(this.el.playerDeleteModal,  { confirm: () => { this.playSound('confirm'); this.confirmPlayerDelete(); },
                                          close:   () => this.closePlayerDeleteModal() });
        add(this.el.addWinModal,        { confirm: () => { this.playSound('confirm'); this.saveManualWin(); },
                                          close:   () => this.closeAddWinModal() });
        add(this.el.editWinModal,       { confirm: () => this.saveEditWin(),
                                          close:   () => this.closeEditWinModal() });
        add(this.el.winnerModal,        { confirm: () => this.saveWinner(),        close: () => this.closeWinnerModal() });
        add(this.el.sessionModal,       { confirm: () => this.saveSession(),
                                          close:   () => this.promptUnsavedClose(() => this.closeSessionModal()) });
        add(this.el.editSessionModal,   { confirm: () => this.saveEditedSession(),
                                          close:   () => this.maybePromptEditSessionClose() });
        add(this.el.deleteModal,        { confirm: () => this.confirmDelete(),     close: () => this.closeDeleteModal() });
        add(this.el.resetAllModal,      { confirm: () => this.performResetAll(),   close: () => this.closeResetAllModal() });
        add(this.el.suggestSaveModal,   { confirm: () => { this.el.suggestSaveModal.style.display = 'none'; this.openSessionModal(); },
                                          close:   () => { this.playSound('cancel'); this.el.suggestSaveModal.style.display = 'none'; } });
        add(this.el.uploadSoundModal,   { close: () => this.closeUploadSoundModal() });
        add(this.el.playerHistoryModal, { close: () => this.closePlayerHistory() });
        add(this.el.playersModal,       { close: () => this.closePlayersModal() });
        add(this.el.leaderboardModal,   { close: () => this.closeLeaderboard() });
        add(this.el.graphModal,         { close: () => this.closeGraph() });
        add(this.el.statsModal,         { close: () => this.closeStatsModal() });
        add(this.el.frequencyModal,     { close: () => this.closeFrequencyModal() });
        add(this.el.backupsModal,       { close: () => this.closeBackupsModal() });
        add(this.el.errorLogModal,      { close: () => this.closeErrorLogModal() });
        add(document.getElementById('bingoview-modal'), { close: () => this.closeBingoViewModal() });
        add(this.el.settingsModal,      { close: () => this.closeSettingsModal() });
        add(this.el.viewerModal,        { close: () => this.closeViewerModal(), adjust: d => this.stepAvgFilter(d) });
        this._modalKeyTable = t;
        return t;
    }

    // Topmost open modal's key actions, or null when no modal is open.
    _openModalEntry() {
        // The rekke confirm is an inline panel (display:block), not a modal overlay
        if (this.el.rekkeConfirm.style.display !== 'none') {
            return {
                confirm: () => this.confirmRekkeChange(),
                close:   () => this.cancelRekkeChange(),
                adjust:  d  => this.adjustRekkeCount(d),
            };
        }
        return this._getModalKeyTable().find(e => e.el.style.display === 'flex') || null;
    }

    handleKeyInput(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

        // Topmost open modal (or null) — drives every key branch below
        const modal = this._openModalEntry();

        // ── ENTER: confirm / commit ────────────────────
        if (e.key === 'Enter') {
            e.preventDefault();
            if (modal) { if (modal.confirm) modal.confirm(); return; }
            // Default: commit typed number
            clearTimeout(this.typingTimer);
            this.commitTypedNumber();
            return;
        }

        // ── BACKSPACE: cancel / close / undo ──────────
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (modal) { if (modal.close) modal.close(); return; }
            // Default: clear typing buffer or undo last number
            if (this.typingBuffer !== '') {
                clearTimeout(this.typingTimer);
                this.typingBuffer = this.typingBuffer.slice(0, -1);
                this.updateTypingPreview();
            } else {
                this.playSound('close');
                this.undoLastNumber();
            }
            return;
        }

        // ── F11: fullscreen ────────────────────────────
        if (e.key === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
            return;
        }

        // ── ESCAPE: always clear/close ─────────────────
        if (e.key === 'Escape') {
            if (modal) { if (modal.close) modal.close(); return; }
            clearTimeout(this.typingTimer);
            this.clearTypingBuffer();
            return;
        }

        // ── + / -: context-aware stepper ──────────────
        if (e.key === '+' || e.key === '-') {
            e.preventDefault();
            const delta = e.key === '+' ? 1 : -1;
            if (modal && modal.adjust) modal.adjust(delta);
            return;
        }

        // ── *: confirm / save (works inside modals too) ─
        if (e.key === '*') {
            e.preventDefault();
            if (modal && modal.confirm) modal.confirm();
            return;
        }

        // ── Remaining keys: ignore if any modal open ───
        if (modal) return;

        // ── /: advance rekke (or log Rekke3 if already on it) ─
        if (e.key === '/') {
            e.preventDefault();
            const order = ['Rekke1', 'Rekke2', 'Rekke3'];
            const idx = order.indexOf(this.slot.currentRekke);
            const nextRekke = order[Math.min(idx + 1, order.length - 1)];
            const btn = this.el.rekkeBtnMap.get(nextRekke);
            if (btn) btn.click();
            return;
        }

        // ── ,: reset (double press) / hold for nullstill alle spill ─
        if (e.key === ',') {
            e.preventDefault();
            if (e.repeat) return;  // prevent auto-repeat cycling
            clearTimeout(this._resetKeyHoldTimer);
            this._resetKeyHeld = false;
            this._resetKeyHoldTimer = setTimeout(() => {
                this._resetKeyHeld = true;
                this.cancelResetConfirm();
                this.openResetAllModal();
            }, 800);
            this.handleReset({ stopPropagation: () => {} });
            return;
        }

        // ── TAB: cycle through games ───────────────────
        if (e.key === 'Tab') {
            e.preventDefault();
            const themes = ['default', ...['blue','yellow','pink','grey']];
            const idx = themes.indexOf(this.currentTheme);
            const next = themes[(idx + 1) % themes.length];
            const btn = this.el.themeButtonMap.get(next);
            if (btn) btn.click();
            return;
        }

        // ── 0-9: typing buffer ─────────────────────────
        if (e.key >= '0' && e.key <= '9') {
            const overwrite = this.settings.typingOverwrite;

            if (overwrite && this.typingBuffer.length === 1) {
                // Second digit arrived within overwrite window
                clearTimeout(this.typingTimer);
                const firstDigit = this.typingBuffer; // e.g. '5'
                this.typingBuffer += e.key;           // e.g. '56'
                this.updateTypingPreview();

                // Undo the first digit directly (bypass oneWay restriction).
                // Only if WE just committed it via the overwrite path — a
                // number called earlier in the game must not be un-called
                // just because a two-digit entry starts with its digit.
                const firstNum = parseInt(firstDigit, 10);
                const firstStr = String(firstNum);
                if (this._lastOverwriteNum === firstNum &&
                    this.slot.selectedNumbers.includes(firstStr)) {
                    this.slot.selectedNumbers = this.slot.selectedNumbers.filter(n => n !== firstStr);
                    const prevBall = this.el.ballMap.get(firstStr);
                    if (prevBall) prevBall.classList.remove('clicked', 'recently-selected', 'last-clicked');
                    if (this._lastClickedBall && this._lastClickedBall.dataset.num === firstStr) {
                        this._lastClickedBall = null;
                    }
                }
                this._lastOverwriteNum = null;
                this.resetProgressBar();
                this.commitTypedNumber();
            } else {
                this.typingBuffer += e.key;
                this.updateTypingPreview();
                clearTimeout(this.typingTimer);
                if (this.typingBuffer.length >= 2) {
                    this._lastOverwriteNum = null;
                    this.commitTypedNumber();
                } else if (overwrite) {
                    // Commit first digit immediately, stay open for second digit
                    const num = parseInt(this.typingBuffer, 10);
                    if (!isNaN(num) && num >= 1 && num <= 90) {
                        const numStr = String(num);
                        if (!this.slot.selectedNumbers.includes(numStr)) {
                            const ball = this.el.ballMap.get(numStr);
                            if (ball) {
                                this.handleNormalClick(ball, numStr);
                                this._lastOverwriteNum = num;
                            }
                        }
                        // Whether or not first digit was already selected, keep buffer
                        // open so second digit can still form a two-digit number
                    }
                    const overwriteDelay = (this.settings.typingOverwriteDelay ?? 10) * 100;
                    this.typingTimer = setTimeout(() => {
                        this._lastOverwriteNum = null;
                        this.clearTypingBuffer();
                    }, overwriteDelay);
                } else {
                    const delay = (this.settings.typingDelay ?? 8) * 100;
                    this.typingTimer = setTimeout(() => this.commitTypedNumber(), delay);
                }
            }
            return;
        }
    }

    updateTypingPreview() {
        const buf = this.typingBuffer;

        // Clear only the balls that were previously highlighted (not all 90)
        this._typingHighlighted.forEach(ball => ball.classList.remove('typing-preview', 'digit-match'));
        this._typingHighlighted.clear();

        if (buf === '') return;

        const exactNum = parseInt(buf, 10);
        this.el.balls.forEach(ball => {
            if (ball.classList.contains('clicked')) return;
            const ballText = ball.dataset.num || ball.textContent.trim();
            // Exact match — full highlight
            if (ballText === String(exactNum)) {
                ball.classList.add('typing-preview');
                this._typingHighlighted.add(ball);
            // Digit match — ball number starts with the typed buffer
            } else if (ballText.startsWith(buf)) {
                ball.classList.add('digit-match');
                this._typingHighlighted.add(ball);
            }
        });
    }

    commitTypedNumber() {
        const num = parseInt(this.typingBuffer, 10);
        if (!isNaN(num) && num >= 1 && num <= 90) {
            const numStr = String(num);
            if (!this.slot.selectedNumbers.includes(numStr)) {
                const ball = this.el.ballMap.get(numStr);
                if (ball) this.handleNormalClick(ball, numStr);
            }
        }
        this.clearTypingBuffer();
    }

    clearTypingBuffer() {
        this.typingBuffer = '';
        this._typingHighlighted.forEach(b => b.classList.remove('typing-preview', 'digit-match'));
        this._typingHighlighted.clear();
    }

    drawRandomNumber() {
        const called = new Set(this.slot.selectedNumbers);
        const remaining = [];
        for (let n = 1; n <= 90; n++) {
            if (!called.has(String(n))) remaining.push(String(n));
        }
        if (remaining.length === 0) return;
        const pick = remaining[Math.floor(Math.random() * remaining.length)];
        const ball = this.el.ballMap.get(pick);
        if (ball) this.handleNormalClick(ball, pick);
    }

    undoLastNumber() {
        const nums = this.slot.selectedNumbers;
        if (nums.length === 0) return;
        const lastNum = nums[nums.length - 1];
        const ball = this.el.ballMap.get(lastNum);
        if (ball) {
            this.slot.selectedNumbers = nums.slice(0, -1);
            ball.classList.remove('clicked', 'recently-selected', 'last-clicked');
            if (this._lastClickedBall === ball) this._lastClickedBall = null;
            // Re-mark new last as last-clicked
            const prev = this.slot.selectedNumbers;
            this.slot.bigNumber = prev.length > 0 ? prev[prev.length - 1] : '';
            this.el.bigNumberText.textContent = this.slot.bigNumber;
            if (this.slot.bigNumber) {
                const newLast = this.el.ballMap.get(this.slot.bigNumber);
                if (newLast) {
                    newLast.classList.add('last-clicked');
                    this._lastClickedBall = newLast;
                }
            }
            this.updateDisplay();
            this.saveSlotToStorage();
            this.bvSendUncall(lastNum);
        }
    }

    // ── Export / Import ──────────────────────────────
    exportSessions() {
        // v2 format: sessions plus everything else needed to move the
        // statistics to a new device. The importer also accepts the old
        // bare-array format.
        const payload = {
            format:      'geithus-bingo-v2',
            exported:    new Date().toISOString(),
            sessions:    this.getSessions(),
            players:     this.getPlayers(),
            manualWins:  this.getManualWins(),
            callHistory: this.getCallHistory(),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `geithus-bingo-sesjoner-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importSessions(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                // v2 = object wrapper with sessions + players/manualWins/callHistory.
                // v1 = bare array of sessions.
                const isV2 = parsed && !Array.isArray(parsed) && Array.isArray(parsed.sessions);
                const imported = isV2 ? parsed.sessions : parsed;
                if (!Array.isArray(imported)) throw new Error('Ugyldig format');

                const existing  = this.getSessions();
                const existDates = new Set(existing.map(s => s.date));

                // Only add sessions whose date doesn't already exist; keep the
                // list chronological so "siste N" filters stay correct.
                const toAdd = imported.filter(s => !existDates.has(s.date));
                const merged = [...existing, ...toAdd]
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                this.saveSessions(merged);

                if (isV2) {
                    // Players: union
                    const players = this.getPlayers();
                    (parsed.players || []).forEach(p => {
                        if (typeof p === 'string' && !players.includes(p)) players.push(p);
                    });
                    this.savePlayers(players);

                    // Manual wins: dedupe on name+prize+date
                    const manuals = this.getManualWins();
                    const seenWins = new Set(manuals.map(m => `${m.name}|${m.prize}|${m.date}`));
                    (parsed.manualWins || []).forEach(m => {
                        const k = `${m.name}|${m.prize}|${m.date}`;
                        if (!seenWins.has(k)) { seenWins.add(k); manuals.push(m); }
                    });
                    localStorage.setItem('bingoManualWins', JSON.stringify(manuals));

                    // Call history: dedupe on session date, keep chronological
                    const hist = this.getCallHistory();
                    const histDates = new Set(hist.map(h => h && h.date));
                    (parsed.callHistory || []).forEach(h => {
                        if (h && h.date && !histDates.has(h.date)) hist.push(h);
                    });
                    hist.sort((a, b) => new Date(a.date) - new Date(b.date));
                    localStorage.setItem('bingoCallHistory', JSON.stringify(hist));
                }

                this.renderSessionList();
                this.updateAverages();
                this.updateViewerCounts();
                alert(`Importert ${toAdd.length} nye sesjon(er). ${imported.length - toAdd.length} duplikat(er) hoppet over.`);
            } catch(err) {
                alert('Kunne ikke lese filen. Kontroller at det er en gyldig JSON-fil.');
            }
            // Reset input so same file can be imported again if needed
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    // ── Computed countdown target ─────────────────────
    getAverageEndTime() {
        const sessions = this.getSessions();
        if (sessions.length === 0) return { hours: 22, minutes: 8 }; // fallback

        const times = sessions.map(s => {
            const d = new Date(s.date);
            return d.getHours() * 60 + d.getMinutes();
        });
        const avgMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        return { hours: Math.floor(avgMinutes / 60), minutes: avgMinutes % 60 };
    }

    // ── Reset All ────────────────────────────────────
    openResetAllModal() {
        this.playSound('select');
        document.body.style.overflow = 'hidden';
        this.el.resetAllModal.style.display = 'flex';
    }

    closeResetAllModal() {
        this.playSound('cancel');
        this.el.resetAllModal.style.display = 'none';
        this.restoreBodyScroll();
    }

    performResetAll() {
        this.playSound('reset-hard');
        this.clearJackpotHighlight();
        this.resetProgressBar();
        this.stopNextGameCountdown();
        GAME_THEMES.forEach(t => { this.slots[t] = freshSlotState(); });
        this.slots['default'] = freshSlotState();
        localStorage.removeItem('bingoPendingWinners');
        this.closeResetAllModal();
        this.el.resetButton.textContent = 'Reset';
        this.el.resetButton.classList.remove('confirm');
        this.resetConfirm = false;

        this.updateAverages();
        this.switchTheme(GAME_THEMES[0]);   // Auto-select game 1 after reset
        this.saveSlotToStorage();
        this.applySlotToDOM();
        this.bvSendReset('all');
    }

    // ── Unsaved Confirm ──────────────────────────────
    promptUnsavedClose(discardFn) {
        this.unsavedDiscardFn = discardFn;
        this.el.unsavedModal.style.display = 'flex';
    }

    confirmUnsavedDiscard() {
        this.el.unsavedModal.style.display = 'none';
        if (this.unsavedDiscardFn) {
            this.unsavedDiscardFn();
            this.unsavedDiscardFn = null;
        }
    }

    closeUnsavedModal() {
        this.el.unsavedModal.style.display = 'none';
        this.unsavedDiscardFn = null;
    }

    // ── Graph ─────────────────────────────────────────
    openGraph() {
        this.playSound('select');
        this.el.graphModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => this.drawGraph(), 50); // let canvas render first
    }

    closeGraph() {
        this.playSound('cancel');
        this.el.graphModal.style.display = 'none';
        this.restoreBodyScroll();
    }

    drawGraph() {
        const canvas  = this.el.graphCanvas;
        const ctx     = canvas.getContext('2d');
        const sessions = this.getSessions().filter(s => s.games && s.games.length);
        if (sessions.length < 2) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,.3)';
            ctx.font = '16px Trebuchet MS';
            ctx.textAlign = 'center';
            ctx.fillText('Ikke nok data enda (minimum 2 sesjoner)', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Set canvas resolution
        const dpr  = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;

        const rekkeKeys   = ['rekke1', 'rekke2', 'rekke3'];
        const rekkeLabels = ['Rekke 1', 'Rekke 2', 'Rekke 3'];
        const colors      = ['#1e9fff', '#f0c030', '#ff4488'];

        // Rolling cumulative average per session
        const avgLines = rekkeKeys.map(rk => {
            let sum = 0, count = 0;
            return sessions.map(s => {
                const vals = s.games.map(g => g ? g[rk] : null)
                    .filter(v => v !== null && v !== undefined && v !== '');
                vals.forEach(v => { sum += Number(v); count++; });
                return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
            });
        });

        // Individual session average (mean of all games that session for that rekke)
        const sessionLines = rekkeKeys.map(rk => {
            return sessions.map(s => {
                const vals = s.games.map(g => g ? g[rk] : null)
                    .filter(v => v !== null && v !== undefined && v !== '');
                if (vals.length === 0) return null;
                const avg = vals.reduce((a, b) => a + Number(b), 0) / vals.length;
                return Math.round(avg * 10) / 10;
            });
        });

        // X axis labels
        const labels = sessions.map(s => {
            const d = new Date(s.date);
            return `${d.getDate()}.${d.getMonth()+1}.${String(d.getFullYear()).slice(2)}`;
        });

        // Value range covers both data sets
        const allVals = [...avgLines.flat(), ...sessionLines.flat()].filter(v => v !== null);
        const minV = Math.max(0, Math.min(...allVals) - 5);
        const maxV = Math.max(...allVals) + 5;

        const pad = { top: 20, right: 20, bottom: 40, left: 36 };
        const gW  = W - pad.left - pad.right;
        const gH  = H - pad.top  - pad.bottom;

        const xPos = i => pad.left + (sessions.length < 2 ? gW / 2 : (i / (sessions.length - 1)) * gW);
        const yPos = v => pad.top + gH - ((v - minV) / (maxV - minV)) * gH;

        ctx.clearRect(0, 0, W, H);

        // Grid lines + y labels
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (gH / 4) * i;
            ctx.strokeStyle = 'rgba(255,255,255,.08)';
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
            const val = Math.round(maxV - ((maxV - minV) / 4) * i);
            ctx.fillStyle = 'rgba(255,255,255,.4)';
            ctx.font = '11px Trebuchet MS';
            ctx.textAlign = 'right';
            ctx.fillText(val, pad.left - 4, y + 4);
        }

        // X axis labels
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.font = '10px Trebuchet MS';
        ctx.textAlign = 'center';
        const step = Math.max(1, Math.ceil(sessions.length / 8));
        labels.forEach((lbl, i) => {
            if (i % step === 0 || i === sessions.length - 1)
                ctx.fillText(lbl, xPos(i), H - pad.bottom + 16);
        });

        // Draw session scatter dots + faint connecting line (per rekke)
        sessionLines.forEach((points, ri) => {
            const col = colors[ri];
            // Faint connecting line
            ctx.strokeStyle = col + '44';
            ctx.lineWidth   = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            let started = false;
            points.forEach((v, i) => {
                if (v === null) return;
                if (!started) { ctx.moveTo(xPos(i), yPos(v)); started = true; }
                else          { ctx.lineTo(xPos(i), yPos(v)); }
            });
            ctx.stroke();
            ctx.setLineDash([]);

            // Dots
            points.forEach((v, i) => {
                if (v === null) return;
                ctx.beginPath();
                ctx.arc(xPos(i), yPos(v), 4, 0, Math.PI * 2);
                ctx.fillStyle   = col + 'aa';
                ctx.strokeStyle = col;
                ctx.lineWidth   = 1.5;
                ctx.fill();
                ctx.stroke();
            });
        });

        // Draw rolling average lines on top (solid, thicker)
        avgLines.forEach((points, ri) => {
            const col = colors[ri];
            ctx.strokeStyle = col;
            ctx.lineWidth   = 2.5;
            ctx.lineJoin    = 'round';
            ctx.beginPath();
            let started = false;
            points.forEach((v, i) => {
                if (v === null) return;
                if (!started) { ctx.moveTo(xPos(i), yPos(v)); started = true; }
                else          { ctx.lineTo(xPos(i), yPos(v)); }
            });
            ctx.stroke();

            // Small filled dots on avg line
            points.forEach((v, i) => {
                if (v === null) return;
                ctx.beginPath();
                ctx.arc(xPos(i), yPos(v), 3, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.fill();
            });
        });

        // Legend: solid line = rolling avg, dashed = session values
        const legend = this.el.graphLegend;
        legend.innerHTML = '';
        rekkeLabels.forEach((lbl, i) => {
            const item = document.createElement('div');
            item.className = 'graph-legend-item';
            item.innerHTML =
                `<span class="graph-legend-dot" style="background:${colors[i]}"></span>${lbl}`;
            legend.appendChild(item);
        });
        // Add line type legend
        const typeInfo = document.createElement('div');
        typeInfo.style.cssText = 'width:100%;text-align:center;font-size:.75rem;color:rgba(255,255,255,.3);margin-top:4px';
        typeInfo.textContent = '— Rullende snitt  · · ·  Sesjonsverdi';
        legend.appendChild(typeInfo);
    }

    // ── Session Viewer ───────────────────────────────
    openViewerModal() {
        this.playSound('select');
        this._viewerMode = null; // 'edit' | 'delete' | null
        // Parse once and pass to all consumers
        const sessions = this.getSessions();
        this.updateViewerCounts(sessions);
        this.updateBackupStatus();
        this.syncFilterUI();
        this.updateViewerAverages(sessions);
        this.renderSessionList(sessions);
        this.updateViewerModeButtons();
        document.body.style.overflow = 'hidden';
        this.el.viewerModal.style.display = 'flex';
    }

    updateViewerModeButtons() {
        // No-op: edit/delete buttons are now inline per session item
    }

    updateViewerCounts(sessions = null) {
        if (!sessions) sessions = this.getSessions();
        const totalGames = sessions.reduce((sum, s) => {
            return sum + (s.games ? s.games.filter(g =>
                g && (g.rekke1 !== null || g.rekke2 !== null || g.rekke3 !== null)
            ).length : 0);
        }, 0);
        this.el.viewerSessionCount.textContent =
            `${sessions.length} sesjon${sessions.length !== 1 ? 'er' : ''}`;
        this.el.viewerGameCount.textContent =
            `${totalGames} spill`;
    }

    syncFilterUI() {
        if (this.avgFilter === null) {
            this.el.avgFilterInput.value = '';
            this.el.avgFilterAllBtn.classList.add('active');
        } else {
            this.el.avgFilterInput.value = this.avgFilter;
            this.el.avgFilterAllBtn.classList.remove('active');
        }
    }

    handleAvgFilterInput() {
        const val = this.el.avgFilterInput.value.trim();
        if (val === '' || parseInt(val, 10) < 1) {
            this.setAvgFilter(null);
        } else {
            this.setAvgFilter(parseInt(val, 10));
        }
    }

    setAvgFilter(n) {
        this.avgFilter = n;
        this.scheduleWrite('bingoAvgFilter', () =>
            this.avgFilter === null ? '' : String(this.avgFilter));
        this.syncFilterUI();
        // Parse once and pass to all three consumers
        const sessions = this.getSessions();
        this.updateAverages(sessions);
        this.updateViewerAverages(sessions);
        this.renderSessionList(sessions);
    }

    stepAvgFilter(delta) {
        const sessions = this.getSessions();
        const max = sessions.length || 1;
        if (this.avgFilter === null) {
            // Alle is active — + starts from 1, − starts from max
            this.setAvgFilter(delta > 0 ? 1 : max);
        } else {
            const next = Math.max(1, Math.min(max, this.avgFilter + delta));
            this.setAvgFilter(next);
        }
    }

    updateViewerAverages(sessions = null) {
        if (!this.el.viewerAvg1) return;
        if (!sessions) sessions = this.getSessions();
        const avgs     = this.computeAverages(sessions, this.avgFilter);
        const defaults = [16, 39, 57];
        [1, 2, 3].forEach((n, i) => {
            this.el[`viewerAvg${n}`].textContent = avgs[i] !== null ? avgs[i] : defaults[i];
        });
    }

    closeViewerModal() {
        this.playSound('cancel');
        this.el.viewerModal.style.display = 'none';
        this.restoreBodyScroll();
    }

    renderSessionList(sessions = null) {
        if (!sessions) sessions = this.getSessions();
        const list = this.el.sessionList;
        list.innerHTML = '';

        if (sessions.length === 0) {
            list.innerHTML = '<div class="session-list-empty">Ingen sesjoner lagret enda.</div>';
            return;
        }

        // Determine which sessions are in the active filter range
        const filterN        = this.avgFilter;
        const totalSessions  = sessions.length;
        const activeStartIdx = filterN ? Math.max(0, totalSessions - filterN) : 0;

        // Compute averages once before the loop (not once per session)
        const dynAvgs = this.computeAverages(sessions);
        const thresholds = [
            dynAvgs[0] !== null ? dynAvgs[0] : 16,
            dynAvgs[1] !== null ? dynAvgs[1] : 39,
            dynAvgs[2] !== null ? dynAvgs[2] : 57,
        ];

        // Newest first
        [...sessions].reverse().forEach((session, reversedIdx) => {
            const realIdx    = sessions.length - 1 - reversedIdx;
            const isInFilter = realIdx >= activeStartIdx;
            const date = new Date(session.date);
            const dateStr = date.toLocaleDateString('no-NO', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            });

            const hasWinners = session.winners && session.winners.length > 0;
            let cls = 'session-list-item';
            if (hasWinners) cls += ' has-winner';
            if (filterN && !isInFilter) cls += ' dimmed';

            const item = document.createElement('div');
            item.className = cls;

            // Click to expand/collapse winner details
            item.addEventListener('click', (e) => {
                if (e.target.closest('.session-item-actions')) return;
                item.classList.toggle('expanded');
            });

            // Crown icon for sessions with winners
            if (hasWinners) {
                const crown = document.createElement('span');
                crown.className   = 'session-winner-crown';
                crown.textContent = '👑';
                item.appendChild(crown);
            }

            // Date
            const dateEl = document.createElement('div');
            dateEl.className   = 'session-item-date';
            dateEl.textContent = dateStr;
            item.appendChild(dateEl);

            // Game values
            const valuesEl = document.createElement('div');
            valuesEl.className = 'session-item-values';

            GAME_THEMES.forEach((theme, gi) => {
                const game = session.games[gi];
                if (!game) return;

                const gameEl = document.createElement('div');
                gameEl.className = 'session-item-game';

                const dot = document.createElement('span');
                dot.className = 'session-item-game-dot';
                dot.style.backgroundColor = this.themeColors[theme]?.accent || THEME_COLORS[theme];
                gameEl.appendChild(dot);

                const rekkeKeys = ['rekke1','rekke2','rekke3'];
                rekkeKeys.forEach((rk, ri) => {
                    const val = game[rk];
                    const span = document.createElement('span');
                    if (val !== null && val !== undefined && val !== '') {
                        span.textContent = val;
                        if (val < thresholds[ri])      span.className = 'session-value-good';
                        else if (val > thresholds[ri]) span.className = 'session-value-bad';
                    } else {
                        span.textContent = '–';
                        span.style.color = 'rgba(255,255,255,.3)';
                    }
                    gameEl.appendChild(span);
                    if (ri < 2) {
                        const sep = document.createElement('span');
                        sep.textContent = ' · ';
                        sep.style.color = 'rgba(255,255,255,.3)';
                        gameEl.appendChild(sep);
                    }
                });

                valuesEl.appendChild(gameEl);
            });
            item.appendChild(valuesEl);

            // Action buttons
            const actions = document.createElement('div');
            actions.className = 'session-item-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'session-item-action-btn session-item-edit-btn';
            editBtn.textContent = '✏';
            editBtn.title = 'Rediger';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playSound('select');
                this.openEditSessionModal(realIdx);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'session-item-action-btn session-item-delete-btn';
            deleteBtn.textContent = '🗑';
            deleteBtn.title = 'Slett';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playSound('select');
                this.openDeleteModal(realIdx, dateStr);
            });

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            item.appendChild(actions);

            // Expandable winner details (shown on click)
            if (hasWinners) {
                const details = document.createElement('div');
                details.className = 'session-winner-details';
                const winnerLines = session.winners.map((w, wi) => {
                    const splitText = w.split > 1 ? ` (1/${w.split})` : '';
                    return `<div class="win-line"><span>🏆 <strong>${this._escapeHtml(w.name)}</strong> · ${this._escapeHtml(w.gameName)} · ${w.rekke.replace('Rekke','Rekke ')} · ${w.prize} kr${splitText}</span>` +
                           `<button class="win-edit-btn" title="Rediger seier" data-widx="${wi}">✎</button></div>`;
                }).join('');
                details.innerHTML = winnerLines;
                details.querySelectorAll('.win-edit-btn').forEach(btn => {
                    btn.addEventListener('click', e => {
                        e.stopPropagation();  // don't collapse the expanded row
                        this.openEditWinModal({ source: 'session', sessionIdx: realIdx, winIdx: Number(btn.dataset.widx) });
                    });
                });
                item.appendChild(details);
            }

            list.appendChild(item);
        });
    }

    // ── Edit Session ─────────────────────────────────
    openEditSessionModal(idx) {
        this.editingSessionIdx = idx;
        const session = this.getSessions()[idx];
        const date = new Date(session.date);
        this.el.editSessionDateLabel.textContent = date.toLocaleDateString('no-NO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        // Populate the datetime-local input. The value format is YYYY-MM-DDTHH:MM
        // in local time; we build that from the stored ISO string.
        const pad = n => String(n).padStart(2, '0');
        const localDt = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
                      + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        this.el.editSessionDateInput.value = localDt;

        const grid = this.el.editSessionGrid;
        grid.innerHTML = '';

        // Header
        ['', 'Rekke 1', 'Rekke 2', 'Rekke 3'].forEach(h => {
            const div = document.createElement('div');
            div.className   = 'session-grid-header';
            div.textContent = h;
            grid.appendChild(div);
        });

        GAME_THEMES.forEach((theme, gi) => {
            const label = document.createElement('div');
            label.className   = 'session-game-label';
            label.textContent = GAME_NAMES[theme];
            label.style.color = this.themeColors[theme]?.accent || THEME_COLORS[theme];
            grid.appendChild(label);

            const game = session.games[gi] || {};
            ['rekke1','rekke2','rekke3'].forEach(rk => {
                const input = document.createElement('input');
                input.type          = 'number';
                input.min           = '1';
                input.max           = '90';
                input.className     = 'session-input';
                input.placeholder   = '–';
                input.dataset.theme = theme;
                input.dataset.rekke = rk;
                if (game[rk] !== null && game[rk] !== undefined && game[rk] !== '') {
                    input.value = game[rk];
                }
                grid.appendChild(input);
            });
        });

        // Render winner rows
        this.renderEditSessionWinners(session.winners || []);

        // Snapshot the form so closing without changes can skip the
        // "unsaved changes" confirmation.
        this._editSessionSnapshot = this._editSessionFormState();

        this.el.editSessionModal.style.display = 'flex';
    }

    // Serialized state of every editable field in the edit-session modal
    _editSessionFormState() {
        const grid    = [...this.el.editSessionGrid.querySelectorAll('.session-input')].map(i => i.value);
        const winners = [...document.querySelectorAll('#edit-session-winners .winner-edit-row')].map(row =>
            ['name','game','rekke','ballCount','prize'].map(f => row.querySelector(`[data-field="${f}"]`).value));
        return JSON.stringify({ date: this.el.editSessionDateInput.value, grid, winners });
    }

    // Close directly when nothing changed; otherwise ask first
    maybePromptEditSessionClose() {
        if (this._editSessionFormState() === this._editSessionSnapshot) {
            this.closeEditSessionModal();
        } else {
            this.promptUnsavedClose(() => this.closeEditSessionModal());
        }
    }

    renderEditSessionWinners(winners) {
        const container = document.getElementById('edit-session-winners');
        container.innerHTML = '';
        // Keep the originals so fields the editor has no input for
        // (split, fullPrize, date, ballCount details) survive a save.
        this._editWinnersOrig = (winners || []).map(w => ({ ...w }));
        this._editWinnersOrig.forEach((w, i) => {
            const row = this.createWinnerRow(w, i);
            row.dataset.origIdx = i;
            container.appendChild(row);
        });
    }

    createWinnerRow(w, idx) {
        const row = document.createElement('div');
        row.className = 'winner-edit-row';
        row.dataset.idx = idx;
        row.innerHTML = `
            <input type="text" placeholder="Navn" data-field="name">
            <select data-field="game">
                ${GAME_THEMES.map(t => `<option value="${t}" ${w.game === t ? 'selected' : ''}>${GAME_NAMES[t]}</option>`).join('')}
            </select>
            <select data-field="rekke">
                <option value="Rekke1" ${w.rekke === 'Rekke1' ? 'selected' : ''}>Rekke 1</option>
                <option value="Rekke2" ${w.rekke === 'Rekke2' ? 'selected' : ''}>Rekke 2</option>
                <option value="Rekke3" ${w.rekke === 'Rekke3' ? 'selected' : ''}>Rekke 3</option>
            </select>
            <input type="number" placeholder="Tall" min="1" max="90" value="${w.ballCount || ''}" data-field="ballCount" title="Antall tall trukket">
            <input type="number" placeholder="kr" min="0" step="0.01" value="${w.prize ?? ''}" data-field="prize" title="Premie (kr)">
            <button type="button" class="winner-remove-btn" title="Fjern">&times;</button>
        `;
        // Set via property, not attribute interpolation — names can contain quotes
        row.querySelector('[data-field="name"]').value = w.name || '';
        row.querySelector('.winner-remove-btn').addEventListener('click', () => row.remove());
        return row;
    }

    saveEditedSession() {
        this.playSound('confirm');
        const sessions = this.getSessions();
        const inputs   = this.el.editSessionGrid.querySelectorAll('.session-input');
        const games    = {};
        GAME_THEMES.forEach(t => { games[t] = { rekke1: null, rekke2: null, rekke3: null }; });

        inputs.forEach(input => {
            const { theme, rekke } = input.dataset;
            const val = input.value.trim();
            games[theme][rekke] = val !== '' ? Number(val) : null;
        });

        sessions[this.editingSessionIdx].games = GAME_THEMES.map(t => games[t]);

        // Collect winners from the editor rows. Rows created from existing
        // winners carry data-orig-idx — start from the original object so
        // prize/split/fullPrize aren't wiped by a round-trip through the
        // editor (they used to be, zeroing leaderboard money).
        const winnerRows = document.querySelectorAll('#edit-session-winners .winner-edit-row');
        const winners = [];
        winnerRows.forEach(row => {
            const name = row.querySelector('[data-field="name"]').value.trim();
            const game = row.querySelector('[data-field="game"]').value;
            const rekke = row.querySelector('[data-field="rekke"]').value;
            const ballCount = Number(row.querySelector('[data-field="ballCount"]').value) || null;
            const prizeRaw = row.querySelector('[data-field="prize"]').value.trim();
            if (name || ballCount) {
                const origIdx = row.dataset.origIdx;
                const base = (origIdx !== undefined && this._editWinnersOrig?.[origIdx])
                    ? { ...this._editWinnersOrig[origIdx] } : {};
                const prize = prizeRaw !== ''
                    ? Number(prizeRaw)
                    : (base.prize ?? (PRIZES[game] ? PRIZES[game][rekke] : null));
                winners.push({
                    ...base,
                    name: name || 'Ukjent',
                    game,
                    gameName: GAME_NAMES[game],
                    rekke,
                    ballCount,
                    prize,
                    date: base.date || sessions[this.editingSessionIdx].date,
                });
            }
        });
        sessions[this.editingSessionIdx].winners = winners;

        // Save edited date if the user changed it
        const rawDt = this.el.editSessionDateInput.value;
        if (rawDt) {
            sessions[this.editingSessionIdx].date = new Date(rawDt).toISOString();
        }

        // Keep history chronological — the "siste N" filter, the graph and
        // dry-spell calculations all assume it (the importer sorts too).
        sessions.sort((a, b) => new Date(a.date) - new Date(b.date));

        this.saveSessions(sessions);

        this.closeEditSessionModal();
        this.renderSessionList();
        this.updateAverages();
        this.updateViewerCounts();
        // Refresh dynamic countdown in case the edited time affects the average
        if (!this.settings.countdownFixed) this.startCountdown();
    }

    closeEditSessionModal() {
        this.playSound('cancel');
        this.el.editSessionModal.style.display = 'none';
        this.editingSessionIdx = null;
    }

    // ── Delete Session ───────────────────────────────
    openDeleteModal(idx, dateStr) {
        this.deletingSessionIdx = idx;
        this.el.deleteModalText.textContent = `Slett sesjonen fra ${dateStr}?`;
        this.el.deleteModal.style.display = 'flex';
    }

    confirmDelete() {
        this.playSound('confirm');
        const sessions = this.getSessions().slice();
        sessions.splice(this.deletingSessionIdx, 1);
        this.saveSessions(sessions);
        this.closeDeleteModal();
        this.renderSessionList();
        this.updateAverages();
        this.updateViewerCounts();
    }

    closeDeleteModal() {
        this.playSound('cancel');
        this.el.deleteModal.style.display = 'none';
        this.deletingSessionIdx = null;
    }

    // ── Reset ────────────────────────────────────────
    handleReset(event) {
        event.stopPropagation();
        if (!this.resetConfirm) {
            this.resetConfirm = true;
            this.el.resetButton.textContent = 'Sikker?';
            this.el.resetButton.classList.add('confirm');
        } else {
            this.performReset();
        }
    }

    performReset() {
        this.playSound('reset');
        this.clearJackpotHighlight();
        this.resetProgressBar();
        this.slots[this.currentTheme] = freshSlotState();
        // Remove pending winners for this game
        const pending = this.getPendingWinners().filter(w => w.game !== this.currentTheme);
        localStorage.setItem('bingoPendingWinners', JSON.stringify(pending));
        this.updateAverages();
        this.el.resetButton.textContent = 'Reset';
        this.el.resetButton.classList.remove('confirm');
        this.resetConfirm = false;

        this.saveSlotToStorage();
        this.applySlotToDOM();
        this.bvSendReset('game');
    }

    cancelResetConfirm() {
        if (!this.resetConfirm) return;
        this.el.resetButton.textContent = 'Reset';
        this.el.resetButton.classList.remove('confirm');
        this.resetConfirm = false;
    }

    // ── Jackpot Mode ─────────────────────────────────
    clearJackpotHighlight(returnToPrev = false) {
        const prev = this.jackpotPrevTheme;
        this.jackpotMode = false;
        this.jackpotPrevTheme = null;
        this.el.jackpotButton.textContent = 'Jackpot';
        this.el.jackpotButton.classList.remove('active');
        this.el.balls.forEach(b => b.classList.remove('jackpot-highlight'));
        if (returnToPrev && prev) {
            this.currentTheme = prev;
            this.saveSlotToStorage();
            this.applySlotToDOM();
        }
    }

    toggleJackpotMode() {
        this.jackpotMode = !this.jackpotMode;
        if (this.jackpotMode) {
            // Auto-switch to game 4 (grey) if not already there
            if (this.currentTheme !== 'grey') {
                this.jackpotPrevTheme = this.currentTheme;
                this.currentTheme = 'grey';
                this.saveSlotToStorage();
                this.applySlotToDOM(); // this resets jackpotMode to false — fix below
            } else {
                this.jackpotPrevTheme = null;
            }

            // Re-apply jackpot state (applySlotToDOM resets it)
            this.jackpotMode = true;
            this.el.jackpotButton.textContent = 'Avbryt';
            this.el.jackpotButton.classList.add('active');
            this.el.balls.forEach(b => b.classList.remove('jackpot'));
            this.slot.jackpotNumber = null;

            // Highlight all unclicked balls
            this.el.balls.forEach(b => {
                if (!b.classList.contains('clicked') && !b.dataset.skipBall)
                    b.classList.add('jackpot-highlight');
            });
        } else {
            this.playSound('cancel');
            this.clearJackpotHighlight(true);
        }
    }

    // ── Inactivity tooltip ───────────────────────────
    resetInactivityTimer() {
        clearInterval(this.inactivityTimer);
        this.hideRekkeTooltip();
        this.inactivityTimer = setInterval(() => this.showRekkeTooltip(), 30000);
    }

    showRekkeTooltip() {
        if (!this.settings.tooltipEnabled) return;
        const s = this.slot;
        // Suppress if: no numbers called, on Rekke3, or no new numbers since last rekke change
        if (s.selectedNumbers.length === 0) return;
        if (s.currentRekke === 'Rekke3') return;
        if (s.selectedNumbers.length === (s.countAtLastRekkeChange || 0)) return;
        this.el.rekkeTooltip.classList.add('visible');
    }

    hideRekkeTooltip() { this.el.rekkeTooltip.classList.remove('visible'); }

    // ── Next-game countdown ──────────────────────────
    startNextGameCountdown() {
        if (!this.settings.nextGameCountdownEnabled) return;
        // Don't show timer after the LAST game (game 4 / grey)
        if (this.currentTheme === GAME_THEMES[GAME_THEMES.length - 1]) return;
        this.stopNextGameCountdown();
        const totalSeconds = (this.settings.nextGameCountdownMinutes ?? 3) * 60
                           + (this.settings.nextGameCountdownSeconds ?? 0);
        if (totalSeconds <= 0) return;
        this._nextGameCdEnd   = Date.now() + totalSeconds * 1000;
        this._nextGameCdTotal = totalSeconds;
        this.el.nextGameCdWrap.style.display = '';
        const tick = () => {
            const remaining = Math.max(0, Math.round((this._nextGameCdEnd - Date.now()) / 1000));
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            this.el.nextGameCdDisplay.textContent =
                `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            this.el.nextGameCdBar.style.width =
                `${(remaining / this._nextGameCdTotal) * 100}%`;
            if (remaining > 0) {
                this._nextGameCdTimer = setTimeout(tick, 1000);
            } else {
                this.el.nextGameCdWrap.style.display = 'none';
            }
        };
        tick();
    }

    stopNextGameCountdown() {
        clearTimeout(this._nextGameCdTimer);
        this._nextGameCdTimer = null;
        if (this.el.nextGameCdWrap) this.el.nextGameCdWrap.style.display = 'none';
    }

    // ── Countdown ────────────────────────────────────
    startCountdown() {
        // Clear any existing interval so calling this more than once doesn't stack timers
        if (this._countdownInterval) clearInterval(this._countdownInterval);
        const getNextTarget = () => {
            let hours, minutes;
            if (this.settings.countdownFixed && this.settings.countdownTime) {
                [hours, minutes] = this.settings.countdownTime.split(':').map(Number);
            } else {
                ({ hours, minutes } = this.getAverageEndTime());
            }
            const t = new Date();
            t.setHours(hours, minutes, 0, 0);
            if (Date.now() > t.getTime()) t.setDate(t.getDate() + 1);
            return t;
        };
        let target = getNextTarget();
        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) { target = getNextTarget(); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            this.el.countdown.textContent =
                `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        };
        tick();
        // Display is HH:MM only — a 30s tick is plenty and saves wakeups
        this._countdownInterval = setInterval(tick, 30000);
    }

    // ── Sound Engine ─────────────────────────────────
    getAudioContext() {
        if (!this._audioCtx) {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this._audioCtx;
    }

    // ── Sound Upload ─────────────────────────────────
    openUploadSoundModal() {
        this.playSound('select');
        // Uncheck all categories
        this.el.uploadSoundCats.querySelectorAll('input[type="checkbox"]')
            .forEach(cb => cb.checked = false);
        this.el.uploadSoundInput.value = '';
        this.el.bundledSoundSelect.value = '';
        this.el.uploadSoundModal.style.display = 'flex';
    }

    closeUploadSoundModal() {
        this.playSound('cancel');
        this.el.uploadSoundModal.style.display = 'none';
    }

    handleSoundUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const categories = [...this.el.uploadSoundCats.querySelectorAll('input:checked')]
            .map(cb => cb.value);
        if (categories.length === 0) {
            alert('Velg minst én kategori før du velger fil.');
            this.el.uploadSoundInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result; // full data URL
            const name = file.name.replace(/\.[^.]+$/, ''); // strip extension
            const key = 'user_' + name.replace(/[^a-zA-Z0-9]/g, '_');

            // Store in IndexedDB: { src: base64, name, categories }
            const entry = { src: base64, name, categories };
            this._userSounds[key] = entry;
            this._idbPutSound(key, entry).catch(() => {
                alert('Kunne ikke lagre lyden permanent — den fungerer i denne økten, men forsvinner ved omlasting.');
            });

            // Decode into AudioBuffer cache for instant first-play
            this._decodeAndCacheWav(key, base64);

            // Inject into relevant dropdowns
            this.injectUserSoundOptions();

            this.closeUploadSoundModal();
            this.playSound('confirm');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    previewBundledSound() {
        const src = this.el.bundledSoundSelect.value;
        if (!src) return;
        // Use the buffered playback path to avoid leaking HTMLAudioElements
        this.playWav(src, 'preview_' + src, 1.0);
    }

    useBundledSound() {
        const src = this.el.bundledSoundSelect.value;
        if (!src) { alert('Velg en lyd fra listen.'); return; }

        const categories = [...this.el.uploadSoundCats.querySelectorAll('input:checked')]
            .map(cb => cb.value);
        if (categories.length === 0) {
            alert('Velg minst én kategori før du bruker lyden.');
            return;
        }

        const name = this.el.bundledSoundSelect.options[this.el.bundledSoundSelect.selectedIndex].text;
        const filename = src.split('/').pop().replace(/\.[^.]+$/, '');
        const key = 'bundled_' + filename.replace(/[^a-zA-Z0-9]/g, '_');

        const entry = { src, name, categories };
        this._userSounds[key] = entry;
        this._idbPutSound(key, entry).catch(() => {});

        this._decodeAndCacheWav(key, src);

        this.injectUserSoundOptions();
        this.closeUploadSoundModal();
        this.playSound('confirm');
    }

    // Synchronous read of the user-sound library (in-memory mirror of IndexedDB).
    getUserSounds() {
        return this._userSounds || {};
    }

    // ── IndexedDB persistence for uploaded sounds ────
    _soundDB() {
        if (this._soundDBPromise) return this._soundDBPromise;
        this._soundDBPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open('bingoSounds', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('sounds');
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => reject(req.error);
        });
        return this._soundDBPromise;
    }

    async _idbPutSound(key, data) {
        const db = await this._soundDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('sounds', 'readwrite');
            tx.objectStore('sounds').put(data, key);
            tx.oncomplete = () => resolve();
            tx.onerror    = () => reject(tx.error);
        });
    }

    async _idbGetAllSounds() {
        const db = await this._soundDB();
        return new Promise((resolve, reject) => {
            const tx  = db.transaction('sounds', 'readonly');
            const cur = tx.objectStore('sounds').openCursor();
            const out = {};
            cur.onsuccess = () => {
                const c = cur.result;
                if (c) { out[c.key] = c.value; c.continue(); }
                else resolve(out);
            };
            cur.onerror = () => reject(cur.error);
        });
    }

    // Map sound category → dropdown element id
    getCategoryDropdownId(cat) {
        const map = {
            hover:        'setting-hover-style',
            call:         'setting-call-style',
            select:       'setting-select-style',
            switch:       'setting-switch-style',
            confirm:      'setting-confirm-style',
            cancel:       'setting-cancel-style',
            reset:        'setting-reset-style',
            'reset-hard': 'setting-reset-hard-style',
            overtime:      'setting-overtime-style',
            'first-rekke': 'setting-first-rekke-style',
        };
        return map[cat] || null;
    }

    injectUserSoundOptions() {
        const sounds = this.getUserSounds();

        // Remove all previously injected user options from all dropdowns
        document.querySelectorAll('option.user-sound').forEach(o => o.remove());

        Object.entries(sounds).forEach(([key, data]) => {
            data.categories.forEach(cat => {
                const dropId = this.getCategoryDropdownId(cat);
                if (!dropId) return;
                const select = document.getElementById(dropId);
                if (!select) return;
                // Don't add duplicate
                if (select.querySelector(`option[value="${key}"]`)) return;
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = data.name;
                opt.className = 'user-sound';
                select.appendChild(opt);
            });
        });
    }

    // Decode a WAV into the AudioBuffer cache so the first play is instant.
    // Silently no-ops if AudioContext isn't available yet.
    _decodeAndCacheWav(key, src, isRetry = false) {
        if (!this._wavBuffers) this._wavBuffers = {};
        if (this._wavBuffers[key]) return;
        try {
            const ctx = this.getAudioContext();
            fetch(src)
                .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
                .then(ab => ctx.decodeAudioData(ab))
                .then(buf => { this._wavBuffers[key] = buf; })
                .catch(err => {
                    if (!isRetry) {
                        // 19 preloads racing a just-started server can drop one —
                        // retry once before reporting it as a real failure.
                        setTimeout(() => this._decodeAndCacheWav(key, src, true), 3000);
                    } else {
                        this._reportSoundLoadFailure(key, src, err);
                    }
                });
        } catch (e) { /* AudioContext not ready */ }
    }

    async loadUserSoundsIntoPool() {
        // One-time migration: older versions kept base64 WAVs in localStorage
        // under 'bingoUserSounds'. Move them into IndexedDB and free the quota.
        let legacy = null;
        try { legacy = JSON.parse(localStorage.getItem('bingoUserSounds') || 'null'); } catch(e) {}
        try {
            if (legacy && typeof legacy === 'object') {
                for (const [key, data] of Object.entries(legacy)) {
                    await this._idbPutSound(key, data);
                }
                localStorage.removeItem('bingoUserSounds');
            }
            this._userSounds = await this._idbGetAllSounds();
        } catch (e) {
            // IndexedDB unavailable (private mode etc.) — keep the legacy copy
            this._userSounds = legacy || {};
        }
        Object.entries(this._userSounds).forEach(([key, data]) => {
            this._decodeAndCacheWav(key, data.src);
        });
        this.injectUserSoundOptions();
        // The IDB load resolves after applySettings has already synced the
        // dropdowns, so re-apply saved styles now that user options exist.
        this.syncSoundStyleDropdowns();
    }

    // Re-sync the sound-style <select>s from settings. Safe to call any time;
    // needed after user-sound options are injected asynchronously.
    syncSoundStyleDropdowns() {
        const s = this.settings;
        [
            [this.el.settingHoverStyle,      s.hoverStyle],
            [this.el.settingCallStyle,       s.callStyle],
            [this.el.settingSelectStyle,     s.selectStyle],
            [this.el.settingSwitchStyle,     s.switchStyle],
            [this.el.settingConfirmStyle,    s.confirmStyle],
            [this.el.settingCancelStyle,     s.cancelStyle],
            [this.el.settingResetStyle,      s.resetStyle],
            [this.el.settingResetHardStyle,  s.resetHardStyle],
            [this.el.settingOvertimeStyle,   s.overtimeStyle],
            [this.el.settingFirstRekkeStyle, s.firstRekkeStyle],
        ].forEach(([el, val]) => { if (el && val != null) el.value = val; });
    }

    // Decode only the WAVs the CURRENT settings can actually play, instead
    // of all 19 bundled files (~2 MB) up front. Anything not preloaded is
    // still fetched+decoded lazily by playWav on first use (e.g. after the
    // user switches a sound style or previews one in the upload modal).
    preloadSounds() {
        const s = this.settings;
        const wanted = new Map();
        const add = ([key, src]) => wanted.set(key, src);

        // Deselect/undo always plays 'close' regardless of style settings
        add(['close', CLOSE_WAV]);

        // settings key → { style value → [cacheKey, src] }
        const table = {
            hoverStyle: {
                're4':                 ['re4_hover',         RE4_HOVER_WAV],
                're4-loud':            ['re4_hover_loud',    RE4_HOVER_LOUD_WAV],
                'custom-click-hover':  ['click_and_hover',   CLICK_AND_HOVER_WAV],
                'custom-click-hover-2':['click_and_hover_2', CLICK_AND_HOVER_2_WAV],
                'custom-click-hover-3':['click_and_hover_3', CLICK_AND_HOVER_3_WAV],
            },
            callStyle: {
                're4-select-number':   ['re4_select_number', RE4_SELECT_NUMBER_WAV],
                're4-select':          ['re4_select',        RE4_SELECT_WAV],
                'custom-click':        ['click',             CLICK_WAV],
                'custom-click-2':      ['click_2',           CLICK_2_WAV],
            },
            selectStyle: {
                're4-select':          ['re4_select',        RE4_SELECT_WAV],
                're4-select-number':   ['re4_select_number', RE4_SELECT_NUMBER_WAV],
                'custom-click-jackpot':['click_jackpot',     CLICK_JACKPOT_WAV],
            },
            switchStyle: {
                're4-switch':          ['re4_switch',        RE4_SWITCH_WAV],
                're4-switch-2':        ['re4_switch_2',      RE4_SWITCH_2_WAV],
            },
            confirmStyle: {
                're4-select':          ['re4_select',        RE4_SELECT_WAV],
                're4-switch':          ['re4_switch',        RE4_SWITCH_WAV],
                'custom-save-confirm-2':['save_confirm_2',   SAVE_CONFIRM_2_WAV],
            },
            cancelStyle: {
                're4-cancel':          ['re4_cancel',        RE4_CANCEL_WAV],
                're4-cancel-big':      ['re4_cancel_big',    RE4_CANCEL_BIG_WAV],
                'custom-close':        ['close',             CLOSE_WAV],
            },
            resetStyle: {
                're4-cancel-big':      ['re4_cancel_big',    RE4_CANCEL_BIG_WAV],
                're4-cancel':          ['re4_cancel',        RE4_CANCEL_WAV],
            },
            resetHardStyle: {
                're4-cancel-big':      ['re4_cancel_big',    RE4_CANCEL_BIG_WAV],
                're4-cancel':          ['re4_cancel',        RE4_CANCEL_WAV],
            },
            overtimeStyle: {
                'custom':              ['overtime',          OVERTIME_WAV],
                'custom-62274159':     ['sound_62274159',    'Sounds/62274159.wav'],
            },
            firstRekkeStyle: {
                'gong':                ['firstnumber_gong',  FIRSTNUMBER_WAV],
            },
        };
        Object.entries(table).forEach(([settingKey, styles]) => {
            const entry = styles[s[settingKey]];
            if (entry) add(entry);
        });

        wanted.forEach((src, key) => this._decodeAndCacheWav(key, src));
    }

    // Play a WAV via the Web Audio API. Decodes the file once into an
    // AudioBuffer (cached by key) and plays each instance through a fresh
    // BufferSource node which the browser auto-GCs when finished.
    //
    // This replaces the old HTMLAudioElement.cloneNode() approach, which
    // accumulated detached audio elements and exhausted iOS Safari's
    // decoder slots on long sessions — causing sound effects to cut out
    // (only the tail playing) after ~30-90 calls on iPad.
    playWav(src, cacheKey, volume = 1.0) {
        if (!this._wavBuffers)   this._wavBuffers   = {};
        if (!this._wavLoading)   this._wavLoading   = {};
        const ctx = this.getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        // Non-finite volume (null/NaN from corrupt settings) must not kill
        // the sound: treat it as full volume rather than gain 0 / a throw.
        const vol = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;

        const playBuffer = (buf) => {
            try {
                const src = ctx.createBufferSource();
                src.buffer = buf;
                const g = ctx.createGain();
                g.gain.value = vol;
                src.connect(g); g.connect(ctx.destination);
                src.start(0);
                // Cleanup: disconnect once the source finishes so nodes don't
                // pile up across thousands of plays.
                src.onended = () => { try { src.disconnect(); g.disconnect(); } catch (e) {} };
            } catch (e) { /* ignore */ }
        };

        const cached = this._wavBuffers[cacheKey];
        if (cached) { playBuffer(cached); return; }

        // De-dupe parallel loads of the same key
        if (this._wavLoading[cacheKey]) {
            this._wavLoading[cacheKey].push(playBuffer);
            return;
        }
        this._wavLoading[cacheKey] = [playBuffer];

        fetch(src)
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
            .then(ab => ctx.decodeAudioData(ab))
            .then(buf => {
                this._wavBuffers[cacheKey] = buf;
                const queue = this._wavLoading[cacheKey] || [];
                delete this._wavLoading[cacheKey];
                queue.forEach(fn => fn(buf));
            })
            .catch(err => {
                delete this._wavLoading[cacheKey];
                this._reportSoundLoadFailure(cacheKey, src, err);
            });
    }

    // Sound files failing to load used to be swallowed silently, which made
    // "this sound just doesn't play" impossible to diagnose. Log each failed
    // key once to the error log (visible under Feil-logg in the nav menu).
    _reportSoundLoadFailure(cacheKey, src, err) {
        if (!this._soundFailuresReported) this._soundFailuresReported = new Set();
        if (this._soundFailuresReported.has(cacheKey)) return;
        this._soundFailuresReported.add(cacheKey);
        const srcLabel = String(src).startsWith('data:') ? '(opplastet lyd)' : src;
        try {
            window.bingoErrorLog.record('sound',
                `Lydfil kunne ikke lastes: ${cacheKey} ← ${srcLabel}` +
                (location.protocol === 'file:' ? ' — siden kjører fra file://, da blokkeres lydfiler. Bruk en lokal server.' : ''),
                err && err.message);
        } catch (e) {}
    }

    playSound(type) {
        if (!this.settings.soundEnabled) return;
        if (this.settings.mutedSounds?.[type]) return;
        try {
            // Check if the style for this type is a user-uploaded sound
            const styleKey = {
                hover: 'hoverStyle', call: 'callStyle', select: 'selectStyle',
                switch: 'switchStyle', confirm: 'confirmStyle', cancel: 'cancelStyle',
                reset: 'resetStyle', 'reset-hard': 'resetHardStyle', overtime: 'overtimeStyle',
                'first-rekke': 'firstRekkeStyle',
            }[type];
            if (styleKey) {
                const style = this.settings[styleKey];
                if (style) {
                    const sounds = this.getUserSounds();
                    if (sounds[style]) {
                        this.playWav(sounds[style].src, style, this.settings['vol' + styleKey.replace('Style','').replace(/^\w/, c => c.toUpperCase())] ?? 0.8);
                        return;
                    }
                }
            }
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            const n = ctx.currentTime;
            const D = ctx.destination;
            const s = this.settings;

            // Master gain node for all synth sounds — respects per-type volume.
            // Non-finite vol (corrupt settings) falls back to 1 instead of
            // throwing / silencing the whole sound.
            const masterGain = (vol) => {
                const g = ctx.createGain();
                g.gain.value = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : 1;
                g.connect(D); return g;
            };

            const osc = (t, f) => { const o = ctx.createOscillator(); o.type = t; o.frequency.value = f; return o; };
            const gn  = ()      => { const g = ctx.createGain(); g.gain.value = 0; return g; };
            const flt = (t, f, q) => { const fi = ctx.createBiquadFilter(); fi.type = t; fi.frequency.value = f; if (q) fi.Q.value = q; return fi; };
            const nz  = (dur)   => {
                const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
                const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                const s2 = ctx.createBufferSource(); s2.buffer = b; return s2;
            };
            // Route synth output through a master vol node
            const MD = (vol) => masterGain(vol);

            if (type === 'select') {
                const vol = s.volSelect;
                if (s.selectStyle === 're4-select') { this.playWav(RE4_SELECT_WAV, 're4_select', vol); return; }
                if (s.selectStyle === 're4-select-number') { this.playWav(RE4_SELECT_NUMBER_WAV, 're4_select_number', vol); return; }
                if (s.selectStyle === 'custom-click-jackpot') { this.playWav(CLICK_JACKPOT_WAV, 'click_jackpot', vol); return; }
                const d = MD(vol);
                const o = osc('sine', 520); const g = gn();
                o.frequency.exponentialRampToValueAtTime(660, n+0.06);
                g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.15, n+0.01); g.gain.exponentialRampToValueAtTime(0.001, n+0.1);
                o.connect(g); g.connect(d); o.start(n); o.stop(n+0.1);

            } else if (type === 'call') {
                if (s.callStyle === 're4-select-number') { this.playWav(RE4_SELECT_NUMBER_WAV, 're4_select_number', s.volCall); return; }
                if (s.callStyle === 're4-select')        { this.playWav(RE4_SELECT_WAV, 're4_select', s.volCall); return; }
                if (s.callStyle === 'custom-click')      { this.playWav(CLICK_WAV, 'click', s.volCall); return; }
                if (s.callStyle === 'custom-click-2')    { this.playWav(CLICK_2_WAV, 'click_2', s.volCall); return; }
                if (s.callStyle === 're4-inspired') {
                    const md = MD(s.volCall);
                    const clickBuf = ctx.createBuffer(1, ctx.sampleRate * 0.025, ctx.sampleRate);
                    const cd = clickBuf.getChannelData(0);
                    for (let i = 0; i < cd.length; i++) cd[i] = (Math.random()*2-1) * Math.exp(-i / (ctx.sampleRate * 0.003));
                    const clickSrc = ctx.createBufferSource(); clickSrc.buffer = clickBuf;
                    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 3500; cf.Q.value = 0.6;
                    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.55, n);
                    clickSrc.connect(cf); cf.connect(cg); cg.connect(md); clickSrc.start(n);
                    const o1 = osc('sine', 240); const g1 = gn();
                    o1.frequency.setValueAtTime(240, n); o1.frequency.exponentialRampToValueAtTime(80, n+0.1);
                    g1.gain.setValueAtTime(0, n); g1.gain.linearRampToValueAtTime(0.8, n+0.004); g1.gain.exponentialRampToValueAtTime(0.001, n+0.16);
                    o1.connect(g1); g1.connect(md); o1.start(n); o1.stop(n+0.16);
                    const o2 = osc('triangle', 680); const g2 = gn();
                    o2.frequency.setValueAtTime(680, n+0.005); o2.frequency.exponentialRampToValueAtTime(340, n+0.12);
                    g2.gain.setValueAtTime(0, n); g2.gain.linearRampToValueAtTime(0.22, n+0.006); g2.gain.exponentialRampToValueAtTime(0.001, n+0.14);
                    o2.connect(g2); g2.connect(md); o2.start(n+0.005); o2.stop(n+0.14);
                    const noTail = nz(0.08);
                    const tailHp = flt('highpass', 2000, 0.5); const tailLp = flt('lowpass', 6000);
                    const tailG = gn();
                    tailG.gain.setValueAtTime(0, n+0.02); tailG.gain.linearRampToValueAtTime(0.1, n+0.04); tailG.gain.exponentialRampToValueAtTime(0.001, n+0.1);
                    noTail.connect(tailHp); tailHp.connect(tailLp); tailLp.connect(tailG); tailG.connect(md);
                    noTail.start(n+0.02); return;
                }
                if (s.callStyle === 'synth-inverse') {
                    // synth: inverse double chime (low-high)
                    const md = MD(s.volCall);
                    [[660, 0], [880, 0.08]].forEach(([freq, delay]) => {
                        const o = osc('sine', freq); const g = gn();
                        const o2 = osc('sine', freq * 1.5); const g2 = gn();
                        g.gain.setValueAtTime(0, n+delay); g.gain.linearRampToValueAtTime(0.25, n+delay+0.01); g.gain.exponentialRampToValueAtTime(0.001, n+delay+0.4);
                        g2.gain.setValueAtTime(0, n+delay); g2.gain.linearRampToValueAtTime(0.08, n+delay+0.01); g2.gain.exponentialRampToValueAtTime(0.001, n+delay+0.22);
                        o.connect(g); g.connect(md); o2.connect(g2); g2.connect(md);
                        o.start(n+delay); o.stop(n+delay+0.4); o2.start(n+delay); o2.stop(n+delay+0.22);
                    });
                    return;
                }
                // synth: double chime (high-low)
                { const md = MD(s.volCall);
                [[880, 0], [660, 0.08]].forEach(([freq, delay]) => {
                    const o = osc('sine', freq); const g = gn();
                    const o2 = osc('sine', freq * 1.5); const g2 = gn();
                    g.gain.setValueAtTime(0, n+delay); g.gain.linearRampToValueAtTime(0.25, n+delay+0.01); g.gain.exponentialRampToValueAtTime(0.001, n+delay+0.4);
                    g2.gain.setValueAtTime(0, n+delay); g2.gain.linearRampToValueAtTime(0.08, n+delay+0.01); g2.gain.exponentialRampToValueAtTime(0.001, n+delay+0.22);
                    o.connect(g); g.connect(md); o2.connect(g2); g2.connect(md);
                    o.start(n+delay); o.stop(n+delay+0.4); o2.start(n+delay); o2.stop(n+delay+0.22);
                }); }

            } else if (type === 'first-rekke') {
                if (s.firstRekkeStyle === 'off') return;
                if (s.firstRekkeStyle === 'gong') { this.playWav(FIRSTNUMBER_WAV, 'firstnumber_gong', s.volFirstRekke); return; }
                // synth: rising three-note arpeggio to signal rekke start
                { const md = MD(s.volFirstRekke);
                [440, 554, 660].forEach((freq, i) => {
                    const o = osc('sine', freq); const g = gn();
                    const o2 = osc('sine', freq * 2); const g2 = gn();
                    g.gain.setValueAtTime(0, n+i*0.09); g.gain.linearRampToValueAtTime(0.22, n+i*0.09+0.01); g.gain.exponentialRampToValueAtTime(0.001, n+i*0.09+0.35);
                    g2.gain.setValueAtTime(0, n+i*0.09); g2.gain.linearRampToValueAtTime(0.06, n+i*0.09+0.01); g2.gain.exponentialRampToValueAtTime(0.001, n+i*0.09+0.2);
                    o.connect(g); g.connect(md); o2.connect(g2); g2.connect(md);
                    o.start(n+i*0.09); o.stop(n+i*0.09+0.35); o2.start(n+i*0.09); o2.stop(n+i*0.09+0.2);
                }); }

            } else if (type === 'hover') {
                this.playHover(ctx, n, D);

            } else if (type === 'switch') {
                if (s.switchStyle === 're4-switch')   { this.playWav(RE4_SWITCH_WAV, 're4_switch', s.volSwitch); return; }
                if (s.switchStyle === 're4-switch-2') { this.playWav(RE4_SWITCH_2_WAV, 're4_switch_2', s.volSwitch); return; }
                { const md = MD(s.volSwitch);
                [440, 550, 660].forEach((freq, i) => {
                    const o = osc('sine', freq); const g = gn();
                    g.gain.setValueAtTime(0, n+i*0.05); g.gain.linearRampToValueAtTime(0.15, n+i*0.05+0.01); g.gain.exponentialRampToValueAtTime(0.001, n+i*0.05+0.06);
                    o.connect(g); g.connect(md); o.start(n+i*0.05); o.stop(n+i*0.05+0.06);
                }); }

            } else if (type === 'reset') {
                if (s.resetStyle === 're4-cancel-big') { this.playWav(RE4_CANCEL_BIG_WAV, 're4_cancel_big', s.volReset); return; }
                if (s.resetStyle === 're4-cancel')     { this.playWav(RE4_CANCEL_WAV, 're4_cancel', s.volReset); return; }
                { const md = MD(s.volReset);
                const no = nz(0.18); const lp = flt('lowpass', 350, 0.3); const g = gn();
                g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.4, n+0.03); g.gain.setValueAtTime(0.4, n+0.12); g.gain.exponentialRampToValueAtTime(0.001, n+0.18);
                no.connect(lp); lp.connect(g); g.connect(md); no.start(n); }

            } else if (type === 'reset-hard') {
                if (s.resetHardStyle === 're4-cancel-big') { this.playWav(RE4_CANCEL_BIG_WAV, 're4_cancel_big', s.volResetHard); return; }
                if (s.resetHardStyle === 're4-cancel')     { this.playWav(RE4_CANCEL_WAV, 're4_cancel', s.volResetHard); return; }
                { const md = MD(s.volResetHard);
                const no = nz(0.4); const lp = flt('lowpass', 500); const g = gn();
                g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.8, n+0.005); g.gain.exponentialRampToValueAtTime(0.001, n+0.4);
                const ob = osc('sine', 120); const og = gn();
                ob.frequency.exponentialRampToValueAtTime(28, n+0.35);
                og.gain.setValueAtTime(0, n); og.gain.linearRampToValueAtTime(1.0, n+0.005); og.gain.exponentialRampToValueAtTime(0.001, n+0.35);
                no.connect(lp); lp.connect(g); g.connect(md); ob.connect(og); og.connect(md);
                no.start(n); ob.start(n); ob.stop(n+0.35); }

            } else if (type === 'confirm') {
                if (s.confirmStyle === 're4-select') { this.playWav(RE4_SELECT_WAV, 're4_select', s.volConfirm); return; }
                if (s.confirmStyle === 're4-switch') { this.playWav(RE4_SWITCH_WAV, 're4_switch', s.volConfirm); return; }
                if (s.confirmStyle === 'custom-save-confirm-2') { this.playWav(SAVE_CONFIRM_2_WAV, 'save_confirm_2', s.volConfirm); return; }
                { const md = MD(s.volConfirm);
                [400, 520, 720].forEach((freq, i) => {
                    const o = osc('sine', freq); const g = gn();
                    g.gain.setValueAtTime(0, n+i*0.08); g.gain.linearRampToValueAtTime(0.18, n+i*0.08+0.01); g.gain.exponentialRampToValueAtTime(0.001, n+i*0.08+0.1);
                    o.connect(g); g.connect(md); o.start(n+i*0.08); o.stop(n+i*0.08+0.1);
                }); }

            } else if (type === 'cancel') {
                if (s.cancelStyle === 're4-cancel')     { this.playWav(RE4_CANCEL_WAV, 're4_cancel', s.volCancel); return; }
                if (s.cancelStyle === 're4-cancel-big') { this.playWav(RE4_CANCEL_BIG_WAV, 're4_cancel_big', s.volCancel); return; }
                if (s.cancelStyle === 'custom-close')   { this.playWav(CLOSE_WAV, 'close', s.volCancel); return; }
                { const md = MD(s.volCancel);
                [{f:500,d:0},{f:340,d:0.1}].forEach(({f,d}) => {
                    const o = osc('sine', f); const g = gn();
                    g.gain.setValueAtTime(0, n+d); g.gain.linearRampToValueAtTime(0.18, n+d+0.01); g.gain.exponentialRampToValueAtTime(0.001, n+d+0.12);
                    o.connect(g); g.connect(md); o.start(n+d); o.stop(n+d+0.12);
                }); }
            } else if (type === 'close') {
                // Deselect / undo. This type had no handler at all, so every
                // playSound('close') call site was silent.
                this.playWav(CLOSE_WAV, 'close', s.volCancel ?? 1);

            } else if (type === 'overtime') {
                if (s.overtimeStyle === 'off') return;
                if (s.overtimeStyle === 'custom') { this.playWav(OVERTIME_WAV, 'overtime', s.volOvertime); return; }
                if (s.overtimeStyle === 'custom-62274159') { this.playWav('Sounds/62274159.wav', 'sound_62274159', s.volOvertime); return; }
                // Synth fallback: rising tension sting
                { const md = MD(s.volOvertime);
                const o = osc('sawtooth', 180); const g = gn();
                o.frequency.exponentialRampToValueAtTime(340, n+0.3);
                g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.25, n+0.02); g.gain.exponentialRampToValueAtTime(0.001, n+0.4);
                o.connect(g); g.connect(md); o.start(n); o.stop(n+0.4); }
            }
        } catch(e) {}
    }

    playHover(ctx, n, D) {
        const osc = (type, freq) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; return o; };
        const gn  = () => { const g = ctx.createGain(); g.gain.value = 0; return g; };
        const flt = (type, freq, q) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; return f; };
        const nz  = (dur) => {
            const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
            const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            const s = ctx.createBufferSource(); s.buffer = b; return s;
        };

        const style = this.settings.hoverStyle;
        const vol = this.settings.volHover;

        if (style === 're4')       { this.playWav(RE4_HOVER_WAV, 're4_hover', vol); return; }
        if (style === 're4-loud')  { this.playWav(RE4_HOVER_LOUD_WAV, 're4_hover_loud', vol); return; }
        if (style === 'custom-click-hover')   { this.playWav(CLICK_AND_HOVER_WAV, 'click_and_hover', vol); return; }
        if (style === 'custom-click-hover-2') { this.playWav(CLICK_AND_HOVER_2_WAV, 'click_and_hover_2', vol); return; }
        if (style === 'custom-click-hover-3') { this.playWav(CLICK_AND_HOVER_3_WAV, 'click_and_hover_3', vol); return; }

        const md = ctx.createGain();
        md.gain.value = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : 1;
        md.connect(D);

        if (style === 'click-air') {
            const no = nz(0.012); const hp = flt('highpass', 2500, 0.7); const g = gn();
            g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.09, n+0.002); g.gain.exponentialRampToValueAtTime(0.001, n+0.015);
            no.connect(hp); hp.connect(g); g.connect(md); no.start(n);
            const no2 = nz(0.04); const lp = flt('lowpass', 900, 0.5); const g2 = gn();
            g2.gain.setValueAtTime(0, n+0.008); g2.gain.linearRampToValueAtTime(0.05, n+0.015); g2.gain.exponentialRampToValueAtTime(0.001, n+0.05);
            no2.connect(lp); lp.connect(g2); g2.connect(md); no2.start(n+0.008);
        } else if (style === 'soft-tick') {
            const o = osc('sine', 900); const g = gn();
            o.frequency.exponentialRampToValueAtTime(400, n+0.04);
            g.gain.setValueAtTime(0.07, n); g.gain.exponentialRampToValueAtTime(0.001, n+0.04);
            o.connect(g); g.connect(md); o.start(n); o.stop(n+0.04);
        } else if (style === 'tick-air') {
            const o = osc('sine', 900); const g = gn();
            o.frequency.exponentialRampToValueAtTime(400, n+0.04);
            g.gain.setValueAtTime(0.07, n); g.gain.exponentialRampToValueAtTime(0.001, n+0.04);
            o.connect(g); g.connect(md); o.start(n); o.stop(n+0.04);
            const no = nz(0.05); const lp = flt('lowpass', 1000, 0.5); const ng = gn();
            ng.gain.setValueAtTime(0, n+0.01); ng.gain.linearRampToValueAtTime(0.055, n+0.02); ng.gain.exponentialRampToValueAtTime(0.001, n+0.06);
            no.connect(lp); lp.connect(ng); ng.connect(md); no.start(n+0.01);
        } else if (style === 'air-tick') {
            const no = nz(0.04); const lp = flt('lowpass', 1200, 0.5); const g = gn();
            g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.065, n+0.008); g.gain.exponentialRampToValueAtTime(0.001, n+0.04);
            no.connect(lp); lp.connect(g); g.connect(md); no.start(n);
            const o = osc('sine', 700); const og = gn();
            o.frequency.exponentialRampToValueAtTime(350, n+0.035);
            og.gain.setValueAtTime(0, n+0.015); og.gain.linearRampToValueAtTime(0.06, n+0.02); og.gain.exponentialRampToValueAtTime(0.001, n+0.05);
            o.connect(og); og.connect(md); o.start(n+0.015); o.stop(n+0.05);
        } else if (style === 'air-click') {
            const no = nz(0.035); const lp = flt('lowpass', 1100, 0.5); const g = gn();
            g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.06, n+0.007); g.gain.exponentialRampToValueAtTime(0.001, n+0.035);
            no.connect(lp); lp.connect(g); g.connect(md); no.start(n);
            const no2 = nz(0.012); const hp = flt('highpass', 2800, 0.7); const ng = gn();
            ng.gain.setValueAtTime(0, n+0.025); ng.gain.linearRampToValueAtTime(0.09, n+0.027); ng.gain.exponentialRampToValueAtTime(0.001, n+0.04);
            no2.connect(hp); hp.connect(ng); ng.connect(md); no2.start(n+0.025);
        } else if (style === 'air-puff') {
            const no = nz(0.03); const lp = flt('lowpass', 1200, 0.5); const g = gn();
            g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.07, n+0.005); g.gain.exponentialRampToValueAtTime(0.001, n+0.03);
            no.connect(lp); lp.connect(g); g.connect(md); no.start(n);
        } else if (style === 'plastic-click') {
            const no = nz(0.015); const hp = flt('highpass', 2500, 0.7); const g = gn();
            g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.1, n+0.002); g.gain.exponentialRampToValueAtTime(0.001, n+0.015);
            no.connect(hp); hp.connect(g); g.connect(md); no.start(n);
        }
    }

    // ── BingoView ─────────────────────────────────────────────────────────────

    initBingoView() {
        const btn      = document.getElementById('bingoview-btn');
        const modal    = document.getElementById('bingoview-modal');
        const closeBtn = document.getElementById('bingoview-close-btn');

        btn.addEventListener('click', () => this.openBingoViewModal());
        closeBtn.addEventListener('click', () => this.closeBingoViewModal());

        modal.addEventListener('click', e => {
            if (e.target === modal) this.closeBingoViewModal();
        });

        // "Nytt spill" — fresh random code + fresh channel. Two-tap confirm
        // because it disconnects every phone joined on the current code.
        const newGameBtn = document.getElementById('bv-new-game');
        if (newGameBtn) {
            const idleLabel = newGameBtn.textContent;
            newGameBtn.addEventListener('click', () => {
                if (newGameBtn.dataset.confirming === '1') {
                    newGameBtn.dataset.confirming = '';
                    newGameBtn.textContent = idleLabel;
                    this.playSound('confirm');
                    this.bvStartNewGame();
                } else {
                    this.playSound('select');
                    newGameBtn.dataset.confirming = '1';
                    newGameBtn.textContent = 'Sikker?';
                    setTimeout(() => {
                        if (newGameBtn.dataset.confirming === '1') {
                            newGameBtn.dataset.confirming = '';
                            newGameBtn.textContent = idleLabel;
                        }
                    }, 3000);
                }
            });
        }

        // Custom code input — load saved code and wire up apply button
        const customInput = document.getElementById('bv-custom-code');
        const applyBtn = document.getElementById('bv-apply-code');
        if (customInput && applyBtn) {
            try { customInput.value = localStorage.getItem('bv_customCode') || ''; } catch(e) {}
            applyBtn.addEventListener('click', () => {
                const val = customInput.value.trim();
                if (!val) {
                    // Clear custom code → next refresh uses random
                    this.bvClearCustomCode();
                    // Force reconnect with random code (bvConnect detaches the old channel)
                    this._bvCode = null;
                    this.bvConnect();
                    const el = document.getElementById('bv-code-display');
                    if (el) el.textContent = this._bvCode;
                    const qrEl = document.getElementById('bv-qr-code');
                    if (qrEl) { qrEl.innerHTML = ''; qrEl._qrDone = false; }
                    this.openBingoViewModal();
                } else if (val.length < 4) {
                    alert('Koden må ha minst 4 tegn');
                } else {
                    this.bvSetCustomCode(val);
                }
            });
        }

        // Load Firebase SDK dynamically
        if (!window.firebase) {
            const cfg = {
                apiKey: "AIzaSyAmfLA07M4KSTnZJ8fF8VZ4Y96FLygv-Ps",
                authDomain: "bingoview-2b95c.firebaseapp.com",
                databaseURL: "https://bingoview-2b95c-default-rtdb.europe-west1.firebasedatabase.app",
                projectId: "bingoview-2b95c",
                storageBucket: "bingoview-2b95c.firebasestorage.app",
                messagingSenderId: "1010336105188",
                appId: "1:1010336105188:web:a28e58f68272150306e2f1"
            };
            const s1 = document.createElement('script');
            s1.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
            s1.onload = () => {
                const s2 = document.createElement('script');
                s2.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js';
                s2.onload = () => {
                    firebase.initializeApp(cfg);
                    console.log('[BV] Firebase initialized');
                    // Auto-connect so phones can join even if the modal
                    // hasn't been opened yet. The code is the same whether
                    // we generate it now or on first modal open.
                    if (!this._bvChannelRef) this.bvConnect();
                };
                document.head.appendChild(s2);
            };
            document.head.appendChild(s1);
        } else if (window.firebase && window.firebase.database) {
            // Firebase already loaded (e.g. hot reload) — connect immediately
            if (!this._bvChannelRef) this.bvConnect();
        }
    }

    _loadQRCodeLib() {
        if (window.QRCode) return Promise.resolve();
        if (this._qrLoadPromise) return this._qrLoadPromise;
        this._qrLoadPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
            s.onload  = () => resolve();
            s.onerror = () => { this._qrLoadPromise = null; reject(new Error('QR lib failed to load')); };
            document.head.appendChild(s);
        });
        return this._qrLoadPromise;
    }

    openBingoViewModal() {
        const modal = document.getElementById('bingoview-modal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Render the phones section now that the modal is visible. We skip
        // rendering on Firebase snapshots while the modal is hidden, so this
        // catches up on whatever the latest state is.
        try { this._bvUpdatePaperHighlights(); } catch(e) {}

        const code = this.bvGenerateCode();
        const el = document.getElementById('bv-code-display');
        if (el) el.textContent = code;

        // Generate QR code pointing to BingoView with the code pre-filled.
        // qrcode.min.js is lazy-loaded the first time the BingoView modal
        // opens — it's only used here, so loading it on every page hit was
        // pure render-blocking weight on the critical path.
        const qrEl = document.getElementById('bv-qr-code');
        if (qrEl && !qrEl._qrDone) {
            qrEl._qrDone = true;
            const bvUrl = 'https://wilwal2020.github.io/BingoView/?code=' + code;
            this._loadQRCodeLib().then(() => {
                new QRCode(qrEl, {
                    text:         bvUrl,
                    width:        160,
                    height:       160,
                    colorDark:    '#000000',
                    colorLight:   '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }).catch(() => { qrEl._qrDone = false; });
        }

        if (!this._bvChannelRef) this.bvConnect();
    }

    bvGenerateCode() {
        if (this._bvCode) return this._bvCode;
        // Check for persisted custom code first
        let custom = '';
        try { custom = (localStorage.getItem('bv_customCode') || '').trim().toUpperCase(); } catch(e) {}
        if (custom && custom.length >= 4) {
            this._bvCode = custom;
            this._bvCodeIsFresh = false;
            return this._bvCode;
        }
        // Reuse the last auto-generated code across refreshes. Without this a
        // page reload spawns a new code and hosts a different channel, which
        // orphans (disconnects) every phone that joined the old code — bad if
        // the host accidentally refreshes mid-game.
        let auto = '';
        try { auto = (localStorage.getItem('bv_autoCode') || '').trim().toUpperCase(); } catch(e) {}
        if (auto && auto.length >= 4) {
            this._bvCode = auto;
            this._bvCodeIsFresh = false;
            return this._bvCode;
        }
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        this._bvCode = Array.from({length: 6}, () =>
            chars[Math.floor(Math.random() * chars.length)]).join('');
        try { localStorage.setItem('bv_autoCode', this._bvCode); } catch(e) {}
        this._bvCodeIsFresh = true;
        return this._bvCode;
    }

    bvSetCustomCode(code) {
        const clean = (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (clean.length < 4) return false;
        try { localStorage.setItem('bv_customCode', clean); } catch(e) {}
        // Force reconnect with new code (bvConnect detaches the old channel)
        this._bvCode = null;
        this.bvConnect();
        // Update display
        const el = document.getElementById('bv-code-display');
        if (el) el.textContent = this._bvCode;
        // Regenerate QR
        const qrEl = document.getElementById('bv-qr-code');
        if (qrEl) {
            qrEl.innerHTML = '';
            qrEl._qrDone = false;
        }
        this.openBingoViewModal();
        return true;
    }

    bvClearCustomCode() {
        try { localStorage.removeItem('bv_customCode'); } catch(e) {}
    }

    // Start a brand-new BingoView session: drop both persisted codes so
    // bvGenerateCode() mints a fresh random one, and reconnect. The fresh
    // code marks the session as new, so bvConnect wipes the old papers.
    bvStartNewGame() {
        this.bvClearCustomCode();
        try { localStorage.removeItem('bv_autoCode'); } catch(e) {}
        const customInput = document.getElementById('bv-custom-code');
        if (customInput) customInput.value = '';
        this._bvCode = null;
        this.bvConnect();
        const el = document.getElementById('bv-code-display');
        if (el) el.textContent = this._bvCode;
        const qrEl = document.getElementById('bv-qr-code');
        if (qrEl) { qrEl.innerHTML = ''; qrEl._qrDone = false; }
        this.openBingoViewModal();  // re-renders the QR with the new code
    }

    closeBingoViewModal() {
        document.getElementById('bingoview-modal').style.display = 'none';
        this.restoreBodyScroll();
    }

    // Detach every listener belonging to the current BingoView channel.
    // Firebase's ref.off() only removes callbacks registered at that exact
    // path \u2014 the phones/papers/papers_meta listeners live on CHILD paths,
    // so without the stored detach fns a code change left the old channel's
    // listeners running (phantom phones, doubled state).
    _bvDetachChannel() {
        (this._bvChannelDetachFns || []).forEach(fn => { try { fn(); } catch(e) {} });
        this._bvChannelDetachFns = [];
        if (this._bvInfoConnectedOff) {
            try { this._bvInfoConnectedOff(); } catch(e) {}
            this._bvInfoConnectedOff = null;
        }
        if (this._bvHostWatchOff) {
            try { this._bvHostWatchOff(); } catch(e) {}
            this._bvHostWatchOff = null;
        }
        if (this._bvChannelRef) {
            try { this._bvChannelRef.off(); } catch(e) {}
            this._bvChannelRef = null;
        }
    }

    bvConnect() {
        const code = this.bvGenerateCode();
        this._bvDetachChannel();

        const tryConnect = () => {
            this._bvChannelRef = firebase.database().ref('bingoview/' + code);
            console.log('[BV] hosting channel bingoview/' + code);

            // Host presence marker — re-register on every Firebase reconnect so phones
            // can always find the host even after a brief network interruption.
            //
            // Papers are only wiped for a genuinely NEW session code (the first
            // time this device generates one). A reused code — custom OR the
            // persisted auto code — keeps papers, so an accidental host refresh
            // doesn't drop connected phones' blocks. Stale entries are handled
            // by the per-phone "Slett" button and offline-duplicate cleanup.
            const freshSession = !!this._bvCodeIsFresh;
            const hostRef       = this._bvChannelRef.child('host');
            const papersRef     = this._bvChannelRef.child('papers');
            const papersMetaRef = this._bvChannelRef.child('papers_meta');
            if (freshSession) {
                papersRef.remove();
                papersMetaRef.remove();
            }
            const infoRef = firebase.database().ref('.info/connected');
            let bvOnline = false;
            const infoHandler = (snap) => {
                bvOnline = !!snap.val();
                if (!bvOnline) return;
                hostRef.onDisconnect().remove();
                // Deliberately do NOT remove papers on host disconnect — a
                // refresh must not wipe connected phones' blocks.
                hostRef.set({ ts: Date.now() });
                // Re-publish the current jackpot so phones that join (or rejoin
                // after a host reconnect) immediately see it.
                this.bvSendJackpot();
            };
            infoRef.on('value', infoHandler);
            this._bvInfoConnectedOff = () => infoRef.off('value', infoHandler);

            // Self-heal the presence marker. Writing it once per reconnect is
            // not enough: the onDisconnect().remove() registered on a socket
            // that has just died is executed by the SERVER when it notices the
            // drop, which can be AFTER this client has reconnected and rewritten
            // host/. The stale removal then wins and host/ stays gone — and
            // because .info/connected is already true it never fires again, so
            // nothing rewrites it. Phones then get "Ingen aktiv bingo-sesjon"
            // for a session that is very much still running (exactly what a
            // brief iPad wifi drop used to cause).
            //
            // Watching the node closes that hole: if it disappears while we
            // believe we are online, put it straight back.
            const hostWatch = (snap) => {
                if (!bvOnline || snap.exists()) return;
                hostRef.onDisconnect().remove();
                hostRef.set({ ts: Date.now() });
                console.log('[BV] host presence was cleared — re-registered');
            };
            hostRef.on('value', hostWatch);
            this._bvHostWatchOff = () => hostRef.off('value', hostWatch);

            const codeEl = document.getElementById('bv-code-display');
            if (codeEl) codeEl.textContent = code;

            // Watch live presence (gets removed on disconnect)
            this._bvLivePhones = {};
            this._bvPersistedPapers = {};
            this._bvPapersMeta = {};

            const recompute = () => {
                // Merge connected phones with persisted offline papers.
                // Connected phones use live data (ts > 0); offline phones come
                // from papers/ + papers_meta/ paths and have ts = 0.
                const ids = new Set([
                    ...Object.keys(this._bvLivePhones),
                    ...Object.keys(this._bvPersistedPapers),
                ]);

                // Build a set of base phone IDs that are truly online
                // (have a ts field, meaning they registered proper presence).
                const onlineBaseIds = new Set();
                Object.entries(this._bvLivePhones).forEach(([id, data]) => {
                    // Only count phones with a real ts as online
                    if (data && data.ts) {
                        // Extract base ID (strip _bN suffix if present)
                        const baseId = id.replace(/_b\d+$/, '');
                        onlineBaseIds.add(baseId);
                    }
                });

                let phoneList = [...ids].map(id => {
                    const live = this._bvLivePhones[id];
                    const livePapers = (live && live.papers) || {};
                    const persistedPapers = this._bvPersistedPapers[id] || {};
                    // Live papers take priority — they're the most recent. Fall back
                    // to persisted for game keys the live phone hasn't published yet.
                    const papers = { ...persistedPapers, ...livePapers };
                    const meta = this._bvPapersMeta[id] || {};
                    const userName = ((live && live.userName) || meta.userName || '').toString().trim();
                    // sharedAway = the phone published this block via "Del ark"
                    // and is now considered to have given it up. The receiver's
                    // identical block wins on the merged display.
                    const sharedAway = !!((live && live.sharedAway) || meta.sharedAway);

                    // A phone is online only if it (or its base phone) has real
                    // presence. Virtual block phones (ABC_b1, ABC_b2) follow
                    // their base phone's status — if the base phone disconnected,
                    // all its blocks are offline too.
                    const baseId = id.replace(/_b\d+$/, '');
                    const isOnline = !!live && onlineBaseIds.has(baseId);

                    return {
                        id,
                        online: isOnline,
                        ts: (live && live.ts) || 0,
                        lastSeen: meta.lastSeen || 0,
                        papers,
                        userName,
                        sharedAway,
                    };
                }).sort((a, b) => {
                    // Online first (sorted by connection ts), then offline (by lastSeen desc)
                    if (a.online !== b.online) return a.online ? -1 : 1;
                    return a.online ? a.ts - b.ts : b.lastSeen - a.lastSeen;
                });

                // Dedupe: drop any OFFLINE entry whose papers exactly match an
                // ONLINE entry's papers (same strips per game). This happens
                // when a phone reconnects after browser storage was cleared
                // and got a new phoneId — the old persisted entry would
                // otherwise linger as a phantom offline duplicate.
                phoneList = this._bvDedupeOfflineDuplicates(phoneList);

                // Merge: when multiple blocks have identical papers (same
                // strip-IDs for every game), they're the same paper shared
                // between people. Collapse to a single entry whose name
                // combines all owners (e.g. "wilwal + ola").
                phoneList = this._bvMergeIdenticalBlocks(phoneList);

                this._bvPhones = phoneList;
                // Count unique online DEVICES (not blocks) — strip _bN suffix
                const onlineDevices = new Set();
                phoneList.forEach(p => {
                    if (p.online) onlineDevices.add(p.id.replace(/_b\d+$/, ''));
                });
                const onlineCount = onlineDevices.size;
                this._bvOnlineCount = onlineCount;
                this._bvUpdatePresenceUI(onlineCount);
                if (onlineCount > 0) this.bvSendState();
                this._bvUpdatePaperHighlights();
            };

            // Attach child-path listeners via named refs/handlers and stash
            // detach fns — see _bvDetachChannel for why parent off() isn't enough.
            const phonesChildRef = this._bvChannelRef.child('phones');
            const phonesHandler = (snap) => {
                const phones = snap.val() || {};
                this._bvLivePhones = {};
                Object.entries(phones).forEach(([id, data]) => {
                    this._bvLivePhones[id] = {
                        ts: (data && data.ts) || 0,
                        papers: (data && data.papers) || {},
                        userName: (data && data.userName) || '',
                        sharedAway: !!(data && data.sharedAway),
                    };
                });
                recompute();
            };
            phonesChildRef.on('value', phonesHandler);
            this._bvChannelDetachFns.push(() => phonesChildRef.off('value', phonesHandler));

            const papersHandler = (snap) => {
                this._bvPersistedPapers = snap.val() || {};
                recompute();
            };
            papersRef.on('value', papersHandler);
            this._bvChannelDetachFns.push(() => papersRef.off('value', papersHandler));

            const papersMetaHandler = (snap) => {
                this._bvPapersMeta = snap.val() || {};
                recompute();
            };
            papersMetaRef.on('value', papersMetaHandler);
            this._bvChannelDetachFns.push(() => papersMetaRef.off('value', papersMetaHandler));

        };

        if (window.firebase && window.firebase.database) {
            tryConnect();
        } else {
            const wait = setInterval(() => {
                if (window.firebase && window.firebase.database) { clearInterval(wait); tryConnect(); }
            }, 100);
            setTimeout(() => clearInterval(wait), 8000);
        }
    }

    _bvUpdatePresenceUI(count) {
        const btn = document.getElementById('bingoview-btn');
        if (btn) {
            btn.style.opacity = count > 0 ? '1' : '0.6';
            btn.title = count > 0
                ? `BingoView — ${count} tilkoblet`
                : 'BingoView — venter på telefon';
        }
        const badge = document.getElementById('bv-nav-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = String(count);
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Remove a persisted phone's papers + meta. Used for the "Slett" button
    // on offline phones in the BV modal — useful when a phone won't reconnect.
    bvDeletePersistedPhone(phoneId) {
        if (!this._bvChannelRef || !phoneId) return;
        this._bvChannelRef.child('papers/' + phoneId).remove();
        this._bvChannelRef.child('papers_meta/' + phoneId).remove();
    }

    // Drop any offline phoneList entry whose papers are an exact subset of
    // some online entry's papers (same strips for every game the offline has).
    // Also issues Firebase deletes for the stale entries so they don't pile
    // up in storage. Called from recompute() on every snapshot change.
    // Merge blocks that share an identical paper (same set of games, same
    // strip-IDs per game). Happens when one person shares their block to
    // another via the BingoView share URL — both phones publish the same
    // strips and previously showed up as two rings on every watched ball.
    //
    // Strategy: group by paper fingerprint, keep the entry with the
    // earliest ts (first to publish), and combine usernames from all
    // members. Strips "(Blokk N)" suffixes so the joined label stays
    // readable, e.g. "wilwal + ola".
    _bvMergeIdenticalBlocks(phoneList) {
        const stripBlokk = s => (s || '').replace(/\s*\(Blokk\s*\d+\)\s*$/i, '').trim();

        const fingerprint = phone => {
            const papers = phone.papers || {};
            const gameKeys = Object.keys(papers)
                .filter(g => Array.isArray(papers[g]) && papers[g].length)
                .sort();
            if (!gameKeys.length) return null;
            const parts = gameKeys.map(g => {
                const ids = papers[g].map(s => s && s.id).filter(Boolean).sort();
                return g + ':' + ids.join(',');
            });
            return parts.join('|');
        };

        // Bucket by fingerprint
        const buckets = new Map();
        const unbucketed = [];
        phoneList.forEach(p => {
            const fp = fingerprint(p);
            if (!fp) { unbucketed.push(p); return; }
            if (!buckets.has(fp)) buckets.set(fp, []);
            buckets.get(fp).push(p);
        });

        const merged = [];
        buckets.forEach(group => {
            if (group.length === 1) { merged.push(group[0]); return; }
            // Pick canonical: prefer online, then earliest ts
            group.sort((a, b) => {
                if (a.online !== b.online) return a.online ? -1 : 1;
                if (a.online) return (a.ts || 0) - (b.ts || 0);
                return (b.lastSeen || 0) - (a.lastSeen || 0);
            });
            const head = group[0];
            // Build combined display name from unique base names (no Blokk N).
            // Skip phones that marked their block as sharedAway — the receiver
            // is the new owner and only their name should show.
            const nameCandidates = group.filter(p => !p.sharedAway).length
                ? group.filter(p => !p.sharedAway)
                : group;  // fall back if ALL are sharedAway
            const seen = new Set();
            const names = [];
            nameCandidates.forEach(p => {
                const base = stripBlokk(p.userName);
                if (!base) return;
                const key = base.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                names.push(base);
            });
            if (names.length > 1) head.userName = names.join(' + ');
            else if (names.length === 1) head.userName = names[0];
            head._mergedIds = group.slice(1).map(p => p.id);
            merged.push(head);
        });

        return [...merged, ...unbucketed].sort((a, b) => {
            if (a.online !== b.online) return a.online ? -1 : 1;
            return a.online ? (a.ts || 0) - (b.ts || 0)
                            : (b.lastSeen || 0) - (a.lastSeen || 0);
        });
    }

    _bvDedupeOfflineDuplicates(phoneList) {
        const online = phoneList.filter(p => p.online);
        if (!online.length) return phoneList;

        const stripsKey = strips => {
            if (!Array.isArray(strips)) return null;
            // Comparing on the strip IDs alone is enough — IDs are randomly
            // assigned at generation/upload time and travel with the paper,
            // so two BV instances with the same source data produce the same
            // ID set. Sorting makes order irrelevant.
            return strips.map(s => s && s.id).sort().join('|');
        };

        const result = [];
        phoneList.forEach(p => {
            if (p.online) { result.push(p); return; }
            const offlineGames = Object.keys(p.papers || {});
            if (!offlineGames.length) { result.push(p); return; }

            const isDup = online.some(o => {
                return offlineGames.every(g => {
                    const okey = stripsKey(o.papers && o.papers[g]);
                    const pkey = stripsKey(p.papers && p.papers[g]);
                    return okey != null && okey === pkey;
                });
            });

            if (isDup) {
                // Side effect: clean it out of Firebase too so it doesn't
                // come back on the next snapshot.
                this.bvDeletePersistedPhone(p.id);
            } else {
                result.push(p);
            }
        });
        return result;
    }

    bvSend(number) {
        if (this._bvChannelRef) {
            const entry = { number, ts: Date.now(), game: this.currentTheme, rekke: this.slot.currentRekke };
            this._bvChannelRef.child('call').set(entry);      // legacy single-value
            this._bvChannelRef.child('callLog').push(entry);  // legacy replay log
            this._bvSendCallState();                          // full state broadcast
        }
        // Mark this as the last call ts so the offline-phone rows get a
        // pulse on this render (and only this render) to make it visible
        // that even disconnected papers were processed.
        this._bvLastCallTs = Date.now();
        this._bvUpdatePaperHighlights();
        this._bvShowBallPing(number);
    }

    // Briefly flash a "papers updated" badge on the clicked ball so the
    // host can see, at a glance, that disconnected phones' papers were
    // also processed for this call.
    _bvShowBallPing(number) {
        const phones = this._bvPhones || [];
        const game = this.currentTheme;
        // Only ping if at least one paper for this game is OFFLINE — the
        // online phones already get visible feedback on their own screens,
        // so a badge on the ball would just be noise.
        // Count unique offline DEVICES with papers (not individual block entries)
        const offlineDevices = new Set();
        phones.forEach(p => {
            if (!p.online && Array.isArray((p.papers || {})[game])) {
                offlineDevices.add(p.id.replace(/_b\d+$/, ''));
            }
        });
        if (offlineDevices.size === 0) return;
        const offlinePapers = offlineDevices.size;
        const ball = this._bvBallMap()[number];
        if (!ball) return;
        // Remove any prior badge so the animation can restart
        const old = ball.querySelector('.bv-ball-ping');
        if (old) old.remove();
        const badge = document.createElement('div');
        badge.className = 'bv-ball-ping bv-ball-ping-offline';
        badge.textContent = '📱' + offlinePapers;
        ball.appendChild(badge);
        setTimeout(() => { if (badge.parentNode) badge.remove(); }, 1400);
    }

    bvSendUncall(number) {
        if (this._bvChannelRef) {
            this._bvSendCallState();  // broadcast updated full list — no undo event needed
        }
        this._bvUpdatePaperHighlights();
    }

    // Broadcast the full current called-number list for the active game.
    // BingoView reconciles from this on every call/undo, so it is always in sync.
    _bvSendCallState() {
        if (!this._bvChannelRef) return;
        this._bvChannelRef.child('callState/' + this.currentTheme).set({
            numbers: this.slot.selectedNumbers.slice(),
            rekke:   this.slot.currentRekke,
            ts:      Date.now(),
            // Server-stamped copy of the same moment. ts stays on this device's
            // clock because it is compared against resetTs, which is written the
            // same way; sts gives the phones a clock they can actually share, so
            // their countdown rings line up with each other and with us.
            sts:     firebase.database.ServerValue.TIMESTAMP
        });
    }

    bvSendState() {
        if (!this._bvChannelRef) return;
        this._bvChannelRef.child('state').set({
            game:  this.currentTheme,
            rekke: this.slot.currentRekke,
            // How long the phones' countdown ring should run. Whether to show
            // it at all is each phone's own choice.
            callTimer: this.settings.bvCallTimerSeconds ?? 30,
            ts:    Date.now()
        });
        this._bvUpdatePaperHighlights();
    }

    // Broadcast the current jackpot number (game 4 / grey only). Phones use
    // this to mark the jackpot cell on their game-4 paper.
    bvSendJackpot() {
        if (!this._bvChannelRef) return;
        const jp = this.slots.grey ? this.slots.grey.jackpotNumber : null;
        this._bvChannelRef.child('jackpot').set({
            number: jp != null ? Number(jp) : null,
            ts:     Date.now()
        });
    }

    bvSendReset(scope) {
        if (!this._bvChannelRef) return;
        const ts = Date.now();
        this._bvChannelRef.child('reset').set({ scope, game: this.currentTheme, ts });
        this._bvChannelRef.child('resetTs').set(ts);
        // Prune the legacy replay log — with a persistent custom code it
        // would otherwise grow forever in Firebase. Old BV builds that still
        // read it ignore entries with ts <= resetTs anyway, and current
        // builds reconcile from callState.
        this._bvChannelRef.child('callLog').remove();
        // Clear callState for affected games
        const games = scope === 'all' ? ['blue','yellow','pink','grey'] : [this.currentTheme];
        games.forEach(g => this._bvChannelRef.child('callState/' + g).remove());
        // Jackpot lives on grey — push its (possibly cleared) value when grey is affected
        if (games.includes('grey')) this.bvSendJackpot();
        this._bvUpdatePaperHighlights();
    }

    // ── Phone-paper aware highlights ────────────────────────────
    // Distinct per-phone colors used for ring highlights and the modal list.
    static get BV_PHONE_COLORS() {
        return ['#00d4ff', '#ff66e0', '#d4ff00', '#ff8c00', '#7cffb0', '#aa66ff', '#ffe066', '#ff6b6b'];
    }

    // Build a number→ball element map on first use.
    _bvBallMap() {
        if (this._bvBallMapCache) return this._bvBallMapCache;
        const map = {};
        document.querySelectorAll('.ball-grid .balls').forEach(el => {
            const txt = (el.textContent || '').trim();
            const n = parseInt(txt, 10);
            if (!isNaN(n) && n >= 1 && n <= 90) map[n] = el;
        });
        this._bvBallMapCache = map;
        return map;
    }

    // For one strip and the iPad's current rekke, return zero or more "close
    // info" entries: each is a candidate win path with its missing numbers and
    // intensity level. Rekke 1 lets every row complete independently — so
    // multiple rows of the same strip can each contribute. Rekke 2/3 use the
    // strip's combined best-N rows as a single path.
    _bvStripCloseInfos(strip, calledSet, rekke, threshold) {
        if (!strip || !Array.isArray(strip.rows)) return [];
        const thresh = Math.max(1, threshold || 2);
        const rowsMissing = strip.rows.map(nums =>
            (nums || []).filter(n => Number.isFinite(n) && !calledSet.has(n))
        );

        if (rekke === 'Rekke1') {
            // Each row independently
            const out = [];
            rowsMissing.forEach((missing, idx) => {
                const count = missing.length;
                if (count > 0 && count <= thresh) {
                    const level = count === 1 ? 'strong' : 'regular';
                    out.push({ total: count, numbers: missing.slice(), level, rowIdx: idx });
                }
            });
            return out;
        }

        // Rekke 2/3: enumerate ALL N-row combinations within threshold and
        // aggregate the unique winning numbers. Picking just the single best
        // combo (as the previous version did) hid valid alternative win-paths
        // — e.g. with row 0 complete and rows 1 + 2 each missing 1 number,
        // both 1-row-misses are independent rekke-2 wins, but the old code
        // would only flag whichever pair sorted first.
        const N = rekke === 'Rekke2' ? 2 : 3;
        const idxs = rowsMissing.map((missing, idx) => ({ idx, missing }));
        const winning = new Set();
        let bestTotal = Infinity;
        const visit = (start, picked, total) => {
            if (total > thresh) return; // prune
            if (picked.length === N) {
                if (total === 0) return;
                picked.forEach(p => p.missing.forEach(n => winning.add(n)));
                if (total < bestTotal) bestTotal = total;
                return;
            }
            for (let i = start; i < idxs.length; i++) {
                const next = total + idxs[i].missing.length;
                if (next > thresh) continue;
                visit(i + 1, [...picked, idxs[i]], next);
            }
        };
        visit(0, [], 0);
        if (winning.size === 0) return [];
        const level = bestTotal === 1 ? 'strong' : 'regular';
        return [{ total: bestTotal, numbers: [...winning], level }];
    }

    // Fewest numbers a block is still missing to complete the current rekke
    // for one game — used by the bottom block-bar. Unlike _bvStripCloseInfos
    // this is unbounded (no threshold): it always returns a distance, so a
    // block far from winning still shows a real count. 0 means it's a winner.
    _bvBlockMissingForGame(strips, calledSet, rekke) {
        if (!Array.isArray(strips)) return Infinity;
        const N = rekke === 'Rekke3' ? 3 : rekke === 'Rekke2' ? 2 : 1;
        let best = Infinity;
        strips.forEach(strip => {
            if (!strip || !Array.isArray(strip.rows)) return;
            const rowMiss = strip.rows.map(nums =>
                (nums || []).filter(n => Number.isFinite(n) && !calledSet.has(n)).length
            );
            if (rowMiss.length < N) return;
            const sorted = rowMiss.slice().sort((a, b) => a - b);
            let total = 0;
            for (let i = 0; i < N; i++) total += sorted[i];
            if (total < best) best = total;
        });
        return best;
    }

    // Like _bvBlockMissingForGame but returns the ACTUAL missing numbers of the
    // closest path (the strip + N rows with fewest misses), sorted ascending.
    // Used by the block-bar tooltip. Returns [] when the rekke is already
    // complete, or null when the block has no usable paper.
    _bvBlockMissingNumbers(strips, calledSet, rekke) {
        if (!Array.isArray(strips)) return null;
        const N = rekke === 'Rekke3' ? 3 : rekke === 'Rekke2' ? 2 : 1;
        let best = Infinity, bestNums = null;
        strips.forEach(strip => {
            if (!strip || !Array.isArray(strip.rows)) return;
            const rowMiss = strip.rows.map(nums =>
                (nums || []).filter(n => Number.isFinite(n) && !calledSet.has(n))
            );
            if (rowMiss.length < N) return;
            const order = rowMiss
                .map((arr, idx) => ({ idx, c: arr.length }))
                .sort((a, b) => a.c - b.c)
                .slice(0, N);
            const total = order.reduce((s, o) => s + o.c, 0);
            if (total < best) {
                best = total;
                const set = new Set();
                order.forEach(o => rowMiss[o.idx].forEach(n => set.add(n)));
                bestNums = [...set].sort((a, b) => a - b);
            }
        });
        return bestNums;
    }

    // Badge background/text colours by how close a block is to winning —
    // mirrors BingoView's "x igjen" block-tab gradient (warmer = closer).
    _bvProximityColors(min) {
        if (min === null || !Number.isFinite(min)) return { bg: '#1a1a1a', fg: '#777' };
        if (min === 0) return { bg: '#2d1a3a', fg: '#c4a8ff' };  // BINGO!
        if (min === 1) return { bg: '#3a1a1a', fg: '#ff4444' };  // 1 away
        if (min === 2) return { bg: '#3a2218', fg: '#ff6b2b' };
        if (min === 3) return { bg: '#2e2518', fg: '#f0a030' };
        if (min <= 5) return { bg: '#26261a', fg: '#c8b040' };
        return { bg: '#1a2220', fg: '#5a8a6a' };                 // far away
    }

    // Return a copy of the phones array in a stable, first-seen order. Each
    // block id is assigned an incrementing sequence the first time it appears
    // and keeps it for the session, so reconnects (new ts) don't move blocks.
    _bvStableOrderPhones(phones) {
        if (!this._bvOrderMap) { this._bvOrderMap = new Map(); this._bvOrderSeq = 0; }
        const map = this._bvOrderMap;
        phones.forEach(p => {
            if (p && p.id != null && !map.has(p.id)) map.set(p.id, this._bvOrderSeq++);
        });
        return phones.slice().sort((a, b) =>
            (map.get(a.id) ?? 0) - (map.get(b.id) ?? 0));
    }

    // Render the fixed bottom bar of connected blocks (name + "x igjen").
    // Optionally ordered by fewest-missing first when the sort toggle is on.
    _bvRenderBlockBar(items) {
        const bar  = document.getElementById('bv-block-bar');
        const list = document.getElementById('bv-block-bar-list');
        const sortBtn = document.getElementById('bv-block-bar-sort');
        if (!bar || !list) return;

        this._bvEnsureBlockTip(list);

        // Any block with a paper for the current game — online or offline.
        // Offline blocks are still shown so they don't vanish when a phone
        // briefly drops connection.
        let shown = (items || []).filter(it => it.hasPaper);

        if (!shown.length) {
            bar.style.display = 'none';
            if (this._bvTipEl) this._bvTipEl.style.display = 'none';
            this._bvTipPinned = null;
            return;
        }
        bar.style.display = 'flex';

        const sortOn = !!this.settings.bvBlockBarSort;
        if (sortBtn) {
            sortBtn.classList.toggle('active', sortOn);
            // Bind once — toggles the setting and re-renders from cached items.
            if (!sortBtn._bvBound) {
                sortBtn._bvBound = true;
                sortBtn.addEventListener('click', () => {
                    this.settings.bvBlockBarSort = !this.settings.bvBlockBarSort;
                    this.saveSettings();
                    this._bvRenderBlockBar(this._bvBlockBarItems || []);
                });
            }
        }

        if (sortOn) {
            // Stable tiebreak by first-seen id so equal-missing blocks keep a
            // fixed relative order instead of jittering on each snapshot.
            const ord = this._bvOrderMap || new Map();
            shown = shown.slice().sort((a, b) =>
                a.missing - b.missing || (ord.get(a.id) ?? 0) - (ord.get(b.id) ?? 0));
        }

        // FLIP: record each existing chip's position (by stable key) before the
        // rebuild so we can animate any that land somewhere new.
        const firstRects = new Map();
        [...list.children].forEach(c => {
            firstRects.set(c.getAttribute('data-key'), c.getBoundingClientRect());
        });

        // Which block currently has the fewest numbers left (the "leader")?
        // A change of leader gets a celebratory pop.
        let leaderId = null, leaderMin = Infinity;
        shown.forEach(it => {
            if (Number.isFinite(it.missing) && it.missing < leaderMin) {
                leaderMin = it.missing; leaderId = it.id;
            }
        });
        const leaderChanged = leaderId !== null && leaderId !== this._bvPrevLeaderId;
        this._bvPrevLeaderId = leaderId;

        list.innerHTML = '';
        shown.forEach((it, i) => {
            const chip = document.createElement('div');
            chip.className = 'bv-block-chip';
            // Identity + tooltip data (read by the delegated hover/tap handler).
            // Key by the block's stable id, not name+index — a reorder used to
            // change the key, so a pinned/hovered tooltip lost its chip and
            // stopped refreshing its missing-numbers list (count stayed right).
            chip.setAttribute('data-key', it.id || (it.name + '#' + i));
            chip.setAttribute('data-name', it.name);
            chip.setAttribute('data-rekke', it.rekkeNum || 1);
            chip.setAttribute('data-missnow', (it.missNow || []).join(','));
            if (it.rekkeNextNum) {
                chip.setAttribute('data-rekkenext', it.rekkeNextNum);
                chip.setAttribute('data-missnext', (it.missNext || []).join(','));
            }

            const dot = document.createElement('span');
            dot.className = 'bv-block-dot';
            dot.style.backgroundColor = it.color;

            const name = document.createElement('span');
            name.className = 'bv-block-name';
            name.textContent = it.name;

            const m = it.missing;
            const badge = document.createElement('span');
            badge.className = 'bv-block-badge';
            badge.textContent = !Number.isFinite(m) ? '—' : (m === 0 ? 'BINGO!' : m + ' igjen');
            const col = this._bvProximityColors(m);
            badge.style.backgroundColor = col.bg;
            badge.style.color = col.fg;

            chip.appendChild(dot);
            chip.appendChild(name);
            chip.appendChild(badge);
            if (leaderChanged && it.id === leaderId) chip.classList.add('bv-block-leader-pop');
            list.appendChild(chip);
        });

        // FLIP playback via the Web Animations API. For each chip that moved,
        // animate FROM its old position TO the new one. Declaring both
        // keyframes explicitly avoids the CSS-transition trap where the browser
        // coalesces the invert+release into a no-op and the chips just snap.
        // Transforms don't reflow siblings, so chips slide through each other.
        const reduceMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduceMotion) {
            [...list.children].forEach(chip => {
                const prev = firstRects.get(chip.getAttribute('data-key'));
                if (!prev) return;
                const now = chip.getBoundingClientRect();
                const dx = prev.left - now.left, dy = prev.top - now.top;
                if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
                if (typeof chip.animate !== 'function') return;
                chip.style.zIndex = '2';   // ride above the settled chips in transit
                const anim = chip.animate(
                    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }],
                    { duration: 450, easing: 'cubic-bezier(.22, 1, .36, 1)' }
                );
                anim.onfinish = anim.oncancel = () => { chip.style.zIndex = ''; };
            });
        }

        // Keep a shown tooltip in sync across the frequent re-renders: re-fill
        // and re-position it against the matching chip, or hide it if gone.
        const activeKey = this._bvTipPinned || this._bvTipHoverKey;
        if (activeKey && this._bvTipEl && this._bvTipEl.style.display !== 'none') {
            const chip = [...list.children].find(c => c.getAttribute('data-key') === activeKey);
            if (chip) { this._bvFillTip(chip); this._bvPositionTip(chip); }
            else { this._bvTipEl.style.display = 'none'; this._bvTipPinned = null; this._bvTipHoverKey = null; }
        }
    }

    // Create the shared tooltip element and wire delegated hover/tap handlers
    // on the (persistent) list container — once. The list's children are
    // rebuilt on every render, so per-chip listeners would leak; delegation
    // survives rebuilds.
    _bvEnsureBlockTip(list) {
        if (!this._bvTipEl) {
            const tip = document.createElement('div');
            tip.className = 'bv-block-tip';
            tip.style.display = 'none';
            document.body.appendChild(tip);
            this._bvTipEl = tip;
            this._bvTipPinned = null;   // data-key of a tap-pinned chip
            this._bvTipHoverKey = null; // data-key of the hovered chip
        }
        if (list._bvTipBound) return;
        list._bvTipBound = true;

        const showFor = (chip) => {
            this._bvFillTip(chip);
            // Display must be set before positioning — a display:none element
            // reports offsetHeight 0, which zeroed the above-the-chip offset
            // and let the tooltip render below.
            this._bvTipEl.style.display = 'block';
            this._bvPositionTip(chip);
        };

        list.addEventListener('mouseover', (e) => {
            if (this._bvTipPinned) return; // tap-pinned wins over hover
            const chip = e.target.closest('.bv-block-chip');
            if (!chip) return;
            this._bvTipHoverKey = chip.getAttribute('data-key');
            showFor(chip);
        });
        list.addEventListener('mouseleave', () => {
            this._bvTipHoverKey = null;
            if (!this._bvTipPinned) this._bvTipEl.style.display = 'none';
        });

        // Tap / click toggles a pinned tooltip (touch has no hover).
        list.addEventListener('click', (e) => {
            const chip = e.target.closest('.bv-block-chip');
            if (!chip) return;
            const key = chip.getAttribute('data-key');
            if (this._bvTipPinned === key) {
                this._bvTipPinned = null;
                this._bvTipEl.style.display = 'none';
            } else {
                this._bvTipPinned = key;
                showFor(chip);
            }
        });

        // Tapping/clicking anywhere outside the bar closes a pinned tooltip.
        document.addEventListener('click', (e) => {
            if (!this._bvTipPinned) return;
            if (e.target.closest('#bv-block-bar')) return;
            this._bvTipPinned = null;
            this._bvTipEl.style.display = 'none';
        });
    }

    // Fill the tooltip with a block's name and its missing numbers for the
    // current rekke plus the next one up.
    _bvFillTip(chip) {
        const tip = this._bvTipEl;
        tip.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'bv-tip-title';
        title.textContent = chip.getAttribute('data-name') || '';
        tip.appendChild(title);

        const addRow = (rekkeNum, numsStr) => {
            if (!rekkeNum) return;
            const nums = (numsStr || '').split(',').filter(Boolean);
            const row = document.createElement('div');
            row.className = 'bv-tip-row';
            const r = document.createElement('span');
            r.className = 'bv-tip-rekke';
            r.textContent = 'Rekke ' + rekkeNum;
            const v = document.createElement('span');
            v.className = 'bv-tip-nums';
            v.textContent = nums.length ? nums.join('  ·  ') : 'Bingo!';
            if (!nums.length) v.classList.add('bv-tip-bingo');
            row.appendChild(r);
            row.appendChild(v);
            tip.appendChild(row);
        };
        addRow(chip.getAttribute('data-rekke'), chip.getAttribute('data-missnow'));
        addRow(chip.getAttribute('data-rekkenext'), chip.getAttribute('data-missnext'));
    }

    // Position the tooltip centered above the chip, clamping to the viewport.
    // Never flips below — the bar sits at the bottom of the screen, so a
    // below-the-cursor tooltip would cover the bar (and the cursor).
    _bvPositionTip(chip) {
        const tip = this._bvTipEl;
        const r = chip.getBoundingClientRect();
        tip.style.left = '0px';
        tip.style.top = '0px';
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        let left = r.left + r.width / 2 - tw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        const top = Math.max(8, r.top - th - 8);
        tip.style.left = Math.round(left) + 'px';
        tip.style.top = Math.round(top) + 'px';
    }

    // Recompute ball highlights and modal phones list. Called from phones-listener,
    // bvSend, bvSendUncall, bvSendState, bvSendReset.
    _bvUpdatePaperHighlights() {
        // Clear previous styling on every ball
        const ballMap = this._bvBallMap();
        Object.values(ballMap).forEach(el => {
            el.classList.remove('bv-watch', 'bv-pulse', 'bv-watch-flip');
            el.style.removeProperty('--bv-rings');
            // Remove old name labels
            const oldLabel = el.querySelector('.bv-watch-names');
            if (oldLabel) oldLabel.remove();
        });

        // Order phones by a STABLE first-seen sequence, not by connection ts.
        // _bvPhones is sorted online-first / by ts, so a phone that exits and
        // rejoins gets a fresh ts and jumps slots — reshuffling the block bar
        // and reassigning colours "without anything happening". Pinning each
        // block to the order it was first seen keeps positions and colours put
        // across reconnects; genuinely new blocks append at the end.
        const phones = this._bvStableOrderPhones(this._bvPhones || []);
        const highlightOn = this.settings.bvHighlightEnabled ?? true;
        const calledSet = new Set((this.slot ? this.slot.selectedNumbers : []).map(Number));
        const rekke = (this.settings.bvHighlightRekke === 'current' || !this.settings.bvHighlightRekke)
            ? (this.slot ? this.slot.currentRekke : 'Rekke1')
            : this.settings.bvHighlightRekke;
        const threshold = this.settings.bvHighlightThreshold ?? 2;
        const game  = this.currentTheme;

        // Aggregate: { number: [{phoneIdx, level, color, name}, ...] }
        const byBall = {};
        // For modal rendering, also collect close strips per phone
        const phoneRows = [];
        // For the fixed bottom bar: name + numbers-missing per block.
        const blockBarItems = [];

        phones.forEach((phone, idx) => {
            const color = BingoApp.BV_PHONE_COLORS[idx % BingoApp.BV_PHONE_COLORS.length];
            const papers = phone.papers || {};
            const strips = papers[game];
            const closeStrips = [];
            // Strip " (Blokk N)" suffix — the colored ring/label already
            // makes it obvious which block; only the base name is useful here.
            const rawName = (phone.userName || '').trim();
            const displayName = rawName.replace(/\s*\(Blokk\s*\d+\)\s*$/i, '')
                              || `Telefon ${idx + 1}`;

            if (highlightOn && Array.isArray(strips)) {
                strips.forEach(strip => {
                    const infos = this._bvStripCloseInfos(strip, calledSet, rekke, threshold);
                    infos.forEach(info => {
                        closeStrips.push({ id: strip.id, ...info });
                        info.numbers.forEach(num => {
                            if (!byBall[num]) byBall[num] = [];
                            byBall[num].push({ phoneIdx: idx, color, level: info.level, name: displayName });
                        });
                    });
                });
            }

            phoneRows.push({
                idx, color, ts: phone.ts, online: !!phone.online, lastSeen: phone.lastSeen,
                phoneId: phone.id, hasPaper: Array.isArray(strips), closeStrips,
                userName: phone.userName || '',
            });

            // Tooltip data: the actual missing numbers for the current rekke
            // and (if not already the top rekke) the next one up.
            const rekkeNum = rekke === 'Rekke3' ? 3 : rekke === 'Rekke2' ? 2 : 1;
            const missNow = Array.isArray(strips)
                ? this._bvBlockMissingNumbers(strips, calledSet, rekke) : null;
            let rekkeNextNum = null, missNext = null;
            if (Array.isArray(strips) && rekkeNum < 3) {
                rekkeNextNum = rekkeNum + 1;
                missNext = this._bvBlockMissingNumbers(strips, calledSet, 'Rekke' + rekkeNextNum);
            }

            blockBarItems.push({
                id: phone.id,
                name: displayName,
                color,
                online: !!phone.online,
                hasPaper: Array.isArray(strips),
                missing: Array.isArray(strips)
                    ? this._bvBlockMissingForGame(strips, calledSet, rekke)
                    : Infinity,
                rekkeNum,
                missNow,
                rekkeNextNum,
                missNext,
            });
        });

        // Apply ball highlights
        Object.entries(byBall).forEach(([numStr, entries]) => {
            const num = Number(numStr);
            const ball = ballMap[num];
            if (!ball) return;
            // Stack rings outward — innermost at 2px, each phone adds 2px
            const rings = entries.map((e, i) =>
                `0 0 0 ${2 + i * 2}px ${e.color}`
            ).join(', ');
            ball.style.setProperty('--bv-rings', rings);
            ball.classList.add('bv-watch');
            if (entries.some(e => e.level === 'strong')) {
                ball.classList.add('bv-pulse');
            }

            // Add name label(s) beside the ball — dedupe per phone (a phone can
            // appear multiple times if multiple strips need this same number).
            const seen = new Set();
            const uniqueEntries = entries.filter(e => {
                if (seen.has(e.phoneIdx)) return false;
                seen.add(e.phoneIdx); return true;
            });
            const label = document.createElement('div');
            label.className = 'bv-watch-names';
            uniqueEntries.forEach(e => {
                const tag = document.createElement('span');
                tag.className = 'bv-watch-name';
                tag.textContent = e.name;
                tag.style.setProperty('--bv-name-color', e.color);
                label.appendChild(tag);
            });
            ball.appendChild(label);
        });

        // After labels render, flip below the ball any that would overflow
        // off the top edge of the viewport.
        requestAnimationFrame(() => {
            document.querySelectorAll('.balls.bv-watch').forEach(ball => {
                const lbl = ball.querySelector('.bv-watch-names');
                if (!lbl) return;
                const r = lbl.getBoundingClientRect();
                if (r.top < 4) ball.classList.add('bv-watch-flip');
            });
        });

        // Win detection — fires a one-time notification per (phone, game, rekke,
        // strip) combo as it transitions to a winning state. Only online phones
        // generate alerts.
        this._bvProcessWinNotifications(phones, calledSet, rekke, game);

        // Cache items so the sort toggle can re-render without a new snapshot,
        // then paint the always-visible bottom block-bar.
        this._bvBlockBarItems = blockBarItems;
        this._bvRenderBlockBar(blockBarItems);

        this._bvRenderPhonesSection(phoneRows);
    }

    _bvRenderPhonesSection(rows) {
        const section = document.getElementById('bv-phones-section');
        const list    = document.getElementById('bv-phones-list');
        if (!section || !list) return;

        // Skip the entire DOM rebuild when the BingoView modal isn't visible.
        // Firebase snapshots fire several times per second during play and the
        // phones modal is closed almost always — building hundreds of nodes
        // into a hidden container is wasted work and a source of detached-node
        // accumulation. The next openBingoViewModal call triggers a fresh
        // recompute via _bvUpdatePaperHighlights.
        const modal = document.getElementById('bingoview-modal');
        const modalVisible = modal && modal.style.display === 'flex';
        if (!modalVisible) {
            // Cache the latest rows so we can render on open without waiting
            // for the next snapshot.
            this._bvPendingRows = rows;
            return;
        }
        this._bvPendingRows = null;

        if (!rows.length) {
            section.style.display = 'none';
            list.innerHTML = '';
            return;
        }
        section.style.display = '';
        list.innerHTML = '';

        // One-time delegated click handler for the delete buttons. Beats
        // attaching a fresh listener on every row of every render.
        if (!list._bvDelegatedClick) {
            list._bvDelegatedClick = true;
            list.addEventListener('click', e => {
                const del = e.target.closest('.bv-phone-delete-btn');
                if (!del || !list.contains(del)) return;
                e.stopPropagation();
                const phoneId = del.dataset.phoneId;
                if (!phoneId) return;
                if (del.dataset.confirming === '1') {
                    this.bvDeletePersistedPhone(phoneId);
                } else {
                    del.dataset.confirming = '1';
                    del.textContent = 'Bekreft?';
                    del.classList.add('bv-phone-delete-confirm');
                    setTimeout(() => {
                        del.dataset.confirming = '';
                        del.textContent = 'Slett';
                        del.classList.remove('bv-phone-delete-confirm');
                    }, 2500);
                }
            });
        }

        // Did a call just happen? If so, the offline rows below get a brief
        // pulse animation as feedback that the system is still processing
        // their paper.
        const justCalled = this._bvLastCallTs && (Date.now() - this._bvLastCallTs) < 250;
        rows.forEach((row, i) => {
            const div = document.createElement('div');
            const offlineCls = row.online === false ? ' bv-phone-offline' : '';
            const pulseCls   = (row.online === false && justCalled) ? ' bv-phone-just-updated' : '';
            div.className = 'bv-phone-row' + offlineCls + pulseCls;
            div.style.setProperty('--bv-phone-color', row.color);

            const info = document.createElement('div');
            info.className = 'bv-phone-info';

            const name = document.createElement('div');
            name.className = 'bv-phone-name';
            const offlineSuffix = row.online === false
                ? ` · Frakoblet${row.lastSeen ? ' (' + this._bvFormatLastSeen(row.lastSeen) + ')' : ''}`
                : '';
            const baseName = row.userName ? row.userName : `Telefon ${row.idx + 1}`;
            name.textContent = `${baseName}${offlineSuffix}`;
            info.appendChild(name);

            const summary = document.createElement('div');
            summary.className = 'bv-phone-summary';
            if (!row.hasPaper) {
                summary.textContent = 'Ingen ark for dette spillet ennå';
            } else if (row.closeStrips.length === 0) {
                summary.textContent = 'Ingen rekker nær gevinst';
            } else {
                const strong = row.closeStrips.filter(s => s.level === 'strong').length;
                summary.textContent = strong > 0
                    ? `${row.closeStrips.length} rekke${row.closeStrips.length === 1 ? '' : 'r'} nær — ${strong} bingo!`
                    : `${row.closeStrips.length} rekke${row.closeStrips.length === 1 ? '' : 'r'} nær`;
            }
            info.appendChild(summary);

            if (row.closeStrips.length) {
                const stripsWrap = document.createElement('div');
                stripsWrap.className = 'bv-phone-strips';
                row.closeStrips
                    .slice()
                    .sort((a, b) => a.total - b.total)
                    .forEach(s => {
                        const r = document.createElement('div');
                        r.className = 'bv-strip-row ' + s.level;
                        const idEl = document.createElement('span');
                        idEl.className = 'bv-strip-id';
                        idEl.textContent = '#' + (s.id || '');
                        const nums = document.createElement('span');
                        nums.className = 'bv-strip-nums';
                        nums.textContent = s.total === 1 ? `mangler ${s.numbers[0]}` :
                                           `mangler ${s.numbers.slice().sort((a,b) => a-b).join(', ')}`;
                        r.appendChild(idEl);
                        r.appendChild(nums);
                        stripsWrap.appendChild(r);
                    });
                info.appendChild(stripsWrap);
            }

            div.appendChild(info);

            // Slett button for offline persisted phones (handled via delegation above)
            if (row.online === false && row.phoneId) {
                const del = document.createElement('button');
                del.className = 'bv-phone-delete-btn';
                del.title = 'Slett ark for denne frakoblede telefonen';
                del.textContent = 'Slett';
                del.dataset.phoneId = row.phoneId;
                div.appendChild(del);
            }

            list.appendChild(div);
        });
    }

    _bvFormatLastSeen(ts) {
        const diff = Date.now() - ts;
        if (diff < 60_000)        return 'akkurat nå';
        if (diff < 3_600_000)     return Math.floor(diff / 60_000) + ' min siden';
        if (diff < 86_400_000)    return Math.floor(diff / 3_600_000) + ' t siden';
        return Math.floor(diff / 86_400_000) + ' d siden';
    }

    // True when the strip has enough fully-called rows to satisfy the rekke.
    _bvStripIsWinning(strip, calledSet, rekke) {
        if (!strip || !Array.isArray(strip.rows)) return false;
        const zeroCount = strip.rows.reduce((acc, nums) => {
            const missing = (nums || []).filter(n => Number.isFinite(n) && !calledSet.has(n)).length;
            return acc + (missing === 0 ? 1 : 0);
        }, 0);
        const need = rekke === 'Rekke3' ? 3 : (rekke === 'Rekke2' ? 2 : 1);
        return zeroCount >= need;
    }

    // Called from _bvUpdatePaperHighlights. Diffs the current set of winning
    // (phoneId, game, rekke, stripId) keys against the previous run; spawns a
    // notice for each newly-appearing key when the toggle is on.
    _bvProcessWinNotifications(phones, calledSet, rekke, game) {
        const currentKeys = new Set();
        const newWins     = [];
        // The most recently called number is the "control number" — the one
        // that triggered the win. Pull it off the host's selectedNumbers tail.
        const sel = (this.slot && this.slot.selectedNumbers) || [];
        const controlNum = sel.length ? Number(sel[sel.length - 1]) : null;
        phones.forEach((phone, idx) => {
            const strips = (phone.papers || {})[game];
            if (!Array.isArray(strips)) return;
            strips.forEach(strip => {
                if (!this._bvStripIsWinning(strip, calledSet, rekke)) return;
                const key = `${phone.id}|${game}|${rekke}|${strip.id}`;
                currentKeys.add(key);
                if (!this._bvWinKeysPrev || !this._bvWinKeysPrev.has(key)) {
                    // Collect the numbers from the completed row(s) so the
                    // host can show them alongside the control number.
                    const winningRows = [];
                    (strip.rows || []).forEach(nums => {
                        const valid = (nums || []).filter(n => Number.isFinite(n));
                        const missing = valid.filter(n => !calledSet.has(n));
                        if (valid.length && !missing.length) {
                            winningRows.push(valid.slice().sort((a, b) => a - b));
                        }
                    });
                    newWins.push({
                        phoneIdx: idx,
                        phoneId: phone.id,
                        stripId: strip.id,
                        rekke,
                        online: !!phone.online,
                        userName: phone.userName || '',
                        winningRows,
                        controlNum,
                    });
                }
            });
        });
        this._bvWinKeysPrev = currentKeys;
        if (this.settings.bvWinNotifyEnabled !== false && newWins.length) {
            // Show ALL fresh wins in the modal at once (two or more
            // phones bingoing on the same called number stack in the
            // same modal instead of overwriting each other).
            this._bvShowWinNotice(newWins);
        }
        if (this.settings.bvWinAutoOpenWinModal && newWins.length) {
            // Open the winner-logging modal once, even if multiple wins
            // arrived in the same tick. Skip if any winner-related modal is
            // already open so we don't fight the user.
            const winnerOpen   = this.el.winnerModal?.style.display === 'flex';
            const addWinOpen   = this.el.addWinModal?.style.display === 'flex';
            const editWinOpen  = this.el.editWinModal?.style.display === 'flex';
            if (!winnerOpen && !addWinOpen && !editWinOpen) {
                try { this.openWinnerModal(); } catch (e) {}
            }
        }
    }

    // Accepts either a single win object or an array of wins. When more
    // than one win arrives in the same tick (two phones bingoing on the
    // same called number) all of them stack inside the same modal.
    _bvShowWinNotice(winOrWins) {
        const modal = document.getElementById('bv-win-modal');
        if (!modal) return;
        const wins = Array.isArray(winOrWins) ? winOrWins : [winOrWins];
        if (!wins.length) return;

        const cardsEl = modal.querySelector('#bv-win-cards');
        cardsEl.innerHTML = '';
        // Multi-win class on the modal so spacing / size can adapt
        modal.classList.toggle('bv-win-modal-multi', wins.length > 1);
        // If ALL wins are offline, tint the modal amber; otherwise green
        const allOffline = wins.every(w => w.online === false);
        modal.classList.toggle('bv-win-modal-offline', allOffline);

        wins.forEach((win, wIdx) => {
            const phoneNum = (win.phoneIdx ?? 0) + 1;
            const stripId  = win.stripId != null ? String(win.stripId) : '?';
            const rekkeLbl = win.rekke === 'Rekke3' ? 'Hele arket'
                           : win.rekke === 'Rekke2' ? '2 rekker'
                           : '1 rekke';
            const isOffline   = win.online === false;
            const displayName = (win.userName && win.userName.trim()) || `Telefon ${phoneNum}`;

            const card = document.createElement('div');
            card.className = 'bv-win-modal-card'
                           + (isOffline ? ' bv-win-card-offline' : '');

            const header = document.createElement('div');
            header.className = 'bv-win-header';
            header.innerHTML =
                '<span class="bv-win-trophy">🏆</span>'
              + '<span class="bv-win-id"></span>'
              + '<span class="bv-win-dot">·</span>'
              + '<span class="bv-win-label">TALL</span>'
              + '<span class="bv-win-control"></span>';
            header.querySelector('.bv-win-id').textContent      = stripId;
            header.querySelector('.bv-win-control').textContent =
                win.controlNum != null ? String(win.controlNum) : '?';
            card.appendChild(header);

            const nameEl = document.createElement('div');
            nameEl.className = 'bv-win-name';
            nameEl.textContent = displayName + (isOffline ? ' (frakoblet)' : '');
            card.appendChild(nameEl);

            const rekkeEl = document.createElement('div');
            rekkeEl.className = 'bv-win-rekke';
            rekkeEl.textContent = rekkeLbl;
            card.appendChild(rekkeEl);

            const rowsWrap = document.createElement('div');
            rowsWrap.className = 'bv-win-rows';
            if (Array.isArray(win.winningRows) && win.winningRows.length) {
                win.winningRows.forEach(row => {
                    const rowEl = document.createElement('div');
                    rowEl.className = 'bv-win-row';
                    rowEl.style.setProperty('--bv-row-cols', row.length);
                    row.forEach(n => {
                        const cell = document.createElement('div');
                        cell.className = 'bv-win-cell';
                        if (n === win.controlNum) cell.classList.add('bv-win-cell-control');
                        cell.textContent = n;
                        rowEl.appendChild(cell);
                    });
                    rowsWrap.appendChild(rowEl);
                });
            }
            card.appendChild(rowsWrap);

            cardsEl.appendChild(card);
        });

        const closeBtn = modal.querySelector('.bv-win-modal-close');
        // Detach any handlers from a previous (possibly still-open) notice so
        // repeated wins don't stack document-level keydown listeners.
        if (modal._bvWinCleanup) modal._bvWinCleanup();
        const close = () => {
            modal.style.display = 'none';
            if (modal._bvWinCleanup) modal._bvWinCleanup();
        };
        const backdropClose = (e) => { if (e.target === modal) close(); };
        const keyHandler    = (e) => { if (e.key === 'Escape') close(); };
        modal._bvWinCleanup = () => {
            modal.removeEventListener('click', backdropClose);
            closeBtn.removeEventListener('click', close);
            document.removeEventListener('keydown', keyHandler);
            modal._bvWinCleanup = null;
        };
        modal.addEventListener('click', backdropClose);
        closeBtn.addEventListener('click', close);
        document.addEventListener('keydown', keyHandler);

        modal.style.display = 'flex';
    }

    _bvClearWinNotices() {
        const modal = document.getElementById('bv-win-modal');
        if (modal) modal.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => { window.bingoApp = new BingoApp(); });

/* ═══════════════════════════════════════════════
   VISUAL FLARE — effects + settings panel
   ═══════════════════════════════════════════════ */
(function () {
    'use strict';

    const SCHEMA = [
        { group: 'Bakgrunn', items: [
            { key: 'particles',     label: 'Svevende partikler', desc: 'Lysende prikker stiger opp',
              sliders: [{ key: 'particlesDensity',   label: 'Tetthet',   min: 5,  max: 100, step: 5  }] },
            { key: 'vignette',      label: 'Vignett',             desc: 'Mørke kanter rundt skjermen',
              sliders: [{ key: 'vignetteIntensity',  label: 'Styrke',    min: 0,  max: 80,  step: 5   }] },
            { key: 'scanlines',     label: 'Skannelinjer',        desc: 'Diskret CRT-linjetekstur',
              sliders: [{ key: 'scanlinesIntensity', label: 'Styrke',    min: 5,  max: 100, step: 5   }] },
        ]},
        { group: 'Klikk-effekter', items: [
            { key: 'ballRipple',    label: 'Klikk-ring',          desc: 'Ekspanderende ring ved ballklikk' },
            { key: 'ballBurst',     label: 'Partikkeleksplosjon',  desc: 'Partikler spruter ut ved klikk',
              sliders: [{ key: 'ballBurstCount',     label: 'Antall',    min: 4,  max: 30,  step: 2   }] },
            { key: 'ghostNumber',   label: 'Tallspøkelse',         desc: 'Tall flyter opp ved nytt kall' },
        ]},
        { group: 'Vinnere', items: [
            { key: 'confetti',      label: 'Konfetti',             desc: 'Fargeregn når vinner logges',
              sliders: [{ key: 'confettiCount',      label: 'Mengde',    min: 20, max: 200, step: 10  }] },
        ]},
    ];

    const DEFAULTS = {
        particles: true,        particlesDensity: 65,
        vignette: true,         vignetteIntensity: 52,
        scanlines: true,        scanlinesIntensity: 35,
        ballRipple: true,
        ballBurst: true,        ballBurstCount: 14,
        ghostNumber: true,
        confetti: true,         confettiCount: 100,
    };

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

    function getAccent() {
        return getComputedStyle(document.body)
            .getPropertyValue('--accent-color').trim() || '#F1B924';
    }

    function hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [241,185,36];
    }

    let cachedRGB = [241, 185, 36];

    function applyAllSettings() {
        const root = document.documentElement;

        root.style.setProperty('--flare-vignette',
            S.vignette  ? (S.vignetteIntensity  / 100).toFixed(2)  : '0');
        root.style.setProperty('--flare-scanlines',
            S.scanlines ? (S.scanlinesIntensity  / 1000).toFixed(4) : '0');

        cachedRGB = hexToRgb(getAccent());

        // Toggling particles on must wake the rAF loop
        if (typeof ensureLoopRunning === 'function') ensureLoopRunning();
    }

    // Theme switches / accent edits move --accent-color; re-read it so the
    // particle colour tracks the accent instead of staying on the old theme.
    window.addEventListener('accentchange', () => {
        cachedRGB = hexToRgb(getAccent());
    });

    const MAX_PARTS = 100;

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

    let rafHandle = 0;
    let canvasCleared = false;

    function loopActive() {
        // Only the canvas-based particle field needs the rAF loop.
        return S.particles;
    }

    function mainLoop() {
        rafHandle = 0;

        if (document.hidden) {
            // Re-enter when the tab is visible again
            return;
        }

        if (!loopActive()) {
            // Clear once on the way down so leftover pixels don't stick
            if (!canvasCleared) {
                ctx.clearRect(0, 0, W, H);
                canvasCleared = true;
            }
            return;
        }

        ctx.clearRect(0, 0, W, H);
        canvasCleared = false;
        const [r, g, b] = cachedRGB;

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

        rafHandle = requestAnimationFrame(mainLoop);
    }

    function ensureLoopRunning() {
        if (rafHandle) return;
        if (!loopActive()) return;
        rafHandle = requestAnimationFrame(mainLoop);
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) ensureLoopRunning();
    });

    const overlay = document.createElement('div');
    overlay.id = 'flare-overlay';
    document.body.appendChild(overlay);

    ensureLoopRunning();

    document.addEventListener('click', e => {
        const ball = e.target.closest?.('.balls');
        if (!ball) return;
        const rect = ball.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;

        if (S.ballRipple) {
            const el = document.createElement('div');
            el.className     = 'flare-ripple';
            el.style.cssText = `left:${cx}px;top:${cy}px`;
            document.body.appendChild(el);
            el.addEventListener('animationend', () => el.remove(), { once: true });
        }

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

        if (S.ghostNumber) {
            setTimeout(() => {
                if (!ball.classList.contains('clicked')) return;
                const num = ball.dataset.num || ball.textContent.trim();
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
        panel.querySelectorAll('.flare-chk').forEach(chk => {
            chk.addEventListener('change', () => {
                const key = chk.dataset.key;
                S[key] = chk.checked;
                syncSliderRow(panel, key, chk.checked);
                saveSettings();
                applyAllSettings();
            });
        });

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

        panel.querySelector('#flare-reset-btn')?.addEventListener('click', () => {
            Object.assign(S, DEFAULTS);
            saveSettings();
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

        const btn = document.createElement('button');
        btn.className    = 'settings-nav-item';
        btn.dataset.panel = 'sg-flare';
        btn.textContent  = '✨ Effekter';
        const spacer = nav.querySelector('.settings-nav-spacer');
        spacer ? nav.insertBefore(btn, spacer) : nav.appendChild(btn);

        const panel = document.createElement('div');
        panel.className = 'settings-panel';
        panel.id        = 'sg-flare';
        panel.innerHTML = buildPanelHTML();
        content.appendChild(panel);

        wirePanel(panel);

        // Relocate the static "Bakgrunnsblur" toggle (declared in index.html so its
        // existing wiring resolves at init) into this effects panel, grouped under
        // "Ytelse", just above the reset button.
        const blurRow  = document.getElementById('blur-setting-row');
        const resetRow = panel.querySelector('#flare-reset-btn')?.closest('.settings-row');
        if (blurRow && resetRow) {
            const grp = document.createElement('div');
            grp.className   = 'flare-group-label';
            grp.textContent = 'Ytelse';
            panel.insertBefore(grp, resetRow);
            panel.insertBefore(blurRow, resetRow);
        }
    }

    injectSettingsPanel();

    applyAllSettings();
})();
