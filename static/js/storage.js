/* ══════════════════════════════════════════════
   FlowFit — storage.js
   LocalStorage module for completions & streaks
   ══════════════════════════════════════════════ */

const FlowStorage = (() => {
    const STORAGE_KEY = 'flowfit_data';

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* corrupted data, reset */ }
        return { completions: [] };
    }

    function _save(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function _dateStr(d) {
        return d.toISOString().slice(0, 10);
    }

    function _today() {
        return _dateStr(new Date());
    }

    /** Record a completed exercise */
    function addCompletion(slug, category, title, icon) {
        const data = _load();
        data.completions.push({
            slug,
            category,
            title: title || slug,
            icon: icon || '💪',
            date: _today(),
            timestamp: Date.now(),
        });
        _save(data);
    }

    /** Check if exercise was completed today */
    function isCompletedToday(slug) {
        const data = _load();
        const today = _today();
        return data.completions.some(c => c.slug === slug && c.date === today);
    }

    /** Get all completions */
    function getCompletions() {
        return _load().completions;
    }

    /** Count completions per date => { '2026-04-18': 3, ... } */
    function countByDate() {
        const map = {};
        for (const c of _load().completions) {
            map[c.date] = (map[c.date] || 0) + 1;
        }
        return map;
    }

    /** Calculate streaks */
    function getStreaks() {
        const byDate = countByDate();
        const dates = Object.keys(byDate).sort();
        if (dates.length === 0) return { current: 0, best: 0, total: 0, lastDate: null };

        const total = _load().completions.length;
        let best = 1, current = 1;
        const today = _today();
        const yesterday = _dateStr(new Date(Date.now() - 86400000));

        // Walk backwards from the most recent date
        for (let i = dates.length - 1; i > 0; i--) {
            const d = new Date(dates[i]);
            const prev = new Date(dates[i - 1]);
            const diffDays = Math.round((d - prev) / 86400000);
            if (diffDays === 1) {
                current++;
            } else {
                break;
            }
        }

        // Compute best streak
        let streak = 1;
        for (let i = 1; i < dates.length; i++) {
            const d = new Date(dates[i]);
            const prev = new Date(dates[i - 1]);
            const diffDays = Math.round((d - prev) / 86400000);
            if (diffDays === 1) {
                streak++;
                if (streak > best) best = streak;
            } else {
                streak = 1;
            }
        }
        if (dates.length === 1) best = 1;

        const lastDate = dates[dates.length - 1];
        // If last activity is not today or yesterday, streak resets
        if (lastDate !== today && lastDate !== yesterday) {
            current = 0;
        }

        return { current, best, total, lastDate };
    }

    /** Get recent completions (last N) */
    function getRecent(n = 10) {
        const data = _load();
        return data.completions.slice(-n).reverse();
    }

    return { addCompletion, isCompletedToday, getCompletions, countByDate, getStreaks, getRecent };
})();
