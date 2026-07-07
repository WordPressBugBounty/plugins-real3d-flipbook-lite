'use strict';

/**BookSwipe — three-slide carousel with PanZoom for per-slide pinch-zoom + pan */

FLIPBOOK.BookSwipe = class extends FLIPBOOK.Book {
    constructor(el, wrapper, main, options) {
        super(main, options);

        if (this.singlePage) this.view = 1;

        // Decouple book layout coordinates from texture size, matching book3.
        // Without this, pageWidth/pageHeight inherit the full texture
        // dimension (e.g. 3090×4000 for high-tier PDFs) — iOS then allocates
        // compositor backing stores per slide-inner at that size, blowing
        // the GPU memory budget after a few swipes. PanZoom scales the book
        // visually; the IMG inside still renders at full pageTextureLarge.
        const aspect = options.pageWidth / options.pageHeight;
        options.pageHeight = 1000;
        options.pageWidth = Math.round(1000 * aspect);
        this.pageWidth = options.pageWidth;
        this.pageHeight = options.pageHeight;

        // Default texture tier for fit (unzoomed) navigation. PageSwipe.load
        // reads this so spreads load at small tier instead of always pulling
        // pageTextureLarge — without it, each IMG is ~50MB raw RGBA and the
        // working set (3 carousel slides × 2 pages × N preloads) exhausts
        // GPU/raster budgets after 10-20 swipes. Upgraded to pageTextureLarge
        // in onZoom() when the user pinches in; PageSwipe.load() then swaps
        // the smaller bitmap out (book3-style).
        this.targetTier = options.pageTextureSmall || options.pageTextureLarge;

        this.slides = [];
        this.pagesArr = [];
        this.leftPage = 0;
        this.rightPage = 0;
        this.rotation = 0;

        this.prevPageEnabled = false;

        this.setRightIndex(options.rightToLeft ? options.pages.length : 0);

        this.currentSlide = 0;
        this.flipping = false;

        this.wrapper = wrapper;

        this.scroller = el;
        this.scroller.classList.remove('book');
        this.scroller.classList.add('flipbook-carousel-scroller');

        this._outerAnimating = false;
        this._outerSwipeEnabled = true;
        this._outerT = null;
        this._repositioning = false;

        this.zoomDisabled = false;

        for (let i = 0; i < 3; i++) {
            const slide = document.createElement('div');
            slide.className = 'flipbook-carousel-slide';

            const slideInner = document.createElement('div');
            slideInner.className = 'slide-inner flipbook-book-shadow';

            slide.appendChild(slideInner);
            this.scroller.appendChild(slide);

            slide.pages = [];
            this.slides.push(slide);
        }

        for (let i = 0; i < 3; i++) {
            // Field name kept as `iscroll` to avoid churn at call-sites; backed
            // by PanZoom (no IScroll dependency). Pass-through behaviour at
            // scale ≤ zoomMin is intrinsic to PanZoom — pointer events bubble
            // up to the outer carousel swipe naturally because PanZoom's
            // _onPointerDown returns early when scale is at the fit minimum.
            this.slides[i].iscroll = new FLIPBOOK.PanZoom(this.slides[i], {
                zoomMin: options.zoomMin || 1,
                zoomMax: options.zoomMax || 4,
            });

            this.slides[i].iscroll.on('zoomEnd', () => {
                // Schedule real-size commit 150ms after each PanZoom settles.
                // Scheduling from zoomTo (start of animation) would fire mid-
                // animation for animated zooms (time > 0) and flicker.
                clearTimeout(this._commitTimer);
                this._commitTimer = setTimeout(() => {
                    this._commitTimer = null;
                    this._commitRealSize();
                }, 150);
            });
        }

        this._realScalePages = [];

        this.resizeInnerSlides();

        options.pages.forEach((page, index) => {
            if (!page.empty) {
                const newPage = new FLIPBOOK.PageSwipe(this, index, page.src, page.htmlContent);
                this.pagesArr.push(newPage);
                if (options.loadAllPages) newPage.load();
            }
        });

        this.flipEnabled = true;
        this.nextEnabled = true;
        this.prevEnabled = true;

        main.on('enableIScroll', () => this.enableIscroll());
        main.on('disableIScroll', () => this.disableIscroll());

        main.on('pageLoaded', function (_) {});

        this.onResize(true);
    }

    /* ---------------- Outer transform helpers ---------------- */

    _setOuterTransition(on, ms = 0) {
        this.scroller.style.transition = on ? `transform ${ms}ms ease` : 'none';
    }

    _setOuterX(px) {
        this.scroller.style.transform = `translate3d(${px}px,0,0)`;
    }

    _slideW() {
        return this.main.wrapperW || this.wrapper.clientWidth || 0;
    }

    _xForSlide(i) {
        return -i * this._slideW();
    }

    _animateToSlide(i, ms, done) {
        if (this._outerAnimating) return;

        this._outerAnimating = true;
        this.flipping = true;
        this.wrapper.style.pointerEvents = 'none';

        this._setOuterTransition(true, ms);
        this._setOuterX(this._xForSlide(i));

        const end = (ev) => {
            if (ev && ev.target !== this.scroller) return;
            this.scroller.removeEventListener('transitionend', end);

            clearTimeout(this._outerT);
            this._outerT = null;

            this._outerAnimating = false;
            this.flipping = false;
            this.wrapper.style.pointerEvents = '';

            done && done();
        };

        this.scroller.addEventListener('transitionend', end);

        clearTimeout(this._outerT);
        this._outerT = setTimeout(() => {
            this.scroller.removeEventListener('transitionend', end);
            end();
        }, ms + 80);
    }

    /* ---------------- Swipe handler ---------------- */

    onSwipe(event, phase, distanceX, distanceY, duration, fingerCount) {
        if (!this.enabled) return;
        if (this.zoom > 1) return;
        if (phase.startsWith('pinch')) return;
        if (!this.flipEnabled) return;
        if (!this._outerSwipeEnabled) return;
        if (this._outerAnimating || this.flipping) return;

        const w = this._slideW();
        if (!w) return;

        if (
            (phase === 'move' || phase === 'end' || phase === 'cancel') &&
            Math.abs(distanceY) > Math.abs(distanceX) &&
            Math.abs(distanceY) > 10
        ) {
            return;
        }

        if (phase === 'start') {
            this.disablePan();
            this._setOuterTransition(false);
            this._setOuterX(this._xForSlide(this.currentSlide));
            return;
        }

        if (phase === 'move') {
            if (distanceX < 0) this.loadNextSpread();
            else if (distanceX > 0) this.loadPrevSpread();

            this._setOuterTransition(false);
            this._setOuterX(this._xForSlide(this.currentSlide) + distanceX);
            // Suppress the browser's native vertical scroll for the rest of
            // this gesture — we've consumed the move as a carousel pan.
            // .flipbook-bookLayer has touch-action: pan-y so without this the
            // page scrolls while the book translates ("swipe and scroll at
            // once"). Vertical-dominant moves bail at the 10px guard above,
            // so a real downward scroll still passes through untouched.
            if (event && event.cancelable) event.preventDefault();
            return;
        }

        if (phase === 'end' || phase === 'cancel') {
            this.enablePan();

            const threshold = w * 0.18;
            const vx = duration ? distanceX / duration : 0;
            const fling = 0.8;

            let target = this.currentSlide;

            if ((distanceX < -threshold || vx < -fling) && this.nextEnabled) {
                target = Math.min(2, this.currentSlide + 1);
            } else if ((distanceX > threshold || vx > fling) && this.prevEnabled) {
                target = Math.max(0, this.currentSlide - 1);
            }

            const ms = Math.round(600 * this.options.pageFlipDuration);

            this._animateToSlide(target, ms, () => {
                if (target === this.currentSlide) return;

                if (this.singlePage) {
                    if (target > this.currentSlide) this.setRightIndex(this.rightIndex + 1);
                    else this.setRightIndex(this.rightIndex - 1);
                } else {
                    if (target > this.currentSlide) this.setRightIndex(this.rightIndex + 2);
                    else this.setRightIndex(this.rightIndex - 2);
                }

                this.currentSlide = target;

                this._repositioning = true;
                this.updateVisiblePages();
                this._repositioning = false;
            });

            return;
        }
    }

    enableIscroll() {
        if (this.iscrollDisabled) {
            if (this.zoom > 1) {
                for (let i = 0; i < 3; i++) this.slides[i].iscroll && this.slides[i].iscroll.enable();
            } else {
                this._outerSwipeEnabled = true;
            }
            this.iscrollDisabled = false;
        }
    }

    disableIscroll() {
        if (!this.iscrollDisabled) {
            if (this.zoom > 1) {
                for (let i = 0; i < 3; i++) {
                    if (this.slides[i].iscroll) {
                        this.slides[i].iscroll.disable();
                        this.slides[i].iscroll.initiated = false;
                    }
                }
            } else {
                this._outerSwipeEnabled = false;
            }
            this.iscrollDisabled = true;
        }
    }

    goToPage(value, instant) {
        if (!this.enabled) return;
        if (!this.flipEnabled) return;

        if (value > this.numSheets * 2) value = this.numSheets * 2;
        if (value < 0 || isNaN(value)) value = 0;

        if (this.singlePage || value % 2 !== 0) value--;

        if (isNaN(value) || value < 0) value = 0;

        if (instant) {
            this.setRightIndex(value);
            this.updateVisiblePages();
            return;
        }

        if (this.singlePage) {
            if (value > this.rightIndex) {
                this.setSlidePages(this.currentSlide + 1, [value]);
                this.setRightIndex(value - 1);
                this.nextPage(instant);
            } else if (value < this.rightIndex) {
                this.setSlidePages(this.currentSlide - 1, [value]);
                this.setRightIndex(value + 1);
                this.prevPage(instant);
            }
        } else {
            if (this.options.rightToLeft && !this.options.backCover && value < 2) {
                value = 2;
            }

            if (value > this.rightIndex) {
                if (value >= this.pagesArr.length) {
                    this.setSlidePages(2, [value - 1, value]);
                    this.setRightIndex(value - 2);
                    this.goToSlide(2, instant);
                } else {
                    this.setSlidePages(this.currentSlide + 1, [value - 1, value]);
                    this.setRightIndex(value - 2);
                    this.nextPage(instant);
                }
            } else if (value < this.rightIndex) {
                if (value == 0) {
                    this.setRightIndex(value + 2);
                    this.setSlidePages(0, [value]);
                    this.goToSlide(0, instant);
                } else {
                    this.setRightIndex(value + 2);
                    this.setSlidePages(this.currentSlide - 1, [value - 1, value]);
                    this.prevPage(instant);
                }
            }
        }
    }

    setRightIndex(value) {
        this.rightIndex = value;
        // Free far-away page bitmaps. Each loaded page holds a
        // pageTextureLarge IMG (~16MB), so without GC, flipping
        // through a long PDF accumulates memory until iOS OOM-crashes
        // around 25-50 pages. Window = pagesInMemory/2 each side.
        this._gcOutsideWindow();
    }

    nextPage = function (instant) {
        if (this.currentSlide == 2) return;
        this.goToSlide(this.currentSlide + 1, instant);
        this.loadNextSpread();
    };

    prevPage(instant) {
        if (this.currentSlide == 0) return;
        this.goToSlide(this.currentSlide - 1, instant);
        this.loadPrevSpread();
    }

    enablePrev(val) {
        this.prevEnabled = val;
    }

    enableNext(val) {
        this.nextEnabled = val;
    }

    setSlidePages(slide, pages) {
        var self = this;
        var arr = [];
        for (var i = 0; i < pages.length; i++) {
            if (pages[i]) arr.push(pages[i].index);
        }

        if (this.slides[slide].pages && this.slides[slide].pages.length > 0) {
            if (arr.join('') === this.slides[slide].pages.join('')) return;
        }

        this.clearSlidePages(slide);

        var slideInner = this.slides[slide].firstChild;

        pages.forEach((page) => {
            if (typeof page !== 'undefined') {
                let pageIndex;

                if (typeof page === 'number') pageIndex = page;
                else pageIndex = page.index;

                if (self.pagesArr[pageIndex]) {
                    slideInner.appendChild(self.pagesArr[pageIndex].wrapper);
                    self.slides[slide].pages.push(pageIndex);
                }
            }
        });

        this.resizeInnerSlides();

        if (this.slides[slide].iscroll) {
            this.slides[slide].iscroll.refresh();
        }
    }

    clearSlidePages(slide) {
        this.slides[slide].firstChild.innerHTML = '';
        this.slides[slide].pages = [];
    }

    loadNextSpread() {
        var index = this.rightIndex;

        if (this.options.rightToLeft && !this.options.backCover) {
            index--;
        }

        var next = this.pagesArr[index + 1];
        if (next) next.load();

        if (!this.singlePage) {
            var afterNext = this.pagesArr[index + 2];
            if (afterNext) afterNext.load();
        }
    }

    loadPrevSpread() {
        var index = this.rightIndex;

        if (this.options.rightToLeft && !this.options.backCover) {
            index--;
        }

        if (this.singlePage) {
            var prev = this.pagesArr[index - 1];
            if (prev) prev.load();
        } else {
            var prev2 = this.pagesArr[index - 2];
            if (prev2) prev2.load();

            var beforePrev = this.pagesArr[index - 3];
            if (beforePrev) beforePrev.load();
        }
    }

    loadVisiblePages() {
        var main = this.options.main;
        var index = this.rightIndex;

        if (this.options.rightToLeft && !this.options.backCover && !this.singlePage) {
            index--;
        }

        var right = this.pagesArr[index];
        var left = this.pagesArr[index - 1];
        var next = this.pagesArr[index + 1];
        var afterNext = this.pagesArr[index + 2];
        var prev = this.pagesArr[index - 2];
        var beforePrev = this.pagesArr[index - 3];

        if (this.singlePage) {
            if (right) {
                right.load(function () {
                    if (left) left.load(null, true);
                    if (next) next.load(null, true);
                });
            } else if (left) {
                left.load();
            }
        } else {
            if (left) {
                left.load(function () {
                    if (right) {
                        right.load(function () {
                            if (prev) prev.load(null, true);
                            if (beforePrev) beforePrev.load(null, true);
                            if (next) next.load(null, true);
                            if (afterNext) afterNext.load(null, true);
                        });
                    } else {
                        if (prev) prev.load(null, true);
                        if (beforePrev) beforePrev.load(null, true);
                    }
                });
            } else {
                if (right) {
                    right.load(function () {
                        if (next) next.load(null, true);
                        if (afterNext) afterNext.load(null, true);
                    });
                }
            }
        }
    }

    updateVisiblePages() {
        if (this.visiblePagesRightIndex === this.rightIndex) return;

        // Slide change → pages may move between slides; revert any real-size
        // first so they don't carry the bigger CSS box into a different slide.
        this._resetRealSize();

        this.visiblePagesRightIndex = this.rightIndex;

        var index = this.rightIndex;

        if (this.options.rightToLeft && !this.options.backCover && !this.singlePage) {
            index--;
        } else if (!this.options.cover) index--;

        var right = this.pagesArr[index];
        var left = this.pagesArr[index - 1];
        var next = this.pagesArr[index + 1];
        var afterNext = this.pagesArr[index + 2];
        var prev = this.pagesArr[index - 2];
        var beforePrev = this.pagesArr[index - 3];

        if (next) next.hideHTML();
        if (afterNext) afterNext.hideHTML();
        if (prev) prev.hideHTML();
        if (beforePrev) beforePrev.hideHTML();

        if (this.singlePage) {
            if (right) right.startHTML();

            if (!left) {
                this.setSlidePages(0, [right]);

                if (next) this.setSlidePages(1, [next]);
                else this.clearSlidePages(1);

                this.goToSlide(0, true);
                this.clearSlidePages(2);
            } else {
                if (next) {
                    this.setSlidePages(1, [right]);
                    if (left) this.setSlidePages(0, [left]);
                    this.setSlidePages(2, [next]);
                    this.goToSlide(1, true);
                } else {
                    if (right) this.setSlidePages(2, [right]);
                    if (left) this.setSlidePages(1, [left]);
                    this.goToSlide(2, true);
                    this.clearSlidePages(0);
                }
            }

            if (left) left.hideHTML();
        } else {
            if (!left) {
                if (right) right.startHTML();
                this.setSlidePages(0, [right]);
                this.setSlidePages(1, [next, afterNext]);
                this.goToSlide(0, true);
                this.clearSlidePages(2);
            } else {
                left.startHTML();

                if (right) {
                    right.startHTML();

                    if (!next) {
                        this.setSlidePages(2, [left, right]);
                        this.setSlidePages(1, [beforePrev, prev]);
                        this.goToSlide(2, true);
                        this.clearSlidePages(0);
                    } else {
                        if (prev && !(this.rightIndex == 2 && !this.options.cover)) {
                            this.setSlidePages(1, [left, right]);
                            this.setSlidePages(0, [beforePrev, prev]);
                            this.setSlidePages(2, [next, afterNext]);
                            this.goToSlide(1, true);
                        } else {
                            this.setSlidePages(0, [left, right]);
                            this.setSlidePages(1, [next, afterNext]);
                            this.clearSlidePages(2);
                            this.goToSlide(0, true);
                        }
                    }
                } else {
                    this.setSlidePages(2, [left]);
                    this.setSlidePages(1, [beforePrev, prev]);
                    this.goToSlide(2, true);
                    this.clearSlidePages(0);
                }
            }
        }

        this.loadVisiblePages();

        if (this.singlePage) {
            const curPhysical =
                this.slides[this.currentSlide] &&
                this.slides[this.currentSlide].pages &&
                this.slides[this.currentSlide].pages[0] != null
                    ? this.slides[this.currentSlide].pages[0]
                    : this.rightIndex;

            const curLogical = this.options.rightToLeft ? this.options.numPages - 1 - curPhysical : curPhysical;

            this.flippedleft = curLogical;
            this.flippedright = this.options.numPages - curLogical; // includes current page (0 -> 6)
        } else {
            this.flippedleft = (this.rightIndex + (this.rightIndex % 2)) / 2;
            this.flippedright = this.numSheets - this.flippedleft;
        }

        this.options.main.turnPageComplete();
    }

    loadPage(index) {
        if (this.pagesArr[index]) {
            this.pagesArr[index].load();
        }
    }

    /* ---------------- Lifecycle + layout ---------------- */

    disable() {
        this.enabled = false;
    }

    enable() {
        this.enabled = true;
        this.onResize();
    }

    resize() {}

    updateSinglePage(singlePage) {
        this.singlePageView = singlePage;
        this.onResize(true);
    }

    onResize(force) {
        var w = this.main.wrapperW;
        var h = this.main.wrapperH;

        if (w == 0 || h == 0) return;
        if (!force && this.w === w && this.h === h) return;

        this.w = w;
        this.h = h;

        var pw = this.pageWidth;
        var ph = this.pageHeight;

        var portrait = (2 * this.options.zoomMin * pw) / ph > w / h;
        var doublePage =
            !this.options.singlePageMode &&
            (!this.options.responsiveView ||
                w > this.options.responsiveViewTreshold ||
                !portrait ||
                w / h >= this.options.responsiveViewRatio);

        if (typeof this.singlePageView != 'undefined') {
            doublePage = !this.singlePageView;
        }

        var bw = doublePage ? 2 * pw : pw;
        var bh = ph;
        this.bw = bw;
        this.bh = bh;

        var scale;
        if (h / w > bh / bw) {
            scale = ((bh / bw) * w) / this.options.pageHeight;
        } else {
            scale = h / this.options.pageHeight;
        }

        var spaceBetweenSlides = 0;

        for (var i = 0; i < this.slides.length; i++) {
            this.slides[i].style.width = w + spaceBetweenSlides + 'px';
            this.slides[i].style.height = h + 'px';
            this.slides[i].style.left = i * w + i * spaceBetweenSlides + 'px';

            if (this.slides[i].iscroll) {
                this.slides[i].iscroll.options.zoomMin = this.options.zoomMin * scale;
                this.slides[i].iscroll.options.zoomMax = this.options.zoomMax * scale;
                this.slides[i].iscroll.refresh();
            }
        }

        this.scroller.style.width = this.slides.length * (w + spaceBetweenSlides) + 'px';

        if ((!doublePage || this.options.singlePageMode) && !this.singlePage) {
            if (this.rightIndex % 2 == 0 && this.rightIndex > 0) {
                this.setRightIndex(this.rightIndex - 1);
            }
            this.singlePage = true;
            this.view = 1;
            this.resizeInnerSlides();
            // singlePage just flipped — slides still hold the old layout's
            // pages. Invalidate the cache and re-distribute.
            this.visiblePagesRightIndex = -1;
            this.updateVisiblePages();
        } else if (doublePage && !this.options.singlePageMode && this.singlePage) {
            if (this.rightIndex % 2 != 0) {
                this.setRightIndex(this.rightIndex + 1);
            }
            this.singlePage = false;
            this.view = 2;
            this.resizeInnerSlides();
            this.visiblePagesRightIndex = -1;
            this.updateVisiblePages();
        }

        this.zoomTo(this.zoom);

        this._setOuterTransition(false);
        this._setOuterX(this._xForSlide(this.currentSlide));
    }

    isFocusedRight() {
        return this.rightIndex % 2 == 0;
    }

    isFocusedLeft() {
        return this.rightIndex % 2 == 1;
    }

    resizeInnerSlides() {
        var pw = (this.options.pageHeight * this.pageWidth) / this.pageHeight;

        if (this.rotation == 90 || this.rotation == 270) {
            pw = (this.options.pageHeight * this.pageHeight) / this.pageWidth;
        }

        for (var i = 0; i < 3; i++) {
            let sw = this.singlePage ? pw : 2 * pw;
            sw = this.slides[i].pages && this.slides[i].pages.length == 1 ? pw : 2 * pw;
            this.slides[i].firstChild.style.width = `${sw}px`;
        }
    }

    goToSlide(slideIndex, instant) {
        var slide = this.slides[slideIndex];
        if (slide.pages && slide.pages[0]) {
            this.pagesArr[slide.pages[0]].updateHtmlContent();
        }

        if (instant) {
            this._setOuterTransition(false);
            this._setOuterX(this._xForSlide(slideIndex));

            this.currentSlide = slideIndex;

            this.zoomTo(this.options.zoomMin);
            return;
        }

        if (this.flipping) return;

        this.flipping = true;
        this.wrapper.style.pointerEvents = 'none';

        const ms = Math.round(600 * this.options.pageFlipDuration);

        const prevSlide = this.currentSlide;

        this._animateToSlide(slideIndex, ms, () => {
            this.currentSlide = slideIndex;

            if (slideIndex !== prevSlide) {
                if (this.singlePage) {
                    if (slideIndex > prevSlide) this.setRightIndex(this.rightIndex + 1);
                    else this.setRightIndex(this.rightIndex - 1);
                } else {
                    if (slideIndex > prevSlide) this.setRightIndex(this.rightIndex + 2);
                    else this.setRightIndex(this.rightIndex - 2);
                }
            }

            this._repositioning = true;
            this.updateVisiblePages();
            this._repositioning = false;

            this.zoomTo(this.options.zoomMin);

            this.flipping = false;
            this.wrapper.style.pointerEvents = '';
        });
    }

    zoomIn(value, time, e) {
        if (e && e.type === 'mousewheel') return;
        this.zoomTo(value);
    }

    zoomTo(zoom, time, x, y) {
        if (!this.enabled) return;

        // Any zoom change reverts real-size (CSS box bigger × scale(1/s)
        // counter-shrink); the commit timer below re-applies on settle.
        this._resetRealSize();

        x = x || 0;
        y = y || 0;

        if (zoom > 1) {
            this.disableFlip();
        }

        var m = this.main;
        var w = m.wrapperW;
        var h = m.wrapperH;
        if (w == 0 || h == 0) return;

        // Use normalized 1000-tall layout coords (not main.bookH/pageH which
        // were cached at texture size). PanZoom's scale then maps directly
        // to the user-facing zoom value without any compensation factor.
        var pw = this.pageWidth;
        var ph = this.pageHeight;
        var bw = 2 * this.pageWidth;
        var bh = this.pageHeight;
        var r1 = w / h;
        var r2 = pw / ph;

        var s = Math.min(this.zoom, 1);
        var zoomMin = Number(this.options.zoomMin);

        var self = this;

        function fitToHeight() {
            self.ratio = h / bh;
            fit();
        }

        function fitToWidth() {
            self.ratio = self.view == 1 ? w / pw : w / bw;
            fit();
        }

        function fit() {
            for (var i = 0; i < 3; i++) {
                if (self.slides[i].iscroll) {
                    self.slides[i].iscroll.options.zoomMin = self.ratio * self.options.zoomMin;
                    self.slides[i].iscroll.options.zoomMax = self.ratio * self.options.zoomMax;
                    self.slides[i].iscroll.zoom(self.ratio * zoom, x, y, time);
                }
            }
        }

        if (
            !this.options.singlePageMode &&
            this.options.responsiveView &&
            w <= this.options.responsiveViewTreshold &&
            r1 < 2 * r2 &&
            r1 < this.options.responsiveViewRatio
        ) {
            this.view = 1;
            this.sc = r2 > r1 ? (zoomMin * r1) / (r2 * s) : 1;
            if (w / h > pw / ph) fitToHeight();
            else fitToWidth();
        } else if (this.singlePage && r1 < 2 * r2) {
            this.sc = r2 > r1 ? (zoomMin * r1) / (r2 * s) : 1;
            if (w / h > pw / ph) fitToHeight();
            else fitToWidth();
        } else {
            this.view = 2;
            this.sc = r1 < 2 * r2 ? (zoomMin * r1) / (2 * r2 * s) : 1;
            if (w / h >= bw / bh) fitToHeight();
            else fitToWidth();
        }

        this.zoom = zoom;
        this.onZoom(zoom);
    }

    zoomOut(value) {
        this.zoomTo(value);
    }

    _commitRealSize() {
        if (!this.zoom || this.zoom <= 1) return;
        this._resetRealSize();
        var slide = this.slides[this.currentSlide];
        if (!slide || !slide.pages || !slide.pages.length) return;
        slide.pages.forEach((pageIdx) => {
            var p = this.pagesArr[pageIdx];
            if (p && p.setRealSize) {
                p.setRealSize(this.zoom);
                this._realScalePages.push(p);
                // Upgrade tier to large now that we're zoomed in. PageSwipe.load
                // appends the new large IMG and removes the smaller one in the
                // same DOM op (no blink). Pages off-screen stay at small tier.
                if (p.load) p.load(null, false, this.options.pageTextureLarge);
            }
        });
    }

    _resetRealSize() {
        if (!this._realScalePages || !this._realScalePages.length) return;
        this._realScalePages.forEach((p) => p.resetSize && p.resetSize());
        this._realScalePages = [];
    }

    move(direction) {
        if (this.zoom <= 1) return;

        for (var i = 0; i < 3; i++) {
            var iscroll = this.slides[i].iscroll;
            var offset2 = 0;

            if (iscroll) {
                var posX = iscroll.x;
                var posY = iscroll.y;
                var offset = 20 * this.zoom;

                switch (direction) {
                    case 'left':
                        posX += offset;
                        break;
                    case 'right':
                        posX -= offset;
                        break;
                    case 'up':
                        posY += offset;
                        break;
                    case 'down':
                        posY -= offset;
                        break;
                }

                if (posX > 0) posX = offset2;
                if (posX < iscroll.maxScrollX) posX = iscroll.maxScrollX - offset2;
                if (posY > 0) posY = offset2;
                if (posY < iscroll.maxScrollY) posY = iscroll.maxScrollY - offset2;

                iscroll.scrollTo(posX, posY, 0);
            }
        }
    }

    onZoom(zoom) {
        if (zoom > 1) {
            this.disableFlip();
            this.enablePan();
            this.targetTier = this.options.pageTextureLarge;
        } else {
            this.enableFlip();
            this.disablePan();
            this.targetTier = this.options.pageTextureSmall || this.options.pageTextureLarge;
        }

        this.options.main.onZoom(zoom);
    }

    rotateLeft() {
        this.rotation = (this.rotation + 360 - 90) % 360;
        for (var i = 0; i < this.pagesArr.length; i++) this.pagesArr[i].setRotation(this.rotation);
        this.resizeInnerSlides();
        this.onResize();
    }

    rotateRight() {
        this.rotation = (this.rotation + 360 + 90) % 360;
        for (var i = 0; i < this.pagesArr.length; i++) this.pagesArr[i].setRotation(this.rotation);
        this.resizeInnerSlides();
        this.onResize();
    }

    onPageUnloaded(i) {
        var index = this.options.rightToLeft ? this.options.numPages - i - 1 : i;
        this.pagesArr[index].unload();
    }

    // Free cached page bitmaps for pages outside the cache window.
    // Each PageSwipe.load() pulls at pageTextureLarge (~16MB IMG); without
    // GC, flipping through a long PDF accumulates memory across all loaded
    // pages until iOS OOM-crashes (~25 pages observed). Mirrors
    // BookScroll._gcOutsideWindow.
    _gcOutsideWindow() {
        const o = this.options;
        const halfWindow = (o.pagesInMemory || 20) / 2;
        const cur = this.rightIndex;
        this.pagesArr.forEach((p, i) => {
            // Only unload pages that have actually loaded a tier.
            if (!p.size) return;
            const dist = Math.abs(i - cur);
            if (dist <= halfWindow) return;
            p.unload();
        });
    }

    disableFlip() {
        this.flipEnabled = false;
        this._outerSwipeEnabled = false;
    }

    enableFlip() {
        if (this.options.numPages == 1) {
            this.disableFlip();
            return;
        }
        this.flipEnabled = true;
        this._outerSwipeEnabled = true;
    }

    enablePan() {
        for (let i = 0; i < 3; i++) this.slides[i].iscroll && this.slides[i].iscroll.enable();
    }

    disablePan() {
        for (let i = 0; i < 3; i++) this.slides[i].iscroll && this.slides[i].iscroll.disable();
    }
};

/* ---------------------------------------------
 * Custom zoom/pan (replaces IScroll)
 * --------------------------------------------- */
// FLIPBOOK.SlideInnerZoom = class {
//     constructor(slideEl, innerEl, getViewportSize) {
//         this.slideEl = slideEl;
//         this.innerEl = innerEl;
//         this.getViewportSize = getViewportSize;

//         this.enabled = true;

//         this.scale = 1;
//         this.minScale = 1;
//         this.maxScale = 4;

//         this.tx = 0;
//         this.ty = 0;

//         this._panning = false;
//         this._startX = 0;
//         this._startY = 0;
//         this._startTx = 0;
//         this._startTy = 0;

//         this.bounce = true;
//         this.bounceTime = 280;
//         this._transitionReset = 0;
//         this._resistance = 0.35;

//         // Track current transition duration to skip redundant style writes
//         this._currentTransitionMs = -1;

//         const style = innerEl.style;
//         style.transformOrigin = '0 0';
//         style.willChange = 'transform';

//         slideEl.style.touchAction = 'none';

//         this._bindPanOnly();
//         this.refresh();
//     }

//     enable() {
//         this.enabled = true;
//     }

//     disable() {
//         this.enabled = false;
//         this._panning = false;
//         this._clearTransitionReset();
//     }

//     setLimits(minScale, maxScale) {
//         this.minScale = Number(minScale) || 1;
//         this.maxScale = Number(maxScale) || this.minScale;
//         if (this.maxScale < this.minScale) this.maxScale = this.minScale;
//         this.scale = this._clamp(this.scale, this.minScale, this.maxScale);
//         this._springToBounds(0);
//         this._apply();
//     }

//     refresh() {
//         this._springToBounds(0);
//         this._apply();
//     }

//     zoomTo(scale, cx = null, cy = null) {
//         this._setTransition(0);
//         const next = this._clamp(scale, this.minScale, this.maxScale);

//         const { w: vw, h: vh } = this.getViewportSize();
//         const centerX = cx == null ? vw * 0.5 : cx;
//         const centerY = cy == null ? vh * 0.5 : cy;

//         const invScale = 1 / (this.scale || 1);
//         this.tx = centerX - (centerX - this.tx) * invScale * next;
//         this.ty = centerY - (centerY - this.ty) * invScale * next;
//         this.scale = next;

//         this._clampToBoundsImmediate();
//         this._apply();
//     }

//     panBy(dx, dy) {
//         this.tx += dx;
//         this.ty += dy;
//         this._clampToBoundsImmediate();
//         this._apply();
//     }

//     /* ---------------- internals ---------------- */

//     _bindPanOnly() {
//         this._onPointerDown = (e) => {
//             if (!this.enabled) return;
//             const b = this._bounds();
//             const canPan = b.minTx !== b.maxTx || b.minTy !== b.maxTy;
//             if (!canPan) return;
//             if (e.pointerType !== 'mouse' && e.isPrimary === false) return;

//             this._clearTransitionReset();
//             this._setTransition(0);

//             this._panning = true;
//             this._startX = e.clientX;
//             this._startY = e.clientY;
//             this._startTx = this.tx;
//             this._startTy = this.ty;

//             try {
//                 this.slideEl.setPointerCapture(e.pointerId);
//             } catch (_) {}
//         };

//         this._onPointerMove = (e) => {
//             if (!this.enabled || !this._panning) return;

//             let ntx = this._startTx + (e.clientX - this._startX);
//             let nty = this._startTy + (e.clientY - this._startY);

//             if (this.bounce) {
//                 const b = this._bounds();
//                 ntx = this._rubberBand(ntx, b.minTx, b.maxTx);
//                 nty = this._rubberBand(nty, b.minTy, b.maxTy);
//             }

//             this.tx = ntx;
//             this.ty = nty;
//             this._apply();
//         };

//         this._onPointerUp = (e) => {
//             if (!this.enabled) return;
//             const wasPanning = this._panning;
//             this._panning = false;

//             try {
//                 this.slideEl.releasePointerCapture(e.pointerId);
//             } catch (_) {}

//             if (wasPanning) {
//                 if (this.bounce) this._springToBounds(this.bounceTime);
//                 else {
//                     this._clampToBoundsImmediate();
//                     this._apply();
//                 }
//             }
//         };

//         this.slideEl.addEventListener('pointerdown', this._onPointerDown, { passive: true });
//         window.addEventListener('pointermove', this._onPointerMove, { passive: true });
//         window.addEventListener('pointerup', this._onPointerUp, { passive: true });
//     }

//     _apply() {
//         this.innerEl.style.transform = `translate3d(${this.tx}px,${this.ty}px,0) scale(${this.scale})`;
//     }

//     _bounds() {
//         const { w: vw, h: vh } = this.getViewportSize();
//         const scaledW = (this.innerEl.offsetWidth || 0) * this.scale;
//         const scaledH = (this.innerEl.offsetHeight || 0) * this.scale;

//         const minTx = scaledW <= vw ? (vw - scaledW) * 0.5 : vw - scaledW;
//         const maxTx = scaledW <= vw ? minTx : 0;
//         const minTy = scaledH <= vh ? (vh - scaledH) * 0.5 : vh - scaledH;
//         const maxTy = scaledH <= vh ? minTy : 0;

//         return { minTx, maxTx, minTy, maxTy };
//     }

//     _rubberBand(v, min, max) {
//         if (v < min) return min + (v - min) * this._resistance;
//         if (v > max) return max + (v - max) * this._resistance;
//         return v;
//     }

//     _clampToBoundsImmediate() {
//         const b = this._bounds();
//         this.tx = this._clamp(this.tx, b.minTx, b.maxTx);
//         this.ty = this._clamp(this.ty, b.minTy, b.maxTy);
//     }

//     _setTransition(ms) {
//         if (ms === this._currentTransitionMs) return;
//         this._currentTransitionMs = ms;
//         this.innerEl.style.transition = ms > 0 ? `transform ${ms}ms cubic-bezier(.22,.61,.36,1)` : 'none';
//     }

//     _springToBounds(ms = this.bounceTime) {
//         const b = this._bounds();
//         const targetX = this._clamp(this.tx, b.minTx, b.maxTx);
//         const targetY = this._clamp(this.ty, b.minTy, b.maxTy);

//         const dx = targetX - this.tx;
//         const dy = targetY - this.ty;

//         this.tx = targetX;
//         this.ty = targetY;

//         if (!ms || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) {
//             this._setTransition(0);
//             this._apply();
//             return;
//         }

//         this._clearTransitionReset();
//         this._setTransition(ms);
//         this._apply();

//         this._transitionReset = setTimeout(() => {
//             this._transitionReset = 0;
//             this._setTransition(0);
//         }, ms + 20);
//     }

//     _clearTransitionReset() {
//         if (this._transitionReset) {
//             clearTimeout(this._transitionReset);
//             this._transitionReset = 0;
//             this._setTransition(0);
//         }
//     }

//     _clamp(v, a, b) {
//         return v < a ? a : v > b ? b : v;
//     }
// };

/* ---------------------------------------------
 * New BookScroll (no IScroll)
 * --------------------------------------------- */
// FLIPBOOK.BookSwipe = class extends FLIPBOOK.Book {
//     constructor(el, wrapper, main, options) {
//         super(main, options);

//         if (this.singlePage) this.view = 1;

//         this.slides = [];
//         this.pagesArr = [];
//         this.leftPage = 0;
//         this.rightPage = 0;
//         this.rotation = 0;

//         this.prevPageEnabled = false;

//         this.setRightIndex(options.rightToLeft ? options.pages.length : 0);

//         this.currentSlide = 0;
//         this.flipping = false;

//         this.wrapper = wrapper;

//         this.scroller = el;
//         this.scroller.classList.remove('book');
//         this.scroller.classList.add('flipbook-carousel-scroller');

//         this._outerAnimating = false;
//         this._outerSwipeEnabled = true;
//         this._outerT = null;
//         this._repositioning = false;

//         this.zoomDisabled = false;
//         this.iscrollDisabled = false; // keep old flag name for compatibility
//         this.zoom = this.options.zoomMin || 1;

//         // build 3 slides
//         for (let i = 0; i < 3; i++) {
//             const slide = document.createElement('div');
//             slide.className = 'flipbook-carousel-slide';

//             const slideInner = document.createElement('div');
//             slideInner.className = 'slide-inner flipbook-book-shadow';

//             slide.appendChild(slideInner);
//             this.scroller.appendChild(slide);

//             slide.pages = [];
//             this.slides.push(slide);
//         }

//         // init custom zoom/pan
//         for (let i = 0; i < 3; i++) {
//             const slide = this.slides[i];
//             const inner = slide.firstChild;

//             slide.zoomPan = new FLIPBOOK.SlideInnerZoom(slide, inner, () => ({
//                 w: slide.clientWidth || 0,
//                 h: slide.clientHeight || 0,
//             }));
//         }

//         this.resizeInnerSlides();

//         // pages
//         options.pages.forEach((page, index) => {
//             if (!page.empty) {
//                 const newPage = new FLIPBOOK.PageSwipe(this, index, page.src, page.htmlContent);
//                 this.pagesArr.push(newPage);
//                 if (options.loadAllPages) newPage.load();
//             }
//         });

//         this.flipEnabled = true;
//         this.nextEnabled = true;
//         this.prevEnabled = true;

//         // keep old event names so rest of system doesn’t change
//         main.on('enableIScroll', () => this.enableIscroll());
//         main.on('disableIScroll', () => this.disableIscroll());

//         main.on('pageLoaded', function (_) {});

//         this.onResize(true);
//     }

//     /* ---------------- Outer transform helpers ---------------- */

//     _setOuterTransition(on, ms = 0) {
//         this.scroller.style.transition = on ? `transform ${ms}ms ease` : 'none';
//     }

//     _setOuterX(px) {
//         this.scroller.style.transform = `translate3d(${px}px,0,0)`;
//     }

//     _slideW() {
//         return this.main.wrapperW || this.wrapper.clientWidth || 0;
//     }

//     _xForSlide(i) {
//         return -i * this._slideW();
//     }

//     _animateToSlide(i, ms, done) {
//         if (this._outerAnimating) return;

//         this._outerAnimating = true;
//         this.flipping = true;
//         this.wrapper.style.pointerEvents = 'none';

//         this._setOuterTransition(true, ms);
//         this._setOuterX(this._xForSlide(i));

//         const end = (ev) => {
//             if (ev && ev.target !== this.scroller) return;
//             this.scroller.removeEventListener('transitionend', end);

//             clearTimeout(this._outerT);
//             this._outerT = null;

//             this._outerAnimating = false;
//             this.flipping = false;
//             this.wrapper.style.pointerEvents = '';

//             done && done();
//         };

//         this.scroller.addEventListener('transitionend', end);

//         clearTimeout(this._outerT);
//         this._outerT = setTimeout(() => {
//             this.scroller.removeEventListener('transitionend', end);
//             end();
//         }, ms + 80);
//     }

//     /* ---------------- Swipe handler ---------------- */

//     onSwipe(event, phase, distanceX, distanceY, duration, fingerCount) {
//         if (!this.enabled) return;
//         if (this.zoom > 1) return; // panning handled inside SlideInnerZoom
//         if (phase.startsWith('pinch')) return;
//         if (!this.flipEnabled) return;
//         if (!this._outerSwipeEnabled) return;
//         if (this._outerAnimating || this.flipping) return;

//         const w = this._slideW();
//         if (!w) return;

//         if (
//             (phase === 'move' || phase === 'end' || phase === 'cancel') &&
//             Math.abs(distanceY) > Math.abs(distanceX) &&
//             Math.abs(distanceY) > 10
//         ) {
//             return;
//         }

//         if (phase === 'start') {
//             this.disablePan();
//             this._setOuterTransition(false);
//             this._setOuterX(this._xForSlide(this.currentSlide));
//             return;
//         }

//         if (phase === 'move') {
//             if (distanceX < 0) this.loadNextSpread();
//             else if (distanceX > 0) this.loadPrevSpread();

//             this._setOuterTransition(false);
//             this._setOuterX(this._xForSlide(this.currentSlide) + distanceX);
//             return;
//         }

//         if (phase === 'end' || phase === 'cancel') {
//             this.enablePan();

//             const threshold = w * 0.18;
//             const vx = duration ? distanceX / duration : 0;
//             const fling = 0.8;

//             let target = this.currentSlide;

//             if ((distanceX < -threshold || vx < -fling) && this.nextEnabled) {
//                 target = Math.min(2, this.currentSlide + 1);
//             } else if ((distanceX > threshold || vx > fling) && this.prevEnabled) {
//                 target = Math.max(0, this.currentSlide - 1);
//             }

//             const ms = Math.round(600 * this.options.pageFlipDuration);

//             this._animateToSlide(target, ms, () => {
//                 if (target === this.currentSlide) return;

//                 if (this.singlePage) {
//                     if (target > this.currentSlide) this.setRightIndex(this.rightIndex + 1);
//                     else this.setRightIndex(this.rightIndex - 1);
//                 } else {
//                     if (target > this.currentSlide) this.setRightIndex(this.rightIndex + 2);
//                     else this.setRightIndex(this.rightIndex - 2);
//                 }

//                 this.currentSlide = target;

//                 this._repositioning = true;
//                 this.updateVisiblePages();
//                 this._repositioning = false;
//             });

//             return;
//         }
//     }

//     /* ---------------- Enable/disable (kept names for compatibility) ---------------- */

//     enableIscroll() {
//         if (this.iscrollDisabled) {
//             if (this.zoom > 1) this.enablePan();
//             else this._outerSwipeEnabled = true;
//             this.iscrollDisabled = false;
//         }
//     }

//     disableIscroll() {
//         if (!this.iscrollDisabled) {
//             if (this.zoom > 1) this.disablePan();
//             else this._outerSwipeEnabled = false;
//             this.iscrollDisabled = true;
//         }
//     }

//     /* ---------------- Navigation ---------------- */

//     goToPage(value, instant) {
//         if (!this.enabled) return;
//         if (!this.flipEnabled) return;

//         if (value > this.numSheets * 2) value = this.numSheets * 2;
//         if (value < 0 || isNaN(value)) value = 0;

//         if (this.singlePage || value % 2 !== 0) value--;

//         if (isNaN(value) || value < 0) value = 0;

//         if (instant) {
//             this.setRightIndex(value);
//             this.updateVisiblePages();
//             return;
//         }

//         if (this.singlePage) {
//             if (value > this.rightIndex) {
//                 this.setSlidePages(this.currentSlide + 1, [value]);
//                 this.setRightIndex(value - 1);
//                 this.nextPage(instant);
//             } else if (value < this.rightIndex) {
//                 this.setSlidePages(this.currentSlide - 1, [value]);
//                 this.setRightIndex(value + 1);
//                 this.prevPage(instant);
//             }
//         } else {
//             if (this.options.rightToLeft && !this.options.backCover && value < 2) value = 2;

//             if (value > this.rightIndex) {
//                 if (value >= this.pagesArr.length) {
//                     this.setSlidePages(2, [value - 1, value]);
//                     this.setRightIndex(value - 2);
//                     this.goToSlide(2, instant);
//                 } else {
//                     this.setSlidePages(this.currentSlide + 1, [value - 1, value]);
//                     this.setRightIndex(value - 2);
//                     this.nextPage(instant);
//                 }
//             } else if (value < this.rightIndex) {
//                 if (value == 0) {
//                     this.setRightIndex(value + 2);
//                     this.setSlidePages(0, [value]);
//                     this.goToSlide(0, instant);
//                 } else {
//                     this.setRightIndex(value + 2);
//                     this.setSlidePages(this.currentSlide - 1, [value - 1, value]);
//                     this.prevPage(instant);
//                 }
//             }
//         }
//     }

//     setRightIndex(value) {
//         this.rightIndex = value;
//     }

//     nextPage = function (instant) {
//         if (this.currentSlide == 2) return;
//         this.goToSlide(this.currentSlide + 1, instant);
//         this.loadNextSpread();
//     };

//     prevPage(instant) {
//         if (this.currentSlide == 0) return;
//         this.goToSlide(this.currentSlide - 1, instant);
//         this.loadPrevSpread();
//     }

//     enablePrev(val) {
//         this.prevEnabled = val;
//     }

//     enableNext(val) {
//         this.nextEnabled = val;
//     }

//     setSlidePages(slide, pages) {
//         var self = this;
//         var arr = [];
//         for (var i = 0; i < pages.length; i++) {
//             if (pages[i]) arr.push(pages[i].index);
//         }

//         if (this.slides[slide].pages && this.slides[slide].pages.length > 0) {
//             if (arr.join('') === this.slides[slide].pages.join('')) return;
//         }

//         this.clearSlidePages(slide);

//         var slideInner = this.slides[slide].firstChild;

//         pages.forEach((page) => {
//             if (typeof page !== 'undefined') {
//                 let pageIndex;

//                 if (typeof page === 'number') pageIndex = page;
//                 else pageIndex = page.index;

//                 if (self.pagesArr[pageIndex]) {
//                     slideInner.appendChild(self.pagesArr[pageIndex].wrapper);
//                     self.slides[slide].pages.push(pageIndex);
//                 }
//             }
//         });

//         this.resizeInnerSlides();

//         if (this.slides[slide].zoomPan) this.slides[slide].zoomPan.refresh();
//     }

//     clearSlidePages(slide) {
//         this.slides[slide].firstChild.innerHTML = '';
//         this.slides[slide].pages = [];
//         if (this.slides[slide].zoomPan) this.slides[slide].zoomPan.refresh();
//     }

//     loadNextSpread() {
//         var index = this.rightIndex;

//         if (this.options.rightToLeft && !this.options.backCover) index--;

//         var next = this.pagesArr[index + 1];
//         if (next) next.load();

//         if (!this.singlePage) {
//             var afterNext = this.pagesArr[index + 2];
//             if (afterNext) afterNext.load();
//         }
//     }

//     loadPrevSpread() {
//         var index = this.rightIndex;

//         if (this.options.rightToLeft && !this.options.backCover) index--;

//         if (this.singlePage) {
//             var prev = this.pagesArr[index - 1];
//             if (prev) prev.load();
//         } else {
//             var prev2 = this.pagesArr[index - 2];
//             if (prev2) prev2.load();

//             var beforePrev = this.pagesArr[index - 3];
//             if (beforePrev) beforePrev.load();
//         }
//     }

//     loadVisiblePages() {
//         var main = this.options.main;
//         var index = this.rightIndex;

//         if (this.options.rightToLeft && !this.options.backCover && !this.singlePage) index--;

//         var right = this.pagesArr[index];
//         var left = this.pagesArr[index - 1];
//         var next = this.pagesArr[index + 1];
//         var afterNext = this.pagesArr[index + 2];
//         var prev = this.pagesArr[index - 2];
//         var beforePrev = this.pagesArr[index - 3];

//         if (this.singlePage) {
//             if (right) {
//                 right.load(function () {
//                     main.setLoadingProgress(1);
//                     if (left) left.load(null, true);
//                     if (next) next.load(null, true);
//                 });
//             } else if (left) {
//                 left.load();
//             }
//         } else {
//             if (left) {
//                 left.load(function () {
//                     if (right) {
//                         right.load(function () {
//                             main.setLoadingProgress(1);
//                             if (prev) prev.load(null, true);
//                             if (beforePrev) beforePrev.load(null, true);
//                             if (next) next.load(null, true);
//                             if (afterNext) afterNext.load(null, true);
//                         });
//                     } else {
//                         main.setLoadingProgress(1);
//                         if (prev) prev.load(null, true);
//                         if (beforePrev) beforePrev.load(null, true);
//                     }
//                 });
//             } else {
//                 if (right) {
//                     right.load(function () {
//                         main.setLoadingProgress(1);
//                         if (next) next.load(null, true);
//                         if (afterNext) afterNext.load(null, true);
//                     });
//                 }
//             }
//         }
//     }

//     updateVisiblePages() {
//         if (this.visiblePagesRightIndex === this.rightIndex) return;
//         this.visiblePagesRightIndex = this.rightIndex;

//         var index = this.rightIndex;

//         if (this.options.rightToLeft && !this.options.backCover && !this.singlePage) index--;
//         else if (!this.options.cover) index--;

//         var right = this.pagesArr[index];
//         var left = this.pagesArr[index - 1];
//         var next = this.pagesArr[index + 1];
//         var afterNext = this.pagesArr[index + 2];
//         var prev = this.pagesArr[index - 2];
//         var beforePrev = this.pagesArr[index - 3];

//         if (next) next.hideHTML();
//         if (afterNext) afterNext.hideHTML();
//         if (prev) prev.hideHTML();
//         if (beforePrev) beforePrev.hideHTML();

//         if (this.singlePage) {
//             if (right) right.startHTML();

//             if (!left) {
//                 this.setSlidePages(0, [right]);

//                 if (next) this.setSlidePages(1, [next]);
//                 else this.clearSlidePages(1);

//                 this.goToSlide(0, true);
//                 this.clearSlidePages(2);
//             } else {
//                 if (next) {
//                     this.setSlidePages(1, [right]);
//                     if (left) this.setSlidePages(0, [left]);
//                     this.setSlidePages(2, [next]);
//                     this.goToSlide(1, true);
//                 } else {
//                     if (right) this.setSlidePages(2, [right]);
//                     if (left) this.setSlidePages(1, [left]);
//                     this.goToSlide(2, true);
//                     this.clearSlidePages(0);
//                 }
//             }

//             if (left) left.hideHTML();
//         } else {
//             if (!left) {
//                 if (right) right.startHTML();
//                 this.setSlidePages(0, [right]);
//                 this.setSlidePages(1, [next, afterNext]);
//                 this.goToSlide(0, true);
//                 this.clearSlidePages(2);
//             } else {
//                 left.startHTML();

//                 if (right) {
//                     right.startHTML();

//                     if (!next) {
//                         this.setSlidePages(2, [left, right]);
//                         this.setSlidePages(1, [beforePrev, prev]);
//                         this.goToSlide(2, true);
//                         this.clearSlidePages(0);
//                     } else {
//                         if (prev && !(this.rightIndex == 2 && !this.options.cover)) {
//                             this.setSlidePages(1, [left, right]);
//                             this.setSlidePages(0, [beforePrev, prev]);
//                             this.setSlidePages(2, [next, afterNext]);
//                             this.goToSlide(1, true);
//                         } else {
//                             this.setSlidePages(0, [left, right]);
//                             this.setSlidePages(1, [next, afterNext]);
//                             this.clearSlidePages(2);
//                             this.goToSlide(0, true);
//                         }
//                     }
//                 } else {
//                     this.setSlidePages(2, [left]);
//                     this.setSlidePages(1, [beforePrev, prev]);
//                     this.goToSlide(2, true);
//                     this.clearSlidePages(0);
//                 }
//             }
//         }

//         this.loadVisiblePages();

//         if (this.singlePage) {
//             const curPhysical =
//                 this.slides[this.currentSlide] &&
//                 this.slides[this.currentSlide].pages &&
//                 this.slides[this.currentSlide].pages[0] != null
//                     ? this.slides[this.currentSlide].pages[0]
//                     : this.rightIndex;

//             const curLogical = this.options.rightToLeft ? this.options.numPages - 1 - curPhysical : curPhysical;

//             this.flippedleft = curLogical;
//             this.flippedright = this.options.numPages - curLogical;
//         } else {
//             this.flippedleft = (this.rightIndex + (this.rightIndex % 2)) / 2;
//             this.flippedright = this.numSheets - this.flippedleft;
//         }

//         this.options.main.turnPageComplete();
//     }

//     loadPage(index) {
//         if (this.pagesArr[index]) this.pagesArr[index].load();
//     }

//     /* ---------------- Lifecycle + layout ---------------- */

//     disable() {
//         this.enabled = false;
//     }

//     enable() {
//         this.enabled = true;
//         this.onResize();
//     }

//     resize() {}

//     updateSinglePage(singlePage) {
//         this.singlePageView = singlePage;
//         this.onResize(true);
//     }

//     onResize(force) {
//         var w = this.main.wrapperW;
//         var h = this.main.wrapperH;

//         if (w == 0 || h == 0) return;
//         if (!force && this.w === w && this.h === h) return;

//         this.w = w;
//         this.h = h;

//         var pw = this.pageWidth;
//         var ph = this.pageHeight;

//         var portrait = (2 * this.options.zoomMin * pw) / ph > w / h;
//         var doublePage =
//             !this.options.singlePageMode &&
//             (!this.options.responsiveView ||
//                 w > this.options.responsiveViewTreshold ||
//                 !portrait ||
//                 w / h >= this.options.responsiveViewRatio);

//         if (typeof this.singlePageView != 'undefined') doublePage = !this.singlePageView;

//         var bw = doublePage ? 2 * pw : pw;
//         var bh = ph;
//         this.bw = bw;
//         this.bh = bh;

//         var scale;
//         if (h / w > bh / bw) {
//             scale = ((bh / bw) * w) / this.options.pageHeight;
//         } else {
//             scale = h / this.options.pageHeight;
//         }

//         var spaceBetweenSlides = 0;

//         for (var i = 0; i < this.slides.length; i++) {
//             this.slides[i].style.width = w + spaceBetweenSlides + 'px';
//             this.slides[i].style.height = h + 'px';
//             this.slides[i].style.left = i * w + i * spaceBetweenSlides + 'px';

//             if (this.slides[i].zoomPan) {
//                 this.slides[i].zoomPan.setLimits(this.options.zoomMin * scale, this.options.zoomMax * scale);
//                 this.slides[i].zoomPan.refresh();
//             }
//         }

//         this.scroller.style.width = this.slides.length * (w + spaceBetweenSlides) + 'px';

//         if ((!doublePage || this.options.singlePageMode) && !this.singlePage) {
//             if (this.rightIndex % 2 == 0 && this.rightIndex > 0) this.setRightIndex(this.rightIndex - 1);
//             this.singlePage = true;
//             this.view = 1;
//             this.resizeInnerSlides();
//         } else if (doublePage && !this.options.singlePageMode && this.singlePage) {
//             if (this.rightIndex % 2 != 0) this.setRightIndex(this.rightIndex + 1);
//             this.singlePage = false;
//             this.view = 2;
//             this.resizeInnerSlides();
//         }

//         this.zoomTo(this.zoom);

//         this._setOuterTransition(false);
//         this._setOuterX(this._xForSlide(this.currentSlide));
//     }

//     isFocusedRight() {
//         return this.rightIndex % 2 == 0;
//     }

//     isFocusedLeft() {
//         return this.rightIndex % 2 == 1;
//     }

//     resizeInnerSlides() {
//         var pw = (this.options.pageHeight * this.pageWidth) / this.pageHeight;

//         if (this.rotation == 90 || this.rotation == 270) {
//             pw = (this.options.pageHeight * this.options.pageHeight) / this.pageWidth;
//         }

//         for (var i = 0; i < 3; i++) {
//             let sw = this.singlePage ? pw : 2 * pw;
//             sw = this.slides[i].pages && this.slides[i].pages.length == 1 ? pw : 2 * pw;
//             this.slides[i].firstChild.style.width = `${sw}px`;

//             if (this.slides[i].zoomPan) this.slides[i].zoomPan.refresh();
//         }
//     }

//     goToSlide(slideIndex, instant) {
//         var slide = this.slides[slideIndex];
//         if (slide.pages && slide.pages[0]) {
//             this.pagesArr[slide.pages[0]].updateHtmlContent();
//         }

//         if (instant) {
//             this._setOuterTransition(false);
//             this._setOuterX(this._xForSlide(slideIndex));

//             this.currentSlide = slideIndex;

//             this.zoomTo(this.options.zoomMin);
//             return;
//         }

//         if (this.flipping) return;

//         this.flipping = true;
//         this.wrapper.style.pointerEvents = 'none';

//         const ms = Math.round(600 * this.options.pageFlipDuration);

//         const prevSlide = this.currentSlide;

//         this._animateToSlide(slideIndex, ms, () => {
//             this.currentSlide = slideIndex;

//             if (slideIndex !== prevSlide) {
//                 if (this.singlePage) {
//                     if (slideIndex > prevSlide) this.setRightIndex(this.rightIndex + 1);
//                     else this.setRightIndex(this.rightIndex - 1);
//                 } else {
//                     if (slideIndex > prevSlide) this.setRightIndex(this.rightIndex + 2);
//                     else this.setRightIndex(this.rightIndex - 2);
//                 }
//             }

//             this._repositioning = true;
//             this.updateVisiblePages();
//             this._repositioning = false;

//             this.zoomTo(this.options.zoomMin);

//             this.flipping = false;
//             this.wrapper.style.pointerEvents = '';
//         });
//     }

//     zoomIn(value, time, e) {
//         if (e && e.type === 'mousewheel') return;
//         this.zoomTo(value);
//     }

//     zoomTo(zoom, time, x, y) {
//         if (!this.enabled) return;

//         // x,y are viewport coords (optional)
//         const cx = typeof x === 'number' ? x : null;
//         const cy = typeof y === 'number' ? y : null;

//         if (zoom > 1) this.disableFlip();

//         var m = this.main;
//         var w = m.wrapperW;
//         var h = m.wrapperH;
//         if (w == 0 || h == 0) return;

//         var bw = m.bookW;
//         var bh = m.bookH;
//         var pw = m.pageW;
//         var ph = m.pageH;
//         var r1 = w / h;
//         var r2 = pw / ph;

//         var s = Math.min(this.zoom, 1);
//         var zoomMin = Number(this.options.zoomMin);

//         var self = this;

//         function fitToHeight() {
//             self.ratio = h / bh;
//             fit();
//         }

//         function fitToWidth() {
//             self.ratio = self.view == 1 ? w / pw : w / bw;
//             fit();
//         }

//         function fit() {
//             for (var i = 0; i < 3; i++) {
//                 const zp = self.slides[i].zoomPan;
//                 if (!zp) continue;

//                 zp.setLimits(self.ratio * self.options.zoomMin, self.ratio * self.options.zoomMax);
//                 zp.zoomTo(self.ratio * zoom, cx, cy);
//             }
//         }

//         if (
//             !this.options.singlePageMode &&
//             this.options.responsiveView &&
//             w <= this.options.responsiveViewTreshold &&
//             r1 < 2 * r2 &&
//             r1 < this.options.responsiveViewRatio
//         ) {
//             this.view = 1;
//             this.sc = r2 > r1 ? (zoomMin * r1) / (r2 * s) : 1;
//             if (w / h > pw / ph) fitToHeight();
//             else fitToWidth();
//         } else if (this.singlePage && r1 < 2 * r2) {
//             this.sc = r2 > r1 ? (zoomMin * r1) / (r2 * s) : 1;
//             if (w / h > pw / ph) fitToHeight();
//             else fitToWidth();
//         } else {
//             this.view = 2;
//             this.sc = r1 < 2 * r2 ? (zoomMin * r1) / (2 * r2 * s) : 1;
//             if (w / h >= bw / bh) fitToHeight();
//             else fitToWidth();
//         }

//         this.zoom = zoom;
//         this.onZoom(zoom);
//     }

//     zoomOut(value) {
//         this.zoomTo(value);
//     }

//     move(direction) {
//         if (this.zoom <= 1) return;

//         const slide = this.slides[this.currentSlide];
//         const zp = slide && slide.zoomPan;
//         if (!zp) return;

//         const offset = 20 * this.zoom;

//         switch (direction) {
//             case 'left':
//                 zp.panBy(+offset, 0);
//                 break;
//             case 'right':
//                 zp.panBy(-offset, 0);
//                 break;
//             case 'up':
//                 zp.panBy(0, +offset);
//                 break;
//             case 'down':
//                 zp.panBy(0, -offset);
//                 break;
//         }
//     }

//     onZoom(zoom) {
//         if (zoom > 1) {
//             this.disableFlip();
//             this.enablePan();
//         } else {
//             this.enableFlip();
//             this.disablePan();
//         }

//         this.options.main.onZoom(zoom);
//     }

//     rotateLeft() {
//         this.rotation = (this.rotation + 360 - 90) % 360;
//         for (var i = 0; i < this.pagesArr.length; i++) this.pagesArr[i].setRotation(this.rotation);
//         this.resizeInnerSlides();
//         this.onResize();
//     }

//     rotateRight() {
//         this.rotation = (this.rotation + 360 + 90) % 360;
//         for (var i = 0; i < this.pagesArr.length; i++) this.pagesArr[i].setRotation(this.rotation);
//         this.resizeInnerSlides();
//         this.onResize();
//     }

//     onPageUnloaded(i) {
//         var index = this.options.rightToLeft ? this.options.numPages - i - 1 : i;
//         this.pagesArr[index].unload();
//     }

//     disableFlip() {
//         this.flipEnabled = false;
//         this._outerSwipeEnabled = false;
//     }

//     enableFlip() {
//         if (this.options.numPages == 1) {
//             this.disableFlip();
//             return;
//         }
//         this.flipEnabled = true;
//         this._outerSwipeEnabled = true;
//     }

//     enablePan() {
//         for (let i = 0; i < 3; i++) this.slides[i].zoomPan && this.slides[i].zoomPan.enable();
//     }

//     disablePan() {
//         for (let i = 0; i < 3; i++) this.slides[i].zoomPan && this.slides[i].zoomPan.disable();
//     }
// };

FLIPBOOK.PageSwipe = class {
    constructor(book, index, texture, html) {
        this.rotation = 0;
        this.index = index;
        this.options = book.options;
        this.texture = texture;
        this.html = html;
        this.index = index;

        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('flipbook-carousel-page');
        this.wrapper.dataset.page = index + 1;
        this.main = book.main;
        this.book = book;

        this.inner = document.createElement('div');
        this.inner.classList.add('flipbook-carousel-page-inner');
        this.wrapper.appendChild(this.inner);

        this.bg = document.createElement('div');
        this.bg.classList.add('flipbook-carousel-page-bg');
        this.inner.appendChild(this.bg);

        this.htmlElement = document.createElement('div');
        this.htmlElement.classList.add('flipbook-page3-html');
        this.htmlElement.style.width = (1000 * this.options.pageWidth) / this.options.pageHeight + 'px';
        this.htmlElement.style.transform = 'scale(' + this.options.pageHeight / 1000 + ') translateZ(0)';
        this.inner.appendChild(this.htmlElement);

        if (this.options.doublePage) {
            if (!this.options.rightToLeft && this.index % 2 === 0 && this.index > 0) {
                this.htmlElement.style.left = '-100%';
            } else if (this.options.rightToLeft && this.index % 2 === 1 && this.index > 0) {
                this.htmlElement.style.left = '-100%';
            } else {
                this.htmlElement.style.left = '0';
            }
        }

        this.preloader = this._createSpinner();
        this.inner.appendChild(this.preloader);

        this.setSize(this.pw, this.ph);
    }

    _createSpinner() {
        // pagePreloader: legacy per-page custom image option.
        if (this.options.pagePreloader) {
            var img = new Image();
            img.src = this.options.pagePreloader;
            img.className = 'flipbook-page-preloader-image';
            return img;
        }
        // Reuse the main flipbook preloader's DOM so a custom
        // options.preloader (or default speeding-wheel) shows the same way
        // per-page as it does at startup.
        var mainPreloader = this.main && this.main.preloader;
        var sourceEl = mainPreloader && mainPreloader.jquery ? mainPreloader[0] : mainPreloader;
        if (sourceEl && sourceEl.cloneNode) {
            var clone = sourceEl.cloneNode(true);
            clone.classList.remove('flipbook-hidden');
            clone.style.display = '';
            clone.style.position = '';
            return clone;
        }
        // Fallback (constructor ran before main.preloader existed).
        var wrap = document.createElement('div');
        wrap.className = 'flipbook-preloader cssload-container';
        var wheel = document.createElement('div');
        wheel.className = 'cssload-speeding-wheel';
        wrap.appendChild(wheel);
        return wrap;
    }

    // Scale up the inner CSS box to (pageWidth × s) × (pageHeight × s) and
    // counter-shrink via inner transform: scale(1/s) translateZ(0). The
    // IMG (height: 100%) and html overlay grow with the box; Safari then
    // rasterizes them at native resolution = sharp instead of GPU-stretching
    // the cached fit-size raster from PanZoom's transform.
    //
    // Why the inner, not the wrapper: .flipbook-carousel-page is
    // display:inline-block in the slide, so resizing its CSS box width
    // pushes the right page out of position via inline flow. The inner is
    // position:absolute filling the wrapper, so we can grow/scale it
    // freely without disturbing page layout. translateZ(0) forces a 3D
    // context so the inner gets its own compositor layer.
    setRealSize(s) {
        if (this._realScale === s) return;
        this._realScale = s;
        var o = this.options;
        var w, h;
        if (this.rotation === 90 || this.rotation === 270) {
            w = o.pageHeight * s;
            h = o.pageWidth * s;
        } else {
            w = o.pageWidth * s;
            h = o.pageHeight * s;
        }
        this.inner.style.width = w + 'px';
        this.inner.style.height = h + 'px';
        this.inner.style.transformOrigin = '0 0';
        this.inner.style.transform = 'scale(' + (1 / s) + ') translateZ(0)';
        this.htmlElement.style.transform = 'scale(' + ((o.pageHeight / 1000) * s) + ') translateZ(0)';
    }

    resetSize() {
        if (!this._realScale || this._realScale === 1) return;
        this._realScale = 1;
        this.inner.style.width = '';
        this.inner.style.height = '';
        this.inner.style.transformOrigin = '';
        this.inner.style.transform = '';
        this.htmlElement.style.transform = 'scale(' + (this.options.pageHeight / 1000) + ') translateZ(0)';
    }

    load(callback, thumb, sizeOverride) {
        // Tier resolution: explicit override > book's current tier > large.
        // book.targetTier is small at fit, large when zoomed (set in onZoom).
        var size = sizeOverride || (this.book && this.book.targetTier) || this.options.pageTextureLarge;

        if (this.size >= size) {
            if (!thumb) this.loadHTML();
            if (callback) callback.call(this);
            return;
        }

        this.size = size;

        var self = this;
        var index = this.options.rightToLeft ? this.options.numPages - this.index - 1 : this.index;
        var o = this.options;
        var p = o.pages[index];

        this.options.main.loadPage(index, size, function (page) {
            page = page || {};

            // A higher-tier load may have completed in between (zoom-in race).
            // Drop this older render so we don't put a smaller bitmap on top
            // of a larger one.
            if (self.size > size) {
                if (!thumb) self.loadHTML();
                if (callback) callback.call(self);
                return;
            }

            if (page && page.image) {
                var img = page.image[size] || page.image;
                img.classList.add('page-carousel-img');

                if (self.index % 2 == 0 && ((p && p.side == 'left') || (p && p.side == 'right'))) {
                    if (!img.clone) {
                        img.clone = new Image();
                        img.clone.src = img.src;
                    }
                    img = img.clone;
                }

                if (self.options.rightToLeft) {
                    if (self.options.doublePage && self.index < self.options.numPages - 1 && self.index % 2 == 1) {
                        img.style.left = '-100%';
                    }
                    if (self.options.doublePage) {
                        if (self.index == self.options.numPages - 1 || (self.index == 0 && self.options.backCover)) {
                            img.style.width = '100%';
                        } else {
                            img.style.width = '200%';
                        }
                    } else {
                        img.style.width = '100%';
                    }
                } else {
                    if (self.options.doublePage && self.index > 0 && self.index % 2 == 0) {
                        img.style.left = '-100%';
                    }
                    if (self.options.doublePage) {
                        if (self.index == 0 || (self.index == self.options.numPages - 1 && self.options.backCover)) {
                            img.style.width = '100%';
                        } else {
                            img.style.width = '200%';
                        }
                    } else {
                        img.style.width = '100%';
                    }
                }

                // Decode-await before swap so the new IMG is paint-ready when
                // it replaces the old one — avoids a flash of empty bg during
                // a tier upgrade. Mirrors PageBook3.loaded(). Re-check size
                // inside doSwap because another upgrade may have raced past
                // us during the await.
                var doSwap = function () {
                    if (self.size > size) return;
                    self.bg.appendChild(img);
                    Array.from(self.bg.children).forEach((c) => {
                        if (c !== img && c.tagName === 'IMG') self.bg.removeChild(c);
                    });
                    if (self.preloader && self.preloader.parentNode) {
                        self.preloader.remove();
                    }
                };
                if (img.decode) img.decode().then(doSwap, doSwap);
                else doSwap();
            }

            self.setRotation();

            if (!thumb) self.loadHTML();
            if (callback) callback.call(self);
        });
    }

    loadHTML() {
        var self = this;
        var index = !this.options.rightToLeft ? this.index : this.options.numPages - this.index - 1;

        if (this.htmlContent) {
            this.updateHtmlContent();
        } else {
            this.options.main.loadPageHTML(index, function (html) {
                self.htmlContent = html;
                self.updateHtmlContent();
            });
        }
    }

    hideHTML() {
        if (this.htmlContentVisible) {
            this.htmlElement.innerHTML = '';
            this.htmlContentVisible = false;
            this.main.trigger('hidepagehtml', { page: this });
        }
    }

    startHTML() {
        this.book.startPageItems(this.wrapper);
    }

    unload() {
        this.pageSize = 0;
        this.size = 0;
        // Drop any IMG bitmaps from bg so iOS releases the compositor
        // backing store. Without this, large-tier images accumulate
        // across many flips and exhaust GPU memory (no zoom required —
        // pageTextureLarge alone is ~16MB per page × 50+ pages = OOM).
        if (this.bg) {
            Array.from(this.bg.children).forEach((c) => {
                if (c.tagName === 'IMG') this.bg.removeChild(c);
            });
        }
        // Also drop the IMG ref cached in main page-data (where pdfservice
        // stores the rendered IMG keyed by tier). Without this, the
        // HTMLImageElement keeps its decoded bitmap in JS heap even after
        // we detach from DOM — same effective leak. delete frees the ref;
        // next load() call re-renders fresh from PDF.
        const o = this.options;
        const index = o.rightToLeft ? o.numPages - this.index - 1 : this.index;
        if (o.pages[index] && o.pages[index].images) {
            delete o.pages[index].images;
        }
        if (this.preloader && !this.preloader.parentNode) {
            this.inner.appendChild(this.preloader);
        }
    }

    dispose() {
        if (this.pageSize) {
            this.pageSize = null;
            this.bg.innerHTML = '';
        }
    }

    setSize() {
        var w = this.options.pageWidth;
        var h = this.options.pageHeight;

        if (this.rotation === 0 || this.rotation === 180) {
            this.wrapper.style.width = w + 'px';
            this.wrapper.style.height = h + 'px';
            this.pw = w;
            this.ph = h;
        } else {
            this.wrapper.style.width = h + 'px';
            this.wrapper.style.height = w + 'px';
            this.pw = h;
            this.ph = w;
        }

        this.updateHtmlContent();
    }

    setRotation(val) {
        this.setSize();

        if (this.options.doublePage) return;

        if (typeof val != 'undefined') {
            this.rotation = val;
        }
        if (this.img) {
            this.img.style.transform = 'rotate(' + this.rotation + 'deg) translateZ(0)';
            if (this.rotation === 90 || this.rotation === 270) {
                this.img.style.width = this.wrapper.clientHeight + 'px';
                this.img.style.height = this.wrapper.clientWidth + 'px';
            } else {
                this.img.style.width = this.wrapper.clientWidth + 'px';
                this.img.style.height = this.wrapper.clientHeight + 'px';
            }
        }
    }

    updateHtmlContent() {
        var c = this.htmlContent;

        if (c && !this.htmlContentVisible) {
            this.htmlContentVisible = true;
            this.htmlElement.innerHTML = '';
            this.htmlElement.appendChild(this.htmlContent);
            this.main.trigger('showpagehtml', { page: this });
        }
        this.startHTML();
    }
};
