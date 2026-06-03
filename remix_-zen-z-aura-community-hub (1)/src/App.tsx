import React, { useState, useEffect, useRef } from "react";
import { 
  Youtube, Search, MessageSquare, Plus, Check, Heart, Send, 
  Upload, Sparkles, User as UserIcon, LogOut, Radio, Clock, 
  Shield, Award, Calendar, ChevronRight, Lock, Menu, X, Info, HelpCircle, Trash2, Settings, Camera,
  Play, Zap, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, ForumPost, ForumComment, FanArt, VideoUpdate, ChatMessage, ChannelVideo, ChannelStats, ForumCategory 
} from "./types";
import AuthModal from "./components/AuthModal";
import SocialFeed from "./components/SocialFeed";
import AdminStudio from "./components/AdminStudio";


const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("authToken");
  const headers = {
    ...(options.headers || {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
};

export default function App() {
  // Current logged in user info. Defaults to null, or read from localStorage if exists
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("zenzaura_user");
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { return null; }
    }
    return null;
  });

  // Main navigation tabs
  const [activeTab, setActiveTab] = useState<'hub' | 'forum' | 'fanart' | 'chat' | 'admin'>('hub');
  
  // API derived state
  const [stats, setStats] = useState<ChannelStats>({
    subscriberCount: 247385,
    subscriberGoal: 300000,
    activeMembers: 1420,
    totalViews: 4892400
  });

  const [videos, setVideos] = useState<ChannelVideo[]>([]);
  const [roadmap, setRoadmap] = useState<VideoUpdate[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [fanArts, setFanArts] = useState<FanArt[]>([]);
  
  // Interface toggle states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeForumCategory, setActiveForumCategory] = useState<ForumCategory | 'all'>('all');
  const [videoTypeFilter, setVideoTypeFilter] = useState<'all' | 'long' | 'short'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [newProfileAvatar, setNewProfileAvatar] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  
  // Video player modal stimulation
  const [playingVideo, setPlayingVideo] = useState<ChannelVideo | null>(null);
  const [simPlayProgress, setSimPlayProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Chat room state
  const [chatType, setChatType] = useState<'global' | 'direct'>('global');
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);
  const [newMsgContent, setNewMsgContent] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Forum creation modal or form
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState<ForumCategory>('general');

  // Comment thread details
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [postComments, setPostComments] = useState<ForumComment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState("");

  // Fan art upload state
  const [artTitle, setArtTitle] = useState("");
  const [artDesc, setArtDesc] = useState("");
  const [artBase64, setArtBase64] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Brand config override state
  const [brandConfig, setBrandConfig] = useState({
    brandName: "Zen Z Aura",
    brandHandle: "zenzauramind",
    brandEmail: "zenzauramind@gmail.com",
    logoType: "emoji" as "emoji" | "image",
    logoValue: "🗿",
    adminAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    announcement: "Master the Power of Silence.",
    themeColor: "amber",
    enableFanArtAutoApprove: true,
    enableSlowModeForForum: false,
    channelLink: "https://www.youtube.com/@zenzauramind"
  });

  // Rotating Daily Motivation quotes list
  const dailyMotivations = [
    "Your attention is your ultimate asset. Guard it cleanly, and focus on what moves your needle forward today.",
    "True silence is not the absolute lack of sound, but rather the perfect stillness of focus and logic within.",
    "Keep working in silence. Let your daily consistency do the talking, and allow your final results to define your power.",
    "Never seek outer validation. When you ceased fighting external waves and built your inner fortress, you won.",
    "You play the hand you are dealt, and you play it flawlessly. True sovereignty is mastering your reaction to the chaos.",
    "The shift represents deep, unwavering focus in an era of pure distraction. Stand tall, execute, and remain unbreakable.",
    "A structured mindset is the ultimate shield against noise. Master your morning routine, and guard your silence.",
    "The pain of hard, silent discipline is temporary, but the pain of dynamic regret is permanent. Select wisely."
  ];

  // Rotate motivation index based on deterministic 10-minute clock blocks
  const [motivationIndex, setMotivationIndex] = useState(() => {
    return Math.floor(Date.now() / (10 * 60 * 1000)) % dailyMotivations.length;
  });

  useEffect(() => {
    const checkInterval = setInterval(() => {
      setMotivationIndex(Math.floor(Date.now() / (10 * 60 * 1000)) % dailyMotivations.length);
    }, 10000); // lightweight check every 10 seconds for precise transitions
    return () => clearInterval(checkInterval);
  }, []);

  // Initial load
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Poll chats periodically to see if any Gemini / Admins replied
  useEffect(() => {
    const timer = setInterval(() => {
      fetchChats();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentUser, chatType]);

  // Handle auto scrolling for chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages, directMessages]);

  const fetchInitialData = async () => {
    try {
      const statsRes = await authenticatedFetch("/api/stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      const videosRes = await authenticatedFetch("/api/videos");
      const videosData = await videosRes.json();
      setVideos(videosData);

      const roadmapRes = await authenticatedFetch("/api/roadmap");
      const roadmapData = await roadmapRes.json();
      setRoadmap(roadmapData);

      const forumsRes = await authenticatedFetch("/api/forum/posts");
      const forumsData = await forumsRes.json();
      setForumPosts(forumsData);

      const fanartRes = await authenticatedFetch("/api/fanart");
      const fanartData = await fanartRes.json();
      setFanArts(fanartData);

      try {
        const brandRes = await authenticatedFetch("/api/brand/config");
        if (brandRes.ok) {
          const brandData = await brandRes.json();
          setBrandConfig(brandData);
        }
      } catch (brandErr) {
        console.error("Failed fetching branding configuration:", brandErr);
      }

      // Synchronize frontend local session with the server profile state
      if (currentUser) {
        try {
          const syncRes = await authenticatedFetch("/api/users/sync", {
            method: "POST"
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.success && syncData.user) {
              setCurrentUser(syncData.user);
              localStorage.setItem("zenzaura_user", JSON.stringify(syncData.user));
            } else {
              handleLogout();
            }
          } else {
            handleLogout();
          }
        } catch (syncErr) {
          console.error("Failed syncing active user profile with backend:", syncErr);
          handleLogout();
        }
      }

      fetchChats();
    } catch (err) {
      console.error("Failed fetching front-end data aggregates:", err);
    }
  };

  const fetchChats = async () => {
    // Only attempt chat syncing if a token is present in localStorage to prevent unauthorized fetch calls / noisy 401s
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    try {
      // Fetch public community messages
      const globalRes = await authenticatedFetch("/api/chat");
      if (!globalRes.ok) {
        return;
      }

      const contentType = globalRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return;
      }

      const globalData = await globalRes.json();
      if (Array.isArray(globalData)) {
        setGlobalMessages(globalData);
      }

      // If user is logged in, fetch direct 1-on-1 message exchanges
      if (currentUser) {
        const directRes = await authenticatedFetch(`/api/chat?recipientId=${currentUser.id}`);
        if (directRes.ok) {
          const directContentType = directRes.headers.get("content-type");
          if (directContentType && directContentType.includes("application/json")) {
            const directData = await directRes.json();
            if (Array.isArray(directData)) {
              setDirectMessages(directData);
            }
          }
        }
      }
    } catch (e: any) {
      // Graceful warning for normal network offline/transient conditions - avoids console.error telemetry failures
      console.warn("Chat synchronization temporarily unavailable (offline or booting):", e.message || e);
    }
  };

  const syncStats = (updatedStats: ChannelStats) => {
    setStats(updatedStats);
  };

  const handleSubscribeSimulate = async () => {
    try {
      const res = await authenticatedFetch("/api/stats/subscribe", { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setStats(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    localStorage.setItem("zenzaura_user", JSON.stringify(user));
    localStorage.setItem("authToken", token);
    setIsAuthOpen(false);
    fetchChats();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("zenzaura_user");
    localStorage.removeItem("authToken");
    setActiveTab("hub");
  };

  const handleUpdateProfile = async (usernameValue: string, avatarUrlValue: string) => {
    if (!currentUser) return false;
    try {
      const res = await authenticatedFetch("/api/users/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameValue,
          avatarUrl: avatarUrlValue
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem("zenzaura_user", JSON.stringify(data.user));
        // Softly re-fetch application data aggregates so all posts list the fresh details instantly
        fetchInitialData();
        return true;
      } else {
        alert(data.error || "Failed to update profile.");
        return false;
      }
    } catch (err) {
      console.error("Failed updating profile:", err);
      return false;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgContent.trim()) return;

    const body = {
      content: newMsgContent,
      recipientId: chatType === "direct" ? "admin" : null
    };

    try {
      const res = await authenticatedFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const addedMsg = await res.json();
        if (chatType === 'direct') {
          setDirectMessages(prev => [...prev, addedMsg]);
        } else {
          setGlobalMessages(prev => [...prev, addedMsg]);
        }
        setNewMsgContent("");
        
        // Trigger manual pull after a slight delay to capture AI replies or other incoming chat
        setTimeout(fetchChats, 2500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // FORUM HANDLERS
  const handleCreateForumPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    const postPayload = {
      title: newPostTitle,
      content: newPostContent,
      category: newPostCategory
    };

    try {
      const res = await authenticatedFetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload)
      });
      if (res.ok) {
        const newPost = await res.json();
        setForumPosts(prev => [newPost, ...prev]);
        setNewPostTitle("");
        setNewPostContent("");
        setIsNewPostOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLikePost = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/forum/posts/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const updated = await res.json();
        setForumPosts(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewPostComments = async (post: ForumPost) => {
    setSelectedPost(post);
    try {
      const res = await authenticatedFetch(`/api/forum/posts/${post.id}/comments`);
      if (res.ok) {
        const comments = await res.json();
        setPostComments(comments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newCommentContent.trim()) return;

    const payload = {
      content: newCommentContent
    };

    try {
      const res = await authenticatedFetch(`/api/forum/posts/${selectedPost.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const added = await res.json();
        setPostComments(prev => [...prev, added]);
        
        // Update comments count on main forum post list representation
        setForumPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
        setNewCommentContent("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/forum/posts/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setForumPosts(prev => prev.filter(p => p.id !== id));
        if (selectedPost?.id === id) {
          setSelectedPost(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // FAN ART HANDLERS
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const base64 = await convertFileToBase64(file);
        setArtBase64(base64);
      } else {
        alert("Please drop a valid image file (jpeg/png/webp format)");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        const base64 = await convertFileToBase64(file);
        setArtBase64(base64);
      }
    }
  };

  const handleUploadFanArt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artTitle.trim() || !artBase64) {
      alert("Please configure a title and drop an image of your design.");
      return;
    }

    const payload = {
      title: artTitle,
      description: artDesc,
      base64: artBase64
    };

    try {
      const res = await authenticatedFetch("/api/fanart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const addedArt = await res.json();
        setFanArts(prev => [addedArt, ...prev]);
        setArtTitle("");
        setArtDesc("");
        setArtBase64(null);
        alert("Fan Art established in our community records!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikeFanArt = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/fanart/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const updated = await res.json();
        setFanArts(prev => prev.map(art => art.id === id ? updated : art));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFanArt = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/fanart/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setFanArts(prev => prev.filter(art => art.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ROADMAP ACTIONS (TRIGGER CONSOLE CASCADE STYLES)
  const handleVoteRoadmap = async (id: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await authenticatedFetch(`/api/roadmap/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const updated = await res.json();
        setRoadmap(prev => prev.map(item => item.id === id ? updated : item));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter video & forums based on query and type categorization
  const filteredVideos = videos.filter(vid => {
    const matchesQuery = vid.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         vid.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = videoTypeFilter === 'all' || vid.type === videoTypeFilter;
    return matchesQuery && matchesType;
  });

  const filteredPosts = forumPosts.filter(post => {
    const categoryMatches = activeForumCategory === 'all' || post.category === activeForumCategory;
    const queryMatches = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatches && queryMatches;
  });

  const th = {
    text: brandConfig.themeColor === 'emerald' ? 'text-emerald-500' :
          brandConfig.themeColor === 'rose' ? 'text-rose-500' :
          brandConfig.themeColor === 'indigo' ? 'text-indigo-500' :
          brandConfig.themeColor === 'violet' ? 'text-violet-500' :
          brandConfig.themeColor === 'sky' ? 'text-sky-500' : 'text-amber-500',
          
    textMuted: brandConfig.themeColor === 'emerald' ? 'text-emerald-400' :
               brandConfig.themeColor === 'rose' ? 'text-rose-400' :
               brandConfig.themeColor === 'indigo' ? 'text-indigo-400' :
               brandConfig.themeColor === 'violet' ? 'text-violet-400' :
               brandConfig.themeColor === 'sky' ? 'text-sky-400' : 'text-amber-400',

    bg: brandConfig.themeColor === 'emerald' ? 'bg-emerald-500' :
        brandConfig.themeColor === 'rose' ? 'bg-rose-500' :
        brandConfig.themeColor === 'indigo' ? 'bg-indigo-500' :
        brandConfig.themeColor === 'violet' ? 'bg-violet-500' :
        brandConfig.themeColor === 'sky' ? 'bg-sky-500' : 'bg-amber-500',

    bgHover: brandConfig.themeColor === 'emerald' ? 'hover:bg-emerald-400' :
             brandConfig.themeColor === 'rose' ? 'hover:bg-rose-400' :
             brandConfig.themeColor === 'indigo' ? 'hover:bg-indigo-400' :
             brandConfig.themeColor === 'violet' ? 'hover:bg-violet-400' :
             brandConfig.themeColor === 'sky' ? 'hover:bg-sky-400' : 'hover:bg-amber-400',

    bgMuted: brandConfig.themeColor === 'emerald' ? 'bg-emerald-500/10' :
             brandConfig.themeColor === 'rose' ? 'bg-rose-500/10' :
             brandConfig.themeColor === 'indigo' ? 'bg-indigo-500/10' :
             brandConfig.themeColor === 'violet' ? 'bg-violet-500/10' :
             brandConfig.themeColor === 'sky' ? 'bg-sky-500/10' : 'bg-amber-500/10',

    border: brandConfig.themeColor === 'emerald' ? 'border-emerald-500/30' :
            brandConfig.themeColor === 'rose' ? 'border-rose-500/30' :
            brandConfig.themeColor === 'indigo' ? 'border-indigo-500/30' :
            brandConfig.themeColor === 'violet' ? 'border-violet-500/30' :
            brandConfig.themeColor === 'sky' ? 'border-sky-500/30' : 'border-amber-500/30',

    borderHover: brandConfig.themeColor === 'emerald' ? 'hover:border-emerald-500/60' :
                 brandConfig.themeColor === 'rose' ? 'hover:border-rose-500/60' :
                 brandConfig.themeColor === 'indigo' ? 'hover:border-indigo-500/60' :
                 brandConfig.themeColor === 'violet' ? 'hover:border-violet-500/60' :
                 brandConfig.themeColor === 'sky' ? 'hover:border-sky-500/60' : 'hover:border-amber-500/60',

    borderFocus: brandConfig.themeColor === 'emerald' ? 'focus:ring-emerald-500/50 focus:border-emerald-500' :
                 brandConfig.themeColor === 'rose' ? 'focus:ring-rose-500/50 focus:border-rose-500' :
                 brandConfig.themeColor === 'indigo' ? 'focus:ring-indigo-500/50 focus:border-indigo-500' :
                 brandConfig.themeColor === 'violet' ? 'focus:ring-violet-500/50 focus:border-violet-500' :
                 brandConfig.themeColor === 'sky' ? 'focus:ring-sky-500/50 focus:border-sky-500' : 'focus:ring-amber-500/50 focus:border-amber-500',

    shadow: brandConfig.themeColor === 'emerald' ? 'shadow-emerald-500/10' :
            brandConfig.themeColor === 'rose' ? 'shadow-rose-500/10' :
            brandConfig.themeColor === 'indigo' ? 'shadow-indigo-500/10' :
            brandConfig.themeColor === 'violet' ? 'shadow-violet-500/10' :
            brandConfig.themeColor === 'sky' ? 'shadow-sky-500/10' : 'shadow-amber-500/10',

    glow: brandConfig.themeColor === 'emerald' ? 'bg-emerald-500/5' :
          brandConfig.themeColor === 'rose' ? 'bg-rose-500/5' :
          brandConfig.themeColor === 'indigo' ? 'bg-indigo-500/5' :
          brandConfig.themeColor === 'violet' ? 'bg-violet-500/5' :
          brandConfig.themeColor === 'sky' ? 'bg-sky-500/5' : 'bg-amber-500/5',
          
    ring: brandConfig.themeColor === 'emerald' ? 'ring-emerald-500' :
          brandConfig.themeColor === 'rose' ? 'ring-rose-500' :
          brandConfig.themeColor === 'indigo' ? 'ring-indigo-500' :
          brandConfig.themeColor === 'violet' ? 'ring-violet-500' :
          brandConfig.themeColor === 'sky' ? 'ring-sky-500' : 'ring-amber-500',

    selection: brandConfig.themeColor === 'emerald' ? 'selection:bg-emerald-500 selection:text-black' :
               brandConfig.themeColor === 'rose' ? 'selection:bg-rose-500 selection:text-black' :
               brandConfig.themeColor === 'indigo' ? 'selection:bg-indigo-500 selection:text-white' :
               brandConfig.themeColor === 'violet' ? 'selection:bg-violet-500 selection:text-white' :
               brandConfig.themeColor === 'sky' ? 'selection:bg-sky-500 selection:text-black' : 'selection:bg-amber-500 selection:text-black'
  };

  return (
    <div className={`min-h-screen bg-[#0c0c0c] text-white flex flex-col font-sans relative antialiased ${th.selection}`}>
      {/* GLOW DECORATIONS */}
      <div className={`absolute top-0 left-1/4 w-[40%] h-[350px] ${th.glow} blur-[130px] rounded-full pointer-events-none`} />
      <div className="absolute bottom-10 right-10 w-[30%] h-[350px] bg-orange-600/3 blur-[140px] rounded-full pointer-events-none" />

      {/* HEADER NAVIGATION SHELL */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900/80 px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo / Channel Brand */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-neutral-900 border ${th.border} flex items-center justify-center ${th.text} font-mono text-xl font-bold shadow-md ${th.shadow} overflow-hidden`}>
              {brandConfig.logoType === 'emoji' ? (brandConfig.logoValue || "🗿") : (
                <img src={brandConfig.logoValue} alt="Logo" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-extrabold tracking-tight text-white font-sans">
                  {brandConfig.brandName}
                </h1>
                <span className={`${th.bgMuted} ${th.text} text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono font-bold`}>
                  Official Hub
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">
                @{brandConfig.brandHandle} | <a href={`mailto:${brandConfig.brandEmail}`} className={`hover:${th.text} tracking-tight`}>{brandConfig.brandEmail}</a>
              </p>
            </div>
          </div>

          {/* Real-time Subscriber stats banner */}
          <div className="flex items-center gap-4 bg-neutral-900/95 border border-neutral-850 px-4 py-2 rounded-2xl relative shadow-lg">
            <div className="text-center md:text-left">
              <span className="block text-[9px] uppercase tracking-widest font-mono text-neutral-500">Live Subscriber Count</span>
              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                <span className="text-lg font-black font-mono text-amber-400 tracking-tight animate-pulse">
                  {stats.subscriberCount.toLocaleString()}
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">/ {stats.subscriberGoal.toLocaleString()} goal</span>
              </div>
            </div>
            <a
              href={(brandConfig as any).channelLink || `https://www.youtube.com/@${brandConfig.brandHandle || "zenzauramind"}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSubscribeSimulate}
              className="bg-red-650 hover:bg-red-600 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow shadow-red-500/20"
            >
              <Youtube className="w-3.5 h-3.5" />
              Subscribe
            </a>
          </div>

          {/* Profile Toggles */}
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-neutral-900/80 p-1.5 pr-3 rounded-full border border-neutral-800">
                <button
                  onClick={() => {
                    setNewProfileAvatar(currentUser.avatarUrl);
                    setNewProfileName(currentUser.username);
                    setIsProfileEditOpen(true);
                  }}
                  className="relative group rounded-full overflow-hidden focus:outline-none"
                  title="Click to change profile picture (DP)"
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="w-7 h-7 rounded-full object-cover border border-amber-500/30 group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-2.5 h-2.5 text-white" />
                  </div>
                </button>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-white max-w-[80px] truncate block">
                      {currentUser.username}
                    </span>
                    {currentUser.role === "admin" && (
                      <Shield className="w-3 h-3 text-amber-500" title="Creator Admin Privilege active" />
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNewProfileAvatar(currentUser.avatarUrl);
                    setNewProfileName(currentUser.username);
                    setIsProfileEditOpen(true);
                  }}
                  className="p-1 text-neutral-400 hover:text-amber-500 rounded-full hover:bg-neutral-950 transition-colors ml-1"
                  title="Modify profile and display picture (DP)"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1 text-neutral-400 hover:text-red-400 rounded-full hover:bg-neutral-950 transition-colors ml-0.5"
                  title="Disconnect account sync"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-neutral-900 hover:bg-neutral-850 hover:border-amber-500/30 border border-neutral-800 text-xs font-semibold px-4 py-2 rounded-xl text-neutral-300 transition-all flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5 text-amber-500" />
                Sync Profile
              </button>
            )}
          </div>

        </div>
      </header>

      {/* TAB NAVIGATION RAIL */}
      <nav className="max-w-7xl w-full mx-auto px-4 mt-6">
        <div className="flex flex-wrap items-center gap-2 bg-neutral-950/65 p-1.5 rounded-2xl border border-neutral-900/80 relative">
          <button
            onClick={() => setActiveTab('hub')}
            className={`flex-1 min-w-[110px] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 relative cursor-pointer z-10 ${
              activeTab === 'hub' ? 'text-amber-500 font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {activeTab === 'hub' && (
              <motion.div
                layoutId="nav-track"
                className="absolute inset-0 bg-neutral-900 border border-neutral-800 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <Radio className="w-3.5 h-3.5" />
            Shorts & Videos
          </button>
          
          <button
            onClick={() => setActiveTab('forum')}
            className={`flex-1 min-w-[110px] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 relative cursor-pointer z-10 ${
              activeTab === 'forum' ? 'text-amber-500 font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {activeTab === 'forum' && (
              <motion.div
                layoutId="nav-track"
                className="absolute inset-0 bg-neutral-900 border border-neutral-800 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <MessageSquare className="w-3.5 h-3.5" />
            Fans Forum Area
          </button>

          <button
            onClick={() => setActiveTab('fanart')}
            className={`flex-1 min-w-[110px] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 relative cursor-pointer z-10 ${
              activeTab === 'fanart' ? 'text-amber-500 font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {activeTab === 'fanart' && (
              <motion.div
                layoutId="nav-track"
                className="absolute inset-0 bg-neutral-900 border border-neutral-800 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <Camera className="w-3.5 h-3.5" />
            Fan Art exhibits
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 min-w-[110px] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 relative cursor-pointer z-10 ${
              activeTab === 'chat' ? 'text-amber-500 font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {activeTab === 'chat' && (
              <motion.div
                layoutId="nav-track"
                className="absolute inset-0 bg-neutral-900 border border-neutral-800 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <Sparkles className="w-3.5 h-3.5" />
            Sanctuary Chat
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 min-w-[110px] text-xs font-black py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 relative cursor-pointer z-10 ${
                activeTab === 'admin' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow shadow-amber-500/20 font-extrabold' : 'text-amber-500/80 hover:text-amber-400 font-bold'
              }`}
            >
              {activeTab === 'admin' && (
                <motion.div
                  layoutId="nav-track"
                  className="absolute inset-0 bg-transparent rounded-xl -z-10"
                />
              )}
              <Shield className="w-3.5 h-3.5" />
              Creator Studio
            </button>
          )}
        </div>
      </nav>

      {/* SEARCH OR WELCOME BAR */}
      <div className="max-w-7xl w-full mx-auto px-4 mt-4">
        <div className="flex flex-col md:flex-row items-center gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-900 text-left">
          <div className="text-left flex-1">
            <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">Ongoing Brand Focus</span>
            <p className="text-xs text-neutral-300 mt-1">
              "Mastering Silence in a Noisy Universe" | Core Topics: <strong className="text-amber-100">Stoicism & Mindset Shift 🌋</strong>
            </p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-600" />
            <input
              type="text"
              placeholder="Search community posts & video catalogs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 pl-9 pr-4 text-white focus:outline-none focus:border-amber-500 placeholder-neutral-600"
            />
          </div>
        </div>
      </div>

      {/* MAIN DYNAMIC TAB SPACES */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* TAB 1: HUB STREAMS AND ROADMAPS */}
          {activeTab === 'hub' && (
            <motion.div
              key="hub-tab-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              id="hub-streams-tab"
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
            
            {/* COLUMN 1 & 2: LIVE VIDEOS STREAM FEED */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">YouTube Content Feed</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">Dynamically synchronized directly from @zenzauramind Channel.</p>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-850 w-fit">
                  {filteredVideos.length} synced videos
                </span>
              </div>

              {/* CATEGORY SELECTOR FOR LONG VIDEOS VS SHORTS */}
              <div className="flex flex-wrap items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-900/60 w-fit" id="youtube-category-filter">
                <button
                  type="button"
                  id="filter-video-all"
                  onClick={() => setVideoTypeFilter('all')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                    videoTypeFilter === 'all'
                      ? `${th.bgMuted} ${th.border} ${th.textMuted} border`
                      : 'text-neutral-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  All content
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] ${videoTypeFilter === 'all' ? `${th.textMuted} font-bold` : 'bg-neutral-900 text-neutral-500'}`}>
                    {videos.length}
                  </span>
                </button>
                <button
                  type="button"
                  id="filter-video-long"
                  onClick={() => setVideoTypeFilter('long')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                    videoTypeFilter === 'long'
                      ? `${th.bgMuted} ${th.border} ${th.textMuted} border`
                      : 'text-neutral-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Videos
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] ${videoTypeFilter === 'long' ? `${th.textMuted} font-bold` : 'bg-neutral-900 text-neutral-500'}`}>
                    {videos.filter(v => v.type === 'long').length}
                  </span>
                </button>
                <button
                  type="button"
                  id="filter-video-short"
                  onClick={() => setVideoTypeFilter('short')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                    videoTypeFilter === 'short'
                      ? `${th.bgMuted} ${th.border} ${th.textMuted} border`
                      : 'text-neutral-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Shorts
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] ${videoTypeFilter === 'short' ? `${th.textMuted} font-bold` : 'bg-neutral-900 text-neutral-500'}`}>
                    {videos.filter(v => v.type === 'short').length}
                  </span>
                </button>
              </div>

              {/* VIDEO TILES GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredVideos.length === 0 ? (
                  <p className="text-neutral-500 font-mono text-xs italic col-span-2">No videos match your search queries.</p>
                ) : (
                  filteredVideos.map((vid, idx) => (
                    <React.Fragment key={vid.id}>
                      <motion.div
                        onClick={() => {
                          setPlayingVideo(vid);
                          setIsPlaying(true);
                          setSimPlayProgress(0);
                        }}
                        className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden hover:border-amber-500/40 cursor-pointer transition-all duration-300 group shadow-md hover:-translate-y-0.5 text-left"
                        whileHover={{ scale: 1.01 }}
                      >
                        {/* Thumbnail frame */}
                        <div className="relative aspect-video bg-neutral-900 overflow-hidden">
                          <img
                            src={vid.thumbnail}
                            alt={vid.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                          <div className="absolute inset-0 bg-neutral-950/40 group-hover:bg-neutral-950/10 transition-colors" />
                          
                          {/* Play overlay button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 group-hover:border-amber-500 flex items-center justify-center text-white transition-colors">
                              <span className="text-sm">▶</span>
                            </div>
                          </div>

                          {/* Video timing marker */}
                          <span className="absolute bottom-2.5 right-2.5 bg-black/80 font-mono text-[9px] px-1.5 py-0.5 rounded text-white font-bold tracking-wider">
                            {vid.duration}
                          </span>

                          <span className="absolute top-2.5 left-2.5 bg-neutral-950/90 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-850 text-amber-500">
                            {vid.type === "short" ? "⚡ SHORTS" : "📺 GUIDE"}
                          </span>
                        </div>

                        {/* Video descriptions */}
                        <div className="p-4 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {vid.category && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                                {vid.category}
                              </span>
                            )}
                            {vid.subNiche && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-medium">
                                #{vid.subNiche}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                            {vid.title}
                          </h3>
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                            {vid.description}
                          </p>
                          
                          {/* Interactive counters */}
                          <div className="flex items-center gap-3 pt-2 text-[10px] font-mono text-neutral-500 border-t border-neutral-900/60 w-full justify-between">
                            <span>{vid.views.toLocaleString()} views</span>
                            <span>{vid.publishedAt}</span>
                            <span className="text-amber-500 flex items-center gap-0.5">
                              <Heart className="w-2.5 h-2.5 fill-current" /> {vid.likes.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                      

                    </React.Fragment>
                  ))
                )}
              </div>

              {/* ROADMAP / video PIPELINE SPOTLIGHT */}
              <div className="bg-neutral-900/40 p-5 rounded-2xl border border-neutral-850">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider font-sans uppercase text-neutral-300">Community Videos & Shorts Insights</h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Signal interest for future guides, vote what gets filmed first!</p>
                  </div>
                  <Calendar className="w-4 h-4 text-amber-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roadmap.map((item) => (
                    <div key={item.id} className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-900 space-y-3 relative text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase bg-neutral-900 text-neutral-400 py-0.5 px-2 rounded border border-neutral-850">
                          {item.type === "long" ? "📺 Full Guide" : "⚡ Shorts"}
                        </span>
                        <span className="text-[9px] font-mono text-amber-500 capitalize">{item.status}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5 min-h-[32px] line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>

                      {/* Vote & progress meter */}
                      <div className="flex items-center justify-between pt-1 w-full border-t border-neutral-900/60">
                        <div className="flex-1 mr-4">
                          <div className="flex justify-between items-center text-[9px] text-neutral-500 mb-0.5">
                            <span>Status: {item.progress}%</span>
                          </div>
                          <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full transition-all" style={{ width: `${item.progress}%` }} />
                          </div>
                        </div>

                        <button
                          onClick={() => handleVoteRoadmap(item.id)}
                          className={`flex items-center gap-1.5 text-[10px] py-1 px-2.5 rounded-lg border transition-all ${
                            item.likes.includes(currentUser?.id || "")
                              ? 'bg-amber-500/20 text-amber-500 border-amber-500/10'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-amber-500/30'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${item.likes.includes(currentUser?.id || "") ? 'fill-current' : ''}`} />
                          <span>{item.likes.length}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMN 3: PULSE FEED & BRAND CARD */}
            <div className="space-y-6">
              
              {/* BRAND CARD */}
              <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-850 p-5 rounded-2xl relative overflow-hidden text-left shadow-xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
                <h3 className="text-sm font-bold uppercase tracking-widest font-mono text-amber-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '30s' }} />
                  Daily Motivation
                </h3>
                <p className="text-xs text-neutral-200 mt-2.5 leading-relaxed font-sans italic">
                  "{dailyMotivations[motivationIndex]}"
                </p>
                <div className="mt-4 pt-3.5 border-t border-neutral-900/85 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
                    Cycles every 10 min
                  </span>
                  <span className="text-[10px] font-mono text-amber-500/80 font-bold border border-amber-500/10 px-1.5 py-0.5 rounded-md bg-amber-500/5">
                    Slot {motivationIndex + 1}/{dailyMotivations.length}
                  </span>
                </div>
              </div>

              {/* PULSE FEED */}
              <SocialFeed isAdmin={currentUser?.role === 'admin'} />

            </div>

          </motion.div>
        )}

        {/* TAB 2: COMMUNITY FORUM DISCUSSION */}
        {activeTab === 'forum' && (
          <motion.div
            key="forum-tab-pane"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            id="forum-posts-tab"
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          >
            
            {/* LEFT BAR: CATEGORIES SELECTOR */}
            <div className="lg:col-span-1 space-y-4 text-left">
              <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider text-neutral-400 mb-3 pb-2 border-b border-neutral-850">
                  <span>Forum Categories</span>
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                </div>
                
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveForumCategory('all')}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-between ${activeForumCategory === 'all' ? 'bg-neutral-950 text-amber-500 border border-neutral-850' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <span>🌌 All Sanctuary Topics</span>
                    <span className="text-[10px] font-mono text-neutral-600 font-bold">{forumPosts.length}</span>
                  </button>

                  <button
                    onClick={() => setActiveForumCategory('mindset')}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-between ${activeForumCategory === 'mindset' ? 'bg-neutral-950 text-amber-400' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <span>🌋 Stoicism & Mindset</span>
                    <span className="text-[10px] font-mono text-neutral-600 font-bold">
                      {forumPosts.filter(p => p.category === 'mindset').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveForumCategory('trends')}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-between ${activeForumCategory === 'trends' ? 'bg-neutral-950 text-amber-400' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <span>🤖 Future Trends & AI</span>
                    <span className="text-[10px] font-mono text-neutral-600 font-bold">
                      {forumPosts.filter(p => p.category === 'trends').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveForumCategory('mysteries')}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-between ${activeForumCategory === 'mysteries' ? 'bg-neutral-950 text-amber-400' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <span>🌲 Historical Mysteries</span>
                    <span className="text-[10px] font-mono text-neutral-600 font-bold">
                      {forumPosts.filter(p => p.category === 'mysteries').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveForumCategory('general')}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-between ${activeForumCategory === 'general' ? 'bg-neutral-950 text-amber-400' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <span>☕ General Discussion</span>
                    <span className="text-[10px] font-mono text-neutral-600 font-bold">
                      {forumPosts.filter(p => p.category === 'general').length}
                    </span>
                  </button>
                </div>
              </div>

              {/* STATS OVERVIEW */}
              <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 text-xs text-neutral-400 space-y-2">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-neutral-500 border-b border-neutral-850 pb-1">
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  Community Stats
                </div>
                <div className="flex justify-between"><span>Total Thinkers</span> <span className="font-mono text-white">{stats.activeMembers}</span></div>
                <div className="flex justify-between"><span>Live Views</span> <span className="font-mono text-white">{stats.totalViews.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Online Now</span> <span className="font-mono text-emerald-400">● 42 warriors</span></div>
              </div>
            </div>

            {/* MIDDLE AND RIGHT: THREAD LIST OR DETAILS */}
            <div className="lg:col-span-3 space-y-6 text-left">
              
              {selectedPost ? (
                // DETAILS VIEW
                <div className="bg-neutral-950 border border-neutral-850 p-6 rounded-2xl space-y-6 text-left">
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="text-xs text-amber-500 hover:underline font-mono flex items-center gap-1.5 mb-2"
                  >
                    ← Back to Sanctuary list
                  </button>

                  <div className="flex items-center gap-2.5">
                    <img
                      src={selectedPost.authorAvatarUrl}
                      alt={selectedPost.authorName}
                      className="w-10 h-10 rounded-full object-cover border border-amber-500/20"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{selectedPost.authorName}</span>
                        {selectedPost.authorId === "admin" && (
                          <span className="bg-amber-500 text-black font-semibold text-[9px] font-mono uppercase tracking-wider px-1.5 rounded">Owner</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">@{selectedPost.authorHandle} • {new Date(selectedPost.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[9px] font-mono text-amber-500 uppercase px-2 py-0.5 bg-amber-950/25 border border-amber-500/10 rounded">
                      Category: {selectedPost.category}
                    </span>
                    <h3 className="text-xl font-bold text-white tracking-tight leading-snug">{selectedPost.title}</h3>
                    <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">{selectedPost.content}</p>
                  </div>

                  {/* THREAD ACTIONS */}
                  <div className="flex items-center gap-4 pt-4 border-t border-neutral-900">
                    <button
                      onClick={() => handleLikePost(selectedPost.id)}
                      className={`text-xs py-1.5 px-3 rounded-lg border transition-colors flex items-center gap-1.5 ${selectedPost.likes.includes(currentUser?.id || "") ? 'bg-amber-500/20 text-amber-500 border-amber-500/10' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>{selectedPost.likes.length} Likes</span>
                    </button>
                    
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => handleDeletePost(selectedPost.id)}
                        className="text-xs py-1.5 px-3 rounded-lg bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-300 border border-neutral-800 hover:border-red-900 transition-colors ml-auto flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Moderate Thread
                      </button>
                    )}
                  </div>

                  {/* COMMENTS SECTION */}
                  <div className="space-y-4 pt-4 border-t border-neutral-900">
                    <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Responses ({postComments.length})</h4>
                    
                    <div className="space-y-3 max-h-[310px] overflow-y-auto pr-1">
                      {postComments.map((comment) => (
                        <div key={comment.id} className="bg-neutral-900/60 p-3.5 border border-neutral-850 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={comment.authorAvatarUrl}
                              alt={comment.authorName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <div className="text-left">
                              <span className="text-xs font-bold text-white block">
                                {comment.authorName}
                                {comment.authorId === "admin" && (
                                  <span className="bg-amber-500 text-black font-mono text-[8px] font-black uppercase px-1 rounded ml-1">Creator</span>
                                )}
                              </span>
                              <span className="text-[9px] font-mono text-neutral-500">@{comment.authorHandle}</span>
                            </div>
                            <span className="text-[9px] text-neutral-600 font-mono ml-auto">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-neutral-300 font-sans leading-relaxed pl-8 pr-2">
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* REPLY COMPOSER */}
                    <form onSubmit={handleAddComment} className="mt-4 bg-neutral-900 p-3 rounded-xl border border-neutral-850 flex gap-2">
                      <input
                        type="text"
                        value={newCommentContent}
                        onChange={(e) => setNewCommentContent(e.target.value)}
                        placeholder="Contribute your Stoic logic to this dialogue..."
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-400 text-black px-4.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                // LATEST FORUM THREADS LIST
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">Active Discussions</h3>
                      <p className="text-xs text-neutral-500">Mindset discussions and community content sharing.</p>
                    </div>

                    <button
                      onClick={() => {
                        if (!currentUser) setIsAuthOpen(true);
                        else setIsNewPostOpen(true);
                      }}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Discussion
                    </button>
                  </div>

                  {/* THREAD WRITER POPUP OVERLAY */}
                  {isNewPostOpen && (
                    <motion.div 
                      key="composer"
                      initial={{ opacity: 0, y: -8 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-neutral-900 border border-amber-500/20 p-5 rounded-2xl space-y-4 relative"
                    >
                      <button 
                        onClick={() => setIsNewPostOpen(false)}
                        className="absolute top-4 right-4 p-1 text-neutral-500 hover:text-white rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <h4 className="text-sm font-semibold text-amber-500 uppercase tracking-widest font-mono">Create Thread</h4>
                      
                      <form onSubmit={handleCreateForumPost} className="space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Thread Title</label>
                            <input
                              type="text"
                              value={newPostTitle}
                              onChange={(e) => setNewPostTitle(e.target.value)}
                              placeholder="e.g. Mastered Silence has doubled my focus thresholds"
                              className="w-full bg-neutral-950 border border-neutral-800 text-xs px-3 py-2 text-white rounded-lg focus:outline-none focus:border-amber-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Subject Topic</label>
                            <select
                              value={newPostCategory}
                              onChange={(e: any) => setNewPostCategory(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 text-xs px-2.5 py-2 text-white rounded-lg focus:outline-none focus:border-amber-500 font-sans"
                            >
                              <option value="mindset">🌋 Mindset & Stoicism</option>
                              <option value="trends">🤖 AI & Future Trends</option>
                              <option value="mysteries">🌲 Historical Mysteries</option>
                              <option value="general">☕ General Discussions</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Content Text</label>
                          <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Share deep wisdom or share files & stories with fellow followers here..."
                            rows={4}
                            className="w-full bg-neutral-950 border border-neutral-800 text-xs p-3 text-white rounded-lg focus:outline-none focus:border-amber-500 font-sans"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-amber-500 hover:bg-amber-400 py-2.5 rounded-lg text-black font-semibold text-xs"
                        >
                          Broadcast to Oasis Community Forum
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {/* THREAD CONTAINER ROWS */}
                  <div className="space-y-3">
                    {filteredPosts.length === 0 ? (
                      <p className="text-neutral-500 font-mono text-xs italic py-6">No threads verified in this sanctuary. Be the first to compose!</p>
                    ) : (
                      filteredPosts.map((post) => (
                        <div
                          key={post.id}
                          className="p-4 bg-neutral-950 border border-neutral-900 rounded-2xl hover:border-neutral-850 hover:bg-neutral-950/80 transition-all cursor-pointer space-y-3"
                          onClick={() => handleViewPostComments(post)}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={post.authorAvatarUrl}
                              alt={post.authorName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-white block">{post.authorName}</span>
                                {post.authorId === "admin" && (
                                  <span className="bg-amber-500 text-black text-[8px] font-mono uppercase px-1 rounded">Owner</span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-neutral-500 block">@{post.authorHandle}</span>
                            </div>
                            
                            <span className="text-[9px] font-mono text-neutral-500 uppercase px-2 py-0.5 bg-neutral-900 border border-neutral-850 rounded ml-auto">
                              {post.category}
                            </span>
                          </div>

                          <div className="space-y-1.5 pl-1">
                            <h4 className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors">
                              {post.title}
                            </h4>
                            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                              {post.content}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-900/60 pl-1 w-full justify-start">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikePost(post.id);
                              }}
                              className="hover:text-amber-500 flex items-center gap-1"
                            >
                              <Heart className={`w-3.5 h-3.5 ${post.likes.includes(currentUser?.id || "") ? 'text-amber-500 fill-current' : ''}`} />
                              <span>{post.likes.length}</span>
                            </button>

                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{post.commentsCount || 0} Responses</span>
                            </span>

                            <span className="text-[10px] ml-auto text-neutral-600">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* TAB 3: FAN ART EXHIBITS & DYNAMIC UPLOAD */}
        {activeTab === 'fanart' && (
          <motion.div
            key="fanart-tab-pane"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            id="fan-art-tab"
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row items-start justify-between border-b border-neutral-900 pb-5 text-left gap-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Sanctuary Fan Art Exhibits</h2>
                <p className="text-xs text-neutral-500 mt-1">Submit your original drawings, stoic visuals and Sigma posters to share with members.</p>
              </div>

              {/* STATS BADGE */}
              <div className="text-xs font-mono py-1 px-3 bg-neutral-950 border border-neutral-900 rounded-xl text-neutral-400">
                Total art files: <span className="text-amber-500 font-bold">{fanArts.length} Approved</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* LEFT COLUMN: UPLOAD CONSOLE AREA */}
              <div className="lg:col-span-1 space-y-4 text-left">
                <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 text-left">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-amber-500 border-b border-neutral-850 pb-2 mb-3">
                    Submit Masterwork
                  </h3>

                  <form onSubmit={handleUploadFanArt} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Visual Title</label>
                      <input
                        type="text"
                        value={artTitle}
                        onChange={(e) => setArtTitle(e.target.value)}
                        placeholder="e.g. Stoic Citadel Storm"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs px-2.5 py-1.5 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Inspirations / Details</label>
                      <textarea
                        value={artDesc}
                        onChange={(e) => setArtDesc(e.target.value)}
                        placeholder="What themes inspired this art piece?"
                        rows={2}
                        className="w-full bg-neutral-950 border border-neutral-800 text-[11px] p-2 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                      />
                    </div>

                    {/* DRAG AND DROP BOX CONTAINER ACCORDING TO GUIDELINES (Usability Patterns: File Upload) */}
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Image Upload (Drag & Drop)</label>
                      <div
                        id="drop-zone-container"
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border border-dashed p-4 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${isDragOver ? 'border-amber-500 bg-amber-500/5' : 'border-neutral-800 hover:border-neutral-600/80 bg-neutral-950'}`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        {artBase64 ? (
                          <div className="space-y-2 w-full">
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5" /> File Selected
                            </span>
                            <img
                              src={artBase64}
                              alt="thumbnail upload preview"
                              className="w-20 h-16 mx-auto object-cover rounded border border-neutral-800 shadow"
                            />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setArtBase64(null); }}
                              className="text-[9px] text-red-400 font-mono hover:underline block mx-auto bg-none border-none"
                            >
                              Reset picture
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                            <p className="text-[10px] text-neutral-400 leading-snug">
                              Drag & Drop image file, or <span className="text-amber-500 hover:underline font-bold">Browse files</span>
                            </p>
                            <span className="text-[8px] font-mono text-neutral-600 block mt-1">Supports PNG, JPG, WEBP formats</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Publish to Community Gallery
                    </button>
                  </form>
                </div>
              </div>

              {/* RIGHT SPACE: LIST CARDS */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {fanArts.length === 0 ? (
                    <div className="py-12 text-center text-neutral-600 col-span-3 font-mono italic text-xs">
                      No artworks uploaded yet in the gallery archive. Be the initial pathfinder.
                    </div>
                  ) : (
                    fanArts.map((art) => (
                      <div
                        key={art.id}
                        className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden hover:border-neutral-800 transition-all group text-left"
                      >
                        {/* Artwork container */}
                        <div className="relative aspect-[4/3] bg-neutral-900 overflow-hidden">
                          <img
                            src={art.url}
                            alt={art.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                          />
                        </div>

                        {/* Title and details */}
                        <div className="p-4 space-y-2">
                          <div>
                            <h4 className="font-bold text-sm text-white line-clamp-1">{art.title}</h4>
                            <p className="text-[11px] text-neutral-400 min-h-[30px] line-clamp-2 leading-relaxed mt-0.5">
                              {art.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-neutral-900 text-neutral-500">
                            <div>
                              <span className="text-neutral-400 block font-semibold truncate max-w-[100px]">By {art.authorName}</span>
                              <span className="text-neutral-600">@{art.authorHandle}</span>
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleLikeFanArt(art.id)}
                                className={`py-1 px-2 rounded-lg border text-[10px] transition-colors flex items-center gap-1 ${art.likes.includes(currentUser?.id || "") ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' : 'bg-neutral-900 text-neutral-400 border-neutral-850 hover:border-neutral-700'}`}
                              >
                                <Heart className={`w-3 h-3 ${art.likes.includes(currentUser?.id || "") ? 'fill-current' : ''}`} />
                                {art.likes.length}
                              </button>

                              {currentUser?.role === 'admin' && (
                                <button
                                  onClick={() => handleDeleteFanArt(art.id)}
                                  className="p-1 bg-neutral-900 border border-neutral-850 text-neutral-500 hover:text-red-400 hover:border-red-950 rounded-lg transition-all"
                                  title="Remove Art piece"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </motion.div>
          )}

        {/* TAB 4: SACRED MESSAGE SANCTUARY CHATS */}
        {activeTab === 'chat' && (
          <motion.div
            key="chat-tab-pane"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            id="sanctuary-chats-tab"
            className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left"
          >
            
            {/* COLUMN 1: CHANNEL MEMBERS INFO */}
            <div className="lg:col-span-1 space-y-4 text-left">
              <div className="bg-neutral-900 p-4.5 rounded-2xl border border-neutral-850">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 pb-2 border-b border-neutral-800 mb-3 flex items-center justify-between">
                  <span>Chat Chambers</span>
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                </h3>
                
                <div className="space-y-1.5">
                  <button
                    onClick={() => setChatType('global')}
                    className={`w-full text-left text-xs py-2.5 px-3 rounded-xl font-semibold transition-all flex items-center justify-between ${chatType === 'global' ? 'bg-neutral-950 text-amber-500 border border-neutral-850' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <span>🌌 Global Sanctuary Room</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </button>

                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setIsAuthOpen(true);
                        return;
                      }
                      setChatType('direct');
                    }}
                    className={`w-full text-left text-xs py-2.5 px-3 rounded-xl font-semibold transition-all flex items-center justify-between ${chatType === 'direct' ? 'bg-neutral-950 text-amber-500 border border-neutral-850' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      👤 Direct Zen Consultation
                    </span>
                    <span className="bg-neutral-900 px-1.5 py-0.5 rounded font-mono text-[9px] text-amber-500 border border-neutral-800 font-bold">
                      Gemini
                    </span>
                  </button>
                </div>
              </div>

              {/* PHILOSOPHY GUIDELINE CALLS */}
              <div className="bg-neutral-100/5 p-4 rounded-xl text-xs text-neutral-400 leading-relaxed space-y-2">
                <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest block">Direct Consult Guideline:</span>
                <p>
                  Send a private message to channel architect <strong className="text-white">Zen Z Aura</strong> to explore customized Stoic queries, mindset blocks and receive dynamic philosophical advice powered by Gemini.
                </p>
              </div>
            </div>

            {/* CHANNEL WINDOW */}
            <div className="lg:col-span-3 bg-neutral-950 border border-neutral-900 rounded-2xl flex flex-col h-[520px] relative overflow-hidden">
              <div className="bg-neutral-900/60 p-4 border-b border-neutral-900 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {chatType === 'global' ? "🌌 Global Sanctuary Room" : "👤 Direct Consult Studio with Zen Z Aura"}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {chatType === 'global' 
                      ? "Dialogue openly with global explorers in our common quiet circle." 
                      : "Direct member messaging channel with owner Zen Z Aura."}
                  </p>
                </div>

                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850">
                  {chatType === 'global' ? `${globalMessages.length} messages` : `${directMessages.length} consults`}
                </span>
              </div>

              {/* MESSAGES SCROLLER */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatType === 'global' ? (
                  globalMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <img
                        src={msg.authorAvatarUrl}
                        alt={msg.authorName}
                        className="w-8 h-8 rounded-full border border-neutral-800 object-cover mt-0.5"
                      />
                      <div className="text-left bg-neutral-900/40 p-3 rounded-2xl border border-neutral-900 max-w-[85%]">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white block">
                            {msg.authorName}
                          </span>
                          {msg.authorRole === "admin" && (
                            <span className="bg-amber-500 text-black font-black font-mono text-[8.5px] uppercase tracking-wide px-1 rounded">Owner</span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-300 font-sans leading-relaxed mt-1">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  directMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 py-12 py-1/4">
                      <HelpCircle className="w-10 h-10 text-neutral-800 mb-2" />
                      <p className="text-xs font-mono">You haven't initiated direct counseling dialogue with Zen Z Aura yet.</p>
                      <p className="text-[10px] text-neutral-500 mt-1 max-w-[280px]">Draft a consultation request below to receive custom tailored advice from Zen.</p>
                    </div>
                  ) : (
                    directMessages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.authorId === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                        <img
                          src={msg.authorAvatarUrl}
                          alt={msg.authorName}
                          className="w-8 h-8 rounded-full border border-neutral-800 object-cover mt-0.5"
                        />
                        <div className={`text-left p-3 rounded-2xl border max-w-[85%] ${
                          msg.authorId === currentUser?.id 
                            ? 'bg-amber-600/10 border-amber-500/10 text-right' 
                            : 'bg-neutral-900/40 border-neutral-900'
                        }`}>
                          <div className="flex items-center gap-1 justify-between">
                            <span className="text-xs font-bold text-white">
                              {msg.authorName}
                            </span>
                            {msg.authorId === "admin" && (
                              <span className="bg-amber-500 text-black font-bold font-mono text-[8.5px] uppercase tracking-wide px-1 rounded">Owner</span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-200 font-sans leading-relaxed mt-1 whitespace-pre-line">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )
                )}
                <div ref={chatEndRef} />
              </div>

              {/* INPUT BAR */}
              <form onSubmit={handleSendMessage} className="p-3 bg-neutral-900 border-t border-neutral-900 flex gap-2">
                <input
                  type="text"
                  value={newMsgContent}
                  onChange={(e) => setNewMsgContent(e.target.value)}
                  placeholder={
                    chatType === 'global' 
                      ? "Dialogue with other warriors..." 
                      : "Direct message Zen. Seek counsel on Stoicism, Trend AI, Future careers..."
                  }
                  className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sans"
                />
                <button
                  type="submit"
                  className="bg-amber-500 text-black font-bold px-4 rounded-xl text-xs hover:bg-amber-400 transform transition-colors active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </motion.div>
        )}

        {/* TAB 5: ADMIN CREATOR STUDIO */}
        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <motion.div
            key="admin-studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-left"
          >
            <AdminStudio
              stats={stats}
              onUpdateStats={syncStats}
              onAddVideo={(v) => {
                setVideos(prev => [v, ...prev]);
              }}
              onAddRoadmap={(r) => {
                setRoadmap(prev => [...prev, r]);
              }}
              onUpdateRoadmap={(id, update) => {
                setRoadmap(prev => prev.map(item => item.id === id ? { ...item, ...update } : item));
              }}
              onDeleteRoadmap={(id) => {
                setRoadmap(prev => prev.filter(item => item.id !== id));
              }}
              onSyncVideos={(syncedVideos) => {
                setVideos(syncedVideos);
              }}
              onUpdateBrand={(brand) => {
                setBrandConfig(brand);
                if (currentUser && currentUser.role === "admin") {
                  const updatedUser = { 
                    ...currentUser, 
                    avatarUrl: brand.adminAvatarUrl || currentUser.avatarUrl, 
                    username: brand.brandName || currentUser.username 
                  };
                  setCurrentUser(updatedUser);
                  localStorage.setItem("zenzaura_user", JSON.stringify(updatedUser));
                }
              }}
              roadmap={roadmap}
              videos={videos}
               onDeleteVideo={(id) => {
                setVideos(prev => prev.filter(v => v.id !== id));
              }}
              onUpdateVideo={(id, updates) => {
                setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
              }}
            />
          </motion.div>
        )}
        </AnimatePresence>
      </main>
      


      <footer className="bg-neutral-950 border-t border-neutral-900 py-8 px-4 text-center mt-12">
        <div className="max-w-7xl mx-auto space-y-4">
          <p className="text-xs text-neutral-500 font-mono">
            © 2026 {brandConfig.brandName} - {brandConfig.announcement || "Master the Power of Silence."}
          </p>
          <div className="flex items-center justify-center gap-6 text-[11px] font-mono text-neutral-400">
            <span>Contact: <a href={`mailto:${brandConfig.brandEmail}`} className={`hover:${th.text} underline text-neutral-300`}>{brandConfig.brandEmail}</a></span>
            <span>Handle: <span className="text-white">@{brandConfig.brandHandle}</span></span>
            <span>Channel Creed: <span className={`${th.text} font-bold`}>Notice the Shift 🗿☄️</span></span>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL DIALOG OVERLAY */}
      <AnimatePresence>
        {isProfileEditOpen && currentUser && (
          <div 
            onClick={() => setIsProfileEditOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500" />
              
              <button
                onClick={() => setIsProfileEditOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white bg-neutral-950 p-1.5 rounded-full border border-neutral-850 z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-500" />
                  Cultivate Profile Appearance
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Overhaul your personal username, identity display, and avatar picture (DP).
                </p>
              </div>

              <div className="space-y-4">
                {/* Live DP Mock preview sphere */}
                <div className="flex items-center gap-4 bg-neutral-950 p-3 rounded-2xl border border-neutral-850">
                  <div className="relative">
                    <img
                      src={newProfileAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"}
                      alt="Preview"
                      className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/40"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80";
                      }}
                    />
                    <span className="absolute bottom-0 right-0 bg-neutral-900 text-amber-500 p-1 rounded-full border border-neutral-800 text-[8px] font-bold">
                      LIVE
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-neutral-300 font-mono">Avatar Preview</h5>
                    <p className="text-[10px] text-neutral-500 leading-relaxed font-sans mt-0.5">
                      Updated details propagate instantly across chats, community comments and fans posts.
                    </p>
                  </div>
                </div>

                {/* Name field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold font-mono text-neutral-400 uppercase tracking-wider">
                    Display Nickname
                  </label>
                  <input
                    type="text"
                    value={newProfileName || ""}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g. Zen Practitioner"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-600 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Image URL field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold font-mono text-neutral-400 uppercase tracking-wider">
                    Avatar Image URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newProfileAvatar || ""}
                      onChange={(e) => setNewProfileAvatar(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 px-3 pl-8 text-xs text-white placeholder-neutral-600 focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                    <span className="absolute left-2.5 top-2.5 text-[10px] text-neutral-500 font-mono">URL</span>
                  </div>
                </div>

                {/* Preset image suggestions selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold font-mono text-neutral-500 uppercase tracking-widest">
                    Or select a Mindset Preset Avatar
                  </label>
                  <div className="grid grid-cols-4 gap-2 bg-neutral-950/60 p-2 rounded-xl border border-neutral-850 max-h-[140px] overflow-y-auto">
                    {[
                      { name: "Cosmic", url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=150&auto=format&fit=crop&q=80" },
                      { name: "Stoic Stone", url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80" },
                      { name: "Ocean Flow", url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=150&auto=format&fit=crop&q=80" },
                      { name: "Sakura", url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=150&auto=format&fit=crop&q=80" },
                      { name: "Mountain", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150&auto=format&fit=crop&q=80" },
                      { name: "Spirit Fox", url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=150&auto=format&fit=crop&q=80" },
                      { name: "Pebbles", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80" },
                      { name: "Zen Garden", url: "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?w=150&auto=format&fit=crop&q=80" },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewProfileAvatar(preset.url)}
                        className={`relative rounded-lg overflow-hidden h-12 border transition-all ${newProfileAvatar === preset.url ? 'border-amber-500 scale-[1.03] ring-1 ring-amber-500/40' : 'border-neutral-800 hover:border-neutral-700'}`}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[8px] font-mono text-center text-neutral-300 truncate">
                          {preset.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Update Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsProfileEditOpen(false)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-xs text-neutral-400 py-2.5 rounded-xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newProfileName.trim()) return alert("Nickname cannot be empty!");
                      const success = await handleUpdateProfile(newProfileName, newProfileAvatar);
                      if (success) {
                        setIsProfileEditOpen(false);
                      }
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-md shadow-amber-500/10"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isAuthOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAuthOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full cursor-default"
            >
              <button
                onClick={() => setIsAuthOpen(false)}
                className="absolute top-4 right-4 z-20 text-neutral-400 hover:text-white hover:scale-110 active:scale-95 p-1.5 rounded-full bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <AuthModal
                onSuccess={handleLoginSuccess}
                onClose={() => setIsAuthOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED VIDEO INTERACTIVE PLAYER MODAL OVERLAY */}
      <AnimatePresence>
        {playingVideo && (
          <div 
            onClick={() => setPlayingVideo(null)}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto cursor-pointer"
          >
            {/* Highly clickable fixed close button on top-right of the viewport overlay */}
            <button
              onClick={() => setPlayingVideo(null)}
              className="fixed top-4 right-4 z-55 bg-neutral-900/90 hover:bg-neutral-800 text-white p-3 rounded-full border border-neutral-800 shadow-2xl backdrop-blur transition-all flex items-center justify-center hover:scale-105 active:scale-95 group cursor-pointer"
              title="Close Player"
            >
              <X className="w-5 h-5 text-neutral-300 group-hover:text-amber-400 group-hover:rotate-90 transition-all duration-300" />
            </button>

            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-neutral-900 border border-neutral-800 rounded-3xl ${playingVideo.type === 'short' ? 'max-w-[320px]' : 'max-w-2xl'} w-full overflow-hidden shadow-2xl relative text-left max-h-[90vh] overflow-y-auto scrollbar-thin cursor-default`}
            >
              {/* Real Video Player Component using YouTube iFrame */}
              <div className={`relative ${playingVideo.type === 'short' ? 'aspect-[9/16]' : 'aspect-video'} bg-neutral-950 flex flex-col items-center justify-center border-b border-neutral-850`}>
                {(() => {
                  const getPlayingYtId = () => {
                    if (playingVideo.ytId) return playingVideo.ytId;
                    if (playingVideo.id.startsWith("yt_")) return playingVideo.id.replace("yt_", "");
                    // High quality relevant fallback video streams for mock database items
                    if (playingVideo.id === "vid1") return "gBO_A_qNntg"; // Silence power
                    if (playingVideo.id === "vid2") return "77iH8D78N_Q"; // AI 2030 survivability
                    if (playingVideo.id === "vid3") return "_UAn84hGg_E"; // Dyatlov Pass
                    if (playingVideo.id === "vid4") return "BVUZYdfXPaE"; // Channel shorts
                    if (playingVideo.id === "vid5") return "BVUZYdfXPaE"; // Channel shorts
                    return null;
                  };

                  const ytId = getPlayingYtId();
                  const ytUrl = playingVideo.type === 'short' 
                    ? `https://www.youtube.com/shorts/${ytId}` 
                    : `https://www.youtube.com/watch?v=${ytId}`;

                  if (ytId) {
                    return (
                      <>
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                          title={playingVideo.title}
                          className="w-full h-full border-0 absolute inset-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                        {/* Elegant float badge if embed has restrictions */}
                        <a 
                          href={ytUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute bottom-3 right-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[10px] px-3 py-1.5 rounded-lg border border-neutral-800 shadow-xl flex items-center gap-1 z-30 hover:scale-[1.03] transition-all"
                        >
                          <span>Open on YouTube ↗</span>
                        </a>
                      </>
                    );
                  }

                  return (
                    <>
                      <img
                        src={playingVideo.thumbnail}
                        alt={playingVideo.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 filter blur-sm"
                      />

                      <div className="z-10 text-center space-y-4 px-6">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
                          <Radio className="w-8 h-8 animate-pulse text-amber-500" />
                        </div>
                        <div>
                          <span className="bg-amber-500/10 text-amber-400 font-mono text-[9px] font-extrabold uppercase py-0.5 px-2.5 rounded-full border border-neutral-800">
                            Simulated Backup Playback
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">{playingVideo.title}</h4>
                        </div>
                      </div>

                      {/* Progress bar stream simulation */}
                      <div className="absolute bottom-0 left-0 w-full bg-neutral-800 h-1">
                        <div className="bg-amber-500 h-full animate-pulse" style={{ width: '45%' }} />
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Informative area */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-500 uppercase">
                    {playingVideo.type === 'short' ? '⚡ Zen Short Detail' : '📺 Full Lesson Detail'}
                  </span>
                  
                  {/* High prominent button for any embedding restricted videos */}
                  {(() => {
                    const getPlayingYtId = () => {
                      if (playingVideo.ytId) return playingVideo.ytId;
                      if (playingVideo.id.startsWith("yt_")) return playingVideo.id.replace("yt_", "");
                      if (playingVideo.id === "vid1") return "gBO_A_qNntg";
                      if (playingVideo.id === "vid2") return "77iH8D78N_Q";
                      if (playingVideo.id === "vid3") return "_UAn84hGg_E";
                      if (playingVideo.id === "vid4") return "BVUZYdfXPaE";
                      if (playingVideo.id === "vid5") return "BVUZYdfXPaE";
                      return null;
                    };
                    const ytId = getPlayingYtId();
                    if (!ytId) return null;
                    const ytUrl = playingVideo.type === 'short' 
                      ? `https://www.youtube.com/shorts/${ytId}` 
                      : `https://www.youtube.com/watch?v=${ytId}`;
                    return (
                      <a
                        href={ytUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black text-neutral-950 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 rounded-xl transition-all hover:scale-[1.03] active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>Open Youtube ↗</span>
                      </a>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">{playingVideo.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">{playingVideo.description}</p>
                </div>
                
                {/* Embed-specific warning banner helper for 150/153 errors */}
                <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-850 text-[11px] text-neutral-400 font-sans leading-relaxed flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5">ℹ️ Tip:</span>
                  <span>
                    If this video shows an <strong className="text-neutral-300">"embedding error"</strong> or requires playing directly on YouTube, simply use the <strong className="text-amber-400">"Watch directly on YouTube"</strong> button above to watch it cleanly.
                  </span>
                </div>

                {/* Admin Quick Embed Setter */}
                {currentUser?.role === 'admin' && (
                  <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-amber-500/10 space-y-2">
                    <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider block">
                      ⚡ Creator Override: Configure Embed ID
                    </span>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newIdVal = (formData.get("embed-id-input") as string || "").trim();
                        
                        // Extract YT base ID
                        let extracted = newIdVal;
                        if (newIdVal.includes("youtube.com") || newIdVal.includes("youtu.be")) {
                          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
                          const match = newIdVal.match(regExp);
                          if (match && match[2].length === 11) {
                            extracted = match[2];
                          }
                        }
                        
                        try {
                          const res = await fetch(`/api/videos/${playingVideo.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              authRole: "admin",
                              ytId: extracted
                            })
                          });
                          if (res.ok) {
                            const updatedVid = await res.json();
                            // Update local list
                            setVideos(prev => prev.map(v => v.id === playingVideo.id ? updatedVid : v));
                            // Update current play video state to reflect new ytId instantly
                            setPlayingVideo(updatedVid);
                            alert("YouTube Embed ID updated successfully! No direct YouTube redirection needed.");
                          } else {
                            alert("Failed to update Embed ID on the server.");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Error updating Embed ID.");
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="embed-id-input"
                        type="text"
                        placeholder="Paste YouTube video id or link (e.g., 2AzxlCNk_Fo)"
                        defaultValue={playingVideo.ytId || ""}
                        className="flex-1 bg-neutral-900 border border-neutral-800 text-[11px] font-sans text-white rounded-lg py-1 px-3.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-400 text-neutral-955 text-[10px] uppercase font-mono font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Set Embed
                      </button>
                    </form>
                    <p className="text-[9px] text-neutral-500 leading-tight font-sans">
                      Setting this Embed ID mounts a high-quality interactive player directly in this window.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 pt-3 border-t border-neutral-800 justify-between">
                  <span>Author: @zenzauramind</span>
                  <span>Duration: {playingVideo.duration}</span>
                  <span>Views: {playingVideo.views.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
