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

	unset($_POST['security'], $_POST['action']);

	$data = $_POST;

	if (isset($data['slug']) && (get_option('real3dflipbook_global')['slug'] ?? '') != $data['slug']) {
		update_option('r3d_flush_rewrite_rules', true);
	}

	update_option('real3dflipbook_global', $data);

	if (isset($data["manageFlipbooks"])) {
		switch ($data["manageFlipbooks"]) {
			case "Administrator":
				update_option("real3dflipbook_capability", "activate_plugins");
				break;
			case "Editor":
				update_option("real3dflipbook_capability", "publish_pages");
				break;
			default:
				update_option("real3dflipbook_capability", "publish_posts");
		}
	}

	wp_die();
}

add_action('wp_ajax_r3d_reset_general', 'r3d_reset_general_callback');

function r3d_reset_general_callback()
{

	check_ajax_referer('r3d_nonce', 'security');

	r3dfb_setDefaults();

	wp_die();
}

add_action('wp_ajax_r3d_save_thumbnail', 'r3dfb_save_thumbnail_callback');
function r3dfb_save_thumbnail_callback()
{
	check_ajax_referer('saving-real3d-flipbook', 'security');

	$id = isset($_POST['id']) ? intval(sanitize_text_field(wp_unslash($_POST['id']))) : 0;

	$book = get_option('real3dflipbook_' . $id);

	if (!$book) {
		wp_send_json_error(['message' => esc_html__('The specified flipbook does not exist.', 'real3d-flipbook')]);
	}

	$upload_dir = wp_upload_dir();
	$booksFolder = $upload_dir['basedir'] . '/real3d-flipbook/';
	$bookFolder = $booksFolder . 'flipbook_' . $id . '/';

	if (!is_dir($booksFolder) && !wp_mkdir_p($booksFolder)) {
		/* translators: %s: the folder path */
		wp_send_json_error(['message' => esc_html(sprintf(__('Failed to create folder: %s', 'real3d-flipbook'), $booksFolder))]);
	}

	if (!is_dir($bookFolder) && !wp_mkdir_p($bookFolder)) {
		/* translators: %s: the folder path */
		wp_send_json_error(['message' => esc_html(sprintf(__('Failed to create folder: %s', 'real3d-flipbook'), $bookFolder))]);
	}

	if (isset($_FILES['file']) && isset($_FILES['file']['error']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
		$file = $_FILES['file'];

		$overrides = [
			'test_form' => false,
			'mimes' => [
				'jpg|jpeg|jpe' => 'image/jpeg',
				'png' => 'image/png',
				'gif' => 'image/gif',
				'webp' => 'image/webp',
			],
		];

		$file_data = wp_handle_upload($file, $overrides);

		if (isset($file_data['error'])) {
			wp_send_json_error(['message' => esc_html($file_data['error'])]);
		}

		$thumbnail_url = esc_url($file_data['url']);

		$book['lightboxThumbnailUrl'] = $thumbnail_url;
		update_option('real3dflipbook_' . $id, $book);

		wp_send_json_success(['thumbnail_url' => $thumbnail_url]);
	} else {
		wp_send_json_error(['message' => esc_html__('Error uploading the file.', 'real3d-flipbook')]);
	}
}
