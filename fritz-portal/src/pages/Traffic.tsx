import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import StatTile from '../components/StatTile';
import { useI18n } from '../i18n';

interface Counter {
  name: string;
  received: number;
  sent: number;
  onlineTime: string;
  connections: number;
}

interface TrafficProps {
  sid: string;
}

export default function Traffic({ sid }: TrafficProps) {
  const { t } = useI18n();
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bytesAvailable, setBytesAvailable] = useState(true);
  const [diagResult, setDiagResult] = useState<Record<string,string> | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const headers = { 'X-Fritz-SID': sid };

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await apiFetch('/api/fritz/traffic-counters', { headers });
      const data = await r.json();
      const rows: Counter[] = data.rows || (Array.isArray(data) ? data : []);
      if (rows.length > 0) {
        setCounters(rows);
        const allZero = rows.every(c => c.received === 0 && c.sent === 0);
        setBytesAvailable(!allZero);
      } else {
        setError(data.debug ? `Server: ${data.debug}` : t('traffic.error.noCounters'));
      }
    } catch {
      setError(t('traffic.error.fetch'));
    } finally {
      setLoading(false);
    }
  };

  const runDiag = async () => {
    setDiagLoading(true);
    try {
      const r = await apiFetch('/api/fritz/traffic-raw', { headers });
      setDiagResult(await r.json());
    } catch { setDiagResult({ error: 'Fetch fehlgeschlagen' }); }
    finally { setDiagLoading(false); }
  };

  const fmtBytes = (bytes: number) => {
    if (bytes <= 0) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="terminal-cursor">$ {t('app.loading')}<span className="blink">\u25ae</span></span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>{t('page.traffic.title')}</h2>
        <p>\u2500\u2500 {t('page.traffic.sub')}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!bytesAvailable && counters.length > 0 && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          marginBottom: 18,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>{t('traffic.unavailable')}</strong> – {t('traffic.unavailable.body')}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={runDiag}
              disabled={diagLoading}
              className="btn btn-outline"
              style={{ padding: '5px 12px', fontSize: 12 }}
            >
              {diagLoading ? t('traffic.diag.busy') : t('traffic.diag')}
            </button>
          </div>
        </div>
      )}

      {diagResult && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 18, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <strong style={{ display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>┃ {t('traffic.diag.result')}</strong>
          {Object.entries(diagResult).map(([k, v]) => {
            const str = typeof v === 'string' ? v : JSON.stringify(v);
            return (
              <div key={k} style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{k}: </span>
                <span style={{ color: str.includes('GB') || str.includes('"grossbytes') ? 'var(--success)' : 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {str.substring(0, 300)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {counters.length > 0 ? (
        <>
          {/* Summary tiles for the first entry (Heute) */}
          {counters[0] && (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <StatTile label={t('traffic.tile.todayRx')}  value={fmtBytes(counters[0].received)} accent="var(--accent)" />
              <StatTile label={t('traffic.tile.todayTx')}  value={fmtBytes(counters[0].sent)}     accent="var(--success)" />
              <StatTile label={t('traffic.tile.online')}   value={counters[0].onlineTime}         accent="var(--warning)" />
              {counters[3] && (
                <StatTile label={t('traffic.tile.monthAll')} value={fmtBytes(counters[3].received + counters[3].sent)} accent="var(--info-pink)" />
              )}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3>{t('traffic.counters')}</h3>
              <button onClick={load} className="btn btn-outline" style={{ padding: '5px 12px', fontSize: 12 }}>
                {t('traffic.reload')}
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('traffic.col.period')}</th>
                    <th>{t('traffic.col.onlineTime')}</th>
                    <th>{t('traffic.col.total')}</th>
                    <th style={{ color: 'var(--accent)' }}>{t('traffic.col.rx')}</th>
                    <th style={{ color: 'var(--success)' }}>{t('traffic.col.tx')}</th>
                    <th>{t('traffic.col.conn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {counters.map((c, i) => (
                    <tr key={i} style={{ fontWeight: i === 0 ? 600 : 400 }}>
                      <td>{c.name}</td>
                      <td>{c.onlineTime}</td>
                      <td>{fmtBytes(c.received + c.sent)}</td>
                      <td style={{ color: 'var(--accent)' }}>{fmtBytes(c.received)}</td>
                      <td style={{ color: 'var(--success)' }}>{fmtBytes(c.sent)}</td>
                      <td>{c.connections}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Keine Zählerdaten verf{'\u00fc'}gbar. Bitte Konsole / Log auf <code>traffic-counters raw</code> prüfen.
          </div>
        </div>
      )}
    </div>
  );
}
