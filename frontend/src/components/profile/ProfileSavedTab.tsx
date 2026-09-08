import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { ProfileGrid } from '@/components/profile/ProfileGrid';
import { MediaImage } from '@/components/common/MediaImage';
import * as collectionsApi from '@/api/collections';
import type { Post } from '@/types';
import type { CollectionOut } from '@/types/search';

interface ProfileSavedTabProps {
  savedPosts: Post[];
}

export function ProfileSavedTab({ savedPosts }: ProfileSavedTabProps) {
  const [collections, setCollections] = useState<CollectionOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    collectionsApi
      .getCollections()
      .then((data) => {
        if (!cancelled) setCollections(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[3px] md:gap-1 mb-1">
          <div className="relative aspect-square bg-ig-secondary border border-ig-border flex flex-col items-center justify-center gap-2">
            <Bookmark size={24} className="text-ig-text" />
            <span className="text-[12px] font-semibold px-2 text-center">모든 게시물</span>
          </div>
          {collections.map((col) => (
            <Link
              key={col.id}
              to={`/collections/${col.id}`}
              className="relative aspect-square bg-ig-secondary overflow-hidden group"
            >
              {col.cover_url ? (
                <MediaImage
                  src={col.cover_url}
                  alt={col.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Bookmark size={28} className="text-ig-text-secondary" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center text-white p-2">
                <span className="text-[14px] font-semibold text-center truncate w-full">{col.name}</span>
                <span className="text-[12px] opacity-90">{col.post_count}개</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ProfileGrid posts={savedPosts} savedOnly isOwn />
    </div>
  );
}
