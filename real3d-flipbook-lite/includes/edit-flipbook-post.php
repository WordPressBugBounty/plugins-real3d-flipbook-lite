<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly
}

$post_id = get_the_ID();
$current_id = get_post_meta($post_id, 'flipbook_id', true);


if (empty($current_id)) {

	$flipbook = array();
} else {
	$flipbook_id = intval($current_id);
	$flipbook = get_option("real3dflipbook_" . $flipbook_id);
	if (!is_array($flipbook)) {
		$flipbook = array();
	}
	$flipbook['id'] =  $flipbook_id;
}

function r3d_postbox($r3d_postbox_title, $r3d_name)
{

	$r3d_postbox_id = 'flipbook-' . $r3d_name . '-options';
	$r3d_postbox_class = 'postbox closed';

?>

	<div class="<?php echo esc_attr($r3d_postbox_class); ?>">
		<div class="postbox-header">
			<h2 class="hndle ui-sortable-handle"><?php echo esc_html($r3d_postbox_title); ?></h2>
			<button type="button" class="handlediv" aria-disabled="false"><span class="screen-reader-text"><?php esc_html_e('Toggle panel:', 'real3d-flipbook-lite');
																											echo esc_html(' ' . $r3d_postbox_title); ?></span><span class="toggle-indicator"
					aria-hidden="true"></span></button>
		</div>
		<div class="inside">
			<table class="form-table" id="<?php echo esc_attr($r3d_postbox_id); ?>">
				<tbody></tbody>
			</table>
			<div class="clear"></div>
		</div>
	</div>

<?php

}

?>

<div id='real3dflipbook-admin' style="display:none;">

	<?php
	if (!empty($current_id)) {
	?>

		<input class="flipbook-option-field" type="hidden" name="id" value="<?php echo esc_attr($flipbook_id); ?>">
		<input class="flipbook-option-field" type="hidden" name="bookId" value="<?php echo esc_attr($flipbook_id); ?>">

	<?php
	}
	?>

	<div>
		<h2 id="r3d-tabs" class="nav-tab-wrapper wp-clearfix">
			<a href="#" class="nav-tab" data-tab="tab-pages"><?php esc_html_e('Pages', 'real3d-flipbook-lite'); ?></a>
			<a href="#" class="nav-tab" data-tab="tab-general"><?php esc_html_e('General', 'real3d-flipbook-lite'); ?></a>
			<a href="#" class="nav-tab" data-tab="tab-menu"><?php esc_html_e('Toolbar', 'real3d-flipbook-lite'); ?></a>
			<a href="#" class="nav-tab" data-tab="tab-ui"><?php esc_html_e('Appearance', 'real3d-flipbook-lite'); ?></a>
			<a href="#" class="nav-tab"
				data-tab="tab-toc"><?php esc_html_e('Table of Contents', 'real3d-flipbook-lite'); ?></a>
			<a href="#" class="nav-tab" data-tab="tab-lightbox"><?php esc_html_e('Lightbox', 'real3d-flipbook-lite'); ?></a>
			<a href="#" class="nav-tab" data-tab="tab-webgl"><?php esc_html_e('WebGL', 'real3d-flipbook-lite'); ?></a>
			<a href="#" class="nav-tab" data-tab="tab-mobile"><?php esc_html_e('Mobile', 'real3d-flipbook-lite'); ?></a>
			<?php
			?>
		</h2>
		<div id="tab-pages" style="display:none;">

			<table class="form-table">
				<tbody>

					<tr>
						<td>
							<button class='button-primary add-pages-button'
								id='r3d-select-source'><?php esc_html_e("Select PDF or images", "real3d-flipbook-lite"); ?></button>
							<input type='text' class='regular-text flipbook-option-field' name="pdfUrl"
								id='r3d-pdf-source' placeholder="PDF URL">
							<button class='button-primary convert-button' id='r3d-convert'
								style="display: none;"><?php esc_html_e("Convert with PDF Tools", "real3d-flipbook-lite"); ?></button>

							<p id="add-pages-description" class="description">
								<?php esc_html_e("Select PDF or images from media library, or enter PDF URL", "real3d-flipbook-lite") ?>
							</p>
							<p id="buy-pdf-tools" style="display:none;">

								<?php
								$message = sprintf(
									/* translators: %1$s is replaced with the anchor HTML for the "PDF Tools Addon" link. */
									esc_html__(
										'Optimize Real3D PDF Flipbooks with %1$s by converting PDF to images and JSON. Speed up the flipbook loading and secure the PDF.',
										'real3d-flipbook-lite'
									),
									'<a href="' . esc_url('https://real3dflipbook.com/pdf-tools-addon/?ref=wp') . '" style="text-decoration: none; font-weight: bold;" target="_blank">' . esc_html__('PDF Tools Addon for Real3D Flipbook', 'real3d-flipbook-lite') . '</a>'
								);

								echo wp_kses(
									$message,
									[
										'a' => [
											'href' => [],
											'style' => [],
											'target' => [],
										],
									]
								);
								?>
							</p>
							<p id="add-pages-info" class="description" style="display:none;"></p>
						</td>
					</tr>
				</tbody>
			</table>

			<?php
			
			?>
			<style>
			#r3d-pro-hints { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 18px; max-width: 900px; margin: 0 0 16px; padding: 14px 18px; border: 1px solid #c3d698; border-left: 4px solid #84af05; border-radius: 6px; background: #f4f9e4; }
			#r3d-pro-hints .r3d-pro-badge { flex: none; padding: 3px 9px; border-radius: 999px; background: #84af05; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .08em; line-height: 1.4; }
			#r3d-pro-hints .r3d-pro-hints-text { flex: 1 1 320px; margin: 0; color: #3c434a; font-size: 13px; line-height: 1.55; }
			#r3d-pro-hints strong { display: block; margin-bottom: 2px; color: #1d2327; font-size: 14px; }
			#r3d-pro-hints .r3d-pro-cta { flex: none; padding: 9px 20px; border: 0; border-radius: 8px; background: #84af05; color: #fff; font-size: 13px; font-weight: 600; text-decoration: none; transition: background .2s; }
			#r3d-pro-hints .r3d-pro-cta:hover, #r3d-pro-hints .r3d-pro-cta:focus { background: #719504; color: #fff; }
			#r3d-pro-hints .r3d-pro-cta:focus { outline: 0; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #5e7c03; }
			#r3d-lp-lightbox.is-try .r3d-lp-box { width: min(1400px, 100%); height: 100%; }
			#r3d-lp-lightbox.is-try iframe { flex: 1; width: 100%; border: 0; background: #fff; }
			#r3d-lp-lightbox .r3d-try-loading { position: absolute; top: 56px; right: 0; bottom: 0; left: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; background: #fff; color: #1d2327; font-size: 14px; text-align: center; }
			#r3d-lp-lightbox .r3d-try-loading p { margin: 0; }
			#r3d-lp-lightbox .r3d-try-spinner { width: 36px; height: 36px; border: 3px solid #e3edc6; border-top-color: #84af05; border-radius: 50%; animation: r3d-try-spin .8s linear infinite; }
			#r3d-lp-lightbox .r3d-try-bar { display: block; width: 260px; max-width: 80%; height: 4px; overflow: hidden; border-radius: 2px; background: #eceef0; }
			#r3d-lp-lightbox .r3d-try-bar span { display: block; width: 0; height: 100%; background: #84af05; transition: width .2s; }
			#r3d-lp-lightbox .r3d-try-loading.is-error .r3d-try-spinner, #r3d-lp-lightbox .r3d-try-loading.is-error .r3d-try-bar { display: none; }
			@keyframes r3d-try-spin { to { transform: rotate(360deg); } }
			</style>
			<div id="r3d-pro-hints">
				<span class="r3d-pro-badge" aria-hidden="true"><?php esc_html_e('PRO', 'real3d-flipbook-lite'); ?></span>
				<p class="r3d-pro-hints-text">
					<strong><?php esc_html_e('Get more from your flipbook with PRO', 'real3d-flipbook-lite'); ?></strong>
					<?php esc_html_e('PRO renders pages in 4K so they stay sharp at full zoom. For PDFs it also keeps links clickable and adds full-text search.', 'real3d-flipbook-lite'); ?>
				</p>
				<a class="r3d-pro-cta" data-r3d-try data-label-book="<?php esc_attr_e('Preview this flipbook in PRO', 'real3d-flipbook-lite'); ?>" data-label-empty="<?php esc_attr_e('Try your PDF or images in PRO', 'real3d-flipbook-lite'); ?>" href="<?php echo esc_url('https://real3dflipbook.com/lite-vs-pro/?utm_source=wp-lite&utm_medium=plugin&utm_campaign=upgrade&utm_content=editor-notice#try'); ?>" target="_blank"><?php esc_html_e('Preview this flipbook in PRO', 'real3d-flipbook-lite'); ?></a>
			</div>
			<?php
			
			?>

			<div>
				<ul id="pages-container" tabindex="-1" class="attachments ui-sortable"></ul>
				<span
					class="button button-secondary paste-page"><?php esc_html_e('Paste page', 'real3d-flipbook-lite'); ?></span>
				<span
					class="button button-secondary add-pages-button add-more-pages"><?php esc_html_e('Add pages', 'real3d-flipbook-lite'); ?></span>
				<span
					class="button button-secondary delete-pages-button"><?php esc_html_e('Delete all pages', 'real3d-flipbook-lite'); ?></span>
			</div>
		</div>

		<div id="tab-toc" style="display:none;">
			<p class="description">
				<?php esc_html_e('Create custom Table of Contents. This overrides default PDF outline or table of contents created by page titles.', 'real3d-flipbook-lite'); ?>
			</p>
			<p>
				<a class="add-toc-item button-primary" href="#"><?php esc_html_e('Add item', 'real3d-flipbook-lite'); ?></a>
				<a href="#" type="button"
					class="button-link toc-delete-all"><?php esc_html_e('Delete all', 'real3d-flipbook-lite'); ?></a>
			</p>
			<table class="form-table" id="flipbook-toc-options">
				<tbody></tbody>
			</table>
			<div id="toc-items" tabindex="-1" class="attachments ui-sortable"></div>
		</div>
		<?php
		?>
		<div id="tab-general" style="display:none;">
			<table class="form-table" id="flipbook-general-options">
				<tbody></tbody>
			</table>
		</div>
		<div id="tab-normal" style="display:none;">
			<table class="form-table" id="flipbook-normal-options">
				<tbody></tbody>
			</table>
		</div>
		<div id="tab-mobile" style="display:none;">
			<?php
			?>
			<table class="form-table" id="flipbook-mobile-options">
				<tbody></tbody>
			</table>
		</div>
		<div id="tab-lightbox" style="display:none;">
			<table class="form-table" id="flipbook-lightbox-options">
				<tbody></tbody>
			</table>
		</div>
		<div id="tab-webgl" style="display:none;">
			<table class="form-table" id="flipbook-webgl-options">
				<tbody></tbody>
			</table>
		</div>
		<div id="tab-ui" style="display:none;">
			<div class="meta-box-sortables">

				<?php
				?>

				<?php
				?>

			</div>
		</div>
		<div id="tab-menu" style="display:none;">
			<div class="meta-box-sortables">
				<h3><?php esc_html_e('Toolbar style', 'real3d-flipbook-lite'); ?></h3>
				<div class="r3d-pick r3d-pick-layouts" id="r3d-pick-layout"></div>
				<p class="description r3d-pick-note" id="r3d-pick-layout-note" style="display:none;"></p>

				<h3><?php esc_html_e('Icons', 'real3d-flipbook-lite'); ?></h3>
				<div class="r3d-pick r3d-pick-icons" id="r3d-pick-icons"></div>

				<table class="form-table" id="flipbook-toolbar-style-options" style="display:none;">
					<tbody></tbody>
				</table>

				<table class="form-table" id="flipbook-toolbar-extra-options">
					<tbody></tbody>
				</table>

				<div class="postbox closed r3d-mb-box" id="r3d-mb-box">
					<div class="postbox-header">
						<h2 class="hndle"><?php esc_html_e('Toolbar buttons', 'real3d-flipbook-lite'); ?></h2>
						<button type="button" class="handlediv" aria-expanded="false"><span class="screen-reader-text"><?php esc_html_e('Toggle panel: Toolbar buttons', 'real3d-flipbook-lite'); ?></span><span class="toggle-indicator" aria-hidden="true"></span></button>
					</div>
					<div class="inside">
						<table class="widefat r3d-mb-table">
							<thead>
								<tr>
									<th class="r3d-mb-drag"></th>
									<th><?php esc_html_e('Button', 'real3d-flipbook-lite'); ?></th>
									<th><?php esc_html_e('Enabled', 'real3d-flipbook-lite'); ?></th>
									<th><?php esc_html_e('Title', 'real3d-flipbook-lite'); ?></th>
									<th><?php esc_html_e('Position', 'real3d-flipbook-lite'); ?></th>
									<th><?php esc_html_e('Tools menu', 'real3d-flipbook-lite'); ?></th>
									<th></th>
								</tr>
							</thead>
							<tbody id="r3d-menu-buttons-tbody"></tbody>
						</table>
					</div>
				</div>

				<div id="r3d-mb-source" style="display:none;">
					<?php

					r3d_postbox(__('Current page', 'real3d-flipbook-lite'), 'currentPage'); // escaped in r3d_postbox()
					r3d_postbox(__('Previous page', 'real3d-flipbook-lite'), 'btnPrev'); // escaped in r3d_postbox()
					r3d_postbox(__('Next page', 'real3d-flipbook-lite'), 'btnNext'); // escaped in r3d_postbox()
					r3d_postbox(__('Zoom In', 'real3d-flipbook-lite'), 'btnZoomIn'); // escaped in r3d_postbox()
					r3d_postbox(__('Zoom Out', 'real3d-flipbook-lite'), 'btnZoomOut'); // escaped in r3d_postbox()
					r3d_postbox(__('Table of Contents', 'real3d-flipbook-lite'), 'btnToc'); // escaped in r3d_postbox()
					r3d_postbox(__('Thumbnails', 'real3d-flipbook-lite'), 'btnThumbs'); // escaped in r3d_postbox()
					r3d_postbox(__('Share', 'real3d-flipbook-lite'), 'btnShare'); // escaped in r3d_postbox()
					r3d_postbox(__('Print', 'real3d-flipbook-lite'), 'btnPrint'); // escaped in r3d_postbox()
					r3d_postbox(__('Download PDF', 'real3d-flipbook-lite'), 'btnDownloadPdf'); // escaped in r3d_postbox()
					r3d_postbox(__('Sound', 'real3d-flipbook-lite'), 'btnSound'); // escaped in r3d_postbox()
					r3d_postbox(__('Fullscreen', 'real3d-flipbook-lite'), 'btnExpand'); // escaped in r3d_postbox()
					r3d_postbox(__('Tools', 'real3d-flipbook-lite'), 'btnTools'); // escaped in r3d_postbox()
					r3d_postbox(__('Close', 'real3d-flipbook-lite'), 'btnClose'); // escaped in r3d_postbox()
					r3d_postbox(__('Social share buttons', 'real3d-flipbook-lite'), 'share-buttons'); // escaped in r3d_postbox()

					?>
				</div>

				<script>
					var r3dMenuButtons = [
						{ name: 'currentPage', title: '<?php echo esc_js(__('Current page', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnPrev', title: '<?php echo esc_js(__('Previous page', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnNext', title: '<?php echo esc_js(__('Next page', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnZoomIn', title: '<?php echo esc_js(__('Zoom In', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnZoomOut', title: '<?php echo esc_js(__('Zoom Out', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnToc', title: '<?php echo esc_js(__('Table of Contents', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnThumbs', title: '<?php echo esc_js(__('Thumbnails', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnShare', title: '<?php echo esc_js(__('Share', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnPrint', title: '<?php echo esc_js(__('Print', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnDownloadPdf', title: '<?php echo esc_js(__('Download PDF', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnSound', title: '<?php echo esc_js(__('Sound', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnExpand', title: '<?php echo esc_js(__('Fullscreen', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnTools', title: '<?php echo esc_js(__('Tools', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnClose', title: '<?php echo esc_js(__('Close', 'real3d-flipbook-lite')); ?>' }
					];
					
					var r3dProMenuButtons = [
						{ name: 'btnFirst', title: '<?php echo esc_js(__('First page', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnLast', title: '<?php echo esc_js(__('Last page', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnAutoplay', title: '<?php echo esc_js(__('Autoplay', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnDownloadPages', title: '<?php echo esc_js(__('Download pages', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnSingle', title: '<?php echo esc_js(__('Toggle Single Page', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnSearch', title: '<?php echo esc_js(__('Search Button', 'real3d-flipbook-lite')); ?>' },
						{ name: 'search', title: '<?php echo esc_js(__('Search Input', 'real3d-flipbook-lite')); ?>' },
						{ name: 'btnBookmark', title: '<?php echo esc_js(__('Bookmark', 'real3d-flipbook-lite')); ?>' }
					];
					
				</script>

			</div>
		</div>
	</div>
</div>
<div id="edit-page-modal-wrapper">

	<div tabindex="0" class="media-modal wp-core-ui" id="edit-page-modal" style="display: none;">

		<button type="button" class="media-modal-close STX-modal-close"><span class="media-modal-icon"><span
					class="screen-reader-text"><?php esc_html_e('Close media panel', 'real3d-flipbook-lite'); ?></span></span></button>
		<div class="media-modal-content STX-modal-content">
			<div class="edit-attachment-frame mode-select hide-menu hide-router">

				<div class="edit-media-header">
					<button class="left dashicons"><span
							class="screen-reader-text"><?php esc_html_e('Edit previous media item', 'real3d-flipbook-lite'); ?></span></button>
					<button class="right dashicons"><span
							class="screen-reader-text"><?php esc_html_e('Edit next media item', 'real3d-flipbook-lite'); ?></span></button>
					<button type="button" class="media-modal-close"><span class="media-modal-icon"><span
								class="screen-reader-text"><?php esc_html_e('Close dialog', 'real3d-flipbook-lite'); ?></span></span></button>
				</div>

				<div class="media-frame-title STX-modal-title">
					<h1><?php esc_html_e('Edit page', 'real3d-flipbook-lite'); ?></h1>
				</div>

				<div class="media-frame-content STX-modal-frame-content">

					<div class="page-editor">
						<div class="page-preview">
							<div class="thumbnail thumbnail-image">

								<img id="edit-page-img" draggable="false" alt="">

								<div class="attachment-actions">

									<button type="button"
										class="button replace-page"><?php esc_html_e('Replace image', 'real3d-flipbook-lite'); ?></button>

									<button type="button"
										class="button copy-page"><?php esc_html_e('Copy page', 'real3d-flipbook-lite'); ?></button>

								</div>
							</div>
						</div>
						<div class="page-editor-sidebar">

							<div class="settings">

								<div class="setting" data-setting="title">
									<label for="edit-page-title"
										class="name"><?php esc_html_e('Title', 'real3d-flipbook-lite'); ?></label>
									<input type="text" id="edit-page-title"
										placeholder="Page title (for Table of Content)">
								</div>

								<div class="setting" data-setting="caption">
									<label for="edit-page-caption"
										class="name"><?php esc_html_e('Caption', 'real3d-flipbook-lite'); ?></label>
									<textarea type="text" id="edit-page-caption" placeholder="Page caption"></textarea>
								</div>

								<div class="setting" data-setting="html-content">
									<label for="edit-page-html-content"
										class="name"><?php esc_html_e('HTML Content', 'real3d-flipbook-lite'); ?></label>
									<textarea id="edit-page-html-content"
										placeholder="Add any HTML content to page, set style and position with inline CSS"></textarea>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="media-modal-backdrop" style="display: none;"></div>
</div>

<?php

wp_enqueue_media();
add_thickbox();

wp_enqueue_script("real3d-flipbook-iscroll");
wp_enqueue_script("real3d-flipbook-pdfjs");
wp_enqueue_script("real3d-flipbook-pdfworkerjs");
wp_enqueue_script("real3d-flipbook-pdfservice");
wp_enqueue_script("real3d-flipbook-threejs");
wp_enqueue_script("real3d-flipbook-book3");
wp_enqueue_script("real3d-flipbook-bookswipe");
wp_enqueue_script("real3d-flipbook-webgl");
wp_enqueue_script("real3d_flipbook");
wp_enqueue_style('real3d-flipbook-style');

wp_enqueue_script('alpha-color-picker');
wp_enqueue_script('sweet-alert-2');
wp_enqueue_style('sweet-alert-2');

if (defined('R3D_PAGE_EDITOR_VERSION')) {
	wp_enqueue_script('r3d-page-item');
	wp_enqueue_script('r3d-page-editor');
	wp_enqueue_style('r3d-page-editor');
}

if (defined('R3D_PDF_TOOLS_VERSION')) {
	if (version_compare(R3D_PDF_TOOLS_VERSION, '2.0', '>='))
		wp_enqueue_script('r3d-pdf-to-jpg');
}

wp_enqueue_script('real3d-flipbook-edit-post');
wp_enqueue_style('alpha-color-picker');
wp_enqueue_style('real3d-flipbook-admin');

$ajax_nonce = wp_create_nonce("saving-real3d-flipbook");



$flipbook['security'] = $ajax_nonce;

$flipbook_global = get_option("real3dflipbook_global");

$flipbook_global_defaults = r3dfb_getDefaults();

$flipbook['globals'] = r3d_array_merge_deep($flipbook_global_defaults, $flipbook_global);
$flipbook['globals']['plugins_url'] = plugins_url();
wp_localize_script('real3d-flipbook-edit-post', 'options', $flipbook);

