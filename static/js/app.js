/* ══════════════════════════════════════════════
   FlowFit — app.js
   SPA router, page renderers, and glue logic
   ══════════════════════════════════════════════ */

(() => {
    const $app = document.getElementById('app');
    const $navItems = document.querySelectorAll('.nav-item');
    let exercisesCache = null;
    let autoStartNext = false;

    // ── Helpers ──────────────────────────────────
    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}`;
    }

    function difficultyBadge(d) {
        const cls = `badge badge-${d}`;
        const labels = { beginner: 'Base', intermediate: 'Medio', advanced: 'Avanzato' };
        return `<span class="${cls}">${labels[d] || d}</span>`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Data fetching ───────────────────────────
    async function fetchExercises() {
        if (exercisesCache) return exercisesCache;
        const res = await fetch('/api/exercises');
        exercisesCache = await res.json();
        return exercisesCache;
    }

    async function fetchExercise(category, slug) {
        const res = await fetch(`/api/exercises/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`);
        if (!res.ok) return null;
        return await res.json();
    }

    // ── Check icon ──────────────────────────────
    function checkSvg() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
    }

    /** Find the next exercise after the given one (across all categories) */
    async function advanceToNext(currentEx) {
        const categories = await fetchExercises();
        const all = categories.flatMap(c => c.exercises);
        const idx = all.findIndex(e => e.category === currentEx.category && e.slug === currentEx.slug);
        if (idx >= 0 && idx < all.length - 1) {
            const next = all[idx + 1];
            location.hash = `#player/${next.category}/${next.slug}`;
        } else {
            // All exercises done — show completion screen
            autoStartNext = false;
            location.hash = '#complete';
        }
    }

    // ══════════════════════════════════════════════
    //  PAGE: Home
    // ══════════════════════════════════════════════
    async function renderHome() {
        const streaks = FlowStorage.getStreaks();
        const categories = await fetchExercises();
        // flatten exercises for quick-start
        const allExercises = categories.flatMap(c => c.exercises);

        $app.innerHTML = `
        <div class="fade-in">
            <div class="hero">
                <div class="hero-logo">FlowFit</div>
                <div class="hero-tagline">Il tuo flusso di allenamento</div>

                <div class="hero-streak-card">
                    <div>
                        <div class="streak-number">${streaks.current}</div>
                        <div class="streak-label">giorni di streak</div>
                    </div>
                    <div class="streak-detail">
                        <div><span class="streak-detail-val">${streaks.best}</span> <span class="streak-label">record</span></div>
                        <div><span class="streak-detail-val">${streaks.total}</span> <span class="streak-label">completati</span></div>
                    </div>
                </div>

                <button class="btn-start-sequence" id="btn-start-seq">▶  Inizia Allenamento</button>
            </div>

            <div class="section-header">
                <span class="section-title">La tua sequenza</span>
                <a href="#exercises" class="section-link">Vedi tutti →</a>
            </div>

            <div class="exercise-list">
                ${allExercises.map((ex, i) => exerciseCard(ex, i + 1)).join('')}
            </div>
        </div>`;

        // Wire up start button
        const $btnSeq = document.getElementById('btn-start-seq');
        if ($btnSeq && allExercises.length > 0) {
            $btnSeq.addEventListener('click', () => {
                const first = allExercises[0];
                location.hash = `#player/${first.category}/${first.slug}`;
            });
        }
    }

    function exerciseCard(ex, seqNum) {
        const done = FlowStorage.isCompletedToday(ex.slug);
        return `
        <div class="exercise-card" data-category="${escapeHtml(ex.category)}" data-slug="${escapeHtml(ex.slug)}">
            ${seqNum ? `<div class="card-seq">${seqNum}</div>` : ''}
            <div class="card-icon">${ex.icon}</div>
            <div class="card-body">
                <div class="card-title">${escapeHtml(ex.title)}</div>
                <div class="card-meta">
                    <span class="card-badge">⏱️ ${ex.duration}s</span>
                    <span class="card-badge">🔁 ${ex.repetitions}x</span>
                    <span class="card-badge">💤 ${ex.recovery}s</span>
                    ${difficultyBadge(ex.difficulty)}
                </div>
            </div>
            <div class="card-check ${done ? 'done' : ''}">
                ${done ? checkSvg() : ''}
            </div>
        </div>`;
    }

    // ══════════════════════════════════════════════
    //  PAGE: Exercises list
    // ══════════════════════════════════════════════
    async function renderExercises() {
        const categories = await fetchExercises();

        let html = `<div class="fade-in">
            <h1 class="page-title">Esercizi</h1>
            <p class="page-subtitle">Scegli un esercizio e inizia il tuo flusso</p>`;

        for (const cat of categories) {
            html += `<div class="category-header">${escapeHtml(cat.name)}</div>`;
            html += `<div class="exercise-list">`;
            for (const ex of cat.exercises) {
                html += exerciseCard(ex);
            }
            html += `</div>`;
        }

        html += `</div>`;
        $app.innerHTML = html;
    }

    // ══════════════════════════════════════════════
    //  PAGE: Player
    // ══════════════════════════════════════════════
    async function renderPlayer(category, slug) {
        const ex = await fetchExercise(category, slug);
        if (!ex) { location.hash = '#exercises'; return; }

        // Determine sequence position
        const categories = await fetchExercises();
        const allExercises = categories.flatMap(c => c.exercises);
        const seqIdx = allExercises.findIndex(e => e.category === category && e.slug === slug);
        const seqTotal = allExercises.length;
        const seqNum = seqIdx >= 0 ? seqIdx + 1 : 0;

        const circumference = 2 * Math.PI * 80; // radius of progress ring

        $app.innerHTML = `
        <div class="player-page fade-in">
            <div class="player-back" id="player-back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Indietro
            </div>

            <div class="player-artwork" id="player-artwork">
                <svg class="progress-ring" id="progress-ring">
                    <circle class="progress-ring__bg" cx="50%" cy="50%" r="80"/>
                    <circle class="progress-ring__fill" id="progress-fill" cx="50%" cy="50%" r="80"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="0"/>
                </svg>
                ${ex.icon}
            </div>

            <div class="player-title">${escapeHtml(ex.title)}</div>
            <div class="player-target">${escapeHtml(ex.target)}</div>
            ${seqNum > 0 ? `<div class="player-seq-info">Esercizio ${seqNum} di ${seqTotal}</div>` : ''}
            <div class="player-reps" id="player-reps">${ex.repetitions > 1 ? `Ripetizione <span id="current-rep">1</span> / ${ex.repetitions}` : ''}</div>
            <div class="player-phase" id="player-phase"></div>
            <div class="player-timer" id="player-timer">--</div>

            <div class="player-controls">
                <button class="btn-stop" id="btn-stop" title="Stop">
                    <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                </button>
                <button class="btn-play paused" id="btn-play" title="Play">
                    <svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>
                </button>
            </div>

            <details class="player-instructions" open>
                <summary>Istruzioni</summary>
                <div class="body-html">${ex.body_html}</div>
            </details>
        </div>`;

        // ── Player wiring ──
        const $artwork  = document.getElementById('player-artwork');
        const $phase    = document.getElementById('player-phase');
        const $timer    = document.getElementById('player-timer');
        const $fill     = document.getElementById('progress-fill');
        const $btnPlay  = document.getElementById('btn-play');
        const $btnStop  = document.getElementById('btn-stop');
        const $back     = document.getElementById('player-back');

        const playSvg  = '<svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>';
        const pauseSvg = '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>';

        let started = false;

        function onUpdate(phase, remaining, totalSecs, currentRep) {
            // Phase label
            const labels = {
                IDLE:      '',
                ANNOUNCE:  '<span class="phase-announce">🎙 Annuncio…</span>',
                COUNTDOWN: '<span class="phase-countdown">Preparati…</span>',
                EXERCISE:  '<span class="phase-exercise">Esercizio</span>',
                RECOVERY:  '<span class="phase-recovery">Recupero</span>',
                DONE:      '<span class="phase-done">✓ Completato!</span>',
            };
            $phase.innerHTML = labels[phase] || '';

            // Timer
            if (phase === 'IDLE')      $timer.textContent = '--';
            else if (phase === 'ANNOUNCE') $timer.textContent = '🎙';
            else if (phase === 'DONE') $timer.textContent = '🎉';
            else                       $timer.textContent = formatTime(remaining);

            // Progress ring
            if (totalSecs > 0) {
                const pct = remaining / totalSecs;
                $fill.style.strokeDashoffset = (1 - pct) * circumference;
            } else {
                $fill.style.strokeDashoffset = 0;
            }

            // Artwork classes
            $artwork.classList.remove('playing', 'countdown-phase', 'recovery-phase', 'announce-phase');
            if (phase === 'ANNOUNCE')     $artwork.classList.add('announce-phase');
            else if (phase === 'COUNTDOWN')    $artwork.classList.add('countdown-phase');
            else if (phase === 'EXERCISE') $artwork.classList.add('playing');
            else if (phase === 'RECOVERY') $artwork.classList.add('recovery-phase');

            // Update rep counter
            const $repSpan = document.getElementById('current-rep');
            if ($repSpan && currentRep > 0) {
                $repSpan.textContent = currentRep;
            }

            // Button state
            if (phase === 'DONE' || phase === 'IDLE') {
                $btnPlay.innerHTML = playSvg;
                $btnPlay.classList.add('paused');
                started = false;
            }

            // Auto-advance to next exercise when fully done
            if (phase === 'DONE') {
                autoStartNext = true;
                setTimeout(() => advanceToNext(ex), 2000);
            }
        }

        $btnPlay.addEventListener('click', async () => {
            if (!started) {
                started = true;
                $btnPlay.innerHTML = pauseSvg;
                $btnPlay.classList.remove('paused');
                await FlowPlayer.start(ex, onUpdate);
            }
        });

        $btnStop.addEventListener('click', () => {
            FlowPlayer.stop();
            onUpdate('IDLE', 0, 0);
        });

        $back.addEventListener('click', () => {
            FlowPlayer.stop();
            autoStartNext = false;
            history.back();
        });

        // Auto-start if coming from a previous exercise
        if (autoStartNext) {
            autoStartNext = false;
            started = true;
            $btnPlay.innerHTML = pauseSvg;
            $btnPlay.classList.remove('paused');
            FlowPlayer.start(ex, onUpdate);
        }
    }

    // ══════════════════════════════════════════════
    //  PAGE: Dashboard
    // ══════════════════════════════════════════════
    function renderDashboard() {
        const streaks  = FlowStorage.getStreaks();
        const byDate   = FlowStorage.countByDate();
        const today    = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const recent   = FlowStorage.getRecent(50).filter(c => c.date === todayStr);

        // Current displayed month (mutable via nav buttons)
        let calYear  = today.getFullYear();
        let calMonth = today.getMonth(); // 0-based

        const dayLabels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
        const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                            'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

        function buildMonthDays(year, month) {
            const days = [];
            const firstDay = new Date(year, month, 1);
            // Day of week (0=Sun) → shift to Mon-based
            let startDow = firstDay.getDay();
            startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0 … Sun=6

            // Pad with empty cells before the 1st
            for (let i = 0; i < startDow; i++) days.push(null);

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const count = byDate[ds] || 0;
                const isFuture = new Date(year, month, d) > today;
                const isToday = ds === todayStr;
                let level = 0;
                if (count >= 4) level = 4;
                else if (count >= 3) level = 3;
                else if (count >= 2) level = 2;
                else if (count >= 1) level = 1;
                days.push({ ds, count, level, isFuture, isToday });
            }
            return days;
        }

        function renderCalendar() {
            const calDays = buildMonthDays(calYear, calMonth);
            const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();
            const $calGrid = document.getElementById('cal-grid');
            const $calLabel = document.getElementById('cal-month-label');
            const $btnNext = document.getElementById('cal-next');

            $calLabel.textContent = `${monthNames[calMonth]} ${calYear}`;
            // Disable "next" if we're on the current month
            $btnNext.disabled = isCurrentMonth;
            $btnNext.style.opacity = isCurrentMonth ? '0.3' : '1';

            $calGrid.innerHTML =
                dayLabels.map(l => `<div class="cal-day-label">${l}</div>`).join('') +
                calDays.map(d => {
                    if (d === null) return '<div class="cal-cell empty"></div>';
                    let cls = 'cal-cell';
                    if (d.isFuture) cls += ' future';
                    else if (d.level > 0) cls += ` level-${d.level}`;
                    else if (!d.isToday) cls += ' no-activity';
                    if (d.isToday) cls += ' today';
                    return `<div class="${cls}" title="${d.ds}: ${d.count} esercizi"><span class="cal-day-num">${new Date(d.ds + 'T00:00').getDate()}</span></div>`;
                }).join('');
        }

        $app.innerHTML = `
        <div class="fade-in">
            <h1 class="page-title">Progressi</h1>
            <p class="page-subtitle">Il tuo percorso di allenamento</p>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value streak-color">${streaks.current}</div>
                    <div class="stat-label">Streak attuale</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value primary-color">${streaks.best}</div>
                    <div class="stat-label">Record streak</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value secondary-color">${streaks.total}</div>
                    <div class="stat-label">Completati</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value red-color">${Object.keys(byDate).length}</div>
                    <div class="stat-label">Giorni attivi</div>
                </div>
            </div>

            <div class="calendar-section">
                <div class="cal-nav">
                    <button class="cal-nav-btn" id="cal-prev">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <span class="cal-month-label" id="cal-month-label"></span>
                    <button class="cal-nav-btn" id="cal-next">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                </div>
                <div class="calendar-grid" id="cal-grid"></div>
                <div class="cal-legend">
                    <div class="cal-legend-item"><span class="cal-legend-dot dot-none"></span> Riposo</div>
                    <div class="cal-legend-item"><span class="cal-legend-dot dot-active"></span> Allenamento</div>
                </div>
            </div>

            <div class="section-header">
                <span class="section-title">Completati oggi</span>
            </div>

            ${recent.length === 0
                ? `<div class="empty-state">
                       <div class="empty-state-icon">🏃</div>
                       <div class="empty-state-text">Nessun esercizio completato oggi.<br>Inizia il tuo primo flusso!</div>
                   </div>`
                : `<div class="recent-list">
                    ${recent.map(c => `
                        <div class="recent-item">
                            <span class="recent-icon">${c.icon}</span>
                            <div class="recent-body">
                                <div class="recent-title">${escapeHtml(c.title)}</div>
                                <div class="recent-date">${new Date(c.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>
                    `).join('')}
                   </div>`
            }
        </div>`;

        // Initial render
        renderCalendar();

        // Nav buttons
        document.getElementById('cal-prev').addEventListener('click', () => {
            calMonth--;
            if (calMonth < 0) { calMonth = 11; calYear--; }
            renderCalendar();
        });
        document.getElementById('cal-next').addEventListener('click', () => {
            const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();
            if (isCurrentMonth) return;
            calMonth++;
            if (calMonth > 11) { calMonth = 0; calYear++; }
            renderCalendar();
        });
    }

    // ══════════════════════════════════════════════
    //  PAGE: Workout Complete
    // ══════════════════════════════════════════════
    function renderComplete() {
        const streaks = FlowStorage.getStreaks();
        const todayCount = FlowStorage.getRecent(50).filter(c => c.date === new Date().toISOString().slice(0, 10)).length;

        $app.innerHTML = `
        <div class="complete-page fade-in">
            <div class="complete-icon">🎉</div>
            <h1 class="complete-title">Allenamento Completato!</h1>
            <p class="complete-subtitle">Ottimo lavoro, hai completato tutti gli esercizi</p>

            <div class="complete-stats">
                <div class="complete-stat">
                    <div class="complete-stat-value">${todayCount}</div>
                    <div class="complete-stat-label">Esercizi oggi</div>
                </div>
                <div class="complete-stat">
                    <div class="complete-stat-value streak-color">${streaks.current}</div>
                    <div class="complete-stat-label">Giorni di streak</div>
                </div>
                <div class="complete-stat">
                    <div class="complete-stat-value">${streaks.total}</div>
                    <div class="complete-stat-label">Totale completati</div>
                </div>
            </div>

            <button class="btn-start-sequence" onclick="location.hash='#home'">← Torna alla Home</button>
        </div>`;
    }

    // ══════════════════════════════════════════════
    //  ROUTER
    // ══════════════════════════════════════════════
    function route() {
        const hash = location.hash || '#home';
        const parts = hash.slice(1).split('/');
        const page = parts[0];

        // Update nav active state
        $navItems.forEach(n => {
            n.classList.toggle('active', n.dataset.page === page || (page === 'player' && n.dataset.page === 'exercises'));
        });

        // Stop any running player when navigating away
        if (page !== 'player') FlowPlayer.stop();

        switch (page) {
            case 'home':
                renderHome();
                break;
            case 'exercises':
                renderExercises();
                break;
            case 'player':
                // #player/category/slug
                if (parts.length >= 3) {
                    renderPlayer(parts[1], parts[2]);
                } else {
                    location.hash = '#exercises';
                }
                break;
            case 'dashboard':
                renderDashboard();
                break;
            case 'complete':
                renderComplete();
                break;
            default:
                renderHome();
        }
    }

    // ── Delegated click handler for exercise cards ──
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.exercise-card');
        if (card) {
            const cat = card.dataset.category;
            const slug = card.dataset.slug;
            location.hash = `#player/${cat}/${slug}`;
        }
    });

    // ── Init ──
    window.addEventListener('hashchange', route);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', route);
    } else {
        route();
    }

    // ── Register Service Worker ──
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/sw.js').catch(() => {});
    }
})();
