<?php

// Lite-dependency guard for the requires-lite build of Real3D Flipbook PRO. Returns
// true if Pro may load, or false (after queuing an admin notice) if Lite is missing or
// too old. Not loaded in the standalone build (Pro bundles its own includes/r3d-core.php).

if (!defined('REAL3D_FLIPBOOK_REQUIRES_LITE')) {
	define('REAL3D_FLIPBOOK_REQUIRES_LITE', '4.20.0.14');
}

$r3d_lite = 'real3d-flipbook-lite/real3d-flipbook-lite.php';

$r3d_lite_active = in_array($r3d_lite, (array) get_option('active_plugins', array()), true);
if (!$r3d_lite_active && is_multisite()) {
	$r3d_network = (array) get_site_option('active_sitewide_plugins', array());
	$r3d_lite_active = isset($r3d_network[$r3d_lite]);
}

if (!$r3d_lite_active) {
	add_action('admin_notices', function () {
		if (!current_user_can('activate_plugins')) {
			return;
		}
		echo '<div class="notice notice-error"><p><strong>Real3D Flipbook PRO</strong> requires the free '
			. '<strong>Real3D Flipbook Lite</strong> plugin to be installed and active. '
			. '<a href="' . esc_url(self_admin_url('plugin-install.php?s=real3d-flipbook-lite&tab=search&type=term')) . '">Install it now</a>.</p></div>';
	});
	return false;
}

$r3d_lite_file = WP_PLUGIN_DIR . '/' . $r3d_lite;
$r3d_lite_ver  = is_readable($r3d_lite_file)
	? get_file_data($r3d_lite_file, array('Version' => 'Version'))['Version']
	: '0';

if (version_compare($r3d_lite_ver, REAL3D_FLIPBOOK_REQUIRES_LITE, '<')) {
	add_action('admin_notices', function () use ($r3d_lite_ver) {
		if (!current_user_can('activate_plugins')) {
			return;
		}
		echo '<div class="notice notice-error"><p><strong>Real3D Flipbook PRO</strong> requires '
			. '<strong>Real3D Flipbook Lite ' . esc_html(REAL3D_FLIPBOOK_REQUIRES_LITE) . '</strong> or newer'
			. ($r3d_lite_ver !== '0' ? ' (you have ' . esc_html($r3d_lite_ver) . ')' : '') . '. '
			. '<a href="' . esc_url(self_admin_url('plugins.php')) . '">Update Lite</a>.</p></div>';
	});
	return false;
}

return true;
