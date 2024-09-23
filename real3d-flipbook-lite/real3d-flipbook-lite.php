<?php

/*
	Plugin Name: Real3D Flipbook PDF Viewer Lite
	Plugin URI: https://wordpress.org/plugins/real3d-flipbook-lite/
	Description: Realistic 3D FlipBook, PDF Viewer, PDF Embedder - create realistic 3D flipbook from PDF or images. 
	Version: 4.6
	Author: creativeinteractivemedia
	Author URI: http://codecanyon.net/user/creativeinteractivemedia
	*/

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

define('REAL3D_FLIPBOOK_VERSION', '4.6');
define('REAL3D_FLIPBOOK_FILE', __FILE__);

include_once(plugin_dir_path(__FILE__) . '/includes/Real3DFlipbook.php');