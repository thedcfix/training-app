/* ══════════════════════════════════════════════
   FlowFit — player.js
   Spotify-style exercise player with state machine
   Phases: IDLE → ANNOUNCE → COUNTDOWN → EXERCISE → RECOVERY → DONE
   ══════════════════════════════════════════════ */

const FlowPlayer = (() => {
    const COUNTDOWN_SECS = 5;

    // State
    let phase = 'IDLE'; // IDLE | ANNOUNCE | COUNTDOWN | EXERCISE | RECOVERY | DONE
    let remaining = 0;
    let totalSecs = 0;
    let timer = null;
    let exercise = null;
    let onUpdate = null; // callback(phase, remaining, totalSecs, currentRep)
    let currentRep = 0;
    let totalReps = 1;
    let wakeLock = null;

    // ── Wake Lock ────────────────────────────────
    async function _acquireWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                // Re-acquire if page becomes visible again
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            }
        } catch (e) { /* not supported or denied */ }
    }

    async function _releaseWakeLock() {
        if (wakeLock) {
            try { await wakeLock.release(); } catch (e) {}
            wakeLock = null;
        }
    }

    // Re-acquire on visibility change (e.g. user switches tabs and comes back)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && phase !== 'IDLE' && phase !== 'DONE') {
            _acquireWakeLock();
        }
    });

    // ── Timer tick ───────────────────────────────
    function _tick() {
        remaining--;

        if (phase === 'COUNTDOWN') {
            if (remaining > 0) {
                FlowSounds.countdownTick(remaining);
            } else {
                FlowSounds.countdownGo();
                _startExercisePhase();
                return;
            }
        } else if (phase === 'EXERCISE') {
            if (remaining <= 0) {
                FlowSounds.exerciseComplete();
                FlowStorage.addCompletion(exercise.slug, exercise.category, exercise.title, exercise.icon);
                _startRecoveryPhase();
                return;
            }
        } else if (phase === 'RECOVERY') {
            if (remaining <= 0) {
                if (currentRep < totalReps) {
                    _startAnnounceThenCountdown();
                    return;
                }
                _setPhase('DONE', 0, 0);
                _stopTimer();
                _releaseWakeLock();
                _notify();
                return;
            }
        }

        _notify();
    }

    // ── Phase transitions ────────────────────────
    async function _startAnnounceThenCountdown() {
        _stopTimer();
        phase = 'ANNOUNCE';
        remaining = 0;
        totalSecs = 0;
        _notify();

        await FlowSounds.announce(exercise.title);

        // Guard: user may have stopped while we were speaking
        if (phase !== 'ANNOUNCE') return;

        _startCountdownPhase();
    }

    function _startCountdownPhase() {
        currentRep++;
        phase = 'COUNTDOWN';
        remaining = COUNTDOWN_SECS;
        totalSecs = COUNTDOWN_SECS;
        FlowSounds.countdownTick(remaining);
        _notify();
        timer = setInterval(_tick, 1000);
    }

    function _startExercisePhase() {
        totalSecs = exercise.duration;
        remaining = exercise.duration;
        phase = 'EXERCISE';
        _notify();
    }

    function _startRecoveryPhase() {
        const isLastRep = currentRep >= totalReps;
        if (isLastRep || !exercise.recovery || exercise.recovery <= 0) {
            if (isLastRep) {
                _setPhase('DONE', 0, 0);
                _stopTimer();
                _releaseWakeLock();
                _notify();
                return;
            }
            _startAnnounceThenCountdown();
            return;
        }
        totalSecs = exercise.recovery;
        remaining = exercise.recovery;
        phase = 'RECOVERY';
        _notify();
    }

    function _setPhase(p, rem, tot) {
        phase = p;
        remaining = rem;
        totalSecs = tot;
    }

    function _stopTimer() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    function _notify() {
        if (onUpdate) onUpdate(phase, remaining, totalSecs, currentRep);
    }

    /** Start the player for a given exercise object */
    async function start(ex, updateCb) {
        stop();
        exercise = ex;
        onUpdate = updateCb;
        totalReps = ex.repetitions || 1;
        currentRep = 0; // will be incremented in _startCountdownPhase
        FlowSounds.unlock();

        await _acquireWakeLock();
        await _startAnnounceThenCountdown();
    }

    /** Stop / reset */
    function stop() {
        _stopTimer();
        _setPhase('IDLE', 0, 0);
        currentRep = 0;
        _releaseWakeLock();
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        _notify();
    }

    function getPhase() { return phase; }

    return { start, stop, getPhase };
})();
