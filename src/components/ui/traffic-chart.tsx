import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

type TimeRange = '1h' | '24h' | '10d' | '30d';

export function TrafficChart() {
  const [range, setRange] = useState<TimeRange>('1h');
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  const [totalRequests, setTotalRequests] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchMetrics = async (selectedRange: TimeRange, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/system/metrics?range=${selectedRange}`);
      if (res.ok) {
        const data = await res.json();
        setTotalRequests(data.total);
        setDataPoints(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(range);
    
    // Poll every 15 seconds to update real-time graph
    const interval = setInterval(() => fetchMetrics(range, true), 15000);
    return () => clearInterval(interval);
  }, [range]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const maxVal = Math.max(...dataPoints, 100); // minimum scale
  const minVal = 0;

  // Generate SVG path
  const width = 400;
  const height = 120;
  const dx = width / Math.max(dataPoints.length - 1, 1);
  
  const points = dataPoints.length > 0 ? dataPoints.map((val, i) => {
    const x = i * dx;
    const y = height - ((val - minVal) / (maxVal - minVal)) * height;
    return `${x},${y}`;
  }) : [`0,${height}`, `${width},${height}`];

  const pathD = `M0,${height} L${points.join(' L')} L${width},${height} Z`;
  const lineD = `M${points.join(' L')}`;

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

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden group rounded-2xl border border-border-base bg-surface-base shadow-sm">
      {/* Header Info */}
      <div className="px-5 pt-5 pb-2 relative z-10 flex flex-col gap-1">
        <div className="flex justify-between items-center w-full">
          <p className="text-[13px] text-text-muted font-medium">Total requests • {rangeLabels[range]}</p>
          
          <div className="relative" ref={dropdownRef}>
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="text-text-muted hover:text-text-main cursor-pointer tracking-widest leading-none font-bold pb-2"
            >
              ...
            </div>
            
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-surface-base border border-border-base rounded-lg shadow-lg z-50 overflow-hidden text-sm">
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
        
        <div className="flex items-baseline gap-3 min-h-[36px]">
          {loading && totalRequests === null ? (
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          ) : (
            <>
              <h3 className="text-3xl font-bold text-text-main tracking-tight">
                {totalRequests !== null ? formatNumber(totalRequests) : '0'}
              </h3>
              {/* Note: Cloudflare shows percentage compared to previous period, we just hide it if we don't calculate it */}
              <span className="text-[13px] font-medium text-emerald-500 flex items-center gap-0.5 opacity-0">
                0%
              </span>
            </>
          )}
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative flex-grow mt-2 min-h-[120px] w-full">
        {/* Y Axis grid lines & labels */}
        <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-0 px-5 pointer-events-none z-0">
          {[maxVal, Math.floor(maxVal * 0.66), Math.floor(maxVal * 0.33), 0].map((val, i) => (
            <div key={i} className="flex justify-between items-center w-full h-[1px] bg-border-base/40">
              <span className="text-[10px] text-text-muted/60 bg-surface-base pr-2 translate-y-[-50%] absolute right-4">{val}</span>
            </div>
          ))}
        </div>

        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute bottom-0 z-10">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={pathD} fill="url(#chartGradient)" />
          <path d={lineD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
