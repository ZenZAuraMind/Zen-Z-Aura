export interface User {
  id: string;
  username: string;
  handle: string;
  role: 'admin' | 'member';
  avatarUrl: string;
  joinedAt: string;
  email?: string;
}

export type ForumCategory = 'mindset' | 'trends' | 'mysteries' | 'general';

export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string;
  title: string;
  content: string;
  category: ForumCategory;
  likes: string[]; // List of user IDs who liked
  commentsCount: number;
  createdAt: string;
}

export interface ForumComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string;
  content: string;
  createdAt: string;
}

export interface FanArt {
  id: string;
  title: string;
  description: string;
  url: string; // Dynamic base64 or external url
  isUploaded: boolean;
  authorId: string;
  authorName: string;
  authorHandle: string;
  likes: string[]; // User IDs who liked
  createdAt: string;
  status: 'approved' | 'pending';
}

export type VideoStatus = 'scripting' | 'recording' | 'editing' | 'scheduled' | 'released';
export type VideoType = 'long' | 'short';

export interface VideoUpdate {
  id: string;
  title: string;
  description: string;
  status: VideoStatus;
  type: VideoType;
  publishDate: string;
  progress: number; // 0 to 100
  likes: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  authorRole: 'admin' | 'member';
  content: string;
  createdAt: string;
  recipientId: string | null; // null for community global chat, string for private message to/from Zen Z Aura
}

export interface ChannelVideo {
  id: string;
  ytId?: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  type: VideoType;
  views: number;
  publishedAt: string;
  likes: number;
  comments: number;
  category?: string;
  subNiche?: string;
}

export interface ChannelStats {
  subscriberCount: number;
  subscriberGoal: number;
  activeMembers: number;
  totalViews: number;
}
