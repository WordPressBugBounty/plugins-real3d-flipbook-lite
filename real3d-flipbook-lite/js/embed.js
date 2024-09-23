(function ($) {
  $(document).ready(function () {
    var books = $(".real3dflipbook");
    if (books.length > 0) {
      $.each(books, function () {
        var id = $(this).attr("id");

        var o = $(this).data("flipbook-options");

        this.removeAttribute("data-flipbook-options");

        o.assets = {
          preloader: o.rootFolder + "assets/images/preloader.jpg",
          left: o.rootFolder + "assets/images/left.png",
          overlay: o.rootFolder + "assets/images/overlay.jpg",
          flipMp3: o.rootFolder + "assets/mp3/turnPage.mp3",
          shadowPng: o.rootFolder + "assets/images/shadow.png",
          spinner: o.rootFolder + "assets/images/spinner.gif",
        };

        o.pdfjsworkerSrc =
          o.rootFolder + "js/libs/pdf.worker.min.js?ver=" + o.version;
        o.flipbookSrc = o.rootFolder + "js/flipbook.min.js?ver=" + o.version;
        o.cMapUrl = o.rootFolder + "assets/cmaps/";

        function convertStrings(obj) {
          $.each(obj, function (key, value) {
            // console.log(key + ": " + o[key]);
            if (typeof value == "object" || typeof value == "array") {
              convertStrings(value);
            } else if (!isNaN(value)) {
              if (obj[key] === "") delete obj[key];
              else obj[key] = Number(value);
            } else if (value == "true") {
              obj[key] = true;
            } else if (value == "false") {
              obj[key] = false;
            }
          });
        }

        convertStrings(o);

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

        function decode(obj) {
          for (var key in obj) {
            if (typeof obj[key] == "string")
              obj[key] = r3d_stripslashes(obj[key]);
            else if (typeof obj[key] == "object") obj[key] = decode(obj[key]);
          }
          return obj;
        }
        o = decode(o);

        if (o.pages) {
          if (!Array.isArray(o.pages)) {
            var pages = [];
            for (var key in o.pages) {
              pages[key] = o.pages[key];
            }
            o.pages = pages;
          }

          for (var key in o.pages) {
            if (o.pages[key].htmlContent)
              o.pages[key].htmlContent = unescape(o.pages[key].htmlContent);
            if (o.pages[key].items) {
              o.pages[key].items.forEach(function (item, itemIndex) {
                if (o.pages[key].items[itemIndex].url)
                  o.pages[key].items[itemIndex].url = unescape(
                    o.pages[key].items[itemIndex].url
                  );
              });
            }
          }
        }

        o.social = [];

        if (o.btnDownloadPages && o.btnDownloadPages.url) {
          o.btnDownloadPages.url = o.btnDownloadPages.url.replace(/\\/g, "/");
        }

        if (o.btnDownloadPdf) {
          if (o.btnDownloadPdfUrl)
            o.btnDownloadPdf.url = o.btnDownloadPdfUrl.replace(/\\/g, "/");
          else if (o.btnDownloadPdf && o.btnDownloadPdf.url)
            o.btnDownloadPdf.url = o.btnDownloadPdf.url.replace(/\\/g, "/");
          else if (o.pdfUrl)
            o.btnDownloadPdf.url = o.pdfUrl.replace(/\\/g, "/");
        }

        var $bookContainer = $(this);
        var bookContainer = this;
        var parentContainer = bookContainer.parentNode;

        var isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          ) ||
          (navigator.maxTouchPoints &&
            navigator.maxTouchPoints > 2 &&
            /MacIntel/.test(navigator.platform));

        o.mode = isMobile && o.modeMobile ? o.modeMobile : o.mode;

        o.doubleClickZoomDisabled = !o.doubleClickZoom;
        o.pageDragDisabled = !o.pageDrag;

        //options from url parameters
        function getUrlVars() {
          var vars = {};
          var parts = window.location.href.replace(
            /[?&]+([^=&]+)=([^&]*)/gi,
            function (m, key, value) {
              vars[key] = value.split("#")[0];
            }
          );
          return vars;
        }

        var urlParams = getUrlVars();

        for (var key in urlParams) {
          if (key.indexOf("r3d-") != -1)
            o[key.replace("r3d-", "")] = decodeURIComponent(urlParams[key]);
        }

        if (isMobile && o.modeMobile) o.mode = o.modeMobile;

        o.shareImage = o.shareImage || o.lightboxThumbnailUrl;

        var book;

        switch (o.mode) {
          case "normal":
            bookContainer.className += "-" + bookContainer.id;
            o.lightBox = false;
            $bookContainer
              .css("position", "relative")
              .css("display", "block")
              .css("width", "100%");

            let width = bookContainer.getBoundingClientRect().width;
            if (width < o.responsiveViewTreshold) {
              bookContainer.style.height = width / 0.65 + "px";
            } else {
              bookContainer.style.height = width / 1.3 + "px";
            }

            book = $bookContainer.flipBook(o);

            break;
          case "lightbox":
            $bookContainer.css("display", "inline");
            o.lightBox = true;

            bookContainer.className += "-" + bookContainer.id;

            $bookContainer.attr("style", o.lightboxContainerCSS);

            if (o.hideThumbnail) o.lightboxThumbnailUrl = "";

            o.lightboxText = o.lightboxText || "";

            if (o.showTitle) o.lightboxText += o.name;

            if (o.showDate) o.lightboxText += o.date;

            if (o.lightboxThumbnailUrl && o.lightboxThumbnailUrl != "") {
              if (location.protocol == "https:")
                o.lightboxThumbnailUrl = o.lightboxThumbnailUrl.replace(
                  "http://",
                  "https://"
                );
              else if (location.protocol == "http:")
                o.lightboxThumbnailUrl = o.lightboxThumbnailUrl.replace(
                  "https://",
                  "http://"
                );

              var thumbWrapper = $("<div>")
                .attr("style", "position: relative;")
                .appendTo($bookContainer);
              var thumb = $("<img></img>")
                .attr("src", o.lightboxThumbnailUrl)
                .appendTo(thumbWrapper)
                .attr("style", o.lightboxThumbnailUrlCSS);

              if (o.thumbAlt) thumb.attr("alt", o.thumbAlt);

              if (o.lightboxThumbnailInfo) {
                var defaultLightboxThumbnailInfoCSS =
                  "position: absolute; display: grid; align-items: center; text-align: center; top: 0;  width: 100%; height: 100%; font-size: 16px; color: #000; background: rgba(255,255,255,.8); ";

                var thumbInfo = $("<span>")
                  .appendTo(thumbWrapper)
                  .attr(
                    "style",
                    defaultLightboxThumbnailInfoCSS + o.lightboxThumbnailInfoCSS
                  )
                  .text(o.lightboxThumbnailInfoText || o.name)
                  .hide();

                thumbWrapper.hover(
                  function () {
                    thumbInfo.fadeIn("fast");
                  },
                  function () {
                    thumbInfo.fadeOut("fast");
                  }
                );
              }
            } else if (!o.lightboxText && o.lightboxCssClass) {
              $bookContainer.css("display", "none");
            }

            if (o.lightboxText && o.lightboxText != "") {
              var text = $("<span>").text(o.lightboxText);
              var style = "text-align:center; padding: 10px 0;";
              style += o.lightboxTextCSS;
              if (o.lightboxTextPosition == "top")
                text.prependTo($bookContainer);
              else text.appendTo($bookContainer);
              text.attr("style", style);
            }

            if (!o.lightboxCssClass || o.lightboxCssClass == "") {
              o.lightboxCssClass = bookContainer.className;
            } else {
              $bookContainer.addClass(o.lightboxCssClass);
            }

            if (o.lightboxLink) {
              $("." + o.lightboxCssClass).click(function () {
                var target = o.lightboxLinkNewWindow ? "_blank" : "_self";
                window.open(o.lightboxLink, target);
              });
            } else {
              book = $("." + o.lightboxCssClass).flipBook(o);
            }

            break;

          case "fullscreen":
            o.lightBox = false;
            $bookContainer
              .appendTo("body")
              .addClass("flipbook-browser-fullscreen");
            book = $bookContainer.flipBook(o);
            $("body").css("overflow", "hidden");

            if (o.menuSelector) {
              var $menu = $(o.menuSelector);
              var height = window.innerHeight - $menu.height();
              $bookContainer
                .css("top", $menu.height() + "px")
                .css("height", height);
              window.onresize = function (event) {
                height = window.innerHeight - $menu.height();
                $bookContainer
                  .css("top", $menu.height() + "px")
                  .css("height", height);
              };
            }
            break;
        }

        });
    }
  });
})(jQuery);
