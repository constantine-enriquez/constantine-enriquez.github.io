(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------------
       Mobile menu
       --------------------------------------------------------------- */
    const toggle = document.querySelector('.nav-toggle');
    const links = document.getElementById('nav-links');
    if (toggle && links) {
        const setOpen = (open) => {
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            links.classList.toggle('is-open', open);
        };
        toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
        links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
        // Close if the screen grows past the mobile breakpoint (iPad rotation)
        window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
    }

    /* Nav border once the page scrolls */
    const nav = document.querySelector('.nav');
    const onScrollNav = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 8);

    /* ---------------------------------------------------------------
       Parallax (desktop only): name drifts slower than the page
       --------------------------------------------------------------- */
    const parallaxEls = [...document.querySelectorAll('[data-parallax]')];
    const wideLandscape = window.matchMedia('(min-width: 900px) and (orientation: landscape), (min-width: 1101px)');
    let ticking = false;

    const applyParallax = () => {
        ticking = false;
        const y = Math.min(window.scrollY, window.innerHeight * 1.2);
        parallaxEls.forEach((el) => {
            const speed = wideLandscape.matches && !reduceMotion ? parseFloat(el.dataset.parallax) : 0;
            el.style.transform = speed ? `translate3d(0, ${(y * speed).toFixed(1)}px, 0)` : '';
        });
    };

    window.addEventListener('scroll', () => {
        onScrollNav();
        if (!ticking && parallaxEls.length) {
            ticking = true;
            requestAnimationFrame(applyParallax);
        }
    }, { passive: true });
    wideLandscape.addEventListener('change', applyParallax);

    onScrollNav();

    /* ---------------------------------------------------------------
       Scroll effects. Everything here is skipped for reduced motion.
       Uses the `translate` property so it never fights the CSS
       entrance animations, which use `transform`.
       --------------------------------------------------------------- */
    if (!reduceMotion) {
        const root = document.documentElement;
        const hero = document.querySelector('.hero');
        const heroName = document.querySelector('.hero-name');
        const heroPhoto = document.querySelector('.hero-photo');
        const heroPic = heroPhoto && heroPhoto.querySelector('picture');
        const devices = [...document.querySelectorAll('.devices')];
        const timelines = [...document.querySelectorAll('.timeline')];
        const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
        let queued = false;

        const update = () => {
            queued = false;
            const vh = window.innerHeight;

            // 1. Hero depth: name rises, photo lifts a little, map sinks
            if (hero) {
                const h = hero.offsetHeight;
                const p = clamp(window.scrollY / h, 0, 1);
                if (p < 1 || hero.dataset.p !== '1') {
                    if (heroName) heroName.style.translate = `0 ${(-p * 70).toFixed(1)}px`;
                    if (heroPic) heroPic.style.translate = `0 ${(-p * 30).toFixed(1)}px`;
                    if (heroPhoto) heroPhoto.style.setProperty('--map-y', `${(p * 90).toFixed(1)}px`);
                    hero.dataset.p = p >= 1 ? '1' : '0';
                }
            }

            // 2. Mockups: the phone glides up past the laptop
            devices.forEach((d) => {
                const r = d.getBoundingClientRect();
                if (r.bottom < -100 || r.top > vh + 100) return;
                const t = clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1); // -1 above centre, 1 below
                const phone = d.querySelector('.phone');
                if (phone) phone.style.translate = `0 ${(t * 36).toFixed(1)}px`;
            });

            // 3. Timeline rail fills as you read down it
            timelines.forEach((tl) => {
                const r = tl.getBoundingClientRect();
                const f = clamp((vh * 0.6 - r.top) / r.height, 0, 1);
                tl.style.setProperty('--tl-fill', f.toFixed(3));
            });
        };
        const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
        window.addEventListener('scroll', queue, { passive: true });
        window.addEventListener('resize', queue);
        root.classList.add('fx');
        update();

        if ('IntersectionObserver' in window) {
            // 4. Red heading bars draw in from the left
            const bars = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    e.target.classList.add('is-drawn');
                    bars.unobserve(e.target);
                });
            }, { rootMargin: '0px 0px -15% 0px' });
            document.querySelectorAll('.section-title, .page-title').forEach((el) => bars.observe(el));

            // 5. Numbers count up once ("17k", "500"); years and single digits stay put
            const counters = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    counters.unobserve(e.target);
                    const node = e.target.firstChild;
                    const m = node && node.nodeType === 3 && node.textContent.match(/^(\d+)(\D*)$/);
                    if (!m) return;
                    const end = parseInt(m[1], 10), unit = m[2];
                    if (end < 10 || (end >= 1900 && end <= 2100 && !unit)) return;
                    const start = performance.now(), dur = 1300;
                    const step = (now) => {
                        const k = clamp((now - start) / dur, 0, 1);
                        const eased = 1 - Math.pow(1 - k, 3);
                        node.textContent = Math.round(end * eased) + unit;
                        if (k < 1) requestAnimationFrame(step);
                    };
                    node.textContent = '0' + unit;
                    requestAnimationFrame(step);
                });
            }, { threshold: 0.6 });
            document.querySelectorAll('.stat-num').forEach((el) => counters.observe(el));
        }
    }

    /* ---------- Promo videos: muted autoplay while on screen ----------
       Plays only while at least half visible (saves data + battery on phones),
       never autoplays for people who prefer reduced motion. */
    document.querySelectorAll('.promo').forEach((promo) => {
        const video = promo.querySelector('video');
        const playBtn = promo.querySelector('.promo-play');
        const soundBtn = promo.querySelector('.promo-sound');
        if (!video) return;
        video.controls = false;          // native controls are the no-JS fallback
        promo.classList.add('is-enhanced');
        let userPaused = reduceMotion;

        const sync = () => {
            promo.classList.toggle('is-playing', !video.paused);
            if (playBtn) {
                playBtn.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
                playBtn.innerHTML = `<i class="fas fa-${video.paused ? 'play' : 'pause'}" aria-hidden="true"></i>`;
            }
            if (soundBtn) {
                soundBtn.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
                soundBtn.setAttribute('aria-pressed', String(!video.muted));
                soundBtn.innerHTML = `<i class="fas fa-volume-${video.muted ? 'xmark' : 'high'}" aria-hidden="true"></i>`;
            }
        };
        const tryPlay = () => { const p = video.play(); if (p) p.catch(() => sync()); };

        video.addEventListener('play', sync);
        video.addEventListener('pause', sync);
        video.addEventListener('volumechange', sync);

        const toggle = () => {
            if (video.paused) { userPaused = false; tryPlay(); }
            else { userPaused = true; video.pause(); }
        };
        if (playBtn) playBtn.addEventListener('click', toggle);
        video.addEventListener('click', toggle);
        if (soundBtn) soundBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            if (!video.muted && video.paused) { userPaused = false; tryPlay(); }
        });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !userPaused) tryPlay();
                    else if (!entry.isIntersecting && !video.paused) video.pause();
                });
            }, { threshold: 0.5 }).observe(promo);
        }
        sync();
    });
})();
