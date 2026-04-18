/* ══════════════════════════════════════════════
   FlowFit — player.js
   Spotify-style exercise player with state machine
   Phases: IDLE → COUNTDOWN → EXERCISE → RECOVERY → DONE
   ══════════════════════════════════════════════ */

const FlowPlayer = (() => {
    const COUNTDOWN_SECS = 5;

    // State
    let phase = 'IDLE'; // IDLE | COUNTDOWN | EXERCISE | RECOVERY | DONE
    let remaining = 0;
    let totalSecs = 0;
    let timer = null;
    let exercise = null;
    let onUpdate = null; // callback(phase, remaining, totalSecs, currentRep)
    let currentRep = 0;
    let totalReps = 1;

    function _tick() {
        remaining--;

        if (phase === 'COUNTDOWN') {
            if (remaining > 0) {
                FlowSounds.countdownTick(remaining);
            } else {
                // Countdown finished → start exercise
                FlowSounds.countdownGo();
                _startExercisePhase();
                return;
            }
        } else if (phase === 'EXERCISE') {
            if (remaining <= 0) {
                FlowSounds.exerciseComplete();
                // Record completion
                FlowStorage.addCompletion(exercise.slug, exercise.category, exercise.title, exercise.icon);
                _startRecoveryPhase();
                return;
            }
        } else if (phase === 'RECOVERY') {
            if (remaining <= 0) {
                // Check if more reps remain
                if (currentRep < totalReps) {
                    _startCountdownPhase();
                    return;
                }
                _setPhase('DONE', 0, 0);
                _stopTimer();
                return;
            }
        }

        _notify();
    }

    function _startCountdownPhase() {
        currentRep++;
        phase = 'COUNTDOWN';
        remaining = COUNTDOWN_SECS;
        totalSecs = COUNTDOWN_SECS;
        FlowSounds.countdownTick(remaining);
        _notify();
    }

    function _startExercisePhase() {
        totalSecs = exercise.duration;
        remaining = exercise.duration;
        phase = 'EXERCISE';
        _notify();
    }

    function _startRecoveryPhase() {
        // Skip recovery after last rep
        const isLastRep = currentRep >= totalReps;
        if (isLastRep || !exercise.recovery || exercise.recovery <= 0) {
            if (isLastRep) {
                _setPhase('DONE', 0, 0);
                _stopTimer();
                return;
            }
            // Not last rep but no recovery — go straight to next countdown
            _startCountdownPhase();
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
    function start(ex, updateCb) {
        stop();
        exercise = ex;
        onUpdate = updateCb;
        totalReps = ex.repetitions || 1;
        currentRep = 1;
        FlowSounds.unlock();

        // Start countdown
        phase = 'COUNTDOWN';
        remaining = COUNTDOWN_SECS;
        totalSecs = COUNTDOWN_SECS;
        FlowSounds.countdownTick(remaining);
        _notify();

        timer = setInterval(_tick, 1000);
    }

    /** Stop / reset */
    function stop() {
        _stopTimer();
        _setPhase('IDLE', 0, 0);
        currentRep = 0;
        _notify();
    }

    function getPhase() { return phase; }

    return { start, stop, getPhase };
})();
