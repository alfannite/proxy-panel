"use client";

import { useState, useEffect } from "react";
import { LogIn, Loader2, Globe, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/login")
      .then(res => res.json())
      .then(data => {
        if (data.isSetupNeeded) setIsSetupMode(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSetupMode) {
        const setupRes = await fetch("/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const setupData = await setupRes.json();
        if (!setupRes.ok) throw new Error(setupData.error || "Setup gagal");
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login gagal");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col md:flex-row overflow-hidden font-sans relative">
      
      {/* KIRI: Hologram Globe & Background Texture */}
      <div className="absolute inset-0 md:relative md:flex-1 flex items-center justify-center overflow-hidden z-0">
        
        {/* Logo "Classic Luxury Paper" di Kiri Atas -> Background Dihapus Sesuai Permintaan */}
        <div className="absolute top-10 left-10 z-50 flex items-center gap-3">
          {/* Icon Globe tanpa background blok */}
          <div className="w-8 h-8 flex items-center justify-center">
            <Globe className="w-7 h-7 text-primary-500 opacity-90 drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-widest uppercase text-text-main drop-shadow-md" style={{ letterSpacing: '0.15em' }}>
            ProxyPanel
          </h1>
        </div>

        {/* Texture */}
        <div 
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-700/20 rounded-full blur-[120px] opacity-60 mix-blend-screen" />

        <div className="relative z-10 flex items-center justify-center animate-[spin_60s_linear_infinite] ml-[-15vw]">
          <div className="absolute w-[450px] h-[450px] rounded-full border border-primary-500/20" />
          <div className="absolute w-[450px] h-[450px] rounded-full border border-primary-500/10 rotate-45 scale-y-50" />
          <div className="absolute w-[450px] h-[450px] rounded-full border border-primary-500/10 -rotate-45 scale-y-50" />
          <div className="absolute w-[450px] h-[450px] rounded-full border border-primary-500/10 scale-x-50" />
          
          <Globe className="w-[300px] h-[300px] text-primary-500/30 drop-shadow-[0_0_15px_rgba(139,92,246,0.4)]" strokeWidth={0.5} />
          
          <div className="absolute top-[20%] left-[30%] w-1.5 h-1.5 rounded-full bg-primary-100 animate-pulse drop-shadow-[0_0_5px_#E2D4F8]" style={{ animationDuration: '3s' }} />
          <div className="absolute top-[60%] right-[25%] w-1.5 h-1.5 rounded-full bg-primary-300 animate-pulse drop-shadow-[0_0_5px_#C4B5FD]" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[30%] left-[40%] w-2 h-2 rounded-full bg-primary-500 animate-pulse drop-shadow-[0_0_5px_#8B5CF6]" style={{ animationDuration: '2.5s' }} />
        </div>
      </div>

      {/* KANAN: Form Login dengan Efek Kertas Super Miring (Blurred Glass) */}
      <div className="w-full md:w-[550px] lg:w-[650px] bg-surface-base/80 backdrop-blur-md flex items-center justify-center p-8 lg:p-12 z-20 relative shadow-[-30px_0_60px_rgba(0,0,0,0.8)]">
        
        {/* Dekorasi Potongan Kertas Super Miring yang Menonjol Keluar (Blurred Glass Tipis) */}
        {/* Segitiga besar dari atas kanan menyudut tajam ke bawah kiri */}
        <div 
          className="hidden md:block absolute top-0 bottom-0 left-[-200px] w-[201px] bg-surface-base/80 backdrop-blur-md z-[-1]" 
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} 
        />
        {/* Fake Shadow untuk ngasih kesan 3D menonjol */}
        <div 
          className="hidden md:block absolute top-0 bottom-0 left-[-220px] w-[220px] bg-black/40 blur-[20px] z-[-2]" 
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} 
        />
        {/* Garis Aksen tipis biar batas blur-nya tetap terlihat tegas */}
        <div 
          className="hidden md:block absolute top-0 bottom-0 left-[-202px] w-[203px] bg-gradient-to-bl from-transparent via-white/5 to-transparent z-[-1] blur-[0.5px]" 
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%, 1px 100%, 100% 1px)' }} 
        />

        <div className="w-full max-w-[400px] bg-surface-base border border-border-base rounded-2xl p-8 md:p-10 shadow-2xl relative z-10 mx-auto md:ml-8 lg:ml-16">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-[20px] bg-surface-hover border border-border-base flex items-center justify-center shadow-inner mb-6 transition-transform duration-500 hover:scale-105 hover:rotate-3 text-primary-500">
              {isSetupMode ? <UserPlus className="w-7 h-7 currentColor" /> : <LogIn className="w-7 h-7 currentColor" />}
            </div>
            <h2 className="text-3xl font-serif text-text-main mb-3">
              {isSetupMode ? "Welcome to ProxyPanel" : "Authentication"}
            </h2>
            <p className="text-text-muted text-[14px] text-center px-4 leading-relaxed">
              {isSetupMode ? "Create your master administrator account to continue." : "Authorized access only. Enter your credentials to configure the engine."}
            </p>
          </div>

          {checking ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-accent-rust/10 border border-accent-rust/20 text-accent-rust text-[13px] font-medium text-center shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-text-muted uppercase tracking-[0.1em]">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="input-field shadow-inner"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-bold text-text-muted uppercase tracking-[0.1em]">Password</label>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-field shadow-inner"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full mt-8 h-14 text-[15px] tracking-wide"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSetupMode ? "Create Admin Account" : "Sign In")}
            </button>
          </form>
          </>
          )}
          
          <div className="mt-10 text-center pt-8 border-t border-border-base/50">
            <p className="text-[12px] font-medium text-text-muted tracking-wide">
              ProxyPanel | FanOps &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
