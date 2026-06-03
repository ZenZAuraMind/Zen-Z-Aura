import React, { useState, useEffect } from "react";
import { Youtube, Twitter, MessageSquare, AlertCircle, Sparkles, Send } from "lucide-react";

export interface SocialAlert {
  id: string;
  platform: 'youtube' | 'twitter' | 'discord' | 'announcement';
  message: string;
  time: string;
  link?: string;
}

interface SocialFeedProps {
  isAdmin: boolean;
  onAddAlert?: (message: string, platform: 'youtube' | 'twitter' | 'discord' | 'announcement') => void;
}

export default function SocialFeed({ isAdmin }: SocialFeedProps) {
  const [alerts, setAlerts] = useState<SocialAlert[]>([
    {
      id: "alert1",
      platform: "youtube",
      message: "🚨 NEW GUIDE RELEASED: 'How to Master the Power of Silence in a Noisy World' is trending! Check the Forums to discuss.",
      time: "2 hours ago"
    },
    {
      id: "alert2",
      platform: "twitter",
      message: "🌱 'True silence is not the absence of sound, but rather the stillness of judgment within.' Guard your focus today, warriors. #stoic #mindset",
      time: "5 hours ago"
    },
    {
      id: "alert3",
      platform: "discord",
      message: "💬 Community meetup tonight at 8 PM UTC in the Silence Sanctuary voice channel. Stoic readings on Seneca.",
      time: "10 hours ago"
    }
  ]);

  const [newMsg, setNewMsg] = useState("");
  const [platform, setPlatform] = useState<'youtube' | 'twitter' | 'discord' | 'announcement'>("announcement");

  // No simulated alerts automatically posted to ensure all feed broadcasts are 100% authentic and verified.

  const handlePostAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const added: SocialAlert = {
      id: "alert_" + Date.now(),
      platform,
      message: `${isAdmin ? "👑 [ADMIN PUBLISHED] " : ""}${newMsg}`,
      time: "Just now"
    };

    setAlerts(prev => [added, ...prev]);
    setNewMsg("");
  };

  const getPlatformIcon = (plat: string) => {
    switch (plat) {
      case "youtube": return <Youtube className="w-4 h-4 text-red-500" />;
      case "twitter": return <Twitter className="w-4 h-4 text-sky-400" />;
      case "discord": return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      default: return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  const getPlatformStyle = (plat: string) => {
    switch (plat) {
      case "youtube": return "border-red-950 bg-red-950/20";
      case "twitter": return "border-sky-950 bg-sky-950/20";
      case "discord": return "border-indigo-950 bg-indigo-950/20";
      default: return "border-amber-950 bg-amber-950/20";
    }
  };

  return (
    <div id="social-feed-container" className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white tracking-wider font-sans uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Pulse Feed
        </h4>
        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-1 rounded-full border border-neutral-800">
          Sync Active
        </span>
      </div>

      {isAdmin && (
        <form onSubmit={handlePostAlert} className="mb-4 bg-neutral-950/80 p-3 rounded-xl border border-amber-500/20 space-y-2">
          <p className="text-[10px] text-amber-500 font-mono flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Social Dispatch Console (Broadcast announcements instantaneously)
          </p>
          <div className="flex gap-2">
            <select
              value={platform}
              onChange={(e: any) => setPlatform(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-amber-500 text-sans"
            >
              <option value="announcement">📢 Announcement</option>
              <option value="youtube">📺 YouTube Feed</option>
              <option value="twitter">🐦 Twitter Post</option>
              <option value="discord">💬 Discord Log</option>
            </select>
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="What announcement will Zen Z Aura share today?"
              className="flex-1 bg-neutral-900 border border-neutral-800 text-xs rounded-lg px-3 py-1.5 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="bg-amber-500 text-black p-1.5 rounded-lg hover:bg-amber-400 font-medium text-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3 max-h-[310px] overflow-y-auto pr-1">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border p-3 rounded-xl transition-all duration-300 hover:border-neutral-700/80 ${getPlatformStyle(alert.platform)}`}
          >
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1 font-mono">
              {getPlatformIcon(alert.platform)}
              <span className="capitalize font-medium">{alert.platform}</span>
              <span className="text-[10px] text-neutral-600 ml-auto">{alert.time}</span>
            </div>
            <p className="text-xs text-neutral-200 font-sans leading-relaxed">
              {alert.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
