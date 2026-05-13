import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

interface StatusLineProps {
  authenticated: boolean;
  uptime?: number | null;        // seconds
  firmware?: string | null;
  load?: string | null;          // "0.23 / 0.41 / 0.18"
  wanIp?: string | null;
  recording?: boolean;
}

function formatUptime(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '-';
  const d  = Math.floor(sec / 86400);
  const h  = Math.floor((sec % 86400) / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatClock(d: Date, lang: 'de' | 'en'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const mon = pad(d.getMonth() + 1);
  const yr  = String(d.getFullYear()).slice(-2);
  const date = lang === 'en' ? `${yr}-${mon}-${day}` : `${day}.${mon}.${yr}`;
  return `${date}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function StatusLine({
  authenticated,
  uptime,
  firmware,
  load,
  wanIp,
  recording = true,
}: StatusLineProps) {
  const { t, lang } = useI18n();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="status-line">
      <span>
        <span className={`dot ${authenticated ? '' : 'bad'}`}>●</span>
        {authenticated ? t('status.sid.ok') : t('status.sid.exp')}
      </span>
      <span>{t('status.uptime')} <span className="val">{formatUptime(uptime)}</span></span>
      <span>{t('status.fw')} <span className="val">{firmware || '—'}</span></span>
      <span className="slot-load">{t('status.load')} <span className="val">{load || '— / — / —'}</span></span>
      <span className="slot-wan">{t('status.wan')} <span className="accent">{wanIp || '—'}</span></span>
      <span className="clock slot-clock">
        {formatClock(now, lang)}
        <span className={`dot ${recording ? '' : 'bad'}`} style={{ marginLeft: 8 }}>●</span>
        {t('status.rec')}
      </span>
    </div>
  );
}
