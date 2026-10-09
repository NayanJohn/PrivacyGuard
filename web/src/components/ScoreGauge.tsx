import React from 'react';
import { getRiskBand } from '../lib/wording';

interface ScoreGaugeProps {
  score: number;
  riskLabel?: string;
  size?: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  riskLabel,
  size = 220,
}) => {
  const risk = getRiskBand(score);
  const displayLabel = riskLabel || risk.label;

  // Arc calculation for SVG circular meter
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Score 0 to 100 maps to strokeDashoffset
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  return (
    <div
      role="img"
      aria-label={`Privacy risk score ${score} out of 100, ${displayLabel}`}
      className="flex flex-col items-center justify-center relative p-2"
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] overflow-visible"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Dynamic Score Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={risk.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 12px ${risk.color}88)`,
            }}
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-white">
            {score}
          </span>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400 mt-0.5">
            / 100 Risk Index
          </span>
        </div>
      </div>

      {/* Risk Band Badge */}
      <div className="mt-3 text-center">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border tracking-wide ${risk.textColor}`}
          style={{
            borderColor: `${risk.color}66`,
            backgroundColor: `${risk.color}15`,
            boxShadow: `0 0 20px ${risk.color}22`,
          }}
        >
          {displayLabel}
        </span>
        <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
          {risk.description}
        </p>
      </div>
    </div>
  );
};
