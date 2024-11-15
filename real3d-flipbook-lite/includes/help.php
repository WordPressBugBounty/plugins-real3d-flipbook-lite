<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly
}
?>
<div class="wrap">
	<h1><?php esc_html_e('Getting Started with Real3D Flipbook', 'real3d-flipbook'); ?></h1>

	<p><?php esc_html_e('Welcome to Real3D Flipbook! Transform your content into engaging flipbooks that captivate your audience. Whether you\'re showcasing portfolios, magazines, or product catalogs, Real3D Flipbook offers a seamless and interactive experience.', 'real3d-flipbook'); ?>
	</p>

	<?php
	
	?>
	<p><?php esc_html_e('Refer to the <a href="https://real3dflipbook.gitbook.io/wp-lite" target="_blank">Online Documentation</a> for detailed instructions and tips on using Real3D Flipbook.', 'real3d-flipbook'); ?>
	</p>
	<p><?php esc_html_e('Need help or want to report a bug? Visit the <a href="https://wordpress.org/support/plugin/real3d-flipbook-lite/" target="_blank">Support Forum</a> to get assistance or share your feedback with the community.', 'real3d-flipbook'); ?>
	</p>
	<?php
	
	?>
	<?php
	?>

	<p><?php esc_html_e('Ready to start? Create your first flipbook now:', 'real3d-flipbook'); ?>
		<a href="<?php echo esc_url(admin_url('post-new.php?post_type=r3d')); ?>"
			class="button button-primary"><?php esc_html_e('Add New Flipbook', 'real3d-flipbook'); ?></a>
	</p>

	<?php
	
	?>
	<p><?php esc_html_e('Watch the tutorial video below for a quick overview of Real3D Flipbook\'s features:', 'real3d-flipbook'); ?>
	</p>
	<iframe width="560" height="315" src="https://www.youtube.com/embed/1ljFRYr0Kh8" frameborder="0"
		allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
		allowfullscreen></iframe>
	<?php
	
	?>
</div>