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

    $post_data = r3d_sanitize_array($_POST);
    $id = intval($post_data['id']);
    $book = get_option('real3dflipbook_' . $id);
    $upload_dir = wp_upload_dir();
    $booksFolder = $upload_dir['basedir'] . '/real3d-flipbook/';
    $bookFolder = $booksFolder . 'flipbook_' . $id . '/';

    if (!file_exists($booksFolder)) {
        mkdir($booksFolder, 0777, true);
    }

    if (!file_exists($bookFolder)) {
        mkdir($bookFolder, 0777, true);
    }

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file_tmp = $_FILES['file']['tmp_name'];
        $file_name = sanitize_file_name($_FILES['file']['name']);
        $file_dest = $bookFolder . $file_name;

        if (move_uploaded_file($file_tmp, $file_dest)) {
            $thumbnail_url = esc_url($upload_dir['baseurl'] . '/real3d-flipbook/flipbook_' . $id . '/' . $file_name);
            echo $thumbnail_url;

            // Update the flipbook option with the new thumbnail URL
            $book['lightboxThumbnailUrl'] = $thumbnail_url;
            update_option('real3dflipbook_' . $id, $book);
        } else {
            echo "Error saving the uploaded file.";
        }
    } else {
        echo "Error uploading the file.";
    }

    wp_die();
}