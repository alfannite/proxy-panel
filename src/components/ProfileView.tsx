"use client";

import { useState, useEffect } from "react";
import { 
  Shield, Key, Save, ArrowLeft, Loader2, Cloud, User, Lock, Info, CheckCircle2, Link, Zap, Eye, EyeOff
} from "lucide-react";
import { useRouter } from "next/navigation";

export function ProfileView({ onBack }: { onBack?: () => void }) {
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
    <div className="max-w-4xl w-full animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-serif text-text-main mb-2">Profile & Security</h2>
            <p className="text-text-muted text-[15px]">Manage your administrator account and integration keys.</p>
          </div>
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
          </nav>

          {/* Main Content Area */}
          <section className="flex-1 relative w-full" aria-live="polite">
            {loading ? (
              <div className="solid-panel p-8 flex justify-center items-center h-40 shadow-lg">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" aria-label="Loading content..." />
              </div>
            ) : activeTab === "cloudflare" ? (
              
              // Cloudflare Tab
              <article className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
                <div className="mb-6 flex flex-col gap-2">
                  <h2 className="text-2xl font-serif text-text-main flex items-center gap-3">
                    Cloudflare Integration
                  </h2>
                  <p className="text-[14px] text-text-muted">Manage API credentials for automated DNS provisioning.</p>
                </div>

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

                <div className="solid-panel shadow-sm">
                  <form onSubmit={handleSaveCloudflare} className="divide-y divide-border-base">
                    
                    {/* Test Result / Status Header */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4 bg-surface-hover/30 rounded-t-2xl">
                      <div className="md:w-1/3">
                        <h3 className="text-[14px] font-bold text-text-main">Connection Status</h3>
                        <p className="text-[13px] text-text-muted mt-1 pr-4">Current state of Cloudflare API link.</p>
                      </div>
                      <div className="md:w-2/3 md:pl-8">
                        <div className={`p-4 rounded-xl border ${testResult ? 'bg-accent-sage/5 border-accent-sage/20' : 'bg-surface-base border-border-base'}`}>
                           <div className="flex items-center gap-2">
                             <Link className={`w-4 h-4 ${testResult ? 'text-accent-sage' : 'text-text-muted'}`} />
                             <span className={`text-[13px] font-bold uppercase tracking-wider ${testResult ? 'text-accent-sage' : 'text-text-muted'}`}>
                               {testResult ? 'Connected' : 'Disconnected'}
                             </span>
                           </div>
                           {testResult && (
                             <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border-base/50">
                               <div>
                                 <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Domains Managed</p>
                                 <p className="text-[14px] font-bold text-text-main">{testResult.totalZones}</p>
                               </div>
                               <div className="overflow-hidden">
                                 <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Account User</p>
                                 <p className="text-[13px] font-medium text-text-main truncate" title={testResult.email}>{testResult.email}</p>
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* Email Row */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4">
                      <div className="md:w-1/3">
                        <label htmlFor="cfEmail" className="text-[14px] font-bold text-text-main block mb-1">Account Email</label>
                        <p className="text-[13px] text-text-muted leading-relaxed pr-4">The primary email address associated with your Cloudflare dashboard.</p>
                      </div>
                      <div className="md:w-2/3 md:pl-8">
                        <input 
                          id="cfEmail"
                          type="email" 
                          value={cfEmail}
                          onChange={(e) => setCfEmail(e.target.value)}
                          placeholder="admin@domain.com"
                          className="input-field w-full max-w-md"
                        />
                      </div>
                    </div>
                    
                    {/* API Token Row */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4">
                      <div className="md:w-1/3">
                        <label htmlFor="cfToken" className="text-[14px] font-bold text-text-main block mb-1 flex items-center gap-2">
                          Global API Key 
                          <div className="relative group inline-block">
                            <Info className="w-4 h-4 cursor-help text-primary-500" />
                            <div className="absolute left-0 bottom-full mb-2 w-64 md:w-72 bg-surface-base border border-border-base text-[12px] p-4 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 normal-case font-normal">
                              <h4 className="font-bold text-primary-500 mb-2 border-b border-border-base pb-2">API Token Setup</h4>
                              <p className="text-text-muted mb-2">Create a token with these permissions in Cloudflare:</p>
                              <ul className="list-disc pl-5 text-text-main space-y-1 mb-2">
                                <li>Zone &gt; DNS &gt; Edit</li>
                                <li>Zone &gt; Zone &gt; Read</li>
                              </ul>
                            </div>
                          </div>
                        </label>
                        <p className="text-[13px] text-text-muted leading-relaxed pr-4">Used to automatically manage DNS records when deploying proxies.</p>
                      </div>
                      <div className="md:w-2/3 md:pl-8 relative max-w-md">
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary-500 focus:outline-none"
                            aria-label={showToken ? "Hide Token" : "Show Token"}
                          >
                            {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="p-6 md:p-8 bg-surface-hover/30 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-2xl">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                          type="button"
                          onClick={() => setShowPasswordModal(true)}
                          className="btn-secondary text-[13px] text-text-muted hover:text-text-main w-full sm:w-auto"
                        >
                          <Eye className="w-4 h-4 mr-1.5 inline-block" /> Preview
                        </button>
                        <button 
                          type="button"
                          onClick={handleClearConnection}
                          disabled={saving}
                          className="btn-secondary text-[13px] text-accent-rust hover:border-accent-rust/30 hover:bg-accent-rust/5 w-full sm:w-auto"
                        >
                          Disconnect
                        </button>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                          type="button"
                          onClick={handleTestConnection}
                          disabled={testing}
                          className="btn-secondary w-full sm:w-auto"
                        >
                          {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" /> : <Zap className="w-4 h-4 mr-2 inline-block" />} Test
                        </button>
                        <button 
                          type="submit" 
                          disabled={saving || !cfToken}
                          className="btn-primary w-full sm:w-auto"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" /> : <Save className="w-4 h-4 mr-2 inline-block" />} Save
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </article>

            ) : (

              // Security Tab
              <article className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
                <div className="mb-6 flex flex-col gap-2">
                  <h2 className="text-2xl font-serif text-text-main">Account Security</h2>
                  <p className="text-[14px] text-text-muted">Manage master password and administrator settings.</p>
                </div>

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

                <div className="solid-panel shadow-sm">
                  <form onSubmit={handleChangePassword} className="divide-y divide-border-base">
                    
                    {/* Admin Profile Display */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4 bg-surface-hover/30 rounded-t-2xl">
                       <div className="md:w-1/3">
                          <h3 className="text-[14px] font-bold text-text-main">Admin Profile</h3>
                          <p className="text-[13px] text-text-muted mt-1 pr-4">Active user session.</p>
                       </div>
                       <div className="md:w-2/3 md:pl-8">
                         <div className="flex items-center gap-4">
                           <User className="w-12 h-12 text-text-muted p-2.5 bg-bg-base rounded-xl border border-border-base" />
                           <div>
                             <p className="text-text-main font-bold">Administrator</p>
                             <p className="text-[12px] text-text-muted bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded-full inline-block mt-1 font-medium tracking-wider">ROLE: ADMIN</p>
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* Current Password Row */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4">
                      <div className="md:w-1/3">
                        <label className="text-[14px] font-bold text-text-main block mb-1">Current Password</label>
                        <p className="text-[13px] text-text-muted leading-relaxed pr-4">Enter your current master password to verify your identity.</p>
                      </div>
                      <div className="md:w-2/3 md:pl-8 max-w-md">
                        <input 
                          type="password" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="input-field w-full"
                          required
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    
                    {/* New Password Row */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4">
                      <div className="md:w-1/3">
                        <label className="text-[14px] font-bold text-text-main block mb-1">New Password</label>
                        <p className="text-[13px] text-text-muted leading-relaxed pr-4">Must be at least 6 characters long.</p>
                      </div>
                      <div className="md:w-2/3 md:pl-8 max-w-md space-y-4">
                        <input 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          className="input-field w-full"
                          required
                          minLength={6}
                          autoComplete="new-password"
                        />
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="input-field w-full"
                          required
                          minLength={6}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="p-6 md:p-8 bg-surface-hover/30 flex justify-end rounded-b-2xl">
                      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2 inline-block" /> : <Key className="w-4 h-4 mr-2 inline-block" />} Update Password
                      </button>
                    </div>
                  </form>
                </div>
              </article>

            )}
          </section>
        </div>
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={() => { setShowPasswordModal(false); setRevealedCreds(null); setPreviewPassword(""); }} />
          <div className="solid-panel relative w-full max-w-[95vw] sm:max-w-sm max-h-[90vh] overflow-y-auto p-6 shadow-2xl transform transition-all z-10">
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
    </div>
  );
}
