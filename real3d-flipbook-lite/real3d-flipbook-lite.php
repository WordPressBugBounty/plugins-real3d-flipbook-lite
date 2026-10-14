<?php

/*
	Plugin Name: Real3D Flipbook Lite
	Plugin URI: https://real3dflipbook.com/wordpress/
	Description: Realistic 3D FlipBook, PDF Viewer, PDF Embedder - create realistic 3D flipbook from PDF or images. 
	Version: 5.7.1
	Author: creativeinteractivemedia
	Author URI: https://real3dflipbook.com/
	License: GPLv2 or later
	License URI: https://www.gnu.org/licenses/gpl-2.0.html
	Text Domain: real3d-flipbook-lite
	Domain Path: /languages
	*/

if (!defined('ABSPATH')) {
	exit;
}

// If the Pro plugin is active it provides the base; Lite stays idle to avoid
// class/constant/post-type conflicts. (Pro requires Lite via its Requires Plugins header.)
if (!function_exists('r3d_lite_pro_active')) {
	function r3d_lite_pro_active() {
		$pro = 'real3d-flipbook/real3d-flipbook.php';
		if (in_array($pro, (array) get_option('active_plugins', array()), true)) {
			return true;
		}
		if (is_multisite()) {
			$network = (array) get_site_option('active_sitewide_plugins', array());
			if (isset($network[$pro])) {
				return true;
			}
		}
		return false;
	}
}
// Shared core helpers (r3dfb_getDefaults, r3d_array_merge_deep, …) live only in Lite.
// Load them even when Lite idles for an active Pro, so Pro depends on Lite for them.
require_once __DIR__ . '/includes/r3d-core.php';

if (r3d_lite_pro_active()) {
	return; // Pro active → Lite idle (r3d-core above stays loaded for Pro).
}

if (!function_exists('r3d_fs')) {
	// Create a helper function for easy SDK access.
	function r3d_fs()
	{
		global $r3d_fs;

		if (!isset($r3d_fs)) {
			// Include Freemius SDK.
			require_once dirname(__FILE__) . '/freemius/start.php';

			$r3d_fs = fs_dynamic_init(array(
				'id'                  => '13754',
				'slug'                => 'real3d-flipbook-lite',
				'type'                => 'plugin',
				'public_key'          => 'pk_ac0809f567e096fcd1cce6f0e3af1',
				'is_premium'          => false,
				'has_addons'          => false,
				'has_paid_plans'      => false,
				'menu'                => array(
					'slug'           => 'edit.php?post_type=r3d',
					'account'        => false,
					'first-path' => 'admin.php?page=real3d_flipbook_help'
				),
			));
		}

		return $r3d_fs;
	}

	// Init Freemius.
	r3d_fs();
	// Signal that SDK was initiated.
	do_action('r3d_fs_loaded');
}

define('REAL3D_FLIPBOOK_VERSION', '5.7.1');
define('REAL3D_FLIPBOOK_FILE', __FILE__);

include_once(plugin_dir_path(__FILE__) . '/includes/Real3DFlipbook.php');

add_action('admin_init', 'r3d_lite_review_install_date');

function r3d_lite_review_install_date()
{
	if (!get_option('r3d_lite_installed')) {
		add_option('r3d_lite_installed', current_time('mysql'), '', 'no');
	}
}

add_action('admin_notices', 'r3d_lite_review_notice');

function r3d_lite_review_notice()
{
	if (!current_user_can('manage_options')) {
		return;
	}

	$screen = function_exists('get_current_screen') ? get_current_screen() : null;
	if (!$screen || !(($screen->post_type === 'r3d' && $screen->base !== 'post') || strpos($screen->id, 'real3d_flipbook_') !== false)) {
		return;
	}

	$user_id = get_current_user_id();
	if (get_user_meta($user_id, 'r3d_review_done', true)) {
		return;
	}

	$shown = (int) get_user_meta($user_id, 'r3d_review_shown', true);
	if ($shown && time() - $shown < WEEK_IN_SECONDS) {
		return;
	}

	$today = current_time('Y-m-d');
	$installed = (string) get_option('r3d_lite_installed');
	if ($installed === '' || substr($installed, 0, 10) === $today) {
		return;
	}

	$oldest = get_posts(array(
		'post_type'              => 'r3d',
		'post_status'            => array('publish', 'future', 'draft', 'pending', 'private'),
		'orderby'                => 'date',
		'order'                  => 'ASC',
		'posts_per_page'         => 1,
		'no_found_rows'          => true,
		'update_post_meta_cache' => false,
		'update_post_term_cache' => false,
	));
	if (empty($oldest) || substr($oldest[0]->post_date, 0, 10) === $today) {
		return;
	}

	update_user_meta($user_id, 'r3d_review_shown', time());

	?>
	<div class="notice notice-info is-dismissible r3d-review-notice">
		<p><?php esc_html_e('Enjoying Real3D Flipbook? A quick review on WordPress.org helps other people find it.', 'real3d-flipbook-lite'); ?></p>
		<p>
			<a class="button button-primary" href="https://wordpress.org/support/plugin/real3d-flipbook-lite/reviews/#new-post" target="_blank" rel="noopener noreferrer" data-r3d-review="done"><?php esc_html_e('Leave a review', 'real3d-flipbook-lite'); ?></a>
			<a href="#" style="margin-left: 12px;" data-r3d-review="later"><?php esc_html_e('Maybe later', 'real3d-flipbook-lite'); ?></a>
			<a href="#" style="margin-left: 12px;" data-r3d-review="never"><?php esc_html_e("Don't ask again", 'real3d-flipbook-lite'); ?></a>
		</p>
	</div>
	<?php

	wp_register_script('r3d-review-notice', false, array('jquery'), REAL3D_FLIPBOOK_VERSION, true);
	wp_enqueue_script('r3d-review-notice');
	wp_add_inline_script(
		'r3d-review-notice',
		'jQuery(function ($) {' .
			'$(document).on("click", ".r3d-review-notice [data-r3d-review]", function (e) {' .
				'var choice = $(this).data("r3d-review");' .
				'if (choice !== "done") e.preventDefault();' .
				'if (choice !== "later") $.post(ajaxurl, { action: "r3d_review_notice", nonce: ' . wp_json_encode(wp_create_nonce('r3d_review_notice')) . ' });' .
				'$(this).closest(".r3d-review-notice").fadeOut(200);' .
			'});' .
		'});'
	);
}

add_action('wp_ajax_r3d_review_notice', 'r3d_lite_review_notice_done');

function r3d_lite_review_notice_done()
{
	check_ajax_referer('r3d_review_notice', 'nonce');
	update_user_meta(get_current_user_id(), 'r3d_review_done', 1);
	wp_send_json_success();
}