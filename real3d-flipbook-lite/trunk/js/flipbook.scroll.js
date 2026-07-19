'use strict';

// Scroll view: long-document mode. Uses native browser overflow scroll for
// momentum/fling/accessibility (no iScroll). Pages are sized directly via
// CSS at fit×scale (no transform) so the browser rasterizes images at their
// actual display size — sharp at any zoom.
//
// DOM:
//   .flipbook-bookLayer        (wrapper, holds overlay UI like arrow buttons)
//     .flipbook-scroll-viewport  (overflow: auto — the actual scroll viewport)
//       .book                    (spacer — sized to scaled total content)
//         .flipbook-scroll-content (positioning container for pages)
//           .flipbook-scroll-page * N
//     .flipbook-arrow-prev/next  (siblings of viewport — stay fixed when content scrolls)
//
// Memory: each PageScroll loads its bitmap on visibility-enter and either
// drops it (unload) or downgrades to base tier on visibility-leave, keeping
// memory bounded by the pagesInMemory window. Tier-aware sizing picks
// pageTextureSmall/Medium/Large based on physical pixels of the page at
// current scale × dpr.

FLIPBOOK.BookScroll = class extends FLIPBOOK.Book {
    constructor(el, wrapper, main, options) {
        super(main, options);

        this.options = options;
        this.main = main;
        this.wrapper = wrapper; // .flipbook-bookLayer (NOT scrolled — keeps arrows fixed)
        this.spacer = el; // existing this.book — becomes the size-spacer

        this.pageGap = 8;
        this.scale = 1;
        this.zoom = 1;
        // _committedScale is the scale at which page wrappers / scroller
        // are sized in CSS. zoomTo updates a fast transform on the scroller
        // for live gesture feedback; the settle timer commits the real
        // layout via _applyScale, then resets the transform.
        this._committedScale = 1;
        this.rightIndex = 0;
        this.scrolling = false;
        this.enabled = false;
        this.zoomDisabled = false;
        this._scrollEndTimer = null;

        options.pageGap = this.pageGap;

        this.wrapper.classList.add('flipbook-mode-scroll');

        // Insert a scroll-viewport between bookLayer and the spacer. Only
        // the viewport scrolls — arrow buttons / overlays inside bookLayer
        // stay anchored.
        this.viewport = document.createElement('div');
        this.viewport.className = 'flipbook-scroll-viewport';
        wrapper.insertBefore(this.viewport, this.spacer);
        this.viewport.appendChild(this.spacer);

        // The spacer is the layout box that the browser uses to size scroll.
        this.spacer.classList.remove('book');
        this.spacer.classList.add('flipbook-scroll-spacer');
        this.spacer.style.position = 'relative';

        // Inner content — pages live here, sized directly (no transform).
        this.scroller = document.createElement('div');
        this.scroller.className = 'flipbook-scroll-content';
        this.spacer.appendChild(this.scroller);

        this.pagesArr = [];
        for (let i = 0; i < options.numPages; i++) {
            const page = new FLIPBOOK.PageScroll(this, this.viewport, main, options, i);
            this.scroller.appendChild(page.wrapper);
            page.initObserver(this.viewport);
            this.pagesArr.push(page);
        }

        this._updateBaseSize();
        this._applyScale();

        this._onScroll = this._onScroll.bind(this);
        this.viewport.addEventListener('scroll', this._onScroll, { passive: true });

        this._setupDragScroll();
        this._setupGestureBlock();
        this._setupWheelZoom();

        // Compatibility shims — main fires these to suppress iScroll during
        // text selection. With native scroll the browser handles selection
        // correctly on its own, so they're no-ops.
        this.main.on('disableIScroll', () => {});
        this.main.on('enableIScroll', () => {});

        this.main.on('pageLoaded', function () {});
    }

    // Compute the "fit-to-viewport" page size. options.pageWidth/Height are
    // texture-source dimensions (e.g. 3090×4000) — we use their aspect ratio
    // and fit to the wrapper, so scale=1 means "fits the viewport". Zoom > 1
    // enlarges from there; zoom < 1 shrinks below fit.
    _updateBaseSize() {
        const sourceW = this.options.pageWidth;
        const sourceH = this.options.pageHeight;
        const aspect = sourceW / sourceH;

        const wrapperW = this.viewport.clientWidth || 1;
        const wrapperH = this.viewport.clientHeight || 1;
        const wrapperAspect = wrapperW / wrapperH;

        let fitW, fitH;
        if (this.options.fitToWidth || wrapperAspect < aspect) {
            fitW = wrapperW;
            fitH = wrapperW / aspect;
        } else {
            fitH = wrapperH;
            fitW = wrapperH * aspect;
        }

        if (this.fitW === fitW && this.fitH === fitH) return;
        this.fitW = fitW;
        this.fitH = fitH;
    }

    // Apply current scale by sizing pages directly via CSS — no transform.
    // GPU-stretching a cached transform layer would upsample the image
    // bitmap and produce a blurry result; sizing the layout box directly
    // lets the browser rasterize the image at its native display size.
    _applyScale() {
        const fitW = this.fitW;
        const fitH = this.fitH;
        const scaledFitW = fitW * this.scale;
        const scaledFitH = fitH * this.scale;
        // Gap scales with zoom so the entire content strip is a uniform
        // scaling — required for zoom-to-focal math to stay accurate. If
        // the gap stayed fixed while pages scaled, each page passed would
        // add a (newScale-oldScale)×gap drift to the focal target.
        const scaledGap = this.pageGap * this.scale;
        const totalH = this.options.numPages * scaledFitH + (this.options.numPages + 1) * scaledGap;

        this.pagesArr.forEach((p) => {
            p.wrapper.style.width = scaledFitW + 'px';
            p.wrapper.style.height = scaledFitH + 'px';
            p.wrapper.style.marginBottom = scaledGap + 'px';
            if (p.html) {
                p.html.style.width = (1000 * scaledFitW) / scaledFitH + 'px';
                p.html.style.transform = 'scale(' + scaledFitH / 1000 + ') translateZ(0)';
            }
        });

        this.scroller.style.width = scaledFitW + 'px';
        this.scroller.style.height = totalH + 'px';
        this.scroller.style.paddingTop = scaledGap + 'px';
        this.scroller.style.transform = '';

        this.spacer.style.width = scaledFitW + 'px';
        this.spacer.style.height = totalH + 'px';

        // Center horizontally when content is narrower than the viewport.
        const viewportW = this.viewport.clientWidth;
        if (scaledFitW < viewportW) {
            this.spacer.style.marginLeft = (viewportW - scaledFitW) / 2 + 'px';
        } else {
            this.spacer.style.marginLeft = '0';
        }

        this._committedScale = this.scale;
    }

    // Mouse drag-to-scroll. Touch users get native browser scroll for free,
    // but desktop browsers don't drag-scroll an overflow container — we wire
    // it up here so click-and-drag pans in any direction.
    _setupDragScroll() {
        const viewport = this.viewport;
        let down = false;
        let startX = 0,
            startY = 0,
            startSL = 0,
            startST = 0;
        let moved = false;

        viewport.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('a, button, input, select, textarea')) return;
            // Don't engage drag-scroll on selectable text (textLayer, html
            // pages). The book layer itself is user-select:none, so this only
            // fires for content that opted into selection.
            const us = window.getComputedStyle(e.target).userSelect;
            if (us === 'text' || us === 'all') return;
            down = true;
            moved = false;
            startX = e.clientX;
            startY = e.clientY;
            startSL = viewport.scrollLeft;
            startST = viewport.scrollTop;
            viewport.classList.add('flipbook-grabbing');
        });

        window.addEventListener(
            'mousemove',
            (e) => {
                if (!down) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (!moved && Math.abs(dx) + Math.abs(dy) > 3) moved = true;
                if (moved) {
                    e.preventDefault();
                    viewport.scrollLeft = startSL - dx;
                    viewport.scrollTop = startST - dy;
                }
            },
            { passive: false }
        );

        const stop = () => {
            if (!down) return;
            down = false;
            viewport.classList.remove('flipbook-grabbing');
        };
        window.addEventListener('mouseup', stop);
        window.addEventListener('mouseleave', stop);
    }

    // iOS Safari fires gesturestart/change/end for pinch. Without
    // preventDefault the entire host page zooms instead of just the book.
    // touch-action: pan-x pan-y also helps but iOS Safari is unreliable.
    _setupGestureBlock() {
        const block = (e) => e.preventDefault();
        this.viewport.addEventListener('gesturestart', block);
        this.viewport.addEventListener('gesturechange', block);
        this.viewport.addEventListener('gestureend', block);
    }

    // Trackpad pinch on desktop fires wheel events with ctrlKey:true. We
    // intercept those so the host page doesn't zoom — and route them to
    // Book.zoomTo so the book zooms instead. Plain wheel (no ctrl) keeps
    // its native scroll behavior.
    _setupWheelZoom() {
        const self = this;
        this.viewport.addEventListener(
            'wheel',
            function (e) {
                if (!e.ctrlKey) return;
                e.preventDefault();
                const rect = self.viewport.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
                const newScale = Math.max(
                    self.options.zoomMin2 || 0.15,
                    Math.min(self.options.zoomMax || 4, self.scale * factor)
                );
                self.main.zoom = newScale;
                self.zoomTo(newScale, 0, x, y);
                self.main.onZoom(newScale);
            },
            { passive: false }
        );
    }

    _onScroll() {
        this.scrolling = true;
        this.updateRightIndex();
        clearTimeout(this._scrollEndTimer);
        this._scrollEndTimer = setTimeout(() => {
            this.scrolling = false;
            this.pagesArr.forEach((p) => {
                if (p.visibility > 0) p.load();
            });
        }, 150);
    }

    enable() {
        this.enabled = true;
        this.onResize();
    }

    disable() {
        this.enabled = false;
    }

    onResize() {
        const w = this.main.wrapperW;
        const h = this.main.wrapperH;
        if (w === 0 || h === 0 || (this.w === w && this.h === h)) return;
        this.w = w;
        this.h = h;
        this._updateBaseSize();
        this._applyScale();
        this.updateRightIndex();
    }

    resize() {}

    updateRightIndex() {
        let maxVis = 0;
        let idx = 0;
        this.pagesArr.forEach((page) => {
            if (page.visibility > maxVis) {
                maxVis = page.visibility;
                idx = page.index;
            }
        });
        this.setRightIndex(idx);
    }

    setRightIndex(value) {
        if (value !== this.rightIndex) {
            this.rightIndex = value;
            this.main.turnPageComplete();
            this._gcOutsideWindow();
        }
    }

    // Free bitmaps for pages outside the pagesInMemory window around the
    // current page. Mirrors BookWebGL.unloadPages: keep the current ±N/2
    // pages cached at base tier so quick scroll-back is instant; everything
    // beyond gets dropped. Pages WITHIN the window that are at high tier
    // get downgraded to base instead of fully unloaded — keeps a visible
    // image ready when they re-enter.
    _gcOutsideWindow() {
        const o = this.options;
        const baseSize = o.pageTextureMedium || o.pageTextureSmall;
        const halfWindow = (o.pagesInMemory || 20) / 2;
        const cur = this.rightIndex;
        this.pagesArr.forEach((p) => {
            if (!p.loaded) return;
            if (p.visibility > 0) return;
            const dist = Math.abs(p.index - cur);
            if (dist > halfWindow) {
                p.unload();
            } else if (p.size > baseSize) {
                p._downgradeTo(baseSize);
            }
        });
    }

    goToPage(value, instant) {
        if (!this.enabled) return;

        if (value > this.options.pages.length) value = this.options.pages.length;
        if (this.singlePage || value % 2 !== 0) value--;
        if (isNaN(value) || value < 0) value = 0;
        if (value === this.rightIndex) return;

        const fitH = this.fitH || this.options.pageHeight;
        const scaledGap = this.pageGap * this.scale;
        const targetY = scaledGap + value * (fitH * this.scale + scaledGap);

        if (instant) {
            this.viewport.scrollTop = targetY;
        } else if (typeof this.viewport.scrollTo === 'function') {
            this.viewport.scrollTo({ top: targetY, behavior: 'smooth' });
        } else {
            this.viewport.scrollTop = targetY;
        }

        this.setRightIndex(value);
        this.main.turnPageComplete();
    }

    nextPage(instant) {
        this.goToPage(this.rightIndex + 2, instant);
    }

    prevPage(instant) {
        this.goToPage(this.rightIndex, instant);
    }

    enablePrev(val) {
        this.prevEnabled = val;
    }

    enableNext(val) {
        this.nextEnabled = val;
    }

    isFocusedRight() {
        return this.rightIndex % 2 === 0;
    }

    isFocusedLeft() {
        return this.rightIndex % 2 === 1;
    }

    canFlipNext() {
        return this.rightIndex + 1 < this.options.numPages;
    }

    canFlipPrev() {
        return this.rightIndex > 0;
    }

    // Programmatic zoom. main.zoomTo passes (x, y) in MAIN.WRAPPER coords
    // (it subtracts wrapper.getBoundingClientRect().left/top before calling
    // us). Our viewport is nested below the top menu inside the wrapper,
    // so we need to subtract the viewport's offset within main.wrapper to
    // get a true viewport-relative focal — otherwise the zoom anchors a
    // menu's height too low.
    zoomTo(scale, time, x, y) {
        if (!this.enabled || this.zoomDisabled) return;

        const oldScale = this.scale;
        const zoomMin = this.options.zoomMin2 || 0.15;
        const zoomMax = this.options.zoomMax || 4;
        scale = Math.max(zoomMin, Math.min(zoomMax, scale));
        if (scale === oldScale) return;

        let fx = x;
        let fy = y;
        if (typeof fx === 'number' && typeof fy === 'number' && this.main && this.main.wrapper) {
            const wRect = this.main.wrapper.getBoundingClientRect();
            const vRect = this.viewport.getBoundingClientRect();
            fx -= vRect.left - wRect.left;
            fy -= vRect.top - wRect.top;
        }
        const focalX = typeof fx === 'number' ? fx : this.viewport.clientWidth / 2;
        const focalY = typeof fy === 'number' ? fy : this.viewport.clientHeight / 2;

        // Account for spacer's marginLeft when computing content coords. The
        // spacer may be offset from the viewport origin when narrower than it.
        const marginLeft = parseFloat(this.spacer.style.marginLeft) || 0;
        const sl = this.viewport.scrollLeft;
        const st = this.viewport.scrollTop;

        // Content coordinate of the focal point under old scale.
        const cx = (sl + focalX - marginLeft) / oldScale;
        const cy = (st + focalY) / oldScale;

        this.scale = scale;
        this.zoom = scale;
        // Fast path: keep CSS layout at _committedScale and use a transform
        // on the scroller for live gesture feedback. One GPU op per call vs
        // hundreds of style writes — matches book3's smooth pinch.
        this._applyScaleFast();

        // Restore focal: scrollLeft = cx*scale + newMargin - focalX
        const newMargin = parseFloat(this.spacer.style.marginLeft) || 0;
        const targetSL = cx * scale + newMargin - focalX;
        const targetST = cy * scale - focalY;
        this.viewport.scrollLeft = Math.max(0, targetSL);
        this.viewport.scrollTop = Math.max(0, targetST);

        this.onZoom(scale);

        // After the gesture settles, commit the real CSS layout so images
        // rasterize at the new size (sharp, no transform-stretch blur) and
        // refresh tiers / GC.
        clearTimeout(this._zoomSettleTimer);
        this._zoomSettleTimer = setTimeout(() => {
            this._zoomSettleTimer = null;
            this._commitScale();
            this.pagesArr.forEach((p) => {
                if (p.visibility > 0) p.load();
            });
            this._gcOutsideWindow();
        }, 150);
    }

    // Fast visual update during a zoom gesture: scroller transform-scaled
    // relative to its CSS-laid-out size, spacer resized so native scroll
    // bounds match the new visual extent.
    _applyScaleFast() {
        const fitW = this.fitW;
        const scaledFitW = fitW * this.scale;
        const totalH =
            this.options.numPages * (this.fitH * this.scale) +
            (this.options.numPages + 1) * (this.pageGap * this.scale);

        const factor = this.scale / this._committedScale;
        if (Math.abs(factor - 1) < 1e-6) {
            this.scroller.style.transform = '';
        } else {
            this.scroller.style.transformOrigin = '0 0';
            this.scroller.style.transform = 'scale(' + factor + ')';
        }

        this.spacer.style.width = scaledFitW + 'px';
        this.spacer.style.height = totalH + 'px';

        const viewportW = this.viewport.clientWidth;
        if (scaledFitW < viewportW) {
            this.spacer.style.marginLeft = (viewportW - scaledFitW) / 2 + 'px';
        } else {
            this.spacer.style.marginLeft = '0';
        }
    }

    // Commit the current scale to real CSS layout and clear the transform.
    // Pages get their proper width/height, browser rasterizes images at
    // display size — sharp.
    _commitScale() {
        this.scroller.style.transform = '';
        this._applyScale();
        this._committedScale = this.scale;
    }

    zoomIn(value, time, e) {
        if (e && e.type === 'mousewheel') return;
        this.zoomTo(value, time);
    }

    zoomOut(value) {
        this.zoomTo(value);
    }

    onZoom(zoom) {
        this.options.main.onZoom(zoom);
    }

    onSwipe() {}
    disableFlip() {}
    enableFlip() {}
    enablePan() {}
    disablePan() {}
    updateVisiblePages() {}
};

FLIPBOOK.PageScroll = class {
    constructor(book, bookWrapper, main, options, index) {
        this.rotation = 0;
        this.bookWrapper = bookWrapper;
        this.index = index;
        this.options = options;
        this.main = main;
        this.book = book;
        this.visibility = 0;

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'flipbook-scroll-page flipbook-book-shadow';
        this.wrapper.style.marginBottom = options.pageGap + 'px';
        // wrapper width/height are set by BookScroll._updateBaseSize after
        // computing fit-to-viewport dimensions.

        this.inner = document.createElement('div');
        this.inner.className = 'flipbook-scroll-page-inner';
        this.wrapper.appendChild(this.inner);

        this.bg = document.createElement('div');
        this.bg.className = 'flipbook-scroll-page-bg';
        this.inner.appendChild(this.bg);

        this.html = document.createElement('div');
        this.html.className = 'flipbook-page3-html';
        this.inner.appendChild(this.html);
        // html.style.width / transform are set by BookScroll._updateBaseSize
        // once fit dimensions are known.

        if (options.doublePage) {
            if (this.index % 2 === 0 && this.index > 0) {
                this.html.style.left = '-100%';
            } else {
                this.html.style.left = '0';
            }
        }

        this.preloader = this._createSpinner();
        this.inner.appendChild(this.preloader);
    }

    _createSpinner() {
        // pagePreloader: legacy per-page custom image option.
        if (this.options.pagePreloader) {
            const img = new Image();
            img.src = this.options.pagePreloader;
            img.className = 'flipbook-page-preloader-image';
            return img;
        }
        // Reuse the main flipbook preloader's DOM so a custom
        // options.preloader (or default speeding-wheel) shows the same
        // way per-page as it does at startup.
        const mainPreloader = this.main && this.main.preloader;
        const sourceEl = mainPreloader && mainPreloader.jquery ? mainPreloader[0] : mainPreloader;
        if (sourceEl && sourceEl.cloneNode) {
            const clone = sourceEl.cloneNode(true);
            // Strip startup-only state classes / inline styles.
            clone.classList.remove('flipbook-hidden');
            clone.style.display = '';
            clone.style.position = '';
            return clone;
        }
        // Fallback (constructor ran before main.preloader existed) —
        // build the same DOM the main preloader uses by default.
        const wrap = document.createElement('div');
        wrap.className = 'flipbook-preloader cssload-container';
        const wheel = document.createElement('div');
        wheel.className = 'cssload-speeding-wheel';
        wrap.appendChild(wheel);
        return wrap;
    }

    initObserver(scrollRoot) {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                const visibility = entry.intersectionRatio;
                if (visibility > 0) {
                    this.show(visibility);
                } else {
                    this.hide();
                }
            },
            { root: scrollRoot, threshold: [0, 0.1, 0.5] }
        );
        observer.observe(this.wrapper);
        this._observer = observer;
    }

    show(visibility) {
        this.visibility = visibility;
        if (!this.book.scrolling) this.load();
        if (!this.isVisible) {
            this.bg.style.display = 'block';
            this.html.style.display = 'block';
            this.isVisible = true;
        }
    }

    hide() {
        this.visibility = 0;
        if (this.isVisible) {
            this.bg.style.display = 'none';
            this.html.style.display = 'none';
            this.isVisible = false;
            this.pauseHTML();
        }
        // High-tier (zoomed) bitmaps are heavy. If we're still within the
        // pagesInMemory window, swap down to the base-tier render so the
        // page re-enters with content visible (cheap — pdfservice caches
        // the medium-tier raster). Outside the window, drop everything.
        const baseSize = this.options.pageTextureMedium || this.options.pageTextureSmall;
        if (this.size > baseSize) {
            const halfWindow = (this.options.pagesInMemory || 20) / 2;
            const dist = Math.abs(this.index - this.book.rightIndex);
            if (dist <= halfWindow) {
                this._downgradeTo(baseSize);
            } else {
                this.unload();
            }
        }
    }

    // Replace a higher-tier render with a lower-tier one. Used by hide()
    // and _gcOutsideWindow when a zoomed-in page leaves the viewport but
    // is still within the cache window. The pdfservice has the lower
    // tier cached from earlier so the fetch returns immediately.
    _downgradeTo(size) {
        if (this.size === size) return;
        const self = this;
        const index = this.options.rightToLeft ? this.options.numPages - this.index - 1 : this.index;

        // Mark target tier so any concurrent higher-tier load knows we're
        // not the latest request.
        this.size = size;

        this.options.main.loadPage(index, size, function (page) {
            page = page || {};
            // Higher tier got requested in the meantime — don't downgrade.
            if (self.size > size) return;
            if (!page || !page.image) return;

            let img = page.image[size] || page.image;
            img.classList.add('page-scroll-img');

            if (
                self.index % 2 === 0 &&
                (self.options.pages[index].side === 'left' || self.options.pages[index].side === 'right')
            ) {
                if (!img.clone) {
                    img.clone = new Image();
                    img.clone.src = img.src;
                }
                img = img.clone;
            }

            if (self.options.doublePage && self.index > 0 && self.index % 2 === 0) {
                img.style.left = '-100%';
            }
            if (self.options.doublePage) {
                if (self.index === 0 || (self.index === self.options.pages.length - 1 && self.options.backCover)) {
                    img.style.width = '100%';
                } else {
                    img.style.width = '200%';
                }
            } else {
                img.style.width = '100%';
            }

            const swap = function () {
                if (self.size > size) return;
                self.bg.appendChild(img);
                self.bgImg = img;
                Array.from(self.bg.children).forEach(function (c) {
                    if (c !== img && c.tagName === 'IMG') self.bg.removeChild(c);
                });
            };
            if (typeof img.decode === 'function') img.decode().then(swap, swap);
            else swap();
        });
    }

    unload() {
        if (this.bgImg && this.bgImg.parentNode === this.bg) {
            this.bg.removeChild(this.bgImg);
        }
        this.bgImg = null;
        this.loaded = false;
        this.size = 0;

        // Re-show the spinner so the next entry shows a loader instead of
        // a blank white page.
        if (this.preloader && !this.preloader.parentNode) {
            this.inner.appendChild(this.preloader);
        }
    }

    pauseHTML() {
        const m = this.html.querySelectorAll('video, audio');
        m.forEach((el) => el.pause());
    }

    _pickTier() {
        const o = this.options;
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        // fitH is the visual page height in CSS pixels at scale=1; multiply
        // by current scale and dpr to get the physical pixel target. Falls
        // back to texture-source pageHeight only if fit hasn't been computed
        // yet (very early load, before _updateBaseSize runs).
        const visualPx = (this.book.fitH || o.pageHeight) * (this.book.scale || 1) * dpr;
        const tiers = [o.pageTextureSmall, o.pageTextureMedium, o.pageTextureLarge].filter(Boolean);
        return tiers.find((t) => visualPx < t * 0.9) || o.pageTextureLarge;
    }

    load(callback, thumb) {
        if (this.visibility === 0) return;
        const size = this._pickTier();
        // Already at the target tier — nothing to do. (loaded but at lower
        // tier means the user zoomed in; fall through and re-render.)
        if (this.loaded && this.size >= size) {
            if (callback) callback.call(this);
            return;
        }
        // Keep any existing image visible during the upgrade so the user
        // doesn't see a blank flash; the callback removes every previous
        // <img> in bg once the new tier arrives. We can't capture a single
        // oldImg here because rapid zoom-in can have multiple tier loads in
        // flight, and each callback needs to clean up whatever's currently
        // displayed — not just the original.
        this.loaded = true;
        this.size = size;

        const self = this;
        const index = this.options.rightToLeft ? this.options.numPages - this.index - 1 : this.index;

        this.options.main.loadPage(index, size, function (page) {
            page = page || {};

            // Out-of-order guard: if a higher-tier load was started after
            // this one and finished first, self.size will be > our size.
            // Don't overwrite the better image with a stale lower-tier
            // render.
            if (self.size > size) {
                if (callback) callback.call(self);
                return;
            }

            if (page && page.image) {
                let img = page.image[size] || page.image;
                img.classList.add('page-scroll-img');

                if (
                    self.index % 2 === 0 &&
                    (self.options.pages[index].side === 'left' || self.options.pages[index].side === 'right')
                ) {
                    if (!img.clone) {
                        img.clone = new Image();
                        img.clone.src = img.src;
                    }
                    img = img.clone;
                }

                if (self.options.doublePage && self.index > 0 && self.index % 2 === 0) {
                    img.style.left = '-100%';
                }
                if (self.options.doublePage) {
                    if (self.index === 0 || (self.index === self.options.pages.length - 1 && self.options.backCover)) {
                        img.style.width = '100%';
                    } else {
                        img.style.width = '200%';
                    }
                } else {
                    img.style.width = '100%';
                }

                // Wait for decode before swapping — appending an undecoded
                // <img> shows an empty rect for a frame; decode() resolves
                // when the bitmap is ready to paint, so the swap is seamless.
                const swap = function () {
                    // Re-check the out-of-order guard: a higher-tier load
                    // could have completed while we were decoding.
                    if (self.size > size) return;
                    self.bg.appendChild(img);
                    self.bgImg = img;
                    Array.from(self.bg.children).forEach(function (c) {
                        if (c !== img && c.tagName === 'IMG') self.bg.removeChild(c);
                    });
                    if (self.preloader && self.preloader.parentNode) {
                        self.inner.removeChild(self.preloader);
                    }
                };

                if (typeof img.decode === 'function') {
                    img.decode().then(swap, swap);
                } else {
                    swap();
                }
            }

            if (!thumb) self.loadHTML();
            if (callback) callback.call(self);
        });
    }

    loadHTML() {
        const self = this;
        const index = this.options.rightToLeft ? this.options.numPages - this.index - 1 : this.index;
        if (this.htmlContent) {
            this.updateHtmlContent();
        } else {
            this.options.main.loadPageHTML(index, function (html) {
                self.htmlContent = html;
                self.updateHtmlContent();
            });
        }
    }

    setSize() {
        this.wrapper.style.width = this.options.pageWidth + 'px';
        this.wrapper.style.height = this.options.pageHeight + 'px';
        this.updateHtmlContent();
    }

    updateHtmlContent() {
        let c = this.htmlContent;
        if (c && !this.htmlContentVisible) {
            if (c.jquery) c = c[0];
            this.htmlContentVisible = true;
            this.html.replaceChildren();
            this.html.appendChild(c);
            this.startHTML();
            this.main.trigger('showpagehtml', { page: this });
        }
        this.startHTML();
    }

    startHTML() {
        this.book.startPageItems(this.wrapper);
    }
};
