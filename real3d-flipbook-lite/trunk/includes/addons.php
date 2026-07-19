<?php if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly
}

$urls = [
	"bundle" => [
		"info" => "https://real3dflipbook.com/addons/"
	],
	"pdfTools" => [
		"info" => "https://real3dflipbook.com/pdf-tools-addon/"
	],
	"pageEditor" => [
		"info" => "https://real3dflipbook.com/page-editor-addon-for-real-3d-flipbook/"
	],
	"bookShelf" => [
		"info" => "https://real3dflipbook.com/real3d-flipbook-bookshelf-addon/"
	],
	"elementor" => [
		"info" => "https://real3dflipbook.com/elementor-addon/"
	],
	"wooCommerce" => [
		"info" => "https://real3dflipbook.com/woocommerce-addon/"
	],
	"wpBakery" => [
		"info" => "https://real3dflipbook.com/wpbakery-addon/"
	],
	"previewMode" => [
		"info" => "https://real3dflipbook.com/preview-mode-addon/"
	],
];

// Lite renders this page only when Pro is not active; Pro renders it otherwise.
$r3d_is_pro = !function_exists('r3d_lite_pro_active') || r3d_lite_pro_active();

function createAddon($name, $icon, $title, $description, $urls, $isInstalled = false, $requiresPro = false)
{
	$infoUrl = isset($urls[$name]['info']) ? esc_url($urls[$name]['info']) : '';
?>
	<div class="r3d-addon-card">
		<span class="dashicons dashicons-<?php echo esc_attr($icon); ?>"></span>
		<h3><?php echo esc_html($title); ?></h3>
		<p><?php echo esc_html($description); ?></p>
		<div class="r3d-addon-actions">
			<?php if (!empty($infoUrl)) : ?>
				<a class="button button-secondary" href="<?php echo esc_url($urls[$name]['info']); ?>" target="_blank">
					<?php esc_html_e('More Info', 'real3d-flipbook'); ?>
				</a>
			<?php endif; ?>
			<?php if ($requiresPro) : ?>
				<a class="r3d-addon-pro" href="<?php echo esc_url(admin_url('admin.php?page=real3d_flipbook_upgrade')); ?>">
					<?php esc_html_e('Requires PRO', 'real3d-flipbook'); ?>
				</a>
			<?php endif; ?>
			<?php if ($isInstalled) : ?>
				<span class="r3d-addon-installed">
					<span class="dashicons dashicons-yes"></span><?php esc_html_e('Installed', 'real3d-flipbook'); ?>
				</span>
			<?php endif; ?>
		</div>
	</div>
<?php
}
?>

<div class="wrap r3d_wrap r3d-addons">

	<style>
	.r3d_wrap.r3d-addons { max-width: 1060px; margin: 0 auto; }
	.r3d-addons .r3d-addons-hero { text-align: center; padding: 40px 20px 10px; }
	.r3d-addons .r3d-addons-hero h1 { font-size: 2em; margin: 0 0 10px; }
	.r3d-addons .r3d-addons-hero p { font-size: 1.1em; color: #50575e; margin: 0; }
	.r3d-addons .r3d-bundle { position: relative; background: #fff; border: 1px solid #c3d698; border-radius: 8px; padding: 28px; margin: 30px 0 16px; text-align: center; }
	.r3d-addons .r3d-bundle-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #84af05; color: #fff; font-size: 12px; font-weight: 600; padding: 3px 14px; border-radius: 999px; white-space: nowrap; }
	.r3d-addons .r3d-bundle h3 { margin: 0 0 6px; font-size: 1.3em; }
	.r3d-addons .r3d-bundle p { margin: 0 auto 16px; color: #50575e; max-width: 640px; }
	.r3d-addons .r3d-addon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin: 0 0 40px; }
	.r3d-addons .r3d-addon-card { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; }
	.r3d-addons .r3d-addon-card > .dashicons { color: #2271b1; font-size: 26px; width: 26px; height: 26px; margin-bottom: 10px; }
	.r3d-addons .r3d-addon-card h3 { margin: 0 0 6px; font-size: 1em; }
	.r3d-addons .r3d-addon-card p { margin: 0 0 14px; color: #50575e; flex: 1; }
	.r3d-addons .r3d-addon-actions { display: flex; align-items: center; gap: 10px; }
	.r3d-addons .r3d-addon-installed { color: #3f5212; background: #f2f7e2; border: 1px solid #c3d698; border-radius: 999px; padding: 3px 12px 3px 6px; font-size: 12px; display: inline-flex; align-items: center; }
	.r3d-addons .r3d-addon-installed .dashicons { color: #84af05; font-size: 16px; width: 16px; height: 16px; margin-right: 2px; }
	.r3d-addons .r3d-addon-pro { color: #8a6d3b; background: #fcf9e8; border: 1px solid #f0e0a0; border-radius: 999px; padding: 3px 12px; font-size: 12px; text-decoration: none; }
	.r3d-addons .r3d-addon-pro:hover { border-color: #dbc77c; color: #6d5427; }
	</style>

	<div class="r3d-addons-hero">
		<h1><?php esc_html_e('Real3D Flipbook Addons', 'real3d-flipbook'); ?></h1>
		<p><?php esc_html_e('Make Real3D Flipbook more powerful with Addons', 'real3d-flipbook'); ?></p>
	</div>

	<div class="r3d-bundle">
		<div class="r3d-bundle-badge"><?php esc_html_e('Save 57%', 'real3d-flipbook'); ?></div>
		<h3><?php esc_html_e('Addon Bundle', 'real3d-flipbook'); ?></h3>
		<p><?php esc_html_e('All 7 add-ons: Book Shelf, PDF Tools, Page Editor, WooCommerce, Elementor, WPBakery, Preview Mode', 'real3d-flipbook'); ?></p>
		<a class="button button-primary button-large" href="<?php echo esc_url($urls['bundle']['info']); ?>" target="_blank">
			<?php esc_html_e('Get the Bundle', 'real3d-flipbook'); ?>
		</a>
	</div>

	<div class="r3d-addon-grid">
		<?php
		createAddon('pageEditor', 'edit', __('Page Editor Addon', 'real3d-flipbook'), __('Add links, videos, sounds, Youtube, Vimeo and more to flipbook pages easily with visual editor', 'real3d-flipbook'), $urls, defined('R3D_PAGE_EDITOR_VERSION'), !$r3d_is_pro);
		createAddon('wooCommerce', 'cart', __('WooCommerce Addon', 'real3d-flipbook'), __('Display flipbook on WooCommerce single product page', 'real3d-flipbook'), $urls, defined('R3D_WOO_VERSION'));
		createAddon('pdfTools', 'performance', __('PDF Tools Addon', 'real3d-flipbook'), __('Optimize PDF flipbooks for faster loading by converting PDF to images and JSON', 'real3d-flipbook'), $urls, defined('R3D_PDF_TOOLS_VERSION'), !$r3d_is_pro);
		createAddon('elementor', 'welcome-widgets-menus', __('Elementor Addon', 'real3d-flipbook'), __('Use Real3D Flipbook with Elementor as an element', 'real3d-flipbook'), $urls, class_exists("Elementor_Real3D_Flipbook"));
		createAddon('bookShelf', 'book-alt', __('Bookshelf Addon', 'real3d-flipbook'), __('Create responsive book shelves with flipbooks', 'real3d-flipbook'), $urls, class_exists("Bookshelf_Addon"));
		createAddon('wpBakery', 'layout', __('WPBakery Addon', 'real3d-flipbook'), __('Use Real3D Flipbook with WPBakery page builder', 'real3d-flipbook'), $urls, class_exists("Real3DFlipbook_VCAddon"));
		createAddon('previewMode', 'lock', __('Preview Mode Addon', 'real3d-flipbook'), __('Show first x number of pages based on user login status', 'real3d-flipbook'), $urls, class_exists("R3D_Preview"));
		?>
	</div>

</div>

<?php

wp_enqueue_style('real3d-flipbook-admin');
