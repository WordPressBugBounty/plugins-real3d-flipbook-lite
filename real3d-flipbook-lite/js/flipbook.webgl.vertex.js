'use strict';

const FLIPBOOK_BEND_GLSL = /* glsl */ `
uniform float uBendForce;
uniform float uBendOffset;
uniform float uBendTilt;
uniform float uBendGrowth;
uniform float uBendGrowthK;
uniform float uCurlForce;
uniform float uCurlOffset;
uniform float uPageWidth;
uniform float uPageHeight;

/* Turn accumulated at distance t past the fold.

   uBendGrowth 0 is a circular arc: constant radius k, constant bend, turn t/k.

   Above 0 the page is most bent at the spine and straightens as it runs out to
   the free edge — the bend radius grows with distance, R(t) = k(1 + g t/W), so
   the sheet leaves the crease tightly and opens out instead of riding a fixed
   drum. Integrating 1/R closes in ln. k is rescaled by ln(1+g)/g so the total
   turn at the free edge still matches the circular case, leaving uBendForce —
   and with it the flip's overall travel — meaning the same at any growth. */
float fbTurnAt(float t, float k) {
    if (abs(uBendGrowth) < 0.0001) return t / k;
    float w = uPageWidth;
    /* uBendGrowthK carries ln(1+g)/g, which depends only on the uniform — the
       fragment stage runs this per pixel, so it is not worth recomputing. */
    return (w / (k * uBendGrowthK * uBendGrowth)) * log(1.0 + uBendGrowth * t / w);
}

/* Offsets across the fold (cn) and out of plane (cz) after travelling t along
   the sheet, plus the local turn there. A varying radius has no closed-form
   arc, so march it — midpoint, and exact in arc length by construction. */
void fbArc(float t, float k, out float cn, out float cz, out float ang) {
    ang = fbTurnAt(t, k);
    if (abs(uBendGrowth) < 0.0001) {
        cn = k * sin(ang);
        cz = k * (cos(ang) - 1.0);
        return;
    }
    const int N = 12;
    float h = t / float(N);
    cn = 0.0;
    cz = 0.0;
    for (int i = 0; i < N; i++) {
        float a = fbTurnAt((float(i) + 0.5) * h, k);
        cn += cos(a) * h;
        cz -= sin(a) * h;
    }
}

/* Fold frame: d runs along the fold line, n across it, measured from a pivot
   on the spine corner the tilt leans toward. Pivoting there is what keeps the
   bound edge flat: measured from the page centre instead, a positive tilt puts
   the top of the spine on the bent side and the page tears off its binding.
   uBendTilt = 0 gives d = +Y, n = +X and reduces to the plain vertical fold. */
void fbBendFrame(out vec2 d, out vec2 n, out vec2 piv) {
    float c = cos(uBendTilt);
    float s = sin(uBendTilt);
    d = vec2(-s, c);
    n = vec2(c, s);
    piv = vec2(-uPageWidth * 0.5, s >= 0.0 ? uPageHeight * 0.5 : uPageHeight * -0.5);
}

vec3 fbBendPos(vec3 pos) {
    if (abs(uBendForce) < 0.0001) return pos;
    float w   = uPageWidth;
    vec2  d, n, piv;
    fbBendFrame(d, n, piv);
    vec2  rel = pos.xy - piv;
    float rat = dot(rel, n) / w;
    if (rat <= uBendOffset) return pos;
    float fp  = 3.14159265 * uBendForce;
    float k   = w / fp;
    float t   = (rat - uBendOffset) * w;
    float cn, cz, ang;
    fbArc(t, k, cn, cz, ang);
    /* thickness rides the rolled surface normal, (sin, cos) in the (n, z) plane */
    float nOff = w * uBendOffset + cn + pos.z * sin(ang);
    return vec3(piv + d * dot(rel, d) + n * nOff, cz + pos.z * cos(ang));
}

vec3 fbBendNrm(vec3 nn, vec3 pos) {
    if (abs(uBendForce) < 0.0001) return nn;
    float w   = uPageWidth;
    vec2  d, n, piv;
    fbBendFrame(d, n, piv);
    float rat = dot(pos.xy - piv, n) / w;
    if (rat <= uBendOffset) return nn;
    /* same turn the position uses — closed form, no march needed here */
    float ang = fbTurnAt((rat - uBendOffset) * w, w / (3.14159265 * uBendForce));
    float ca  = cos(ang);
    float sa  = sin(ang);
    float an  = dot(nn.xy, n);
    float ad  = dot(nn.xy, d);
    return vec3(d * ad + n * (an * ca + nn.z * sa), -an * sa + nn.z * ca);
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
    /* Only lit materials get per-fragment normals. The edge/preloader basics
       and the depth material have no lighting to improve, and MeshBasicMaterial
       carries no `normal` attribute unless USE_ENVMAP is set — reading it there
       would fail to compile. */
    var perFragment = mat.isMeshStandardMaterial === true;

    mat.onBeforeCompile = function (shader) {
        Object.keys(uniforms).forEach(function (k) {
            shader.uniforms[k] = uniforms[k];
        });

        shader.vertexShader =
            FLIPBOOK_BEND_GLSL +
            (perFragment ? '\nvarying vec3 vFbPos;\nvarying vec3 vFbNrm;\n' : '\n') +
            shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            'vec3 transformed = fbCurlPos(fbBendPos(position));' +
                (perFragment ? '\nvFbPos = position;\nvFbNrm = normal;' : '')
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

        if (!perFragment) return;

        /* Rebuild the normal per pixel rather than interpolating it across the
           strip. The vertex normals are exact, but the rasteriser interpolates
           them linearly, and a normal that rotates ~12deg per segment lands up
           to ~6deg out mid-strip — one Mach band per segment on a flat white
           page. Doing the same rotation per fragment removes the banding at any
           segment count, so pageSegmentsW only controls the silhouette. */
        shader.fragmentShader =
            FLIPBOOK_BEND_GLSL +
            [
                '',
                '#ifndef OBJECTSPACE_NORMALMAP',
                'uniform mat3 normalMatrix;',
                '#endif',
                'varying vec3 vFbPos;',
                'varying vec3 vFbNrm;',
                '',
            ].join('\n') +
            shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_begin>',
            [
                'vec3 normal = normalize( normalMatrix * fbCurlNrm( fbBendNrm( normalize( vFbNrm ), vFbPos ), vFbPos ) );',
                '#ifdef DOUBLE_SIDED',
                '    normal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );',
                '#endif',
                'vec3 geometryNormal = normal;',
            ].join('\n')
        );
    };
    mat.customProgramCacheKey = function () {
        return perFragment ? 'flipbook_bend_pf' : 'flipbook_bend';
    };
    mat.needsUpdate = true;
}

/* ------------------------------------------------------------------ */

/* Bend radius is k(1 + g s) along the sheet, so g <= -1 would put a zero
   radius on the page and g = -1 exactly makes ln(1+g) diverge. Keep clear of
   both ends. */
FLIPBOOK.clampBendGrowth = function (g) {
    return Math.max(-0.9, Math.min(8, g || 0));
};

/* ln(1+g)/g — the factor that keeps total wrap fixed as growth changes. Depends
   only on g, and the fragment stage would otherwise evaluate it per pixel. */
FLIPBOOK.bendGrowthK = function (g) {
    g = g || 0;
    return Math.abs(g) < 0.0001 ? 1 : Math.log(1 + g) / g;
};

FLIPBOOK.BookWebGL = class extends FLIPBOOK.Book {
    constructor(el, main, options) {
        super(main, options);

        this.wrapper = el;

        /* Hover lift is driven off the pointer, not off DOM hit areas — see
           _hoverTargetAt for why. Bound on the wrapper so it still reads while
           the HTML overlay is down. */
        var self = this;
        this._onHoverMove = function (e) {
            /* Kept for re-evaluation when the book changes under a still
               cursor — a click-flip should lift the next page without
               waiting for the mouse to move. */
            if (e.clientX != null) self._lastHoverPos = { clientX: e.clientX, clientY: e.clientY };
            var dir = self._hoverTargetAt(e);
            self._setHoverTarget(dir, dir ? self._grabTiltDeg(self._pointerPageY(e)) : null);
            if (!self._pointerDown) self._setCursor(dir || self._grabbableAt(e) ? 'grab' : null);
        };
        this._onHoverOut = function () {
            self._lastHoverPos = null;
            self._setHoverTarget(null);
        };
        el.addEventListener('mousemove', this._onHoverMove);
        el.addEventListener('mouseleave', this._onHoverOut);
        /* The wrapper's mouseleave misses fast exits from the browser window
           and focus changes that move no pointer at all (cmd-tab, devtools) —
           either left the page lifted with nothing to drop it. Visibility, not
           window blur: the press handler blurs the focused element on
           mousedown, and a blur listener ate the hover dir before the press
           could take it — clicks stopped flipping the lifted page. */
        document.documentElement.addEventListener('mouseleave', this._onHoverOut);
        this._onVisHidden = function () {
            if (document.hidden) self._onHoverOut();
        };
        document.addEventListener('visibilitychange', this._onVisHidden);

        /* Press state has to clear on a release anywhere, not just one the book
           happens to see. touchSwipe binds mouseup on the book element, so
           letting go outside it — or over the zoomed path, which returns before
           the end phase is handled — never delivers an end, and the flags latch
           for good. Anything gated on them then dies silently, which is exactly
           how the hover lift stopped working after a zoom. */
        this._onPointerRelease = function () {
            self._pointerDown = false;
            self.mouseDown = false;
            self.pageMouseDown = false;
            self._setCursor(null);
        };
        window.addEventListener('mouseup', this._onPointerRelease);
        window.addEventListener('touchend', this._onPointerRelease);
        window.addEventListener('touchcancel', this._onPointerRelease);
        window.addEventListener('blur', this._onPointerRelease);

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

        /* A tilted fold runs diagonally, so the fold coordinate varies across a
           quad along BOTH axes:

               drat = cos(tilt)/W + (pageH/pageW) * sin(tilt)/H

           and the curl bands where that exceeds ~0.14 (measured: 20x3 = 0.247
           and 10x5 = 0.214 band; 20x7 = 0.133 and 10x13 = 0.128 do not). W is
           therefore not free here — it spends from the same budget as H, which
           is why a narrow W needs a tall H to compensate. Solve for H at the
           author's W, raising W only if it alone would eat the whole budget.
           Raise-only, and capped so a wide angle range cannot run away. */
        /* Peak curl is 1.35/hardness^1.5, so hardness 1 already wraps 243deg.
           Below that the sheet rolls through itself — a self-intersecting
           surface, which no amount of shadow bias or mesh density can fix. */
        options.pageHardness = Math.max(1, options.pageHardness);
        options.coverHardness = Math.max(1, options.coverHardness);

        /* Growth is swept across the flip, so size the wrap limit for the most
           restrictive value it will pass through. Higher growth drives the
           sheet deeper for the same wrap, so the most positive end bounds the
           whole sweep — one table, safe at every point of the turn. */
        options.pageBendGrowth = FLIPBOOK.clampBendGrowth(options.pageBendGrowth);
        options.pageBendGrowthEnd = FLIPBOOK.clampBendGrowth(options.pageBendGrowthEnd);
        this._buildWrapLimit(Math.max(0, options.pageBendGrowth, options.pageBendGrowthEnd));

        var maxTilt = options.pageFlipAngle
            ? Math.max(Math.abs(options.pageFlipAngleMin), Math.abs(options.pageFlipAngleMax)) *
              (Math.PI / 180)
            : 0;
        /* An untilted fold does not vary down the page at all, so it needs no
           rows and no extra columns — leave the mesh exactly as authored. */
        if (maxTilt > 0.001 && options.pageSegmentsAuto !== false) {
            var eps = 0.16;
            var ax = Math.cos(maxTilt);
            var ay = (options.pageHeight / options.pageWidth) * Math.sin(maxTilt);
            options.pageSegmentsW = Math.max(options.pageSegmentsW, Math.ceil(ax / (eps * 0.75)));
            var hNeed = Math.ceil(ay / (eps - ax / options.pageSegmentsW));
            options.pageSegmentsH = Math.max(options.pageSegmentsH, Math.min(hNeed, 20));
        }

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

                /* A curling sheet shadow-acnes against its own depth map, in
                   soft bands following the curve. The usual cure — render back
                   faces into the shadow map — is three's default already and
                   buys nothing here, because the page box is 0.01 thick so its
                   two faces sit at the same depth. The shadow camera has no
                   slack either: near/far bracket the page's swing radius. So
                   bias it is, but the depth slope it has to cover scales with
                   how hard the page curls, and peak curl is
                   1.35 / hardness^1.5 — a page at hardness 1 bends nearly 3x
                   as far as one at 2 and needs proportionally more. Calibrated
                   at -0.004 for peak force 0.477 (hardness 2), verified clean
                   at 1.35 (hardness 1) and free of peter-panning at rest. */
                var softest = Math.max(0.2, Math.min(o.pageHardness, o.coverHardness));
                var peakCurl = 1.35 / Math.pow(softest, 1.5);
                dl.shadow.bias = -Math.max(0.001, 0.0084 * peakCurl);

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

                if (this._panTargetX != null) this._panStep();

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
        // The html layer is positioned with a plain 2D translate+scale (see
        // _updateHtmlLayerFlat) instead of the CSS3D renderer: layers inside
        // a perspective/preserve-3d subtree rasterize at a fixed scale in
        // Chromium and text blurs; a non-composited 2D transform re-rasters
        // at the effective scale, so idle pages are natively sharp.
        const pw1000 = (1000 * this.options.pageWidth) / this.options.pageHeight;

        var htmlLayer = document.createElement('div');
        htmlLayer.className = 'htmlLayer ' + Math.random();

        this.pageR = document.createElement('div');
        this.pageR.classList.add('R');
        this.pageR.style.cssText = `
    width: ${pw1000}px;
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
    width: ${pw1000}px;
    height: 1000px;
    position: absolute;
    top: -500px;
    left: ${-pw1000}px;
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
    width: ${centerWdith * pw1000}px;
    height: 1000px;
    position: absolute;
    top: -500px;
    left: ${-pw1000 / positionMultiplier}px;
    pointer-events: none;
`;
        htmlLayer.appendChild(this.pageC);

        this.pageCInner = document.createElement('div');
        this.pageCInner.style.pointerEvents = 'all';
        this.pageCInner.classList.add('CInner');
        this.pageC.appendChild(this.pageCInner);

        const tilted =
            (this.options.tilt || 0) !== 0 || (this.options.pan || 0) !== 0;

        if (tilted) {
            // Angled presentation: only the CSS3D pipeline renders the
            // layer's perspective correctly — keep the previous behavior
            // (geometrically true, softer text).
            this.htmlLayer = new FLIPBOOK.CSS3DObject(htmlLayer);
            this.Scene.add(this.htmlLayer);
            this.cssRenderer = new FLIPBOOK.CSS3DRenderer();
            this.wrapper.appendChild(this.cssRenderer.domElement);
            this.cssRenderer.domElement.style.position = 'absolute';
            this.cssRenderer.domElement.style.top = '0';
            this.cssRenderer.domElement.style.left = '0';
            this.cssRenderer.domElement.style.pointerEvents = 'none';
            this.cssRenderer.domElement.className = 'cssRenderer ' + Math.random();
            return;
        }

        // Flat 2D positioning shims. The htmlLayer/cssRenderer objects keep
        // their old shape so existing call sites (position writes, scale.set,
        // setSize, render) stay untouched — every mutation re-applies the
        // plain 2D transform via _updateHtmlLayerFlat.
        this._htmlLayerEl = htmlLayer;
        htmlLayer.style.position = 'absolute';
        htmlLayer.style.top = '0';
        htmlLayer.style.left = '0';
        htmlLayer.style.transformOrigin = '0 0';

        const self = this;
        this.htmlLayer = {
            element: htmlLayer,
            position: {
                _x: 0,
                _y: 0,
                get x() { return this._x; },
                set x(v) { this._x = v; self._updateHtmlLayerFlat(); },
                get y() { return this._y; },
                set y(v) { this._y = v; self._updateHtmlLayerFlat(); },
            },
            scale: { set: function () { self._updateHtmlLayerFlat(); } },
        };

        const flatDom = document.createElement('div');
        flatDom.appendChild(htmlLayer);
        this.cssRenderer = {
            domElement: flatDom,
            setSize: function (w, h) {
                self._cssW = w;
                self._cssH = h;
                self._updateHtmlLayerFlat();
            },
            render: function () { self._updateHtmlLayerFlat(); },
        };
        this.wrapper.appendChild(flatDom);
        flatDom.style.position = 'absolute';
        flatDom.style.top = '0';
        flatDom.style.left = '0';
        flatDom.style.pointerEvents = 'none';
        flatDom.className = 'cssRenderer ' + Math.random();
    }

    // Plain 2D placement of the html layer, replicating what the CSS3D
    // camera produced for a flat, front-facing layer: world→screen scale is
    // k = fovPx / cameraZ (perspective projection at the book plane), the
    // layer's own world scale is this.sc. Non-composited 2D transforms
    // re-rasterize at the effective scale — sharp text. (With non-zero
    // tilt/pan the book is angled and a flat overlay is approximate.)
    _updateHtmlLayerFlat() {
        const el = this._htmlLayerEl;
        if (!el) return;
        const w = this._cssW || (this.wrapper ? this.wrapper.clientWidth : 0);
        const h = this._cssH || (this.wrapper ? this.wrapper.clientHeight : 0);
        const cam = this.Camera;
        const camZ = this.cameraZ || (cam && cam.position.z) || 1;
        const fovPx = cam ? cam.projectionMatrix.elements[5] * (h / 2) : camZ;
        const k = fovPx / camZ;
        const camX = cam ? cam.position.x : 0;
        const camY = cam ? cam.position.y : 0;
        const s = (this.sc || 1) * k;
        const p = this.htmlLayer.position;
        el.style.transform =
            'translate(' +
            (w / 2 + (p._x - camX) * k) +
            'px,' +
            (h / 2 - (p._y - camY) * k) +
            'px) scale(' +
            s +
            ')';
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

    /* Turning a page while zoomed in: the magnification belongs to the page
       being read, not the one being turned to, and at zoom the fold often
       falls outside the viewport entirely — so the turn reads as nothing
       happening. Drop back to fit before navigating. */
    _resetZoom() {
        if (this.isZoomed()) this.zoomTo(this.options.zoomMin);
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
        /* Release state has to be cleared whatever the zoom is now. _start only
           runs while zoomed, and if the gesture ends after zooming back out
           _end never fires, latching mouseDown true for good — which silently
           disables anything gated on it. */
        if (phase == 'start') {
            this._pointerDown = true;
            /* What the lift was promising. A click has to honour it: the page
               is already part-open, and dropping it back is not what the
               affordance offered. */
            this._pressDir = this._hoverDir;
            /* took hold of whatever was under the cursor — a lifted page, or
               the book itself when zoomed, where any drag pans */
            if (this._hoverDir || this.isZoomed()) this._setCursor('grabbing');
        }
        if (phase == 'end' || phase == 'cancel') {
            this._pointerDown = false;
            this._setCursor(null);
            this.mouseDown = false;
            this.pageMouseDown = false;
            this.moved = false;
        }

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

        if (phase == 'start') {
            /* A hover-lifted page is already part way open. The drag sets an
               absolute angle from distanceX, so without carrying that opening
               across the page would snap shut on the first move; stash it and
               add it back below. */
            if (left) left.cancelHoverLift();
            if (right) right.cancelHoverLift();
            this._liftRight = right ? ((right.angle || 0) * 180) / Math.PI : 0;
            this._liftLeft = left ? 180 - ((left.angle || 0) * 180) / Math.PI : 0;
            /* The press owns the lift now — the stashes above carry it into
               the drag. Stale _hoverDir would make the next hover re-lean
               instead of re-lift, and kept a snapped opposite page counted
               as still lifted. */
            this._hoverDir = null;
            this._hoverSheet = null;
            return;
        }

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

            /* Taken first, and on travel rather than sign, so a click that
               jitters a pixel the wrong way still turns the page the lift
               offered instead of turning it backwards. */
            if (this._pressDir && Math.abs(distanceX) < 5) {
                this._pressDir === 'prev' ? this.prevPage() : this.nextPage();
                this._hoverDir = null;
            } else if (this.view == 1 && right && right.dragging) {
                // Resolve by where the fold ended: the sign branches below
                // can't — a drag that crossed back leaves dx on the wrong
                // side and previously left the sheet hanging mid-fold.
                right.dragging = false;
                if (distanceX < 0 || -right.container.rotation.y / Math.PI >= 0.5) {
                    this.nextPage();
                } else {
                    this._panFollowSheet = right;
                    right.bendIn(0);
                }
            } else if (this.view == 1 && left && left.dragging) {
                left.dragging = false;
                if (distanceX > 0 || -left.container.rotation.y / Math.PI <= 0.5) {
                    this.prevPage();
                } else {
                    this._panFollowSheet = left;
                    left.bendIn(-Math.PI);
                }
            } else if (distanceX > 0 && (!right || !right.dragging)) {
                this.prevPage();
            } else if (distanceX < 0 && (!left || !left.dragging)) {
                this.nextPage();
            }
            this._pressDir = null;

            var wasDragR = right && right.dragging;
            var wasDragL = left && left.dragging;
            if (right) {
                right.dragging = false;
            }
            if (left) {
                left.dragging = false;
            }
            /* A released fold no branch committed (blocked at a cover, or an
               opposite-sign release) must not stay hanging mid-air — drive it
               home; bendIn continues from the current bend via the release
               blend in _setAngle. */
            [wasDragR ? right : null, wasDragL ? left : null].forEach((p) => {
                if (!p || p.flipping || p.flippingLeft || p.flippingRight) return;
                var rest = p.isFlippedLeft ? -Math.PI : 0;
                if (
                    Math.abs(p.container.rotation.y - rest) > 0.01 ||
                    Math.abs(p._bendUniforms.uBendForce.value) > 0.01
                ) {
                    p.bendIn(rest);
                }
            });
        } else if (phase == 'move' && fingerCount <= 1) {
            // Treat clearly-vertical drags as page scroll — bail so the
            // browser handles it natively. Anything else (horizontal or
            // ambiguous) we consume; preventDefault stops native pan-y
            // from running concurrently with our flip. Only until a sheet is
            // actually being dragged: after that the gesture is a flip, and
            // vertical movement is what leans the fold, so bailing here froze
            // the fold the moment the cursor travelled further up than across.
            var pageDragging = (right && right.dragging) || (left && left.dragging);
            if (!pageDragging && Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 10) {
                return;
            }
            if (e && e.cancelable) e.preventDefault();

            if (this.draggingBook) {
                this.centerContainer.position.x = this.draggingBookStartX + distanceX;
                this.updateHtmlLayerPosition();
                this.updateLightPosition();
                return;
            }

            // !pageDragging: the follow moves the book DURING a fold drag, so
            // focus flips sign mid-gesture — without the guard, crossing the
            // container middle reclassified the drag as a book-drag and left
            // the sheet hanging mid-fold.
            if (this.view == 1 && !pageDragging && this.isFocusedLeft() && distanceX < 0 && this.canFlipNext()) {
                this.draggingBookStartX = this.centerContainer.position.x;
                this.draggingBook = true;
                return;
            }

            if (this.view == 1 && !pageDragging && this.isFocusedRight() && distanceX > 0 && this.canFlipPrev()) {
                this.draggingBookStartX = this.centerContainer.position.x;
                this.draggingBook = true;
                return;
            }

            distanceX = (180 * distanceX) / this.wrapperW;
            var grabTilt = this._grabTiltDeg(this._pointerPageY(e));

            /* No blanket bail while a sheet is mid-flip: indices advance at
               flip START, so during a flip the flying sheet occupies the
               left/right slot while the next sheet is free to drag — the old
               guard swallowed the whole gesture and the drag then popped in
               at the accumulated angle when the flip landed. Per-sheet
               guards below keep the flying sheet itself untouchable. */

            /* A sheet that has finished rotating but is still unrolling its
               curl looks parked: grabbing it has to work now, not when the
               settle ends. Capture it and rebase the gesture so the page
               continues from where it stands instead of jumping by however
               far the finger travelled while it was ignored. */
            if (distanceX > 0 && left && left._settling && !left.dragging) {
                left._captureFromSettle();
                this._liftLeft = -distanceX;
            } else if (distanceX < 0 && right && right._settling && !right.dragging) {
                right._captureFromSettle();
                this._liftRight = distanceX;
            }

            // View 1: a fold drag stays on the sheet it started on — the book
            // follows the fold, so the drag's sign can cross zero mid-gesture
            // and must not re-route to the other sheet's branch.
            var stickLeft = this.view == 1 && left && left.dragging;
            var stickRight = this.view == 1 && right && right.dragging;

            if (!stickRight && (stickLeft || (distanceX > 0 && this.canFlipPrev()))) {
                if (left && !left.flipping) {
                    /* Prime the incoming spread at drag start — see the
                       next-branch note. */
                    if (!left.dragging) this.loadPrevSpread();
                    /* refreshed every move so the fold tracks the cursor */
                    left._grabTilt = grabTilt;
                    var la = 180 - distanceX - (this._liftLeft || 0);
                    // Reversed past the start: hold at the limit — _setAngle
                    // wraps negatives to ~180 and would snap the page open.
                    if (this.view == 1) la = Math.max(0, Math.min(180, la));
                    left._setDragTarget(la);
                    left.dragging = true;
                    // View 1: the book tracks the fold during the drag too;
                    // the same driver then carries through the release flip.
                    if (this.view == 1) {
                        if (this.movingTo) {
                            if (this.bookMoveTween) this.bookMoveTween.stop();
                            this.movingTo = null;
                        }
                        this._panFollowSheet = left;
                        this._followFlip(left);
                    }
                    this._setCursor('grabbing');
                    this.main.dragPage();
                }
                if (right && !right.flipping) {
                    right._clearFingerBend();
                    right._setAngle(0);
                }
                /* Never hide a sheet that is still in the air: in a chain of
                   drag-commits the prev/next slots point at the sheet the
                   previous release launched, and hiding its material blanked
                   it mid-flight (the preloader plane). */
                if (prev) {
                    prev.showMat();
                }
                if (next && !next.flipping && !next.flippingLeft && !next.flippingRight) {
                    next.hideMat();
                }
            } else if (!stickLeft && (stickRight || (distanceX < 0 && this.canFlipNext()))) {
                if (right && !right.flipping) {
                    /* A drag exposes the incoming spread the moment it lifts
                       — taps prime it in nextPage, but chained drag-commits
                       start while earlier sheets still fly and loadPages
                       bails on isFlipping, so the faces came up white. */
                    if (!right.dragging) this.loadNextSpread();
                    right._grabTilt = grabTilt;
                    var ra = -distanceX + (this._liftRight || 0);
                    if (this.view == 1) ra = Math.max(0, Math.min(180, ra));
                    right._setDragTarget(ra);
                    right.dragging = true;
                    // View 1: same drag-follow as the left-sheet branch.
                    if (this.view == 1) {
                        if (this.movingTo) {
                            if (this.bookMoveTween) this.bookMoveTween.stop();
                            this.movingTo = null;
                        }
                        this._panFollowSheet = right;
                        this._followFlip(right);
                    }
                    this._setCursor('grabbing');
                    this.main.dragPage();
                }
                if (left && !left.flipping) {
                    left._clearFingerBend();
                    left._setAngle(180);
                }
                /* Same guard as the other branch — a flying sheet keeps its
                   material until it lands. */
                if (prev && !prev.flipping && !prev.flippingLeft && !prev.flippingRight) {
                    prev.hideMat();
                }
                if (next) {
                    next.showMat();
                }
            }
        }
    }

    /* Where the pointer sits down the page: +0.5 top edge .. -0.5 bottom edge,
       measured against the page's on-screen height rather than the wrapper's so
       the extremes land on the page corners. Returned unclamped, so callers can
       tell "past the corner" from "at the corner". */
    _pointerPageY(e) {
        var r = this.wrapper.getBoundingClientRect();
        var cy = e && (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
        if (cy == null || !r.height) return 0;
        var scale = (this.centerContainer && this.centerContainer.scale && this.centerContainer.scale.x) || 1;
        var pageScreenH = this.pageH * scale;
        if (!pageScreenH) return 0;
        return (r.top + r.height / 2 - cy) / pageScreenH;
    }

    /* Fold tilt for a dragged page, from where the grip sits down the page.
       Mapped symmetrically about the middle even when the random range is not,
       because a drag has to answer the cursor in both directions; the
       magnitude still comes from the configured range, so the mesh is already
       sized for it. */
    _grabTiltDeg(y) {
        var o = this.options;
        if (!o.pageFlipAngle) return 0;
        var m = Math.max(Math.abs(o.pageFlipAngleMin), Math.abs(o.pageFlipAngleMax));
        return Math.max(-0.5, Math.min(0.5, y)) * 2 * m;
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

        // Re-pick the texture tier for the new display size — required since
        // the small tier adapts to the container. Cached sizes make this cheap.
        this.loadPages();
    }

    updateCameraPosition() {
        /* Runs on every zoom change. A page lifted before the zoom would
           otherwise stay up until the pointer next moved. */
        if (this._hoverDir && this.isZoomed()) this._setHoverTarget(null);

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

        // Camera distance affects the html layer's screen scale (k factor).
        if (this._htmlLayerEl) this._updateHtmlLayerFlat();

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
                /* Rows exist only so a leaning fold can vary down the page, and
                   only a drag leans it. Button and arrow turns fold square, so
                   they run on a single row — the same surface for a fraction of
                   the faces, which is what a hundred-sheet jump is paying for. */
                if (self.options.pageSegmentsH > 1) {
                    self._sharedFlatGeometry = new THREE.BoxGeometry(
                        self.options.pageWidth, self.options.pageHeight, 0.01,
                        self.options.pageSegmentsW, 1, 0
                    );
                    self._sharedFlatGeometry.faceVertexUvs[1] = self._sharedFlatGeometry.faceVertexUvs[0];
                } else {
                    self._sharedFlatGeometry = self._sharedPageGeometry;
                }
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

        this._resetZoom();
        if (this.main._clearResultMarks) this.main._clearResultMarks();

        if (instant) {
            if (this.isFlipping()) return;
        }

        // Pin the spread that was on screen when the jump started: sheets
        // lose their inMotion protection the moment they finish flying, but
        // the origin spread must stay rendered until the whole jump ends
        // (turnPageComplete releases the pin).
        if (!moved) {
            this._goToPageKeep = [this.getLeftPage(), this.getRightPage()].filter(Boolean);
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

        /* Opening a turn, not recursing into one: every sheet of this turn
           shares the fold angle drawn by whichever of them flips first. Only
           released when the book is actually flat, though — a sheet left over
           from the previous turn is still on screen and this turn's sheets
           must not be allowed to cross it. */
        if (!this.goingToPage && !this._anyPageBent()) this._flipTilt = null;
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
        this._settleBuried();
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
        this._settleBuried();
    }

    nextPage(load = true) {
        if (!this.canFlipNext()) {
            return;
        }

        this._resetZoom();
        if (this.main._clearResultMarks) this.main._clearResultMarks();
        this.clickedPage = null;

        var i;
        for (i = 0; i < this.pages.length; i++) {
            if (this.pages[i].flippingRight) {
                return;
            }
        }

        if (this.view == 1 && !this.goingToPage && this.isFocusedLeft() && !this._midFollow()) {
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
                // The recenter must track the flip, not run on its own clock:
                // a drag-committed flip finishes from an already-open fold and
                // the fixed 600ms/200ms tween slid the book over after the
                // page had already landed. The flipping sheet drives the book
                // frame-by-frame instead — see _followFlip.
                if (this.bookMoveTween) this.bookMoveTween.stop();
                this.movingTo = null;
                this._panFollowSheet = page;
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
                // Fast sequential flips: loadNextSpread adds ~2 rendered pages
                // per tap while loadPages (and its unloadPages) bails on
                // isFlipping until the book settles — so prune the window here,
                // once per tap, before the incoming spread renders.
                this.unloadPages();
                this._requestSpreadLoad('next');
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
        /* A goToPage's completion callback rides the final sheet of the
           sequence — not necessarily the last to LAND (a stiff back cover
           settles faster than the soft pages beside it). Bail while any
           sheet is still flying: clearing goingToPage now would disarm
           the flipFinnished net that re-enters here at rest. */
        if (this.isFlipping()) return;
        this.goingToPage = false;
        this._goToPageKeep = null;
        this.updateCornerCurl();
        this.options.main.turnPageComplete();
        /* The book just changed under a possibly still cursor — a click-flip
           leaves the mouse where it was, and hover only re-evaluates on
           mousemove. Re-run it from the last known position so the next
           page lifts (or a stale lift drops) without the mouse moving. */
        if (this._lastHoverPos && !this._pointerDown && !this.mouseDown) {
            var hDir = this._hoverTargetAt(this._lastHoverPos);
            this._setHoverTarget(hDir, hDir ? this._grabTiltDeg(this._pointerPageY(this._lastHoverPos)) : null);
        }
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

        // Only the newest invocation may apply materials — wheel/animation
        // fire loadPages per tick, and a slow render resolving late must not
        // clobber the newer tier's applied material with its stale one.
        const seq = (this._loadPagesSeq = (this._loadPagesSeq || 0) + 1);
        const stale = () => seq !== this._loadPagesSeq;

        main.setLoadingProgress(0.1);

        await this.loadPageAsync(leftPage, 'back');
        if (stale()) return;
        this.pageLoaded(leftPage, 'back');
        await this.loadPageAsync(rightPage, 'front');
        if (stale()) return;
        this.pageLoaded(rightPage, 'front');
        main.setLoadingProgress(1);
        await this.loadHTMLAsync(leftPage, 'back');
        await this.loadHTMLAsync(rightPage, 'front');
        if (stale()) return;
        updateHtmlLayer.call(self);
        this.unloadPages();
        loadMorePages.call(self);
    }

    /* Would unloadPages keep this sheet? Same predicate, so a render that
       lands after the window has moved on can be dropped before it costs a
       GPU upload — during fast flipping those pages were being uploaded and
       evicted moments later without ever being seen. */
    _inWindow(sheet) {
        if (!sheet) return false;
        if (sheet.flippingLeft || sheet.flippingRight || sheet.dragging) return true;
        const keep = this._goToPageKeep;
        if (keep && keep.indexOf(sheet) !== -1) return true;
        const left = this.getLeftPage();
        const right = this.getRightPage();
        if (sheet === left || sheet === right) return true;
        const d = this.options.pagesInMemory / 2;
        if (left && Math.abs(sheet.index - left.index) > d) return false;
        if (right && Math.abs(sheet.index - right.index) > d) return false;
        return true;
    }

    /* Renders still running for pages the reader has left behind. Ten quick
       taps start ten spreads rendering; by the time the later ones begin, the
       earlier pages are far away and their pixels will never be shown, yet
       they still hold the pdf worker and delay the spread being landed on.
       Cancel them: pdf.js drops the work, and the caches are cleared so a
       later visit renders the page again. */
    _cancelDistantRenders() {
        const pdfSvc = this.main && this.main.pdfService;
        if (!pdfSvc || !pdfSvc.pages) return;
        const o = this.options;
        const doublePage = !!o.doublePage;
        const centres = [];
        [this.getLeftPage(), this.getRightPage()].forEach((sheet) => {
            if (!sheet) return;
            [sheet.indexF, sheet.indexB].forEach((bookIdx) => {
                if (typeof bookIdx !== 'number' || bookIdx < 0) return;
                centres.push(doublePage ? Math.round(bookIdx / 2) : bookIdx);
            });
        });
        if (!centres.length) return;

        const reach = o.pageRenderReach == null ? 4 : o.pageRenderReach;
        for (let i = 0; i < pdfSvc.pages.length; i++) {
            const pdfPage = pdfSvc.pages[i];
            if (!pdfPage || !pdfPage.renderingTasks || !pdfPage.renderingTasks.length) continue;
            let near = false;
            for (let c = 0; c < centres.length; c++) {
                if (Math.abs(i - centres[c]) <= reach) {
                    near = true;
                    break;
                }
            }
            if (near) continue;

            const sizes = [];
            pdfPage.renderingTasks.forEach((task) => {
                sizes.push(task._r3dSize);
                try {
                    task.cancel();
                } catch (e) {}
            });
            pdfPage.renderingTasks = [];
            /* Only the sizes that were still rendering — a finished tier on
               this page keeps its bitmap and stays usable. */
            sizes.forEach((sz) => {
                if (sz == null) return;
                if (pdfPage.imageBitmap && pdfPage.imageBitmap[sz]) return;
                if (pdfPage.renderingPromises) delete pdfPage.renderingPromises[sz];
                if (pdfPage.canvas) delete pdfPage.canvas[sz];
            });
            if (o.pageTextureLog && sizes.length) {
                this._texLog('CANCEL', 'pdf page ' + i + ' sizes=' + sizes.join(',') + ' (reader moved on)');
            }

            /* The sheet cached a promise per side+size; drop the ones whose
               render just went away so the page can be requested again. */
            this.pages.forEach((sheet) => {
                if (!sheet._sidePromises) return;
                const own = [sheet.indexF, sheet.indexB].map((b) =>
                    typeof b === 'number' && b >= 0 ? (doublePage ? Math.round(b / 2) : b) : -1
                );
                if (own.indexOf(i) === -1) return;
                ['front', 'back'].forEach((side) => {
                    const m = sheet._sidePromises[side];
                    if (!m) return;
                    sizes.forEach((sz) => {
                        if (sz == null) return;
                        const has = sheet.materials && sheet.materials[side] && sheet.materials[side][sz];
                        if (!has) delete m[sz];
                    });
                });
            });
        }
    }

    _texLog(tag, detail) {
        if (!this.options.pageTextureLog) return;
        console.log('r3d tex ' + tag + ' ' + detail);
    }

    /* What the book is actually holding: GPU textures per sheet (with the
       tier each was rendered at) plus the pdfservice pixel caches that pin
       the same pixels on the JS side. Call book.Book.textureReport() at any
       time, or set pageTextureLog to have it print after every eviction. */
    textureReport(label) {
        var o = this.options;
        var left = this.getLeftPage();
        var right = this.getRightPage();
        var bySize = {};
        var texCount = 0;
        var texBytes = 0;
        var sheets = 0;
        var spread = [];

        (this.pages || []).forEach((sheet) => {
            var sheetBytes = 0;
            ['front', 'back'].forEach((side) => {
                var mats = sheet.materials && sheet.materials[side];
                if (!mats) return;
                Object.keys(mats).forEach((szStr) => {
                    var mat = mats[szStr];
                    var b = mat && mat.map && mat.map._r3dBytes ? mat.map._r3dBytes : 0;
                    texCount++;
                    texBytes += b;
                    sheetBytes += b;
                    if (!bySize[szStr]) bySize[szStr] = { n: 0, mb: 0 };
                    bySize[szStr].n++;
                    bySize[szStr].mb += b / 1048576;
                });
            });
            if (sheetBytes) {
                sheets++;
                if (sheet === left || sheet === right) {
                    spread.push('p' + sheet.index + ' ' + (sheetBytes / 1048576).toFixed(1) + 'MB');
                }
            }
        });

        /* JS-side pixel caches — these hold the same images again until the
           eviction sweep drops them, so they belong in any memory total. */
        var bmpCount = 0;
        var bmpBytes = 0;
        var canvasCount = 0;
        var pdfSvc = this.main && this.main.pdfService;
        if (pdfSvc && pdfSvc.pages) {
            pdfSvc.pages.forEach((pdfPage) => {
                if (!pdfPage) return;
                if (pdfPage.imageBitmap) {
                    Object.keys(pdfPage.imageBitmap).forEach((szStr) => {
                        var bm = pdfPage.imageBitmap[szStr];
                        if (!bm || !bm.width) return;
                        bmpCount++;
                        bmpBytes += bm.width * bm.height * 4;
                    });
                }
                if (pdfPage.canvas) canvasCount += Object.keys(pdfPage.canvas).length;
            });
        }

        var tiers = Object.keys(bySize)
            .sort((a, b) => a - b)
            .map((s) => s + ': ' + bySize[s].n + ' tex ' + bySize[s].mb.toFixed(0) + 'MB')
            .join('  |  ');

        console.log(
            'r3d tex REPORT' + (label ? ' (' + label + ')' : '') + '\n' +
                '  window   pagesInMemory=' + o.pagesInMemory +
                '  tiers small/medium/large=' + o.pageTextureSmall + '/' + o.pageTextureMedium + '/' + o.pageTextureLarge + '\n' +
                '  in use   spread ' + (spread.join(' + ') || 'none') + '\n' +
                '  GPU      ' + texCount + ' textures on ' + sheets + ' sheets = ' + (texBytes / 1048576).toFixed(0) + 'MB\n' +
                '  by tier  ' + (tiers || 'none') + '\n' +
                '  JS cache ' + bmpCount + ' bitmaps = ' + (bmpBytes / 1048576).toFixed(0) + 'MB, ' + canvasCount + ' canvases\n' +
                '  TOTAL    ' + ((texBytes + bmpBytes) / 1048576).toFixed(0) + 'MB'
        );
        return { textures: texCount, textureMB: +(texBytes / 1048576).toFixed(1), bitmaps: bmpCount, bitmapMB: +(bmpBytes / 1048576).toFixed(1) };
    }

    /* Every ImageBitmap a live texture still points at. close() detaches the
       pixels, so any later upload from that bitmap draws black — and uploads
       are lazy: three uploads on the first frame a material is drawn, and
       re-uploads every texture after a context loss (mobile drops the context
       on rotate under memory pressure). Eviction deliberately keeps some
       textures above the base tier — the displayed sharp one, and a side's
       last remaining one after a resize moved the tier — so "texture disposed"
       and "bitmap closed" are no longer the same event. Dropping the cache
       entry is still right; the texture then holds the only ref and the bitmap
       dies with it. */
    _liveBitmaps() {
        const live = new Set();
        this.pages.forEach((sheet) => {
            if (!sheet.materials) return;
            ['front', 'back'].forEach((side) => {
                const sideMats = sheet.materials[side];
                if (!sideMats) return;
                Object.keys(sideMats).forEach((szStr) => {
                    const mat = sideMats[szStr];
                    const img = mat && mat.map && mat.map.image;
                    if (img) live.add(img);
                });
            });
        });
        return live;
    }

    unloadPages() {
        let left = this.getLeftPage();
        let right = this.getRightPage();
        let distance = this.options.pagesInMemory / 2;
        // A sheet still animating (goToPage cascade, quick taps with slow
        // flips) is on screen regardless of its window distance — evicting it
        // blanks the page mid-air (first/last/goToPage advance flippedleft to
        // the destination instantly, so the start spread is already "far").
        // Treat in-motion sheets as in-window; the pass after they land
        // collects them.
        const inMotion = (sheet) =>
            sheet.flippingLeft ||
            sheet.flippingRight ||
            sheet.dragging ||
            (sheet._bendUniforms && sheet._bendUniforms.uBendForce.value !== 0);
        // The goToPage origin spread stays pinned for the whole jump — see
        // goToPage/turnPageComplete.
        const keep = this._goToPageKeep;
        const pinned = (sheet) => !!keep && keep.indexOf(sheet) !== -1;
        this.pages.forEach(function (page) {
            if (inMotion(page) || pinned(page)) return;
            if (left && Math.abs(page.index - left.index) > distance) {
                page.unload('front');
                page.unload('back');
            }
            if (right && Math.abs(page.index - right.index) > distance) {
                page.unload('front');
                page.unload('back');
            }
        });

        /* Two windows, because the tiers cost wildly different amounts. Small
           neighbour textures (~3MB) are worth keeping far out — re-rendering
           them on every flip back is the expensive mistake. Sharp textures
           (~17MB, or a zoom render at the cap) earn their place only around
           the spread, so they are dropped a sheet or two after the reader
           leaves, and re-rendered on return. */
        const baseSize = this._prefetchSize();
        const displayTier = this.currentPageTextureSize;
        const sharpD = (this.options.pagesInMemorySharp == null ? 2 : this.options.pagesInMemorySharp) / 2;
        this.pages.forEach((sheet) => {
            if (inMotion(sheet) || pinned(sheet)) return;
            const nearL = left ? Math.abs(sheet.index - left.index) : Infinity;
            const nearR = right ? Math.abs(sheet.index - right.index) : Infinity;
            const nearSpread = Math.min(nearL, nearR) <= sharpD;
            if (!sheet.materials) return;
            ['front', 'back'].forEach((side) => {
                const sideMats = sheet.materials[side];
                if (!sideMats) return;
                Object.keys(sideMats).forEach((szStr) => {
                    const sz = +szStr;
                    if (sz <= baseSize) return;
                    /* Around the spread, one sharp tier earns its place — the
                       one being displayed. Anything else above the small tier
                       is a superseded zoom render (zooming 1x->2x->3x leaves a
                       trail of them) and goes. Disposal here is safe: the
                       wasActive branch below re-points the mesh, which is what
                       the old _dropLowerTiers failed to do — hence black pages. */
                    if (nearSpread && sz === displayTier) return;
                    /* Never drop a side's last texture. A resize recomputes
                       the neighbour tier from the new page size, so every
                       texture rendered at the old size can suddenly count as
                       oversized — including the only one this side has. That
                       left the preloader showing: a white page until the new
                       render arrived (portrait -> landscape after many
                       flips). Something is always better than nothing; the
                       replacement drops it on the next sweep. */
                    if (Object.keys(sideMats).length <= 1) return;
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

        // Also drop pdfservice's per-pdf-page caches: zoom tiers (> baseSize)
        // for any pdf page that doesn't back the current visible spread, and
        // EVERYTHING for pages outside the pagesInMemory window. Without this,
        // page.canvas[sz] / page.imageBitmap[sz] / convertToImageBitmapPromises[sz]
        // / renderingPromises[sz] all keep the bitmap alive on the JS side
        // even after we drop the book-page reference.
        const pdfSvc = this.main && this.main.pdfService;
        if (pdfSvc && pdfSvc.pages) {
            const liveBitmaps = this._liveBitmaps();
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
            // Book pages on sheets the unload loop above did NOT unload keep
            // their base-tier bitmaps (flipping back re-uses them); everything
            // further out is dropped entirely — unload() already disposed
            // those textures, these maps hold the last refs. Same predicate
            // as the unload loop: a sheet survives only within `distance` of
            // both spread sheets.
            const windowBookIndices = new Set();
            const windowPdfIndices = new Set();
            this.pages.forEach((sheet) => {
                const out =
                    (left && Math.abs(sheet.index - left.index) > distance) ||
                    (right && Math.abs(sheet.index - right.index) > distance);
                if (out && !inMotion(sheet) && !pinned(sheet)) return;
                [sheet.indexF, sheet.indexB].forEach((bookIdx) => {
                    if (typeof bookIdx !== 'number' || bookIdx < 0) return;
                    windowBookIndices.add(bookIdx);
                    windowPdfIndices.add(doublePage ? Math.round(bookIdx / 2) : bookIdx);
                });
            });
            const CACHE_KEYS = ['imageBitmap', 'convertToImageBitmapPromises', 'renderingPromises', 'canvas'];
            for (let i = 0; i < pdfSvc.pages.length; i++) {
                const pdfPage = pdfSvc.pages[i];
                if (!pdfPage) continue;
                if (visiblePdfIndices.has(i)) continue;
                // Decide evictable sizes BEFORE deleting: the in-flight test
                // reads imageBitmap[sz], so deleting map by map would see its
                // own deletions and misclassify a completed render as
                // in-flight — leaving the promise caches alive, whose resolved
                // values pin the bitmap and defeat the eviction entirely.
                const evict = new Set();
                CACHE_KEYS.forEach((key) => {
                    const map = pdfPage[key];
                    if (!map) return;
                    Object.keys(map).forEach((szStr) => {
                        if (+szStr <= baseSize && windowPdfIndices.has(i)) return;
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
                        evict.add(szStr);
                    });
                });
                evict.forEach((szStr) => {
                    // close() frees the pixels now instead of at the next GC.
                    // Skip it while a live texture still sources this bitmap —
                    // see _liveBitmaps(); deleting the cache entry below is
                    // enough, the texture keeps it alive until it is disposed.
                    const bmp = pdfPage.imageBitmap && pdfPage.imageBitmap[szStr];
                    if (bmp && bmp.close && !liveBitmaps.has(bmp)) {
                        if (this.options.pageTextureLog && bmp.width) {
                            this._texLog(
                                'DROP ',
                                'pdf page ' + i + ' size=' + szStr + ' ' + bmp.width + 'x' + bmp.height +
                                    ' ' + ((bmp.width * bmp.height * 4) / 1048576).toFixed(1) + 'MB bitmap'
                            );
                        }
                        try {
                            bmp.close();
                        } catch (e) {}
                    }
                    CACHE_KEYS.forEach((key) => {
                        const map = pdfPage[key];
                        if (map && szStr in map) delete map[szStr];
                    });
                });
            }
            // Drop the book-page records' refs to the same bitmaps for pages
            // outside the window (the zoom-tier loop above only handles
            // sizes > baseSize on sheets that still hold materials).
            const bookPages = this.options.pages || [];
            for (let b = 0; b < bookPages.length; b++) {
                if (windowBookIndices.has(b)) continue;
                const rec = bookPages[b];
                if (rec && rec.imageBitmap) rec.imageBitmap = {};
            }
        }

        // Belt-and-braces: interrupted or overlapping bend tweens could
        // strand a resting sheet mid-bend (rapid left-right flipping). Any
        // settled sheet — not flipping, not dragged, not the current spread
        // (hover lift lives there) — must be flat at its rest rotation.
        this.pages.forEach((p) => {
            if (p === left || p === right) return;
            if (inMotion(p) || pinned(p)) return;
            const u = p._bendUniforms;
            if (!u) return;
            const restAngle = p.isFlippedLeft ? Math.PI : 0;
            let changed = false;
            if (u.uBendForce.value !== 0) {
                u.uBendForce.value = 0;
                changed = true;
            }
            if (u.uBendOffset.value !== 0) {
                u.uBendOffset.value = 0;
                changed = true;
            }
            if (u.uBendTilt.value !== 0) {
                u.uBendTilt.value = 0;
                changed = true;
            }
            if ((p.angle || 0) !== restAngle || p.container.rotation.y !== -restAngle) {
                p.angle = restAngle;
                p.container.rotation.y = -restAngle;
                changed = true;
            }
            p._lastBendForce = 0;
            p._edgeBend = 0;
            p._dragBendScale = null;
            p._releaseForce = null;
            p._fingerBend = false;
            if (changed) this.needsUpdate = true;
        });

        this._cancelDistantRenders();

        if (this.options.pageTextureLog) this.textureReport('after eviction');
    }

    // Full eviction for an instance that can't be seen (scrolled out of the
    // viewport, or its lightbox closed): every sheet's materials and every
    // pdfservice pixel cache go; the parsed pdfDocument, layout and position
    // stay, so waking up is one loadPages() away (current spread re-renders).
    // Without this, multiple flipbooks on one page each hold a full
    // pagesInMemory window — 2-3 hidden instances pass the iOS tab limit.
    hibernate() {
        if (this._hibernated) return;
        this._hibernated = true;

        this.pages.forEach((sheet) => {
            sheet.unload('front');
            sheet.unload('back');
        });

        const pdfSvc = this.main && this.main.pdfService;
        if (pdfSvc && pdfSvc.pages) {
            // The unload() sweep above disposed every material, so this is
            // normally empty — but never close a bitmap a texture survived on.
            const liveBitmaps = this._liveBitmaps();
            const CACHE_KEYS = ['imageBitmap', 'convertToImageBitmapPromises', 'renderingPromises', 'canvas'];
            for (let i = 0; i < pdfSvc.pages.length; i++) {
                const pdfPage = pdfSvc.pages[i];
                if (!pdfPage) continue;
                const evict = new Set();
                CACHE_KEYS.forEach((key) => {
                    const map = pdfPage[key];
                    if (!map) return;
                    Object.keys(map).forEach((szStr) => {
                        // Same in-flight guard as unloadPages: evicting a render
                        // that hasn't produced its bitmap yet crashes createPageImage.
                        if (
                            pdfPage.renderingPromises &&
                            pdfPage.renderingPromises[szStr] &&
                            !(pdfPage.imageBitmap && pdfPage.imageBitmap[szStr])
                        )
                            return;
                        evict.add(szStr);
                    });
                });
                evict.forEach((szStr) => {
                    const bmp = pdfPage.imageBitmap && pdfPage.imageBitmap[szStr];
                    if (bmp && bmp.close && !liveBitmaps.has(bmp)) {
                        try {
                            bmp.close();
                        } catch (e) {}
                    }
                    CACHE_KEYS.forEach((key) => {
                        const map = pdfPage[key];
                        if (map && szStr in map) delete map[szStr];
                    });
                });
            }
        }
        (this.options.pages || []).forEach((rec) => {
            if (rec && rec.imageBitmap) rec.imageBitmap = {};
        });
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
        /* View 1's half-step pans join the fold-follow behind the shared
           target instead of running their own tween — see _setPanTarget. */
        if (this.view == 1 && time && !delay && pos.bookWidth === this.bookWidth) {
            if (this.bookMoveTween) this.bookMoveTween.stop();
            this.movingTo = null;
            this._setPanTarget(pos.x * this.centerContainer.scale.x, callback || null);
            return;
        }
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
                // Drag-pan (_move) calls without bookWidth — only treat it as
                // a change request when the caller actually provides one, or
                // the refit collapses sc to 1 and landscape books jump.
                if (pos.bookWidth !== undefined && this.bookWidth != pos.bookWidth) {
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

    // View 1: while a committed flip runs, the flipping sheet drives the
    // book's x here (from renderFlip, every tween frame), so the slide starts
    // with the flip and stays in lockstep however far the fold was dragged
    // before release. rotation.y runs 0 (sheet on the right) to -PI (landed
    // left); its endpoints map exactly onto the focusRight/focusLeft targets,
    // so isFocusedLeft/Right read correctly when the flip completes.
    // True while a follow-driven transition is mid-air. Focus reads are
    // transient then — the book's x is between the two targets — so the
    // pan-only advance branches must not trust isFocusedLeft/Right.
    _midFollow() {
        var s = this._panFollowSheet;
        if (!s) return false;
        var p = -s.container.rotation.y / Math.PI;
        return p > 0.02 && p < 0.98;
    }

    _followFlip(sheet) {
        if (this.view != 1 || sheet !== this._panFollowSheet) return;
        if (this.movingTo) return; // an explicit focus tween owns the book
        var pw = this.options.pageWidth;
        var p = Math.min(1, Math.max(0, -sheet.container.rotation.y / Math.PI));
        this._setPanTarget((p - 0.5) * pw * this.centerContainer.scale.x);
    }

    /* Single owner of the book's x in view 1. The fold-follow and the
       half-step pans both aim this target; the integrator below moves the
       book toward it. Two direct writers handing the book back and forth —
       each starting wherever the other left it, in opposite directions — is
       what made fast flipping seesaw. */
    _setPanTarget(x, callback) {
        if (this._panTargetX == null) this._panT = performance.now();
        this._panTargetX = x;
        if (callback !== undefined) {
            /* A superseded pan still owes its callback (turnPageComplete and
               friends); fire it now rather than dropping it. */
            if (this._panCallback && this._panCallback !== callback) {
                var old = this._panCallback;
                this._panCallback = null;
                old.call(this);
            }
            this._panCallback = callback || null;
        }
        this.needsUpdate = true;
    }

    _panStep() {
        if (this.draggingBook) {
            /* A finger panning the book writes the position itself. */
            this._panTargetX = null;
            this._panCallback = null;
            return;
        }
        var now = performance.now();
        var dt = Math.min(100, now - (this._panT || now));
        this._panT = now;
        var cur = this.centerContainer.position.x;
        var target = this._panTargetX;

        /* One flip: a short lag, so the book still reads as following the
           fold. Two or more sheets in the air: the targets alternate faster
           than the book can travel, so widen the constant and let the swings
           cancel — the book drifts instead of shaking, then lands on the
           final page once the burst ends and the constant drops back. */
        var tau = this.options.pageBookPanLag == null ? 120 : this.options.pageBookPanLag;
        var flying = 0;
        for (var i = 0; i < this.pages.length; i++) {
            var pg = this.pages[i];
            if (pg.flippingLeft || pg.flippingRight) flying++;
            if (flying > 1) break;
        }
        if (flying > 1) tau *= 3;

        var next;
        if (tau <= 0 || Math.abs(target - cur) < 0.5) next = target;
        else next = cur + (target - cur) * (1 - Math.exp(-dt / tau));

        this.centerContainer.position.x = next;
        this.updateHtmlLayerPosition();
        this.updateLightPosition();
        this.needsUpdate = true;

        if (next === target) {
            this._panTargetX = null;
            this._panT = null;
            if (this._panCallback) {
                var cb = this._panCallback;
                this._panCallback = null;
                cb.call(this);
            }
        }
    }

    prevPage(load = true) {
        if (!this.canFlipPrev()) {
            return;
        }

        this._resetZoom();
        if (this.main._clearResultMarks) this.main._clearResultMarks();
        this.clickedPage = null;

        var i;
        for (i = 0; i < this.pages.length; i++) {
            if (this.pages[i].flippingLeft) {
                return;
            }
        }

        if (this.view == 1 && !this.goingToPage && this.isFocusedRight() && !this._midFollow()) {
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
                // Same flip-driven recenter as nextPage — see _followFlip.
                if (this.bookMoveTween) this.bookMoveTween.stop();
                this.movingTo = null;
                this._panFollowSheet = page;
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
                // Same per-tap pruning as nextPage — see comment there.
                this.unloadPages();
                this._requestSpreadLoad('prev');
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

    /* Largest total wrap that keeps a curling sheet clear of the stack.

       Depth below the stack plane at arc s is the running integral of
       sin(theta - phi(s)), so the sheet stays clear while

           integral[0..1] sin(theta - A * psi(s)) ds  >=  0

       with A the total wrap and psi the growth profile. A plain arc has
       psi(s) = s and solves in closed form to A <= 2*theta. Concentrating the
       bend near the spine turns the sheet earlier and drives it deeper for the
       same A, so the limit falls below 2*theta as pageBendGrowth rises, with no
       closed form — tabulate once per book and interpolate.

       Page aspect deliberately does not enter. The constraint is scale-free in
       page width, and a tilted fold only ever shortens the across-fold
       distance — the far corner sits at cos(tilt) of the width — so the
       untilted case already bounds every row. */
    _buildWrapLimit(growth) {
        var STEPS = 16;
        var lnG = growth > 0.0001 ? Math.log(1 + growth) : 0;
        function psi(s) {
            return growth > 0.0001 ? Math.log(1 + growth * s) / lnG : s;
        }
        function depth(theta, A) {
            var sum = 0;
            for (var i = 0; i < STEPS; i++) sum += Math.sin(theta - A * psi((i + 0.5) / STEPS));
            return sum;
        }
        /* Wanted: the FIRST wrap at which the sheet reaches the stack. The
           integral is oscillatory in A — curl far enough and the tail swings
           back up again — so bisecting the whole range lands on a later root
           and licenses a wrap that has already passed through the page. Scan
           outwards for the first sign change, then bisect inside that bracket. */
        var N = 48;
        var SCAN = 240;
        var MAX = 2 * Math.PI;
        var table = new Float64Array(N + 1);
        for (var j = 0; j <= N; j++) {
            var theta = (Math.PI * j) / N;
            var lo = 0;
            var hi = MAX;
            for (var k = 1; k <= SCAN; k++) {
                var a = (MAX * k) / SCAN;
                if (depth(theta, a) < 0) {
                    lo = (MAX * (k - 1)) / SCAN;
                    hi = a;
                    break;
                }
            }
            for (var it = 0; it < 20; it++) {
                var mid = 0.5 * (lo + hi);
                if (depth(theta, mid) >= 0) lo = mid;
                else hi = mid;
            }
            table[j] = lo;
        }
        this._wrapLimit = table;
    }

    /* Interpolated wrap limit at a rotation of theta radians. */
    maxWrap(theta) {
        var t = this._wrapLimit;
        if (!t) return Infinity;
        var x = (Math.min(Math.abs(theta), Math.PI) / Math.PI) * (t.length - 1);
        var i = Math.min(t.length - 2, Math.floor(x));
        return t[i] + (t[i + 1] - t[i]) * (x - i);
    }

    /* Client-space position of a point on a page, in px. */
    _pageScreenPoint(page, lx, ly) {
        var v = new THREE.Vector3(lx, ly, 0);
        page.container.updateMatrixWorld();
        v.applyMatrix4(page.container.matrixWorld);
        /* The renderer refreshes the camera's inverse, so between a camera move
           and the next frame it is still identity — and projecting through it
           divides by zero. Hit-testing must not depend on a render having
           happened, so refresh it here. */
        this.Camera.updateMatrixWorld();
        v.project(this.Camera);
        var r = this.wrapper.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    }

    /* Distance from a point to the segment ab, in px. */
    _distToSegment(px, py, a, b) {
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var len = dx * dx + dy * dy;
        var t = len ? ((px - a.x) * dx + (py - a.y) * dy) / len : 0;
        t = Math.max(0, Math.min(1, t));
        var qx = a.x + t * dx - px;
        var qy = a.y + t * dy - py;
        return Math.sqrt(qx * qx + qy * qy);
    }

    /* Which page edge the pointer is over, if any.

       Hit-tested against the book itself rather than against a DOM rectangle.
       The rectangles live inside the HTML overlay, and that overlay is a flat
       plane sitting on top of the WebGL page — it has to come down for a lift
       to be visible at all, but taking it down destroys the rectangle being
       hovered, which fires mouseleave and drops the page. Projecting the page's
       own spine and outer edge to the screen breaks that circle, and works just
       as well while the overlay is down mid-flip. */
    _hoverTargetAt(e) {
        var o = this.options;
        /* Zoomed in, a drag pans the book rather than turning a page, so there
           is nothing to lift towards — offering it would promise a flip the
           press is not going to perform. */
        if (!o.pageHoverLift || !this.enabled || this.isFlipping() || this.isZoomed()) return null;
        /* Nothing hovers while a finger is down. A page being dragged is
           already answering the pointer, and lifting its neighbour underneath
           that would fight it. */
        if (this._pointerDown || this.mouseDown || this.draggingBook) return null;
        for (var d = 0; d < this.pages.length; d++) {
            if (this.pages[d].dragging) return null;
        }

        var cx = e && (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
        var cy = e && (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
        if (cx == null || cy == null) return null;

        /* Corners only — that is where a hand goes for a page, and the boxes
           match the html layer's click areas. The old full-height edge strip
           armed lifts along the whole side and is gone. All in screen px —
           aimed at the cursor, not at anything in page space. */
        var corner = Math.max(0, o.pageHoverCornerSize);
        var pairs = [
            [this.getRightPage(), this.canFlipNext(), 'next'],
            [this.getLeftPage(), this.canFlipPrev(), 'prev'],
        ];
        for (var i = 0; i < pairs.length; i++) {
            var page = pairs[i][0];
            if (!page || !pairs[i][1]) continue;
            var top = this._pageScreenPoint(page, this.pageW, this.pageH / 2);
            var bot = this._pageScreenPoint(page, this.pageW, -this.pageH / 2);
            /* Which side of the edge the cursor is on, taken from the spine so
               it holds for either page and for right-to-left books. */
            var spine = this._pageScreenPoint(page, 0, 0);
            var ox = (top.x + bot.x) / 2 - spine.x;
            var oy = (top.y + bot.y) / 2 - spine.y;
            if (corner) {
                /* The corner box tracks the html layer's pageClickArea strip:
                   the same corner region that flips on click lifts on hover.
                   Its size scales with the page on screen ('10%' style
                   values), never below pageHoverCornerSize, and reaches into
                   the page as far as it does out — inside the click
                   affordance, hovering the content is the point, not the old
                   latch hazard. */
                var cw = corner;
                var caw = o.pageClickAreaWdith;
                if (caw) {
                    var pw = Math.sqrt(ox * ox + oy * oy);
                    var f = typeof caw === 'string' && caw.indexOf('%') !== -1 ? parseFloat(caw) / 100 : null;
                    cw = Math.max(corner, f != null ? f * pw : parseFloat(caw) || 0);
                }
                var hx = cx - top.x;
                if (Math.abs(hx) <= cw && cy >= top.y - cw && cy <= top.y + cw) return pairs[i][2];
                var bx = cx - bot.x;
                if (Math.abs(bx) <= cw && cy <= bot.y + cw && cy >= bot.y - cw) return pairs[i][2];
            }
        }
        return null;
    }

    /* 'grab' while a page is takeable, 'grabbing' while one is being taken. */
    _setCursor(mode) {
        if (this._cursorMode === mode) return;
        this._cursorMode = mode;
        var cl = this.wrapper.classList;
        cl.toggle('r3d-grab', mode === 'grab');
        cl.toggle('r3d-grabbing', mode === 'grabbing');
    }

    /* Zoomed, a drag pans instead of turning, and panning works anywhere over
       the book, so the grab is offered across all of it. Unzoomed the cursor
       follows the lift catch instead: a page can be dragged from anywhere on
       it, but mid-page a press zooms, and claiming the whole page for the grab
       buried the zoom cursor the page already sets. */
    _grabbableAt(e) {
        var o = this.options;
        if (!this.enabled || o.pageDragDisabled || this.isFlipping()) return false;
        if (!this.isZoomed()) return false;
        var cx = e && (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
        var cy = e && (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
        if (cx == null || cy == null) return false;

        var r = this.wrapper.getBoundingClientRect();
        return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    }

    _setHoverTarget(dir, tilt) {
        if (this._hoverDir === dir) {
            /* Same edge, new place along it — re-lean without restarting the
               rise, so the fold follows the cursor the way a drag would. */
            if (dir) this._setHoverTilt(dir, tilt);
            return;
        }
        var was = this._hoverDir;
        this._hoverDir = dir;
        if (was) this.hoverLift(was, false);
        if (dir) {
            this._setHoverTilt(dir, tilt);
            this.hoverLift(dir, true);
        }

        /* Watchdog, alive only while lifted: events can stop reaching the
           wrapper with the cursor gone elsewhere (content iframes swallow
           moves, overlays stop propagation, the book shifts under a still
           mouse) — re-validate the last known position and drop when it no
           longer qualifies. A genuine in-zone hover re-resolves to the same
           dir and nothing changes. */
        var self = this;
        if (dir && !this._hoverWatch) {
            this._hoverWatch = setInterval(function () {
                if (!self._hoverDir) {
                    clearInterval(self._hoverWatch);
                    self._hoverWatch = null;
                    return;
                }
                if (self._pointerDown || self.mouseDown) return;
                var d = self._lastHoverPos ? self._hoverTargetAt(self._lastHoverPos) : null;
                if (d !== self._hoverDir) {
                    self._setHoverTarget(d, d ? self._grabTiltDeg(self._pointerPageY(self._lastHoverPos)) : null);
                }
            }, 200);
        } else if (!dir && this._hoverWatch) {
            clearInterval(this._hoverWatch);
            this._hoverWatch = null;
        }
    }

    /* The lift is the opening of a drag, so it leans the way a drag from this
       point would. Without it the fold snaps square-to-leaned the moment the
       press lands — the same discontinuity cancelHoverLift removes from the
       rotation, just in the fold angle. */
    _setHoverTilt(dir, tilt) {
        var page = dir === 'prev' ? this.getLeftPage() : this.getRightPage();
        if (!page || page.flipping || page.dragging) return;
        page._grabTilt = tilt;
        /* Re-run the angle it already holds: that applies the lean through the
           same path a drag uses, and the rise tween may long since have
           finished with nothing else coming to push it through. */
        if (tilt != null) page._setAngle((page.angle * 180) / Math.PI);
    }

    /* Cursor entered or left a page edge: raise the page it would turn, as if
       a drag had just started, and let it settle back on the way out. */
    hoverLift(dir, on) {
        var deg = this.options.pageHoverLift;
        if (!deg) return;
        /* No new lifts while a sheet is in the air — a lift under an
           incoming flip overlaps it (dropping an existing lift is fine). */
        if (on && this.isFlipping()) return;
        if (!on) {
            /* Drop the sheet that actually lifted. Re-deriving it from dir
               fails when the flip triggering the drop has already moved the
               indices (keyboard prev/next) — getRightPage() then points at
               the incoming sheet and the lifted one rode out the whole flip
               raised. The canFlip gates don't apply either: a drop must
               always land. */
            var lifted = this._hoverSheet;
            this._hoverSheet = null;
            if (lifted && !lifted.flipping && !lifted.dragging) lifted.hoverLift(0);
            return;
        }
        var page = dir === 'prev' ? this.getLeftPage() : this.getRightPage();
        if (!page) return;
        if (dir === 'prev' ? !this.canFlipPrev() : !this.canFlipNext()) return;
        this._hoverSheet = page;
        page.hoverLift(deg);
    }

    /* Is any sheet still carrying a bend, i.e. still crossable on screen? */
    _anyPageBent() {
        var pages = this.pages || [];
        for (var i = 0; i < pages.length; i++) {
            var p = pages[i];
            if (p._bendUniforms && p._bendUniforms.uBendForce.value !== 0) return true;
        }
        return false;
    }

    flipFinnished() {
        this._zOrderDirty = true;
        this.needsUpdate = true;

        this._settleBuried();

        /* goingToPage is otherwise cleared only by the onComplete that
           nextPage/prevPage attach when load is true. goToPage flips every
           intermediate sheet with load=false, so only the final sheet carries
           it — and if that flip is rejected by its index guard (another turn
           started mid-jump) nothing clears the flag at all. Latched, it
           suppresses the re-centering in nextPage/prevPage, stops
           updateCornerCurl, and collapses every later fold angle onto one.
           Every page calls this on completion, so clear it once the book has
           actually come to rest. In the normal path the callback has already
           cleared it by now and this is a no-op. */
        if (this.goingToPage && !this.isFlipping()) {
            this.turnPageComplete();
        }
    }

    /* A page that was hover-lifted when a sheet landed on top of it has
       nothing left to drop it — the hover machinery only ever speaks to the
       current top pages, and a buried sheet no longer is one. Settle any
       non-top sheet still holding an angle off its rest. Runs from
       flipFinnished for animated flips and from the instant paths after
       their index updates (their flipFinished fires before the indices
       move, when the buried sheet still looks like a top page). */
    _settleBuried() {
        var L = this.getLeftPage();
        var R = this.getRightPage();
        for (var i = 0; i < this.pages.length; i++) {
            var pg = this.pages[i];
            if (pg === L || pg === R || pg.flipping || pg.dragging) continue;
            var restRad = pg.isFlippedLeft ? Math.PI : 0;
            if (pg.angle != null && Math.abs(pg.angle - restRad) > 0.001) {
                if (pg._hoverTween) pg.cancelHoverLift();
                pg._setAngle(pg.isFlippedLeft ? 180 : 0);
            }
        }
    }

    lastPage() {}

    updateVisiblePages() {}

    /* Tier for the spread a flip is uncovering. Normally the medium tier, so
       the page lands at reading quality with nothing more to do. But while
       flips are coming faster than they finish, each spread is on screen for
       a moment and then gone: render the cheap tier instead — it completes
       roughly three times sooner (so fewer blank pages) and costs a third of
       the memory. loadPages() upgrades the spread to the display tier as
       soon as the book settles. */
    /* Pages a flip uncovers load at the small tier — they are seen in motion,
       for a moment, and the reader is usually on the way somewhere else. The
       spread that is actually landed on is upgraded to the sharp adaptive
       size by loadPages once the book settles. pageTextureNeighbour pins
       this if a book wants something else. */
    _prefetchSize() {
        const o = this.options;
        if (o.pageTextureNeighbour) return o.pageTextureNeighbour;
        const medium = o.pageTextureMedium || o.pageTextureSmall;
        return medium;
    }

    /* Per-click loading queues two renders for every turn, so skimming 100
       pages asks for ~200 — nearly all finishing after their page is gone,
       and starving the spread the reader actually lands on (the blank pages
       during fast flips). Coalesce instead: run at most one spread load per
       interval, always for wherever the book is by then, with a trailing run
       so the final position is never missed. A single turn still loads
       immediately — the throttle only engages once turns overlap. */
    _requestSpreadLoad(dir) {
        const wait = this.options.pageLoadThrottle == null ? 120 : this.options.pageLoadThrottle;
        const run = () => {
            this._spreadLoadAt = performance.now();
            this._spreadLoadTimer = null;
            if (this._spreadLoadDir === 'prev') this.loadPrevSpread();
            else this.loadNextSpread();
        };
        this._spreadLoadDir = dir;
        if (wait <= 0 || !this._spreadLoadAt || performance.now() - this._spreadLoadAt >= wait) {
            run();
            return;
        }
        if (this._spreadLoadTimer) return; // a trailing run is already queued
        this._spreadLoadTimer = setTimeout(run, wait - (performance.now() - this._spreadLoadAt));
    }

    /* Already has pixels for this side? Then it is good enough as a
       neighbour — re-rendering it a tier finer only pays off when it becomes
       the spread, and loadPages does that on landing. Without this the burst
       tier was immediately superseded by a neighbour render of the same page. */
    _needsPrefetch(sheet, side) {
        if (!sheet) return false;
        const mats = sheet.materials && sheet.materials[side];
        return !mats || !Object.keys(mats).length;
    }

    /* Neighbour renders go through a queue instead of all starting at once.
       Twenty simultaneous pdf renders do not finish sooner than two at a
       time — they just share the same thread and each takes twenty times as
       long, which is why the spread stayed blank while the backlog cleared.
       Nearest-to-the-spread first, and jobs that went stale while queued are
       dropped without ever starting. The visible spread does not come
       through here: loadPages renders it directly, so it never queues behind
       a neighbour. */
    _queuePrefetch(sheet, side, size) {
        if (!sheet) return;
        this._pfQueue = this._pfQueue || [];
        for (let i = 0; i < this._pfQueue.length; i++) {
            const q = this._pfQueue[i];
            if (q.sheet === sheet && q.side === side) return; // already waiting
        }
        this._pfQueue.push({ sheet: sheet, side: side, size: size });
        this._pumpPrefetch();
    }

    _pumpPrefetch() {
        const max = this.options.pageRenderConcurrency == null ? 2 : this.options.pageRenderConcurrency;
        this._pfActive = this._pfActive || 0;
        while (this._pfActive < max && this._pfQueue && this._pfQueue.length) {
            const left = this.getLeftPage();
            const right = this.getRightPage();
            const centre = left ? left.index : right ? right.index : 0;
            this._pfQueue.sort(
                (a, b) => Math.abs(a.sheet.index - centre) - Math.abs(b.sheet.index - centre)
            );
            const job = this._pfQueue.shift();
            if (!this._inWindow(job.sheet) || !this._needsPrefetch(job.sheet, job.side)) continue;
            this._pfActive++;
            const done = () => {
                this._pfActive--;
                this._pumpPrefetch();
            };
            this.loadPageAsync(job.sheet, job.side, job.size)
                .then(() => {
                    this.pageLoaded(job.sheet, job.side);
                })
                .then(done, done);
        }
    }

    async loadPrevSpread() {
        const left = this.pages[this.flippedleft - 1];
        const prev = this.pages[this.flippedleft - 2];
        const neighbourSize = this._prefetchSize();
        if (this._needsPrefetch(left, 'front')) this._queuePrefetch(left, 'front', neighbourSize);
        if (this._needsPrefetch(prev, 'back')) this._queuePrefetch(prev, 'back', neighbourSize);
    }

    async loadNextSpread() {
        const right = this.pages[this.flippedleft];
        const next = this.pages[this.flippedleft + 1];
        const neighbourSize = this._prefetchSize();
        if (this._needsPrefetch(right, 'back')) this._queuePrefetch(right, 'back', neighbourSize);
        if (this._needsPrefetch(next, 'front')) this._queuePrefetch(next, 'front', neighbourSize);
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

        // Mid-pinch: visual scale only — per-frame onZoom/loadPages did DOM
        // churn and launched hi-res tier renders + eviction sweeps during
        // the gesture. Both run once at pinchend instead.
        if (!this._gestureZoom) {
            this.options.main.onZoom(newZoom);

            this.loadPages();
        }
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

    // Incremental pan (screen px) from the current position — used by the
    // pinch handler, which composes it with anchored zoom per frame; _move's
    // from-gesture-start math can't, since zoomTo also moves the container.
    _panBy(dx, dy) {
        if (!dx && !dy) return;
        const liveWrapperH = (this.main && this.main.wrapperH) || this.wrapperH;
        let scaleFactor = ((this.zoom * liveWrapperH) / 1000) * this.sc;
        this.moveToPos({
            x: this.centerContainer.position.x / this.sc + dx / scaleFactor,
            y: this.centerContainer.position.y / this.sc - dy / scaleFactor,
        });
        this.updateHtmlLayerPosition();
        this.updateLightPosition();
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

        // Waking from hibernate: re-render the current spread — onResize
        // alone doesn't reload when the layout didn't change.
        if (this._hibernated) {
            this._hibernated = false;
            this.loadPages();
        }
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
        if (this.wrapper && this._onHoverMove) {
            this.wrapper.removeEventListener('mousemove', this._onHoverMove);
            this.wrapper.removeEventListener('mouseleave', this._onHoverOut);
            document.documentElement.removeEventListener('mouseleave', this._onHoverOut);
            if (this._onVisHidden) document.removeEventListener('visibilitychange', this._onVisHidden);
            if (this._hoverWatch) {
                clearInterval(this._hoverWatch);
                this._hoverWatch = null;
            }
        }
        if (this._onPointerRelease) {
            window.removeEventListener('mouseup', this._onPointerRelease);
            window.removeEventListener('touchend', this._onPointerRelease);
            window.removeEventListener('touchcancel', this._onPointerRelease);
            window.removeEventListener('blur', this._onPointerRelease);
        }

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
        this._bendBias = Math.max(0.25, Math.min(6, options.pageBendBias || 1));
        this._bendEase = Math.max(0, Math.min(1, options.pageBendEase == null ? 1 : options.pageBendEase));
        this._bendGrowth0 = options.pageBendGrowth || 0;
        this._bendGrowth1 = options.pageBendGrowthEnd || 0;
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
            uBendTilt: { value: 0 },
            uBendGrowth: { value: options.pageBendGrowth || 0 },
            uBendGrowthK: { value: FLIPBOOK.bendGrowthK(options.pageBendGrowth) },
            uPageWidth: { value: this.pW },
            uPageHeight: { value: this.pH },
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

            // Occasional flutter, not a metronome: lift, hold a beat, settle
            // quicker (paper released), rest flat, repeat — peak and rest
            // vary per cycle (deterministic sequence; subtle is the point).
            // Steps suspend while the sheet is off rest in any way — flipping,
            // dragged, hover-lifted or mid fold — because the curl composes
            // with the flip bend in the shader and wobbles the corner
            // mid-turn. Resumes by itself at rest.
            const curlPeaks = [-1.8, -1.2, -1.5];
            const curlRests = [1600, 2400, 2000];
            let curlCycle = 0;
            const curlOffRest = () =>
                this.flipping ||
                this.flippingLeft ||
                this.flippingRight ||
                this.dragging ||
                this._hoverTween ||
                Math.abs(this.angle || 0) > 0.001;
            const curlStep = (v) => {
                if (!this.cornerCurl) return;
                if (curlOffRest()) {
                    if (this._bendUniforms.uCurlForce.value !== 0) {
                        this._bendUniforms.uCurlForce.value = 0;
                        this.book.needsUpdate = true;
                    }
                    return;
                }
                this._bendUniforms.uCurlForce.value = v;
                this.book.needsUpdate = true;
            };
            const curlPhase = (from, to, duration, easing, delay, next) => {
                const prev = this.cornerCurlTween;
                if (prev) {
                    const idx = this.animations.indexOf(prev);
                    if (idx > -1) this.animations.splice(idx, 1);
                }
                this.cornerCurlTween = FLIPBOOK.animate({
                    from: from,
                    to: to,
                    duration: duration,
                    easing: easing,
                    delay: delay,
                    step: curlStep,
                    complete: next,
                });
                this.animations.push(this.cornerCurlTween);
            };
            const curlRun = () => {
                const peak = curlPeaks[curlCycle % curlPeaks.length];
                const rest = curlRests[curlCycle % curlRests.length];
                curlCycle++;
                curlPhase(0, peak, 600, 'easeInOutQuad', rest, () =>
                    curlPhase(peak, peak, 200, 'easeInOutQuad', 0, () =>
                        curlPhase(peak, 0, 450, 'easeOutSine', 0, curlRun),
                    ),
                );
            };
            curlRun();
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

    /* Is an angle already committed that this sheet must match? True while any
       other sheet still carries a bend — tested on the live bend rather than
       flippingLeft/Right, which stay set right through bendOut long after the
       sheet has flattened and can no longer be crossed; keying off those would
       chain unrelated clicks onto one angle forever. goingToPage is ORed in so
       a multi-sheet jump shares even across a lull between its sheets. */
    _sharedTilt() {
        var b = this.book;
        if (b._flipTilt == null) return false;
        if (b.goingToPage) return true;
        var pages = b.pages;
        for (var i = 0; i < pages.length; i++) {
            var pg = pages[i];
            if (pg !== this && pg._bendUniforms && pg._bendUniforms.uBendForce.value !== 0) {
                return true;
            }
        }
        return false;
    }

    _pickBendTilt() {
        var o = this.options;
        var b = this.book;
        var deg = 0;
        if (o.pageFlipAngle) {
            /* Sheets bent at the same time get the identical angle, never
               merely a close one — any difference lets their curls cut through
               each other. Whatever is already on screen wins, exactly as it
               does across a goToPage jump; a drag only gets to choose its own
               angle when the book is otherwise flat, and then publishes it so
               anything starting on top of it matches. */
            if (this._sharedTilt()) {
                deg = b._flipTilt;
            } else if (this._grabTilt != null) {
                /* Only a drag tilts the fold, and only from where it grips.
                   A button or arrow gives no such information, so those turns
                   fold square — inventing a lean for them just made identical
                   inputs look inconsistent. */
                deg = b._flipTilt = this._grabTilt;
            } else {
                deg = b._flipTilt = 0;
            }
        }
        this._bendUniforms.uBendTilt.value = (deg * Math.PI) / 180;
    }

    /* Which bend mesh this fold needs. Pages that build their own geometry
       (the corner-curl sheet) keep it. */
    _useBendGeometry() {
        if (this.gF !== this.book._sharedPageGeometry) return;
        var g = this._bendUniforms.uBendTilt.value === 0 ? this.book._sharedFlatGeometry : this.gF;
        if (this.cube.geometry !== g) this.cube.geometry = g;
    }

    /* Drop the hover tween without letting it settle the page back — a drag is
       taking over from where it left off. */
    cancelHoverLift() {
        if (this._hoverTween) {
            this._hoverTween.stop();
            this._hoverTween = null;
        }
    }

    /* Rise to deg (or settle back at 0). Runs through _setAngle, so the fold
       angle, bend growth and delay all apply exactly as they would to a real
       drag — this is the opening of one, just not committed. */
    hoverLift(deg) {
        if (this.flipping || this.dragging) return;
        var self = this;
        var from = ((this.angle || 0) * 180) / Math.PI;
        var to = this.isFlippedLeft ? 180 - deg : deg;
        if (Math.abs(from - to) < 0.05) return;

        if (this._hoverTween) this._hoverTween.stop();
        this._hoverTween = FLIPBOOK.animate({
            from: from,
            to: to,
            duration: this.options.pageHoverLiftDuration,
            easing: 'easeOutSine',
            step: function (v) {
                if (self.flipping || self.dragging) return;
                self._setAngle(v);
            },
            complete: function () {
                self._hoverTween = null;
                if (deg || self.flipping || self.dragging) return;
                /* fully settled: hand the shared low-poly mesh back and put the
                   HTML overlay up again, which the lift took down. The lean
                   goes with it, so a later turn starts square unless dragged. */
                self._grabTilt = null;
                self._bendUniforms.uBendTilt.value = 0;
                if (self.gF === self.book._sharedPageGeometry) {
                    self.cube.geometry = self.book._sharedEmptyGeometry;
                }
                self.book.updateHtmlLayer(true);
            },
        });
        this.animations.push(this._hoverTween);
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

                    /* The window may have moved past this sheet while the
                       render was in flight — uploading now just to evict on
                       the next sweep is pure waste. Drop the cached promise so
                       a later visit renders it again. */
                    /* A burst-tier render can land after the upgrade already
                       applied a finer one — applying it now would add a second
                       texture for the same side. Whichever order they finish
                       in, keep only the best. */
                    const haveBetter =
                        self.materials &&
                        self.materials[side] &&
                        Object.keys(self.materials[side]).some((sz) => +sz >= size);
                    if (haveBetter) {
                        if (self._sidePromises && self._sidePromises[side]) delete self._sidePromises[side][size];
                        if (self.options.pageTextureLog) {
                            self.book._texLog('LATE ', 'p' + self.index + ' ' + side + ' size=' + size + ' dropped (finer tier already applied)');
                        }
                        if (callback) {
                            callback.call(self);
                        }
                        return;
                    }
                    if (self.book && self.book._inWindow && !self.book._inWindow(self)) {
                        if (self._sidePromises && self._sidePromises[side]) delete self._sidePromises[side][size];
                        if (self.options.pageTextureLog) {
                            self.book._texLog('STALE', 'p' + self.index + ' ' + side + ' size=' + size + ' skipped (out of window)');
                        }
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
                    if (self.options.pageTextureLog && mat.map) {
                        self.book._texLog(
                            'LOAD ',
                            'p' + self.index + ' ' + side + ' size=' + size + ' ' + mat.map._r3dDims +
                                ' ' + (mat.map._r3dBytes / 1048576).toFixed(1) + 'MB'
                        );
                    }

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

                    /* The window may have moved past this sheet while the
                       render was in flight — uploading now just to evict on
                       the next sweep is pure waste. Drop the cached promise so
                       a later visit renders it again. */
                    /* A burst-tier render can land after the upgrade already
                       applied a finer one — applying it now would add a second
                       texture for the same side. Whichever order they finish
                       in, keep only the best. */
                    const haveBetter =
                        self.materials &&
                        self.materials[side] &&
                        Object.keys(self.materials[side]).some((sz) => +sz >= size);
                    if (haveBetter) {
                        if (self._sidePromises && self._sidePromises[side]) delete self._sidePromises[side][size];
                        if (self.options.pageTextureLog) {
                            self.book._texLog('LATE ', 'p' + self.index + ' ' + side + ' size=' + size + ' dropped (finer tier already applied)');
                        }
                        if (callback) {
                            callback.call(self);
                        }
                        return;
                    }
                    if (self.book && self.book._inWindow && !self.book._inWindow(self)) {
                        if (self._sidePromises && self._sidePromises[side]) delete self._sidePromises[side][size];
                        if (self.options.pageTextureLog) {
                            self.book._texLog('STALE', 'p' + self.index + ' ' + side + ' size=' + size + ' skipped (out of window)');
                        }
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
                    if (self.options.pageTextureLog && mat.map) {
                        self.book._texLog(
                            'LOAD ',
                            'p' + self.index + ' ' + side + ' size=' + size + ' ' + mat.map._r3dDims +
                                ' ' + (mat.map._r3dBytes / 1048576).toFixed(1) + 'MB'
                        );
                    }

                    if (callback) {
                        callback.call(self);
                    }
                });
            }
        }
    }

    loaded(side) {
        // Prefer the current global tier when this sheet has it cached — on a
        // zoom round trip everything is promise-cached, so no load runs and
        // sizeFront/sizeBack stay stuck at the last fresh render; the global
        // tier is what re-applies the sharp texture. Fall back to the size the
        // side was actually loaded at (neighbours load at medium while the
        // visible spread may be at large), and never setMat(undefined) — that
        // would blank the page instead of keeping the last good texture.
        const tier = this.book.currentPageTextureSize;
        const loadedSize = side === 'front' ? this.sizeFront : this.sizeBack;
        const mats = this.materials && this.materials[side];
        const size = mats && mats[tier] ? tier : loadedSize;
        if (mats && mats[size]) {
            this.setMat(mats[size], side);
        }
    }

    createTexture(page, size, side) {
        let texture;
        if (page.imageBitmap) {
            const bitmap = FLIPBOOK.tierSource(page.imageBitmap, size);
            texture = new THREE.Texture(bitmap);
            texture.offset.y = 1;
            texture.repeat.y = -1;
        } else {
            texture = new THREE.Texture();

            const tier = page.image[size];
            texture.image = tier ? tier.clone || tier : FLIPBOOK.tierSource(page.image, size);
        }

        if (side == 'left') {
            texture.repeat.x = 0.5;
        } else if (side == 'right') {
            texture.repeat.x = 0.5;
            texture.offset.x = 0.5;
        }

        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        /* Exact GPU cost of this texture, kept on it so eviction can report
           what it frees without re-measuring (no mipmaps, so w*h*4). */
        var img = texture.image;
        texture._r3dBytes = img && img.width ? img.width * img.height * 4 : 0;
        texture._r3dDims = img && img.width ? img.width + 'x' + img.height : '?';

        texture.needsUpdate = true;
        return texture;
    }

    unload(side) {
        if (this._sidePromises && this._sidePromises[side]) delete this._sidePromises[side];

        // Dispose every cached size-tier material for this side, not just the
        // applied one — each texture pins its source ImageBitmap (~15MB per
        // 2200px page on mobile), and a sheet outside the pagesInMemory
        // window must not keep any of them alive.
        const sideMats = this.materials && this.materials[side];
        if (sideMats) {
            var freedBytes = 0;
            var freedSizes = [];
            Object.keys(sideMats).forEach((szStr) => {
                const mat = sideMats[szStr];
                if (mat) {
                    const tex = mat.map;
                    if (tex && tex._r3dBytes) {
                        freedBytes += tex._r3dBytes;
                        freedSizes.push(szStr);
                    }
                    mat.dispose();
                    if (tex) tex.dispose();
                }
            });
            delete this.materials[side];
            if (this.options.pageTextureLog && freedBytes) {
                this.book._texLog(
                    'FREE ',
                    'p' + this.index + ' ' + side + ' sizes=' + freedSizes.join(',') +
                        ' ' + (freedBytes / 1048576).toFixed(1) + 'MB'
                );
            }
        }

        /* Re-point whenever we disposed something: gating on sizeFront/sizeBack
           alone left a disposed material on the mesh whenever the size counter
           had already been zeroed (the eviction sweep does that), which draws
           black rather than the preloader. */
        const hadMats = !!sideMats && Object.keys(sideMats).length > 0;
        if (side == 'front' && (this.sizeFront || hadMats)) {
            this.sizeFront = 0;
            this.setMat(this.preloaderMatF, 'front');
        } else if (side == 'back' && (this.sizeBack || hadMats)) {
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

    /* Drag inertia: the fold chases the pointer instead of snapping to it.
       Move events only update the target; a per-frame loop eases the real
       angle toward it (t ~ 80ms — the paper reacts with a beat of delay and
       catches up, which is what carrying a sheet by its edge feels like).
       Everything downstream (bend, gravity, caps, velocity EMA) still runs
       through _setAngle, just fed smooth angles. Stops the moment the drag
       ends so bendIn owns the angle uncontested. */
    _setDragTarget(deg) {
        if (!(deg <= 180 && deg >= -180)) return;
        if (deg < 0) deg += 180;
        this._dragTargetDeg = deg;
        this.dragging = true;
        if (this._chaseRaf) return;
        var self = this;
        var last = performance.now();
        var step = function () {
            self._chaseRaf = null;
            if (!self.dragging || self.flipping || self.flippingLeft || self.flippingRight) return;
            var now = performance.now();
            var dt = Math.min(100, now - last);
            last = now;
            var cur = (self.angle * 180) / Math.PI;
            var target = self._dragTargetDeg;
            var next;
            var chaseT = self.options.pageChaseTime == null ? 80 : self.options.pageChaseTime;
            if (Math.abs(target - cur) < 0.05 || chaseT <= 0) {
                next = target;
            } else {
                next = cur + (target - cur) * (1 - Math.exp(-dt / chaseT));
            }
            self._setAngle(next);
            /* Body angular velocity (rotation space, rad/ms) — bendIn seeds
               its inertial completion from this at release. */
            var rotNow = self.container.rotation.y;
            if (self._chasePrevRot != null && dt > 0) {
                var vI = (rotNow - self._chasePrevRot) / dt;
                self._bodyVel = self._bodyVel == null ? vI : self._bodyVel + (vI - self._bodyVel) * 0.35;
                self._bodyVelT = now;
            }
            self._chasePrevRot = rotNow;
            if (self.book._panFollowSheet === self) self.book._followFlip(self);
            self._chaseRaf = requestAnimationFrame(step);
        };
        this._chaseRaf = requestAnimationFrame(step);
    }

    /* Fully drop finger-driven bend state. Needed wherever a dragged sheet
       is snapped to rest without a release flip (the opposite-direction
       branch of the move handler) — _setAngle would otherwise apply the
       stale edge/gravity terms one last time and leave the sheet bent with
       nothing driving it. */
    _clearFingerBend() {
        this.dragging = false;
        this._fingerBend = false;
        this._edgeBend = 0;
        this._dragBendScale = null;
        this._releaseForce = null;
        this._dragTargetDeg = null;
        this._captureForce = null;
        this._captureOffset = null;
    }

    _setAngle(angle) {
        if (angle <= 180 && angle >= -180) {
            angle = (angle / 180) * Math.PI;

            if (angle < 0) {
                angle = angle + Math.PI;
            }

            /* Applied before the unchanged-angle bail so the fold keeps
               following the grip even on a purely vertical move. Suspended
               while another sheet is bent: matching it matters more than
               tracking the cursor, and that sheet's angle cannot be changed
               retroactively. */
            if (this._grabTilt != null && !this._sharedTilt()) {
                var g = (this._grabTilt * Math.PI) / 180;
                if (this._bendUniforms.uBendTilt.value !== g) {
                    this._bendUniforms.uBendTilt.value = g;
                    this.book._flipTilt = this._grabTilt;
                    this.book.needsUpdate = true;
                    /* A drag can lean a fold that started square, and a purely
                       vertical move returns at the unchanged-angle bail below
                       without ever reaching the swap. */
                    if (this.cube.geometry !== this.book._sharedEmptyGeometry) this._useBendGeometry();
                }
            }

            if (this.angle == angle) {
                return;
            }

            this.angle = angle;

            /* Small lifts read as a corner peel, not a door swing: while a
               finger holds the page (drag or hover) below the ~30deg knee,
               most of the input becomes reversed bend — the corner rises off
               the stack, which is exactly the direction the mirrored wrap cap
               allows at rest — and rigid rotation fades in via smoothstep.
               Committed flips bypass the knee and bendIn starts from the
               applied rotation, so the handoff is continuous. this.angle
               keeps the INPUT angle (drag targets and lift stashes live in
               that space); only the container gets the knee-mapped value. */
            var applied = angle;
            var liftBend = 0;
            var KNEE = (((this.options.pageLiftKnee == null ? 30 : this.options.pageLiftKnee) * Math.PI) / 180) || 0.0001;
            if ((this.dragging || this._hoverTween) && !this.flipping && !this.flippingLeft && !this.flippingRight) {
                var aIn = this.isFlippedLeft ? Math.PI - angle : angle;
                if (aIn < KNEE) {
                    var sK = aIn / KNEE;
                    sK = sK * sK * (3 - 2 * sK);
                    var aOut = aIn * sK;
                    liftBend = (aIn - aOut) / KNEE;
                    applied = this.isFlippedLeft ? Math.PI - aOut : aOut;
                }
            }
            this.container.rotation.y = -applied;

            if (Math.abs(applied) > 0.03 || liftBend) this._useBendGeometry();


            /* A sheet cannot curl back further than it has swung away from the
               stack, or its tail passes through the pages underneath. Total
               wrap is PI*force, so cap force at the rotation already travelled
               — from 0 going left, from PI coming back — less a margin. Soft
               paper is what needs this: at pageHardness 2 the wrap only ever
               reaches 0.75x the travel so the cap never binds, but at 1 it is
               2.1x at small angles and the page is inside the stack from the
               moment it lifts. The limit is a property of the curl's shape
               rather than a fixed ratio to the rotation — see
               Book._buildWrapLimit — and it follows pageBendGrowth, which
               drives the sheet deeper for the same total wrap. */
            var travel = this.isFlippedLeft ? Math.PI - applied : applied;

            /* Sweep where the bend sits as the turn proceeds: the sheet peels
               sharply off the spine and the curl migrates outward as it goes
               over. Eased rather than linear so most of the migration happens
               early, while the page is still close to the stack. */
            var prog = Math.min(1, Math.max(0, travel / Math.PI));
            if (this._bendAnchor) {
                prog = Math.min(
                    1,
                    Math.max(0, (travel - this._bendAnchor.t0) / (this._bendAnchor.t1 - this._bendAnchor.t0))
                );
            }

            /* At pageBendBias 1 and pageBendEase 0 this is sin(travel/2) — the
               curve the viewer has always used — so the defaults bend exactly
               as they did before any of this existed.

               Bias warps the progress first, moving the peak later without
               opening a dead zone at the start. Ease then blends towards a
               raised cosine, which eases at both ends and runs near enough
               straight through the middle. Driven off travel, so the returning
               page gets an identical profile without a second expression. */
            var u = this._bendBias === 1 ? prog : Math.pow(prog, this._bendBias);
            var shape = Math.sin(u * Math.PI * 0.5);
            var ease = this._bendEase;
            if (ease) shape += (0.5 - 0.5 * Math.cos(Math.PI * u) - shape) * ease;
            /* 1.35/hardness^1.5 is the shared base of all three force terms
               (envelope, edge-hold, corner lift); hardness only changes via
               tuning, so cache the pow. unit carries the sheet's trailing
               sign — the finger terms below subtract against it. */
            if (this._h15for !== this.pageHardness) {
                this._h15for = this.pageHardness;
                this._h15 = 1.35 / Math.pow(this.pageHardness, 1.5);
            }
            var unit = this.isFlippedLeft ? -this._h15 : this._h15;
            var force = unit * shape;

            /* Time-based easing (frame-rate independent — per-call factors
               converge twice as fast at 120Hz and would fight feel tuning). */
            var nowB = performance.now();
            var dtB = Math.min(100, nowB - (this._bendEaseT || nowB));
            this._bendEaseT = nowB;
            var kFast = 1 - Math.exp(-dtB / 60);

            /* Travel velocity (rad/ms), kept fresh in every branch so a
               release hands the flip its true speed. */
            var wNow = 0;
            if (this._velPrevTravel != null && dtB > 0) wNow = (travel - this._velPrevTravel) / dtB;
            this._velPrevTravel = travel;

            var velOn = (this.options.pageBendVelocity == null ? 1 : this.options.pageBendVelocity) > 0;
            /* _bendMain counts as flight: fall-back releases (release safety,
               view-1 fold resolution) run bendIn without the flip flags, and
               dropping them to the envelope path made the bend surge toward
               the deep travel profile right as the page fell home. */
            var inFlight = this.flipping || this.flippingLeft || this.flippingRight || !!this._bendMain;

            var finger = this.dragging || !!this._hoverTween;
            if (finger) {
                /* Finger-driven bend. Gravity sag baseline: reversed before
                   vertical, flat at vertical, trailing after — -cos(travel)
                   reaches +1 exactly at landing (pageGravity scales it, 0 =
                   classic). Edge-hold on top: the finger pins the outer edge
                   (the drag target, instant), the body rotation chases it
                   with inertia (_setDragTarget), and the lag between them
                   bows the sheet — faster drag, deeper bow. */
                this._fingerBend = true;
                this._releaseForce = null;
                var gDir = -Math.cos(travel);
                var g0 = this.options.pageGravity == null ? 1 : this.options.pageGravity;
                var vTarget = 1 + (gDir - 1) * g0;
                var vScale = this._dragBendScale == null ? vTarget : this._dragBendScale;
                this._dragBendScale = vScale + (vTarget - vScale) * kFast;
                force *= this._dragBendScale;

                var eTarget = 0;
                if (this.dragging && this._dragTargetDeg != null) {
                    var tRad = (this._dragTargetDeg * Math.PI) / 180;
                    var tTravel = this.isFlippedLeft ? Math.PI - tRad : tRad;
                    var eGain = this.options.pageEdgeBend == null ? 1.2 : this.options.pageEdgeBend;
                    eTarget = -unit * eGain * (tTravel - travel);
                }
                this._edgeBend = (this._edgeBend || 0) + (eTarget - (this._edgeBend || 0)) * kFast;
                if (Math.abs(this._edgeBend) < 0.0005) this._edgeBend = 0;
                force += this._edgeBend;

                /* The rotation the knee held back comes out as corner-lift
                   bend (reversed — off the stack), fading as the drag passes
                   the knee. */
                if (liftBend) {
                    var liftGain = this.options.pageLiftBend == null ? 0.7 : this.options.pageLiftBend;
                    force += -unit * liftGain * liftBend;
                }

                /* Handoff INTO a drag. The finger terms are position-derived,
                   so a sheet grabbed with a curl already on it (captured out
                   of its settle) would snap to the drag's own shallower bend
                   the instant the finger took over — the page visibly went
                   flat. Carry the difference and melt it on the same
                   timescale a release uses, so the curl the flip built
                   unwinds in the hand instead of vanishing. */
                if (this._captureForce != null) {
                    if (this._captureOffset == null) this._captureOffset = this._captureForce - force;
                    var carryKD = this.options.pageBendInForceFactor == null ? 2 : this.options.pageBendInForceFactor;
                    force += this._captureOffset;
                    this._captureOffset *= Math.exp(-dtB / Math.max(1, 150 * carryKD));
                    if (Math.abs(this._captureOffset) < 0.001) {
                        this._captureOffset = null;
                        this._captureForce = null;
                    }
                }
            } else if (velOn && inFlight && !this._envFlip) {
                /* Velocity-driven bend: the sheet bows with how fast it is
                   turning — the force chases min(1.2, |w|/wRef) of full
                   depth with a paper-response lag (soft paper sways lazily,
                   stiff paper answers at once and shallowly). Continuous
                   through any release by construction: speed cannot jump.
                   wRef is a full flip's peak speed, so a plain tap reaches
                   the classic depth exactly. Replaces the envelope, release
                   blend and momentum scaling of the pageBendVelocity: 0
                   path below; only flips in flight come here — snaps and
                   settle sweeps still flatten through the envelope path. */
                if (this._fingerBend) {
                    this._fingerBend = false;
                    this._releaseForce = null;
                    this._dragBendScale = null;
                    this._edgeBend = 0;
                }
                /* Reference speed = the AVERAGE speed of a full flip, not the
                   easeInSine peak it used to be — with linear rotation the
                   old peak reference left every bend at 64% depth, drag
                   releases (already slowed by the short-hop stretch) at
                   half of that again. A full-length flip now reaches the
                   classic depth regardless of the easing choice. */
                var wRef = Math.PI / (this._rotTRef || 600 * this.duration);
                var tauV =
                    ((this.options.pageBendResponse == null ? 200 : this.options.pageBendResponse) *
                        Math.sqrt(this.pageHardness || 1)) /
                    2;
                /* Always the trailing sign — the reversed curls a signed
                   velocity produced on fall-backs and direction changes cut
                   through the stack the page was landing on; the clearance
                   caps below are shaped for trailing curls, like the old
                   path only ever produced. */
                var tMag = Math.min(1.2, Math.abs(wNow) / wRef);
                var vTargetF = unit * tMag;
                /* ONE state, eased from the CURRENT bend — whatever the
                   finger, a previous flip or the other path left — toward
                   the velocity target. Split carry+velocity components
                   double-counted the current force on path handoffs and the
                   bend jumped (worst on soft pages, where forces are deep).
                   A bend opposing the target melts on the stretched
                   timescale (pageBendInForceFactor), so a carried opposite
                   bow unwinds instead of evaporating. */
                var lastF = this._lastBendForce || 0;
                var tauEff = tauV;
                /* Relaxing or being driven, not which way it points. Paper
                   bows quickly when the turn drives it, but a bow already in
                   the sheet springs back slowly — so any bend deeper than the
                   speed calls for (or pointing against the turn) unwinds on
                   the stretched timescale. Direction alone was too narrow: a
                   page released mid-drag has a deep bow in the SAME direction
                   as the flip, and at the first flight frame the page has not
                   moved yet, so the target is ~0 and that bow used to collapse
                   at the fast paper rate — the jump seen at release. */
                if (Math.abs(lastF) > Math.abs(vTargetF) || lastF * unit < 0) {
                    var carryK = this.options.pageBendInForceFactor == null ? 2 : this.options.pageBendInForceFactor;
                    tauEff = tauV * (1 + carryK);
                }
                force = lastF + (vTargetF - lastF) * (1 - Math.exp(-dtB / tauEff));
            } else {
                /* Handoff: bendIn/bendOut must continue from whatever bend
                   the finger left — not jump to the rotation-derived profile
                   (the knee's corner lift and the drag terms all vanish the
                   moment their gates drop). Snapshot the last applied force
                   at the transition and blend it into the position profile
                   over the next ~34deg of rotation, whichever direction the
                   release goes (commit or fall-back). bendOut tweens from the
                   live value already, so the endgame is continuous. */
                if (this._bendMomentum != null) force *= this._bendMomentum;
                if (this._fingerBend) {
                    this._fingerBend = false;
                    this._releaseForce = this._lastBendForce || 0;
                    this._releaseTravel = travel;
                    this._dragBendScale = null;
                    this._edgeBend = 0;
                }
                if (this._releaseForce != null) {
                    var wB = Math.min(1, Math.abs(travel - this._releaseTravel) / (this._releaseBlendW || 0.6));
                    wB = wB * wB * (3 - 2 * wB);
                    force = this._releaseForce * (1 - wB) + force * wB;
                    if (wB >= 1) this._releaseForce = null;
                }
            }

            var g = this._bendGrowth0 + (this._bendGrowth1 - this._bendGrowth0) * (prog * prog * (3 - 2 * prog));
            if (this._bendUniforms.uBendGrowth.value !== g) {
                this._bendUniforms.uBendGrowth.value = g;
                this._bendUniforms.uBendGrowthK.value = FLIPBOOK.bendGrowthK(g);
                this.book.needsUpdate = true;
            }

            /* Trailing curl is bounded by the stack the page came from; the
               reversed (gravity drag) curl by the destination stack — a
               leading tip near the end of a slow drag would otherwise poke
               through the pages it is about to land on. The destination cap
               is computed lazily: animated flips (every goToPage sheet) only
               ever curl trailing. */
            /* Pairwise clearance: another sheet in flight between this one
               and a stack tightens the cap exactly as the stack does — the
               neighbour is treated as a stack plane at its angular distance.
               Without it, simultaneously bent sheets could cross: their
               depths (velocity, envelope, drag bows) are not travel-ordered. */
            var gapB = Infinity;
            var gapA = Infinity;
            if (this.book && this.book.pages) {
                var aSelf = Math.min(Math.PI, Math.max(0, -this.container.rotation.y));
                var bq = this.book.pages;
                for (var qi = 0; qi < bq.length; qi++) {
                    var q = bq[qi];
                    if (q === this || !q._bendUniforms) continue;
                    if (
                        !q.dragging &&
                        !q.flipping &&
                        !q.flippingLeft &&
                        !q.flippingRight &&
                        Math.abs(q._bendUniforms.uBendForce.value) < 0.001
                    )
                        continue;
                    var aQ = Math.min(Math.PI, Math.max(0, -q.container.rotation.y));
                    var dQ = this.isFlippedLeft ? aQ - aSelf : aSelf - aQ;
                    if (dQ > 0.001) gapB = Math.min(gapB, dQ);
                    else if (dQ < -0.001) gapA = Math.min(gapA, -dQ);
                }
            }
            var trailingForce = this.isFlippedLeft ? force < 0 : force > 0;
            if (trailingForce) {
                var capT = (0.92 * this.book.maxWrap(Math.min(travel, gapB))) / Math.PI;
                if (force > capT) force = capT;
                else if (force < -capT) force = -capT;
            } else if (force !== 0) {
                var capL = (0.92 * this.book.maxWrap(Math.min(Math.PI - travel, gapA))) / Math.PI;
                if (force > capL) force = capL;
                else if (force < -capL) force = -capL;
            }

            if (Math.abs(force) < 0.0001) force = 0;

            if (this._lastBendForce !== force) {
                /* Drag leaving rest — animated flips draw theirs in
                   flipLeft/flipRight, before the turn is marked in flight.
                   No stopCornerCurl here: it latched the curl off on benign
                   angle writes (texture tier upgrades) — the curl tween now
                   suspends itself whenever the sheet is off rest. */
                if (!this._lastBendForce && !this.flipping) this._pickBendTilt();
                this._lastBendForce = force;
                this._bendUniforms.uBendForce.value = force;
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

    /* Hand a settling sheet to the finger. The turn is over as far as the
       eye is concerned (rotation complete, only the curl unrolling), so
       finalize its bookkeeping the way flipFinished would — but keep the
       live bend instead of zeroing it, since the drag continues from
       there. */
    _captureFromSettle() {
        if (this._bendMain) this._bendMain.stop();
        if (this._bendT1) this._bendT1.stop();
        if (this._bendT2) this._bendT2.stop();
        this._bendMain = this._bendT1 = this._bendT2 = null;

        if (this.flippingLeft) {
            this.flippingLeft = false;
            this.isFlippedLeft = true;
            this.isFlippedRight = false;
        } else if (this.flippingRight) {
            this.flippingRight = false;
            this.isFlippedRight = true;
            this.isFlippedLeft = false;
        }
        this.flipping = false;
        this._settling = false;
        this._bendMomentum = null;
        this._bendAnchor = null;
        this._grabTilt = null;
        /* The curl standing on the sheet right now — the drag continues from
           it rather than snapping to its own profile. */
        this._captureForce = this._lastBendForce || 0;
        this._captureOffset = null;
        /* Same reason as bendIn: the grab starts the melt clock. */
        this._bendEaseT = performance.now();

        if (this.onComplete) this.onComplete(this);
        this.book.flipFinnished();
    }

    flipLeft(onComplete) {
        this.onComplete = onComplete;
        this.dragging = false;
        if (!this.isFlippedLeft && !this.flippingLeft && !this.flippingRight && this.index == this.book.flippedleft) {
            if (this.duration > 0) {
                if (!this._lastBendForce) this._pickBendTilt();
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
                if (!this._lastBendForce) this._pickBendTilt();
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
        /* Restart the bend's easing clock at the release. _setAngle returns
           early when the angle has not changed, so it does NOT advance that
           clock — a finger resting for a moment before letting go left dt as
           the whole dwell (up to the 100ms cap), and the first flight frame
           then applied that entire time constant at once: a fifth of the bend
           gone in one step, the "instantly halves" jump. Timed from the
           release, the first step is one frame like every other. */
        this._bendEaseT = performance.now();
        /* A fresh bend owns the sheet: stop anything a previous (interrupted)
           bendIn/bendOut still has running — overlapping writers were how a
           rapidly re-flipped sheet ended up stranded mid-bend. */
        if (this._bendMain) this._bendMain.stop();
        if (this._bendT1) this._bendT1.stop();
        if (this._bendT2) this._bendT2.stop();

        /* Any hover-lifted page drops home when a flip starts — an incoming
           sheet must land on a flat stack, not overlap a lifted opposite
           page. Goes through the hover machinery so it animates back and the
           book's hover state stays consistent. */
        if (this.book && this.book._setHoverTarget) this.book._setHoverTarget(null);

        /* Belt and braces: the hover bookkeeping can be empty while a page
           still stands part-open — a press cancels the lift tween and
           stashes the opening for a drag that never comes. Check the actual
           top sheets: any non-flying one off its rest settles home before
           this flip lands on it. */
        if (this.book && this.book.getLeftPage) {
            var bPair = [this.book.getLeftPage(), this.book.getRightPage()];
            for (var pi = 0; pi < 2; pi++) {
                var pp = bPair[pi];
                if (!pp || pp === this || pp.flipping || pp.flippingLeft || pp.flippingRight || pp.dragging) continue;
                var restA = pp.isFlippedLeft ? Math.PI : 0;
                if (pp.angle != null && Math.abs(pp.angle - restA) > 0.001) pp.hoverLift(0);
            }
        }

        /* Short hops keep more of the base time when a finger lets go: a
           near-end release has little inertia, and the square-root law made
           it slam home. 0.3 flattens the curve for releases only — a full
           flip's ratio is 1 either way, and programmatic chains keep the
           classic pace. */
        var time1 =
            this.options.pageBendInFactor *
            this.duration *
            300 *
            Math.pow(
                Math.abs(this.container.rotation.y - angle) / Math.PI,
                this._fingerBend ? 0.3 : 0.5
            );

        time1 *= Math.pow(this.pageHardness, 0.25);

        time1 *= 1 + this.pageHardness / 30;

        /* pageBendSplit redistributes the flip between rotation and settle
           around the natural share (~0.58 of the total at defaults): there
           both scales are 1 and the timing is untouched; pushing it up
           lengthens the rotation and shortens the settle so the total
           stays put. */
        var split = this.options.pageBendSplit;
        this._splitOut = 1;
        if (split != null) {
            split = Math.max(0.2, Math.min(0.9, split));
            var splitIn = split / 0.58;
            this._splitOut = (1 - split) / 0.42;
            time1 *= splitIn;
        }

        /* A page released bent against the flip (corner lift, edge hold)
           has a longer force journey to the natural profile than a tap
           from flat. Rather than slowing the turn, widen the travel
           window the release blend in _setAngle unwinds over — scaled by
           the force span and pageBendInForceFactor. A flat start spans
           exactly 1 → the standard 0.6 rad window, so plain flips keep
           both their pace and their bend. */
        var f0 = this._bendUniforms ? this._bendUniforms.uBendForce.value : 0;
        var fFull = 1.35 / Math.pow(this.pageHardness, 1.5);
        var fEnd = this.isFlippedLeft ? -fFull : fFull;
        var spanK = this.options.pageBendInForceFactor == null ? 1 : this.options.pageBendInForceFactor;
        var stretch = 1 + spanK * (Math.min(2, Math.max(1, Math.sqrt(Math.abs(fEnd - f0) / fFull))) - 1);
        this._releaseBlendW = Math.min(2.8, 0.6 * stretch);

        var start = this.container.rotation.y;
        var end = angle;

        /* Concurrent flights use the travel envelope: velocity-driven
           depths are not monotone across staggered sheets, and two curls
           that cross cut through each other — worst at low hardness,
           where bends are deep. Solo flights (the drag releases the
           velocity model exists for) keep the velocity bend. */
        this._envFlip = !!(this.book && this.book.goingToPage);
        if (!this._envFlip && this.book && this.book.pages) {
            var bpages = this.book.pages;
            for (var bi = 0; bi < bpages.length; bi++) {
                var bp = bpages[bi];
                if (bp !== this && (bp.flippingLeft || bp.flippingRight)) {
                    this._envFlip = true;
                    break;
                }
            }
        }

        /* A released drag starts partway through the turn, where the
           travel-anchored envelope is still nearly flat — rotation would
           run while the bend waits. Re-anchor the envelope at the release
           so it rises with the rotation over the remaining travel. Taps
           anchor at 0 and are unchanged; fall-backs (end below start)
           keep the absolute profile so the bend unwinds naturally. */
        this._bendAnchor = null;
        if (this._fingerBend) {
            /* container.rotation.y stores -applied (0..-PI); undo the sign
               before mapping to travel the way _setAngle does. */
            var aNow = Math.min(Math.PI, Math.max(0, -start));
            var aEnd = Math.min(Math.PI, Math.max(0, -end));
            var tNow = this.isFlippedLeft ? Math.PI - aNow : aNow;
            var tEnd = this.isFlippedLeft ? Math.PI - aEnd : aEnd;
            if (tEnd > tNow + 0.001 && tNow > 0.001) this._bendAnchor = { t0: tNow, t1: tEnd };
        }

        /* Peak bend follows this run's momentum — what the flip can build
           over its remaining travel plus any velocity the release brought
           (tracked by the drag chaser). A page let go near the end barely
           bends on its short hop; a full flip carries the classic depth
           (exactly 1); a fling stays deep. Scaled by the ENERGY at landing
           (v^2), not the velocity — a short hop has little inertia and its
           bend falls off linearly with the remaining travel. Applied to the
           position-derived force in _setAngle while this flip runs. */
        var TRef =
            this.options.pageBendInFactor *
            this.duration *
            300 *
            Math.pow(this.pageHardness, 0.25) *
            (1 + this.pageHardness / 30) *
            (split != null ? split / 0.58 : 1);
        this._rotTRef = TRef;
        var accRef = (2 * Math.PI) / (TRef * TRef);
        var distRef = Math.abs(end - start);
        var velRef = 0;
        if (this._bodyVel != null && this._bodyVelT && performance.now() - this._bodyVelT < 120) {
            velRef = Math.max(-0.025, Math.min(0.025, this._bodyVel));
        }
        /* pageBendMomentum blends the effect in: 1 is the full energy
           falloff, 0 pins the multiplier at the classic depth (which also
           mutes the fling boost). */
        var mK = this.options.pageBendMomentum == null ? 1 : Math.max(0, Math.min(1, this.options.pageBendMomentum));
        var energyRatio = Math.min(1.2, (velRef * velRef + 2 * accRef * distRef) / (2 * accRef * Math.PI));
        this._bendMomentum = 1 + (energyRatio - 1) * mK;

        /* pageBendInEasing: 1..5 picks how hard the rotation eases in
           (sine, quad, cubic, quart, quint); 0 starts at full speed
           (linear), -1 starts fastest and glides out (easeOutSine); an
           easing name string is passed through as-is. */
        var einOpt = this.options.pageBendInEasing;
        var ein = 'easeInSine';
        if (typeof einOpt === 'string') ein = einOpt;
        else if (einOpt >= 1) {
            ein = ['easeInSine', 'easeInQuad', 'easeInCubic', 'easeInQuart', 'easeInQuint'][
                Math.min(5, Math.max(1, Math.round(einOpt))) - 1
            ];
        } else if (einOpt != null) {
            var einR = Math.round(einOpt);
            if (einR <= -2) {
                /* Air-drag profile: theta'' = drive - gravity*cos(theta) -
                   c*theta'^2, integrated per flip and normalized to the
                   tween's duration — uphill start against gravity, downhill
                   acceleration past vertical, quadratic drag capping the
                   fall. c scales with 1/hardness: floppy pages present more
                   sail. Registered as a lookup easing; the tween captures
                   the function at creation, so the shared slot is safe. */
                var aDrive = 2;
                var aGrav = 1.2;
                var aDragC = 1.5 / (this.pageHardness || 1);
                var aTh = 0;
                var aV = 0;
                var aDt = 0.002;
                var aT = 0;
                var aTs = [0];
                var aXs = [0];
                var aGuard = 0;
                while (aTh < Math.PI && aGuard++ < 60000) {
                    aV += (aDrive - aGrav * Math.cos(aTh) - aDragC * aV * aV) * aDt;
                    if (aV < 0.0001) aV = 0.0001;
                    aTh += aV * aDt;
                    aT += aDt;
                    aTs.push(aT);
                    aXs.push(Math.min(aTh, Math.PI));
                }
                var aTotal = aT || 1;
                var aN = aTs.length;
                FLIPBOOK.easings.__bendInAir = function (t) {
                    if (t <= 0) return 0;
                    if (t >= 1) return 1;
                    var target = t * aTotal;
                    var lo = 0;
                    var hi = aN - 1;
                    while (lo < hi - 1) {
                        var mid = (lo + hi) >> 1;
                        if (aTs[mid] < target) lo = mid;
                        else hi = mid;
                    }
                    var fr = (target - aTs[lo]) / (aTs[hi] - aTs[lo] || 1);
                    return (aXs[lo] + (aXs[hi] - aXs[lo]) * fr) / Math.PI;
                };
                ein = '__bendInAir';
            } else {
                ein = einR <= -1 ? 'easeOutSine' : 'linear';
            }
        }

        /* pageBendInEndSlow brakes the rotation's finish: the ease-in curve
           lands at full speed, so blend it toward a raised cosine whose end
           slope is zero. The tween captures the composed function at
           creation, so the shared registry slot is safe to overwrite. */
        var endSlow = this.options.pageBendInEndSlow == null ? 0.35 : this.options.pageBendInEndSlow;
        if (endSlow > 0 && FLIPBOOK.easings) {
            var baseEase = FLIPBOOK.easings[ein] || FLIPBOOK.easings.easeInSine;
            var kES = Math.min(1, endSlow);
            FLIPBOOK.easings.__bendInComposed = function (t) {
                return baseEase(t) * (1 - kES) + (0.5 - 0.5 * Math.cos(Math.PI * t)) * kES;
            };
            ein = '__bendInComposed';
        }

        var bendInAnimation = FLIPBOOK.animate({
            from: start,
            to: end,
            duration: time1,
            easing: ein,
            step: (value) => {
                this.renderFlip(value);
            },
            complete: () => {
                this.bendOut();
            },
        });

        this._bendMain = bendInAnimation;
        this.animations.push(bendInAnimation);

        this.options.main.turnPageStart();
    }

    bendOut() {
        var force = this._bendUniforms.uBendForce.value;
        var offset = this._bendUniforms.uBendOffset.value;
        var time = this.options.pageBendOutFactor * this.duration * Math.pow(Math.abs(force), 0.5) * 800;
        time *= this._splitOut == null ? 1 : this._splitOut;

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
        this._bendT1 = a1;
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
        this._bendT2 = a2;
        this.animations.push(a2);

        /* Only now: rotation is done and the sheet is parked at its final
           angle with just the curl unrolling, so it looks landed and a drag
           must be able to take it (_captureFromSettle). Set AFTER the tween
           handles exist — flagged before them, a capture in that window
           stopped nothing and the live tween later fired flipFinished into
           the middle of the drag. */
        this._settling = true;

        this.book._zOrderDirty = true;
    }

    renderFlip(angle) {
        this._setAngle((-angle * 180) / Math.PI);
        if (this.book._panFollowSheet === this) this.book._followFlip(this);
    }

    flipFinished() {
        /* A drag took this sheet out of its settle: the finger owns the angle
           and the bend now, so a tween completion arriving late must not zero
           them. A legitimate completion always has flipping still set. */
        if (this.dragging && !this.flipping) return;
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
        this._bendUniforms.uBendTilt.value = 0;
        this._lastBendForce = 0;
        this._releaseForce = null;
        this._bendMomentum = null;
        this._bendAnchor = null;
        this._velPrevTravel = null;
        this._envFlip = false;
        this._settling = false;
        this._captureForce = null;
        this._captureOffset = null;
        this._bendMain = this._bendT1 = this._bendT2 = null;
        this._grabTilt = null; // next flip draws its own angle unless dragged
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
