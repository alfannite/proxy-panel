"use client";

import { useState, useEffect } from "react";
import {
  Globe, Activity, Plus, Server, LayoutDashboard,
  Search, Shield, X, ExternalLink, LogOut, User, Info,
  Menu, Moon, Sun, CheckCircle2, AlertTriangle, Zap, Loader2,
  Link, Unlink, Settings2, Play, Power, Edit2, Trash2, RefreshCw, StopCircle, Network, Cloud, Palette
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { ThemeToggle } from "@/components/ui/curtain-theme-toggle";

export default function Dashboard() {
  const router = useRouter();
  const [proxies, setProxies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [search, setSearch] = useState("");

  // Responsive Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // General State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tooltipData, setTooltipData] = useState<{ visible: boolean, x: number, y: number, title: React.ReactNode, content: React.ReactNode }>({ visible: false, x: 0, y: 0, title: '', content: '' });
  const [manageProxy, setManageProxy] = useState<any>(null);

  // Connection Status Check
  const [cfConnected, setCfConnected] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [uiMessage, setUiMessage] = useState<{title: string, content: string, type: 'info' | 'success' | 'error'} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [traefikConnected, setTraefikConnected] = useState(true); // Default true for mock
  const [isHealing, setIsHealing] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    filename: "",
    serviceName: "",
    domain: "",
    oldDomain: "",
    zoneId: "",
    rootDomain: "",
    subdomain: "",
    dnsIp: "",
    proxied: true,
    targetIp: "",
    targetPort: ""
  });
  const [zones, setZones] = useState<{id: string, name: string}[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetchProxies();
    checkConnections();

    // Realtime Polling (every 5 seconds) to auto-update IPs and Status
    const interval = setInterval(() => {
      fetchProxies(true);
      checkConnections();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchProxies = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/proxies", { cache: 'no-store', headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } });
      const result = await res.json();
      if (result.success) setProxies(result.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const checkConnections = async () => {
    try {
      const res = await fetch("/api/settings", { cache: 'no-store', headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } });
      const result = await res.json();
      if (result.success && result.data && result.data.CF_API_TOKEN) {
        setCfConnected(true);
        fetchZones();
      } else {
        setCfConnected(false);
      }
    } catch (e) {
      setCfConnected(false);
    }
  };

  const fetchZones = async () => {
    setLoadingZones(true);
    try {
      const res = await fetch("/api/cloudflare/zones", { cache: 'no-store', headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } });
      const result = await res.json();
      if (result.success) {
        setZones(result.data);
        if (result.data.length > 0) {
          setFormData(prev => ({ ...prev, zoneId: result.data[0].id, rootDomain: result.data[0].name }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingZones(false);
    }
  };

  const handleAutoHeal = () => {
    setIsHealing(true);
    // Simulate auto-healing process
    setTimeout(() => {
      setIsHealing(false);
      if (!cfConnected) {
        setUiError("Auto Healing: Cloudflare API Token is missing. Please configure it in Profile.");
      } else {
        setUiMessage({ title: "Auto Healing", content: "Systems are running nominally.", type: 'success' });
      }
    }, 1500);
  };

  const handleRestartTraefik = async () => {
    setIsRestarting(true);
    try {
      const res = await fetch("/api/system/restart", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setUiMessage({ title: "Config Synced", content: "Traefik router successfully restarted to load the latest configs.", type: 'success' });
      } else {
        setUiMessage({ title: "Sync Failed", content: data.error || "Failed to restart router.", type: 'error' });
      }
    } catch (e) {
      setUiMessage({ title: "System Error", content: "Could not reach server to restart.", type: 'error' });
    } finally {
      setIsRestarting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/masukpanel");
      router.refresh();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Field Validations
    const targetIpRegex = /^[a-zA-Z0-9.-]+$/;
    if (!formData.targetIp || !targetIpRegex.test(formData.targetIp)) {
      setUiError("Invalid Backend Target IP. Please enter a valid IP address or hostname (no slashes or spaces).");
      return;
    }

    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (formData.dnsIp && !formData.dnsIp.includes('*') && !ipv4Regex.test(formData.dnsIp)) {
      setUiError("Invalid DNS IPv4 Address. Please enter a valid public IPv4 address.");
      return;
    }

    const subdomainRegex = /^([a-zA-Z0-9-]{1,63}|@)$/;
    if (formData.subdomain && !subdomainRegex.test(formData.subdomain)) {
      setUiError("Invalid Subdomain. Only letters, numbers, and hyphens are allowed. Use @ for root domain.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/proxies", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (result.success) {
        setIsModalOpen(false);
        setIsEditMode(false);
        setFormData({ filename: "", serviceName: "", domain: "", oldDomain: "", zoneId: zones.length > 0 ? zones[0].id : "", rootDomain: zones.length > 0 ? zones[0].name : "", subdomain: "", dnsIp: "", proxied: true, targetIp: "", targetPort: "" });
        fetchProxies();
      } else {
        setUiMessage({ title: "Operation Failed", content: result.error || "Unknown error occurred.", type: 'error' });
      }
    } catch (e) {
      setUiMessage({ title: "System Error", content: "Could not complete the operation.", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewClick = () => {
    if (!cfConnected) {
      setUiError("Cloudflare is not connected. Please go to the Profile page to configure your Cloudflare API credentials before creating a proxy.");
      return;
    }
    setIsEditMode(false);
    setFormData({ filename: "", serviceName: "", domain: "", oldDomain: "", zoneId: zones.length > 0 ? zones[0].id : "", rootDomain: zones.length > 0 ? zones[0].name : "", subdomain: "", dnsIp: "", proxied: true, targetIp: "", targetPort: "" });
    setIsModalOpen(true);
  };

  const handleEditClick = (proxy: any) => {
    if (!cfConnected) {
      setUiError("Cloudflare is not connected. Please go to the Profile page to configure your Cloudflare API credentials before editing this proxy.");
      return;
    }
    let tIp = "";
    let tPort = "";
    if (proxy.targetUrl && proxy.targetUrl.includes("://")) {
      const parts = proxy.targetUrl.split("://")[1].split(":");
      tIp = parts[0];
      tPort = parts[1] || "80";
    }

    let sub = "";
    let root = zones.length > 0 ? zones[0].name : "";
    let zId = zones.length > 0 ? zones[0].id : "";

    // Try to match domain with zones
    if (proxy.domain) {
      const matchedZone = zones.find(z => proxy.domain.endsWith(z.name));
      if (matchedZone) {
        zId = matchedZone.id;
        root = matchedZone.name;
        if (proxy.domain === matchedZone.name) {
          sub = "@";
        } else {
          sub = proxy.domain.replace(`.${matchedZone.name}`, '');
        }
      }
    }

    setFormData({
      filename: proxy.filename,
      serviceName: proxy.serviceName,
      domain: proxy.domain,
      oldDomain: proxy.domain, // Save the old domain for backend to lookup and update
      targetIp: tIp,
      targetPort: tPort,
      zoneId: zId,
      rootDomain: root,
      subdomain: sub,
      dnsIp: proxy.realIp && proxy.realIp !== "N/A" ? proxy.realIp : (proxy.publicIp !== "N/A" ? proxy.publicIp : ""),
      proxied: true
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const filename = deleteConfirm;
    setDeleteConfirm(null);
    setManageProxy(null);
    
    try {
      const res = await fetch(`/api/proxies?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (result.success) {
        fetchProxies();
        setUiMessage({ title: "Service Deleted", content: `Successfully deleted proxy rule.`, type: 'success' });
      } else {
        setUiMessage({ title: "Deletion Failed", content: result.error || "Could not delete proxy.", type: 'error' });
      }
    } catch (e) {
      setUiMessage({ title: "System Error", content: "Could not reach server.", type: 'error' });
    }
  };

  const filteredProxies = proxies.filter(p =>
    p.domain.toLowerCase().includes(search.toLowerCase()) ||
    p.serviceName.toLowerCase().includes(search.toLowerCase())
  );

  const handleMouseEnterTooltip = (e: React.MouseEvent, title: React.ReactNode, content: React.ReactNode) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipData({
      visible: true,
      x: rect.left + (rect.width / 2),
      y: rect.top - 12,
      title,
      content,
    });
  };

  const handleMouseLeaveTooltip = () => {
    setTooltipData(prev => ({ ...prev, visible: false }));
  };

  const renderStatusIcon = (domain: string, status: string) => {
    if (status === 'stopped') {
      return (
        <div 
          className="flex items-center justify-center mr-3 z-10 cursor-help"
          onMouseEnter={(e) => handleMouseEnterTooltip(e, 
            <h4 className="font-bold text-red-500 mb-1 flex items-center gap-2 text-[13px]"><StopCircle className="w-4 h-4" /> Service Stopped</h4>,
            <p className="text-text-muted leading-relaxed text-[12px]">This reverse proxy service has been manually stopped and is currently inactive.</p>
          )}
          onMouseLeave={handleMouseLeaveTooltip}
        >
          <StopCircle className="w-4 h-4 text-red-500" />
        </div>
      );
    }
    if (!cfConnected) {
      return (
        <div 
          className="flex items-center justify-center mr-3 z-10 cursor-help"
          onMouseEnter={(e) => handleMouseEnterTooltip(e, 
            <h4 className="font-bold text-accent-rust mb-1 flex items-center gap-2 text-[13px]"><Unlink className="w-4 h-4" /> Cloudflare Disconnected</h4>,
            <p className="text-text-muted leading-relaxed text-[12px]">Traefik backend exists, but ProxyPanel is not connected to any Cloudflare account. Automated DNS management is degraded.</p>
          )}
          onMouseLeave={handleMouseLeaveTooltip}
        >
          <Unlink className="w-4 h-4 text-accent-rust" />
        </div>
      );
    }
    
    const isDomainConnected = zones.some(z => domain.endsWith(z.name));
    
    if (!isDomainConnected) {
      return (
        <div 
          className="flex items-center justify-center mr-3 z-10 cursor-help"
          onMouseEnter={(e) => handleMouseEnterTooltip(e, 
            <h4 className="font-bold text-pink-500 mb-1 flex items-center gap-2 text-[13px]"><AlertTriangle className="w-4 h-4" /> Domain Mismatch</h4>,
            <p className="text-text-muted leading-relaxed text-[12px]">The root domain for this service is not managed by the currently connected Cloudflare account, or the domain has expired/missing.</p>
          )}
          onMouseLeave={handleMouseLeaveTooltip}
        >
          <AlertTriangle className="w-4 h-4 text-pink-500" />
        </div>
      );
    }

    return (
      <div 
        className="flex items-center justify-center mr-3 z-10 cursor-help"
        onMouseEnter={(e) => handleMouseEnterTooltip(e, 
          <h4 className="font-bold text-green-400 mb-1 flex items-center gap-2 text-[13px]"><CheckCircle2 className="w-4 h-4" /> Fully Synchronized</h4>,
          <p className="text-text-muted leading-relaxed text-[12px]">Traefik backend and Cloudflare DNS are actively connected and healthy.</p>
        )}
        onMouseLeave={handleMouseLeaveTooltip}
      >
        <Link className="w-4 h-4 text-green-400 animate-pulse drop-shadow-md" />
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base font-sans relative">

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface-base shadow-[var(--shadow-neumorphic)] border-r border-border-base p-6 flex flex-col gap-8 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

        <div className="flex items-center gap-3 px-2 mt-2 md:mt-0">
          <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border-base flex items-center justify-center shadow-sm">
            <Globe className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h1 className="text-xl font-serif text-text-main font-bold">ProxyPanel</h1>
            <p className="text-[11px] text-text-muted tracking-widest font-medium uppercase mt-0.5">By FanOps</p>
          </div>
          
          <button
            className="md:hidden ml-auto text-text-muted"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-500/10 text-primary-500 font-medium border border-primary-500/20 transition-all">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>


          <div className="my-2 border-t border-border-base w-full"></div>

          <div className="flex items-center justify-between px-4 py-2 mt-2">
            <div className="flex items-center gap-3 text-text-muted font-medium">
              <Palette className="w-5 h-5" />
              <span>Theme Mode</span>
            </div>
            <div className="scale-90">
              <ThemeToggle variant="icon" />
            </div>
          </div>

          <button onClick={() => router.push("/profile")} className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:text-primary-500 hover:bg-surface-hover font-medium transition-all duration-200">
            <User className="w-5 h-5 transition-colors" />
            Profile & Security
          </button>

          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:text-accent-rust hover:bg-accent-rust/10 font-medium transition-all duration-200 mt-auto">
            <LogOut className="w-5 h-5 transition-colors" />
            Logout
          </button>
        </nav>

        {/* Connection Status Checklist */}
        <div className="mt-auto p-4 rounded-[24px] bg-surface-base shadow-[var(--shadow-inner)] border border-border-base relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[12px] font-bold text-text-muted uppercase tracking-wider">Connections</span>
            <button
              onClick={handleAutoHeal}
              disabled={isHealing}
              className="text-[11px] font-medium text-primary-500 bg-primary-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-primary-500/20 transition-colors"
            >
              {isHealing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Heal
            </button>
          </div>

          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              {traefikConnected ? <CheckCircle2 className="w-4 h-4 text-accent-sage" /> : <AlertTriangle className="w-4 h-4 text-accent-rust" />}
              <span className={`text-[13px] font-medium ${traefikConnected ? 'text-text-main' : 'text-accent-rust'}`}>Engine Proxies</span>
            </div>
            <div className="flex items-center gap-2">
              {cfConnected ? <CheckCircle2 className="w-4 h-4 text-accent-sage" /> : <AlertTriangle className="w-4 h-4 text-accent-rust" />}
              <span className={`text-[13px] font-medium ${cfConnected ? 'text-text-main' : 'text-accent-rust'}`}>Cloudflare API</span>
            </div>
          </div>

          {(!traefikConnected || !cfConnected) && (
            <div className="mt-3 p-3 rounded-lg text-[11px] font-medium text-accent-rust bg-accent-rust/10 border border-accent-rust/20 leading-tight flex items-start gap-2 animate-[fadeIn_0.3s_ease-out_forwards,fadeOut_0.5s_ease-in_5s_forwards] shadow-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Status Degraded.<br />Auto Healing recommended.</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 w-full min-w-0 overflow-y-auto">
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-border-base">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary-500" />
            <h1 className="text-xl font-serif text-text-main font-bold">ProxyPanel</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle variant="icon" />
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-surface-hover rounded-lg border border-border-base text-text-main"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-serif text-text-main mb-2">Proxy Overview</h2>
            <p className="text-text-muted text-[15px]">Dynamic edge routing and ingress orchestration.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRestartTraefik}
              disabled={isRestarting}
              className="flex items-center gap-2 px-4 py-2 border border-border-base rounded-lg text-text-muted hover:text-primary-500 hover:border-primary-500 transition-colors bg-transparent disabled:opacity-50"
              title="Restart Traefik to reload configs"
            >
              {isRestarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              <span className="hidden sm:inline">Sync Config</span>
            </button>
            <button
              onClick={handleAddNewClick}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              Add New Proxy
            </button>
          </div>
        </header>

        {/* Stats */}
        <section aria-label="Dashboard Statistics" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <article className="solid-card p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-bg-base border border-border-base flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary-500 animate-[spin_5s_linear_infinite]" />
            </div>
            <div>
              <p className="text-4xl font-serif text-text-main mb-1">{proxies.length}</p>
              <p className="text-[13px] text-text-muted font-medium uppercase tracking-wide">Active Domains</p>
            </div>
          </article>
          
          <article className="solid-card p-6 flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            <div className="w-12 h-12 rounded-xl bg-surface-base border border-primary-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(201,125,60,0.15)] relative z-10">
              <Activity className="w-7 h-7 text-primary-500 animate-[pulse_1.5s_ease-in-out_infinite] drop-shadow-[0_0_8px_rgba(201,125,60,0.6)]" />
            </div>
            <div className="relative z-10">
              <p className={`text-4xl font-serif mb-1 ${traefikConnected ? 'text-text-main drop-shadow-sm' : 'text-accent-rust'}`}>
                {traefikConnected ? "Stable" : "Err"}
              </p>
              <p className="text-[13px] text-text-muted font-medium uppercase tracking-wide">Traffic Requests</p>
            </div>
          </article>
          <article className="solid-card p-6 flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-xl bg-bg-base border border-border-base flex items-center justify-center ${traefikConnected && cfConnected ? 'animate-pulse' : ''}`}>
              <Zap className={`w-6 h-6 ${traefikConnected && cfConnected ? 'text-primary-500' : 'text-accent-rust'}`} />
            </div>
            <div>
              <p className="text-4xl font-serif text-text-main mb-1">{traefikConnected && cfConnected ? "Healthy" : "Degraded"}</p>
              <p className="text-[13px] text-text-muted font-medium uppercase tracking-wide">System Health</p>
            </div>
          </article>
        </section>

        {/* List Section */}
        <section aria-label="List Proxy" className="solid-panel p-6 md:p-8">
          <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-border-base pb-6">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2 bg-primary-500/10 rounded-lg border border-primary-500/20">
                <Network className="w-5 h-5 text-primary-500" />
              </div>
              <h3 className="text-xl font-serif text-text-main">List Proxy</h3>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search domain..."
                className="input-field !pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </header>

          {loading ? (
            <div className="py-16 text-center text-text-muted bg-surface-base rounded-xl border border-border-base">
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                Loading configuration...
              </div>
            </div>
          ) : filteredProxies.length === 0 ? (
            <div className="py-16 text-center text-text-muted bg-surface-base rounded-xl border border-border-base">
              No proxies found. Click {" "}
              <button
                onClick={handleAddNewClick}
                className="text-primary-500 font-medium hover:underline"
              >
                "Add New Proxy"
              </button>
              {" "} to get started.
            </div>
          ) : (
            <>
              {/* Mobile View (Cards) */}
              <div className="md:hidden flex flex-col gap-4">
                {filteredProxies.map((proxy, i) => (
                  <div key={`mob-${i}`} className="solid-card p-5 flex flex-col gap-4">
                    {/* Header: Service Name & Domain */}
                    <div className="flex items-start justify-between border-b border-border-base pb-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {renderStatusIcon(proxy.domain, proxy.status)}
                        </div>
                        <div>
                          <h4 className={`font-bold text-text-main text-[15px] ${proxy.status === 'stopped' ? 'line-through text-text-muted' : ''}`}>
                            {proxy.serviceName}
                          </h4>
                          <a href={`https://${proxy.domain}`} target="_blank" rel="noreferrer" className="text-accent-sage font-medium text-[13px] hover:underline flex items-center gap-1.5 mt-0.5 break-all">
                            https://{proxy.domain}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    {/* Body: IP, Target, Cloudflare */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border-base">
                      <div>
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Status Cloudflare</p>
                        <div>
                          {cfConnected ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#F38020]/10 text-[#F38020] border border-[#F38020]/20">
                              <Cloud className="w-3 h-3" /> Proxied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-surface-hover text-text-muted border border-border-base">
                              Local
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Public IP</p>
                        {proxy.publicIp === "N/A" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                            <Loader2 className="w-3 h-3 animate-spin" /> Pending DNS
                          </span>
                        ) : (
                          <p className="font-mono text-[13px] text-text-main/80">{proxy.publicIp}</p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Target Backend</p>
                        <p className="font-mono text-[13px] text-text-main/80 break-all">{proxy.targetUrl}</p>
                      </div>
                    </div>
                    
                    {/* Footer: Action */}
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setManageProxy(proxy)}
                        className="px-5 py-2 rounded-xl text-[13px] font-medium bg-surface-hover hover:bg-border-base border border-border-base text-text-main transition-colors duration-200 flex items-center gap-2"
                      >
                        <Settings2 className="w-4 h-4 text-text-muted" />
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View (Table) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-border-base bg-surface-base w-full custom-scrollbar pb-2">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-surface-hover/80 text-text-main text-[12px] font-bold uppercase tracking-widest border-b border-border-base">
                      <th className="py-4 pl-6 pr-4 font-semibold w-[20%]">Service Name</th>
                      <th className="py-4 px-4 font-semibold w-[22%]">Routing Domain</th>
                      <th className="py-4 px-4 font-semibold w-[12%]">Cloudflare</th>
                      <th className="py-4 px-4 font-semibold w-[16%]">Public IP</th>
                      <th className="py-4 px-4 font-semibold w-[20%]">Target Backend</th>
                      <th className="py-4 pl-4 pr-6 font-semibold text-center w-[10%]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-[14px]">
                    {filteredProxies.map((proxy, i) => (
                      <tr key={`desk-${i}`} className="border-b border-border-base hover:bg-surface-hover/50 transition-colors duration-200 group">
                        <td className="py-5 pl-6 pr-4 font-medium text-text-main">
                          <div className="flex items-center gap-3">
                            {renderStatusIcon(proxy.domain, proxy.status)}
                            <span className={`truncate ${proxy.status === 'stopped' ? 'line-through text-text-muted' : ''}`}>{proxy.serviceName}</span>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-accent-sage font-medium">
                          <a href={`https://${proxy.domain}`} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1.5 w-max">
                            https://{proxy.domain}
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="py-5 px-4 whitespace-nowrap">
                          {cfConnected ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#F38020]/10 text-[#F38020] border border-[#F38020]/20 shadow-[0_0_10px_-2px_rgba(243,128,32,0.2)]">
                              <Cloud className="w-3 h-3" /> Proxied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-surface-hover text-text-muted border border-border-base">
                              Local
                            </span>
                          )}
                        </td>
                        <td className="py-5 px-4 font-mono text-[13px] text-text-main/70 whitespace-nowrap">
                          {proxy.publicIp === "N/A" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-sm">
                              <Loader2 className="w-3 h-3 animate-spin" /> Pending DNS
                            </span>
                          ) : (
                            proxy.publicIp
                          )}
                        </td>
                        <td className="py-5 px-4 text-text-main/70 font-mono text-[13px] break-all min-w-[180px]">
                          {proxy.targetUrl}
                        </td>
                        <td className="py-5 pl-4 pr-6">
                          <div className="flex justify-center">
                            <button 
                              onClick={() => setManageProxy(proxy)}
                              className="group relative px-5 py-2 rounded-xl text-[13px] font-medium bg-surface-base border border-border-base text-text-main overflow-hidden transition-all duration-300 hover:border-primary-500/50 hover:shadow-[0_0_15px_-3px_rgba(235,100,52,0.2)]"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-x-[-100%] group-hover:translate-x-[100%]"></div>
                              <span className="relative flex items-center gap-2 whitespace-nowrap">
                                <Settings2 className="w-4 h-4 text-text-muted group-hover:text-primary-500 transition-colors duration-300" />
                                Manage
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Add New Proxy Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} zIndex={50}>
        <div className="solid-panel relative w-full w-[500px] max-w-[90vw] p-6 md:p-8 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-text-muted hover:text-text-main bg-bg-base rounded-full transition-colors border border-border-base"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl md:text-2xl font-serif text-text-main mb-2">{isEditMode ? "Edit Proxy" : "Create New Proxy"}</h3>
            <p className="text-text-muted text-[13px] md:text-[14px] mb-8">{isEditMode ? "Update domain and backend routing dynamically." : "Route a new domain to your internal service."}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* === SECTION 1: TRAEFIK BACKEND === */}
              <div className="bg-surface-hover p-4 rounded-xl border border-border-base flex flex-col gap-5">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-5 h-5 text-primary-500" />
                  <h4 className="font-medium text-text-main">Local Service Details</h4>
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-[12px] md:text-[13px] font-medium text-text-muted uppercase tracking-wider mb-2">
                    Service Name
                    <div className="relative has-tooltip">
                      <Info className="w-4 h-4 cursor-help" />
                      <div className="help-tooltip w-48 -left-20 -top-12">
                        Unique identifier for this route (e.g., my-app-prod)
                      </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., engineer-app"
                    className={`input-field ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    disabled={isEditMode}
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[12px] md:text-[13px] font-medium text-text-muted uppercase tracking-wider mb-2">Backend Target IP</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., 10.0.0.5"
                      className="input-field"
                      value={formData.targetIp}
                      onChange={(e) => setFormData({ ...formData, targetIp: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] md:text-[13px] font-medium text-text-muted uppercase tracking-wider mb-2">Backend Target Port</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g., 8080"
                      className="input-field"
                      value={formData.targetPort}
                      onChange={(e) => setFormData({ ...formData, targetPort: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* === SECTION 2: CLOUDFLARE DNS === */}
              <div className="bg-surface-hover p-4 rounded-xl border border-border-base flex flex-col gap-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-accent-sage" />
                    <h4 className="font-medium text-text-main">Cloudflare DNS Record</h4>
                  </div>
                  {!cfConnected && (
                    <span className="text-[11px] bg-accent-rust/10 text-accent-rust px-2 py-0.5 rounded font-medium border border-accent-rust/20">
                      Not Connected
                    </span>
                  )}
                </div>

                {cfConnected ? (
                  <>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[12px] md:text-[13px] font-medium text-text-muted uppercase tracking-wider mb-2">Root Domain</label>
                        {loadingZones ? (
                          <div className="input-field flex items-center gap-2 text-text-muted">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading zones...
                          </div>
                        ) : (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="input-field w-full flex items-center justify-between bg-bg-base text-left transition-all duration-200"
                            >
                              <span className="truncate">
                                {formData.rootDomain || "Select a domain..."}
                              </span>
                              <div className={`text-text-muted transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </div>
                            </button>
                            
                            {/* Custom Dropdown Menu */}
                            {isDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                                <ul className="absolute left-0 right-0 top-full mt-2 bg-surface-base border border-border-base rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                  {zones.length === 0 ? (
                                    <li className="px-4 py-3 text-text-muted text-[13px] text-center italic">No domains found in Cloudflare</li>
                                  ) : (
                                    zones.map((zone) => (
                                      <li key={zone.id} className="border-b border-border-base last:border-b-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFormData({ ...formData, zoneId: zone.id, rootDomain: zone.name });
                                            setIsDropdownOpen(false);
                                          }}
                                          className={`w-full text-left px-4 py-3 text-[13px] transition-colors ${
                                            formData.zoneId === zone.id 
                                              ? 'bg-primary-500/10 text-primary-500 font-bold' 
                                              : 'text-text-main hover:bg-surface-hover hover:text-primary-500'
                                          }`}
                                        >
                                          {zone.name}
                                        </button>
                                      </li>
                                    ))
                                  )}
                                </ul>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[12px] md:text-[13px] font-medium text-text-muted uppercase tracking-wider mb-2">Subdomain</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., api (use @ for root)"
                          className="input-field"
                          value={formData.subdomain}
                          onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[13px] text-text-main font-mono bg-bg-base p-2 rounded border border-border-base">
                      Preview: <span className="text-primary-500">{formData.subdomain === '@' ? formData.rootDomain : (formData.subdomain ? `${formData.subdomain}.${formData.rootDomain}` : `*.${formData.rootDomain}`)}</span>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-[12px] md:text-[13px] font-medium text-text-muted uppercase tracking-wider mb-2">
                        DNS IPv4 Address
                        <div className="relative has-tooltip">
                          <Info className="w-4 h-4 cursor-help" />
                          <div className="help-tooltip w-56 -left-24 -top-16">
                            Public IP of your server where Traefik is running. Cloudflare will point the domain to this IP.
                          </div>
                        </div>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., 203.0.113.1 (Your Server Public IP)"
                        className="input-field"
                        value={formData.dnsIp}
                        onChange={(e) => setFormData({ ...formData, dnsIp: e.target.value })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between bg-bg-base p-3 rounded-lg border border-border-base">
                      <div>
                        <p className="text-[13px] font-medium text-text-main flex items-center gap-2">
                          Cloudflare Proxy Status
                          {formData.proxied ? (
                            <span className="text-[#F6821F] flex items-center gap-1 text-[11px] font-bold"><Zap className="w-3 h-3 fill-current" /> Proxied</span>
                          ) : (
                            <span className="text-text-muted flex items-center gap-1 text-[11px] font-bold">DNS Only</span>
                          )}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">Proxy traffic through Cloudflare to hide server IP.</p>
                      </div>
                      
                      {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={formData.proxied}
                          onChange={(e) => setFormData({ ...formData, proxied: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F6821F] border border-border-base"></div>
                      </label>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[12px] md:text-[13px] font-medium text-text-muted uppercase tracking-wider mb-2">Domain (Host)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., api.yourdomain.com"
                      className="input-field"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    />
                    <p className="text-[11px] text-accent-rust mt-2 mt-1">Connect Cloudflare in Profile to automate DNS creation.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1 md:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 md:flex-none md:min-w-[140px]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isEditMode ? (
                    "Update Proxy"
                  ) : (
                    "Create Proxy"
                  )}
                </button>
              </div>
            </form>
          </div>
      </Modal>

      {/* Error Action Modal */}
      <Modal isOpen={!!uiError} onClose={() => setUiError(null)} zIndex={60}>
          <div className="solid-panel relative w-full max-w-sm p-6 shadow-2xl transform transition-all z-10 border border-accent-rust/30 rounded-2xl">
            <div className="flex items-center gap-3 mb-4 border-b border-border-base pb-4">
              <div className="w-10 h-10 rounded-full bg-accent-rust/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-accent-rust" />
              </div>
              <h3 className="text-xl font-serif text-text-main">Action Blocked</h3>
            </div>
            <p className="text-[14px] text-text-muted mb-6 leading-relaxed">
              {uiError}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setUiError(null)} 
                className="btn-secondary text-[13px] py-2 px-4"
              >
                Close
              </button>
              <button 
                onClick={() => { setUiError(null); router.push("/profile"); }} 
                className="bg-accent-rust hover:bg-accent-rust/90 text-white font-medium rounded-lg text-[13px] py-2 px-4 transition-colors shadow-sm"
              >
                Go to Profile
              </button>
            </div>
          </div>
      </Modal>

      {/* Manage Service Modal */}
      <Modal isOpen={!!manageProxy} onClose={() => setManageProxy(null)} zIndex={60}>
        {manageProxy && (
          <div className="solid-panel relative w-full w-[380px] max-w-[90vw] p-6 shadow-2xl">
            <button
              onClick={() => setManageProxy(null)}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-main bg-bg-base rounded-full transition-colors border border-border-base"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-serif text-text-main mb-1">Manage Service</h3>
            <p className="text-text-muted text-[13px] mb-6 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${manageProxy.status === 'stopped' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
              {manageProxy.serviceName}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  const action = manageProxy.status === 'stopped' ? 'start' : 'stop';
                  setManageProxy(null);
                  try {
                    const res = await fetch(`/api/proxies?filename=${encodeURIComponent(manageProxy.filename)}&action=${action}`, { method: 'PATCH' });
                    const result = await res.json();
                    if (result.success) fetchProxies();
                    else setUiError("Error toggling status: " + result.error);
                  } catch (e) {
                    setUiError("System Error during toggle status");
                  }
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl border ${manageProxy.status === 'stopped' ? 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20'} transition-all`}
              >
                <span className="font-medium text-[14px]">{manageProxy.status === 'stopped' ? 'Start Traefik Service' : 'Stop Traefik Service'}</span>
                {manageProxy.status === 'stopped' ? <Play className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setManageProxy(null);
                  handleEditClick(manageProxy);
                }}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border-base bg-surface-hover text-text-main hover:border-primary-500/50 transition-all"
              >
                <span className="font-medium text-[14px]">Edit Configuration</span>
                <Edit2 className="w-4 h-4 text-text-muted" />
              </button>

              <div className="border-t border-border-base mt-2 pt-4 flex justify-end">
                <button
                  onClick={() => {
                    setDeleteConfirm(manageProxy.filename);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-accent-rust/20 bg-accent-rust/10 text-accent-rust hover:bg-accent-rust/20 transition-all w-full sm:w-auto"
                >
                  <span className="font-medium text-[13px]">Delete Service & DNS</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {/* Global Tooltip */}
      {tooltipData.visible && (
        <div 
          className="fixed z-[100] bg-surface-base border border-border-base rounded-xl shadow-xl p-3 w-64 pointer-events-none transition-all duration-200"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltipData.title}
          {tooltipData.content}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} zIndex={60}>
        <div className="bg-surface-base border border-border-base rounded-2xl w-full w-[380px] max-w-[90vw] overflow-hidden shadow-2xl relative p-6">
            <div className="flex items-center gap-3 mb-4 text-accent-rust">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-serif font-bold text-text-main">Delete Service?</h3>
            </div>
            <p className="text-text-muted text-sm mb-6 leading-relaxed">
              Are you sure you want to delete this proxy rule? This action will permanently remove the configuration.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="flex-1 py-2.5 rounded-xl border border-border-base text-text-main hover:bg-surface-hover font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-2.5 rounded-xl bg-accent-rust text-white font-medium hover:bg-accent-rust/90 shadow-lg shadow-accent-rust/20 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
      </Modal>

      {/* UI Messages Modal */}
      <Modal isOpen={!!uiMessage} onClose={() => setUiMessage(null)} zIndex={70}>
        {uiMessage && (
          <div className="bg-surface-base border border-border-base rounded-2xl w-full w-[380px] max-w-[90vw] overflow-hidden shadow-2xl relative p-6 text-center">
            <div className={`mx-auto w-12 h-12 rounded-full mb-4 flex items-center justify-center ${
              uiMessage.type === 'success' ? 'bg-accent-sage/20 text-accent-sage' : 
              uiMessage.type === 'error' ? 'bg-accent-rust/20 text-accent-rust' : 
              'bg-primary-500/20 text-primary-500'
            }`}>
              {uiMessage.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
               uiMessage.type === 'error' ? <AlertTriangle className="w-6 h-6" /> : 
               <Info className="w-6 h-6" />}
            </div>
            <h3 className="text-lg font-serif font-bold text-text-main mb-2">{uiMessage.title}</h3>
            <p className="text-text-muted text-sm mb-6 leading-relaxed">{uiMessage.content}</p>
            <button 
              onClick={() => setUiMessage(null)} 
              className="w-full py-2.5 rounded-xl bg-surface-hover border border-border-base text-text-main font-medium hover:border-primary-500/50 transition-colors"
            >
              Okay
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
