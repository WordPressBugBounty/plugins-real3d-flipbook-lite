'use strict';

const FLIPBOOK_BEND_GLSL = /* glsl */ `
uniform float uBendForce;
uniform float uBendOffset;
uniform float uCurlForce;
uniform float uCurlOffset;
uniform float uPageWidth;

vec3 fbBendPos(vec3 pos) {
    if (abs(uBendForce) < 0.0001) return pos;
    float w   = uPageWidth;
    float hw  = w * 0.5;
    float rat = (pos.x + hw) / w;
    if (rat <= uBendOffset) return pos;
    float fp  = 3.14159265 * uBendForce;
    float k   = w / fp;
    float o   = -hw + w * uBendOffset;
    float a   = 1.5707963 - fp * uBendOffset + fp * rat;
    float kz  = k + pos.z;
    return vec3(o - cos(a) * kz, pos.y, sin(a) * kz - k);
}

vec3 fbBendNrm(vec3 n, vec3 pos) {
    if (abs(uBendForce) < 0.0001) return n;
    float w   = uPageWidth;
    float hw  = w * 0.5;
    float rat = (pos.x + hw) / w;
    if (rat <= uBendOffset) return n;
    float ang = 3.14159265 * uBendForce * (rat - uBendOffset);
    float ca  = cos(ang);
    float sa  = sin(ang);
    return vec3(n.x * ca + n.z * sa, n.y, -n.x * sa + n.z * ca);
}

/* Corner-curl bend (rotated 1 rad in XY before bending) */
vec3 fbCurlPos(vec3 pos) {
    if (abs(uCurlForce) < 0.0001) return pos;
    float w  = uPageWidth;
    float hw = w * 0.5;
    float ca = 0.5403023;
    float sa = 0.8414710;
    float lx = pos.x * ca - pos.y * sa;
    float ly = pos.x * sa + pos.y * ca;
    float lz = pos.z;
    float rat = (lx + hw) / w;
    if (rat <= uCurlOffset) return pos;
    float fp = 3.14159265 * uCurlForce;
    float k  = w / fp;
    float o  = -hw + w * uCurlOffset;
    float a  = 1.5707963 - fp * uCurlOffset + fp * rat;
    float kz = k + lz;
    lz = sin(a) * kz - k;
    lx = o  - cos(a) * kz;
    return vec3(lx * ca + ly * sa, -lx * sa + ly * ca, lz);
}

vec3 fbCurlNrm(vec3 n, vec3 pos) {
    if (abs(uCurlForce) < 0.0001) return n;
    float w  = uPageWidth;
    float hw = w * 0.5;
    float ca = 0.5403023;
    float sa = 0.8414710;
    float lx = pos.x * ca - pos.y * sa;
    float rat = (lx + hw) / w;
    if (rat <= uCurlOffset) return n;
    float ang = 3.14159265 * uCurlForce * (rat - uCurlOffset);
    float cb = cos(ang); float sb = sin(ang);
    /* rotate normal into curl space, bend-rotate, rotate back */
    float nx2 = n.x * ca - n.y * sa;
    float ny2 = n.x * sa + n.y * ca;
    float nz2 = n.z;
    float bx  = nx2 * cb + nz2 * sb;
    float bz  = -nx2 * sb + nz2 * cb;
    return vec3(bx * ca + ny2 * sa, -bx * sa + ny2 * ca, bz);
}
`;

function _patchBendMaterial(mat, uniforms) {
    mat.onBeforeCompile = function (shader) {
        shader.uniforms.uBendForce = uniforms.uBendForce;
        shader.uniforms.uBendOffset = uniforms.uBendOffset;
        shader.uniforms.uCurlForce = uniforms.uCurlForce;
        shader.uniforms.uCurlOffset = uniforms.uCurlOffset;
        shader.uniforms.uPageWidth = uniforms.uPageWidth;

        shader.vertexShader = FLIPBOOK_BEND_GLSL + '\n' + shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            'vec3 transformed = fbCurlPos(fbBendPos(position));'
        );

        shader.vertexShader = shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
            [
                'vec3 objectNormal = fbCurlNrm(fbBendNrm(normal, position), position);',
                '#ifdef USE_TANGENT',
                '    vec3 objectTangent = vec3( tangent.xyz );',
                '#endif',
            ].join('\n')
        );
    };
    mat.customProgramCacheKey = function () {
        return 'flipbook_bend';
    };
    mat.needsUpdate = true;
}

/* ------------------------------------------------------------------ */

FLIPBOOK.BookWebGL = class extends FLIPBOOK.Book {
    constructor(el, main, options) {
        super(main, options);

        this.wrapper = el;

        if (this.options.cameraDistance == null) {
            const fov = this.options.cameraFov != null ? this.options.cameraFov : 30;
            this.options.cameraDistance = 2800 * Math.tan(15 * Math.PI / 180) / Math.tan(fov * Math.PI / 360);
        }

        this.pageW = options.pageWidth;
        this.pageH = options.pageHeight;

        this.pageW = (1000 * options.pageWidth) / options.pageHeight;
        this.pageH = 1000;

        options.pageWidth = this.pageW;
        options.pageHeight = this.pageH;

        this.scroll = options.scroll;
        this.pagesArr = options.pages;
        this.pages = [];
        this.animating = false;
        this.animations = [];

        this.sc = 1;

        this.wrapper.classList.add('flipbook-book-webgl');

        this.options.cameraDistance = this.options.cameraDistance / 1.5;

        this._basePowTh = 1;
        this._lastTh = undefined;
    }

    init3d() {
        var o = this.options;
        var VIEW_ANGLE = o.cameraFov != null ? o.cameraFov : 30;
        var ASPECT = this.main.wrapperW / this.main.wrapperH;
        var NEAR = 100;
        var FAR = 5000;
        var o = this.options;

        this.Scene = new THREE.Scene();
        this.centerContainer = new THREE.Object3D();

        this.Scene.add(this.centerContainer);
        this.Camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
        this.Scene.add(this.Camera);
        this.zoom = o.zoomMin;
        this.pan = o.pan;
        this.tilt = o.tilt;

        var container = this.wrapper;
        var c = document.createElement('canvas');
        var context = c.getContext('webgl2') || c.getContext('webgl');

        this.renderer = new THREE.WebGLRenderer({
            antialias: this.options.antialias,
            alpha: true,
            canvas: c,
            context: context,
        });

        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;

        if (this.options.shadows) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        window.webglrenderers = window.webglrenderers || [];

        window.webglrenderers.push(this.renderer);

        this.updateRendererSize(container.clientWidth, container.clientHeight);

        container.appendChild(this.renderer.domElement);

        var htmlLayer = false;
        var pages = this.options.pages;
        var allHtmlOnly = pages.length > 0 && !o.pdfUrl;
        for (var i = 0; i < pages.length; i++) {
            if (pages[i].htmlContent) {
                htmlLayer = true;
            }
            if (pages[i].src) {
                allHtmlOnly = false;
            }
        }
        this._isHtmlOnly = allHtmlOnly && htmlLayer;

        if (htmlLayer || o.pdfMode) {
            this.initHtmlContent();
        }

        c.style.position = 'relative';
        c.style.pointerEvents = 'none';

        c.addEventListener(
            'webglcontextlost',
            (event) => {
                console.log('WebGL context lost');
            },
            false
        );

        if (this.options.lights) {
            var sCol = o.lightColor;
            var dl = new THREE.DirectionalLight(sCol, o.lightIntensity * 0.35);
            this.directionalLight = dl;
            if (this.options.shadows) {
                dl.castShadow = true;
                dl.shadow.bias = -0.001;

                dl.shadow.mapSize.set(2048, 2048);

                dl.shadow.camera.left = -(this.pageW + 20);
                dl.shadow.camera.right = this.pageW + 20;
                dl.shadow.camera.top = this.pageH * 0.5 + 20;
                dl.shadow.camera.bottom = -(this.pageH * 0.5 + 20);

                dl.shadow.camera.near = 200;
                dl.shadow.camera.far = 1800;

                dl.shadow.radius = 4;

                var mat = new THREE.ShadowMaterial();
                mat.opacity = this.options.shadowOpacity * 0.35;
                this.shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(this.pageW * 2.2, this.pageH * 2, 1, 1), mat);
                this.shadowPlane.position.set(0, 0, -30);
                this.centerContainer.add(this.shadowPlane);
                this.shadowPlane.receiveShadow = true;
            }

            this.Scene.add(dl);
        }

        this.centerContainer.position.set(0, 0, 0);

        this.bookWidth = 1;

        this.onResize();

        this.updateHtmlLayerPosition();
        this.updateLightPosition();

        this.flippedleft = 0;
        this.flippedright = 0;

        this.cameraZMin = 300;
        this.cameraZMax = 5000;

        this.renderLoop = () => {
            if (this.rendering) {
                if (!this.enabled) {
                    return;
                }

                if (this._zOrderDirty) {
                    this.correctZOrder();
                    this._zOrderDirty = false;
                }

                if (this.needsUpdate) {
                    this.renderer.render(this.Scene, this.Camera);
                    this.needsUpdate = false;

                    if (this.htmlLayer && this.htmlLayerVisible) {
                        this.cssRenderer.render(this.Scene, this.Camera);
                    }
                }
            }
            if (this.renderLoop) requestAnimationFrame(this.renderLoop);
        };
        this.renderLoop();
    }

    updateRendererSize(w, h) {
        if (this.rendererW != w || this.renderH != h) {
            this.renderer.setSize(w, h);
            this.rendererW = w;
            this.rendererH = h;

            this.updatePixelRatio();
        }
    }

    updatePixelRatio() {
        const minPixelRatio = this.options.minPixelRatio ?? 1;
        const maxPixelRatio = this.options.maxPixelRatio ?? 2;
        const dpr = window.devicePixelRatio || 1;
        const pr = Math.min(Math.max(dpr, minPixelRatio), maxPixelRatio);
        if (pr !== this.pixelRatio) {
            this.renderer.setPixelRatio(pr);
            this.pixelRatio = pr;
        }
    }

    onPageUnloaded(index) {
        var side;
        var sheetIndex = Math.floor(index / 2);
        if (this.options.rightToLeft) {
            sheetIndex = this.pages.length - sheetIndex - 1;
            side = index % 2 == 0 ? 'back' : 'front';
        } else {
            side = index % 2 == 0 ? 'front' : 'back';
        }

        this.pages[sheetIndex].unload(side);
    }

    correctZOrder() {
        const halfPI = Math.PI * 0.5;
        const pow = Math.pow;

        const pages = this.pages;
        const n = pages.length;
        const th = FLIPBOOK.th();
        const shadowPlane = this.shadowPlane;

        this._basePowTh = this._basePowTh === 1 || this._lastTh !== th ? pow(th, 0.85) : this._basePowTh;
        this._lastTh = th;

        const left = (this._zLeft ||= []);
        const right = (this._zRight ||= []);
        let min = 0;
        left.length = 0;
        right.length = 0;

        for (let i = 0; i < n; i++) {
            const page = pages[i];
            if (page.angle > halfPI) {
                left.push(page);
            } else {
                right.push(page);
            }
        }

        left.reverse();

        for (let i = 0, L = left.length; i < L; i++) {
            const p = left[i];
            p.container.position.z = -this._basePowTh * pow(i, 0.85);
            min = Math.min(p.container.position.z, min);
            p.cube.castShadow = i < 2;
        }
        for (let i = 0, R = right.length; i < R; i++) {
            const p = right[i];
            p.container.position.z = -this._basePowTh * pow(i, 0.85);
            p.cube.castShadow = i < 2;
            min = Math.min(p.container.position.z, min);
        }
        if (shadowPlane) shadowPlane.position.z = min - 20;
    }

    initHtmlContent() {
        var htmlLayer = document.createElement('div');
        htmlLayer.className = 'htmlLayer ' + Math.random();

        this.pageR = document.createElement('div');
        this.pageR.classList.add('R');
        this.pageR.style.cssText = `
    width: ${(1000 * this.options.pageWidth) / this.options.pageHeight}px;
    height: 1000px;
    position: absolute;
    top: -500px;
    pointer-events: none;
`;

        this.pageRInner = document.createElement('div');
        this.pageRInner.style.pointerEvents = 'all';
        this.pageRInner.classList.add('RInner');
        this.pageR.appendChild(this.pageRInner);

        this.pageL = document.createElement('div');
        this.pageL.classList.add('L');
        this.pageL.style.cssText = `
    width: ${(1000 * this.options.pageWidth) / this.options.pageHeight}px;
    height: 1000px;
    position: absolute;
    top: -500px;
    left: ${(-1000 * this.options.pageWidth) / this.options.pageHeight}px;
    pointer-events: none;
`;

        this.pageLInner = document.createElement('div');
        this.pageLInner.style.pointerEvents = 'all';
        this.pageLInner.classList.add('LInner');
        this.pageL.appendChild(this.pageLInner);

        // DOM order = reading order, so tab order matches the visible
        // spread: left page first for LTR, right page first for RTL.
        // Pages are absolutely positioned, so layout is unaffected.
        if (this.options.rightToLeft) {
            htmlLayer.appendChild(this.pageR);
            htmlLayer.appendChild(this.pageL);
        } else {
            htmlLayer.appendChild(this.pageL);
            htmlLayer.appendChild(this.pageR);
        }

        var positionMultiplier = this.options.scaleCover ? 2 : 1;
        var centerWdith = this.options.scaleCover ? 1 : 2;
        this.pageC = document.createElement('div');
        this.pageC.classList.add('C');
        this.pageC.style.cssText = `
    width: ${(centerWdith * 1000 * this.options.pageWidth) / this.options.pageHeight}px;
    height: 1000px;
    position: absolute;
    top: -500px;
    left: ${(-1000 * this.options.pageWidth) / positionMultiplier / this.options.pageHeight}px;
    pointer-events: none;
`;
        htmlLayer.appendChild(this.pageC);

        this.pageCInner = document.createElement('div');
        this.pageCInner.style.pointerEvents = 'all';
        this.pageCInner.classList.add('CInner');
        this.pageC.appendChild(this.pageCInner);

        this.htmlLayer = new FLIPBOOK.CSS3DObject(htmlLayer);
        this.Scene.add(this.htmlLayer);
        this.cssRenderer = new FLIPBOOK.CSS3DRenderer();
        this.wrapper.appendChild(this.cssRenderer.domElement);
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0';
        this.cssRenderer.domElement.style.left = '0';
        this.cssRenderer.domElement.style.pointerEvents = 'none';
        this.cssRenderer.domElement.className = 'cssRenderer ' + Math.random();
    }

    enablePrev(val) {
        this.prevEnabled = val;
    }

    enableNext(val) {
        this.nextEnabled = val;
    }

    isZoomed() {
        return this.main.zoom > this.options.zoomMin && this.main.zoom > 1;
    }

    getRightPage() {
        return this.pages[this.flippedleft];
    }

    getNextPage() {
        return this.pages[this.flippedleft + 1];
    }

    getLeftPage() {
        return this.pages[this.flippedleft - 1];
    }

    getPrevPage() {
        return this.pages[this.flippedleft - 2];
    }

    onSwipe(e, phase, distanceX, distanceY, duration, fingerCount) {
        if (this.isZoomed()) {
            if (phase == 'start') {
                this._start(e);
            } else if (phase == 'move') {
                this._move(e, distanceX, distanceY);
            } else if (phase == 'end') {
                this._end(e);
            }
            return;
        }

        var left = this.getLeftPage();
        var right = this.getRightPage();
        var next = this.getNextPage();
        var prev = this.getPrevPage();

        if (
            this.options.rotateCameraOnMouseDrag &&
            (!right || !right.dragging) &&
            (!left || !left.dragging) &&
            (this.onMouseMove == 'rotate' || this.onMouseMove == 'scroll')
        ) {
            return;
        }

        if ((phase == 'cancel' || phase == 'end') && fingerCount <= 1) {
            if (this.view == 1 && this.draggingBook) {
                // Commit if past 20% of page width OR a fast flick (vx > 0.8
                // px/ms, matching BookSwipe's fling threshold). Otherwise
                // animate centerContainer back to drag-start position.
                const distance = Math.abs(distanceX);
                const vx = duration ? distanceX / duration : 0;
                const fling = Math.abs(vx) > 0.8;
                // distance is screen px; pageWidth is logical units —
                // centerContainer.scale.x is the logical→screen factor (see
                // setBookPosition line 1382). Convert before comparing.
                const scale = (this.centerContainer && this.centerContainer.scale && this.centerContainer.scale.x) || 1;
                const distanceLogical = distance / scale;
                const commit = distanceLogical > this.pageW * 0.2 || fling;
                if (commit) {
                    distanceX < 0 ? this.nextPage() : this.prevPage();
                } else {
                    const self = this;
                    const startX = this.draggingBookStartX;
                    const fromX = this.centerContainer.position.x;
                    FLIPBOOK.animate({
                        from: 0,
                        to: 1,
                        duration: 200,
                        easing: 'easeOutSine',
                        step: (v) => {
                            self.centerContainer.position.x = fromX + (startX - fromX) * v;
                            self.updateHtmlLayerPosition();
                            self.updateLightPosition();
                        },
                    });
                }
                this.draggingBook = false;
                return;
            }

            if (distanceX > 0 && (!right || !right.dragging)) {
                this.prevPage();
            } else if (distanceX < 0 && (!left || !left.dragging)) {
                this.nextPage();
            }

            if (right) {
                right.dragging = false;
            }
            if (left) {
                left.dragging = false;
            }
        } else if (phase == 'move' && fingerCount <= 1) {
            // Treat clearly-vertical drags as page scroll — bail so the
            // browser handles it natively. Anything else (horizontal or
            // ambiguous) we consume; preventDefault stops native pan-y
            // from running concurrently with our flip.
            if (Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 10) {
                return;
            }
            if (e && e.cancelable) e.preventDefault();

            if (this.draggingBook) {
                this.centerContainer.position.x = this.draggingBookStartX + distanceX;
                this.updateHtmlLayerPosition();
                this.updateLightPosition();
                return;
            }

            if (this.view == 1 && this.isFocusedLeft() && distanceX < 0 && this.canFlipNext()) {
                this.draggingBookStartX = this.centerContainer.position.x;
                this.draggingBook = true;
                return;
            }

            if (this.view == 1 && this.isFocusedRight() && distanceX > 0 && this.canFlipPrev()) {
                this.draggingBookStartX = this.centerContainer.position.x;
                this.draggingBook = true;
                return;
            }

            distanceX = (180 * distanceX) / this.wrapperW;

            if ((left && left.flipping) || (right && right.flipping)) {
                return;
            }

            if (distanceX > 0 && this.canFlipPrev()) {
                if (left) {
                    left._setAngle(180 - distanceX);
                    left.dragging = true;
                    this.main.dragPage();
                }
                if (right) {
                    right._setAngle(0);
                    right.dragging = false;
                }
                if (prev) {
                    prev.showMat();
                }
                if (next) {
                    next.hideMat();
                }
            } else if (distanceX < 0 && this.canFlipNext()) {
                if (right) {
                    right._setAngle(-distanceX);
                    right.dragging = true;
                    this.main.dragPage();
                }
                if (left) {
                    left._setAngle(180);
                    left.dragging = false;
                }
                if (prev) {
                    prev.hideMat();
                }
                if (next) {
                    next.showMat();
                }
            }
        }
    }

    onResize(doNotUpdatePosition) {
        var m = this.main;
        var w = m.wrapperW;
        var h = m.wrapperH;
        var o = this.options;
        var pw = o.pageWidth;
        var ph = o.pageHeight;
        var bw = this.bookWidth;
        if (o.scaleCover) pw /= bw;

        var r1 = w / (h - 2 * m.bookVerticalPadding);
        var r2 = pw / ph;

        var s = Math.min(this.zoom, 1);

        var zoomMin = Number(o.zoomMin);

        if (o.responsiveView && w <= o.responsiveViewTreshold && r1 < 2 * r2 && r1 < o.responsiveViewRatio) {
            this.view = 1;

            if (r2 > r1) {
                this.sc = (zoomMin * r1) / (r2 * s);
            } else {
                this.sc = 1;
            }
        } else {
            this.view = 2;

            if (r1 < bw * r2) {
                this.sc = (zoomMin * r1) / (bw * r2 * s);
            } else {
                this.sc = 1;
            }
        }

        this.sc *= (h - 2 * m.bookVerticalPadding) / h;

        this.Camera.aspect = w / h;
        this.Camera.updateProjectionMatrix();
        this.updateCameraPosition();

        this.updateRendererSize(w, h);

        if (!doNotUpdatePosition) this.updateBookPosition();

        if (this.htmlLayer) {
            this.cssRenderer.setSize(w, h);
            this.htmlLayer.scale.set(this.sc, this.sc, this.sc);
        }

        if (!this.isFlipping()) this.options.main.turnPageComplete();

        this.wrapperW = w;
        this.wrapperH = h;
    }

    updateCameraPosition() {
        var angle = (Math.PI * this.tilt) / 180;
        var cameraX = 0;
        var cameraY = (this.options.cameraDistance * Math.sin(angle)) / this.zoom;
        var cameraZ = (this.options.cameraDistance * Math.cos(angle)) / this.zoom;

        var sc = this.sc;

        if (this.options.scaleCover) this.centerContainer.scale.set(sc / this.bookWidth, sc, sc);
        else this.centerContainer.scale.set(sc, sc, sc);

        angle = (Math.PI * this.pan) / 180;
        cameraX = Math.sin(angle) * cameraZ;
        cameraZ = Math.cos(angle) * cameraZ;
        this.cameraZ = cameraZ;

        this.Camera.position.set(Math.round(cameraX), Math.round(cameraY), Math.round(cameraZ));

        this.Camera.lookAt(this.Scene.position);

        this.updateShadowCamera();

        this.needsUpdate = true;
    }

    updateLightPosition() {
        const dl = this.directionalLight;
        if (!dl) return;

        const cx = this.centerContainer.position.x;
        const cy = this.centerContainer.position.y;
        const sc = this.sc;
        const dist = Math.max(this.pageW * sc, this.pageH * sc) + 100;

        dl.position.set(cx - dist / 3.5, cy + dist / 4.5, dist);
        dl.target.position.set(cx, cy, 0);
        dl.target.updateMatrixWorld();

        this.needsUpdate = true;
    }

    updateShadowCamera() {
        const dl = this.directionalLight;
        if (!dl || !dl.shadow) return;

        const sc = this.sc;
        const pw = this.pageW * sc;
        const ph = this.pageH * sc;
        const padding = 100;

        dl.shadow.camera.left = -(pw + padding);
        dl.shadow.camera.right = pw + padding;
        dl.shadow.camera.top = ph * 0.5 + padding;
        dl.shadow.camera.bottom = -(ph * 0.5 + padding);
        dl.shadow.camera.updateProjectionMatrix();
    }

    createPages() {
        var self = this;
        var hardness;
        var page;
        var i;
        var options = self.options,
            e = options;
        var marginW = options.pageMiddleShadowSize;
        var c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        var ctx = c.getContext('2d');
        var grd = ctx.createLinearGradient(64 - marginW, 0, 64, 0);

        options.pageMiddleShadowColorL = '#b1b1b1ff';
        options.pageMiddleShadowColorR = '#d7d7d7ff';
        grd.addColorStop(0, '#CCC');
        grd.addColorStop(1, options.pageMiddleShadowColorL);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 64, 64);
        var t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        self.specularB = t;

        var c2 = document.createElement('canvas');
        c2.width = 64;
        c2.height = 64;
        var ctx2 = c2.getContext('2d');
        var grd2 = ctx2.createLinearGradient(0, 0, marginW, 0);
        grd2.addColorStop(0, options.pageMiddleShadowColorR);
        grd2.addColorStop(1, '#CCC');
        ctx2.fillStyle = grd2;
        ctx2.fillRect(0, 0, 64, 64);
        var t2 = new THREE.CanvasTexture(c2);
        e.z = (typeof e.s === 'string' && e.s) || '';
        const { z } = e;
        t2.needsUpdate = true;
        self.specularF = t2;

        var preloaderMatF;
        var preloaderMatB;

        if (self.options.pagePreloader) {
            var tex = new THREE.TextureLoader().load(self.options.pagePreloader, function () {});

            if (self.options.lights) {
                preloaderMatF = new THREE.MeshStandardMaterial({
                    map: tex,
                    roughness: self.options.pageRoughness,
                    metalness: self.options.pageMetalness,
                    emissive: 0x000000,
                    color: 0xededed,
                    lightMap: self.specularF,
                });
                preloaderMatB = new THREE.MeshStandardMaterial({
                    map: tex,
                    roughness: self.options.pageRoughness,
                    metalness: self.options.pageMetalness,
                    emissive: 0x000000,
                    color: 0xededed,
                    lightMap: self.specularB,
                });
            } else {
                preloaderMatF = preloaderMatB = new THREE.MeshBasicMaterial({
                    map: tex,
                    color: 0xededed,
                });
            }
        } else {
            if (self.options.lights) {
                preloaderMatF = new THREE.MeshStandardMaterial({
                    roughness: self.options.pageRoughness,
                    metalness: self.options.pageMetalness,
                    emissive: 0x000000,
                    color: 0xededed,
                    lightMap: self.specularF,
                });
                preloaderMatB = new THREE.MeshStandardMaterial({
                    roughness: self.options.pageRoughness,
                    metalness: self.options.pageMetalness,
                    emissive: 0x000000,
                    color: 0xededed,
                    lightMap: self.specularB,
                });
            } else {
                preloaderMatF = preloaderMatB = new THREE.MeshBasicMaterial({
                    color: 0xededed,
                });
            }
        }

        FLIPBOOK.th = function () {
            return 2;
        };

        var th = FLIPBOOK.th();

        var p = e.pages;
        var evenPages = p.length % 2 == 0;
        var numSheets = evenPages ? p.length / 2 : (p.length + 1) / 2;
        if (!self.options.cover && evenPages) {
            numSheets += 1;
        }
        for (i = 0; i < numSheets; i++) {
            if (i === 0) {
                self._sharedPageGeometry = new THREE.BoxGeometry(
                    self.options.pageWidth, self.options.pageHeight, 0.01,
                    self.options.pageSegmentsW, self.options.pageSegmentsH, 0
                );
                self._sharedPageGeometry.faceVertexUvs[1] = self._sharedPageGeometry.faceVertexUvs[0];
                self._sharedEmptyGeometry = new THREE.BoxGeometry(
                    self.options.pageWidth, self.options.pageHeight, 0.01, 1, 1, 0
                );
                self._sharedEmptyGeometry.faceVertexUvs[1] = self._sharedEmptyGeometry.faceVertexUvs[0];
            }
            hardness = i == 0 || i == numSheets - 1 ? self.options.coverHardness : self.options.pageHardness;
            page = new FLIPBOOK.PageWebGL(self, i, hardness, self.options, preloaderMatF, preloaderMatB);
            self.pages.push(page);
            self.centerContainer.add(page.container);

            self.flippedright++;
        }

        this._zOrderDirty = true;

        if (this.bg) {
            this.bg.position.z = -numSheets * th - 5;
        }

        self.initialized = true;
    }

    getNumPages() {
        return this.pages.length;
    }

    centerContainer() {
        return this.centerContainer;
    }

    goToPage(index, instant, moved) {
        if (this.view != 1 && index % 2 == 1) {
            index--;
        }

        var self = this;
        if (!this.initialized) {
            setTimeout(function () {
                self.goToPage(index, instant);
            }, 100);
            return;
        }

        if (instant) {
            if (this.isFlipping()) return;
        }

        if (index < 0) {
            index = 0;
        }
        if (index > this.numSheets * 2) {
            index = this.numSheets * 2;
        }

        if (this.view == 1 && !moved) {
            var time = instant ? 0 : 300;
            if (index % 2 == 0) {
                this.focusLeft(time);
            } else {
                this.focusRight(time);
            }
        } else if (this.view == 2 && !moved) {
            // View==2 spread mode: set the final focus once so the book
            // glides directly from current position to target without
            // intermediate focusBoth calls in nextPage/prevPage interrupting.
            var time = instant ? 0 : 600;
            if (index <= 0) this.focusRight(time);
            else if (index >= this.options.numPages && this.options.cover) this.focusLeft(time);
            else this.focusBoth(time);
        }

        if (index % 2 != 0) {
            index--;
        }
        if (index == this.rightIndex) {
            this.loadPages();
            this.turnPageComplete();
            return;
        }

        this.goingToPage = true;

        if (typeof instant != 'undefined' && instant) {
            if (index > self.rightIndex) {
                while (self.rightIndex < index) {
                    this.nextPageInstant();
                }
            } else {
                while (self.rightIndex > index) {
                    this.prevPageInstant();
                }
            }

            this.updateBookPosition();
            this.loadPages();
            this.turnPageComplete();
            return;
        }

        var flippingIndex = this.rightIndex > index ? this.rightIndex - 2 : this.rightIndex;
        var pageHardness = this.pages[flippingIndex / 2].pageHardness;
        var delay =
            pageHardness == this.options.coverHardness && this.options.coverHardness > this.options.pageHardness
                ? 200
                : 1;

        delay *= Math.pow(pageHardness, 0.5);

        if (this.rightIndex > index) {
            if (this.rightIndex - 2 > index) {
                this.prevPage(false);
                setTimeout(function () {
                    self.goToPage(index, instant, 1);
                }, delay);
            } else {
                setTimeout(function () {
                    self.prevPage();
                    if (typeof instant != 'undefined' && instant) {
                        for (var i = 0; i < self.pages.length; i++) {
                            self.pages[i].duration = self.options.pageFlipDuration;
                        }
                    }
                    self.loadPages();
                }, delay);
            }
        } else if (this.rightIndex < index) {
            if (this.rightIndex + 2 < index) {
                this.nextPage(false);
                setTimeout(function () {
                    self.goToPage(index, instant, 1);
                }, delay);
            } else {
                setTimeout(function () {
                    self.nextPage();
                    if (typeof instant != 'undefined' && instant) {
                        for (var i = 0; i < self.pages.length; i++) {
                            self.pages[i].duration = self.options.pageFlipDuration;
                        }
                    }
                    self.loadPages();
                }, delay);
            }
        }
    }

    nextPageInstant() {
        if (this.flippedright == 0) {
            return;
        }

        var i;
        for (i = 0; i < this.pages.length; i++) {
            if (this.pages[i].flippingRight) {
                return;
            }
        }

        if (this.view == 1) {
            if (this.isFocusedLeft()) {
                if (!this.goingToPage) {
                    this.focusRight(0);
                    this.turnPageComplete();
                    return;
                } else {
                    this.focusLeft(0, 0);
                }
            }
        } else {
            if (this.flippedright == 1) {
                this.focusLeft(0);
            } else {
                this.focusBoth(0);
            }
        }

        var page = this.pages[this.pages.length - this.flippedright];

        page.flipLeftInstant();
        this.flippedleft++;
        this.flippedright--;
        this.setRightIndex(this.rightIndex + 2);

        this.updateBookPosition();
    }

    setRightIndex(value) {
        this.rightIndex = value;
    }

    prevPageInstant(_) {
        if (this.flippedleft == 0) {
            return;
        }

        if (this.view == 1) {
            if (!this.goingToPage) {
                if (this.isFocusedRight()) {
                    this.focusLeft(0);
                    this.turnPageComplete();
                    return;
                } else {
                    this.focusRight(0, 0);
                }
            }
        } else {
            if (this.flippedleft == 1) {
                this.focusRight(0);
            } else {
                this.focusBoth(0);
            }
        }

        var page = this.pages[this.flippedleft - 1];

        page.flipRightInstant();
        this.flippedleft--;
        this.flippedright++;

        this.setRightIndex(this.rightIndex - 2);
        this.updateBookPosition();
    }

    nextPage(load = true) {
        if (!this.canFlipNext()) {
            return;
        }

        this.clickedPage = null;

        var i;
        for (i = 0; i < this.pages.length; i++) {
            if (this.pages[i].flippingRight) {
                return;
            }
        }

        if (this.view == 1 && !this.goingToPage && this.isFocusedLeft()) {
            this.focusRight(300, 0, this.turnPageComplete);
            return;
        }

        var page = this.pages[this.pages.length - this.flippedright];
        if (!page) {
            return;
        }

        var nextPage = this.pages[page.index + 1];
        if (!nextPage && !this.options.backCover && !this.options.rightToLeft) {
            return;
        }

        if (nextPage) {
            nextPage.showMat();
        }

        if (this.view == 1) {
            if (!this.goingToPage) {
                this.focusLeft(600, 200);
            }
        } else {
            if (!this.goingToPage) {
                if (this.flippedright == 1 && this.options.cover) {
                    this.focusLeft(500, 200);
                } else {
                    this.focusBoth(500, 50);
                }
            }
        }

        if (!page.flipping) {
            var self = this;
            var onComplete;
            if (load) {
                this.loadNextSpread();
                onComplete = function (_) {
                    self.loadPages();
                    self.turnPageComplete();
                };
            }
            page.flipLeft(onComplete);
        }
        this.flippedleft++;

        this.flippedright--;
        this.setRightIndex(this.rightIndex + 2);
    }

    updateBookPosition() {
        if (this.view == 1) {
            if (this.flippedright == 0) {
                this.focusLeft();
            } else if (this.flippedleft == 0) {
                this.focusRight();
            } else {
                this.isFocusedLeft() ? this.focusLeft() : this.focusRight();
            }
        } else {
            if (this.rightIndex == 0) {
                this.focusRight();
            } else if (this.rightIndex >= this.options.numPages && this.options.cover) {
                this.focusLeft();
            } else {
                this.focusBoth();
            }
        }

        this.updateHtmlLayerPosition();
        this.updateLightPosition();
        this.needsUpdate = true;
    }

    updateHtmlLayerPosition() {
        if (this.htmlLayer) {
            this.htmlLayer.position.x = this.centerContainer.position.x;
            this.htmlLayer.position.y = this.centerContainer.position.y;
        }

        this.needsUpdate = true;
    }

    turnPageComplete() {
        this.goingToPage = false;
        this.updateCornerCurl();
        if (!this.isFlipping()) this.options.main.turnPageComplete();
    }

    updateCornerCurl() {
        if (this.options.cornerCurl && this.pages[0]) {
            if (this.flippedleft == 0) {
                this.pages[0].startCornerCurl();
            } else {
                this.pages[0].stopCornerCurl();
            }
        }
    }

    isFlipping() {
        const pages = this.pages;
        for (var i = 0; i < pages.length; i++) {
            const p = pages[i];
            if (p.flippingLeft || p.flippingRight) {
                return true;
            }
        }
        return false;
    }

    async loadPages() {
        var self = this;

        var pages = this.pages;
        var main = this.options.main;

        if (!main.wrapperH) {
            return;
        }
        if (!main.zoom) {
            return;
        }

        if (this.isFlipping()) return;

        var rightPage = this.pages[this.flippedleft];
        var leftPage = this.pages[this.flippedleft - 1];
        var updateHtmlLayer = this.updateHtmlLayer;
        var loadMorePages = this.loadMorePages;

        pages.forEach((page) => {
            if (page === rightPage || page === leftPage) {
                page.showMat();
            }

            if (leftPage && page.index < leftPage.index - 2) {
                page.hideMat();
                if (!self.options.pdfMode) {
                    page.disposeMat();
                }
            }

            if (rightPage && page.index > rightPage.index + 2) {
                page.hideMat();
                if (!self.options.pdfMode) {
                    page.disposeMat();
                }
            }
        });

        main.setLoadingProgress(0.1);

        await this.loadPageAsync(leftPage, 'back');
        this.pageLoaded(leftPage, 'back');
        await this.loadPageAsync(rightPage, 'front');
        this.pageLoaded(rightPage, 'front');
        main.setLoadingProgress(1);
        await this.loadHTMLAsync(leftPage, 'back');
        await this.loadHTMLAsync(rightPage, 'front');
        updateHtmlLayer.call(self);
        this.unloadPages();
        loadMorePages.call(self);
    }

    unloadPages() {
        let left = this.getLeftPage();
        let right = this.getRightPage();
        let distance = this.options.pagesInMemory / 2;
        this.pages.forEach(function (page) {
            if (left && Math.abs(page.index - left.index) > distance) {
                page.unload('front');
                page.unload('back');
            }
            if (right && Math.abs(page.index - right.index) > distance) {
                page.unload('front');
                page.unload('back');
            }
        });

        // Drop large-tier (zoom) materials + bitmap refs from any sheet that
        // is NOT the currently visible spread. Only the current L/R pair is
        // allowed to hold sz > pageTextureMedium; this keeps a max of one
        // hi-res spread alive even after many flips while zoomed in.
        const baseSize = this.options.pageTextureMedium || this.options.pageTextureSmall;
        this.pages.forEach((sheet) => {
            if (sheet === left || sheet === right) return;
            if (!sheet.materials) return;
            ['front', 'back'].forEach((side) => {
                const sideMats = sheet.materials[side];
                if (!sideMats) return;
                Object.keys(sideMats).forEach((szStr) => {
                    const sz = +szStr;
                    if (sz <= baseSize) return;
                    const mat = sideMats[szStr];
                    if (mat) {
                        const tex = mat.map;
                        mat.dispose();
                        if (tex) tex.dispose();
                    }
                    delete sideMats[szStr];
                    // Drop the load-dedup promise for this size too. loadPageAsync
                    // caches a resolved promise per side+size and never re-runs load()
                    // while it exists — so without this, a later zoom-in back to this
                    // page sees the stale promise and never re-renders the evicted tier.
                    if (sheet._sidePromises && sheet._sidePromises[side]) delete sheet._sidePromises[side][szStr];
                    const bookIdx = side === 'front' ? sheet.indexF : sheet.indexB;
                    const pageRec = this.options.pages[bookIdx];
                    if (pageRec && pageRec.imageBitmap) delete pageRec.imageBitmap[sz];
                    const wasActive = (side === 'front' && sheet.sizeFront === sz) ||
                                      (side === 'back' && sheet.sizeBack === sz);
                    if (wasActive) {
                        const remaining = Object.keys(sideMats).map(Number).sort((a, b) => b - a);
                        if (remaining.length > 0) {
                            if (side === 'front') sheet.sizeFront = remaining[0];
                            else sheet.sizeBack = remaining[0];
                            sheet.setMat(sideMats[remaining[0]], side);
                        } else {
                            if (side === 'front') {
                                sheet.sizeFront = 0;
                                sheet.setMat(sheet.preloaderMatF, 'front');
                            } else {
                                sheet.sizeBack = 0;
                                sheet.setMat(sheet.preloaderMatB, 'back');
                            }
                        }
                    }
                });
            });
        });

        // Also drop pdfservice's per-pdf-page caches at sizes > baseSize for
        // pdf pages that don't back the current visible spread. Without this,
        // page.canvas[sz] / page.imageBitmap[sz] / convertToImageBitmapPromises[sz]
        // / renderingPromises[sz] all keep the bitmap alive on the JS side
        // even after we drop the book-page reference.
        const pdfSvc = this.main && this.main.pdfService;
        if (pdfSvc && pdfSvc.pages) {
            const doublePage = !!this.options.doublePage;
            const visiblePdfIndices = new Set();
            [left, right].forEach((sheet) => {
                if (!sheet) return;
                [sheet.indexF, sheet.indexB].forEach((bookIdx) => {
                    if (typeof bookIdx !== 'number' || bookIdx < 0) return;
                    const pdfIdx = doublePage ? Math.round(bookIdx / 2) : bookIdx;
                    visiblePdfIndices.add(pdfIdx);
                });
            });
            for (let i = 0; i < pdfSvc.pages.length; i++) {
                const pdfPage = pdfSvc.pages[i];
                if (!pdfPage) continue;
                if (visiblePdfIndices.has(i)) continue;
                ['imageBitmap', 'convertToImageBitmapPromises', 'renderingPromises', 'canvas'].forEach((key) => {
                    const map = pdfPage[key];
                    if (!map) return;
                    Object.keys(map).forEach((szStr) => {
                        if (+szStr <= baseSize) return;
                        // Skip a render still in flight: renderPage created canvas[sz]
                        // / renderingPromises[sz] but createPageImage hasn't produced
                        // imageBitmap[sz] yet. Evicting now makes createPageImage call
                        // convertToImageBitmap(undefined) -> throw (the neighbour-spread
                        // crash on deep-link load).
                        if (
                            pdfPage.renderingPromises &&
                            pdfPage.renderingPromises[szStr] &&
                            !(pdfPage.imageBitmap && pdfPage.imageBitmap[szStr])
                        )
                            return;
                        delete map[szStr];
                    });
                });
            }
        }
    }

    loadPageImage(page, side, callback) {}

    focusLeft(time, delay, callback) {
        var pw = this.options.pageWidth;
        var newX = pw * 0.5;
        var newY = 0;

        this.moveToPos({ x: newX, y: newY, bookWidth: 1 }, time, delay, callback);
    }

    focusRight(time, delay, callback) {
        var pw = this.options.pageWidth;
        var newX = -pw * 0.5;
        var newY = 0;

        this.moveToPos({ x: newX, y: newY, bookWidth: 1 }, time, delay, callback);
    }

    focusBoth(time, delay, callback) {
        var newX = 0;
        var newY = 0;

        this.moveToPos({ x: newX, y: newY, bookWidth: 2 }, time, delay, callback);
    }

    moveToPos(pos, time, delay, callback) {
        if (time && this.movingTo != pos && this.centerContainer.position.x != pos.x) {
            this.movingTo = pos;

            if (this.bookMoveTween) {
                this.bookMoveTween.stop();
            }

            var startX = this.centerContainer.position.x;
            var startY = this.centerContainer.position.y;
            var endX = pos.x;
            var endY = pos.y;
            var bookWidth = { start: this.bookWidth, end: pos.bookWidth };

            this.bookMoveTween = FLIPBOOK.animate({
                from: 0,
                to: 1,
                duration: time,
                easing: 'easeOutSine',
                delay: delay || 0,
                step: (value) => {
                    if (bookWidth.start != bookWidth.end) {
                        this.bookWidth = bookWidth.start + (bookWidth.end - bookWidth.start) * value;
                        this.onResize(true);
                    }
                    this.centerContainer.position.x = startX + (endX * this.centerContainer.scale.x - startX) * value;
                    this.centerContainer.position.y = startY + (endY * this.centerContainer.scale.x - startY) * value;
                    this.updateHtmlLayerPosition();
                    this.updateLightPosition();
                },
                complete: () => {
                    this.movingTo = null;
                    this.updateHtmlLayerPosition();
                    this.updateLightPosition();
                    if (callback) {
                        callback.call(this);
                    }
                },
            });
            this.animations.push(this.bookMoveTween);
        } else {
            if (!this.movingTo) {
                if (this.bookWidth != pos.bookWidth) {
                    this.bookWidth = pos.bookWidth;
                    // Instant positioning (opening directly on a spread via
                    // deeplink/startPage) changes how many pages are visible, which
                    // changes the fit. Recompute it — the animated branch refits per
                    // step; without this we keep the stale single-page (bookWidth=1)
                    // fit and a landscape spread renders ~2x too wide (overflows).
                    this.onResize(true);
                }
                this.centerContainer.position.x = pos.x * this.centerContainer.scale.x;
                this.centerContainer.position.y = pos.y * this.centerContainer.scale.y;
            }
            if (callback) {
                callback.call(this);
            }
        }
    }

    isFocusedLeft() {
        return this.centerContainer.position.x > 0;
    }

    isFocusedRight() {
        return this.centerContainer.position.x < 0;
    }

    prevPage(load = true) {
        if (!this.canFlipPrev()) {
            return;
        }

        this.clickedPage = null;

        var i;
        for (i = 0; i < this.pages.length; i++) {
            if (this.pages[i].flippingLeft) {
                return;
            }
        }

        if (this.view == 1 && !this.goingToPage && this.isFocusedRight()) {
            this.focusLeft(300, 0, this.turnPageComplete);
            return;
        }

        var page = this.pages[this.flippedleft - 1];
        if (!page) {
            return;
        }

        if (this.flippedleft == 1 && !this.options.cover) {
            return;
        }

        var prevPage = this.pages[page.index - 1];
        if (!prevPage && this.options.rightToLeft && !this.options.backCover) {
            return;
        }

        if (prevPage) {
            prevPage.showMat();
        }

        if (this.view == 1) {
            if (!this.goingToPage) {
                this.focusRight(600, 200);
            }
        } else {
            if (!this.goingToPage) {
                if (this.flippedleft == 1) {
                    this.focusRight(500, 200);
                } else {
                    this.focusBoth(500, 100);
                }
            }
        }

        if (!page.flipping) {
            var self = this;
            var onComplete;
            if (load) {
                this.loadPrevSpread();
                onComplete = function (_) {
                    self.loadPages();
                    self.turnPageComplete();
                };
            }
            page.flipRight(onComplete);
        }
        this.flippedleft--;
        this.flippedright++;

        this.setRightIndex(this.rightIndex - 2);
    }

    firstPage() {}

    flipFinnished() {
        this._zOrderDirty = true;
        this.needsUpdate = true;
    }

    lastPage() {}

    updateVisiblePages() {}

    async loadPrevSpread() {
        const left = this.pages[this.flippedleft - 1];
        const prev = this.pages[this.flippedleft - 2];
        const neighbourSize = this.options.pageTextureMedium || this.options.pageTextureSmall;
        await this.loadPageAsync(prev, 'back', neighbourSize);
        this.pageLoaded(prev, 'back');
        await this.loadPageAsync(left, 'front', neighbourSize);
        this.pageLoaded(left, 'front');
    }

    async loadNextSpread() {
        const right = this.pages[this.flippedleft];
        const next = this.pages[this.flippedleft + 1];
        const neighbourSize = this.options.pageTextureMedium || this.options.pageTextureSmall;
        await this.loadPageAsync(right, 'back', neighbourSize);
        this.pageLoaded(right, 'back');
        await this.loadPageAsync(next, 'front', neighbourSize);
        this.pageLoaded(next, 'front');
    }

    loadMorePages() {
        this.loadNextSpread();
        this.loadPrevSpread();
    }

    _capturePageScreenshot(pageIndex, onComplete) {
        // For html-only pages the rendered bitmap is size-independent (the
        // html2canvas capture is fixed at h=1000). We cache it once on the
        // page in `_htmlBitmap` and reuse for every texture size.
        var page = this.options.pages[pageIndex];
        if (!page || !page.htmlContent) {
            if (onComplete) onComplete();
            return;
        }
        if (page._htmlBitmap) {
            if (onComplete) onComplete();
            return;
        }
        if (page._htmlBitmapPromise) {
            page._htmlBitmapPromise.then(function () { if (onComplete) onComplete(); });
            return;
        }
        if (
            typeof FLIPBOOK === 'undefined' ||
            typeof FLIPBOOK.captureHtmlPage !== 'function' ||
            typeof createImageBitmap !== 'function'
        ) {
            if (onComplete) onComplete();
            return;
        }

        var ratio = this.pageHeight / this.pageWidth;
        var h = 1000;
        var w = Math.round(h / ratio);

        page._htmlBitmapPromise = FLIPBOOK.captureHtmlPage(
            page,
            w,
            h,
            this.options && this.options.main,
            2
        )
            .then(async function (canvas) {
                if (!canvas) return null;
                var bitmap = await createImageBitmap(canvas);
                try { canvas.width = canvas.height = 1; } catch (_) {}
                page._htmlBitmap = bitmap;
                return bitmap;
            })
            .catch(function () { return null; });

        page._htmlBitmapPromise.then(function () {
            if (onComplete) onComplete();
        });
    }

    _hideHTMLPage(page) {
        if (!page.htmlHidden) {
            page.style.display = 'none';
            page.htmlHidden = true;
        }
    }

    _showHTMLPage(page) {
        if (page.htmlHidden) {
            page.style.display = 'block';
            page.htmlHidden = false;
        }
    }

    _emptyHTMLPage(page) {
        if (!page.emptyHTML) {
            page.emptyHTML = true;
        }
    }

    _addHTMLContent(html, page) {
        page.innerHTML = '';
        page.appendChild(html[0] || html);
        page.emptyHTML = false;
        this.startPageItems(html[0] || html);
    }

    updateHtmlLayer(force) {
        if (!this.htmlLayer) {
            return;
        }

        for (var i = 0; i < this.pages.length; i++) {
            if (this.pages[i].flipping) {
                return;
            }
        }

        if (!force && this.htmlContentRightIndex == this.rightIndex) {
            return;
        }

        this.htmlContentRightIndex = this.rightIndex;

        this.htmlLayerVisible = false;

        var rightPage = this.pages[this.flippedleft];
        var leftPage = this.pages[this.flippedleft - 1];

        var R = -1,
            L = -1;

        if (rightPage) R = rightPage.indexF;
        if (leftPage) L = leftPage.indexB;

        this._hideHTMLPage(this.pageL);
        this._hideHTMLPage(this.pageC);
        this._hideHTMLPage(this.pageR);

        this._emptyHTMLPage(this.pageRInner);
        this._emptyHTMLPage(this.pageLInner);
        this._emptyHTMLPage(this.pageCInner);

        var html;

        if (this.options.doublePage) {
            if (this.rightIndex == 0) {
                if (R > -1) html = this.options.pages[R].htmlContent;
                if (html) {
                    this._addHTMLContent(html, this.pageRInner);
                    this._showHTMLPage(this.pageR);
                    this.htmlLayerVisible = true;
                }
            } else if (this.rightIndex == this.pages.length * 2) {
                if (L > -1) html = this.options.pages[L].htmlContent;
                if (html) {
                    this._addHTMLContent(html, this.pageLInner);
                    this._showHTMLPage(this.pageL);
                    this.htmlLayerVisible = true;
                }
            } else {
                if (L > -1) html = this.options.pages[L].htmlContent;
                else if (R > -1) html = this.options.pages[R].htmlContent;

                if (html) {
                    this._addHTMLContent(html, this.pageCInner);
                    this._showHTMLPage(this.pageC);
                    this.htmlLayerVisible = true;
                }
            }
        } else {
            if (this.rightIndex != 0) {
                if (L > -1) html = this.options.pages[L].htmlContent;

                if (html) {
                    this._addHTMLContent(this.options.pages[L].htmlContent, this.pageLInner);
                    this._showHTMLPage(this.pageL);
                    this.htmlLayerVisible = true;
                }
            }

            if (this.rightIndex != this.pages.length * 2) {
                if (R > -1) html = this.options.pages[R].htmlContent;

                if (html) {
                    this._addHTMLContent(this.options.pages[R].htmlContent, this.pageRInner);
                    this._showHTMLPage(this.pageR);
                    this.htmlLayerVisible = true;
                }
            }
        }

        if (this.htmlLayerVisible) {
            this.cssRenderer.render(this.Scene, this.Camera);
        }
        this.main.trigger('showpagehtml', { page: {} });
    }

    onZoom() {}

    render(rendering) {
        this.rendering = rendering;
    }

    zoomTo(amount, time, x, y) {
        if (this.zooming) {
            return;
        }

        if (!this.pages.length) {
            return;
        }

        if (typeof time === 'undefined') {
            time = 0;
        }

        var newCenter = this.centerContainer.position;

        if (typeof x != 'undefined' && typeof y != 'undefined') {
            var ph = this.zoom * this.wrapper.clientHeight;
            var phNew = amount * this.wrapper.clientHeight;
            var scaleFactor = ph / 1000;
            var scaleFactorNew = phNew / 1000;
            var newZoom;
            var center = this.centerContainer.position;
            var focus = {
                x: (x - this.wrapper.clientWidth / 2) / scaleFactor - center.x,
                y: (-y + this.wrapper.clientHeight / 2) / scaleFactor - center.y,
            };
            var focusNew = {
                x: (x - this.wrapper.clientWidth / 2) / scaleFactorNew - center.x,
                y: (-y + this.wrapper.clientHeight / 2) / scaleFactorNew - center.y,
            };

            newCenter = center;
            newCenter.x = center.x - (focus.x - focusNew.x);
            newCenter.y = center.y - (focus.y - focusNew.y);
        }

        var self = this;
        newZoom = amount < this.options.zoomMin ? this.options.zoomMin : amount;

        if (newZoom == this.options.zoom) {
            var focusedLeft = this.isFocusedLeft();

            if (this.view == 1) {
                focusedLeft ? this.focusLeft() : this.focusRight();
            } else {
                this.centerContainer.position.set(0, 0, 0);
            }

            this.updateBookPosition();
        }

        time = 0;

        if (time > 0) {
            if (!this.zooming) {
                this.zooming = true;

                const startZoom = this.zoom;
                const endZoom = newZoom;
                const startX = this.centerContainer.position.x;
                const endX = newCenter.x;
                const startY = this.centerContainer.position.y;
                const endY = newCenter.y;

                if (this.zoomAnimation) this.zoomAnimation.stop();

                this.zoomAnimation = FLIPBOOK.animate({
                    from: 0,
                    to: 1,
                    duration: time,
                    easing: 'easeInSine',
                    step: (progress) => {
                        this.zoom = startZoom + (endZoom - startZoom) * progress;
                        this.centerContainer.position.x = startX + (endX - startX) * progress;
                        this.centerContainer.position.y = startY + (endY - startY) * progress;

                        this.updateCameraPosition();

                        if (this.htmlLayer) {
                            this.htmlLayer.position.x = startX + (endX - startX) * progress;
                            this.htmlLayer.position.y = startY + (endY - startY) * progress;
                        }
                    },
                    complete: () => {
                        self.zooming = false;
                    },
                });
                this.animations.push(this.zoomAnimation);
            }
        } else {
            this.zoom = newZoom;

            this.centerContainer.position.set(newCenter.x, newCenter.y, 0);

            this.updateHtmlLayerPosition();
            this.updateLightPosition();

            this.updateCameraPosition();

            this.zooming = false;
        }

        if (amount <= 1 && amount <= this.zoom) {
            this.updateBookPosition();
        }

        this.options.main.onZoom(newZoom);

        this.loadPages();
    }

    tiltTo(amount) {
        var factor = 0.3;
        var newTilt = this.tilt + amount * factor;
        newTilt = newTilt > this.options.tiltMax ? this.options.tiltMax : newTilt;
        newTilt = newTilt < this.options.tiltMin ? this.options.tiltMin : newTilt;

        this.tilt = newTilt;
        this.updateCameraPosition();
    }

    panTo(amount) {
        var factor = 0.2;
        var newPan = this.pan - amount * factor;
        newPan = newPan > this.options.panMax ? this.options.panMax : newPan;
        newPan = newPan < this.options.panMin ? this.options.panMin : newPan;

        this.pan = newPan;
        this.updateCameraPosition();
    }

    _start(e) {
        this.centerContainerStart = this.centerContainer.position.clone();
        this.mouseDown = true;
        this.onMouseMove = '';
    }

    _move(e, distanceX, distanceY) {
        // Suppress native page scroll / pull-to-refresh while panning the
        // zoomed book. _move only runs when isZoomed() (onSwipe routes here),
        // so the unzoomed touch path is unaffected.
        if (e && e.cancelable) e.preventDefault();
        if (distanceX != 0 || distanceY != 0) {
            this.moved = true;
            // Use main.wrapperH (live) instead of this.wrapperH (cached on
            // BookWebGL in onResize). main updates its dimensions on every
            // resize but this.wrapperH can lag if our onResize doesn't run
            // — observed mismatch (1138 vs cached 788) caused the book to
            // pan 1.44× faster than the cursor.
            const liveWrapperH = (this.main && this.main.wrapperH) || this.wrapperH;
            let scaleFactor = ((this.zoom * liveWrapperH) / 1000) * this.sc;
            this.moveToPos({
                x: this.centerContainerStart.x / this.sc + distanceX / scaleFactor,
                y: this.centerContainerStart.y / this.sc - distanceY / scaleFactor,
            });
            this.updateHtmlLayerPosition();
            this.updateLightPosition();
        }
    }

    _end(e) {
        this.mouseDown = false;
        this.pageMouseDown = false;
        this.moved = false;
    }

    enable() {
        if (this.enabled) {
            this.onResize();
            return;
        }
        this.enabled = true;

        if (!this.initialized) {
            this.init3d();
            this.createPages();
            this.rendering = false;
            this.onResize();
        }

        this.render(true);
        this.onResize();
    }

    disable() {
        this.enabled = false;
        this.render(false);
    }

    destroy() {
        function disposeMaterial(material) {
            if (!material) return;

            if (material.map) material.map.dispose();
            if (material.lightMap) material.lightMap.dispose();
            if (material.bumpMap) material.bumpMap.dispose();
            if (material.normalMap) material.normalMap.dispose();
            if (material.specularMap) material.specularMap.dispose();
            if (material.envMap) material.envMap.dispose();
            if (material.alphaMap) material.alphaMap.dispose();
            if (material.roughnessMap) material.roughnessMap.dispose();
            if (material.metalnessMap) material.metalnessMap.dispose();
            if (material.displacementMap) material.displacementMap.dispose();
            if (material.emissiveMap) material.emissiveMap.dispose();
            if (material.clearcoatMap) material.clearcoatMap.dispose();
            if (material.clearcoatNormalMap) material.clearcoatNormalMap.dispose();
            if (material.clearcoatRoughnessMap) material.clearcoatRoughnessMap.dispose();
            if (material.sheenColorMap) material.sheenColorMap.dispose();
            if (material.sheenRoughnessMap) material.sheenRoughnessMap.dispose();
            if (material.transmissionMap) material.transmissionMap.dispose();
            if (material.thicknessMap) material.thicknessMap.dispose();

            material.dispose();
        }

        function disposeObject(object) {
            if (!object) return;

            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => disposeMaterial(material));
                } else {
                    disposeMaterial(object.material);
                }
            }
        }

        function removeAndDisposeObject(scene, object) {
            if (!scene || !object) return;

            while (object.children.length > 0) {
                removeAndDisposeObject(scene, object.children[0]);
            }

            if (object.parent) {
                object.parent.remove(object);
            }

            disposeObject(object);
        }

        function disposeScene(scene) {
            if (!scene) return;

            while (scene.children.length > 0) {
                removeAndDisposeObject(scene, scene.children[0]);
            }
        }

        function disposeRenderer(renderer) {
            if (!renderer) return;

            renderer.dispose();

            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        }

        disposeScene(this.Scene);
        disposeRenderer(this.renderer);

        this.pages.forEach(function (page) {
            page.dispose();
            page = null;
        });
        this.pages = null;
        this.renderLoop = null;
        this.animations.forEach(function (animation) {
            animation.stop();
        });
    }
};

/* ------------------------------------------------------------------ */
/*  PageWebGL – now uses GPU bend via uniforms                        */
/* ------------------------------------------------------------------ */

FLIPBOOK.PageWebGL = class {
    constructor(book, i, hard, options, preloaderMatF, preloaderMatB) {
        this.container = new THREE.Object3D();

        this.book = book;
        this.index = i;
        this.pW = options.pageWidth;
        this.pH = options.pageHeight;
        this.nfacesw = options.pageSegmentsW;
        this.nfacesh = options.pageSegmentsH;
        this.mats = [];
        this.pageHardness = hard;
        this.pageThickness = hard;
        this.duration = options.pageFlipDuration;
        this.angle = 0;
        this.force = 10;
        this.offset = 0;
        this.isFlippedLeft = false;
        this.isFlippedRight = true;
        this.flippingLeft = false;
        this.flippingRight = false;
        this.options = options;

        const { pages, rightToLeft, cover, doublePage } = options;
        const numSheets = Math.ceil(pages.length / 2);
        const sheetIndex = rightToLeft ? numSheets - this.index - 1 : this.index;

        let indexF = rightToLeft ? 2 * sheetIndex + 1 : 2 * sheetIndex;
        let indexB = rightToLeft ? 2 * sheetIndex : 2 * sheetIndex + 1;
        if (!cover) {
            const offset = rightToLeft ? 1 : -1;
            indexF += offset;
            indexB += offset;
        }

        if (rightToLeft && doublePage) {
            if (indexB > 0) indexB--;
            indexF++;
        }

        this.indexF = indexF;
        this.indexB = indexB;

        this.showing = false;

        this.htmlLoaded = {
            front: false,
            back: false,
        };

        this.animations = [];

        /* ---- GPU bend uniforms (shared across all mats on this page) ---- */
        this._bendUniforms = {
            uBendForce: { value: 0 },
            uBendOffset: { value: 0 },
            uCurlForce: { value: 0 },
            uCurlOffset: { value: 0.98 },
            uPageWidth: { value: this.pW },
        };

        /* ---- Per-page material clones (so each page has its own uniforms) ---- */
        var edgeMat = new THREE.MeshBasicMaterial({ color: 0xededed });
        _patchBendMaterial(edgeMat, this._bendUniforms);

        this.preloaderMatF = preloaderMatF.clone();
        _patchBendMaterial(this.preloaderMatF, this._bendUniforms);
        this.preloaderMatB = preloaderMatB.clone();
        _patchBendMaterial(this.preloaderMatB, this._bendUniforms);

        /* ---- Corner-curl (page 0 only) ---- */
        if (i == 0 && this.options.cornerCurl) {
            this.nfacesw = 20;
            this.nfacesh = 20;

            this.cornerCurlTween = FLIPBOOK.animate({
                from: 0,
                to: 1,
                duration: 1000,
                easing: 'easeInOutQuad',
                repeat: Infinity,
                yoyo: true,
                step: (f) => {
                    if (this.cornerCurl) {
                        this._bendUniforms.uCurlForce.value = f * -1.8;
                        this.book.needsUpdate = true;
                    }
                },
            });
            this.animations.push(this.cornerCurlTween);
        }

        /* ---- Geometry & mesh ---- */
        if (this.nfacesw === options.pageSegmentsW && this.nfacesh === options.pageSegmentsH && book._sharedPageGeometry) {
            this.gF = book._sharedPageGeometry;
        } else {
            this.gF = new THREE.BoxGeometry(this.pW, this.pH, 0.01, this.nfacesw, this.nfacesh, 0);
            this.gF.faceVertexUvs[1] = this.gF.faceVertexUvs[0];
        }

        var mats = [edgeMat, edgeMat, edgeMat, edgeMat, this.preloaderMatF, this.preloaderMatB];

        var mats2;
        mats2 = [edgeMat, edgeMat, edgeMat, edgeMat, edgeMat, edgeMat];

        if (this.options.pagePreloader) {
            mats2 = [edgeMat, edgeMat, edgeMat, edgeMat, this.preloaderMatF, this.preloaderMatB];
        }

        this.cube = new THREE.Mesh(
            this.gF === book._sharedPageGeometry ? book._sharedEmptyGeometry : this.gF,
            mats
        );
        this.cube.position.x = this.pW * 0.5;
        if (this.options.shadows) {
            this.cube.castShadow = true;
            this.cube.receiveShadow = true;
        }

        if (this.options.shadows) {
            var depthMat = new THREE.MeshDepthMaterial({
                depthPacking: THREE.RGBADepthPacking,
            });
            _patchBendMaterial(depthMat, this._bendUniforms);
            this.cube.customDepthMaterial = depthMat;
        }

        this.showMat();

        this.cubeEmpty = new THREE.Mesh(book._sharedEmptyGeometry, mats2);
        this.cubeEmpty.position.x = this.pW * 0.5;

        this.pageFlippedAngle = (Math.PI * this.options.pageFlippedAngle) / 180;
    }

    startCornerCurl() {
        this.cornerCurl = true;
    }

    stopCornerCurl() {
        this.cornerCurl = false;
        if (this._bendUniforms) {
            this._bendUniforms.uCurlForce.value = 0;
        }
    }

    loadHTML(side, callback) {
        var index = side == 'front' ? this.indexF : this.indexB;
        var self = this;

        if (!this.htmlLoaded[side]) {
            this.options.main.loadPageHTML(index, function (_) {
                self.htmlLoaded[side] = true;
                callback.call(self);
            });
        } else {
            callback.call(this);
        }
    }

    load(side, size, callback, _) {
        var main = this.book.main;

        if (!main.wrapperH) {
            return;
        }
        if (!main.zoom) {
            return;
        }

        var self = this;
        this.disposed = false;

        var o = this.book.options;
        const { s: texture } = o;

        if (side == 'front') {
            if (!o.cover && this.index == 0) {
                return;
            }

            if (this.sizeFront == size) {
                if (callback) {
                    callback.call(this);
                }
            } else {
                main.loadPage(this.indexF, size, function (page) {
                    if (self.disposed) return;
                    if (!page || texture) {
                        if (callback) {
                            callback.call(self);
                        }
                        return;
                    }

                    if (self.sizeFront == size) {
                        if (callback) {
                            callback.call(self);
                        }
                        return;
                    }

                    self.sizeFront = size;
                    const pageSide = o.pages[self.indexF].side;
                    const t1 = self.createTexture(page, size, pageSide);
                    const mat = self.createMaterial(t1, side);

                    self.materials = self.materials || {};
                    self.materials[side] = self.materials[side] || {};
                    self.materials[side][size] = mat;

                    if (callback) {
                        callback.call(self);
                    }
                });
            }
        } else if (side == 'back') {
            if (!o.cover && this.index == this.book.pages.length - 1) {
                return;
            }

            if (this.sizeBack == size) {
                if (callback) {
                    callback.call(this);
                }
            } else {
                main.loadPage(this.indexB, size, function (page) {
                    if (self.disposed) return;
                    if (!page || texture) {
                        if (callback) {
                            callback.call(self);
                        }
                        return;
                    }

                    if (self.sizeBack == size) {
                        if (callback) {
                            callback.call(self);
                        }
                        return;
                    }

                    self.sizeBack = size;
                    const pageSide = o.pages[self.indexB].side;
                    const t2 = self.createTexture(page, size, pageSide);
                    const mat = self.createMaterial(t2, side);

                    self.materials = self.materials || {};
                    self.materials[side] = self.materials[side] || {};
                    self.materials[side][size] = mat;

                    if (callback) {
                        callback.call(self);
                    }
                });
            }
        }
    }

    loaded(side) {
        // Use the size this side was actually loaded at, not the global —
        // neighbours load at medium while the visible spread may be at large.
        const size = side === 'front' ? this.sizeFront : this.sizeBack;
        if (this.materials && this.materials[side]) {
            this.setMat(this.materials[side][size], side);
        }
    }

    createTexture(page, size, side) {
        let texture;
        if (page.imageBitmap) {
            const bitmap = page.imageBitmap[size] || page.imageBitmap;
            texture = new THREE.Texture(bitmap);
            texture.offset.y = 1;
            texture.repeat.y = -1;
        } else {
            texture = new THREE.Texture();

            texture.image = page.image[size] ? page.image[size].clone || page.image[size] : page.image;
        }

        if (side == 'left') {
            texture.repeat.x = 0.5;
        } else if (side == 'right') {
            texture.repeat.x = 0.5;
            texture.offset.x = 0.5;
        }

        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        texture.needsUpdate = true;
        return texture;
    }

    unload(side) {
        var mat;
        var t;

        if (this._sidePromises && this._sidePromises[side]) delete this._sidePromises[side];

        if (side == 'front' && this.sizeFront) {
            mat = this.cube.material[4];
            t = mat.map;
            mat.dispose();
            mat.needsUpdate = true;

            if (t) {
                t.dispose();
                t = null;
            }

            this.sizeFront = 0;
            this.setMat(this.preloaderMatF, 'front');
        } else if (side == 'back' && this.sizeBack) {
            mat = this.cube.material[5];
            t = mat.map;
            mat.dispose();

            if (t) {
                t.dispose();
                t = null;
            }

            this.sizeBack = 0;
            this.setMat(this.preloaderMatB, 'back');
        }

    }

    disposeMat() {
        if (!this.loaded) {
            return;
        }

        var matF = this.cube.material[4];
        var matB = this.cube.material[5];
        var tF = matF.map;
        var tB = matB.map;
        matF.dispose();
        matB.dispose();

        if (tF) {
            tF.dispose();
        }
        if (tB) {
            tB.dispose();
        }

        this.disposed = true;
    }

    createMaterial(map, side) {
        var mat;
        if (this.options.lights) {
            var sTexture = side == 'back' ? this.book.specularB : this.book.specularF;
            var o = this.options;
            var color = 0xffffff;

            mat = new THREE.MeshStandardMaterial({
                map: map,
                roughness: o.pageRoughness,
                metalness: o.pageMetalness,
                emissive: 0x000000,
                color: color,
                lightMap: sTexture,
            });
        } else {
            mat = new THREE.MeshBasicMaterial({
                map: map,
            });
        }

        /* Patch every new page-content material with bend shader */
        _patchBendMaterial(mat, this._bendUniforms);

        return mat;
    }

    _setAngle(angle) {
        if (angle <= 180 && angle >= -180) {
            angle = (angle / 180) * Math.PI;

            if (angle < 0) {
                angle = angle + Math.PI;
            }

            if (this.angle == angle) {
                return;
            }

            this.angle = angle;
            this.container.rotation.y = -angle;

            if (Math.abs(angle) > 0.03 && this.gF === this.book._sharedPageGeometry && this.cube.geometry !== this.gF) {
                this.cube.geometry = this.gF;
            }

            var force;
            if (this.isFlippedLeft) {
                force = (1.35 * Math.pow(-Math.abs(Math.cos(-angle / 2)), 1)) / Math.pow(this.pageHardness, 1.5);
            } else {
                force = (1.35 * Math.pow(Math.abs(Math.sin(-angle / 2)), 1)) / Math.pow(this.pageHardness, 1.5);
            }

            if (Math.abs(force) < 0.0001) force = 0;

            if (this._lastBendForce !== force) {
                this._lastBendForce = force;
                this._bendUniforms.uBendForce.value = force;
                this.stopCornerCurl();
            }

            if (this.book.htmlLayerVisible && Math.abs(angle) > 0.03) {
                this.book._hideHTMLPage(this.book.pageL);
                this.book._hideHTMLPage(this.book.pageR);
                this.book._hideHTMLPage(this.book.pageC);
                this.book._emptyHTMLPage(this.book.pageRInner);
                this.book._emptyHTMLPage(this.book.pageLInner);
                this.book._emptyHTMLPage(this.book.pageCInner);
                this.book.htmlLayerVisible = false;

                this.book.main.trigger('hidepagehtml', { page: this });
            }

            this.book.needsUpdate = true;
            this.book._zOrderDirty = true;
        }
    }

    flipLeft(onComplete) {
        this.onComplete = onComplete;
        this.dragging = false;
        if (!this.isFlippedLeft && !this.flippingLeft && !this.flippingRight && this.index == this.book.flippedleft) {
            if (this.duration > 0) {
                this.flippingLeft = true;
                this.flipping = true;
                this.force = 0;
                this.bendIn(-Math.PI);
            } else {
                this.container.rotation.y = -Math.PI;
                this.flippingLeft = false;
                this.isFlippedLeft = true;
                this.flippingRight = false;
                this.isFlippedRight = false;
            }
        }
    }

    flipLeftInstant(onComplete) {
        this.onComplete = onComplete;
        this.dragging = false;

        if (!this.isFlippedLeft && !this.flippingLeft && !this.flippingRight && this.index == this.book.flippedleft) {
            this.xx = 0;
            this.flippingLeft = true;
            this.isFlippedLeft = false;
            this.renderFlip(-Math.PI);
            this.flippingLeft = false;
            this.isFlippedLeft = true;
            this.flippingRight = false;
            this.isFlippedRight = false;

            this.flipFinished();
        }
    }

    hideMat() {
        if (this.showing) {
            this.container.remove(this.cube);
            this.container.add(this.cubeEmpty);
            this.showing = false;
        }
    }

    showMat() {
        if (!this.showing) {
            this.container.add(this.cube);
            this.container.remove(this.cubeEmpty);
            this.showing = true;
            this.book.needsUpdate = true;
        }
    }

    setMat(mat, side) {
        const matIndex = side == 'front' ? 4 : 5;
        if (this.cube.material[matIndex] === mat) {
            return;
        }
        this.cube.material[matIndex] = mat;
        this.book.needsUpdate = true;
    }

    flipRightInstant(onComplete) {
        this.onComplete = onComplete;
        this.dragging = false;
        if (
            !this.isFlippedRight &&
            !this.flippingRight &&
            !this.flippingLeft &&
            this.index == this.book.getNumPages() - this.book.flippedright - 1
        ) {
            this.xx = 0;
            this.flippingRight = true;
            this.isFlippedRight = false;
            this.renderFlip(0);
            this.flippingLeft = false;
            this.isFlippedLeft = false;
            this.flippingRight = false;
            this.isFlippedRight = true;

            this.flipFinished();
        }
    }

    flipRight(onComplete) {
        this.onComplete = onComplete;
        this.dragging = false;
        if (
            !this.isFlippedRight &&
            !this.flippingRight &&
            !this.flippingLeft &&
            this.index == this.book.getNumPages() - this.book.flippedright - 1
        ) {
            if (this.duration > 0) {
                this.flippingRight = true;
                this.flipping = true;

                this.force = 0;
                this.bendIn(0);
            } else {
                this.container.rotation.y = 0;
                this.flippingLeft = false;
                this.isFlippedLeft = false;
                this.flippingRight = false;
                this.isFlippedRight = true;
            }
        }
    }

    bendIn(angle) {
        var time1 = 2 * this.duration * 240 * Math.pow(Math.abs(this.container.rotation.y - angle) / Math.PI, 0.5);

        time1 *= Math.pow(this.pageHardness, 0.25);

        time1 *= 1 + this.pageHardness / 30;

        var start = this.container.rotation.y;
        var end = angle;

        var bendInAnimation = FLIPBOOK.animate({
            from: start,
            to: end,
            duration: time1,
            easing: 'easeInSine',
            step: (value) => {
                this.renderFlip(value);
            },
            complete: () => {
                this.bendOut();
            },
        });

        this.animations.push(bendInAnimation);

        this.options.main.turnPageStart();
    }

    bendOut() {
        var force = this._bendUniforms.uBendForce.value;
        var offset = this._bendUniforms.uBendOffset.value;
        var time = this.duration * Math.pow(Math.abs(force), 0.5) * 1000;

        var a1 = FLIPBOOK.animate({
            from: force,
            to: 0,
            duration: time,
            easing: 'easeOutSine',
            step: (value) => {
                this._bendUniforms.uBendForce.value = value;
                this._lastBendForce = value;
                this.book.needsUpdate = true;
            },
            complete: () => {
                this.flipFinished(this);
            },
        });
        this.animations.push(a1);

        var a2 = FLIPBOOK.animate({
            from: offset,
            to: 1,
            duration: time,
            easing: 'easeOutSine',
            step: (value) => {
                this._bendUniforms.uBendOffset.value = value;
                this.book.needsUpdate = true;
            },
            complete: () => {
                this._bendUniforms.uBendOffset.value = 0;
                this.book.updateCornerCurl();
            },
        });
        this.animations.push(a2);

        this.book._zOrderDirty = true;
    }

    renderFlip(angle) {
        this._setAngle((-angle * 180) / Math.PI);
    }

    flipFinished() {
        if (this.flippingLeft) {
            this.flippingLeft = false;
            this.isFlippedLeft = true;
            this.flippingRight = false;
            this.isFlippedRight = false;
        } else if (this.flippingRight) {
            this.flippingLeft = false;
            this.isFlippedRight = true;
            this.flippingRight = false;
            this.isFlippedLeft = false;
        }

        this._bendUniforms.uBendForce.value = 0;
        this._bendUniforms.uBendOffset.value = 0;
        this._lastBendForce = 0;
        this.flipping = false;
        this.dragging = false;
        this.book.needsUpdate = true;
        if (typeof this.onComplete != 'undefined') {
            this.onComplete(this);
        }
        this.book.flipFinnished();
        if (this.gF === this.book._sharedPageGeometry) {
            this.cube.geometry = this.book._sharedEmptyGeometry;
        }
    }

    isFlippedLeft() {
        return this.isFlippedLeft;
    }

    isFlippedRight() {
        return this.isFlippedRight;
    }

    dispose() {
        this.disposeMat();

        this.animations.forEach(function (animation) {
            animation.stop();
        });
        this.gF.dispose();
        this.gF = null;
        this.cube = null;
        this.cubeEmpty = null;
        this._bendUniforms = null;
        this.options = null;
        this.book = null;
        this.disposed = true;
    }
};

/* ------------------------------------------------------------------ */
/*  CSS3D helpers (unchanged)                                         */
/* ------------------------------------------------------------------ */

{
    FLIPBOOK.CSS3DObject = function (element) {
        THREE.Object3D.call(this);

        this.element = element;
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'auto';

        this.addEventListener('removed', function () {
            this.traverse(function (object) {
                if (object.element instanceof Element && object.element.parentNode !== null) {
                    object.element.parentNode.removeChild(object.element);
                }
            });
        });
    };

    FLIPBOOK.CSS3DObject.prototype = Object.create(THREE.Object3D.prototype);
    FLIPBOOK.CSS3DObject.prototype.constructor = FLIPBOOK.CSS3DObject;

    FLIPBOOK.CSS3DSprite = function (element) {
        FLIPBOOK.CSS3DObject.call(this, element);
    };

    FLIPBOOK.CSS3DSprite.prototype = Object.create(FLIPBOOK.CSS3DObject.prototype);
    FLIPBOOK.CSS3DSprite.prototype.constructor = FLIPBOOK.CSS3DSprite;

    FLIPBOOK.CSS3DRenderer = function () {
        var _this = this;

        var _width;
        var _height;
        var _widthHalf;
        var _heightHalf;

        var matrix = new THREE.Matrix4();

        var cache = {
            camera: { fov: 0, style: '' },
            objects: new WeakMap(),
        };

        var domElement = document.createElement('div');
        domElement.style.overflow = 'hidden';

        this.domElement = domElement;

        var cameraElement = document.createElement('div');

        cameraElement.style.WebkitTransformStyle = 'preserve-3d';
        cameraElement.style.transformStyle = 'preserve-3d';
        cameraElement.style.pointerEvents = 'none';

        domElement.appendChild(cameraElement);

        var isIE = /Trident/i.test(navigator.userAgent);

        this.getSize = function () {
            return {
                width: _width,
                height: _height,
            };
        };

        this.setSize = function (width, height) {
            _width = width;
            _height = height;
            _widthHalf = _width / 2;
            _heightHalf = _height / 2;

            domElement.style.width = width + 'px';
            domElement.style.height = height + 'px';

            cameraElement.style.width = width + 'px';
            cameraElement.style.height = height + 'px';
        };

        function epsilon(value) {
            return Math.abs(value) < 1e-10 ? 0 : value;
        }

        function getCameraCSSMatrix(matrix) {
            var elements = matrix.elements;

            return (
                'matrix3d(' +
                epsilon(elements[0]) +
                ',' +
                epsilon(-elements[1]) +
                ',' +
                epsilon(elements[2]) +
                ',' +
                epsilon(elements[3]) +
                ',' +
                epsilon(elements[4]) +
                ',' +
                epsilon(-elements[5]) +
                ',' +
                epsilon(elements[6]) +
                ',' +
                epsilon(elements[7]) +
                ',' +
                epsilon(elements[8]) +
                ',' +
                epsilon(-elements[9]) +
                ',' +
                epsilon(elements[10]) +
                ',' +
                epsilon(elements[11]) +
                ',' +
                epsilon(elements[12]) +
                ',' +
                epsilon(-elements[13]) +
                ',' +
                epsilon(elements[14]) +
                ',' +
                epsilon(elements[15]) +
                ')'
            );
        }

        function getObjectCSSMatrix(matrix, cameraCSSMatrix) {
            var elements = matrix.elements;
            var matrix3d =
                'matrix3d(' +
                epsilon(elements[0]) +
                ',' +
                epsilon(elements[1]) +
                ',' +
                epsilon(elements[2]) +
                ',' +
                epsilon(elements[3]) +
                ',' +
                epsilon(-elements[4]) +
                ',' +
                epsilon(-elements[5]) +
                ',' +
                epsilon(-elements[6]) +
                ',' +
                epsilon(-elements[7]) +
                ',' +
                epsilon(elements[8]) +
                ',' +
                epsilon(elements[9]) +
                ',' +
                epsilon(elements[10]) +
                ',' +
                epsilon(elements[11]) +
                ',' +
                epsilon(elements[12]) +
                ',' +
                epsilon(elements[13]) +
                ',' +
                epsilon(elements[14]) +
                ',' +
                epsilon(elements[15]) +
                ')';

            if (isIE) {
                return (
                    'translate(-50%,-50%)' +
                    'translate(' +
                    _widthHalf +
                    'px,' +
                    _heightHalf +
                    'px)' +
                    cameraCSSMatrix +
                    matrix3d
                );
            }

            return 'translate(-50%,-50%)' + matrix3d;
        }

        function renderObject(object, scene, camera, cameraCSSMatrix) {
            if (object instanceof FLIPBOOK.CSS3DObject) {
                object.onBeforeRender(_this, scene, camera);

                var style;

                if (object instanceof FLIPBOOK.CSS3DSprite) {
                    matrix.copy(camera.matrixWorldInverse);
                    matrix.transpose();
                    matrix.copyPosition(object.matrixWorld);
                    matrix.scale(object.scale);

                    matrix.elements[3] = 0;
                    matrix.elements[7] = 0;
                    matrix.elements[11] = 0;
                    matrix.elements[15] = 1;

                    style = getObjectCSSMatrix(matrix, cameraCSSMatrix);
                } else {
                    style = getObjectCSSMatrix(object.matrixWorld, cameraCSSMatrix);
                }

                var element = object.element;
                var cachedObject = cache.objects.get(object);

                if (cachedObject === undefined || cachedObject.style !== style) {
                    element.style.WebkitTransform = style;
                    element.style.transform = style;

                    var objectData = { style: style };

                    if (isIE) {
                        objectData.distanceToCameraSquared = getDistanceToSquared(camera, object);
                    }

                    cache.objects.set(object, objectData);
                }

                if (element.parentNode !== cameraElement) {
                    cameraElement.appendChild(element);
                }

                object.onAfterRender(_this, scene, camera);
            }

            for (var i = 0, l = object.children.length; i < l; i++) {
                renderObject(object.children[i], scene, camera, cameraCSSMatrix);
            }
        }

        var getDistanceToSquared = (function () {
            var a = new THREE.Vector3();
            var b = new THREE.Vector3();

            return function (object1, object2) {
                a.setFromMatrixPosition(object1.matrixWorld);
                b.setFromMatrixPosition(object2.matrixWorld);

                return a.distanceToSquared(b);
            };
        })();

        function filterAndFlatten(scene) {
            var result = [];

            scene.traverse(function (object) {
                if (object instanceof THREE.CSS3DObject) {
                    result.push(object);
                }
            });

            return result;
        }

        function zOrder(scene) {
            var sorted = filterAndFlatten(scene).sort(function (a, b) {
                var distanceA = cache.objects.get(a).distanceToCameraSquared;
                var distanceB = cache.objects.get(b).distanceToCameraSquared;

                return distanceA - distanceB;
            });

            var zMax = sorted.length;

            for (var i = 0, l = sorted.length; i < l; i++) {
                sorted[i].element.style.zIndex = zMax - i;
            }
        }

        this.render = function (scene, camera) {
            var fov = camera.projectionMatrix.elements[5] * _heightHalf;

            if (cache.camera.fov !== fov) {
                if (camera.isPerspectiveCamera) {
                    domElement.style.WebkitPerspective = fov + 'px';
                    domElement.style.perspective = fov + 'px';
                } else {
                    domElement.style.WebkitPerspective = '';
                    domElement.style.perspective = '';
                }

                cache.camera.fov = fov;
            }

            if (scene.autoUpdate === true) {
                scene.updateMatrixWorld();
            }
            if (camera.parent === null) {
                camera.updateMatrixWorld();
            }

            if (camera.isOrthographicCamera) {
                var tx = -(camera.right + camera.left) / 2;
                var ty = (camera.top + camera.bottom) / 2;
            }

            var cameraCSSMatrix = camera.isOrthographicCamera
                ? 'scale(' +
                  fov +
                  ')' +
                  'translate(' +
                  epsilon(tx) +
                  'px,' +
                  epsilon(ty) +
                  'px)' +
                  getCameraCSSMatrix(camera.matrixWorldInverse)
                : 'translateZ(' + fov + 'px)' + getCameraCSSMatrix(camera.matrixWorldInverse);

            var style = cameraCSSMatrix + 'translate(' + _widthHalf + 'px,' + _heightHalf + 'px)';

            if (cache.camera.style !== style && !isIE) {
                cameraElement.style.WebkitTransform = style;
                cameraElement.style.transform = style;

                cache.camera.style = style;
            }

            renderObject(scene, scene, camera, cameraCSSMatrix);

            if (isIE) {
                zOrder(scene);
            }
        };
    };
}
