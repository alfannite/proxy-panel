"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, Loader2, XCircle } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export default function TerminalView() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<"Disconnected" | "Connecting" | "Connected">("Disconnected");
  
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    // Automatically connect on mount
    handleConnect();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (termRef.current) {
        termRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = () => {
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
      setStatus("Connected");
    });

    newSocket.on("disconnect", () => {
      setStatus("Disconnected");
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
            Terminal
          </h2>
          <p className="text-text-muted mt-1 text-[14px]">Direct shell access to your panel environment.</p>
        </div>
        
        {status === "Connected" ? (
            <button 
                onClick={handleDisconnect}
                className="btn-secondary flex items-center gap-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
            >
                <XCircle className="w-4 h-4" />
                Disconnect
            </button>
        ) : status === "Disconnected" ? (
            <button 
                onClick={handleConnect}
                className="btn-primary flex items-center gap-2"
            >
                <TerminalIcon className="w-4 h-4" />
                Reconnect
            </button>
        ) : null}
      </div>

      <div className="flex-1 solid-panel flex flex-col overflow-hidden shadow-2xl relative">
        {status === "Connecting" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-base/80 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                <p className="text-text-main font-mono text-sm animate-pulse">Initializing terminal session...</p>
            </div>
        )}

        {status === "Disconnected" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-base/80 backdrop-blur-sm">
                <TerminalIcon className="w-10 h-10 text-text-muted mb-4" />
                <p className="text-text-muted font-mono text-sm">Terminal session disconnected.</p>
            </div>
        )}

        <div className="bg-[#111111] w-full flex-1 p-2 rounded-b-xl custom-scrollbar" ref={terminalRef}>
            {/* Terminal attaches here */}
        </div>
      </div>
    </div>
  );
}
