<?php
// Shared core helpers — defined only in Lite (Pro requires Lite and uses these).

if (!function_exists('trace')) {
	function trace($var)
	{
		echo '<script type="text/javascript">';
		echo 'console.log(' . wp_json_encode($var) . ');';
		echo '</script>';
	}
}

if (!function_exists("r3d_array_merge_deep")) {
	function r3d_array_merge_deep($array1, $array2)
	{
		$merged = $array1;

		foreach ($array2 as $key => &$value) {
			if (is_array($value) && isset($merged[$key]) && is_array($merged[$key])) {
				$merged[$key] = r3d_array_merge_deep($merged[$key], $value);
			} else {
				$merged[$key] = $value;
			}
		}

		return $merged;
	}
}

if (!function_exists("r3d_preview_cut")) {
	// A bare positive integer previewPages cuts the book to the first N pages; anything
	// else (range/list/"0"/empty) returns null. Mirrors the viewer's getPreviewCut().
	function r3d_preview_cut($pp)
	{
		if ($pp === null || $pp === '') return null;
		if (is_int($pp) || is_float($pp)) return $pp > 0 ? (int) $pp : null;
		if (is_string($pp) && preg_match('/^\d+$/', trim($pp))) {
			$n = (int) trim($pp);
			return $n > 0 ? $n : null;
		}
		return null;
	}
}

if (!function_exists("r3d_preview_unlocked_set")) {
	// Parses a previewPages selection ("1-20", "1,2,3", "1,5-9,12") into a list of
	// unlocked 1-based page numbers (>= 1), or null. Mirrors the viewer's parsePageSpec().
	function r3d_preview_unlocked_set($pp)
	{
		if ($pp === null || $pp === '') return null;
		$set = [];
		foreach (explode(',', (string) $pp) as $token) {
			$s = trim($token);
			if ($s === '') continue;
			if (strpos($s, '-') !== false) {
				$parts = explode('-', $s);
				if (count($parts) === 2 && is_numeric($parts[0]) && is_numeric($parts[1])) {
					$a = (int) $parts[0];
					$b = (int) $parts[1];
					for ($n = max(min($a, $b), 1); $n <= max($a, $b); $n++) $set[$n] = true;
				}
			} elseif (is_numeric($s)) {
				$n = (int) $s;
				if ($n >= 1) $set[$n] = true;
			}
		}
		return count($set) ? array_keys($set) : null;
	}
}

if (!function_exists("r3d_common_folder_from_pages")) {
	function r3d_common_folder_from_pages(array $pages, array $keys = ['src', 'thumb', 'json']): ?string
	{
		$dirs = [];

		foreach ($pages as $p) {
			if (!is_array($p)) continue;

			foreach ($keys as $k) {
				if (empty($p[$k]) || !is_string($p[$k])) continue;

				$u = str_replace('\\', '/', $p[$k]);
				$u = preg_split('/[?#]/', $u, 2)[0]; // strip query/fragment

				$pos = strrpos($u, '/');
				if ($pos === false) continue;

				$dirs[] = substr($u, 0, $pos + 1); // keep trailing slash
			}
		}

		if (count($dirs) < 2) return null;

		// Common prefix of segments
		$common = explode('/', rtrim($dirs[0], '/'));

		for ($i = 1; $i < count($dirs); $i++) {
			$seg = explode('/', rtrim($dirs[$i], '/'));
			$max = min(count($common), count($seg));

			$j = 0;
			while ($j < $max && $common[$j] === $seg[$j]) $j++;

			$common = array_slice($common, 0, $j);
			if (!$common) return null;
		}

		$base = implode('/', $common) . '/';

		// sanity: avoid returning something too generic
		if (strlen($base) < 12) return null;

		return $base;
	}
}

if (!function_exists("r3dfb_getDefaults")) {
	function r3dfb_getDefaults()
	{
		return array(

			'pages' => array(),
			'pdfUrl' => '',
			'printPdfUrl' => '',
			'tableOfContent' => array(),
			'id' => '',
			'bookId' => '',
			'date' => '',
			'lightboxThumbnailUrl' => '',
			'mode' => 'normal',
			'viewMode' => 'webgl',
			'rangeChunkSize' => '256',
			'minPixelRatio' => '1',
			'pdfTextLayer' => 'true',
			'zoomMin' => '0.9',
			'zoomStep' => '2',
			'zoomSize' => '',
			'zoomReset' => 'false',
			'doubleClickZoom' => 'true',
			'pageDrag' => 'true',
			'singlePageMode' => 'false',
			'pageFlipDuration' => '1',
			'sound' => 'true',
			'startPage' => '1',
			'pageNumberOffset' => '0',
			'deeplinking' => array(
				'enabled' => 'false',
				'prefix' => ''
			),
			'responsiveView' => 'true',
			'responsiveViewTreshold' => '768',
			'responsiveViewRatio' => '1',
			'minimalView' => 'true',
			'minimalViewBreakpoint' => '600',
			'cover' => 'true',
			'backCover' => 'true',
			'scaleCover' => 'false',
			'pageCaptions' => 'false',
			'height' => '400',
			'responsiveHeight' => 'true',
			'containerRatio' => '',
			'thumbnailsOnStart' => 'false',
			'contentOnStart' => 'false',
			'searchOnStart' => '',
			'searchResultsThumbs' => 'false',
			'tableOfContentCloseOnClick' => 'true',
			'thumbsCloseOnClick' => 'true',
			'autoplayOnStart' => 'false',
			'autoplayInterval' => '3000',
			'autoplayLoop' => 'true',
			'autoplayStartPage' => '1',
			'autoplayLoop' => 'true',
			'rightToLeft' => 'false',
			'pageWidth' => '',
			'pageHeight' => '',
			'thumbSize' => '130',
			'logoImg' => '',
			'logoUrl' => '',
			'logoUrlTarget' => '',
			'logoCSS' => 'position:absolute;left:0;top:0;',
			'menuSelector' => '',
			'zIndex' => 'auto',
			'preloaderText' => '',
			'googleAnalyticsTrackingCode' => '',
			'pdfBrowserViewerIfIE' => 'false',
			'modeMobile' => '',
			'viewModeMobile' => '',
			'aspectMobile' => '',
			'aspectRatioMobile' => '0.71',
			'singlePageModeIfMobile' => 'false',
			'logoHideOnMobile' => 'false',
			'mobile' => array(
				'thumbnailsOnStart' => 'false',
				'contentOnStart' => 'false',
				'pagesInMemory' => '6',
				'bitmapResizeHeight' => '',
				'bitmapResizeQuality' => '',
				'currentPage' => array(
					'enabled' => 'false'
				),
				'pdfUrl' => '',
				'minimalViewBreakpoint' => '360',
				'zoomMin' => '',
				'autoplayInterval' => ''

			),
			'lightboxCssClass' => '',
			'lightboxLink' => '',
			'lightboxLinkNewWindow' => 'true',
			'lightboxBackground' => 'rgb(81, 85, 88)',
			'lightboxBackgroundPattern' => '',
			'lightboxBackgroundImage' => '',
			'lightboxContainerCSS' => 'display:inline-block;padding:10px;',
			'lightboxThumbnailHeight' => '300',
			'lightboxThumbnailUrlCSS' => 'display:block;',
			'lightboxThumbnailInfo' => 'false',
			'lightboxThumbnailInfoText' => '',
			'lightboxThumbnailInfoCSS' => 'top: 0;  width: 100%; height: 100%; font-size: 16px; color: #000; background: rgba(255,255,255,.8); ',
			'showTitle' => 'false',
			'showDate' => 'false',
			'hideThumbnail' => 'false',
			'lightboxText' => '',
			'lightboxTextCSS' => 'display:block;',
			'lightboxTextPosition' => 'top',
			'lightBoxOpened' => 'false',
			'lightBoxFullscreen' => 'false',
			'lightboxStartPage' => '',
			'lightboxMarginV' => '0',
			'lightboxMarginH' => '0',
			'lights' => 'true',
			'lightPositionX' => '0',
			'lightPositionY' => '150',
			'lightPositionZ' => '1400',
			'lightIntensity' => '0.6',
			'shadows' => 'true',
			'shadowMapSize' => '2048',
			'shadowOpacity' => '0.2',
			'shadowDistance' => '15',
			'pageHardness' => '2',
			'coverHardness' => '2',
			'pageRoughness' => '1',
			'pageMetalness' => '0',
			'pageSegmentsW' => '6',
			'pageSegmentsH' => '1',
			'pagesInMemory' => '20',
			'bitmapResizeHeight' => '',
			'bitmapResizeQuality' => '',
			'pageMiddleShadowSize' => '4',
			'pageMiddleShadowColorL' => '#7F7F7F',
			'pageMiddleShadowColorR' => '#AAAAAA',
			'antialias' => 'false',
			'pan' => '0',
			'tilt' => '0',
			'rotateCameraOnMouseDrag' => 'true',
			'panMax' => '20',
			'panMin' => '-20',
			'tiltMax' => '0',
			'tiltMin' => '0',
			'currentPage' => array(
				'enabled' => 'true',
				'title' => __('Current page', 'real3d-flipbook'),
				'hAlign' => 'left',
				'vAlign' => 'top'
			),
			'btnAutoplay' => array(
				'enabled' => 'true',
				'title' => __('Auto flip', 'real3d-flipbook')
			),
			'btnNext' => array(
				'enabled' => 'true',
				'title' => __('Next Page', 'real3d-flipbook')
			),
			'btnLast' => array(
				'enabled' => 'false',
				'title' => __('Last Page', 'real3d-flipbook')
			),
			'btnPrev' => array(
				'enabled' => 'true',
				'title' => __('Previous Page', 'real3d-flipbook')
			),
			'btnFirst' => array(
				'enabled' => 'false',
				'title' => __('First Page', 'real3d-flipbook')
			),
			'btnZoomIn' => array(
				'enabled' => 'true',
				'title' => __('Zoom in', 'real3d-flipbook')
			),
			'btnZoomOut' => array(
				'enabled' => 'true',
				'title' => __('Zoom out', 'real3d-flipbook')
			),
			'btnToc' => array(
				'enabled' => 'true',
				'title' => __('Table of Contents', 'real3d-flipbook')
			),
			'btnThumbs' => array(
				'enabled' => 'true',
				'title' => __('Pages', 'real3d-flipbook')
			),
			'btnShare' => array(
				'enabled' => 'true',
				'title' => __('Share', 'real3d-flipbook')
			),
			'btnNotes' => array(
				'enabled' => 'false',
				'title' => __('Notes', 'real3d-flipbook')
			),
			'btnDownloadPages' => array(
				'enabled' => 'false',
				'url' => '',
				'title' => __('Download pages', 'real3d-flipbook')
			),
			'btnDownloadPdf' => array(
				'enabled' => 'true',
				'url' => '',
				'title' => __('Download PDF', 'real3d-flipbook'),
				'forceDownload' => 'true',
				'openInNewWindow' => 'true'
			),
			'btnSound' => array(
				'enabled' => 'true',
				'title' => __('Sound', 'real3d-flipbook')
			),
			'btnExpand' => array(
				'enabled' => 'true',
				'title' => __('Toggle fullscreen', 'real3d-flipbook')
			),
			'btnSingle' => array(
				'enabled' => 'true',
				'title' => __('Toggle single page', 'real3d-flipbook')
			),
			'btnSearch' => array(
				'enabled' => 'false',
				'title' => __('Search', 'real3d-flipbook')
			),
			'search' => array(
				'enabled' => 'false',
				'title' => __('Search', 'real3d-flipbook')
			),
			'btnBookmark' => array(
				'enabled' => 'false',
				'title' => __('Bookmark', 'real3d-flipbook')
			),
			'btnPrint' => array(
				'enabled' => 'true',
				'title' => __('Print', 'real3d-flipbook')
			),
			'btnTools' => array(
				'enabled' => 'true',
				'title' => __('More', 'real3d-flipbook')
			),
			'btnClose' => array(
				'enabled' => 'true',
				'title' => __('Close', 'real3d-flipbook')
			),

			'whatsapp' => array(
				'enabled' => 'true'
			),
			'twitter' => array(
				'enabled' => 'true'
			),
			'facebook' => array(
				'enabled' => 'true'
			),
			'pinterest' => array(
				'enabled' => 'true'
			),
			'email' => array(
				'enabled' => 'true'
			),
			'linkedin' => array(
				'enabled' => 'true'
			),
			'digg' => array(
				'enabled' => 'false'
			),
			'reddit' => array(
				'enabled' => 'false'
			),

			'shareUrl' => '',
			'shareTitle' => '',
			'shareImage' => '',

			'layout' => 1,
			'iconSet' => 'fontawesome',
			'progressBar' => array(
				'enabled' => 'false',
			),
			'skin' => 'light',
			'useFontAwesome5' => 'true',
			'sideNavigationButtons' => 'true',
			'menuNavigationButtons' => 'false',
			'backgroundColor' => 'rgb(81, 85, 88)',
			'backgroundPattern' => '',
			'backgroundImage' => '',
			'backgroundTransparent' => 'false',

			'menuBackground' => '',
			'menuShadow' => '',
			'menuMargin' => '0',
			'menuPadding' => '0',
			'menuOverBook' => 'false',
			'menuFloating' => 'false',
			'menuTransparent' => 'false',

			'menu2Background' => '',
			'menu2Shadow' => '',
			'menu2Margin' => '0',
			'menu2Padding' => '0',
			'menu2OverBook' => 'true',
			'menu2Floating' => 'false',
			'menu2Transparent' => 'true',

			'skinColor' => '',
			'skinBackground' => '',

			'hideMenu' => 'false',
			'menuAlignHorizontal' => 'center',
			'btnColor' => '',
			'btnColorHover' => '',
			'btnBackground' => 'none',
			'btnRadius' => '0',
			'btnMargin' => '0',
			'btnSize' => '18',
			'btnPaddingV' => '10',
			'btnPaddingH' => '10',
			'btnShadow' => '',
			'btnTextShadow' => '',
			'btnBorder' => '',
			'arrowColor' => '#fff',
			'arrowColorHover' => '#fff',
			'arrowBackground' => 'rgba(0,0,0,0)',
			'arrowBackgroundHover' => 'rgba(0, 0, 0, .15)',
			'arrowRadius' => '4',
			'arrowMargin' => '4',
			'arrowSize' => '40',
			'arrowPadding' => '10',
			'arrowTextShadow' => '0px 0px 1px rgba(0, 0, 0, 1)',
			'arrowBorder' => '',
			'closeBtnColorHover' => '#FFF',
			'closeBtnBackground' => 'rgba(0,0,0,.4)',
			'closeBtnRadius' => '0',
			'closeBtnMargin' => '0',
			'closeBtnSize' => '20',
			'closeBtnPadding' => '5',
			'closeBtnTextShadow' => '',
			'closeBtnBorder' => '',
			'floatingBtnColor' => '',
			'floatingBtnColorHover' => '',
			'floatingBtnBackground' => '',
			'floatingBtnBackgroundHover' => '',
			'floatingBtnRadius' => '',
			'floatingBtnMargin' => '',
			'floatingBtnSize' => '',
			'floatingBtnPadding' => '',
			'floatingBtnShadow' => '',
			'floatingBtnTextShadow' => '',
			'floatingBtnBorder' => '',
			'currentPageMarginV' => '5',
			'currentPageMarginH' => '5',
			'arrowsAlwaysEnabledForNavigation' => 'true',
			'arrowsDisabledNotFullscreen' => 'true',
			'touchSwipeEnabled' => 'true',
			'fitToWidth' => 'false',
			'rightClickEnabled' => 'true',
			'linkColor' => 'rgba(0, 0, 0, 0)',
			'linkColorHover' => 'rgba(255, 255, 0, 1)',
			'linkOpacity' => '0.4',
			'linkTarget' => '_blank',
			'pdfAutoLinks' => 'false',
			'disableRange' => 'false',

			'strings' => array(
				'print' => __('Print', 'real3d-flipbook'),
				'printLeftPage' => __('Print left page', 'real3d-flipbook'),
				'printRightPage' => __('Print right page', 'real3d-flipbook'),
				'printCurrentPage' => __('Print current page', 'real3d-flipbook'),
				'printAllPages' => __('Print all pages', 'real3d-flipbook'),
				'download' => __('Download', 'real3d-flipbook'),
				'downloadLeftPage' => __('Download left page', 'real3d-flipbook'),
				'downloadRightPage' => __('Download right page', 'real3d-flipbook'),
				'downloadCurrentPage' => __('Download current page', 'real3d-flipbook'),
				'downloadAllPages' => __('Download all pages', 'real3d-flipbook'),
				'bookmarks' => __('Bookmarks', 'real3d-flipbook'),
				'bookmarkLeftPage' => __('Bookmark left page', 'real3d-flipbook'),
				'bookmarkRightPage' => __('Bookmark right page', 'real3d-flipbook'),
				'bookmarkCurrentPage' => __('Bookmark current page', 'real3d-flipbook'),
				'search' => __('Search', 'real3d-flipbook'),
				'findInDocument' => __('Find in document', 'real3d-flipbook'),
				'pagesFoundContaining' => __('pages found containing', 'real3d-flipbook'),
				'noMatches' => __('No matches', 'real3d-flipbook'),
				'matchesFound' => __('matches found', 'real3d-flipbook'),
				'page' => __('Page', 'real3d-flipbook'),
				'matches' => __('matches', 'real3d-flipbook'),
				'thumbnails' => __('Thumbnails', 'real3d-flipbook'),
				'tableOfContent' => __('Table of Contents', 'real3d-flipbook'),
				'share' => __('Share', 'real3d-flipbook'),
				'pressEscToClose' => __('Press ESC to close', 'real3d-flipbook'),
				'password' => __('Password', 'real3d-flipbook'),
				'addNote' => __('Add note', 'real3d-flipbook'),
				'typeInYourNote' => __('Type in your note...', 'real3d-flipbook'),
			),

			'access' => 'free', //free, woo_subscription, ...
			'backgroundMusic' => '',
			'backgroundMusicOnAutoplay' => 'false',
			'cornerCurl' => 'false',
			'pdfTools' => array(
				'pageHeight' => 1500,
				'thumbHeight' => 200,
				'quality' => 0.8,
				'textLayer' => 'true',
				'autoConvert' => 'true'
			),
			'slug' => '',
			'convertPDFLinks' => 'true',
			'convertPDFLinksWithClass' => '',
			'convertPDFLinksWithoutClass' => '',
			'overridePDFEmbedder' => 'true',
			'overrideDflip' => 'true',
			'overrideWonderPDFEmbed' => 'true',
			'override3DFlipBook' => 'true',
			'overridePDFjsViewer' => 'true',
			'resumeReading' => 'false',
			'previewPages' => '',
			'previewMode' => '',
		);
	}
}

