import { useParams, Navigate } from 'react-router-dom';
import { PostModal } from '@/components/post/PostModal';
import { useEffect, useState } from 'react';
import * as postsApi from '@/api/posts';
import { DEFAULT_KEYWORDS, SITE_NAME, truncateSeo, useSeo, type SeoOverride } from '@/seo';
import type { Post } from '@/types';

function postSeo(post: Post): SeoOverride {
  const caption = truncateSeo(post.caption || '');
  const productName = post.product?.name;
  const image = post.image_url || undefined;

  if (post.post_type === 'product' && productName) {
    const description =
      caption ||
      `${productName} 신선한 수산물을 ${SITE_NAME}에서 만나보세요. 오징어, 꽃게, 조개, 새우, 회 등 제철 해산물.`;
    return {
      title: `${productName} 수산물`,
      description,
      keywords: `${productName}, ${DEFAULT_KEYWORDS}`,
      image,
      type: 'product',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productName,
        description,
        image,
        offers: {
          '@type': 'Offer',
          price: post.product?.price,
          priceCurrency: 'KRW',
          availability: post.product?.is_available
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      },
    };
  }

  if (post.post_type === 'review') {
    return {
      title: `${post.user.username}님의 수산물 후기`,
      description: caption || `${post.user.username}님이 남긴 수산물 구매 후기입니다.`,
      image,
      type: 'article',
    };
  }

  return {
    title: caption ? truncateSeo(caption, 50) : `${post.user.username}님의 수산물 소식`,
    description: caption || `${post.user.username}님의 수산물·해산물 게시물입니다.`,
    image,
    type: 'article',
  };
}

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  useSeo(post ? postSeo(post) : {});

  useEffect(() => {
    const id = Number(postId);
    if (!id) return;
    postsApi
      .getPost(id)
      .then(setPost)
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  if (!post) return <Navigate to="/" replace />;

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      {post && (
        <PostModal post={post} onClose={() => window.history.back()} />
      )}
    </div>
  );
}
