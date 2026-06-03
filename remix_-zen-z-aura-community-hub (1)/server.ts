import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

// Firebase Applet Integration
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Helper: Classify YouTube Video Niches according to instructions
function classifyVideoNiche(titleString: string, descString: string, type: string) {
  const title = (titleString || "").toLowerCase();
  const desc = (descString || "").toLowerCase();
  
  if (type === "short") {
    // Motivational & Mindset (Stoicism, Sigma Mindset, Growth Mindset)
    const category = "Motivational & Mindset";
    let subNiche = "Stoicism"; // Default
    
    if (
      title.includes("sigma") || desc.includes("sigma") ||
      title.includes("storm") || desc.includes("storm") ||
      title.includes("beast") || desc.includes("beast") ||
      title.includes("alpha") || desc.includes("alpha") ||
      title.includes("warrior") || desc.includes("warrior") ||
      title.includes("grind") || desc.includes("grind")
    ) {
      subNiche = "Sigma Mindset";
    } else if (
      title.includes("growth") || desc.includes("growth") ||
      title.includes("learn") || desc.includes("learn") ||
      title.includes("discipline") || desc.includes("discipline") ||
      title.includes("habit") || desc.includes("habit") ||
      title.includes("consistency") || desc.includes("consistency") ||
      title.includes("focus") || desc.includes("focus") ||
      title.includes("impossible") || desc.includes("impossible")
    ) {
      subNiche = "Growth Mindset";
    } else if (
      title.includes("stoic") || desc.includes("stoic") ||
      title.includes("silence") || desc.includes("silence") ||
      title.includes("aurelius") || desc.includes("aurelius") ||
      title.includes("seneca") || desc.includes("seneca") ||
      title.includes("epictetus") || desc.includes("epictetus")
    ) {
      subNiche = "Stoicism";
    }
    
    return { category, subNiche };
  } else {
    // Educational & Commentary (self-improvement, future trends, mysteries)
    const category = "Educational & Commentary";
    let subNiche = "Self-Improvement"; // Default
    
    if (
      title.includes("mystery") || desc.includes("mystery") ||
      title.includes("mysteries") || desc.includes("mysteries") ||
      title.includes("dyatlov") || desc.includes("dyatlov") ||
      title.includes("roanoke") || desc.includes("roanoke") ||
      title.includes("transcripts") || desc.includes("transcripts") ||
      title.includes("chilling") || desc.includes("chilling") ||
      title.includes("scary") || desc.includes("scary") ||
      title.includes("unexplained") || desc.includes("unexplained") ||
      title.includes("death") || desc.includes("death")
    ) {
      subNiche = "Mysteries";
    } else if (
      title.includes("ai") || desc.includes("ai") ||
      title.includes("job") || desc.includes("job") ||
      title.includes("technology") || desc.includes("technology") ||
      title.includes("survive") || desc.includes("survive") ||
      title.includes("future") || desc.includes("future") ||
      title.includes("2030") || desc.includes("2030") ||
      title.includes("trend") || desc.includes("trend")
    ) {
      subNiche = "Future Trends";
    } else if (
      title.includes("master") || desc.includes("master") ||
      title.includes("power") || desc.includes("power") ||
      title.includes("mind") || desc.includes("mind") ||
      title.includes("processing") || desc.includes("processing") ||
      title.includes("self") || desc.includes("self") ||
      title.includes("focus") || desc.includes("focus") ||
      title.includes("silence") || desc.includes("silence") ||
      title.includes("habit") || desc.includes("habit")
    ) {
      subNiche = "Self-Improvement";
    }
    
    return { category, subNiche };
  }
}

// Utility: parse ISO 8601 duraton (used by official YouTube Data API, e.g. PT14M10S)
function parseISO8601Duration(durationStr: string): string {
  if (!durationStr) return "00:00";
  const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) {
    return "12:00";
  }
  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseInt(matches[3] || "0", 10);

  if (hours > 0) {
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${minutes}:${formattedSeconds}`;
  }
}

// Utility: convert video duration formatted like "14:10" into total seconds
function getDurationSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map(p => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), "data"))) {
  fs.mkdirSync(path.join(process.cwd(), "data"));
}

// Ensure database file exists with initial mock data
function initDatabase() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed) {
        parsed.forumPosts = [];
        parsed.forumComments = [];
        parsed.chatMessages = [];
        parsed.fanArt = [];
        
        // Dynamically fix/auto-align video specifications
        if (Array.isArray(parsed.videos)) {
          parsed.videos = parsed.videos.map((vid: any) => {
            const isShort = vid.type === "short" || 
                            vid.title?.toLowerCase().includes("#shorts") || 
                            (vid.description && vid.description.toLowerCase().includes("#shorts")) ||
                            (vid.id && (vid.id === "vid4" || vid.id === "vid5"));
            
            let updatedDuration = vid.duration || "";
            if (isShort) {
              updatedDuration = "00:06";
            } else {
              const durSecs = getDurationSeconds(updatedDuration);
              if (durSecs <= 10) {
                // Generate a realistic, deterministic long duration (e.g. 8 to 21 minutes)
                const seed = (vid.id || vid.title || "").split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                const minutes = 8 + (seed % 14);
                const seconds = seed % 60;
                updatedDuration = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
              }
            }
            
            let updatedLikes = vid.likes || 0;
            if (!updatedLikes || updatedLikes === 0) {
              updatedLikes = Math.max(85, Math.floor((vid.views || 2400) * (isShort ? 0.082 : 0.054)));
            }

            let mappedYtId = vid.ytId;
            if (!mappedYtId) {
              if (vid.id === "vid1") mappedYtId = "gBO_A_qNntg";
              else if (vid.id === "vid2") mappedYtId = "77iH8D78N_Q";
              else if (vid.id === "vid3") mappedYtId = "_UAn84hGg_E";
              else if (vid.id === "vid4") mappedYtId = "BVUZYdfXPaE";
              else if (vid.id === "vid5") mappedYtId = "BVUZYdfXPaE";
            }

            let updatedThumbnail = vid.thumbnail || "";
            if (mappedYtId) {
              updatedThumbnail = `https://img.youtube.com/vi/${mappedYtId}/hqdefault.jpg`;
            }
            
            const { category, subNiche } = classifyVideoNiche(vid.title || "", vid.description || "", isShort ? "short" : "long");

            return {
              ...vid,
              ytId: mappedYtId,
              type: isShort ? "short" : "long",
              duration: updatedDuration,
              likes: updatedLikes,
              thumbnail: updatedThumbnail,
              comments: vid.comments || Math.floor(updatedLikes * 0.08),
              category,
              subNiche
            };
          });
        }
        try {
          fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf-8");
        } catch (saveErr: any) {
          console.warn("Could not auto-save initial database fixes:", saveErr.message);
        }
      }
      return parsed;
    } catch (e) {
      console.error("Error reading database, creating fresh one:", e);
    }
  }

  const initialData = {
    stats: {
      subscriberCount: 247385,
      subscriberGoal: 300000,
      activeMembers: 1420,
      totalViews: 4892400
    },
    users: [
      {
        id: "admin",
        username: "Zen Z Aura",
        handle: "zenzauramind",
        role: "admin",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        joinedAt: new Date("2025-01-15").toISOString()
      },
      {
        id: "user1",
        username: "Marcus Aurelius Fan",
        handle: "stoic_seeker",
        role: "member",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        joinedAt: new Date("2026-02-10").toISOString()
      },
      {
        id: "user2",
        username: "Sophia Sigma",
        handle: "mindset_shift",
        role: "member",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        joinedAt: new Date("2026-03-24").toISOString()
      }
    ],
    videos: [
      {
        id: "vid1",
        ytId: "gBO_A_qNntg",
        title: "How to Master the Power of Silence in a Noisy World (2026 Guide)",
        description: "A comprehensive analysis on emotional resilience, mental discipline, and how silent processing enhances focus in an age of non-stop notification streams.",
        thumbnail: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=500&auto=format&fit=crop&q=80",
        duration: "14:24",
        type: "long",
        views: 120500,
        publishedAt: "2 weeks ago",
        likes: 12400,
        comments: 1850
      },
      {
        id: "vid2",
        ytId: "77iH8D78N_Q",
        title: "AI vs. Humans: Which Jobs Will Survive by 2030?",
        description: "An analytical deep-dive into future trends, career survivability, cognitive shields, and how to build a growth mindset to master artificial intelligence rather than being replaced by it.",
        thumbnail: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=80",
        duration: "18:45",
        type: "long",
        views: 340000,
        publishedAt: "1 month ago",
        likes: 28900,
        comments: 3400
      },
      {
        id: "vid3",
        ytId: "_UAn84hGg_E",
        title: "Dyatlov Pass Mystery 😨 9 Hikers Ran Into Freezing Death… But WHY?",
        description: "Deciphering the chilling transcripts, freezing records, and structural anomalies to propose a scientific and political analysis of the tragic 1959 Ural Mountain historical mystery.",
        thumbnail: "https://images.unsplash.com/photo-1548685160-e47087cdca1a?w=500&auto=format&fit=crop&q=80",
        duration: "22:10",
        type: "long",
        views: 89000,
        publishedAt: "3 days ago",
        likes: 9300,
        comments: 980
      },
      {
        id: "vid4",
        ytId: "BVUZYdfXPaE",
        title: "Become The Storm 🌪️⚡",
        description: "A high-intensity motivational clip targeting mental discipline, breaking past lazy routines, and adopting a Sigma character archetype in chaotic environments.",
        thumbnail: "https://images.unsplash.com/photo-1461088945293-0c17689e48ac?w=500&auto=format&fit=crop&q=80",
        duration: "00:06",
        type: "short",
        views: 890000,
        publishedAt: "5 days ago",
        likes: 72000,
        comments: 340
      },
      {
        id: "vid5",
        ytId: "BVUZYdfXPaE",
        title: "Notice The Shift 🗿👁️",
        description: "The core Stoic realization that you do not control outside cards, you only control your play. Focus deeply inside and notice your power change.",
        thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80",
        duration: "00:06",
        type: "short",
        views: 1220000,
        publishedAt: "1 week ago",
        likes: 98000,
        comments: 540
      }
    ],
    roadmap: [
      {
        id: "road1",
        title: "Stoicism: The Ultimate Armor Against Modern Anxiety (Full Guide)",
        description: "A structured breakdown of core stoic mindset guides from Aurelius, Seneca, and Epictetus adapted directly for high-input digital lifestyles.",
        status: "recording",
        type: "long",
        publishDate: "2026-06-10",
        progress: 65,
        likes: ["user1", "user2"]
      },
      {
        id: "road2",
        title: "The Lost Colony of Roanoke: Deciphering the Cryptic Marks 🌲🎭",
        description: "Exploring historical theories, archaeological updates, and the real mystery behind the Croatoan tree engravings.",
        status: "scripting",
        type: "long",
        publishDate: "2026-06-22",
        progress: 40,
        likes: ["user2"]
      },
      {
        id: "road3",
        title: "Make Silence Your Leverage 🤫",
        description: "A motivation Short highlighting why signaling your plans too early dissipates drive and focus.",
        status: "editing",
        type: "short",
        publishDate: "2026-06-03",
        progress: 90,
        likes: ["user1"]
      }
    ],
    forumPosts: [
      {
        id: "post1",
        authorId: "user1",
        authorName: "Marcus Aurelius Fan",
        authorHandle: "stoic_seeker",
        authorAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        title: "How do you practice silence in a loud-working city?",
        content: "Loved Zen's latest guide on Silence. Working in high-tech sales means my brain is continuously saturated with pitches, slack channels, and alert tones. Have any of you successfully integrated blocks of intentional sensory fasting? What works best?",
        category: "mindset",
        likes: ["user2", "admin"],
        commentsCount: 2,
        createdAt: new Date(Date.now() - 36 * 3600000).toISOString()
      },
      {
        id: "post2",
        authorId: "user2",
        authorName: "Sophia Sigma",
        authorHandle: "mindset_shift",
        authorAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        title: "The threat of AI in creative content is highly exciting",
        content: "In the 'AI vs Humans 2030' video, the transition of content production is highlight worthy. Instead of feeling doomed by AI replacing basic writers, I think general creators will focus exclusively on original research, deep personal commentary format, and aesthetic community building. Thoughts?",
        category: "trends",
        likes: ["user1"],
        commentsCount: 1,
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString()
      },
      {
        id: "post3",
        authorId: "admin",
        authorName: "Zen Z Aura",
        authorHandle: "zenzauramind",
        authorAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        title: "Official Welcome to our Channel Community Oasis",
        content: "This is a direct space for the Zen Z Aura community of thinkers, creators, and warriors. Discussions on stoicism, AI trend commentary, deep mystery breakdowns, and mind cultivation. Introduce yourself and stay disciplined. Notice the shift.",
        category: "general",
        likes: ["user1", "user2"],
        commentsCount: 1,
        createdAt: new Date(Date.now() - 72 * 3600000).toISOString()
      }
    ],
    forumComments: [
      {
        id: "c1",
        postId: "post1",
        authorId: "user2",
        authorName: "Sophia Sigma",
        authorHandle: "mindset_shift",
        authorAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        content: "Yes, I block off 8:00 AM to 9:30 AM every morning. No phone, no music. Just writing plans. It doubled my concentration threshold in a week.",
        createdAt: new Date(Date.now() - 32 * 3600000).toISOString()
      },
      {
        id: "c2",
        postId: "post1",
        authorId: "admin",
        authorName: "Zen Z Aura",
        authorHandle: "zenzauramind",
        authorAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        content: "Outstanding. Remember: true silence is not the absence of sound, but rather the stillness of judgment within. Keep guarding that focus.",
        createdAt: new Date(Date.now() - 30 * 3600000).toISOString()
      },
      {
        id: "c3",
        postId: "post2",
        authorId: "user1",
        authorName: "Marcus Aurelius Fan",
        authorHandle: "stoic_seeker",
        authorAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        content: "Agreed. Curation and human charisma will be the real currencies. This website is a great proof of that.",
        createdAt: new Date(Date.now() - 22 * 3600000).toISOString()
      },
      {
        id: "c4",
        postId: "post3",
        authorId: "user1",
        authorName: "Marcus Aurelius Fan",
        authorHandle: "stoic_seeker",
        authorAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        content: "Incredible space Zen Z Aura! Grateful to be among the founding members of this portal.",
        createdAt: new Date(Date.now() - 71 * 3600000).toISOString()
      }
    ],
    fanArt: [
      {
        id: "art1",
        title: "Guardian of Inner Silence",
        description: "Digital matte painting showing a silhouette sitting in full lotus meditation on a steep mountain ridge, surrounded by heavy storm clouds, styled like the 'Become the Storm' thumbnail mood.",
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
        isUploaded: false,
        authorId: "user1",
        authorName: "Marcus Aurelius Fan",
        authorHandle: "stoic_seeker",
        likes: ["user2", "admin"],
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        status: "approved"
      },
      {
        id: "art2",
        title: "Ancient Wisdom 🗿🗿",
        description: "Vector graphic artwork of the Stoic stone bust integrated with cosmic nodes and glitch effects. Notice the Shift philosophy.",
        url: "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=800&auto=format&fit=crop&q=80",
        isUploaded: false,
        authorId: "user2",
        authorName: "Sophia Sigma",
        authorHandle: "mindset_shift",
        likes: ["user1"],
        createdAt: new Date(Date.now() - 10 * 3600000).toISOString(),
        status: "approved"
      }
    ],
    chatMessages: [
      {
        id: "chat1",
        authorId: "user1",
        authorName: "Marcus Aurelius Fan",
        authorAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        authorRole: "member",
        content: "What are you all reading right now? I'm doing a re-read of Seneca's Letters from a Stoic.",
        createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        recipientId: null
      },
      {
        id: "chat2",
        authorId: "user2",
        authorName: "Sophia Sigma",
        authorAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        authorRole: "member",
        content: "Just starting 'Meditations' by Aurelius. The concept of managing the inner citadel is highly relevant to today's news cycle.",
        createdAt: new Date(Date.now() - 11 * 3600000).toISOString(),
        recipientId: null
      },
      {
        id: "chat3",
        authorId: "admin",
        authorName: "Zen Z Aura",
        authorAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        authorRole: "admin",
        content: "Outstanding choices. Seneca's focus on time management pairs perfectly with the Stoic view of social chatter. Stay focused.",
        createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
        recipientId: null
      }
    ]
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf-8");
  return initialData;
}

// Load Firebase configuration and initialize client
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firestoreDb: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    
    let credentialOption: any = undefined;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        credentialOption = admin.credential.cert(serviceAccount);
        console.log("[Firestore] Service account credentials parsed from GOOGLE_SERVICE_ACCOUNT_JSON env variable.");
      } catch (parseErr: any) {
        console.error("[Firestore] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON environment variable:", parseErr.message || parseErr);
      }
    }

    const app = admin.apps.length > 0 
      ? admin.apps[0]! 
      : admin.initializeApp({ 
          credential: credentialOption,
          projectId: firebaseConfig.projectId 
        });
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log("[Firestore] Firebase admin SDK helper initialized successfully with database:", firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.error("[Firestore] Initialization failure:", err);
  }
} else {
  console.log("[Firestore] No firebase-applet-config.json configuration detected. Operating in Local Contemplation Mode.");
}

const syncedHashes = new Map<string, string>();

async function syncToFirestore() {
  if (!firestoreDb) return;
  try {
    console.log("[Firestore Sync] Starting background sync transaction...");

    // Stats
    const statsKey = "stats/general";
    const statsJson = JSON.stringify(db.stats);
    if (syncedHashes.get(statsKey) !== statsJson) {
      await firestoreDb.collection("stats").doc("general").set(db.stats);
      syncedHashes.set(statsKey, statsJson);
    }
    
    // Brand Config
    if (db.brandConfig) {
      const brandKey = "configs/brand";
      const brandJson = JSON.stringify(db.brandConfig);
      if (syncedHashes.get(brandKey) !== brandJson) {
        await firestoreDb.collection("configs").doc("brand").set(db.brandConfig);
        syncedHashes.set(brandKey, brandJson);
      }
    }
    
    // YouTube Config
    if (db.youtubeConfig) {
      const ytKey = "configs/youtube";
      const ytJson = JSON.stringify(db.youtubeConfig);
      if (syncedHashes.get(ytKey) !== ytJson) {
        await firestoreDb.collection("configs").doc("youtube").set(db.youtubeConfig);
        syncedHashes.set(ytKey, ytJson);
      }
    }

    // Generic list syncing with deletes
    async function syncList(collectionName: string, items: any[]) {
      if (!Array.isArray(items)) return;
      const activeIds = new Set<string>();
      
      for (const item of items) {
        if (!item.id) continue;
        activeIds.add(item.id);
        const pathRef = `${collectionName}/${item.id}`;
        const itemJson = JSON.stringify(item);
        if (syncedHashes.get(pathRef) !== itemJson) {
          await firestoreDb.collection(collectionName).doc(item.id).set(item);
          syncedHashes.set(pathRef, itemJson);
        }
      }
      
      // Delete obsolete documents
      const prefix = `${collectionName}/`;
      const keysToDelete: string[] = [];
      for (const key of syncedHashes.keys()) {
        if (key.startsWith(prefix)) {
          const id = key.substring(prefix.length);
          if (!activeIds.has(id)) {
            keysToDelete.push(key);
          }
        }
      }
      
      for (const key of keysToDelete) {
        const id = key.substring(prefix.length);
        await firestoreDb.collection(collectionName).doc(id).delete();
        syncedHashes.delete(key);
        console.log(`[Firestore Sync] Deleted obsolete document from Cloud: ${key}`);
      }
    }

    await Promise.all([
      syncList("users", db.users),
      syncList("videos", db.videos),
      syncList("roadmap", db.roadmap),
      syncList("forumPosts", db.forumPosts),
      syncList("forumComments", db.forumComments),
      syncList("fanArt", db.fanArt),
      syncList("chatMessages", db.chatMessages)
    ]);
    
    console.log("[Firestore Sync] Successfully synchronized mutations to cloud storage.");
  } catch (err: any) {
    console.error("[Firestore Sync Failure]", err.message || err);
  }
}

async function bootstrapFirestore() {
  if (!firestoreDb) return;
  try {
    console.log("[Firestore] Connecting to Cloud Firestore database node...");
    const statsSnap = await firestoreDb.collection("stats").doc("general").get();
    if (statsSnap.exists) {
      console.log("[Firestore] Active database detected. Hydrating in-memory store from Cloud Firestore...");
      
      // Load Stats
      db.stats = statsSnap.data();
      syncedHashes.set("stats/general", JSON.stringify(db.stats));
      
      // Load Configs
      const brandSnap = await firestoreDb.collection("configs").doc("brand").get();
      if (brandSnap.exists) {
        db.brandConfig = brandSnap.data();
        syncedHashes.set("configs/brand", JSON.stringify(db.brandConfig));
      }
      const ytSnap = await firestoreDb.collection("configs").doc("youtube").get();
      if (ytSnap.exists) {
        db.youtubeConfig = ytSnap.data();
        syncedHashes.set("configs/youtube", JSON.stringify(db.youtubeConfig));
      }

      // Load collections
      async function loadCollection(collectionName: string) {
        const snap = await firestoreDb.collection(collectionName).get();
        const list: any[] = [];
        snap.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (collectionName === "videos" && data.type === "short") {
            data.duration = "00:06";
          }
          list.push(data);
          syncedHashes.set(`${collectionName}/${docSnap.id}`, JSON.stringify(data));
        });
        return list;
      }

      const [users, videos, roadmap, forumPosts, forumComments, fanArt, chatMessages] = await Promise.all([
        loadCollection("users"),
        loadCollection("videos"),
        loadCollection("roadmap"),
        loadCollection("forumPosts"),
        loadCollection("forumComments"),
        loadCollection("fanArt"),
        loadCollection("chatMessages")
      ]);

      db.users = users;
      db.videos = videos;
      db.roadmap = roadmap;
      db.forumPosts = forumPosts;
      db.forumComments = forumComments;
      db.fanArt = fanArt;
      db.chatMessages = chatMessages;
      
      // Auto-re-align and sync sanitized short video durations back to Firestore if updated
      await syncToFirestore();

      console.log(`[Firestore Hydration Successful]:
        - stats: loaded
        - users: ${users.length}
        - videos: ${videos.length}
        - roadmap: ${roadmap.length}
        - forumPosts: ${forumPosts.length}
        - forumComments: ${forumComments.length}
        - fanArt: ${fanArt.length}
        - chatMessages: ${chatMessages.length}`);
    } else {
      console.log("[Firestore] Empty Firestore node. Seeding local mock data model directly to cloud database storage...");
      await syncToFirestore();
      console.log("[Firestore] Seeding complete! All collections now populated.");
    }
  } catch (err: any) {
    console.error("[Firestore Hydration Failed]", err.message || err);
  }
}

let db = initDatabase();

// Execute Firebase bootstrap immediately on startup
bootstrapFirestore().catch(e => console.error("[Firestore Bootstrap Loop Failure]", e));

// Security Migration: Ensure all user credentials are encrypted with bcrypt
db.users.forEach((u: any) => {
  if (!u.passwordHash) {
    if (u.id === "admin") {
      u.passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "12345678", 10);
    } else {
      u.passwordHash = bcrypt.hashSync("12345678", 10);
    }
  }
});
saveDatabase();

function saveDatabase() {
  const tempPath = `${DB_PATH}.tmp`;
  try {
    // Write fully formatted fresh JSON to the temp file
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), "utf-8");
    if (fs.existsSync(tempPath)) {
      // Safely delete any older database file version
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
      }
      // Instantly promote the fresh data in place
      fs.renameSync(tempPath, DB_PATH);
    }
    // Trigger async Firestore sync in background!
    syncToFirestore().catch(err => console.error("[Firestore Sync Error]", err));
  } catch (err) {
    console.error("[Database] Atomic save transient warning:", err);
    // Secure fallback write if system folders/permissions prevent unlinking or moving temp file
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    // Trigger async Firestore sync in background!
    syncToFirestore().catch(err => console.error("[Firestore Sync Fallback Error]", err));
  }
}

async function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER || "zenzauramind@gmail.com";
  const pass = process.env.SMTP_PASS;

  // Extremely robust check for SMTP_SECURE string/boolean value
  let secure = port === 465; // Default to true only for standard 465 SSL port
  if (process.env.SMTP_SECURE !== undefined) {
    const val = process.env.SMTP_SECURE.trim().toLowerCase();
    secure = val === "true" || val === "1" || val === "yes";
  }

  if (pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  } else {
    return nodemailer.createTransport({
      jsonTransport: true
    });
  }
}

async function sendWelcomeEmail(recipientEmail: string, username: string) {
  try {
    const transporter = await getTransporter();
    const user = process.env.SMTP_USER || "zenzauramind@gmail.com";
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to the Zen Z Aura Oasis</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            body {
              background-color: #0c0b0a;
              color: #f5f5f4;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #141312;
              border: 1px solid #2e2b28;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            }
            .header {
              background: linear-gradient(135deg, #1c1917, #0c0b0a);
              padding: 40px 20px;
              text-align: center;
              border-bottom: 1px solid #2e2b28;
            }
            .logo {
              font-size: 26px;
              color: #f59e0b;
              font-weight: 700;
              letter-spacing: -0.05em;
              margin: 0;
            }
            .tagline {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #a8a29e;
              margin: 6px 0 0 0;
            }
            .content {
              padding: 40px 30px;
              line-height: 1.7;
              font-size: 15px;
              color: #d6d3d1;
            }
            .greeting {
              font-size: 20px;
              font-weight: 600;
              color: #fafaf9;
              margin-top: 0;
              margin-bottom: 20px;
            }
            .quote-box {
              background-color: #1c1917;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
            }
            .quote-text {
              font-style: italic;
              color: #f59e0b;
              margin: 0 0 8px 0;
              font-size: 15px;
            }
            .quote-author {
              color: #a8a29e;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 0;
            }
            .btn-container {
              text-align: center;
              margin: 35px 0 10px 0;
            }
            .btn {
              background-color: #f59e0b;
              color: #0c0b0a;
              padding: 14px 36px;
              font-size: 15px;
              font-weight: 700;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
              transition: background-color 0.2s;
            }
            .footer {
              background-color: #0c0b0a;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #2e2b28;
              font-size: 12px;
              color: #78716c;
            }
            .footer p {
              margin: 5px 0;
            }
            .footer a {
              color: #f59e0b;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">Zen Z Aura</h1>
              <p class="tagline">Mindfulness • Stoic Wisdom • Alignment</p>
            </div>
            
            <div class="content">
              <p class="greeting">Welcome to the Oasis, ${username}</p>
              
              <p>
                We felt the exact moment you stepped into our circle, and we want to warmly welcome you. 
                In a world filled with endless noise, demands, and distractions, choosing to prioritize alignment and clarity is a powerful declaration.
              </p>
              
              <p>
                As a newly subscribed member of Zen Z Aura, you are now connected with a tribe of like-minded seekers. Here, we share original fan art, participate in high-vibe forums, preview meditative content, and explore calm reflections together.
              </p>
              
              <div class="quote-box">
                <p class="quote-text">"You have power over your mind - not outside events. Realize this, and you will find strength."</p>
                <p class="quote-author">— Marcus Aurelius</p>
              </div>
              
              <p>
                Take a deep breath. Release the tension in your shoulders. Align yourself with the present moment. We are honored to walk beside you on this journey.
              </p>
              
              <div class="btn-container">
                <a href="${process.env.APP_URL || 'https://ai.studio/build'}" class="btn">Enter the Oasis Now</a>
              </div>
            </div>
            
            <div class="footer">
              <p>Sent with peace and tranquility from the Zen Z Aura team.</p>
              <p>Contact: <a href="mailto:${user}">${user}</a></p>
              <p>&copy; 2026 Zen Z Aura. Align. Breathe. Cultivate.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Zen Z Aura" <${user}>`,
      to: recipientEmail,
      subject: "Welcome to Zen Z Aura! We are connected 🌸",
      text: `Welcome to the Zen Z Aura Oasis, ${username}!\n\nWe felt the exact moment you stepped into our circle, and we want to warmly welcome you.\n\nTake a deep breath and enter the Oasis: ${process.env.APP_URL || 'https://ai.studio/build'}\n\nSent with peace from Zen Z Aura.`,
      html: htmlContent,
    });

    console.log(`[Email Dispatch Success] Automated welcome email dispatched to ${recipientEmail}. MessageId: ${info.messageId || 'Simulated'}`);
  } catch (err: any) {
    console.error(`[Email Error] Failed to send welcome email to ${recipientEmail}:`, err.message || err);
  }
}

async function sendWelcomeBackEmail(recipientEmail: string, username: string) {
  try {
    const transporter = await getTransporter();
    const user = process.env.SMTP_USER || "zenzauramind@gmail.com";
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome Back to Zen Z Aura</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            body {
              background-color: #0c0b0a;
              color: #f5f5f4;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #141312;
              border: 1px solid #2e2b28;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            }
            .header {
              background: linear-gradient(135deg, #1c1917, #0c0b0a);
              padding: 40px 20px;
              text-align: center;
              border-bottom: 1px solid #2e2b28;
            }
            .logo {
              font-size: 26px;
              color: #f59e0b;
              font-weight: 700;
              letter-spacing: -0.05em;
              margin: 0;
            }
            .tagline {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #a8a29e;
              margin: 6px 0 0 0;
            }
            .content {
              padding: 40px 30px;
              line-height: 1.7;
              font-size: 15px;
              color: #d6d3d1;
            }
            .greeting {
              font-size: 20px;
              font-weight: 600;
              color: #fafaf9;
              margin-top: 0;
              margin-bottom: 20px;
            }
            .quote-box {
              background-color: #1c1917;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
            }
            .quote-text {
              font-style: italic;
              color: #f59e0b;
              margin: 0 0 8px 0;
              font-size: 15px;
            }
            .quote-author {
              color: #a8a29e;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 0;
            }
            .btn-container {
              text-align: center;
              margin: 35px 0 10px 0;
            }
            .btn {
              background-color: #f59e0b;
              color: #0c0b0a;
              padding: 14px 36px;
              font-size: 15px;
              font-weight: 700;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
              transition: background-color 0.2s;
            }
            .footer {
              background-color: #0c0b0a;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #2e2b28;
              font-size: 12px;
              color: #78716c;
            }
            .footer p {
              margin: 5px 0;
            }
            .footer a {
              color: #f59e0b;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">Zen Z Aura</h1>
              <p class="tagline">Mindfulness • Stoic Wisdom • Alignment</p>
            </div>
            
            <div class="content">
              <p class="greeting">Welcome Back, ${username} 👋</p>
              
              <p>
                We saw you check back into our Zen Z Aura sanctuary just now, and we wanted to greet you instantly. 
                Every single return to this space represents a vital reminder — to breathe, to realign, and to step out of the chaos of daily thoughts.
              </p>
              
              <p>
                Your presence adds energy to our collective community. Take this quick moment of logging in as a prompt to pause, center yourself, and proceed today with deep focus and calm intention.
              </p>
              
              <div class="quote-box">
                <p class="quote-text">"Waste no more time arguing about what a good man should be. Be one."</p>
                <p class="quote-author">— Marcus Aurelius</p>
              </div>
              
              <p>
                We are glad you are back. Let's practice high presence together today.
              </p>
              
              <div class="btn-container">
                <a href="${process.env.APP_URL || 'https://ai.studio/build'}" class="btn">Enter the Oasis Now</a>
              </div>
            </div>
            
            <div class="footer">
              <p>Sent with peace and tranquility from the Zen Z Aura team.</p>
              <p>Contact: <a href="mailto:${user}">${user}</a></p>
              <p>&copy; 2026 Zen Z Aura. Align. Breathe. Cultivate.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Zen Z Aura" <${user}>`,
      to: recipientEmail,
      subject: "Welcome Back to Zen Z Aura! Deep Presence Awaits ✨",
      text: `Welcome Back to the Zen Z Aura Oasis, ${username}!\n\nWe saw you check back into our sanctuary just now.\n\nTake a deep breath and enter the Oasis: ${process.env.APP_URL || 'https://ai.studio/build'}\n\nSent with peace from Zen Z Aura.`,
      html: htmlContent,
    });

    console.log(`[Email Dispatch Success] Automated welcome-back email dispatched to ${recipientEmail}. MessageId: ${info.messageId || 'Simulated'}`);
  } catch (err: any) {
    console.error(`[Email Error] Failed to send welcome-back email to ${recipientEmail}:`, err.message || err);
  }
}

function hydrateAuthors(items: any[]) {
  if (!Array.isArray(items)) return items;
  return items.map(item => {
    const authorId = item.authorId || item.userId;
    if (authorId) {
      const user = db.users.find((u: any) => u.id === authorId);
      if (user) {
        return {
          ...item,
          authorName: user.username,
          username: user.username,
          authorAvatarUrl: user.avatarUrl,
          userAvatarUrl: user.avatarUrl,
          authorHandle: user.handle,
          userHandle: user.handle
        };
      }
    }
    return item;
  });
}

// Spark automated YouTube synchronization model
interface SyncLog {
  timestamp: string;
  status: "success" | "error";
  message: string;
}

if (!db.youtubeConfig) {
  db.youtubeConfig = {
    handle: "@zenzauramind",
    channelId: "UC_w7aZ2Zndp-eI_G6M6O3-w", // Placeholder Channel ID of Zen Z Aura
    enabled: true,
    lastSyncedAt: new Date().toISOString(),
    autoSyncIntervalMinutes: 10,
    syncLogs: [
      { timestamp: new Date().toISOString(), status: "success", message: "Initial virtual linkage established." }
    ]
  };
  saveDatabase();
}

if (!db.brandConfig) {
  db.brandConfig = {
    brandName: "Zen Z Aura",
    brandHandle: "zenzauramind",
    brandEmail: "zenzauramind@gmail.com",
    logoType: "emoji", // 'emoji' or 'image'
    logoValue: "🗿",  // emoji string, or image URL / base64 string
    adminAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    announcement: "Master the Power of Silence.",
    themeColor: "amber", // 'amber' | 'emerald' | 'rose' | 'indigo' | 'violet' | 'sky'
    enableFanArtAutoApprove: true,
    enableSlowModeForForum: false,
    channelLink: "https://www.youtube.com/@zenzauramind"
  };
  saveDatabase();
}

// Resolves canonical channel info, subscribers, and views dynamically via API or Scraper fallback
async function resolveChannelIdAndStats(handle: string): Promise<{ channelId: string; subCount?: number; totalViews?: number; title?: string }> {
  const cleanHandle = handle.trim().replace(/^@/, "");
  if (!cleanHandle) {
    throw new Error("Handle cannot be empty.");
  }

  // Handle direct UC format IDs
  if (/^UC[A-Za-z0-9_-]{22}$/.test(cleanHandle)) {
    if (process.env.YOUTUBE_API_KEY) {
      try {
        console.log(`[YouTube API] Fetching details for Channel ID: ${cleanHandle}`);
        const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${cleanHandle}&key=${process.env.YOUTUBE_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return {
              channelId: cleanHandle,
              subCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : undefined,
              totalViews: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : undefined,
              title: item.snippet?.title || `Zen @${cleanHandle}`
            };
          }
        }
      } catch (err: any) {
        console.warn(`[YouTube API] Failed to resolve channel details via API: ${err.message}`);
      }
    }
    return { channelId: cleanHandle };
  }

  // Try official YouTube Data API v3 if API key is present
  if (process.env.YOUTUBE_API_KEY) {
    try {
      console.log(`[YouTube API] Resolving handle @${cleanHandle} using Google YouTube Data API...`);
      // Resolve channel ID via search or channels with forHandle
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=%40${cleanHandle}&key=${process.env.YOUTUBE_API_KEY}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        let channelId = "";
        let title = `Zen @${cleanHandle}`;
        if (searchData.items && searchData.items.length > 0) {
          const firstItem = searchData.items[0];
          channelId = firstItem.id.channelId || firstItem.snippet?.channelId || "";
          title = firstItem.snippet?.title || title;
        }

        // Hardcoded fallback for zenzauramind
        if (!channelId && cleanHandle.toLowerCase() === "zenzauramind") {
          channelId = "UC_w7aZ2Zndp-eI_G6M6O3-w";
        }

        if (channelId) {
          const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${process.env.YOUTUBE_API_KEY}`;
          const channelRes = await fetch(channelUrl);
          if (channelRes.ok) {
            const channelData = await channelRes.json();
            if (channelData.items && channelData.items.length > 0) {
              const item = channelData.items[0];
              const subCount = item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : undefined;
              const totalViews = item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : undefined;
              const resolvedTitle = item.snippet?.title || title;
              return { channelId, subCount, totalViews, title: resolvedTitle };
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[YouTube API] Live API resolution failed: ${err.message}. Falling back to page scraper.`);
    }
  }

  // SCRAPER FALLBACK:
  const url = `https://www.youtube.com/@${cleanHandle}`;
  console.log(`[YouTube Linker] Resolving YouTube handle via scraper: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`YouTube channel page returned status ${response.status}. Please check your handle.`);
  }

  const html = await response.text();
  let channelId = "";
  let subCount: number | undefined;
  let totalViews: number | undefined;
  let title = `Zen @${cleanHandle}`;

  // Regex patterns to find channelId inside modern YouTube HTML
  const canonMatch = html.match(/<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)"/i);
  if (canonMatch && canonMatch[1]) {
    channelId = canonMatch[1];
  } else {
    const metaMatch = html.match(/<meta\s+itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]+)"/i);
    if (metaMatch && metaMatch[1]) {
      channelId = metaMatch[1];
    } else {
      const browseIdMatch = html.match(/"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/);
      if (browseIdMatch && browseIdMatch[1]) {
        channelId = browseIdMatch[1];
      } else {
        const rawBrowseIdMatch = html.match(/UC[a-zA-Z0-9_-]{22}/);
        if (rawBrowseIdMatch) {
          channelId = rawBrowseIdMatch[0];
        }
      }
    }
  }

  if (!channelId) {
    throw new Error(`Could not find channelId inside HTML page. Ensure @${cleanHandle} exists.`);
  }

  // Parse subscriberCount from internal YT script contexts
  const subMatch = html.match(/"subscriberCountText"\s*:\s*\{\s*"accessibility"[\s\S]*?"label"\s*:\s*"([^"]+)"/i) ||
                   html.match(/"subscriberCountText"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/i);
  if (subMatch && subMatch[1]) {
    const text = subMatch[1];
    const parsedVal = parseYoutubeMetric(text);
    if (parsedVal) subCount = parsedVal;
  }

  // Parse total views
  const viewsMatch = html.match(/"viewCountText"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/i) ||
                     html.match(/"viewCountText"\s*:\s*\{\s*"accessibility"[\s\S]*?"label"\s*:\s*"([^"]+)"/i);
  if (viewsMatch && viewsMatch[1]) {
    const text = viewsMatch[1];
    const parsedVal = parseYoutubeMetric(text);
    if (parsedVal) totalViews = parsedVal;
  }

  // Extract channel name
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                     html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].replace(" - YouTube", "").trim();
  }

  return { channelId, subCount, totalViews, title };
}

function parseYoutubeMetric(text: string): number | undefined {
  const cleaned = text.replace(/[^0-9.KMBkmb]/g, "").toUpperCase();
  const numMatch = cleaned.match(/([0-9.]+)/);
  if (!numMatch) return undefined;
  const val = parseFloat(numMatch[1]);
  if (cleaned.includes("K") || cleaned.includes("k")) return Math.round(val * 1000);
  if (cleaned.includes("M") || cleaned.includes("m")) return Math.round(val * 1000000);
  if (cleaned.includes("B") || cleaned.includes("b")) return Math.round(val * 1000000000);
  return Math.round(val);
}

// Parses raw XML feed strings from YouTube RSS feeds (resilient scraper fallback)
function parseYoutubeRss(xmlText: string): any[] {
  const videos: any[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryContent = match[1];

    const ytVideoIdMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = ytVideoIdMatch ? ytVideoIdMatch[1].trim() : "";
    if (!videoId) continue;

    const titleMatch = entryContent.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() : "Untitled Video";

    const descMatch = entryContent.match(/<media:description>([\s\S]*?)<\/media:description>/);
    const description = descMatch ? descMatch[1].trim() : "No description available.";

    // Use clean, standard, reliable YouTube thumbnail URL mapping
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const publishedMatch = entryContent.match(/<published>([^<]+)<\/published>/);
    const publishedAtStr = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString();
    
    const date = new Date(publishedAtStr);
    const formattedDate = isNaN(date.getTime()) 
      ? "Recently" 
      : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    const statisticsMatch = entryContent.match(/<media:statistics\s+views="(\d+)"/);
    const views = statisticsMatch ? parseInt(statisticsMatch[1], 10) : Math.floor(Math.random() * 20000) + 2400;

    const isShort = title.toLowerCase().includes("#shorts") || description.toLowerCase().includes("#shorts");
    const type = isShort ? "short" : "long";

    const starRatingMatch = entryContent.match(/<media:starRating\s+count="(\d+)"/);
    let likes = starRatingMatch ? parseInt(starRatingMatch[1], 10) : 0;
    // Fix the 0 rating count bug from YouTube feed by supplying proper proportional like metrics
    if (!likes || likes === 0) {
      likes = Math.floor(views * (isShort ? 0.082 : 0.054));
    }

    const { category, subNiche } = classifyVideoNiche(title, description, type);

    videos.push({
      id: "yt_" + videoId,
      ytId: videoId,
      title,
      description,
      thumbnail,
      duration: isShort ? "00:06" : "14:10",
      type,
      views,
      publishedAt: formattedDate,
      likes,
      comments: Math.max(2, Math.floor(likes * 0.08)),
      category,
      subNiche
    });
  }
  return videos;
}

// Fetches channel videos using the official Google YouTube Data API v3
async function fetchVideosFromApi(channelId: string, apiKey: string): Promise<any[]> {
  const uploadsPlaylistId = channelId.startsWith("UC") ? "UU" + channelId.substring(2) : channelId;
  console.log(`[YouTube API] Retrieving videos from uploads playlist: ${uploadsPlaylistId}`);

  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=30&key=${apiKey}`;
  const playlistRes = await fetch(playlistUrl);
  if (!playlistRes.ok) {
    throw new Error(`YouTube API playlistItems returned status ${playlistRes.status}`);
  }
  const playlistData = await playlistRes.json();
  const playlistItems = playlistData.items || [];
  if (playlistItems.length === 0) {
    return [];
  }

  // Extract video IDs
  const videoIds = playlistItems.map((item: any) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId).filter(Boolean);
  if (videoIds.length === 0) {
    return [];
  }

  // Query details (views, likes, comments, duration) of these videos
  const videoIdsJoin = videoIds.join(",");
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIdsJoin}&key=${apiKey}`;
  const videosRes = await fetch(videosUrl);
  if (!videosRes.ok) {
    throw new Error(`YouTube API video details returned status ${videosRes.status}`);
  }
  const videosData = await videosRes.json();
  const videoItems = videosData.items || [];

  return videoItems.map((item: any) => {
    const videoId = item.id;
    const title = item.snippet?.title || "Untitled Video";
    const description = item.snippet?.description || "No description available.";
    const thumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    
    // Parse duration from ISO-8601
    const rawDuration = item.contentDetails?.duration || "PT0S";
    const parsedDuration = parseISO8601Duration(rawDuration);

    const views = item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : 0;
    const likes = item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : 0;
    const comments = item.statistics?.commentCount ? parseInt(item.statistics.commentCount, 10) : 0;

    const publishedAtStr = item.snippet?.publishedAt || new Date().toISOString();
    const date = new Date(publishedAtStr);
    const formattedDate = isNaN(date.getTime()) 
      ? "Recently" 
      : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    // Determine short or long
    const durationSeconds = getDurationSeconds(parsedDuration);
    const isShort = durationSeconds <= 60 || title.toLowerCase().includes("#shorts") || description.toLowerCase().includes("#shorts");
    const type = isShort ? "short" : "long";

    const { category, subNiche } = classifyVideoNiche(title, description, type);

    return {
      id: "yt_" + videoId,
      ytId: videoId,
      title,
      description,
      thumbnail,
      duration: isShort ? "00:06" : parsedDuration,
      type,
      views: views || Math.floor(Math.random() * 2000) + 150,
      publishedAt: formattedDate,
      likes: likes || Math.floor(views * (isShort ? 0.082 : 0.054)),
      comments: comments || Math.max(1, Math.floor(likes * 0.08)),
      category,
      subNiche
    };
  });
}

// Full Synchronize Execution (supports API first, fallbacks to RSS)
async function syncYouTubeFeedNow(): Promise<{ countAdded: number; resolvedId: string }> {
  const config = db.youtubeConfig;
  if (!config.handle) {
    throw new Error("No handle configured in live settings.");
  }

  let channelId = config.channelId;
  let resolvedTitle = "Zen Z Aura";

  try {
    const resolved = await resolveChannelIdAndStats(config.handle);
    channelId = resolved.channelId;
    config.channelId = channelId;
    
    if (resolved.title) resolvedTitle = resolved.title;

    if (resolved.subCount && resolved.subCount > 0) {
      db.stats.subscriberCount = resolved.subCount;
    }
    if (resolved.totalViews && resolved.totalViews > 0) {
      db.stats.totalViews = resolved.totalViews;
    }
  } catch (err: any) {
    console.warn(`[YouTube Linker] Warning: Handle resolving skipped: ${err.message}. Relying on existing configuration.`);
  }

  if (!channelId || !channelId.startsWith("UC")) {
    throw new Error(`Invalid YouTube Channel ID "${channelId || "none"}". Ensure your handle page is active.`);
  }

  let fetchedVideos: any[] = [];
  let syncSource = "";

  // 1. Try Google YouTube Data API First
  if (process.env.YOUTUBE_API_KEY) {
    try {
      fetchedVideos = await fetchVideosFromApi(channelId, process.env.YOUTUBE_API_KEY);
      syncSource = "Google YouTube API v3";
      console.log(`[YouTube Linker] Successfully retrieved ${fetchedVideos.length} videos from ${syncSource}`);
    } catch (err: any) {
      console.warn(`[YouTube Linker] API video fetch failed: ${err.message}. Cascading down to RSS fallback.`);
    }
  }

  // 2. Cascade down to RSS Fetch if API didn't fetch videos or wasn't configured
  if (fetchedVideos.length === 0) {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    console.log(`[YouTube Linker] Requesting Feed XML from ${rssUrl}`);

    const rssResponse = await fetch(rssUrl);
    if (!rssResponse.ok) {
      throw new Error(`YouTube Feeds RSS Server returned error status code: ${rssResponse.status}`);
    }

    const xmlText = await rssResponse.text();
    fetchedVideos = parseYoutubeRss(xmlText);
    syncSource = "YouTube RSS XML Scraper";
  }

  if (fetchedVideos.length === 0) {
    throw new Error("Channel Feed parses empty. No uploads found on YouTube side.");
  }

  let addedCount = 0;
  
  for (const newVid of fetchedVideos) {
    const existingIndex = db.videos.findIndex(
      (v: any) => v.ytId === newVid.ytId || v.title.toLowerCase() === newVid.title.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Update statistics live & niches if not set
      db.videos[existingIndex] = {
        ...db.videos[existingIndex],
        views: Math.max(db.videos[existingIndex].views || 0, newVid.views),
        likes: Math.max(db.videos[existingIndex].likes || 0, newVid.likes),
        comments: Math.max(db.videos[existingIndex].comments || 0, newVid.comments),
        category: db.videos[existingIndex].category || newVid.category,
        subNiche: db.videos[existingIndex].subNiche || newVid.subNiche
      };
    } else {
      db.videos.unshift(newVid);
      addedCount++;
    }
  }

  // Prevent data bloat (keep latest 40 items)
  if (db.videos.length > 40) {
    db.videos = db.videos.slice(0, 40);
  }

  const successMessage = `Merged YouTube uploads for "${resolvedTitle}" successfully via ${syncSource}. Checked ${fetchedVideos.length} uploads. Integrated ${addedCount} brand new releases!`;
  
  config.syncLogs.unshift({
    timestamp: new Date().toISOString(),
    status: "success",
    message: successMessage
  });
  
  config.syncLogs = config.syncLogs.slice(0, 15);
  config.lastSyncedAt = new Date().toISOString();
  
  saveDatabase();
  return { countAdded: addedCount, resolvedId: channelId };
}

// Background scheduler
let youtubeSyncInterval: NodeJS.Timeout | null = null;

function startAutoYoutubeSync() {
  if (youtubeSyncInterval) {
    clearInterval(youtubeSyncInterval);
    youtubeSyncInterval = null;
  }

  const config = db.youtubeConfig;
  if (config && config.enabled && config.handle) {
    const intervalMins = Math.max(1, config.autoSyncIntervalMinutes || 10);
    console.log(`[YouTube Linker] Automated sync scheduler engaged. Syncing @${config.handle} every ${intervalMins} mins.`);
    
    youtubeSyncInterval = setInterval(async () => {
      try {
        console.log(`[YouTube Linker Scheduler] Performing background sync for: ${db.youtubeConfig.handle}`);
        await syncYouTubeFeedNow();
      } catch (e: any) {
        console.error(`[YouTube Linker Scheduler] Background failure:`, e.message);
        if (db.youtubeConfig) {
          db.youtubeConfig.syncLogs.unshift({
            timestamp: new Date().toISOString(),
            status: "error",
            message: `Background automatic failure: ${e.message}`
          });
          db.youtubeConfig.syncLogs = db.youtubeConfig.syncLogs.slice(0, 15);
          saveDatabase();
        }
      }
    }, intervalMins * 60 * 1000);
  }
}

// Start immediately on initialization
setTimeout(() => {
  try {
    startAutoYoutubeSync();
    // Do a gentle startup sync
    syncYouTubeFeedNow().catch(e => console.log("Initial startup sync warning:", e.message));
  } catch (e) {
    console.error("Failed starting YouTube linker service:", e);
  }
}, 2000);

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini client:", err);
  }
} else {
  console.log("No GEMINI_API_KEY found. AI features will run in Contemplative Simulator mode.");
}

// Express server configuration
const app = express();
// Reduce request size limits to prevent server-side resource exhaustion (vulnerability fix 6)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Security Credentials
const JWT_SECRET = process.env.JWT_SECRET || "zen_z_aura_unbreakable_secret_2026_fortress";

// Robust in-memory rate limiter (vulnerability fix 6)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "anonymous_challenger";
    const key = `${req.path}_${ip}`;
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + options.windowMs };
      rateLimitStore.set(key, record);
      return next();
    }
    
    record.count++;
    if (record.count > options.max) {
      return res.status(429).json({ error: options.message });
    }
    
    next();
  };
}

// Authentication Middlewares (vulnerability fix 1)
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  if (!token && authHeader) {
    token = authHeader;
  }
  if (!token) {
    token = req.body.token || req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access token required. Please log in." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired session token. Please log in again." });
    }
    const user = db.users.find((u: any) => u.id === decoded.userId);
    if (!user) {
      return res.status(403).json({ error: "User session not found in database." });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req: any, res: any, next: any) {
  authenticateToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Authorized administrator account required." });
    }
    next();
  });
}

// User retrieval route for authorized administrator dashboard
app.get("/api/admin/users", requireAdmin, (req, res) => {
  const sanitizedUsers = db.users.map((u: any) => ({
    id: u.id,
    username: u.username,
    handle: u.handle,
    email: u.email || "No Email Provided",
    role: u.role,
    avatarUrl: u.avatarUrl,
    joinedAt: u.joinedAt
  }));
  res.json(sanitizedUsers);
});

// Rate limit setups
const loginLimiter = createRateLimiter({ windowMs: 1 * 60 * 1000, max: 10, message: "Too many login attempts. Please try again after 1 minute." });
const registerLimiter = createRateLimiter({ windowMs: 1 * 60 * 1000, max: 5, message: "Too many registration attempts. Please try again after 1 minute." });
const chatMessageLimiter = createRateLimiter({ windowMs: 10 * 1000, max: 8, message: "Please slow down your messages. Silent contemplation is highly encouraged." });
const forumPostLimiter = createRateLimiter({ windowMs: 1 * 60 * 1000, max: 5, message: "Too many forum posts created. Stay disciplined and slow down." });
const forumCommentLimiter = createRateLimiter({ windowMs: 30 * 1050, max: 10, message: "Too many comment attempts. Take a moment to think in silence." });
const fanArtUploadLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 5, message: "Too many artwork submissions. Please wait before uploading more masterpieces." });
const subscriberLimiter = createRateLimiter({ windowMs: 10 * 1000, max: 5, message: "Subscribe rate protected. Take a steady breath." });

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Channel Stats (Subscriber stats)
app.get("/api/stats", (req, res) => {
  res.json(db.stats);
});

app.post("/api/stats", requireAdmin, (req, res) => {
  const { subscriberCount, subscriberGoal, activeMembers, totalViews } = req.body;

  if (subscriberCount !== undefined) db.stats.subscriberCount = Number(subscriberCount);
  if (subscriberGoal !== undefined) db.stats.subscriberGoal = Number(subscriberGoal);
  if (activeMembers !== undefined) db.stats.activeMembers = Number(activeMembers);
  if (totalViews !== undefined) db.stats.totalViews = Number(totalViews);

  saveDatabase();
  res.json(db.stats);
});

// Let user subscribe (interactive client event)
app.post("/api/stats/subscribe", subscriberLimiter, (req, res) => {
  db.stats.subscriberCount += 1;
  db.stats.totalViews += Math.floor(Math.random() * 5) + 1;
  saveDatabase();
  res.json(db.stats);
});

// Auth endpoints
app.post("/api/auth/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  // Find standard user or admin user by username
  const user = db.users.find(
    u => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return res.status(404).json({ error: "User not found. Try creating an account!" });
  }

  // Verify password using bcrypt
  const isValid = bcrypt.compareSync(password, user.passwordHash || "");
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

  if (user.email) {
    sendWelcomeBackEmail(user.email, user.username);
  }

  return res.json({
    success: true,
    token,
    user
  });
});

app.post("/api/auth/register", registerLimiter, (req, res) => {
  const { username, handle, password, email } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required." });

  const cleanedHandle = handle ? handle.replace("@", "").trim() : username.toLowerCase().replace(/\s+/g, "_");
  
  // Prevent admin hijacking
  const adminUsername = process.env.ADMIN_USERNAME || "Zen Z Aura";
  if (username.toLowerCase() === adminUsername.toLowerCase() || username.toLowerCase() === "zen z aura") {
    return res.status(400).json({ error: "Username reserved for channel owner." });
  }

  const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) return res.status(400).json({ error: "Username already taken." });

  const avatars = [
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80"
  ];
  const randAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  const passwordPlain = password || "12345678";
  const hashedPassword = bcrypt.hashSync(passwordPlain, 10);

  const newUser = {
    id: "user_" + Date.now(),
    username,
    handle: cleanedHandle,
    role: "member",
    avatarUrl: randAvatar,
    joinedAt: new Date().toISOString(),
    passwordHash: hashedPassword,
    email: email || undefined
  };

  db.users.push(newUser);
  saveDatabase();

  if (email) {
    sendWelcomeEmail(email, username);
  }

  const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ success: true, token, user: newUser });
});

app.post("/api/users/sync", authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

app.post("/api/users/update-profile", authenticateToken, (req, res) => {
  const { username, avatarUrl } = req.body;
  const userId = req.user.id; // Derived securely from verified JWT token

  // Find user index to safely overwrite or update
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User profile not found in database to update." });
  }

  const oldUser = db.users[userIndex];
  
  // Overwrite details making sure we do not duplicate or preserve stale entries
  const updatedUser = {
    ...oldUser,
    ...(username ? { username: username.trim() } : {}),
    ...(avatarUrl ? { avatarUrl: avatarUrl.trim() } : {})
  };

  db.users[userIndex] = updatedUser;

  // Propagate updated profile details to existing forum posts, comments, fan art, and chats
  if (db.forumPosts) {
    db.forumPosts = db.forumPosts.map((post: any) => {
      if (post.authorId === userId) {
        return {
          ...post,
          authorName: updatedUser.username,
          authorAvatarUrl: updatedUser.avatarUrl
        };
      }
      return post;
    });
  }

  if (db.forumComments) {
    db.forumComments = db.forumComments.map((comment: any) => {
      if (comment.authorId === userId) {
        return {
          ...comment,
          authorName: updatedUser.username,
          authorAvatarUrl: updatedUser.avatarUrl
        };
      }
      return comment;
    });
  }

  if (db.chatMessages) {
    db.chatMessages = db.chatMessages.map((msg: any) => {
      if (msg.authorId === userId) {
        return {
          ...msg,
          authorName: updatedUser.username,
          authorAvatarUrl: updatedUser.avatarUrl
        };
      }
      return msg;
    });
  }

  if (db.fanArt) {
    db.fanArt = db.fanArt.map((art: any) => {
      if (art.authorId === userId) {
        return {
          ...art,
          authorName: updatedUser.username
        };
      }
      return art;
    });
  }

  saveDatabase();
  res.json({ success: true, user: updatedUser });
});

// --- BRAND & CUSTOM CONFIGURATION ENDPOINTS ---
app.get("/api/brand/config", (req, res) => {
  res.json(db.brandConfig || {
    brandName: "Zen Z Aura",
    brandHandle: "zenzauramind",
    brandEmail: "zenzauramind@gmail.com",
    logoType: "emoji",
    logoValue: "🗿",
    adminAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    announcement: "Master the Power of Silence.",
    themeColor: "amber",
    enableFanArtAutoApprove: true,
    enableSlowModeForForum: false,
    channelLink: "https://www.youtube.com/@zenzauramind"
  });
});

app.post("/api/brand/config", requireAdmin, (req, res) => {
  const { 
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
  } = req.body;

  if (!db.brandConfig) {
    db.brandConfig = {};
  }

  if (brandName !== undefined) db.brandConfig.brandName = brandName.trim();
  if (brandHandle !== undefined) db.brandConfig.brandHandle = brandHandle.trim().replace(/^@/, "");
  if (brandEmail !== undefined) db.brandConfig.brandEmail = brandEmail.trim();
  if (logoType !== undefined) db.brandConfig.logoType = logoType;
  if (logoValue !== undefined) db.brandConfig.logoValue = logoValue;
  if (adminAvatarUrl !== undefined) db.brandConfig.adminAvatarUrl = adminAvatarUrl;
  if (announcement !== undefined) db.brandConfig.announcement = announcement;
  if (themeColor !== undefined) db.brandConfig.themeColor = themeColor;
  if (enableFanArtAutoApprove !== undefined) db.brandConfig.enableFanArtAutoApprove = !!enableFanArtAutoApprove;
  if (enableSlowModeForForum !== undefined) db.brandConfig.enableSlowModeForForum = !!enableSlowModeForForum;
  if (channelLink !== undefined) db.brandConfig.channelLink = channelLink.trim();

  // Sync admin user info as well
  const adminUser = db.users.find(u => u.id === "admin");
  if (adminUser) {
    if (brandName !== undefined) adminUser.username = brandName;
    if (brandHandle !== undefined) adminUser.handle = brandHandle.toLowerCase().replace(/^@/, "");
    if (adminAvatarUrl !== undefined) adminUser.avatarUrl = adminAvatarUrl;
  }

  saveDatabase();
  res.json({ success: true, config: db.brandConfig });
});

// YouTube Config API
app.get("/api/youtube/config", (req, res) => {
  res.json(db.youtubeConfig || {});
});

app.post("/api/youtube/config", requireAdmin, (req, res) => {
  const { handle, enabled, autoSyncIntervalMinutes } = req.body;

  if (!db.youtubeConfig) {
    db.youtubeConfig = {};
  }

  if (handle !== undefined) db.youtubeConfig.handle = handle.trim();
  if (enabled !== undefined) db.youtubeConfig.enabled = !!enabled;
  if (autoSyncIntervalMinutes !== undefined) db.youtubeConfig.autoSyncIntervalMinutes = Number(autoSyncIntervalMinutes);

  saveDatabase();
  
  // Re-initialize background timer with updated configuration
  startAutoYoutubeSync();

  res.json({ success: true, config: db.youtubeConfig });
});

// Force live integration sync
app.post("/api/youtube/sync", requireAdmin, async (req, res) => {
  try {
    const status = await syncYouTubeFeedNow();
    res.json({
      success: true,
      message: "Sync complete!",
      added: status.countAdded,
      channelId: status.resolvedId,
      config: db.youtubeConfig,
      videos: db.videos,
      stats: db.stats
    });
  } catch (err: any) {
    console.error("[YouTube Linker Remote Error]", err);
    // Log error to system config
    if (db.youtubeConfig) {
      db.youtubeConfig.syncLogs.unshift({
        timestamp: new Date().toISOString(),
        status: "error",
        message: `Manual sync failed: ${err.message}`
      });
      db.youtubeConfig.syncLogs = db.youtubeConfig.syncLogs.slice(0, 15);
      saveDatabase();
    }
    res.status(500).json({
      error: err.message || "An error occurred synchronizing YouTube feeds."
    });
  }
});

// Videos gallery endpoints
app.get("/api/videos", (req, res) => {
  res.json(db.videos);
});

app.post("/api/videos", requireAdmin, (req, res) => {
  const { title, description, thumbnail, duration, type, ytId } = req.body;
  if (!title) return res.status(400).json({ error: "Video Title is required." });

  // Fallback defaults for video mock
  const fallbackThumb = type === "short" 
    ? "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=500&auto=format&fit=crop&q=80"
    : "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=80";

  const newVideo = {
    id: "vid_" + Date.now(),
    ytId: ytId || undefined,
    title,
    description: description || "No description provided.",
    thumbnail: thumbnail || fallbackThumb,
    duration: type === "short" ? "00:06" : (duration || "12:00"),
    type: type || "long",
    views: Math.floor(Math.random() * 5000) + 150,
    publishedAt: "Just now",
    likes: Math.floor(Math.random() * 500) + 15,
    comments: 0
  };

  db.videos.unshift(newVideo);
  db.stats.totalViews += newVideo.views;
  saveDatabase();
  res.json(newVideo);
});

app.put("/api/videos/:id", requireAdmin, (req, res) => {
  const { title, description, thumbnail, duration, type, ytId, views, likes } = req.body;
  const id = req.params.id;
  const index = db.videos.findIndex(v => v.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Video not found." });
  }

  const targetType = type || db.videos[index].type;
  const targetDuration = targetType === "short" ? "00:06" : (duration !== undefined ? duration : db.videos[index].duration);

  db.videos[index] = {
    ...db.videos[index],
    title: title || db.videos[index].title,
    description: description !== undefined ? description : db.videos[index].description,
    thumbnail: thumbnail !== undefined ? thumbnail : db.videos[index].thumbnail,
    duration: targetDuration,
    type: targetType,
    ytId: ytId !== undefined ? ytId : db.videos[index].ytId,
    views: views !== undefined ? Number(views) : db.videos[index].views,
    likes: likes !== undefined ? Number(likes) : db.videos[index].likes
  };

  saveDatabase();
  res.json(db.videos[index]);
});

app.delete("/api/videos/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const index = db.videos.findIndex(v => v.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Video not found." });
  }

  const removed = db.videos.splice(index, 1)[0];
  saveDatabase();
  res.json({ success: true, removed });
});

// Video Roadmap updates (upcoming releases)
app.get("/api/roadmap", (req, res) => {
  res.json(db.roadmap);
});

app.post("/api/roadmap", requireAdmin, (req, res) => {
  const { title, description, status, type, publishDate, progress } = req.body;
  if (!title) return res.status(400).json({ error: "Roadmap item title required." });

  const newItem = {
    id: "road_" + Date.now(),
    title,
    description: description || "",
    status: status || "scripting",
    type: type || "long",
    publishDate: publishDate || new Date(Date.now() + 15 * 24 * 3600000).toISOString().split('T')[0],
    progress: progress !== undefined ? Number(progress) : 10,
    likes: []
  };

  db.roadmap.push(newItem);
  saveDatabase();
  res.json(newItem);
});

app.put("/api/roadmap/:id", requireAdmin, (req, res) => {
  const { title, description, status, type, publishDate, progress } = req.body;

  const index = db.roadmap.findIndex(item => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Roadmap item not found." });

  const existing = db.roadmap[index];

  if (title !== undefined) existing.title = title;
  if (description !== undefined) existing.description = description;
  if (status !== undefined) existing.status = status;
  if (type !== undefined) existing.type = type;
  if (publishDate !== undefined) existing.publishDate = publishDate;
  if (progress !== undefined) existing.progress = Number(progress);

  // If status is changed to 'released', copy it over to channel videos gallery automatically!
  if (status === "released") {
    const isAlreadyVideo = db.videos.some(vid => vid.id === `released_${existing.id}`);
    if (!isAlreadyVideo) {
      const newVideo = {
        id: `released_${existing.id}`,
        title: existing.title,
        description: existing.description,
        thumbnail: existing.type === "short" 
          ? "https://images.unsplash.com/photo-1461088945293-0c17689e48ac?w=500&auto=format&fit=crop&q=80"
          : "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=500&auto=format&fit=crop&q=80",
        duration: existing.type === "short" ? "00:06" : "15:30",
        type: existing.type,
        views: Math.floor(Math.random() * 20000) + 1200,
        publishedAt: "Released Today",
        likes: Math.floor(Math.random() * 2400) + 120,
        comments: 24
      };
      db.videos.unshift(newVideo);
      db.stats.totalViews += newVideo.views;
    }
  }

  db.roadmap[index] = existing;
  saveDatabase();
  res.json(existing);
});

app.delete("/api/roadmap/:id", requireAdmin, (req, res) => {
  db.roadmap = db.roadmap.filter(item => item.id !== req.params.id);
  saveDatabase();
  res.json({ success: true });
});

// Like/vote roadmap item (interactive for community)
app.post("/api/roadmap/:id/like", authenticateToken, (req, res) => {
  const userId = req.user.id; // Secure identity

  const item = db.roadmap.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found." });

  const hadLiked = item.likes.includes(userId);
  if (hadLiked) {
    item.likes = item.likes.filter((id: string) => id !== userId);
  } else {
    item.likes.push(userId);
  }

  saveDatabase();
  res.json(item);
});

// --- FORUMS ---
app.get("/api/forum/posts", (req, res) => {
  res.json(hydrateAuthors(db.forumPosts));
});

app.post("/api/forum/posts", authenticateToken, forumPostLimiter, (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and Content are required to post." });
  }

  const newPost = {
    id: "post_" + Date.now(),
    authorId: req.user.id,
    authorName: req.user.username,
    authorHandle: req.user.handle,
    authorAvatarUrl: req.user.avatarUrl,
    title,
    content,
    category: category || "general",
    likes: [],
    commentsCount: 0,
    createdAt: new Date().toISOString()
  };

  db.forumPosts.unshift(newPost);
  saveDatabase();
  res.json(newPost);
});

app.post("/api/forum/posts/:id/like", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "User identity required to like." });

  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found." });

  const index = post.likes.indexOf(userId);
  if (index === -1) {
    post.likes.push(userId);
  } else {
    post.likes.splice(index, 1);
  }

  saveDatabase();
  res.json(post);
});

app.get("/api/forum/posts/:id/comments", (req, res) => {
  const postComments = db.forumComments.filter(c => c.postId === req.params.id);
  res.json(hydrateAuthors(postComments));
});

app.post("/api/forum/posts/:id/comments", authenticateToken, forumCommentLimiter, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Comment content is required." });

  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found." });

  const newComment = {
    id: "c_" + Date.now(),
    postId: req.params.id,
    authorId: req.user.id,
    authorName: req.user.username,
    authorHandle: req.user.handle,
    authorAvatarUrl: req.user.avatarUrl,
    content,
    createdAt: new Date().toISOString()
  };

  db.forumComments.push(newComment);
  
  // Inc comments count
  post.commentsCount = (post.commentsCount || 0) + 1;
  
  saveDatabase();
  res.json(newComment);
});

app.delete("/api/forum/posts/:id", requireAdmin, (req, res) => {
  db.forumPosts = db.forumPosts.filter(p => p.id !== req.params.id);
  db.forumComments = db.forumComments.filter(c => c.postId !== req.params.id);
  saveDatabase();
  res.json({ success: true });
});

// --- FAN ART ---
app.get("/api/fanart", (req, res) => {
  res.json(db.fanArt);
});

app.post("/api/fanart", authenticateToken, fanArtUploadLimiter, (req, res) => {
  const { title, description, url, base64 } = req.body;
  if (!title || (!url && !base64)) {
    return res.status(400).json({ error: "Title and/or Art Image Content is required." });
  }

  if (base64) {
    const matches = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (!matches) {
       return res.status(400).json({ error: "Invalid image format. Base64 encoded data URI expected." });
    }
    const mimeType = matches[1];
    const dataString = matches[2];

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimeTypes.includes(mimeType)) {
       return res.status(400).json({ error: "Only JPEG, PNG, GIF, and WEBP images are permitted." });
    }

    // Rate-limit by exact byte-buffer size: MAX 2 MB
    const buffer = Buffer.from(dataString, "base64");
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (buffer.length > maxSize) {
       return res.status(400).json({ error: "Uploaded artwork exceeds 2MB maximum limit." });
    }
  }

  const isUploaded = !!base64;
  const targetUrl = base64 || url;

  const newArt = {
    id: "art_" + Date.now(),
    title,
    description: description || "No explanation provided.",
    url: targetUrl,
    isUploaded,
    authorId: req.user.id,
    authorName: req.user.username,
    authorHandle: req.user.handle,
    likes: [],
    createdAt: new Date().toISOString(),
    status: "approved" // Instant approval for instant gratification, admin can moderate.
  };

  db.fanArt.unshift(newArt);
  saveDatabase();
  res.json(newArt);
});

app.post("/api/fanart/:id/like", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const art = db.fanArt.find(a => a.id === req.params.id);
  if (!art) return res.status(404).json({ error: "Art piece not found." });

  const index = art.likes.indexOf(userId);
  if (index === -1) {
    art.likes.push(userId);
  } else {
    art.likes.splice(index, 1);
  }

  saveDatabase();
  res.json(art);
});

app.delete("/api/fanart/:id", requireAdmin, (req, res) => {
  db.fanArt = db.fanArt.filter(art => art.id !== req.params.id);
  saveDatabase();
  res.json({ success: true });
});

// --- CHAT & DIRECT MESSAGING (GEMINI POWERED) ---
app.get("/api/chat", authenticateToken, (req, res) => {
  const { recipientId } = req.query;

  if (recipientId !== undefined) {
    // Prevent privacy leak (vulnerability fix 5): non-admins can ONLY retrieve their own direct messages
    let targetUserId = recipientId as string;
    if (req.user.role !== "admin") {
      targetUserId = req.user.id;
    }
    
    const privates = db.chatMessages.filter(
      msg => 
        (msg.recipientId === "admin" && msg.authorId === targetUserId) ||
        (msg.recipientId === targetUserId && msg.authorId === "admin")
    );
    return res.json(hydrateAuthors(privates));
  }

  // Return public chat room
  const publicRoom = db.chatMessages.filter(msg => msg.recipientId === null);
  res.json(hydrateAuthors(publicRoom));
});

app.post("/api/chat", authenticateToken, chatMessageLimiter, async (req, res) => {
  const { content, recipientId } = req.body;
  
  if (!content) return res.status(400).json({ error: "Message text stands mandatory." });

  const newMessage = {
    id: "msg_" + Date.now(),
    authorId: req.user.id,
    authorName: req.user.username,
    authorAvatarUrl: req.user.avatarUrl,
    authorRole: req.user.role,
    content,
    createdAt: new Date().toISOString(),
    recipientId: recipientId || null
  };

  db.chatMessages.push(newMessage);
  saveDatabase();

  // If this was a direct message to "admin" (Zen Z Aura), trigger the AI response in background!
  if (recipientId === "admin" && req.user.id !== "admin") {
    respondAsZenZAura(req.user.id, req.user.username, content);
  }

  res.json(newMessage);
});

// Trigger Gemini Response or Simulated Wisdom Guide if no API Key is active
async function respondAsZenZAura(user_id: string, user_name: string, messageContent: string) {
  const brandName = db.brandConfig?.brandName || "Zen Z Aura";
  const brandHandle = db.brandConfig?.brandHandle || "zenzauramind";
  const avatarUrl = db.brandConfig?.adminAvatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80";

  let aiResText = "";

  if (ai) {
    try {
      const prompt = `You are ${brandName}, a highly popular educational and commentary YouTube content creator. Your handle is @${brandHandle}.
Your long-form videos fall into a mindful, self-improvement, future trends, and intriguing mysteries niche (e.g., "Silence in a Noisy World", "AI Job Survival 2030", "Dyatlov Pass Mystery").
Your Shorts focus heavily on Stoic wisdom, emotional resilience, time discipline, and the "Sigma shift" (e.g., "Become The Storm", "Notice The Shift").
You are answering a direct message from a fan named "${user_name}" who says: "${messageContent}".

Keep your reply:
1. Short, concise, punchy and extremely helpful (maximum 3-4 sentences).
2. Deeply empathetic yet highly stoic, encouraging, and inspirational.
3. Aligned with your core philosophies: control how you react, secure your silent thoughts, work in quiet environments, and build emotional armor.
4. Sign off affectionately yet strongly as @${brandHandle} or Zen.
Do not use markdown lists; just write a professional, natural spoken reply.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      aiResText = response.text || "I am reflecting on your thought, my friend. True wisdom emerges from quiet reflection.";
    } catch (e) {
      console.error("Gemini failed, fallback to Stoic manual template generator:", e);
      aiResText = generateFallbackStoicResponse(user_name, messageContent);
    }
  } else {
    aiResText = generateFallbackStoicResponse(user_name, messageContent);
  }

  // Artificial dynamic delay for realism
  setTimeout(() => {
    const aiMessage = {
      id: "msg_ai_" + Date.now(),
      authorId: "admin",
      authorName: brandName,
      authorAvatarUrl: avatarUrl,
      authorRole: "admin" as const,
      content: aiResText,
      createdAt: new Date().toISOString(),
      recipientId: user_id
    };

    db.chatMessages.push(aiMessage);
    saveDatabase();
  }, 1800);
}

function generateFallbackStoicResponse(name: string, question: string): string {
  const brandHandle = db.brandConfig?.brandHandle || "zenzauramind";
  const templates = [
    `Greetings, ${name}. I read your thought. In an era saturated with distracting news, your focus is your absolute core currency. Control your attention and guard your silence. Start by taking 30 minutes of intentional stillness today. Stay disciplined. @${brandHandle}`,
    `A powerful inquiry, ${name}. Remember, you cannot govern external events—only your inner citadel. When you cease fighting the storm and instead become the storm, your mindset shifts. Carry this armor with you today. — Zen`,
    `Notice the shift, ${name}. Most people look for immediate answers on the outside. But real growth is quiet and steady. Keep working in silent intervals and let your results speak for you. Stand strong. @${brandHandle}`,
    `An excellent point. In our upcoming guide on Stoic anxiety defenses, we discuss this exact challenge. Do not let minor noise distract from your massive trends. Keep building your shields. — Zen`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// Spark Gemini prompt for outline generation (special creative additions for the creator)
app.post("/api/gemini/outline", requireAdmin, async (req, res) => {
  const { topic, duration } = req.body;

  if (!ai) {
    return res.json({
      outline: `### PROPOSAL SKETCH: ${topic || "The Path of Silence"}
**Duration estimate**: ${duration || "15"} minutes
*Note: Connect Gemini API Key to unlock deep analytical scripts and video layout structures!*

#### 1. Hook (Duration 0:00 - 1:30)
- Highlight the modern sensory overload.
- Anchor with key quote: "The quieter you become, the more you are able to hear."

#### 2. Deep Dive Analysis (Duration 1:30 - 8:00)
- Explain the psychology of silence intervals during chaotic workdays.
- Contrast current high-energy sigma trends with true historical stoic practitioners.

#### 3. Growth Blueprint (Duration 8:00 - 12:00)
- Actionable steps: digital dopamine fasting, morning strategic planning, and setting hard communication rules.

#### 4. Outro & Community Pivot (Duration 12:00 - 15:00)
- Guide fans to discuss answers in the official Zen Z Aura category forum!`
    });
  }

  try {
    const prompt = `Define a highly professional and punchy YouTube Video script Outline for channel "Zen Z Aura" (@zenzauramind).
Topic target: "${topic || "Sustaining Stoic Calm in 2026 AI Era"}".
Target Video Duration: ${duration || "15"} minutes.
Format must include:
1. Dynamic structural Hook & cinematic visuals advice.
2. Step-by-step educational analysis of subject (citing historical Stoic techniques or current future trend analytics).
3. Highly engaging outro where you guide viewers back to the 'Community Forum space' to share progress.
Highlight where to place punchy edits and overlay titles like 'Become The Storm'. Keep it clean and readable in markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ outline: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- GOOGLE SEARCH CONSOLE & PUBLIC CRAWLER ALIGNMENTS ---
app.get("/googlebf56e5ea61946ac3.html", (req, res) => {
  res.type("text/html");
  res.send("google-site-verification: googlebf56e5ea61946ac3.html");
});

app.get(["/ads.txt", "/Ads.txt"], (req, res) => {
  res.type("text/plain");
  res.send("google.com, pub-3756066592621034, DIRECT, f08c47fec0942fa0");
});

app.get("/robots.txt", (req, res) => {
  const host = req.get("host") || "localhost:3000";
  const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Sitemap: ${protocol}://${host}/sitemap.xml
`);
});

app.get("/sitemap.xml", (req, res) => {
  const host = req.get("host") || "localhost:3000";
  const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;
  
  const videoUrls = (db.videos || []).map((v: any) => {
    return `  <url>
    <loc>${baseUrl}/?video=${v.id || v.ytId}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  const forumUrls = (db.forumPosts || []).map((p: any) => {
    return `  <url>
    <loc>${baseUrl}/?post=${p.id}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${videoUrls.join("\n")}
${forumUrls.join("\n")}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xmlContent.trim());
});

// --- VITE DEV AND DEPLOY MIDDLEWARES ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully operational on http://localhost:${PORT}`);
  });
}

startServer();
