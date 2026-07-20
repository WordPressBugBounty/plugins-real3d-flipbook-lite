"use strict";
(function ($) {
  $(document).ready(function () {
    $("#real3dflipbook-admin").show();

    $(".creating-page").hide();

    
    $(document).on("click", ".r3d-pro-content", function (e) {
      e.preventDefault();

      Swal.fire({
        width: 420,
        html:
          '<div style="text-align:center;">' +
          '<span style="display:inline-block;background:linear-gradient(180deg,#f8ce47,#edaf1e);color:#59430a;font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 14px;border-radius:999px;box-shadow:0 1px 2px rgba(0,0,0,0.18);text-shadow:0 1px 0 rgba(255,255,255,0.35);">PRO</span>' +
          '<h2 style="margin:12px 0 4px;font-size:20px;font-weight:600;color:#1d2327;">This is a PRO feature</h2>' +
          '<p style="margin:0 0 16px;color:#50575e;font-size:13px;">Upgrade to Real3D Flipbook PRO to unlock:</p>' +
          '<ul style="list-style:none;display:inline-block;text-align:left;margin:0 0 16px;padding:0;color:#1d2327;font-size:13.5px;line-height:2.1;">' +
          '<li><span style="color:#84af05;font-weight:700;margin-right:7px;">&#10003;</span>High resolution pages with deep zoom</li>' +
          '<li><span style="color:#84af05;font-weight:700;margin-right:7px;">&#10003;</span>PDF links and text search</li>' +
          '<li><span style="color:#84af05;font-weight:700;margin-right:7px;">&#10003;</span>Toolbar and UI customization</li>' +
          '<li><span style="color:#84af05;font-weight:700;margin-right:7px;">&#10003;</span>Google Analytics events</li>' +
          '<li><span style="color:#84af05;font-weight:700;margin-right:7px;">&#10003;</span>Mobile and global settings</li>' +
          '</ul>' +
          '<div style="background:#f6f7f7;border-radius:8px;padding:9px 12px;margin:0 0 10px;font-size:12px;color:#50575e;">Plans from $49/year &middot; 30-day money-back guarantee</div>' +
          '<a style="font-size:12px;color:#2271b1;" href="https://real3dflipbook.com/?ref=wp-lite-popup" target="_blank">See live demos</a>' +
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
    

    postboxes.save_state = function () {
      return;
    };
    postboxes.save_order = function () {
      return;
    };

    if (postboxes.handle_click && !postboxes.handle_click.guid)
      postboxes.add_postbox_toggles();

    //removeIf(!lite)
    function convertStrings(obj) {
      jQuery.each(obj, function (key, value) {
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
    //endRemoveIf(!lite)
    var convertStrings = convertStrings || c.s;
    convertStrings(options);

    const allOptions = {
      overrides: [
        [
          "convertPDFLinks",
          "checkbox",
          `Convert PDF links <code>a href='...pdf'</code>`,
          "Open all links to PDF files in Real3D lightbox flipbook instead of opening PDF in new tab",
        ],
        [
          "convertPDFLinksWithClass",
          "text",
          `Convert only PDF link with CSS class`,
          "Convert only PDF links that have following CSS class",
        ],
        [
          "convertPDFLinksWithoutClass",
          "text",
          `Convert only PDF link without CSS class`,
          "Convert only PDF links that don't have following CSS class",
        ],
        [
          "overridePDFEmbedder",
          "checkbox",
          "PDF Embedder",
          "Render shortcode <code>[pdf-embedder url='...']</code> with Real3D Flipook",
        ],
        [
          "overrideDflip",
          "checkbox",
          "DearFlip",
          "Render shortcode <code>[dflip source='...']</code> or <code>[dflip id='...']</code> with Real3D Flipook",
        ],
        [
          "overrideWonderPDFEmbed",
          "checkbox",
          "Wonder PDF Embed",
          "Render shortcode <code>[wonderplugin_pdf src='...']</code> with Real3D Flipook",
        ],
        [
          "override3DFlipBook",
          "checkbox",
          "3D Flipbook",
          "Render shortcode <code>[3d-flip-book pdf='...']</code> or <code>[3d-flip-book id='...']</code> with Real3D Flipook",
        ],
        [
          "overridePDFjsViewer",
          "checkbox",
          "PDF.js Viewer",
          "Render shortcode <code>[pdfjs-viewer url='...']</code> with Real3D Flipook",
        ],
      ],
      advanced: [
        ],
      };

    const proOptions = {
      general: [
        "deeplinking[enabled]",
        "deeplinking[prefix]",
        "pdfTextLayer",
        "pdfAutoLinks",
        "disableRange",
        "linkColor",
        "linkColorHover",
        "linkOpacity",
        "linkTarget",
        "thumbnailsOnStart",
        "contentOnStart",
        "searchOnStart",
        "searchResultsThumbs",
        "tableOfContentCloseOnClick",
        "thumbsCloseOnClick",
        "googleAnalyticsTrackingCode",
        "rightClickEnabled",
        "access",
      ],
    };

    function addOption(section, name, type, desc, help, values) {
      function getNestedValue(obj, path) {
        return path.reduce(
          (current, key) =>
            current && current[key] !== undefined ? current[key] : undefined,
          obj
        );
      }

      let nameParts = name.split(/[\[\]]/).filter(Boolean);

      let val;

      if (nameParts.length > 1) {
        let base = options.globals[nameParts[0]];

        if (base) {
          val = getNestedValue(base, nameParts.slice(1));
        }
      } else {
        val = options[name];
      }

      if (typeof val == "strings") val = r3d_stripslashes(val);

      var table = $("#flipbook-" + section + "-options");
      var tableBody = table.find("tbody");
      var row = $('<tr valign="top"  class="field-row"></tr>').appendTo(
        tableBody
      );
      var th = $('<th scope="row">' + desc + "</th>").appendTo(row);
      var td = $("<td></td>").appendTo(row);
      var elem;

      switch (type) {
        case "text":
          elem = $('<input type="text" name="' + name + '">').appendTo(td);
          if (typeof val != "undefined") elem.attr("value", val);
          break;

        case "color":
          elem = $(
            '<input type="text" name="' + name + '" class="alpha-color-picker">'
          ).appendTo(td);
          elem.attr("value", val);
          break;

        case "textarea":
          elem = $('<textarea name="' + name + '"></textarea>').appendTo(td);
          if (typeof val != "undefined") {
            elem.attr("value", val);
            elem.text(val);
          }
          break;

        case "checkbox":
          elem = $('<select name="' + name + '"></select>').appendTo(td);
          const options = [
            { value: "", text: "Default" },
            { value: "true", text: "Enabled" },
            { value: "false", text: "Disabled" },
          ];

          options.forEach((option) => {
            $("<option>", {
              value: option.value,
              text: option.text,
              selected:
                val ===
                (option.value === "true"
                  ? true
                  : option.value === "false"
                  ? false
                  : val),
            }).appendTo(elem);
          });
          break;

        case "selectImage":
          elem = $(
            '<input type="hidden" name="' +
              name +
              '"><img name="' +
              name +
              '"><a class="select-image-button button-secondary button80" href="#">Select image</a><a class="remove-image-button button-secondary button80" href="#">Remove image</a>'
          ).appendTo(td);
          $(elem[0]).attr("value", val);
          $(elem[1]).attr("src", val);
          break;

        case "selectFile":
          elem = $(
            '<input type="text" name="' +
              name +
              '"><a class="select-image-button button-secondary button80" href="#">Select file</a>'
          ).appendTo(td);
          elem.attr("value", val);
          break;

        case "dropdown":
          elem = $('<select name="' + name + '"></select>').appendTo(td);
          $("<option>", {
            value: "",
            text: "Default",
            selected: typeof val === "undefined",
          }).appendTo(elem);

          values.forEach((option) => {
            $("<option>", {
              value: option.value || option, // Fallback if option is not an object
              text: option.display || option, // Fallback if option is not an object
              selected: val === (option.value || option),
            }).appendTo(elem);
          });
          break;
      }

      if (typeof help != "undefined")
        var p = $('<p class="description">' + help + "</p>").appendTo(td);
    }

    for (const key in allOptions) {
      allOptions[key].forEach(function (argsArray) {
        addOption(key, ...argsArray);
      });
    }

    function addMenuButton(name) {
      addOption(name, name + "[enabled]", "checkbox", "Enabled");

      addOption(name, name + "[title]", "text", "Title");

      addOption(name, name + "[vAlign]", "dropdown", "Vertical align", "", [
        "",
        "bottom",
        "top",
      ]);

      addOption(name, name + "[hAlign]", "dropdown", "Horizontal align", "", [
        "",
        "center",
        "right",
        "left",
      ]);

      addOption(name, name + "[order]", "text", "Order");
    }

    var menuButtonNames = [
      "currentPage",
      "btnAutoplay",
      "btnNext",
      "btnPrev",
      "btnFirst",
      "btnLast",
      "btnZoomIn",
      "btnZoomOut",
      "btnToc",
      "btnThumbs",
      "btnShare",
      "btnSound",
      "btnExpand",
      "btnDownloadPages",
      "btnDownloadPdf",
      "btnPrint",
      "btnSingle",
      "btnSearch",
      "search",
      "btnBookmark",
      "btnTools",
      "btnClose",
    ];

    menuButtonNames.forEach(function (buttonName) {
      addMenuButton(buttonName);
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

    var ui_layouts = {
      default: {
        menuOverBook: false,
        menuFloating: false,
        menuBackground: "",
        menuShadow: "",
        menuMargin: 0,
        menuPadding: 0,
        menuTransparent: false,

        menu2OverBook: true,
        menu2Floating: false,
        menu2Background: "",
        menu2Shadow: "",
        menu2Margin: 0,
        menu2Padding: 0,
        menu2Transparent: true,

        btnMargin: 2,
        sideMenuOverMenu: false,
        sideMenuOverMenu2: true,

        currentPage: { hAlign: "left", vAlign: "top" },
        btnAutoplay: { hAlign: "center", vAlign: "bottom" },
        btnSound: { hAlign: "center", vAlign: "bottom" },
        btnExpand: { hAlign: "center", vAlign: "bottom" },
        btnZoomIn: { hAlign: "center", vAlign: "bottom" },
        btnZoomOut: { hAlign: "center", vAlign: "bottom" },
        btnSearch: { hAlign: "center", vAlign: "bottom" },
        btnBookmark: { hAlign: "center", vAlign: "bottom" },
        btnToc: { hAlign: "center", vAlign: "bottom" },
        btnThumbs: { hAlign: "center", vAlign: "bottom" },
        btnShare: { hAlign: "center", vAlign: "bottom" },
        btnPrint: { hAlign: "center", vAlign: "bottom" },
        btnDownloadPages: { hAlign: "center", vAlign: "bottom" },
        btnDownloadPdf: { hAlign: "center", vAlign: "bottom" },
      },
      1: {},
      2: {
        // bottom 2
        currentPage: { vAlign: "bottom", hAlign: "center" },
        btnAutoplay: { hAlign: "left" },
        btnSound: { hAlign: "left" },
        btnExpand: { hAlign: "right" },
        btnZoomIn: { hAlign: "right" },
        btnZoomOut: { hAlign: "right" },
        btnSearch: { hAlign: "left" },
        btnBookmark: { hAlign: "left" },
        btnToc: { hAlign: "left" },
        btnThumbs: { hAlign: "left" },
        btnShare: { hAlign: "right" },
        btnPrint: { hAlign: "right" },
        btnDownloadPages: { hAlign: "right" },
        btnDownloadPdf: { hAlign: "right" },
      },
      3: {
        // top
        menuTransparent: true,
        menu2Transparent: false,
        menu2OverBook: false,
        menu2Padding: 5,
        btnMargin: 5,
        currentPage: { vAlign: "top", hAlign: "center" },
        btnPrint: { vAlign: "top", hAlign: "right" },
        btnDownloadPdf: { vAlign: "top", hAlign: "right" },
        btnDownloadPages: { vAlign: "top", hAlign: "right" },
        btnThumbs: { vAlign: "top", hAlign: "left" },
        btnToc: { vAlign: "top", hAlign: "left" },
        btnBookmark: { vAlign: "top", hAlign: "left" },
        btnSearch: { vAlign: "top", hAlign: "left" },
        btnShare: { vAlign: "top", hAlign: "right" },
        btnAutoplay: { hAlign: "right" },
        btnExpand: { hAlign: "right" },
        btnZoomIn: { hAlign: "right" },
        btnZoomOut: { hAlign: "right" },
        btnSound: { hAlign: "right" },
        menuPadding: 5,
      },
      4: {
        // top 2
        menu2Transparent: false,
        menu2OverBook: false,
        sideMenuOverMenu2: false,
        currentPage: { vAlign: "top", hAlign: "center" },
        btnAutoplay: { vAlign: "top", hAlign: "left" },
        btnSound: { vAlign: "top", hAlign: "left" },
        btnExpand: { vAlign: "top", hAlign: "right" },
        btnZoomIn: { vAlign: "top", hAlign: "right" },
        btnZoomOut: { vAlign: "top", hAlign: "right" },
        btnSearch: { vAlign: "top", hAlign: "left" },
        btnBookmark: { vAlign: "top", hAlign: "left" },
        btnToc: { vAlign: "top", hAlign: "left" },
        btnThumbs: { vAlign: "top", hAlign: "left" },
        btnShare: { vAlign: "top", hAlign: "right" },
        btnPrint: { vAlign: "top", hAlign: "right" },
        btnDownloadPages: { vAlign: "top", hAlign: "right" },
        btnDownloadPdf: { vAlign: "top", hAlign: "right" },
      },
    };

    $('select[name="layout"]').change(function () {
      var name = this.value;

      var defaults = ui_layouts["default"];
      for (var key in defaults) {
        setOptionValue(key, defaults[key]);
      }

      var obj = ui_layouts[name];
      for (var key in obj) {
        setOptionValue(key, obj[key]);
      }

      setOptionValue("layout", name);
    });

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

    var $form = $("#real3dflipbook-options-form");

    $form.submit(function (e) {
      e.preventDefault();

      $form.find(".spinner").css("visibility", "visible");

      $form
        .find(".save-button")
        .prop("disabled", "disabled")
        .css("pointer-events", "none");
      $form
        .find(".create-button")
        .prop("disabled", "disabled")
        .css("pointer-events", "none");

      var data = "action=r3d_save_general&security=" + window.r3d_nonce[0];
      var arr = $form.serializeArray();

      arr.forEach(function (element, index) {
        if (element.value != "")
          data +=
            "&" + element.name + "=" + encodeURIComponent(element.value.trim());
      });

      $.ajax({
        type: "POST",
        url: $form.attr("action"), //.replace('admin-ajax','admin'),
        data: data,

        success: function (data, textStatus, jqXHR) {
          $(".spinner").css("visibility", "hidden");
          $(".save-button").prop("disabled", "").css("pointer-events", "auto");
          $(".create-button").hide();
          $(".save-button").show();
          $("#edit-flipbook-text").text("Edit Flipbook");

          removeAllNotices();
          addNotice("Settings updated");
        },

        error: function (XMLHttpRequest, textStatus, errorThrown) {
          alert("Status: " + textStatus);
          alert("Error: " + errorThrown);
        },
      });
    });

    /**
     * Create and show a dismissible admin notice
     */
    function addNotice(msg) {
      var div = document.createElement("div");
      $(div)
        .addClass("notice notice-info")
        .css("position", "relative")
        .fadeIn();

      var p = document.createElement("p");

      $(p).text(msg).appendTo($(div));

      var b = document.createElement("button");
      $(b).attr("type", "button").addClass("notice-dismiss").appendTo($(div));

      var bSpan = document.createElement("span");
      $(bSpan)
        .addClass("screen-reader-text")
        .text("Dismiss this notice")
        .appendTo($(b));

      var h1 = document.getElementsByTagName("h1")[0];
      h1.parentNode.insertBefore(div, h1.nextSibling);

      $(b).click(function () {
        div.parentNode.removeChild(div);
      });
    }

    function removeAllNotices() {
      $(".notice").remove();
    }

    $(".flipbook-reset-defaults").click(function (e) {
      e.preventDefault();

      if (confirm("Reset Global settings?")) {
        var data = "action=r3d_reset_general&security=" + window.r3d_nonce[0];

        $.ajax({
          type: "POST",
          url: "admin-ajax.php?page=real3d_flipbook_admin",
          data: data,

          success: function (data, textStatus, jqXHR) {
            location.href =
              location.origin +
              location.pathname +
              "?page=real3d_flipbook_settings";
          },

          error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
          },
        });
      }
    });

    $(window).scroll(function () {
      updateSaveBar();
    });

    $(window).resize(function () {
      updateSaveBar();
    });

    updateSaveBar();

    function unsaved() {
      // $('.unsaved').show()
    }

    // flipbook-options

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

    // $(".tabs").tabs();
    $(".ui-sortable").sortable();

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
      return opiton.attr("value");
    }

    function getOption(optionName, type) {
      var type = type || "input";
      var opiton = $(type + "[name='" + optionName + "']");
      return opiton;
    }

    $(".select-image-button").click(function (e) {
      e.preventDefault();

      var $input = $(this).parent().find("input");
      var $img = $(this).parent().find("img");

      var pdf_uploader = wp
        .media({
          title: "Select file",
          button: {
            text: "Select",
          },
          multiple: false, // Set this to true to allow multiple files to be selected
        })
        .on("select", function () {
          // $('.unsaved').show()
          var arr = pdf_uploader.state().get("selection");
          var selected = arr.models[0].attributes.url;

          $input.val(selected);
          $img.attr("src", selected);
        })
        .open();
    });

    $(".remove-image-button").click(function (e) {
      e.preventDefault();

      var $input = $(this).parent().find("input");
      var $img = $(this).parent().find("img");

      $input.val("");
      $img.attr("src", "");
    });

    function setOptionValue(optionName, value, type) {
      if (typeof value == "object") {
        for (var key in value) {
          setOptionValue(optionName + "[" + key + "]", value[key]);
        }
        return null;
      }
      var type = type || "input";
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
