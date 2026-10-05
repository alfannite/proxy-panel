"use client";

import { useState, useEffect } from "react";
import { 
  Shield, Key, Save, ArrowLeft, Loader2, Cloud, User, Lock, Info, CheckCircle2, Link, Zap, Eye, EyeOff
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("cloudflare");
  const [message, setMessage] = useState({ text: "", type: "" });

  // Form Cloudflare
  const [cfEmail, setCfEmail] = useState("");
  const [cfToken, setCfToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [previewPassword, setPreviewPassword] = useState("");
  const [revealedCreds, setRevealedCreds] = useState<{email: string, token: string} | null>(null);

  // Form Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  // Clear security state when leaving tab to ensure it's secure if someone hits back
  useEffect(() => {
    if (activeTab !== "security") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowToken(false);
      if (message.text.includes("Password")) setMessage({ text: "", type: "" });
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/cloudflare/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) // Empty body tests the currently saved credentials
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(data.data);
      } else {
        setTestResult(null);
      }
    } catch (e) {
      console.error(e);
      setTestResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCloudflare = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const resEmail = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "CF_EMAIL", value: cfEmail }),
      });
      const dataEmail = await resEmail.json();
      if (!resEmail.ok) throw new Error(dataEmail.error || "Failed");
      
      const resToken = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "CF_API_TOKEN", value: cfToken }),
      });
      const dataToken = await resToken.json();
      if (!resToken.ok) throw new Error(dataToken.error || "Failed");

      if (dataEmail.warning || dataToken.warning) {
        setMessage({ text: `Credentials saved securely! Note: ${dataEmail.warning || dataToken.warning}`, type: "success" });
      } else {
        setMessage({ text: "Credential saved successfully", type: "success" });
      }
      setCfEmail("");
      setCfToken("");
      // Refresh the test result to show the new connected status
      await fetchSettings();
    } catch (err) {
      setMessage({ text: "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleClearConnection = async () => {
    if (!confirm("Are you sure you want to clear Cloudflare credentials? This will restart the proxy.")) return;
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await fetch("/api/cloudflare/clear", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: "Connection cleared successfully. Traefik is restarting.", type: "success" });
        setTestResult(null);
        setCfEmail("");
        setCfToken("");
      } else {
        throw new Error(data.error || "Failed");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to clear connection", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/cloudflare/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: previewPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevealedCreds({ email: data.data.email, token: data.data.token });
      } else {
        alert(data.error || "Invalid password");
      }
    } catch (err) {
      alert("Error verifying password");
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/cloudflare/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cfEmail, token: cfToken }),
      });
      const data = await res.json();
      
      if (data.success) {
        setTestResult(data.data);
        setMessage({ text: "Connection successful! Cloudflare account verified.", type: "success" });
      } else {
        setTestResult(null);
        setMessage({ text: data.error || "Connection failed", type: "error" });
      }
    } catch (err: any) {
      setTestResult(null);
      setMessage({ text: err.message || "Network error during test", type: "error" });
    } finally {
      setTesting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/auth/password", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }) 
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }
      
      setMessage({ text: "Password changed successfully. Logging out for security...", type: "success" });
      
      // Hit logout endpoint to clear cookie
      await fetch("/api/auth/logout", { method: "POST" });
      
      setTimeout(() => {
        router.push("/masukpanel");
      }, 1500);

    } catch (err: any) {
      setMessage({ text: err.message || "Failed to change password.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-base font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="mb-12">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-text-muted hover:text-primary-500 transition-colors font-medium mb-8 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Dashboard
          </button>

          <h1 className="text-3xl font-serif text-text-main mb-2">Profile & Security</h1>
          <p className="text-text-muted">Manage your administrator account and integration keys.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar Tabs */}
          <nav className="w-full md:w-64 flex flex-col gap-2 shrink-0" aria-label="Profile navigation">
            <button 
              onClick={() => { setActiveTab("cloudflare"); setMessage({ text: "", type: "" }); }}
              aria-current={activeTab === "cloudflare" ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                activeTab === "cloudflare" 
                ? "bg-primary-500/10 text-primary-500 border border-primary-500/20 shadow-sm" 
                : "text-text-muted hover:bg-surface-hover border border-transparent"
              }`}
            >
              <Cloud className="w-5 h-5" aria-hidden="true" /> Cloudflare API
            </button>
            <button 
              onClick={() => { setActiveTab("security"); setMessage({ text: "", type: "" }); }}
              aria-current={activeTab === "security" ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                activeTab === "security" 
                ? "bg-primary-500/10 text-primary-500 border border-primary-500/20 shadow-sm" 
                : "text-text-muted hover:bg-surface-hover border border-transparent"
              }`}
            >
              <Shield className="w-5 h-5" aria-hidden="true" /> Account Security
            </button>
            <button 
              onClick={() => { setActiveTab("appearance"); setMessage({ text: "", type: "" }); }}
              aria-current={activeTab === "appearance" ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                activeTab === "appearance" 
                ? "bg-primary-500/10 text-primary-500 border border-primary-500/20 shadow-sm" 
                : "text-text-muted hover:bg-surface-hover border border-transparent"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              Appearance
            </button>
          </nav>

          {/* Main Content Area */}
          <section className="flex-1 solid-panel p-8 overflow-hidden relative shadow-lg" aria-live="polite">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" aria-label="Loading content..." />
              </div>
            ) : activeTab === "cloudflare" ? (
              
              // Cloudflare Tab
              <article className="animate-in fade-in slide-in-from-top-8 duration-500 fill-mode-forwards">
                <header className="flex items-center gap-4 mb-8 border-b border-border-base pb-6">
                  <div className="w-12 h-12 rounded-xl bg-bg-base border border-border-base flex items-center justify-center">
                    <Cloud className="w-6 h-6 text-primary-500" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif text-text-main">Cloudflare Integration</h2>
                    <p className="text-[13px] text-text-muted mt-1">Required for automated DNS A-Record creation.</p>
                  </div>
                </header>

                {message.text && (
                  <div role="alert" className={`mb-6 p-4 rounded-xl text-[13px] font-medium border ${
                    message.type === "success" 
                    ? "bg-accent-sage/10 text-accent-sage border-accent-sage/20" 
                    : message.type === "warning"
                    ? "bg-primary-500/10 text-primary-500 border-primary-500/20"
                    : "bg-accent-rust/10 text-accent-rust border-accent-rust/20"
                  }`}>
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSaveCloudflare} className="space-y-6">
                  <div>
                    <label htmlFor="cfEmail" className="flex items-center gap-2 text-[13px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2">
                      Cloudflare Account Email
                    </label>
                    <input 
                      id="cfEmail"
                      type="email" 
                      value={cfEmail}
                      onChange={(e) => setCfEmail(e.target.value)}
                      placeholder="admin@domain.com"
                      className="input-field w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="cfToken" className="flex items-center gap-2 text-[13px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2">
                      Global API Key
                      <div className="relative group">
                        <button type="button" className="focus:outline-none" aria-label="More information about API Key">
                          <Info className="w-4 h-4 cursor-help text-primary-500 hover:text-primary-600 transition-colors" />
                        </button>
                        
                        {/* Popup Penjelasan Token Cloudflare */}
                        <div role="tooltip" className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-80 bg-surface-base border border-border-base text-text-main text-[12px] p-4 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 normal-case tracking-normal font-normal">
                          <h4 className="font-bold text-primary-500 mb-2 border-b border-border-base pb-2 flex items-center gap-2">
                            <Info className="w-4 h-4" /> Cara Mendapatkan API Token
                          </h4>
                          <p className="text-text-muted mb-2">1. Login ke akun Cloudflare.</p>
                          <p className="text-text-muted mb-2">2. Buka Profil Saya &gt; API Tokens.</p>
                          <p className="text-text-muted mb-2">3. Buat Custom Token dengan izin:</p>
                          <ul className="list-disc pl-5 mb-2 text-primary-600 font-medium space-y-1">
                            <li>Zone &gt; DNS &gt; Edit</li>
                            <li>Zone &gt; Zone &gt; Read</li>
                          </ul>
                          <p className="text-text-muted text-[11px] bg-primary-500/10 p-2 rounded">
                            *Dengan izin ini, Panel bisa mengelola subdomain untuk semua domain di akun Anda secara otomatis.
                          </p>
                        </div>
                      </div>
                    </label>
                    <div className="relative">
                      <input 
                        id="cfToken"
                        type={showToken ? "text" : "password"} 
                        value={cfToken}
                        onChange={(e) => setCfToken(e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="input-field font-mono w-full pr-12"
                        autoComplete="new-password"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary-500 focus:outline-none p-1 rounded-md"
                        aria-label={showToken ? "Hide API Token" : "Show API Token"}
                      >
                        {showToken ? (
                          <EyeOff className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          <Eye className="w-5 h-5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col md:flex-row flex-wrap gap-3">
                    <button 
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="btn-secondary w-full md:w-auto"
                    >
                      {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-4 h-4" /> Test Connection</>}
                    </button>
                    <button 
                      type="submit" 
                      disabled={saving || !cfToken}
                      className="btn-primary w-full md:w-auto"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Credentials</>}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="btn-secondary w-full md:w-auto text-primary-500 hover:border-primary-500 hover:text-primary-600"
                    >
                      <Eye className="w-4 h-4" /> Preview Token
                    </button>
                    <button 
                      type="button"
                      onClick={handleClearConnection}
                      disabled={saving}
                      className="btn-secondary w-full md:w-auto text-accent-rust hover:border-accent-rust hover:text-accent-rust"
                    >
                      Clear Connection
                    </button>
                  </div>

                  {/* Test Result Card */}
                  <div className={`mt-6 p-5 rounded-xl border ${testResult ? 'bg-accent-sage/5 border-accent-sage/20' : 'bg-accent-rust/5 border-accent-rust/20'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Link className={`w-4 h-4 ${testResult ? 'text-accent-sage' : 'text-accent-rust'}`} />
                      <span className={`text-[13px] font-bold uppercase tracking-wider ${testResult ? 'text-accent-sage' : 'text-accent-rust'}`}>
                        {testResult ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Account Email</span>
                        <span className={`font-medium ${testResult ? 'text-text-main' : 'text-text-muted'}`}>{testResult ? testResult.email : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Account Name</span>
                        <span className={`font-medium ${testResult ? 'text-text-main' : 'text-text-muted'}`}>{testResult ? testResult.name : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Auth Method</span>
                        <span className={`font-medium ${testResult ? 'text-primary-500' : 'text-text-muted'}`}>{testResult ? testResult.authMethod : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Total Domains</span>
                        <span className={`font-bold ${testResult ? 'text-text-main' : 'text-text-muted'}`}>{testResult ? testResult.totalZones : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </form>
              </article>

            ) : activeTab === "security" ? (

              // Security Tab
              <article className="animate-in fade-in slide-in-from-top-8 duration-500 fill-mode-forwards">
                <header className="flex items-center gap-4 mb-8 border-b border-border-base pb-6">
                  <div className="w-12 h-12 rounded-xl bg-bg-base border border-border-base flex items-center justify-center">
                    <Lock className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif text-text-main">Change Password</h2>
                    <p className="text-[13px] text-text-muted mt-1">Update your master administrator password.</p>
                  </div>
                </header>

                {message.text && (
                  <div className={`mb-6 p-4 rounded-xl text-[13px] font-medium border flex items-center gap-3 ${
                    message.type === "success" 
                    ? "bg-accent-sage/10 text-accent-sage border-accent-sage/20" 
                    : "bg-accent-rust/10 text-accent-rust border-accent-rust/20"
                  }`}>
                    {message.type === "success" && <CheckCircle2 className="w-4 h-4" />}
                    {message.text}
                  </div>
                )}

                <div className="p-6 bg-surface-hover border border-border-base rounded-xl mb-6 flex items-center gap-4">
                  <User className="w-10 h-10 text-text-muted p-2 bg-bg-base rounded-lg border border-border-base" />
                  <div>
                    <p className="text-text-main font-medium">Administrator</p>
                    <p className="text-[12px] text-text-muted">Role: ADMIN</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <label className="text-[13px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2 block">Current Password</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="input-field"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[13px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2 block">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="input-field"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="text-[13px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2 block">Confirm Password</label>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="input-field"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button type="submit" disabled={saving} className="btn-primary w-full md:w-auto">
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Key className="w-4 h-4" /> Update Password</>}
                    </button>
                  </div>
                </form>
              </article>

            ) : (

              // Appearance Tab
              <article className="animate-in fade-in slide-in-from-top-8 duration-500 fill-mode-forwards">
                <header className="flex items-center gap-4 mb-8 border-b border-border-base pb-6">
                  <div className="w-12 h-12 rounded-xl bg-bg-base border border-border-base flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-serif text-text-main">Appearance Settings</h2>
                    <p className="text-[13px] text-text-muted mt-1">Customize the look and feel of your panel.</p>
                  </div>
                </header>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-[14px] font-bold text-text-main mb-4">Theme Preference</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Light Mode Button */}
                      <button 
                        onClick={() => document.documentElement.classList.remove('dark')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-border-base hover:border-primary-500/50 bg-white transition-all text-[#1E1B18]"
                        aria-label="Enable Light Mode"
                      >
                        <div className="w-full h-24 bg-[#FAF8F6] border border-[#E8E3DD] rounded-lg p-2 flex flex-col gap-2 shadow-inner" aria-hidden="true">
                           <div className="w-1/2 h-2 bg-[#E8E3DD] rounded"></div>
                           <div className="w-full h-8 bg-white border border-[#E8E3DD] rounded"></div>
                           <div className="w-3/4 h-8 bg-white border border-[#E8E3DD] rounded"></div>
                        </div>
                        <span className="font-medium">Light Mode (Dove Warm)</span>
                      </button>

                      {/* Dark Mode Button */}
                      <button 
                        onClick={() => document.documentElement.classList.add('dark')}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-border-base hover:border-primary-500/50 bg-[#262320] transition-all text-[#F2EDE6]"
                        aria-label="Enable Dark Mode"
                      >
                        <div className="w-full h-24 bg-[#1C1A17] border border-[#3D3833] rounded-lg p-2 flex flex-col gap-2 shadow-inner" aria-hidden="true">
                           <div className="w-1/2 h-2 bg-[#3D3833] rounded"></div>
                           <div className="w-full h-8 bg-[#262320] border border-[#3D3833] rounded"></div>
                           <div className="w-3/4 h-8 bg-[#262320] border border-[#3D3833] rounded"></div>
                        </div>
                        <span className="font-medium">Dark Mode (Midnight)</span>
                      </button>

                    </div>
                  </div>
                </div>
              </article>

            )}
          </section>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={() => { setShowPasswordModal(false); setRevealedCreds(null); setPreviewPassword(""); }} />
          <div className="solid-panel relative w-full max-w-sm p-6 shadow-2xl transform transition-all z-10">
            <h3 className="text-lg font-serif text-text-main mb-4 border-b border-border-base pb-3">Admin Verification</h3>
            
            {revealedCreds ? (
              <div>
                <p className="text-[13px] text-text-muted mb-4">Credentials revealed securely. Close this window to hide them.</p>
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Email</label>
                    <div className="p-2 bg-bg-base border border-border-base rounded text-[13px] font-mono text-text-main break-all select-all">
                      {revealedCreds.email || "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">API Token</label>
                    <div className="p-2 bg-bg-base border border-border-base rounded text-[13px] font-mono text-text-main break-all select-all">
                      {revealedCreds.token || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => { setShowPasswordModal(false); setRevealedCreds(null); setPreviewPassword(""); }} className="btn-secondary text-[13px] py-1.5 px-3">Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePreviewSubmit}>
                <p className="text-[13px] text-text-muted mb-4">Enter your admin password to view saved credentials.</p>
                <input
                  type="password"
                  value={previewPassword}
                  onChange={(e) => setPreviewPassword(e.target.value)}
                  placeholder="Password"
                  className="input-field w-full mb-4"
                  autoFocus
                  required
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => { setShowPasswordModal(false); setPreviewPassword(""); }} className="btn-secondary text-[13px] py-1.5 px-3">Cancel</button>
                  <button type="submit" className="btn-primary text-[13px] py-1.5 px-3">Verify</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
