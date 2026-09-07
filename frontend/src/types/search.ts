export interface RecentSearchOut {
  id: number;
  query: string;
  search_type: string;
  searched_at: string;
}

export interface HashtagSearchOut {
  name: string;
  post_count: number;
}

export interface CollectionOut {
  id: number;
  name: string;
  post_count: number;
  cover_url?: string | null;
  created_at: string;
}
