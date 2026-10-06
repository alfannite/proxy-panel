"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export interface AppBarProps {
  /** Logo to display in the AppBar */
  logo?: ReactNode;
  /** Application name */
  appName?: string;
  /** If provided, renders a search input */
  onSearch?: (query: string) => void;
  /** User avatar image URL or element */
  userAvatar?: ReactNode;
  /** User name to display */
  userName?: string;
}

export interface ThemeToggleProps {
  /** Variant of the top bar. Default: "default" */
  variant?: "default" | "appbar" | "icon";
  /** Content for the app bar when variant is "appbar" */
  appBarProps?: AppBarProps;
  /** Starting theme. Default: "light" */
  defaultTheme?: Theme;
  /** Height of the top bar in px. Default: 44 for default, 60 for appbar */
  barHeight?: number;
  /** Diameter of the icon button in px. Default: 36 */
  buttonSize?: number;
  /** Curtain animation duration in ms. Default: 550 */
  duration?: number;
  /** Called after each theme change completes */
  onThemeChange?: (theme: Theme) => void;
  /** Page content rendered below the bar */
  children?: ReactNode;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const TOKENS: Record<Theme, Record<string, string>> = {
  light: {
    pageBg:    "#f8fafc",
    pageText:  "#0f172a",
    barBg:     "#ffffff",
    barText:   "#0f172a",
    barBorder: "#e2e8f0",
    btnBg:     "#ffffff",
    btnText:   "#0f172a",
    btnRing:   "#e2e8f0",
    btnShadow: "8px 8px 16px #e2e8f0, -8px -8px 16px #ffffff",
    inputBg:   "#f8fafc",
    inputText: "#0f172a",
  },
  dark: {
    pageBg:    "#121212",
    pageText:  "#f4f4f5",
    barBg:     "#1e1e1e",
    barText:   "#f4f4f5",
    barBorder: "rgba(255,255,255,0.08)",
    btnBg:     "#1e1e1e",
    btnText:   "#f4f4f5",
    btnRing:   "rgba(255,255,255,0.08)",
    btnShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 4px 20px -2px rgba(0, 0, 0, 0.5)",
    inputBg:   "#121212",
    inputText: "#f4f4f5",
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function MoonIcon() {
  return (
    <svg
      width="15" height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="15" height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1"     x2="12" y2="3"     />
      <line x1="12" y1="21"    x2="12" y2="23"    />
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"     y1="12"    x2="3"     y2="12"    />
      <line x1="21"    y1="12"    x2="23"    y2="12"    />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type CurtainPhase = "idle" | "falling" | "rising";

const EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

export function ThemeToggle({
  variant      = "default",
  appBarProps,
  defaultTheme = "light",
  barHeight: explicitBarHeight,
  buttonSize   = 36,
  duration     = 550,
  onThemeChange,
  children,
}: ThemeToggleProps) {
  const isAppBar = variant === "appbar";
  const isIcon = variant === "icon";
  const barHeight = explicitBarHeight ?? (isAppBar ? 60 : 44);

  const [theme, setTheme]     = useState<Theme>(defaultTheme);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t                     = TOKENS[theme];

  // Sync with global Tailwind dark class on mount
  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark && theme !== "dark") {
        setTheme("dark");
      } else if (!isDark && theme !== "light") {
        setTheme("light");
      }
    }
  }, []);

  const toggle = useCallback((e: React.MouseEvent) => {
    const next: Theme = theme === "light" ? "dark" : "light";
    
    // Fallback if View Transitions API is not supported
    if (typeof document === "undefined" || !(document as any).startViewTransition) {
      setTheme(next);
      onThemeChange?.(next);
      if (typeof document !== "undefined") {
        if (next === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
      return;
    }

    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const isToDark = next === "dark";
    document.documentElement.classList.add(isToDark ? "theme-transition-to-dark" : "theme-transition-to-light");

    const transition = (document as any).startViewTransition(() => {
      setTheme(next);
      onThemeChange?.(next);
      if (next === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      document.documentElement.animate(
        {
          clipPath: isToDark ? clipPath : [...clipPath].reverse(),
        },
        {
          duration: 600,
          easing: "ease-in-out",
          pseudoElement: isToDark ? "::view-transition-new(root)" : "::view-transition-old(root)",
        }
      );
    });
    
    transition.finished.then(() => {
      document.documentElement.classList.remove("theme-transition-to-dark", "theme-transition-to-light");
    });
  }, [theme, onThemeChange]);

  // ── Derived styles ──────────────────────────────────────────────────────────

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    paddingTop: barHeight,
    background: "transparent",
    transition: "background 0.3s ease, color 0.3s ease",
  };

  const barStyle: CSSProperties = {
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: barHeight,
    background: t.barBg,
    color: t.barText,
    borderBottom: `1px solid ${t.barBorder}`,
    overflow: "visible",
    zIndex: 9998,
    transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease",
    display: isAppBar ? "flex" : "block",
    alignItems: "center",
    justifyContent: "space-between",
    padding: isAppBar ? "0 24px" : "0",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  const btnScale = pressed ? 0.96 : hovered ? 1.1 : 1;
  const btnStyle: CSSProperties = {
    position: isAppBar || isIcon ? "relative" : "absolute",
    bottom: isAppBar || isIcon ? "auto" : -(buttonSize / 2),
    left: isAppBar || isIcon ? "auto" : "50%",
    transform: isAppBar || isIcon ? `scale(${btnScale})` : `translateX(-50%) scale(${btnScale})`,
    width: buttonSize,
    height: buttonSize,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: t.btnBg,
    color: t.btnText,
    boxShadow: pressed ? "inset 0 2px 4px 0 rgba(0,0,0,0.05)" : t.btnShadow,
    border: `1px solid ${t.btnRing}`,
    zIndex: 9999,
    outline: "none",
    transition:
      "background 0.3s ease, color 0.3s ease, transform 0.15s ease, box-shadow 0.3s ease",
    marginLeft: isAppBar ? "16px" : "0",
    flexShrink: 0,
  };

  const appBarSectionStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const globalStyles = `
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation: none;
      mix-blend-mode: normal;
    }
    .theme-transition-to-dark::view-transition-old(root) {
      z-index: 1;
    }
    .theme-transition-to-dark::view-transition-new(root) {
      z-index: 2;
    }
    .theme-transition-to-light::view-transition-old(root) {
      z-index: 2;
    }
    .theme-transition-to-light::view-transition-new(root) {
      z-index: 1;
    }
  `;

  if (isIcon) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        <button
          style={btnStyle}
          onClick={toggle as any}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setPressed(false); }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          aria-pressed={theme === "dark"}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </>
    );
  }

  return (
    <div style={pageStyle}>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      {/* Fixed top bar */}
      <div style={barStyle}>
        
        {isAppBar && (
          <div style={{ ...appBarSectionStyle, flex: 1 }}>
            {appBarProps?.logo && (
              <div style={{ display: "flex", alignItems: "center" }}>
                {appBarProps.logo}
              </div>
            )}
            {appBarProps?.appName && (
              <span style={{ fontWeight: 600, fontSize: "1.1rem", letterSpacing: "-0.01em" }}>
                {appBarProps.appName}
              </span>
            )}
          </div>
        )}

        {isAppBar && appBarProps?.onSearch && (
          <div style={{ ...appBarSectionStyle, flex: 1, justifyContent: "center" }}>
            <div style={{ 
              position: "relative", 
              width: "100%", 
              maxWidth: "320px",
              display: "flex",
              alignItems: "center"
            }}>
              <div style={{ position: "absolute", left: "12px", display: "flex", opacity: 0.6 }}>
                <SearchIcon />
              </div>
              <input 
                type="text" 
                placeholder="Search..."
                onChange={(e) => appBarProps.onSearch?.(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 16px 0 36px",
                  borderRadius: "18px",
                  border: "none",
                  outline: "none",
                  background: t.inputBg,
                  color: t.inputText,
                  fontSize: "0.9rem",
                  transition: "background 0.3s ease, color 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {isAppBar && (
          <div style={{ ...appBarSectionStyle, flex: 1, justifyContent: "flex-end" }}>
            {appBarProps?.userName && (
              <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                {appBarProps.userName}
              </span>
            )}
            {appBarProps?.userAvatar !== undefined ? (
              appBarProps.userAvatar
            ) : (
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: t.inputBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: t.inputText,
              }}>
                <UserIcon />
              </div>
            )}
            
            {/* Toggle Button in AppBar */}
            <button
              style={btnStyle}
              onClick={toggle as any}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => { setHovered(false); setPressed(false); }}
              onMouseDown={() => setPressed(true)}
              onMouseUp={() => setPressed(false)}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-pressed={theme === "dark"}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        )}

        {!isAppBar && (
          // Default layout: just the button hanging out
          <button
            style={btnStyle}
            onClick={toggle as any}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-pressed={theme === "dark"}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        )}

      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
