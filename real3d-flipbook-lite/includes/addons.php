<?php if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly
}

$urls = [
	"bundle" => [
		"buy" => "https://checkout.freemius.com/mode/dialog/bundle/15216/plan/25359/",
	],
	"pdfTools" => [
		"buy" => "https://checkout.freemius.com/mode/dialog/plugin/15120/plan/25254/licenses/1/",
		"info" => "https://real3dflipbook.com/pdf-tools-addon/"
	],
	"pageEditor" => [
		"buy" => "https://checkout.freemius.com/mode/dialog/plugin/15210/plan/25350/",
		"info" => "https://real3dflipbook.com/page-editor-addon-for-real-3d-flipbook/"
	],
	"bookShelf" => [
		"buy" => "https://checkout.freemius.com/mode/dialog/plugin/15206/plan/25346/",
		"info" => "https://real3dflipbook.com/real3d-flipbook-bookshelf-addon/"
	],
	"elementor" => [
		"buy" => "https://checkout.freemius.com/mode/dialog/plugin/15213/plan/25354/",
		"info" => "https://real3dflipbook.com/elementor-addon/"
	],
	"wooCommerce" => [
		"buy" => "https://checkout.freemius.com/mode/dialog/plugin/15212/plan/25351/",
		"info" => "https://real3dflipbook.com/woocommerce-addon/"
	],
	"wpBakery" => [
		"buy" => "https://checkout.freemius.com/mode/dialog/plugin/15214/plan/25355/",
		"info" => "https://real3dflipbook.com/wpbakery-addon/"
	],
	"previewMode" => [
		"buy" => "https://checkout.freemius.com/mode/dialog/plugin/15215/plan/25358/",
		"info" => "https://real3dflipbook.com/preview-mode-addon/"
	],
];




function createAddon($name, $title, $description, $urls, $isInstalled = false)
{
	$infoUrl = isset($urls[$name]['info']) ? esc_url($urls[$name]['info']) : '';
?>
	<div class="addons-banner-block-item">
		<div class="addons-banner-block-item-content">
			<h3><?php echo esc_html($title); ?></h3>
			<p><?php echo esc_html($description); ?></p>

			<?php if (!empty($infoUrl)) : ?>
				<a class="button button-secondary button-large addons-button"
					href="<?php echo esc_url($urls[$name]['info']); ?>" target="_blank">
					<?php esc_html_e('More Info', 'real3d-flipbook'); ?>
				</a>
			<?php endif; ?>

			<?php if (!$isInstalled) : ?>
				<a class="button button-primary button-large addons-button" href="<?php echo esc_url($urls[$name]['buy']); ?>"
					target="_blank">
					<?php esc_html_e('Buy Now', 'real3d-flipbook'); ?>
				</a>
			<?php else : ?>
				<span class="button disabled button-primary button-large addons-button">
					<?php esc_html_e('Installed', 'real3d-flipbook'); ?>
				</span>
			<?php endif; ?>
		</div>
	</div>
<?php
}



?>

<div class='wrap r3d_wrap'>

	<h3><?php esc_html_e('Real3D Flipbook Addons', 'real3d-flipbook'); ?></h3>

	<div class="addons">

		<div class="addons-block">

			<p><?php esc_html_e('Make Real3D Flipbook more powerful with Addons', 'real3d-flipbook'); ?></p>

			<div class="addons-banner-block-items">

				<?php


				createAddon(
					'bundle',
					__('Addon Bundle', 'real3d-flipbook'),
					__('All 7 add-ons: Book Shelf, PDF Tools, Page Editor, WooCommerce, Elementor, WPBakery, Preview Mode, 57% OFF', 'real3d-flipbook'),
					$urls,
					false
				);

				createAddon(
					'pageEditor',
					__('Page Editor Addon', 'real3d-flipbook'),
					__('Add links, videos, sounds, Youtube, Vimeo and more to flipbook pages easily with visual editor', 'real3d-flipbook'),
					$urls,
					defined('R3D_PAGE_EDITOR_VERSION')
				);

				createAddon(
					'wooCommerce',
					__('WooCommerce Addon', 'real3d-flipbook'),
					__('Display flipbook on WooCommerce single product page', 'real3d-flipbook'),
					$urls,
					defined('R3D_WOO_VERSION')
				);

				createAddon(
					'pdfTools',
					__('PDF Tools Addon', 'real3d-flipbook'),
					__('Optimize PDF flipbooks for faster loading by converting PDF to images and JSON', 'real3d-flipbook'),
					$urls,
					defined('R3D_PDF_TOOLS_VERSION')
				);

				createAddon(
					'elementor',
					__('Elementor Addon', 'real3d-flipbook'),
					__('Use Real3D Flipbook with Elementor as an element', 'real3d-flipbook'),
					$urls,
					class_exists("Elementor_Real3D_Flipbook")
				);

				createAddon(
					'bookShelf',
					__('Bookshelf Addon', 'real3d-flipbook'),
					__('Create responsive book shelves with flipbooks', 'real3d-flipbook'),
					$urls,
					class_exists("Bookshelf_Addon")
				);

				createAddon(
					'wpBakery',
					__('WPBakery Addon', 'real3d-flipbook'),
					__('Use Real3D Flipbook with WPBakery page builder', 'real3d-flipbook'),
					$urls,
					class_exists("Real3DFlipbook_VCAddon")
				);

				createAddon(
					'previewMode',
					__('Preview Mode Addon', 'real3d-flipbook'),
					__('Show first x number of pages based on user login status', 'real3d-flipbook'),
					$urls,
					class_exists("R3D_Preview")
				);



				?>

			</div>

		</div>

	</div>

</div>

<?php

wp_enqueue_style('real3d-flipbook-admin');
