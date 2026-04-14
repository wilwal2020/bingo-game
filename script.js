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

/* =====================================================
   GEITHUS BINGO — script.js
   ===================================================== */

// Game themes in order: default = no game, others = game 1-4
const GAME_THEMES = ['blue', 'yellow', 'pink', 'grey'];
const COLOR_THEMES = ['default', 'blue', 'yellow', 'pink', 'grey']; // includes editable default
const GAME_NAMES  = { default: 'Standard', blue: 'Spill 1', yellow: 'Spill 2', pink: 'Spill 3', grey: 'Spill 4' };
const THEME_COLORS = { blue: '#00aeff', yellow: '#F1B924', pink: '#ff0096', grey: '#ffdcbc' };
const DEFAULT_THEME_COLORS = {
    default: { accent: '#F1B924', primary: '#202834', balls: '#4c586b', danger: '#ff4444', winner: '#f0c030' },
    blue:    { accent: '#00aeff', primary: '#141820', balls: '#4c586b', danger: '#ff4444', winner: '#f0c030' },
    yellow:  { accent: '#F1B924', primary: '#151515', balls: '#5c5858', danger: '#ff4444', winner: '#f0c030' },
    pink:    { accent: '#ff0096', primary: '#211220', balls: '#604b5f', danger: '#ff4444', winner: '#f0c030' },
    grey:    { accent: '#ffdcbc', primary: '#18181c', balls: '#525150', danger: '#ff4444', winner: '#f0c030' },
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

        // Settings
        this.settings = {
            progressEnabled: true,
            progressDuration: 13,
            progressStyle: 'wave',
            countdownFixed:  false,
            countdownTime:   '22:08',
            oneWay:          false,
            tooltipEnabled:  true,
            chancesVisible:  true,
            countdownVisible: true,
            soundEnabled:    true,
            hoverStyle:      'click-air',
            callStyle:       'synth',
            selectStyle:     'synth',
            switchStyle:     'synth',
            confirmStyle:    'synth',
            cancelStyle:     'synth',
            resetStyle:      'synth',
            resetHardStyle:  'synth',
            overtimeStyle:   'custom',
            overtimeEnabled: true,
            volOvertime: 0.9,
            typingDelay: 8,
            typingOverwrite: false,
            typingOverwriteDelay: 10,
            ballAnimStyle: 'spin',
            gridLayout: 'horizontal',
            volHover:   0.8,
            volCall:    0.9,
            volSelect:  0.8,
            volSwitch:  0.9,
            volConfirm: 0.9,
            volCancel:  0.9,
            volReset:   0.9,
            volResetHard: 1.0,
            overAverageBlinkEnabled: true,
            nextGameCountdownEnabled: false,
            nextGameCountdownMinutes: 3,
            nextGameCountdownSeconds: 0,
            blurEnabled: true,
        };

        // Init all slots
        ['default', ...GAME_THEMES].forEach(t => {
            this.slots[t] = freshSlotState();
        });

        this.init();
    }

    // ── Initialisation ──────────────────────────────
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadFromStorage();
        this.applySettings();
        this.preloadSounds();
        this.loadUserSoundsIntoPool();
        this.applySlotToDOM();
        this.updateAverages();
        this.updateAverageHighlight();
        this.updateGameIndicator();
        this.checkSaveSessionButton();
        this.startCountdown();
        this.resetInactivityTimer();
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
            logRekke3Btn:    document.getElementById('log-rekke3-btn'),
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
            settingOvertimeStyle: document.getElementById('setting-overtime-style'),
            volOvertime: document.getElementById('vol-overtime'),
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
            uploadSoundCats:     document.getElementById('upload-sound-categories'),
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
            addWinMonth:         document.getElementById('add-win-month'),
            addWinSave:          document.getElementById('add-win-save'),
            addWinCancel:        document.getElementById('add-win-cancel'),
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
            settingOverAverageBlink:    document.getElementById('setting-over-average-blink'),
            settingBlur:                document.getElementById('setting-blur'),
            settingNextGameCountdown:   document.getElementById('setting-next-game-countdown'),
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
        };

        // O(1) number→element lookup — avoids spread+find across all 90 balls
        this.el.ballMap = new Map();
        this.el.balls.forEach(ball => this.el.ballMap.set(ball.textContent.trim(), ball));
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
            ['edit-session-modal',   () => this.promptUnsavedClose(() => this.closeEditSessionModal())],
            ['delete-modal',         () => this.closeDeleteModal()],
            ['reset-all-modal',      () => this.closeResetAllModal()],
            ['leaderboard-modal',    () => this.closeLeaderboard()],
            ['players-modal',        () => this.closePlayersModal()],
            ['player-history-modal', () => this.closePlayerHistory()],
            ['player-delete-modal',  () => this.closePlayerDeleteModal()],
            ['add-win-modal',        () => this.closeAddWinModal()],
            ['graph-modal',          () => this.closeGraph()],
            ['unsaved-modal',        () => this.closeUnsavedModal()],
            ['upload-sound-modal',   () => this.closeUploadSoundModal()],
            ['settings-modal',       () => this.closeSettingsModal()],
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

        // Recent numbers expand
        this.el.recentExpandBtn.addEventListener('click', () => { this.playSound('select'); this.toggleRecentExpand(); });

        // Graph
        this.el.graphBtn.addEventListener('click',   () => this.openGraph());
        this.el.graphClose.addEventListener('click', () => this.closeGraph());

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
        this.el.logRekke3Btn.addEventListener('click',   () => this.handleLogRekke3());
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
        this.el.editSessionCancel.addEventListener('click', () => this.promptUnsavedClose(() => this.closeEditSessionModal()));

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
        bindSoundStyle(this.el.settingOvertimeStyle,  'overtimeStyle',  'overtime');

        const bindVol = (el, key, type) => {
            if (!el) return;
            el.addEventListener('input', () => {
                this.settings[key] = parseFloat(el.value);
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
        bindVol(this.el.volOvertime,  'volOvertime',  'overtime');
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
        localStorage.setItem('bingoSettings', JSON.stringify(this.settings));
    }

    saveThemeColors() {
        localStorage.setItem('bingoThemeColors', JSON.stringify(this.themeColors));
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
        themes.forEach(t => {
            const list = document.querySelector(`.color-preset-list[data-theme="${t}"]`);
            if (!list) return;
            const presets = all[t] || [];
            list.innerHTML = '';
            presets.forEach(preset => {
                const item = document.createElement('div');
                item.className = 'color-preset-item';

                const swatch = document.createElement('span');
                swatch.className = 'color-preset-swatch';
                swatch.style.background = preset.colors.accent || DEFAULT_THEME_COLORS[t].accent;

                const nameEl = document.createElement('span');
                nameEl.className = 'color-preset-name';
                nameEl.textContent = preset.name;

                const loadBtn = document.createElement('button');
                loadBtn.className = 'color-preset-load-btn';
                loadBtn.textContent = 'Last inn';
                loadBtn.addEventListener('click', () => this.loadColorPreset(t, preset.name));

                const delBtn = document.createElement('button');
                delBtn.className = 'color-preset-delete-btn';
                delBtn.textContent = '✕';
                delBtn.title = 'Slett';
                delBtn.addEventListener('click', () => {
                    this.deleteColorPreset(t, preset.name);
                    this.renderColorPresets(t);
                });

                item.appendChild(swatch);
                item.appendChild(nameEl);
                item.appendChild(loadBtn);
                item.appendChild(delBtn);
                list.appendChild(item);
            });
        });
    }

    applyThemeColors() {
        const body = document.body;
        const c = this.themeColors[this.currentTheme] || this.themeColors.default;
        body.style.setProperty('--accent-color',  c.accent);
        body.style.setProperty('--primary-color', c.primary);
        body.style.setProperty('--balls-color',   c.balls);
        const rgb = hexToRgb(c.accent);
        if (rgb) body.style.setProperty('--accent-rgb', rgb);

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
            if (this._progressWhiteState) {
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
            if (undoCell.parentElement !== row1Last) {
                // Insert undo right after the 90-ball (first .balls child of last row)
                const ninetyBall = row1Last.querySelector('.balls:first-child');
                if (ninetyBall) row1Last.insertBefore(undoCell, ninetyBall.nextSibling);
            }
        } else {
            // Restore undo to the very front of the first row
            if (undoCell.parentElement !== row1First) {
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
        if (this.el.settingOvertimeStyle) this.el.settingOvertimeStyle.value = s.overtimeStyle;
        if (this.el.volOvertime) this.el.volOvertime.value = s.volOvertime;
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

        // Blur
        if (this.el.settingBlur) {
            this.el.settingBlur.checked = s.blurEnabled ?? true;
            document.body.classList.toggle('no-blur', !(s.blurEnabled ?? true));
        }

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
        const jsonKeys  = ['bingoSettings', 'bingoThemeColors', 'bingoColorPresets', 'bingoUserSounds', 'bingoFlareSettings'];
        const plainKeys = ['bingoTheme'];
        const data = {};
        jsonKeys.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) try { data[k] = JSON.parse(val); } catch(e) {}
        });
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
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const jsonKeys  = ['bingoSettings', 'bingoThemeColors', 'bingoColorPresets', 'bingoUserSounds', 'bingoFlareSettings'];
                const plainKeys = ['bingoTheme'];
                let imported = 0;
                jsonKeys.forEach(k => {
                    if (k in data) { localStorage.setItem(k, JSON.stringify(data[k])); imported++; }
                });
                plainKeys.forEach(k => {
                    if (k in data) { localStorage.setItem(k, data[k]); imported++; }
                });
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

    undoLastNumber() {
        const nums = this.slot.selectedNumbers;
        if (nums.length === 0) return;
        const last = nums[nums.length - 1];
        // Find and deselect the ball
        this.el.balls.forEach(ball => {
            if (ball.textContent.trim() === last) {
                ball.classList.remove('clicked', 'recently-selected', 'last-clicked');
                if (this._lastClickedBall === ball) this._lastClickedBall = null;
            }
        });
        this.slot.selectedNumbers = nums.slice(0, -1);
        this.slot.bigNumber = this.slot.selectedNumbers[this.slot.selectedNumbers.length - 1] || '';
        this.el.bigNumberText.textContent = this.slot.bigNumber;
        // Re-mark new last-clicked
        if (this.slot.bigNumber) {
            this.el.balls.forEach(ball => {
                if (ball.textContent.trim() === this.slot.bigNumber) {
                    ball.classList.add('last-clicked');
                    this._lastClickedBall = ball;
                }
            });
        }
        this.updateDisplay();
        this.saveSlotToStorage();
    }

    // ── Slot helpers ────────────────────────────────
    get slot() { return this.slots[this.currentTheme]; }

    saveSlotToStorage() {
        localStorage.setItem('bingoSlots', JSON.stringify(this.slots));
        localStorage.setItem('bingoTheme', this.currentTheme);
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
            const num = ball.textContent.trim();
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
        const number = ball.textContent.trim();
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
            this.slot.bigNumber = '';
            this.el.bigNumberText.textContent = '';
        } else {
            // If this is the jackpot number being called, break the circle
            if (number === this.slot.jackpotNumber) {
                ball.classList.add('jackpot-break');
                setTimeout(() => {
                    ball.classList.remove('jackpot', 'jackpot-break');
                    this.slot.jackpotNumber = null;
                    this.saveSlotToStorage();
                }, 400);
            }
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
            this.playSound('call');
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

        const isWhite = this._progressCompleted === true;
        this._progressCompleted = false;

        // Read initial colours for background setup (will also be read live per-frame)
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

        const drawFrame = (p, elapsed) => {
            // Re-read accent each frame so live colour changes are reflected immediately
            const liveAccent = getComputedStyle(document.body)
                .getPropertyValue('--accent-color').trim() || '#F1B924';
            const fillColor = isWhite ? '#ffffff' : liveAccent;
            this.el.bigNumber.style.backgroundColor = isWhite ? liveAccent : '#ffffff';

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
                this._progressCompleted  = true;
                this._progressWhiteState = isWhite;
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

        recent.forEach((num, i) => {
            const div = document.createElement('div');
            div.textContent = num;
            if (i === 0) div.classList.add('new-number');
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

        this.updateCounter();
        this.updateAverageHighlight();
        this.checkSaveSessionButton();
        this.saveSlotToStorage();
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
        this._progressRaf       = null;
        this._progressCompleted  = false;
        this._progressWhiteState = false;
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

    updateAverages() {
        const sessions = this.getSessions();
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

        // Append winner info for current game
        const pending     = this.getPendingWinners();
        const gameWinners = pending.filter(w => w.game === theme);
        if (gameWinners.length > 0) {
            const winnerLines = gameWinners
                .map(w => `🏆 ${w.name} · ${w.rekke.replace('Rekke','R')} · ${w.prize} kr${w.split > 1 ? ` (1/${w.split})` : ''}`)
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

        // Rekke3 is now logged via the rekke button itself - hide old button
        this.el.logRekke3Btn.style.display = 'none';

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
        GAME_THEMES.forEach(theme => {
            const label = document.createElement('div');
            label.className   = 'session-game-label';
            label.textContent = GAME_NAMES[theme];
            label.style.color = this.themeColors[theme]?.accent || THEME_COLORS[theme];
            grid.appendChild(label);

            const logged = this.slots[theme].loggedRekkes;
            const pending = this.getPendingWinners();
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

        const sessions = this.getSessions();
        sessions.push(session);
        localStorage.setItem('bingoSessions', JSON.stringify(sessions));

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
        this.updateWinnerIndicator();
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
                        'settings-modal','upload-sound-modal'];
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

    openWinnerModal() {
        this.playSound('select');
        if (this.currentTheme === 'default') return;
        const game  = GAME_NAMES[this.currentTheme];
        const rekke = this.slot.currentRekke.replace('Rekke', 'Rekke ');
        const prize = PRIZES[this.currentTheme][this.slot.currentRekke];

        this.el.winnerModalTitle.textContent    = `🏆 Vinner — ${game}`;
        this.el.winnerModalSubtitle.textContent = `${rekke} · ${prize} kr`;

        // Reset state
        this.winnerSplitCount      = 1;
        this.winnerSelectedPlayers = [];
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

    renderPlayerQuickselect() {
        const players   = this.getPlayers();
        const container = this.el.playerQuickselect;
        const query     = this.el.winnerNameInput.value.trim().toLowerCase();
        container.innerHTML = '';
        players.forEach(name => {
            const isSelected = this.winnerSelectedPlayers.includes(name);
            const chip = document.createElement('button');
            chip.className = 'player-chip' + (isSelected ? ' active' : '');

            // Highlight matching letters in the name
            if (query && name.toLowerCase().includes(query)) {
                const idx  = name.toLowerCase().indexOf(query);
                const pre  = name.slice(0, idx);
                const match = name.slice(idx, idx + query.length);
                const post = name.slice(idx + query.length);
                chip.innerHTML = `${pre}<span class="chip-match">${match}</span>${post}`;
            } else {
                chip.textContent = name;
            }
            chip.addEventListener('click', () => {
                const idx = this.winnerSelectedPlayers.indexOf(name);
                if (idx > -1) {
                    // Deselect
                    this.winnerSelectedPlayers.splice(idx, 1);
                } else {
                    // Only select if slots available
                    const slotsUsed = this.winnerSelectedPlayers.length + (this.el.winnerNameInput.value.trim() ? 0 : 0);
                    if (this.winnerSelectedPlayers.length < this.winnerSplitCount) {
                        this.winnerSelectedPlayers.push(name);
                    }
                }
                this.renderPlayerQuickselect();
                this.renderWinnerSelectedList();
                this.updateWinnerModalState();
            });
            container.appendChild(chip);
        });
    }

    renderWinnerSelectedList() {
        const list = this.el.winnerSelectedList;
        list.innerHTML = '';
        if (this.winnerSelectedPlayers.length === 0) return;
        this.winnerSelectedPlayers.forEach((name, i) => {
            const tag = document.createElement('span');
            tag.className = 'winner-selected-tag';
            tag.innerHTML = `${name} <button class="winner-tag-remove" data-idx="${i}">✕</button>`;
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

    showWinnerFlash(name, game, rekke, prize, split) {
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
            item.innerHTML = `<span>${name}</span>`;
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

            item.innerHTML = `
                <div class="leaderboard-rank ${rankClass}">${medal}</div>
                <div class="leaderboard-name">${entry.name}</div>
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

        sessions.forEach(s => {
            const wins = (s.winners || []).filter(w => w.name === name);
            if (wins.length > 0) playerWins.push({ date: s.date, wins, games: s.games });
        });

        // Include manual wins
        const manualWins = this.getManualWins().filter(w => w.name === name);
        manualWins.forEach(w => {
            playerWins.push({ date: w.date, wins: [{ ...w, rekke: '–', gameName: '–', manual: true }], manual: true });
        });

        // Sort by date descending
        playerWins.sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalMoney = playerWins.reduce((sum, s) =>
            sum + s.wins.reduce((a, w) => a + (w.prize || 0), 0), 0);
        const totalWins  = playerWins.reduce((sum, s) => sum + s.wins.length, 0);

        this.el.playerHistoryTitle.textContent    = `🏆 ${name}`;
        this.el.playerHistorySubtitle.textContent =
            `${totalWins} seier${totalWins !== 1 ? 'er' : ''} · ${totalMoney.toLocaleString('no-NO')} kr totalt`;

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
                    return `${w.gameName} · ${rc} · ${w.ballCount} tall · ${w.prize} kr${splitText}`;
                }).join('<br>');

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
        try {
            return JSON.parse(localStorage.getItem('bingoSessions') || '[]');
        } catch(e) { return []; }
    }

    // ── Keyboard Input ───────────────────────────────
    handleKeyInput(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

        // ── Detect open modal context ──────────────────
        const rekkeConfirmOpen = this.el.rekkeConfirm.style.display !== 'none';
        const winnerOpen       = this.el.winnerModal?.style.display === 'flex';
        const sessionOpen      = document.getElementById('session-modal')?.style.display === 'flex';
        const editSessionOpen  = document.getElementById('edit-session-modal')?.style.display === 'flex';
        const deleteOpen       = document.getElementById('delete-modal')?.style.display === 'flex';
        const resetAllOpen     = document.getElementById('reset-all-modal')?.style.display === 'flex';
        const viewerOpen       = document.getElementById('viewer-modal')?.style.display === 'flex';
        const settingsOpen     = this.el.settingsModal?.style.display === 'flex';
        const leaderboardOpen  = document.getElementById('leaderboard-modal')?.style.display === 'flex';
        const graphOpen        = document.getElementById('graph-modal')?.style.display === 'flex';
        const suggestSaveOpen  = this.el.suggestSaveModal?.style.display === 'flex';
        const anyModal = rekkeConfirmOpen || winnerOpen || sessionOpen || editSessionOpen ||
                         deleteOpen || resetAllOpen || viewerOpen || settingsOpen ||
                         leaderboardOpen || graphOpen || suggestSaveOpen;

        // ── ENTER: confirm / commit ────────────────────
        if (e.key === 'Enter') {
            e.preventDefault();
            if (rekkeConfirmOpen)  { this.confirmRekkeChange(); return; }
            if (winnerOpen)        { this.saveWinner(); return; }
            if (sessionOpen)       { this.saveSession(); return; }
            if (editSessionOpen)   { this.saveEditedSession(); return; }
            if (deleteOpen)        { this.confirmDelete(); return; }
            if (resetAllOpen)      { this.performResetAll(); return; }
            if (suggestSaveOpen)   { this.el.suggestSaveModal.style.display = 'none'; this.openSessionModal(); return; }
            // Default: commit typed number
            clearTimeout(this.typingTimer);
            this.commitTypedNumber();
            return;
        }

        // ── BACKSPACE: cancel / close / undo ──────────
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (rekkeConfirmOpen)  { this.cancelRekkeChange(); return; }
            if (winnerOpen)        { this.closeWinnerModal(); return; }
            if (sessionOpen)       { this.closeSessionModal(); return; }
            if (editSessionOpen)   { this.closeEditSessionModal(); return; }
            if (deleteOpen)        { this.closeDeleteModal(); return; }
            if (resetAllOpen)      { this.closeResetAllModal(); return; }
            if (suggestSaveOpen)   { this.playSound('cancel'); this.el.suggestSaveModal.style.display = 'none'; return; }
            if (viewerOpen)        { this.closeViewerModal(); return; }
            if (settingsOpen)      { this.closeSettingsModal(); return; }
            if (leaderboardOpen)   { this.closeLeaderboard(); return; }
            if (graphOpen)         { this.closeGraph(); return; }
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
            if (rekkeConfirmOpen)  { this.cancelRekkeChange(); return; }
            if (winnerOpen)        { this.closeWinnerModal(); return; }
            if (sessionOpen)       { this.closeSessionModal(); return; }
            if (editSessionOpen)   { this.closeEditSessionModal(); return; }
            if (deleteOpen)        { this.closeDeleteModal(); return; }
            if (resetAllOpen)      { this.closeResetAllModal(); return; }
            if (suggestSaveOpen)   { this.playSound('cancel'); this.el.suggestSaveModal.style.display = 'none'; return; }
            if (viewerOpen)        { this.closeViewerModal(); return; }
            if (settingsOpen)      { this.closeSettingsModal(); return; }
            if (leaderboardOpen)   { this.closeLeaderboard(); return; }
            if (graphOpen)         { this.closeGraph(); return; }
            clearTimeout(this.typingTimer);
            this.clearTypingBuffer();
            return;
        }

        // ── + / -: context-aware stepper ──────────────
        if (e.key === '+' || e.key === '-') {
            e.preventDefault();
            const delta = e.key === '+' ? 1 : -1;
            if (rekkeConfirmOpen) { this.adjustRekkeCount(delta); return; }
            if (viewerOpen)       { this.stepAvgFilter(delta); return; }
            return;
        }

        // ── *: confirm / save (works inside modals too) ─
        if (e.key === '*') {
            e.preventDefault();
            if (rekkeConfirmOpen)  { this.confirmRekkeChange(); return; }
            if (winnerOpen)        { this.saveWinner(); return; }
            if (sessionOpen)       { this.saveSession(); return; }
            if (editSessionOpen)   { this.saveEditedSession(); return; }
            if (deleteOpen)        { this.confirmDelete(); return; }
            if (resetAllOpen)      { this.performResetAll(); return; }
            return;
        }

        // ── Remaining keys: ignore if any modal open ───
        if (anyModal) return;

        // ── /: advance rekke (or log Rekke3 if already on it) ─
        if (e.key === '/') {
            e.preventDefault();
            const order = ['Rekke1', 'Rekke2', 'Rekke3'];
            const idx = order.indexOf(this.slot.currentRekke);
            const nextRekke = order[Math.min(idx + 1, order.length - 1)];
            const btn = [...this.el.rekkeBtns].find(b => b.dataset.rekke === nextRekke);
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
            const btn = [...this.el.themeButtons].find(b => b.dataset.theme === next);
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

                // Undo the first digit directly (bypass oneWay restriction)
                const firstNum = parseInt(firstDigit, 10);
                const firstStr = String(firstNum);
                if (this.slot.selectedNumbers.includes(firstStr)) {
                    this.slot.selectedNumbers = this.slot.selectedNumbers.filter(n => n !== firstStr);
                    const prevBall = [...this.el.balls].find(b => b.textContent.trim() === firstStr);
                    if (prevBall) prevBall.classList.remove('clicked', 'recently-selected', 'last-clicked');
                    if (this._lastClickedBall && this._lastClickedBall.textContent.trim() === firstStr) {
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
                            const ball = [...this.el.balls].find(b => b.textContent.trim() === numStr);
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
            const ballText = ball.textContent.trim();
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
        }
    }

    // ── Export / Import ──────────────────────────────
    exportSessions() {
        const sessions = this.getSessions();
        const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
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
                const imported = JSON.parse(e.target.result);
                if (!Array.isArray(imported)) throw new Error('Ugyldig format');

                const existing  = this.getSessions();
                const existDates = new Set(existing.map(s => s.date));

                // Only add sessions whose date doesn't already exist
                const toAdd = imported.filter(s => !existDates.has(s.date));
                const merged = [...existing, ...toAdd];
                localStorage.setItem('bingoSessions', JSON.stringify(merged));

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
        this.saveSlotToStorage();
        this.applySlotToDOM();
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
        this.updateViewerCounts();
        this.syncFilterUI();
        this.updateViewerAverages();
        this.renderSessionList();
        this.updateViewerModeButtons();
        document.body.style.overflow = 'hidden';
        this.el.viewerModal.style.display = 'flex';
    }

    updateViewerModeButtons() {
        // No-op: edit/delete buttons are now inline per session item
    }

    updateViewerCounts() {
        const sessions = this.getSessions();
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
        localStorage.setItem('bingoAvgFilter', n === null ? '' : String(n));
        this.syncFilterUI();
        this.updateAverages();
        this.updateViewerAverages();
        this.renderSessionList();
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

    updateViewerAverages() {
        if (!this.el.viewerAvg1) return;
        const sessions = this.getSessions();
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

    renderSessionList() {
        const sessions = this.getSessions();
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
                const winnerLines = session.winners.map(w => {
                    const splitText = w.split > 1 ? ` (1/${w.split})` : '';
                    return `🏆 <strong>${w.name}</strong> · ${w.gameName} · ${w.rekke.replace('Rekke','Rekke ')} · ${w.prize} kr${splitText}`;
                }).join('<br>');
                details.innerHTML = winnerLines;
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

        this.el.editSessionModal.style.display = 'flex';
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
        localStorage.setItem('bingoSessions', JSON.stringify(sessions));

        this.closeEditSessionModal();
        this.renderSessionList();
        this.updateAverages();
        this.updateViewerCounts();
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
        const sessions = this.getSessions();
        sessions.splice(this.deletingSessionIdx, 1);
        localStorage.setItem('bingoSessions', JSON.stringify(sessions));
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
        setInterval(tick, 1000);
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

            // Store in localStorage: { src: base64, name, categories }
            const stored = this.getUserSounds();
            stored[key] = { src: base64, name, categories };
            localStorage.setItem('bingoUserSounds', JSON.stringify(stored));

            // Preload into audio pool
            const audio = new Audio(base64);
            audio.preload = 'auto';
            if (!this._audioPool) this._audioPool = {};
            this._audioPool[key] = audio;

            // Inject into relevant dropdowns
            this.injectUserSoundOptions();

            this.closeUploadSoundModal();
            this.playSound('confirm');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    getUserSounds() {
        try { return JSON.parse(localStorage.getItem('bingoUserSounds') || '{}'); }
        catch(e) { return {}; }
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
            overtime:     'setting-overtime-style',
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

    loadUserSoundsIntoPool() {
        const sounds = this.getUserSounds();
        if (!this._audioPool) this._audioPool = {};
        Object.entries(sounds).forEach(([key, data]) => {
            const audio = new Audio(data.src);
            audio.preload = 'auto';
            this._audioPool[key] = audio;
        });
        this.injectUserSoundOptions();
    }

    preloadSounds() {
        const wavs = {
            re4_hover:         RE4_HOVER_WAV,
            re4_hover_loud:    RE4_HOVER_LOUD_WAV,
            re4_cancel:        RE4_CANCEL_WAV,
            re4_cancel_big:    RE4_CANCEL_BIG_WAV,
            re4_select:        RE4_SELECT_WAV,
            re4_select_number: RE4_SELECT_NUMBER_WAV,
            re4_switch:        RE4_SWITCH_WAV,
            re4_switch_2:      RE4_SWITCH_2_WAV,
            click:             CLICK_WAV,
            click_2:           CLICK_2_WAV,
            click_and_hover:   CLICK_AND_HOVER_WAV,
            click_and_hover_2: CLICK_AND_HOVER_2_WAV,
            click_and_hover_3: CLICK_AND_HOVER_3_WAV,
            click_jackpot:     CLICK_JACKPOT_WAV,
            close:             CLOSE_WAV,
            save_confirm_2:    SAVE_CONFIRM_2_WAV,
            overtime:          OVERTIME_WAV,
        };
        if (!this._audioPool) this._audioPool = {};
        Object.entries(wavs).forEach(([key, src]) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            this._audioPool[key] = audio;
        });
    }

    playWav(src, cacheKey, volume = 1.0) {
        if (!this._audioPool) this._audioPool = {};
        let audio = this._audioPool[cacheKey];
        if (!audio) {
            audio = new Audio(src);
            audio.preload = 'auto';
            this._audioPool[cacheKey] = audio;
        }
        // Clone so overlapping plays work (e.g. rapid hover)
        const clone = audio.cloneNode();
        clone.volume = Math.min(1, Math.max(0, volume));
        clone.play().catch(() => {});
    }

    playSound(type) {
        if (!this.settings.soundEnabled) return;
        try {
            // Check if the style for this type is a user-uploaded sound
            const styleKey = {
                hover: 'hoverStyle', call: 'callStyle', select: 'selectStyle',
                switch: 'switchStyle', confirm: 'confirmStyle', cancel: 'cancelStyle',
                reset: 'resetStyle', 'reset-hard': 'resetHardStyle', overtime: 'overtimeStyle',
            }[type];
            if (styleKey) {
                const style = this.settings[styleKey];
                if (style && style.startsWith('user_')) {
                    const sounds = this.getUserSounds();
                    if (sounds[style]) {
                        this.playWav(sounds[style].src, style, this.settings['vol' + styleKey.replace('Style','').replace(/^\w/, c => c.toUpperCase())] || 0.8);
                        return;
                    }
                }
            }
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            const n = ctx.currentTime;
            const D = ctx.destination;
            const s = this.settings;

            // Master gain node for all synth sounds — respects per-type volume
            const masterGain = (vol) => {
                const g = ctx.createGain(); g.gain.value = vol;
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
                const style = this.settings.callStyle;
                if (style === 're4-select-number') { this.playWav(RE4_SELECT_NUMBER_WAV, 're4_select_number', 0.9); return; }
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
                // synth: double chime
                { const md = MD(s.volCall);
                [[880, 0], [660, 0.08]].forEach(([freq, delay]) => {
                    const o = osc('sine', freq); const g = gn();
                    const o2 = osc('sine', freq * 1.5); const g2 = gn();
                    g.gain.setValueAtTime(0, n+delay); g.gain.linearRampToValueAtTime(0.25, n+delay+0.01); g.gain.exponentialRampToValueAtTime(0.001, n+delay+0.4);
                    g2.gain.setValueAtTime(0, n+delay); g2.gain.linearRampToValueAtTime(0.08, n+delay+0.01); g2.gain.exponentialRampToValueAtTime(0.001, n+delay+0.22);
                    o.connect(g); g.connect(md); o2.connect(g2); g2.connect(md);
                    o.start(n+delay); o.stop(n+delay+0.4); o2.start(n+delay); o2.stop(n+delay+0.22);
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
            } else if (type === 'overtime') {
                if (s.overtimeStyle === 'off') return;
                if (s.overtimeStyle === 'custom') { this.playWav(OVERTIME_WAV, 'overtime', s.volOvertime); return; }
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

        const md = ctx.createGain(); md.gain.value = vol; md.connect(D);

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
}

document.addEventListener('DOMContentLoaded', () => new BingoApp());
