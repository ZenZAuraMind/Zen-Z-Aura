import React, { useState } from "react";
import { Lock, User, CheckCircle, Mail, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as UserType } from "../types";

interface AuthModalProps {
  onSuccess: (user: UserType, token: string) => void;
  onClose?: () => void;
}

export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username) {
      setError("Please input a username.");
      return;
    }

    if (!isLogin && !email) {
      setError("Please input an email address.");
      return;
    }

    if (isLogin) {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccess(`Logged in as ${data.user.username}`);
          setTimeout(() => {
            onSuccess(data.user, data.token);
          }, 1000);
        } else {
          setError(data.error || "Login fail. Check username & password.");
        }
      } catch (err) {
        setError("Network error connecting to Hub service.");
      }
    } else {
      if (!password) {
        setError("Please specify a password.");
        return;
      }
      if (password.length < 6) {
        setError("Password should be at least 6 characters.");
        return;
      }
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, handle, email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccess("Account established in the Oasis!");
          setTimeout(() => {
            onSuccess(data.user, data.token);
          }, 1000);
        } else {
          setError(data.error || "Registration issue occurred.");
        }
      } catch (err) {
        setError("Cannot contact server database.");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
      className="bg-neutral-900 border border-neutral-800/80 p-7 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden backdrop-blur-xl"
    >
      {/* Dynamic Animated Ambient Glow Header Strip */}
      <motion.div 
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ backgroundSize: "200% 200%" }}
        className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-700" 
      />
      
      <div className="text-center mb-6">
        <h3 className="text-2xl font-black font-sans tracking-tight text-white flex items-center justify-center gap-2">
          {isLogin ? "Enter the Oasis" : "Cultivate Profile"}
        </h3>
        <p className="text-neutral-400 text-sm mt-1 w-11/12 mx-auto">
          {isLogin 
            ? "Sync with the Zen Z Aura mindset group." 
            : "Establish your custom profile to share and message."}
        </p>
      </div>

      {/* Sliding Tab Header */}
      <div className="flex bg-neutral-950 p-1.5 rounded-xl border border-neutral-850 mb-5 relative">
        <button
          type="button"
          onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
          className={`flex-1 py-2 text-center font-mono text-xs font-semibold z-10 transition-colors uppercase tracking-wider cursor-pointer ${
            isLogin ? "text-amber-500" : "text-neutral-400 hover:text-white"
          }`}
        >
          {isLogin && (
            <motion.div
              layoutId="modal-active-tab"
              className="absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] bg-neutral-900 border border-neutral-800/80 rounded-lg -z-0"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
          className={`flex-1 py-2 text-center font-mono text-xs font-semibold z-10 transition-colors uppercase tracking-wider cursor-pointer ${
            !isLogin ? "text-amber-500" : "text-neutral-400 hover:text-white"
          }`}
        >
          {!isLogin && (
            <motion.div
              layoutId="modal-active-tab"
              className="absolute inset-y-1.5 right-1.5 w-[calc(50%-6px)] bg-neutral-900 border border-neutral-800/80 rounded-lg -z-0"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
          Register
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-950/40 border border-red-900/50 text-red-200 text-xs p-3 rounded-lg mb-4 text-center overflow-hidden"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 text-xs p-3 rounded-lg mb-4 text-center flex items-center justify-center gap-2 overflow-hidden"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="signin"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
                  Username / Channel Name
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="text"
                    value={username || ""}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Zen Stoic"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-mono text-neutral-400 uppercase tracking-widest">
                    Password
                  </label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="password"
                    value={password || ""}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1.5 font-mono">
                  Please enter your profile password to sync.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
                  Username / Channel Name
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="text"
                    value={username || ""}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Zen Stoic"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="email"
                    value={email || ""}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="password"
                    value={password || ""}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1.5 font-mono">
                  Minimum 6 characters. Remember this to log in later.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
                  Stoic Handle (optional)
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-3 text-neutral-500 font-mono text-sm group-focus-within:text-amber-500 transition-colors">@</span>
                  <input
                    type="text"
                    value={handle || ""}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="stoic_seeker"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-9 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-amber-500 hover:bg-amber-400 py-3 rounded-xl text-black font-semibold text-sm transition-colors mt-4 cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          {isLogin ? "Gain Access" : "Join the Cultivation Hub"}
        </motion.button>
      </form>

      <div className="mt-6 pt-4 border-t border-neutral-800/80 text-center space-y-3">
        <p className="text-xs text-neutral-400">
          {isLogin ? "New to the mindset hub?" : "Already experienced?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
            className="text-amber-500 hover:underline hover:text-amber-400 font-medium ml-1 bg-none border-none p-0 cursor-pointer"
          >
            {isLogin ? "Sign up here" : "Sign in here"}
          </button>
        </p>
      </div>
    </motion.div>
  );
}
