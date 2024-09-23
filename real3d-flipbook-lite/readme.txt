=== 3D FlipBook, PDF Viewer, PDF Embedder - Real 3D FlipBook WordPress Plugin ===
Contributors: creativeinteractivemedia
Donate link: https://codecanyon.net/item/real3d-flipbook-wordpress-plugin/6942587
Tags: flipbook, pdf flip book, pdf viewer, pdf embed, pdf embedder
Requires at least: 5.0
Tested up to: 6.5
Stable tag: 3.63
License: GPLv3
License URI: http://www.gnu.org/licenses/gpl-3.0.html

The ultimate 3D flipbook, PDF viewer, and image gallery for your WordPress site!

== Description ==

Transform PDFs and images into stunning 3D flipbooks directly within your WordPress posts and pages. Real3D Flipbook enhances the visual appeal and interactivity of your site, creating an engaging user experience.

**Features:**
* Realistic 3D flipping effect
* Multiple view modes: Lightbox, Swipe, Scroll, and Fullscreen
* Gutenberg block support
* Fully responsive and mobile-friendly

### Live Demo & Documentation ###
* [Live Demo](https://real3dflipbook.com)
* [Try your PDF](https://real3dflipbook.com#try)
* [User Manual](https://real3dflipbook.gitbook.io/wp-lite/)

### Support ###
For any issues or feature requests, [open a ticket](https://wordpress.org/support/plugin/real3d-flipbook-lite/).

### Key Features ###
* **Open PDF Links as Flipbooks:** Enable lightbox flipbooks for PDF links. [Watch Video](https://youtu.be/MTFyY84o1Ss)
* **Easily Migrate:** Automatically convert existing shortcodes from PDF Embedder, DearFlip, 3D Flipbook, Wonder PDF Embed, and PDF.js Viewer.
* **Create Flipbook in 5 Steps:**
  1. Go to Real3D Flipbook > Add New
  2. Select PDF or images
  3. Publish the flipbook
  4. Copy the shortcode
  5. Paste it into a post or page
  [Watch Video](https://youtu.be/1ljFRYr0Kh8)
* **Lightbox Flipbook:** Open in fullscreen overlay on various triggers.
* **Embedded Flipbook:** Insert flipbooks anywhere in posts/pages.
* **Self-Hosted:** Ensures fast and secure loading on your server.
* **Realistic 3D Flipbooks:** Most realistic page flip animation.
* **Customizable:** Choose from various modes and customize toolbar, background, colors, and more.

### Advanced Features in PRO Version ###
Upgrade for features like PDF hyperlinks, text search, custom toolbar configurations, and more. [Real3D FlipBook PRO](https://real3dflipbook.com).

### Add Ons ###
* [PDF Tools Addon](https://real3dflipbook.com/pdf-tools-addon/): Convert PDF to images to enhance loading speed and security.

== Installation ==

### Automatic Installation

1. Go to 'Plugins > Add New' and search for 'Real3D Flipbook'.
2. Click 'Install Now' and then activate.
3. Create a new flipbook: 'Real3D Flipbook' > 'Add New', add images or PDF, customize settings, and publish.
4. Copy the shortcode and paste it into a post or page.

### Manual Installation

1. Download the plugin zip file.
2. Upload through 'Plugins > Add New > Upload' or extract to '/wp-content/plugins/' directory.
3. Activate the plugin through the 'Plugins' menu.
4. Create and publish a new flipbook, then use the shortcode in a post or page.

== Frequently Asked Questions ==

= How to create a flipbook? =
Go to 'Real3D Flipbook > Add New', add pages by uploading JPGs or PDF, and publish the flipbook.

= How to embed a flipbook in a post or page? =
Copy the flipbook shortcode from the list and paste it into a post or page.

= Is there a limit to the number of pages or PDF file size? =
Supports 500+ MB PDF files with 1000+ pages. Only visible pages are loaded, so performance is not affected by the number of pages.

= How to optimize PDF flipbook for fast loading? =
Optimize PDFs by reducing resolution to 150 dpi, using JPEG encoding for images, and ensuring web optimization settings.

= How to optimize image flipbook for fast loading? =
Use web-optimized images with a resolution around 2000px, preferably in JPG or WebP formats.

== Changelog ==

= 1.0 =
* initial release

= 3.39 =
* New: more options added under General
* New: WebGL options
* Improvement: better performance
* Improvement: faster page loading time
* Improvement: optimized script loading
* Improvement: smaller script sizes
* Fix : various bug fixes

= 3.39.1 =
* Fix: updating from 1.0

= 3.41 =
* New: view mode "scroll"
* Fix: view mode "3d" performance

= 3.42 =
* New: flipbook mode "lightbox" and "fullscreen" added
* Fix: view mode "scroll" not loading first page if viewer is off screen
* Improvement: disable flipbook when it is off screen 

= 3.50 =
* Fix: bug with OffscreenCanvas undefined on iOS
* Fix: disable page scroll on mobile when lightbox is active
* Fix: disable page flip if another flipbook is in fullscreen or lightbox
* Improvement: faster page loading in mode "webgl"
* Improvement: faster page loading for PDF flipbooks
* Improvement: performance optimizations

= 3.53 =
* Improvement: Added toolbar with Zoom in, Zoom out and Fullscreen options

= 3.53.1 =
* New: Help section in Edit flipbook page, with Getting Started video
* New: Open lightbox flipbook with a "lightbox CSS class" - any element with this CSS class will open the lightbox flipbook
* New: Set lightbox CSS class via shortcode parameter "class"
* New: Set PDF URL via shortcode parameter "pdf"
* New: Set lightbox thumbnail URL via shortcode parameter "thumb"

= 3.54 =
* Improvement: Updated Getting Started video
* Improvement: Changed default flipbook container size to A4 double page

= 3.55 =
* Fix: Creating flipbook from images
* Fix: Flipping pages with arrows in mode "3d" and "2d"

= 3.56 =
* New: Thumbnails option in toolbar
* New: Print option in toolbar
* Improvement: Page resolution for PDF flipbook

= 3.56.1 =
* New: Help admin page

= 3.56.2 =
* New: Toolbar button for enabling / disabling flip sound

= 3.57 =
* Fix: Prevent page flip after pinch zoom
* Fix: Prevent double click zoom during page flip

= 3.58 =
* Fix: Single page mode with odd number of pages
* Fix: Blurry pages in mode 2D
* Fix: Right to left mode when book has 1 page

= 3.59 =
* Fix: Left page not visible on iOS, when view mode is 2d or 3d
* Fix: HTML content not working for PDF flipbook

= 3.60 =
* New: Table of Contents from page titles
* New: Table of Contents builder
* New: Share on Facebook, X

= 3.61 =
* New: Option to override click on PDF links, all links <a href="...pdf"></a> will open PDF in Real3D Flipbook lightbox
* New: Option to render shortcodes [pdf-embedder url="...pdf"], [dflip source="...pdf"], [wonderplugin_pdf src="...pdf"] in Real3D Flipbook

= 3.61.1 =
* New: Option to render shortcodes [3d-flip-book pdf="...pdf"], [3d-flip-book id="...pdf"], [dflip id="...pdf"], [pdfjs-viewer url="...pdf"] in Real3D Flipbook

= 3.61.2 =
* Fix: Import flipbooks from JSON

= 3.62 =
* New: Download PDF button
* New: Enable / Disable any toolbar button

= 3.63 =
* Improvement: Flipbook live preview in admin 

= 3.65 =
* New: Option to show only first x number of pages 
* Fix: Scrollbar on Table of Contents and Thumbnails

= 3.68 =
* Improvement: Updated links for addons

= 3.68.1 =
* Fix: Conflict with dflip plugin

= 3.69 =
* Fix: Override PDF Embedder shortcode and block

= 3.70 =
* New: Support for translation with .po .mo files
* New: Added Turkish translation

= 3.71 =
* Improvement: Navigation arrows redesign
* Improvement: Thumbnails view redesign

= 3.72 =
* Fix: Saving HTML content for flipbook pages
* New: Tooltip for toolbar

= 3.73 =
* Fix: Right to left mode in view mode "3d", "2d", "simple"

= 3.73.1 =
* Fix: Right to left mode in view mode "swipe"

= 3.74 =
* New: Resize flipbook container to fit double page flipbook on desktop and single page flipbook on mobile

= 3.75 =
* Improvement: Code optimization

= 3.76 =
* Improvement: Performance optimization for JPG flipbooks
* Fix: Missing "scroll" option in Mobile > View mode

= 3.77 =
* Fix: View mode "swipe" not working

= 3.79 =
* New: Tools submenu in toolbar
* Improvement: Share menu redesign
* Improvement: Better flip animation 

= 3.80 =
* Fix: Flipbook thumbnail overwriting

= 3.81 =
* Fix: Flipbook quick edit post deletes flipbook settings

= 3.82 =
* New: Container ratio option
* New: Editable Flipbook permalink structure

= 3.83 =
* Improvement: Updated to more recent pdf.js
* Fix: Multiple flibpooks on the same page not working
* New: Convert PDF links - Option to convert only PDF links with CSS class 
* New: Convert PDF links - Option to convert only PDF links witouts CSS class 

= 4.0 =
* Improvement: Updated to PDF.js 3.11.174
* Fix: Fullscreen on iOS
* Fix: Double click zoom
* Fix: Flip pages with touch swipe
* Other bug fixes
* Performance improvements

= 4.1 =
* Fix: Fullscreen mode flipbook cut off
* Fix: Broken flipbook permalinks

= 4.1.1 =
* Improvement: Admin Help page

= 4.3 =
* Fix: Lightbox flipbook bug when flipbook is not visible
* Fix: Bulk edit flipbook posts deletes options from flipbook
* Fix: Errors caused by cached scripts
* Fix: Table of Contents from PDF outline
* Fix: PHP 8.3 warning
* Fix: iOS fullscreen shows warning
* Fix: PDF Flipbook rendering bug
* New: Option to enable / disable Current page on mobile
* New: Option to enable / disable Tools menu

= 4.3.8 =
* Fix: Bug with creating new flipbooks

= 4.3.9 =
* Fix: One page JPG flipbook not working

= 4.4.1 =
* Fix: PHP error on flipbook permalink
* Fix: Flipbook not loading in lightbox
* Fix: Single page mode can flip beyond last page

= 4.4.2 =
* Fix: JS error on Edit flipbook page

= 4.5 =
* Fix: PDF flipbook not loading when RequireJS is used on the page
* Fix: Toggle fullscreen icon does not change on iOS
* Fix: Video does not pause in view mode "scroll" when scrolled page goes outside of view

= 4.6 =
* Improvement: Flipbook thumbnail saved as webp
* Improvement: Keep page editor items after replacing PDF
* Improvement: Edit flipbook page performance


== Upgrade to PRO for More Features ==
Unlock advanced features like PDF hyperlinks, text search, custom toolbar configurations, and much more. Enhance your content presentation with [Real3D FlipBook PRO](https://real3dflipbook.com).
