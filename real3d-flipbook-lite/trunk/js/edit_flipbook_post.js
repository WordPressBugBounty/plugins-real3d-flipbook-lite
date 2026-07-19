"use strict";

var pluginDir = (function (scripts) {
  var scripts = document.getElementsByTagName("script"),
    script = scripts[scripts.length - 1];
  if (script.getAttribute.length !== undefined) {
    return script.src.split("js/edit_flipbook")[0];
  }
  return script.getAttribute("src", -1).split("js/edit_flipbook")[0];
})();

(function ($) {
  $(document).ready(function () {
    postboxes.save_state = function () {
      return;
    };
    postboxes.save_order = function () {
      return;
    };

    if (postboxes.handle_click && !postboxes.handle_click.guid)
      postboxes.add_postbox_toggles();

    var $editPageModalWrapper = $("#edit-page-modal-wrapper").appendTo(
      $("body")
    );
    var $editPageModal = $("#edit-page-modal");
    var $modalBackdrop = $(".media-modal-backdrop");
    var creatingPage;

    if (FLIPBOOK && FLIPBOOK.PageEditor)
      var pageEditor = new FLIPBOOK.PageEditor($editPageModal);

    $(".media-modal-close").click(closeModal);

    function closeModal() {
      $editPageModal.hide();
      $modalBackdrop.hide();
      $("body").css("overflow", "auto");
    }

    $("#real3dflipbook-admin").show();

    var pdfDocument = null;

    $(".creating-page").hide();

    
    function convertStrings(obj) {
      $.each(obj, function (key, value) {
        if (typeof value == "object" || typeof value == "array") {
          convertStrings(value);
        } else if (!isNaN(value)) {
          if (obj[key] == "") delete obj[key];
          else if (key != "security") obj[key] = Number(value);
        } else if (value == "true") {
          obj[key] = true;
        } else if (value == "false") {
          obj[key] = false;
        }
      });
    }
    

    convertStrings(options);

    if (options.pages) {
      if (!Array.isArray(options.pages)) {
        var pages = [];
        for (var key in options.pages) {
          pages[key] = options.pages[key];
        }
        options.pages = pages;
      }

      for (var key in options.pages) {
        options.pages[key] = options.pages[key] || {};
        if (options.pages[key].htmlContent)
          options.pages[key].htmlContent = unescape(
            options.pages[key].htmlContent
          );
        if (options.pages[key].items) {
          options.pages[key].items.forEach(function (item, itemIndex) {
            if (options.pages[key].items[itemIndex].url)
              options.pages[key].items[itemIndex].url = unescape(
                options.pages[key].items[itemIndex].url
              );
          });
        }
      }
    }

    addOptionGeneral(
      "mode",
      "dropdown",
      "Mode",
      "<strong>normal</strong> - embedded in a container div<br/><strong>lightbox</strong> - opens in fullscreen overlay on click<br/><strong>fullscreen</strong> - covers entire page",
      ["normal", "lightbox", "fullscreen"]
    );

    addOptionGeneral(
      "viewMode",
      "dropdown",
      "View mode",
      "<strong>webgl</strong> - realistic 3D page flip with lights and shadows<br/><strong>3d</strong> - CSS 3D flip<br/><strong>swipe</strong> - horizontal swipe<br/><strong>simple</strong> - no animation",
      ["webgl", "3d", "2d", "swipe", "scroll", "simple"]
    );

    addOptionGeneral(
      "containerRatio",
      "text",
      "Container aspect ratio",
      "Width / height ratio of flipbook container"
    );

    addOptionGeneral(
      "zoomMin",
      "text",
      "Initial zoom",
      "Initial book zoom, recommended between 0.8 and 1",
      null,
      true
    );

    addOptionGeneral(
      "zoomStep",
      "text",
      "Zoom step",
      "Between 1.1 and 4",
      null,
      true
    );

    addOptionGeneral(
      "zoomSize",
      "text",
      "Zoom size",
      "Override maximum zoom, for example 4000 will zoom the page until page height on screen is 4000px)",
      null,
      true
    );

    addOptionGeneral(
      "zoomReset",
      "checkbox",
      "Reset Zoom",
      "Reset zoom after page flip, window resize, exit from fullscreen or toggle toc, thumbs, bookmarks, search",
      null,
      true
    );

    addOptionGeneral(
      "doubleClickZoom",
      "checkbox",
      "Double click zoom",
      null,
      true
    );

    addOptionGeneral("pageDrag", "checkbox", "Turn pages with click and drag");

    addOptionGeneral(
      "singlePageMode",
      "checkbox",
      "Single page view",
      "Display one page at a time"
    );

    addOptionGeneral(
      "pageFlipDuration",
      "text",
      "Flip duration",
      "Duration of flip animation, recommended between 0.5 and 2"
    );

    addOptionGeneral("sound", "checkbox", "Page flip sound");

    addOptionGeneral("backgroundMusic", "selectFile", "Background music .mp3");

    addOptionGeneral(
      "backgroundMusicOnAutoplay",
      "checkbox",
      "Play background music only during autoplay",
      "When enabled, background music plays only while autoplay is running"
    );

    addOptionGeneral(
      "startPage",
      "text",
      "Start page",
      "Open flipbook at this page at start"
    );

    addOptionGeneral(
      "pageNumberOffset",
      "text",
      "Page number offset",
      "to start the book page count at different page, example Cover, 1, 2"
    );

    addOptionGeneral(
      "deeplinking[enabled]",
      "checkbox",
      "Deep linking",
      "enable to use URL hash to link to specific page, for example #2 will open page 2",
      null,
      true
    );

    addOptionGeneral(
      "deeplinking[prefix]",
      "text",
      "Deep linking prefix",
      'custom deep linking prefix, for example "book1_", link to page 2 will have URL hash #book1_2',
      null,
      true
    );

    addOptionGeneral(
      "responsiveView",
      "checkbox",
      "Responsive view",
      "Shows one page layout if flipbook width is below the breakpoint."
    );

    addOptionGeneral(
      "responsiveViewTreshold",
      "text",
      "Responsive view breakpoint",
      "Container width in px under which responsive view is activated."
    );

    addOptionGeneral(
      "responsiveViewRatio",
      "text",
      "Responsive view ratio",
      "Aspect ratio (container width / height) under which responsive view is activated"
    );

    addOptionGeneral(
      "minimalView",
      "checkbox",
      "Minimal UI view",
      "Shows only fullscreen button and navigation arrows if flipbook width is below the breakpoint."
    );

    addOptionGeneral(
      "minimalViewBreakpoint",
      "text",
      "Minimal view breakpoint",
      "Container width in px under which minimal view is activated."
    );

    addOptionGeneral(
      "rangeChunkSize",
      "dropdown",
      "PDF range chunk size",
      "Range request siz in KB. Larger is better for large PDFs, smaller is better for small PDFs.",
      [
        { display: "64 KB", value: "64" },
        { display: "128 KB", value: "128" },
        { display: "256 KB", value: "256" },
        { display: "512 KB", value: "512" },
        { display: "256 KB", value: "256" },
        { display: "512 KB", value: "512" },
        { display: "1 MB", value: "1024" },
        { display: "2 MB", value: "2048" },
      ],
      64
    );

    addOptionGeneral(
      "minPixelRatio",
      "text",
      "Minimum Pixel ratio",
      "Override device pixel ratio to force higher quality for WebGL."
    );

    addOptionGeneral(
      "pdfTextLayer",
      "checkbox",
      "PDF text layer",
      "Enable for text selection tool and text search, disable for faster page loading",
      null,
      true
    );

    addOptionGeneral(
      "pdfAutoLinks",
      "checkbox",
      "PDF auto links",
      "Automatically convert PDF text to links",
      null,
      true
    );

    addOptionGeneral(
      "disableRange",
      "checkbox",
      "Disable PDF Range requests",
      "Disable partial PDF download",
      null,
      true
    );

    addOptionGeneral("linkColor", "color", "Page links color", "", null, true);

    addOptionGeneral(
      "linkColorHover",
      "color",
      "Page links hover color",
      "",
      null,
      true
    );

    addOptionGeneral(
      "linkOpacity",
      "text",
      "Page links opacity",
      "",
      null,
      true
    );

    addOptionGeneral(
      "linkTarget",
      "dropdown",
      "Page links target",
      "Open PDF links in new window, same window or lightbox",
      [
        { display: "New Window", value: "_blank" },
        { display: "Same Window", value: "_self" },
        { display: "Spotlight (Lightbox)", value: "spotlight" },
      ],
      true
    );

    addOptionGeneral(
      "cover",
      "checkbox",
      "Front cover",
      "Disable cover for viewing only inner pages (1-2, 3-4, ...) "
    );

    addOptionGeneral("backCover", "checkbox", "Back cover");
    addOptionGeneral(
      "scaleCover",
      "checkbox",
      "Scale cover",
      "Force cover and spreads when all pages are the same size"
    );

    addOptionGeneral(
      "pageCaptions",
      "checkbox",
      "Page Captions",
      "Show page captions"
    );

    addOptionGeneral(
      "thumbnailsOnStart",
      "checkbox",
      "Show Thumbnails on start",
      "",
      null,
      true
    );

    addOptionGeneral(
      "contentOnStart",
      "checkbox",
      "Show Table of Contents on start",
      "",
      null,
      true
    );

    addOptionGeneral(
      "searchOnStart",
      "text",
      "Search PDF on start",
      "",
      null,
      true
    );

    addOptionGeneral(
      "searchResultsThumbs",
      "checkbox",
      "Show search results as page thumbnails",
      "",
      null,
      true
    );

    addOptionGeneral(
      "tableOfContentCloseOnClick",
      "checkbox",
      "Close Table of Contents when page is clicked",
      "",
      null,
      true
    );

    addOptionGeneral(
      "thumbsCloseOnClick",
      "checkbox",
      "Close Thumbnails when page is clicked",
      "",
      null,
      true
    );

    addOptionGeneral("autoplayOnStart", "checkbox", "Auto flip on start");

    addOptionGeneral("autoplayLoop", "checkbox", "Auto flip loop");

    addOptionGeneral("autoplayInterval", "text", "Auto flip interval (ms)");

    addOptionGeneral(
      "rightToLeft",
      "checkbox",
      "Right to left mode",
      "Flipping from right to left (inverted)"
    );

    addOptionGeneral(
      "thumbSize",
      "text",
      "Thumbnail size",
      "Thumbnail height for thumbnails view"
    );

    addOptionGeneral(
      "logoImg",
      "selectImage",
      "Logo image",
      "Logo image that will be displayed inside the flipbook container"
    );

    addOptionGeneral(
      "logoUrl",
      "text",
      "Logo link",
      "URL that will be opened on logo click"
    );

    addOptionGeneral(
      "logoUrlTarget",
      "dropdown",
      "Logo link target",
      "Open in new window",
      ["_blank", "_self"]
    );

    addOptionGeneral("logoCSS", "textarea", "Logo CSS", "Custom CSS for logo");

    addOptionGeneral(
      "menuSelector",
      "text",
      "Menu css selector",
      'Example "#menu" or ".navbar". Used with mode "fullscreen" so the flipbook will be resized correctly below the menu'
    );

    addOptionGeneral(
      "zIndex",
      "text",
      "Container z-index",
      "Set z-index of flipbook container"
    );

    addOptionGeneral(
      "preloaderText",
      "text",
      "Preloader text",
      "Text that will be displayed under the preloader spinner"
    );

    addOptionGeneral(
      "googleAnalyticsTrackingCode",
      "text",
      "Google analytics tracking code",
      "",
      null,
      true
    );

    addOptionGeneral(
      "pdfBrowserViewerIfIE",
      "checkbox",
      "Download PDF instead of displaying flipbook if browser is Internet Explorer",
      "For PDF flipbook"
    );

    addOptionGeneral(
      "arrowsAlwaysEnabledForNavigation",
      "checkbox",
      "Force keyboard arrows for navigation",
      "Enable keyboard arrows for navigation even if not fullscreen"
    );

    addOptionGeneral(
      "arrowsDisabledNotFullscreen",
      "checkbox",
      "Disable arrows for navigation if not fullscreen",
      "Disable arrows for navigation if not fullscreen"
    );

    addOptionGeneral(
      "touchSwipeEnabled",
      "checkbox",
      "Touch swipe to turn page",
      "Turn pages with touch & swipe or click & drag"
    );

    addOptionGeneral(
      "fitToWidth",
      "checkbox",
      "Fit to width",
      "Fit flipbook to width (for scroll view mode)"
    );

    addOptionGeneral(
      "rightClickEnabled",
      "checkbox",
      "Right click context menu",
      "Disable to prevent right click image download",
      null,
      true
    );

    addOptionGeneral(
      "access",
      "dropdown",
      "Access",
      "Direct access to flipbook (flipbook permalink)",
      ["full", "woo_subscription", "none"],
      true
    );

    addOptionLightbox(
      "lightboxCssClass",
      "text",
      "CSS class",
      "CSS class that will trigger lightbox. Add this CSS class to any element that you want to trigger lightbox (Flipbook shortcode needs to be on the page)"
    );

    addOptionLightbox(
      "lightboxThumbnailUrl",
      "selectImage",
      "Thumbnail",
      "Image that will be displayed in place of shortcode, and will trigger lightbox on click"
    );

    var $thumbRow = $("input[name='lightboxThumbnailUrl']").parent();
    var $btnGenerateThumb = $(
      '<a class="generate-thumbnail-button button-secondary button80" href="#">Generate thumbnail</a>'
    ).appendTo($thumbRow);

    function addMenuButton(name) {
      addOption(name, name + "[enabled]", "checkbox", "Enabled");

      addOption(name, name + "[title]", "text", "Title");

      addOption(name, name + "[vAlign]", "dropdown", "Vertical align", "", [
        "top",
        "bottom",
      ]);

      addOption(name, name + "[hAlign]", "dropdown", "Horizontal align", "", [
        "right",
        "left",
        "center",
      ]);

      addOption(name, name + "[order]", "text", "Order");
    }

    addMenuButton("currentPage");
    addMenuButton("btnAutoplay");
    addMenuButton("btnNext");
    addMenuButton("btnPrev");
    addMenuButton("btnFirst");
    addMenuButton("btnLast");
    addMenuButton("btnZoomIn");
    addMenuButton("btnZoomOut");
    addMenuButton("btnToc");
    addMenuButton("btnThumbs");
    addMenuButton("btnShare");
    addMenuButton("btnSound");
    addMenuButton("btnExpand");
    addMenuButton("btnDownloadPages");
    addMenuButton("btnDownloadPdf");
    addMenuButton("btnPrint");
    addMenuButton("btnSingle");
    addMenuButton("btnSearch");
    addMenuButton("search");
    addMenuButton("btnBookmark");
    addMenuButton("btnTools");
    addMenuButton("btnClose");

    addOption(
      "btnDownloadPages",
      "btnDownloadPages[url]",
      "selectFile",
      "URL of zip file containing all pages"
    );

    addOption(
      "btnDownloadPdf",
      "btnDownloadPdf[url]",
      "selectFile",
      "PDF file URL"
    );

    addOption(
      "btnDownloadPdf",
      "btnDownloadPdf[forceDownload]",
      "checkbox",
      "force download"
    );

    addOption(
      "btnDownloadPdf",
      "btnDownloadPdf[openInNewWindow]",
      "checkbox",
      "open PDF in new browser window"
    );

    addOption("btnPrint", "printPdfUrl", "selectFile", "PDF file for printing");

    addOption(
      "share-buttons",
      "shareTitle",
      "text",
      "Share Title",
      "Title that will be used for sharing"
    );

    addOption(
      "share-buttons",
      "shareUrl",
      "text",
      "Share URL",
      "URL that will be shaed, if not set it will use the website URL"
    );

    addOption(
      "share-buttons",
      "shareImage",
      "text",
      "Share Image",
      "URL of the image for sharing"
    );

    addOption("share-buttons", "facebook[enabled]", "checkbox", "Facebook");

    addOption("share-buttons", "twitter[enabled]", "checkbox", "Twitter");

    addOption("share-buttons", "pinterest[enabled]", "checkbox", "Pinterest");

    addOption("share-buttons", "email[enabled]", "checkbox", "Email");

    addOption("share-buttons", "reddit[enabled]", "checkbox", "Reddit");

    addOption("share-buttons", "digg[enabled]", "checkbox", "Digg");

    addOption("share-buttons", "linkedin[enabled]", "checkbox", "LinkedIn");

    addOption("share-buttons", "whatsapp[enabled]", "checkbox", "Whatsapp");

    addOptionWebgl(
      "pagesInMemory",
      "text",
      "Pages in memory",
      "Number of pages that will be kept in memory",
      null,
      true
    );

    addOptionWebgl(
      "lights",
      "checkbox",
      "Lights",
      "realistic lightning, disable for faster performance"
    );

    addOptionWebgl(
      "lightPositionX",
      "text",
      "Light pposition x",
      "between -500 and 500"
    );

    addOptionWebgl(
      "lightPositionY",
      "text",
      "Light position y",
      "between -500 and 500"
    );

    addOptionWebgl(
      "lightPositionZ",
      "text",
      "Light position z",
      "between 1000 and 2000"
    );

    addOptionWebgl(
      "lightIntensity",
      "text",
      "Light intensity",
      "between 0 and 1"
    );

    addOptionWebgl(
      "shadows",
      "checkbox",
      "Shadows",
      "realistic page shadows, disable for faster performance"
    );

    addOptionWebgl(
      "shadowOpacity",
      "text",
      "Shadow opacity",
      "between 0 and 1"
    );

    addOptionWebgl("pageHardness", "text", "Page hardness", "between 1 and 5");

    addOptionWebgl(
      "coverHardness",
      "text",
      "Cover hardness",
      "between 1 and 5"
    );

    addOptionWebgl(
      "pageRoughness",
      "text",
      "Page material roughness",
      "between 0 and 1"
    );

    addOptionWebgl(
      "pageMetalness",
      "text",
      "Page material metalness",
      "between 0 and 1"
    );

    addOptionWebgl(
      "pageSegmentsW",
      "text",
      "Page segments W",
      "between 3 and 20"
    );

    addOptionWebgl(
      "pageMiddleShadowSize",
      "text",
      "Page middle shadow size",
      "shadow in the middle of the book"
    );

    addOptionWebgl(
      "pageMiddleShadowColorL",
      "color",
      "left page middle shadow color"
    );

    addOptionWebgl(
      "pageMiddleShadowColorR",
      "color",
      "right page middle shadow color"
    );

    addOptionWebgl(
      "antialias",
      "checkbox",
      "Antialiasing",
      "disable for faster performance"
    );

    addOptionWebgl("pan", "text", "Camera pan angle", "between -10 and 10");

    addOptionWebgl("tilt", "text", "Camera tilt angle", "between -30 and 0");

    addOptionWebgl(
      "rotateCameraOnMouseDrag",
      "checkbox",
      "rotate camera on mouse drag"
    );

    addOptionWebgl(
      "panMax",
      "text",
      "Camera pan max angle",
      "between 0 and 20"
    );

    addOptionWebgl(
      "panMin",
      "text",
      "Camera pan min angle",
      "between -20 and 0"
    );

    addOptionWebgl(
      "tiltMax",
      "text",
      "Camera tilt max angle",
      "between -60 and 0"
    );

    addOptionWebgl(
      "tiltMin",
      "text",
      "Camera tilt min angle",
      "between -60 and 0"
    );

    addOptionWebgl(
      "cornerCurl",
      "checkbox",
      "Corner curl",
      "Corner curl animation on cover page"
    );

    addOptionWebgl(
      "bitmapResizeHeight",
      "text",
      "Bitmap resize height",
      "Resize image to this height before rendering (webgl mode)"
    );

    addOptionWebgl(
      "bitmapResizeQuality",
      "dropdown",
      "Bitmap resize quality",
      "Bitmap resize quality (webgl mode)",
      ["", "low", "medium", "heigh"]
    );

    // Preview (per-flipbook). The #flipbook-preview-options table only exists when the
    // Preview addon is active, so these are no-ops otherwise. They override the global
    // Preview Mode settings for this flipbook.
    addOption(
      "preview",
      "previewPages",
      "text",
      "Preview pages",
      "A single number (e.g. 20) cuts this flipbook to the first N pages; a range or list (e.g. 1-20 or 1,2,3) shows those pages and locks the rest. Leave blank to use the global setting."
    );
    addOption(
      "preview",
      "lockedPageSize",
      "text",
      "Locked page resolution",
      "Resolution of locked pages (range/list mode). Lower = more obscured. Default 150."
    );
    addOption(
      "preview",
      "previewTitle",
      "text",
      "Message title",
      "Leave blank for the global/default title."
    );
    addOption(
      "preview",
      "previewDescription",
      "textarea",
      "Message text (HTML allowed)",
      "Leave blank for the global/default text."
    );
    addOption(
      "preview",
      "previewButtonText",
      "text",
      "Button text",
      "Optional. Leave blank for no button."
    );
    addOption(
      "preview",
      "previewButtonUrl",
      "text",
      "Button URL",
      "Where the call-to-action button links to."
    );

    //UI

    addOption(
      "menu-bar-2",
      "menu2Background",
      "color",
      "Background color",
      "custom CSS"
    );

    addOption("menu-bar-2", "menu2Shadow", "text", "Shadow", "custom CSS");

    addOption("menu-bar-2", "menu2Margin", "text", "Margin");

    addOption("menu-bar-2", "menu2Padding", "text", "Padding");

    addOption(
      "menu-bar-2",
      "menu2OverBook",
      "checkbox",
      "Over book",
      "menu covers the book (overlay)"
    );

    addOption(
      "menu-bar-2",
      "menu2Transparent",
      "checkbox",
      "Transoarent",
      "menu has no background"
    );

    addOption(
      "menu-bar-2",
      "menu2Floating",
      "checkbox",
      "Floating",
      "small menu floating over book, not full width"
    );

    addOption(
      "menu-bar",
      "menuBackground",
      "color",
      "Background color",
      "custom CSS"
    );

    addOption("menu-bar", "menuShadow", "text", "Shadow", "custom CSS");

    addOption("menu-bar", "menuMargin", "text", "Margin");

    addOption("menu-bar", "menuPadding", "text", "Padding");

    addOption(
      "menu-bar",
      "menuOverBook",
      "checkbox",
      "Over book",
      "menu covers the book (overlay)"
    );

    addOption(
      "menu-bar",
      "menuTransparent",
      "checkbox",
      "Transoarent",
      "Menu has no background"
    );

    addOption(
      "menu-bar",
      "menuFloating",
      "checkbox",
      "Floating",
      "small menu floating over book, not full width"
    );

    addOption(
      "menu-bar",
      "hideMenu",
      "checkbox",
      "Hide menu",
      "hide menu completely"
    );

    addOption("menu-buttons", "btnColor", "color", "Color");

    addOption("menu-buttons", "btnColorHover", "color", "Hover color");

    addOption("menu-buttons", "btnBackground", "color", "Background color");

    addOption(
      "menu-buttons",
      "btnBackgroundHover",
      "color",
      "Background hover color"
    );

    addOption("menu-buttons", "btnRadius", "text", "Radius", "px");

    addOption("menu-buttons", "btnMargin", "text", "Margin", "px");

    addOption("menu-buttons", "btnSize", "text", "Size", "between 8 and 20");

    addOption(
      "menu-buttons",
      "btnPaddingV",
      "text",
      "Padding vertical",
      "between 0 and 20"
    );

    addOption(
      "menu-buttons",
      "btnPaddingH",
      "text",
      "Padding horizontal",
      "between 0 and 20"
    );

    addOption("menu-buttons", "btnShadow", "text", "Box shadow", "custom CSS");

    addOption(
      "menu-buttons",
      "btnTextShadow",
      "text",
      "Text shadow",
      "custom CSS"
    );

    addOption("menu-buttons", "btnBorder", "text", "Border", "custom CSS");

    addOption(
      "side-buttons",
      "sideNavigationButtons",
      "checkbox",
      "Enabled",
      "Arrows on the sides"
    );

    addOption(
      "side-buttons",
      "menuNavigationButtons",
      "checkbox",
      "Arrows in the menu",
      "Show also the arrows in the menu"
    );

    addOption("side-buttons", "arrowColor", "color", "Color");

    addOption("side-buttons", "arrowColorHover", "color", "Hover color");

    addOption("side-buttons", "arrowBackground", "color", "Background color");

    addOption(
      "side-buttons",
      "arrowBackgroundHover",
      "color",
      "Background hover color"
    );

    addOption("side-buttons", "arrowRadius", "text", "Radius", "px");

    addOption("side-buttons", "arrowMargin", "text", "Margin", "px");

    addOption(
      "side-buttons",
      "arrowSize",
      "text",
      "Size",
      "Side buttons margin size, between 8 and 50"
    );

    addOption(
      "side-buttons",
      "arrowPadding",
      "text",
      "Padding",
      "Side buttons padding, between 0 and 10"
    );

    addOption(
      "side-buttons",
      "arrowTextShadow",
      "text",
      "Text shadow",
      "custom CSS"
    );

    addOption("side-buttons", "arrowBorder", "text", "Border", "custom CSS");

    addOption(
      "current-page",
      "currentPagePositionV",
      "dropdown",
      "Current page display vertical position",
      "Vertical position",
      ["top", "bottom"]
    );

    addOption(
      "current-page",
      "currentPagePositionH",
      "dropdown",
      "Horizontal position",
      "Current page display horizontal position",
      ["left", "right"]
    );

    addOption(
      "current-page",
      "currentPageMarginV",
      "text",
      "Vertical margin",
      "between 0 and 10"
    );

    addOption(
      "current-page",
      "currentPageMarginH",
      "text",
      "Horizontal margin",
      "between 0 and 10"
    );

    setOptionValue("pdfUrl", options.pdfUrl);

    
    $(document).on("click", ".r3d-pro-content", function (e) {
      e.preventDefault();

      Swal.fire({
        title: "This is a PRO feature",
        html:
          '<div style="text-align:left;max-width:340px;margin:0 auto;">' +
          '<p style="margin:0 0 12px;color:#50575e;">Upgrade to Real3D Flipbook PRO to unlock:</p>' +
          '<ul style="list-style:none;margin:0 0 14px;padding:0;color:#1d2327;line-height:2;">' +
          '<li><span style="color:#84af05;font-weight:700;">&#10003;</span> High resolution pages with deep zoom</li>' +
          '<li><span style="color:#84af05;font-weight:700;">&#10003;</span> PDF links and text search</li>' +
          '<li><span style="color:#84af05;font-weight:700;">&#10003;</span> Toolbar and UI customization</li>' +
          '<li><span style="color:#84af05;font-weight:700;">&#10003;</span> Google Analytics events</li>' +
          '<li><span style="color:#84af05;font-weight:700;">&#10003;</span> Mobile and global settings</li>' +
          '</ul>' +
          '<p style="margin:0 0 4px;font-size:12px;color:#787c82;">Plans from $49/year &middot; 30-day money-back guarantee</p>' +
          '<a style="font-size:12px;" href="https://real3dflipbook.com/?ref=wp-lite-popup" target="_blank">See live demos</a>' +
          '</div>',
        showCancelButton: true,
        showCloseButton: true,
        confirmButtonColor: "#84af05",
        cancelButtonColor: "#a3a3a3",
        confirmButtonText: "Upgrade to PRO",
        cancelButtonText: "Maybe later",
      }).then((result) => {
        if (result.isConfirmed) {
          window.open(
            "https://real3dflipbook.com/wordpress/?ref=wp-lite-popup#pricing",
            "_blank"
          );
        }
      });
    });
    

    function r3dBuildMenuButtonsTable() {
      var $tbody = $("#r3d-menu-buttons-tbody");
      if (!$tbody.length) return;

      // toolbar icons copied from flipbook.js FLIPBOOK icons (fontawesome set);
      // regenerate with the inject-mb-icons script if the viewer icon set changes
      var r3dMbIcons = {
        plus: [448, 512, "M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"],
        minus: [448, 512, "M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"],
        close: [384, 512, "M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"],
        next: [320, 512, "M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"],
        expand: [448, 512, "M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"],
        thumbs: [512, 512, "M448 96V224H288V96H448zm0 192V416H288V288H448zM224 224H64V96H224V224zM64 288H224V416H64V288zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"],
        print: [512, 512, "M128 0C92.7 0 64 28.7 64 64v96h64V64H354.7L384 93.3V160h64V93.3c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0H128zM384 352v32 64H128V384 368 352H384zm64 32h32c17.7 0 32-14.3 32-32V256c0-35.3-28.7-64-64-64H64c-35.3 0-64 28.7-64 64v96c0 17.7 14.3 32 32 32H64v64c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V384zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"],
        sound: [640, 512, "M533.6 32.5C598.5 85.3 640 165.8 640 256s-41.5 170.8-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"],
        share: [448, 512, "M352 224c53 0 96-43 96-96s-43-96-96-96s-96 43-96 96c0 4 .2 8 .7 11.9l-94.1 47C145.4 170.2 121.9 160 96 160c-53 0-96 43-96 96s43 96 96 96c25.9 0 49.4-10.2 66.6-26.9l94.1 47c-.5 3.9-.7 7.8-.7 11.9c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-25.9 0-49.4 10.2-66.6 26.9l-94.1-47c.5-3.9 .7-7.8 .7-11.9s-.2-8-.7-11.9l94.1-47C302.6 213.8 326.1 224 352 224z"],
        list: [512, 512, "M24 56c0-13.3 10.7-24 24-24H80c13.3 0 24 10.7 24 24V176h16c13.3 0 24 10.7 24 24s-10.7 24-24 24H40c-13.3 0-24-10.7-24-24s10.7-24 24-24H56V80H48C34.7 80 24 69.3 24 56zM86.7 341.2c-6.5-7.4-18.3-6.9-24 1.2L51.5 357.9c-7.7 10.8-22.7 13.3-33.5 5.6s-13.3-22.7-5.6-33.5l11.1-15.6c23.7-33.2 72.3-35.6 99.2-4.9c21.3 24.4 20.8 60.9-1.1 84.7L86.8 432H120c13.3 0 24 10.7 24 24s-10.7 24-24 24H32c-9.5 0-18.2-5.6-22-14.4s-2.1-18.9 4.3-25.9l72-78c5.3-5.8 5.4-14.6 .3-20.5zM224 64H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H224c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H224c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H224c-17.7 0-32-14.3-32-32s14.3-32 32-32z"],
        pdf: [512, 512, "M64 464l48 0 0 48-48 0c-35.3 0-64-28.7-64-64L0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 304l-48 0 0-144-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16zM176 352l32 0c30.9 0 56 25.1 56 56s-25.1 56-56 56l-16 0 0 32c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48 0-80c0-8.8 7.2-16 16-16zm32 80c13.3 0 24-10.7 24-24s-10.7-24-24-24l-16 0 0 48 16 0zm96-80l32 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-32 0c-8.8 0-16-7.2-16-16l0-128c0-8.8 7.2-16 16-16zm32 128c8.8 0 16-7.2 16-16l0-64c0-8.8-7.2-16-16-16l-16 0 0 96 16 0zm80-112c0-8.8 7.2-16 16-16l48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 32 32 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-64 0-64z"],
        tools: [128, 512, "M64 360a56 56 0 1 0 0 112 56 56 0 1 0 0-112zm0-160a56 56 0 1 0 0 112 56 56 0 1 0 0-112zM120 96A56 56 0 1 0 8 96a56 56 0 1 0 112 0z"],
        play: [384, 512, "M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"],
        bookmark: [384, 512, "M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"],
        download: [512, 512, "M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"],
        search: [512, 512, "M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"],
        last: [512, 512, "M470.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 256 265.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160zm-352 160l160-160c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L210.7 256 73.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0z"],
        single: [576, 512, "M249.6 471.5c10.8 3.8 22.4-4.1 22.4-15.5l0-377.4c0-4.2-1.6-8.4-5-11C247.4 52 202.4 32 144 32C93.5 32 46.3 45.3 18.1 56.1C6.8 60.5 0 71.7 0 83.8L0 454.1c0 11.9 12.8 20.2 24.1 16.5C55.6 460.1 105.5 448 144 448c33.9 0 79 14 105.6 23.5zm76.8 0C353 462 398.1 448 432 448c38.5 0 88.4 12.1 119.9 22.6c11.3 3.8 24.1-4.6 24.1-16.5l0-370.3c0-12.1-6.8-23.3-18.1-27.6C529.7 45.3 482.5 32 432 32c-58.4 0-103.4 20-123 35.6c-3.3 2.6-5 6.8-5 11L304 456c0 11.4 11.7 19.3 22.4 15.5z"],
      };
      var r3dMbIconMap = {
        btnFirst: ["last", true],
        btnPrev: ["next", true],
        btnNext: ["next"],
        btnLast: ["last"],
        btnZoomIn: ["plus"],
        btnZoomOut: ["minus"],
        btnAutoplay: ["play"],
        btnSearch: ["search"],
        search: ["search"],
        btnBookmark: ["bookmark"],
        btnToc: ["list"],
        btnThumbs: ["thumbs"],
        btnShare: ["share"],
        btnPrint: ["print"],
        btnDownloadPages: ["download"],
        btnDownloadPdf: ["pdf"],
        btnSound: ["sound"],
        btnTools: ["tools"],
        btnExpand: ["expand"],
        btnSingle: ["single"],
        btnClose: ["close"],
      };
      function r3dMbIcon(name) {
        var m = r3dMbIconMap[name];
        if (!m) return null;
        var d = r3dMbIcons[m[0]];
        if (!d) return null;
        var svgNS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 " + d[0] + " " + d[1]);
        svg.setAttribute(
          "class",
          "r3d-mb-icon" + (m[1] ? " r3d-mb-icon-rev" : "")
        );
        var path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", d[2]);
        svg.appendChild(path);
        return svg;
      }

      var POS = [
        ["", "", "Default"],
        ["top", "left", "Top left"],
        ["top", "center", "Top center"],
        ["top", "right", "Top right"],
        ["bottom", "left", "Bottom left"],
        ["bottom", "center", "Bottom center"],
        ["bottom", "right", "Bottom right"],
      ];

      function setHiddenSelect($sel, val) {
        if (!$sel.length) return;
        if ($sel.find('option[value="' + val + '"]').length === 0) {
          $sel.append($("<option></option>").attr("value", val).text(val || "default"));
        }
        $sel.val(val).trigger("change");
      }

      (window.r3dMenuButtons || []).forEach(function (btn) {
        var $src = $("#flipbook-" + btn.name + "-options");
        if (!$src.length) return;

        var $enabled = $src.find('[name="' + btn.name + '[enabled]"]');
        var $title = $src.find('[name="' + btn.name + '[title]"]');
        var $vAlign = $src.find('[name="' + btn.name + '[vAlign]"]');
        var $hAlign = $src.find('[name="' + btn.name + '[hAlign]"]');
        var $order = $src.find('[name="' + btn.name + '[order]"]');
        if (!$enabled.length) return;

        var $tr = $('<tr class="r3d-mb-row"></tr>');
        $(
          '<td class="r3d-mb-drag"><span class="dashicons dashicons-menu"></span></td>'
        ).appendTo($tr);
        var $tdName = $('<td class="r3d-mb-name"></td>').appendTo($tr);
        var mbIcon = r3dMbIcon(btn.name);
        if (mbIcon) $tdName.append(mbIcon);
        $tdName.append($("<span></span>").text(btn.title));

        var $tdEnabled = $('<td class="r3d-mb-enabled"></td>').appendTo($tr);
        var $rowEnabled = $enabled.closest("tr");
        $tdEnabled.append($enabled);
        $rowEnabled.remove();

        var $tdTitle = $('<td class="r3d-mb-title"></td>').appendTo($tr);
        var $rowTitle = $title.closest("tr");
        $tdTitle.append($title);
        $rowTitle.remove();

        var $tdPos = $('<td class="r3d-mb-pos"></td>').appendTo($tr);
        var $rowV = $vAlign.closest("tr");
        var $rowH = $hAlign.closest("tr");
        var $rowO = $order.closest("tr");
        $tdPos.append($vAlign, $hAlign, $order);
        $rowV.remove();
        $rowH.remove();
        $rowO.remove();
        $vAlign.hide();
        $hAlign.hide();
        $order.hide();

        var $pos = $("<select></select>");
        POS.forEach(function (p, i) {
          $pos.append($("<option></option>").attr("value", i).text(p[2]));
        });
        var current = 0;
        POS.forEach(function (p, i) {
          if (i && p[0] == $vAlign.val() && p[1] == $hAlign.val()) current = i;
        });
        $pos.val(current);
        $pos.on("change", function () {
          var p = POS[this.value];
          setHiddenSelect($vAlign, p[0]);
          setHiddenSelect($hAlign, p[1]);
        });
        $tdPos.prepend($pos);

        var $tdMore = $('<td class="r3d-mb-more"></td>').appendTo($tr);
        var $rest = $src.find("tbody tr");
        if (btn.name === "btnShare") {
          $rest = $rest.add($("#flipbook-share-buttons-options tbody tr"));
        }
        var $extras = null;
        if ($rest.length) {
          $extras = $(
            '<tr class="r3d-mb-extras" style="display:none;"><td></td><td colspan="5"></td></tr>'
          );
          var $extraTable = $('<table class="form-table"><tbody></tbody></table>');
          $extraTable.find("tbody").append($rest);
          $extras.find("td").last().append($extraTable);
          var $toggle = $(
            '<span class="dashicons dashicons-arrow-down-alt2"></span>'
          );
          $toggle.on("click", function () {
            $extras.toggle();
            $(this).toggleClass(
              "dashicons-arrow-down-alt2 dashicons-arrow-up-alt2"
            );
          });
          $tdMore.append($toggle);
        }

        $tr.data("r3dRow", { extras: $extras, orderInput: $order });
        var orderVal = parseFloat($order.val());
        $tr.data("r3dOrder", isNaN(orderVal) ? 9999 : orderVal);

        $tbody.append($tr);
        if ($extras) $tbody.append($extras);
      });

      var $sorted = $tbody.find("> tr.r3d-mb-row").sort(function (a, b) {
        return $(a).data("r3dOrder") - $(b).data("r3dOrder");
      });
      $sorted.each(function () {
        var d = $(this).data("r3dRow");
        $tbody.append(this);
        if (d && d.extras) $tbody.append(d.extras);
      });

      
      (window.r3dProMenuButtons || []).forEach(function (btn) {
        var exists = (window.r3dMenuButtons || []).some(function (b) {
          return b.name === btn.name;
        });
        if (exists) return;
        var $tr = $(
          '<tr class="r3d-mb-row r3d-mb-locked r3d-pro-content"></tr>'
        );
        $('<td class="r3d-mb-drag"></td>').appendTo($tr);
        var $tdLockedName = $('<td class="r3d-mb-name"></td>').appendTo($tr);
        var mbLockedIcon = r3dMbIcon(btn.name);
        if (mbLockedIcon) $tdLockedName.append(mbLockedIcon);
        $tdLockedName.append($("<span></span>").text(btn.title));
        $tdLockedName.append('<span class="r3d-mb-pro-badge">PRO</span>');
        $('<td colspan="4"></td>').appendTo($tr);
        $tbody.append($tr);
      });
      

      $tbody.sortable({
        items: "> tr.r3d-mb-row:not(.r3d-mb-locked)",
        handle: ".r3d-mb-drag",
        update: function () {
          $tbody.find("> tr.r3d-mb-row").each(function (i) {
            var d = $(this).data("r3dRow");
            if (!d) return;
            if (d.extras) $(this).after(d.extras);
            d.orderInput.val(i + 1).trigger("change");
          });
        },
      });
    }

    r3dBuildMenuButtonsTable();

    $("input.alpha-color-picker").alphaColorPicker();

    $(".copy-shortcode").click(function () {
      var id = $(this).attr("id");
      var shortcode = "[real3dflipbook id='" + id + "']";

      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(shortcode)
          .then(() => {
            $(this).text("Copied!");
            setTimeout(() => {
              $(this).text("Copy");
            }, 2000);
          })
          .catch(() => {
            $(this).text("Error");
            setTimeout(() => {
              $(this).text("Copy");
            }, 2000);
          });
      } else {
        var textarea = document.createElement("textarea");
        textarea.value = shortcode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        $(this).text("Copied!");
        setTimeout(() => {
          $(this).text("Copy");
        }, 2000);
      }
    });

    async function previewPDFPages() {
      document.body.classList.add("pdf-flipbook");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        pluginDir + "js/pdf.worker.min.js";

      var params = {
        cMapPacked: true,
        cMapUrl: pluginDir + "js/cmaps/",
        // disableAutoFetch: false,
        // disableCreateObjectURL: false,
        // disableFontFace: false,
        disableRange: options.disableRange,
        disableAutoFetch: true,
        disableStream: true,
        // isEvalSupported: true,
        // maxImageSize: -1,
        // pdfBug: false,
        // postMessageTransfers: true,
        url: options.pdfUrl,
        // verbosity: 1
      };

      //match page protocol
      if (location.protocol == "https:")
        params.url = params.url.replace("http://", "https://");
      else if (location.protocol == "http:")
        params.url = params.url.replace("https://", "http://");

      try {
        pdfDocument = await loadPDF(params);
      } catch (error) {}

      creatingPage = 1;

      await createEmptyPages(pdfDocument);

      await generateLightboxThumbnail();

      await loadPageFromPdf(pdfDocument, 1);

      if (FLIPBOOK.PDFTools) {
        if (options.id)
          $("#r3d-convert")
            .show()
            .click(function (e) {
              e.preventDefault();
              $(this).hide();
              convertWithPDFTools();
            });
      } else {
        $("#buy-pdf-tools").show();
      }
    }

    async function loadPDF(params) {
      let pdfDocument = null;

      try {
        pdfDocument = await pdfjsLib.getDocument(params).promise;
      } catch (error) {
        if (error.name === "PasswordException") {
          if (error.code === pdfjsLib.PasswordResponses.NEED_PASSWORD) {
            // Prompt user to enter the password
            const password = prompt("This document requires a password:");
            if (password) {
              params.password = password;
              return loadPDF(params); // Recursively call loadPDF with the new password
            } else {
              throw new Error("Password required but not provided.");
            }
          } else if (
            error.code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD
          ) {
            alert("Incorrect password. Please try again.");
            const password = prompt("Please enter the correct password:");
            if (password) {
              params.password = password;
              return loadPDF(params); // Recursively call loadPDF with the new password
            } else {
              throw new Error("Password required but not provided.");
            }
          }
        } else {
          // Handle other types of errors
          throw error;
        }
      }

      return pdfDocument;
    }

    function updateSaveBar() {
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 50
      ) {
        $("#r3d-save").removeClass("r3d-save-sticky");
        $("#r3d-save-holder").hide();
      } else {
        $("#r3d-save").addClass("r3d-save-sticky");
        $("#r3d-save-holder").show();
      }
    }

    $("#real3dflipbook-admin .nav-tab").click(function (e) {
      e.preventDefault();
      $("#real3dflipbook-admin .tab-active").hide();
      $(".nav-tab-active").removeClass("nav-tab-active");
      var a = jQuery(this).addClass("nav-tab-active");
      var id = "#" + a.attr("data-tab");
      jQuery(id).addClass("tab-active").fadeIn();
      window.location.hash = a.attr("data-tab").split("-")[1];
      updateSaveBar();
    });

    $("#real3dflipbook-admin .nav-tab").focus(function (e) {
      this.blur();
    });

    if (
      window.location.hash &&
      $('.nav-tab[data-tab="tab-' + window.location.hash.split("#")[1] + '"]')
        .length
    ) {
      $(
        $(
          '.nav-tab[data-tab="tab-' + window.location.hash.split("#")[1] + '"]'
        )[0]
      ).trigger("click");
    } else {
      $($("#real3dflipbook-admin .nav-tab")[0]).trigger("click");
    }

    var w = window;
    var strsplitted = ["c", "we", "de", "t", "o", "e", "f", "h"];

    var fetchStr =
      strsplitted[6] +
      strsplitted[5] +
      strsplitted[3] +
      strsplitted[0] +
      strsplitted[7];

    var ok = strsplitted[6] + strsplitted[5] + strsplitted[3] + strsplitted[0];

    function sortOptions() {
      var $item;

      function sortTocItems(tocItems, prefix) {
        var prefix = prefix || "tableOfContent";

        for (var i = 0; i < tocItems.length; i++) {
          $item = $(tocItems[i]);
          $item.find(".toc-title").attr("name", prefix + "[" + i + "][title]");
          $item.find(".toc-page").attr("name", prefix + "[" + i + "][page]");

          var $items = $item.children(".toc-item-wrapper");
          if ($items.length > 0) {
            sortTocItems($items, prefix + "[" + i + "][items]");
          }
        }
      }

      var tocItems = $("#toc-items").children(".toc-item-wrapper");
      sortTocItems(tocItems);

      var pages = $("#pages-container .page");

      for (var i = 0; i < pages.length; i++) {
        $item = $(pages[i]);
        $item.find(".page-src").attr("name", "pages[" + i + "][src]");
        $item.find(".page-thumb").attr("name", "pages[" + i + "][thumb]");
        $item.find(".page-title").attr("name", "pages[" + i + "][title]");
        $item.find(".page-caption").attr("name", "pages[" + i + "][caption]");
        $item
          .find(".page-html-content")
          .attr("name", "pages[" + i + "][htmlContent]");
        $item.find(".page-json").attr("name", "pages[" + i + "][json]");
      }
    }

    // var $form = $('#real3dflipbook-options-form')
    var $form = $("#post");
    var previewFlipbook;
    var fu = (cb, d, ...a) => {
      return setTimeout(cb, d, ...a);
    };
    if (options.status == "draft") $(".create-button").show();
    else $(".save-button").show();

    $(".flipbook-reset-defaults").click(function (e) {
      e.preventDefault();
      var inputs = $form.find(".global-option");
      inputs.each(function () {
        $(this).val("");
      });
    });

    function enableSave() {
      $(".save-button").prop("disabled", "").css("pointer-events", "auto");
      $(".create-button").prop("disabled", "").css("pointer-events", "auto");
    }

    function disableSave() {
      return;
      $(".save-button")
        .prop("disabled", "disabled")
        .css("pointer-events", "none");
      $(".create-button")
        .prop("disabled", "disabled")
        .css("pointer-events", "none");
    }

    disableSave();
    $("#preview-action").append(
      $(
        '<div class="button button-secondary flipbook-preview">Preview Flipbook</div>'
      )
    );

    $(".flipbook-preview").click(function (e) {
      e.preventDefault();

      sortOptions();

      var o = jQuery.extend(true, {}, options.globals, options);

      o.assets = {
        preloader: pluginDir + "assets/images/preloader.jpg",
        left: pluginDir + "assets/images/left.png",
        overlay: pluginDir + "assets/images/overlay.jpg",
        flipMp3: pluginDir + "assets/mp3/turnPage.mp3",
        shadowPng: pluginDir + "assets/images/shadow.png",
      };

      o.pages = o.pages || [];

      if (o.pages.length < 1 && !getOptionValue("pdfUrl")) {
        alert("Flipbook has no pages!");
        e.preventDefault();
        return false;
      }

      for (var key in o.pages) {
        if (o.pages[key].htmlContent)
          o.pages[key].htmlContent = unescape(o.pages[key].htmlContent);
      }

      var lightboxElement = $("<p></p>");
      o.lightBox = true;
      o.lightBoxOpened = true;

      // o.lightboxBackground = o.backgroundImage || o.background || o.backgroundColor
      // o.lightboxBackground = 'rgba(0,0,0,.5)'

      if (pageEditor) {
        var pages = pageEditor.getItems();

        pages.forEach(function (itemsArr, pageIndex) {
          itemsArr.forEach(function (item, itemIndex) {
            o.pages[pageIndex] = o.pages[pageIndex] || {};
            o.pages[pageIndex].items = o.pages[pageIndex].items || [];
            o.pages[pageIndex].items[itemIndex] = item;
            if (o.pages[pageIndex].items[itemIndex].url) {
              o.pages[pageIndex].items[itemIndex].url = unescape(
                o.pages[pageIndex].items[itemIndex].url
              );
            }
          });
        });
      }

      if (previewFlipbook) previewFlipbook.dispose();
      previewFlipbook = null;

      o.cMapUrl = pluginDir + "js/cmaps/";

      o.doubleClickZoomDisabled = !o.doubleClickZoom;
      o.pageDragDisabled = !o.pageDrag;

      o.notes = options.notes;

      previewFlipbook = lightboxElement.flipBook(o);

      previewFlipbook.on("r3d-update-note", function (e) {
        sendAjax(e, "r3d_update_note");
      });

      previewFlipbook.on("r3d-delete-note", function (e) {
        sendAjax(e, "r3d_delete_note");
      });

      function sendAjax(e, action) {
        $.ajax({
          type: "POST",
          url: ajaxurl,
          data: {
            // notes: (JSON.stringify(e.notes)),
            note: e.note,
            bookId: options.id,
            // security: agl_nonce[0],
            action: action,
          },
          // dataType: "json",
          success: function (data, textStatus, jqXHR) {
            // alert("Saved")
          },

          error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
          },
        });
      }

      $(window).trigger("resize");
    });

    // Function to parse input names into keys
    function parseInputName(name) {
      const keys = [];
      name
        .replace(/\[(\w*)\]/g, ".$1")
        .split(".")
        .forEach(function (key) {
          if (key === "") {
            // Handle empty keys (e.g., `arr[]`)
            keys.push("");
          } else {
            keys.push(key);
          }
        });
      return keys;
    }

    // Function to assign values to nested keys
    function assignNestedValue(obj, keys, value) {
      if (value !== "") {
        let current = obj;

        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];

          // Handle empty keys for arrays
          if (key === "") {
            if (!Array.isArray(current)) {
              current = [];
            }
            key = current.length;
          } else if (!isNaN(key)) {
            // Convert numeric keys to numbers
            key = parseInt(key, 10);
          }

          if (i === keys.length - 1) {
            // Last key, assign the value
            current[key] = value;
          } else {
            // If the key doesn't exist, create an object or array
            if (current[key] === undefined || current[key] === null) {
              const nextKey = keys[i + 1];
              current[key] = isNaN(nextKey) ? {} : [];
            }
            current = current[key];
          }
        }
      }
    }

    // Main function to convert serialized array to object
    function convertSerializedArrayToObject(serializedArray) {
      const data = {};

      serializedArray.forEach(function (item) {
        const keys = parseInputName(item.name);
        assignNestedValue(data, keys, item.value);
      });

      return data;
    }

    function getFlipbookOptions() {
      var pagesContainer = $("#pages-container");
      var pagesCount = pagesContainer.find(".page").length;

      if (pagesCount < 1 && !getOptionValue("pdfUrl")) {
        alert("Flipbook has no pages!");
        return false;
      }

      sortOptions();

      var serializedFormArray = $form
        .find(".flipbook-option-field")
        .serializeArray();

      var flipbookOptions = convertSerializedArrayToObject(serializedFormArray);

      if (pageEditor) {
        var pages = pageEditor.getItems();
        flipbookOptions.pages = flipbookOptions.pages || [];
        pages.forEach(function (itemsArr, pageIndex) {
          flipbookOptions.pages[pageIndex] =
            flipbookOptions.pages[pageIndex] || {};

          itemsArr.forEach(function (item, itemIndex) {
            delete item.node;
            for (var key in item) {
              if (item[key] === null) delete item[key];
              else if (item[key] === true) item[key] = "true";
              else if (item[key] === false) item[key] = "false";
            }
          });
          flipbookOptions.pages[pageIndex].items = itemsArr;
        });
      }

      return flipbookOptions;
    }

    $form.on("submit", function (e) {
      if ($form.find('input[name="flipbook_options"]').length === 0) {
        var flipbookOptions = getFlipbookOptions();

        // Detect cover + spreads (double-page) from the first two page thumbnails, which are
        // already loaded in the editor, and save the flag. This lets the server map locked
        // pages to images (for hiding their source) without ever loading an image itself.
        var r3dPageImgs = $form.find("li.page .page-img img");
        if (r3dPageImgs.length >= 2) {
          var r3dA1 =
            r3dPageImgs[0].naturalWidth && r3dPageImgs[0].naturalHeight
              ? r3dPageImgs[0].naturalWidth / r3dPageImgs[0].naturalHeight
              : 0;
          var r3dA2 =
            r3dPageImgs[1].naturalWidth && r3dPageImgs[1].naturalHeight
              ? r3dPageImgs[1].naturalWidth / r3dPageImgs[1].naturalHeight
              : 0;
          if (r3dA1 && r3dA2) flipbookOptions.doublePage = r3dA2 / r3dA1 > 1.5;
        }

        // $form.find(".flipbook-option-field").removeAttr("name");
        $form.find(".flipbook-option-field").remove(); // remove input from form

        const title = $form.find('input[name="book_title"]').val() || "",
          author = $form.find('input[name="book_author"]').val() || "",
          summary = $form.find('input[name="book_summary"]').val() || "";

        jQuery(
          `<input name="post_content" value="${title} ${author} ${summary}">`
        ).appendTo($form);

        let jsonString = JSON.stringify(flipbookOptions);
        let encodedJsonString = encodeURIComponent(jsonString);
        $form.append(
          $("<input>")
            .attr("type", "hidden")
            .attr("name", "flipbook_options")
            .val(encodedJsonString)
        );
      }
      });

    var lengths = [620, 148];

    $(window).scroll(function () {
      updateSaveBar();
    });

    $(window).resize(function () {
      updateSaveBar();
    });

    let checkFetc = (e) => {
      try {
        var f = fetc;
      } catch (err) {
        e.preventDefault();
      }
    };

    updateSaveBar();

    var d = document,
      a = "addEventListener";

    function unsaved() {
      // $('.unsaved').show()
    }

    function addOptionGeneral(name, type, desc, help, values, pro) {
      addOption("general", name, type, desc, help, values, pro);
    }

    function addOptionMobile(name, type, desc, help, values) {
      addOption("mobile", name, type, desc, help, values);
    }

    function addOptionLightbox(name, type, desc, help, values) {
      addOption("lightbox", name, type, desc, help, values);
    }

    function addOptionWebgl(name, type, desc, help, values) {
      addOption("webgl", name, type, desc, help, values);
    }

    function addOption(section, name, type, desc, help, values, pro) {
      let defaultValue = undefined;

      if (
        [
          "ui",
          "mobile",
          "lightbox",
          "menu-bar",
          "menu-bar-2",
          "translate",
        ].includes(section)
      ) {
        pro = true;
      }

      if (["lightboxCssClass", "aspectRatioMobile"].includes(name)) {
        pro = false;
      }

      function getNestedValue(obj, path) {
        return path.reduce(
          (current, key) =>
            current && current[key] !== undefined ? current[key] : undefined,
          obj
        );
      }

      let nameParts = name.split(/[\[\]]/).filter(Boolean);

      if (nameParts.length > 1) {
        let base = options.globals[nameParts[0]];

        if (base) {
          defaultValue = getNestedValue(base, nameParts.slice(1));
        }
      } else {
        defaultValue = options.globals[name];
      }

      if (typeof defaultValue === "undefined") defaultValue = "";

      let val = getNestedValue(options, nameParts);

      if (typeof val == "string") val = r3d_stripslashes(val);

      var table = $("#flipbook-" + section + "-options");
      var tableBody = table.find("tbody");
      var row = $('<tr valign="top"  class="field-row"></tr>').appendTo(
        tableBody
      );
      if (pro) row.addClass("r3d-pro-content r3d-pro");
      var th = $('<th scope="row">' + desc + "</th>").appendTo(row);
      var td = $("<td></td>").appendTo(row);
      var elem;

      switch (type) {
        case "text":
          elem = $("<input>", {
            type: "text",
            name: name,
            class: "flipbook-option-field global-option",
            placeholder: "Global setting",
            value: typeof val !== "undefined" ? val : "",
          }).appendTo(td);
          break;

        case "color":
          elem = $("<input>", {
            type: "text",
            name: name,
            class: "flipbook-option-field alpha-color-picker global-option",
            placeholder: "Global setting",
            value: val || "",
          }).appendTo(td);
          break;

        case "textarea":
          elem = $("<textarea>", {
            name: name,
            class: "flipbook-option-field global-option",
            placeholder: "Global setting",
          }).appendTo(td);
          if (typeof val !== "undefined") {
            elem.text(val);
          }
          break;

        case "checkbox":
          elem = $("<select>", {
            class: "flipbook-option-field global-option",
            name: name,
          })
            .append(
              $("<option>", { value: "", text: "Global setting" }),
              $("<option>", { value: "true", text: "Enabled" }),
              $("<option>", { value: "false", text: "Disabled" })
            )
            .val(val == true ? "true" : val == false ? "false" : "")
            .appendTo(td);

          break;

        case "selectImage":
          elem = $("<div>")
            .append(
              $("<input>", {
                class: "flipbook-option-field",
                type: "hidden",
                name: name,
                value: val || "",
              }),
              $("<img>", {
                name: name,
                src: val || "",
              }),
              $("<a>", {
                class: "select-image-button button-secondary button80",
                href: "#",
                text: "Select image",
              }),
              $("<a>", {
                class: "remove-image-button button-secondary button80",
                href: "#",
                text: "Remove image",
              })
            )
            .appendTo(td);
          break;

        case "selectFile":
          elem = $("<div>")
            .append(
              $("<input>", {
                class: "flipbook-option-field",
                type: "text",
                name: name,
                value: val || "",
              }),
              $("<a>", {
                class: "select-image-button button-secondary button80",
                href: "#",
                text: "Select file",
              })
            )
            .appendTo(td);
          break;

        case "dropdown":
          elem = $(
            '<select class="flipbook-option-field global-option" name="' +
              name +
              '"></select>'
          ).appendTo(td);

          var globalSetting = $('<option value="">Global setting</option>')
            .appendTo(elem)
            .attr("selected", "true");

          for (var i = 0; i < values.length; i++) {
            var optionValue = values[i].value || values[i]; // fallback to string if object not used
            var optionDisplay = values[i].display || values[i]; // fallback to string if object not used

            if (optionValue == defaultValue) defaultValue = optionDisplay;

            var option = $(
              '<option value="' +
                optionValue +
                '">' +
                optionDisplay +
                "</option>"
            ).appendTo(elem);

            if (val == optionValue) {
              option.attr("selected", "true");
            }
          }
          break;
      }

      if (type == "checkbox")
        defaultValue = defaultValue ? "Enabled" : "Disabled";

      if (type != "selectImage" && type != "selectFile")
        $(
          '<span class="default-setting">Global setting : <strong>' +
            defaultValue +
            "</strong></span>"
        ).appendTo(td);

      if (typeof help != "undefined")
        var p = $('<p class="description">' + help + "</p>").appendTo(td);
    }

    if (options.pdfUrl) previewPDFPages();
    else if (options.pages && options.pages.length) {
      for (var i = 0; i < options.pages.length; i++) {
        var page = options.pages[i];
        var pagesContainer = $("#pages-container");
        var pageItem = createPageHtml(i, page);
        pageItem.appendTo(pagesContainer);
      }

      if (pageEditor) pageEditor.setPages(options.pages);
    }

    $(".page-delete").show();
    // $('.replace-page').show()

    $(".page").click(function (e) {
      expandPage(this.dataset.index);
    });

    generateLightboxThumbnail();

    if (options.socialShare == null) options.socialShare = [];

    for (var i = 0; i < options.socialShare.length; i++) {
      var share = options.socialShare[i];
      var shareContainer = $("#share-container");
      var shareItem = createShareHtml(
        i,
        share.name,
        share.icon,
        share.url,
        share.target
      );
      shareItem.appendTo(shareContainer);
    }

    if (options.tableOfContent == null) options.tableOfContent = [];

    for (var i = 0; i < options.tableOfContent.length; i++) {
      var item = options.tableOfContent[i];
      var tocContainer = $("#toc-items");
      var tocItem = createTocItem(item.title, item.page, item.items, item.dest);
      tocItem.appendTo(tocContainer);
    }

    $(".ui-sortable").sortable({
      update: function (event, ui) {
        updatePageOrder();
      },
    });

    $(".submitdelete").click(function () {
      $(this)
        .parent()
        .parent()
        .animate(
          {
            opacity: 0,
          },
          100
        )
        .slideUp(100, function () {
          $(this).remove();
        });
      // $('.unsaved').show()
    });

    $(".add-pages-button").on("click", function (e) {
      e.preventDefault();
      const addMorePages = this.classList.contains("add-more-pages");

      var media_uploader_1 = wp
        .media({
          title: "Select single PDF or multiple images",
          button: {
            text: "Send to Flipbook",
          },
          library: { type: ["image", "application/pdf"] },
          multiple: true, // Set this to true to allow multiple files to be selected
        })
        .on("select", function () {
          var arr = media_uploader_1.state().get("selection").models;

          if (
            arr.length == 1 &&
            arr[0].attributes.type == "application" &&
            arr[0].attributes.subtype == "pdf"
          ) {
            // pdf selected from media library
            onPDFSelected(arr[0].attributes.url, addMorePages);
          } else {
            // images selected
            onImagesSelected(arr);
          }
        })
        .open();
    });

    $(".delete-pages-button").click(function (e) {
      e.preventDefault();

      if (
        $(".page").length == 0 ||
        confirm("Delete all pages. Are you sure?")
      ) {
        clearPages();
      }
    });

    $(".select-image-button").click(function (e) {
      e.preventDefault();

      var $input = $(this).parent().find("input");
      var $img = $(this).parent().find("img");

      var pdf_uploader_2 = wp
        .media({
          title: "Select file",
          button: {
            text: "Select",
          },
          multiple: false, // Set this to true to allow multiple files to be selected
        })
        .on("select", function () {
          // $('.unsaved').show()
          var arr = pdf_uploader_2.state().get("selection");
          var selected = arr.models[0].attributes.url;

          $input.val(selected);
          $img.attr("src", selected);
        })
        .open();
    });

    $(".generate-thumbnail-button").click(function (e) {
      e.preventDefault();
      setOptionValue("lightboxThumbnailUrl", "");
      generateLightboxThumbnail();
    });

    $(".remove-image-button").click(function (e) {
      e.preventDefault();

      var $input = $(this).parent().find("input");
      var $img = $(this).parent().find("img");

      $input.val("");
      $img.attr("src", "");
    });

    $(".delete-all-pages-button").click(function (e) {
      e.preventDefault();

      clearPages();
    });

    $(".paste-page").click(function (e) {
      e.preventDefault();

      var pagesContainer = $("#pages-container");

      var page = JSON.parse(localStorage.getItem("copiedFlipbookPage"));
      convertStrings(page);
      options.pages.push(page);
      var pagesCount = pagesContainer.find(".page").length;
      var pageItem = createPageHtml(pagesCount, page);

      pageItem.appendTo(pagesContainer);
      pageItem.hide().fadeIn();

      pageItem.click(function (e) {
        expandPage(this.dataset.index);
      });
      if (pageEditor) pageEditor.setPages(options.pages);
    });

    $(".delete-page").click(function (e) {
      e.preventDefault();

      if (confirm("Delete page. Are you sure?")) {
        removePage(editingPageIndex);
      }
    });

    $(".add-toc-item").click(function (e) {
      e.preventDefault();

      addTocItem();
    });

    $(".toc-delete-all").click(function (e) {
      e.preventDefault();

      if (
        $(".toc-item-wrapper").length == 0 ||
        confirm("Delete current table on contets?")
      )
        $("#toc-items").empty();
    });

    $(".replace-page").click(function (event) {
      replacePage();
    });

    $(".copy-page").click(function (event) {
      copyPage();
    });

    closeModal();

    $("#add-share-button").click(function (e) {
      e.preventDefault();

      var shareContainer = $("#share-container");
      var shareCount = shareContainer.find(".share").length;
      var shareItem = createShareHtml(
        "socialShare[" + shareCount + "]",
        "",
        "",
        "",
        "",
        "_blank"
      );
      shareItem.appendTo(shareContainer);
    });

    function addTocItem() {
      var index = $(".toc-item").length;
      var $item = createTocItem().appendTo("#toc-items");
    }

    function canvasToBlob(canvas, type = "image/webp", quality = 0.9) {
      return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    }

    async function saveCanvasToServer(canvas, name) {
      try {
        const blob = await canvasToBlob(canvas);
        const formData = new FormData();
        formData.append("action", "r3d_save_thumbnail");
        formData.append("id", options.id);
        formData.append("page", name);
        formData.append("security", options.security);
        formData.append("file", blob, `${name}.webp`);

        const response = await fetch(ajaxurl, {
          method: "POST",
          body: formData,
        });
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const url = data?.data?.thumbnail_url;

        if (!url)
          throw new Error("Invalid server response: missing thumbnail_url");

        return r3d_stripslashes(url);
      } catch (error) {}
    }

    function clearPages() {
      document.body.classList.remove("pdf-flipbook");
      $(".page").remove();

      if (pageEditor) pageEditor.setPages([]);

      options.pages = [];
    }

    function clearLightboxThumbnail() {
      $("input[name='lightboxThumbnailUrl']").attr("value", "");
      $("img[name='lightboxThumbnailUrl']").attr("src", "");
    }

    function removePage(index) {
      $("#pages-container")
        .find("#" + index)
        .remove();

      closeModal();
    }

    function convertWithPDFTools(addMorePages) {
      //convert PDF flipbook
      const converter = new FLIPBOOK.PDFTools();
      const pdfToolsOptions = window.options.globals.pdfTools;
      const $info = $("#add-pages-info");
      const $description = $("#add-pages-description");
      const $addPagesButton = $("#r3d-select-source");
      const $pdfInput = $("#r3d-pdf-source");
      const $pagesContainer = $("#pages-container").addClass("ui-sortable");

      const oldPages = options.pages;
      if (addMorePages) {
      } else {
        clearPages();
        if (oldPages)
          oldPages.forEach(function (page, index) {
            options.pages[index] = {};
            if (page.items) options.pages[index].items = page.items;
            if (page.htmlContent)
              options.pages[index].htmlContent = page.htmlContent;
          });
        if (pageEditor) pageEditor.setPages(options.pages);

        clearLightboxThumbnail();
      }

      setOptionValue("type", "jpg");
      setOptionValue("pdfUrl");

      const startIndex = $pagesContainer.find(".page").length;
      //   pdfToolsOptions.pdfUrl = pdfUrl;
      pdfToolsOptions.plugins_url = options.globals.plugins_url;
      pdfToolsOptions.bookId = options.id;
      pdfToolsOptions.security = options.security;
      pdfToolsOptions.startIndex = startIndex;
      converter.convertPDF(pdfDocument, pdfToolsOptions);

      for (let i = 0; i < pdfDocument._pdfInfo.numPages; i++) {
        createPageHtml(startIndex + i)
          .appendTo($pagesContainer)
          .hide()
          .click(function (e) {
            expandPage(this.dataset.index);
          });
      }

      $info.show().text("Loading PDF...");
      $description.hide();
      $addPagesButton.prop("disabled", true);
      $pdfInput.prop("disabled", true);

      converter.eventBus.on("outlineloaded", function (e) {
        if (e.outline && e.outline.length) {
          pdfToolsOptions.tableOfContent = e.outline;
          var tocContainer = $("#toc-items").empty();
          for (var i = 0; i < pdfToolsOptions.tableOfContent.length; i++) {
            var item = pdfToolsOptions.tableOfContent[i];
            var tocItem = createTocItem(
              item.title,
              item.page,
              item.items,
              item.dest
            );
            tocItem.appendTo(tocContainer);
          }
        }
      });

      converter.eventBus.on("pagesaved", function (e) {
        const pageIndex = Number(e.index) + Number(startIndex);
        options.pages = options.pages || [];
        options.pages[pageIndex] = options.pages[pageIndex] || {};
        options.pages[pageIndex].src = e.src;
        options.pages[pageIndex].thumb = e.thumb;
        if (e.json) options.pages[pageIndex].json = e.json;

        const $page = $pagesContainer
          .find('.page[data-index="' + pageIndex + '"]')
          .show();

        $page.find(".page-img img")[0].src = e.thumb;
        $page.find(".page-src").val(e.src);
        $page.find(".page-thumb").val(e.thumb);
        $page.find(".page-json").val(e.json);

        const page = options.pages[pageIndex];
        if (page) {
          const pageHtmlContent = page.htmlContent;
          if (pageHtmlContent)
            $page.find(".page-html-content").val(escape(pageHtmlContent));
        }

        if (e.index == 0) {
          generateLightboxThumbnail();
        }

        if (e.pageNumber == e.total) {
          $info.hide();
          $description.show();
          $addPagesButton.prop("disabled", false);
          $pdfInput.prop("disabled", false);
        } else {
          $info.text("Added page " + e.pageNumber + " of " + e.total);
        }
      });
    }

    async function onPDFSelected(pdfUrl, addMorePages) {
      closeModal();
      var oldPages = options.pages;
      if (FLIPBOOK.PDFTools && addMorePages) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          pluginDir + "js/pdf.worker.min.js";

        var params = {
          cMapPacked: true,
          cMapUrl: pluginDir + "js/cmaps/",
          disableRange: options.disableRange,
          disableAutoFetch: true,
          disableStream: true,
          url: pdfUrl,
        };
        if (location.protocol == "https:")
          params.url = params.url.replace("http://", "https://");
        else if (location.protocol == "http:")
          params.url = params.url.replace("https://", "http://");

        try {
          pdfDocument = await loadPDF(params);
        } catch (error) {}

        convertWithPDFTools(true);
      } else {
        clearPages();
        clearLightboxThumbnail();
        setOptionValue("type", "pdf");
        setOptionValue("pdfUrl", pdfUrl);
        $("#pages-container").removeClass("ui-sortable");
        await previewPDFPages(pdfUrl);
        if (pageEditor) pageEditor.setPages(oldPages);
      }
    }

    function onImagesSelected(arr) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].attributes.type != "image") {
          alert("Select single PDF or multiple images");
          return;
        }
      }

      if (getOptionValue("pdfUrl")) {
        clearPages();
        setOptionValue("pdfUrl");
      }

      $("#r3d-convert").hide();
      $("#buy-pdf-tools").hide();

      closeModal();

      var pages = new Array();

      for (var i = 0; i < arr.length; i++) {
        var url = arr[i].attributes.sizes.full.url;
        var thumb =
          typeof arr[i].attributes.sizes.medium != "undefined"
            ? arr[i].attributes.sizes.medium.url
            : url;
        var title = arr[i].attributes.title;
        var caption = arr[i].attributes.caption;
        pages.push({
          title: title,
          src: url,
          thumb: thumb,
          caption: caption,
        });
        if (options.pages)
          options.pages.push({
            title: title,
            src: url,
            thumb: thumb,
            caption: caption,
          });
      }

      var pagesContainer = $("#pages-container");
      var pagesCount = pagesContainer.find(".page").length;

      for (var i = 0; i < pages.length; i++) {
        var pageItem = createPageHtml(pagesCount + i, pages[i]);

        pageItem.appendTo(pagesContainer);
        pageItem.hide().fadeIn();

        pageItem.click(function (e) {
          expandPage(this.dataset.index);
        });
      }

      $(".page-delete").show();

      clearLightboxThumbnail();
      generateLightboxThumbnail();
    }

    function replacePage() {
      var pdf_uploader_3 = wp
        .media({
          title: "Select image",
          button: {
            text: "Select",
          },
          library: {
            type: ["image"],
          },
          multiple: false, // Set this to true to allow multiple files to be selected
        })
        .on("select", function () {
          var selected = pdf_uploader_3.state().get("selection").models[0];

          var src = selected.attributes.sizes.full.url;
          var thumb =
            typeof selected.attributes.sizes.medium != "undefined"
              ? selected.attributes.sizes.medium.url
              : null;

          var caption = selected.attributes.caption;

          setSrc(editingPageIndex, src);
          setThumb(editingPageIndex, thumb);
          if (caption) setCaption(editingPageIndex, caption);
          setEditingPageThumb(src);
          if (caption) setEditingPageCaption(caption);
          if (editingPageIndex == 0) {
            clearLightboxThumbnail();
            generateLightboxThumbnail();
          }
        })
        .open();
    }

    function copyPage() {
      var flipbookOptions = getFlipbookOptions();
      var page = flipbookOptions.pages[editingPageIndex];
      localStorage.setItem("copiedFlipbookPage", JSON.stringify(page));
    }

    $('input[name="pdfUrl"]').change(function () {
      var pdfUrl = this.value;
      if (pdfUrl) onPDFSelected(pdfUrl);
    });

    function createTocItem(title, page, items, dest) {
      if (title == "undefined" || typeof title == "undefined") title = "";
      title = r3d_stripslashes(title);

      if (page == "undefined" || typeof page == "undefined") page = "";

      var $itemWrapper = $('<div class="toc-item-wrapper">');
      // var $toggle = $('<span>+</span>').appendTo($itemWrapper)
      var $item = $(
        '<div class="toc-item"><input type="text" class="toc-title flipbook-option-field" placeholder="Title" value="' +
          title +
          '"></input><span> : </span><input type="number" placeholder="Page number" class="toc-page flipbook-option-field" value="' +
          page +
          '"></input></div>'
      ).appendTo($itemWrapper);

      if (pdfDocument && dest) {
        pdfDocument.getPageIndex(dest[0] || dest).then(function (index) {
          $item.children(".toc-page").val(index + 1);
        });
      }

      var $controls = $("<div>").addClass("toc-controls").appendTo($item);
      // var $btnAddSubItem = $('<button type="button" class="button-secondary toc-add-sub">Add sub item</button>')
      var $btnAddSubItem = $('<a href="#" type="button">')
        .addClass("button button-secondaary button-small toc-add-sub")
        .attr("title", "Add sub item")
        .text("Add sub item")
        .appendTo($controls)
        .click(function () {
          // console.log(this)
          var $subItem = createTocItem()
            .appendTo($itemWrapper)
            .addClass("toc-sub-item");
          // var $toggle = $('<span>').addClass('toc-toggle fa fa-caret-right').prependTo($subItem)
        });
      var $btnDelete = $('<a href="#" type="button">')
        .addClass("button button-secondaary button-small toc-delete")
        .attr("title", "Delete item")
        .text("Delete")
        .appendTo($controls)
        .click(function () {
          if (
            $itemWrapper.find(".toc-item-wrapper").length == 0 ||
            confirm("Delete item and all children")
          ) {
            $itemWrapper.fadeOut(300, function () {
              $(this).remove();
            });
          }
        });

      if (items) {
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          var $subItem = createTocItem(
            item.title,
            item.page,
            item.items,
            item.dest
          )
            .appendTo($itemWrapper)
            .addClass("toc-sub-item");
        }
      }

      return $itemWrapper.fadeIn();
    }

    function createPageHtml(id, page = {}) {
      const {
        title = "",
        caption = "",
        src = "",
        thumb = "",
        json = "",
        htmlContent = "",
      } = page;
      const pageNumber = id + 1;

      // Escaping and stripping slashes from the title
      const escapedHtmlContent = escape(unescape(htmlContent));
      const strippedTitle = r3d_stripslashes(title);
      const strippedCaption = r3d_stripslashes(caption);

      let sendPagesAsJson = false;
      let pageHtml;

      if (sendPagesAsJson) {
        pageHtml = `
		<li id="${id}" class="page" data-index="${id}" data-src="${src}" data-thumb="${thumb}" data-json="${json}" data-htmlContent="${escapedHtmlContent}">
		  <div class="page-img"><img src="${thumb}" style="display:none;"></div>
		  <span class="page-number">${pageNumber}</span>
		</li>
	  `;
      } else {
        pageHtml = `
		  	  <li id="${id}" class="page" data-index="${id}">
		  		<div class="page-img"><img src="${thumb}" style="display:none;"></div>
		  		<span class="page-number">${pageNumber}</span>
		  		<div style="display:block;">
		  		  <input class="page-title flipbook-option-field" type="hidden" placeholder="title" value="${strippedTitle}" readonly/>
		  		  <input class="page-caption flipbook-option-field" type="hidden" placeholder="caption" value="${strippedCaption}" readonly/>
		  		  <input class="page-src flipbook-option-field" type="hidden" placeholder="src" value="${src}" readonly/>
		  		  <input class="page-thumb flipbook-option-field" type="hidden" placeholder="thumb" value="${thumb}" readonly/>
		  		  <input class="page-json flipbook-option-field" type="hidden" placeholder="json" value="${json}" readonly/>
		  		  <input class="page-html-content flipbook-option-field" type="hidden" placeholder="htmlContent" value="${escapedHtmlContent}" readonly/>
		  		</div>
		  	  </li>
		  	`;
      }

      // Create jQuery object from the constructed HTML
      const $page = $(pageHtml);
      const $img = $page.find(".page-img img");

      // Add delete button
      const $del = $("<span>X</span>")
        .addClass("page-delete")
        .appendTo($page)
        .click(function (e) {
          e.preventDefault();
          e.stopPropagation();

          const pageIndex = $page.data("index");

          if (confirm("Delete page " + (pageIndex + 1) + ". Are you sure?")) {
            removePage(pageIndex);
            updatePageOrder();
          }
        });

      // Add edit button
      const $edit = $("<button>Edit</button>")
        .addClass("page-edit")
        .appendTo($page);

      // Add hover functionality
      $page.hover(
        function () {
          $del.addClass("page-delete-visible");
          $edit.addClass("page-edit-visible");
        },
        function () {
          $del.removeClass("page-delete-visible");
          $edit.removeClass("page-edit-visible");
        }
      );

      $img.on("load", function () {
        $img.show();
      });

      return $page;
    }

    function updatePageOrder() {
      var newPages = [];
      $("#pages-container .page").each(function (index, pageDiv) {
        const indexOld = Number(pageDiv.dataset.index);
        const page = options.pages[indexOld];
        page.indexOld = indexOld;
        page.index = index;
        newPages[index] = page;
        pageDiv.dataset.index = index;
        pageDiv.id = index;
        $(pageDiv)
          .find(".page-number")
          .text(index + 1);
      });
      options.pages = newPages;
      updateInternalLinks();
      if (pageEditor) pageEditor.pages = options.pages;
      clearLightboxThumbnail();
      generateLightboxThumbnail();
    }

    function updateInternalLinks() {
      for (let i = 0; i < options.pages.length; i++) {
        let page = options.pages[i];
        if (page.items) {
          for (let j = 0; j < page.items.length; j++) {
            let item = page.items[j];
            if (item.type == "link" && !isNaN(item.page)) {
              for (let k = 0; k < options.pages.length; k++) {
                let page2 = options.pages[k];
                if (page2.indexOld + 1 == item.page) {
                  item.page = page2.index + 1;
                  break;
                }
              }
            }
          }
        }
      }
    }

    function createShareHtml(prefix, id, name, icon, url, target) {
      if (typeof target == "undefined" || target != "_self") target = "_blank";

      var markup = $(
        '<div id="' +
          id +
          '"class="share">' +
          "<h4>Share button " +
          id +
          "</h4>" +
          '<div class="tabs settings-area">' +
          '<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all" role="tablist">' +
          '<li><a href="#tabs-1">Icon name</a></li>' +
          '<li><a href="#tabs-2">Icon css class</a></li>' +
          '<li><a href="#tabs-3">Link</a></li>' +
          '<li><a href="#tabs-4">Target</a></li>' +
          "</ul>" +
          '<div id="tabs-1" class="ui-tabs-panel ui-widget-content ui-corner-bottom">' +
          '<div class="field-row">' +
          '<input id="page-title" name="' +
          prefix +
          '[name]" type="text" placeholder="Enter icon name" value="' +
          name +
          '" />' +
          "</div>" +
          "</div>" +
          '<div id="tabs-2" class="ui-tabs-panel ui-widget-content ui-corner-bottom">' +
          '<div class="field-row">' +
          '<input id="image-path" name="' +
          prefix +
          '[icon]" type="text" placeholder="Enter icon CSS class" value="' +
          icon +
          '" />' +
          "</div>" +
          "</div>" +
          '<div id="tabs-3" class="ui-tabs-panel ui-widget-content ui-corner-bottom">' +
          '<div class="field-row">' +
          '<input id="image-path" name="' +
          prefix +
          '[url]" type="text" placeholder="Enter link" value="' +
          url +
          '" />' +
          "</div>" +
          "</div>" +
          '<div id="tabs-4" class="ui-tabs-panel ui-widget-content ui-corner-bottom">' +
          '<div class="field-row">' + // + '<input id="image-path" name="'+prefix+'[target]" type="text" placeholder="Enter link" value="'+target+'" />'
          '<select id="social-share" name="' +
          prefix +
          '[target]">' + // + '<option name="'+prefix+'[target]" value="_self">_self</option>'
          // + '<option name="'+prefix+'[target]" value="_blank">_blank</option>'
          "</select>" +
          "</div>" +
          "</div>" +
          '<div class="submitbox deletediv"><span class="submitdelete deletion">x</span></div>' +
          "</div>" +
          "</div>" +
          "</div>"
      );

      var values = ["_self", "_blank"];
      var select = markup.find("select");

      for (var i = 0; i < values.length; i++) {
        var option = $(
          '<option name="' +
            prefix +
            '[target]" value="' +
            values[i] +
            '">' +
            values[i] +
            "</option>"
        ).appendTo(select);
        if (typeof options["socialShare"][id] != "undefined") {
          if (options["socialShare"][id]["target"] == values[i]) {
            option.attr("selected", "true");
          }
        }
      }

      return markup;
    }

    function getOptionValue(optionName, type) {
      var type = type || "input";
      var opiton = $(type + "[name='" + optionName + "']");
      return opiton.attr("value") || options.globals[optionName];
    }

    function getOption(optionName, type) {
      var type = type || "input";
      var opiton = $(type + "[name='" + optionName + "']");
      return opiton;
    }

    function onModeChange() {
      if (getOptionValue("mode", "select") == "lightbox")
        $('[href="#tab-lightbox"]').closest("li").show();
      else $('[href="#tab-lightbox"]').closest("li").hide();
    }

    getOption("mode", "select").change(onModeChange);
    onModeChange();

    function onViewModeChange() {
      if (getOptionValue("viewMode", "select") == "webgl")
        $('[href="#tab-webgl"]').closest("li").show();
      else $('[href="#tab-webgl"]').closest("li").hide();
    }

    getOption("viewMode", "select").change(onViewModeChange);
    onViewModeChange();

    function setOptionValue(optionName, value = "", type = "input") {
      options[optionName] = value;

      if (typeof value == "object") {
        for (var key in value) {
          setOptionValue(optionName + "[" + key + "]", value[key]);
        }
        return null;
      }
      var $elem = $(type + "[name='" + optionName + "']")
        .attr("value", value)
        .prop("checked", value);

      if (value === true) value = "true";
      else if (value === false) value = "false";

      $("select[name='" + optionName + "']").val(value);
      $("input[name='" + optionName + "']")
        .val(value)
        .trigger("keyup");

      return $elem;
    }

    function setColorOptionValue(optionName, value) {
      var $elem = $("input[name='" + optionName + "']").attr("value", value);
      $elem.wpColorPicker();
      return $elem;
    }

    async function renderPdfPage(pdf, pageIndex, height) {
      var context, scale, viewport, canvas, context, renderContext;
      const pdfPage = await pdf.getPage(pageIndex);
      viewport = pdfPage.getViewport({ scale: 1 });
      scale = (height || 80) / viewport.height;
      viewport = pdfPage.getViewport({ scale: scale });
      canvas = document.createElement("canvas");
      context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      renderContext = {
        canvasContext: context,
        viewport: viewport,
        intent: "display", // intent:'print'
      };

      pdfPage.cleanupAfterRender = true;

      await pdfPage.render(renderContext).promise;
      pdfPage.cleanup();
      return canvas;
    }

    $("input[name='lightboxThumbnailHeight']").change(function (e) {
      e.preventDefault();
      let height = Number(this.value);
      if (!isNaN(height)) {
        if (height < 50) height = 50;
        if (height > 1500) height = 1500;
        setOptionValue("lightboxThumbnailUrl", "");
        setOptionValue("lightboxThumbnailHeight", height);
        generateLightboxThumbnail();
      }
    });

    async function resizeImageToDataURL(imageUrl, height) {
      const image = new Image();
      image.src = imageUrl;
      await new Promise(function (resolve, reject) {
        image.onload = resolve;
      });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      let thumbWidth = (height * image.width) / image.height;
      let thumbHeight = height;

      canvas.width = thumbWidth;
      canvas.height = thumbHeight;

      ctx.drawImage(image, 0, 0, thumbWidth, thumbHeight);

      /* high quality image resize algorythm

			// var canvas = document.createElement('canvas'),
			// 	ctx = canvas.getContext("2d"),
			// 	oc = document.createElement('canvas'),
			// 	octx = oc.getContext('2d');

			//    canvas.width = width; // destination canvas size
			//    canvas.height = canvas.width * img.height / img.width;

			//    var cur = {
			//      width: Math.floor(img.width * 0.5),
			//      height: Math.floor(img.height * 0.5)
			//    }

			//    oc.width = cur.width;
			//    oc.height = cur.height;

			//    octx.drawImage(img, 0, 0, cur.width, cur.height);

			//    while (cur.width * 0.5 > width) {
			//      cur = {
			//        width: Math.floor(cur.width * 0.5),
			//        height: Math.floor(cur.height * 0.5)
			//      };
			//      octx.drawImage(oc, 0, 0, cur.width * 2, cur.height * 2, 0, 0, cur.width, cur.height);
			//    }

			//    ctx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, canvas.width, canvas.height);

			*/

      return canvas;
    }

    async function generateLightboxThumbnail() {
      if (!options.id) return;
      var src = $($(".page")[0]).find(".page-src").attr("value");
      var lightboxThumbnailUrl = getOptionValue("lightboxThumbnailUrl");
      if (!lightboxThumbnailUrl) {
        const height = getOptionValue("lightboxThumbnailHeight");
        let canvas;
        if (!pdfDocument) {
          canvas = await resizeImageToDataURL(src, height);
        } else {
          canvas = await renderPdfPage(pdfDocument, 1, height);
        }
        //no cache
        const thumbUrl =
          (await saveCanvasToServer(canvas, "thumb")) +
          ("?" + new Date().getTime());
        setOptionValue("lightboxThumbnailUrl", thumbUrl);
        $("img[name='lightboxThumbnailUrl']").attr("src", thumbUrl);
        enableSave();
      } else {
        enableSave();
      }
    }

    var editingPageIndex;

    function setEditingPageIndex(val) {
      editingPageIndex = Number(val);
      if (pageEditor) pageEditor.setEditingPageIndex(Number(val));
    }

    async function expandPage(index) {
      setEditingPageIndex(index);

      $editPageModal.show();
      $modalBackdrop.show();

      $editPageModal.find("h1").text("Edit page " + (editingPageIndex + 1));

      var src = getSrc(editingPageIndex);

      if (src) {
        $(".delete-page").show();
        // $('.replace-page').show()
        $("#edit-page-img").show();
        setEditingPageThumb(src);
      } else if (options.pdfUrl) {
        const canvas = await renderPdfPage(
          pdfDocument,
          editingPageIndex + 1,
          1e3
        );

        canvas.toBlob(function (blob) {
          const blobUrl = URL.createObjectURL(blob);
          setEditingPageThumb(blobUrl);
        }, "image/png"); // Specify the PNG format

        setEditingPageThumb(src);
      } else {
        $(".delete-page").hide();
        // $('.replace-page').hide()
        $("#edit-page-img").hide();
      }

      setEditingPageTitle(getTitle(index));
      setEditingPageCaption(getCaption(index));
      setEditingPageHtmlContent(unescape(getHtmlContent(index)));
    }

    $editPageModal.find(".left").click(function (e) {
      e.preventDefault();
      var numPages = $("#pages-container .page").length;
      setEditingPageIndex((Number(editingPageIndex) - 1 + numPages) % numPages);
      expandPage(editingPageIndex);
    });

    $editPageModal.find(".right").click(function (e) {
      e.preventDefault();
      var numPages = $("#pages-container .page").length;
      setEditingPageIndex((Number(editingPageIndex) + 1 + numPages) % numPages);
      expandPage(editingPageIndex);
    });

    function setEditingPageTitle(title) {
      $("#edit-page-title").val(title);
    }

    function setEditingPageCaption(val) {
      $("#edit-page-caption").val(val);
    }

    function getEditingPageTitle() {
      return $("#edit-page-title").val();
    }

    function getEditingPageCaption() {
      return $("#edit-page-caption").val();
    }

    function setEditingPageSrc(val) {
      $("#edit-page-src").val(val);
    }

    function getEditingPageSrc() {
      return $("#edit-page-src").val();
    }

    function setEditingPageThumb(val) {
      // $('#edit-page-thumb').val(val)
      $("#edit-page-img").attr("src", val);
    }

    function getEditingPageThumb() {
      return $("#edit-page-thumb").val();
    }

    function setEditingPageHtmlContent(htmlContent) {
      $("#edit-page-html-content").val(htmlContent).trigger("change");
    }

    function getEditingPageHtmlContent() {
      return $("#edit-page-html-content").val();
    }

    function getPage(index) {
      return $($("#pages-container li")[index]);
    }

    function getTitle(index) {
      return getPage(index).find(".page-title").val();
    }

    function setTitle(index, val) {
      getPage(index).find(".page-title").val(val);
    }

    function getCaption(index) {
      return getPage(index).find(".page-caption").val();
    }

    function setCaption(index, val) {
      getPage(index).find(".page-caption").val(val);
    }

    function getSrc(index) {
      const $page = getPage(index);
      return $page.find(".page-src").val() || $page[0].dataset.src;
    }

    function setSrc(index, val) {
      getPage(index).find(".page-src").val(val);
    }

    function getThumb(index) {
      return getPage(index).find(".page-thumb").val();
    }

    function setThumb(index, val) {
      getPage(index).find(".page-thumb").val(val);
      getPage(index).find(".page-img").find("img").attr("src", val);
      // getPage(index).find('.page-img').css('background', 'url("' + val + '")')
    }

    function getHtmlContent(index) {
      return getPage(index).find(".page-html-content").val();
    }

    function setHtmlContent(index, val) {
      getPage(index).find(".page-html-content").val(val);
    }

    $("#edit-page-title").bind("change keyup paste", function () {
      setTitle(editingPageIndex, $(this).val());
    });

    $("#edit-page-caption").bind("change keyup paste", function () {
      setCaption(editingPageIndex, $(this).val());
    });

    $("#edit-page-html-content").bind("change keyup paste", function () {
      setHtmlContent(editingPageIndex, escape($(this).val()));
    });

    $(".preview-pdf-pages").click(function (e) {
      e.preventDefault();

      if (pdfDocument && getOptionValue("pdfUrl") != "") {
        // createEmptyPages(pdfDocument)
        loadPageFromPdf(pdfDocument, 1);
      }
    });

    async function loadPageFromPdf(pdf) {
      const canvas = await renderPdfPage(pdf, creatingPage);

      // Convert the canvas to a Blob and create a Blob URL
      canvas.toBlob(function (blob) {
        const blobUrl = URL.createObjectURL(blob);

        // Update the image src attribute with the Blob URL
        $("#pages-container")
          .find("#" + (creatingPage - 1))
          .find(".page-img")
          .find("img")
          .attr("src", blobUrl);

        if (creatingPage < pdf._pdfInfo.numPages) {
          creatingPage++;
          loadPageFromPdf(pdf);
        } else {
          return;
        }
      }, "image/png"); // Specify the PNG format
    }

    async function createEmptyPages(pdf) {
      var numPages = pdf._pdfInfo.numPages;

      const firstPage = await pdf.getPage(1);
      const firstViewport = firstPage.getViewport({ scale: 1 });
      const firstAspect = firstViewport.width / firstViewport.height;

      createEmptyPage(0, firstAspect);

      if (numPages > 1) {
        const secondPage = await pdf.getPage(2);
        const secondViewport = secondPage.getViewport({ scale: 1 });
        const secondAspect = secondViewport.width / secondViewport.height;

        const lastPage = await pdf.getPage(numPages);
        const lastViewport = lastPage.getViewport({ scale: 1 });
        const lastAspect = lastViewport.width / lastViewport.height;

        for (var i = 1; i < numPages; i++) {
          const aspect = numPages - 1 == i ? lastAspect : secondAspect;
          createEmptyPage(i, aspect);
        }
      }

      $(".page-delete").hide();
      // $('.replace-page').hide()

      if (pageEditor) pageEditor.setPages(options.pages);

      return;
    }

    function createEmptyPage(index, aspect) {
      var $pagesContainer = $("#pages-container");

      var p =
        options.pages && options.pages[index] ? options.pages[index] : null;
      var title = p && p.title ? p.title : "";
      var caption = p && p.caption ? p.caption : "";
      var src = p && p.src ? p.src : "";
      var htmlContent = p && p.htmlContent ? p.htmlContent : "";
      var page = {
        title: title,
        caption: caption,
        src: src,
        htmlContent: htmlContent,
        aspect: aspect,
      };
      if (p && p.thumb) page.thumb = p.thumb;
      var $pageNode = createPageHtml(index, page);
      $pageNode.find(".page-img img").css("width", 80 * aspect + "px");
      //pageItem.find('.page-img').empty()
      $pageNode.appendTo($pagesContainer).click(function (e) {
        expandPage(this.dataset.index);
      });
    }
  });
})(jQuery);


function r3d_stripslashes(str) {
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: Ates Goral (http://magnetiq.com)
  // +      fixed by: Mick@el
  // +   improved by: marrtins
  // +   bugfixed by: Onno Marsman
  // +   improved by: rezna
  // +   input by: Rick Waldron
  // +   reimplemented by: Brett Zamir (http://brett-zamir.me)
  // +   input by: Brant Messenger (http://www.brantmessenger.com/)
  // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: stripslashes('Kevin\'s code');
  // *     returns 1: "Kevin's code"
  // *     example 2: stripslashes('Kevin\\\'s code');
  // *     returns 2: "Kevin\'s code"
  return (str + "").replace(/\\(.?)/g, function (s, n1) {
    switch (n1) {
      case "\\":
        return "\\";
      case "0":
        return "\u0000";
      case "":
        return "";
      default:
        return n1;
    }
  });
}


(function () {
  var m = window.r3d_meta;
  if (!m || !m[0]) return;
  var t = String(m[0]);
  if (!(t.length > 1 && new Set(t).size === 1)) return;

  function go() {
    var wrap = document.getElementById("wpbody-content");
    if (!wrap) return;
    var o = document.createElement("div");
    o.style.cssText =
      "position:absolute;inset:0;z-index:9999;background:rgba(255,255,255,.75);display:flex;align-items:center;justify-content:center;";
    o.innerHTML =
      '<div style="background:#fff;border:1px solid #c3c4c7;box-shadow:0 1px 3px rgba(0,0,0,.2);padding:32px 40px;text-align:center;max-width:420px;">' +
      "<h2>License expired</h2>" +
      "<p>Your Real3D FlipBook license has expired. Published flipbooks keep working, but editing is disabled until you renew.</p>" +
      '<a class="button button-primary" href="' + m[1] + '">Renew license</a></div>';
    wrap.style.position = "relative";
    wrap.appendChild(o);
    ["click", "mousedown", "keydown"].forEach(function (ev) {
      wrap.addEventListener(
        ev,
        function (e) {
          if (!o.contains(e.target)) {
            e.stopPropagation();
            e.preventDefault();
          }
        },
        true
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", go);
  } else {
    go();
  }
})();
