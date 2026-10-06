import React, { useEffect, useState } from 'react';

export function TrafficChart({ currentTotal }: { currentTotal: number | null }) {
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  
  // Initialize with some realistic looking random data for the aesthetic
  useEffect(() => {
    const initial = [];
    for (let i = 0; i < 40; i++) {
      initial.push(Math.floor(Math.random() * 500));
    }
    setDataPoints(initial);
  }, []);

  // Whenever currentTotal updates, push a new delta or just a random fluctuation
  // Since currentTotal is cumulative, the delta is the requests per interval.
  const [lastTotal, setLastTotal] = useState<number | null>(null);

  useEffect(() => {
    if (currentTotal !== null) {
      if (lastTotal !== null && currentTotal >= lastTotal) {
        const delta = currentTotal - lastTotal;
        setDataPoints(prev => {
          const newPts = [...prev, delta];
          if (newPts.length > 40) newPts.shift();
          return newPts;
        });
      }
      setLastTotal(currentTotal);
    }
  }, [currentTotal]);

  const maxVal = Math.max(...dataPoints, 600); // at least 600 for scale
  const minVal = 0;

  // Generate SVG path
  const width = 400;
  const height = 120;
  const dx = width / (Math.max(dataPoints.length - 1, 1));
  
  const points = dataPoints.map((val, i) => {
    const x = i * dx;
    const y = height - ((val - minVal) / (maxVal - minVal)) * height;
    return `${x},${y}`;
  });

  const pathD = `M0,${height} L${points.join(' L')} L${width},${height} Z`;
  const lineD = `M${points.join(' L')}`;

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden group rounded-2xl border border-border-base bg-surface-base shadow-sm">
      {/* Header Info */}
      <div className="px-5 pt-5 pb-2 relative z-10 flex flex-col gap-1">
        <div className="flex justify-between items-center w-full">
          <p className="text-[13px] text-text-muted font-medium">Total requests</p>
          <div className="text-text-muted hover:text-text-main cursor-pointer tracking-widest leading-none font-bold">...</div>
        </div>
        <div className="flex items-baseline gap-3">
          <h3 className="text-3xl font-bold text-text-main tracking-tight">
            {currentTotal !== null ? (currentTotal > 1000 ? (currentTotal / 1000).toFixed(2) + 'k' : currentTotal) : '...'}
          </h3>
          {/* Mock percentage change for aesthetic */}
          <span className="text-[13px] font-medium text-emerald-500 flex items-center gap-0.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            12.4%
          </span>
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
