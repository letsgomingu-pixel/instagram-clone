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

export interface ProductSearchOut {
  id: number;
  post_id: number;
  name: string;
  price: number;
  unit: string;
  storage_type: 'fresh' | 'frozen' | 'dried' | 'smoked';
  availability: 'year_round' | 'seasonal';
  stock: number;
  image_url?: string | null;
  is_available: boolean;
}

export interface CollectionOut {
  id: number;
  name: string;
  post_count: number;
  cover_url?: string | null;
  created_at: string;
}
