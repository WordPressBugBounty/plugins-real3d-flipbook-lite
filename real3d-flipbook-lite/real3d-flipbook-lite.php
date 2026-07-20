<?php

/*
	Plugin Name: Real3D Flipbook PDF Viewer
	Plugin URI: https://wordpress.org/plugins/real3d-flipbook-lite/
	Description: Realistic 3D FlipBook, PDF Viewer, PDF Embedder - create realistic 3D flipbook from PDF or images. 
	Version: 5.0.3
	Author: creativeinteractivemedia
	Author URI: http://codecanyon.net/user/creativeinteractivemedia
	License: GPLv2 or later
	License URI: https://www.gnu.org/licenses/gpl-2.0.html
	Text Domain: real3d-flipbook
	Domain Path: /languages
	*/

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

define('REAL3D_FLIPBOOK_VERSION', '5.0.3');
define('REAL3D_FLIPBOOK_FILE', __FILE__);

include_once(plugin_dir_path(__FILE__) . '/includes/Real3DFlipbook.php');