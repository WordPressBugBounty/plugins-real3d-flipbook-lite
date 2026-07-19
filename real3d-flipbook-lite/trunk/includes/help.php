<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly
}
?>
<div class="wrap r3d_wrap r3d-help">

	<style>
	.r3d_wrap.r3d-help { max-width: 1060px; margin: 0 auto; }
	.r3d-help .r3d-help-hero { text-align: center; padding: 48px 20px 10px; }
	.r3d-help .r3d-help-hero h1 { font-size: 2.4em; margin: 0 0 12px; }
	.r3d-help .r3d-help-hero p { font-size: 1.15em; color: #50575e; margin: 0 auto 22px; max-width: 640px; }
	.r3d_wrap.r3d-help .button-primary { background: #84af05; border-color: #719504; }
	.r3d_wrap.r3d-help .button-primary:hover, .r3d_wrap.r3d-help .button-primary:focus { background: #719504; border-color: #5e7c03; }
	.r3d-help .r3d-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 36px 0 16px; }
	.r3d-help .r3d-step { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 24px; position: relative; }
	.r3d-help .r3d-step-num { display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background: #84af05; color: #fff; border-radius: 50%; font-weight: 600; margin-bottom: 12px; }
	.r3d-help .r3d-step h3 { margin: 0 0 6px; font-size: 1.05em; }
	.r3d-help .r3d-step p { margin: 0; color: #50575e; }
	.r3d-help .r3d-step code { font-size: 12px; }
	.r3d-help .r3d-resources { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin: 0 0 30px; }
	.r3d-help .r3d-resource { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 20px; }
	.r3d-help .r3d-resource .dashicons { color: #2271b1; font-size: 26px; width: 26px; height: 26px; margin-bottom: 10px; }
	.r3d-help .r3d-resource h3 { margin: 0 0 6px; font-size: 1em; }
	.r3d-help .r3d-resource p { margin: 0 0 12px; color: #50575e; }
	.r3d-help .r3d-video { max-width: 720px; margin: 10px auto 40px; }
	.r3d-help .r3d-video h2 { text-align: center; font-size: 1.6em; margin: 0 0 16px; }
	.r3d-help .r3d-video .r3d-video-frame { position: relative; padding-top: 56.25%; border-radius: 8px; overflow: hidden; border: 1px solid #dcdcde; }
	.r3d-help .r3d-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
	@media (max-width: 782px) { .r3d-help .r3d-steps { grid-template-columns: 1fr; } }
	</style>

	<div class="r3d-help-hero">
		<h1><?php esc_html_e('Welcome to Real3D Flipbook', 'real3d-flipbook'); ?></h1>
		<p><?php esc_html_e('Transform your PDFs and images into engaging flipbooks — portfolios, magazines, brochures and product catalogs with a realistic 3D page flip.', 'real3d-flipbook'); ?></p>
		<a href="<?php echo esc_url(admin_url('post-new.php?post_type=r3d')); ?>" class="button button-primary button-hero">
			<?php esc_html_e('Create your first flipbook', 'real3d-flipbook'); ?>
		</a>
	</div>

	<div class="r3d-steps">
		<div class="r3d-step">
			<span class="r3d-step-num">1</span>
			<h3><?php esc_html_e('Add a new flipbook', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Go to Real3D Flipbook → Add New and select your PDF or images.', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-step">
			<span class="r3d-step-num">2</span>
			<h3><?php esc_html_e('Publish and copy the shortcode', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Publish the flipbook, then copy its shortcode from the Shortcode box.', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-step">
			<span class="r3d-step-num">3</span>
			<h3><?php esc_html_e('Embed it anywhere', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Paste the shortcode into any post or page — or use the Gutenberg block.', 'real3d-flipbook'); ?></p>
		</div>
	</div>

	<div class="r3d-resources">
		<?php
		
		?>
		<div class="r3d-resource">
			<span class="dashicons dashicons-book"></span>
			<h3><?php esc_html_e('Documentation', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Detailed instructions and tips on using Real3D Flipbook.', 'real3d-flipbook'); ?></p>
			<a class="button button-secondary" href="<?php echo esc_url('https://real3dflipbook.gitbook.io/wp-lite'); ?>" target="_blank">
				<?php esc_html_e('Open documentation', 'real3d-flipbook'); ?>
			</a>
		</div>
		<div class="r3d-resource">
			<span class="dashicons dashicons-sos"></span>
			<h3><?php esc_html_e('Support forum', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Need help or found a bug? Get assistance or share feedback.', 'real3d-flipbook'); ?></p>
			<a class="button button-secondary" href="<?php echo esc_url('https://wordpress.org/support/plugin/real3d-flipbook-lite/'); ?>" target="_blank">
				<?php esc_html_e('Visit support forum', 'real3d-flipbook'); ?>
			</a>
		</div>
		<?php
		
		?>
		<?php
		?>
	</div>

	<?php
	
	?>
	<div class="r3d-video">
		<h2><?php esc_html_e('Video tutorial', 'real3d-flipbook'); ?></h2>
		<div class="r3d-video-frame">
			<iframe src="https://www.youtube.com/embed/1ljFRYr0Kh8"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen>
			</iframe>
		</div>
	</div>
	<?php
	
	?>
</div>
