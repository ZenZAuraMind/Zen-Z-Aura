import React, { useState } from "react";
import { 
  BarChart, Users, Eye, Sparkles, Plus, Check, Trash2, 
  RefreshCw, Radio, FileText, ArrowRight, Video, Flame, Loader2,
  Link2, Youtube, AlertCircle, Terminal, HelpCircle, Settings
} from "lucide-react";
import { ChannelStats, VideoUpdate, VideoType, VideoStatus, ChannelVideo } from "../types";

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("authToken");
  const headers = {
    ...(options.headers || {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
};

interface AdminStudioProps {
  stats: ChannelStats;
  onUpdateStats: (newStats: any) => void;
  onAddVideo: (vid: ChannelVideo) => void;
  onAddRoadmap: (item: any) => void;
  onUpdateRoadmap: (id: string, updates: any) => void;
  onDeleteRoadmap: (id: string) => void;
  onSyncVideos?: (videos: ChannelVideo[]) => void;
  onUpdateBrand?: (brand: any) => void;
  roadmap: VideoUpdate[];
  videos?: ChannelVideo[];
  onDeleteVideo?: (id: string) => void;
  onUpdateVideo?: (id: string, updates: any) => void;
}

export default function AdminStudio({
  stats,
  onUpdateStats,
  onAddVideo,
  onAddRoadmap,
  onUpdateRoadmap,
  onDeleteRoadmap,
  onSyncVideos,
  onUpdateBrand,
  roadmap,
  videos = [],
  onDeleteVideo,
  onUpdateVideo
}: AdminStudioProps) {
  // Stat adjustment fields
  const [subCount, setSubCount] = useState(stats?.subscriberCount || 0);
  const [subGoal, setSubGoal] = useState(stats?.subscriberGoal || 0);
  const [viewsCount, setViewsCount] = useState(stats?.totalViews || 0);
  const [memCount, setMemCount] = useState(stats?.activeMembers || 0);
  const [isUpdatingStats, setIsUpdatingStats] = useState(false);

  React.useEffect(() => {
    if (stats) {
      setSubCount(stats.subscriberCount ?? 0);
      setSubGoal(stats.subscriberGoal ?? 0);
      setViewsCount(stats.totalViews ?? 0);
      setMemCount(stats.activeMembers ?? 0);
    }
  }, [stats]);

  // Real Automatic YouTube Sync States
  const [ytConfigHandle, setYtConfigHandle] = useState("");
  const [ytConfigEnabled, setYtConfigEnabled] = useState(true);
  const [ytConfigInterval, setYtConfigInterval] = useState(10);
  const [ytLastSynced, setYtLastSynced] = useState("Never");
  const [ytLogs, setYtLogs] = useState<any[]>([]);
  const [isYtSyncingNow, setIsYtSyncingNow] = useState(false);
  const [isSavingYtConfig, setIsSavingYtConfig] = useState(false);
  const [ytError, setYtError] = useState("");
  const [ytSuccessMsg, setYtSuccessMsg] = useState("");

  // Brand Settings states
  const [brandName, setBrandName] = useState("Zen Z Aura");
  const [brandHandle, setBrandHandle] = useState("zenzauramind");
  const [brandEmail, setBrandEmail] = useState("zenzauramind@gmail.com");
  const [logoType, setLogoType] = useState<"emoji" | "image">("emoji");
  const [logoValue, setLogoValue] = useState("🗿");
  const [adminAvatarUrl, setAdminAvatarUrl] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [themeColor, setThemeColor] = useState("amber");
  const [enableFanArtAutoApprove, setEnableFanArtAutoApprove] = useState(true);
  const [enableSlowModeForForum, setEnableSlowModeForForum] = useState(false);
  const [channelLink, setChannelLink] = useState("");

  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [brandSuccess, setBrandSuccess] = useState("");
  const [brandError, setBrandError] = useState("");

  // Registered Users database state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError("");
    try {
      const res = await authenticatedFetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setUsersError(errData.error || "Failed to load registered users database.");
      }
    } catch (err: any) {
      setUsersError(err.message || "An error occurred fetching the users roster.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  React.useEffect(() => {
    fetchYtConfig();
    fetchBrandConfig();
    fetchUsers();
  }, []);

  const fetchBrandConfig = async () => {
    try {
      const res = await authenticatedFetch("/api/brand/config");
      if (res.ok) {
        const config = await res.json();
        setBrandName(config.brandName || "Zen Z Aura");
        setBrandHandle(config.brandHandle || "zenzauramind");
        setBrandEmail(config.brandEmail || "zenzauramind@gmail.com");
        setLogoType(config.logoType || "emoji");
        setLogoValue(config.logoValue || "🗿");
        setAdminAvatarUrl(config.adminAvatarUrl || "");
        setAnnouncement(config.announcement || "");
        setThemeColor(config.themeColor || "amber");
        setEnableFanArtAutoApprove(config.enableFanArtAutoApprove !== false);
        setEnableSlowModeForForum(config.enableSlowModeForForum === true);
        setChannelLink(config.channelLink || "https://www.youtube.com/@" + (config.brandHandle || "zenzauramind"));
      }
    } catch (e) {
      console.error("Error fetching brand config:", e);
    }
  };

  const handleSaveBrandConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBrand(true);
    setBrandSuccess("");
    setBrandError("");

    try {
      const res = await authenticatedFetch("/api/brand/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authRole: "admin",
          brandName,
          brandHandle,
          brandEmail,
          logoType,
          logoValue,
          adminAvatarUrl,
          announcement,
          themeColor,
          enableFanArtAutoApprove,
          enableSlowModeForForum,
          channelLink
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBrandSuccess("Branding policies updated across all nodes!");
        if (onUpdateBrand) {
          onUpdateBrand(data.config);
        }
        setTimeout(() => setBrandSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setBrandError(errData.error || "Failed to save branding parameters.");
      }
    } catch (err: any) {
      setBrandError(err.message || "Network error occurred.");
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoValue(reader.result as string);
      setLogoType("image");
    };
    reader.readAsDataURL(file);
  };

  const handleDpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAdminAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleYtThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setYtThumbnailUrl(reader.result as string);
      setYtThumbnailType("upload");
    };
    reader.readAsDataURL(file);
  };

  const fetchYtConfig = async () => {
    try {
      const res = await authenticatedFetch("/api/youtube/config");
      if (res.ok) {
        const config = await res.json();
        setYtConfigHandle(config.handle || "");
        setYtConfigEnabled(config.enabled !== false);
        setYtConfigInterval(config.autoSyncIntervalMinutes || 10);
        setYtLastSynced(config.lastSyncedAt || "Never");
        setYtLogs(config.syncLogs || []);
      }
    } catch (err) {
      console.error("Error fetching YouTube sync config:", err);
    }
  };

  const handleSaveYtConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingYtConfig(true);
    setYtError("");
    setYtSuccessMsg("");
    try {
      const res = await authenticatedFetch("/api/youtube/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authRole: "admin",
          handle: ytConfigHandle,
          enabled: ytConfigEnabled,
          autoSyncIntervalMinutes: ytConfigInterval
        })
      });
      if (res.ok) {
        const data = await res.json();
        setYtLastSynced(data.config.lastSyncedAt || "Just now");
        setYtLogs(data.config.syncLogs || []);
        setYtSuccessMsg("YouTube configuration updated and automated scheduler restarted!");
        setTimeout(() => setYtSuccessMsg(""), 4000);
      } else {
        const errData = await res.json();
        setYtError(errData.error || "Failed to save YouTube configurations.");
      }
    } catch (err: any) {
      setYtError(err.message || "Network error updating configurations.");
    } finally {
      setIsSavingYtConfig(false);
    }
  };

  const handleForceSync = async () => {
    setIsYtSyncingNow(true);
    setYtError("");
    setYtSuccessMsg("");
    try {
      const res = await authenticatedFetch("/api/youtube/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authRole: "admin" })
      });
      if (res.ok) {
        const data = await res.json();
        if (onSyncVideos) {
          onSyncVideos(data.videos);
        }
        if (data.stats) {
          onUpdateStats(data.stats);
          setSubCount(data.stats.subscriberCount);
          setViewsCount(data.stats.totalViews);
        }
        setYtLastSynced(data.config.lastSyncedAt || "Just now");
        setYtLogs(data.config.syncLogs || []);
        setYtSuccessMsg(`Sync complete! Loaded ${data.videos.length} total uploads. Integrated brand-new ones directly!`);
        setTimeout(() => setYtSuccessMsg(""), 6000);
      } else {
        const errData = await res.json();
        setYtError(errData.error || "Scan failed. Ensure handle exists on YouTube.");
      }
    } catch (err: any) {
      setYtError(err.message || "Exception triggered manual scanning. Please check server.");
    } finally {
      setIsYtSyncingNow(false);
    }
  };

  // New video fields (YouTube connect simulator)
  const [ytTitle, setYtTitle] = useState("");
  const [ytDescription, setYtDescription] = useState("");
  const [ytType, setYtType] = useState<VideoType>("long");
  const [ytDuration, setYtDuration] = useState("");
  const [ytVideoUrlOrId, setYtVideoUrlOrId] = useState("");
  const [ytThumbnailUrl, setYtThumbnailUrl] = useState("");
  const [ytThumbnailType, setYtThumbnailType] = useState<"url" | "upload" | "youtube">("youtube");
  const [videoAddedStatus, setVideoAddedStatus] = useState(false);

  const extractYoutubeId = (urlOrId: string): string | null => {
    if (!urlOrId) return null;
    const clean = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
      return clean;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = clean.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Video Asset Override states
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnail, setEditThumbnail] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editType, setEditType] = useState<VideoType>("long");
  const [editYtId, setEditYtId] = useState("");
  const [editViews, setEditViews] = useState(0);
  const [editLikes, setEditLikes] = useState(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const startEditingVideo = (vid: ChannelVideo) => {
    setEditingVideoId(vid.id);
    setEditTitle(vid.title || "");
    setEditDescription(vid.description || "");
    setEditThumbnail(vid.thumbnail || "");
    setEditDuration(vid.duration || "");
    setEditType(vid.type || "long");
    setEditYtId(vid.ytId || "");
    setEditViews(vid.views ?? 0);
    setEditLikes(vid.likes ?? 0);
  };

  const handleUpdateVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideoId) return;
    setIsSavingEdit(true);
    try {
      const res = await authenticatedFetch(`/api/videos/${editingVideoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authRole: "admin",
          title: editTitle,
          description: editDescription,
          thumbnail: editThumbnail,
          duration: editDuration,
          type: editType,
          ytId: editYtId,
          views: editViews,
          likes: editLikes
        })
      });
      if (res.ok) {
        const updated = await res.json();
        if (onUpdateVideo) {
          onUpdateVideo(editingVideoId, updated);
        }
        setEditingVideoId(null);
        alert("Video parameters synchronized successfully across dynamic routes!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteVideoAction = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this video item?")) return;
    try {
      const res = await authenticatedFetch(`/api/videos/${id}?authRole=admin`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authRole: "admin" })
      });
      if (res.ok) {
        if (onDeleteVideo) {
          onDeleteVideo(id);
        }
        alert("Video deleted successfully.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Roadmap creation fields
  const [roadTitle, setRoadTitle] = useState("");
  const [roadDesc, setRoadDesc] = useState("");
  const [roadType, setRoadType] = useState<VideoType>("long");
  const [roadStatus, setRoadStatus] = useState<VideoStatus>("scripting");
  const [roadProgress, setRoadProgress] = useState(15);
  const [roadDate, setRoadDate] = useState("");

  // Gemini Outline Generator fields
  const [aiTopic, setAiTopic] = useState("");
  const [aiDuration, setAiDuration] = useState("10");
  const [aiOutline, setAiOutline] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const handleSaveStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStats(true);
    try {
      const res = await authenticatedFetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authRole: "admin",
          subscriberCount: subCount,
          subscriberGoal: subGoal,
          activeMembers: memCount,
          totalViews: viewsCount
        })
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateStats(updated);
        alert("Subscriber stats synchronized perfectly across the network!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStats(false);
    }
  };

  const handleConnectYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytTitle.trim()) return;

    let finalThumbnail = ytThumbnailUrl;
    const extractedId = extractYoutubeId(ytVideoUrlOrId) || "";

    if (ytThumbnailType === "youtube" && extractedId) {
      finalThumbnail = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
    }

    try {
      const res = await authenticatedFetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authRole: "admin",
          title: ytTitle,
          description: ytDescription,
          duration: ytDuration || (ytType === "short" ? "0:45" : "12:15"),
          type: ytType,
          ytId: extractedId || undefined,
          thumbnail: finalThumbnail || undefined
        })
      });
      if (res.ok) {
        const addedVideo = await res.json();
        onAddVideo(addedVideo);
        setVideoAddedStatus(true);
        setTimeout(() => setVideoAddedStatus(false), 3000);
        setYtTitle("");
        setYtDescription("");
        setYtDuration("");
        setYtVideoUrlOrId("");
        setYtThumbnailUrl("");
        setYtThumbnailType("youtube");
      }
    } catch (err) {
      console.error("Yt push error:", err);
    }
  };

  const handleCreateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadTitle.trim()) return;

    try {
      const res = await authenticatedFetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authRole: "admin",
          title: roadTitle,
          description: roadDesc,
          status: roadStatus,
          type: roadType,
          publishDate: roadDate,
          progress: roadProgress
        })
      });
      if (res.ok) {
        const addedRoad = await res.json();
        onAddRoadmap(addedRoad);
        setRoadTitle("");
        setRoadDesc("");
        setRoadProgress(10);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateOutline = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiOutline("");
    try {
      const res = await authenticatedFetch("/api/gemini/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authRole: "admin",
          topic: aiTopic,
          duration: aiDuration
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiOutline(data.outline);
      } else {
        setAiOutline("Error generating outline. Ensure connection is stable.");
      }
    } catch (err) {
      setAiOutline("An exception occurred calling Gemini.");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredUsers = users.filter((user: any) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (user.username || "").toLowerCase().includes(q);
    const handleMatch = (user.handle || "").toLowerCase().includes(q);
    const emailMatch = (user.email || "").toLowerCase().includes(q);
    return nameMatch || handleMatch || emailMatch;
  });

  return (
    <div className="space-y-8">
      {/* SECTION HEADER */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
          <Radio className="w-5 h-5 text-black animate-pulse" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Zen Creator Studio</h3>
          <p className="text-xs text-neutral-400">Exclusive creator dashboard for owner Zen Z Aura.</p>
        </div>
      </div>

      {/* LIVE YOUTUBE SYNC INTEGRATION ENGINE (AUTOMATED LINKAGE) */}
      <div className="bg-gradient-to-tr from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-600/10 rounded-xl">
              <Youtube className="w-5.5 h-5.5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Real-Time YouTube Automation Linker</h4>
              <p className="text-[11px] text-neutral-400">Your channel is fully connected. Website updates itself automatically when you publish videos.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 text-[10px] font-mono rounded-full font-semibold border flex items-center gap-1 ${
              ytConfigEnabled 
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-400" 
                : "bg-neutral-900 border-neutral-800 text-neutral-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ytConfigEnabled ? "bg-emerald-400 animate-ping" : "bg-neutral-500"}`} />
              {ytConfigEnabled ? "Automatic Engine Online" : "Sync Rules Inactive"}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">Last Synced: {ytLastSynced !== "Never" ? new Date(ytLastSynced).toLocaleTimeString() : "Never"}</span>
          </div>
        </div>

        {ytSuccessMsg && (
          <div className="bg-emerald-950/30 border border-emerald-900/60 text-emerald-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{ytSuccessMsg}</span>
          </div>
        )}

        {ytError && (
          <div className="bg-red-950/30 border border-red-900/60 text-red-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{ytError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* CONFIG FORM */}
          <form onSubmit={handleSaveYtConfig} className="xl:col-span-1 space-y-4 bg-neutral-950/60 p-4 border border-neutral-800/85 rounded-xl">
            <h5 className="text-[11px] uppercase tracking-wider font-mono text-neutral-400 flex items-center gap-1.5 border-b border-neutral-900 pb-2">
              <Settings className="w-3.5 h-3.5 text-neutral-500" />
              Connection parameters
            </h5>
            
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-1">YouTube Handle or Channel ID</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 text-xs font-mono text-neutral-500 font-medium">@</span>
                <input
                  type="text"
                  value={ytConfigHandle.replace(/^@/, "")}
                  onChange={(e) => setYtConfigHandle("@" + e.target.value)}
                  placeholder="zenzauramind"
                  className="w-full bg-neutral-900 text-xs text-white border border-neutral-800 rounded-lg py-1.5 pl-6 pr-3 focus:outline-none focus:border-red-500 font-mono"
                  required
                />
              </div>
              <p className="text-[9px] text-neutral-500 mt-1">Resolution fetches canonical subscribers, views count, and uploads automatically.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-1">Automatic Sync</label>
                <select
                  value={ytConfigEnabled ? "true" : "false"}
                  onChange={(e) => setYtConfigEnabled(e.target.value === "true")}
                  className="w-full bg-neutral-900 text-xs text-white border border-neutral-800 rounded-lg py-1.5 px-2 focus:outline-none focus:border-red-500 font-mono"
                >
                  <option value="true">Armed (On)</option>
                  <option value="false">Disarmed (Off)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-1 font-mono">Interval (Mins)</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={ytConfigInterval}
                  onChange={(e) => setYtConfigInterval(Number(e.target.value))}
                  className="w-full bg-neutral-900 text-xs text-white border border-neutral-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-red-500 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingYtConfig}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSavingYtConfig ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />
                  Saving Configuration...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Parameters
                </>
              )}
            </button>
          </form>

          {/* SYNC ACTIONS & CURRENT STATE */}
          <div className="xl:col-span-1 border border-neutral-800/85 p-4 bg-neutral-950/40 rounded-xl flex flex-col justify-between">
            <div>
              <h5 className="text-[11px] uppercase tracking-wider font-mono text-neutral-400 flex items-center gap-1.5 border-b border-neutral-900 pb-2 mb-3">
                <Link2 className="w-3.5 h-3.5 text-neutral-500" />
                Integration Status Overview
              </h5>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-neutral-900">
                  <span className="text-neutral-500">Live Active Handle</span>
                  <span className="text-white font-bold">{ytConfigHandle || "@zenzauramind"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-neutral-900">
                  <span className="text-neutral-500 font-mono">Auto background scanner</span>
                  <span className={ytConfigEnabled ? "text-emerald-400 font-bold" : "text-neutral-500"}>{ytConfigEnabled ? `Scans every ${ytConfigInterval} mins` : "Stopped"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-neutral-900">
                  <span className="text-neutral-500">Subscribers Count</span>
                  <span className="text-amber-400 font-bold">{stats.subscriberCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-neutral-900">
                  <span className="text-neutral-500">Total Views synced</span>
                  <span className="text-neutral-200">{stats.totalViews.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-900">
              <button
                type="button"
                onClick={handleForceSync}
                disabled={isYtSyncingNow || !ytConfigHandle}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isYtSyncingNow ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scanning YouTube Feed...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Trigger Live Scan & Sync Right Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* EVENT LOGS */}
          <div className="xl:col-span-1 border border-neutral-800/85 p-4 bg-neutral-950/40 rounded-xl flex flex-col justify-between">
            <div>
              <h5 className="text-[11px] uppercase tracking-wider font-mono text-neutral-400 flex items-center gap-1.5 border-b border-neutral-900 pb-2 mb-2">
                <Terminal className="w-3.5 h-3.5 text-red-500" />
                Durable Feed Audit Log
              </h5>
              
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {ytLogs.length === 0 ? (
                  <p className="text-[10px] text-neutral-600 font-mono italic py-4">No audit logs logged yet.</p>
                ) : (
                  ytLogs.map((log, index) => (
                    <div key={index} className="text-[10px] font-mono leading-relaxed border-b border-neutral-900 pb-1.5 last:border-0">
                      <div className="flex justify-between items-center text-[9px] text-neutral-500 mb-0.5">
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={log.status === "success" ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-neutral-300 break-words">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="text-[9px] text-neutral-500 font-mono italic mt-2 text-right">
              Updates occur automatically. No dashboard needs to be kept open.
            </div>
          </div>
        </div>
      </div>

      {/* BRANDING & VISUAL IDENTITY CONFIGURATION CENTER */}
      <div className="bg-gradient-to-tr from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
        
        <div className="border-b border-neutral-800/80 pb-4 mb-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Settings className="w-5.5 h-5.5 text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Branding & Creator Profile Configuration</h4>
              <p className="text-[11px] text-neutral-400">Modify application's visual logo, tagline, admin avatar (DP), theme accents, and custom behaviors.</p>
            </div>
          </div>
          
          <span className="px-2.5 py-1 text-[10px] bg-amber-950/40 border border-amber-900/60 text-amber-400 font-mono rounded-full font-semibold">
            🎨 Branding Module Active
          </span>
        </div>

        {brandSuccess && (
          <div className="bg-emerald-950/30 border border-emerald-900/60 text-emerald-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{brandSuccess}</span>
          </div>
        )}

        {brandError && (
          <div className="bg-red-950/30 border border-red-900/60 text-red-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{brandError}</span>
          </div>
        )}

        <form onSubmit={handleSaveBrandConfig} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* BRANDING INFORMATION */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-4">
              <h5 className="text-[11px] uppercase tracking-wider font-mono text-amber-500 font-semibold border-b border-neutral-900 pb-2 mb-2">
                1. Brand Meta Info
              </h5>
              
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-1">Creator Brand Name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Zen Z Aura"
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-1">Channel Handle</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-neutral-550 font-mono">@</span>
                  <input
                    type="text"
                    value={brandHandle}
                    onChange={(e) => setBrandHandle(e.target.value.replace(/^@/, ""))}
                    placeholder="zenzauramind"
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 pl-6 pr-3 focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-1">Custom Channel / Subscribe Link</label>
                <input
                  type="url"
                  value={channelLink}
                  onChange={(e) => setChannelLink(e.target.value)}
                  placeholder="https://www.youtube.com/@zenzauramind"
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-1 font-mono">Creator Business Email</label>
                <input
                  type="email"
                  value={brandEmail}
                  onChange={(e) => setBrandEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-1">Official Tagline / Announcement Banner</label>
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Enter custom slogan or update announcement message..."
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* BRAND LOGO EDITOR */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-4">
              <h5 className="text-[11px] uppercase tracking-wider font-mono text-amber-500 font-semibold border-b border-neutral-900 pb-2 mb-2">
                2. Live Branding Logo
              </h5>
              
              <div className="flex gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => { setLogoType("emoji"); setLogoValue("🗿"); }}
                  className={`flex-1 py-1 text-[10px] font-mono border rounded ${
                    logoType === "emoji" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-neutral-900 border-neutral-800 text-neutral-400"
                  }`}
                >
                  Icon Emojis
                </button>
                <button
                  type="button"
                  onClick={() => { setLogoType("image"); }}
                  className={`flex-1 py-1 text-[10px] font-mono border rounded ${
                    logoType === "image" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-neutral-900 border-neutral-800 text-neutral-400"
                  }`}
                >
                  Custom Graphic (Upload)
                </button>
              </div>

              {logoType === "emoji" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-900 border border-amber-500/20 flex items-center justify-center text-2xl shadow-lg font-bold">
                      {logoValue || "🗿"}
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-neutral-500 uppercase">Current Logo Emoji</span>
                      <input
                        type="text"
                        maxLength={2}
                        value={logoValue}
                        onChange={(e) => setLogoValue(e.target.value)}
                        className="w-12 text-center bg-neutral-900 border border-neutral-800 text-xs rounded py-1 font-sans"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Click a Preset Symbol:</label>
                    <div className="grid grid-cols-5 gap-2">
                      {["🗿", "🌌", "🧘", "🧠", "🔥", "⚡", "🦉", "🛡️", "💎", "🎯"].map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setLogoValue(em)}
                          className={`p-1.5 rounded bg-neutral-900 text-base hover:bg-neutral-800 active:scale-95 transition-all ${
                            logoValue === em ? "border border-amber-500/50 bg-amber-950/20" : "border border-transparent"
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {logoValue && logoValue.startsWith("data:") ? (
                      <img
                        src={logoValue}
                        alt="Brand Graphic"
                        className="w-12 h-12 rounded-full object-cover border border-amber-500/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs text-neutral-600 font-mono">
                        No image
                      </div>
                    )}
                    <div>
                      <span className="block text-[10px] font-mono text-neutral-500 uppercase">Graphic Logo File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="text-[10px] text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1 font-mono">Or paste Direct Custom Logo URL</label>
                    <input
                      type="text"
                      value={(logoValue && typeof logoValue === "string" && logoValue.startsWith("data:")) ? "" : (logoValue || "")}
                      onChange={(e) => {
                        if (e.target.value) {
                          setLogoValue(e.target.value);
                          setLogoType("image");
                        }
                      }}
                      placeholder="https://..."
                      className="w-full bg-neutral-900 border border-neutral-800 text-[10px] text-white rounded py-1 px-2.5 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* LIVE ADMIN DISPLAY PROFILE (DP) */}
              <div className="pt-2 border-t border-neutral-900 space-y-3">
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">3. Admin Profile Picture (DP)</span>
                
                <div className="flex items-center gap-3">
                  {adminAvatarUrl ? (
                    <img
                      src={adminAvatarUrl}
                      alt="Admin DP"
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 font-bold text-lg">
                      A
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDpUpload}
                      className="text-[10px] text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer w-full"
                    />
                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setAdminAvatarUrl("https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80")}
                        className="text-[8px] bg-neutral-900 py-0.5 px-1.5 rounded border border-neutral-800 hover:border-neutral-700 text-neutral-400"
                      >
                        Def DP 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminAvatarUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80")}
                        className="text-[8px] bg-neutral-900 py-0.5 px-1.5 rounded border border-neutral-800 hover:border-neutral-700 text-neutral-400"
                      >
                        Def DP 2
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80")}
                        className="text-[8px] bg-neutral-900 py-0.5 px-1.5 rounded border border-neutral-800 hover:border-neutral-700 text-neutral-400"
                      >
                        Def DP 3
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Direct Avatar Image URL</label>
                  <input
                    type="text"
                    value={(adminAvatarUrl && typeof adminAvatarUrl === "string" && adminAvatarUrl.startsWith("data:")) ? "" : (adminAvatarUrl || "")}
                    onChange={(e) => setAdminAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-neutral-900 border border-neutral-800 text-[10px] text-white rounded py-1 px-2.5 focus:outline-none"
                  />
                </div>

                {/* Section 2 & 3 Manual Publish & Synchronize Button */}
                <div className="pt-3 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-1.5">
                  <span className="text-[8px] font-mono text-neutral-500 leading-tight">
                    Preserves and propagates logo & avatar configs instantly
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingBrand}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 active:scale-95 text-black font-bold text-[10px] uppercase font-mono tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 z-10 shadow hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingBrand ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Synchronizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Publish & Synchronize
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ATMOSPHERIC SCHEMES & CHANNEL RULES */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-4">
              <h5 className="text-[11px] uppercase tracking-wider font-mono text-amber-500 font-semibold border-b border-neutral-900 pb-2 mb-2">
                4. Theme Accent & Creator Options
              </h5>
              
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-neutral-500 mb-1.5">Theme Highlight Color Accent</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "amber", name: "Amber (Default)", bg: "bg-amber-500" },
                    { key: "emerald", name: "Emerald Stoic", bg: "bg-emerald-500" },
                    { key: "rose", name: "Crimson Honor", bg: "bg-rose-500" },
                    { key: "indigo", name: "Cosmic Infinity", bg: "bg-indigo-500" },
                    { key: "violet", name: "Mystic Temple", bg: "bg-violet-500" },
                    { key: "sky", name: "Dynamic Clarity", bg: "bg-sky-500" }
                  ].map(tc => (
                    <button
                      key={tc.key}
                      type="button"
                      onClick={() => setThemeColor(tc.key)}
                      className={`py-1.5 px-2 rounded-lg text-[9px] font-mono flex items-center justify-between border cursor-pointer ${
                        themeColor === tc.key ? "bg-neutral-900 border-amber-500/60 font-black text-white" : "bg-neutral-950 border-neutral-850 text-neutral-500"
                      }`}
                    >
                      <span className="truncate">{tc.name}</span>
                      <span className={`w-2 h-2 rounded-full ${tc.bg}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* ADVANCED TOGGLES */}
              <div className="space-y-3.5 pt-2">
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">5. Interactive Rule Policies</span>
                
                <div className="flex items-center justify-between bg-neutral-900 p-2.5 border border-neutral-850 rounded-lg">
                  <div>
                    <h6 className="text-xs font-semibold text-white">Instant Fan Art Approval</h6>
                    <p className="text-[9px] text-neutral-500">Allow uploads to bypass pending flags and show up immediately.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableFanArtAutoApprove}
                    onChange={(e) => setEnableFanArtAutoApprove(e.target.checked)}
                    className="w-4 h-4 text-amber-500 accent-amber-500 rounded border-neutral-700 bg-neutral-950"
                  />
                </div>

                <div className="flex items-center justify-between bg-neutral-900 p-2.5 border border-neutral-850 rounded-lg">
                  <div>
                    <h6 className="text-xs font-semibold text-white">Forum Stoic Slow Mode</h6>
                    <p className="text-[9px] text-neutral-500">Enable cooldown tags on forums keeping topics disciplined and tidy.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSlowModeForForum}
                    onChange={(e) => setEnableSlowModeForForum(e.target.checked)}
                    className="w-4 h-4 text-amber-500 accent-amber-500 rounded border-neutral-700 bg-neutral-950"
                  />
                </div>
              </div>

              {/* DEMO METRIC COUNTER INCREMENT */}
              <div className="p-2.5 bg-neutral-900 border border-neutral-800/80 rounded-xl space-y-1">
                <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold tracking-tight">Creator Simulator Feature</span>
                <p className="text-[9px] text-neutral-450 leading-relaxed mb-1">Trigger quick fake activity. This simulates live user growth and subscriber triggers in the main UI.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubCount(prev => prev + Math.floor(Math.random() * 20) + 5);
                      setViewsCount(prev => prev + Math.floor(Math.random() * 250) + 70);
                    }}
                    className="flex-1 py-1 text-[9px] bg-amber-500 text-black font-bold uppercase rounded font-mono border hover:bg-amber-400 active:scale-95 transition-all text-center"
                  >
                    + Random Subs & Views
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* SUBMIT ROW */}
          <div className="flex items-center justify-end pt-3 border-t border-neutral-850/80">
            <button
              type="submit"
              disabled={isSavingBrand}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 active:scale-95 text-black font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow shadow-amber-500/20 disabled:opacity-50"
            >
              {isSavingBrand ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating Cosmic Branding...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Publish & Synchronize New Brand Customizations
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: LIVE STATS MANAGER */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden">
          <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-neutral-800 pb-3">
            <BarChart className="w-4 h-4 text-amber-500" />
            Live Subscriber counter & stats overrides
          </h4>

          <form onSubmit={handleSaveStats} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Subscriber Count</label>
                <div className="relative">
                  <Users className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-600" />
                  <input
                    type="number"
                    value={subCount}
                    onChange={(e) => setSubCount(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-2 pl-8 pr-2 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Subscriber Goal</label>
                <input
                  type="number"
                  value={subGoal}
                  onChange={(e) => setSubGoal(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-2 px-3 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Total YouTube Views</label>
                <div className="relative">
                  <Eye className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-600" />
                  <input
                    type="number"
                    value={viewsCount}
                    onChange={(e) => setViewsCount(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-2 pl-8 pr-2 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Active Site Members</label>
                <input
                  type="number"
                  value={memCount}
                  onChange={(e) => setMemCount(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-2 px-3 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingStats}
              className="w-full bg-neutral-950 text-white border border-neutral-800 hover:border-amber-500 hover:text-amber-400 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingStats ? 'animate-spin' : ''}`} />
              {isUpdatingStats ? "Saving Statistics..." : "Synchronize Statistics Live"}
            </button>
          </form>
        </div>

        {/* PANEL 2: CONNECT YOUTUBE UPLOADS */}
        <div id="yt-connect-panel" className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
          <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-neutral-800 pb-3">
            <Video className="w-4 h-4 text-red-500" />
            Connect YouTube Video / Shorts Feed
          </h4>

          {videoAddedStatus && (
            <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs p-2.5 rounded-lg mb-3 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              Video synced and uploaded dynamically to front-end database!
            </div>
          )}

          <form onSubmit={handleConnectYoutube} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-mono text-neutral-500 mb-1">Video Title</label>
              <input
                type="text"
                value={ytTitle}
                onChange={(e) => setYtTitle(e.target.value)}
                placeholder="e.g. Mastering Epictetus in Chaotic 2026"
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 mb-1">YouTube Video Link or Embed ID</label>
              <input
                type="text"
                value={ytVideoUrlOrId}
                onChange={(e) => {
                  setYtVideoUrlOrId(e.target.value);
                  const extracted = extractYoutubeId(e.target.value);
                  if (extracted && ytThumbnailType === "youtube") {
                    setYtThumbnailUrl(`https://img.youtube.com/vi/${extracted}/hqdefault.jpg`);
                  }
                }}
                placeholder="e.g. 2AzxlCNk_Fo or https://www.youtube.com/watch?v=2AzxlCNk_Fo"
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-[9px] text-neutral-500 mt-0.5 font-mono">
                Provide an Embed ID to allow members to play your video and shorts natively on the website without redirection.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Content Type</label>
                <select
                  value={ytType}
                  onChange={(e: any) => setYtType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-2 focus:ring-1"
                >
                  <option value="long">Long Guide (Educational)</option>
                  <option value="short">Short (Motivational)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 mb-1">Duration (e.g. 15:42)</label>
                <input
                  type="text"
                  value={ytDuration}
                  onChange={(e) => setYtDuration(e.target.value)}
                  placeholder="e.g. 0:59 or 14:15"
                  className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 mb-1.5">Thumbnail Sourcing Mode</label>
              <div className="flex gap-2.5 mb-2">
                <button
                  type="button"
                  onClick={() => setYtThumbnailType("youtube")}
                  className={`flex-1 py-1.5 text-[9px] border rounded font-mono ${
                    ytThumbnailType === "youtube" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-neutral-950 border-neutral-850 text-neutral-500"
                  }`}
                >
                  YouTube Grab
                </button>
                <button
                  type="button"
                  onClick={() => setYtThumbnailType("url")}
                  className={`flex-1 py-1.5 text-[9px] border rounded font-mono ${
                    ytThumbnailType === "url" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-neutral-950 border-neutral-850 text-neutral-500"
                  }`}
                >
                  Direct URL
                </button>
                <button
                  type="button"
                  onClick={() => setYtThumbnailType("upload")}
                  className={`flex-1 py-1.5 text-[9px] border rounded font-mono ${
                    ytThumbnailType === "upload" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-neutral-950 border-neutral-850 text-neutral-500"
                  }`}
                >
                  Upload Graphic
                </button>
              </div>

              {ytThumbnailType === "youtube" && (
                <div className="bg-neutral-950 border border-neutral-850 p-2.5 rounded-lg flex items-center gap-3">
                  {extractYoutubeId(ytVideoUrlOrId) ? (
                    <img
                      src={`https://img.youtube.com/vi/${extractYoutubeId(ytVideoUrlOrId)}/hqdefault.jpg`}
                      alt="Extracted Youtube Preview"
                      className="w-16 h-10 object-cover rounded border border-neutral-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=150';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-10 bg-neutral-905 border border-neutral-850 rounded flex items-center justify-center text-[10px] text-neutral-600 font-mono">
                      No link
                    </div>
                  )}
                  <div>
                    <span className="block text-[10px] font-mono text-neutral-400">YouTube Dynamic Grab</span>
                    <span className="block text-[8px] text-neutral-500 leading-tight">Will grab the official card directly from your live video on YouTube.</span>
                  </div>
                </div>
              )}

              {ytThumbnailType === "url" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={ytThumbnailType === 'url' ? ytThumbnailUrl : ""}
                    onChange={(e) => setYtThumbnailUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-neutral-955 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:outline-none"
                  />
                  {ytThumbnailUrl && (
                    <img
                      src={ytThumbnailUrl}
                      alt="URL preview"
                      className="w-28 h-16 object-cover rounded border border-neutral-800"
                    />
                  )}
                </div>
              )}

              {ytThumbnailType === "upload" && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleYtThumbnailUpload}
                    className="text-[10px] text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-805 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer w-full"
                  />
                  {ytThumbnailUrl && ytThumbnailUrl.startsWith("data:") && (
                    <img
                      src={ytThumbnailUrl}
                      alt="Uploaded thumbnail preview"
                      className="w-28 h-16 object-cover rounded border border-neutral-800"
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 mb-1">Brief Description</label>
              <textarea
                value={ytDescription}
                onChange={(e) => setYtDescription(e.target.value)}
                placeholder="Core takeaways or commentary..."
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-650 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Push YouTube Upload to Website
            </button>
          </form>
        </div>
      </div>

      {/* REGISTERED USERS DIRECTORY (Stoic Roster) */}
      <div id="admin-seekers-directory" className="bg-gradient-to-tr from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Users className="w-5.5 h-5.5 text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Registered Oasis Members & Seekers</h4>
              <p className="text-[11px] text-neutral-400">Secure database index of seekers who entered the Oasis, paired with automatic welcoming trackers.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoadingUsers}
              id="btn-refresh-seekers"
              className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:text-white text-neutral-300 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? "animate-spin text-amber-500" : ""}`} />
              Refresh Database
            </button>
            <span className="px-2.5 py-1 text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono rounded-full font-semibold">
              Total Seekers: {users.length}
            </span>
          </div>
        </div>

        {usersError && (
          <div className="bg-red-950/30 border border-red-900/60 text-red-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 font-mono" id="alert-seekers-error">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{usersError}</span>
          </div>
        )}

        {/* SEARCH AND FILTER TOOLS */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, handle, or email..."
            className="w-full max-w-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 px-3.5 py-2 text-xs text-white placeholder-neutral-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono transition-all"
            id="seeker-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-850 bg-neutral-950/40">
          <table className="w-full text-left border-collapse" id="seekers-roster-table">
            <thead>
              <tr className="border-b border-neutral-850 bg-neutral-950 text-neutral-500 text-[10px] uppercase font-mono tracking-wider">
                <th className="py-3 px-4">Seeker Name</th>
                <th className="py-3 px-4">Stoic Handle</th>
                <th className="py-3 px-4">Register Email</th>
                <th className="py-3 px-4">Role Assigned</th>
                <th className="py-3 px-4 text-right">Alignment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-600 text-xs font-mono italic">
                    {isLoadingUsers ? "Accessing secure nodes..." : "No seekers match your filter criteria."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-neutral-900/30 transition-colors text-xs text-neutral-300">
                    <td className="py-3.5 px-4 flex items-center gap-2.5">
                      <img
                        src={u.avatarUrl}
                        alt="Seeker Avatar"
                        className="w-7 h-7 rounded-lg object-cover ring-1 ring-neutral-800"
                        referrerPolicy="no-referrer"
                      />
                      <span className="font-semibold text-white">{u.username}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-amber-500/90 font-semibold">
                      @{u.handle}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-200">
                      {u.email || <span className="text-neutral-600 italic">No Email Provided</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-bold ${
                        u.role === "admin"
                          ? "bg-amber-950/40 text-amber-400 border border-amber-900/40"
                          : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-[11px] text-neutral-500 font-mono">
                      {new Date(u.joinedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOCK 3: GALAXY GEMINI VIDEO SCRIPT OUTLINER */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <div>
            <h4 className="text-xs font-mono text-neutral-300 uppercase tracking-wider">AI Creator Copilot (Gemini-Powered)</h4>
            <p className="text-[10px] text-neutral-500">Plan and generate scripts for videos to maintain high Stoic inspiration.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1.5">
                Topic or Philosophy
              </label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g. Why complaining wastes creative dopamine"
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1.5">
                Target Output Length
              </label>
              <select
                value={aiDuration}
                onChange={(e) => setAiDuration(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
              >
                <option value="1">Shorts format (under 60s)</option>
                <option value="5">Compact Guide (5 mins)</option>
                <option value="15">Analytical Deep-Dive (15 mins)</option>
                <option value="25">Docu-Drama Mystery (25 mins)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateOutline}
              disabled={aiLoading || !aiTopic.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Master Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Script outline
                </>
              )}
            </button>
          </div>

          <div className="md:col-span-2 bg-neutral-950 rounded-xl p-4 border border-neutral-800/80 min-h-[160px] max-h-[310px] overflow-y-auto">
            {aiOutline ? (
              <div className="prose prose-invert prose-xs text-neutral-300 font-mono text-xs whitespace-pre-line leading-relaxed">
                {aiOutline}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 py-8">
                <FileText className="w-8 h-8 text-neutral-800 mb-2" />
                <p className="text-xs">No script generated yet. Enter a topic and query the Gemini brain above.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BLOCK 4: COMING RELEASES ROADMAP PROJECTS */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
        <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-neutral-800 pb-3">
          <Flame className="w-4 h-4 text-orange-500" />
          Video Pipeline & Upcoming Release Scheduler
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleCreateRoadmap} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-3.5">
            <h5 className="text-xs text-amber-500 font-semibold uppercase tracking-wider font-mono">Schedule Video Release</h5>
            
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Project Title</label>
              <input
                type="text"
                value={roadTitle}
                onChange={(e) => setRoadTitle(e.target.value)}
                placeholder="e.g. Seneca on Anxiety"
                className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1 px-2.5 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Short Description</label>
              <input
                type="text"
                value={roadDesc}
                onChange={(e) => setRoadDesc(e.target.value)}
                placeholder="Topic context..."
                className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1 px-2.5 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Status</label>
                <select
                  value={roadStatus}
                  onChange={(e: any) => setRoadStatus(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-[11px] text-white rounded-lg py-1 px-1 focus:ring-1"
                >
                  <option value="scripting">📝 Scripting</option>
                  <option value="recording">🎥 Recording</option>
                  <option value="editing">✂️ Editing</option>
                  <option value="scheduled">📅 Scheduled</option>
                  <option value="released">🚀 Released</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Launch Date</label>
                <input
                  type="date"
                  value={roadDate}
                  onChange={(e) => setRoadDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-[10px] text-white rounded-lg py-1 px-1 focus:ring-1"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500">Progress Tracker</label>
                <span className="text-[10px] font-mono text-amber-500">{roadProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={roadProgress}
                onChange={(e) => setRoadProgress(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 py-1.5 rounded-lg text-black font-bold text-xs"
            >
              Add Project to pipeline
            </button>
          </form>

          {/* PIPELINE LIVE ITEMS SCROLLER */}
          <div className="md:col-span-2 space-y-3 max-h-[380px] overflow-y-auto pr-1">
            <h5 className="text-xs text-neutral-400 font-medium font-sans mb-1">Active Pipeline Actions</h5>
            {roadmap.length === 0 ? (
              <p className="text-xs text-neutral-600 font-mono italic">No pipeline recordings configured right now.</p>
            ) : (
              roadmap.map((item) => (
                <div key={item.id} className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded">
                          {item.type === "long" ? "📺 Full Guide" : "⚡ Shorts"}
                        </span>
                        <span className="text-[10px] font-mono text-amber-500 bg-amber-950/20 px-2 py-0.5 rounded capitalize">
                          {item.status}
                        </span>
                      </div>
                      <h6 className="text-sm font-semibold text-white leading-snug">{item.title}</h6>
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={async () => {
                          // Cycle status
                          const statuses: VideoStatus[] = ["scripting", "recording", "editing", "scheduled", "released"];
                          const curIdx = statuses.indexOf(item.status);
                          const nextStatus = statuses[(curIdx + 1) % statuses.length];
                          
                          // Auto boost progress appropriate to status
                          let nextProgress = item.progress;
                          if (nextStatus === "recording") nextProgress = 50;
                          else if (nextStatus === "editing") nextProgress = 80;
                          else if (nextStatus === "scheduled") nextProgress = 95;
                          else if (nextStatus === "released") nextProgress = 100;

                          try {
                            const res = await fetch(`/api/roadmap/${item.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                authRole: "admin",
                                status: nextStatus,
                                progress: nextProgress
                              })
                            });
                            if (res.ok) {
                              const rData = await res.json();
                              onUpdateRoadmap(item.id, rData);
                              
                              if (nextStatus === "released") {
                                alert(`'${item.title}' is promoted to live releases feed!`);
                                // Reload page style update triggers automatic feed update
                                window.location.reload();
                              }
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="text-[10px] bg-neutral-900 border border-neutral-800 hover:border-amber-500 text-neutral-400 font-mono py-1 px-2 rounded-lg transition-colors flex items-center gap-1"
                        title="Cycle Pipeline Phase"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Next Phase
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm("Are you sure you want to discard this project?")) return;
                          try {
                            const res = await fetch(`/api/roadmap/${item.id}`, {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ authRole: "admin" })
                            });
                            if (res.ok) {
                              onDeleteRoadmap(item.id);
                            }
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="p-1 px-1.5 bg-neutral-900 border border-neutral-800 hover:border-red-500 hover:text-red-400 rounded-lg text-neutral-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                      <span>Completion Bar</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full transition-all duration-500" 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: VIDEO INVENTORY OVERRIDE & THUMBNAIL SELECTOR */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl mt-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-1.5">
            <Video className="w-4 h-4 text-amber-500" />
            <div>
              <h4 className="text-xs font-mono text-neutral-300 uppercase tracking-widest">Video Asset Manager & Overrides</h4>
              <p className="text-[10px] text-neutral-500">Manage, rewrite, delete, or override thumbnails for existing videos on the website.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 border border-neutral-850 rounded">
            {videos.length} Videos Configured
          </span>
        </div>

        {editingVideoId && (
          <form onSubmit={handleUpdateVideoSubmit} className="bg-neutral-950 p-4 border border-amber-500/30 rounded-xl mb-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-855 pb-2">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider">✏️ Override Video Settings</span>
              <button
                type="button"
                onClick={() => setEditingVideoId(null)}
                className="text-xs font-mono text-neutral-500 hover:text-white"
              >
                Cancel Edit
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Video Title</label>
                  <input
                    type="text"
                    value={editTitle || ""}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Short Description</label>
                  <textarea
                    value={editDescription || ""}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Thumbnail URL</label>
                  <input
                    type="text"
                    value={editThumbnail || ""}
                    onChange={(e) => setEditThumbnail(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-3 focus:outline-none"
                    required
                  />
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (editYtId) {
                          setEditThumbnail(`https://img.youtube.com/vi/${editYtId}/hqdefault.jpg`);
                        } else {
                          alert("Ensure YouTube Video ID is set to pull YouTube's placeholder.");
                        }
                      }}
                      className="text-[9px] font-mono bg-neutral-905 border border-neutral-800 hover:border-amber-500 text-neutral-400 px-2 py-0.5 rounded"
                    >
                      Use YouTube Standard Thumb
                    </button>
                    {editThumbnail && (
                      <span className="text-[9px] text-amber-500 font-mono">Custom Preset Loaded</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Duration</label>
                    <input
                      type="text"
                      value={editDuration || ""}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-400 mb-1">YouTube Video / Embed ID</label>
                    <input
                      type="text"
                      value={editYtId || ""}
                      onChange={(e) => setEditYtId(e.target.value)}
                      placeholder="e.g. 2AzxlCNk_Fo"
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Stat: Views Override</label>
                    <input
                      type="number"
                      value={editViews ?? 0}
                      onChange={(e) => setEditViews(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-mono text-neutral-500 mb-1">Stat: Likes Override</label>
                    <input
                      type="number"
                      value={editLikes ?? 0}
                      onChange={(e) => setEditLikes(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-855">
              <button
                type="button"
                onClick={() => setEditingVideoId(null)}
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 px-4 py-1.5 text-xs text-neutral-300 font-bold rounded-lg transition-colors"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="bg-amber-500 hover:bg-amber-400 text-black px-5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Apply Assets Overrides"
                )}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.length === 0 ? (
            <div className="md:col-span-3 text-center py-8 bg-neutral-950 rounded-xl border border-neutral-850">
              <p className="text-xs text-neutral-500 font-mono italic">No configured videos found. Connect some above!</p>
            </div>
          ) : (
            videos.map((vid) => (
              <div key={vid.id} id={`admin-vid-${vid.id}`} className="bg-neutral-950 rounded-xl border border-neutral-850/80 p-3.5 flex flex-col justify-between hover:border-neutral-700 transition-all group">
                <div>
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-neutral-850 mb-3 bg-neutral-900">
                    <img
                      src={vid.thumbnail}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=280';
                      }}
                    />
                    <div className="absolute top-1.5 left-1.5 flex gap-1 items-center">
                      <span className="text-[8px] font-mono uppercase bg-black/85 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {vid.type === "long" ? "Guide" : "Short"}
                      </span>
                      {vid.ytId && (
                        <span className="text-[8px] font-mono bg-red-650 text-white px-1.5 py-0.5 rounded">
                          YT Live
                        </span>
                      )}
                    </div>
                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded">
                      {vid.duration}
                    </span>
                  </div>

                  <h5 className="text-xs font-semibold text-white line-clamp-1 mb-1">{vid.title}</h5>
                  <p className="text-[10px] text-neutral-500 line-clamp-2 leading-relaxed mb-4">{vid.description}</p>
                </div>

                <div className="border-t border-neutral-900 pt-3 flex items-center justify-between text-[9px] font-mono text-neutral-500">
                  <div className="flex gap-2.5">
                    <span>🎬 {vid.views ? vid.views.toLocaleString() : 0} views</span>
                    <span>👍 {vid.likes ? vid.likes.toLocaleString() : 0} likes</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingVideo(vid)}
                      className="text-amber-500 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 py-1 px-2.5 rounded transition-all font-sans"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVideoAction(vid.id)}
                      className="text-red-500 hover:text-red-400 bg-red-500/10 border border-red-500/20 hover:border-red-500/50 py-1 px-2 rounded transition-all font-sans"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
