const DIFFICULTY_CONFIG = {
    mudah: {
        initialTime: 45,
        minStay: 1100,
        maxStay: 1500
    },
    normal: {
        initialTime: 30,
        minStay: 750,
        maxStay: 1150
    },
    sulit: {
        initialTime: 25,
        minStay: 480,
        maxStay: 780
    }
};

const STORAGE_KEY_BEST = 'whackamole_best_score';
const STORAGE_KEY_SOUND = 'whackamole_sound_on';

const landingScreen = document.getElementById('landing-screen');
const gameScreen = document.getElementById('game-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const headerHighScoreEl = document.getElementById('header-high-score');
const soundToggleBtn = document.getElementById('sound-toggle');
const soundLabelEl = document.getElementById('sound-label');

const diffButtons = [...document.querySelectorAll('.diff-btn')];
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const quitBtn = document.getElementById('quit-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseMenuBtn = document.getElementById('pause-menu-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

const scoreValEl = document.getElementById('score-val');
const timeLeftEl = document.getElementById('time-left');
const timerBoxEl = document.getElementById('timer-box');
const comboValEl = document.getElementById('combo-val');

const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const molesHitEl = document.getElementById('moles-hit');
const hitAccuracyEl = document.getElementById('hit-accuracy');
const newRecordBanner = document.getElementById('new-record-banner');

const holes = [...document.querySelectorAll('.hole')];
const cursor = document.getElementById('hammer-cursor');

const smashSound = new Audio('assets/smash.mp3');
smashSound.preload = 'auto';

let currentState = 'landing'; // 'landing' | 'playing' | 'paused' | 'gameover'
let selectedDifficulty = 'normal';
let soundEnabled = true;
let bestScore = 0;

let score = 0;
let timeLeft = 30;
let combo = 0;
let molesWhacked = 0;
let totalSwings = 0;

let activeHoleIndex = -1;
let lastHoleIndex = -1;
let moleWhackedInHole = false;
let moleTimerId = null;
let hideWhackedTimerId = null;
let countdownIntervalId = null;

function loadPreferences() {
    try {
        const savedBest = parseInt(localStorage.getItem(STORAGE_KEY_BEST), 10);
        if (!Number.isNaN(savedBest) && savedBest > 0) {
            bestScore = savedBest;
        }
        const savedSound = localStorage.getItem(STORAGE_KEY_SOUND);
        if (savedSound !== null) {
            soundEnabled = savedSound === 'true';
        }
    } catch (_) {
        bestScore = 0;
    }
    updateHeaderBest();
    updateSoundUI();
}

function saveBestScore(newBest) {
    bestScore = newBest;
    try {
        localStorage.setItem(STORAGE_KEY_BEST, String(bestScore));
    } catch (_) {
        // Ignore storage errors in private mode
    }
    updateHeaderBest();
}

function updateHeaderBest() {
    if (headerHighScoreEl) {
        headerHighScoreEl.textContent = String(bestScore);
    }
}

function updateSoundUI() {
    if (!soundToggleBtn || !soundLabelEl) return;
    soundToggleBtn.setAttribute('aria-pressed', String(soundEnabled));
    soundLabelEl.textContent = soundEnabled ? 'Suara: ON' : 'Suara: OFF';
}

function playSmashSound() {
    if (!soundEnabled) return;
    try {
        smashSound.currentTime = 0;
        const playPromise = smashSound.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    } catch (_) {
        // Ignore audio playback errors
    }
}

function clearTimers() {
    if (moleTimerId) {
        clearTimeout(moleTimerId);
        moleTimerId = null;
    }
    if (hideWhackedTimerId) {
        clearTimeout(hideWhackedTimerId);
        hideWhackedTimerId = null;
    }
    if (countdownIntervalId) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
    }
}

function clearActiveMole() {
    holes.forEach(hole => {
        const moleImg = hole.querySelector('.mole');
        if (moleImg) {
            moleImg.remove();
        }
    });
    activeHoleIndex = -1;
    moleWhackedInHole = false;
}

function setPlayingClass(isPlaying) {
    if (isPlaying) {
        document.body.classList.add('playing-active');
    } else {
        document.body.classList.remove('playing-active');
    }
}

function updateHud() {
    if (scoreValEl) scoreValEl.textContent = String(score);
    if (timeLeftEl) timeLeftEl.textContent = String(timeLeft);
    if (comboValEl) comboValEl.textContent = `${combo}x`;
    if (timerBoxEl) {
        if (timeLeft <= 5) {
            timerBoxEl.classList.add('urgent');
        } else {
            timerBoxEl.classList.remove('urgent');
        }
    }
}

function showFloatingFeedback(hole, text) {
    const badge = document.createElement('span');
    badge.className = 'pop-score';
    badge.textContent = text;
    hole.appendChild(badge);
    setTimeout(() => {
        if (badge.parentNode) {
            badge.remove();
        }
    }, 550);
}

function pickRandomHoleIndex() {
    if (holes.length <= 1) return 0;
    let idx = Math.floor(Math.random() * holes.length);
    while (idx === lastHoleIndex) {
        idx = Math.floor(Math.random() * holes.length);
    }
    lastHoleIndex = idx;
    return idx;
}

function spawnMole() {
    if (currentState !== 'playing') return;

    clearActiveMole();

    const idx = pickRandomHoleIndex();
    const hole = holes[idx];
    if (!hole) return;

    activeHoleIndex = idx;
    moleWhackedInHole = false;

    const img = document.createElement('img');
    img.className = 'mole';
    img.src = 'assets/mole.png';
    img.alt = 'Tikus tanah muncul';
    img.width = 110;
    img.height = 136;
    hole.appendChild(img);

    const cfg = DIFFICULTY_CONFIG[selectedDifficulty] || DIFFICULTY_CONFIG.normal;
    const stayTime = Math.floor(cfg.minStay + Math.random() * (cfg.maxStay - cfg.minStay));

    moleTimerId = setTimeout(() => {
        if (currentState !== 'playing') return;
        // Mole escaped without being whacked
        combo = 0;
        updateHud();
        clearActiveMole();
        spawnMole();
    }, stayTime);
}

function handleHoleWhack(index) {
    if (currentState !== 'playing') return;

    const hole = holes[index];
    if (!hole) return;

    totalSwings += 1;

    // Trigger hammer swing visual on keyboard or click
    if (cursor) {
        cursor.classList.add('active');
        setTimeout(() => cursor.classList.remove('active'), 110);
    }

    if (index === activeHoleIndex && !moleWhackedInHole) {
        moleWhackedInHole = true;
        if (moleTimerId) {
            clearTimeout(moleTimerId);
            moleTimerId = null;
        }

        molesWhacked += 1;
        combo += 1;

        let pointsEarned = 10;
        let feedbackText = '+10';

        if (combo > 0 && combo % 3 === 0) {
            pointsEarned += 5;
            timeLeft += 1;
            feedbackText = '+15 (+1d)';
        }

        score += pointsEarned;
        if (score > bestScore) {
            saveBestScore(score);
        }

        playSmashSound();
        updateHud();
        showFloatingFeedback(hole, feedbackText);

        const moleImg = hole.querySelector('.mole');
        if (moleImg) {
            moleImg.src = 'assets/mole-whacked.png';
            moleImg.alt = 'Tikus tanah terpukul';
        }

        hideWhackedTimerId = setTimeout(() => {
            if (currentState !== 'playing') return;
            clearActiveMole();
            spawnMole();
        }, 320);
    } else {
        // Missed swing resets combo
        combo = 0;
        updateHud();
    }
}

function startCountdown() {
    if (countdownIntervalId) {
        clearInterval(countdownIntervalId);
    }
    countdownIntervalId = setInterval(() => {
        if (currentState !== 'playing') return;
        timeLeft -= 1;
        updateHud();
        if (timeLeft <= 0) {
            timeLeft = 0;
            updateHud();
            endGame();
        }
    }, 1000);
}

function startGame() {
    clearTimers();
    clearActiveMole();

    const cfg = DIFFICULTY_CONFIG[selectedDifficulty] || DIFFICULTY_CONFIG.normal;
    score = 0;
    timeLeft = cfg.initialTime;
    combo = 0;
    molesWhacked = 0;
    totalSwings = 0;

    currentState = 'playing';
    updateHud();

    landingScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    setPlayingClass(true);
    spawnMole();
    startCountdown();
}

function pauseGame() {
    if (currentState !== 'playing') return;
    currentState = 'paused';
    clearTimers();
    clearActiveMole();
    setPlayingClass(false);
    pauseScreen.classList.remove('hidden');
    if (resumeBtn) resumeBtn.focus();
}

function resumeGame() {
    if (currentState !== 'paused') return;
    currentState = 'playing';
    pauseScreen.classList.add('hidden');
    setPlayingClass(true);
    spawnMole();
    startCountdown();
}

function showLandingScreen() {
    clearTimers();
    clearActiveMole();
    currentState = 'landing';
    setPlayingClass(false);

    gameScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    landingScreen.classList.remove('hidden');

    if (startBtn) startBtn.focus();
}

function endGame() {
    clearTimers();
    clearActiveMole();
    currentState = 'gameover';
    setPlayingClass(false);

    const isNewRecord = score > 0 && score >= bestScore;
    if (score > bestScore) {
        saveBestScore(score);
    }

    const accuracy = totalSwings > 0
        ? Math.round((molesWhacked / totalSwings) * 100)
        : 0;

    if (finalScoreEl) finalScoreEl.textContent = String(score);
    if (bestScoreEl) bestScoreEl.textContent = String(bestScore);
    if (molesHitEl) molesHitEl.textContent = String(molesWhacked);
    if (hitAccuracyEl) hitAccuracyEl.textContent = `${accuracy}%`;

    if (newRecordBanner) {
        if (isNewRecord) {
            newRecordBanner.classList.remove('hidden');
        } else {
            newRecordBanner.classList.add('hidden');
        }
    }

    gameOverScreen.classList.remove('hidden');
    if (restartBtn) restartBtn.focus();
}

function restartGame() {
    startGame();
}

// Event Listeners
diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const diff = btn.getAttribute('data-difficulty');
        if (!diff || !DIFFICULTY_CONFIG[diff]) return;
        selectedDifficulty = diff;
        diffButtons.forEach(b => {
            const isSelected = b === btn;
            b.classList.toggle('active', isSelected);
            b.setAttribute('aria-pressed', String(isSelected));
        });
    });
});

if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        try {
            localStorage.setItem(STORAGE_KEY_SOUND, String(soundEnabled));
        } catch (_) {
            // Ignore storage errors
        }
        updateSoundUI();
    });
}

if (startBtn) startBtn.addEventListener('click', startGame);
if (pauseBtn) pauseBtn.addEventListener('click', pauseGame);
if (quitBtn) quitBtn.addEventListener('click', showLandingScreen);
if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
if (pauseMenuBtn) pauseMenuBtn.addEventListener('click', showLandingScreen);
if (restartBtn) restartBtn.addEventListener('click', startGame);
if (homeBtn) homeBtn.addEventListener('click', showLandingScreen);

holes.forEach((hole, idx) => {
    hole.addEventListener('click', () => {
        handleHoleWhack(idx);
    });
});

// Keyboard accessibility (1-9 for holes, Escape for pause)
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (currentState === 'playing') {
            e.preventDefault();
            pauseGame();
        } else if (currentState === 'paused') {
            e.preventDefault();
            resumeGame();
        }
        return;
    }

    if (currentState === 'playing') {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
            e.preventDefault();
            handleHoleWhack(num - 1);
        }
    }
});

// Custom Hammer Cursor Tracking
window.addEventListener('mousemove', e => {
    if (!cursor) return;
    cursor.style.top = `${e.clientY}px`;
    cursor.style.left = `${e.clientX}px`;
});

window.addEventListener('mousedown', () => {
    if (cursor) cursor.classList.add('active');
});

window.addEventListener('mouseup', () => {
    if (cursor) cursor.classList.remove('active');
});

// Initialize on load (starts on Landing Screen)
loadPreferences();
