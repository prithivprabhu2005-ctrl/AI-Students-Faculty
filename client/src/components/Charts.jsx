import React from 'react';

// ──────────────────────────────────────────────────────────
// 1. BAR CHART (SVG Responsive)
// Renders vertical bar charts with grid lines, axis labels, & tooltips
// ──────────────────────────────────────────────────────────
export const BarChart = ({ data = [], xKey = 'label', yKey = 'value', height = 240, barColor = '#3b82f6', title }) => {
  if (!data || data.length === 0) {
    return <div style={noDataStyle}>No chart data available.</div>;
  }

  const maxValue = Math.max(...data.map(d => Number(d[yKey]) || 0), 10);
  const padding = 35;
  const svgWidth = 500;
  const svgHeight = height;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;
  const barWidth = Math.min(chartWidth / data.length - 12, 45);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {title && <h4 style={chartTitleStyle}>{title}</h4>}
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: `${height}px`, background: 'transparent' }}>
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + chartHeight * (1 - ratio);
          const val = Math.round(maxValue * ratio);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#334155" strokeDasharray="3 3" />
              <text x={padding - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">{val}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const val = Number(item[yKey]) || 0;
          const barH = (val / maxValue) * chartHeight;
          const x = padding + index * (chartWidth / data.length) + (chartWidth / data.length - barWidth) / 2;
          const y = padding + chartHeight - barH;
          const color = item.color || barColor;

          return (
            <g key={index} className="chart-bar-group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={color}
                rx="6"
                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                fill="#f8fafc"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {val}
              </text>
              <text
                x={x + barWidth / 2}
                y={svgHeight - 10}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
              >
                {String(item[xKey] || '').slice(0, 8)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// 2. DONUT CHART (SVG Responsive)
// Renders donut/pie charts with custom colors and center label
// ──────────────────────────────────────────────────────────
export const DonutChart = ({ data = [], size = 180, title }) => {
  if (!data || data.length === 0) {
    return <div style={noDataStyle}>No chart data available.</div>;
  }

  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  let cumulativeAngle = 0;
  const radius = size * 0.35;
  const strokeWidth = size * 0.15;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      {title && <h4 style={chartTitleStyle}>{title}</h4>}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {total === 0 ? (
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#334155" strokeWidth={strokeWidth} />
          ) : (
            data.map((item, i) => {
              const val = Number(item.value) || 0;
              const pct = val / total;
              const strokeDasharray = `${pct * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativeAngle * circumference;
              cumulativeAngle += pct;

              return (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={item.color || '#3b82f6'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${center} ${center})`}
                  style={{ transition: 'all 0.4s ease' }}
                />
              );
            })
          )}
        </svg>

        <div style={centerTextStyle}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>{total}</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color || '#3b82f6' }} />
            <span>{item.label}: <strong style={{ color: '#f8fafc' }}>{item.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// 3. LINE / TREND CHART (SVG Responsive)
// Renders smooth line charts with fill area and data points
// ──────────────────────────────────────────────────────────
export const LineChart = ({ data = [], xKey = 'label', yKey = 'value', height = 220, strokeColor = '#10b981', title }) => {
  if (!data || data.length === 0) {
    return <div style={noDataStyle}>No trend data available.</div>;
  }

  const maxValue = Math.max(...data.map(d => Number(d[yKey]) || 0), 10);
  const padding = 35;
  const svgWidth = 500;
  const svgHeight = height;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const points = data.map((item, i) => {
    const x = padding + i * (chartWidth / (data.length - 1 || 1));
    const y = padding + chartHeight - ((Number(item[yKey]) || 0) / maxValue) * chartHeight;
    return { x, y, val: item[yKey], label: item[xKey] };
  });

  const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1]?.x} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {title && <h4 style={chartTitleStyle}>{title}</h4>}
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: `${height}px` }}>
        {/* Y-axis grid lines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = padding + chartHeight * (1 - ratio);
          return (
            <line key={i} x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#334155" strokeDasharray="3 3" />
          );
        })}

        {/* Gradient area */}
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill={strokeColor} stroke="#0f172a" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} fill="#f8fafc" fontSize="10" fontWeight="600" textAnchor="middle">{p.val}</text>
            <text x={p.x} y={svgHeight - 8} fill="#94a3b8" fontSize="10" textAnchor="middle">{String(p.label).slice(0, 8)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// 4. PROGRESS RING CHART (Faculty Performance Score & Attendance)
// ──────────────────────────────────────────────────────────
export const ProgressRing = ({ score = 0, max = 100, size = 140, label = 'Score', color = '#3b82f6' }) => {
  const radius = size * 0.38;
  const strokeWidth = size * 0.12;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score / max, 0), 1);
  const strokeDashoffset = circumference - pct * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div style={centerTextStyle}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>{score}</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ {max}</span>
        </div>
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>{label}</span>
    </div>
  );
};

// ── Shared Chart Component Styles ──
const noDataStyle = {
  padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem'
};

const chartTitleStyle = {
  fontFamily: 'var(--font-title)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-main)'
};

const centerTextStyle = {
  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
};
