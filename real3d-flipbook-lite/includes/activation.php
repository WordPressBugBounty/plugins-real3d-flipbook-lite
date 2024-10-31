<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly
}

function real3d_flipbook_activation()
{
	if (!get_option('r3d_posts_generated')) {

		$real3dflipbooks_ids = get_option('real3dflipbooks_ids');
		if (is_array($real3dflipbooks_ids)) {
			foreach ($real3dflipbooks_ids as $real3dflipbooks_id) {
				$book = get_option('real3dflipbook_' . $real3dflipbooks_id);
				if ($book && (!isset($book['post_id']) || !get_post_status($book['post_id']))) {
					$args = [
						'post_title'    => $book["name"],
						'post_type'     => 'r3d',
						'post_status'   => 'publish',
						'meta_input'    => [
							'flipbook_id' => $real3dflipbooks_id,
						],
					];

					if (isset($book['date'])) {
						$args['post_date'] = $book['date'];
					}

					$postId = wp_insert_post($args);

					$book["post_id"] = $postId;
					update_option('real3dflipbook_' . $real3dflipbooks_id, $book);
				}
			}
		}
	}

	update_option('r3d_posts_generated', true);

	wp_redirect(admin_url('edit.php?post_type=r3d'));
	exit;
}

real3d_flipbook_activation();
