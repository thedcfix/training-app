/* ══════════════════════════════════════════════
   FlowFit — sounds.js
   Web Audio API sound generators
   ══════════════════════════════════════════════ */

const FlowSounds = (() => {
    let ctx = null;

    function _getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    /**
     * Countdown tick — rising-pitch beep each second
     * @param {number} remaining  seconds left (5→1), pitch rises as it approaches 0
     */
    function countdownTick(remaining) {
        const ac = _getCtx();
        const t = ac.currentTime;
        // Pitch: 440Hz at 5 → 880Hz at 1
        const freq = 440 + (5 - remaining) * 110;

        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    /** Final countdown beep (the last "GO!") */
    function countdownGo() {
        const ac = _getCtx();
        const t = ac.currentTime;

        // Two-tone chime
        [880, 1320].forEach((freq, i) => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.08);
            gain.gain.setValueAtTime(0.35, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.3);
            osc.connect(gain).connect(ac.destination);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.3);
        });
    }

    /** Exercise complete — achievement chime */
    function exerciseComplete() {
        const ac = _getCtx();
        const t = ac.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6

        notes.forEach((freq, i) => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + i * 0.12);
            gain.gain.setValueAtTime(0.25, t + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.5);
            osc.connect(gain).connect(ac.destination);
            osc.start(t + i * 0.12);
            osc.stop(t + i * 0.12 + 0.5);
        });
    }

    /** Recovery tick — soft metronome */
    function recoveryTick() {
        const ac = _getCtx();
        const t = ac.currentTime;

        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    /** Recovery complete — two gentle tones */
    function recoveryComplete() {
        const ac = _getCtx();
        const t = ac.currentTime;

        [392, 523.25].forEach((freq, i) => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.15);
            gain.gain.setValueAtTime(0.2, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.4);
            osc.connect(gain).connect(ac.destination);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.4);
        });
    }

    /** Ensure AudioContext is unlocked (call on first user gesture) */
    function unlock() {
        _getCtx();
    }

    return { countdownTick, countdownGo, exerciseComplete, recoveryTick, recoveryComplete, unlock };
})();
