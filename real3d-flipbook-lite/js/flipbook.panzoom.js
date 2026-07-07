'use strict';

// Lightweight pan + programmatic zoom for Book3 (3d/2d view modes).
// Replaces iScroll for these modes. Pinch zoom, double-tap zoom and wheel zoom
// are handled in flipbook.js touchSwipe — this class only:
//  - applies transform: translate3d() scale() to the scroller element
//  - lets the user drag to pan when zoom > 1
//  - clamps pan so content stays in view
//  - exposes the iScroll API surface Book3 already uses (zoom, refresh, on,
//    enable/disable, scrollTo, scale, x, y, maxScrollX/Y, options, initiated)
FLIPBOOK.PanZoom = class {
    constructor(wrapperEl, options) {
        this.wrapper = wrapperEl;
        this.scroller = wrapperEl.firstElementChild;
        // `book` is the element PanZoom sizes in scroll-mode. Defaults
        // to the wrapper's first child (legacy single-element layout)
        // but the host can pass an explicit `book` if it nests deeper
        // (e.g. book3's wrapper > panOuter > book chain to keep the
        // sized + overflow-clipped element off the direct child of
        // viewport — iOS' axis-lock heuristic is sensitive to that).
        this.book = (options && options.book) ? options.book : this.scroller;

        // Scroll-mode (option-driven): when caller passes `scaledChild`
        // and `naturalWidth`/`naturalHeight`, PanZoom delegates pan to
        // native overflow:auto scroll on the wrapper once scaled
        // content overflows. The book's CSS width/height is sized to
        // the scaled visual extent (so wrapper.scrollWidth/scrollHeight
        // match what the user sees); the visual scale is applied to
        // `scaledChild` (an inner element) instead of book itself.
        this.scaledChild = options && options.scaledChild ? options.scaledChild : null;
        this._naturalWidth = options && options.naturalWidth ? options.naturalWidth : 0;
        this._naturalHeight = options && options.naturalHeight ? options.naturalHeight : 0;

        this.options = Object.assign(
            {
                zoomMin: 1,
                zoomMax: 4,
            },
            options || {}
        );

        this.scale = 1;
        this.x = 0;
        this.y = 0;
        this.maxScrollX = 0;
        this.maxScrollY = 0;
        this.initiated = false;

        this._enabled = true;
        this._dragging = false;
        this._activePointer = null;
        this._listeners = {};

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);

        this.wrapper.addEventListener('pointerdown', this._onPointerDown);
        // Move/up listeners on window so the drag survives the cursor leaving
        // the wrapper (matches iScroll behavior).
        window.addEventListener('pointermove', this._onPointerMove);
        window.addEventListener('pointerup', this._onPointerUp);
        window.addEventListener('pointercancel', this._onPointerUp);

        // Touch-driven scroll-mode pan via touch events. iOS handles
        // touch events unambiguously regardless of touch-action;
        // pointer events can have edge cases around the touch-action:
        // none boundary. Pinch zoom is still handled by main.touchSwipe
        // (also touch events) — the two coexist via finger-count
        // checks in _onTouchStart. Gated on naturalWidth — only
        // hosts that opt into scroll-mode pan (book3) provide it.
        if (this._naturalWidth) {
            this._onTouchStart = this._onTouchStart.bind(this);
            this._onTouchMove = this._onTouchMove.bind(this);
            this._onTouchEnd = this._onTouchEnd.bind(this);
            this.wrapper.addEventListener('touchstart', this._onTouchStart, { passive: false });
            this.wrapper.addEventListener('touchmove', this._onTouchMove, { passive: false });
            this.wrapper.addEventListener('touchend', this._onTouchEnd);
            this.wrapper.addEventListener('touchcancel', this._onTouchEnd);
        }

        // iOS-specific: prevent native page-zoom from gesture events. touchSwipe
        // already handles pinch via main.zoomTo, so we just stop the default
        // browser behavior here.
        this._onGesture = (e) => e.preventDefault();
        this.wrapper.addEventListener('gesturestart', this._onGesture);
        this.wrapper.addEventListener('gesturechange', this._onGesture);
        this.wrapper.addEventListener('gestureend', this._onGesture);

        this._apply();
    }

    _isScrollMode() {
        if (!this._naturalWidth) return false;
        const cw = this._naturalWidth * this.scale;
        const ch = this._naturalHeight * this.scale;
        const pw = this.wrapper.clientWidth;
        const ph = this.wrapper.clientHeight;
        return cw > pw + 1 || ch > ph + 1;
    }

    // External setter for view changes (single ↔ spread) so PanZoom
    // re-evaluates scroll-mode against the new natural dimensions.
    setNaturalSize(w, h) {
        if (this._naturalWidth === w && this._naturalHeight === h) return;
        this._naturalWidth = w;
        this._naturalHeight = h;
        this._clamp();
        this._apply();
    }

    _onTouchStart(e) {
        if (!this._enabled || !this._isScrollMode()) return;
        // Only track single-finger pan; pinch (2+ fingers) is handled
        // by main.touchSwipe → main.zoomTo. If a 2nd finger drops
        // mid-pan, abort our pan tracking too.
        if (e.touches.length > 1) {
            this._touchPanning = false;
            return;
        }
        const t = e.touches[0];
        if (t.target && t.target.closest && t.target.closest('a, button, input, select, textarea')) return;
        // Cancel any in-flight momentum so the user grabs current pos.
        if (this._momentumRaf) {
            cancelAnimationFrame(this._momentumRaf);
            this._momentumRaf = null;
        }
        this._touchPanning = true;
        this._touchId = t.identifier;
        this._startClientX = t.clientX;
        this._startClientY = t.clientY;
        this._lastClientX = t.clientX;
        this._lastClientY = t.clientY;
        this._lastMoveTime = performance.now();
        this._velocityX = 0;
        this._velocityY = 0;
        this._startPanX = this.x;
        this._startPanY = this.y;
    }

    _onTouchMove(e) {
        if (!this._touchPanning) return;
        if (e.touches.length > 1) {
            // Pinch started during pan — bail; main.touchSwipe takes over.
            this._touchPanning = false;
            return;
        }
        const t = Array.from(e.touches).find((tt) => tt.identifier === this._touchId);
        if (!t) return;
        // preventDefault suppresses any iOS gesture that might still
        // try to engage (touch-action: none on the touched descendant
        // should already block it, but defense in depth).
        e.preventDefault();
        // Pan via this.x/y (translate). Sign matches finger direction:
        // finger right → x increases → content shifts right with finger.
        this.x = this._startPanX + (t.clientX - this._startClientX);
        this.y = this._startPanY + (t.clientY - this._startClientY);
        this._clamp();
        this._apply();
        // Track velocity (low-pass-filtered for stability).
        const now = performance.now();
        const dt = now - this._lastMoveTime;
        if (dt > 0) {
            const vxNew = (t.clientX - this._lastClientX) / dt;
            const vyNew = (t.clientY - this._lastClientY) / dt;
            this._velocityX = vxNew * 0.7 + this._velocityX * 0.3;
            this._velocityY = vyNew * 0.7 + this._velocityY * 0.3;
        }
        this._lastClientX = t.clientX;
        this._lastClientY = t.clientY;
        this._lastMoveTime = now;
    }

    _onTouchEnd(e) {
        if (!this._touchPanning) return;
        // If our tracked finger is still down (i.e. only a non-tracked
        // finger lifted), keep panning.
        const stillTouching = Array.from(e.touches).some((t) => t.identifier === this._touchId);
        if (stillTouching) return;
        this._touchPanning = false;
        const speed = Math.hypot(this._velocityX, this._velocityY);
        if (speed > 0.3) this._startMomentum();
    }

    _onPointerDown(e) {
        if (!this._enabled) return;

        // Non-primary touch (second finger of a pinch) — bail. iOS may
        // not reliably fire pointerup for these.
        if (e.pointerType === 'touch' && e.isPrimary === false) {
            this._dragging = false;
            this._activePointer = null;
            return;
        }

        if (this._isScrollMode()) {
            // Mouse drag-pan in scroll-mode. Touch is handled separately
            // by _onTouchStart/Move/End — touch events are more reliable
            // on iOS than pointer events around the touch-action: none
            // boundary, and the dedicated handlers also avoid pointer-
            // event interactions with main.touchSwipe.
            if (e.pointerType !== 'mouse') return;
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('a, button, input, select, textarea')) return;
            const us = window.getComputedStyle(e.target).userSelect;
            if (us === 'text' || us === 'all') return;
            if (this._momentumRaf) {
                cancelAnimationFrame(this._momentumRaf);
                this._momentumRaf = null;
            }
            this._dragging = true;
            this._scrollDrag = true;
            this._activePointer = e.pointerId;
            this._startClientX = e.clientX;
            this._startClientY = e.clientY;
            this._lastClientX = e.clientX;
            this._lastClientY = e.clientY;
            this._lastMoveTime = performance.now();
            this._velocityX = 0;
            this._velocityY = 0;
            this._startPanX = this.x;
            this._startPanY = this.y;
            this.wrapper.classList.add('flipbook-grabbing');
            return;
        }

        // Engage pan once scale is above fit. zoomMin is the fit-to-
        // viewport scale (book3 sets it to ratio × main.zoomMin), not 1.
        // Comparing against an absolute 1 broke pan on small viewports
        // where ratio < 1 — e.g. iPhone portrait with a double-page book
        // ratio ≈ 0.27 → users had to + four times before pan engaged.
        const minPanScale = this.options.zoomMin || 0;
        if (this.scale <= minPanScale + 1e-6) return;

        // Don't hijack interaction with links/form controls.
        if (e.target.closest && e.target.closest('a, button, input, select, textarea')) {
            return;
        }

        this._dragging = true;
        this._activePointer = e.pointerId;
        this._startClientX = e.clientX;
        this._startClientY = e.clientY;
        this._startPanX = this.x;
        this._startPanY = this.y;
        this.initiated = true;
    }

    _onPointerMove(e) {
        if (!this._dragging || e.pointerId !== this._activePointer) return;
        // Mouse drag in scroll-mode and transform-mode pan share the
        // same translate-based update. Velocity is tracked only in
        // scroll-mode (for momentum on release).
        this.x = this._startPanX + (e.clientX - this._startClientX);
        this.y = this._startPanY + (e.clientY - this._startClientY);
        this._clamp();
        this._apply();
        if (this._scrollDrag) {
            const now = performance.now();
            const dt = now - this._lastMoveTime;
            if (dt > 0) {
                const vxNew = (e.clientX - this._lastClientX) / dt;
                const vyNew = (e.clientY - this._lastClientY) / dt;
                this._velocityX = vxNew * 0.7 + this._velocityX * 0.3;
                this._velocityY = vyNew * 0.7 + this._velocityY * 0.3;
            }
            this._lastClientX = e.clientX;
            this._lastClientY = e.clientY;
            this._lastMoveTime = now;
        }
    }

    _onPointerUp(e) {
        if (e.pointerId === this._activePointer) {
            this._dragging = false;
            if (this._scrollDrag) {
                this._scrollDrag = false;
                this.wrapper.classList.remove('flipbook-grabbing');
                // Release-with-velocity → momentum animation. Threshold
                // avoids unintentional drift on near-stationary release.
                const speed = Math.hypot(this._velocityX, this._velocityY);
                if (speed > 0.3) this._startMomentum();
            }
            this._activePointer = null;
        }
    }

    // JS momentum animation. Replicates native scroll inertia after a
    // flick — frame-rate-independent friction decay, stops below
    // minSpeed threshold. Updates this.x/y → _apply translates the
    // book via GPU-composited transform (smooth on iOS).
    _startMomentum() {
        let vx = this._velocityX;
        let vy = this._velocityY;
        let lastTime = performance.now();
        const friction = 0.95; // per 16ms frame; lower = quicker stop
        const minSpeed = 0.05; // px/ms — below this, snap to rest

        const tick = () => {
            const now = performance.now();
            const dt = now - lastTime;
            lastTime = now;
            const decay = Math.pow(friction, dt / 16);
            vx *= decay;
            vy *= decay;
            this.x += vx * dt;
            this.y += vy * dt;
            this._clamp();
            this._apply();
            if (Math.hypot(vx, vy) > minSpeed) {
                this._momentumRaf = requestAnimationFrame(tick);
            } else {
                this._momentumRaf = null;
            }
        };
        this._momentumRaf = requestAnimationFrame(tick);
    }

    _clamp() {
        const pw = this.wrapper.clientWidth;
        const ph = this.wrapper.clientHeight;
        // Use _naturalWidth so cw matches visual extent regardless of
        // whether book is currently sized natural (transform-mode) or
        // scaled (scroll-mode where book.offsetWidth = scaled).
        const naturalW = this._naturalWidth || (this.book ? this.book.offsetWidth : 0);
        const naturalH = this._naturalHeight || (this.book ? this.book.offsetHeight : 0);
        const cw = naturalW * this.scale;
        const ch = naturalH * this.scale;

        // x/y is the translate amount that centers/positions the book.
        // In transform-mode at fit, that's (pw-cw)/2. In scroll-mode this
        // branch isn't taken (cw > pw → else branch), so the centering
        // value is harmless; _applyScroll's writeback canonicalizes any
        // carryover.
        if (cw <= pw) {
            this.x = (pw - cw) / 2;
            this.maxScrollX = 0;
        } else {
            this.maxScrollX = pw - cw;
            this.x = Math.max(this.maxScrollX, Math.min(0, this.x));
        }

        if (ch <= ph) {
            this.y = (ph - ch) / 2;
            this.maxScrollY = 0;
        } else {
            this.maxScrollY = ph - ch;
            this.y = Math.max(this.maxScrollY, Math.min(0, this.y));
        }
    }

    _apply() {
        // GPU-composited transform pan. Splits scale (on scaledChild)
        // and translate (on book) when host provides scaledChild —
        // gives book3 a separate hook for translateX page-focus on
        // centerContainer without fighting our scale. When no
        // scaledChild, fall back to combined translate+scale on book
        // (legacy/swipe usage).
        var minPan = this.options.zoomMin || 0;
        var beyondFit = this.scale > minPan + 1e-6;

        if (this.scaledChild) {
            this.scaledChild.style.transformOrigin = '0 0';
            this.scaledChild.style.transform = 'scale(' + this.scale + ') translateZ(0)';
            this.book.style.transformOrigin = '0 0';
            this.book.style.transform = beyondFit
                ? 'translate3d(' + this.x + 'px, ' + this.y + 'px, 0)'
                : 'translate(' + this.x + 'px, ' + this.y + 'px)';
        } else {
            this.book.style.transformOrigin = '0 0';
            this.book.style.transform = beyondFit
                ? 'translate3d(' + this.x + 'px, ' + this.y + 'px, 0) scale(' + this.scale + ')'
                : 'translate(' + this.x + 'px, ' + this.y + 'px) scale(' + this.scale + ')';
        }

        // Toggle scroll-mode class for CSS (touch-action: none kicks in
        // when zoomed beyond fit, so iOS doesn't engage native pan and
        // axis-lock on user-select:text descendants).
        if (this._isScrollMode()) {
            this.wrapper.classList.add('flipbook-pan-scroll');
        } else {
            this.wrapper.classList.remove('flipbook-pan-scroll');
        }
    }

    on(name, fn) {
        if (!this._listeners[name]) this._listeners[name] = [];
        this._listeners[name].push(fn);
    }

    _emit(name) {
        const list = this._listeners[name];
        if (list) list.forEach((fn) => fn());
    }

    // Programmatic zoom. (x, y) are viewport coordinates of the zoom origin
    // (e.g. mouse cursor or pinch center). When time > 0, animates the
    // transition (scale + pan) using FLIPBOOK.animate.
    zoom(scale, x, y, time) {
        scale = Math.max(this.options.zoomMin, Math.min(this.options.zoomMax, scale));
        const prevScale = this.scale;

        let targetX = this.x;
        let targetY = this.y;
        if (x != null && y != null && prevScale > 0) {
            const rect = this.wrapper.getBoundingClientRect();
            const px = x - rect.left;
            const py = y - rect.top;
            const ratio = scale / prevScale;
            targetX = px - (px - this.x) * ratio;
            targetY = py - (py - this.y) * ratio;
        }

        // Pre-clamp target to valid bounds at the END scale, so the animation
        // interpolates between two visually-correct positions without the
        // mid-animation force-center / overflow-clamp discontinuity that
        // causes sliding artifacts.
        const pw = this.wrapper.clientWidth;
        const ph = this.wrapper.clientHeight;
        const naturalW = this._naturalWidth || (this.book ? this.book.offsetWidth : 0);
        const naturalH = this._naturalHeight || (this.book ? this.book.offsetHeight : 0);
        const cw = naturalW * scale;
        const ch = naturalH * scale;
        if (cw <= pw) targetX = (pw - cw) / 2;
        else targetX = Math.max(pw - cw, Math.min(0, targetX));
        if (ch <= ph) targetY = (ph - ch) / 2;
        else targetY = Math.max(ph - ch, Math.min(0, targetY));

        if (this._zoomAnim) {
            this._zoomAnim.stop();
            this._zoomAnim = null;
        }

        if (time && time > 0 && FLIPBOOK.animate) {
            const startScale = this.scale;
            const startX = this.x;
            const startY = this.y;
            const dScale = scale - startScale;
            const dX = targetX - startX;
            const dY = targetY - startY;
            this._zoomAnim = FLIPBOOK.animate({
                from: 0,
                to: 1,
                duration: time,
                easing: 'easeOutQuad',
                step: (t) => {
                    // No _clamp during animation: both endpoints are pre-clamped,
                    // so interpolation stays in valid territory without jumps.
                    this.scale = startScale + dScale * t;
                    this.x = startX + dX * t;
                    this.y = startY + dY * t;
                    this._apply();
                },
                complete: () => {
                    this._zoomAnim = null;
                    this.scale = scale;
                    this.x = targetX;
                    this.y = targetY;
                    this._clamp(); // final clamp + maxScrollX/Y update
                    this._apply();
                    this._emit('zoomEnd');
                },
            });
        } else {
            this.scale = scale;
            this.x = targetX;
            this.y = targetY;
            this._clamp();
            this._apply();
            this._emit('zoomEnd');
        }
    }

    scrollTo(x, y, time) {
        this.x = x;
        this.y = y;
        this._clamp();
        this._apply();
    }

    refresh() {
        this._clamp();
        this._apply();
    }

    enable() {
        this._enabled = true;
    }

    disable() {
        this._enabled = false;
        this._dragging = false;
        this._activePointer = null;
        this.initiated = false;
    }

    destroy() {
        this.wrapper.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        window.removeEventListener('pointercancel', this._onPointerUp);
        this.wrapper.removeEventListener('gesturestart', this._onGesture);
        this.wrapper.removeEventListener('gesturechange', this._onGesture);
        this.wrapper.removeEventListener('gestureend', this._onGesture);
        if (this._naturalWidth) {
            this.wrapper.removeEventListener('touchstart', this._onTouchStart);
            this.wrapper.removeEventListener('touchmove', this._onTouchMove);
            this.wrapper.removeEventListener('touchend', this._onTouchEnd);
            this.wrapper.removeEventListener('touchcancel', this._onTouchEnd);
        }
        if (this._momentumRaf) {
            cancelAnimationFrame(this._momentumRaf);
            this._momentumRaf = null;
        }
    }
};
