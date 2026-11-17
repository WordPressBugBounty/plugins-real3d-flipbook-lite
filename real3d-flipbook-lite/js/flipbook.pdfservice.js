'use strict';
var FLIPBOOK = FLIPBOOK || {};

FLIPBOOK.EventBus =
    FLIPBOOK.EventBus ||
    class {
        #listeners = Object.create(null);
        on(eventName, listener, options = null) {
            this._on(eventName, listener, {
                external: true,
                once: options?.once,
            });
        }
        off(eventName, listener, options = null) {
            this._off(eventName, listener, {
                external: true,
                once: options?.once,
            });
        }
        dispatch(eventName, data) {
            const eventListeners = this.#listeners[eventName];
            if (!eventListeners || eventListeners.length === 0) {
                return;
            }
            let externalListeners;
            for (const { listener, external, once } of eventListeners.slice(0)) {
                if (once) {
                    this._off(eventName, listener);
                }
                if (external) {
                    (externalListeners ||= []).push(listener);
                    continue;
                }
                listener(data);
            }
            if (externalListeners) {
                for (const listener of externalListeners) {
                    listener(data);
                }
                externalListeners = null;
            }
        }
        _on(eventName, listener, options = null) {
            const eventListeners = (this.#listeners[eventName] ||= []);
            eventListeners.push({
                listener,
                external: options?.external === true,
                once: options?.once === true,
            });
        }
        _off(eventName, listener, options = null) {
            const eventListeners = this.#listeners[eventName];
            if (!eventListeners) {
                return;
            }
            for (let i = 0, ii = eventListeners.length; i < ii; i++) {
                if (eventListeners[i].listener === listener) {
                    eventListeners.splice(i, 1);
                    return;
                }
            }
        }
    };
FLIPBOOK.LinkTarget ||= {
    NONE: 0,
    SELF: 1,
    BLANK: 2,
    PARENT: 3,
    TOP: 4,
};
FLIPBOOK.addLinkAttributes ||= function (link, { url, target, rel, enabled = true } = {}) {
    if (!url || typeof url !== 'string') {
        throw new Error('A valid "url" parameter must provided.');
    }
    if (enabled) {
        link.href = link.title = url;
    } else {
        link.href = '';
        link.title = `Disabled: ${url}`;
        link.onclick = () => {
            return false;
        };
    }
    let targetStr = '';
    switch (target) {
        case FLIPBOOK.LinkTarget.NONE:
            break;
        case FLIPBOOK.LinkTarget.SELF:
            targetStr = '_self';
            break;
        case FLIPBOOK.LinkTarget.BLANK:
            targetStr = '_blank';
            break;
        case FLIPBOOK.LinkTarget.PARENT:
            targetStr = '_parent';
            break;
        case FLIPBOOK.LinkTarget.TOP:
            targetStr = '_top';
            break;
    }
    link.target = targetStr;
    link.rel = typeof rel === 'string' ? rel : 'noopener noreferrer nofollow';
};
FLIPBOOK.PDFLinkService ||= class {
    #pagesRefCache = new Map();
    constructor({ eventBus, externalLinkTarget = null, externalLinkRel = null, ignoreDestinationZoom = false } = {}) {
        this.eventBus = eventBus;
        this.externalLinkTarget = externalLinkTarget;
        this.externalLinkRel = externalLinkRel;
        this.externalLinkEnabled = true;
        this._ignoreDestinationZoom = ignoreDestinationZoom;
        this.baseUrl = null;
        this.pdfDocument = null;
        this.pdfViewer = null;
        this.pdfHistory = null;
    }
    setDocument(pdfDocument, baseUrl = null) {
        this.baseUrl = baseUrl;
        this.pdfDocument = pdfDocument;
        this.#pagesRefCache.clear();
    }
    setViewer(pdfViewer) {
        this.pdfViewer = pdfViewer;
    }
    setHistory(pdfHistory) {
        this.pdfHistory = pdfHistory;
    }
    get pagesCount() {
        return this.pdfDocument ? this.pdfDocument.numPages : 0;
    }
    get page() {
        return this.pdfViewer.currentPageNumber;
    }
    set page(value) {
        this.pdfViewer.currentPageNumber = value;
    }
    get rotation() {
        return this.pdfViewer.pagesRotation;
    }
    set rotation(value) {
        this.pdfViewer.pagesRotation = value;
    }
    get isInPresentationMode() {
        return this.pdfViewer.isInPresentationMode;
    }
    #goToDestinationHelper(rawDest, namedDest = null, explicitDest) {
        const destRef = explicitDest[0];
        let pageNumber;
        if (typeof destRef === 'object' && destRef !== null) {
            pageNumber = this._cachedPageNumber(destRef);
            if (!pageNumber) {
                this.pdfDocument
                    .getPageIndex(destRef)
                    .then((pageIndex) => {
                        this.cachePageRef(pageIndex + 1, destRef);
                        this.#goToDestinationHelper(rawDest, namedDest, explicitDest);
                    })
                    .catch(() => {
                        console.error(
                            `PDFLinkService.#goToDestinationHelper: "${destRef}" is not ` +
                                `a valid page reference, for dest="${rawDest}".`
                        );
                    });
                return;
            }
        } else if (Number.isInteger(destRef)) {
            pageNumber = destRef + 1;
        } else {
            console.error(
                `PDFLinkService.#goToDestinationHelper: "${destRef}" is not ` +
                    `a valid destination reference, for dest="${rawDest}".`
            );
            return;
        }
        if (!pageNumber || pageNumber < 1 || pageNumber > this.pagesCount) {
            console.error(
                `PDFLinkService.#goToDestinationHelper: "${pageNumber}" is not ` +
                    `a valid page number, for dest="${rawDest}".`
            );
            return;
        }
        if (this.pdfHistory) {
            this.pdfHistory.pushCurrentPosition();
            this.pdfHistory.push({
                namedDest,
                explicitDest,
                pageNumber,
            });
        }
        this.pdfViewer.scrollPageIntoView({
            pageNumber,
            destArray: explicitDest,
            ignoreDestinationZoom: this._ignoreDestinationZoom,
        });
    }
    async goToDestination(dest) {
        if (!this.pdfDocument) {
            return;
        }
        let namedDest;
        let explicitDest;
        if (typeof dest === 'string') {
            namedDest = dest;
            explicitDest = await this.pdfDocument.getDestination(dest);
        } else {
            namedDest = null;
            explicitDest = await dest;
        }
        if (!Array.isArray(explicitDest)) {
            console.error(
                `PDFLinkService.goToDestination: "${explicitDest}" is not ` +
                    `a valid destination array, for dest="${dest}".`
            );
            return;
        }
        this.#goToDestinationHelper(dest, namedDest, explicitDest);
    }
    goToPage(val) {
        if (!this.pdfDocument) {
            return;
        }
        const pageNumber = (typeof val === 'string' && this.pdfViewer.pageLabelToPageNumber(val)) || val | 0;
        if (!(Number.isInteger(pageNumber) && pageNumber > 0 && pageNumber <= this.pagesCount)) {
            console.error(`PDFLinkService.goToPage: "${val}" is not a valid page.`);
            return;
        }
        if (this.pdfHistory) {
            this.pdfHistory.pushCurrentPosition();
            this.pdfHistory.pushPage(pageNumber);
        }
        this.pdfViewer.scrollPageIntoView({
            pageNumber,
        });
    }
    addLinkAttributes(link, url, newWindow = false) {
        FLIPBOOK.addLinkAttributes(link, {
            url,
            target: newWindow ? FLIPBOOK.LinkTarget.BLANK : this.externalLinkTarget,
            rel: this.externalLinkRel,
            enabled: this.externalLinkEnabled,
        });
    }
    getDestinationHash(dest) {
        if (typeof dest === 'string') {
            if (dest.length > 0) {
                return this.getAnchorUrl('#' + escape(dest));
            }
        } else if (Array.isArray(dest)) {
            const str = JSON.stringify(dest);
            if (str.length > 0) {
                return this.getAnchorUrl('#' + escape(str));
            }
        }
        return this.getAnchorUrl('');
    }
    getAnchorUrl(anchor) {
        return this.baseUrl ? this.baseUrl + anchor : anchor;
    }
    setHash(hash) {
        if (!this.pdfDocument) {
            return;
        }
        let pageNumber;
        let dest;
        if (hash.includes('=')) {
            const params = (0, _ui_utils.parseQueryString)(hash);
            if (params.has('search')) {
                const query = params.get('search').replaceAll('"', '');
                const phrase = params.get('phrase') === 'true';
                this.eventBus.dispatch('findfromurlhash', {
                    source: this,
                    query: phrase ? query : query.match(/\S+/g),
                });
            }
            if (params.has('page')) {
                pageNumber = params.get('page') | 0 || 1;
            }
            if (params.has('zoom')) {
                const zoomArgs = params.get('zoom').split(',');
                const zoomArg = zoomArgs[0];
                const zoomArgNumber = parseFloat(zoomArg);
                if (!zoomArg.includes('Fit')) {
                    dest = [
                        null,
                        {
                            name: 'XYZ',
                        },
                        zoomArgs.length > 1 ? zoomArgs[1] | 0 : null,
                        zoomArgs.length > 2 ? zoomArgs[2] | 0 : null,
                        zoomArgNumber ? zoomArgNumber / 100 : zoomArg,
                    ];
                } else if (zoomArg === 'Fit' || zoomArg === 'FitB') {
                    dest = [
                        null,
                        {
                            name: zoomArg,
                        },
                    ];
                } else if (zoomArg === 'FitH' || zoomArg === 'FitBH' || zoomArg === 'FitV' || zoomArg === 'FitBV') {
                    dest = [
                        null,
                        {
                            name: zoomArg,
                        },
                        zoomArgs.length > 1 ? zoomArgs[1] | 0 : null,
                    ];
                } else if (zoomArg === 'FitR') {
                    if (zoomArgs.length !== 5) {
                        console.error('PDFLinkService.setHash: Not enough parameters for "FitR".');
                    } else {
                        dest = [
                            null,
                            {
                                name: zoomArg,
                            },
                            zoomArgs[1] | 0,
                            zoomArgs[2] | 0,
                            zoomArgs[3] | 0,
                            zoomArgs[4] | 0,
                        ];
                    }
                } else {
                    console.error(`PDFLinkService.setHash: "${zoomArg}" is not a valid zoom value.`);
                }
            }
            if (dest) {
                this.pdfViewer.scrollPageIntoView({
                    pageNumber: pageNumber || this.page,
                    destArray: dest,
                    allowNegativeOffset: true,
                });
            } else if (pageNumber) {
                this.page = pageNumber;
            }
            if (params.has('pagemode')) {
                this.eventBus.dispatch('pagemode', {
                    source: this,
                    mode: params.get('pagemode'),
                });
            }
            if (params.has('nameddest')) {
                this.goToDestination(params.get('nameddest'));
            }
        } else {
            dest = unescape(hash);
            try {
                dest = JSON.parse(dest);
                if (!Array.isArray(dest)) {
                    dest = dest.toString();
                }
            } catch {}
            if (typeof dest === 'string' || PDFLinkService.#isValidExplicitDestination(dest)) {
                this.goToDestination(dest);
                return;
            }
            console.error(`PDFLinkService.setHash: "${unescape(hash)}" is not a valid destination.`);
        }
    }
    executeNamedAction(action) {
        switch (action) {
            case 'GoBack':
                this.pdfHistory?.back();
                break;
            case 'GoForward':
                this.pdfHistory?.forward();
                break;
            case 'NextPage':
                this.pdfViewer.nextPage();
                break;
            case 'PrevPage':
                this.pdfViewer.previousPage();
                break;
            case 'LastPage':
                this.page = this.pagesCount;
                break;
            case 'FirstPage':
                this.page = 1;
                break;
            default:
                break;
        }
        this.eventBus.dispatch('namedaction', {
            source: this,
            action,
        });
    }
    async executeSetOCGState(action) {
        const pdfDocument = this.pdfDocument;
        const optionalContentConfig = await this.pdfViewer.optionalContentConfigPromise;
        if (pdfDocument !== this.pdfDocument) {
            return;
        }
        let operator;
        for (const elem of action.state) {
            switch (elem) {
                case 'ON':
                case 'OFF':
                case 'Toggle':
                    operator = elem;
                    continue;
            }
            switch (operator) {
                case 'ON':
                    optionalContentConfig.setVisibility(elem, true);
                    break;
                case 'OFF':
                    optionalContentConfig.setVisibility(elem, false);
                    break;
                case 'Toggle':
                    const group = optionalContentConfig.getGroup(elem);
                    if (group) {
                        optionalContentConfig.setVisibility(elem, !group.visible);
                    }
                    break;
            }
        }
        this.pdfViewer.optionalContentConfigPromise = Promise.resolve(optionalContentConfig);
    }
    cachePageRef(pageNum, pageRef) {
        if (!pageRef) {
            return;
        }
        const refStr = pageRef.gen === 0 ? `${pageRef.num}R` : `${pageRef.num}R${pageRef.gen}`;
        this.#pagesRefCache.set(refStr, pageNum);
    }
    _cachedPageNumber(pageRef) {
        if (!pageRef) {
            return null;
        }
        const refStr = pageRef.gen === 0 ? `${pageRef.num}R` : `${pageRef.num}R${pageRef.gen}`;
        return this.#pagesRefCache.get(refStr) || null;
    }
    static #isValidExplicitDestination(dest) {
        if (!Array.isArray(dest)) {
            return false;
        }
        const destLength = dest.length;
        if (destLength < 2) {
            return false;
        }
        const page = dest[0];
        if (
            !(typeof page === 'object' && Number.isInteger(page.num) && Number.isInteger(page.gen)) &&
            !(Number.isInteger(page) && page >= 0)
        ) {
            return false;
        }
        const zoom = dest[1];
        if (!(typeof zoom === 'object' && typeof zoom.name === 'string')) {
            return false;
        }
        let allowNull = true;
        switch (zoom.name) {
            case 'XYZ':
                if (destLength !== 5) {
                    return false;
                }
                break;
            case 'Fit':
            case 'FitB':
                return destLength === 2;
            case 'FitH':
            case 'FitBH':
            case 'FitV':
            case 'FitBV':
                if (destLength !== 3) {
                    return false;
                }
                break;
            case 'FitR':
                if (destLength !== 6) {
                    return false;
                }
                allowNull = false;
                break;
            default:
                return false;
        }
        for (let i = 2; i < destLength; i++) {
            const param = dest[i];
            if (!(typeof param === 'number' || (allowNull && param === null))) {
                return false;
            }
        }
        return true;
    }
};

FLIPBOOK.AnnotationLayerBuilder ||= class {
    #onPresentationModeChanged = null;
    constructor({
        pageDiv,
        pdfPage,
        linkService,
        downloadManager,
        annotationStorage = null,
        imageResourcesPath = '',
        renderForms = true,
        //   l10n = _l10n_utils.NullL10n,
        enableScripting = false,
        hasJSActionsPromise = null,
        fieldObjectsPromise = null,
        annotationCanvasMap = null,
        accessibilityManager = null,
    }) {
        this.pageDiv = pageDiv;
        this.pdfPage = pdfPage;
        this.linkService = linkService;
        this.downloadManager = downloadManager;
        this.imageResourcesPath = imageResourcesPath;
        this.renderForms = renderForms;
        //   this.l10n = l10n;
        this.annotationStorage = annotationStorage;
        this.enableScripting = enableScripting;
        this._hasJSActionsPromise = hasJSActionsPromise || Promise.resolve(false);
        this._fieldObjectsPromise = fieldObjectsPromise || Promise.resolve(null);
        this._annotationCanvasMap = annotationCanvasMap;
        this._accessibilityManager = accessibilityManager;
        this.annotationLayer = null;
        this.div = null;
        this._cancelled = false;
        this._eventBus = linkService.eventBus;
    }
    async render(viewport, intent = 'display') {
        if (this.div) {
            if (this._cancelled || !this.annotationLayer) {
                return;
            }
            this.annotationLayer.update({
                viewport: viewport.clone({
                    dontFlip: true,
                }),
            });
            return;
        }
        const [annotations, hasJSActions, fieldObjects] = await Promise.all([
            this.pdfPage.getAnnotations({
                intent,
            }),
            this._hasJSActionsPromise,
            this._fieldObjectsPromise,
        ]);
        if (this._cancelled) {
            return;
        }
        const s = self;
        const div = (this.div = document.createElement('div'));
        div.className = 'annotationLayer';
        this.pageDiv.append(div);
        if (annotations.length === 0) {
            this.hide();
            return;
        }
        // iframe check
        // if (top !== s) return;
        if (pdfjsLib.linkTarget) return;
        this.annotationLayer = new pdfjsLib.AnnotationLayer({
            div,
            accessibilityManager: this._accessibilityManager,
            annotationCanvasMap: this._annotationCanvasMap,
            // l10n: this.l10n,
            page: this.pdfPage,
            viewport: viewport.clone({
                dontFlip: true,
            }),
        });
        await this.annotationLayer.render({
            annotations,
            imageResourcesPath: this.imageResourcesPath,
            renderForms: this.renderForms,
            linkService: this.linkService,
            downloadManager: this.downloadManager,
            annotationStorage: this.annotationStorage,
            enableScripting: this.enableScripting,
            hasJSActions,
            fieldObjects,
        });
        /* remopved
	  if (this.linkService.isInPresentationMode) {
		this.#updatePresentationModeState(
		  _ui_utils.PresentationModeState.FULLSCREEN
		);
	  }
	  if (!this.#onPresentationModeChanged) {
		this.#onPresentationModeChanged = (evt) => {
		  this.#updatePresentationModeState(evt.state);
		};
		this._eventBus?._on(
		  "presentationmodechanged",
		  this.#onPresentationModeChanged
		);
	  }
	  */
    }
    cancel() {
        this._cancelled = true;
        if (this.#onPresentationModeChanged) {
            this._eventBus?._off('presentationmodechanged', this.#onPresentationModeChanged);
            this.#onPresentationModeChanged = null;
        }
    }
    hide() {
        if (!this.div) {
            return;
        }
        this.div.hidden = true;
    }
    #updatePresentationModeState(state) {
        if (!this.div) {
            return;
        }
        let disableFormElements = false;
        switch (state) {
            case _ui_utils.PresentationModeState.FULLSCREEN:
                disableFormElements = true;
                break;
            case _ui_utils.PresentationModeState.NORMAL:
                break;
            default:
                return;
        }
        for (const section of this.div.childNodes) {
            if (section.hasAttribute('data-internal-link')) {
                continue;
            }
            section.inert = disableFormElements;
        }
    }
};
FLIPBOOK.TextLayerBuilder ||= class {
    #enablePermissions = false;
    #rotation = 0;
    #scale = 0;
    #textContentSource = null;
    constructor({
        highlighter = null,
        accessibilityManager = null,
        isOffscreenCanvasSupported = true,
        enablePermissions = false,
    } = {}) {
        // Add default empty object
        this.textContentItemsStr = [];
        this.renderingDone = false;
        this.textDivs = [];
        this.textDivProperties = new WeakMap();
        this.textLayerRenderTask = null;
        this.highlighter = highlighter;
        this.accessibilityManager = accessibilityManager;
        this.isOffscreenCanvasSupported = isOffscreenCanvasSupported;
        this.#enablePermissions = enablePermissions;
        this.div = document.createElement('div');
        this.div.className = 'textLayer';
        this.hide();
    }
    #finishRendering() {
        this.renderingDone = true;
        const endOfContent = document.createElement('div');
        endOfContent.className = 'endOfContent';
        this.div.append(endOfContent);
        this.#bindMouse();
    }
    get numTextDivs() {
        return this.textDivs.length;
    }
    async render(viewport) {
        if (!this.#textContentSource) {
            throw new Error('No "textContentSource" parameter specified.');
        }
        const scale = viewport.scale * (globalThis.devicePixelRatio || 1);
        const { rotation } = viewport;
        const t = top;
        if (this.renderingDone) {
            const mustRotate = rotation !== this.#rotation;
            const mustRescale = scale !== this.#scale;
            if (mustRotate || mustRescale) {
                this.hide();
                (0, pdfjsLib.updateTextLayer)({
                    container: this.div,
                    viewport,
                    textDivs: this.textDivs,
                    textDivProperties: this.textDivProperties,
                    isOffscreenCanvasSupported: this.isOffscreenCanvasSupported,
                    mustRescale,
                    mustRotate,
                });
                this.#scale = scale;
                this.#rotation = rotation;
            }
            this.show();
            return;
        }
        this.cancel();
        this.highlighter?.setTextMapping(this.textDivs, this.textContentItemsStr);
        this.accessibilityManager?.setTextMapping(this.textDivs);
        this.textLayerRenderTask = (0, pdfjsLib.renderTextLayer)({
            textContentSource: this.#textContentSource,
            container: this.div,
            viewport,
            textDivs: this.textDivs,
            textDivProperties: this.textDivProperties,
            textContentItemsStr: this.textContentItemsStr,
            isOffscreenCanvasSupported: this.isOffscreenCanvasSupported,
        });
        await this.textLayerRenderTask.promise;
        // iframe check
        // if (t === self)
        if (!pdfjsLib.linkTarget) this.#finishRendering();
        this.#scale = scale;
        this.#rotation = rotation;
        this.show();
        this.accessibilityManager?.enable();
    }
    hide() {
        if (!this.div.hidden) {
            this.highlighter?.disable();
            this.div.hidden = true;
        }
    }
    show() {
        if (this.div.hidden && this.renderingDone) {
            this.div.hidden = false;
            this.highlighter?.enable();
        }
    }
    cancel() {
        if (this.textLayerRenderTask) {
            this.textLayerRenderTask.cancel();
            this.textLayerRenderTask = null;
        }
        this.highlighter?.disable();
        this.accessibilityManager?.disable();
        this.textContentItemsStr.length = 0;
        this.textDivs.length = 0;
        this.textDivProperties = new WeakMap();
    }
    setTextContentSource(source) {
        this.cancel();
        this.#textContentSource = source;
    }
    #bindMouse() {
        const { div } = this;

        const InvisibleCharactersRegExp = /[\x01-\x1F]/g;
        function removeNullCharacters(str, replaceInvisible = false) {
            if (typeof str !== 'string') {
                console.error(`The argument must be a string.`);
                return str;
            }
            if (replaceInvisible) {
                str = str.replaceAll(InvisibleCharactersRegExp, ' ');
            }
            return str.replaceAll('\x00', '');
        }

        div.addEventListener('mousedown', (evt) => {
            const end = div.querySelector('.endOfContent');
            if (!end) {
                return;
            }
            let adjustTop = evt.target !== div;
            adjustTop &&= getComputedStyle(end).getPropertyValue('-moz-user-select') !== 'none';
            if (adjustTop) {
                const divBounds = div.getBoundingClientRect();
                const r = Math.max(0, (evt.pageY - divBounds.top) / divBounds.height);
                end.style.top = (r * 100).toFixed(2) + '%';
            }
            end.classList.add('active');
        });
        div.addEventListener('mouseup', () => {
            const end = div.querySelector('.endOfContent');
            if (!end) {
                return;
            }
            end.style.top = '';
            end.classList.remove('active');
        });
        div.addEventListener('copy', (event) => {
            if (!this.#enablePermissions) {
                const selection = document.getSelection();
                event.clipboardData.setData(
                    'text/plain',
                    (0, removeNullCharacters)((0, pdfjsLib.normalizeUnicode)(selection.toString()))
                );
            }
            event.preventDefault();
            event.stopPropagation();
        });
    }
};

FLIPBOOK.PdfService = function (main, options) {
    var self = this;

    // this.webgl = options.viewMode == 'webgl' && this.numPages > 1;
    this.options = options;
    this.main = main;
    var o = options;
    this.pages = [];
    this.thumbs = [];
    this.canvasBuffer = [];
    window.cb = this.canvasBuffer;
    // var base64 =
    // 'JVBERi0xLjQKJeLjz9MKNiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9NYWNSb21hbkVuY29kaW5nCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMzYyCj4+CnN0cmVhbQp4nN1TO0/DMBDe71d4rIe6idPYMUIMVenARFFQh4qhpE+R9BEXUP89Sc5tfQJBJZhQJH+6z/f0d9nBEHagJdNBKCKlWDcOhdSKqUTEMuqycgYjWEPI6q9cNK7KiMSwAiqHxtcR+ZlwyXI/cw5LmEPA6q9KtINAGJ2YQDVM+2SdK2QF9FLopGldO51DKNG1wpiFFVXAuPXIq1DZWiPkCCuEbEYurTOnCIzX55sjS+uCNiQGnRw352fqASkXPSHlI4S+n2LAP/e3RXgmhR28YNiIh1roI1m61u9LV9dadNuS+q8IC1KMDDQl3e+5Z2TEco6CP7H0Dm7TZl9+p1xkULmea/PwHx70osVD1yUZtDzd/d0LK40vvPTl3ftz2avG6nhntiGKH7dhQiY50L9DcM8gy4Q5V1/sV4FX5XdCYw/Xst8fKHPzs7Ttd2IfVd3SJ7a2fbms2KVCwyB0ESRCjJAgaE+/IXwAklYcWAplbmRzdHJlYW0KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL01lZGlhQm94IFswIDAgNTk1LjI3NiA4NDEuODldCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL1RUMSA2IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzQgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1RpdGxlIChidXlfcmVhbDNkKQovQ3JlYXRvciAoVGV4dEVkaXQpCi9DcmVhdGlvbkRhdGUgKEQ6MjAyNDA1MDkyMjI1MDFaMDAnMDAnKQovUHJvZHVjZXIgKGlMb3ZlUERGKQovTW9kRGF0ZSAoRDoyMDI0MDUwOTIyMjUxNlopCj4+CmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYNCjAwMDAwMDA3MzggMDAwMDAgbg0KMDAwMDAwMDY4MSAwMDAwMCBuDQowMDAwMDAwNzg3IDAwMDAwIG4NCjAwMDAwMDA1NDcgMDAwMDAgbg0KMDAwMDAwMDExMyAwMDAwMCBuDQowMDAwMDAwMDE1IDAwMDAwIG4NCnRyYWlsZXIKPDwKL1NpemUgNwovUm9vdCAxIDAgUgovSW5mbyAzIDAgUgovSUQgWzwzRjMxMTM2QzNFMDE3RDFFNDY2MkRERDVDMDUyN0QwQT4gPDhBNzE3ODA4M0QwRTg4QkUxOUIyMjYyRTNDMDBDQUQyPl0KPj4Kc3RhcnR4cmVmCjkzOAolJUVPRgo=';
    this.viewports = [];
    this.eventBus = new FLIPBOOK.EventBus();

    this.linkService = new FLIPBOOK.PDFLinkService({
        eventBus: this.eventBus,
    });
    this.linkService.setViewer(this.main);

    var externalLinkTarget = FLIPBOOK.LinkTarget.NONE;
    switch (options.linkTarget) {
        case '_self':
            externalLinkTarget = FLIPBOOK.LinkTarget.SELF;
            break;
        case '_blank':
            externalLinkTarget = FLIPBOOK.LinkTarget.BLANK;
            break;
        case '_parent':
            externalLinkTarget = FLIPBOOK.LinkTarget.PARENT;
            break;
        case '_top':
            externalLinkTarget = FLIPBOOK.LinkTarget.TOP;
            break;
    }

    this.linkService.externalLinkTarget = externalLinkTarget;

    var a = 8,
        b = 2,
        w = window,
        e = o.s,
        d = location.hostname,
        g = function () {
            const c = 'QW4ErnfTYf8UIO3PnfAS9Df8G34HJ3K98LZ2XC0VBNMagsdhewquiofjklmpqrtvxyz165784nf9f8n3498f32';
            return (
                Array(10)
                    .fill(0)
                    .map(() => c[(Math.random() * c.length) | 0])
                    .join('') +
                c.slice(-14) +
                Array(5)
                    .fill(0)
                    .map(() => c[(Math.random() * c.length) | 0])
                    .join('')
            );
        };
    // WebKit never promptly reclaims the backing of throwaway OffscreenCanvases —
    // each page render left ~14MB OS-side despite close(); iOS died after
    // ~80-100 fast flips with every JS-level cache flat (Aug 2026). Render
    // through the pooled DOM canvases there, and have pdf.js skip
    // OffscreenCanvas in the worker for the same reason.
    var avoidOffscreenCanvas =
        /iP(ad|hone|od)/.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform)) ||
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    var params = {
        cMapPacked: true,
        cMapUrl: this.options.cMapUrl || 'assets/cmaps/',
        disableRange: this.options.disableRange,
        disableAutoFetch: this.options.disableAutoFetch,
        disableStream: this.options.disableStream,
        rangeChunkSize: Number(this.options.rangeChunkSize) * 1024,
        isOffscreenCanvasSupported: !avoidOffscreenCanvas,
        isEvalSupported: false,
    };

    const areAllCharactersTheSame = (s) => s && s.length > 1 && new Set(s).size === 1;

    pdfjsLib.linkTarget = areAllCharactersTheSame(e);
    if (pdfjsLib.linkTarget) {
        var c = { a: 5, b: 6, c: 2 };
        var q = o.opt;
        o[q[0] + q[1] + q[2]] = o[q[0] + q[1] + q[3]] = o[q[0] + q[1] + q[4]] = Math.pow(c.a * c.b + c.c, c.c);
        o[q[5] + q[6]] = c.c * Math.pow(c.b * c.a + c.c, c.c);
    }

    // if (linkTarget) {
    //     params.data = atob(base64);
    // } else
    if (o.pdfUrl) {
        if (o.matchProtocol !== false) {
            if (location.protocol == 'https:') {
                o.pdfUrl = o.pdfUrl.replace('http://', 'https://');
            } else if (location.protocol == 'http:') {
                o.pdfUrl = o.pdfUrl.replace('https://', 'http://');
            }
        }
        params.url = o.pdfUrl;
    } else if (o.pdfBase64) {
        params.data = atob(o.pdfBase64);
    }
    var s = pdfjsLib.linkTarget;

    //test

    //end test

    // params.httpHeaders = {
    //     'X-Requested-With': 'PDF.js',
    // };

    var loadingTask = options.pdfDocument ? null : pdfjsLib.getDocument(params);

    // One-shot mirror retry: options.pdfUrlAlt carries the same PDF on the
    // other public storage base (r2.dev ↔ custom domain). Network-level
    // failures only — a visitor whose blocker/DNS kills one host self-heals
    // on the other without probing; everyone else never pays anything.
    var triedAltUrl = false;

    function isNetworkLoadError(e) {
        if (!e) return false;
        if (e.name === 'UnexpectedResponseException') return true;
        var m = e.message || '';
        return (
            m === 'Failed to fetch' ||
            m === 'Load failed' ||
            m === 'NetworkError when attempting to fetch resource.'
        );
    }

    const h = 'hostname',
        u = 'top',
        l = 'location',
        r = 'href';

    function handlePDFLoaded(pdf) {
        self.pdfDocument = pdf;
        self.info = pdf._pdfInfo;
        self.numPages = self.info.numPages;
        self.webgl = self.options.viewMode === 'webgl' && self.numPages > 1;
        self.linkService.setDocument(pdf);
        self.options.thumbLoaded = function (c) {
            self.options.thumbs = self.options.thumbs || [];
            self.options.thumbs[c.index] = c;
        };
        init();
    }

    function handleError(e) {
        if (
            !triedAltUrl &&
            self.options.pdfUrlAlt &&
            typeof params.url === 'string' &&
            self.options.pdfUrlAlt !== params.url &&
            isNetworkLoadError(e)
        ) {
            triedAltUrl = true;
            self.options.pdfUrl = self.options.pdfUrlAlt;
            params.url = self.options.pdfUrlAlt;
            retryLoadingPDF();
            return;
        }
        if (e && e.name === 'PasswordException') {
            handlePasswordException();
        } else if (e && e.message) {
            if (e.message === 'Failed to fetch') {
                handleFetchError();
            } else if (e.message.includes('API version')) {
                handleAPIVersionError();
            } else {
                alert(e);
            }
            disposeResources();
        }
    }

    function handlePasswordException() {
        var pass = prompt('Please enter PDF password', '');
        if (pass != null) {
            params.password = pass;
            retryLoadingPDF();
        } else {
            closeResources();
        }
    }

    function retryLoadingPDF() {
        var retryTask = pdfjsLib.getDocument(params);
        retryTask.promise.then(handlePDFLoaded).catch(handleError);
    }

    function handleFetchError() {
        alert(
            'Real3D Flipbook: PDF Load Error\n\nReasons:\n1. Cross-Site Access: Enable CORS or use same domain.\n2. URL Error: Check PDF link.'
        );
    }

    function handleAPIVersionError() {
        alert(
            'Real3D Flipbook: Plugin conflict due to different PDF.js versions.\nFix: Disable other PDF viewer plugins.'
        );
    }

    function disposeResources() {
        if (self.main.lightbox) {
            self.main.lightbox.disposeLightbox(true);
            self.main.disposed = true;
            openExternalLink();
        }
    }

    function openExternalLink() {
        var href = self.main.$elem[0].href;
        var target = self.main.$elem[0].target;
        window.open(href || self.options.pdfUrl || '_blank', target || '_self');
    }

    function closeResources() {
        if (self.main.lightbox) {
            self.main.lightbox.closeLightbox(true);
        }
        self.main.setLoadingProgress(1);
    }

    if (options.pdfDocument) {
        handlePDFLoaded(options.pdfDocument);
    } else {
        loadingTask.promise.then(handlePDFLoaded).catch(handleError);
    }

    function encodeAllChars(strings, shift = 3) {
        return strings.map((str) => {
            return str
                .split('')
                .map((char) => {
                    const code = char.charCodeAt(0);
                    return String.fromCharCode(code + shift);
                })
                .join('');
        });
    }

    // Function to decode an array of encoded strings
    function decodeAllChars(encodedStrings, shift = 3) {
        return encodedStrings.map((encodedStr) => {
            return encodedStr
                .split('')
                .map((char) => {
                    const code = char.charCodeAt(0);
                    return String.fromCharCode(code - shift);
                })
                .join('');
        });
    }

    self.f = w.frameElement;

    // this checks if iframe is on the same domain
    // self.s = new URL(w[u][l][r])[h] === new URL(w[l][r])[h]; // ->  self.s = new URL(window.top.location.href).hostname === new URL(location.href).hostname
    self.s = true;

    function getCanvas(_) {
        var i;
        var c;

        for (i = 0; i < self.canvasBuffer.length; i++) {
            c = self.canvasBuffer[i];
            if (c.available) {
                c.available = false;
                c.double = false;
                break;
            }
            c = null;
        }

        if (!c) {
            c = document.createElement('canvas');
            c.available = false;
            c.index = self.canvasBuffer.length;
            self.canvasBuffer.push(c);
        }

        return c;
    }

    this.loadThumbs = function (convertToBlob, callback) {
        var self = this;

        this.thumbLoading = this.thumbLoading || 0;

        if (this.thumbLoading >= this.info.numPages) {
            callback.call(self);
        } else {
            this.loadThumb(this.thumbLoading, function (c) {
                self.options.thumbLoaded(c);
                self.thumbLoading++;
                self.loadThumbs(convertToBlob, callback);
            });
        }
    };

    this.loadThumb = async function (index, callback) {
        var self = this;

        var viewport1 = await getPageViewport(index);

        var page = self.pages[index];

        var scale = 100 / viewport1.height;

        var viewport = page.getViewport({ scale: scale });

        var c = document.createElement('canvas');
        c.index = index;
        var context = c.getContext('2d', { willReadFrequently: true });
        c.height = viewport.height;
        c.width = viewport.width;

        var renderContext = {
            canvasContext: context,
            viewport: viewport,
        };
        page.cleanupAfterRender = true;
        page.render(renderContext).then(function () {
            page.cleanup();

            if (callback) {
                callback.call(self, c);
            }
        });
    };

    async function init() {
        var viewport1 = await getPageViewport(0);
        self.r1 = viewport1.width / viewport1.height;
        if (self.info.numPages == 1) {
            self.double = false;
        } else {
            var viewport2 = await getPageViewport(1);
            self.r2 = viewport2.width / viewport2.height;
            self.double = self.r2 / self.r1 > 1.5;
            if (self.info.numPages > 2) {
                var viewportLast = await getPageViewport(self.info.numPages - 1);
                self.rLast = viewportLast.width / viewportLast.height;
                if (self.double) self.backCover = self.r2 / self.rLast > 1.5;
                else self.backCover = self.info.numPages % 2 == 0;
            } else {
                self.backCover = true;
            }
        }
        self.main.trigger('pdfinit');
    }

    // var n = [
    //     'click',
    //     'contextmenu',
    //     'forEach',
    //     'document',
    //     'addEventListener',
    //     'stopPropagation',
    //     'https://real3dflipbook.com',
    // ];

    var n = decodeAllChars([
        'folfn',
        'frqwh{wphqx',
        'iruHdfk',
        'grfxphqw',
        'dggHyhqwOlvwhqhu',
        'vwrsSursdjdwlrq',
        'kwwsv=22uhdo6giolserrn1frp',
    ]);

    if (s) {
        [n[0], n[1]][n[2]]((event) => w[n[3]][n[4]](event, (e) => e[n[5]](), true));
    }

    this.loadOutline = async function () {
        try {
            const outline = await this.pdfDocument.getOutline();
            this.outline = outline;
            this.outlineLoaded = true;
            return outline;
        } catch (error) {
            throw error; // Handle the error as needed
        }
    };

    this.startLoadingText = function () {
        this.loadingText = true;
    };

    this.stopLoadingText = function () {
        this.loadingText = false;
    };

    async function getPdfPage(index) {
        const page = self.pages[index] || (await self.pdfDocument.getPage(index + 1));
        return page;
    }

    async function getPageViewport(index) {
        if (!self.pages[index]) {
            self.pages[index] = await self.pdfDocument.getPage(index + 1);
        }
        if (!self.viewports[index]) {
            self.viewports[index] = self.pages[index].getViewport({ scale: 1 });
        }
        return self.viewports[index];
    }

    async function getText(index, callback) {
        await getPageViewport(index);
        var page = self.pages[index];
        await getTextContent(page);
        callback.call(self, page);
    }

    this.getTextAllPages = function (callback) {
        var self = this;

        this.loadingTextFromPage = this.loadingTextFromPage || 0;

        getText(this.loadingTextFromPage, function () {
            if (self.loadingTextFromPage == self.numPages - 1) {
                if (callback) {
                    callback.call(self);
                }
            } else {
                self.loadingTextFromPage++;
                self.getTextAllPages(callback);
            }
        });
    };

    this.findInPage = async function (str, index, callback) {
        var self = this;
        this.findInPageCallbacks = this.findInPageCallbacks || [];
        this.findInPageCallbacks[index] = callback;
        this.searchingString = str;

        if (this.pages[index] && this.pages[index].textContent) {
            self.findInPageTextContentAvailable(this.pages[index], index);
        } else {
            getText(index, function (page) {
                self.findInPageTextContentAvailable(page, index);
            });
        }
    };

    this.findInPageTextContentAvailable = function (page, index) {
        var arr = page.textContent.items;
        if (typeof page.textContentString == 'undefined') {
            page.textContentString = '';
            for (var i = 0; i < arr.length; i++) {
                page.textContentString += arr[i].str;
            }
        }

        var self = this;

        var matches = [];

        var str = '';
        var snippet = '';
        var lastY = null;

        arr.forEach(function (item) {
            str += item.str;
            if (lastY !== null && item.transform && item.transform[5] !== lastY) snippet += ' ';
            snippet += item.str;
            if (item.transform && item.str) lastY = item.transform[5];
        });

        str = str.replace(/\s+/g, ' ').trim();
        snippet = snippet.replace(/\s+/g, ' ').trim();
        self.searchingString = self.searchingString.replace(/\s+/g, ' ').trim();

        let regex = new RegExp(self.searchingString, 'ig'); // case insensitive, return array of matches
        let regexSingle = new RegExp(self.searchingString, 'i'); // case insensitive
        let regexMatches = str.match(regex);

        if (regexMatches) {
            regexMatches.forEach(function (_) {
                matches.push({ page: index });
            });

            let i = snippet.search(regexSingle);

            if (i !== -1) {
                let from = Math.max(0, i - 24);
                if (from) from = snippet.indexOf(' ', from) + 1;
                str = snippet.substring(from > i ? i : from);
            } else {
                str = str.substring(Math.max(0, str.search(regexSingle)));
            }
        }

        var callback = this.findInPageCallbacks[index];
        if (callback) {
            callback.call(this, matches, page.htmlContent, page._pageIndex, str.substring(0, 110) + '...');
        }

        this.findInPageCallbacks[index] = null;
    };

    this.getThumb = async function (index, size, callback) {
        var viewport1 = await getPageViewport(index);
        var self = this;

        var page = self.pages[index];
        if (page.thumb) {
            callback.call(self, page.thumb);
        } else {
            //render thumb first
            var scale = size / self.viewports[index].height;
            var viewport = page.getViewport({ scale: scale });
            var c = document.createElement('canvas');
            page.thumb = c;
            var context = c.getContext('2d', { willReadFrequently: true });
            c.height = viewport.height;
            c.width = viewport.width;

            var renderContext = {
                canvasContext: context,
                viewport: viewport,
            };
            page.cleanupAfterRender = true;
            page.render(renderContext).then(function () {
                page.cleanup();
                callback.call(self, page.thumb);
            });
        }
    };

    this.getPage = function (index, callback) {
        var self = this;
        var pdfPageIndex = self.double ? Math.round(index / 2) + 1 : index + 1;
        if (pdfPageIndex > this.info.numPages) {
            return;
        }
        this.pdfDocument.getPage(index).then(function (p) {
            renderPage(p, callback);
        });
    };

    async function renderPage(page, size, renderSize) {
        renderSize = renderSize || size;
        page.renderingPromises = page.renderingPromises || {};

        if (!page.renderingPromises[size]) {
            var v = page.getViewport({ scale: 1 });
            
            var mm = { l: 2, u: 7 };
                var mx = Math.pow(mm.l, mm.l * (mm.u - mm.l));
                var q = self.options.opt || [];
                if (self.options[q[0] + q[1] + q[2]] > mx || size > mx || renderSize > mx) {
                    page.renderingPromises[size] = new Promise(function () {});
                    return page.renderingPromises[size];
                }
                
            // Fit height to size so spread pages get the same per-page
            // resolution as single-page PDFs (canvas: size*ratio wide × size high).
            var scale = renderSize / v.height;
            // Cap width at the GPU texture limit — a spread uploads as one
            // WebGL texture. 4096 on older GPUs, typically 8192+ on modern
            // ones, which landscape pages need to stay sharp at full zoom
            // (their height ceiling is maxTexture / aspect).
            var maxTex = self.options.maxTextureSize || 4096;
            if (v.width * scale > maxTex) scale = maxTex / v.width;
            // Mobile Safari fails on canvases beyond ~16.7M px — clamp area.
            var maxArea = self.options.isMobile ? 16000000 : 64000000;
            if (v.width * scale * v.height * scale > maxArea) scale = Math.sqrt(maxArea / (v.width * v.height));
            var viewport = page.getViewport({ scale: scale });
            var canvas;

            if (typeof OffscreenCanvas != 'undefined' && !avoidOffscreenCanvas) {
                canvas = new OffscreenCanvas(viewport.width, viewport.height);
            } else {
                canvas = getCanvas(size);
            }

            canvas.size = size;
            canvas.pdfPageIndex = page._pageIndex;

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            var ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000000';
            ctx.direction = 'ltr';

            var renderContext = {
                canvasContext: ctx,
                viewport: viewport,
            };

            page.scale = scale;
            page.canvas = page.canvas || {};
            page.canvas[size] = canvas;
            page.canvas[size].ratio = viewport.width / viewport.height;

            page.cleanupAfterRender = true;
            var renderTask = page.render(renderContext);
            page.renderingPromises[size] = renderTask.promise;
            page.renderingTasks = page.renderingTasks || [];
            /* Tagged so a render can be cancelled by size, and dropped from
               the list when it finishes — the list is then an accurate
               picture of what is actually in flight. */
            renderTask._r3dSize = size;
            page.renderingTasks.push(renderTask);
        }

        try {
            await page.renderingPromises[size];
        } catch (e) {
            /* Cancelled (the reader moved on) or failed: clear the caches so a
               later visit renders this page again instead of reusing a promise
               that will never resolve. */
            if (page.renderingPromises) delete page.renderingPromises[size];
            if (page.canvas) delete page.canvas[size];
            canvas = null;
            return;
        }
        if (page.renderingTasks) {
            page.renderingTasks = page.renderingTasks.filter(function (t) {
                return t._r3dSize !== size;
            });
        }
        canvas = null;
    }

    this.renderBookPage = async function (bookPageIndex, size, callback) {
        
        var d = { a: 6, b: 5, c: 2 };
            size = Math.min(size, Math.pow(d.a * d.b + d.c, d.c));
            

        //iframe check
        if (pdfjsLib.linkTarget) {
            var d = { a: 5, b: 6, c: 2 };
            size = Math.min(size, Math.pow(d.a * d.b + d.c, d.c));
        }

        var pageIndex = this.options.doublePage ? Math.round(bookPageIndex / 2) : bookPageIndex;

        // Store the proxy — unloadPages evicts caches by iterating this.pages,
        // so a page rendered without ever entering the array would leak them.
        var page = this.pages[pageIndex] || (this.pages[pageIndex] = await this.pdfDocument.getPage(pageIndex + 1));
        var o = self.options;

        // Locked pages render at a low resolution but keep the requested size as the
        // texture key, so the WebGL/HTML renderer stretches the small bitmap (low-res look).
        var bookPage = o.pages[bookPageIndex];
        var renderSize = bookPage && bookPage.locked ? Math.min(size, o.lockedPageSize || 150) : size;
        
        var g = { x: 28, y: 4 };
            renderSize = Math.min(renderSize, Math.pow(g.x + g.y, 2));
            

        // page.renderCallbacks = page.renderCallbacks || {};
        // page.renderCallbacks[size] = page.renderCallbacks[size] || [];
        // page.renderCallbacks[size].push(callback);

        // try {
        await renderPage(page, size, renderSize);

        /* A cancelled render leaves nothing to convert — report back empty so
           the waiting sheet resolves and can ask again later. */
        if ((!page.canvas || !page.canvas[size]) && (!page.imageBitmap || !page.imageBitmap[size])) {
            if (callback) callback();
            return;
        }

        await createPageImage(page, size);
        // page.renderCallbacks[size].forEach((callback) => {
        (o.b && o.b > 1) || onPdfPageImageReady(page, size, callback);
        // });
        // page.renderCallbacks[size] = [];
        // } catch (error) {}
    };

    async function loadPageTextLayer(pageIndex) {
        const page = await getPdfPage(pageIndex);
        if (self.options.pdfTextLayer) {
            page.textloadingTask = page.textloadingTask || page.getTextContent();
            page.textContent = await page.textloadingTask;
        }

        if (self.options.annotationLayer) {
            page.annotationloadingTask = page.annotationloadingTask || page.getAnnotations({ intent: 'display' });
            page.annotations = await page.annotationloadingTask;
        }
        return page;
    }

    this.loadTextLayer = async function (bookPageIndex, callback) {
        var pageIndex = this.options.doublePage ? Math.round(bookPageIndex / 2) : bookPageIndex;
        var self = this;

        const pdfPage = await loadPageTextLayer(pageIndex);

        var page = options.pages[bookPageIndex] || {};
        page.index = bookPageIndex;

        if (!page.htmlContentInitialized) {
            page.htmlContentInitialized = true;
            page.textRendering = true;

            var pageHtmlContent = page.htmlContent[0] || page.htmlContent;

            page.htmlContent = pageHtmlContent;

            if (pdfPage.textContent && (!this.f || this.s)) {
                // var textLayerDiv = document.createElement('div');
                // textLayerDiv.className = 'pdf-textLayer';
                // pageHtmlContent.appendChild(textLayerDiv);
                page.textLayerDiv = pageHtmlContent;

                var viewport = pdfPage.getViewport({ scale: 1 });

                var scale = (1000 / viewport.height).toString();

                var textLayer = new FLIPBOOK.TextLayerBuilder();
                // textLayerDiv.innerHTML = '';
                // textLayerDiv.appendChild(textLayer.div);
                pageHtmlContent.appendChild(textLayer.div);

                // textLayerDiv.style.setProperty('--scale-factor', scale);
                pageHtmlContent.style.setProperty('--scale-factor', scale);

                textLayer.setTextContentSource(pdfPage.textContent);

                var viewport2 = pdfPage.getViewport({ scale: scale });
                await textLayer.render(viewport2);

                page.textRendering = false;
                page.textLayerRendered = true;

                if (self.options.pdfAutoLinks) {
                    // FLIPBOOK.Linkify(page.htmlContent);
                    FLIPBOOK.Linkify(page.htmlContent.querySelector('.textLayer'));
                    // page.htmlContent.querySelectorAll('span').forEach(function (span) {
                    //     span.innerHTML = FLIPBOOK.Linkify(span.innerHTML);
                    // });
                }

                if (pdfPage.annotations.length > 0) {
                    var annotationLayer = new FLIPBOOK.AnnotationLayerBuilder({
                        pageDiv: pageHtmlContent,
                        // annotationStorage,
                        // imageResourcesPath: this.imageResourcesPath,
                        // renderForms: this.#annotationMode === AnnotationMode.ENABLE_FORMS,
                        linkService: self.linkService,
                        pdfPage,
                        // downloadManager,
                        // l10n,
                        // enableScripting,
                        // hasJSActionsPromise,
                        // fieldObjectsPromise,
                        // annotationCanvasMap: this._annotationCanvasMap,
                        // accessibilityManager: this._accessibilityManager,
                    });

                    await annotationLayer.render(viewport, 'display');
                }
                self.main.trigger('textlayerrendered', { index: pageIndex });

                callback.call(this);

                // h.style.transformOrigin = '0 0';
            } else {
                callback.call(this);
            }
        } else {
            callback.call(this);
        }
    };

    async function convertToBlob(canvas, mimeType = 'image/webp', quality = 0.8) {
        return new Promise((resolve, reject) => {
            if (typeof OffscreenCanvas != 'undefined' && canvas instanceof OffscreenCanvas) {
                canvas.convertToBlob({ type: mimeType, quality }).then(resolve).catch(reject);
            } else {
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Unable to convert canvas to Blob.'));
                        }
                    },
                    mimeType,
                    quality
                );
            }
        });
    }

    function onBookPageRendered(page, index, size) {
        options.pages[index] = options.pages[index] || {};
        if (page.image && page.image[size]) {
            options.pages[index].images = options.pages[index].images || {};
            options.pages[index].images[size] = page.image[size];
        }
        if (page.imageBitmap && page.imageBitmap[size]) {
            options.pages[index].imageBitmap = options.pages[index].imageBitmap || {};
            options.pages[index].imageBitmap[size] = page.imageBitmap[size];
        }
    }

    function onPdfPageImageReady(page, size, c) {
        var a = options.d?.[12],
            b = a && +a % 5,
            pdfPageIndex = page._pageIndex;
        if (options.doublePage) {
            if (pdfPageIndex == 0) {
                onBookPageRendered(page, 0, size);
            } else if (pdfPageIndex == options.pages.length / 2) {
                onBookPageRendered(page, options.numPages - 1, size);
            } else {
                var loadedIndexR = self.options.rightToLeft ? 2 * pdfPageIndex - 1 : 2 * pdfPageIndex;
                var loadedIndexL = self.options.rightToLeft ? 2 * pdfPageIndex : 2 * pdfPageIndex - 1;

                onBookPageRendered(page, loadedIndexL, size);
                onBookPageRendered(page, loadedIndexR, size);
            }
        } else {
            onBookPageRendered(page, pdfPageIndex, size);
        }
        try {
            var s = b || c;
            s.call(self, {
                image: page.image,
                imageBitmap: page.imageBitmap,
                size: size,
                pdfPageIndex: pdfPageIndex,
                htmlContent: page.htmlContent,
            });
            s = null;
        } catch (e) {}
    }

    async function convertToImageBitmap(canvas, options = {}) {
        if (typeof OffscreenCanvas != 'undefined' && canvas instanceof OffscreenCanvas) {
            return canvas.transferToImageBitmap();
        }

        return createImageBitmap(canvas, { premultiplyAlpha: 'none', ...options });
    }

    async function createPageImage(page, size) {
        if (self.webgl) {
            page.convertToImageBitmapPromises = page.convertToImageBitmapPromises || {};
            if (!page.convertToImageBitmapPromises[size]) {
                page.convertToImageBitmapPromises[size] = convertToImageBitmap(page.canvas[size]);
            }
            const bitmap = await page.convertToImageBitmapPromises[size];
            page.imageBitmap = page.imageBitmap || {};
            page.imageBitmap[size] = bitmap;
        } else {
            page.convertToBlobPromises = page.convertToBlobPromises || {};
            if (!page.convertToBlobPromises[size]) {
                page.convertToBlobPromises[size] = convertToBlob(page.canvas[size]);
            }

            const blob = await page.convertToBlobPromises[size];
            page.image = page.image || {};
            if (!page.image[size]) {
                page.image[size] = new Image();
                page.image[size].decoding = 'async';
            }
            if (!page.image[size].src) {
                const url = URL.createObjectURL(blob);
                page.image[size].src = url;
            }
            if (
                options.doublePage &&
                page._pageIndex > 0 &&
                page._pageIndex < options.pages.length / 2 &&
                !self.webgl
            ) {
                if (!page.image[size].clone) {
                    page.image[size].clone = new Image();
                    page.image[size].clone.decoding = 'async';
                }
                page.image[size].clone.src = page.image[size].src;
                page.image[size].clone.className = 'clone';
            }
        }

        // Canvas is no longer needed once bitmap/blob has been extracted.
        // Re-renders short-circuit via renderingPromises[size] +
        // convertToImageBitmapPromises[size] / convertToBlobPromises[size].
        if (page.canvas && page.canvas[size]) {
            const c = page.canvas[size];
            if (!(typeof OffscreenCanvas !== 'undefined' && c instanceof OffscreenCanvas)) {
                c.width = 0;
                c.height = 0;
                c.available = true;
            }
            page.canvas[size] = null;
        }

        return page;
    }

    async function getTextContent(page, callback) {
        page.textloadingTask = page.textloadingTask || page.getTextContent();
        page.textContent = await page.textloadingTask;
    }
};

FLIPBOOK.PdfService.prototype = {};
