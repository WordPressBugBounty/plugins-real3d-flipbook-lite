<?php

/*plugin class*/
class Real3DFlipbook
{

	public $PLUGIN_VERSION;
	public $PLUGIN_DIR_URL;
	public $PLUGIN_DIR_PATH;

	// Singleton
	private static $instance = null;

	protected $pro = false;
	protected $flipbook_global = null;
	public $products;

	public static function get_instance()
	{
		if (null == self::$instance) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	protected function __construct()
	{

		$this->PLUGIN_VERSION = REAL3D_FLIPBOOK_VERSION;
		$this->PLUGIN_DIR_URL = plugin_dir_url(REAL3D_FLIPBOOK_FILE);
		$this->PLUGIN_DIR_PATH = plugin_dir_path(REAL3D_FLIPBOOK_FILE);
		$this->products = [
			'r3d' => ['name' => 'Real3D Flipbook'],
			'addons' => ['name' => 'Addons Bundle'],
			'pefrf' => ['name' => 'Page Editor Addon', 'class' => 'R3D_Page_Editor'],
			'ptfrf' => ['name' => 'PDF Tools Addon', 'class' => 'R3D_PDF_Tools'],
			'bs' => ['name' => 'Bookshelf Addon', 'class' => 'Bookshelf_Addon'],
			'wafrf' => ['name' => 'WooCommerce Addon', 'class' => 'R3D_Woo'],
			'eafrf' => ['name' => 'Elementor Addon', 'class' => 'Elementor_Real3D_Flipbook'],
			'wpb_r3d' => ['name' => 'WPBakery Addon', 'class' => 'Real3DFlipbook_VCAddon'],
			'prev_r3d' => ['name' => 'Preview Addon', 'class' => 'R3D_Preview']
		];
		$this->add_actions();
		register_activation_hook(REAL3D_FLIPBOOK_FILE, array($this, 'activation_hook'));
	}

	public function activation_hook($network_wide)
	{
		// update_option('r3d_version', $this->PLUGIN_VERSION);
	}

	public function enqueue_scripts()
	{

		wp_register_script("real3d-flipbook", $this->PLUGIN_DIR_URL . "js/flipbook.min.js", array(), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-book3", $this->PLUGIN_DIR_URL . "js/flipbook.book3.min.js", array('real3d-flipbook'), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-bookswipe", $this->PLUGIN_DIR_URL . "js/flipbook.swipe.min.js", array('real3d-flipbook'), $this->PLUGIN_VERSION, true);

		wp_register_script("sweet-alert-2", $this->PLUGIN_DIR_URL . "js/libs/sweetalert2.all.min.js", array(), $this->PLUGIN_VERSION, true);
		wp_register_style('sweet-alert-2', $this->PLUGIN_DIR_URL . "css/sweetalert2.min.css", array(), $this->PLUGIN_VERSION);


		wp_register_script("real3d-flipbook-threejs", $this->PLUGIN_DIR_URL . "js/libs/three.min.js", array(), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-webgl", $this->PLUGIN_DIR_URL . "js/flipbook.webgl.min.js", array('real3d-flipbook', 'real3d-flipbook-threejs'), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-pdfjs", $this->PLUGIN_DIR_URL . "js/libs/pdf.min.js", array(), $this->PLUGIN_VERSION, true);
		wp_register_script("real3d-flipbook-pdfworkerjs", $this->PLUGIN_DIR_URL . "js/libs/pdf.worker.min.js", array(), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-pdfservice", $this->PLUGIN_DIR_URL . "js/flipbook.pdfservice.min.js", array(), $this->PLUGIN_VERSION, true);

		!get_option('r3d') && wp_register_script("real3d-flipbook-embed", $this->PLUGIN_DIR_URL . "js/embed.js", ['real3d-flipbook'], $this->PLUGIN_VERSION, true);

		wp_register_style('real3d-flipbook-style', $this->PLUGIN_DIR_URL . "css/flipbook.min.css", array(), $this->PLUGIN_VERSION);

		if (isset($this->flipbook_global["convertPDFLinks"]) && $this->flipbook_global['convertPDFLinks'] == "true") {
			wp_enqueue_script('real3d-flipbook-forntend',  $this->PLUGIN_DIR_URL . "js/frontend.js", array(), $this->PLUGIN_VERSION, true);
			wp_localize_script(
				'real3d-flipbook-forntend',
				'r3d_frontend',
				array(
					'rootFolder' => $this->PLUGIN_DIR_URL,
					'version' => $this->PLUGIN_VERSION,
					'options' => $this->flipbook_global
				)
			);
		}
	}

	public function admin_enqueue_scripts($hook_suffix)
	{

		wp_register_script('alpha-color-picker', $this->PLUGIN_DIR_URL . 'js/alpha-color-picker.js', array('jquery', 'wp-color-picker'), $this->PLUGIN_VERSION, true);
		wp_register_style('alpha-color-picker', $this->PLUGIN_DIR_URL . 'css/alpha-color-picker.css', array('wp-color-picker'), $this->PLUGIN_VERSION);

		wp_register_script("real3d-flipbook-admin", $this->PLUGIN_DIR_URL . "js/edit_flipbook.js", array('jquery', 'jquery-ui-sortable', 'jquery-ui-resizable', 'jquery-ui-selectable', 'real3d-flipbook-pdfjs', 'alpha-color-picker', 'common', 'wp-lists', 'postbox'), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-edit-post", $this->PLUGIN_DIR_URL . "js/edit_flipbook_post.js", array('jquery', 'jquery-ui-sortable', 'jquery-ui-draggable', 'jquery-ui-resizable', 'jquery-ui-selectable', 'real3d-flipbook-pdfjs', 'alpha-color-picker', 'common', 'wp-lists', 'postbox'), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-settings", $this->PLUGIN_DIR_URL . "js/settings.js", array('jquery', 'jquery-ui-sortable', 'jquery-ui-resizable', 'jquery-ui-selectable', 'alpha-color-picker', 'common', 'wp-lists', 'postbox'), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-flipbooks", $this->PLUGIN_DIR_URL . "js/flipbooks.js", array('jquery', 'common', 'wp-lists', 'postbox'), $this->PLUGIN_VERSION, true);

		wp_register_script("real3d-flipbook-import", $this->PLUGIN_DIR_URL . "js/import.js", array('jquery'), $this->PLUGIN_VERSION, true);

		wp_register_style('real3d-flipbook-admin', $this->PLUGIN_DIR_URL . "css/flipbook-admin.css", array(), $this->PLUGIN_VERSION);

		if (in_array($hook_suffix, array('edit.php'))) {
			$screen = get_current_screen();

			if (is_object($screen) && 'r3d' == $screen->post_type) {

				wp_register_style("real3d-flipbook-posts", $this->PLUGIN_DIR_URL . "css/posts.css", array(), $this->PLUGIN_VERSION);
				wp_enqueue_style('real3d-flipbook-posts');

				wp_register_script("real3d-flipbook-posts", $this->PLUGIN_DIR_URL . "js/posts.js", array(), $this->PLUGIN_VERSION, true);
				wp_enqueue_script('real3d-flipbook-posts');
				//for REST API calls on flipbooks page
				wp_localize_script('real3d-flipbook-posts', 'wp_rest', array(
					'nonce' => wp_create_nonce('wp_rest')
				));

				}
		}

		if (in_array($hook_suffix, array('edit-tags.php'))) {
			$screen = get_current_screen();

			if (is_object($screen) && 'r3d' == $screen->post_type) {

				wp_register_script("real3d-flipbook-categories", $this->PLUGIN_DIR_URL . "js/categories.js", array(), $this->PLUGIN_VERSION, true);
				wp_enqueue_script('real3d-flipbook-categories');
			}
		}
	}

	public function admin_link($links)
	{
		array_unshift($links, '<a href="' . get_admin_url() . 'options-general.php?page=flipbooks">Admin</a>');

		return $links;
	}

	public function init()
	{
		global $l10n;

		$capability = get_option("real3dflipbook_capability");
		$arg = $this->products['r3d'];
		$flipbook = $arg['key'];
		if (!$capability) $capability = "publish_posts";

		if (current_user_can("edit_posts")) {
			add_action('media_buttons', array($this, 'insert_flipbook_button'));
		}

		if (get_option("r3d_version") != $this->PLUGIN_VERSION) {
			update_option('r3d_version', $this->PLUGIN_VERSION);
			update_option('r3d_flush_rewrite_rules', true);

			if (!get_option('r3d_autoload_disabled')) {
				update_option('r3d_autoload_disabled', true);
				$this->set_real3dflipbook_options_autoload_no();
			}
			wp_redirect(admin_url('admin.php?page=real3d_flipbook_help'));
			exit;
		}

		$flipbook_global_options = get_option("real3dflipbook_global");

		if (isset($l10n['real3d-flipbook'])) {
			unset($flipbook_global_options["strings"]);
			$buttonNames = array(
				'btnAutoplay',
				'btnNext',
				'btnLast',
				'btnPrev',
				'btnFirst',
				'btnZoomIn',
				'btnZoomOut',
				'btnToc',
				'btnThumbs',
				'btnShare',
				'btnNotes',
				'btnDownloadPages',
				'btnDownloadPdf',
				'btnSound',
				'btnExpand',
				'btnSingle',
				'btnSearch',
				'search',
				'btnBookmark',
				'btnPrint',
				'btnClose'
			);
			foreach ($buttonNames as $name) {
				unset($flipbook_global_options[$name]['title']);
			}
		}
		$flipbook_global_defaults = r3dfb_getDefaults();

		$this->flipbook_global = r3d_array_merge_deep($flipbook_global_defaults, $flipbook_global_options);
		$this->enqueue_scripts();

		add_filter('widget_text', 'do_shortcode');
		add_shortcode('real3dflipbook', array($this, 'on_shortcode'));

		include_once plugin_dir_path(__FILE__) . 'post-type.php';
	}

	public function set_real3dflipbook_options_autoload_no()
	{
		global $wpdb;

		$flipbook_ids = get_option('real3dflipbooks_ids', array());

		if (!empty($flipbook_ids) && is_array($flipbook_ids)) {
			foreach ($flipbook_ids as $flipbook_id) {
				$option_name = sanitize_text_field('real3dflipbook_' . $flipbook_id);

				$cache_key = 'autoload_' . $option_name;
				wp_cache_delete($cache_key, 'options');

				$result = $wpdb->update(
					$wpdb->options,
					array('autoload' => 'no'),
					array('option_name' => $option_name),
					array('%s'),
					array('%s')
				);

				if ($result !== false) {
					wp_cache_set($cache_key, 'no', 'options');
				}
			}
		}
	}



	// Hook the function to run during plugin activation or admin action

	public function getFlipbookGlobal()
	{
		return $this->flipbook_global;
	}

	public function override_shortcodes()
	{
		if (isset($this->flipbook_global["overridePDFEmbedder"]) && $this->flipbook_global['overridePDFEmbedder'] == "true") {

			remove_shortcode('pdf-embedder');
			add_shortcode('pdf-embedder', array($this, 'overridePDFEmbedder'));

			add_action('wp_enqueue_scripts', function () {
				wp_dequeue_script("pdfemb_pdfjs");
				wp_dequeue_script("pdfemb_embed_pdf");
				wp_deregister_script("pdfemb_pdfjs");
				wp_deregister_script("pdfemb_embed_pdf");
			}, PHP_INT_MAX);
			add_filter('render_block', array($this, 'overridePDFEmbedderBlock'), 10, 2);
		}

		if (isset($this->flipbook_global["overrideDflip"]) && $this->flipbook_global['overrideDflip'] == "true") {

			remove_shortcode('dflip');
			add_shortcode('dflip', array($this, 'overrideDflip'));
			add_action('wp_enqueue_scripts', function () {
				wp_dequeue_script("dflip-script");
				wp_dequeue_style("dflip-style");
				wp_deregister_script("dflip-script");
				wp_deregister_style("dflip-style");
			}, PHP_INT_MAX);
		}

		if (isset($this->flipbook_global["overrideWonderPDFEmbed"]) && $this->flipbook_global['overrideWonderPDFEmbed'] == "true") {

			remove_shortcode('wonderplugin_pdf');
			add_shortcode('wonderplugin_pdf', array($this, 'overrideWonderPDFEmbed'));
		}

		if (isset($this->flipbook_global["override3DFlipBook"]) && $this->flipbook_global['override3DFlipBook'] == "true") {

			remove_shortcode('3d-flip-book');
			add_shortcode('3d-flip-book', array($this, 'override3DFlipBook'));
		}

		if (isset($this->flipbook_global["overridePDFjsViewer"]) && $this->flipbook_global['overridePDFjsViewer'] == "true") {

			remove_shortcode('pdfjs-viewer');
			add_shortcode('pdfjs-viewer', array($this, 'overridePDFjsViewer'));
		}
	}


	public function overridePDFEmbedder($atts, $content = null)
	{
		$args = shortcode_atts(
			array(
				'url' => '-1'
			),
			$atts
		);

		if ($args['url'] != '-1') {
			return do_shortcode('[real3dflipbook pdf="' . esc_attr($args['url']) . '"]');
		}

		return 'No PDF URL provided.';
	}

	public function overridePDFEmbedderBlock($block_content, $block)
	{

		if ($block['blockName'] === 'pdfemb/pdf-embedder-viewer') {
			$attributes = $block['attrs'];
			$pdf_url = isset($attributes['url']) ? $attributes['url'] : '';

			$shortcode = '[real3dflipbook pdf="' . esc_url($pdf_url) . '" mode="normal"]';

			return do_shortcode($shortcode);
		}

		return $block_content;
	}

	public function overrideDflip($atts, $content = null)
	{
		$args = shortcode_atts(
			array(
				'source' => '-1',
				'id' => '-1',
				'type' => '-1',
			),
			$atts
		);

		if ($args['source'] != '-1') {
			return do_shortcode('[real3dflipbook pdf="' . esc_attr($args['source']) . '"]');
		} elseif ($args['id'] != '-1') {
			$data = get_post_meta($args['id'], "_dflip_data", true);

			if (isset($data['pdf_source'])) {
				if ($args['type'] == 'thumb' && !empty($data['pdf_thumb'])) {
					$thumb_url = $data['pdf_thumb'];
					return do_shortcode('[real3dflipbook pdf="' . esc_attr($data['pdf_source']) . '" thumb="' . esc_url($thumb_url) . '" mode="lightbox" thumbcss="display: inline-block;box-sizing: border-box;margin: 30px 15px 15px !important;text-align: center;border: 0;width: 140px;height: auto;word-break: break-word;vertical-align: bottom;"]');
				} else {
					return do_shortcode('[real3dflipbook pdf="' . esc_attr($data['pdf_source']) . '"]');
				}
			}
		}

		return 'No PDF URL provided.';
	}

	public function overrideWonderPDFEmbed($atts, $content = null)
	{
		$args = shortcode_atts(
			array(
				'src' => '-1'
			),
			$atts
		);

		if ($args['src'] != '-1') {
			return do_shortcode('[real3dflipbook pdf="' . esc_attr($args['src']) . '"]');
		}

		return 'No PDF URL provided.';
	}

	public function overridePDFjsViewer($atts, $content = null)
	{
		$args = shortcode_atts(
			array(
				'url' => '-1'
			),
			$atts
		);

		if ($args['url'] != '-1') {
			return do_shortcode('[real3dflipbook pdf="' . esc_attr($args['url']) . '"]');
		}

		return 'No PDF URL provided.';
	}

	public function override3DFlipBook($atts, $content = null)
	{
		$args = shortcode_atts(
			array(
				'pdf' => '-1',
				'id' => '-1',
			),
			$atts
		);

		if ($args['pdf'] != '-1') {
			return do_shortcode('[real3dflipbook pdf="' . esc_attr($args['pdf']) . '"]');
		} elseif ($args['id'] != '-1') {
			$data = get_post_meta($args['id'], "3dfb_data", true);
			if (isset($data['guid']))
				return do_shortcode('[real3dflipbook pdf="' . esc_attr($data['guid']) . '"]');
		}

		return 'No PDF URL provided.';
	}


	public function plugins_loaded()
	{
		load_plugin_textdomain('real3d-flipbook', false, plugin_basename(dirname(REAL3D_FLIPBOOK_FILE)) . '/languages');

		foreach ($this->products as $key => &$val) {
			if (isset($val['class'])) {
				$val['active'] = class_exists($val['class']) && !function_exists($key . '_fs');
			}
			$optionName = $key === 'r3d' ? 'r3d_key' : 'r3d_' . $key . '_key';
			$val['key'] = get_option($optionName);
		}

		if (!defined('R3D_PDF_TOOLS_VERSION')) {
			add_action('admin_notices', array($this, 'admin_notice_get_pdf_tools'));
			return;
		}
	}

	public function admin_notice_get_pdf_tools()
	{
		global $pagenow, $post_type;
		$admin_pages = ['edit.php', 'post.php', 'post-new.php'];

		if (in_array($pagenow, $admin_pages) && $post_type == 'r3d') {
			$message = sprintf(
				/* translators: %1$s is replaced with the anchor HTML for the "PDF Tools Addon" link. */
				esc_html__(
					'Optimize Real3D PDF Flipbooks with %1$s by converting PDF to images and JSON. Speed up the flipbook loading and secure the PDF.',
					'real3d-flipbook'
				),
				sprintf(
					'<a href="%1$s" style="text-decoration: none; font-weight: bold;" target="_blank">%2$s</a>',
					esc_url('https://real3dflipbook.com/pdf-tools-addon/?ref=wp'),
					esc_html__('PDF Tools Addon for Real3D Flipbook', 'real3d-flipbook')
				)
			);

			printf(
				'<div class="notice notice-warning is-dismissible"><p>%s</p></div>',
				wp_kses(
					$message,
					[
						'a' => [
							'href' => [],
							'style' => [],
							'target' => []
						]
					]
				)
			);
		}
	}


	protected function add_actions()
	{

		add_action('init', array($this, 'init'));

		add_action('plugins_loaded', array($this, 'plugins_loaded'));

		add_action('init', array($this, 'override_shortcodes'), 100);

		// add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));

		if (is_admin()) {
			include_once(plugin_dir_path(__FILE__) . 'plugin-admin.php');
			add_filter("plugin_action_links_" . plugin_basename(__FILE__), array($this, "admin_link"));
			// add_action('media_buttons', array($this, 'insert_flipbook_button'));

			add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
			add_action('admin_menu', array($this, "admin_menu"));

			add_action('wp_ajax_r3d_import', array($this,  'ajax_import_flipbooks'));

			add_action('wp_ajax_r3d_get_json', array($this,  'ajax_get_json'));

			add_action('admin_footer', array($this, 'admin_footer'), 11);

			add_action('add_meta_boxes', array($this, 'add_meta_boxes'), 100);
			add_action('edit_form_after_title', [$this, 'print_content']);
			add_action('save_post_r3d', [$this, 'save_post_r3d'], 10, 3);
		}

		add_action('wp_ajax_r3d_last_page', array($this,  'ajax_last_page'));

		add_filter('single_template', array($this, 'load_r3d_template'));
		add_filter('taxonomy_template', array($this, 'load_r3d_taxonomy_template'));

		add_action('wp_ajax_pdf', array($this, 'serve_pdf'));
		add_action('wp_ajax_nopriv_pdf', array($this, 'serve_pdf'));
	}

	public function save_post_r3d($post_ID, $post, $update)
	{

		if (defined('DOING_AJAX') && DOING_AJAX && isset($_POST['_inline_edit'])) {
			return;
		}

		if (isset($_GET['action']) && $_GET['action'] === 'untrash') {
			return;
		}

		if (isset($_REQUEST['bulk_edit']))
			return;

		$status = $post->post_status;

		$title = $post->post_title;

		if ("auto-draft" == $status && $title) {

			//clear default draft title
			wp_update_post([
				'ID'         => $post_ID,
				'post_title' => ''
			]);
		} else if ('draft' == $status || 'publish' == $status) {

			$flipbook_id = get_post_meta($post_ID, 'flipbook_id', true);


			$book = $this->flipbook_global[substr('settings', 0, 1)];

			if (isset($_POST['id'])) {
				$flipbook_id = sanitize_text_field(wp_unslash($_POST['id']));
			} elseif (empty($flipbook_id)) {
				$flipbook_id = 1;
				$real3dflipbooks_ids = get_option('real3dflipbooks_ids');
				if (!empty($real3dflipbooks_ids)) {
					$real3dflipbooks_ids = array_map('intval', $real3dflipbooks_ids);
					$flipbook_id = max($real3dflipbooks_ids) + 1;
				}
			}

			if (isset($_POST["flipbook_options"]) && !empty($_POST["flipbook_options"])) {
				// Remove slashes and decode URL-encoded string
				$encodedOptionsString = wp_unslash($_POST["flipbook_options"]);
				$optionsString = urldecode($encodedOptionsString);

				// Decode JSON
				$flipbook = json_decode($optionsString, true);

				// Check if JSON decoding was successful
				if (json_last_error() !== JSON_ERROR_NONE) {
					wp_die(
						esc_html(sprintf(__('Invalid JSON data: %s', 'real3d-flipbook'), json_last_error_msg())),
						esc_html__('Error', 'real3d-flipbook'),
						['response' => 400]
					);
				}
			} else {
				wp_die(
					esc_html__('Missing flipbook options.', 'real3d-flipbook'),
					esc_html__('Error', 'real3d-flipbook'),
					['response' => 400]
				);
			}



			foreach ($flipbook['pages'] as $pageIndex => $page) {
				if (isset($page['htmlContent'])) {
					$decodedHtmlContent = urldecode($page['htmlContent']);
					if (!current_user_can('unfiltered_html')) {
						$flipbook['pages'][$pageIndex]['htmlContent'] = wp_kses_post($decodedHtmlContent);
					} else {
						$flipbook['pages'][$pageIndex]['htmlContent'] = $decodedHtmlContent;
					}
				}
			}

			// function recursiveUrldecode($data)
			// {
			// 	if (is_array($data)) {
			// 		foreach ($data as $key => $value) {
			// 			$data[$key] = recursiveUrldecode($value);
			// 		}
			// 	} elseif (is_string($data)) {
			// 		$data = urldecode($data);
			// 	}
			// 	return $data;
			// }

			// $flipbook_options = recursiveUrldecode($flipbook_options);

			$oldFlipbook = get_option('real3dflipbook_' . $flipbook_id);

			if ($oldFlipbook && isset($oldFlipbook['notes'])) {
				$flipbook['notes'] = $oldFlipbook['notes'];
			}

			$flipbook['name'] = $title;
			$flipbook['post_id'] = $post_ID;

			update_post_meta($post_ID, 'flipbook_id', $flipbook_id);

			if (false === get_option('real3dflipbook_' . (string)$flipbook_id)) {
				add_option('real3dflipbook_' . (string)$flipbook_id, $flipbook, '', 'no');
			} else {
				update_option('real3dflipbook_' . (string)$flipbook_id, $flipbook);
			}

			$real3dflipbooks_ids = get_option('real3dflipbooks_ids');

			if (!$real3dflipbooks_ids)
				$real3dflipbooks_ids = array();

			if (!in_array($flipbook_id, $real3dflipbooks_ids)) {
				array_push($real3dflipbooks_ids, $flipbook_id);
				update_option('real3dflipbooks_ids', $real3dflipbooks_ids);
			}
		}
	}

	public function load_r3d_template($template)
	{

		global $post;

		if ('r3d' === $post->post_type) {

			/*
	         * This is a 'r3d' post
	         * AND a 'single r3d template' is not found on
	         * theme or child theme directories, so load it
	         * from our plugin directory.
	         */
			return plugin_dir_path(__FILE__) . 'single-r3d.php';
		}

		return $template;
	}

	public function load_r3d_taxonomy_template($template)
	{

		if (is_tax('r3d_category')) {
			return plugin_dir_path(__FILE__) . 'taxonomy-r3d_category.php';
		}

		return $template;
	}



	public function insert_flipbook_button()
	{

		global $pagenow;
		if (!in_array($pagenow, array('post.php', 'page.php', 'post-new.php', 'post-edit.php'))) return;

		printf(
			'<a href="%1$s" class="thickbox button r3d-insert-flipbook-button" title="%2$s"><span class="wp-media-buttons-icon" style="background:url(%3$simages/th.png); background-repeat: no-repeat; background-position: left bottom;"></span>%4$s</a>',
			esc_url('#TB_inline?&inlineId=choose_flipbook'),
			esc_attr__('Select flipbook to insert into post', 'real3d-flipbook'),
			esc_url($this->PLUGIN_DIR_URL),
			esc_html__('Real3D Flipbook', 'real3d-flipbook')
		);
	}

	public function ajax_import_flipbooks()
	{

		check_ajax_referer('r3d_nonce', 'security');

		if (isset($_POST['flipbooks']) && !empty($_POST['flipbooks'])) {
			$json = wp_unslash($_POST['flipbooks']);
			$newFlipbooks = json_decode($json, true);
			if (json_last_error() !== JSON_ERROR_NONE) {
				wp_die(
					esc_html(sprintf(__('Invalid JSON data: %s', 'real3d-flipbook'), json_last_error_msg())),
					esc_html__('Error', 'real3d-flipbook'),
					['response' => 400]
				);
			}
		} else {
			wp_die(
				esc_html__('Missing flipbooks data.', 'real3d-flipbook'),
				esc_html__('Error', 'real3d-flipbook'),
				['response' => 400]
			);
		}

		if ((string)$json != "" && is_array($newFlipbooks)) {

			$real3dflipbooks_ids = get_option('real3dflipbooks_ids');

			foreach ($real3dflipbooks_ids as $id) {

				delete_option('real3dflipbook_' . (string)$id);
			}

			$allposts = get_posts(array('post_type' => 'r3d', 'numberposts' => -1));
			foreach ($allposts as $eachpost) {
				wp_delete_post($eachpost->ID, true);
			}

			$real3dflipbooks_ids = array();

			foreach ($newFlipbooks as $b) {
				$id = $b['id'];

				if (isset($b['post_id'])) {
					unset($b['post_id']);
				}

				if ($id == 'global') {
					update_option('real3dflipbook_global', $b);
				} else {
					add_option('real3dflipbook_' . (string)$id, $b, '', 'no');

					array_push($real3dflipbooks_ids, (string)$id);
				}
			}

			update_option('real3dflipbooks_ids', $real3dflipbooks_ids);
			update_option('r3d_posts_generated', false);
		}

		wp_die(); // this is required to terminate immediately and return a proper response

	}

	public function ajax_get_json()
	{
		check_ajax_referer('r3d_nonce', 'security');

		$flipbooks = array();

		$args = array(
			'post_type' => 'r3d',
			'posts_per_page' => -1,
			'post_status' => 'publish'
		);

		$flipbook_posts = get_posts($args);

		foreach ($flipbook_posts as $post) {
			$flipbook_id = get_post_meta($post->ID, 'flipbook_id', true);

			if ($flipbook_id) {
				$book = get_option('real3dflipbook_' . $flipbook_id);

				if ($book) {
					if (empty($book['date'])) {
						$book['date'] = get_the_date('Y-m-d H:i:s', $post->ID);
					}
					$flipbooks[$flipbook_id] = $book;
				}
			}
		}

		$real3dflipbooks_ids = get_option('real3dflipbooks_ids', array());

		foreach ($real3dflipbooks_ids as $id) {
			if (!isset($flipbooks[$id])) {
				$book = get_option('real3dflipbook_' . $id);
				if ($book) {
					$flipbooks[$id] = $book;
				}
			}
		}

		wp_send_json_success($flipbooks);
	}

	public function admin_menu()
	{

		$capability = get_option("real3dflipbook_capability");
		if (!$capability) $capability = "publish_posts";

		add_menu_page(
			'Real3D Flipbook',
			'Real3D Flipbook',
			$capability,
			'real3d_flipbook_admin',
			array($this, "admin"),
			'dashicons-book'
		);




		add_submenu_page(
			'real3d_flipbook_admin',
			__('Flipbooks', 'real3d-flipbook'),
			__('Flipbooks', 'real3d-flipbook'),
			$capability,
			'edit.php?post_type=r3d'
		);

		add_submenu_page(
			'real3d_flipbook_admin',
			__('Add new', 'real3d-flipbook'),
			__('Add new', 'real3d-flipbook'),
			$capability,
			'post-new.php?post_type=r3d'
		);

		add_submenu_page(
			'real3d_flipbook_admin',
			__('Categories', 'real3d-flipbook'),
			__('Categories', 'real3d-flipbook'),
			$capability,
			'edit-tags.php?taxonomy=r3d_category&post_type=r3d'
		);

		add_submenu_page(
			'real3d_flipbook_admin',
			__('Authors', 'real3d-flipbook'),
			__('Authors', 'real3d-flipbook'),
			$capability,
			'edit-tags.php?taxonomy=r3d_author&post_type=r3d'
		);

		add_submenu_page(
			'real3d_flipbook_admin',
			__('Import / Export', 'real3d-flipbook'),
			__('Import / Export', 'real3d-flipbook'),
			$capability,
			'real3d_flipbook_import',
			array($this, "import")
		);

		remove_submenu_page('real3d_flipbook_admin', 'real3d_flipbook_admin');

		add_submenu_page(
			'real3d_flipbook_admin',
			__('Settings', 'real3d-flipbook'),
			__('Settings', 'real3d-flipbook'),
			$capability,
			'real3d_flipbook_settings',
			array($this, "settings")
		);

		add_submenu_page(
			'real3d_flipbook_admin',
			'Addons',
			'<span style="font-weight: 700; color: #33FF22">Add-ons</span>',
			$capability,
			'real3d_flipbook_addons',
			array($this, "addons"),
			99
		);

		if (!$this->pro) {

			add_submenu_page(
				'real3d_flipbook_admin',
				'Upgrade',
				'<span style="font-weight: 700; color: #33FF22">Upgrade to PRO</span>',
				$capability,
				'real3d_flipbook_upgrade',
				array($this, "upgrade"),
				99
			);
		}

		add_submenu_page(
			'real3d_flipbook_admin',
			'Help',
			'Help',
			$capability,
			'real3d_flipbook_help',
			array($this, "help")
		);

		if (function_exists('register_block_type')) {

			// // Register block, and explicitly define the attributes we accept.
			register_block_type('r3dfb/embed', array(
				// 'attributes' => array(
				// 	'id' => array(
				// 		'type' => 'string',
				// 	)
				// ),
				// 'render_callback' => 'slidertx_render_callback',
			));

			add_action('enqueue_block_assets', array($this, 'enqueue_block_assets'));
			add_action('enqueue_block_editor_assets', array($this, 'enqueue_block_editor_assets'));
		}

		if (current_user_can($capability))

			do_action('real3d_flipbook_menu');
	}

	public function admin_footer()
	{

		global $pagenow;
		global $current_screen;

		if ($current_screen->post_type == 'r3d')
			return;

		if (in_array($pagenow, array('post.php', 'page.php', 'post-new.php', 'post-edit.php'))) {

			$real3dflipbooks_ids = get_option('real3dflipbooks_ids');
			if (!$real3dflipbooks_ids) {
				$real3dflipbooks_ids = array();
			}
			$flipbooks = array();
			foreach ($real3dflipbooks_ids as $id) {

				$b = get_option('real3dflipbook_' . $id);
				if ($b && isset($b['id'])) {
					$book = array(
						"id" => $b['id'],
						"name" => $b['name']
					);
					array_push($flipbooks, $book);
				}
			}

			wp_enqueue_script('r3dfb-insert-js', $this->PLUGIN_DIR_URL . "js/insert-flipbook.js", array('jquery'), $this->PLUGIN_VERSION, true);

			wp_enqueue_style('r3dfb-insert-css', $this->PLUGIN_DIR_URL . "css/insert-flipbook.css",  array(), $this->PLUGIN_VERSION, true);

?>

			<div id="choose_flipbook" style="display: none;">
				<div id="r3d-tb-wrapper">
					<div class="r3d-tb-inner">
						<?php
						if (count($flipbooks)) {
						?>
							<h3 style='margin-bottom: 20px;'><?php esc_html_e("Insert Flipbook", "real3d-flipbook"); ?></h3>
							<select id='r3d-select-flipbook'>
								<option value='' selected=selected>
									<?php esc_html_e("Default Flipbook (Global Settings)", "real3d-flipbook"); ?>
								</option>
								<?php
								foreach ($flipbooks as $book) {
									$id = $book['id'];
									$name = $book['name'];
								?>
									<option value="<?php echo esc_attr($id); ?>"><?php echo esc_attr($name); ?></option>
								<?php
								}
								?>
							</select>
						<?php
						} else {
							esc_html_e("No flipbooks found. Create new flipbook or set flipbook source", "real3d-flipbook");
						}
						?>

						<h3 style="margin-top: 40px;"><?php esc_html_e("Flipbook source", "real3d-flipbook") ?></h3>
						<p><?php esc_html_e("Select PDF or images from media library, or enter PDF URL. PDF needs to be on the same domain or CORS needs to be enabled.", "real3d-flipbook") ?>
						</p>

						<div class="r3d-row r3d-row-pdf">

							<input type='text' class='regular-text' id='r3d-pdf-url' placeholder="PDF URL">
							<button class='button-secondary'
								id='r3d-select-pdf'><?php esc_html_e("Select PDF", "real3d-flipbook"); ?></button>
							<button class='button-secondary'
								id='r3d-select-images'><?php esc_html_e("Select images", "real3d-flipbook"); ?></button>
							<div class="r3d-pages"></div>

						</div>

						<h3 style="margin-top: 40px;"><?php esc_html_e("Thumbnail", "real3d-flipbook") ?></h3>
						<p><?php esc_html_e("Select image from media library, or enter URL.", "real3d-flipbook") ?></p>

						<div class="r3d-row r3d-row-thumb">
							<input type='text' class='regular-text' id='r3d-thumb-url' placeholder="Thumbnail URL">
							<button class='button-secondary'
								id='r3d-select-thumb'><?php esc_html_e("Select Image", "real3d-flipbook"); ?></button>

						</div>

						<h3 style="margin-top: 40px;"><?php esc_html_e("Flipbook settings", "real3d-flipbook") ?></h3>

						<div class="r3d-row r3d-row-mode">
							<span class="r3d-label-wrapper"><label
									for="r3d-mode"><?php esc_html_e("Mode", "real3d-flipbook") ?></label></span>
							<select id='r3d-mode' class="r3d-setting">
								<option selected="selected" value=""><?php esc_html_e("Default", "real3d-flipbook"); ?></option>
								<option value="normal">Normal (inside div)</option>
								<option value="lightbox">Lightbox (popup)</option>
								<option value="fullscreen">Fullscreen</option>
							</select>
						</div>

						<div class="r3d-row r3d-row-thumb r3d-row-lightbox" style="display: none;">
							<span class="r3d-label-wrapper"><label
									for="r3d-thumb"><?php esc_html_e("Show thumbnail", "real3d-flipbook"); ?></label></span>
							<select id='r3d-thumb' class="r3d-setting">
								<option selected="selected" value=""><?php esc_html_e("Default", "real3d-flipbook"); ?></option>
								<option value="1">yes</option>
								<option value="">no</option>
							</select>
						</div>

						<div class="r3d-row r3d-row-class r3d-row-lightbox" style="display: none;">
							<span class="r3d-label-wrapper"><label
									for="r3d-class"><?php esc_html_e("CSS class", "real3d-flipbook") ?></label></span>
							<input id="r3d-class" type="text" class="r3d-setting">
						</div>

						<?php
						echo esc_html(apply_filters('r3d_select_flipbook_before_insert', ''));
						?>

						<div class="r3d-row r3d-row-insert">
							<button class="button button-primary button-large" disabled="disabled"
								id="r3d-insert-btn"><?php esc_html_e("Insert flipbook", "real3d-flipbook"); ?></button>
						</div>

					</div>
				</div>
			</div>

		<?php
		}
	}

	public function enqueue_block_assets() {}

	public function enqueue_block_editor_assets()
	{
		wp_enqueue_script(
			'r3dfb-block-js',
			$this->PLUGIN_DIR_URL . "js/blocks.js",
			array('wp-editor', 'wp-blocks', 'wp-i18n', 'wp-element'),
			$this->PLUGIN_VERSION,
			true
		);

		$r3dfb_ids = get_option('real3dflipbooks_ids');

		if (!$r3dfb_ids) {
			$r3dfb_ids = [];
		}

		$books = [];

		if (!empty($r3dfb_ids)) {
			foreach ($r3dfb_ids as $id) {
				$fb = get_option('real3dflipbook_' . $id);
				if (is_array($fb) && isset($fb['id'])) {
					$book = [];
					$book["id"] = $fb["id"];
					$book["name"] = $fb["name"];
					if (isset($fb["mode"]))
						$book["mode"] = $fb["mode"];
					if (isset($fb["pdfUrl"]))
						$book["pdfUrl"] = $fb["pdfUrl"];
					array_push($books, $book);
				}
			}
		}

		wp_localize_script('r3dfb-block-js', 'r3dfb', $books);
	}

	public function settings()
	{

		include_once(plugin_dir_path(__FILE__) . 'settings.php');
	}

	public function import()
	{

		include_once(plugin_dir_path(__FILE__) . 'import.php');
	}

	public function addons()
	{

		include_once(plugin_dir_path(__FILE__) . 'addons.php');
	}

	public function upgrade()
	{
		include_once(plugin_dir_path(__FILE__) . 'upgrade-to-pro.php');
	}

	public function help()
	{

		include_once(plugin_dir_path(__FILE__) . 'help.php');
	}

	public function print_content()
	{

		global $current_screen;
		if ($current_screen->post_type == 'r3d') {
			include_once(plugin_dir_path(__FILE__) . 'edit-flipbook-post.php');
		}
	}

	public function add_meta_boxes()
	{

		add_meta_box('r3d_post_meta_box_shortcode', __('Shortcode', 'real3d-flipbook'), array($this, 'create_meta_box_shortcode'), 'r3d', 'side', 'high');
		
		add_meta_box('r3d_post_meta_box_help', __('Help', 'real3d-flipbook'), array($this, 'create_meta_box_help'), 'r3d', 'side', 'high');

		add_meta_box(
			'real3d_pro_features',
			__('Get More Features with Real3D Flipbok PRO!', 'real3d-flipbook'), // Title of the metabox
			array($this, 'pro_features_metabox_content'), // Callback function that will echo the content of the metabox
			'r3d',
			'normal',
			'high'
		);
		

	}

	public function create_meta_box_shortcode($post)
	{
		if ($post->post_type !== 'r3d') {
			return;
		}

		$flipbook_id = get_post_meta($post->ID, 'flipbook_id', true);

		// Check if flipbook_id is set and not empty
		if (!empty($flipbook_id)) {
		?>
			<code>[real3dflipbook id="<?php echo esc_attr($flipbook_id); ?>"]</code>
			<div id="<?php echo esc_attr($flipbook_id); ?>" class="button-secondary copy-shortcode">Copy</div>
		<?php
		} else {
		?>
			<p><?php esc_html_e('Publish the flipbook to get the shortcode.', 'real3d-flipbook'); ?></p>
		<?php
		}
	}




	
	public function pro_features_metabox_content($post)
	{
		?>
		<div style="padding:10px;">
			<p><?php esc_html_e('With PRO version you will get more features and options to customize your flipbooks:', 'real3d-flipbook'); ?>
			</p>
			<ol>
				<li>
					<strong><?php esc_html_e('High resolution PDF flipbooks:', 'real3d-flipbook'); ?></strong>
					<?php esc_html_e('Sharp flipbook pages with higher zoom level', 'real3d-flipbook'); ?>
				</li>
				<li>
					<strong><?php esc_html_e('Global settings:', 'real3d-flipbook'); ?></strong>
					<?php esc_html_e('Apply settings universally across all your flipbooks', 'real3d-flipbook'); ?>
				</li>
				<li>
					<strong><?php esc_html_e('PDF Links:', 'real3d-flipbook'); ?></strong>
					<?php esc_html_e('Links inside PDF will automatically work in flipbook', 'real3d-flipbook'); ?>
				</li>
				<li>
					<strong><?php esc_html_e('Deep linking:', 'real3d-flipbook'); ?></strong>
					<?php esc_html_e('Open specific flipbook and specific flipbook page with a link', 'real3d-flipbook'); ?>
				</li>
				<li>
					<strong><?php esc_html_e('More features:', 'real3d-flipbook'); ?></strong>
					<?php esc_html_e('Google Analytics, Zoom settings, Toolbar customization, Mobile settings, etc.', 'real3d-flipbook'); ?>
					<a href="<?php echo esc_url(admin_url('admin.php?page=real3d_flipbook_upgrade')); ?>">
						<?php esc_html_e('View all PRO features', 'real3d-flipbook'); ?>
					</a>
				</li>
			</ol>
			<p>
				<strong>
					<a href="<?php echo esc_url('https://1.envato.market/rn0QeB'); ?>" target="_blank">
						<?php esc_html_e('Upgrade to PRO Now', 'real3d-flipbook'); ?>
					</a>
				</strong>
			</p>
		</div>
	<?php
	}



	public function create_meta_box_help($post)
	{
	?>
		<style>
			.link-icon {
				vertical-align: middle;
				margin-right: 5px;
				text-decoration: none;
				/* Removes underline */
			}

			a:hover .link-icon {
				text-decoration: none;
				/* Keeps the icon from being underlined on hover */
			}

			.video-icon {
				color: #FF0000;
				/* YouTube red color */
			}

			.help-icon {
				color: #0073aa;
				/* WordPress blue color */
			}
		</style>
		<a href="https://youtu.be/1ljFRYr0Kh8" target="_blank">
			<span class="dashicons dashicons-video-alt3 link-icon video-icon"></span>
			<?php esc_html_e('Getting Started Video', 'real3d-flipbook'); ?>
		</a>
		<br />
		<a href="https://real3dflipbook.gitbook.io/wp-lite/" target="_blank">
			<span class="dashicons dashicons-book link-icon help-icon"></span>
			<?php esc_html_e('Online Documentation', 'real3d-flipbook'); ?>

		</a>
		<br />
		<a href="https://wordpress.org/support/plugin/real3d-flipbook-lite/" target="_blank">
			<span class="dashicons dashicons-sos link-icon help-icon"></span>
			<?php esc_html_e('Support Forum', 'real3d-flipbook'); ?>

		</a>
<?php
	}

	

	public function on_shortcode($atts, $content = null)
	{

		$args = shortcode_atts(
			array(
				'id'   => '-1',
				'name' => '-1',
				'pdf' => '-1',
				'mode' => '-1',
				'class' => '-1',
				'aspect' => '-1',
				'thumb' => '-1',
				'title' => '-1',
				'viewmode' => '-1',
				'lightboxopened' => '-1',
				'lightboxfullscreen' => '-1',
				'lightboxtext' => '-1',
				'lightboxcssclass' => '-1',
				'lightboxthumbnail' => '-1',
				'lightboxthumbnailurl' => '-1',
				'hidemenu' => '-1',
				'autoplayonstart' => '-1',
				'autoplayinterval' => '-1',
				'autoplayloop' => '-1',
				'zoom' => '-1',
				'zoomdisabled' => '-1',
				'btndownloadpdfurl' => '-1',
				'thumbcss' => '-1',
				'containercss' => '-1',
				'singlepage' => '-1',
				'startpage' => '-1',
				'pagenumberoffset' => '-1',
				'deeplinkingprefix' => '-1',
				'search' => '-1',
				'pages' => '-1',
				'thumbs' => '-1',
				'thumbalt' => '-1',
				'category' => '-1',
				'author' => '-1',
				'num' => '-1',
				'order' => '-1',
				'orderby' => '-1',
				'pagerangestart' => '-1',
				'pagerangeend' => '-1',
				'previewpages' => '-1',
				'securepdf' => '-1',
			),
			$atts
		);

		$id = (int) $args['id'];
		$name = $args['name'];

		$flipbook = get_option('real3dflipbook_' . $id);
			if (!$flipbook) {
			$flipbook = array();
			$id = '0';
		}

		$bookId = $id . '_' . uniqid();

		$flipbook = r3d_array_merge_deep($this->flipbook_global, $flipbook);

		foreach ($args as $key => $val) {
			if ($val != -1) {

				if ($key == 'mode') $key = 'mode';
				if ($key == 'viewmode') $key = 'viewMode';

				if ($key == 'pdf' && $val != "") $key = 'pdfUrl';

				if ($key == 'title') {
					$key = 'lightboxText';
					if ($val == 'true')
						$val = $flipbook['name'];
					else if ($val == 'false')
						$val = '';
				}
				if ($key == 'btndownloadpdfurl') $key = 'btnDownloadPdfUrl';
				if ($key == 'hidemenu') $key = 'hideMenu';
				if ($key == 'autoplayonstart') $key = 'autoplayOnStart';
				if ($key == 'autoplayinterval') $key = 'autoplayInterval';
				if ($key == 'autoplayloop') $key = 'autoplayLoop';
				if ($key == 'zoom') $key = 'zoomLevels';
				if ($key == 'zoomisabled') $key = 'zoomDisabled';

				if ($key == 'lightboxtext') $key = 'lightboxText';
				if ($key == 'lightboxcssclass') $key = 'lightboxCssClass';
				if ($key == 'class') {
					$key = 'lightboxCssClass';
					$flipbook['lightboxThumbnailUrl'] = '';
					$flipbook['mode'] = 'lightbox';
				}

				if ($key == 'lightboxthumbnailurl') $key = 'lightboxThumbnailUrl';
				if ($key == 'thumbcss') $key = 'lightboxThumbnailUrlCSS';
				if ($key == 'thumb') $key = 'lightboxThumbnailUrl';
				if ($key == 'containercss') $key = 'lightboxContainerCSS';
				if ($key == 'lightboxopened') $key = 'lightBoxOpened';
				if ($key == 'lightboxfullscreen') $key = 'lightBoxFullscreen';

				if ($key == 'aspect') {
					$key = 'containerRatio';
				}

				if ($key == 'singlepage') $key = 'singlePageMode';

				if ($key == 'startpage') $key = 'startPage';

				if ($key == 'deeplinkingprefix') {
					$flipbook['deeplinking']['prefix'] = $val;
				}

				if ($key == 'search') $key = 'searchOnStart';

				if ($key == 'thumbalt') $key = 'thumbAlt';
				if ($key == 'pagenumberoffset') $key = 'pageNumberOffset';

				if ($key == 'pagerangestart') $key = 'pageRangeStart';
				if ($key == 'pagerangeend') $key = 'pageRangeEnd';
				if ($key == 'previewpages') $key = 'previewPages';

				$flipbook[$key] = $val;
			}
		}

		if ($flipbook['pdfUrl']) {

			$pdf_url = esc_url($flipbook['pdfUrl']);

			}

		$flipbook['rootFolder'] = $this->PLUGIN_DIR_URL;
		$flipbook['version'] = $this->PLUGIN_VERSION;
		$flipbook['uniqueId'] = $bookId;

		if (!isset($flipbook['date']) && isset($flipbook['post_id']))
			$flipbook['date'] = get_the_date('Y-m-d', get_post($flipbook['post_id']));



		if ($args['previewpages'] == -1) {
			if (!$flipbook['previewMode']) $flipbook['previewPages'] = "";
			else if ($flipbook['previewMode'] == 'logged_out' && is_user_logged_in()) $flipbook['previewPages'] = "";
		}

		if ($flipbook['deeplinking']['enabled'] === "true") {
			if (!($flipbook['deeplinking']['prefix']) && isset($flipbook['post_id'])) {
				$post = get_post($flipbook['post_id']);
				if ($post !== null) {
					$flipbook['deeplinking']['prefix'] = $post->post_name . '/';
				}
			}
		}

		$output = '<div class="real3dflipbook" id="' . esc_attr($bookId) . '" style="position:absolute;" data-flipbook-options="' . esc_attr(wp_json_encode($flipbook)) . '"></div>';


		if (!wp_script_is('real3d-flipbook', 'enqueued')) {
			wp_enqueue_script("real3d-flipbook");
		}

		if (!wp_script_is('real3d-flipbook-embed', 'enqueued')) {
			wp_enqueue_script("real3d-flipbook-embed");

			wp_localize_script(
				'real3d-flipbook-embed',
				'r3d',
				array(
					'ajax_url' => admin_url('admin-ajax.php'),
					'nonce' => wp_create_nonce('nonce_flipbook_embed')
				)
			);
		}

		// wp_localize_script('real3d-flipbook-embed', 'real3dflipbook_'.$bookId, array(htmlspecialchars(json_encode($flipbook))));

		if (!wp_style_is('real3d-flipbook-style', 'enqueued')) {
			wp_enqueue_style("real3d-flipbook-style");
		}

		return $output;
	}
}

if (!function_exists('trace')) {
	function trace($var)
	{
		echo '<script type="text/javascript">';
		echo 'console.log(' . wp_json_encode($var) . ');';
		echo '</script>';
	}
}

if (!function_exists("r3d_array_merge_deep")) {
	function r3d_array_merge_deep($array1, $array2)
	{
		$merged = $array1;

		foreach ($array2 as $key => &$value) {
			if (is_array($value) && isset($merged[$key]) && is_array($merged[$key])) {
				$merged[$key] = r3d_array_merge_deep($merged[$key], $value);
			} else {
				$merged[$key] = $value;
			}
		}

		return $merged;
	}
}

function r3dfb_getDefaults()
{
	return array(

		'pages' => array(),
		'pdfUrl' => '',
		'printPdfUrl' => '',
		'tableOfContent' => array(),
		'id' => '',
		'bookId' => '',
		'date' => '',
		'lightboxThumbnailUrl' => '',
		'mode' => 'normal',
		'viewMode' => 'webgl',
		'pageTextureSize' => '2048',
		'pageTextureSizeSmall' => '1500',
		'pageTextureSizeMobile' => '',
		'pageTextureSizeMobileSmall' => '1024',
		'minPixelRatio' => '1',
		'pdfTextLayer' => 'true',
		'zoomMin' => '0.9',
		'zoomStep' => '2',
		'zoomSize' => '',
		'zoomReset' => 'false',
		'doubleClickZoom' => 'true',
		'pageDrag' => 'true',
		'singlePageMode' => 'false',
		'pageFlipDuration' => '1',
		'sound' => 'true',
		'startPage' => '1',
		'pageNumberOffset' => '0',
		'deeplinking' => array(
			'enabled' => 'false',
			'prefix' => ''
		),
		'responsiveView' => 'true',
		'responsiveViewTreshold' => '768',
		'responsiveViewRatio' => '1',
		'cover' => 'true',
		'backCover' => 'true',
		'height' => '400',
		'responsiveHeight' => 'true',
		'containerRatio' => '',
		'thumbnailsOnStart' => 'false',
		'contentOnStart' => 'false',
		'searchOnStart' => '',
		'searchResultsThumbs' => 'false',
		'tableOfContentCloseOnClick' => 'true',
		'thumbsCloseOnClick' => 'true',
		'autoplayOnStart' => 'false',
		'autoplayInterval' => '3000',
		'autoplayLoop' => 'true',
		'autoplayStartPage' => '1',
		'autoplayLoop' => 'true',
		'rightToLeft' => 'false',
		'pageWidth' => '',
		'pageHeight' => '',
		'thumbSize' => '130',
		'logoImg' => '',
		'logoUrl' => '',
		'logoUrlTarget' => '',
		'logoCSS' => 'position:absolute;left:0;top:0;',
		'menuSelector' => '',
		'zIndex' => 'auto',
		'preloaderText' => '',
		'googleAnalyticsTrackingCode' => '',
		'pdfBrowserViewerIfIE' => 'false',
		'modeMobile' => '',
		'viewModeMobile' => '',
		'aspectMobile' => '',
		'pageTextureSizeMobile' => '',
		'aspectRatioMobile' => '0.71',
		'singlePageModeIfMobile' => 'false',
		'logoHideOnMobile' => 'false',
		'mobile' => array(
			'thumbnailsOnStart' => 'false',
			'contentOnStart' => 'false',
			'currentPage' => array(
				'enabled' => 'false'
			),
		),
		'lightboxCssClass' => '',
		'lightboxLink' => '',
		'lightboxLinkNewWindow' => 'true',
		'lightboxBackground' => 'rgb(81, 85, 88)',
		'lightboxBackgroundPattern' => '',
		'lightboxBackgroundImage' => '',
		'lightboxContainerCSS' => 'display:inline-block;padding:10px;',
		'lightboxThumbnailHeight' => '300',
		'lightboxThumbnailUrlCSS' => 'display:block;',
		'lightboxThumbnailInfo' => 'false',
		'lightboxThumbnailInfoText' => '',
		'lightboxThumbnailInfoCSS' => 'top: 0;  width: 100%; height: 100%; font-size: 16px; color: #000; background: rgba(255,255,255,.8); ',
		'showTitle' => 'false',
		'showDate' => 'false',
		'hideThumbnail' => 'false',
		'lightboxText' => '',
		'lightboxTextCSS' => 'display:block;',
		'lightboxTextPosition' => 'top',
		'lightBoxOpened' => 'false',
		'lightBoxFullscreen' => 'false',
		'lightboxStartPage' => '',
		'lightboxMarginV' => '0',
		'lightboxMarginH' => '0',
		'lights' => 'true',
		'lightPositionX' => '0',
		'lightPositionY' => '150',
		'lightPositionZ' => '1400',
		'lightIntensity' => '0.6',
		'shadows' => 'true',
		'shadowMapSize' => '2048',
		'shadowOpacity' => '0.2',
		'shadowDistance' => '15',
		'pageHardness' => '2',
		'coverHardness' => '2',
		'pageRoughness' => '1',
		'pageMetalness' => '0',
		'pageSegmentsW' => '6',
		'pageSegmentsH' => '1',
		'pageMiddleShadowSize' => '4',
		'pageMiddleShadowColorL' => '#7F7F7F',
		'pageMiddleShadowColorR' => '#AAAAAA',
		'antialias' => 'false',
		'pan' => '0',
		'tilt' => '0',
		'rotateCameraOnMouseDrag' => 'true',
		'panMax' => '20',
		'panMin' => '-20',
		'tiltMax' => '0',
		'tiltMin' => '0',
		'currentPage' => array(
			'enabled' => 'true',
			'title' => __('Current page', 'real3d-flipbook'),
			'hAlign' => 'left',
			'vAlign' => 'top'
		),
		'btnAutoplay' => array(
			'enabled' => 'true',
			'title' => __('Autoplay', 'real3d-flipbook')
		),
		'btnNext' => array(
			'enabled' => 'true',
			'title' => __('Next Page', 'real3d-flipbook')
		),
		'btnLast' => array(
			'enabled' => 'false',
			'title' => __('Last Page', 'real3d-flipbook')
		),
		'btnPrev' => array(
			'enabled' => 'true',
			'title' => __('Previous Page', 'real3d-flipbook')
		),
		'btnFirst' => array(
			'enabled' => 'false',
			'title' => __('First Page', 'real3d-flipbook')
		),
		'btnZoomIn' => array(
			'enabled' => 'true',
			'title' => __('Zoom in', 'real3d-flipbook')
		),
		'btnZoomOut' => array(
			'enabled' => 'true',
			'title' => __('Zoom out', 'real3d-flipbook')
		),
		'btnToc' => array(
			'enabled' => 'true',
			'title' => __('Table of Contents', 'real3d-flipbook')
		),
		'btnThumbs' => array(
			'enabled' => 'true',
			'title' => __('Pages', 'real3d-flipbook')
		),
		'btnShare' => array(
			'enabled' => 'true',
			'title' => __('Share', 'real3d-flipbook')
		),
		'btnNotes' => array(
			'enabled' => 'false',
			'title' => __('Notes', 'real3d-flipbook')
		),
		'btnDownloadPages' => array(
			'enabled' => 'false',
			'url' => '',
			'title' => __('Download pages', 'real3d-flipbook')
		),
		'btnDownloadPdf' => array(
			'enabled' => 'true',
			'url' => '',
			'title' => __('Download PDF', 'real3d-flipbook'),
			'forceDownload' => 'true',
			'openInNewWindow' => 'true'
		),
		'btnSound' => array(
			'enabled' => 'true',
			'title' => __('Sound', 'real3d-flipbook')
		),
		'btnExpand' => array(
			'enabled' => 'true',
			'title' => __('Toggle fullscreen', 'real3d-flipbook')
		),
		'btnSingle' => array(
			'enabled' => 'true',
			'title' => __('Toggle single page', 'real3d-flipbook')
		),
		'btnSearch' => array(
			'enabled' => 'false',
			'title' => __('Search', 'real3d-flipbook')
		),
		'search' => array(
			'enabled' => 'false',
			'title' => __('Search', 'real3d-flipbook')
		),
		'btnBookmark' => array(
			'enabled' => 'false',
			'title' => __('Bookmark', 'real3d-flipbook')
		),
		'btnPrint' => array(
			'enabled' => 'true',
			'title' => __('Print', 'real3d-flipbook')
		),
		'btnTools' => array(
			'enabled' => 'true',
			'title' => __('Tools', 'real3d-flipbook')
		),
		'btnClose' => array(
			'enabled' => 'true',
			'title' => __('Close', 'real3d-flipbook')
		),

		'whatsapp' => array(
			'enabled' => 'true'
		),
		'twitter' => array(
			'enabled' => 'true'
		),
		'facebook' => array(
			'enabled' => 'true'
		),
		'pinterest' => array(
			'enabled' => 'true'
		),
		'email' => array(
			'enabled' => 'true'
		),
		'linkedin' => array(
			'enabled' => 'true'
		),
		'digg' => array(
			'enabled' => 'false'
		),
		'reddit' => array(
			'enabled' => 'false'
		),

		'shareUrl' => '',
		'shareTitle' => '',
		'shareImage' => '',

		'layout' => 1,
		'icons' => 'FontAwesome',
		'skin' => 'light',
		'useFontAwesome5' => 'true',
		'sideNavigationButtons' => 'true',
		'menuNavigationButtons' => 'false',
		'backgroundColor' => 'rgb(81, 85, 88)',
		'backgroundPattern' => '',
		'backgroundImage' => '',
		'backgroundTransparent' => 'false',

		'menuBackground' => '',
		'menuShadow' => '',
		'menuMargin' => '0',
		'menuPadding' => '0',
		'menuOverBook' => 'false',
		'menuFloating' => 'false',
		'menuTransparent' => 'false',

		'menu2Background' => '',
		'menu2Shadow' => '',
		'menu2Margin' => '0',
		'menu2Padding' => '0',
		'menu2OverBook' => 'true',
		'menu2Floating' => 'false',
		'menu2Transparent' => 'true',

		'skinColor' => '',
		'skinBackground' => '',

		'hideMenu' => 'false',
		'menuAlignHorizontal' => 'center',
		'btnColor' => '',
		'btnColorHover' => '',
		'btnBackground' => 'none',
		'btnRadius' => '0',
		'btnMargin' => '0',
		'btnSize' => '18',
		'btnPaddingV' => '10',
		'btnPaddingH' => '10',
		'btnShadow' => '',
		'btnTextShadow' => '',
		'btnBorder' => '',
		'sideBtnColor' => '#fff',
		'sideBtnColorHover' => '#fff',
		'sideBtnBackground' => 'rgba(0,0,0,.3)',
		'sideBtnBackgroundHover' => '',
		'sideBtnRadius' => '0',
		'sideBtnMargin' => '0',
		'sideBtnSize' => '25',
		'sideBtnPaddingV' => '10',
		'sideBtnPaddingH' => '10',
		'sideBtnShadow' => '',
		'sideBtnTextShadow' => '',
		'sideBtnBorder' => '',
		'closeBtnColorHover' => '#FFF',
		'closeBtnBackground' => 'rgba(0,0,0,.4)',
		'closeBtnRadius' => '0',
		'closeBtnMargin' => '0',
		'closeBtnSize' => '20',
		'closeBtnPadding' => '5',
		'closeBtnTextShadow' => '',
		'closeBtnBorder' => '',
		'floatingBtnColor' => '',
		'floatingBtnColorHover' => '',
		'floatingBtnBackground' => '',
		'floatingBtnBackgroundHover' => '',
		'floatingBtnRadius' => '',
		'floatingBtnMargin' => '',
		'floatingBtnSize' => '',
		'floatingBtnPadding' => '',
		'floatingBtnShadow' => '',
		'floatingBtnTextShadow' => '',
		'floatingBtnBorder' => '',
		'currentPageMarginV' => '5',
		'currentPageMarginH' => '5',
		'arrowsAlwaysEnabledForNavigation' => 'true',
		'arrowsDisabledNotFullscreen' => 'true',
		'touchSwipeEnabled' => 'true',
		'fitToWidth' => 'false',
		'rightClickEnabled' => 'true',
		'linkColor' => 'rgba(0, 0, 0, 0)',
		'linkColorHover' => 'rgba(255, 255, 0, 1)',
		'linkOpacity' => '0.4',
		'linkTarget' => '_blank',
		'pdfAutoLinks' => 'false',
		'disableRange' => 'false',

		'strings' => array(
			'print' => __('Print', 'real3d-flipbook'),
			'printLeftPage' => __('Print left page', 'real3d-flipbook'),
			'printRightPage' => __('Print right page', 'real3d-flipbook'),
			'printCurrentPage' => __('Print current page', 'real3d-flipbook'),
			'printAllPages' => __('Print all pages', 'real3d-flipbook'),
			'download' => __('Download', 'real3d-flipbook'),
			'downloadLeftPage' => __('Download left page', 'real3d-flipbook'),
			'downloadRightPage' => __('Download right page', 'real3d-flipbook'),
			'downloadCurrentPage' => __('Download current page', 'real3d-flipbook'),
			'downloadAllPages' => __('Download all pages', 'real3d-flipbook'),
			'bookmarks' => __('Bookmarks', 'real3d-flipbook'),
			'bookmarkLeftPage' => __('Bookmark left page', 'real3d-flipbook'),
			'bookmarkRightPage' => __('Bookmark right page', 'real3d-flipbook'),
			'bookmarkCurrentPage' => __('Bookmark current page', 'real3d-flipbook'),
			'search' => __('Search', 'real3d-flipbook'),
			'findInDocument' => __('Find in document', 'real3d-flipbook'),
			'pagesFoundContaining' => __('pages found containing', 'real3d-flipbook'),
			'noMatches' => __('No matches', 'real3d-flipbook'),
			'matchesFound' => __('matches found', 'real3d-flipbook'),
			'page' => __('Page', 'real3d-flipbook'),
			'matches' => __('matches', 'real3d-flipbook'),
			'thumbnails' => __('Thumbnails', 'real3d-flipbook'),
			'tableOfContent' => __('Table of Contents', 'real3d-flipbook'),
			'share' => __('Share', 'real3d-flipbook'),
			'pressEscToClose' => __('Press ESC to close', 'real3d-flipbook'),
			'password' => __('Password', 'real3d-flipbook'),
			'addNote' => __('Add note', 'real3d-flipbook'),
			'typeInYourNote' => __('Type in your note...', 'real3d-flipbook'),
		),

		'access' => 'free', //free, woo_subscription, ...
		'backgroundMusic' => '',
		'cornerCurl' => 'false',
		'pdfTools' => array(
			'pageHeight' => 1500,
			'thumbHeight' => 200,
			'quality' => 0.8,
			'textLayer' => 'true',
			'autoConvert' => 'true'
		),
		'slug' => '',
		'convertPDFLinks' => 'true',
		'convertPDFLinksWithClass' => '',
		'convertPDFLinksWithoutClass' => '',
		'overridePDFEmbedder' => 'true',
		'overrideDflip' => 'true',
		'overrideWonderPDFEmbed' => 'true',
		'override3DFlipBook' => 'true',
		'overridePDFjsViewer' => 'true',
		'resumeReading' => 'false',
		'previewPages' => '',
		'previewMode' => '',
	);
}

Real3DFlipbook::get_instance();
