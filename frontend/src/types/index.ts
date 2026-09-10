export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  website?: string;
  avatar_url?: string;
  phone?: string;
  postcode?: string;
  address_line1?: string;
  address_line2?: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_following?: boolean;
  is_own_profile?: boolean;
  is_admin?: boolean;
  is_private?: boolean;
  is_requested?: boolean;
  is_active_now?: boolean | null;
}

export interface PostMedia {
  id: number;
  media_url: string;
  media_type: 'image' | 'video';
  position: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  storage_type: 'fresh' | 'frozen' | 'dried' | 'smoked';
  availability: 'year_round' | 'seasonal';
  season_start?: string | null;
  season_end?: string | null;
  stock: number;
  is_active: boolean;
  is_in_season: boolean;
  is_available: boolean;
}

export type FeedTab = 'products' | 'reviews' | 'daily';

export interface Post {
  id: number;
  user: User;
  image_url: string;
  caption?: string;
  location?: string;
  post_type?: 'standard' | 'product' | 'review';
  product?: Product | null;
  rating?: number | null;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_saved: boolean;
  created_at: string;
  comments?: Comment[];
  tagged_users?: User[];
  media?: PostMedia[];
}

export interface Reel {
  id: number;
  user: User;
  thumbnail_url: string;
  video_url?: string | null;
  caption?: string;
  audio_name?: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  user: User;
  content: string;
  created_at: string;
  parent_id?: number | null;
  like_count?: number;
  is_liked?: boolean;
  replies?: Comment[];
}

export interface Story {
  id: number;
  user: User;
  items: StoryItem[];
  viewed: boolean;
}

export interface StoryItem {
  id: number;
  image_url: string;
  media_type: 'image' | 'video';
  overlays?: StoryOverlay[];
  created_at: string;
  is_liked?: boolean;
}

export interface StoryViewerEntry {
  user: User;
  viewed_at: string;
}

export interface StoryOverlay {
  id: string;
  type: 'text' | 'sticker';
  content: string;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  color?: string;
  font_size?: number;
}

export interface SuggestedUser extends User {
  reason?: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
  totp_code?: string;
  trusted_device_token?: string;
  trust_device?: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  full_name: string;
  password: string;
  phone: string;
  postcode: string;
  address_line1: string;
  address_line2: string;
}

export interface ShippingAddress {
  phone: string;
  postcode: string;
  address_line1: string;
  address_line2: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  next_page: number | null;
  next_cursor?: string | null;
}

export interface HashtagPage extends PaginatedResponse<Post> {
  name: string;
  post_count: number;
}

export interface Message {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
  media_url?: string | null;
  media_type?: string | null;
  story_item_id?: number | null;
  is_deleted?: boolean;
}

export interface Conversation {
  id: number;
  is_group: boolean;
  title?: string | null;
  participant: User | null;
  participants: User[];
  messages: Message[];
  last_message: Message;
  unread_count: number;
  has_more_messages?: boolean;
}

export type NotificationType =
  | 'like'
  | 'follow'
  | 'comment'
  | 'mention'
  | 'reply'
  | 'follow_request'
  | 'order_new'
  | 'order_preparing'
  | 'order_shipped'
  | 'order_delivered';

export type NotificationTab = 'you' | 'following';

export interface Notification {
  id: number;
  type: NotificationType;
  tab: NotificationTab;
  actor: User;
  target_username?: string;
  post_id?: number;
  order_id?: number;
  post_image_url?: string;
  comment_preview?: string;
  created_at: string;
  is_read: boolean;
}

export interface ReelComment {
  id: number;
  user: User;
  content: string;
  created_at: string;
}
