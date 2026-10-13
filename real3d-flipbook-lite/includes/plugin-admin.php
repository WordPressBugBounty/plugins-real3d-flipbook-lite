<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly
}

$r3d_globals_settings = get_option("real3dflipbook_global");

if (!$r3d_globals_settings)
	r3dfb_setDefaults();

function r3dfb_setDefaults()
{
	$defaults = r3dfb_getDefaults();
	delete_option("real3dflipbook_global");
	add_option("real3dflipbook_global", $defaults);
}

function r3d_sanitize_array($input)
{
	foreach ($input as $key => $value) {
		if (is_array($value)) {
			$input[$key] = sanitize_my_options($value);
		} else {
			$input[$key] = sanitize_text_field($value);
			$input[$key] = wp_kses_post($value);
		}
	}
	return $input;
}

add_action('wp_ajax_r3d_save_general', 'r3d_save_general_callback');

function r3d_save_general_callback()
{

	check_ajax_referer('r3d_nonce', 'security');

	if (!current_user_can('manage_options')) {
		wp_die(esc_html__('You do not have permission to perform this action.', 'real3d-flipbook-lite'), 403);
	}

	unset($_POST['security'], $_POST['action']);

	$allowed_keys = array_merge(
		array_keys(r3dfb_getDefaults()),
		array_keys((array) get_option('real3dflipbook_global', array())),
		array('manageFlipbooks', 'btnBackgroundHover', 'lockedPageSize', 'previewTitle', 'previewDescription', 'previewButtonText', 'previewButtonUrl', 'sideMenuOverMenu', 'sideMenuOverMenu2', 'socialShare')
	);
	$allowed_keys = apply_filters('r3d_global_settings_keys', $allowed_keys);

	$data = array_intersect_key($_POST, array_flip($allowed_keys));

	if (isset($data['slug']) && (get_option('real3dflipbook_global')['slug'] ?? '') != $data['slug']) {
		update_option('r3d_flush_rewrite_rules', true);
	}

	update_option('real3dflipbook_global', $data);




	if (isset($data['manageFlipbooks'])) {

		$role = sanitize_text_field($data['manageFlipbooks']);

		$capability_map = array(
			'Administrator' => 'activate_plugins',
			'Editor'        => 'publish_pages',
			'Author'        => 'publish_posts',
		);

		$capability = $capability_map[$role] ?? 'publish_posts';

		update_option('real3dflipbook_capability', $capability);
	}

	wp_die();
}

add_action('wp_ajax_r3d_reset_general', 'r3d_reset_general_callback');

function r3d_reset_general_callback()
{

	check_ajax_referer('r3d_nonce', 'security');

	if (!current_user_can('manage_options')) {
		wp_die(esc_html__('You do not have permission to perform this action.', 'real3d-flipbook-lite'), 403);
	}

	r3dfb_setDefaults();

	wp_die();
}

add_action('wp_ajax_r3d_save_thumbnail', 'r3dfb_save_thumbnail_callback');

function r3dfb_save_thumbnail_callback()
{
	// Security & permission
	check_ajax_referer('saving-real3d-flipbook', 'security');
	if (!current_user_can('upload_files')) {
		wp_send_json_error(['message' => esc_html__('You do not have permission to upload files.', 'real3d-flipbook-lite')]);
	}

	// Flipbook ID check
	$id = isset($_POST['id']) ? absint(sanitize_text_field(wp_unslash($_POST['id']))) : 0;
	if ($id <= 0) {
		wp_send_json_error(['message' => esc_html__('Invalid flipbook ID.', 'real3d-flipbook-lite')]);
	}

	$book = get_option('real3dflipbook_' . $id);
	if (!$book) {
		wp_send_json_error(['message' => esc_html__('The specified flipbook does not exist.', 'real3d-flipbook-lite')]);
	}

	// Upload paths
	$upload_dir = wp_upload_dir();
	if (!empty($upload_dir['error'])) {
		wp_send_json_error(['message' => esc_html__('Upload directory error: ', 'real3d-flipbook-lite') . esc_html($upload_dir['error'])]);
	}

	$book_folder = $upload_dir['basedir'] . "/real3d-flipbook/flipbook_{$id}/";

	if (!wp_mkdir_p($book_folder) || !wp_is_writable($book_folder)) {
		/* translators: %s: folder path */
		wp_send_json_error(['message' => esc_html(sprintf(__('Cannot write to folder: %s', 'real3d-flipbook-lite'), $book_folder))]);
	}

	// Validate upload
	if (empty($_FILES['file']['tmp_name'])) {
		wp_send_json_error(['message' => esc_html__('No file uploaded.', 'real3d-flipbook-lite')]);
	}

	// File size (2MB)
	if ($_FILES['file']['size'] > 2 * 1024 * 1024) {
		wp_send_json_error(['message' => esc_html__('File size exceeds the maximum limit.', 'real3d-flipbook-lite')]);
	}

	// Extension & image check
	$allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
	$filename = sanitize_file_name($_FILES['file']['name']);
	$extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
	if (!in_array($extension, $allowed_extensions)) {
		wp_send_json_error(['message' => esc_html__('Invalid file extension.', 'real3d-flipbook-lite')]);
	}
	if (getimagesize($_FILES['file']['tmp_name']) === false) {
		wp_send_json_error(['message' => esc_html__('File is not a valid image.', 'real3d-flipbook-lite')]);
	}

	// Unique filename
	$file = $_FILES['file'];
	$file['name'] = 'thumbnail_' . time() . '_' . wp_generate_password(4, false, false) . '.' . $extension;

	// Move file
	require_once ABSPATH . 'wp-admin/includes/file.php';
	$book_dir = function ($dirs) use ($id) {
		$dirs['subdir'] = "/real3d-flipbook/flipbook_{$id}";
		$dirs['path'] = $dirs['basedir'] . $dirs['subdir'];
		$dirs['url'] = $dirs['baseurl'] . $dirs['subdir'];
		return $dirs;
	};
	add_filter('upload_dir', $book_dir);
	$moved = wp_handle_upload($file, ['test_form' => false]);
	remove_filter('upload_dir', $book_dir);
	if (empty($moved['url']) || !empty($moved['error'])) {
		wp_send_json_error(['message' => esc_html__('Failed to save the uploaded file.', 'real3d-flipbook-lite')]);
	}
	$thumbnail_url = $moved['url'];

	// Remove old thumbnail
	if (!empty($book['lightboxThumbnailUrl'])) {
		$thumb_path = function ($url) use ($upload_dir) {
			$file = realpath(str_replace($upload_dir['baseurl'], $upload_dir['basedir'], preg_replace('/[?#].*/s', '', (string) $url)));
			return $file ? wp_normalize_path($file) : '';
		};
		$old_file = $thumb_path($book['lightboxThumbnailUrl']);
		$old_name = basename($old_file);
		$book_root = realpath($book_folder);
		$deletable = $old_file && $book_root && is_file($old_file)
			&& strpos($old_file, trailingslashit(wp_normalize_path($book_root))) === 0
			&& preg_match('/^thumbnail(_\d+_[a-z0-9]+(-\d+)?)?\.(jpe?g|png|gif|webp)$/i', $old_name);
		if ($deletable) {
			foreach ((array) get_option('real3dflipbooks_ids', array()) as $other_id) {
				if ((int) $other_id === $id) {
					continue;
				}
				$other = get_option('real3dflipbook_' . $other_id);
				$other_url = is_array($other) && !empty($other['lightboxThumbnailUrl']) ? (string) $other['lightboxThumbnailUrl'] : '';
				if ($other_url && basename(preg_replace('/[?#].*/s', '', $other_url)) === $old_name && $thumb_path($other_url) === $old_file) {
					$deletable = false;
					break;
				}
			}
		}
		if ($deletable) {
			wp_delete_file($old_file);
		}
	}

	// Save option
	$book['lightboxThumbnailUrl'] = esc_url($thumbnail_url);
	update_option('real3dflipbook_' . $id, $book);

	wp_send_json_success(['thumbnail_url' => $thumbnail_url]);
}

add_action('admin_init', 'r3dfb_dismiss_pdf_links_notice');

function r3dfb_dismiss_pdf_links_notice()
{
	if (!isset($_GET['r3d_dismiss_pdf_links'])) {
		return;
	}

	if (!current_user_can('manage_options')) {
		return;
	}

	check_admin_referer('r3d_dismiss_pdf_links');

	update_option('r3dfb_pdf_links_notice_dismissed', '1', false);

	wp_safe_redirect(remove_query_arg(array('r3d_dismiss_pdf_links', '_wpnonce')));
	exit;
}

add_action('admin_notices', 'r3dfb_pdf_links_notice');

// Shown only while real3dflipbook_global has no stored convertPDFLinks value, which
// is the case for sites that upgraded from a version predating the option. Saving
// the settings page writes a value and clears the notice, as does Dismiss.
function r3dfb_pdf_links_notice()
{
	global $pagenow, $post_type;

	if (!current_user_can('manage_options')) {
		return;
	}

	if (get_option('r3dfb_pdf_links_notice_dismissed')) {
		return;
	}

	$page = isset($_GET['page']) ? sanitize_text_field(wp_unslash($_GET['page'])) : '';
	$on_r3d_screen = ('plugins.php' === $pagenow)
		|| (in_array($pagenow, array('edit.php', 'post.php', 'post-new.php'), true) && 'r3d' === $post_type)
		|| (0 === strpos($page, 'real3d_flipbook'));

	if (!$on_r3d_screen) {
		return;
	}

	$globals = get_option('real3dflipbook_global');
	if (!is_array($globals) || array_key_exists('convertPDFLinks', $globals)) {
		return;
	}

	printf(
		'<div class="notice notice-warning"><p><strong>%1$s</strong> %2$s</p><p><a href="%3$s" class="button button-secondary">%4$s</a> &nbsp; <a href="%5$s">%6$s</a></p></div>',
		esc_html__('Real3D Flipbook:', 'real3d-flipbook-lite'),
		esc_html__('Opening PDF links as flipbooks is now off by default. This site was using the previous default, so links to PDF files now open the file instead of a flipbook. You can switch it back on under Settings > Overrides.', 'real3d-flipbook-lite'),
		esc_url(admin_url('admin.php?page=real3d_flipbook_settings')),
		esc_html__('Open settings', 'real3d-flipbook-lite'),
		esc_url(wp_nonce_url(add_query_arg('r3d_dismiss_pdf_links', '1'), 'r3d_dismiss_pdf_links')),
		esc_html__('Dismiss', 'real3d-flipbook-lite')
	);
}
