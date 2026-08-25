export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  website?: string;
  avatar_url?: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_following?: boolean;
  is_own_profile?: boolean;
  is_admin?: boolean;
}

export interface PostMedia {
  id: number;
  media_url: string;
  media_type: 'image' | 'video';
  position: number;
}

export interface Post {
  id: number;
  user: User;
  image_url: string;
  caption?: string;
  location?: string;
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
}

export interface RegisterData {
  email: string;
  username: string;
  full_name: string;
  password: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  next_page: number | null;
}

export interface Message {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Conversation {
  id: number;
  participant: User;
  messages: Message[];
  last_message: Message;
  unread_count: number;
}

export type NotificationType = 'like' | 'follow' | 'comment';

export type NotificationTab = 'you' | 'following';

export interface Notification {
  id: number;
  type: NotificationType;
  tab: NotificationTab;
  actor: User;
  target_username?: string;
  post_id?: number;
  post_image_url?: string;
  comment_preview?: string;
  created_at: string;
  is_read: boolean;
}
