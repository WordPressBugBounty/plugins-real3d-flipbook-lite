'use strict';
var FLIPBOOK = FLIPBOOK || {};
FLIPBOOK.version = '4.20.0.15';

// eslint-disable-next-line no-shadow-restricted-names
(function init(window, document, undefined) {
    if (typeof jQuery != 'undefined') {
        jQuery.fn.flipBook = function (options) {
            return new FLIPBOOK.Main(options, this);
        };

        jQuery.fn.swipeBook = function (options) {
            options.viewMode = 'swipe';
            return new FLIPBOOK.Main(options, this);
        };
    }

    window.FlipBook = function (el, options) {
        return new FLIPBOOK.Main(options, el);
    };
})(window, document);

FLIPBOOK.Main = class {
    static defaultOptions = {
        name: '',
        pages: [],
        tableOfContent: [],
        tableOfContentCloseOnClick: true,
        thumbsCloseOnClick: true,
        thumbsStyle: 'overlay', //overlay, side
        thumbsDefaultView: 'strip', //strip, grid
        deeplinkingEnabled: false,
        deeplinkingPrefix: '',
        assets: {
            flipMp3: 'assets/mp3/turnPage.mp3',
            backgroundMp3: 'assets/mp3/background.mp3',
        },
        pdfUrl: null,
        rangeChunkSize: 256,
        disableRange: false,
        disableStream: true,
        disableAutoFetch: true,
        pdfAutoLinks: false,
        htmlLayer: true,
        rightToLeft: false,
        startPage: 0,
        sound: true,
        backgroundColor: 'rgb(81, 85, 88)',
        backgroundImage: '',
        backgroundPattern: '',
        backgroundTransparent: false,
        thumbSize: 150,
        loadAllPages: false,
        loadPagesF: 2,
        loadPagesB: 1,
        autoplayOnStart: false,
        autoplayInterval: 3000,
        autoplayLoop: true,
        skin: '', // dark, light, gradient
        menuOverBook: false,
        menuFloating: false,
        menuBackground: '',
        menuShadow: '',
        menuMargin: 0,
        menuPadding: 0,
        menuTransparent: false,
        menu2OverBook: true,
        menu2Floating: false,
        menu2Background: '',
        menu2Shadow: '',
        menu2Margin: 0,
        menu2Padding: 0,
        menu2Transparent: true,
        accentColor: '#3b82f6',
        skinColor: '#222',
        skinColorHover: '#111',
        skinBackground: '#FFF',
        floatingBtnColor: '#FFF',
        floatingBtnBackground: '#00000055',
        btnColor: '',
        btnBackground: 'none',
        iconSet: 'fontawesome',
        iconStrokeWidth: null,
        hotspotDotSize: 18,
        hotspotDotColor: '#2C6ECB',
        hotspotTooltipWidth: 220,
        btnSize: 18,
        btnRadius: 2,
        btnMargin: 2,
        btnPaddingV: 10,
        btnPaddingH: 10,
        btnShadow: '',
        btnTextShadow: '',
        btnBorder: '',
        btnColorHover: '',
        btnBackgroundHover: '',
        arrowColor: '#FFF',
        arrowColorHover: '#FFF',
        arrowBackground: 'rgba(0, 0, 0, 0)',
        arrowBackgroundHover: 'rgba(0, 0, 0, .15)',
        arrowSize: 40,
        arrowRadius: 999,
        arrowMargin: 12,
        arrowPadding: 10,
        arrowTextShadow: '0px 0px 1px rgba(0, 0, 0, 1)',
        arrowBorder: '',
        floatingBtnColorHover: '#FFF',
        floatingBtnBackgroundHover: 'rgba(255, 255, 255, 0.15)',
        floatingBtnSize: null,
        floatingBtnRadius: 999,
        floatingBtnMargin: 12,
        floatingBtnPadding: null,
        floatingBtnShadow: '0 0 0 1px rgba(255, 255, 255, 0.22), 0 2px 12px rgba(0, 0, 0, 0.35)',
        floatingBtnTextShadow: '',
        floatingBtnBorder: '',
        compactBreakpoint: 768,
        btnOrder: [
            'currentPage',
            'progressBar',
            'btnFirst',
            'btnPrev',
            'btnNext',
            'btnLast',
            'btnZoomOut',
            'btnZoomIn',
            'btnThumbs',
            'btnToc',
            'btnShare',
            'btnPrint',
            'btnDownloadPdf',
            'btnSound',
            'btnTools',
            'btnSingle',
            'btnExpand',
            'btnClose',
        ],
        currentPage: {
            enabled: true,
            title: 'Current page',
            vAlign: 'top',
            hAlign: 'left',
            marginH: 0,
            marginV: 0,
            color: '',
            background: '',
        },
        progressBar: {
            enabled: false,
            // title: '',
            vAlign: 'bottom',
            // hAlign: 'left',
            // marginH: 0,
            // marginV: 0,
            height: 2,
            thumbSize: 8,
            color: '',
            background: '',
        },
        search: {
            enabled: false,
        },
        btnFirst: {
            enabled: false,
            title: 'First page',
            svg: 'last',
            iconReverse: true,
        },
        btnPrev: {
            enabled: true,
            title: 'Previous page',
            svg: 'next',
            iconReverse: true,
        },
        btnNext: {
            enabled: true,
            title: 'Next page',
        },
        btnLast: {
            enabled: false,
            title: 'Last page',
        },
        btnZoomIn: {
            enabled: true,
            title: 'Zoom in',
            svg: 'plus',
        },
        btnZoomOut: {
            enabled: true,
            title: 'Zoom out',
            svg: 'minus',
        },
        btnRotateLeft: {
            enabled: false,
            title: 'Rotate left',
        },
        btnRotateRight: {
            enabled: false,
            title: 'Rotate right',
        },
        btnAutoplay: {
            enabled: true,
            title: 'Auto flip',
            svg: 'play',
            svgAlt: 'pause',
        },
        btnSearch: {
            enabled: true,
            title: 'Search',
        },
        btnBookmark: {
            enabled: true,
            title: 'Bookmarks',
        },
        btnNotes: {
            enabled: false,
            title: 'Notes',
        },
        btnToc: {
            enabled: true,
            title: 'Table of Contents',
            svg: 'list',
        },
        btnThumbs: {
            enabled: true,
            title: 'Pages',
        },
        btnShare: {
            enabled: true,
            title: 'Share',
        },
        btnPrint: {
            enabled: true,
            title: 'Print',
            toolsMenu: true,
        },
        btnDownloadPages: {
            enabled: true,
            title: 'Download',
            url: '',
            name: '',
            svg: 'download',
            toolsMenu: true,
        },
        btnDownloadPdf: {
            enabled: true,
            title: 'Download PDF',
            url: null,
            svg: 'pdf',
            toolsMenu: true,
        },
        btnSound: {
            enabled: true,
            title: 'Sound',
            svgAlt: 'mute',
            toolsMenu: true,
        },
        btnTools: {
            enabled: true,
            title: 'More',
        },
        btnExpand: {
            enabled: true,
            title: 'Toggle fullscreen',
            svgAlt: 'compress',
        },
        btnSingle: {
            enabled: true,
            title: 'Toggle single page',
            svgAlt: 'double',
            toolsMenu: true,
        },
        btnClose: {
            title: 'Close',
            hAlign: 'right',
            vAlign: 'top',
            size: 20,
        },
        sideNavigationButtons: true,
        hideMenu: false,
        shareUrl: null,
        shareTitle: null,
        shareImage: null,
        whatsapp: {
            enabled: true,
            title: 'WhatsApp',
        },
        twitter: {
            enabled: true,
            title: 'X (Twitter)',
        },
        facebook: {
            enabled: true,
            title: 'Facebook',
        },
        pinterest: {
            enabled: true,
            title: 'Pinterest',
        },
        email: {
            enabled: true,
            title: 'Email',
        },
        linkedin: {
            enabled: true,
            title: 'LinkedIn',
        },
        digg: {
            enabled: false,
            title: 'Digg',
        },
        reddit: {
            enabled: false,
            title: 'Reddit',
        },
        copyLink: {
            enabled: true,
        },
        pdf: {
            annotationLayer: false,
        },
        pageTextureLarge: 4000,
        pageTextureMedium: 2500,
        pageTextureSmall: 1500,
        thumbTextureSize: 300,
        pageTextureMobileLarge: 3500,
        pageTextureMobileMedium: 2200,
        pageTextureMobileSmall: 1500,
        pagesInMemory: 20,
        viewMode: 'webgl',
        singlePageMode: false,
        singlePageModeIfMobile: false,
        bookMargin: 20,
        bookVerticalPadding: 200,
        zoomMin: 0.95,
        zoomMin2: 0.15,
        zoomMax2: null,
        zoomSize: null,
        htmlZoomMax: 4,
        zoomStep: 1.5,
        zoomTime: 300,
        zoomReset: false,
        zoomResetTime: 300,
        wheelDisabledNotFullscreen: false,
        wheelZoomAlways: false,
        arrowsDisabledNotFullscreen: false,
        arrowsAlwaysEnabledForNavigation: true,
        responsiveView: true,
        responsiveViewRatio: 1,
        responsiveViewTreshold: 768,
        minimalView: true,
        responsiveViewRatio: 1,
        // Compact mode (compactBreakpoint: 768) already adapts the toolbar for
        // narrow viewports, so minimalView only kicks in for very tiny embeds.
        minimalViewBreakpoint: 280,
        responsiveContainer: true,
        minPixelRatio: 1,
        maxPixelRatio: 2,
        cameraFov: 30,
        pageFlipDuration: 1,
        contentOnStart: false,
        thumbnailsOnStart: false,
        searchOnStart: false,
        sideMenuOverBook: true,
        sideMenuOverMenu: false,
        sideMenuOverMenu2: true,
        sideMenuPosition: 'left',
        lightBox: false,
        lightBoxOpened: false,
        lightBoxFullscreen: false,
        lightboxResetOnOpen: true,
        lightboxBackground: null,
        lightboxBackgroundColor: null,
        lightboxBackgroundPattern: null,
        lightboxBackgroundImage: null,
        lightboxStartPage: null,
        lightboxMarginV: '0',
        lightboxMarginH: '0',
        lightboxCSS: '',
        catalogStylesheet: '',
        catalogCSS: '',
        lightboxPreload: false,
        lightboxShowMenu: false,
        lightboxCloseOnBack: true,
        lightboxFromStart: true,
        disableImageResize: true,
        pan: 0,
        panMax: 10,
        panMax2: 2,
        panMin: -10,
        panMin2: -2,
        tilt: 0,
        tiltMax: 0,
        tiltMax2: 0,
        tiltMin: 0,
        tiltMin2: -5,
        rotateCameraOnMouseMove: false,
        rotateCameraOnMouseDrag: true,
        lights: true,
        lightColor: 0xffffff,
        lightPositionX: 0,
        lightPositionY: 150,
        lightPositionZ: 1400,
        lightIntensity: 0.6,
        shadows: true,
        shadowMapSize: 1024,
        shadowOpacity: 0.3,
        pageRoughness: 1,
        pageMetalness: 0,
        pageHardness: 2,
        coverHardness: 2,
        pageSegmentsW: 20,
        pageSegmentsH: 1,
        pageMiddleShadowSize: 4,
        pageMiddleShadowColorL: '#b1b1b1ff',
        pageMiddleShadowColorR: '#d7d7d7ff',
        antialias: false,
        bitmapResizeHeight: null,
        bitmapResizeQuality: 'medium',
        preloaderText: '',
        fillPreloader: {
            enabled: false,
            imgEmpty: 'images/logo_light.png',
            imgFull: 'images/logo_dark.png',
        },
        logoImg: '',
        logoUrl: '',
        logoCSS: 'position:absolute;',
        logoHideOnMobile: false,
        printMenu: true,
        downloadMenu: true,
        cover: true,
        backCover: true,
        pdfTextLayer: true,
        textSelect: true,
        annotationLayer: true,
        googleAnalyticsTrackingCode: null,
        linkColor: 'rgba(0, 0, 0, 0)',
        linkColorHover: 'rgba(255, 255, 0, 1)',
        linkOpacity: 0.4,
        linkTarget: '_blank',
        inkButtonsOpacity: 0,
        linkButtonsHoverOpacity: 1,
        linkButtonsBackground: 'rgba(0,0,0,0.6)',
        linkButtonsHoverBackground: 'rgba(0,0,0,0.8)',
        linkButtonsColor: '#ffffff',
        linkButtonsSize: 48,
        linkButtonsBorderRadius: 50,

        rightClickEnabled: true,
        pageNumberOffset: 0,
        flipSound: true,
        backgroundMusic: false,
        backgroundMusicOnAutoplay: false,
        doubleClickZoomDisabled: false,
        pageDragDisabled: false,
        pageClickAreaWdith: '10%',
        noteTypes: [
            { id: 1, title: 'User', color: 'green', enabled: true },
            { id: 2, title: 'Group', color: 'yellow', enabled: true },
            { id: 3, title: 'Admin', color: 'blue', enabled: true },
        ],
        pageRangeStart: null,
        pageRangeEnd: null,
        previewMessage: '',
        lockedPageSize: 150,
        previewMode: {},
        strings: {
            print: 'Print',
            printLeftPage: 'Print left page',
            printRightPage: 'Print right page',
            printCurrentPage: 'Print current page',
            printAllPages: 'Print all pages',
            download: 'Download',
            downloadLeftPage: 'Download left page',
            downloadRightPage: 'Download right page',
            downloadCurrentPage: 'Download current page',
            downloadAllPages: 'Download all pages',
            bookmarks: 'Bookmarks',
            bookmarkLeftPage: 'Bookmark left page',
            bookmarkRightPage: 'Bookmark right page',
            bookmarkCurrentPage: 'Bookmark current page',
            search: 'Search',
            findInDocument: 'Find in document',
            pagesFoundContaining: 'pages found containing',
            noMatches: 'No matches',
            matchesFound: 'matches found',
            page: 'Page',
            matches: 'matches',
            match: 'match',
            thumbnails: 'Thumbnails',
            tableOfContent: 'Table of Contents',
            share: 'Share',
            notes: 'Notes',
            pressEscToClose: 'Press ESC to close',
            password: 'Password',
            addNote: 'Add note',
            typeInYourNote: 'Type in your note...',
            copyLink: 'Copy link',
            copied: 'Copied',
            addToCart: 'Add to cart',
            viewProduct: 'View product',
            pageLocked: 'Page locked',
            endOfPreview: 'End of preview',
        },
        mobile: {
            shadows: false,
            pageSegmentsW: 10,
            btnAutoplay: { toolsMenu: true },
            btnBookmark: { toolsMenu: true },
            btnFirst: { enabled: false },
            btnLast: { enabled: false },
            currentPage: { enabled: false },
            pagesInMemory: 6,
        },
    };

    static icons = {
        fontawesome: {
            plus: [
                448,
                512,
                'M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z',
            ],
            minus: [
                448,
                512,
                'M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z',
            ],
            close: [
                384,
                512,
                'M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z',
            ],
            chevronDown: [
                512,
                512,
                'M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z',
            ],
            chevronUp: [
                512,
                512,
                'M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z',
            ],
            next: [
                320,
                512,
                'M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z',
            ],
            expand: [
                448,
                512,
                'M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z',
            ],
            compress: [
                448,
                512,
                'M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V64zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32H96v64c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H32zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V64zM320 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32V384h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z',
            ],
            thumbs: [
                512,
                512,
                'M448 96V224H288V96H448zm0 192V416H288V288H448zM224 224H64V96H224V224zM64 288H224V416H64V288zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z',
            ],
            print: [
                512,
                512,
                'M128 0C92.7 0 64 28.7 64 64v96h64V64H354.7L384 93.3V160h64V93.3c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0H128zM384 352v32 64H128V384 368 352H384zm64 32h32c17.7 0 32-14.3 32-32V256c0-35.3-28.7-64-64-64H64c-35.3 0-64 28.7-64 64v96c0 17.7 14.3 32 32 32H64v64c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V384zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z',
            ],
            sound: [
                640,
                512,
                'M533.6 32.5C598.5 85.3 640 165.8 640 256s-41.5 170.8-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z',
            ],
            mute: [
                576,
                512,
                'M301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM425 167l55 55 55-55c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-55 55 55 55c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-55-55-55 55c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l55-55-55-55c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z',
            ],
            share: [
                448,
                512,
                'M352 224c53 0 96-43 96-96s-43-96-96-96s-96 43-96 96c0 4 .2 8 .7 11.9l-94.1 47C145.4 170.2 121.9 160 96 160c-53 0-96 43-96 96s43 96 96 96c25.9 0 49.4-10.2 66.6-26.9l94.1 47c-.5 3.9-.7 7.8-.7 11.9c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-25.9 0-49.4 10.2-66.6 26.9l-94.1-47c.5-3.9 .7-7.8 .7-11.9s-.2-8-.7-11.9l94.1-47C302.6 213.8 326.1 224 352 224z',
            ],
            facebook: [
                320,
                512,
                'M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z',
            ],
            twitter: [
                512,
                512,
                'M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z',
            ],
            list: [
                512,
                512,
                'M24 56c0-13.3 10.7-24 24-24H80c13.3 0 24 10.7 24 24V176h16c13.3 0 24 10.7 24 24s-10.7 24-24 24H40c-13.3 0-24-10.7-24-24s10.7-24 24-24H56V80H48C34.7 80 24 69.3 24 56zM86.7 341.2c-6.5-7.4-18.3-6.9-24 1.2L51.5 357.9c-7.7 10.8-22.7 13.3-33.5 5.6s-13.3-22.7-5.6-33.5l11.1-15.6c23.7-33.2 72.3-35.6 99.2-4.9c21.3 24.4 20.8 60.9-1.1 84.7L86.8 432H120c13.3 0 24 10.7 24 24s-10.7 24-24 24H32c-9.5 0-18.2-5.6-22-14.4s-2.1-18.9 4.3-25.9l72-78c5.3-5.8 5.4-14.6 .3-20.5zM224 64H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H224c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H224c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H224c-17.7 0-32-14.3-32-32s14.3-32 32-32z',
            ],
            pdf: [
                512,
                512,
                'M64 464l48 0 0 48-48 0c-35.3 0-64-28.7-64-64L0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 304l-48 0 0-144-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16zM176 352l32 0c30.9 0 56 25.1 56 56s-25.1 56-56 56l-16 0 0 32c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48 0-80c0-8.8 7.2-16 16-16zm32 80c13.3 0 24-10.7 24-24s-10.7-24-24-24l-16 0 0 48 16 0zm96-80l32 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-32 0c-8.8 0-16-7.2-16-16l0-128c0-8.8 7.2-16 16-16zm32 128c8.8 0 16-7.2 16-16l0-64c0-8.8-7.2-16-16-16l-16 0 0 96 16 0zm80-112c0-8.8 7.2-16 16-16l48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 32 32 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-64 0-64z',
            ],
            tools: [
                128,
                512,
                'M64 360a56 56 0 1 0 0 112 56 56 0 1 0 0-112zm0-160a56 56 0 1 0 0 112 56 56 0 1 0 0-112zM120 96A56 56 0 1 0 8 96a56 56 0 1 0 112 0z',
            ],
            },

        lucide: {
            plus: [24, 24, '<path d="M5 12h14"/><path d="M12 5v14"/>'],
            minus: [24, 24, '<path d="M5 12h14"/>'],
            close: [24, 24, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'],
            chevronDown: [24, 24, '<path d="m6 9 6 6 6-6"/>'],
            chevronUp: [24, 24, '<path d="m18 15-6-6-6 6"/>'],
            next: [24, 24, '<path d="m9 18 6-6-6-6"/>'],
            expand: [24, 24, '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'],
            compress: [24, 24, '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>'],
            thumbs: [24, 24, '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
            print: [24, 24, '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>'],
            sound: [24, 24, '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>'],
            mute: [24, 24, '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/>'],
            share: [24, 24, '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98"/><path d="M15.41 6.51l-6.82 3.98"/>'],
            search: [24, 24, '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/>'],
            bookmark: [24, 24, '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>'],
            list: [24, 24, '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>'],
            download: [24, 24, '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'],
            single: [24, 24, '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'],
            double: [24, 24, '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'],
            tools: [24, 24, '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>'],
            play: [24, 24, '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>'],
            pause: [24, 24, '<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>'],
            first: [24, 24, '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>'],
            last: [24, 24, '<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>'],
            rotateLeft: [24, 24, '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'],
            rotateRight: [24, 24, '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>'],
            pdf: [24, 24, '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'],
            camera: [24, 24, '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'],
            cart: [24, 24, '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'],
            view: [24, 24, '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>'],
            copyLink: [24, 24, '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'],
        },

        linkedin: [
            448,
            512,
            'M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z',
        ],
        whatsapp: [
            448,
            512,
            'M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z',
        ],
        pinterest: [
            384,
            512,
            'M204 6.5C101.4 6.5 0 74.9 0 185.6 0 256 39.6 296 63.6 296c9.9 0 15.6-27.6 15.6-35.4 0-9.3-23.7-29.1-23.7-67.8 0-80.4 61.2-137.4 140.4-137.4 68.1 0 118.5 38.7 118.5 109.8 0 53.1-21.3 152.7-90.3 152.7-24.9 0-46.2-18-46.2-43.8 0-37.8 26.4-74.4 26.4-113.4 0-66.2-93.9-54.2-93.9 25.8 0 16.8 2.1 35.4 9.6 50.7-13.8 59.4-42 147.9-42 209.1 0 18.9 2.7 37.5 4.5 56.4 3.4 3.8 1.7 3.4 6.9 1.5 50.4-69 48.6-82.5 71.4-172.8 12.3 23.4 44.1 36 69.3 36 106.2 0 153.9-103.5 153.9-196.8C384 71.3 298.2 6.5 204 6.5z',
        ],
        email: [
            512,
            512,
            'M64 112c-8.8 0-16 7.2-16 16v22.1L220.5 291.7c20.7 17 50.4 17 71.1 0L464 150.1V128c0-8.8-7.2-16-16-16H64zM48 212.2V384c0 8.8 7.2 16 16 16H448c8.8 0 16-7.2 16-16V212.2L322 328.8c-38.4 31.5-93.7 31.5-132 0L48 212.2zM0 128C0 92.7 28.7 64 64 64H448c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z',
        ],
        digg: [
            512,
            512,
            'M81.7 172.3H0v174.4h132.7V96h-51v76.3zm0 133.4H50.9v-92.3h30.8v92.3zm297.2-133.4v174.4h81.8v28.5h-81.8V416H512V172.3H378.9zm81.8 133.4h-30.8v-92.3h30.8v92.3zm-235.6 41h82.1v28.5h-82.1V416h133.3V172.3H225.1v174.4zm51.2-133.3h30.8v92.3h-30.8v-92.3zM153.3 96h51.3v51h-51.3V96zm0 76.3h51.3v174.4h-51.3V172.3z',
        ],
        reddit: [
            512,
            512,
            'M440.3 203.5c-15 0-28.2 6.2-37.9 15.9-35.7-24.7-83.8-40.6-137.1-42.3L293 52.3l88.2 19.8c0 21.6 17.6 39.2 39.2 39.2 22 0 39.7-18.1 39.7-39.7s-17.6-39.7-39.7-39.7c-15.4 0-28.7 9.3-35.3 22l-97.4-21.6c-4.9-1.3-9.7 2.2-11 7.1L246.3 177c-52.9 2.2-100.5 18.1-136.3 42.8-9.7-10.1-23.4-16.3-38.4-16.3-55.6 0-73.8 74.6-22.9 100.1-1.8 7.9-2.6 16.3-2.6 24.7 0 83.8 94.4 151.7 210.3 151.7 116.4 0 210.8-67.9 210.8-151.7 0-8.4-.9-17.2-3.1-25.1 49.9-25.6 31.5-99.7-23.8-99.7zM129.4 308.9c0-22 17.6-39.7 39.7-39.7 21.6 0 39.2 17.6 39.2 39.7 0 21.6-17.6 39.2-39.2 39.2-22 .1-39.7-17.6-39.7-39.2zm214.3 93.5c-36.4 36.4-139.1 36.4-175.5 0-4-3.5-4-9.7 0-13.7 3.5-3.5 9.7-3.5 13.2 0 27.8 28.5 120 29 149 0 3.5-3.5 9.7-3.5 13.2 0 4.1 4 4.1 10.2.1 13.7zm-.8-54.2c-21.6 0-39.2-17.6-39.2-39.2 0-22 17.6-39.7 39.2-39.7 22 0 39.7 17.6 39.7 39.7-.1 21.5-17.7 39.2-39.7 39.2z',
        ],
        copyLink: [
            640,
            512,
            'M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z',
        ],
    };
    constructor(options, elem) {
        if (elem.length) {
            this.elem = elem[0];
            this.elements = Array.from(elem);
        } else {
            this.elem = elem;
            this.elements = [elem];
        }

        function webgl_detect() {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return gl instanceof WebGLRenderingContext;
        }

        if (typeof FLIPBOOK.hasWebGl == 'undefined') {
            FLIPBOOK.hasWebGl = webgl_detect();
        }

        this.hasWebGl = FLIPBOOK.hasWebGl;

        this.thumbsShowing = false;
        this.bookmarkShowing = false;
        this.searchingString = false;
        this.tocShowing = false;
        this.menuShowing = true;
        this.fullscreenActive = false;

        const layouts = {
            2: {
                menuTransparent: true,
                menu2Transparent: true,
                currentPage: { vAlign: 'bottom', hAlign: 'center' },
                btnThumbs: { hAlign: 'left', vAlign: 'top' },
                btnToc: { hAlign: 'left', vAlign: 'top' },
                btnSearch: { hAlign: 'left', vAlign: 'top' },
                btnBookmark: { hAlign: 'left', vAlign: 'top' },
                btnZoomIn: { hAlign: 'right', vAlign: 'top' },
                btnZoomOut: { hAlign: 'right', vAlign: 'top' },
                btnAutoplay: { hAlign: 'right', vAlign: 'top' },
                btnSound: { hAlign: 'right', vAlign: 'top' },
                btnSingle: { hAlign: 'right', vAlign: 'top' },
                btnExpand: { hAlign: 'right', vAlign: 'top' },
                btnShare: { hAlign: 'right', vAlign: 'top' },
                btnPrint: { hAlign: 'right', vAlign: 'top' },
                btnDownloadPages: { hAlign: 'right', vAlign: 'top' },
                btnDownloadPdf: { hAlign: 'right', vAlign: 'top' },
                btnTools: { hAlign: 'right', vAlign: 'top' },
            },
            3: {
                menuTransparent: true,
                menuPadding: 5,
                menu2Transparent: false,
                menu2OverBook: false,
                menu2Padding: 5,
                btnMargin: 5,
                currentPage: { vAlign: 'top', hAlign: 'center' },
                btnPrint: { vAlign: 'top', hAlign: 'right' },
                btnDownloadPdf: { vAlign: 'top', hAlign: 'right' },
                btnDownloadPages: { vAlign: 'top', hAlign: 'right' },
                btnThumbs: { vAlign: 'top', hAlign: 'left' },
                btnToc: { vAlign: 'top', hAlign: 'left' },
                btnBookmark: { vAlign: 'top', hAlign: 'left' },
                btnSearch: { vAlign: 'top', hAlign: 'left' },
                btnShare: { vAlign: 'top', hAlign: 'right' },
                btnAutoplay: { vAlign: 'top', hAlign: 'right' },
                btnSingle: { vAlign: 'top', hAlign: 'right' },
                btnExpand: { vAlign: 'top', hAlign: 'right' },
                btnZoomIn: { vAlign: 'top', hAlign: 'right' },
                btnZoomOut: { vAlign: 'top', hAlign: 'right' },
                btnSound: { vAlign: 'top', hAlign: 'right' },
                btnTools: { vAlign: 'top', hAlign: 'right' },
            },
            4: {
                menu2Transparent: false,
                menu2OverBook: false,
                sideMenuOverMenu2: false,
                currentPage: { vAlign: 'top', hAlign: 'center' },
                btnThumbs: { vAlign: 'top', hAlign: 'left' },
                btnToc: { vAlign: 'top', hAlign: 'left' },
                btnSearch: { vAlign: 'top', hAlign: 'left' },
                btnBookmark: { vAlign: 'top', hAlign: 'left' },
                btnZoomIn: { vAlign: 'top', hAlign: 'right' },
                btnZoomOut: { vAlign: 'top', hAlign: 'right' },
                btnAutoplay: { vAlign: 'top', hAlign: 'right' },
                btnSound: { vAlign: 'top', hAlign: 'right' },
                btnSingle: { vAlign: 'top', hAlign: 'right' },
                btnExpand: { vAlign: 'top', hAlign: 'right' },
                btnShare: { vAlign: 'top', hAlign: 'right' },
                btnPrint: { vAlign: 'top', hAlign: 'right' },
                btnDownloadPages: { vAlign: 'top', hAlign: 'right' },
                btnDownloadPdf: { vAlign: 'top', hAlign: 'right' },
                btnTools: { vAlign: 'top', hAlign: 'right' },
            },
            5: {
                // Bottom bar — video player style, clean top, all controls at bottom
                menuTransparent: true,
                menu2Transparent: true,
                menu2OverBook: true,
                btnThumbs: { hAlign: 'left' },
                btnToc: { hAlign: 'left' },
                btnSearch: { hAlign: 'left' },
                btnBookmark: { hAlign: 'left' },
                btnZoomIn: { hAlign: 'right' },
                btnZoomOut: { hAlign: 'right' },
                btnAutoplay: { hAlign: 'right' },
                btnSound: { hAlign: 'right' },
                btnSingle: { hAlign: 'right' },
                btnExpand: { hAlign: 'right' },
                btnShare: { hAlign: 'right' },
                btnPrint: { hAlign: 'right' },
                btnDownloadPages: { hAlign: 'right' },
                btnDownloadPdf: { hAlign: 'right' },
                btnTools: { hAlign: 'right' },
            },
            6: {
                // Minimal — immersive, most buttons hidden in tools menu
                menuTransparent: true,
                menu2Transparent: true,
                menu2OverBook: true,
                currentPage: { enabled: false },
                btnThumbs: { enabled: false },
                btnToc: { enabled: false },
                btnSearch: { enabled: false },
                btnBookmark: { enabled: false },
                btnAutoplay: { enabled: false },
                btnSound: { enabled: false },
                btnPrint: { enabled: false },
                btnDownloadPages: { enabled: false },
                btnDownloadPdf: { enabled: false },
                btnShare: { enabled: false },
                btnSingle: { enabled: false },
                btnExpand: { hAlign: 'right', vAlign: 'top' },
                btnZoomIn: { hAlign: 'right', vAlign: 'top' },
                btnZoomOut: { hAlign: 'right', vAlign: 'top' },
                btnTools: { hAlign: 'right', vAlign: 'top' },
            },
            7: {
                // Player — YouTube-style dark gradient bottom bar
                skinColor: '#EEE',
                btnColor: '#EEE',
                btnColorHover: '#FFF',
                skinBackground: 'rgba(0,0,0,.7)',
                sideMenuOverMenu: true,
                sideMenuOverMenu2: true,
                menuBackground: 'linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 100%)',
                menu2Background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.65) 0%, transparent 100%)',
                btnOrder: [
                    'btnAutoplay',
                    'currentPage',
                    'progressBar',
                    'btnFirst',
                    'btnPrev',
                    'btnNext',
                    'btnLast',
                    'btnSound',
                    'btnZoomOut',
                    'btnZoomIn',
                    'btnThumbs',
                    'btnToc',
                    'btnSearch',
                    'btnBookmark',
                    'btnDownloadPages',
                    'btnShare',
                    'btnPrint',
                    'btnDownloadPdf',
                    'btnTools',
                    'btnSingle',
                    'btnExpand',
                    'btnClose',
                ],
                progressBar: { enabled: true },
                currentPage: { vAlign: 'top', hAlign: 'left' },
                btnAutoplay: { hAlign: 'left' },
                btnSound: { hAlign: 'left' },
                btnZoomIn: { hAlign: 'right' },
                btnZoomOut: { hAlign: 'right' },
                btnThumbs: { hAlign: 'right' },
                btnToc: { hAlign: 'right' },
                btnSearch: { hAlign: 'right' },
                btnBookmark: { hAlign: 'right' },
                btnShare: { hAlign: 'right' },
                btnPrint: { hAlign: 'right' },
                btnDownloadPages: { hAlign: 'right' },
                btnDownloadPdf: { hAlign: 'right' },
                btnSingle: { hAlign: 'right' },
                btnTools: { hAlign: 'right' },
                btnExpand: { hAlign: 'right' },
            },
        };

        const skins = {
            dark: {
                skinColor: '#EEE',
                btnColorHover: '#FFF',
                skinBackground: '#313538',
            },
            gradient: {
                skinColor: '#EEE',
                btnColor: '#EEE',
                btnColorHover: '#FFF',
                skinBackground: 'rgba(0,0,0,.7)',
                sideMenuOverMenu: true,
                sideMenuOverMenu2: true,
                menuBackground: 'linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 100%)',
                menu2Background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.65) 0%, transparent 100%)',
            },
        };

        if (options.skin && skins[options.skin]) {
            options = FLIPBOOK.extend(true, {}, options, skins[options.skin]);
        }
        if (options.layout && layouts[options.layout]) {
            options = FLIPBOOK.extend(true, {}, options, layouts[options.layout]);
        }

        this.options = FLIPBOOK.extend(true, {}, FLIPBOOK.Main.defaultOptions, options);

        // Arrays are merged by index in deep extend, so btnOrder must be replaced not merged
        if (options.btnOrder) this.options.btnOrder = options.btnOrder;

        FLIPBOOK.count = FLIPBOOK.count || 0;
        FLIPBOOK.count++;

        this.uniqueID = FLIPBOOK.count;

        this.options.isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));

        if (this.options.isMobile) {
            FLIPBOOK.extend(true, this.options, this.options.mobile);
        }

        this.initOptions(this.options);
    }

    initOptions(o) {
        const self = this;
        this.strings = o.strings;
        this.s = 0;

        // o.i = w !== parent;

        if (o.isMobile) {
            o.singlePageMode = o.singlePageModeIfMobile ? true : o.singlePageMode;

            if (o.viewModeMobile) {
                o.viewMode = o.viewModeMobile;
            }

            if (o.pageTextureMobileLarge) {
                o.pageTextureLarge = o.pageTextureMobileLarge;
            }

            if (o.pageTextureMobileMedium) {
                o.pageTextureMedium = o.pageTextureMobileMedium;
            }

            if (o.pageTextureMobileSmall) {
                o.pageTextureSmall = o.pageTextureMobileSmall;
            }
        }

        
        var c = { a: 5, b: 7, c: 2 };
            o.pageTextureLarge = Math.pow(c.a * c.b + c.c, c.c);
            o.pageTextureSmall = Math.pow(c.a * c.b + c.c, c.c);
            o.pageTextureMedium = Math.pow(c.a * c.b + c.c, c.c);
            o.zoomSize = Math.pow(c.b * c.a + c.c, c.c);
            

        if (o.viewMode == '3dSinglePage') {
            o.singlePageMode = true;
        }
        if (o.viewMode == '2dSinglePage') {
            o.singlePageMode = true;
            o.viewMode = '2d';
        }

        if (o.singlePageMode) {
            if (o.viewMode != '2d' && o.viewMode != 'swipe') {
                o.viewMode = '3d';
            }

            if (o.rightToLeft) {
                o.viewMode = 'swipe';
            }

            o.cover = true;
        }

        if (o.singlePageMode && o.viewMode == '3d') {
            o.rightToLeft = false;
        }

        if (o.viewMode == 'simple') {
            o.viewMode = '3d';
            o.instantFlip = true;
        }

        if (!o.cover) {
            o.responsiveView = false;
        }

        if (o.webgl) {
            var c = { a: 5, b: 6, c: 2 };
            o.pageTextureLarge = Math.pow(c.a * c.b - c.c, c.c);
            o.pageTextureSmall = Math.pow(c.a * c.b - c.c, c.c);
            o.zoomSize = Math.pow(c.b * c.a + c.a, c.c);
        }

        Object.assign(o, { e: 'toString', f: 'padStart', g: 'decodeURIComponent', h: 97, i: 16 });

        o.sideMenuPosition = o.rightToLeft ? 'right' : 'left';

        if (o.viewMode == 'webgl') {
            if (!this.hasWebGl) {
                o.viewMode = '3d';
            }
        }

        if (o.viewMode == 'webgl' || o.viewMode == 'scroll' || o.viewMode == 'swipe' || o.rightToLeft)
            o.btnSingle.enabled = false;

        this.webgl = o.viewMode == 'webgl';

        if (o.menuFloating) {
            o.sideMenuOverMenu = true;
        }

        if (o.menu2Floating) {
            o.menu2OverBook = true;
            o.sideMenuOverMenu2 = true;
        }

        if (o.menuTransparent) {
            o.sideMenuOverMenu = true;
            o.menuBackground = 'none';
        }

        if (o.menu2Transparent) {
            o.menu2OverBook = true;
            o.sideMenuOverMenu2 = true;
            o.menu2Background = 'none';
        } else {
            o.sideMenuOverMenu2 = false;
        }

        if (o.menuOverBook) {
            o.sideMenuOverMenu = true;
        }

        if (o.menu2OverBook) {
            o.sideMenuOverMenu2 = true;
        }

        o.pdfMode = Boolean(o.pdfUrl || o.pdfBase64);

        if (o.backgroundTransparent) {
            o.backgroundColor = 'none';
        }

        function parseAspectRatio(ratio) {
            if (ratio === undefined) {
                return;
            }
            if (typeof ratio === 'number') {
                return ratio;
            }

            ratio = String(ratio).trim().replace('/', ':');
            if (ratio.includes(':')) {
                const parts = ratio.split(':');
                const width = parseFloat(parts[0]);
                const height = parseFloat(parts[1]);
                return width / height;
            }

            return parseFloat(ratio);
        }

        this.options.containerRatio = parseAspectRatio(this.options.containerRatio);

        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('flipbook-main-wrapper');

        let themes = {
            light: {
                color: '#222',
                bg: '#fff',
            },
            dark: {
                color: 'rgba(255, 255, 255, 0.75)',
                bg: 'rgb(49, 53, 56)',
            },
            gradient: {
                color: '#eee',
                bg: 'rgba(30,30,30,.8)',
            },
            twilight: {
                color: '#feffd3',
                bg: '#141414',
            },
            darkGrey: {
                color: '#9e9e9e',
                bg: '#212121',
            },
            lightGrey: {
                color: '#757575',
                bg: '#e0e0e0',
            },
        };
        let colors = {};
        if (o.skinColor) colors.color = o.skinColor;
        if (o.skinBackground) colors.bg = o.skinBackground;

        if (o.skin) Object.assign(colors, themes[o.skin]);

        this.wrapper.style.setProperty('--flipbook-bg', colors.bg);
        this.wrapper.style.setProperty('--flipbook-color', colors.color);
        this.wrapper.style.setProperty('--flipbook-accent-color', o.accentColor);

        this.tooltip2 = new FLIPBOOK.Tooltip2(this.wrapper);

        if (o.backgroundColor !== '') {
            this.wrapper.style.background = o.backgroundColor;
        }

        if (o.backgroundPattern !== '') {
            this.wrapper.style.background = `url(${o.backgroundPattern}) repeat`;
        }

        if (o.backgroundImage !== '') {
            this.wrapper.style.background = `url(${o.backgroundImage}) no-repeat`;
            this.wrapper.style.backgroundSize = 'cover';
            this.wrapper.style.backgroundPosition = 'center center';
        }

        this.bookLayer = document.createElement('div');
        this.bookLayer.classList.add('flipbook-bookLayer');
        this.wrapper.appendChild(this.bookLayer);
        if (o.pageDragDisabled) this.bookLayer.style.cursor = 'auto';

        if (o.linkTarget === 'spotlight') {
            this.bookLayer.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'a') {
                    e.preventDefault();
                    this.spotlight(e.target.href);
                }
            });
        }

        if (!o.rightClickEnabled) {
            this.bookLayer.addEventListener('contextmenu', function (e) {
                e.preventDefault();
            });
        }

        if (o.hideMenu) {
            this.bookLayer.style.bottom = '0';
            o.menuOverBook = true;
        }

        o.pagesOriginal = JSON.parse(JSON.stringify(o.pages));

        this.book = document.createElement('div');
        this.book.classList.add('book');
        this.bookLayer.appendChild(this.book);

        if (o.preloader && typeof jQuery != 'undefined') {
            this.preloader = jQuery(o.preloader);
        } else {
            this.preloader = document.createElement('div');
            this.preloader.classList.add('flipbook-preloader', 'cssload-container');

            var speedingWheel = document.createElement('div');
            speedingWheel.classList.add('cssload-speeding-wheel');
            this.preloader.appendChild(speedingWheel);

            var loadingText = document.createElement('div');
            loadingText.classList.add('flipbook-loading-text');
            loadingText.textContent = o.preloaderText;
            this.preloader.appendChild(loadingText);

            var loadingBg = document.createElement('div');
            loadingBg.classList.add('flipbook-loading-bg');
            this.preloader.appendChild(loadingBg);
        }

        this.setLoadingProgress(0);

        async function preload() {
            const scripts = [];
            if (o.pdfMode) {
                scripts.push(self.loadScript(FLIPBOOK.pdfjsSrc, 'pdfjsLib'));
                scripts.push(self.loadScript(FLIPBOOK.pdfServiceSrc, 'FLIPBOOK.PdfService'));
                if (o.btnSearch.enabled || o.btnNotes.enabled || o.search.enabled) {
                    scripts.push(self.loadScript(FLIPBOOK.markSrc, 'Mark'));
                }
            }
            if (o.viewMode == 'webgl') {
                scripts.push(self.loadScript(FLIPBOOK.threejsSrc, 'THREE'));
                if (!o.pdfMode && o.pages && o.pages.length && o.pages.every(function(p) { return !p.src; })) {
                    scripts.push(self.loadScript(FLIPBOOK.html2canvasSrc, 'html2canvas'));
                }
            }
            await Promise.all(scripts);
        }

        this.dispose = function () {
            this.disposed = true;
        };

        o.main = this;

        this._events = {};

        this.on = function (type, fn) {
            if (!this._events[type]) {
                this._events[type] = [];
            }

            this._events[type].push(fn);
        };

        this.off = function (type, fn) {
            if (!this._events[type]) {
                return;
            }

            var index = this._events[type].indexOf(fn);

            if (index > -1) {
                this._events[type].splice(index, 1);
            }
        };

        this.trigger = function (type) {
            if (!this._events[type]) {
                return;
            }

            var i = 0;
            var l = this._events[type].length;

            if (!l) {
                return;
            }

            for (; i < l; i++) {
                this._events[type][i].apply(this, [].slice.call(arguments, 1));
            }
        };

        this.on('textlayerrendered', function (_) {
            if (self.searchingString) {
                self.mark(self.searchingString);
            }
        });

        this.on('showpagehtml', function () {
            this.deselectText();
            if (self.searchingString) {
                self.mark(self.searchingString);
            }
        });

        this.on('pagechange', function () {
            if (self.getPreviewCut() && self.Book && !self.Book.canFlipNext()) {
                self.showPreviewEndModal();
            }
        });

        this.addPageNotes = function (page) {
            if (this.noteService) {
                this.noteService.initPageNotes(page);
            }
        };

        this.on('pdfinit', async function () {
            o.tableOfContent = self.pdfService.outline || o.tableOfContent;
            o.doublePage = self.pdfService.double;
            if (o.scaleCover) {
                o.doublePage = true;
                o.responsiveView = false;
            }
            o.backCover = self.pdfService.backCover;

            self.viewportOriginal = self.pdfService.viewports[0];

            o.firstPage = {
                width: self.pdfService.viewports[0].width,
                height: self.pdfService.viewports[0].height,
                ratio: self.pdfService.viewports[0].width / self.pdfService.viewports[0].height,
            };

            if (self.pdfService.numPages > 1) {
                o.secondPage = {
                    width: self.pdfService.viewports[1].width,
                    height: self.pdfService.viewports[1].height,
                    ratio: self.pdfService.viewports[1].width / self.pdfService.viewports[1].height,
                };
            }

            o.numPages = self.pdfService.numPages;

            var previewCut = self.getPreviewCut();
            if (previewCut && o.numPages > previewCut) {
                o.numPages = previewCut;
                if (o.doublePage) {
                    o.backCover = false;
                    o.numPages = Math.ceil(o.numPages / 2);
                }
            }

            var pages = [];
            var pageSize = o.pageTextureLarge;

            for (var i = 0; i < o.numPages; i++) {
                var p = {
                    canvas: {},
                };

                if (o.pages && o.pages[i]) {
                    FLIPBOOK.extend(p, o.pages[i]);
                }
                pages[i] = p;
            }

            o.pages = pages;
            o.pageWidth = parseInt((pageSize * self.viewportOriginal.width) / self.viewportOriginal.height);
            o.pageHeight = pageSize;
            o.pw = o.pageWidth;
            o.ph = o.pageHeight;
            // o.zoomSize = o.zoomSize || o.pageTextureLarge;

            var tocArray = o.tableOfContent;
            if (o.btnToc.enabled && (!tocArray || !tocArray.length)) {
                var outline = await self.pdfService.loadOutline();
                if (outline) {
                    o.tableOfContent = outline;
                } else {
                    o.btnToc.enabled = false;
                }
            }

            if (o.doublePage || o.numPages % 2 == 1) o.cover = true;

            self.start();
        });

        function getFlipbookSrc() {
            var scripts = document.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; i++) {
                var src = String(scripts[i].src);
                if (src.match('flipbook\\.js') || src.match('flipbook\\.min\\.js')) {
                    return src;
                } else if (src.match('flipbook\\.lite\\.js') || src.match('flipbook\\.lite\\.min\\.js')) {
                    return src.replace('.lite', '');
                }
            }
            return '';
        }

        FLIPBOOK.flipbookSrc = FLIPBOOK.flipbookSrc || this.options.flipbookSrc || getFlipbookSrc();

        const isMinified = FLIPBOOK.flipbookSrc.includes('flipbook.min.js');
        const replaceStr = isMinified ? 'flipbook.min.js' : 'flipbook.js';
        const suffix = isMinified ? '.min' : '';

        const sources = [
            { key: 'iscrollSrc', value: 'libs/iscroll' },
            { key: 'flipbookPanZoomSrc', value: 'flipbook.panzoom' },
            { key: 'threejsSrc', value: 'libs/three' },
            { key: 'flipbookWebGlSrc', value: 'flipbook.webgl.vertex' },
            { key: 'flipbookBook3Src', value: 'flipbook.book3' },
            { key: 'flipBookSwipeSrc', value: 'flipbook.swipe' },
            { key: 'flipBookScrollSrc', value: 'flipbook.scroll' },
            { key: 'pdfjsSrc', value: 'libs/pdf' },
            { key: 'pdfServiceSrc', value: 'flipbook.pdfservice' },
            { key: 'pdfjsworkerSrc', value: 'libs/pdf.worker' },
            { key: 'markSrc', value: 'libs/mark' },
            { key: 'html2canvasSrc', value: 'libs/html2canvas' },
        ];

        sources.forEach((source) => {
            FLIPBOOK[source.key] = FLIPBOOK.flipbookSrc.replace(replaceStr, source.value + suffix + '.js');
        });

        if (!o.deeplinkingPrefix && o.deeplinking && o.deeplinking.prefix) {
            o.deeplinkingPrefix = o.deeplinking.prefix;
        }

        o.deeplinkingEnabled = o.deeplinkingPrefix || o.deeplinkingEnabled || (o.deeplinking && o.deeplinking.enabled);

        if (o.deeplinkingEnabled) {
            this.checkHash();
            window.addEventListener('hashchange', this.checkHash.bind(this));
        }

        o.l = ['load', 'front', 'rgb', 'length'];

        if (o.lightBox) {
            o.btnClose.enabled = true;

            if (!this.canFullscreen()) this.options.btnExpand.enabled = false;

            this.lightbox = new FLIPBOOK.Lightbox(this, this.wrapper, o);
            this.lightboxStartedTimes = 0;
            this.wrapper.style.background = 'none';
            this.bookLayer.style.background = 'none';
            this.book.style.background = 'none';

            this.lightbox.overlay.appendChild(this.preloader);
            this.preloader.style.position = 'fixed';

            this.elements.forEach(function (el) {
                el.style.cursor = 'pointer';
                el.addEventListener('click', async function (e) {
                    if (!self.disposed) {
                        e.preventDefault();
                        self.lightboxStartPage = this.dataset.page;

                        if (self.started) {
                            await self.lightboxStart();

                            if (o.lightBoxFullscreen) {
                                setTimeout(async function () {
                                    self.toggleExpand();
                                }, 0);
                            }

                            self.lightbox.openLightbox();
                        } else {
                            self.init();
                            self.lightbox.openLightbox();

                            if (o.lightBoxFullscreen) {
                                setTimeout(async function () {
                                    self.toggleExpand();
                                }, 100);
                            }
                        }
                    }
                });
            });

            if (o.lightBoxOpened) {
                this.init();
                if (typeof jQuery != 'undefined') jQuery(window).trigger('r3d-lightboxloadingstarted');
            } else if (o.lightboxPreload) {
                preload();
            }

            // this.fullscreenElement = document.documentElement;
            this.fullscreenElement = document.body;
        } else {
            o.btnClose.enabled = false;
            this.wrapper.appendChild(this.preloader);
            this.elem.appendChild(this.wrapper);
            this.elem.style.background = this.wrapper.style.background;
            this.fullscreenElement = this.elem;

            const observer = new IntersectionObserver((entries) => {
                const isVisible = entries[0].isIntersecting;
                if (isVisible) {
                    if (!self.Book) {
                        self.init();
                    } else {
                        self.Book.enable();
                        self.resizeContainer();
                        self.resize();
                    }
                } else if (self.Book) {
                    self.Book.disable();
                }
            });
            observer.observe(this.wrapper);
        }
    }

    async start() {
        var o = this.options;

        if (o.pages.length == 1) {
            o.numPages = 1;
            o.doublePage = false;
            o.btnNext.enabled = false;
            o.btnPrev.enabled = false;
            o.btnFirst.enabled = false;
            o.btnLast.enabled = false;
            o.sideNavigationButtons = false;
            o.btnAutoplay.enabled = false;
            o.singlePageMode = true;
            o.viewMode = '3d'; //swipe not woring with 1 page
            o.rightToLeft = false;
            o.btnThumbs.enabled = false;
            o.btnToc.enabled = false;
            o.btnBookmark.enabled = false;
        }

        if (o.dp) {
            o.doublePage = true;
        }

        if (this.started) {
            return;
        }

        const pageAspect = this.options.pageWidth / this.options.pageHeight;

        if (pageAspect > 1) {
            // Only normalize the layout dimensions by aspect. Texture-size tiers stay
            // as the canonical long-edge budgets (1500/2500/4000) so cache keys are
            // clean integers in every view mode (webgl/book3/scroll/swipe) — landscape
            // pages render at the full tier, same as portrait.
            this.options.pageWidth /= pageAspect;
            this.options.pageHeight /= pageAspect;
        }
        this.options.zoomSize = this.options.zoomSize || this.options.pageTextureLarge;

        this.pageW = this.options.pageWidth;
        this.bookW = 2 * this.options.pageWidth;
        if (this.options.singlePageMode) {
            this.bookW /= 2;
        }
        this.pageH = this.options.pageHeight;
        this.bookH = this.options.pageHeight;

        if (this.options.numPages % 2 == 0) {
            this.options.numSheets = (this.options.numPages + 2) / 2;
        } else {
            this.options.numSheets = (this.options.numPages + 1) / 2;
        }

        this.started = true;

        if (this.options.lightBox) {
            this.lightbox.openLightbox();
            await this.lightboxStart();
        }

        const pageClickAreaWdith = this.options.pageClickAreaWdith;
        const numPages = this.options.pages.length;
        const doublePage = this.options.doublePage;
        const singlePageMode = this.options.singlePageMode;
        const scrollMode = this.options.viewMode == 'scroll';

        const htmlWidth = (this.options.pageWidth * 1000) / this.options.pageHeight;
        const xPos = htmlWidth - 50;
        const xPosDouble = 2 * htmlWidth - 50;

        this.options.pages.hasHtmlContent = this.options.pages
            ? this.options.pages.some((page) => !!page.htmlContent)
            : false;

        if (this.options.pages.hasHtmlContent && this.bookLayer) {
            if (this.options.catalogStylesheet) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = this.options.catalogStylesheet;
                link.setAttribute('data-flipbook-catalog', '');
                this.bookLayer.insertBefore(link, this.bookLayer.firstChild);
            }
            if (this.options.catalogCSS) {
                const style = document.createElement('style');
                style.textContent = this.options.catalogCSS;
                style.setAttribute('data-flipbook-catalog', '');
                this.bookLayer.insertBefore(style, this.bookLayer.firstChild);
            }
        }

        var rtl = this.options.rightToLeft;
        var self = this;

        if (pageClickAreaWdith && !scrollMode) {
            this.options.pages.forEach(function (page, index) {
                page.htmlContent = page.htmlContent || '';
                if (singlePageMode) {
                    if (index > 0) {
                        rtl ? addBtnPrev(page) : addBtnNext(page);
                    }
                    if (index < numPages - 1) {
                        rtl ? addBtnNext(page) : addBtnPrev(page);
                    }
                } else {
                    if (doublePage) {
                        if (self.options.cover && index == 0) {
                            rtl ? addBtnPrev(page) : addBtnNext(page);
                        } else if (self.options.backCover && index == self.options.pages.length - 1) {
                            rtl ? addBtnPrev(page) : addBtnNext(page);
                        } else {
                            addBtnPrev(page);
                            addBtnNext(page, true);
                        }
                    } else {
                        if (index % 2 == 0) {
                            rtl ? addBtnPrev(page) : addBtnNext(page);
                        } else {
                            rtl ? addBtnNext(page) : addBtnPrev(page);
                        }
                    }
                }
            });
        }

        function addBtnPrev(page) {
            page.htmlContent +=
                '<a href="#" draggable="false" class="internalLink pageClickArea pageClickAreaLeft" data-page="prev"></a>';
        }

        function addBtnNext(page, double) {
            const left = double ? xPosDouble : xPos;
            page.htmlContent +=
                '<a href="#" draggable="false" class="internalLink pageClickArea pageClickAreaRight" data-page="next" style="left:' +
                left +
                'px;"></a>';
        }

        await this.createBook();
        this.createTooltip();
        if (this.options.btnNotes.enabled) {
            this.initNotes();
        }
    }

    async checkHash() {
        if (this.disposed) {
            return;
        }
        const o = this.options;

        var fullHash = window.location.hash;

        var targetPage = this.getPageFromHash();
        if (!o.cover) {
            targetPage++;
        }
        var startPage = targetPage;
        if (targetPage < 1) {
            targetPage = 1;
        } else if (this.numPages && targetPage > this.numPages) {
            targetPage = this.numPages;
        }
        if (targetPage) {
            if (!this.started) {
                o.startPage = startPage;

                if (o.lightBox) {
                    this.init();

                    if (o.lightBoxFullscreen) {
                        setTimeout(() => {
                            this.toggleExpand();
                        }, 100);
                    }
                }
            } else if (this.Book) {
                if (this.lightbox && !this.lightbox.lightboxOpened) {
                    this.lightbox.openLightbox();
                    await this.lightboxStart();
                }
                this.goToPage(targetPage, fullHash.indexOf('flip') == -1);
            }
        }
    }

    async init() {
        if (this.initStarted) {
            return;
        }
        this.initStarted = true;
        const o = this.options;

        const loadImage = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        };

        if (o.fillPreloader.enabled) {
            const fillPreloader = document.createElement('div');
            fillPreloader.classList.add('flipbook-fillPreloader');

            try {
                const empty = await loadImage(o.fillPreloader.imgEmpty);
                const full = await loadImage(o.fillPreloader.imgFull);

                fillPreloader.appendChild(empty);
                fillPreloader.appendChild(full);

                this.$fillPreloader = fillPreloader;
                this.$fillPreloaderImg = full;

                this.wrapper.appendChild(fillPreloader);
            } catch (error) {
                console.error('Error loading preloader images', error);
            }
        }

        if (this.initialized) {
            return;
        }

        this.define = window.define;
        window.define = null;

        this.id = this.uniqueID;

        this.addPageItems();
        if (o.pageCaptions) this.addPageCaptions();

        // Preload view mode scripts in parallel with PDF/JPG init
        // These don't depend on PDF data, so they can load concurrently
        // loadScript caches, so createBook() will resolve instantly later
        if (o.viewMode === 'webgl') {
            this.loadScript(FLIPBOOK.threejsSrc, 'THREE').then(() => {
                this.loadScript(FLIPBOOK.flipbookWebGlSrc, 'FLIPBOOK.BookWebGL');
            });
            if (!o.pdfMode && o.pages && o.pages.length && o.pages.every(function(p) { return !p.src; })) {
                this.loadScript(FLIPBOOK.html2canvasSrc, 'html2canvas');
            }
        } else if (o.viewMode === 'swipe') {
            this.loadScript(FLIPBOOK.flipbookPanZoomSrc, 'FLIPBOOK.PanZoom').then(() => {
                this.loadScript(FLIPBOOK.flipBookSwipeSrc, 'FLIPBOOK.BookSwipe');
            });
        } else if (o.viewMode === 'scroll') {
            this.loadScript(FLIPBOOK.flipBookScrollSrc, 'FLIPBOOK.BookScroll');
        } else {
            this.loadScript(FLIPBOOK.flipbookPanZoomSrc, 'FLIPBOOK.PanZoom').then(() => {
                this.loadScript(FLIPBOOK.flipbookBook3Src, 'FLIPBOOK.Book3');
            });
        }

        if (o.pdfMode) {
            this.initPdf();
        } else {
            this.initJpg();
        }

        this.setLoadingProgress(0.1);

        this.initialized = true;
    }

    bodyHasVerticalScrollbar() {
        return document.body.scrollHeight > window.innerHeight;
    }

    isIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    isZoomed() {
        return this.zoom > 1;
    }

    async lightboxStart() {
        var self = this,
            o = this.options;
        if (!this.started) {
            await this.start();
        }

        if (typeof this.Book == 'undefined') {
            setTimeout(function () {
                self.lightboxStart();
            }, 100);
            return;
        }

        this.Book.enable();

        this.playBgMusic();

        this.lightboxStartedTimes++;

        this.sendGAEvent({
            event: 'flipbook_lightbox_open',
            book_name: this.options.name,
            nonInteraction: true,
        });

        this.updateCurrentPage();
        this.lightbox.openLightbox();
        this.resize();

        var targetPage;
        if (!window.location.hash) {
            targetPage = this.lightboxStartPage || this.options.lightboxStartPage;
        }

        if (targetPage) {
            this.goToPage(targetPage, true);
        }
    }

    setHash(page) {
        if (page < 1) {
            page = 1;
        }

        if ('#' + this.options.deeplinkingPrefix + page == window.location.hash) {
            return;
        }

        if (this.options.deeplinkingEnabled && this.Book.enabled && this.hash != page) {
            window.location.hash = '#' + this.options.deeplinkingPrefix + String(page);
            this.historyStateChange();
            this.hash = page;
        }
    }

    historyStateChange(changes) {
        this.historyStateChanges = this.historyStateChanges || 0;
        if (typeof changes != 'undefined') this.historyStateChanges = changes;
        else this.historyStateChanges++;
    }

    clearHash() {
        }

    getPageFromHash() {
        var page;
        return page;
    }

    async sendGAEvent(params) {
        }

    lightboxEnd() {
        if (document.fullscreenElement) {
            this.toggleExpand();
            this.toggleIcon(this.btnExpand, true);
        }

        if (this.Book) {
            if (this.options.lightboxStartPage) this.Book.goToPage(this.options.lightboxStartPage, true);
            this.Book.zoomTo(this.options.zoomMin);
            this.Book.disable();
        }

        this.closeMenus();

        this.setLoadingProgress(1);

        this.pauseMediaPlayback();

        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
        }

        if (window.location.hash) {
            this.clearHash();
        }

        if (this.historyStateChanges) {
            // history.go(-this.historyStateChanges);
            this.historyStateChange(0);
        }
    }

    pauseMediaPlayback() {
        if (this.mediaElements)
            this.mediaElements.forEach((media) => {
                if (media.tagName.toLowerCase() === 'video' || media.tagName.toLowerCase() === 'audio') {
                    media.pause();
                } else if (media.tagName.toLowerCase() === 'iframe') {
                    const src = media.src || media.getAttribute('src') || '';
                    if (
                        (src.includes('youtube.com/embed') || src.includes('youtube-nocookie.com/embed')) &&
                        media.contentWindow
                    ) {
                        try {
                            media.contentWindow.postMessage(
                                JSON.stringify({
                                    event: 'command',
                                    func: 'pauseVideo',
                                    args: [],
                                }),
                                '*'
                            );
                        } catch (e) {}
                    }
                }
            });
        if (this.pageAudioPlayer) {
            this.pageAudioPlayer.pause();
        }
        if (this.youtubes) {
            this.youtubes.forEach((ytWrapper) => {
                const player = ytWrapper.player;

                if (!player || typeof player.getCurrentTime !== 'function') {
                    return;
                }
                ytWrapper.dataset.ytCurrentTime = player.getCurrentTime();
                ytWrapper.dataset.ytMuted = player.isMuted();
                player.pauseVideo();
            });
        }
    }

    turnPageStart() {
        this.pauseMediaPlayback();
        this.resumeGlobalSound();
        this.playFlipSound();

        if (this.zoom <= 1) {
            this.showWrapperOverflow();
        }
    }

    showWrapperOverflow() {
        if (!this.overflowVisible) {
            this.wrapper.style.overflow = 'visible';
            this.overflowVisible = true;
        }
    }

    hideWrapperOverflow() {
        if (this.overflowVisible) {
            this.wrapper.style.overflow = 'hidden';
            this.overflowVisible = false;
        }
    }

    turnPageComplete() {
        this.animating = false;

        this.updateCurrentPage();

        var rightIndex = this.Book.rightIndex || 0;

        if (this.options.rightToLeft) {
            rightIndex = this.options.pages.length - rightIndex;
        }

        this.trigger('turnpagecomplete', { rightIndex: rightIndex });

        if (this.options.zoomReset) {
            this.Book.zoomTo(this.options.zoomMin);
        }

        this.hideWrapperOverflow();
    }

    dragPage() {
        if (this.zoom <= 1) {
            this.showWrapperOverflow();
        }
    }

    updateCurrentPage() {
        var rtl = this.options.rightToLeft;
        var total = this.options.numPages;
        var totalDisplay = total - this.options.pageNumberOffset;
        var rightIndex = this.Book.rightIndex || 0;
        var s;

        if (rightIndex % 2 == 1) {
            rightIndex++;
        }

        if (rtl) {
            rightIndex = this.Book.numSheets * 2 - rightIndex;
        }

        let ri = this.options.cover ? rightIndex : rightIndex - 1;

        if (this.options.singlePageMode || this.Book.singlePage || this.Book.view == 1) {
            if (this.Book.getCurrentPageNumber) {
                s = this.Book.getCurrentPageNumber();
            } else {
                if (rtl) {
                    rightIndex--;
                }

                s = rightIndex + 1;
            }

            this.setHash(s);
            this.cPage = [s - 1];
        } else {
            if (ri > total || (ri == total && total % 2 == 0)) {
                s = total;
                this.cPage = [total - 1];
            } else if (ri < 1) {
                s = 1;
                this.cPage = [0];
            } else {
                s = String(ri) + '-' + String(ri + 1);
                this.cPage = [ri - 1, ri];
            }

            this.setHash(ri);
        }

        this.enableNext(this.Book.canFlipNext());
        this.enablePrev(this.Book.canFlipPrev());

        if (this.cPage.length === 2) {
            this.wrapper.querySelectorAll('.c-l-p').forEach(function (element) {
                element.classList.remove('flipbook-hidden');
            });
            this.wrapper.querySelectorAll('.c-r-p').forEach(function (element) {
                element.classList.remove('flipbook-hidden');
            });

            this.wrapper.querySelectorAll('.c-p').forEach(function (element) {
                element.classList.add('flipbook-hidden');
            });
        } else {
            this.wrapper.querySelectorAll('.c-l-p').forEach(function (element) {
                element.classList.add('flipbook-hidden');
            });
            this.wrapper.querySelectorAll('.c-r-p').forEach(function (element) {
                element.classList.add('flipbook-hidden');
            });

            this.wrapper.querySelectorAll('.c-p').forEach(function (element) {
                element.classList.remove('flipbook-hidden');
            });
        }

        if (typeof this.currentPage === 'undefined') {
            return;
        }

        this.s && this.options.pdfPageScale > 0 && this.goToPage(0);

        if (s != this.currentPageValue) {
            this.currentPageValue = String(s);

            var first = Number(String(s).split('-')[0]);
            var second = Number(String(s).split('-')[1]);

            if (first && this.options.pages[Number(first - 1)] && this.options.pages[Number(first - 1)].name) {
                first = this.options.pages[Number(first - 1)].name;
            }

            if (second && this.options.pages[Number(second - 1)] && this.options.pages[Number(second - 1)].name) {
                second = this.options.pages[Number(second - 1)].name;
            }

            if (first && second) {
                s = first + '-' + second;
            } else if (first) {
                s = first;
            } else if (second) {
                s = second;
            } else {
                s = 1;
            }

            this.currentPageString = s;
            this.currentPageInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));

            this.currentPage.textContent = ' / ' + String(totalDisplay);

            const span = document.createElement('span');
            span.style.visibility = 'hidden';
            span.style.position = 'absolute';
            span.style.whiteSpace = 'pre';
            span.className = 'flipbook-currentPageInput';
            document.body.appendChild(span);
            span.textContent = s;

            this.currentPageInput.style.width = `${span.offsetWidth + 2}px`;

            document.body.removeChild(span);

            // Create progress bar on first page change (numSheets is now known)
            if (this._progressBarPending && !this.progressBar) {
                var self2 = this;
                this.progressBar = new FLIPBOOK.ProgressBar({
                    wrapper: this.menuBottom,
                    min: 1,
                    max: this._getProgressStops(),
                    value: 1,
                    colors: {
                        fill: this.options.progressBar.color || '',
                        bg: this.options.progressBar.background || '',
                    },
                    onChange: function (val) {
                        self2.goToPage(self2._stopToPage(Math.round(val)));
                    },
                });
                this._progressBarPending = false;
                var pbHeight = this.options.progressBar.height || 4;
                var thumbSize = this.options.progressBar.thumbSize || 12;
                var el = this.progressBar.el;
                el.style.setProperty('--pb-height', pbHeight + 'px');
                this.progressBar.thumb.style.width = thumbSize + 'px';
                this.progressBar.thumb.style.height = thumbSize + 'px';
                this.menuBottom.style.paddingTop = (pbHeight + 8) + 'px';
            }

            // Update progress bar
            if (this.progressBar) {
                var numStops = this._getProgressStops();
                if (this.progressBar.max !== numStops) {
                    this.progressBar.max = numStops;
                }
                var firstPage = Number(String(this.currentPageValue).split('-')[0]) || 1;
                this.progressBar._silent = true;
                this.progressBar.setValue(this._pageToStop(firstPage));
                this.progressBar._silent = false;
            }

            this.resize();

            if (typeof jQuery != 'undefined') {
                jQuery(this).trigger({
                    type: 'pagechange',
                    page: this.currentPageValue,
                    name: this.options.name,
                });

                jQuery(window).trigger({
                    type: 'r3d-pagechange',
                    page: this.currentPageValue,
                    name: this.options.name,
                });
            } else {
                var r3dPageChangeEvent = new CustomEvent('r3d-pagechange', {
                    detail: {
                        page: this.currentPageValue,
                        name: this.options.name,
                    },
                });
                window.dispatchEvent(r3dPageChangeEvent);
            }

            this.trigger('pagechange');

            this.sendGAEvent({
                event: 'flipbook_page_view',
                book_name: this.options.name,
                page_number: this.currentPageValue,
                nonInteraction: true,
            });

            this.flippingPage = false;
        }
    }

    async initJpg() {
        const o = this.options;
        let pages = o.pages || [];

        var previewCut = this.getPreviewCut();
        if (previewCut) pages = pages.slice(0, previewCut);
        if (o.pageRangeStart || o.pageRangeEnd) {
            const start = Math.max((o.pageRangeStart || 1) - 1, 0);
            const end = Math.min(o.pageRangeEnd || pages.length, pages.length);
            pages = pages.slice(start, end);
        }
        o.pages = pages;
        const count = pages.length;

        const loadPage = (idx) => new Promise((resolve) => this.loadPage(idx, o.pageTextureLarge, resolve));

        if (!o.pdfUrl && !o.hasHtmlContent && !pages.some((p) => p.json)) o.btnSearch.enabled = false;
        if (!o.tableOfContent.length && !pages.some((p) => p.title)) o.btnToc.enabled = false;

        const getDims = ({ width, height, img }) => [width || img.width, height || img.height];

        this.setLoadingProgress(0.5);
        // Load first two pages in parallel
        var pageLoads = [loadPage(0)];
        if (count > 1) pageLoads.push(loadPage(1));
        await Promise.all(pageLoads);

        const [pw, ph] = getDims(pages[0]);
        Object.assign(o, {
            pw,
            ph,
            pageWidth: pw,
            pageHeight: ph,
            zoomSize: o.zoomSize || ph,
        });
        if (count === 1) return this.start();

        const [pw2, ph2] = getDims(pages[1]);
        Object.assign(o, { pageWidth2: pw2, pageHeight2: ph2 });
        const ratio = pw / ph;
        o.doublePage = o.scaleCover || pw2 / ph2 / ratio > 1.5;
        if (!o.doublePage) o.backCover = count % 2 === 0;

        if (count > 2 && o.doublePage) {
            await loadPage(count - 1);
            const [pwL, phL] = getDims(pages[count - 1]);
            o.backCover = pw2 / ph2 / (pwL / phL) > 1.5;
        }

        if (o.doublePage || count % 2 == 1) o.cover = true;

        this.start();
    }

    async initPdf() {
        if (this.started) {
            return;
        }

        this.setLoadingProgress(0.2);

        await this.loadScript(FLIPBOOK.pdfjsSrc, 'pdfjsLib');
        await this.loadScript(FLIPBOOK.pdfServiceSrc, 'FLIPBOOK.PdfService');

        if (window.CanvasPixelArray) {
            window.CanvasPixelArray.prototype.set = function (arr) {
                var l = this.length;
                var i = 0;

                for (; i < l; i++) {
                    this[i] = arr[i];
                }
            };
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = this.options.pdfjsworkerSrc || FLIPBOOK.pdfjsworkerSrc;

        this.pdfService = new FLIPBOOK.PdfService(this, this.options);
    }

    parsePageSpec(spec) {
        // Returns a Set of 1-based page numbers, or null if no spec.
        // Accepts: number, "1-20", "1,2,3", "1,5-9,12", [1,2,56], ["1-20","30-32"], [1,"5-9",12]
        // Page numbers below 1 are ignored, so "0" / 0 yields null (preview off, nothing locked).
        if (spec === null || spec === undefined || spec === '') return null;
        var set = new Set();
        var addToken = function (token) {
            if (typeof token === 'number') {
                if (Number.isFinite(token) && token >= 1) set.add(token);
                return;
            }
            var s = String(token).trim();
            if (!s) return;
            if (s.indexOf('-') > -1) {
                var parts = s.split('-');
                var a = parseInt(parts[0], 10);
                var b = parseInt(parts[1], 10);
                if (Number.isFinite(a) && Number.isFinite(b)) {
                    for (var n = Math.max(Math.min(a, b), 1); n <= Math.max(a, b); n++) set.add(n);
                }
            } else {
                var num = parseInt(s, 10);
                if (Number.isFinite(num) && num >= 1) set.add(num);
            }
        };
        if (Array.isArray(spec)) {
            spec.forEach(function (el) {
                if (typeof el === 'string') el.split(',').forEach(addToken);
                else addToken(el);
            });
        } else {
            String(spec).split(',').forEach(addToken);
        }
        return set.size ? set : null;
    }

    // previewPages is overloaded: a bare page count (number or numeric string like 20 / "20")
    // truncates the book to the first N pages; a selection (range/list/array) instead locks
    // every page outside the selection. This returns the cut count, or null when previewPages
    // is a selection (or unset). Disambiguated by content, not type, so string configs from
    // HTML data attributes (e.g. "20") still cut.
    getPreviewCut() {
        var pp = this.options.previewPages;
        if (pp === null || pp === undefined || pp === '') return null;
        if (typeof pp === 'number') return pp > 0 ? Math.floor(pp) : null;
        if (typeof pp === 'string' && /^\d+$/.test(pp.trim())) {
            var n = parseInt(pp.trim(), 10);
            return n > 0 ? n : null;
        }
        return null;
    }

    isPdfPageLocked(pdfIndex) {
        var pages = this.options.pages;
        var bookIdx = this.options.doublePage
            ? pdfIndex === 0
                ? [0]
                : [2 * pdfIndex - 1, 2 * pdfIndex]
            : [pdfIndex];
        return bookIdx.every(function (bi) {
            return pages[bi] && pages[bi].locked;
        });
    }

    initPageHTML(index) {
        const page = this.options.pages[index];
        if (page.htmlInitialized) {
            return;
        }

        if (
            page.locked &&
            page.htmlContent &&
            page.htmlContent.querySelector &&
            !page.htmlContent.querySelector('.flipbook-locked-overlay')
        ) {
            var lockOverlay = document.createElement('div');
            lockOverlay.className = 'flipbook-locked-overlay';
            lockOverlay.innerHTML =
                this.options.previewMessage ||
                '<div class="flipbook-locked-default">' + this.getString('pageLocked') + '</div>';
            page.htmlContent.appendChild(lockOverlay);
        }

        this.addPageLinks(page);
        this.addPageNotes(page);
        this.addMediaListeners(page);

        page.htmlInitialized = true;
    }

    addMediaListeners(page) {
        if (page.htmlContent && page.htmlContent instanceof Element) {
            const mediaElementsOnThisPage = page.htmlContent.querySelectorAll('video, audio, iframe');
            this.mediaElements = this.mediaElements || [];
            this.mediaElements.push(...mediaElementsOnThisPage);
        }
    }

    addPageLinks(page) {
        }

    pauseGlobalSound() {
        this.toggleSound(false);
        this.soundPaused = true;
    }

    resumeGlobalSound() {
        if (this.soundPaused) this.toggleSound(true);
    }

    addPageNames() {
        const offset = this.options.pageNumberOffset;

        function convertToRoman(num) {
            const romanMap = [
                { value: 1000, numeral: 'M' },
                { value: 900, numeral: 'CM' },
                { value: 500, numeral: 'D' },
                { value: 400, numeral: 'CD' },
                { value: 100, numeral: 'C' },
                { value: 90, numeral: 'XC' },
                { value: 50, numeral: 'L' },
                { value: 40, numeral: 'XL' },
                { value: 10, numeral: 'X' },
                { value: 9, numeral: 'IX' },
                { value: 5, numeral: 'V' },
                { value: 4, numeral: 'IV' },
                { value: 1, numeral: 'I' },
            ];

            let romanNumeral = '';

            romanMap.forEach(function (mapEntry) {
                while (num >= mapEntry.value) {
                    romanNumeral += mapEntry.numeral;
                    num -= mapEntry.value;
                }
            });

            return romanNumeral;
        }

        this.options.pages.forEach(function (page, index) {
            if (typeof page.name == 'undefined') {
                page.name = index - offset + 1;
                if (page.name < 1) {
                    page.name = convertToRoman(index + 1);
                }
            }
        });
    }

    async loadPageHTML(index, callback) {
        var self = this;
        var options = this.options;

        if (index < 0) {
            callback.call(this, {});
            return;
        }

        if (options.pdfMode) {
            if (!options.pages[index]) {
                callback.call(this, {});
            } else if (options.pages[index].locked) {
                // Locked pages: skip the text layer entirely (nothing selectable/searchable)
                var lpage = options.pages[index];
                if (lpage.htmlContent && lpage.htmlContent[0]) lpage.htmlContent = lpage.htmlContent[0];
                lpage.htmlContentInitialized = true;
                self.initPageHTML(index);
                callback.call(self, lpage.htmlContent, index);
            } else {
                self.initPageHTML(index);
                    callback.call(self, options.pages[index].htmlContent, index);
                    }
        }
        else {
            this.initPageHTML(index);

            callback.call(this, options.pages[index].htmlContent, index);
        }
    }

    async fetchAndCacheImage(url) {
        // Initialize cache as Map for better performance over object
        this.imageCache ??= new Map();

        // Early return for cached image
        let cached = this.imageCache.get(url);
        if (cached) return cached;

        try {
            // Create and cache promise immediately to prevent duplicate fetches
            const imagePromise = (async () => {
                const response = await fetch(url, { cache: 'force-cache' });
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

                const blob = await response.blob();
                const { bitmapResizeHeight, bitmapResizeQuality } = this.options ?? {};

                // Only create params object if needed
                const params = {};
                if (bitmapResizeHeight) params.resizeHeight = bitmapResizeHeight;
                if (bitmapResizeQuality) params.resizeQuality = bitmapResizeQuality;

                return createImageBitmap(blob, Object.keys(params).length ? params : undefined);
            })();

            this.imageCache.set(url, imagePromise);
            return await imagePromise;
        } catch (error) {
            // Remove failed promise from cache to allow retry
            this.imageCache.delete(url);
            throw error;
        }
    }

    loadPage(index, size, callback) {
        var self = this;
        var pageSrc = this.options.pages && this.options.pages[index] && this.options.pages[index].src;
        var page = this.options.pages[index];

        if (!page) {
            callback.call(this);
            return;
        }

        if (!pageSrc && !this.options.pdfMode && page.htmlContent) {
            if (!FLIPBOOK.blankA4Image) {
                FLIPBOOK.blankA4Image = new Image();
                FLIPBOOK.blankA4Image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAOCAIAAACZwRr8AAAAEUlEQVR4nGP4jxcwjEoPNmkAtmyibBsS4YAAAAAASUVORK5CYII=';
            }
            page.img = FLIPBOOK.blankA4Image;
            page.imgLoaded = true;
            page.width = self.options.htmlPageWidth || 1000;
            page.height = self.options.htmlPageHeight || 1414; // A4 default

            // In webgl mode, capture html2canvas screenshot before signaling page loaded
            if (self.options.viewMode === 'webgl' && self.Book && self.Book._capturePageScreenshot) {
                self.Book._capturePageScreenshot(index, function() {
                    self.pageLoaded({ index: index, size: size, image: FLIPBOOK.blankA4Image, imageBitmap: page._htmlBitmap }, callback);
                });
            } else {
                self.pageLoaded({ index: index, size: size, image: FLIPBOOK.blankA4Image }, callback);
            }
            return;
        }

        if (this.options.pdfMode && !pageSrc) {
            this.loadPageFromPdf(index, size, callback);
        } else {
            if (size == this.options.thumbTextureSize && page.thumb) {
                if (!page.thumbImg && page.thumb) {
                    page.thumbImg = new Image();
                    page.thumbImg.decoding = 'async';
                    page.thumbImg.setAttribute('data-id', index);

                    page.thumbImg.onload = function () {
                        page.thumbLoaded = true;

                        self.pageLoaded(
                            {
                                index: index,
                                size: size,
                                image: page.thumbImg,
                            },
                            callback
                        );
                    };

                    if (this.options.viewMode == 'webgl') {
                        page.thumbImg.crossOrigin = 'Anonymous';
                    }

                    if (self.options.matchProtocol !== false) {
                        const currentProtocol = location.protocol;
                        if (!page.thumb.startsWith(currentProtocol)) {
                            page.thumb = page.thumb.replace(/^https?:/, currentProtocol);
                        }
                    }
                    page.thumbImg.src = page.thumb;
                } else if (page.thumbLoaded) {
                    self.pageLoaded({ index: index, size: size, image: page.thumb }, callback);
                } else {
                    setTimeout(function () {
                        self.loadPage(index, size, callback);
                    }, 300);
                }
            } else {
                // Pick tier source. srcHigh is loaded when the requested
                // texture size is at the largest tier; otherwise fall back
                // to src. Each tier is cached separately on the page.
                const useHigh = page.srcHigh && size >= self.options.pageTextureLarge * 0.9;
                const tierKey = useHigh ? 'imgHigh' : 'img';
                const tierLoadedKey = useHigh ? 'imgHighLoaded' : 'imgLoaded';
                let tierUrl = useHigh ? page.srcHigh : page.src;

                if (!page[tierKey] && tierUrl) {
                    if (self.options.matchProtocol !== false) {
                        const currentProtocol = location.protocol;
                        if (!tierUrl.startsWith(currentProtocol)) {
                            tierUrl = tierUrl.replace(/^https?:/, currentProtocol);
                            if (useHigh) page.srcHigh = tierUrl;
                            else page.src = tierUrl;
                        }
                    }

                    if (self.options.viewMode == 'webgl') {
                        self.fetchAndCacheImage(tierUrl).then((imageBitmap) => {
                            page[tierKey] = imageBitmap;
                            page[tierLoadedKey] = true;
                            page.width = imageBitmap.width;
                            page.height = imageBitmap.height;
                            self.pageLoaded(
                                {
                                    index: index,
                                    size: size,
                                    imageBitmap: imageBitmap,
                                },
                                callback
                            );
                        });
                    } else {
                        page[tierKey] = new Image();
                        page[tierKey].decoding = 'async';
                        page[tierKey].setAttribute('data-id', index);

                        page[tierKey].onload = function () {
                            page[tierLoadedKey] = true;
                            self.pageLoaded(
                                {
                                    index: index,
                                    size: size,
                                    image: page[tierKey],
                                },
                                callback
                            );
                        };
                        page[tierKey].src = tierUrl;
                    }
                } else if (page[tierLoadedKey]) {
                    if (self.options.viewMode == 'webgl') {
                        self.pageLoaded({ index: index, size: size, imageBitmap: page[tierKey] }, callback);
                    } else {
                        self.pageLoaded({ index: index, size: size, image: page[tierKey] }, callback);
                    }
                } else {
                    setTimeout(function () {
                        self.loadPage(index, size, callback);
                    }, 300);
                }
            }
        }
    }

    pageLoaded(page, callback) {
        callback.call(this, page, callback);

        if (this.options.loadAllPages && page.index < this.options.numPages - 1) {
            this.loadPage(page.index + 1, page.size, function () {});
        }

        if (this.searchingString) {
            this.mark(this.searchingString, true);
        }
    }

    loadPageFromPdf(pageIndex, size, callback) {
        size = size || this.options.pageTextureLarge;
        this.pdfService.renderBookPage(pageIndex, size, callback);
    }

    getString(name) {
        return this.options.strings[name];
    }

    async mark(str) {
        await this.loadScript(FLIPBOOK.markSrc, 'Mark');

        this.markedStr = str;
        var textLayer = this.wrapper.querySelectorAll('.textLayer');

        var nodesToMark = Array.from(textLayer).filter(function (node) {
            var markedData = node.getAttribute('data-marked');
            return !(markedData && markedData.split(',').includes(str));
        });

        if (nodesToMark.length) {
            var instance = new Mark(nodesToMark);
            instance.nodes = nodesToMark;

            this.markInstances = this.markInstances || [];
            this.markInstances.push(instance);

            instance.unmark({
                className: 'mark-search',
                done: function () {
                    instance.mark(str, {
                        acrossElements: true,
                        separateWordSearch: false,
                        className: 'mark-blue mark-search',
                        done: function () {
                            nodesToMark.forEach(function (node) {
                                var markedData = node.getAttribute('data-marked') || '';
                                var markedArray = markedData ? markedData.split(',') : [];
                                if (!markedArray.includes(str)) {
                                    markedArray.push(str);
                                    node.setAttribute('data-marked', markedArray.join(','));
                                }
                            });
                        },
                    });
                },
            });
        }
    }

    unmark() {
        this.searchingString = null;
        this.markedStr = null;

        this.markInstances = this.markInstances || [];

        if (this.markInstances.length) {
            this.markInstances.forEach(function (instance) {
                instance.unmark({
                    className: 'mark-search',
                    done: function () {
                        instance.nodes.forEach(function (node) {
                            node.removeAttribute('data-marked');
                        });
                    },
                });
            });

            this.markInstances = [];
        }
    }

    toggleSound(value) {
        var o = this.options;
        if (typeof value != 'undefined') o.sound = value;
        else o.sound = !o.sound;
        if (this.backgroundMusic) {
            const tiedToAutoplay = o.backgroundMusicOnAutoplay && o.btnAutoplay?.enabled;
            const shouldPlay = o.sound && (!tiedToAutoplay || this.autoplay);
            shouldPlay ? this.backgroundMusic.play() : this.backgroundMusic.pause();
        }
        this.toggleIcon(this.btnSound, o.sound);
    }

    toggleIcon(btn, val) {
        if (!btn) return;
        if (btn.$iconAlt) {
            if (val) {
                btn.$iconAlt.classList.add('flipbook-hidden');
                btn.$icon.classList.remove('flipbook-hidden');
            } else {
                btn.$iconAlt.classList.remove('flipbook-hidden');
                btn.$icon.classList.add('flipbook-hidden');
            }
        } else {
            var prev = val ? btn.iconAlt : btn.icon;
            var curr = val ? btn.icon : btn.iconAlt;

            btn.find('.' + prev)
                .removeClass(prev)
                .addClass(curr);
        }
    }

    scrollPageIntoView(obj) {
        let targetPage = obj.pageNumber;

        if (this.options.doublePage) {
            targetPage = 2 * targetPage - 1;
        }

        this.goToPage(targetPage);
    }

    loadScript(src, globalVariable) {
        if (src.indexOf('?ver') === -1) src += `?ver=${FLIPBOOK.version}`;

        FLIPBOOK.scripts = FLIPBOOK.scripts || {};

        const isGlobalVariableDefined = (name) => {
            return name.split('.').reduce((acc, part) => acc && acc[part], window) !== undefined;
        };

        return new Promise((resolve, reject) => {
            if (globalVariable && isGlobalVariableDefined(globalVariable)) return resolve();

            const scriptData = FLIPBOOK.scripts[src];
            if (scriptData) {
                if (scriptData.loaded) {
                    return resolve();
                } else {
                    scriptData.promises.push({ resolve, reject });
                    return;
                }
            }

            FLIPBOOK.scripts[src] = { loaded: false, promises: [{ resolve, reject }] };

            let script = document.createElement('script');
            script.async = true;
            script.src = src;

            script.onload = script.onreadystatechange = function (_, isAbort) {
                if (!isAbort && (!script.readyState || /loaded|complete/.test(script.readyState))) {
                    script.onload = script.onreadystatechange = null;
                    FLIPBOOK.scripts[src].loaded = true;
                    FLIPBOOK.scripts[src].promises.forEach((p) => p.resolve());
                }
            };

            script.onerror = (error) => {
                FLIPBOOK.scripts[src].promises.forEach((p) => p.reject(error));
                FLIPBOOK.scripts[src] = undefined;
            };

            document.head.appendChild(script);
        });
    }

    async initGoogleAnalytics() {
        if (!document.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${this.gaCode}"]`)) {
            return new Promise((resolve, reject) => {
                var script = document.createElement('script');
                script.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=' + this.gaCode);
                const self = this;
                script.async = 1;
                script.onload = function () {
                    window.dataLayer = window.dataLayer || [];
                    function gtag() {
                        dataLayer.push(arguments);
                    }
                    const inIframe = window.self !== window.top;
                    gtag('js', new Date());
                    gtag('config', self.gaCode, {
                        transport_type: 'beacon',
                        page_location: window.location.origin + window.location.pathname,
                        ...(inIframe && {
                            storage: 'none',
                            client_id: crypto.randomUUID(),
                        }),
                    });
                    resolve();
                };
                script.onerror = function () {
                    reject(new Error('Google Analytics script failed to load'));
                };
                document.body.appendChild(script);
            });
        } else {
            return Promise.resolve();
        }
    }

    async createBook() {
        var self = this;
        var options = this.options;

        if (this.options.searchOnStart) {
            this.options.btnSearch.enabled = true;
        }

        this.setLoadingProgress(0.9);

        if (this.options.viewMode === 'webgl') {
            await this.loadScript(FLIPBOOK.threejsSrc, 'THREE');
            const scripts = [this.loadScript(FLIPBOOK.flipbookWebGlSrc, 'FLIPBOOK.BookWebGL')];
            if (!this.options.pdfMode && this.options.pages && this.options.pages.every(function(p) { return !p.src; })) {
                scripts.push(this.loadScript(FLIPBOOK.html2canvasSrc, 'html2canvas'));
            }
            await Promise.all(scripts);
        } else if (this.options.viewMode === 'swipe') {
            await Promise.all([
                this.loadScript(FLIPBOOK.flipbookPanZoomSrc, 'FLIPBOOK.PanZoom'),
                this.loadScript(FLIPBOOK.flipBookSwipeSrc, 'FLIPBOOK.BookSwipe'),
            ]);
        } else if (this.options.viewMode === 'scroll') {
            await this.loadScript(FLIPBOOK.flipBookScrollSrc, 'FLIPBOOK.BookScroll');
        } else {
            await Promise.all([
                this.loadScript(FLIPBOOK.flipbookPanZoomSrc, 'FLIPBOOK.PanZoom'),
                this.loadScript(FLIPBOOK.flipbookBook3Src, 'FLIPBOOK.Book3'),
            ]);
        }

        window.define = this.define;

        this.setLoadingProgress(1);

        this.options.pagesOriginal = this.options.pages;

        if (this.options.doublePage && this.options.pages.length > 2) {
            var p = this.options.pages[0];
            var left;
            var right;
            p.title = 1;
            var newArr = [p];

            var numPages = this.options.pages.length;

            for (var i = 1; i <= numPages - 2; i++) {
                p = this.options.pages[i];
                left = {
                    src: p.src,
                    thumb: p.thumb,
                    title: 2 * i,
                    htmlContent: p.htmlContent,
                    json: p.json,
                    side: 'left',
                };
                right = {
                    src: p.src,
                    thumb: p.thumb,
                    title: 2 * i + 1,
                    htmlContent: p.htmlContent,
                    json: p.json,
                    side: 'right',
                };
                newArr.push(left);
                newArr.push(right);
            }

            p = this.options.pages[this.options.pages.length - 1];
            p.title = this.options.pages.length;

            if (this.options.backCover) {
                newArr.push(p);
            } else {
                left = {
                    src: p.src,
                    thumb: p.thumb,
                    title: 2 * i,
                    htmlContent: p.htmlContent,
                    json: p.json,
                    side: 'left',
                };
                right = {
                    src: p.src,
                    thumb: p.thumb,
                    title: 2 * i + 1,
                    htmlContent: p.htmlContent,
                    json: p.json,
                    side: 'right',
                };
                newArr.push(left);
                newArr.push(right);
            }
            this.options.pages = newArr;
        }

        this.addPageNames();

        var unlockedSet = this.getPreviewCut() ? null : this.parsePageSpec(this.options.previewPages);
        if (unlockedSet) {
            this.options.pages.forEach(function (pg, i) {
                if (unlockedSet.has(i + 1)) return;
                pg.locked = true;
                // Image pages: render the low-res thumbnail instead of the full source.
                // (PDF pages have no src and are rendered low-res by the pdf service.)
                if (pg.src && pg.thumb) {
                    pg.src = pg.thumb;
                    pg.srcHigh = null;
                }
            });
        }

        this.options.numPages = this.options.pages.length;
        if (this.options.numPages % 2 != 0 && !this.options.singlePageMode) {
            this.options.backCover = false;
        }
        if (!this.options.cover) {
            this.options.backCover = !this.options.backCover;
        }

        // Free plan branding watermark
        if (this.options.wm) {
            var step = this.options.doublePage ? 1 : 2;
            var lastIdx = this.options.pages.length - 1;
            for (var wi = 0; wi < this.options.pages.length; wi += step) {
                var isDark = Math.random() < 0.5;
                var logo = isDark ? 'logo_dark.png' : 'logo_light.png';
                var wmClass = isDark ? 'r3d-wm r3d-wm-dark' : 'r3d-wm r3d-wm-light';
                var watermark = '<a class="' + wmClass + '" href="https://real3dflipbook.com?ref=shopify" target="_blank"><img src="assets/images/' + logo + '"></a>';
                this.options.pages[wi].htmlContent = (this.options.pages[wi].htmlContent || '') + watermark;
            }
            // Always show on last page
            if (lastIdx % step !== 0) {
                var isDark = Math.random() < 0.5;
                var logo = isDark ? 'logo_dark.png' : 'logo_light.png';
                var wmClass = isDark ? 'r3d-wm r3d-wm-dark' : 'r3d-wm r3d-wm-light';
                var watermark = '<a class="' + wmClass + '" href="https://real3dflipbook.com?ref=shopify" target="_blank"><img src="assets/images/' + logo + '"></a>';
                this.options.pages[lastIdx].htmlContent = (this.options.pages[lastIdx].htmlContent || '') + watermark;
            }
        }

        this.options.pages.forEach((page) => {
            const content = page.htmlContent || '';
            const container = document.createElement('div');
            container.className = 'flipbook-page-html';
            if (!this.options.pdfUrl && !page.src) {
                container.classList.add('flipbook-page-html-only');
            }

            const innerDiv = document.createElement('div');
            innerDiv.className = 'htmlContent';
            innerDiv.innerHTML = content;

            container.appendChild(innerDiv);

            page.htmlContent = container;
        });

        if (this.options.viewMode == 'webgl') {
            var bookOptions = this.options;
            bookOptions.scroll = this.scroll;
            bookOptions.parent = this;
            this.Book = new FLIPBOOK.BookWebGL(this.book, this, bookOptions);
            this.webglMode = true;

            this.initSound();
        } else if (this.options.viewMode == 'swipe') {
            this.Book = new FLIPBOOK.BookSwipe(this.book, this.bookLayer, this, options);
        } else if (this.options.viewMode == 'scroll') {
            this.options.singlePageMode = true;
            this.Book = new FLIPBOOK.BookScroll(this.book, this.bookLayer, this, options);
        } else {
            if (this.options.viewMode != '2d') {
                this.options.viewMode = '3d';
            }

            this.Book = new FLIPBOOK.Book3(this.book, this, options);

            this.webglMode = false;
            this.initSound();

            // High-res zoom overlay for book3 modes (3d / 2d). Bypasses
            // WebKit's cached-layer-raster blur on transform-scale by
            // showing CSS-laid-out images instead, only while zoomed > 1.
            // Disabled — PanZoom now handles scroll-driven pan natively.
            // this.zoomLayer = new FLIPBOOK.ZoomLayer(this);
        }
        this.initSwipe();

        this.initListeners();

        this.Book.enable();

        this.book.classList.remove('flipbook-hidden');

        if (!options.cover && options.startPage < 2) options.startPage = 2;

        this.tocCreated = false;

        if (!this.options.pdfMode) {
        }

        this.createMenu();

        if (!this.options.sound) this.toggleSound(false);

        this.resize();

        this.onZoom(this.options.zoomMin);

        if (this.options.pages.length == 1) {
            this.rightToLeft = false;
        }

        FLIPBOOK.books = FLIPBOOK.books || {};
        FLIPBOOK.books[self.id] = self.Book;

        this.createLogo();
        this.onBookCreated();
    }

    async destroy() {
        if (this.pdfService) {
            if (this.pdfService.pages) {
                this.pdfService.pages.forEach(function (page) {
                    if (page.renderingTasks) {
                        page.renderingTasks.forEach(function (task) {
                            task.cancel();
                        });
                    }
                });
            }

            if (this.pdfService.pdfDocument) {
                this.pdfService.pdfDocument.cleanup();
                await this.pdfService.pdfDocument.destroy();
                this.pdfService.pdfDocument = null;
                this.pdfService = null;
            }
        }

        if (!this.bookCreated) {
            setTimeout(this.destroy.bind(this), 100);
            return;
        }

        this.Book.destroy();

        if (this.autoplayTimer) clearInterval(this.autoplayTimer);
        this.setBookmarkedPages([]);

        delete FLIPBOOK.books[this.id];
        this.Book = null;
        this.initPdf = null;
        this.createMenu = null;
        this.createBook = null;
        this.options = null;
        this.resizeObserver.disconnect();
        this.resizeObserver.disconnect();
        this.removeEventListeners();
    }

    initNotes() {
        this.noteService = new FLIPBOOK.Notes(this);
        const self = this;
        window.addEventListener('r3d-update-note-visibility', function (e) {
            self.options.noteTypes.forEach(function (noteType) {
                if (e.detail.id == noteType.id) {
                    noteType.enabled = e.detail.enabled;
                }
            });
            self.noteService.updateNoteVisibility();
        });
    }

    createTooltip() {
        this.tooltip = new FLIPBOOK.Tooltip();
        this.wrapper.appendChild(this.tooltip.domElement);
    }

    showTooltip(params) {
        this.tooltip.show(params);
    }

    hideTooltip() {
        this.tooltip.hide();
    }

    addPageItems() {
        }

    addPageCaptions() {
        const pages = this.options.pages;
        for (let key in pages) {
            let page = pages[key];
            page.htmlContent = page.htmlContent || '';

            if (typeof page.caption == 'string' && page.caption != '') {
                const icon = this.createSVGIcon('camera');
                page.htmlContent += '<div class="flipbook-page-caption-btn">';
                page.htmlContent += icon.outerHTML;
                page.htmlContent += '</div>';

                const caption = '<div class="flipbook-page-caption">' + page.caption + '</div>';
                page.htmlContent += caption;
            }
        }
    }

    initHotspotTooltip() {
        const self = this;
        const strings = this.options.strings || {};
        const addToCartLabel = strings.addToCart || 'Add to cart';
        const viewProductLabel = strings.viewProduct || 'View product';

        // Create shared tooltip element on the wrapper (outside page scaling)
        const tooltip = document.createElement('div');
        tooltip.className = 'flipbook-hotspot-tooltip';
        tooltip.style.position = 'absolute';
        this.wrapper.appendChild(tooltip);
        this.hotspotTooltip = tooltip;
        this.hotspotTooltipTarget = null;

        const buildContent = (data, target, tooltipWidth) => {
            tooltip.style.width = tooltipWidth + 'px';

            // Simple text tooltip
            if (typeof data === 'string') {
                tooltip.className = 'flipbook-hotspot-tooltip flipbook-hotspot-tooltip-text';
                tooltip.innerHTML = `<div class="flipbook-hotspot-tooltip-body">${data}</div>`;
                return;
            }

            // Rich card tooltip
            tooltip.className = 'flipbook-hotspot-tooltip flipbook-hotspot-tooltip-card';

            // Each field defaults to visible; merchants can opt-out per-hotspot
            // via the page editor's "Show in tooltip" checkboxes which set
            // data.show[key] = false.
            const isShown = (key) => data.show?.[key] !== false;

            const imgHtml = (isShown('image') && data.image)
                ? `<img class="flipbook-hotspot-tooltip-image" src="${data.image}" alt="${data.title || ''}">`
                : '';

            const titleHtml = (isShown('title') && data.title)
                ? `<div class="flipbook-hotspot-tooltip-title">${data.title}</div>`
                : '';

            const descHtml = (isShown('description') && data.description)
                ? `<div class="flipbook-hotspot-tooltip-description">${data.description}</div>`
                : '';

            const comparePriceHtml = data.comparePrice
                ? `<span class="compare-price">${data.comparePrice}</span>`
                : '';

            const priceHtml = (isShown('price') && data.price)
                ? `<div class="flipbook-hotspot-tooltip-price">${data.price}${comparePriceHtml}</div>`
                : '';

            // Variant selector — one <select> with all variants. On change,
            // the listener below rewrites the cart link's variant id and the
            // displayed price/compare-at.
            let variantsHtml = '';
            if (isShown('variants') && Array.isArray(data.variants) && data.variants.length > 1) {
                const opts = data.variants.map((v) => {
                    const selected = v.id === data.variantId ? ' selected' : '';
                    return `<option value="${v.id}" data-price="${v.price || ''}" data-compare="${v.comparePrice || ''}"${selected}>${v.title}</option>`;
                }).join('');
                variantsHtml = `<select class="flipbook-hotspot-tooltip-variant-select" aria-label="Variant">${opts}</select>`;
            }

            const hasCart = !!(data.cartUrl || data.variantId);
            const qty = data.quantity || 1;

            let qtyHtml = '';
            if (hasCart && isShown('qty') && data.showQuantity) {
                qtyHtml = `<div class="flipbook-hotspot-tooltip-qty">
                    <button type="button" class="flipbook-hotspot-tooltip-qty-btn" data-qty-delta="-1">&minus;</button>
                    <span class="flipbook-hotspot-tooltip-qty-value">${qty}</span>
                    <button type="button" class="flipbook-hotspot-tooltip-qty-btn" data-qty-delta="1">+</button>
                </div>`;
            }

            const showCart = isShown('addToCart') && hasCart;
            const showView = isShown('viewProduct') && !!data.url;
            let actionsHtml = '';
            if (showCart || showView) {
                actionsHtml = '<div class="flipbook-hotspot-tooltip-actions">';
                if (showCart) {
                    const cartId = data.variantId || '';
                    const cartBase = data.cartUrl || '/cart/add?id=' + cartId;
                    const isAddToCart = cartBase.indexOf('addtocart:') === 0;
                    const cartHref = isAddToCart ? cartBase : cartBase + '&quantity=' + qty;
                    actionsHtml += `<a href="${cartHref}" target="${target}" class="flipbook-hotspot-tooltip-btn flipbook-hotspot-tooltip-btn-primary" data-cart-base="${cartBase}" data-variant-id="${cartId}">${addToCartLabel}</a>`;
                }
                if (showView) {
                    actionsHtml += `<a href="${data.url}" target="${target}" class="flipbook-hotspot-tooltip-btn flipbook-hotspot-tooltip-btn-secondary">${viewProductLabel}</a>`;
                }
                actionsHtml += '</div>';
            }

            tooltip.innerHTML = `${imgHtml}
                <div class="flipbook-hotspot-tooltip-body">
                    ${titleHtml}
                    ${descHtml}
                    ${variantsHtml}
                    ${priceHtml}
                    ${qtyHtml}
                    ${actionsHtml}
                </div>`;

            // Wire up variant select → rewrite cart link + price display.
            const variantSelect = tooltip.querySelector('.flipbook-hotspot-tooltip-variant-select');
            if (variantSelect) {
                variantSelect.addEventListener('change', () => {
                    const opt = variantSelect.options[variantSelect.selectedIndex];
                    const newId = opt.value;
                    const newPrice = opt.getAttribute('data-price') || '';
                    const newCompare = opt.getAttribute('data-compare') || '';
                    const cartBtn = tooltip.querySelector('.flipbook-hotspot-tooltip-btn-primary[data-variant-id]');
                    if (cartBtn) {
                        cartBtn.setAttribute('data-variant-id', newId);
                        const cartBase = cartBtn.getAttribute('data-cart-base') || '';
                        if (cartBase.indexOf('addtocart:') === 0) {
                            cartBtn.setAttribute('href', cartBase);
                        } else {
                            const replaced = cartBase.replace(/(\bid=)\d+/, `$1${newId}`);
                            const sep = replaced.includes('?') ? '&' : '?';
                            cartBtn.setAttribute('href', `${replaced}${sep}quantity=${data.quantity || 1}`);
                        }
                    }
                    const priceEl = tooltip.querySelector('.flipbook-hotspot-tooltip-price');
                    if (priceEl && newPrice) {
                        priceEl.innerHTML = `${newPrice}${newCompare ? `<span class="compare-price">${newCompare}</span>` : ''}`;
                    }
                });
            }
        };

        const positionTooltip = (hotspot) => {
            // Use dot if present (hotspot type), otherwise use the element itself (link/spotlight)
            const ref = hotspot.querySelector('.flipbook-hotspot-dot') || hotspot;

            const wrapperRect = self.wrapper.getBoundingClientRect();
            const dotRect = ref.getBoundingClientRect();

            // Dot center relative to wrapper
            const dotCenterX = dotRect.left + dotRect.width / 2 - wrapperRect.left;
            const dotCenterY = dotRect.top + dotRect.height / 2 - wrapperRect.top;
            const wrapperW = wrapperRect.width;
            const wrapperH = wrapperRect.height;

            const tooltipW = tooltip.offsetWidth;
            const tooltipH = tooltip.offsetHeight;
            const gap = 0;

            tooltip.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');

            let posX, posY, posClass;

            const spaceAbove = dotCenterY;
            const spaceBelow = wrapperH - dotCenterY;
            const preferAbove = dotCenterY > wrapperH / 2;

            if (preferAbove && spaceAbove > tooltipH + gap) {
                posClass = 'tooltip-top';
                posX = dotCenterX - tooltipW / 2;
                posY = dotCenterY - dotRect.height / 2 - gap - tooltipH;
            } else if (!preferAbove && spaceBelow > tooltipH + gap) {
                posClass = 'tooltip-bottom';
                posX = dotCenterX - tooltipW / 2;
                posY = dotCenterY + dotRect.height / 2 + gap;
            } else if (spaceAbove > tooltipH + gap) {
                posClass = 'tooltip-top';
                posX = dotCenterX - tooltipW / 2;
                posY = dotCenterY - dotRect.height / 2 - gap - tooltipH;
            } else if (spaceBelow > tooltipH + gap) {
                posClass = 'tooltip-bottom';
                posX = dotCenterX - tooltipW / 2;
                posY = dotCenterY + dotRect.height / 2 + gap;
            } else if (dotCenterX > wrapperW / 2) {
                posClass = 'tooltip-left';
                posX = dotCenterX - dotRect.width / 2 - gap - tooltipW;
                posY = dotCenterY - tooltipH / 2;
            } else {
                posClass = 'tooltip-right';
                posX = dotCenterX + dotRect.width / 2 + gap;
                posY = dotCenterY - tooltipH / 2;
            }

            // Clamp within wrapper bounds
            posX = Math.max(4, Math.min(posX, wrapperW - tooltipW - 4));
            posY = Math.max(4, Math.min(posY, wrapperH - tooltipH - 4));

            tooltip.classList.add(posClass);
            tooltip.style.left = posX + 'px';
            tooltip.style.top = posY + 'px';
        };

        const showTooltip = (hotspot, mouseEvent) => {
            const dataStr = hotspot.getAttribute('data-tooltip-data');
            if (!dataStr) return;

            const isLink = hotspot.classList.contains('flipbook-page-item-link');
            const isNewTarget = self.hotspotTooltipTarget !== hotspot;

            try {
                if (isNewTarget) {
                    // Try parsing as JSON (rich card); if it fails, treat as plain text
                    let data;
                    try { data = JSON.parse(dataStr); } catch (e) { data = dataStr; }

                    const target = hotspot.dataset.linkTarget || '_blank';
                    const tooltipWidth = parseInt(hotspot.dataset.tooltipWidth) || self.options.hotspotTooltipWidth || 220;
                    buildContent(data, target, tooltipWidth);
                    self.hotspotTooltipTarget = hotspot;

                    // Show invisible first to measure, then position, then reveal
                    tooltip.style.visibility = 'hidden';
                    tooltip.style.opacity = '0';
                    tooltip.classList.add('visible');
                }

                if (isLink && mouseEvent) {
                    positionTooltipAtMouse(mouseEvent);
                } else if (isNewTarget) {
                    if (tooltipMouseMode) {
                        tooltip.style.translate = '';
                        tooltip.style.willChange = '';
                        tooltipMouseMode = false;
                    }
                    positionTooltip(hotspot);
                }

                if (isNewTarget) {
                    tooltip.style.visibility = '';
                    tooltip.style.opacity = '';
                }
            } catch (e) {}
        };

        let tooltipMouseMode = false;
        const positionTooltipAtMouse = (e) => {
            if (!tooltipMouseMode) {
                tooltip.style.left = '0px';
                tooltip.style.top = '0px';
                tooltip.style.willChange = 'transform';
                tooltipMouseMode = true;
            }
            const wrapperRect = self.wrapper.getBoundingClientRect();
            const mouseX = e.clientX - wrapperRect.left;
            const mouseY = e.clientY - wrapperRect.top;
            const wrapperW = wrapperRect.width;
            const wrapperH = wrapperRect.height;
            const tooltipW = tooltip.offsetWidth;
            const tooltipH = tooltip.offsetHeight;
            const gap = 16;

            tooltip.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');

            let posX = mouseX - tooltipW / 2;
            let posY;

            if (mouseY > wrapperH / 2) {
                posY = mouseY - tooltipH - gap;
                tooltip.classList.add('tooltip-top');
            } else {
                posY = mouseY + gap;
                tooltip.classList.add('tooltip-bottom');
            }

            posX = Math.max(4, Math.min(posX, wrapperW - tooltipW - 4));
            posY = Math.max(4, Math.min(posY, wrapperH - tooltipH - 4));

            tooltip.style.translate = `${posX}px ${posY}px`;
        };

        const hideTooltip = () => {
            tooltip.classList.remove('visible');
            self.hotspotTooltipTarget = null;
        };

        // Mouse hover
        this.wrapper.addEventListener('mouseover', (e) => {
            const hotspot = e.target.closest('.flipbook-hotspot');
            if (hotspot) {
                showTooltip(hotspot, e);
                return;
            }
            // Allow hovering over the tooltip itself
            if (e.target.closest('.flipbook-hotspot-tooltip')) return;
        });

        this.wrapper.addEventListener('mouseout', (e) => {
            const hotspot = e.target.closest('.flipbook-hotspot');
            const isTooltip = e.target.closest('.flipbook-hotspot-tooltip');
            if (!hotspot && !isTooltip) return;

            // Check if moving to the tooltip or to the hotspot
            const relTarget = e.relatedTarget;
            if (relTarget) {
                if (relTarget.closest('.flipbook-hotspot-tooltip') === tooltip) return;
                if (relTarget.closest('.flipbook-hotspot') === self.hotspotTooltipTarget) return;
            }

            hideTooltip();
        });

        // Follow mouse on link-type items
        this.wrapper.addEventListener('mousemove', (e) => {
            const hotspot = e.target.closest('.flipbook-hotspot');
            if (hotspot && hotspot === self.hotspotTooltipTarget && hotspot.classList.contains('flipbook-page-item-link')) {
                positionTooltipAtMouse(e);
            }
        });

        // Quantity +/- buttons
        tooltip.addEventListener('click', (e) => {
            const qtyBtn = e.target.closest('[data-qty-delta]');
            if (!qtyBtn) return;
            e.preventDefault();
            e.stopPropagation();

            const delta = parseInt(qtyBtn.dataset.qtyDelta);
            const valueEl = tooltip.querySelector('.flipbook-hotspot-tooltip-qty-value');
            if (!valueEl) return;

            let qty = Math.max(1, parseInt(valueEl.textContent) + delta);
            valueEl.textContent = qty;

            // Update cart link quantity
            const cartBtn = tooltip.querySelector('[data-cart-base]');
            if (cartBtn) {
                const base = cartBtn.dataset.cartBase;
                cartBtn.href = base + '&quantity=' + qty;
            }
        });

        // Touch / click toggle (only for hotspot dots, not links)
        this.wrapper.addEventListener('click', (e) => {
            // Let tooltip action links and qty buttons work
            if (e.target.closest('.flipbook-hotspot-tooltip-btn')) return;
            if (e.target.closest('[data-qty-delta]')) return;


            const hotspot = e.target.closest('.flipbook-hotspot');
            if (hotspot) {
                // Links navigate normally — don't intercept their click
                const isLink = hotspot.classList.contains('flipbook-page-item-link');
                if (isLink) {
                    hideTooltip();
                    return;
                }

                // Hotspot with URL — navigate on click
                const hsUrl = hotspot.dataset.url;
                const hsPage = hotspot.dataset.page;
                if (hsUrl) {
                    const target = hotspot.dataset.linkTarget || '_blank';
                    window.open(hsUrl, target);
                    hideTooltip();
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                } else if (hsPage) {
                    self.goToPage(parseInt(hsPage));
                    hideTooltip();
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                if (self.hotspotTooltipTarget === hotspot) {
                    hideTooltip();
                } else {
                    showTooltip(hotspot);
                }
                e.preventDefault();
                e.stopPropagation();
            } else if (!e.target.closest('.flipbook-hotspot-tooltip')) {
                // Clicked outside hotspot and tooltip — close
                if (self.hotspotTooltipTarget) hideTooltip();
            }
        });
    }

    spotlight(url, title, description) {
        }

    showPreviewEndModal() {
        const o = this.options;

        let overlay = this.previewEndOverlay;
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'flipbook-preview-modal-overlay';

            const card = document.createElement('div');
            card.className = 'flipbook-preview-modal';

            const closeButton = document.createElement('button');
            closeButton.className = 'flipbook-preview-modal-close';
            closeButton.innerHTML = `
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			`;
            closeButton.onclick = () => this.hidePreviewEndModal();

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) this.hidePreviewEndModal();
            });

            const content = document.createElement('div');
            content.className = 'flipbook-preview-modal-content';

            card.appendChild(closeButton);
            card.appendChild(content);
            overlay.appendChild(card);
            this.wrapper.appendChild(overlay);

            this.previewEndOverlay = overlay;
            this.previewEndContent = content;
        }

        this.previewEndContent.innerHTML =
            o.previewMessage || '<div class="flipbook-preview-modal-default">' + this.getString('endOfPreview') + '</div>';
        overlay.classList.remove('flipbook-hidden');

        if (this._previewEndEsc) document.removeEventListener('keydown', this._previewEndEsc);
        this._previewEndEsc = (e) => {
            if (e.key === 'Escape') this.hidePreviewEndModal();
        };
        document.addEventListener('keydown', this._previewEndEsc);
    }

    hidePreviewEndModal() {
        if (this.previewEndOverlay) this.previewEndOverlay.classList.add('flipbook-hidden');
        if (this._previewEndEsc) {
            document.removeEventListener('keydown', this._previewEndEsc);
            this._previewEndEsc = null;
        }
    }

    showMenu() {
        this.menuTop.classList.remove('flipbook-hidden');
        this.menuBottom.classList.remove('flipbook-hidden');
    }

    hideMenu() {
        this.menuTop.classList.add('flipbook-hidden');
        this.menuBottom.classList.add('flipbook-hidden');
    }

    showCenterExpandButton() {
        if (!this.centerButtonExpand) {
            const btn = document.createElement('div');
            btn.className = 'flipbook-center-btn-expand';
            const icon = this.createSVGIcon('expand');
            btn.appendChild(icon);
            btn.addEventListener('click', () => {
                this.toggleExpand();
            });
            this.wrapper.appendChild(btn);
            this.centerButtonExpand = btn;
        }
        this.centerButtonExpand.classList.remove('flipbook-hidden');
    }

    hideCenterExpandButton() {
        if (this.centerButtonExpand) this.centerButtonExpand.classList.add('flipbook-hidden');
    }

    toggleMinimalView() {
        if (this.wrapperW < this.options.minimalViewBreakpoint && !this.lightbox && !this.fullscreenActive) {
            if (!this.minimalViewActive) {
                this.hideMenu();
                this.showCenterExpandButton();
                this.minimalViewActive = true;
                this.goToPage(1, true);
                this.updateBookLayerSize();
            }
        } else if (this.minimalViewActive) {
            this.showMenu();
            this.hideCenterExpandButton();
            this.minimalViewActive = false;
            this.updateBookLayerSize();
        }
    }

    updateCompactMode() {
        if (!this.elem) return;
        var threshold = this.options.compactBreakpoint || 600;
        var width = this.elem.getBoundingClientRect().width;
        var isCompact = width > 0 && width < threshold;
        if (isCompact !== this._compactActive) {
            this._compactActive = isCompact;
            this.elem.classList.toggle('flipbook-compact', isCompact);
        }
    }

    resizeContainer() {
        if (this.options.minimalView) this.toggleMinimalView();
        if (!this.lightbox && !this.options.fullscreen && !this.elemStatic) {
            var pageRatio = this.pageW / this.pageH;
            var bookRatio = 2 * pageRatio;
            let width = this.elem.getBoundingClientRect().width;
            let ratio;

            if (this.options.isMobile && width < this.options.responsiveViewTreshold) {
                ratio = pageRatio;
            } else {
                ratio = bookRatio;
            }

            var newHeight = width / (this.options.containerRatio || ratio);

            // newHeight += this.wrapper.clientHeight - this.bookLayer.clientHeight /* - 2 * this.bookVerticalPadding */;
            // newHeight += this.bottomMenuH;
            // newHeight += this.topMenuH;
            if (this.elemH != newHeight) {
                this.elemH = newHeight;

                this.elem.style.height = newHeight + 'px';
            }
        }
        this.resize();
    }

    addEventListeners() {
        this.handleResize = () => this.resizeContainer();
        this.handleKeydown = (e) => {
            if (!this.Book.enabled) {
                return;
            }

            if (!this.options.lightBox && document.body.classList.contains('flipbook-overflow-hidden')) {
                return;
            }

            if (!this.fullscreenActive && document.body.classList.contains('flipbook-fullscreen')) {
                return;
            }

            if (
                !(this.options.arrowsAlwaysEnabledForNavigation && (e.keyCode == 37 || e.keyCode == 39)) &&
                (this.options.lightBox ||
                    this.fullscreenActive ||
                    (!this.options.arrowsDisabledNotFullscreen && !this.bodyHasVerticalScrollbar()))
            ) {
                return;
            }

            switch (e.keyCode) {
                case 37:
                    this.zoom > 1 ? this.moveBook('left') : this.prevPage();
                    break;
                case 38:
                    this.zoom > 1 ? this.moveBook('up') : this.nextPage();
                    break;
                case 39:
                    this.zoom > 1 ? this.moveBook('right') : this.nextPage();
                    break;
                case 33:
                    this.prevPage();
                    break;
                case 34:
                    this.nextPage();
                    break;
                case 36:
                    this.firstPage();
                    break;
                case 35:
                    this.lastPage();
                    break;
                case 40:
                    this.zoom > 1 ? this.moveBook('down') : this.prevPage();
                    break;
            }
            return false;
        };
        this.handleFs = () => this.handleFsChange();

        window.addEventListener('resize', this.handleResize);
        document.addEventListener('keydown', this.handleKeydown);

        document.addEventListener('MSFullscreenChange', this.handleFs);
        document.addEventListener('mozfullscreenchange', this.handleFs);
        document.addEventListener('webkitfullscreenchange', this.handleFs);
        document.addEventListener('fullscreenchange', this.handleFs);
    }

    removeEventListeners() {
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeydown);

        document.removeEventListener('MSFullscreenChange', this.handleFs);
        document.removeEventListener('mozfullscreenchange', this.handleFs);
        document.removeEventListener('webkitfullscreenchange', this.handleFs);
        document.removeEventListener('fullscreenchange', this.handleFs);
    }

    onBookCreated() {
        var o = this.options;

        var self = this;

        var root = document.documentElement;
        root.style.setProperty('--flipbook-link-color', this.options.linkColor);
        root.style.setProperty('--flipbook-link-color-hover', this.options.linkColorHover);
        root.style.setProperty('--flipbook-link-opacity', this.options.linkOpacity);

        this.elemStatic = getComputedStyle(this.elem).position == 'static';

        this.resizeContainer();

        this.addEventListeners();

        this.resizeObserver = new ResizeObserver((entries) => {
            self.resizeContainer();
            self.updateCompactMode();
        });

        this.resizeObserver.observe(this.elem);

        // Initial compact check
        this.updateCompactMode();

        this.resizeObserver2 = new ResizeObserver(() => {
            self.resize();
        });

        this.resizeObserver2.observe(this.bookLayer);

        this.playBgMusic();

        if (o.lightboxCloseOnBack) {
            window.onpopstate = function () {
                if (self.Book.enabled && self.lightbox && self.lightbox.lightboxOpened) {
                    if (!window.location.hash) {
                        self.lightbox.closeLightbox(true);
                    }
                }
            };
        }

        if (this.options.viewMode != 'scroll') {
            this.bookLayer.addEventListener(
                'wheel',
                function (e) {
                    if (e.ctrlKey) {
                        e.preventDefault();
                    }

                    if (!this.Book.enabled) return;

                    if (!this.options.lightBox && !this.fullscreenActive && !e.ctrlKey && !this.options.wheelZoomAlways) {
                        if (
                            this.options.wheelDisabledNotFullscreen ||
                            this.bodyHasVerticalScrollbar() ||
                            this.isIframe()
                        ) {
                            return;
                        }
                    }

                    const deltaX = e.deltaX || -e.wheelDeltaX || -e.detail;
                    const deltaY = e.deltaY || -e.wheelDeltaY || -e.detail;

                    if (Math.abs(deltaY) > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
                        e.preventDefault();
                        // Trackpad pinch fires wheel + ctrlKey at 30+/sec.
                        // Going through zoomIn/zoomOut with options.zoomTime
                        // animation lets each event cancel the previous
                        // animation before it completes (PanZoom._zoomAnim.
                        // stop() at start of each zoom call), so scale
                        // never actually advances. Skip animation for
                        // wheel-driven zoom — call zoomTo with time=0.
                        // Webgl already does this internally; matches.
                        const factor = deltaY > 0 ? 1 / this.options.zoomStep : this.options.zoomStep;
                        this.zoomTo(this.zoom * factor, 0, e);
                        return false;
                    }
                }.bind(this),
                { passive: false }
            );

            // Mac Safari trackpad pinch fires gesturestart/change/end
            // (Safari-specific) and may suppress the synthesized wheel
            // events that PanZoom's gesture-block preventDefaults. Wire
            // gesture events directly to main.zoomTo using e.scale (Safari's
            // pinch scale, 1 = no change). e.scale is relative to
            // gesturestart, so we capture this.zoom there as the baseline.
            let _pinchStartZoom = 1;
            this.bookLayer.addEventListener('gesturestart', function (e) {
                e.preventDefault();
                _pinchStartZoom = this.zoom;
            }.bind(this));
            this.bookLayer.addEventListener('gesturechange', function (e) {
                e.preventDefault();
                if (typeof e.scale !== 'number') return;
                this.zoomTo(_pinchStartZoom * e.scale, 0, e);
            }.bind(this));
            this.bookLayer.addEventListener('gestureend', (e) => e.preventDefault());
        }

        if (self.options.contentOnStart) {
            this.toggleToc(true);
        } else if (self.options.thumbnailsOnStart) {
            this.options.thumbsStyle = 'side';
            this.toggleThumbs(true);
        } else if (self.options.searchOnStart) {
            this.toggleSearch(true);
            if (typeof this.options.searchOnStart == 'string') {
                const input = this.thumbs.findInput;
                input.value = this.options.searchOnStart;
                const event = new KeyboardEvent('keyup', { bubbles: true });
                input.dispatchEvent(event);
            }
        }

        if (o.autoplayOnStart) {
            this.toggleAutoplay(true);
        }

        this.resize();
        this.Book.zoomTo(o.zoomMin);
        this.updateCurrentPage();

        this.goToPage(Number(o.startPage), true);

        if (o.onbookcreated) {
            o.onbookcreated.call(this);
        }
        this.bookCreated = true;
    }

    initSound() {
        if (this.options.flipSound && this.options.assets && this.options.assets.flipMp3) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
                try {
                    this._audioCtx = new AC();
                    fetch(this.options.assets.flipMp3)
                        .then((r) => r.arrayBuffer())
                        .then((buf) => this._audioCtx.decodeAudioData(buf))
                        .then((decoded) => { this._flipBuffer = decoded; })
                        .catch(() => {});

                    const unlock = () => {
                        if (this._audioCtx.state === 'suspended') {
                            this._audioCtx.resume().catch(() => {});
                        }
                    };
                    document.addEventListener('touchend', unlock, { once: true, capture: true });
                    document.addEventListener('click', unlock, { once: true, capture: true });
                } catch (e) {}
            }
        }

        if (this.options.backgroundMusic) {
            // Determine the URL
            let bgMusicUrl = null;

            // If it's a string (i.e., a custom URL)
            if (typeof this.options.backgroundMusic === 'string') {
                bgMusicUrl = this.options.backgroundMusic;
            }
            // If it's true/boolean and you have a default mp3 set up in assets
            else if (this.options.assets && this.options.assets.backgroundMp3) {
                bgMusicUrl = this.options.assets.backgroundMp3;
            }

            if (bgMusicUrl) {
                this.backgroundMusic = document.createElement('audio');
                this.backgroundMusic.preload = 'auto';
                this.backgroundMusic.autoplay = !(this.options.backgroundMusicOnAutoplay && this.options.btnAutoplay?.enabled);
                this.backgroundMusic.loop = true;

                var bgMusicSource = document.createElement('source');
                bgMusicSource.src = bgMusicUrl;
                bgMusicSource.type = 'audio/mpeg';
                this.backgroundMusic.appendChild(bgMusicSource);

                // Optionally, append to document to trigger playback on some browsers
                document.body.appendChild(this.backgroundMusic);
            }
        }
    }

    touchSwipe(element, callback) {
        let startX, startY, startTime;
        let lastX, lastY;
        let startDistance;
        let isSwiping = false;
        let isPinching = false;
        let fingerCount = 0;
        let touchStarted = false;

        function calculateDistance(touches) {
            if (touches.length < 2) {
                return 0;
            }
            let dx = touches[0].clientX - touches[1].clientX;
            let dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function calculateDirectionAndDistance(currentX, currentY) {
            return {
                distanceX: currentX - startX,
                distanceY: currentY - startY,
            };
        }

        function getTouchObject(e) {
            return e.type.includes('mouse') ? e : e.touches[0];
        }

        var self = this;
        function startHandler(e) {
            if (e.type === 'touchstart') {
                touchStarted = true;
            } else if (e.type === 'mousedown' && touchStarted) {
                return;
            } else if (e.target.tagName === 'A' || e.target.tagName === 'SPAN' || e.target.tagName === 'MARK') {
                self.trigger('disableIScroll');
                return;
            } else if (e.target.closest('.flipbook-page-html-only') && e.target.closest('p, h1, h2, h3, h4, h5, h6, span, li, td, th, dt, dd, label, blockquote, figcaption, a, button, input, select, textarea, [onclick]')) {
                self.trigger('disableIScroll');
                return;
            }
            self.trigger('enableIScroll');

            let touchObj = getTouchObject(e);
            startX = touchObj.clientX;
            startY = touchObj.clientY;
            startTime = new Date().getTime();
            isSwiping = true;
            fingerCount = e.touches ? e.touches.length : 1;
            callback(e, 'start', null, 0, 0, fingerCount);
            element.addEventListener('mousemove', moveHandler);
            element.addEventListener('touchmove', moveHandler, { passive: false });
        }

        function moveHandler(e) {
            let touchObj = getTouchObject(e);
            let { distanceX, distanceY } = calculateDirectionAndDistance(touchObj.clientX, touchObj.clientY);

            lastX = touchObj.clientX;
            lastY = touchObj.clientY;

            if (isSwiping && e.type === 'mousemove') {
                e.preventDefault();
                callback(e, 'move', distanceX, distanceY, 0, 1);
            } else if (e.touches && e.touches.length === 2) {
                e.preventDefault();
                let scale;
                if (typeof e.scale === 'number') {
                    scale = e.scale;
                } else {
                    let currentDistance = calculateDistance(e.touches);
                    if (!isPinching) {
                        isPinching = true;
                        startDistance = currentDistance;
                        scale = 1;
                    } else {
                        scale = currentDistance / startDistance;
                    }
                }

                if (isPinching) {
                    callback(e, 'pinch', scale, null, 0, 2);
                } else {
                    isPinching = true;
                    startDistance = calculateDistance(e.touches);
                    callback(e, 'pinchstart', scale, null, 0, 2);
                }
            } else if (e.touches && e.touches.length === 1) {
                // Don't preventDefault on 1-finger touchmove. Native
                // browser pan is already suppressed by the bookLayer's
                // touch-action: none (set via the .flipbook-zoomed-in
                // class when zoom > 1, or pan-y / pan-x pan-y in other
                // modes). preventDefault here additionally suppresses
                // the corresponding pointermove events on iOS Safari,
                // which breaks PanZoom (book3 / 2d) and any other JS
                // pointer-event-based pan logic.
                callback(e, 'move', distanceX, distanceY, 0, 1);
            }
        }

        function endHandler(e) {
            self.trigger('enableIScroll');
            if (e.type === 'touchend' || e.type === 'mouseup') {
                setTimeout(function () {
                    touchStarted = false;
                }, 300);
            }

            let touchObj = e.changedTouches ? e.changedTouches[0] : e;
            let { distanceX, distanceY } = calculateDirectionAndDistance(touchObj.clientX, touchObj.clientY);
            let duration = new Date().getTime() - startTime;

            if (isSwiping) {
                isSwiping = false;
                callback(e, 'end', distanceX, distanceY, duration, e.changedTouches ? e.changedTouches.length : 1);
            }

            if (isPinching) {
                isPinching = false;
                callback(e, 'pinchend', null, 0, 0, 2);
            }
            removeEventListeners();
        }

        function cancelHandler(e) {
            setTimeout(function () {
                touchStarted = false;
            }, 300);

            let duration = new Date().getTime() - startTime;
            let { distanceX, distanceY } = calculateDirectionAndDistance(lastX, lastY);

            if (isSwiping) {
                isSwiping = false;
                callback(e, 'cancel', distanceX, distanceY, duration, 1);
            }
            if (isPinching) {
                isPinching = false;
                callback(e, 'pinchcancel', distanceX, distanceY, duration, 2);
            }
            removeEventListeners();
        }

        function removeEventListeners() {
            element.removeEventListener('mousemove', moveHandler);
            element.removeEventListener('touchmove', moveHandler);
        }

        element.addEventListener('mousedown', startHandler);
        element.addEventListener('touchstart', startHandler);
        element.addEventListener('mouseup', endHandler);
        element.addEventListener('touchend', endHandler);
        element.addEventListener('mouseleave', cancelHandler);
        element.addEventListener('touchcancel', cancelHandler);
    }

    initListeners() {
        this.wrapper.addEventListener('pointerdown', (e) => {
            this.deselectText();
        });
    }

    initSwipe() {
        var self = this;

        let zooming = false;
        let pinching = false;
        let textSelect = false;
        this.touchSwipe(this.book, function (e, phase, distanceX, distanceY, duration, fingerCount) {
            textSelect = self.tool == 'toolSelect' || self.options.pageDragDisabled;

            if (phase == 'start') {
                self.zoomStart = self.zoom;
                try {
                    self.currentPageInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
                } catch (e) {}
                const pageHtmlClicked = e.target.closest('.flipbook-page-html');
                if (pageHtmlClicked) {
                    pageHtmlClicked.classList.add('mousedown');
                }
                // Prevent unwanted text selection during a mouse-drag page
                // flip. The browser starts a selection on mousedown and
                // extends it through mousemove; setting user-select:none on
                // body suppresses that without breaking focus or other
                // mousedown side effects. Touch is unaffected — touch
                // selection is long-press, not initial touchstart. Skipped
                // when the user's active tool is text-select.
                if (!textSelect && e.type === 'mousedown') {
                    document.body.style.userSelect = 'none';
                    document.body.style.webkitUserSelect = 'none';
                }
            }

            if (fingerCount > 1 && phase == 'pinch') {
                let scale = distanceX;
                if (e.scale) {
                    scale = e.scale;
                }
                self.zoomTo(self.zoomStart * scale, 0, e);
                pinching = true;
            }

            if (phase == 'end') {
                if (!self.options.doubleClickZoomDisabled) {
                    if (!self.clickTimer && e.touches) {
                        self.clickTimer = setTimeout(function () {
                            delete self.clickTimer;
                        }, 300);
                    } else {
                        clearTimeout(self.clickTimer);
                        delete self.clickTimer;
                        const pageHtmlClicked = e.target.closest('.flipbook-page-html');
                        if (pageHtmlClicked) pageHtmlClicked.classList.remove('mousedown');
                        const isLinkBtn =
                            e.target.closest('.r3d-link-btn') || e.target.closest('.flipbook-has-buttons') || e.target.closest('.flipbook-hotspot');
                        const isInteractive = e.target.closest('a, button, input, select, textarea, [onclick]');

                        if (pageHtmlClicked && !distanceX && !distanceY && !isLinkBtn && !isInteractive) {
                            var t = self.options.zoomTime;

                            // zoomMax/2 can fall below the resting (fit) zoom when zoomMax is small
                            // — e.g. Lite caps zoomSize, shrinking zoomMax — making a page click zoom
                            // *out* instead of in. Clamp so the target is always a real zoom-in
                            // (>= 2x zoomMin) but never above zoomMax.
                            var clickZoomTarget = Math.min(
                                self.options.zoomMax,
                                Math.max(self.options.zoomMax / 2, self.options.zoomMin * 2)
                            );
                            if (self.zoom >= clickZoomTarget) {
                                self.zoomTo(self.options.zoomMin, t, e);
                                pageHtmlClicked.classList.remove('zoomed');
                            } else {
                                self.zoomTo(clickZoomTarget, t, e);
                                pageHtmlClicked.classList.add('zoomed');
                            }
                        }
                    }
                }
                if (Math.abs(distanceX) < 5 && duration < 200) {
                    zooming = true;
                }
            }

            if (!zooming && !pinching && !textSelect) {
                self.Book.onSwipe(e, phase, distanceX, distanceY, duration, fingerCount);
            } else {
            }
            zooming = false;

            // Restore body user-select on any end-of-gesture phase.
            if (phase == 'end' || phase == 'cancel' || phase == 'pinchend' || phase == 'pinchcancel') {
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
            }

            if (phase == 'pinchend') {
                pinching = false;
            }
        });

        this.swipeEnabled = true;
    }

    createSVGIcon(name, reverse = false) {
        const o = this.options;
        const iconSet = o.iconSet || 'fontawesome';
        const isLucide = iconSet === 'lucide';
        const lucideIcon = isLucide ? FLIPBOOK?.Main?.icons?.lucide?.[name] : null;
        const icon = lucideIcon ?? FLIPBOOK?.Main?.icons?.fontawesome?.[name] ?? FLIPBOOK?.Main?.icons?.[name];
        if (!icon) return null;

        const useLucide = isLucide && !!lucideIcon;
        const [w, h, d] = icon;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.setAttribute('height', '1em');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');

        svg.classList.add('flipbook-icon');
        if (reverse) svg.classList.add('flipbook-icon-reverse');

        svg._isLucide = useLucide;

        if (useLucide) {
            svg.style.setProperty('fill', 'none', 'important');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', o.iconStrokeWidth || 2);
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');
            svg.innerHTML = d;
        } else {
            if (o.iconStrokeWidth) {
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                svg.setAttribute('stroke-width', o.iconStrokeWidth);
            } else {
                svg.setAttribute('stroke-width', '1');
            }
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', d);
            svg.appendChild(path);
        }

        return svg;
    }

    createButton(btn) {
        var o = this.options;
        var isLucide = (o.iconSet || 'fontawesome') === 'lucide';
        var inToolsMenu = btn.toolsMenu && o.btnTools.enabled;
        var floating =
            !inToolsMenu &&
            ((btn.vAlign === 'top' && o.menu2Transparent) || (btn.vAlign !== 'top' && o.menuTransparent));
        // When floating, buttons group into a pill on their menu container.
        // Individual button pill styling (bg, radius, shadow, margin) moves to the menu container.
        var bgColor = btn.background || (floating ? 'none' : o.btnBackground);
        var bgColorHover = btn.backgroundHover || (floating ? o.floatingBtnBackgroundHover : o.btnBackgroundHover);
        var color = btn.color || (floating ? o.floatingBtnColor : o.btnColor);
        var colorHover = btn.colorHover || (floating ? o.floatingBtnColorHover : o.btnColorHover);
        var textShadow = floating ? o.floatingBtnTextShadow : o.btnTextShadow;
        var radius = btn.radius || (floating ? 999 : o.btnRadius);
        var border = btn.border || (floating ? o.floatingBtnBorder : o.btnBorder);
        var margin = floating ? 0 : o.btnMargin;
        var shadow = floating ? 'none' : o.btnShadow;
        // Floating buttons use tighter padding so the pill stays compact (44px tall with default icon)
        var paddingV = floating ? o.btnPaddingV + 1 : o.btnPaddingV + 4;
        var paddingH = floating ? o.btnPaddingH + 1 : o.btnPaddingH + 4;
        var $btn = document.createElement('span');
        var btnSize = btn.size || o.btnSize;

        if (inToolsMenu) {
            bgColor = 'none';
            bgColorHover = 'none';
        }

        function addCSS(btn) {
            btn.style.margin = `${margin}px`;
            btn.style.padding = `${paddingV}px ${paddingH}px`;
            btn.style.borderRadius = `${radius}px`;
            btn.style.boxShadow = shadow;
            btn.style.border = border;
            btn.style.color = color;
            if (btn.$icon._isLucide) {
                btn.$icon.style.stroke = color;
            } else {
                btn.$icon.style.fill = color;
            }
            if (btn.$iconAlt) {
                if (btn.$iconAlt._isLucide) {
                    btn.$iconAlt.style.stroke = color;
                } else {
                    btn.$iconAlt.style.fill = color;
                }
            }
            btn.style.background = bgColor;
            btn.style.textShadow = textShadow;
            btn.style.width = `${btnSize}px`;
            btn.style.height = `${btnSize}px`;

            if (color) {
                btn.classList.remove('skin-color');
            }
            if (bgColor) {
                btn.classList.remove('skin-color-bg');
            }
        }

        const iconName = btn.svg || btn.name.replace('btn', '').toLowerCase();

        $btn.$icon = this.createSVGIcon(iconName, btn.iconReverse);
        $btn.appendChild($btn.$icon);

        if (btn.svgAlt) {
            $btn.$iconAlt = this.createSVGIcon(btn.svgAlt, btn.iconReverse);
            $btn.appendChild($btn.$iconAlt);
            $btn.$iconAlt.classList.add('flipbook-hidden');
        }

        addCSS($btn);

        if (btn.onclick) {
            $btn.addEventListener('click', function () {
                btn.onclick();
            });
        }

        // Keyboard accessibility: buttons are <span>s, so they need an
        // explicit role, tab stop and Enter/Space activation.
        $btn.tabIndex = 0;
        $btn.setAttribute('role', 'button');
        if (btn.title) $btn.setAttribute('aria-label', btn.title);
        $btn.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                $btn.click();
            }
        });

        if (colorHover || bgColorHover) {
            $btn.addEventListener('mouseenter', function () {
                if (this.classList.contains('disabled')) return;
                var prop = $btn.$icon._isLucide ? 'stroke' : 'fill';
                $btn.$icon.style[prop] = colorHover;
                // Floating buttons: bg on wrapper (pill hover); otherwise on icon
                if (floating) {
                    $btn.style.background = bgColorHover;
                } else {
                    $btn.$icon.style.background = bgColorHover;
                }
                if ($btn.$iconAlt) {
                    var propAlt = $btn.$iconAlt._isLucide ? 'stroke' : 'fill';
                    $btn.$iconAlt.style[propAlt] = colorHover;
                    if (!floating) $btn.$iconAlt.style.background = bgColorHover;
                }
            });

            $btn.addEventListener('mouseleave', function () {
                var prop = $btn.$icon._isLucide ? 'stroke' : 'fill';
                $btn.$icon.style[prop] = color;
                if (floating) {
                    $btn.style.background = bgColor;
                } else {
                    $btn.$icon.style.background = bgColor;
                }
                if ($btn.$iconAlt) {
                    var propAlt = $btn.$iconAlt._isLucide ? 'stroke' : 'fill';
                    $btn.$iconAlt.style[propAlt] = color;
                    if (!floating) $btn.$iconAlt.style.background = bgColor;
                }
            });
        }

        var menu;

        if (inToolsMenu) {
            menu = this.toolsMenu;
            var span = document.createElement('span');
            span.textContent = btn.title;
            span.classList.add('skin-color');
            $btn.appendChild(span);
        } else if (btn.vAlign === 'top') {
            if (o.menu2Floating) {
                menu = this.menuTC;
            } else if (btn.hAlign === 'left') {
                menu = this.menuTL;
            } else if (btn.hAlign === 'right') {
                menu = this.menuTR;
            } else {
                menu = this.menuTC;
            }
        } else {
            if (o.menuFloating) {
                menu = this.menuBC;
            } else if (btn.hAlign === 'left') {
                menu = this.menuBL;
            } else if (btn.hAlign === 'right') {
                menu = this.menuBR;
            } else {
                menu = this.menuBC;
            }
        }

        $btn.setAttribute('data-name', btn.name);
        $btn.classList.add('flipbook-menu-btn-wrapper', 'flipbook-menu-btn', 'skin-color');
        $btn.style.order = btn.order;

        // Floating buttons group into a single pill on their menu container.
        // Create an inner pill wrapper once per menu — keeps the outer menu
        // container's existing flex behavior intact (so L/C/R layouts still work).
        if (floating) {
            if (!menu._floatingPill) {
                var pill = document.createElement('div');
                pill.className = 'flipbook-menu-grouped';
                pill.style.background = o.floatingBtnBackground;
                pill.style.borderRadius = o.floatingBtnRadius + 'px';
                pill.style.boxShadow = o.floatingBtnShadow;
                pill.style.margin = o.floatingBtnMargin + 'px';
                pill.style.padding = '2px';
                pill.style.pointerEvents = 'auto';
                pill.style.display = 'flex';
                pill.style.alignItems = 'center';
                pill.style.gap = '2px';
                menu._floatingPill = pill;
                menu.appendChild(pill);
            }
            menu._floatingPill.appendChild($btn);
        } else {
            menu.appendChild($btn);
        }

        if (!inToolsMenu) {
            $btn.setAttribute('data-tooltip', btn.title);
            $btn.classList.add('flipbook-has-tooltip');
        }

        // Compact-mode fallback: for non-essential buttons, also add a
        // tools-menu clone so they remain accessible when the toolbar is
        // hidden via `.flipbook-compact`. Styling mirrors a normal
        // tools-menu button (see addCSS branch where inToolsMenu is true).
        var COMPACT_HIDE = ['btnSearch', 'btnBookmark', 'btnToc', 'btnThumbs', 'btnAutoplay', 'btnShare'];
        if (!inToolsMenu && this.toolsMenu && COMPACT_HIDE.indexOf(btn.name) !== -1) {
            var toolsColor = btn.color || o.btnColor;
            var toolsMargin = o.btnMargin;
            var toolsPadV = o.btnPaddingV + 4;
            var toolsPadH = o.btnPaddingH + 4;
            var toolsRadius = btn.radius || o.btnRadius;
            var toolsSize = btn.size || o.btnSize;

            var $compact = document.createElement('span');
            $compact.className = 'flipbook-menu-btn-wrapper flipbook-menu-btn skin-color flipbook-compact-only';
            $compact.setAttribute('data-name', btn.name);
            $compact.style.margin = toolsMargin + 'px';
            $compact.style.padding = toolsPadV + 'px ' + toolsPadH + 'px';
            $compact.style.borderRadius = toolsRadius + 'px';
            $compact.style.background = 'none';
            if (toolsColor) {
                $compact.style.color = toolsColor;
                $compact.classList.remove('skin-color');
            }

            var $icon = this.createSVGIcon(btn.svg || btn.name.replace('btn', '').toLowerCase(), btn.iconReverse);
            $icon.style.width = toolsSize + 'px';
            $icon.style.height = toolsSize + 'px';
            if (toolsColor) {
                if ($icon._isLucide) $icon.style.stroke = toolsColor;
                else $icon.style.fill = toolsColor;
            }
            $compact.appendChild($icon);

            var $span = document.createElement('span');
            $span.textContent = btn.title;
            $span.classList.add('skin-color');
            if (toolsColor) {
                $span.style.color = toolsColor;
                $span.classList.remove('skin-color');
            }
            $compact.appendChild($span);

            $compact.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                $btn.click();
            });
            this.toolsMenu.appendChild($compact);
            // Re-enable tools button if it was disabled due to ≤1 tool entries
            if (o.btnTools && o.btnTools.enabled === false) o.btnTools.enabled = true;
        }

        return $btn;
    }

    createAndAppendMenu(className, parentElement) {
        const div = document.createElement('div');
        div.className = className;
        parentElement.appendChild(div);
        return div;
    }

    initArrowButton(button, onclick, label) {
        const o = this.options;
        // Button is the <span> wrapper; the SVG icon lives inside. Color goes
        // on the SVG (fill/stroke); button-shape styling (bg, border-radius,
        // padding) stays on the span. Toolbar buttons use the same pattern
        // and don't show iOS's stuck-square-on-tap rendering — SVG elements
        // don't reliably honor -webkit-tap-highlight-color: transparent.
        const svg = button.querySelector('svg') || button;

        button.addEventListener('click', (e) => {
            if (button.disabled) return false;

            button.disabled = true;
            setTimeout(() => {
                button.disabled = false;
            }, 300);

            e.stopPropagation();
            e.preventDefault();
            onclick();
            // Drop focus so iOS doesn't keep the button in a stuck
            // hover/focus state showing the post-tap background. Keyboard
            // "clicks" have e.detail 0 — keep focus for those.
            if (e.detail && typeof button.blur === 'function') button.blur();
        });

        // Keyboard accessibility: arrows are <span>s, so they need an
        // explicit role, tab stop and Enter/Space activation.
        button.tabIndex = 0;
        button.setAttribute('role', 'button');
        if (label) button.setAttribute('aria-label', label);
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });

        var isLucide = (o.iconSet || 'fontawesome') === 'lucide';
        // Width stays at arrowSize for all arrows so their horizontal centers
        // align (next/prev row vs first/last row); only height varies — first
        // and last set fontSize to arrowSize * 0.5 so they're shorter.
        const buttonHeight = parseFloat(button.style.fontSize) || o.arrowSize;
        Object.assign(button.style, {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '1',
            width: `${o.arrowSize}px`,
            height: `${buttonHeight}px`,
            borderRadius: `${o.arrowRadius}px`,
            padding: `${o.arrowPadding}px`,
            filter: `drop-shadow(${o.arrowTextShadow})`,
            border: o.arrowBorder,
            color: o.arrowColor,
            background: o.arrowBackground,
            boxSizing: 'initial',
        });
        if (isLucide) {
            svg.style.stroke = o.arrowColor;
        } else {
            svg.style.fill = o.arrowColor;
        }

        if (o.arrowBackgroundHover) {
            button.addEventListener('mouseenter', function () {
                if (this.classList.contains('disabled')) return;
                button.style.background = o.arrowBackgroundHover;
            });
            button.addEventListener('mouseleave', function () {
                button.style.background = o.arrowBackground;
            });
            // iOS sometimes skips mouseleave after a tap; the gray hover
            // background persists. Force-reset on touchend so the post-tap
            // state is always clean.
            const resetBg = () => { button.style.background = o.arrowBackground; };
            button.addEventListener('touchend', resetBg, { passive: true });
            button.addEventListener('touchcancel', resetBg, { passive: true });
        }

        if (o.arrowColor) {
            button.classList.remove('skin-color');
        }
        if (o.arrowBackground) {
            button.classList.remove('skin-color-bg');
        }
    }

    createMenu() {
        if (this.menuBottom) {
            return;
        }

        var o = this.options;

        var menuBottomClass = o.menuFloating ? 'flipbook-menu-floating' : 'flipbook-menu-fixed';
        var menuTopClass = o.menu2Floating ? 'flipbook-menu-floating' : 'flipbook-menu-fixed';

        var self = this;

        this.menuBottom = document.createElement('div');
        this.menuBottom.classList.add('flipbook-menuBottom', menuBottomClass);
        if (!o.menuTransparent && o.skin !== 'gradient' && !(o.menuBackground && o.menuBackground.includes('gradient'))) this.menuBottom.classList.add('flipbook-border');
        this.menuBottom.style.background = o.menuBackground;
        this.menuBottom.style.boxShadow = o.menuShadow;
        this.menuBottom.style.margin = o.menuMargin + 'px';
        this.menuBottom.style.padding = o.menuPadding + 'px';
        this.wrapper.appendChild(this.menuBottom);

        if (!o.menuTransparent && !o.menuBackground) {
            this.menuBottom.classList.add('skin-color-bg');
        }

        if (o.hideMenu) {
            this.menuBottom.classList.add('flipbook-hidden');
        }

        this.menuTop = document.createElement('div');
        this.menuTop.classList.add('flipbook-menuTop', menuTopClass);
        if (!o.menu2Transparent && o.skin !== 'gradient') this.menuTop.classList.add('flipbook-border');
        this.menuTop.style.background = o.menu2Background;
        this.menuTop.style.boxShadow = o.menu2Shadow;
        this.menuTop.style.margin = o.menu2Margin + 'px';
        this.menuTop.style.padding = o.menu2Padding + 'px';
        this.wrapper.appendChild(this.menuTop);

        if (!o.menu2Transparent && !o.menu2Background) {
            this.menuTop.classList.add('skin-color-bg');
        }

        if (o.viewMode === 'swipe') {
            o.btnSound.enabled = false;
        }

        function createAndAppendMenu(className, parentElement) {
            const div = document.createElement('div');
            div.className = className;
            parentElement.appendChild(div);
            return div;
        }

        if (o.progressBar.enabled && o.progressBar.vAlign === 'bottom') {
            // Defer creation until after Book is initialized (numSheets is known)
            this._progressBarPending = true;
        }

        this.menuBL = createAndAppendMenu('flipbook-menu flipbook-menu-left', this.menuBottom);
        this.menuBC = createAndAppendMenu('flipbook-menu flipbook-menu-center', this.menuBottom);
        this.menuBR = createAndAppendMenu('flipbook-menu flipbook-menu-right', this.menuBottom);

        this.menuTL = createAndAppendMenu('flipbook-menu flipbook-menu-left', this.menuTop);
        this.menuTC = createAndAppendMenu('flipbook-menu flipbook-menu-center', this.menuTop);
        this.menuTR = createAndAppendMenu('flipbook-menu flipbook-menu-right', this.menuTop);

        if (this.options.btnTools.enabled) {
            this.toolsMenu = document.createElement('div');
            this.toolsMenu.className =
                'flipbook-tools flipbook-submenu skin-color skin-color-bg flipbook-font flipbook-border';
        }

        if (this.options.btnShare.enabled) {
            this.shareMenu = document.createElement('div');
            this.shareMenu.className =
                'flipbook-share flipbook-submenu skin-color skin-color-bg flipbook-font flipbook-border';
        }

        if (o.sideNavigationButtons) {
            this.$arrowWrapper = document.createElement('div');
            this.$arrowWrapper.className = 'flipbook-nav';
            this.bookLayer.appendChild(this.$arrowWrapper);

            const $svgNext = this.createSVGIcon('next');
            this.btnNext = document.createElement('span');
            this.btnNext.appendChild($svgNext);
            this.btnNext.classList.add('flipbook-right-arrow');
            this.$arrowWrapper.appendChild(this.btnNext);
            this.btnNext.style.fontSize = o.arrowSize + 'px';
            this.btnNext.style.marginTop = String(-o.arrowSize / 2) + 'px';
            this.btnNext.style.marginRight = o.arrowMargin + 'px';
            this.initArrowButton(this.btnNext, this.nextPage.bind(this), o.btnNext.title);

            const $svgPrev = this.createSVGIcon('next', true);
            this.btnPrev = document.createElement('span');
            this.btnPrev.appendChild($svgPrev);
            this.btnPrev.classList.add('flipbook-left-arrow');
            this.$arrowWrapper.appendChild(this.btnPrev);
            this.btnPrev.style.fontSize = o.arrowSize + 'px';
            this.btnPrev.style.marginTop = String(-o.arrowSize / 2) + 'px';
            this.btnPrev.style.marginLeft = o.arrowMargin + 'px';
            this.initArrowButton(this.btnPrev, this.prevPage.bind(this), o.btnPrev.title);

            if (o.btnFirst.enabled) {
                const $svgFirst = this.createSVGIcon('last', true);
                this.btnFirst = document.createElement('span');
                this.btnFirst.appendChild($svgFirst);
                this.btnFirst.classList.add('flipbook-first-arrow');
                this.$arrowWrapper.appendChild(this.btnFirst);
                this.btnFirst.style.fontSize = o.arrowSize * 0.5 + 'px';
                this.btnFirst.style.marginTop = String(o.arrowSize / 2 + o.arrowMargin + 2 * o.arrowPadding) + 'px';
                this.btnFirst.style.marginLeft = o.arrowMargin + 'px';
                this.initArrowButton(this.btnFirst, this.firstPage.bind(this), o.btnFirst.title);
            }

            if (o.btnLast.enabled) {
                const $svgLast = this.createSVGIcon('last');
                this.btnLast = document.createElement('span');
                this.btnLast.appendChild($svgLast);
                this.btnLast.classList.add('flipbook-last-arrow');
                this.$arrowWrapper.appendChild(this.btnLast);
                this.btnLast.style.fontSize = o.arrowSize * 0.5 + 'px';
                this.btnLast.style.marginTop = String(o.arrowSize / 2 + o.arrowMargin + 2 * o.arrowPadding) + 'px';
                this.btnLast.style.marginRight = o.arrowMargin + 'px';
                this.initArrowButton(this.btnLast, this.lastPage.bind(this), o.btnLast.title);
            }

            if (!o.menuNavigationButtons) {
                if (o.btnOrder.indexOf('btnFirst') >= 0) {
                    o.btnOrder.splice(o.btnOrder.indexOf('btnFirst'), 1);
                }
                if (o.btnOrder.indexOf('btnPrev') >= 0) {
                    o.btnOrder.splice(o.btnOrder.indexOf('btnPrev'), 1);
                }
                if (o.btnOrder.indexOf('btnNext') >= 0) {
                    o.btnOrder.splice(o.btnOrder.indexOf('btnNext'), 1);
                }
                if (o.btnOrder.indexOf('btnLast') >= 0) {
                    o.btnOrder.splice(o.btnOrder.indexOf('btnLast'), 1);
                }
            }
        }

        if (o.pdfMode && !o.btnDownloadPdf.url) {
            o.btnDownloadPdf.url = o.pdfUrl;
        }

        if (!o.btnDownloadPdf.url) o.btnDownloadPdf.enabled = false;

        if (!o.pdfTextLayer && o.btnSearch) {
            o.btnSearch.enabled = false;
        }

        const isInIframe = window.self !== window.top;
        if (isInIframe) o.btnDownloadPages.enabled = false;

        
        o.btnOrder = [
                'currentPage',
                'progressBar',
                'btnZoomOut',
                'btnZoomIn',
                'btnThumbs',
                'btnToc',
                'btnShare',
                'btnPrint',
                'btnDownloadPdf',
                'btnSound',
                'btnTools',
                'btnExpand',
                'btnClose',
            ];
            

        var tools = [];
        for (var i = 0; i < o.btnOrder.length; i++) {
            var btnName = o.btnOrder[i];
            var btn = o[btnName];

            if (o.isMobile && btn.hideOnMobile) {
                btn.enabled = false;
            }
            if (btn.toolsMenu && btn.enabled) tools.push(btn);
        }
        if (tools.length <= 1) o.btnTools.enabled = false;

        for (var i = 0; i < o.btnOrder.length; i++) {
            var btnName = o.btnOrder[i];
            var btn = o[btnName];

            if (btn.enabled) {
                btn.name = btnName;
                if (btn.name === 'currentPage') {
                    this.createCurrentPage();
                } else if (btn.name === 'progressBar') {
                    this._progressBarPending = true;
                } else if (btn.name === 'search') {
                    } else {
                    this[btnName] = this.createButton(btn);
                    this[btnName].addEventListener('click', function (e) {
                        var name = this.dataset.name;
                        if (name == 'btnDownloadPdf') {
                            const isInIframe = window.self !== window.top;
                            if (!isInIframe) {
                                var path = o.btnDownloadPdf.url;
                                var save = document.createElement('a');
                                save.href = path;
                                var filename = save.href.split('/').pop().split('#')[0].split('?')[0];
                                save.download = filename;
                                document.body.appendChild(save);
                                save.click();
                                document.body.removeChild(save);
                            } else {
                                parent.postMessage(
                                    {
                                        type: 'download',
                                        url: o.btnDownloadPdf.url,
                                    },
                                    '*'
                                );
                            }
                            self.sendGAEvent({
                                event: 'flipbook_pdf_download',
                                book_name: self.options.name,
                                url: o.btnDownloadPdf.url || o.pdfUrl,
                                nonInteraction: true,
                            });
                        } else {
                            e.stopPropagation();
                            e.preventDefault();
                            self.onButtonClick(this, e);
                        }
                    });
                }
            }
        }

        if (o.buttons) {
            o.buttons.forEach((newButton) => {
                self.createButton(newButton).index(1);
            });
        }

        if (this.btnSingle) this.toggleIcon(this.btnSingle, this.options.singlePageMode);
    }

    onButtonClick(btn, _) {
        var name = btn.dataset.name;
        var o = this.options;

        switch (name) {
            case 'btnFirst':
                this.firstPage();
                break;
            case 'btnPrev':
                this.prevPage();
                break;
            case 'btnNext':
                this.nextPage();
                break;
            case 'btnLast':
                this.lastPage();
                break;
            case 'btnZoomIn':
                this.zoomIn();
                break;
            case 'btnZoomOut':
                this.zoomOut();
                break;
            case 'btnAutoplay':
                if (!this.autoplay) {
                    this.nextPage();
                }
                this.toggleAutoplay();
                break;
            case 'btnSearch':
                this.toggleSearch();
                break;
            case 'btnBookmark':
                this.toggleBookmark();
                break;
            case 'btnRotateLeft':
                if (this.Book.rotateLeft) {
                    this.Book.rotateLeft();
                }
                break;
            case 'btnRotateRight':
                if (this.Book.rotateRight) {
                    this.Book.rotateRight();
                }
                break;
            case 'btnToc':
                this.toggleToc();
                break;
            case 'btnThumbs':
                this.toggleThumbs();
                break;
            case 'btnShare':
                this.toggleShareMenu();
                break;
            case 'btnTools':
                this.toggleToolsMenu();
                break;
            case 'btnNotes':
                this.toggleNotesMenu();
                break;
            case 'btnDownloadPages':
                if (o.downloadMenu) {
                    this.toggleDownloadMenu();
                } else {
                    var link = document.createElement('a');
                    link.href = o.pdfUrl || o.btnDownloadPages.url;
                    link.dispatchEvent(new MouseEvent('click'));
                }

                break;

            case 'btnPrint':
                if (o.printMenu) {
                    this.togglePrintMenu();
                } else {
                    this.togglePrintWindow();
                }

                break;

            case 'btnSound':
                this.toggleSound();
                break;
            case 'btnExpand':
                this.toggleExpand();
                break;
            case 'btnSingle':
                this.toggleSinglePage();
                break;
            case 'btnClose':
                this.lightbox.closeLightbox();
                break;
        }
    }

    handleFsChange() {
        if (!this.Book || !this.Book.enabled) {
            return;
        }

        var currentFullscreenElement =
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement;
        if (currentFullscreenElement === this.fullscreenElement || this.isFullscreen) {
            this.fullscreenActive = true;

            if (this.options.onfullscreenenter) {
                this.options.onfullscreenenter.call(this);
            }
            document.body.classList.add('flipbook-fullscreen');
            document.documentElement.classList.add('flipbook-fullscreen');
        } else {
            this.fullscreenActive = false;
            if (this.options.onfullscreenexit) {
                this.options.onfullscreenexit.call(this);
            }
            document.body.classList.remove('flipbook-fullscreen');
            document.documentElement.classList.remove('flipbook-fullscreen');
        }

        this.toggleIcon(this.btnExpand, !this.fullscreenActive);
    }

    createLogo() {
        const { options: o, wrapper } = this;
        const { logoImg, logoCSS, logoAlignH, logoAlignV, logoUrl, logoUrlTarget, isMobile, logoHideOnMobile } = o;

        if (!logoImg || (isMobile && logoHideOnMobile)) return;

        const baseStyle =
            `${logoCSS}` +
            [
                'position:absolute',
                logoAlignH === 'right' ? 'right:0' : logoAlignH === 'left' ? 'left:0' : '',
                logoAlignV === 'bottom' ? 'bottom:0' : logoAlignV === 'top' ? 'top:0' : '',
            ]
                .filter(Boolean)
                .join(';') +
            ';';

        const makeLogo = ({ zIndex = '', opacity = '' } = {}) => {
            const img = document.createElement('img');
            img.src = logoImg;
            img.style.cssText =
                baseStyle + (zIndex ? `z-index:${zIndex};` : '') + (opacity ? `opacity:${opacity};` : '');

            if (logoUrl) {
                img.style.cursor = 'pointer';
                img.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(logoUrl, logoUrlTarget || '_blank');
                });
            }

            return img;
        };

        const primary = makeLogo();
        wrapper.appendChild(primary);
    }

    setLoadingProgress(percent) {
        if (this.disposed) {
            return;
        }

        if (this.$fillPreloader) {
            this.setFillPreloaderProgress(percent);
        } else {
            if (percent > 0 && percent < 1) {
                this.preloader.classList.remove('flipbook-hidden');
            } else {
                this.preloader.classList.add('flipbook-hidden');
            }
        }
    }

    setFillPreloaderProgress(percent) {
        if (!this.$fillPreloader) {
            return;
        }

        if (percent > 0 && percent < 1) {
            this.fillPreloaderProgress = this.fillPreloaderProgress || 0;

            if (percent < this.fillPreloaderProgress) {
                return;
            } else {
                this.fillPreloaderProgress = percent;
            }
            var img = this.$fillPreloaderImg[0];
            img.style.clip = 'rect(0px,' + img.width * percent + 'px,' + img.height + 'px,0px)';
            this.$fillPreloader.show();
        } else {
            this.$fillPreloader.hide();
        }
    }

    playFlipSound() {
        if (!this.options.sound || !this.Book.enabled) return;
        if (!this._audioCtx || !this._flipBuffer) return;

        const now = performance.now();
        // Throttle: at least 300ms between sound starts so consecutive
        // flips are clearly separated rather than stacking.
        if (this._lastFlipSoundTime && now - this._lastFlipSoundTime < 300) return;

        this._activeFlipSounds = this._activeFlipSounds || 0;
        // Cap at 2 concurrent — paired with the 300ms throttle, the second
        // sound is always at least 300ms after the first so they don't muddy.
        if (this._activeFlipSounds >= 2) return;

        this._lastFlipSoundTime = now;

        if (this._audioCtx.state === 'suspended') {
            this._audioCtx.resume().catch(() => {});
        }

        const src = this._audioCtx.createBufferSource();
        src.buffer = this._flipBuffer;
        src.connect(this._audioCtx.destination);
        src.onended = () => { this._activeFlipSounds--; };
        this._activeFlipSounds++;
        try {
            src.start(0);
        } catch (e) {
            this._activeFlipSounds--;
        }
    }

    playBgMusic(retry = true) {
        if (!this.options.sound || !this.backgroundMusic) return;
        if (this.options.backgroundMusicOnAutoplay && this.options.btnAutoplay?.enabled && !this.autoplay) return;

        const attemptPlay = () => {
            const playPromise = this.backgroundMusic.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch((e) => {
                    if (retry && e && (e.name === 'NotAllowedError' || e.message?.includes('user'))) {
                        setTimeout(attemptPlay, 200); // Retry after 200ms
                    }
                });
            }
        };

        attemptPlay();
    }

    onMouseWheel(e) {
        if ('wheelDeltaX' in e) {
            wheelDeltaX = e.wheelDeltaX / 12;
            wheelDeltaY = e.wheelDeltaY / 12;
        } else if ('wheelDelta' in e) {
            wheelDeltaX = wheelDeltaY = e.wheelDelta / 12;
        } else if ('detail' in e) {
            wheelDeltaX = wheelDeltaY = -e.detail * 3;
        } else {
            return;
        }
        if (wheelDeltaX > 0) {
            this.zoomIn(e);
        } else {
            this.zoomOut(e);
        }
    }

    zoomTo(val, time, e) {
        if (val == this.zoom) return;
        this.zoom = val;

        var x;
        var y;

        if (typeof e == 'undefined') {
            x = this.wrapperW / 2;
            y = this.wrapperH / 2;
        } else {
            // For pinch (2-finger), use the midpoint as the focal —
            // touches[0] alone shifts as that finger moves and makes the
            // zoomed-in content slide around.
            if (e.touches && e.touches.length >= 2) {
                x = (e.touches[0].pageX + e.touches[1].pageX) / 2;
                y = (e.touches[0].pageY + e.touches[1].pageY) / 2;
            } else if (e.touches && e.touches[0]) {
                x = e.touches[0].pageX;
                y = e.touches[0].pageY;
            } else if (e.changedTouches && e.changedTouches[0]) {
                x = e.changedTouches[0].pageX;
                y = e.changedTouches[0].pageY;
            } else {
                x = e.pageX;
                y = e.pageY;
            }

            let wrapperRect = this.wrapper.getBoundingClientRect();
            x = x - wrapperRect.left - window.scrollX;
            y = y - wrapperRect.top - window.scrollY;

            y += this.bookVerticalPadding;
        }

        const zoomMin = this.getZoomMin();

        if (this.zoom < zoomMin) {
            this.zoom = zoomMin;
        }
        if (this.zoom > this.options.zoomMax) {
            this.zoom = this.options.zoomMax;
        }

        if (this.options.zoomMax2 && this.zoom > this.options.zoomMax2) {
            this.zoom = this.options.zoomMax2;
        }

        if (this.autoplay) this.zoom = this.zoom = zoomMin;

        // For modes with a ZoomLayer (book3 3d/2d), the layer is the
        // sharp peak-zoom overlay. While it's not yet visible, book3
        // handles live zoom (smooth gesture / animation) — its
        // transform-stretched raster is acceptable mid-gesture. After
        // the user settles for ~150 ms above zoom=1 AND the layer's
        // images decode, we reveal the layer; subsequent zoom calls
        // route to it for sharp zoom-pan. Drops back to book3 when
        // user goes ≤1.
        if (this.zoomLayer && this.zoomLayer.shown) {
            this.zoomLayer.zoomTo(this.zoom, time, x, y);
            if (this.zoom <= 1) {
                this.zoomLayer.hide();
                this.Book.zoomTo(this.zoom, time, x, y);
            }
        } else {
            this.Book.zoomTo(this.zoom, time, x, y);
            if (this.zoomLayer) {
                clearTimeout(this._zoomLayerSettleTimer);
                if (this.zoom > 1) {
                    this._zoomLayerSettleTimer = setTimeout(() => {
                        this._zoomLayerSettleTimer = null;
                        this.zoomLayer.show(this.zoom);
                    }, 150);
                } else {
                    this.zoomLayer.hide();
                }
            }
        }

        this.onZoom(this.zoom);
    }

    zoomOut(e) {
        var newZoom = this.zoom / this.options.zoomStep;
        // if (newZoom < 1 && this.zoom > 1) {
        //     newZoom = 1;
        // }
        const zoomMin = this.getZoomMin();
        newZoom = newZoom < zoomMin ? zoomMin : newZoom;

        this.zoomTo(newZoom, this.options.zoomTime, e);
    }

    zoomIn(e) {
        var newZoom = this.zoom * this.options.zoomStep;
        // if (newZoom > 1 && this.zoom < 1) {
        //     newZoom = 1;
        // }

        if (newZoom > this.options.zoomMax) {
            newZoom = this.options.zoomMax;
        }

        this.zoomTo(newZoom, this.options.zoomTime, e);
    }

    getZoomMin() {
        return this.options.viewMode == 'scroll' ? this.options.zoomMin2 : this.options.zoomMin;
    }

    deselectText() {
        window.getSelection().removeAllRanges();
    }

    nextPage() {
        if (!this.Book) {
            return;
        }
        this.flippingPage = true;
        if (this.Book.canFlipNext()) {
            this.Book.nextPage();
            this.deselectText();
        }
    }

    prevPage() {
        if (!this.Book) {
            return;
        }
        this.flippingPage = true;
        if (this.Book.canFlipPrev()) {
            this.Book.prevPage();
            this.deselectText();
        }
    }

    firstPage() {
        const last = this.options.pages.length;
        this.goToPage(this.options.rightToLeft ? last : 1);
    }

    lastPage() {
        const last = this.options.pages.length;
        this.goToPage(this.options.rightToLeft ? 1 : last);
    }

    _isSingleView() {
        return this.options.singlePageMode || (this.Book && (this.Book.singlePage || this.Book.view == 1));
    }

    _getProgressStops() {
        var total = this.options.pages.length;
        if (this._isSingleView()) return total;
        // Spreads: cover(1) + pairs + optional back cover
        // e.g. 16 pages: 1, 2-3, 4-5, 6-7, 8-9, 10-11, 12-13, 14-15, 16 = 9 stops
        return this.options.numSheets || Math.ceil((total + 1) / 2);
    }

    _stopToPage(stop) {
        if (this._isSingleView()) return stop;
        if (stop <= 1) return 1;
        return (stop - 1) * 2;
    }

    _pageToStop(page) {
        if (this._isSingleView()) return page;
        if (page <= 1) return 1;
        return Math.floor(page / 2) + 1;
    }

    goToPage(pageNumber, instant) {
        if (!this.Book) {
            return;
        }
        var o = this.options;
        pageNumber = o.rightToLeft && o.pages && o.pages.length ? o.pages.length - pageNumber + 1 : pageNumber;
        pageNumber = o.rightToLeft && !o.backCover ? pageNumber + 1 : pageNumber;

        if (!instant) {
            this.flippingPage = true;
        }

        if (!this.options.cover) {
            pageNumber++;
        }

        if (pageNumber < 1) {
            pageNumber = 1;
        } else if (pageNumber > this.options.numPages && !this.options.rightToLeft) {
            pageNumber = this.options.numPages;
        }

        this.Book.goToPage(pageNumber, instant);
        this.deselectText();
    }

    moveBook(direction) {
        if (this.Book && this.Book.move) {
            this.Book.move(direction);
        }
    }

    updateBookLayerSize() {
        const o = this.options;
        const topMenuH =
            !this.minimalViewActive && this.menuShowing && !o.menu2OverBook && this.menuTop
                ? this.menuTop.offsetHeight
                : 0;
        const bottomMenuH =
            !this.minimalViewActive && this.menuShowing && !o.menuOverBook && this.menuBottom
                ? this.menuBottom.offsetHeight
                : 0;
        const is3dBook = o.viewMode == '3d' || o.viewMode == '2d';
        const isZoomed = this.zoom > 1;
        const is3dBookZoomed = is3dBook && isZoomed;
        // const is3dBookZoomed = false;
        // const hasPadding = o.viewMode != 'swipe' && o.viewMode != 'scroll';
        const hasPadding = o.viewMode == 'webgl';
        const bookVerticalPadding = hasPadding
            ? this.options.lightBox || this.fullscreenActive
                ? Math.max(topMenuH, bottomMenuH)
                : o.bookVerticalPadding
            : 0;

        this.bookVerticalPadding = bookVerticalPadding;

        const stripH = this.thumbStripShowing && this.thumbStrip ? this.thumbStrip.el.offsetHeight : 0;
        const bookBottom =
            !o.menuOverBook && this.menuBottom ? -bookVerticalPadding + bottomMenuH + stripH : -bookVerticalPadding + stripH;
        const bookTop = !o.menu2OverBook && this.menuTop ? -bookVerticalPadding + topMenuH : -bookVerticalPadding;

        const bottomValue = bookBottom + 'px';
        const topValue = bookTop + 'px';

        const style = this.bookLayer.style;

        if (style.bottom !== bottomValue) {
            style.bottom = bottomValue;
        }

        if (style.top !== topValue) {
            style.top = topValue;
        }

        // if (is3dBook) {
        //     this.Book.onResize(true);
        // }
    }

    onZoom(newZoom) {
        // prevent multiple handling of same zoom level
        if (this.zoomLevelHandled == newZoom) return;
        this.zoom = newZoom;
        this.zoomLevelHandled = newZoom;
        const zoomMin = this.getZoomMin();
        if (this.bookLayer) {
            this.bookLayer.classList.toggle('flipbook-zoomed-in', newZoom > 1);
        }

        // Block iOS pull-to-refresh while zoomed. touch-action: none on
        // descendants doesn't work over user-select: text elements (iOS
        // bypasses). overscroll-behavior on html applies regardless and
        // doesn't interfere with text selection.
        if (newZoom > 1) {
            if (this._savedOverscroll === undefined) {
                this._savedOverscroll = document.documentElement.style.overscrollBehavior || '';
            }
            document.documentElement.style.overscrollBehavior = 'contain';
        } else if (this._savedOverscroll !== undefined) {
            document.documentElement.style.overscrollBehavior = this._savedOverscroll;
            delete this._savedOverscroll;
        }
        this.enableButton(this.btnZoomIn, newZoom < this.options.zoomMax);
        this.enableButton(this.btnZoomOut, newZoom > zoomMin);
        this.enableSwipe(newZoom <= 1);

        if (this.zoom > 1) {
            this.hideWrapperOverflow();
            // if book 3d, remove vertical padding to enable pan
        } else {
            // if book 3d, add vertical padding
        }

        this.sendGAEvent({
            event: 'flipbook_zoom',
            book_name: this.options.name,
            page_number: this.currentPageValue,
            zoom: newZoom,
            nonInteraction: true,
        });
    }

    enableSwipe(val) {
        this.swipeEnabled = val;
    }

    createCurrentPage() {
        var self = this;
        var o = this.options;
        var menu;
        var cssClass = 'flipbook-currentPageHolder ';

        if (o.currentPage.vAlign == 'top') {
            if (o.currentPage.hAlign == 'left') {
                menu = this.menuTL;
            } else if (o.currentPage.hAlign == 'right') {
                menu = this.menuTR;
            } else {
                menu = this.menuTC;
            }
        } else {
            if (o.currentPage.hAlign == 'left') {
                menu = this.menuBL;
            } else if (o.currentPage.hAlign == 'right') {
                menu = this.menuBR;
            } else {
                menu = this.menuBC;
            }
        }

        var floating =
            (o.currentPage.vAlign == 'top' && o.menu2Transparent) ||
            (o.currentPage.vAlign != 'top' && o.menuTransparent);
        var bgColor = floating ? o.floatingBtnBackground : '';
        var color = floating ? o.floatingBtnColor : o.btnColor;
        var textShadiw = floating ? o.floatingBtnTextShadow : '';
        var radius = floating ? o.floatingBtnRadius : o.btnRadius;
        var shadow = floating ? o.floatingBtnShadow : o.btnShadow;
        // When floating, use floatingBtnMargin so the pill doesn't stick to the edge
        var marginV = o.currentPage.marginV || (floating ? o.floatingBtnMargin : 0);
        var marginH = o.currentPage.marginH || (floating ? o.floatingBtnMargin : 0);
        var currentPageHolder = document.createElement('div');
        menu.appendChild(currentPageHolder);

        currentPageHolder.addEventListener('click', function () {
            self.currentPageInput.focus();
        });

        currentPageHolder.style.margin = marginV + 'px ' + marginH + 'px';
        currentPageHolder.style.boxShadow = shadow;
        // When floating, match the compact pill height (40px content + 2px padding = 44px)
        currentPageHolder.style.height = (floating ? 40 : o.btnSize) + 'px';
        currentPageHolder.style.padding = (floating ? 2 : o.btnPaddingV) + 'px';

        if (!floating) {
            cssClass += ' skin-color';
        }
        currentPageHolder.className = cssClass;
        currentPageHolder.style.color = color;
        currentPageHolder.style.background = bgColor;
        currentPageHolder.style.textShadow = textShadiw;
        currentPageHolder.style.borderRadius = radius + 'px';

        if (o.currentPage.order) {
            currentPageHolder.style.order = o.currentPage.order;
        }

        this.currentPageHolder = currentPageHolder;

        var form = document.createElement('form');
        currentPageHolder.appendChild(form);

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var value = parseInt(self.currentPageInput.value, 10);

            if (!Number.isFinite(value) || value < 1 || value > o.pages.length) {
                self.currentPageInput.blur();
                return false;
            }

            self.currentPageString = String(value);
            value += self.options.pageNumberOffset;
            self.goToPage(value);
            self.currentPageInput.blur();
            return false;
        });

        this.currentPageInput = document.createElement('input');
        this.currentPageInput.type = 'text';
        this.currentPageInput.inputMode = 'numeric';
        this.currentPageInput.pattern = '[0-9]*';
        this.currentPageInput.className = 'flipbook-currentPageInput';
        this.currentPageInput.style.margin = marginV + 'px ' + marginH + 'px';
        this.currentPageInput.style.color = color;

        var measureInputWidth = function (text) {
            var span = document.createElement('span');
            span.style.visibility = 'hidden';
            span.style.position = 'absolute';
            span.style.whiteSpace = 'pre';
            span.className = 'flipbook-currentPageInput';
            document.body.appendChild(span);
            span.textContent = text || '0';
            var w = span.offsetWidth + 2;
            document.body.removeChild(span);
            return w;
        };

        this.currentPageInput.addEventListener('focus', function () {
            self.currentPageInput.select();
        });

        this.currentPageInput.addEventListener('input', function () {
            var cleaned = self.currentPageInput.value.replace(/[^0-9]/g, '');
            if (cleaned !== self.currentPageInput.value) {
                self.currentPageInput.value = cleaned;
            }
            self.currentPageInput.style.width = measureInputWidth(self.currentPageInput.value) + 'px';
        });

        this.currentPageInput.addEventListener('blur', function () {
            self.currentPageInput.value = self.currentPageString;
            self.currentPageInput.style.width = measureInputWidth(self.currentPageString) + 'px';
        });

        form.appendChild(this.currentPageInput);

        var digits = String(o.numPages).length;
        this.currentPageInput.classList.add('digits-' + digits);
        this.currentPageInput.setAttribute('maxlength', digits);

        this.currentPage = document.createElement('div');
        this.currentPage.className = 'flipbook-currentPageNumber';
        currentPageHolder.appendChild(this.currentPage);

        if (!floating) {
            this.currentPageInput.classList.add('skin-color');
        }
    }

    createMenuHeader(el, title, _) {
        var header = document.createElement('div');
        header.className = 'flipbook-menu-header skin-clor flipbook-font';
        el.appendChild(header);

        var titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        titleSpan.className = 'flipbook-menu-title skin-color';
        header.appendChild(titleSpan);

        var btnClose = document.createElement('span');
        btnClose.className = 'flipbook-btn-close skin-color';
        header.appendChild(btnClose);
        btnClose.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.closeMenus();
        });

        var closeIcon = this.createSVGIcon('close');
        closeIcon.classList.add('skin-color');
        btnClose.appendChild(closeIcon);
    }

    createToc() {
        var tocArray = this.options.tableOfContent;

        this.tocHolder = document.createElement('div');
        this.tocHolder.className = 'flipbook-tocHolder flipbook-side-menu skin-color-bg flipbook-border';
        this.wrapper.appendChild(this.tocHolder);
        this.tocHolder.style[this.options.sideMenuPosition] = '0';
        if (this.options.sideMenuPosition === 'right') this.tocHolder.classList.add('flipbook-side-menu-right');
        this.tocHolder.classList.add('flipbook-hidden');

        this.createMenuHeader(this.tocHolder, this.strings.tableOfContent, this.toggleToc);

        this.toc = document.createElement('div');
        this.toc.className = 'flipbook-toc';
        this.tocHolder.appendChild(this.toc);

        var arr = this.options.pages;

        if (!tocArray || !tocArray.length) {
            tocArray = [];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].title) {
                    tocArray.push({
                        title: arr[i].title,
                        page: String(i + 1),
                        pageNumberDisplay: arr[i].name,
                    });
                }
            }
        }

        for (var i = 0; i < tocArray.length; i++) {
            if (arr[i] && arr[i].name && tocArray[i].page) {
                tocArray[i].pageNumberDisplay = arr[tocArray[i].page - 1].name;
            }
        }

        this.tocScroller = this.buildTOC(tocArray);
        this.tocScroller.className = 'flipbook-toc-scroller';
        this.toc.appendChild(this.tocScroller);

        this.tocCreated = true;
        this.toggleToc();
    }

    buildTOC(items) {
        const self = this;
        const ul = document.createElement('ul');
        const expandSvg = this.createSVGIcon('next');

        items.forEach((item) => {
            const li = document.createElement('li');

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('toc-item', 'skin-color');

            const titleContainer = document.createElement('div');
            titleContainer.classList.add('title-container');

            if (item.items && item.items.length > 0) {
                const expandIcon = document.createElement('span');
                expandIcon.classList.add('expand-icon');

                expandIcon.innerHTML = expandSvg.outerHTML;

                expandIcon.addEventListener('click', function (event) {
                    event.stopPropagation();
                    const subUl = li.querySelector('ul');
                    if (subUl.style.display === 'none') {
                        subUl.style.display = 'block';
                        subUl.dataset.expanded = 'true';
                        expandIcon.classList.add('expanded');
                    } else {
                        subUl.style.display = 'none';
                        subUl.dataset.expanded = 'false';
                        expandIcon.classList.remove('expanded');
                    }
                });

                titleContainer.appendChild(expandIcon);
            } else {
                const spacer = document.createElement('span');
                spacer.classList.add('spacer');
                spacer.innerHTML = '&nbsp;';
                titleContainer.appendChild(spacer);
            }

            const titleSpan = document.createElement('span');
            titleSpan.textContent = item.title;
            titleSpan.classList.add('title');
            titleContainer.appendChild(titleSpan);

            itemDiv.appendChild(titleContainer);

            const pageSpan = document.createElement('span');
            pageSpan.textContent = item.pageNumberDisplay || item.page;
            pageSpan.classList.add('page-number');
            itemDiv.appendChild(pageSpan);

            itemDiv.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();

                if (self.options.tableOfContentCloseOnClick) {
                    self.toggleToc(false);
                }

                if (!item.page && item.dest) {
                    if (typeof item.dest === 'string') {
                        self.pdfService.pdfDocument.getDestination(item.dest).then(function (destArray) {
                            self.goToDest(destArray);
                        });
                    } else {
                        self.goToDest(item.dest);
                    }
                } else {
                    var targetPage = Number(item.page);

                    setTimeout(function () {
                        self.goToPage(targetPage);
                    }, 200);
                }
            });

            li.appendChild(itemDiv);

            if (item.items && item.items.length > 0) {
                const subUl = this.buildTOC(item.items);
                subUl.style.display = 'none';
                li.appendChild(subUl);
            }

            ul.appendChild(li);
        });

        return ul;
    }

    goToDest(destArray) {
        }

    enablePrev(val) {
        if (this.prevEnabled == val || !this.btnPrev) return;
        this.enableButton(this.btnPrev, val);
        this.enableButton(this.btnFirst, val);
        this.prevEnabled = val;
        this.Book.enablePrev(val);
    }

    enableNext(val) {
        if (this.nextEnabled == val || !this.btnNext) return;
        this.enableButton(this.btnNext, val);
        this.enableButton(this.btnLast, val);
        this.nextEnabled = val;
        this.Book.enableNext(val);
    }

    enableButton(button, enabled) {
        if (typeof button === 'undefined') {
            return;
        }

        if (enabled) {
            button.classList.remove('disabled');
        } else {
            button.classList.add('disabled');
        }

        button.enabled = enabled;
    }

    resize(force) {
        if (!this.Book || !this.Book.enabled) {
            return;
        }

        const sidebarVisible = this.tocShowing || this.thumbsShowing || this.searchShowing || this.bookmarkShowing;
        let rect = this.bookLayer.getBoundingClientRect();
        if (this.wrapperW === rect.width && this.wrapperH === rect.height && this.sidebarVisible === sidebarVisible) {
            return;
        }

        this.wrapperW = rect.width;
        this.wrapperH = rect.height;
        this.sidebarVisible = sidebarVisible;

        this.updateBookLayerSize();

        if (sidebarVisible) {
            var sidebarWdith = this.tocShowing
                ? this.tocHolder.getBoundingClientRect().width
                : this.thumbsShowing && this.options.thumbsStyle === 'overlay'
                  ? 0
                  : this.thumbs.thumbHolder.getBoundingClientRect().width;

            this.bookLayer.style[this.options.sideMenuPosition] = `${sidebarWdith}px`;
            let sideMenuCss = { bottom: '0px', top: '0px' };
            if (!this.options.sideMenuOverMenu) {
                sideMenuCss.bottom = this.menuBottom.offsetHeight + 'px';
            }
            if (!this.options.sideMenuOverMenu2) {
                sideMenuCss.top = this.menuTop.offsetHeight + 'px';
            }

            var sideMenus = this.wrapper.querySelectorAll('.flipbook-side-menu');

            sideMenus.forEach(function (element) {
                for (var property in sideMenuCss) {
                    if (sideMenuCss.hasOwnProperty(property)) {
                        element.style[property] = sideMenuCss[property];
                    }
                }
            });
        } else {
            this.bookLayer.style[this.options.sideMenuPosition] = '0px';
        }

        this.adjustZoomLimits();

        this.Book.onResize(force);
        this.Book.zoomTo(this.options.zoomMin);
    }

    adjustZoomLimits() {
        var o = this.options;
        var wrapperRatio = this.wrapperW / this.wrapperH;
        var pageRatio = this.pageW / this.pageH;
        var bookRatio = 2 * pageRatio;

        var menuTopHeight = this.menuTop.offsetHeight;
        var menuBottomHeight = this.menuBottom.offsetHeight;
        var manuHeight = Math.max(menuTopHeight, menuBottomHeight);
        var bookMargin = o.bookMargin || 20;

        if (o.menuOverBook && o.menu2OverBook)
            o.zoomMin = (this.wrapperH - 2 * manuHeight - bookMargin) / this.wrapperH;

        // For html-only flipbooks the zoomed-in view is live DOM (the
        // html2canvas bitmap is only shown briefly during page flips), so the
        // texture-resolution cap doesn't apply. Use htmlZoomMax instead.
        const htmlOnly =
            !o.pdfMode && o.pages && o.pages.length && o.pages.every((p) => !p.src && p.htmlContent);

        if (htmlOnly) {
            o.zoomMax = Math.max(o.htmlZoomMax || 4, o.zoomMin);
            return;
        }

        // Cap zoom based on the page's CSS-pixel size, not physical pixels.
        // Reasoning: users perceive zoom in CSS units, but if we cap at
        // physical pixels (visualH × dpr) a retina device with dpr=3 zooms
        // ~3× less than a non-retina display with the same source texture,
        // even though the visible CSS extent is the same. Capping by CSS
        // px gives consistent zoom range across devices; mild upsampling
        // on retina at peak zoom is barely visible (3× more raster
        // bandwidth absorbs it).
        //
        // Use the VISIBLE area, not bookLayer dimensions: webgl extends the
        // bookLayer with bookVerticalPadding so panning at zoom > 1 has room
        // to move; that extension shouldn't inflate the at-zoom-1 page-size
        // estimate. visualH/W is the cell area the page actually occupies
        // when fit at zoom=1.
        const padY = (this.bookVerticalPadding || 0) * 2;
        const visualH = Math.max(1, this.wrapperH - padY);
        const visualW = this.wrapperW;
        const visualRatio = visualW / visualH;

        if (o.viewMode == 'scroll') {
            // Scroll is single-page: cap zoom so the visual page height in
            // CSS pixels stays close to the source texture size. Use
            // pageRatio (not bookRatio) since there's no spread.
            o.zoomMax = (o.zoomSize / visualH) * (visualRatio > pageRatio ? 1 : pageRatio / visualRatio);
        } else if (
            o.responsiveView &&
            visualW <= o.responsiveViewTreshold &&
            visualRatio < bookRatio &&
            visualRatio < o.responsiveViewRatio
        ) {
            o.zoomMax = (o.zoomSize / visualH) * (visualRatio > pageRatio ? 1 : pageRatio / visualRatio);
        } else {
            o.zoomMax = (o.zoomSize / visualH) * (visualRatio > bookRatio ? 1 : bookRatio / visualRatio);
        }

        o.zoomMax = Math.max(o.zoomMax, o.zoomMin);
    }

    pdfResize() {
        var self = this;
        self.Book.onZoom();
    }

    createThumbs() {
        this.thumbs = new FLIPBOOK.Thumbnails(this);
    }

    toggleThumbs(value) {
        if (!this.thumbs) {
            this.createThumbs();
        }

        if (typeof value != 'undefined') {
            this.thumbsShowing = !value;
        }

        // If closing, just close whatever is showing
        if (this.thumbsShowing || this.thumbStripShowing) {
            if (this.thumbsShowing) {
                this.thumbs.hide();
                this.thumbsShowing = false;
            }
            if (this.thumbStripShowing) {
                this.hideThumbStrip();
            }
            this.resize();
            return;
        }

        // Opening: restore last active view, or use configured default
        this.closeMenus();
        const view = this.lastThumbView || this.options.thumbsDefaultView;
        if (view === 'strip') {
            this.showThumbStrip();
        } else {
            this.thumbs.show(true);
            this.thumbsShowing = true;
        }

        this.resize();
    }

    minimizeThumbs() {
        if (this.thumbsShowing) {
            this.thumbs.hide();
            this.thumbsShowing = false;
        }
        this.lastThumbView = 'strip';
        this.showThumbStrip();
        this.resize();
    }

    maximizeThumbs() {
        this.hideThumbStrip();
        this.lastThumbView = 'grid';
        if (!this.thumbs) {
            this.createThumbs();
        }
        this.thumbs.show(true);
        this.thumbsShowing = true;
        this.resize();
    }

    showThumbStrip() {
        if (!this.thumbStrip) {
            this.thumbStrip = new FLIPBOOK.ThumbStrip(this);
        }
        this.thumbStrip.show();
        this.thumbStripShowing = true;
        this.updateBookLayerSize();
        this.resize();
    }

    hideThumbStrip() {
        if (this.thumbStrip) {
            this.thumbStrip.hide();
        }
        this.thumbStripShowing = false;
        this.updateBookLayerSize();
        this.resize();
    }

    toggleToc(value) {
        if (!this.tocCreated) {
            this.createToc();
            return;
        }

        if (!this.tocShowing || value) {
            this.closeMenus();
            this.tocShowing = true;
            this.tocHolder.classList.remove('flipbook-hidden');
            this.tocHolder.classList.remove('flipbook-side-menu-visible');
            setTimeout(() => {
                this.tocHolder.classList.add('flipbook-side-menu-visible');
            }, 20);
        } else {
            this.tocHolder.classList.remove('flipbook-side-menu-visible');
            this.tocShowing = false;

            this.tocHolder.querySelectorAll('.expanded').forEach((el) => {
                el.classList.remove('expanded');
            });

            this.tocHolder.querySelectorAll('[data-expanded="true"]').forEach((el) => {
                el.dataset.expanded = 'false';
                el.style.display = 'none';
            });
        }

        this.resize();
    }

    toggleSearch(value) {
        }

    toggleBookmark(value) {
        }

    closeMenus() {
        if (this.thumbsShowing) {
            this.toggleThumbs();
        }
        if (this.thumbStripShowing) {
            this.hideThumbStrip();
        }
        if (this.tocShowing) {
            this.toggleToc();
        }
        if (this.searchShowing) {
            this.toggleSearch();
        }
        if (this.bookmarkShowing) {
            this.toggleBookmark();
        }

        if (this.printMenuShowing) {
            this.togglePrintMenu();
        }
        if (this.dlMenuShowing) {
            this.toggleDownloadMenu();
        }
        if (this.shareMenuShowing) {
            this.toggleShareMenu();
        }
        if (this.toolsMenuShowing) {
            this.toggleToolsMenu();
        }
        if (this.notesMenuShowing) {
            this.toggleNotesMenu();
        }
        if (this.passwordMenuShowing) {
            this.togglePasswordMenu();
        }
        this.tooltip2.hideTooltip();
    }

    toggleToolsMenu() {
        var self = this;

        if (!this.toolsMenu.parentNode) {
            this.btnTools.appendChild(this.toolsMenu);

            this.toolsMenu.addEventListener('click', function (event) {
                event.stopPropagation();
            });

            document.addEventListener('click', function (event) {
                if (self.toolsMenuShowing) {
                    self.toggleToolsMenu();
                }
                if (self.shareMenuShowing) {
                    self.toggleShareMenu();
                }
            });
        }

        if (!this.toolsMenuShowing) {
            this.closeMenus();
            this.toolsMenu.classList.remove('flipbook-hidden');
            this.toolsMenuShowing = true;
            this.btnTools.classList.add('flipbook-btn-active');
            this.btnTools.classList.remove('flipbook-has-tooltip');
            this.clampSubmenuToViewport(this.toolsMenu);
        } else {
            this.toolsMenu.classList.add('flipbook-hidden');
            this.toolsMenuShowing = false;
            this.btnTools.classList.remove('flipbook-btn-active');
            this.btnTools.classList.add('flipbook-has-tooltip');
        }
    }

    // Keep a submenu (tools/share) fully inside the viewport.
    // Uses translate so we don't have to know its original offset — simply
    // measures after display and shifts horizontally/vertically if clipped.
    clampSubmenuToViewport(menu) {
        if (!menu) return;
        menu.style.transform = '';
        const rect = menu.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pad = 4;
        let shiftX = 0;
        let shiftY = 0;
        if (rect.right > vw - pad) shiftX = vw - pad - rect.right;
        if (rect.left + shiftX < pad) shiftX = pad - rect.left;
        if (rect.bottom > vh - pad) shiftY = vh - pad - rect.bottom;
        if (rect.top + shiftY < pad) shiftY = pad - rect.top;
        if (shiftX || shiftY) {
            menu.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
        }
    }

    togglePrintMenu() {
        var self = this;

        if (!this.printMenu) {
            this.printMenu = document.createElement('div');
            this.printMenu.className = 'flipbook-sub-menu flipbook-font flipbook-border';
            this.wrapper.appendChild(this.printMenu);

            var center = document.createElement('div');
            center.className = 'flipbook-sub-menu-center';
            this.printMenu.appendChild(center);

            var content = document.createElement('div');
            content.className = 'flipbook-sub-menu-content skin-color-bg';
            center.appendChild(content);

            this.createMenuHeader(content, this.strings.print, this.togglePrintMenu.bind(this));

            var currentPageButton = document.createElement('a');
            currentPageButton.innerHTML =
                '<div class="c-p skin-color flipbook-btn">' + this.strings.printCurrentPage + '</div>';
            content.appendChild(currentPageButton);
            currentPageButton.addEventListener('click', function () {
                self.printPage(self.cPage[0], this);
            });

            var leftPageButton = document.createElement('a');
            leftPageButton.innerHTML =
                '<div class="c-l-p skin-color flipbook-btn">' + this.strings.printLeftPage + '</div>';
            content.appendChild(leftPageButton);
            leftPageButton.addEventListener('click', function () {
                self.printPage(self.cPage[0], this);
            });

            var rightPageButton = document.createElement('a');
            rightPageButton.innerHTML =
                '<div class="c-r-p skin-color flipbook-btn">' + this.strings.printRightPage + '</div>';
            content.appendChild(rightPageButton);
            rightPageButton.addEventListener('click', function () {
                self.printPage(self.cPage[1], this);
            });

            var allPagesButton = document.createElement('a');
            allPagesButton.innerHTML = '<div class="skin-color flipbook-btn">' + this.strings.printAllPages + '</div>';
            content.appendChild(allPagesButton);
            allPagesButton.addEventListener('click', function () {
                self.togglePrintWindow();
            });

            this.closeMenus();
            this.printMenuShowing = true;
            this.updateCurrentPage();
        } else if (!this.printMenuShowing) {
            this.closeMenus();
            this.printMenu.style.display = 'block';
            this.printMenuShowing = true;
            this.updateCurrentPage();
        } else {
            this.printMenu.style.display = 'none';
            this.printMenuShowing = false;
        }
    }

    toggleDownloadMenu() {
        }

    toggleShareMenu() {
        var self = this;
        if (!this.shareMenu.parentNode) {
            this.btnShare.appendChild(this.shareMenu);

            this.shareMenu.addEventListener('click', function (event) {
                event.stopPropagation();
            });

            document.addEventListener('click', function (event) {
                if (self.toolsMenuShowing) {
                    self.toggleToolsMenu();
                }
                if (self.shareMenuShowing) {
                    self.toggleShareMenu();
                }
            });

            var o = this.options;
            var networks = [
                'facebook',
                'twitter',
                ];

            var left = window.screen.width / 2 - 300;
            var top = window.screen.height / 2 - 300;

            networks.forEach(function (network) {
                if (o[network].enabled) {
                    var btn = document.createElement('span');
                    btn.className = 'flipbook-menu-btn-wrapper flipbook-has-tooltip skin-color';
                    btn.setAttribute('data-network', network);
                    btn.setAttribute('data-tooltip', o[network].title || o.strings[network]);

                    btn.style.width = `${o.btnSize}px`;
                    btn.style.height = `${o.btnSize}px`;

                    let svg = self.createSVGIcon(network);
                    svg.classList.add('skin-color');
                    btn.appendChild(svg);

                    self.shareMenu.appendChild(btn);

                    btn.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var network = this.dataset.network;

                        if (network == 'copyLink') {
                            var currentUrl = o.shareUrl || window.location.href;
                            try {
                                currentUrl = decodeURIComponent(currentUrl);
                            } catch (e) {}

                            function fallbackCopyTextToClipboard(text) {
                                const textArea = document.createElement('textarea');
                                textArea.value = text;
                                textArea.style.position = 'fixed'; // Avoid scrolling to bottom of page
                                document.body.appendChild(textArea);
                                textArea.focus({ preventScroll: true });
                                textArea.select();
                                try {
                                    document.execCommand('copy');
                                    showCopiedFeedback();
                                } catch (err) {
                                    console.error('Fallback: Unable to copy text', err);
                                }
                                document.body.removeChild(textArea);
                            }

                            function showCopiedFeedback() {
                                btn.setAttribute('data-tooltip', o.strings.copied);
                                if (self.tooltip2) {
                                    self.tooltip2.showTooltip(btn);
                                }
                                setTimeout(() => {
                                    btn.setAttribute('data-tooltip', o.strings.copyLink);
                                    if (self.tooltip2) {
                                        self.tooltip2.hideTooltip();
                                    }
                                }, 2000);
                            }

                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard
                                    .writeText(currentUrl)
                                    .then(() => {
                                        showCopiedFeedback();
                                    })
                                    .catch((err) => {
                                        console.error('Failed to copy the link: ', err);
                                        fallbackCopyTextToClipboard(currentUrl);
                                    });
                            } else {
                                fallbackCopyTextToClipboard(currentUrl);
                            }

                            self.sendGAEvent({
                                event: 'flipbook_share',
                                book_name: self.options.name,
                                url: currentUrl,
                                nonInteraction: true,
                            });
                        } else {
                            var text = encodeURIComponent(
                                o.shareTitle || o[network].description || 'Check out this flipbook'
                            );
                            var url = encodeURIComponent(o.shareUrl || window.location.href);
                            var image = encodeURIComponent(o.shareImage || '');
                            var shareUrl;

                            switch (network) {
                                case 'facebook':
                                    shareUrl = 'https://www.facebook.com/sharer.php?u=' + url + '&t=' + text;
                                    break;
                                case 'twitter':
                                    shareUrl = 'https://twitter.com/intent/tweet?text=' + text + '&url=' + url;
                                    break;
                                }

                            window.open(
                                shareUrl,
                                'Share',
                                'toolbar=no, location=no, directories=no, status=no, ' +
                                    'menubar=no, scrollbars=no, resizable=no, copyhistory=no, ' +
                                    'width=600, height=600, top=' +
                                    top +
                                    ', left=' +
                                    left
                            );

                            self.sendGAEvent({
                                event: 'flipbook_share',
                                book_name: self.options.name,
                                url: shareUrl,
                                nonInteraction: true,
                            });
                        }
                    });
                }
            });
        }

        if (!this.shareMenuShowing) {
            this.closeMenus();
            this.shareMenu.classList.remove('flipbook-hidden');
            this.shareMenuShowing = true;
            this.btnShare.classList.add('flipbook-btn-active');
            this.btnShare.classList.remove('flipbook-has-tooltip');

            setTimeout(function () {
                self.shareMenu.style.right = '0';
                const wrapperRect = self.wrapper.getBoundingClientRect();
                const menuRect = self.shareMenu.getBoundingClientRect();

                if (menuRect.left < wrapperRect.left) {
                    self.shareMenu.style.right =
                        menuRect.left - wrapperRect.left - (wrapperRect.width - menuRect.width) / 2 + 'px';
                }
            }, 0);
        } else {
            this.shareMenu.classList.add('flipbook-hidden');
            this.shareMenuShowing = false;
            this.btnShare.classList.remove('flipbook-btn-active');
            this.btnShare.classList.add('flipbook-has-tooltip');
        }
    }

    toggleNotesMenu() {
        }

    updateNoteSettings(noteType) {
        this.options.noteTypes.forEach(function (type) {
            if (type.id == noteType.id) {
                type.enabled = noteType.enabled;
            }
        });
        this.noteService.updateNoteVisibility();
    }

    bookmarkPage(index) {
        }

    removeBookmark(index) {
        }

    isBookmarked(index) {
        var arr = this.getBookmarkedPages();
        return arr.indexOf(String(index)) > 0;
    }

    getBookmarkedPages() {
        var str = localStorage.getItem(this.options.name + '_flipbook_bookmarks');
        if (str) {
            return str.split(';');
        } else {
            return [];
        }
    }

    setBookmarkedPages(arr) {
        localStorage.setItem(this.options.name + '_flipbook_bookmarks', arr.join(';'));
    }
    async bitmapToBlobUrl(bmp) {
        // OffscreenCanvas when available (fast path)
        if (typeof OffscreenCanvas !== 'undefined') {
            const oc = new OffscreenCanvas(bmp.width, bmp.height);
            const ctx = oc.getContext('2d');
            ctx.drawImage(bmp, 0, 0);
            const blob = await oc.convertToBlob({ type: 'image/png' });
            // If you won't reuse the bitmap, free it
            if (bmp.close)
                try {
                    bmp.close();
                } catch (_) {}
            return URL.createObjectURL(blob);
        }
        // Fallback to regular canvas
        const c = document.createElement('canvas');
        c.width = bmp.width;
        c.height = bmp.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
        if (bmp.close)
            try {
                bmp.close();
            } catch (_) {}
        // help GC
        c.width = c.height = 1;
        return URL.createObjectURL(blob);
    }

    async urlToBlobUrl(u) {
        const res = await fetch(u, { mode: 'cors' });
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    }

    async printPage(index, _) {
        const page = this.options.pages[index];
        const size = this.options.pageTextureLarge;

        if (!page) return;
        if (page.locked) return;

        let url = null;
        const tempBlobUrls = []; // so we can revoke later (optional)

        // try {
        // 1) Explicit print URL (could be image or PDF) — just use it.
        if (page.print) {
            url = page.print;

            // 2) Prefer direct page.src if present (already a usable URL or data: / blob:)
        } else if (page.src) {
            url = page.src;

            // 3) HTMLImageElement path — avoid canvas; use its currentSrc/src
        } else if (page.images && page.images[size]) {
            const img = page.images[size];
            const src = img.currentSrc || img.src;

            if (src) {
                // Usually you can pass this straight through:
                url = src;

                // If you *need* a blob URL (e.g., for cross-window lifetime), do:
                // const blobUrl = await urlToBlobUrl(src);
                // tempBlobUrls.push(blobUrl);
                // url = blobUrl;
            }

            // 4) ImageBitmap path — must serialize once, use blob URL
        } else if (page.imageBitmap && page.imageBitmap[size]) {
            const bmp = page.imageBitmap[size];
            const blobUrl = await this.bitmapToBlobUrl(bmp);
            tempBlobUrls.push(blobUrl);
            url = blobUrl;
        }
        // } catch (e) {
        //     console.warn('printPage: building URL failed, will try to loadPage()', e);
        // }

        if (url) {
            // If your togglePrintWindow revokes only the blob URLs it creates,
            // you can optionally revoke ours after a short delay:
            // this.togglePrintWindow(url);
            // setTimeout(() => tempBlobUrls.forEach(URL.revokeObjectURL), 5000);

            // Better: let togglePrintWindow clean up — pass an array it can revoke:
            if (!this._printTempUrls) this._printTempUrls = [];
            this._printTempUrls.push(...tempBlobUrls);
            this.togglePrintWindow(url);
            return;
        }

        // Nothing usable yet — load the page, then retry
        const pageToLoad = this.options.cover ? index : index + 1;
        this.loadPage(pageToLoad, size, () => {
            // re-enter; now one of the fast paths should trigger
            this.printPage(index);
        });
    }

    downloadPage(index) {
        }

    printFile(url) {
        const isIframe = window.self !== window.top;
        if (isIframe) {
            parent.postMessage(
                {
                    type: 'print',
                    url: url,
                },
                '*'
            );
            return;
        }

        try {
            var printIframe = document.createElement('iframe');
            printIframe.classList.add('flipbook-hidden');
            printIframe.src = url;
            document.body.appendChild(printIframe);
            printIframe.contentWindow.onload = function () {
                var self = this;
                setTimeout(function () {
                    self.print();
                }, 100);
            };
        } catch (e) {}
    }

    togglePrintWindow(url) {
        const isIframe = window.self !== window.top;
        if (isIframe && url) {
            parent.postMessage(
                {
                    type: 'print',
                    url: url,
                },
                '*'
            );
            return;
        }

        var self = this;
        var printContent = '';

        if (url) {
            printContent = url;
        } else if (self.options.printPdfUrl) {
            self.printFile(self.options.printPdfUrl);
            return;
        } else if (self.options.pdfUrl) {
            self.printFile(self.options.pdfUrl);
            return;
        }

        function printme() {
            var link = 'about:blank';
            var pw = window.open(link, '_new');
            pw.document.open();
            if (url) {
                printContent = '<img src="' + url + '"/>\n';
            } else {
                for (var i = 0; i < self.options.pages.length; i++) {
                    if (self.options.pages[i].src) {
                        printContent += '<img src="' + self.options.pages[i].src.toString() + '"/>\n';
                    }
                }
            }

            var printHtml = printWindowHtml(printContent);
            pw.document.write(printHtml);
            pw.document.close();
        }

        function printWindowHtml(printContent) {
            return (
                '<html>\n' +
                '<head>\n' +
                '<script>\n' +
                'function step1() {\n' +
                "  setTimeout('step2()', 10);\n" +
                '}\n' +
                'function step2() {\n' +
                "  window.addEventListener('afterprint', function(){\n" +
                '       debugger;\n' +
                '       window.close();\n' +
                '  });\n' +
                '  window.print();\n' +
                '}\n' +
                '</scr' +
                'ipt>\n' +
                '<style>img {' +
                'display:block;' +
                'max-width:100%;' +
                'page-break-after: always;' +
                '}' +
                '@media print header{' +
                'display: none;' +
                '}</style>\n' +
                '</head>\n' +
                "<body onLoad='step1()'>\n" +
                printContent +
                '</body>\n' +
                '</html>\n'
            );
        }

        printme();
    }

    thumbsVertical() {
        if (!this.thumbsCreated) {
            return;
        }
    }

    isIOS() {
        return /iP(ad|hone|od)/.test(navigator.userAgent);
    }

    fakeScrollToHideToolbar() {
        if (!this.isIOS()) return;
        // Scroll down a bit, then immediately scroll back up
        const x = window.scrollX || window.pageXOffset;
        const y = window.scrollY || window.pageYOffset;
        window.scrollTo(x, y + 1);
        setTimeout(() => {
            window.scrollTo(x, y);
        }, 10);
    }

    fakeScrollToShowToolbar() {
        if (!this.isIOS()) return;
        // Scroll up a bit, then immediately scroll back down
        const x = window.scrollX || window.pageXOffset;
        const y = window.scrollY || window.pageYOffset;
        window.scrollTo(x, y - 1);
        setTimeout(() => {
            window.scrollTo(x, y);
        }, 10);
    }

    canFullscreen() {
        return !!(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled
        );
    }

    requestFullscreen(element) {
        const methods = ['requestFullscreen', 'mozRequestFullScreen', 'webkitRequestFullscreen', 'msRequestFullscreen'];
        for (const method of methods) {
            if (element[method]) {
                try {
                    const result = element[method]();
                    if (result && typeof result.then === 'function') {
                        result.catch((error) => this.handleFullscreenError(error));
                    }
                    return;
                } catch (error) {
                    this.handleFullscreenError(error);
                    return;
                }
            }
        }
        this.handleFullscreenError(new Error('Fullscreen API is not supported on this element.'));
    }

    exitFullscreen() {
        const methods = ['exitFullscreen', 'mozCancelFullScreen', 'webkitExitFullscreen', 'msExitFullscreen'];
        for (const method of methods) {
            if (document[method]) {
                try {
                    const result = document[method]();
                    if (result && typeof result.then === 'function') {
                        result.catch((error) => this.handleFullscreenError(error));
                    }
                    return;
                } catch (error) {
                    this.handleFullscreenError(error);
                    return;
                }
            }
        }
        this.handleFullscreenError(new Error('Exiting fullscreen API is not supported in this document.'));
    }

    toggleExpand() {
        const elem = this.fullscreenElement;
        const isFullscreen = () => {
            return !!(
                document.fullscreenElement ||
                document.mozFullScreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );
        };

        try {
            if (isFullscreen()) {
                this.exitFullscreen();
            } else {
                this.requestFullscreen(elem);
            }
        } catch (error) {
            this.handleFullscreenError(error);
        }

        if (this.toolsMenuShowing) {
            this.toggleToolsMenu();
        }
    }

    handleFullscreenError(error) {
        const elem = this.fullscreenElement;
        this.fullscreenActive = !this.fullscreenActive;
        const isIframe = window.self !== window.top;
        if (isIframe) {
            parent.postMessage(
                {
                    type: 'toggleExpand',
                    fullscreenActive: this.fullscreenActive,
                },
                '*'
            );
        } else {
            if (this.fullscreenActive) {
                if (elem !== document.body) {
                    this.saveScrollPosition();
                    document.body.classList.add('flipbook-overflow-hidden');
                    elem.classList.add('flipbook-browser-fullscreen');
                    this.elemParent = elem.parentNode;
                    document.body.appendChild(elem);
                    // this.fakeScrollToHideToolbar();
                }
            } else if (this.elemParent) {
                this.elemParent.appendChild(elem);
                this.elemParent = null;
                // this.fakeScrollToShowToolbar();
                document.body.classList.remove('flipbook-overflow-hidden');
                elem.classList.remove('flipbook-browser-fullscreen');
                this.restoreScrollPosition();
            }
        }

        this.toggleIcon(this.btnExpand, !this.fullscreenActive);
    }

    saveScrollPosition() {
        document.body.dataset.flipbookScrollX = window.scrollX || window.pageXOffset;
        document.body.dataset.flipbookScrollY = window.scrollY || window.pageYOffset;
    }

    restoreScrollPosition() {
        const scrollX = parseInt(document.body.dataset.flipbookScrollX || 0, 10);
        const scrollY = parseInt(document.body.dataset.flipbookScrollY || 0, 10);

        if (!isNaN(scrollX) && !isNaN(scrollY)) {
            window.scrollTo(scrollX, scrollY);
            delete document.body.dataset.flipbookScrollX;
            delete document.body.dataset.flipbookScrollY;
        }
    }

    expand() {}

    toggleSinglePage() {
        }

    toggleAutoplay(value) {
        }
};

// ZoomLayer — high-resolution overlay for zoomed-in viewing of book3 modes.
// When zoom > 1, book3's transform-stretched cached raster looks blurry
// (compositor caches at low CSS layout box and GPU-stretches). We hide
// book3 and show this layer, which puts the current spread's page images
// in a native overflow:auto container CSS-sized at scale × fit. Browser
// rasterizes images at display size — sharp.
FLIPBOOK.ZoomLayer = class {
    constructor(main) {
        this.main = main;
        this.options = main.options;
        this.shown = false;
        this.scale = 1;

        const el = document.createElement('div');
        el.className = 'flipbook-zoom-layer';
        el.style.cssText = [
            'position:absolute',
            'inset:0',
            'display:none',
            'overflow:auto',
            'z-index:5',
            'background:transparent',
            '-webkit-overflow-scrolling:touch',
            'touch-action:pan-x pan-y',
            'cursor:grab',
        ].join(';');
        main.bookLayer.appendChild(el);
        this.el = el;

        const content = document.createElement('div');
        content.className = 'flipbook-zoom-layer-content';
        content.style.cssText = [
            'position:relative',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'min-width:100%',
            'min-height:100%',
            'width:max-content',
            'margin:0 auto',
            'gap:0',
        ].join(';');
        el.appendChild(content);
        this.content = content;

        // Block iOS native pinch on the layer; pinch flows through main's
        // touchSwipe → main.zoomTo → ZoomLayer.zoomTo same as scroll mode.
        ['gesturestart', 'gesturechange', 'gestureend'].forEach((name) => {
            el.addEventListener(name, (e) => e.preventDefault());
        });

        this._setupDragScroll();
    }

    // Mouse drag-to-scroll. overflow:auto doesn't drag-scroll on desktop;
    // wire up a mouse handler so click-and-drag pans the zoomed spread
    // (touch users get native panning via touch-action: pan-x pan-y).
    _setupDragScroll() {
        const el = this.el;
        let down = false;
        let startX = 0,
            startY = 0,
            startSL = 0,
            startST = 0;
        let moved = false;

        el.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('a, button, input, select, textarea')) return;
            down = true;
            moved = false;
            startX = e.clientX;
            startY = e.clientY;
            startSL = el.scrollLeft;
            startST = el.scrollTop;
            el.style.cursor = 'grabbing';
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
                    el.scrollLeft = startSL - dx;
                    el.scrollTop = startST - dy;
                }
            },
            { passive: false }
        );

        const stop = (e) => {
            if (!down) return;
            const wasMoved = moved;
            down = false;
            el.style.cursor = 'grab';
            // Click without drag → zoom out (works on touch via the
            // synthetic click event browsers emit after a tap).
            if (!wasMoved && e && e.target && (!e.target.closest || !e.target.closest('a, button, input, select, textarea'))) {
                this._zoomOut();
            }
        };
        window.addEventListener('mouseup', stop);
        window.addEventListener('mouseleave', stop);
    }

    _zoomOut() {
        const main = this.main;
        if (!main || typeof main.zoomTo !== 'function') return;
        const zoomMin = main.getZoomMin ? main.getZoomMin() : 1;
        main.zoomTo(zoomMin, main.options.zoomTime || 300);
    }

    // Asynchronous: populate images, await decode, only THEN reveal the
    // layer. Otherwise users see an empty white panel during the ~50-200ms
    // it takes to fetch / decode high-tier renders.
    async show(scale) {
        if (this.shown) return;
        if (typeof scale === 'number') this.scale = scale;
        const myToken = ++this._loadToken;

        this._populate();
        this._layout();

        const imgs = Array.from(this.content.children).filter((c) => c.tagName === 'IMG');
        const decodes = imgs.map((img) => {
            // decode() requires src to be set first; loadPage may set it
            // async — wait for src to populate then decode.
            const waitSrc = new Promise((resolve) => {
                if (img.src) return resolve();
                const id = setInterval(() => {
                    if (img.src) {
                        clearInterval(id);
                        resolve();
                    }
                }, 30);
                setTimeout(() => {
                    clearInterval(id);
                    resolve();
                }, 5000);
            });
            return waitSrc.then(() => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
        });
        await Promise.all(decodes);

        // hide() invalidates the token so a stale show() can't reveal the
        // layer after the user has zoomed back out.
        if (this._loadToken !== myToken) return;

        this.shown = true;
        this.el.style.display = 'block';
        const Book = this.main.Book;
        if (Book && Book.wrapper && Book.wrapper.style) {
            this._prevBookVisibility = Book.wrapper.style.visibility;
            Book.wrapper.style.visibility = 'hidden';
        }
        // Override the .flipbook-zoomed-in CSS rule on bookLayer that sets
        // touch-action: none. The layer needs pan-x pan-y; touch-action
        // chain uses the most restrictive ancestor, so relax bookLayer
        // while the layer is active.
        this._prevBookLayerTouchAction = this.main.bookLayer.style.touchAction;
        this.main.bookLayer.style.touchAction = 'pan-x pan-y';
    }

    hide() {
        // Invalidate any in-flight show (token mismatch makes it bail).
        this._loadToken = (this._loadToken || 0) + 1;
        if (!this.shown) {
            // Tear down the half-prepared content even if we never reached
            // the visible state.
            this.content.replaceChildren();
            return;
        }
        this.shown = false;
        this.el.style.display = 'none';
        this.content.replaceChildren();
        const Book = this.main.Book;
        if (Book && Book.wrapper && Book.wrapper.style) {
            Book.wrapper.style.visibility = this._prevBookVisibility || '';
        }
        this.main.bookLayer.style.touchAction = this._prevBookLayerTouchAction || '';
        this.scale = 1;
    }

    // Pull current visible spread's page indices from the underlying book
    // and render a wrapper per page containing both a high-tier <img>
    // and a scaled HTML overlay (text layer / links / captions).
    _populate() {
        const Book = this.main.Book;
        const o = this.options;
        const size = o.pageTextureLarge;

        const indices = [];
        const left = Book.getLeftPage && Book.getLeftPage();
        const right = Book.getRightPage && Book.getRightPage();
        if (left && !Book.singlePage && typeof left.indexBack === 'number') {
            indices.push(left.indexBack);
        }
        if (right && typeof right.indexFront === 'number') {
            indices.push(right.indexFront);
        }
        if (indices.length === 0) {
            const p = this.main.currentPageValue;
            if (typeof p === 'number') indices.push(Math.max(0, p - 1));
        }

        this.content.replaceChildren();
        indices.forEach((index) => {
            const pageEl = document.createElement('div');
            pageEl.className = 'flipbook-zoom-layer-page';
            pageEl.style.cssText = 'position:relative;flex-shrink:0;background:#fff;';

            const img = document.createElement('img');
            img.className = 'flipbook-zoom-layer-img';
            img.draggable = false;
            img.style.cssText = 'display:block;width:100%;height:100%;user-select:none;pointer-events:none;';
            pageEl.appendChild(img);

            // HTML overlay container — sized in _layout to a 1000-tall
            // coordinate space then scaled to scaledFitH (matches how
            // book3 / scroll size their per-page html overlays).
            const htmlEl = document.createElement('div');
            htmlEl.className = 'flipbook-zoom-layer-html';
            htmlEl.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;';
            pageEl.appendChild(htmlEl);
            pageEl._htmlEl = htmlEl;
            pageEl._index = index;

            this.content.appendChild(pageEl);

            // Image (highest tier).
            this.main.loadPage(index, size, (page) => {
                if (page && page.image) {
                    const pageImg = page.image[size] || page.image;
                    if (pageImg && pageImg.src) img.src = pageImg.src;
                }
            });

            // HTML overlay — clone the page's htmlContent into the layer
            // so book3's original DOM stays untouched.
            if (this.main.loadPageHTML) {
                this.main.loadPageHTML(index, (html) => {
                    if (!html) return;
                    const src = html.jquery ? html[0] : html;
                    if (!src || !src.cloneNode) return;
                    const clone = src.cloneNode(true);
                    htmlEl.replaceChildren(clone);
                });
            }
        });

        this._layout();
    }

    // Size each page wrapper in CSS so the browser rasterizes at display
    // dimensions. Spread fits the viewport at scale=1; scale > 1 grows
    // the wrappers proportionally. The HTML overlay inside is sized at
    // the (1000-tall) coord space and transform-scaled to scaledFitH.
    _layout() {
        const o = this.options;
        const numPages = this.content.children.length;
        if (numPages === 0) return;

        const elW = this.el.clientWidth || 1;
        const elH = this.el.clientHeight || 1;
        const pageRatio = o.pageWidth / o.pageHeight;
        const spreadRatio = numPages * pageRatio;

        let fitH;
        if (elW / spreadRatio <= elH) fitH = elW / spreadRatio;
        else fitH = elH;

        const scaledFitH = fitH * this.scale;
        const scaledFitW = scaledFitH * pageRatio;

        Array.from(this.content.children).forEach((pageEl) => {
            pageEl.style.height = scaledFitH + 'px';
            pageEl.style.width = scaledFitW + 'px';
            const htmlEl = pageEl._htmlEl;
            if (htmlEl) {
                // 1000 is the convention book3 / scroll use for HTML coord
                // space (matches PDF text layer assumed pageHeight = 1000).
                htmlEl.style.width = ((1000 * scaledFitW) / scaledFitH) + 'px';
                htmlEl.style.height = '1000px';
                htmlEl.style.transform = 'scale(' + (scaledFitH / 1000) + ') translateZ(0)';
            }
        });
    }

    // Programmatic zoom called from main.zoomTo when layer is the active
    // zoom target. (x, y) come in as main.wrapper-relative — translate to
    // layer-relative for focal preservation.
    zoomTo(scale, time, x, y) {
        if (!this.shown) return;

        let fx = x;
        let fy = y;
        if (typeof fx === 'number' && typeof fy === 'number' && this.main.wrapper) {
            const wRect = this.main.wrapper.getBoundingClientRect();
            const lRect = this.el.getBoundingClientRect();
            fx -= lRect.left - wRect.left;
            fy -= lRect.top - wRect.top;
        }
        const focalX = typeof fx === 'number' ? fx : this.el.clientWidth / 2;
        const focalY = typeof fy === 'number' ? fy : this.el.clientHeight / 2;

        const sl = this.el.scrollLeft;
        const st = this.el.scrollTop;
        const oldScale = this.scale;
        const cx = (sl + focalX) / oldScale;
        const cy = (st + focalY) / oldScale;

        this.scale = scale;
        this._layout();

        this.el.scrollLeft = Math.max(0, cx * scale - focalX);
        this.el.scrollTop = Math.max(0, cy * scale - focalY);
    }

    onResize() {
        if (!this.shown) return;
        this._layout();
    }
};

FLIPBOOK.Book = class {
    constructor(main, options) {
        this.rightIndex = 0;
        this.options = options;
        this.main = main;
        this.pageWidth = options.pageWidth;
        this.pageHeight = options.pageHeight;
        this.singlePage = options.singlePageMode;

        const pages = options.pages;
        let numSheets = Math.ceil(pages.length / 2);

        if (options.singlePageMode) {
            numSheets = pages.length;
        } else if (!options.cover && pages.length % 2 === 0) {
            numSheets += 1;
        }

        this.numSheets = numSheets;
    }

    goToPage() {}

    getRightIndex() {}

    getPageHeight() {
        const bookWidth = this.bookWidth || 1;
        return 10;
    }

    canFlipNext() {
        if (this.flippedright > 0) {
            if (this.singlePage && this.flippedright == 1) {
                return false;
            } else if (this.view == 1 && this.isFocusedLeft && this.isFocusedLeft()) {
                return true;
            } else if (this.flippedright == 1 && !this.options.rightToLeft && !this.options.backCover) {
                return false;
            } else if (this.flippedright == 1 && this.options.rightToLeft && !this.options.cover) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    }

    canFlipPrev() {
        const first = this.options.cover ? 0 : 1;
        if (this.flippedleft > first) {
            if (this.view == 1 && this.isFocusedRight && this.isFocusedRight()) {
                return true;
            } else if (this.flippedleft == 1 && this.options.rightToLeft && !this.options.backCover) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    }

    getCurrentPageNumber() {
        var ri = this.rightIndex % 2 == 1 ? this.rightIndex + 1 : this.rightIndex;
        if (this.options.rightToLeft) {
            ri = this.options.pages.length - ri;
            return this.isFocusedRight() ? ri : ri + 1;
        } else {
            return this.isFocusedLeft() ? ri : ri + 1;
        }
    }

    async startPageItems(htmlContent) {
        if (!htmlContent) return;

        const mediaItems = htmlContent.querySelectorAll('.flipbook-page-item');
        const youtubeItems = htmlContent.querySelectorAll('.flipbook-page-item-youtube');

        // Native <video>/<audio> handling (unchanged + small safety fixes)
        if (!htmlContent.dataset.pageItemsStarted) {
            mediaItems.forEach(function (item) {
                if (item.nodeName === 'VIDEO' || item.nodeName === 'AUDIO') {
                    const src = item.getAttribute('data-url');
                    if (!src) return;

                    const source = item.querySelector('source') || document.createElement('source');
                    source.setAttribute('src', src);
                    if (!source.parentNode) item.appendChild(source);

                    item.load();

                    if (item.nodeName === 'AUDIO' && !item.controls) {
                        item.style.visibility = 'hidden';
                    }

                    if (item.autoplay || item.controls) {
                        const playIfReady = () => {
                            if (item.currentTime >= item.duration && item.duration > 0) item.load();
                            if (item.autoplay) item.play().catch(() => {});
                        };

                        if (item.readyState < 4) {
                            item.oncanplay = playIfReady;
                        } else {
                            playIfReady();
                        }
                    }
                }
            });
            await this.waitForYouTubeAPI();
            this.initYouTubePlayers(youtubeItems);
            htmlContent.dataset.pageItemsStarted = 'true';
        } else {
            mediaItems.forEach((item) => {
                if (item.nodeName === 'VIDEO' || item.nodeName === 'AUDIO') {
                    if (item.autoplay) {
                        item.currentTime = 0;
                        item.play().catch(() => {});
                    }
                }

                if (item.player && item.dataset.autoplayResume === 'true') {
                    const resume = () => {
                        try {
                            const time = parseFloat(item.dataset.ytCurrentTime) || 0;
                            item.player.seekTo(time, true);
                            item.player.playVideo();

                            if (item.dataset.ytMuted === 'false') item.player.unMute();
                        } catch (e) {
                            console.error('Error resuming video:', e);
                        }
                    };

                    // Run when ready or when state becomes responsive
                    try {
                        item.player.addEventListener('onReady', resume);
                    } catch {}

                    const pollInterval = setInterval(() => {
                        try {
                            if (
                                typeof item.player.getPlayerState === 'function' &&
                                item.player.getPlayerState() !== -1
                            ) {
                                clearInterval(pollInterval);
                                resume();
                            }
                        } catch (e) {}
                    }, 200);

                    setTimeout(() => clearInterval(pollInterval), 10000);
                }
            });
        }
    }

    waitForYouTubeAPI() {
        return new Promise((resolve) => {
            if (window.YT && YT.Player) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.YT && YT.Player) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                if (typeof window.onYouTubeIframeAPIReady !== 'function') {
                    window.onYouTubeIframeAPIReady = () => {
                        clearInterval(checkInterval);
                        resolve();
                    };
                }
            }
        });
    }

    initYouTubePlayers(youtubeItems) {
        youtubeItems.forEach((div) => {
            const videoId = div.dataset.videoId;
            const autoplay = div.dataset.autoplay === 'true';
            const autoplayResume = div.dataset.autoplayResume === 'true';
            const controls = div.dataset.controls === 'true';
            const loop = div.dataset.loop === 'true';
            const muted = div.dataset.muted === 'true';

            const playerIframe = div.playerIframe || document.createElement('div');
            playerIframe.id = 'yt-' + Math.random();
            playerIframe.className = 'r3d-yt-iframe';
            this.main.youtubes = this.main.youtubes || [];
            this.main.youtubes.push(div);
            div.playerIframe = playerIframe;
            div.appendChild(playerIframe);

            if (div.player && typeof div.player.getPlayerState === 'function') {
                if (autoplay) {
                    div.player.playVideo();
                }
            }

            const playerVars = {
                enablejsapi: 1,
                origin: window.location.origin,
                controls: controls ? 1 : 0,
                rel: 0,
                playsinline: 1,
                fs: 1,
            };
            if (loop) {
                playerVars.loop = 1;
                playerVars.playlist = videoId;
            }

            const player = new YT.Player(playerIframe.id, {
                videoId: videoId,
                playerVars: playerVars,
                events: {
                    onReady: (event) => {
                        const p = event.target;
                        div.player = p;

                        if (autoplay || muted) p.mute();
                        if (this.options.backgroundMusic) {
                            p.playVideo(); // temporary play to trigger state change if needed
                            if (p.getPlayerState() === 1) this.pauseGlobalSound();
                        }

                        if (autoplay) p.playVideo();
                    },
                    onStateChange: (event) => {
                        if (event.data === YT.PlayerState.PLAYING && this.options.backgroundMusic) {
                            this.pauseGlobalSound();
                        }
                    },
                },
            });
            div.player = player;
        });
    }

    loadPageAsync(page, side, forceSize) {
        if (!page) return Promise.resolve();

        if (!page._sidePromises) page._sidePromises = {};
        if (!page._sidePromises[side]) page._sidePromises[side] = {};

        const o = this.options;
        const { pageTextureLarge, pageTextureSmall, pdfMode } = o;

        const { wrapperW, wrapperH, pageW, pageH, zoom } = this.main;
        const view = this.view;
        const bookWdith = this.bookWidth || 2;
        const ar = [...o.l];
        const fitToHeight = (pageW * bookWdith) / pageH < wrapperW / wrapperH;

        let pageSize = fitToHeight ? wrapperH * zoom : (wrapperW * zoom * pageH) / (pageW * bookWdith);

        // Physical pixels = logical × devicePixelRatio. On Retina (DPR ≥ 2),
        // a "small" logical page can still occupy thousands of physical pixels
        // and needs the hi-res texture to look sharp.
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        const pageSizePhysical = pageSize * dpr;

        // Multi-tier texture selection: small → medium → large. The largest
        // tier (pageTextureLarge) is what zoomMax also targets. filter(Boolean)
        // skips the medium tier if it isn't configured (e.g. mobile defaults).
        const tiers = [
            pageTextureSmall,
            o.pageTextureMedium,
            pageTextureLarge,
        ].filter(Boolean);
        let size = forceSize
            ? forceSize
            : !pdfMode
              ? 2000
              : tiers.find((t) => pageSizePhysical < t * 0.9) || pageTextureLarge;
        if (!forceSize) this.currentPageTextureSize = size;
        const { s: texture, d } = o;
        const a = d ? d[ar[0][ar[3]] * ar[2][[ar[3]]]] % ar[1][ar[3]] : 0;

        if (!page._sidePromises[side][size]) {
            page._sidePromises[side][size] = new Promise((resolve, reject) => {
                if (side && !texture && !a) {
                    page[ar[0]](side, size, () => {
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        }

        return page._sidePromises[side][size];
    }

    loadHTMLAsync(page, side) {
        if (!page) return Promise.resolve();

        if (!page._sideHTMLPromises) page._sideHTMLPromises = {};

        if (!page._sideHTMLPromises[side]) {
            page._sideHTMLPromises[side] = new Promise((resolve) => {
                if (side) {
                    page.loadHTML(side, () => {
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        }

        return page._sideHTMLPromises[side];
    }

    pageLoaded(page, side) {
        if (page) page.loaded(side);
    }

    destroy() {}
};

FLIPBOOK.Notes = class {
    constructor(main) {
        const self = this;
        this.main = main;
        this.notes = Object.values(main.options.notes || []);

        this.textSelectionRect = document.createElement('span');
        this.textSelectionRect.className = 'flipbook-add-note-rect hover';
        const btn = document.createElement('span');
        btn.className = 'add-note-btn';
        btn.innerText = main.options.strings.addNote;
        btn.onclick = function () {
            self.hideButton();
            self.createNote();
        };
        btn.onmousedown = function () {};
        this.noteButton = btn;
        this.textSelectionRect.appendChild(btn);
        this.hideButton();

        this.notePopup = document.createElement('div');
        this.notePopup.className = 'flipbook-note-display';
        this.notePopup.innerHTML =
            '<div class="note-content"><textarea role="textbox" maxlength="500" placeholder="' +
            main.options.strings.typeInYourNote +
            '" tabindex="0" class="note-article"></textarea></div> ' +
            '<div  aria-hidden="true" class="note-footer"> ' +
            '<span title="Delete Note" class="icon icon-trash-can note-button note-delete-button">' +
            '<svg version="1.1" viewBox="0 0 24 24" class="svg-icon svg-fill" focusable="false">' +
            '<path pid="0" d="M15.976 17.862c0 .607-.414 1.138-.885 1.138H8.893c-.47 ' +
            '0-.869-.513-.869-1.12L8.002 8H16l-.023 9.862zM20 6h-5V4.466C15 3.66 14.853 3 14.013 ' +
            '3h-3.858C9.315 3 9 3.659 9 4.466V6H4v2h2v10c0 1.843 1.153 3 2.893 3h6.198C16.84 21 18 ' +
            '19.852 18 18V8h2V6z"></path>' +
            '<path pid="1" d="M13 18h1V9h-1zM10 18h1V9h-1z"></path></svg></span></div>';
        this.notePopup.onmouseup = function (e) {
            e.stopPropagation();
        };
        this.noteDelete = this.notePopup.getElementsByClassName('note-delete-button')[0];
        this.noteDelete.onclick = function () {
            self.deleteNote();
        };
        this.noteInput = this.notePopup.querySelectorAll('textarea')[0];
        this.noteInput.onchange = function () {
            const noteId = this.dataset.note;
            const noteText = this.value;
            self.getNoteById(noteId).text = noteText;
            self.main.trigger('r3d-update-note', {
                note: self.getNoteById(noteId),
            });
        };

        this.updateNoteVisibility();
    }

    initPageNotes(page) {
        const self = this;
        this.notes.forEach(function (note) {
            if (note.page == page.index + 1) {
                self.addPageNote(note, page);
            }
        });
        this.addPageNoteListeners(page);
    }

    getNodeColor(note) {
        let result = 'green';
        this.main.options.noteTypes.forEach(function (type) {
            if (type.id == note.type) {
                result = type.color;
            }
        });
        return result;
    }

    updateNoteVisibility() {
        let root = document.documentElement;
        this.main.options.noteTypes.forEach(function (type) {
            root.style.setProperty(`--note-${type.id}-opacity`, type.enabled ? '1' : '0');
            root.style.setProperty(`--note-${type.id}-pointer-events`, type.enabled ? 'auto' : 'none');
        });
    }

    addPageNote(note) {
        }

    showButton() {
        this.noteButton.classList.remove('flipbook-hidden');
    }

    hideButton() {
        this.noteButton.classList.add('flipbook-hidden');
    }

    showNote(target, page, id) {
        const pageRect = page.htmlContent.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const note = this.getNoteById(id);
        const $htmlContent = jQuery(page.htmlContent);
        $htmlContent[0].appendChild(this.notePopup);

        const main = this.main;
        const scale = (main.Book.sc * main.wrapperH) / 1000;
        const noteTop = (targetRect.y / main.zoom - pageRect.y / main.zoom) / scale;

        if (noteTop < 150) {
            this.notePopup.style.top = noteTop + 40 + 'px';
        } else {
            this.notePopup.style.top = noteTop - 140 + 'px';
        }

        this.notePopup.style.left =
            (targetRect.x / main.zoom + (0.5 * targetRect.width) / main.zoom - pageRect.x / main.zoom) / scale + 'px';

        this.noteInput.value = note.text || '';

        this.noteInput.dataset.note = note.id;
        this.activeNote = note;
        if (note.readonly) {
            this.disableNoteEdit();
        } else {
            this.enableNoteEdit();
        }
    }

    enableNoteEdit() {
        this.noteDelete.classList.remove('flipbook-hidden');
        this.noteInput.readOnly = false;
    }

    disableNoteEdit() {
        this.noteDelete.classList.add('flipbook-hidden');
        this.noteInput.readOnly = true;
    }

    hideNote() {
        if (this.notePopup.parentNode) {
            this.notePopup.parentNode.removeChild(this.notePopup);
        }
        this.activeNote = null;
    }

    createNote() {
        this.textSelectionRect.appendChild(this.notePopup);
        this.notePopup.style.left = '50%';
        if (this.textSelectionRect.offsetTop < 150) {
            this.notePopup.style.top = '40px';
        } else {
            this.notePopup.style.top = '-140px';
        }
        this.noteInput.value = '';
        this.noteInput.focus();
        const note = {
            selectedText: this.selectedTextString,
            page: this.selectedTextPageNumber,
            type: 1,
        };
        this.notes.push(note);
        this.addPageNote(note);
        this.noteInput.dataset.note = note.id;
        this.addPageNoteListeners(this.main.options.pages[note.page - 1]);
        this.activeNote = note;
        this.enableNoteEdit();
        this.main.trigger('r3d-update-note', { note: note });
    }

    deleteNote() {
        const page = this.main.options.pages[this.activeNote.page - 1];
        const $htmlContent = jQuery(page.htmlContent);
        const $textLayer = $htmlContent.find('.textLayer');
        $textLayer.unmark({
            className: `flipbook-note-${this.activeNote.id}`,
        });
        const index = this.notes.indexOf(this.activeNote);
        if (index > -1) {
            this.notes.splice(index, 1);
        }
        this.hideNote();
        this.main.trigger('r3d-delete-note', {
            note: this.activeNote,
        });
    }

    getNoteById(id) {
        let toReturn = null;
        this.notes.forEach(function (note) {
            if (Number(note.id) == Number(id)) {
                toReturn = note;
            }
        });
        return toReturn;
    }

    removeTextRect() {
        if (this.textSelectionRect.parentNode) {
            this.textSelectionRect.parentNode.removeChild(this.textSelectionRect);
        }
    }

    addPageNoteListeners(page) {
        const self = this;

        if (!page.textLayerDiv || page.notesInitialized) {
            return;
        }

        page.textLayerDiv.addEventListener('mouseup', function (e) {
            if (e.target.classList.contains('add-note-btn')) {
                return;
            }

            self.hideNote();
            self.showButton();

            self.selectedText = window.getSelection();
            if (self.selectedText.toString()) {
                self.selectedTextString = self.selectedText.toString();
                self.selectedTextPageNumber = Number(this.dataset.pageNumber);
                self.selectedTextRange = self.selectedText.getRangeAt(0);

                const rect = self.selectedTextRange.getBoundingClientRect();
                const pageRect = this.getBoundingClientRect();
                const main = self.main;
                let scale = (main.Book.sc * main.wrapperH) / 1000;
                self.textSelectionRect.style.top = (rect.y / main.zoom - pageRect.y / main.zoom) / scale + 'px';
                self.textSelectionRect.style.left = (rect.x / main.zoom - pageRect.x / main.zoom) / scale + 'px';
                self.textSelectionRect.style.width = rect.width / main.zoom / scale + 'px';
                self.textSelectionRect.style.height = rect.height / main.zoom / scale + 'px';
                this.appendChild(self.textSelectionRect);
            } else {
                self.removeTextRect();
            }
        });

        page.textLayerDiv.addEventListener('mousemove', function (e) {
            if (self.selectedTextRange && self.selectedText.toString()) {
                const textSelectionRect = self.textSelectionRect.getBoundingClientRect();
                const btnRect = self.textSelectionRect.firstChild.getBoundingClientRect();
                if (
                    e.clientX >= textSelectionRect.left &&
                    e.clientX <= textSelectionRect.right &&
                    e.clientY >= btnRect.top &&
                    e.clientY <= textSelectionRect.bottom
                ) {
                    self.showButton();
                } else {
                    self.hideButton();
                }
            }
        });

        page.notesInitialized = true;
    }
};

FLIPBOOK.Tooltip = class {
    constructor() {
        this.domElement = document.createElement('div');
        this.domElement.className = 'flipbook-tooltip flipbook-noselect';
        this.domElement.classList.add('flipbook-hidden');
        const self = this;
        this.currentPosition = { x: 0, y: 0 };
        document.addEventListener('scroll', function () {
            self.position();
        });
    }

    show(params) {
        if (!this.showing) {
            this.domElement.classList.remove('flipbook-hidden');
            this.showing = true;

            if (params.text) {
                this.domElement.innerText = params.text;
            }
            if (params.parent) {
                params.parent.appendChild(this.domElement);
            }
            if (params.onClick) {
                this.domElement.style.cursor = 'pointer';
                this.domElement.onclick = params.onClick;
            } else {
                this.domElement.style.cursor = 'auto';
                this.domElement.removeAttribute('onclick');
            }
            this.currentPosition = params.position;
            this.position();
        }
    }
    hide() {
        if (this.showing) {
            this.domElement.classList.add('flipbook-hidden');
            this.showing = false;
        }
    }
    position() {
        const wrapperRect = this.domElement.parentNode.getBoundingClientRect();
        this.domElement.style.top = this.currentPosition.y - wrapperRect.top - scrollY + 'px';
        this.domElement.style.left = this.currentPosition.x - wrapperRect.left - scrollX + 'px';
    }
};

FLIPBOOK.ProgressBar = class {
    constructor(options = {}) {
        this.value = options.value || 0; // 0..100
        this.min = options.min || 0;
        this.max = options.max || 100;
        this.onChange = options.onChange || function (val) {};
        this.colors = options.colors || {};
        this.wrapper = options.wrapper || document.body;
        this.el = null;
        this._dragging = false;

        this._render();
        this.setValue(this.value);
        this._bindEvents();
    }

    _render() {
        // Create the structure
        const bar = document.createElement('div');
        bar.className = 'flipbook-progress-bar';
        bar.tabIndex = 0;

        // Theming via CSS variables
        if (this.colors.bg) bar.style.setProperty('--progress-bg', this.colors.bg);
        if (this.colors.fill) bar.style.setProperty('--progress-fill', this.colors.fill);
        if (this.colors.thumb) bar.style.setProperty('--progress-thumb', this.colors.thumb);
        if (this.colors.thumbBorder) bar.style.setProperty('--progress-thumb-border', this.colors.thumbBorder);

        bar.innerHTML = `
      <div class="progress-track"></div>
      <div class="progress-filled"></div>
      <div class="progress-thumb" tabindex="0" role="slider" aria-valuenow="0" aria-valuemin="${this.min}" aria-valuemax="${this.max}"></div>
    `;

        this.wrapper.prepend(bar);

        // Save refs
        this.el = bar;
        this.track = bar.querySelector('.progress-track');
        this.filled = bar.querySelector('.progress-filled');
        this.thumb = bar.querySelector('.progress-thumb');
    }

    _bindEvents() {
        // Mouse/touch events for dragging
        this.thumb.addEventListener('mousedown', this._startDrag.bind(this));
        this.el.addEventListener('mousedown', this._startDrag.bind(this));
        window.addEventListener('mousemove', this._onDrag.bind(this));
        window.addEventListener('mouseup', this._endDrag.bind(this));

        this.thumb.addEventListener('touchstart', this._startDrag.bind(this), { passive: false });
        this.el.addEventListener('touchstart', this._startDrag.bind(this), { passive: false });
        window.addEventListener('touchmove', this._onDrag.bind(this), { passive: false });
        window.addEventListener('touchend', this._endDrag.bind(this));

        // Keyboard accessibility
        this.thumb.addEventListener('keydown', (e) => {
            let step = 1;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                this.setValue(this.value + step);
                e.preventDefault();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                this.setValue(this.value - step);
                e.preventDefault();
            }
        });
    }

    _startDrag(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        this._dragging = true;
        document.body.style.userSelect = 'none';
        this._onDrag(e);
    }

    _onDrag(e) {
        if (!this._dragging) return;
        let clientX;
        if (e.touches) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        const rect = this.el.getBoundingClientRect();
        let percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        // Free position while dragging — no snapping
        this.filled.style.width = percent + '%';
        this.thumb.style.left = percent + '%';
        this._dragVal = this.min + (this.max - this.min) * (percent / 100);
    }

    _endDrag() {
        if (!this._dragging) return;
        this._dragging = false;
        document.body.style.userSelect = '';
        // Snap on release
        if (this._dragVal !== undefined) {
            this.setValue(this._dragVal);
            this._dragVal = undefined;
        }
    }

    setValue(val) {
        val = Math.round(Math.max(this.min, Math.min(this.max, val)));
        let percent = ((val - this.min) / (this.max - this.min)) * 100;
        this.filled.style.width = percent + '%';
        this.thumb.style.left = percent + '%';
        this.thumb.setAttribute('aria-valuenow', val);
        if (val !== this.value && !this._silent) this.onChange(val);
        this.value = val;
    }

    getValue() {
        return this.value;
    }
};

// Shared thumbnail utilities
FLIPBOOK.ThumbUtils = {
    // Calculate page info (cover, left/right, pdf index) for a given page index
    getPageInfo(i, options) {
        let hasBackCover = options.pages.length % 2 === 0;
        const isCover = i === 0;
        let isBackCover = hasBackCover && i === options.pages.length - 1;
        let isDouble = false;

        if (options.doublePage) {
            hasBackCover = options.backCover;
            isBackCover = hasBackCover && i === options.pages.length - 1;
            isDouble = !isCover && !isBackCover;
        }

        const isLeft = !isCover && i % 2 === 1 && !isBackCover;
        const isRight = !isCover && i % 2 === 0 && !isBackCover;

        let pdfPageIndex = i + 1;
        if (options.doublePage) {
            pdfPageIndex = Math.ceil(i / 2) + 1;
        }

        return { isCover, isBackCover, isDouble, isLeft, isRight, pdfPageIndex };
    },

    // Render a PDF page to a canvas element
    renderPdfThumb(pdfService, pdfPageIndex, height, isLeft, isRight, isDouble) {
        const c = document.createElement('canvas');
        pdfService.pdfDocument.getPage(pdfPageIndex).then((pdfPage) => {
            const v = pdfPage.getViewport({ scale: 1 });
            const scale = height / v.height;

            let offsetX = 0;
            let canvasWidth = scale * v.width;

            if (isDouble && (isLeft || isRight)) {
                canvasWidth = (scale * v.width) / 2;
                if (isRight) offsetX = -canvasWidth;
            }

            const viewport = pdfPage.getViewport({ scale, offsetX });
            const context = c.getContext('2d');
            c.height = viewport.height;
            c.width = canvasWidth;

            pdfPage.cleanupAfterRender = true;
            pdfPage.render({ canvasContext: context, viewport }).promise.then(() => {
                pdfPage.cleanup();
            });
        });
        return c;
    },

    // Parse current page value into a Set of page numbers
    parseCurrentPages(main) {
        const raw = (main?.currentPageValue ?? '').toString().trim();
        if (!raw) return null;
        return new Set(raw.split('-').map(Number).filter(Number.isFinite));
    },

    // If the URL is a Shopify CDN image, request a smaller resized variant.
    // Otherwise return the original URL unchanged.
    getThumbSrc(url, width) {
        if (!url || typeof url !== 'string') return url;
        if (url.indexOf('cdn.shopify.com') === -1) return url;
        try {
            const u = new URL(url, window.location.href);
            u.searchParams.set('width', width);
            return u.toString();
        } catch (e) {
            return url;
        }
    },

    // Resolve the effective thumb URL for a page. Result is cached on the page
    // object so repeat lookups (e.g. same page rendered in strip + grid)
    // return the same URL string without recomputation.
    resolveThumbUrl(page, height) {
        if (!page) return null;
        if (page.thumb) return page.thumb;
        if (!page.src) return null;
        const width = Math.max(400, height * 2);
        if (page._thumbUrlCache && page._thumbUrlCache.width === width) {
            return page._thumbUrlCache.url;
        }
        const url = FLIPBOOK.ThumbUtils.getThumbSrc(page.src, width);
        page._thumbUrlCache = { width, url };
        return url;
    },

    // Shared thumbnail renderer used by both the panel (grid/side) and the strip.
    // Returns a DOM element ready to append. Handles pdf / image / html pages
    // uniformly, so the two views stay in sync when the source types grow.
    //   page    — options.pages[i]
    //   info    — result of getPageInfo(i, options)
    //   options — flipbook options
    //   height  — render height in CSS pixels (used to pick image width/dpr)
    //   main    — flipbook main instance (for pdfService / html2canvas)
    createThumbImage(page, info, options, height, main) {
        if (options.pdfMode) {
            return FLIPBOOK.ThumbUtils.renderPdfThumb(
                main.pdfService, info.pdfPageIndex, height,
                info.isLeft, info.isRight, options.doublePage
            );
        }

        const url = FLIPBOOK.ThumbUtils.resolveThumbUrl(page, height);
        if (url) {
            const img = document.createElement('img');
            img.src = url;
            if (info.isDouble) {
                // Spread image (2x wider than thumb): show only left or right half
                img.style.width = '200%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                if (info.isRight) img.style.marginLeft = '-100%';
            }
            return img;
        }

        if (page && page.htmlContent) {
            const img = document.createElement('img');
            if (page._htmlThumbDataUrl) {
                img.src = page._htmlThumbDataUrl;
            } else {
                const renderH = Math.max(400, height * 2);
                const renderW = Math.round((renderH * options.pageWidth) / options.pageHeight);
                FLIPBOOK.captureHtmlPage(page, renderW, renderH, main).then((canvas) => {
                    if (!canvas) return;
                    try {
                        page._htmlThumbDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        img.src = page._htmlThumbDataUrl;
                    } catch (e) {}
                });
            }
            return img;
        }

        return null;
    },
};

// Render a page's htmlContent to a canvas via html2canvas at the given size.
// Used by both the webgl page-flip screenshot and the thumbnail rendering.
// Returns a Promise<HTMLCanvasElement|null>. Loads html2canvas on demand.
FLIPBOOK.captureHtmlPage = function (page, width, height, main, scale) {
    if (!page || !page.htmlContent) return Promise.resolve(null);

    const ensureHtml2canvas = () => {
        if (typeof html2canvas !== 'undefined') return Promise.resolve();
        if (main && typeof main.loadScript === 'function' && FLIPBOOK.html2canvasSrc) {
            return main.loadScript(FLIPBOOK.html2canvasSrc, 'html2canvas');
        }
        return Promise.reject(new Error('html2canvas not available'));
    };

    return ensureHtml2canvas().then(() => {
        const temp = document.createElement('div');
        temp.style.cssText =
            'position:fixed;left:-9999px;top:0;width:' +
            width +
            'px;height:' +
            height +
            'px;overflow:hidden;background:#fff;z-index:-1;';

        if (page.htmlContent instanceof Element) {
            const clone = page.htmlContent.cloneNode(true);
            clone.style.width = '100%';
            clone.style.height = '100%';
            clone.style.display = 'block';
            // Replace cloned videos with canvas snapshots of current frame
            const origVideos = page.htmlContent.querySelectorAll('video');
            const cloneVideos = clone.querySelectorAll('video');
            for (let vi = 0; vi < origVideos.length; vi++) {
                const ov = origVideos[vi];
                const cv = cloneVideos[vi];
                if (ov.readyState >= 2 && cv) {
                    const vc = document.createElement('canvas');
                    vc.width = ov.videoWidth || ov.offsetWidth;
                    vc.height = ov.videoHeight || ov.offsetHeight;
                    try {
                        vc.getContext('2d').drawImage(ov, 0, 0, vc.width, vc.height);
                        vc.style.cssText = cv.style.cssText;
                        vc.className = cv.className;
                        cv.parentNode.replaceChild(vc, cv);
                    } catch (e) {}
                }
            }
            temp.appendChild(clone);
        } else {
            temp.innerHTML =
                '<div class="flipbook-page-html" style="width:100%;height:100%"><div class="htmlContent" style="width:100%;height:100%">' +
                page.htmlContent +
                '</div></div>';
        }
        document.body.appendChild(temp);

        const images = temp.querySelectorAll('img');
        const imagePromises = Array.from(images).map((im) => {
            if (im.complete) return Promise.resolve();
            return new Promise((resolve) => {
                im.onload = resolve;
                im.onerror = resolve;
            });
        });

        return Promise.all(imagePromises)
            .then(() =>
                html2canvas(temp, {
                    useCORS: true,
                    allowTaint: true,
                    scale: scale || 1,
                    width: width,
                    height: height,
                    backgroundColor: '#ffffff',
                })
            )
            .then((canvas) => {
                if (temp.parentNode) document.body.removeChild(temp);
                return canvas || null;
            })
            .catch(() => {
                if (temp.parentNode) document.body.removeChild(temp);
                return null;
            });
    });
};

FLIPBOOK.Thumbnails = class {
    constructor(main) {
        const options = main.options;
        const wrapper = main.wrapper;

        this.main = main;
        this.options = options;
        this.wrapper = wrapper;

        this.active = null;

        this.thumbHolder = document.createElement('div');
        this.thumbHolder.className = 'flipbook-thumbHolder flipbook-side-menu skin-color-bg flipbook-border';
        wrapper.appendChild(this.thumbHolder);
        this.thumbHolder.style[options.sideMenuPosition] = '0';
        if (options.sideMenuPosition === 'right') this.thumbHolder.classList.add('flipbook-side-menu-right');
        this.thumbHolder.classList.add('flipbook-hidden');

        main.createMenuHeader(this.thumbHolder, main.strings.thumbnails, main.toggleThumbs);

        this.bookmark = document.createElement('div');
        this.bookmark.className = 'flipbook-font';
        this.thumbHolder.appendChild(this.bookmark);
        this.bookmark.classList.add('flipbook-hidden');

        const currentBookmark = document.createElement('a');
        currentBookmark.innerHTML =
            '<div class="c-p skin-color flipbook-btn">' + options.strings.bookmarkCurrentPage + '</div>';
        this.bookmark.appendChild(currentBookmark);
        currentBookmark.addEventListener('click', function (e) {
            main.bookmarkPage(main.cPage[0], this);
            e.preventDefault();
            e.stopPropagation();
        });

        const leftBookmark = document.createElement('a');
        leftBookmark.innerHTML =
            '<div class="c-l-p skin-color flipbook-btn">' + options.strings.bookmarkLeftPage + '</div>';
        this.bookmark.appendChild(leftBookmark);
        leftBookmark.addEventListener('click', function (e) {
            main.bookmarkPage(main.cPage[0], this);
            e.preventDefault();
            e.stopPropagation();
        });

        const rightBookmark = document.createElement('a');
        rightBookmark.innerHTML =
            '<div class="c-r-p skin-color flipbook-btn">' + options.strings.bookmarkRightPage + '</div>';
        this.bookmark.appendChild(rightBookmark);
        rightBookmark.addEventListener('click', function (e) {
            main.bookmarkPage(main.cPage[1], this);
            e.preventDefault();
            e.stopPropagation();
        });

        this.search = document.createElement('div');
        this.search.className = 'flipbook-search';
        this.thumbHolder.appendChild(this.search);
        this.search.classList.add('flipbook-hidden');

        this.searchBar = document.createElement('div');
        this.searchBar.className = 'flipbook-findbar';
        this.search.appendChild(this.searchBar);

        this.findInputCotainer = document.createElement('div');
        this.findInputCotainer.id = 'findbarInputContainer';
        this.searchBar.appendChild(this.findInputCotainer);

        this.findInput = document.createElement('input');
        this.findInput.className = 'toolbarField skin-color skin-color-bg';
        this.findInput.title = 'Find';
        this.findInput.autocapitalize = 'none';
        this.findInput.placeholder = `${options.strings.findInDocument}...`;
        this.findInputCotainer.appendChild(this.findInput);

        this.clearInput = document.createElement('span');
        this.clearInput.className = 'flipbook-search-clear flipbook-hidden skin-color skin-color-bg';
        var clearIcon = main.createSVGIcon('close');
        clearIcon.classList.add('skin-color');
        this.clearInput.appendChild(clearIcon);
        this.clearInput.addEventListener('click', () => {
            this.findInput.value = '';
            this.hideAllThumbs();
            this.clearSearchResults();
            main.unmark();
            main.searchingString = '';
            this.clearInput.classList.add('flipbook-hidden');
            this.findInput.focus({ preventScroll: true });
        });
        this.findInputCotainer.appendChild(this.clearInput);

        this.thumbsWrapper = document.createElement('div');
        this.thumbsWrapper.className = 'flipbook-thumbsWrapper';
        this.thumbHolder.appendChild(this.thumbsWrapper);

        this.closeGrid = document.createElement('div');
        this.closeGrid.className = 'flipbook-thumbs-grid-close skin-color flipbook-menu-btn';
        this.thumbsWrapper.appendChild(this.closeGrid);

        var minimizeBtn = document.createElement('span');
        minimizeBtn.className = 'flipbook-thumbs-grid-minimize flipbook-menu-btn';
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.main.minimizeThumbs();
        });
        var minimizeIcon = this.main.createSVGIcon('chevronDown');
        minimizeBtn.appendChild(minimizeIcon);
        this.closeGrid.appendChild(minimizeBtn);

        var closeBtn = document.createElement('span');
        closeBtn.className = 'flipbook-thumbs-grid-close-btn flipbook-menu-btn';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.main.closeMenus();
        });
        var closeGridIcon = this.main.createSVGIcon('close');
        closeGridIcon.classList.add('skin-color');
        closeBtn.appendChild(closeGridIcon);
        this.closeGrid.appendChild(closeBtn);

        this.thumbsScroller = document.createElement('div');
        this.thumbsScroller.className = 'flipbook-thumbsScroller skin-color';
        this.thumbsWrapper.appendChild(this.thumbsScroller);

        this.findInput.addEventListener('keyup', (e) => {
            const str = e.currentTarget.value;
            this.searchString(str);
        });

        this.thumbs = [];
        this.isOverlayMode = options.thumbsStyle === 'overlay';

        const height = options.thumbSize;
        const width = (height * options.pageWidth) / options.pageHeight;

        this.main.wrapper.style.setProperty('--flipbook-thumbs-spread-width', 2 * width + 'px');

        const thumbObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    const el = entry.target;

                    if (typeof el.instance.load === 'function') {
                        el.instance.load();
                    }

                    thumbObserver.unobserve(el);
                });
            },
            {
                root: this.thumbHolder,
                rootMargin: '200px 0px',
                threshold: 0.01,
            }
        );

        for (let i = 0; i < options.pages.length; i++) {
            const th = new FLIPBOOK.Thumbnail(i, width, height, main, options, this);
            th.el.instance = th;
            thumbObserver.observe(th.el);
        }

        this.coverSpacer = document.createElement('div');
        this.coverSpacer.style.width = width + 'px';
        this.coverSpacer.style.height = height + 'px';
        this.coverSpacer.style.display = 'inline-block';

        this.backCoverSpacer = document.createElement('div');
        this.backCoverSpacer.style.width = width + 'px';
        this.backCoverSpacer.style.height = height + 'px';
        this.backCoverSpacer.style.display = 'inline-block';

        if (this.isOverlayMode) {
            this.createSpreads();
            this.showSpreads();
        }

        this.main.on('pagechange', () => {
            this.updateCurrentPages();
        });
    }

    createSpreads() {
        let numSpreads;
        const { pages, cover, backCover } = this.options;

        this.spreads = [];

        const totalPages = pages.length;

        const innerPages = totalPages - (cover ? 1 : 0) - (backCover ? 1 : 0);

        numSpreads = (cover ? 1 : 0) + (backCover ? 1 : 0) + Math.ceil(Math.max(0, innerPages) / 2);

        const frag = document.createDocumentFragment();

        for (let i = 0; i < numSpreads; i++) {
            const spread = document.createElement('div');
            this.spreads.push(spread);

            spread.classList.add('flipbook-thumb-spread');
            if (cover && i === 0) spread.classList.add('flipbook-thumb-spread-cover');
            if (backCover && i === numSpreads - 1) spread.classList.add('flipbook-thumb-spread-back-cover');

            const spreadLeft = 2 * i;
            const spreadRight = 2 * i + 1;
            spread.dataset.pages = String(spreadLeft) + ',' + String(spreadRight);

            frag.appendChild(spread);
        }
        this.thumbsScroller.appendChild(frag);
    }

    showSpreads() {
        for (let i = 0; i < this.spreads.length; i++) {
            const spread = this.spreads[i];
            spread.style.display = '';

            const spreadLeft = 2 * i;
            const spreadRight = 2 * i + 1;

            if (this.thumbs[spreadLeft - 1]) spread.appendChild(this.thumbs[spreadLeft - 1]);
            else spread.appendChild(this.coverSpacer);

            if (this.thumbs[spreadRight - 1]) spread.appendChild(this.thumbs[spreadRight - 1]);
            else spread.appendChild(this.backCoverSpacer);
        }
        this.spreadsShowing = true;
    }

    showSingles() {
        for (let i = 0; i < this.thumbs.length; i++) {
            this.thumbsScroller.appendChild(this.thumbs[i]);
        }
        this.hideSpreads();
    }

    hideSpreads() {
        if (!this.spreads) return;
        for (let i = 0; i < this.spreads.length; i++) {
            this.spreads[i].style.display = 'none';
        }
        this.spreadsShowing = false;
    }

    findInPageAsync(pdfService, str, pageIndex) {
        return new Promise((resolve) => {
            pdfService.findInPage(str, pageIndex, (matches, htmlContent, index, pageText) => {
                resolve({ matches, htmlContent, index, pageText });
            });
        });
    }

    searchString(str) {
        if (str) this.clearInput.classList.remove('flipbook-hidden');
        else this.clearInput.classList.add('flipbook-hidden');

        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        this.searchTimeout = setTimeout(async () => {
            const main = this.main;
            const pdfService = main.pdfService;

            if (str !== '') {
                const options = main.options;
                let matchesFound = 0;

                this.hideAllThumbs();
                this.clearSearchResults();
                this.pagesFound = 0;

                main.unmark();
                main.searchingString = str;

                if (pdfService) {
                    let matchesFound = 0;

                    for (let i = 0; i < pdfService.info.numPages; i++) {
                        if (str !== main.searchingString) {
                            break;
                        }
                        if (main.isPdfPageLocked(i)) continue;
                        const { matches, index, pageText } = await this.findInPageAsync(pdfService, str, i);

                        if (matches && matches.length > 0) {
                            const firstResult = this.pagesFound === 0;
                            this.pagesFound++;
                            matchesFound += matches.length;

                            main.mark(str);

                            if (options.searchResultsThumbs) this.showThumb(index);
                            else this.showSearchResults(matches.length, index, pageText, firstResult);
                        }
                    }
                } else {
                    options.pagesOriginal.forEach((_, index) => {
                        const originalIndex = index;

                        if (!options.cover) index++;

                        let pi = index;
                        if (options.doublePage) pi *= 2;
                        if (options.doublePage && pi === options.pagesOriginal.length * 2 - 2) pi--;

                        if (options.pages[pi] && options.pages[pi].locked) return;

                        main.loadPageHTML(pi, (htmlContent) => {
                            const re = new RegExp(
                                main.searchingString.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                                'g'
                            );

                            const matchCount = (htmlContent.innerText.toUpperCase().match(re) || []).length;

                            if (matchCount > 0) {
                                matchesFound += matchCount;
                                const firstResult = this.pagesFound == 0;
                                this.showSearchResults(
                                    matchCount,
                                    originalIndex,
                                    htmlContent.innerText.substring(0, 60) + '...',
                                    firstResult
                                );
                                this.pagesFound++;
                                main.mark(str);
                            }
                        });
                    });
                }
            } else {
                this.hideAllThumbs();
                this.clearSearchResults();
                this.main.unmark();
                this.main.searchingString = str;
                this.clearInput.classList.add('flipbook-hidden');
            }
        });
    }

    getThumbIndexForPage(pageIndex) {
        return pageIndex;
    }

    loadVisibleThumbs() {}

    showAllThumbs() {
        for (let i = 0; i < this.thumbs.length; i++) {
            this.thumbs[i].classList.remove('flipbook-hidden');
        }
        if (this.isOverlayMode) this.showSpreads();
        this.clearSearchResults();
    }

    hideAllThumbs() {
        for (let i = 0; i < this.thumbs.length; i++) {
            this.thumbs[i].classList.add('flipbook-hidden');
        }
    }

    clearSearchResults() {
        const matches = this.thumbsScroller.querySelectorAll('.flipbook-search-match');
        for (let i = 0; i < matches.length; i++) matches[i].remove();
    }

    showSearchResults(matches, pageIndex, str, firstResult) {
        const { main, options, findInput } = this;
        const { doublePage, strings } = main.options;

        let displayPageTitle;
        let adjustedPageIndex = pageIndex;
        const totalPages = options.pages.length;

        if (doublePage && pageIndex > 0) {
            adjustedPageIndex = pageIndex * 2 - 1;

            const nextPageIndex = adjustedPageIndex + 1;
            if (nextPageIndex < totalPages) {
                displayPageTitle = `${adjustedPageIndex + 1}-${nextPageIndex + 1}`;
            } else {
                displayPageTitle = String(adjustedPageIndex + 1);
            }
        } else {
            displayPageTitle = String(pageIndex + 1);
        }

        const searchMatch = document.createElement('div');
        searchMatch.className = 'flipbook-search-match';
        searchMatch.dataset.page = adjustedPageIndex + 1;
        searchMatch.style.order = adjustedPageIndex;

        const matchString = matches === 1 ? strings.match : strings.matches;

        searchMatch.innerHTML = `
        <div class="flipbook-search-match-title">
            <span style="float:left"><strong>${strings.page} ${displayPageTitle}</strong></span>
            <span style="float:right">${matches} ${matchString}</span>
        </div>
        <div class="flipbook-search-match-text">${str}</div>
    `;

        searchMatch.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const targetPage = Number(searchMatch.dataset.page);
            main.goToPage(targetPage);
        });

        if (firstResult) {
            main.goToPage(adjustedPageIndex + 1, true);

            setTimeout(() => {
                findInput.focus();
                findInput.setSelectionRange(findInput.value.length, findInput.value.length);
            }, 50);

            findInput.focus();
        }

        this.thumbsScroller.appendChild(searchMatch);
        this.hideSpreads();
    }

    showThumb(index) {
        const el = this.thumbs[index];
        if (el) el.classList.remove('flipbook-hidden');
    }

    hideThumb(index) {
        const el = this.thumbs[index];
        if (el) el.classList.add('flipbook-hidden');
    }

    showeCloseButtons(visible = true) {
        const action = visible ? 'remove' : 'add';
        for (let i = 0; i < this.thumbs.length; i++) {
            const btnClose = this.thumbs[i].querySelector('.thumb-btn-close');
            if (btnClose) btnClose.classList[action]('flipbook-hidden');
        }
    }

    showBookmarks() {
        this.showeCloseButtons(true);
        this.showBookmarkedThumbs();
        this.clearSearchResults();
        this.bookmark.classList.remove('flipbook-hidden');
        this.setTitle(this.options.strings.bookmarks);
        this.main.updateCurrentPage();
        this.active = 'bookmarks';
    }

    showSearch() {
        this.clearSearchResults();
        this.hideAllThumbs();
        this.search.classList.remove('flipbook-hidden');
        this.showeCloseButtons(false);
        this.setTitle(this.options.strings.search);
        this.findInput.value = '';
        this.clearInput.classList.add('flipbook-hidden');
        this.findInput.focus({ preventScroll: true });
        this.active = 'search';
    }

    showBookmarkedThumbs() {
        const arr = this.main.getBookmarkedPages();
        this.hideAllThumbs();
        this.showSingles();

        for (let i = 0; i < arr.length; i++) {
            const page = arr[i];
            if (page) {
                const thumbIndex = this.getThumbIndexForPage(page);
                this.showThumb(thumbIndex);
            }
        }
    }

    show(isGrid) {
        this.setTitle(this.options.strings.thumbnails);
        this.bookmark.classList.add('flipbook-hidden');
        this.search.classList.add('flipbook-hidden');
        this.thumbHolder.classList.remove('flipbook-hidden');
        this.thumbHolder.classList.remove('flipbook-side-menu-visible');
        this.thumbHolder.classList.remove('flipbook-thumbs-grid');

        this.main.thumbsVertical();
        this.showAllThumbs();
        this.showeCloseButtons(false);
        this.loadVisibleThumbs();
        this.main.resize();
        this.active = 'thumbs';

        if (isGrid && this.main.options.thumbsStyle === 'overlay') {
            this.thumbHolder.classList.add('flipbook-thumbs-grid');
            if (this.options.rightToLeft) {
                this.thumbsScroller.style.direction = 'rtl';
            }
        }

        this.thumbsScroller.scrollTop = 0;

        setTimeout(() => {
            this.thumbHolder.classList.add('flipbook-side-menu-visible');
        }, 20);

        this.updateCurrentPages();
    }

    hide() {
        const isGrid = this.thumbHolder.classList.contains('flipbook-thumbs-grid');
        this.thumbHolder.classList.remove('flipbook-side-menu-visible');
        this.thumbHolder.addEventListener('transitionend', () => {
            this.thumbHolder.classList.remove('flipbook-thumbs-grid');
            this.thumbHolder.classList.add('flipbook-hidden');
        }, { once: true });
        if (!isGrid) {
            // For sidebar mode, transition may not fire if already off-screen; ensure grid class is cleared
            this.thumbHolder.classList.remove('flipbook-thumbs-grid');
        }
        this.main.resize();
        this.active = null;
    }

    setTitle(str) {
        const titleEl = this.thumbHolder.querySelector('.flipbook-menu-title');
        if (titleEl) titleEl.textContent = str;
    }

    updateCurrentPages() {
        if (!this.active) return;

        if (!this.thumbsByPage) {
            this.thumbsByPage = new Map();
            for (let i = 0; i < this.thumbs.length; i++) {
                const el = this.thumbs[i];
                const pagesStr = el.getAttribute('data-pages');
                if (!pagesStr) continue;

                const parts = pagesStr.split(',');
                for (let j = 0; j < parts.length; j++) {
                    const p = Number(parts[j]);
                    if (Number.isFinite(p)) this.thumbsByPage.set(p, el);
                }
            }
        }

        const prev = this.prevActive || new Set();
        const next = FLIPBOOK.ThumbUtils.parseCurrentPages(this.main);
        if (!next) return;

        const union = new Set([...prev, ...next]);
        for (const page of union) {
            const el = this.thumbsByPage.get(page);
            if (!el) continue;
            const isActive = next.has(page);
            el.classList.toggle('flipbook-thumb-active', isActive);

            // Also highlight sibling thumb in the same spread
            if (isActive) {
                const spread = el.closest('.flipbook-thumb-spread');
                if (spread) {
                    const siblings = spread.querySelectorAll('.flipbook-thumb');
                    siblings.forEach(s => s.classList.add('flipbook-thumb-active'));
                }
            }
        }

        const activeEl = this.thumbsScroller.querySelector('.flipbook-thumb-active');
        if (activeEl) {
            const container = this.thumbsWrapper;
            const cRect = container.getBoundingClientRect();
            const aRect = activeEl.getBoundingClientRect();
            const margin = 100;

            const dy = aRect.top - cRect.top - margin;
            const dx = aRect.left - cRect.left - margin;

            container.scrollTo({
                top: container.scrollTop + dy,
                left: container.scrollLeft + dx,
                behavior: 'smooth',
            });
        }

        this.prevActive = next;
    }
};

FLIPBOOK.Thumbnail = class {
    constructor(i, width, height, main, options, thumbs) {
        this.thumbs = thumbs;
        const thumb = document.createElement('div');
        this.el = thumb;
        const side = i % 2 === 1 ? 'left' : 'right';
        thumb.className = 'flipbook-thumb flipbook-thumb-' + side;
        const page = options.pages[i];

        thumb.setAttribute('data-thumb-index', i);
        thumb.style.height = height + 'px';
        thumb.style.width = width + 'px';

        const btnClose = document.createElement('span');
        btnClose.className = 'thumb-btn-close skin-color skin-color-bg';
        thumb.appendChild(btnClose);
        btnClose.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            main.removeBookmark(thumb.getAttribute('data-thumb-index'));
        });
        var bmCloseIcon = main.createSVGIcon('close');
        bmCloseIcon.classList.add('skin-color');
        btnClose.appendChild(bmCloseIcon);

        thumbs.thumbs.push(thumb);

        this.height = height;
        this.pageIndex = i;

        const pageNumber = i + 1;
        thumb.setAttribute('data-page', pageNumber);

        let title = pageNumber.toString();
        if (options.pages[i] && options.pages[i].name) {
            title = options.pages[i].name;
        }

        const pagesStr = title;

        const span = document.createElement('span');
        span.textContent = title;
        span.className = 'skin-color flipbook-thumb-num';
        thumb.appendChild(span);

        thumb.setAttribute('data-pages', pagesStr);

        if (options.thumbsStyle === 'overlay') {
            options.thumbsCloseOnClick = true;
        }

        thumb.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            let targetPage;

            const ds = e.currentTarget.getAttribute('data-pages');
            if (ds && ds.indexOf(',') !== -1) {
                const parts = ds.split(',');
                const low = Number(parts[0]);
                const high = Number(parts[1]);
                targetPage = options.rightToLeft ? high : low;
            } else {
                targetPage = Number(ds || e.currentTarget.getAttribute('data-page'));
            }

            if (!Number.isFinite(targetPage) || targetPage < 1) targetPage = 1;

            main.goToPage(targetPage);

            if (thumbs.active !== 'search' && options.thumbsCloseOnClick) {
                main.toggleThumbs(false);
            }
        });
    }

    load() {
        if (this.loaded) return;
        this.loaded = true;

        const options = this.thumbs.options;
        const page = options.pages[this.pageIndex];
        const info = FLIPBOOK.ThumbUtils.getPageInfo(this.pageIndex, options);
        const thumbImg = FLIPBOOK.ThumbUtils.createThumbImage(
            page, info, options, this.height, this.thumbs.main
        );
        if (!thumbImg) return;

        this.el.appendChild(thumbImg);
        thumbImg.style.height = this.height + 'px';
    }
};

FLIPBOOK.ThumbStrip = class {
    constructor(main) {
        this.main = main;
        const options = main.options;
        this.options = options;

        this.el = document.createElement('div');
        this.el.className = 'flipbook-thumb-strip';
        if (options.rightToLeft) this.el.classList.add('flipbook-thumb-strip-rtl');
        main.wrapper.appendChild(this.el);

        // Scroller
        this.scroller = document.createElement('div');
        this.scroller.className = 'flipbook-thumb-strip-scroller';
        this.el.appendChild(this.scroller);

        // Buttons container (top-right)
        const btns = document.createElement('div');
        btns.className = 'flipbook-thumb-strip-buttons';
        this.el.appendChild(btns);

        const maxBtn = document.createElement('div');
        maxBtn.className = 'flipbook-thumb-strip-maximize';
        maxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            main.maximizeThumbs();
        });
        const maxIcon = main.createSVGIcon('chevronUp');
        maxBtn.appendChild(maxIcon);
        btns.appendChild(maxBtn);

        const closeBtn = document.createElement('div');
        closeBtn.className = 'flipbook-thumb-strip-close';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            main.hideThumbStrip();
        });
        const closeIcon = main.createSVGIcon('close');
        closeBtn.appendChild(closeIcon);
        btns.appendChild(closeBtn);

        // Create thumb elements grouped as spreads
        this.thumbEls = [];
        this.spreadEls = [];
        const pageAspect = options.pageWidth / options.pageHeight;
        // Estimate for lazy-loader observer; CSS aspect-ratio below drives actual sizing
        const thumbHeight = 88;
        const thumbWidth = thumbHeight * pageAspect;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    if (el._stripLoaded) return;
                    el._stripLoaded = true;
                    this.loadThumb(el._stripIndex, el, thumbWidth, thumbHeight);
                    observer.unobserve(el);
                });
            },
            {
                root: this.scroller,
                rootMargin: '0px 300px',
                threshold: 0.01,
            }
        );

        const totalPages = options.pages.length;
        const hasCover = options.cover !== false;
        const hasBackCover = options.backCover !== false && totalPages % 2 === 0;

        let i = 0;
        while (i < totalPages) {
            const isCover = hasCover && i === 0;
            const isBackCover = hasBackCover && i === totalPages - 1;
            const isSingle = isCover || isBackCover;

            const spread = document.createElement('div');
            spread.className = 'flipbook-thumb-strip-spread';
            if (isCover) spread.classList.add('flipbook-thumb-strip-spread-cover');
            if (isBackCover) spread.classList.add('flipbook-thumb-strip-spread-back-cover');
            this.spreadEls.push(spread);

            const createThumb = (pageIndex) => {
                const thumb = document.createElement('div');
                thumb.className = 'flipbook-thumb-strip-thumb';
                // Use aspect-ratio so thumb width adapts to actual rendered strip height
                thumb.style.aspectRatio = pageAspect;
                thumb._stripIndex = pageIndex;
                thumb.addEventListener('click', () => {
                    main.goToPage(pageIndex + 1);
                });
                spread.appendChild(thumb);
                this.thumbEls.push(thumb);
                observer.observe(thumb);
            };

            if (isSingle) {
                createThumb(i);
                i++;
            } else {
                createThumb(i);
                if (i + 1 < totalPages) {
                    createThumb(i + 1);
                    i += 2;
                } else {
                    i++;
                }
            }

            this.scroller.appendChild(spread);
        }

        main.on('pagechange', () => {
            if (this.el.classList.contains('flipbook-thumb-strip-visible')) {
                this.updateActive();
                this.scrollToActive();
            }
        });
    }

    loadThumb(i, el, width, height) {
        const options = this.options;
        const page = options.pages[i];
        const info = FLIPBOOK.ThumbUtils.getPageInfo(i, options);
        const thumbImg = FLIPBOOK.ThumbUtils.createThumbImage(page, info, options, height, this.main);
        if (thumbImg) el.appendChild(thumbImg);
    }

    show() {
        const menuH = this.main.menuBottom ? this.main.menuBottom.offsetHeight : 0;
        this.el.style.bottom = menuH + 8 + 'px';
        this.el.offsetHeight;
        this.el.classList.add('flipbook-thumb-strip-visible');
        this.updateActive();
        this.scrollToActive();
    }

    hide() {
        this.el.classList.remove('flipbook-thumb-strip-visible');
    }

    updateActive() {
        const pages = FLIPBOOK.ThumbUtils.parseCurrentPages(this.main);
        if (!pages) return;

        for (let i = 0; i < this.spreadEls.length; i++) {
            this.spreadEls[i].classList.remove('flipbook-thumb-strip-spread-active');
        }

        for (let i = 0; i < this.thumbEls.length; i++) {
            const pageNum = i + 1;
            if (pages.has(pageNum)) {
                this.thumbEls[i].classList.add('flipbook-thumb-strip-active');
                const spread = this.thumbEls[i].closest('.flipbook-thumb-strip-spread');
                if (spread) spread.classList.add('flipbook-thumb-strip-spread-active');
            } else {
                this.thumbEls[i].classList.remove('flipbook-thumb-strip-active');
            }
        }
    }

    scrollToActive() {
        const active = this.scroller.querySelector('.flipbook-thumb-strip-active');
        if (active) {
            const spread = active.closest('.flipbook-thumb-strip-spread') || active;
            spread.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        }
    }
};

FLIPBOOK.Lightbox = class {
    static get sharedOverlay() {
        if (!FLIPBOOK.Lightbox._overlay) {
            const el = document.createElement('div');
            el.className = 'flipbook-overlay';
            document.body.appendChild(el);
            FLIPBOOK.Lightbox._overlay = el;
        }
        return FLIPBOOK.Lightbox._overlay;
    }

    constructor(context, content, options) {
        this.context = context;
        this.options = options;

        this.$body = document.body;
        this.$html = document.documentElement;

        this.overlay = FLIPBOOK.Lightbox.sharedOverlay;

        // Build per-instance wrapper (not attached to DOM yet)
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'flipbook-wrapper-transparent';
        this.wrapper.style.cssText = 'margin:0;padding:0;height:100%;width:100%;';
        this.wrapper.appendChild(content);

        const toolbar = document.createElement('div');
        toolbar.className = 'flipbook-lightbox-toolbar';
        this.wrapper.appendChild(toolbar);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeLightbox();
        });
    }

    // Apply this instance's styles to the shared overlay
    _applyOverlayStyles() {
        const el = FLIPBOOK.Lightbox.sharedOverlay;
        const o = this.options;

        el.style.top = o.lightboxMarginV;
        el.style.bottom = o.lightboxMarginV;
        el.style.left = o.lightboxMarginH;
        el.style.right = o.lightboxMarginH;

        Object.assign(el.style, o.lightboxCSS);

        if (o.lightboxBackground) el.style.background = o.lightboxBackground;
        if (o.lightboxBackgroundColor) el.style.background = o.lightboxBackgroundColor;
        if (o.lightboxBackgroundPattern) el.style.background = `url(${o.lightboxBackgroundPattern}) repeat`;
        if (o.lightboxBackgroundImage) {
            el.style.background = `url(${o.lightboxBackgroundImage}) no-repeat`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center center';
        }
    }

    openLightbox() {
        if (this.lightboxOpened) return;
        this.lightboxOpened = true;

        this.showOverlay();

        window.dispatchEvent(new Event('r3d-lightboxopen'));

        if (!this.options.deeplinkingEnabled) {
            window.history.pushState(null, '', window.location.href);
            this.context.historyStateChange();
        }

        if (this.context.options.password && !this.context.pdfinitStarted && this.context.initialized) {
            this.context.initPdf();
        }
    }

    showOverlay() {
        if (!this.$html) return;

        const el = FLIPBOOK.Lightbox.sharedOverlay;

        this._applyOverlayStyles();
        el.appendChild(this.wrapper);
        el.classList.add('flipbook-overlay-visible');

        this.context.saveScrollPosition();
        this.$body.classList.add('flipbook-overflow-hidden');
        this.$html.classList.add('flipbook-overflow-hidden');
    }

    hideOverlay() {
        if (!this.$html) return;

        const el = FLIPBOOK.Lightbox.sharedOverlay;
        el.classList.remove('flipbook-overlay-visible');

        // Detach wrapper after transition ends
        el.addEventListener(
            'transitionend',
            () => {
                if (el.contains(this.wrapper)) el.removeChild(this.wrapper);
            },
            { once: true }
        );

        this.$body.classList.remove('flipbook-overflow-hidden');
        this.$html.classList.remove('flipbook-overflow-hidden');
        this.context.restoreScrollPosition();
    }

    closeLightbox(popState) {
        if (!this.lightboxOpened) return;
        this.lightboxOpened = false;

        this.hideOverlay();

        window.dispatchEvent(new Event('r3d-lightboxclose'));
        this.context.trigger('lightboxclose');
        this.context.fullscreenElement.classList.remove('flipbook-browser-fullscreen');
        this.context.lightboxEnd();

        if (!popState && !this.options.deeplinkingEnabled) history.back();
    }

    disposeLightbox() {
        this.lightboxOpened = false;

        this.hideOverlay();

        window.dispatchEvent(new Event('r3d-lightboxclose'));
        this.context.trigger('lightboxclose');
        this.context.fullscreenElement.classList.remove('flipbook-browser-fullscreen');
        this.context.lightboxEnd();
        this.context.disposed = true;
    }
};

// FLIPBOOK.Lightbox = class {
//     constructor(context, content, options) {
//         this.context = context;
//         this.options = options;

//         this.$document = document;
//         this.$body = document.body;
//         this.$html = document.documentElement;
//         this.$window = window;

//         this.overlay = document.createElement('div');
//         this.overlay.className = 'flipbook-overlay';
//         // this.overlay.classList.add('flipbook-hidden');
//         this.overlay.style.top = this.options.lightboxMarginV;
//         this.overlay.style.bottom = this.options.lightboxMarginV;
//         this.overlay.style.left = this.options.lightboxMarginH;
//         this.overlay.style.right = this.options.lightboxMarginH;
//         Object.assign(this.overlay.style, options.lightboxCSS);
//         document.body.appendChild(this.overlay);

//         if (options.lightboxBackground) {
//             this.overlay.style.background = options.lightboxBackground;
//         }

//         if (options.lightboxBackgroundColor) {
//             this.overlay.style.background = options.lightboxBackgroundColor;
//         }

//         if (options.lightboxBackgroundPattern) {
//             this.overlay.style.background = 'url(' + options.lightboxBackgroundPattern + ') repeat';
//         }

//         if (options.lightboxBackgroundImage) {
//             this.overlay.style.background = 'url(' + options.lightboxBackgroundImage + ') no-repeat';
//             this.overlay.style.backgroundSize = 'cover';
//             this.overlay.style.backgroundPosition = 'center center';
//         }

//         document.addEventListener('keydown', (e) => {
//             if (e.key === 'Escape') {
//                 this.closeLightbox();
//             }
//         });

//         this.wrapper = document.createElement('div');
//         this.wrapper.style.height = 'auto';
//         this.wrapper.className = 'flipbook-wrapper-transparent';
//         this.wrapper.style.margin = '0px auto';
//         this.wrapper.style.padding = '0px';
//         this.wrapper.style.height = '100%';
//         this.wrapper.style.width = '100%';
//         this.overlay.appendChild(this.wrapper);

//         this.wrapper.appendChild(content);

//         var toolbar = document.createElement('div');
//         toolbar.className = 'flipbook-lightbox-toolbar';
//         this.wrapper.appendChild(toolbar);
//     }

//     openLightbox() {
//         if (this.lightboxOpened) {
//             return;
//         }

//         this.lightboxOpened = true;

//         this.showOverlay();

//         const lightboxOpenEvent = new Event('r3d-lightboxopen');
//         window.dispatchEvent(lightboxOpenEvent);

//         if (!this.options.deeplinkingEnabled) {
//             window.history.pushState(null, '', window.location.href);
//             this.context.historyStateChange();
//         }

//         if (this.context.options.password && !this.context.pdfinitStarted && this.context.initialized) {
//             this.context.initPdf();
//         }
//     }

//     showOverlay() {
//         if (!this.overlay || !this.$html) return;

//         const element = this.overlay;
//         element.classList.add('flipbook-overlay-visible');

//         this.context.saveScrollPosition();

//         document.body.classList.add('flipbook-overflow-hidden');
//         this.$html.classList.add('flipbook-overflow-hidden');
//     }

//     hideOverlay() {
//         if (!this.overlay || !this.$html) return;

//         const element = this.overlay;
//         element.classList.remove('flipbook-overlay-visible');

//         document.body.classList.remove('flipbook-overflow-hidden');
//         this.$html.classList.remove('flipbook-overflow-hidden');

//         this.context.restoreScrollPosition();
//     }

//     closeLightbox(popState) {
//         if (!this.lightboxOpened /*|| !this.context.Book || !this.context.Book.enabled*/) {
//             return;
//         }

//         this.lightboxOpened = false;

//         this.hideOverlay();

//         const lightboxCloseEvent = new Event('r3d-lightboxclose');
//         window.dispatchEvent(lightboxCloseEvent);

//         this.context.trigger('lightboxclose');

//         this.context.fullscreenElement.classList.remove('flipbook-browser-fullscreen');

//         this.context.lightboxEnd();

//         if (!popState && !this.options.deeplinkingEnabled) {
//             history.back();
//         }
//     }

//     disposeLightbox() {
//         this.lightboxOpened = false;

//         this.hideOverlay();

//         const lightboxCloseEvent = new Event('r3d-lightboxclose');
//         window.dispatchEvent(lightboxCloseEvent);

//         this.context.trigger('lightboxclose');

//         this.context.fullscreenElement.classList.remove('flipbook-browser-fullscreen');

//         this.context.lightboxEnd();

//         this.context.disposed = true;
//     }
// };

FLIPBOOK.onPageLinkClick = function (link) {
    var id = link.dataset.bookid;
    var page = link.dataset.page;
    if (page) {
        FLIPBOOK.books[id].goToPage(Number(page));
    }
    var _url = link.dataset.url;
    if (_url) {
        window.open(_url, '_blank');
    }
};

FLIPBOOK.easings = {
    linear: function (t) {
        return t;
    },
    easeInQuad: function (t) {
        return t * t;
    },
    easeOutQuad: function (t) {
        return t * (2 - t);
    },
    easeInOutQuad: function (t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    easeInCubic: function (t) {
        return t * t * t;
    },
    easeOutCubic: function (t) {
        return --t * t * t + 1;
    },
    easeInOutCubic: function (t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },
    easeInQuart: function (t) {
        return t * t * t * t;
    },
    easeOutQuart: function (t) {
        return 1 - --t * t * t * t;
    },
    easeInOutQuart: function (t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
    },
    easeInQuint: function (t) {
        return t * t * t * t * t;
    },
    easeOutQuint: function (t) {
        return 1 + --t * t * t * t * t;
    },
    easeInOutQuint: function (t) {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
    },
    easeInSine: function (t) {
        return 1 - Math.cos((t * Math.PI) / 2);
    },
    easeOutSine: function (t) {
        return Math.sin((t * Math.PI) / 2);
    },
    easeInOutSine: function (t) {
        return 0.5 * (1 - Math.cos(Math.PI * t));
    },
};

FLIPBOOK.animate = function (params) {
    let start = performance.now();
    let from = params.from;
    let to = params.to;
    let duration = params.duration;
    let change = to - from;
    let easing = FLIPBOOK.easings[params.easing] || FLIPBOOK.easings.linear;
    let rafId = null;
    let pausedAt = null;
    let repeatCount = params.repeat || 1;
    let yoyo = params.yoyo || false;
    let currentIteration = 0;
    let reversed = false;
    let delay = params.delay || 0;

    function animate() {
        let now = performance.now();
        let timeElapsed = pausedAt !== null ? pausedAt - start : now - start;

        if (timeElapsed < delay) {
            rafId = requestAnimationFrame(animate);
            return;
        }

        timeElapsed -= delay; // Adjust timeElapsed after delay
        let progress = Math.min(timeElapsed / duration, 1);
        let value;

        if (reversed) {
            value = from + change * easing(1 - progress);
        } else {
            value = from + change * easing(progress);
        }

        if (params.step) {
            params.step(value);
        }

        if (progress < 1) {
            rafId = requestAnimationFrame(animate);
        } else {
            currentIteration++;
            if (currentIteration < repeatCount) {
                if (yoyo) {
                    reversed = !reversed;
                }
                start = performance.now();
                rafId = requestAnimationFrame(animate);
            } else {
                if (params.step) {
                    params.step(to);
                }
                if (params.complete) {
                    params.complete();
                }
            }
        }
    }

    function pause() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            pausedAt = performance.now();
        }
    }

    function resume() {
        if (pausedAt) {
            start += performance.now() - pausedAt;
            pausedAt = null;
            rafId = requestAnimationFrame(animate);
        }
    }

    function stop() {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
    }

    if (delay > 0) {
        setTimeout(() => {
            start = performance.now(); // Reset start time after delay
            rafId = requestAnimationFrame(animate);
        }, delay);
    } else {
        rafId = requestAnimationFrame(animate);
    }

    return {
        pause,
        resume,
        stop,
    };
};
FLIPBOOK.extend = function () {
    function isPlainObject(obj) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }

    var options,
        name,
        src,
        copy,
        copyIsArray,
        clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // Handle a deep copy situation
    if (typeof target === 'boolean') {
        deep = target;
        target = arguments[1] || {};
        // Skip the boolean and the target
        i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== 'object' && typeof target !== 'function') {
        target = {};
    }

    // Extend the target object if only one argument is passed
    if (length === i) {
        target = this;
        --i;
    }

    for (; i < length; i++) {
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) != null) {
            // Extend the base object
            for (name in options) {
                if (Object.prototype.hasOwnProperty.call(options, name)) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && Array.isArray(src) ? src : [];
                        } else {
                            clone = src && isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = FLIPBOOK.extend(deep, clone, copy);

                        // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }
    }

    // Return the modified object
    return target;
};

FLIPBOOK.Tooltip2 = class {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.tooltipEl = null;

        this.activeTarget = null;
        this.tooltipObserver = null;

        this.init();
    }

    init() {
        this.tooltipEl = document.createElement('span');
        this.tooltipEl.className = 'flipbook-tooltip-element skin-color skin-color-bg';
        this.tooltipEl.setAttribute('role', 'tooltip');
        this.tooltipEl.id = 'flipbook-tooltip';
        this.wrapper.appendChild(this.tooltipEl);

        this.wrapper.addEventListener('mouseover', this.handleMouseOver.bind(this));
        this.wrapper.addEventListener('mouseout', this.handleMouseOut.bind(this));
        this.wrapper.addEventListener('focusin', this.handleFocusIn.bind(this));
        this.wrapper.addEventListener('focusout', this.handleMouseOut.bind(this));
        this.wrapper.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    }

    handleMouseOver(e) {
        const target = e.target.closest('.flipbook-has-tooltip');
        if (target && !target.classList.contains('disabled')) {
            this.showTooltip(target);
        }
    }

    handleFocusIn(e) {
        const target = e.target.closest('.flipbook-has-tooltip');
        if (target && !target.classList.contains('disabled')) {
            target.setAttribute('aria-describedby', 'flipbook-tooltip');
            this.showTooltip(target);
        }
    }

    handleTouchStart(e) {
        const target = e.target.closest('.flipbook-has-tooltip');
        if (target && !target.classList.contains('disabled')) {
            this.showTooltip(target);
            setTimeout(() => this.hideTooltip(), 2000);
        }
    }

    handleMouseOut() {
        this.hideTooltip();
    }

    showTooltip(target) {
        this.activeTarget = target;

        target.setAttribute('aria-describedby', 'flipbook-tooltip');

        this.observeTooltipChanges(target);

        this.updateTooltipText();

        this.tooltipEl.style.opacity = 0;
        this.tooltipEl.style.display = 'block';

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = this.tooltipEl.getBoundingClientRect();
        const wrapperRect = this.wrapper.getBoundingClientRect();

        let top = targetRect.top - wrapperRect.top - tooltipRect.height - 10;
        let left = targetRect.left - wrapperRect.left + (targetRect.width - tooltipRect.width) / 2;
        let isBelow = false;

        let arrowLeft = targetRect.left - wrapperRect.left + targetRect.width / 2 - left;
        arrowLeft = Math.max(6, Math.min(tooltipRect.width - 6, arrowLeft));

        if (top < 0) {
            top = targetRect.bottom - wrapperRect.top + 10;
            isBelow = true;
        }
        if (top + tooltipRect.height > wrapperRect.height) {
            top = wrapperRect.height - tooltipRect.height - 5;
        }
        if (left < 0) {
            left = 5;
            arrowLeft = targetRect.left - wrapperRect.left + targetRect.width / 2 - left;
            arrowLeft = Math.max(6, Math.min(tooltipRect.width - 6, arrowLeft));
        }
        if (left + tooltipRect.width > wrapperRect.width) {
            left = wrapperRect.width - tooltipRect.width - 5;
            arrowLeft = targetRect.left - wrapperRect.left + targetRect.width / 2 - left;
            arrowLeft = Math.max(6, Math.min(tooltipRect.width - 6, arrowLeft));
        }

        top += this.wrapper.scrollTop;
        left += this.wrapper.scrollLeft;

        this.tooltipEl.style.top = `${top}px`;
        this.tooltipEl.style.left = `${left}px`;
        this.tooltipEl.style.setProperty('--arrow-left', `${arrowLeft}px`);
        this.tooltipEl.classList.toggle('below', isBelow);

        this.tooltipEl.style.opacity = 1;
    }

    updateTooltipText() {
        if (!this.activeTarget) return;
        this.tooltipEl.innerText = this.activeTarget.dataset.tooltip || '';
    }

    observeTooltipChanges(target) {
        if (this.tooltipObserver) {
            this.tooltipObserver.disconnect();
            this.tooltipObserver = null;
        }

        this.tooltipObserver = new MutationObserver((mutations) => {
            if (!this.activeTarget || this.activeTarget !== target) return;

            for (const m of mutations) {
                if (m.type === 'attributes' && m.attributeName === 'data-tooltip') {
                    this.updateTooltipText();
                    break;
                }
            }
        });

        this.tooltipObserver.observe(target, {
            attributes: true,
            attributeFilter: ['data-tooltip'],
        });
    }

    hideTooltip() {
        this.tooltipEl.style.opacity = 0;
        this.tooltipEl.style.display = 'none';

        if (this.activeTarget) {
            this.activeTarget.removeAttribute('aria-describedby');
        }

        this.activeTarget = null;

        if (this.tooltipObserver) {
            this.tooltipObserver.disconnect();
            this.tooltipObserver = null;
        }
    }
};
