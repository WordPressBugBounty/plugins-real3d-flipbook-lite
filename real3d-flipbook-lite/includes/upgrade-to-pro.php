<?php if (!defined('ABSPATH')) {
	exit;
}
?>

<div class="wrap r3d_wrap r3d-upgrade">

	<style>
	.r3d_wrap.r3d-upgrade { max-width: 1060px; margin: 0 auto; }
	.r3d-upgrade .r3d-hero { text-align: center; padding: 48px 20px 10px; }
	.r3d-upgrade .r3d-hero h1 { font-size: 2.4em; margin: 0 0 12px; }
	.r3d-upgrade .r3d-hero p { font-size: 1.15em; color: #50575e; margin: 0 0 22px; }
	.r3d_wrap.r3d-upgrade .button-primary { background: #84af05; border-color: #719504; }
	.r3d_wrap.r3d-upgrade .button-primary:hover, .r3d_wrap.r3d-upgrade .button-primary:focus { background: #719504; border-color: #5e7c03; }
	.r3d-upgrade .r3d-guarantee { color: #50575e; font-size: 13px; margin-top: 12px; }
	.r3d-upgrade .r3d-proofline { color: #787c82; font-size: 12.5px; margin-top: 6px; }
	.r3d-upgrade .r3d-proofline .r3d-stars { color: #f6b21b; letter-spacing: 1px; }
	.r3d-upgrade .r3d-carryover { display: inline-block; background: #f2f7e2; border: 1px solid #c3d698; border-radius: 8px; padding: 10px 20px; color: #3f5212; font-size: 13px; margin-top: 20px; }
	.r3d-upgrade .r3d-featured { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 36px 0 16px; }
	.r3d-upgrade .r3d-featured-card { background: #fff; border: 1px solid #c3d698; border-radius: 8px; padding: 24px; }
	.r3d-upgrade .r3d-featured-card .dashicons { color: #84af05; font-size: 32px; width: 32px; height: 32px; margin-bottom: 12px; }
	.r3d-upgrade .r3d-featured-card h3 { margin: 0 0 6px; font-size: 1.2em; }
	.r3d-upgrade .r3d-featured-card p { margin: 0; color: #50575e; font-size: 13px; }
	.r3d-upgrade .r3d-features { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin: 0 0 30px; }
	.r3d-upgrade .r3d-feature { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 20px; }
	.r3d-upgrade .r3d-feature .dashicons { color: #2271b1; font-size: 26px; width: 26px; height: 26px; margin-bottom: 10px; }
	.r3d-upgrade .r3d-feature h3 { margin: 0 0 6px; font-size: 1em; }
	.r3d-upgrade .r3d-feature p { margin: 0; color: #50575e; }
	.r3d-upgrade .r3d-compare { max-width: 720px; margin: 0 auto 40px; }
	.r3d-upgrade .r3d-compare h2 { text-align: center; font-size: 1.6em; margin: 0 0 16px; }
	.r3d-upgrade .r3d-compare table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #dcdcde; border-radius: 8px; overflow: hidden; }
	.r3d-upgrade .r3d-compare th, .r3d-upgrade .r3d-compare td { padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px; }
	.r3d-upgrade .r3d-compare tr:last-child td { border-bottom: none; }
	.r3d-upgrade .r3d-compare th { font-size: 14px; }
	.r3d-upgrade .r3d-compare th:nth-child(2), .r3d-upgrade .r3d-compare th:nth-child(3),
	.r3d-upgrade .r3d-compare td:nth-child(2), .r3d-upgrade .r3d-compare td:nth-child(3) { text-align: center; width: 24%; }
	.r3d-upgrade .r3d-compare th:nth-child(3), .r3d-upgrade .r3d-compare td:nth-child(3) { background: #f7fbea; }
	.r3d-upgrade .r3d-compare th:nth-child(3) { color: #5e7c03; }
	.r3d-upgrade .r3d-compare .dashicons-yes { color: #84af05; }
	.r3d-upgrade .r3d-compare .r3d-no { color: #999; }
	.r3d-upgrade .r3d-testimonial { text-align: center; max-width: 680px; margin: 0 auto 20px; }
	.r3d-upgrade .r3d-testimonial .r3d-stars { color: #f6b21b; letter-spacing: 2px; font-size: 14px; }
	.r3d-upgrade .r3d-testimonial blockquote { font-size: 14px; color: #50575e; font-style: italic; line-height: 1.6; margin: 8px 0 6px; }
	.r3d-upgrade .r3d-testimonial cite { font-size: 12.5px; color: #787c82; font-style: normal; }
	.r3d-upgrade .r3d-cta { text-align: center; padding: 10px 0 40px; }
	.r3d-upgrade .button-hero { font-size: 1.15em; }
	.r3d-upgrade .r3d-demo-link { display: inline-block; margin-top: 10px; }
	@media (max-width: 782px) { .r3d-upgrade .r3d-featured { grid-template-columns: 1fr; } }
	</style>

	<div class="r3d-hero">
		<h1><?php esc_html_e('Real3D Flipbook PRO', 'real3d-flipbook'); ?></h1>
		<p><?php esc_html_e('With PRO version you will get more features and options to customize your flipbooks:', 'real3d-flipbook'); ?></p>
		<a class="button button-primary button-hero" href="<?php echo esc_url('https://real3dflipbook.com/wordpress#pricing'); ?>" target="_blank">
			<?php esc_html_e('Upgrade to PRO Now', 'real3d-flipbook'); ?>
		</a>
		<div class="r3d-guarantee"><?php esc_html_e('Plans from $49/year · 30-day money-back guarantee', 'real3d-flipbook'); ?></div>
		<div class="r3d-proofline">
			<span class="r3d-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
			<?php esc_html_e('4.53 / 5 (1,060+ ratings) · 22,000+ customers · Power Elite author on Envato', 'real3d-flipbook'); ?>
		</div>
		<div class="r3d-carryover">
			<?php esc_html_e('All your existing flipbooks and settings carry over — nothing to rebuild.', 'real3d-flipbook'); ?>
		</div>
	</div>

	<div class="r3d-featured">
		<div class="r3d-featured-card">
			<span class="dashicons dashicons-visibility"></span>
			<h3><?php esc_html_e('High resolution PDF flipbooks', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Sharp flipbook pages with higher zoom level — fine print and detailed artwork stay crisp.', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-featured-card">
			<span class="dashicons dashicons-search"></span>
			<h3><?php esc_html_e('PDF links and text search', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Links inside your PDF work in the flipbook, and readers can search the full text of every page.', 'real3d-flipbook'); ?></p>
		</div>
	</div>

	<div class="r3d-features">
		<div class="r3d-feature">
			<span class="dashicons dashicons-admin-generic"></span>
			<h3><?php esc_html_e('Global settings', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Apply settings universally across all your flipbooks', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-admin-links"></span>
			<h3><?php esc_html_e('PDF auto link conversion', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Automatically recognize links in PDF text', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-external"></span>
			<h3><?php esc_html_e('Deep linking', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Open specific flipbook and specific flipbook page with a link', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-chart-line"></span>
			<h3><?php esc_html_e('Google Analytics', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Track custom events from flipbooks, like page change, lightbox open, PDF download, link click, etc.', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-share"></span>
			<h3><?php esc_html_e('Share', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Options to share by Email, WhatsApp, LinkedIn, Digg, Pinterest, Reddit', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-fullscreen-alt"></span>
			<h3><?php esc_html_e('Zoom Settings', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Customize minimum and maximum zoom levels', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-admin-customizer"></span>
			<h3><?php esc_html_e('Toolbar customization', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Enable or disable each toolbar control, customize toolbar layout, colors, icons colors, sizes, etc.', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-art"></span>
			<h3><?php esc_html_e('Custom Background', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Set flipbook background to custom color or image', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-smartphone"></span>
			<h3><?php esc_html_e('Mobile Settings', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Use different view mode, adjust flipbook size and other settings for mobile devices', 'real3d-flipbook'); ?></p>
		</div>
		<div class="r3d-feature">
			<span class="dashicons dashicons-admin-plugins"></span>
			<h3><?php esc_html_e('Addon support', 'real3d-flipbook'); ?></h3>
			<p><?php esc_html_e('Extend PRO with addons — Page Editor, PDF Tools, WooCommerce, Preview Pages and Bookshelf (sold separately)', 'real3d-flipbook'); ?></p>
		</div>
	</div>

	<div class="r3d-compare">
		<h2><?php esc_html_e('Lite vs PRO', 'real3d-flipbook'); ?></h2>
		<table>
			<tr>
				<th></th>
				<th><?php esc_html_e('Lite', 'real3d-flipbook'); ?></th>
				<th><?php esc_html_e('PRO', 'real3d-flipbook'); ?></th>
			</tr>
			<tr>
				<td><?php esc_html_e('Realistic 3D page flip', 'real3d-flipbook'); ?></td>
				<td><span class="dashicons dashicons-yes"></span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('PDF and image flipbooks', 'real3d-flipbook'); ?></td>
				<td><span class="dashicons dashicons-yes"></span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Page resolution and zoom', 'real3d-flipbook'); ?></td>
				<td><?php esc_html_e('Standard', 'real3d-flipbook'); ?></td>
				<td><?php esc_html_e('High-res, custom zoom', 'real3d-flipbook'); ?></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Toolbar', 'real3d-flipbook'); ?></td>
				<td><?php esc_html_e('Show / hide buttons', 'real3d-flipbook'); ?></td>
				<td><?php esc_html_e('Full customization', 'real3d-flipbook'); ?></td>
			</tr>
			<tr>
				<td><?php esc_html_e('UI layouts and appearance', 'real3d-flipbook'); ?></td>
				<td><?php esc_html_e('Default layout', 'real3d-flipbook'); ?></td>
				<td><?php esc_html_e('7 layouts, 3 skins, FontAwesome or Lucide icons, progress bar', 'real3d-flipbook'); ?></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Links inside PDF', 'real3d-flipbook'); ?></td>
				<td><span class="r3d-no">&mdash;</span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Text search', 'real3d-flipbook'); ?></td>
				<td><span class="r3d-no">&mdash;</span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Deep linking', 'real3d-flipbook'); ?></td>
				<td><span class="r3d-no">&mdash;</span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Google Analytics', 'real3d-flipbook'); ?></td>
				<td><span class="r3d-no">&mdash;</span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Custom Background', 'real3d-flipbook'); ?></td>
				<td><span class="r3d-no">&mdash;</span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Mobile Settings', 'real3d-flipbook'); ?></td>
				<td><span class="r3d-no">&mdash;</span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Global settings', 'real3d-flipbook'); ?></td>
				<td><span class="r3d-no">&mdash;</span></td>
				<td><span class="dashicons dashicons-yes"></span></td>
			</tr>
			<tr>
				<td><?php esc_html_e('Addon support', 'real3d-flipbook'); ?></td>
				<td><span class="r3d-no">&mdash;</span></td>
				<td><?php esc_html_e('Compatible, sold separately', 'real3d-flipbook'); ?></td>
			</tr>
		</table>
	</div>

	<div class="r3d-testimonial">
		<span class="r3d-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
		<blockquote><?php esc_html_e('Beautifully designed plugin with an incredible amount of features, plus excellent support. I\'m extremely satisfied after using this plugin for over 5 years. I would recommend it to anyone.', 'real3d-flipbook'); ?></blockquote>
		<cite><?php esc_html_e('Barnabas12 — Envato review', 'real3d-flipbook'); ?></cite>
	</div>

	<div class="r3d-cta">
		<a class="button button-primary button-hero" href="<?php echo esc_url('https://real3dflipbook.com/wordpress#pricing'); ?>" target="_blank">
			<?php esc_html_e('Upgrade to PRO Now', 'real3d-flipbook'); ?>
		</a>
		<div class="r3d-guarantee"><?php esc_html_e('Plans from $49/year · 30-day money-back guarantee', 'real3d-flipbook'); ?></div>
		<a class="r3d-demo-link" href="<?php echo esc_url('https://real3dflipbook.com'); ?>" target="_blank">
			<?php esc_html_e('See live demos', 'real3d-flipbook'); ?>
		</a>
	</div>
</div>
