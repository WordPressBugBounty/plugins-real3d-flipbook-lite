'use strict';

FLIPBOOK.Book3 = class extends FLIPBOOK.Book {
    constructor(el, main, options) {
        super(main, options);

        // Decouple book layout coordinates from texture size, matching WebGL mode.
        // Without this, pageWidth/pageHeight inherit pageTextureLarge (e.g. 2500),
        // which makes iOS allocate compositor backing stores per page at the full
        // texture size and blows the GPU memory budget. PanZoom scales the book
        // visually; the texture <img> still renders at full pageTextureLarge inside.
        const aspect = options.pageWidth / options.pageHeight;
        options.pageHeight = 1000;
        options.pageWidth = Math.round(1000 * aspect);
        this.pageWidth = options.pageWidth;
        this.pageHeight = options.pageHeight;

        // Set up the wrapper and parent container
        this.wrapper = el;
        this.wrapper.classList.add('flipbook-book3');
        this.bookLayer = this.wrapper.parentNode;
        this.bookLayer.classList.add('flipbook-mode-3d');

        // Insert a viewport between bookLayer and the book. Mirrors
        // BookScroll's bookLayer/viewport split — overlays appended
        // to bookLayer afterwards (e.g. arrow buttons, flipbook-nav)
        // stay fixed because they're siblings of the viewport, not
        // descendants of the panned book.
        this.viewport = document.createElement('div');
        this.viewport.className = 'flipbook-pan-viewport';
        this.bookLayer.insertBefore(this.viewport, this.wrapper);
        this.viewport.appendChild(this.wrapper);

        this.flipEasing = 'easeOutQuad';
        this.translateZ = '';

        // Set book's natural layout size before PanZoom captures it.
        this.wrapper.style.width = `${2 * this.pageWidth}px`;
        this.wrapper.style.height = `${this.pageHeight}px`;

        this._realScalePages = [];

        const center = document.createElement('div');
        center.className = 'flipbook-center-container3';
        center.style.cssText = `width:${this.pageWidth * 2}px;height:${this.pageHeight}px;`;
        this.wrapper.appendChild(center);
        this.centerContainer = center;

        this.iscroll = new FLIPBOOK.PanZoom(this.viewport, {
            zoomMin: options.zoomMin || 0.95,
            zoomMax: options.zoomMax || 4,
            naturalWidth: 2 * this.pageWidth,
            naturalHeight: this.pageHeight,
        });

        main.on('disableIScroll', this.disableIscroll.bind(this));
        main.on('enableIScroll', this.enableIscroll.bind(this));

        this.iscroll.on('zoomEnd', () => {
            if (isNaN(this.iscroll.scale)) {
                return this.zoomTo(options.zoomMin);
            }

            options.main.onZoom(this.iscroll.scale / this.ratio);
            this.updateVisiblePages();

            this.zoomed = options.main.zoom > 1;
        });

        const perspective = this.options.perspective || (this.options.viewMode === '3d' ? 3 * this.pageHeight : 200000);
        this.centerContainer.style.perspective = `${perspective}px`;

        this.pagesArr = [];
        this.animating = false;

        var p = this.options.pages;

        for (let i = 0; i < this.numSheets; i++) {
            const page = new FLIPBOOK.Page3(this, i);
            this.pagesArr.push(page);
            this.centerContainer.appendChild(page.wrapper);
        }

        this.createShadowURL(1024).then((url) => {
            this.wrapper.style.setProperty('--flipbook-page-shadow-image', `url(${url})`);
        });
    }

    createShadowURL(width = 2048) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = 1;

        const ctx = canvas.getContext('2d');

        const g = ctx.createLinearGradient(0, 0, width, 0);

        g.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
        g.addColorStop(0.01, 'rgba(0, 0, 0, 0.95)');
        g.addColorStop(0.025, 'rgba(0, 0, 0, 0.85)');
        g.addColorStop(0.06, 'rgba(0, 0, 0, 0.70)');
        g.addColorStop(0.12, 'rgba(0, 0, 0, 0.55)');
        g.addColorStop(0.22, 'rgba(0, 0, 0, 0.38)');
        g.addColorStop(0.38, 'rgba(0, 0, 0, 0.22)');
        g.addColorStop(0.6, 'rgba(0, 0, 0, 0.10)');
        g.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, 1);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(URL.createObjectURL(blob));
            }, 'image/png');
        });
    }

    enableIscroll() {
        if (this.iscrollDisabled) {
            this.iscroll.enable();
            this.iscrollDisabled = false;
        }
    }

    disableIscroll() {
        if (!this.iscrollDisabled) {
            this.iscroll.disable();
            this.iscroll.initiated = false;
            this.iscrollDisabled = true;
        }
    }

    enableMouseWheelZoom() {
        this.iscroll.options.eventPassthrough = 'vertical';
        this.iscroll.refresh();
    }

    disableMouseWheelZoom() {
        this.iscroll.options.eventPassthrough = '';
        this.iscroll.refresh();
    }

    enablePrev(val) {
        this.prevEnabled = val;
    }

    enablePan() {
        this.iscroll.enable();
    }

    disablePan() {
        this.iscroll.disable();
    }

    setRightIndex(val) {
        this.rightIndex = val;
    }

    enableNext(val) {
        this.nextEnabled = val;
    }

    isZoomed() {
        return this.options.main.zoom > this.options.zoomMin && this.options.main.zoom > 1;
    }

    getNumPages() {}

    move(direction) {
        if (this.zoom <= 1) {
            return;
        }

        var iscroll = this.iscroll;
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

            if (posX > 0) {
                posX = offset2;
            }
            if (posX < iscroll.maxScrollX) {
                posX = iscroll.maxScrollX - offset2;
            }
            if (posY > 0) {
                posY = offset2;
            }
            if (posY < iscroll.maxScrollY) {
                posY = iscroll.maxScrollY - offset2;
            }

            iscroll.scrollTo(posX, posY, 0);
        }
    }

    zoomTo(zoom, time, x, y) {
        if (!this.enabled) {
            return;
        }

        x = x || 0;
        y = y || 0;
        time = time || 0;
        this.zoom = zoom;

        // Any zoom change reverts the real-size commit. The 150ms timer
        // in zoomEnd will re-commit if the new zoom > 1 settles.
        this._resetRealSize();

        var iscroll = this.iscroll;
        if (iscroll) {
            iscroll.zoom(zoom * this.ratio, x, y, time);
        }
    }

    setWrapperW(w) {
        if (this.wrapperW != w) {
            this.wrapper.style.width = w + 'px';
            this.wrapperW = w;
            // Keep PanZoom's natural size in sync so its scroll-mode
            // bounds & focal math use the new wrapper width on view
            // changes (single ↔ spread).
            if (this.iscroll && this.iscroll.setNaturalSize) {
                this.iscroll.setNaturalSize(w, this.pageHeight);
            }
        }
    }

    updateBookPosition() {
        if (this.singlePage) {
            this.setWrapperW(this.pageWidth);
            if (this.iscroll) {
                this.iscroll.refresh();
            }
            this.view = 1;
            this.focusRight();
            return;
        }

        if (this.view == 1) {
            this.setWrapperW(this.pageWidth);
        } else {
            this.setWrapperW(2 * this.pageWidth);
        }
        if (this.iscroll) {
            this.iscroll.refresh();
        }

        if (this.view == 2) {
            if (this.isCover()) {
                this.focusRight();
            } else if (this.isBackCover()) {
                if (!this.options.cover) {
                    this.focusBoth();
                } else {
                    this.focusLeft();
                }
            } else {
                this.focusBoth();
            }
        } else if (this.view == 1) {
            if (this.isCover()) {
                this.focusRight();
            } else if (this.isBackCover()) {
                this.focusLeft();
            }
        }
    }

    focusLeft(time, delay) {
        var pos = this.view == 1 || this.singlePage ? 0 : this.pageWidth / 2;

        this.setBookPosition(pos, time, delay);
    }

    focusRight(time, delay, updatePageNumber) {
        var pos = this.view == 1 || this.singlePage ? -this.pageWidth : -this.pageWidth / 2;

        this.setBookPosition(pos, time, delay, updatePageNumber);
    }

    focusBoth(time, delay) {
        var pos = this.view == 1 ? -this.pageWidth / 2 : 0;

        this.setBookPosition(pos, time, delay);
    }

    setBookPosition(pos, time, delay, updatePageNumber) {
        if (this.centerContainerPosition == pos) {
            return;
        }
        var start = this.centerContainerPosition;

        if (time) {
            var self = this;
            delay = delay || 0;

            const animationParams = {
                from: start,
                to: pos,
                delay,
                duration: time,
                step(now) {
                    self.centerContainer.style.transform = 'translateX(' + now + 'px) ' + self.translateZ;
                },
                complete() {
                    self.centerContainerPosition = pos;
                    if (updatePageNumber) {
                        self.updateFlipped();
                        self.options.main.turnPageComplete();
                    }
                },
            };

            this.animate(animationParams);
        } else if (this.centerContainerPosition != pos) {
            this.centerContainerPosition = pos;
            this.centerContainer.style.transform = 'translateX(' + pos + 'px) ' + this.translateZ;

            this.updateFlipped();
            this.options.main.turnPageComplete();
        }
    }

    updateSinglePage(singlePage) {
        if (singlePage == this.singlePage) return;
        this.singlePage = singlePage;

        var p = this.options.pages;
        var evenPages = p.length % 2 == 0;
        var numSheets = evenPages ? p.length / 2 : (p.length + 1) / 2;
        if (!this.options.cover && evenPages) {
            numSheets += 1;
        }
        if (this.options.singlePageMode || this.singlePage) numSheets = p.length;
        this.numSheets = numSheets;

        let ri = this.rightIndex;
        if (ri > 0) {
            if (this.singlePage) {
                ri--;
            } else if (ri % 2 == 1) {
                ri++;
            }
            this.setRightIndex(ri);
        }
        this.resetLoadedPages();
        this.onResize();
        this.updateVisiblePages();
    }

    resetLoadedPages() {
        this.pagesArr.forEach(function (page) {
            if (page.bgFront) page.bgFront.replaceChildren();
            if (page.bgBack) page.bgBack.replaceChildren();
            page.sizeFront = 0;
            page.sizeBack = 0;

            if (page.html.front) page.html.front.replaceChildren();
            if (page.html.back) page.html.back.replaceChildren();
            if (page.htmlContent) {
                page.htmlContent.front = null;
                page.htmlContent.back = null;
            }
            if (page.htmlLoaded) {
                page.htmlLoaded.front = null;
                page.htmlLoaded.back = null;
            }
            page._sidePromises = null;
            page._sideHTMLPromises = null;
        });
    }

    async updateVisiblePages(loadNextPrev) {
        if (typeof loadNextPrev == 'undefined') {
            loadNextPrev = true;
        }
        var index = this.rightIndex;
        if (!this.singlePage) {
            index /= 2;
        }

        var p = this.options.pages;
        var evenPages = p.length % 2 == 0;
        var numSheets = evenPages ? p.length / 2 : (p.length + 1) / 2;
        if (!this.options.cover && evenPages) {
            numSheets += 1;
        }
        if (this.options.singlePageMode || this.singlePage) numSheets = p.length;

        this.visibleSheets = [];
        for (let i = 0; i < numSheets; i++) {
            this.visibleSheets.push(this.pagesArr[i]);
        }

        var right = this.visibleSheets[index];
        var next = this.visibleSheets[index + 1];
        var left = this.visibleSheets[index - 1];
        var prev = this.visibleSheets[index - 2];

        if (left) {
            left._setAngle(180);
        }
        if (right) {
            right._setAngle(0);
        }

        for (var i = 0; i < this.pagesArr.length; i++) {
            if (this.pagesArr[i] == right) {
                this.pagesArr[i].show();
                this.pagesArr[i].unpauseHtml('front');
                this.pagesArr[i].pauseHtml('back');
            } else if (this.pagesArr[i] == left && !this.singlePage) {
                this.pagesArr[i].show();
                this.pagesArr[i].unpauseHtml('back');
                this.pagesArr[i].pauseHtml('front');
            } else {
                this.pagesArr[i].hide();
            }

            this.pagesArr[i]._setZIndex(0);
        }
        this.updateBookPosition();

        if (left && !this.singlePage) {
            await this.loadPageAsync(left, 'back');
            this.pageLoaded(left, 'back');
        }
        if (right) {
            await this.loadPageAsync(right, 'front');
            this.pageLoaded(right, 'front');
        }

        if (left && !this.singlePage) await this.loadHTMLAsync(left, 'back');
        if (right) await this.loadHTMLAsync(right, 'front');

        if (next) {
            await this.loadPageAsync(next, 'front');
            this.pageLoaded(next, 'front');
        }
        if (right) {
            await this.loadPageAsync(right, 'back');
            this.pageLoaded(right, 'back');
        }

        if (prev) {
            await this.loadPageAsync(prev, 'back');
            this.pageLoaded(prev, 'back');
        }
        if (left) {
            await this.loadPageAsync(left, 'front');
            this.pageLoaded(left, 'front');
        }

        // Schedule real-size commit 150ms after visible-pages update settles.
        // Covers both zoom (zoomEnd → updateVisiblePages) and page flips
        // (goToPage complete → updateVisiblePages). Tier images are loaded
        // by the awaits above so sizeFront/sizeBack reflect current state.
        clearTimeout(this._commitTimer);
        this._commitTimer = setTimeout(() => {
            this._commitTimer = null;
            this._commitRealSize();
        }, 150);
    }

    enable() {
        this.onResize();
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    getLeftPage() {
        return this.pagesArr[this.flippedleft - 1];
    }

    getRightPage() {
        return this.pagesArr[this.flippedleft];
    }

    getLeftBackPage() {
        return this.pagesArr[this.flippedleft - 2];
    }

    getRightBackPage() {
        return this.pagesArr[this.flippedleft + 1];
    }

    getNextPage() {
        return this.pagesArr[this.flippedleft + 2];
    }

    getPrevPage() {
        return this.pagesArr[this.flippedleft - 3];
    }

    nextPage() {
        if (!this.nextEnabled) {
            return;
        }

        if (this.view == 1 && this.isFocusedLeft() && !this.singlePage) {
            var duration = 700;
            var d = (this.options.pageFlipDuration * duration) / 2;
            this.focusRight(d, 0, true);
            return;
        }
        this.goToPage(this.rightIndex + 2);
    }

    prevPage() {
        if (!this.prevEnabled) {
            return;
        }

        if (this.view == 1 && this.isFocusedRight() && !this.singlePage) {
            var duration = 700;
            var d = (this.options.pageFlipDuration * duration) / 2;
            this.focusLeft(d, 0, true);
            return;
        }
        var target = this.singlePage ? this.rightIndex : this.rightIndex - 2;
        this.goToPage(target);
    }

    goToPage(index, instant) {
        if (!this.enabled || this.flipping || isNaN(index)) {
            return;
        }

        // Flip starts → revert real-size pages to default for performance.
        this._resetRealSize();

        if (this.singlePage || index % 2 != 0) {
            index--;
        }

        if (index < 0) {
            index = 0;
        }

        if (index > this.numSheets * 2) {
            index = this.numSheets * 2;
        }

        if (index == this.rightIndex) {
            return;
        }

        if (instant || this.options.instantFlip) {
            this.setRightIndex(index);
            this.updateFlipped();
            this.updateVisiblePages();
            this.options.main.turnPageComplete();
        } else {
            var self = this;
            var end;
            var duration = 600;
            var d = this.options.pageFlipDuration * duration;
            var easing = this.flipEasing;

            if (index > this.rightIndex) {
                end = 180;
                if (self.angle <= 0 || self.angle >= 180 || !self.angle) {
                    self.angle = 1;
                }
            } else if (index < this.rightIndex) {
                end = -180;
                if (self.angle >= 0 || self.angle <= -180 || !self.angle) {
                    self.angle = -1;
                }
            }

            this.flipping = true;

            if (!this.singlePage) {
                if (this.view == 1) {
                    if (index < this.rightIndex) {
                        this.focusRight(d);
                    } else {
                        this.focusLeft(d);
                    }
                } else {
                    if (index == 0) {
                        this.focusRight(d);
                    } else if (index == this.visibleSheets.length * 2) {
                        this.focusLeft(d);
                    } else {
                        this.focusBoth(d);
                    }
                }
            }

            this.goingToPage = index;

            if (this.singlePage) {
                d /= 2;
            }

            const animationParams = {
                from: self.angle,
                to: end,
                duration: d,
                easing: easing,
                step(now) {
                    self._setPageAngle(now);
                },
                complete() {
                    self.setRightIndex(self.goingToPage);
                    self.angle = 0;
                    self.flipping = false;

                    self.updateFlipped();
                    self.updateVisiblePages();
                    self.options.main.turnPageComplete();
                },
            };
            this.animate(animationParams);

            this.options.main.turnPageStart();
        }
    }

    animate(params) {
        FLIPBOOK.animate(params);
    }

    updateFlipped() {
        if (this.singlePage) {
            this.flippedleft = this.rightIndex;
        } else {
            this.flippedleft = (this.rightIndex + (this.rightIndex % 2)) / 2;
        }
        this.flippedright = this.numSheets - this.flippedleft;
    }

    onSwipe(event, phase, distanceX, distanceY, duration, fingerCount) {
        if (this.isZoomed() || event.target.className === 'flipbook-page-link' || this.flipping) {
            return;
        }

        const angle = (-distanceX * 180) / this.main.wrapperW;
        const threshold = 5;
        const distance = Math.abs(distanceX);

        if (phase === 'start') {
            this.dragging = true;
            this.main.dragPage();
            // Snapshot focus + start position so portrait one-page-view drag
            // (below) can keep referencing them after centerContainer moves.
            this._dragStartFocus = (this.view == 1 && !this.singlePage)
                ? (this.isFocusedLeft() ? 'left' : (this.isFocusedRight() ? 'right' : null))
                : null;
            this._dragStartPos = this.centerContainerPosition;
            return;
        }

        // Portrait one-page view (view == 1, double-page layout): a drag in
        // the focus-shift direction (focused-left → swipe-left, focused-right
        // → swipe-right) translates centerContainer with the finger so the
        // slide follows touch instead of jumping on touchend. Cross-spread
        // drags (focused-left + swipe-right etc.) still use the rotation
        // flip below.
        const slideMode = this._dragStartFocus
            && ((this._dragStartFocus === 'left' && angle > 0)
                || (this._dragStartFocus === 'right' && angle < 0));

        if (slideMode && phase === 'move' && fingerCount <= 1) {
            if (Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 10) return;
            if (event && event.cancelable) event.preventDefault();
            if (distance <= threshold) return;
            // distanceX is screen px; centerContainer translate is layout px
            // (PanZoom scales the wrapper for fit). Convert so the book
            // moves 1:1 with the finger.
            const scale = (this.iscroll && this.iscroll.scale) || 1;
            const distanceLayout = distanceX / scale;
            const startPos = this._dragStartPos;
            const endPos = this._dragStartFocus === 'left' ? -this.pageWidth : 0;
            let pos = startPos + distanceLayout;
            // Clamp to [endPos, startPos] (or [startPos, endPos] when sliding
            // right) so the user can't overshoot past either focus position.
            if (this._dragStartFocus === 'left') pos = Math.max(endPos, Math.min(startPos, pos));
            else pos = Math.min(endPos, Math.max(startPos, pos));
            this.centerContainer.style.transform = 'translateX(' + pos + 'px) ' + this.translateZ;
            this.centerContainerPosition = pos;
            return;
        }

        if (slideMode && (phase === 'end' || phase === 'cancel')) {
            // Commit if past 20% of page width OR a fast flick (vx > 0.8 px/ms,
            // matching BookSwipe's fling threshold). Otherwise snap back.
            // nextPage/prevPage in view==1+focused* will call focusRight/focusLeft
            // which animates from the current (dragged) centerContainerPosition
            // to the target — smooth continuation, no jump.
            // distance is screen px; pageWidth is layout px — convert to compare.
            const scale = (this.iscroll && this.iscroll.scale) || 1;
            const distanceLayout = distance / scale;
            const vx = duration ? distanceX / duration : 0;
            const fling = Math.abs(vx) > 0.8;
            const commit = fingerCount <= 1 && (distanceLayout > this.pageWidth * 0.2 || fling);
            if (commit) {
                angle > 0 ? this.nextPage() : this.prevPage();
            } else {
                this._dragStartFocus === 'left' ? this.focusLeft(200) : this.focusRight(200);
            }
            this._dragStartFocus = null;
            this.dragging = false;
            return;
        }

        // Reached end without slideMode engaging — clear snapshot so it
        // doesn't leak into the next gesture.
        if (phase === 'end' || phase === 'cancel') this._dragStartFocus = null;

        if ((phase === 'end' || phase === 'cancel') && fingerCount <= 1 && distance > threshold) {
            angle > 0 ? this.nextPage() : this.prevPage();
            this.dragging = false;
            return;
        }

        if (phase === 'move' && fingerCount <= 1) {
            // Treat clearly-vertical drags as page scroll — bail so the
            // browser handles it natively. Anything else (horizontal or
            // ambiguous) we consume; preventDefault stops native pan-y
            // from running concurrently with the flip preview.
            if (Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 10) {
                return;
            }
            if (event && event.cancelable) event.preventDefault();

            if (!this.dragging || distance <= threshold) return;

            let increment = angle > 0 ? (this.singlePage ? 1 : 2) : this.singlePage ? -1 : -2;
            if ((angle > 0 && !this.nextEnabled) || (angle < 0 && !this.prevEnabled)) {
                return;
            }

            this.goingToPage = this.rightIndex + increment;

            if (
                this.goingToPage !== this.rightIndex &&
                this.goingToPage >= 0 &&
                this.goingToPage <= this.pagesArr.length * 2 &&
                !this.options.instantFlip
            ) {
                this._setPageAngle(angle);
            }
        }
    }

    pauseHtml() {
        for (var i = 0; i < this.pagesArr.length; i++) {
            this.pagesArr[i].pauseHtml();
        }
    }

    _setPageAngle(angle) {
        if (this.angle == angle) {
            return;
        }

        this.angle = angle;

        var prev;
        var next;
        var left;
        var right;
        this.angle = angle;
        // this.pauseHtml();

        var ri = this.rightIndex;
        var ri2 = this.goingToPage;
        // if (this.options.rightToLeft && !this.options.backCover) {
        //     ri--;
        //     ri2--;
        // }

        var flippping;

        if (this.singlePage) {
            right = this.visibleSheets[ri];
            left = this.visibleSheets[ri - 1];
            if (angle > 0) {
                right._setAngle(angle / 2);
                next = this.visibleSheets[ri2];
                if (next) {
                    next.show();
                    this.loadPageAsync(next, 'front');
                }
            } else {
                left = this.visibleSheets[ri2];
                left.show();
                this.loadPageAsync(left, 'front');
                left._setAngle(angle / 2 + 90);
            }

            if (next) {
                next._setAngle(0);
            }
            if (prev) {
                prev._setAngle(90);
            }
        } else {
            right = this.visibleSheets[ri / 2];
            left = this.visibleSheets[ri / 2 - 1];
            var newRight = this.visibleSheets[ri2 / 2 - 1];
            var newLeft = this.visibleSheets[ri2 / 2];
            if (angle > 0) {
                if (this.view == 1 && this.isFocusedLeft()) {
                    return;
                }
                //flipping from right to left
                //angle 0 -> 180

                if (angle < 90) {
                    flippping = right;
                    if (newRight && newRight !== flippping) newRight.hide();
                } else {
                    flippping = newRight;
                    if (right !== flippping) right.hide();
                }
                flippping.show();
                flippping._setAngle(angle);
                next = this.visibleSheets[ri2 / 2];
                if (next) {
                    next.show();
                    this.loadPageAsync(next, 'front');
                }

                this.loadPageAsync(flippping, 'back');
            } else {
                if (this.view == 1 && this.isFocusedRight()) {
                    return;
                }
                //flipping from left to right
                //angle 0 -> -180

                if (angle > -90) {
                    flippping = left;
                    if (newLeft && newLeft !== flippping) newLeft.hide();
                } else {
                    flippping = newLeft;
                    if (left !== flippping) left.hide();
                }
                flippping.show();
                flippping._setAngle(180 + angle);
                prev = this.visibleSheets[ri2 / 2 - 1];
                if (prev) {
                    prev.show();
                    this.loadPageAsync(prev, 'back');
                }
                this.loadPageAsync(flippping, 'front');
            }

            if (next) {
                next._setAngle(0);
            }
            if (prev) {
                prev._setAngle(180);
            }
        }
    }

    isCover() {
        return this.rightIndex == 0;
    }

    isBackCover() {
        return this.rightIndex == this.numSheets * 2;
    }

    onPageUnloaded(index) {
        var pageIndex = index;

        if (this.options.rightToLeft) {
            pageIndex = this.pagesArr.length * 2 - index - 1;
        }

        if (this.pagesArr[pageIndex]) {
            this.pagesArr[pageIndex].unload();
        }
    }

    onResize() {
        var self = this;

        var main = this.main;
        var w = main.wrapperW;
        var h = main.wrapperH - 2 * main.bookVerticalPadding;
        // Use Book3's normalized 1000-tall layout coords (not main.bookH/pageH which
        // were cached at texture size). PanZoom's scale then maps directly to the
        // user-facing zoom value without any compensation factor.
        var bw = 2 * this.pageWidth;
        var bh = this.pageHeight;
        var pw = this.pageWidth;
        var ph = this.pageHeight;
        var r1 = w / h;
        var r2 = pw / ph;
        var options = this.options;

        function fitToHeight() {
            self.ratio = h / bh;
            fit();
        }

        function fitToWidth() {
            self.ratio = self.view == 1 ? w / pw : w / bw;
            fit();
        }

        function fit() {
            if (self.iscroll) {
                self.iscroll.options.zoomMin = self.ratio * options.zoomMin;
                self.iscroll.options.zoomMax = self.ratio * options.zoomMax;
            }

            self.updateBookPosition();
            if (self.iscroll) {
                self.iscroll.zoom(self.ratio * options.main.zoom, w / 2, h / 2, 0);
            }

            self.bookScale = self.iscroll.scale;
        }

        var s = Math.min(this.zoom, 1);

        var zoomMin = Number(this.options.zoomMin);

        if (
            this.singlePage ||
            (this.options.responsiveView &&
                w <= this.options.responsiveViewTreshold &&
                r1 < 2 * r2 &&
                r1 < this.options.responsiveViewRatio)
        ) {
            this.view = 1;

            if (r2 > r1) {
                this.sc = (zoomMin * r1) / (r2 * s);
            } else {
                this.sc = 1;
            }

            if (w / h > pw / ph) {
                fitToHeight();
            } else {
                fitToWidth();
            }
        } else {
            this.view = 2;

            if (r1 < 2 * r2) {
                this.sc = (zoomMin * r1) / (2 * r2 * s);
            } else {
                this.sc = 1;
            }

            if (w / h >= bw / bh) {
                fitToHeight();
            } else {
                fitToWidth();
            }
        }

        this.updateBookPosition();
        this.updateFlipped();
        this.options.main.turnPageComplete();
    }

    // For each currently visible page, resize CSS to (pageWidth × zoom) ×
    // (pageHeight × zoom) and counter-scale the wrapper transform by 1/zoom.
    // Visual stays the same; the IMG inside (height:100%) grows to native
    // bitmap resolution → Safari rasterizes the layer sharp instead of
    // GPU-stretching the cached fit-size raster. Reverted on any zoom
    // change or page flip via _resetRealSize() for performance.
    _commitRealSize() {
        if (!this.zoom || this.zoom <= 1) return;
        this._resetRealSize();
        this.pagesArr.forEach((p) => {
            if (p.hidden) return;
            p.setRealSize(this.zoom);
            this._realScalePages.push(p);
        });
    }

    _resetRealSize() {
        if (!this._realScalePages || !this._realScalePages.length) return;
        this._realScalePages.forEach((p) => p.resetSize());
        this._realScalePages = [];
    }

    isFocusedRight() {
        var center = this.view == 1 ? -this.pageWidth / 2 : 0;
        if (this.singlePage) {
            return this.rightIndex % 2 == 0;
        } else {
            return this.centerContainerPosition < center;
        }
    }

    isFocusedLeft() {
        var center = this.view == 1 ? -this.pageWidth / 2 : 0;

        if (this.singlePage) {
            return this.rightIndex % 2 == 1;
        } else {
            return this.centerContainerPosition > center;
        }
    }
};

FLIPBOOK.Page3 = class {
    constructor(book, index) {
        this.book = book;
        this.main = book.main;
        this.options = book.options;

        this.index = index;

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'flipbook-page3';
        this.wrapper.style.width = book.options.pageWidth + 'px';
        this.wrapper.style.height = book.options.pageHeight + 'px';
        this.angle = 0;
        this.wrapper.dataset.sheet = index;

        var options = book.options;

        this.front = document.createElement('div');
        this.wrapper.appendChild(this.front);
        this.front.className = 'flipbook-page3-inner flipbook-page3-inner-front';

        this.bgFront = document.createElement('div');
        this.front.appendChild(this.bgFront);
        this.bgFront.className = 'flipbook-page3-bg';

        this.htmlFront = document.createElement('div');
        this.front.appendChild(this.htmlFront);
        this.htmlFront.className = 'flipbook-page3-html page_' + String(2 * index);
        this.htmlFront.style.width = (1000 * options.pageWidth) / options.pageHeight + 'px';

        var transform = 'scale(' + this.options.pageHeight / 1000 + ')';
        if (this.options.doublePage && this.index > 0) {
            this.htmlFront.style.transform = transform + ' translateX(-100%)';
        } else {
            this.htmlFront.style.transform = transform;
        }

        this.html = { front: this.htmlFront };

        this.frontHtmlContentVisible = false;

        this.preloaderFront = this._createSpinner();
        this.front.appendChild(this.preloaderFront);

        if (!book.singlePage) {
            this.back = document.createElement('div');
            this.wrapper.appendChild(this.back);
            this.back.className = 'flipbook-page3-inner flipbook-page3-inner-back';
            this._setVisibility(this.back, false);

            this.bgBack = document.createElement('div');
            this.back.appendChild(this.bgBack);
            this.bgBack.className = 'flipbook-page3-bg';

            this.htmlBack = document.createElement('div');
            this.back.appendChild(this.htmlBack);
            this.htmlBack.className = 'flipbook-page3-html page_' + String(2 * index + 1);
            this.htmlBack.style.width = (1000 * options.pageWidth) / options.pageHeight + 'px';

            this.htmlBack.style.transform = transform;

            this.html.back = this.htmlBack;

            this.backHtmlContentVisible = false;

            this.preloaderBack = this._createSpinner();
            this.back.appendChild(this.preloaderBack);
        }

        this.htmlPaused = { front: false, back: false };

        this.hide();
        this.zIndex = 0;

        if (this.options.rightToLeft && !this.options.backCover) {
            index++;
        }
        this.wrapper.style.left = String(this.book.options.pageWidth - 1) + 'px';
    }

    // Scale up the page CSS box to (pageWidth × s) × (pageHeight × s) and
    // counter-shrink via wrapper transform: scale(1/s). The IMG inside
    // (height:100%) grows to s× CSS pixels — Safari rasterizes the layer
    // at that size, then the visible scale(1/s) makes it look correct
    // (sharp downsampling). HTML overlay is also scaled up so its content
    // fills the larger CSS box.
    setRealSize(s) {
        if (this._realScale === s) return;
        this._realScale = s;
        var o = this.options;
        var pw = o.pageWidth * s;
        var ph = o.pageHeight * s;

        this.wrapper.style.width = pw + 'px';
        this.wrapper.style.height = ph + 'px';
        // Override CSS .flipbook-page3 { transform-origin: 0 50% } —
        // with a larger CSS box, scale(1/s) anchored at 0 50% pushes
        // the visual top down by (s-1) × pageHeight/2 ≈ off-screen.
        // 0 0 anchors at the wrapper's top-left so visual position is
        // preserved. rotateY pivot is unaffected (only x of origin matters).
        this.wrapper.style.transformOrigin = '0 0';
        this._applyWrapperTransform();

        var t = 'scale(' + s + ')';
        if (this.htmlFront) {
            this.htmlFront.style.transform = (o.doublePage && this.index > 0)
                ? t + ' translateX(-100%)'
                : t;
        }
        if (this.htmlBack) {
            this.htmlBack.style.transform = t;
        }
    }

    resetSize() {
        if (!this._realScale || this._realScale === 1) return;
        this._realScale = 1;
        var o = this.options;

        this.wrapper.style.width = o.pageWidth + 'px';
        this.wrapper.style.height = o.pageHeight + 'px';
        this.wrapper.style.transformOrigin = '';
        this._applyWrapperTransform();

        var t = 'scale(1)';
        if (this.htmlFront) {
            this.htmlFront.style.transform = (o.doublePage && this.index > 0)
                ? t + ' translateX(-100%)'
                : t;
        }
        if (this.htmlBack) {
            this.htmlBack.style.transform = t;
        }
    }

    // Compose wrapper transform from current angle (rotateY) + real-size
    // counter-scale. Called by _setAngle (flip changes) and setRealSize/
    // resetSize (real-size enter/exit).
    _applyWrapperTransform() {
        var s = this._realScale || 1;
        var parts = [];
        if (this.angle && this.angle !== 0) parts.push('rotateY(' + this.angle + 'deg)');
        if (s !== 1) parts.push('scale(' + (1 / s) + ')');
        // Force a 3D context (own compositor layer) when in real-size mode.
        // Without it, the right page (angle=0, scale-only) shares the parent
        // .flipbook-book3 layer and PanZoom's scale transform GPU-stretches
        // its raster = blurry. Left page (rotateY) gets its own layer for
        // free from the 3D rotation, so it's sharp without this. translateZ(0)
        // makes both consistent.
        if (s !== 1) parts.push('translateZ(0)');
        this.wrapper.style.transform = parts.join(' ');
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
        // options.preloader (or default speeding-wheel) shows the same
        // way per-page as it does at startup.
        var mainPreloader = this.main && this.main.preloader;
        var sourceEl = mainPreloader && mainPreloader.jquery ? mainPreloader[0] : mainPreloader;
        if (sourceEl && sourceEl.cloneNode) {
            var clone = sourceEl.cloneNode(true);
            // Strip startup-only state classes / inline styles.
            clone.classList.remove('flipbook-hidden');
            clone.style.display = '';
            clone.style.position = '';
            return clone;
        }
        // Fallback (constructor ran before main.preloader existed) —
        // build the same DOM the main preloader uses by default.
        var wrap = document.createElement('div');
        wrap.className = 'flipbook-preloader cssload-container';
        var wheel = document.createElement('div');
        wheel.className = 'cssload-speeding-wheel';
        wrap.appendChild(wheel);
        return wrap;
    }

    load(side, size, callback) {
        var o = this.options;
        var isFront = side == 'front' || this.book.singlePage;

        var pageIndex = this.book.singlePage ? this.index : isFront ? this.index * 2 : this.index * 2 + 1;
        var index = o.rightToLeft ? this.book.pagesArr.length * 2 - pageIndex - 1 : pageIndex;

        var self = this;

        if (!o.cover) index--;
        if (isFront) this.indexFront = index;
        else this.indexBack = index;

        o.main.loadPage(index, size, function (page) {
            if (page && page.image) {
                var img = page.image[size] || page.image;
                var page = o.pages[index];
                if (
                    (isFront && page && page.side == 'right') ||
                    (o.rightToLeft && isFront && page && page.side == 'left')
                ) {
                    if (!img.clone) {
                        img.clone = new Image();
                        img.clone.src = img.src;
                    }
                    img = img.clone;
                    img.style.transform = 'translateX(-50%)';
                }

                self.images = self.images || {};
                self.images[side] = self.images[side] || {};
                self.images[side][size] = img;
            }

            if (callback) {
                callback.call(self);
            }
        });
    }

    loaded(side) {
        const isFront = side == 'front' || this.book.singlePage;
        const size = this.book.currentPageTextureSize;
        if (!this.images || !this.images[side] || !this.images[side][size]) return;
        const newImg = this.images[side][size];
        const bg = isFront ? this.bgFront : this.bgBack;
        if (!bg) return;

        const swap = () => {
            if (this.book.currentPageTextureSize > size) return;
            if (!this.images || !this.images[side] || this.images[side][size] !== newImg) return;
            if (!newImg.complete || newImg.naturalWidth === 0) {
                const retry = () => {
                    newImg.removeEventListener('load', retry);
                    newImg.removeEventListener('error', retry);
                    this.loaded(side);
                };
                newImg.addEventListener('load', retry, { once: true });
                newImg.addEventListener('error', retry, { once: true });
                return;
            }
            // Append the new IMG BEFORE removing old ones. Both briefly
            // share the bg; the new one (last child) paints on top so the
            // visible content stays continuous — no blink to empty bg.
            // decode() is awaited below before this runs, so newImg is
            // paint-ready when appended.
            if (newImg.parentNode === bg) bg.removeChild(newImg);
            bg.appendChild(newImg);
            Array.from(bg.children).forEach((c) => {
                if (c !== newImg && c.tagName === 'IMG') bg.removeChild(c);
            });
            if (isFront) {
                if (this.preloaderFront) this.preloaderFront.style.display = 'none';
                this.sizeFront = size;
            } else {
                if (this.preloaderBack) this.preloaderBack.style.display = 'none';
                this.sizeBack = size;
            }
        };

        if (newImg.decode) {
            newImg.decode().then(swap, swap);
        } else {
            swap();
        }
    }

    loadHTML(side, callback) {
        var self = this;

        var isFront = side == 'front';

        var pageIndex = this.book.singlePage ? this.index : isFront ? this.index * 2 : this.index * 2 + 1;

        var o = this.options;
        var index = o.rightToLeft ? this.book.pagesArr.length * 2 - pageIndex - 1 : pageIndex;

        if (index < 0) {
            callback.call(self);
            return;
        }

        if (!o.cover) index--;

        if (this.htmlContent && this.htmlContent[side]) {
            this.updateHtmlContent(side);
            callback.call(this);
        } else {
            this.options.main.loadPageHTML(index, function (html) {
                self.htmlContent = self.htmlContent || {};
                self.htmlContent[side] = html;
                self.updateHtmlContent(side);
                callback.call(self);
            });
        }
    }

    startHTML(side) {
        this.book.startPageItems(this.html[side]);
    }

    unload() {
        this.size = null;
        this.mat = false;
        this.pageSize = null;
    }

    pauseHtml(side) {
        if (!this.htmlPaused[side]) {
            this.htmlPaused[side] = true;
        }
    }

    unpauseHtml(side) {
        this.htmlPaused[side] = false;
        if (this.removedIframes && this.removedIframes.length) {
            this.removedIframes.forEach(function (obj) {
                obj.parentNode.appendChild(obj.iframe);
            });
        }
        this.removedIframes = [];
    }

    showHtml() {
        if (!this.htmlContentVisible) {
            this.htmlContentVisible = true;
        }
    }

    updateHtmlContent(side) {
        this.htmlLoaded = this.htmlLoaded || {};
        if (!this.htmlLoaded[side]) {
            var c = this.htmlContent[side];
            if (c.jquery) {
                c = c[0];
            }

            this.htmlLoaded[side] = true;
            var container = this.html[side];
            if (container) container.appendChild(c);

            this.main.trigger('showpagehtml', { page: this });
        }
        this.startHTML(side);
    }

    show() {
        if (this.hidden) {
            this.wrapper.style.display = 'block';
            this.wrapper.classList.add('p3-shown');
            this.setShadowOpacity(0);
            this.showHtml();
        }
        this.hidden = false;
    }

    setShadowOpacity(val) {
        if (this.shadowOpacity != val && !this.hidden) {
            this.wrapper.style.setProperty('--page3-shadow-opacity', val);
            this.shadowOpacity = val;
        }
    }

    hide() {
        if (!this.hidden) {
            this.wrapper.style.display = 'none';
            this.wrapper.classList.remove('p3-shown');
            this.setShadowOpacity(0);

            this.pauseHtml('front');
            this.pauseHtml('back');
        }

        this.hidden = true;
    }

    _setVisibility(div, visible) {
        if (div && div.dataset.visible != visible) {
            div.dataset.visible = visible;
            div.style.opacity = visible ? '1' : '0';
            div.style.pointerEvents = visible ? 'auto' : 'none';
        }
    }

    _setAngle(angle) {
        if (angle != this.angle) {
            if (angle != 0 && angle != 180) {
                this._setZIndex(1);
                this.wrapper.classList.add('p3-flipping');
            } else {
                this._setZIndex(0);
                this.wrapper.classList.remove('p3-flipping');
            }

            angle = -angle;
            this.angle = angle;
            this._applyWrapperTransform();
            this.setShadowOpacity((1 - Math.abs(angle + 90) / 90) * 0.2);
            this._setVisibility(this.front, angle > -90);
            this._setVisibility(this.back, angle < -90);
        }
    }

    _setZIndex(val) {
        if (this.zIndex != val) {
            this.wrapper.style['z-index'] = val;
            this.zIndex = val;
        }
    }
};
