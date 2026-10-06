"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, Loader2, Play, Server, User, Key, XCircle } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export default function TerminalView() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<"Disconnected" | "Connecting" | "Connected">("Disconnected");
  
  const [host, setHost] = useState("172.17.0.1");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (termRef.current) {
        termRef.current.dispose();
      }
    };
  }, [socket]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Connecting");

    if (termRef.current) {
        termRef.current.dispose();
    }

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#111111',
        foreground: '#e5e5e5',
        cursor: '#c97d3c',
        selectionBackground: '#c97d3c50',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 14,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
      term.open(terminalRef.current);
      fitAddon.fit();
    }

    const newSocket = io({
      path: "/api/terminal-socket",
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("login", {
        host,
        port: parseInt(port, 10),
        username,
        password,
      });
    });

    newSocket.on("status", (newStatus: "Disconnected" | "Connected") => {
      setStatus(newStatus);
    });

    newSocket.on("data", (data: string) => {
      term.write(data);
    });

    term.onData((data) => {
      newSocket.emit("data", data);
    });

    term.onResize((size) => {
      newSocket.emit("resize", size);
    });

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  };

  const handleDisconnect = () => {
    if (socket) {
      socket.disconnect();
    }
    setStatus("Disconnected");
    if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif text-text-main flex items-center gap-3">
            <TerminalIcon className="w-6 h-6 text-primary-500" />
            Web Terminal
          </h2>
          <p className="text-text-muted mt-1 text-[14px]">Secure SSH access to your server environment.</p>
        </div>
        
        {status === "Connected" && (
            <button 
                onClick={handleDisconnect}
                className="btn-secondary flex items-center gap-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
            >
                <XCircle className="w-4 h-4" />
                Disconnect
            </button>
        )}
      </div>

      <div className="flex-1 solid-panel flex flex-col overflow-hidden shadow-2xl relative">
        {status === "Disconnected" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm p-4">
            <form onSubmit={handleConnect} className="solid-panel border border-border-base w-full max-w-md p-8 shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
                  <TerminalIcon className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-xl font-serif text-text-main">SSH Connection</h3>
                <p className="text-[13px] text-text-muted mt-2">Connect directly to your server host.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-[12px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Host IP</label>
                        <div className="relative">
                            <Server className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                                className="input-field pl-10"
                                required
                            />
                        </div>
                        <p className="text-[10px] text-text-muted mt-1 ml-1">172.17.0.1 targets the host machine</p>
                    </div>
                    <div>
                        <label className="block text-[12px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Port</label>
                        <input
                            type="text"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            className="input-field"
                            required
                        />
                    </div>
                </div>
                
                <div>
                  <label className="block text-[12px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-field pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full mt-8 flex items-center justify-center gap-2 h-12">
                <Play className="w-4 h-4 fill-current" /> Connect via SSH
              </button>
            </form>
          </div>
        )}

        {status === "Connecting" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-base/80 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                <p className="text-text-main font-mono text-sm animate-pulse">Establishing SSH connection...</p>
            </div>
        )}

        <div className="bg-[#111111] w-full flex-1 p-2 rounded-b-xl custom-scrollbar" ref={terminalRef}>
            {/* Terminal attaches here */}
        </div>
      </div>
    </div>
  );
}
