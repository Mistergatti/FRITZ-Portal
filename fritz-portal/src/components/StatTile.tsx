import { ReactNode, CSSProperties } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
  accent?: string;          // CSS color (use a var(--*) string)
  sparkPath?: string;
  sparkFill?: string;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
}

export default function StatTile({
  label,
  value,
  unit,
  hint,
  accent = 'var(--accent)',
  sparkPath,
  sparkFill,
  onClick,
  title,
  style,
}: StatTileProps) {
  return (
    <div
      className={`stat-tile ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      title={title}
      style={style}
    >
      <span className="tick tl" style={{ color: accent }}>┌</span>
      <span className="tick tr" style={{ color: accent }}>┐</span>
      <span className="tick bl" style={{ color: accent }}>└</span>
      <span className="tick br" style={{ color: accent }}>┘</span>

      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>

      {sparkPath && (
        <svg className="spark" viewBox="0 0 120 24" preserveAspectRatio="none">
          {sparkFill && <path d={sparkFill} fill={accent} opacity="0.14" />}
          <path d={sparkPath} fill="none" stroke={accent} strokeWidth="1.3" />
        </svg>
      )}

      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
