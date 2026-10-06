"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Activity, Cpu, HardDrive } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';

type TimeRange = '1h' | '24h' | '10d' | '30d';

interface MetricData {
  time: string;
  rps: number;
}

export function TrafficChart() {
  const [range, setRange] = useState<TimeRange>('24h');
  const [totalRequests, setTotalRequests] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [liveData, setLiveData] = useState<MetricData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState({ rps: 0, cpu: 0, ram: 0 });

  useEffect(() => {
    const initialData = Array.from({ length: 30 }).map(() => ({
      time: '',
      rps: 0
    }));
    setLiveData(initialData);
  }, []);

  const fetchMetrics = async (selectedRange: TimeRange, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/system/metrics?range=${selectedRange}`);
      if (res.ok) {
        const data = await res.json();
        setTotalRequests(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(range);
  }, [range]);

  useEffect(() => {
    const socket = io({ path: "/api/terminal-socket" });

    socket.on('system_metrics', (data) => {
      setCurrentMetrics({ rps: data.rps, cpu: data.cpu, ram: data.ram });
      
      const timeStr = new Date(data.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setLiveData(prev => {
        const newData = [...prev, { time: timeStr, rps: data.rps }];
        if (newData.length > 30) newData.shift();
        return newData;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
  };

  const rangeLabels: Record<TimeRange, string> = {
    '1h': 'Last 1 Hour',
    '24h': 'Last 24 Hours',
    '10d': 'Last 10 Days',
    '30d': 'Last 30 Days'
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-base border border-border-base p-3 rounded-lg shadow-xl">
          <p className="text-text-muted text-xs mb-1 font-mono">{label}</p>
          <p className="text-primary-500 font-bold flex items-center gap-2">
            <Activity className="w-3 h-3" />
            {payload[0].value} Req/s
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden group rounded-2xl border border-border-base bg-surface-base shadow-sm animate-fadeIn">
      {/* Header Info */}
      <div className="px-5 pt-5 pb-0 relative z-10 flex flex-col gap-3">
        {/* Top Row: Title + Dropdown + CPU/RAM */}
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2">
                    <p className="text-[12px] text-text-muted font-medium">Total requests • {rangeLabels[range]}</p>
                    <div className="relative" ref={dropdownRef}>
                        <div 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="text-text-muted hover:text-text-main cursor-pointer leading-none font-bold pb-1"
                        >
                        ...
                        </div>
                        {dropdownOpen && (
                            <div className="absolute left-0 top-full mt-1 w-36 bg-surface-base border border-border-base rounded-lg shadow-lg z-50 overflow-hidden text-sm">
                            {(Object.keys(rangeLabels) as TimeRange[]).map((r) => (
                                <button
                                key={r}
                                onClick={() => { setRange(r); setDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2 hover:bg-surface-hover ${range === r ? 'text-primary-500 font-medium' : 'text-text-main'}`}
                                >
                                {rangeLabels[r]}
                                </button>
                            ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                    {loading && totalRequests === null ? (
                        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    ) : (
                        <h3 className="text-2xl font-bold text-text-main tracking-tight">
                        {totalRequests !== null ? formatNumber(totalRequests) : '0'}
                        </h3>
                    )}
                </div>
            </div>

            {/* Right Side Metrics */}
            <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 bg-bg-base px-2 py-1 rounded-md border border-border-base">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Live</span>
                    <span className="text-sm font-bold text-primary-500 font-mono ml-1">{currentMetrics.rps} <span className="text-[10px] font-sans font-normal text-text-muted">req/s</span></span>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-text-muted font-medium bg-bg-base px-1.5 py-0.5 rounded border border-border-base">
                        <Cpu className="w-3 h-3 text-accent-sage" /> {currentMetrics.cpu}%
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-text-muted font-medium bg-bg-base px-1.5 py-0.5 rounded border border-border-base">
                        <HardDrive className="w-3 h-3 text-accent-rust" /> {currentMetrics.ram}%
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative flex-grow mt-2 min-h-[140px] w-full px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={liveData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-base)" opacity={0.4} />
                <XAxis 
                    dataKey="time" 
                    hide={true} 
                />
                <YAxis 
                    domain={['auto', 'auto']} 
                    hide={true}
                    padding={{ top: 20, bottom: 0 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border-base)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                    type="monotone" 
                    dataKey="rps" 
                    stroke="var(--color-primary-500)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRps)" 
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
