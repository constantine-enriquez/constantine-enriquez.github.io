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
