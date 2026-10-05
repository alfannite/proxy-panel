"use client";

import { useState } from "react";
import { UserPlus, Loader2, ShieldCheck, Globe } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SetupAdminPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan setup");
      }

      setSuccess(true);
      // Tunggu 2 detik, lalu lempar ke login
      setTimeout(() => {
        router.push("/masukpanel");
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Latar Belakang Hangat */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-300/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Kontainer Setup */}
      <div className="w-full max-w-[480px] bg-neutral-0 border border-neutral-200 rounded-2xl p-8 md:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-primary-50 border border-primary-100 flex items-center justify-center mb-6 text-primary-500 shadow-sm">
            <ShieldCheck className="w-7 h-7 currentColor" />
          </div>
          <h1 className="text-3xl font-serif text-neutral-900 mb-3 text-center">
            System Initialization
          </h1>
          <p className="text-neutral-600 text-[14px] text-center px-4 leading-relaxed">
            Welcome to ProxyPanel. Set up your master administrator account to secure the engine.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-accent-rust/10 border border-accent-rust/20 text-accent-rust text-[13px] font-medium text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center p-6 bg-accent-sage/10 border border-accent-sage/20 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-accent-sage/20 flex items-center justify-center mb-4 text-accent-sage">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-neutral-900 font-bold mb-2">Setup Successful!</h3>
            <p className="text-neutral-600 text-[13px] text-center">
              Your admin account has been created. Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSetup} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-neutral-600 uppercase tracking-[0.1em]">Admin Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all duration-200 text-neutral-900 placeholder-neutral-400"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-neutral-600 uppercase tracking-[0.1em]">Master Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all duration-200 text-neutral-900 placeholder-neutral-400"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-2 mt-8 h-14 text-[15px] tracking-wide"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initialize Panel"}
            </button>
          </form>
        )}
        
        <div className="mt-10 text-center pt-8 border-t border-neutral-200">
          <p className="text-[12px] font-medium text-neutral-400 tracking-wide flex items-center justify-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            ProxyPanel | FanOps &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>

    </div>
  );
}
