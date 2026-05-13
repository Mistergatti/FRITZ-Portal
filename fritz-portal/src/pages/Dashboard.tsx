import { useState, useEffect, useRef, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { apiFetch } from '../lib/apiFetch';
import { getApiCache, setApiCache } from '../App';
import StatTile from '../components/StatTile';
import TerminalPanel from '../components/TerminalPanel';
import { useI18n } from '../i18n';

interface Host {
  mac: string;
  ip: string;
  active: boolean;
  name: string;
  interface?: string;
  connType?: 'LAN' | 'WLAN';
  connDetail?: string;
  connSpeed?: string;
  connDisplay?: string;
}

interface NetworkData {
  time: string;
  download: number;
  upload: number;
}

interface DashboardProps {
  sid: string;
}

type EcoModal = 'cpu' | 'ram' | 'temp' | null;

const MAX_POINTS = 60;

// ── Eco-History Modal ──────────────────────────────────────────────────────────
function EcoHistoryModal({ type, sid, onClose }: { type: EcoModal; sid: string; onClose: () => void }) {
  const { t } = useI18n();
  const [data, setData] = useState<{ time: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { 'X-Fritz-SID': sid };

  const labels: Record<NonNullable<EcoModal>, { titleKey: string; unit: string; color: string }> = {
    cpu:  { titleKey: 'eco.history.cpu',  unit: '%',  color: 'var(--warning)' },
    ram:  { titleKey: 'eco.history.ram',  unit: '%',  color: 'var(--info-cyan)' },
    temp: { titleKey: 'eco.history.temp', unit: '°C', color: 'var(--info-pink)' },
  };

  useEffect(() => {
    apiFetch('/api/fritz/eco-history', { headers })
      .then(r => r.json())
      .then(d => { if (type) setData(d[type] || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  if (!type) return null;
  const { titleKey, unit, color } = labels[type];
  const title = t(titleKey);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#2a323e' : '#d8dde5';
  const textColor = isDark ? '#8390a3' : '#5a6678';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span><span className="title">{title}</span> <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{t('eco.history.title')}</span></span>
          <button className="modal-close" onClick={onClose}>[ ✕ ]</button>
        </div>
        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <span className="terminal-cursor">$ {t('app.loading')}<span className="blink">▮</span></span>
            </div>
          ) : data.length < 2 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              {t('eco.history.empty')}<br />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('eco.history.hint')}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="2 5" stroke={gridColor} vertical={false} />
                <XAxis dataKey="time" stroke={textColor} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false}
                  interval={Math.max(1, Math.floor(data.length / 8))} />
                <YAxis stroke={textColor} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false}
                  label={{ value: unit, angle: -90, position: 'insideLeft', style: { fill: textColor, fontSize: 10, fontFamily: 'var(--font-mono)' } }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: `1px solid ${gridColor}`, borderRadius: 3, fontSize: 13, fontFamily: 'var(--font-mono)' }}
                  formatter={(v: number) => [`${v}${unit}`, title]}
                />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// Build a sparkline `d` attribute from a series (0..max scaled into 120×24)
function buildSpark(series: number[]): { line: string; fill: string } | null {
  if (series.length < 2) return null;
  const max = Math.max(...series, 1);
  const min = 0;
  const span = max - min || 1;
  const W = 120, H = 24;
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - ((v - min) / span) * (H - 2) - 1;
    return [x, y];
  });
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fill = `${line} L${W},${H} L0,${H} Z`;
  return { line, fill };
}

export default function Dashboard({ sid }: DashboardProps) {
  const { t } = useI18n();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [networkData, setNetworkData] = useState<NetworkData[]>([]);
  const [ecoStats, setEcoStats] = useState<any>(null);
  const [traffic, setTraffic] = useState({ currentDown: 0, currentUp: 0, totalDown: 0, totalUp: 0 });
  const [monthlyDown, setMonthlyDown] = useState(0);
  const [monthlyUp, setMonthlyUp] = useState(0);
  const [ipStats, setIpStats] = useState({ total: 0, used: 0, free: 0, minAddress: '', maxAddress: '' });
  const [hostsTotal, setHostsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ecoModal, setEcoModal] = useState<EcoModal>(null);
  const [ecoHistory, setEcoHistory] = useState<{ cpu: number[]; ram: number[]; temp: number[] }>(() => {
    const cached = (window as any).__ecoSparkHistory || { cpu: [], ram: [], temp: [] };
    return cached;
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = { 'X-Fritz-SID': sid };
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#2a323e' : '#d8dde5';
  const textColor = isDark ? '#8390a3' : '#5a6678';

  useEffect(() => {
    loadData();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pushEcoPoint = (s: any) => {
    const cpu = Number(s?.cpu) || 0;
    const ram = Number(s?.ram) || 0;
    const temp = Number(s?.cpu_temp ?? s?.temperature) || 0;
    setEcoHistory(prev => {
      const next = {
        cpu:  [...prev.cpu,  cpu].slice(-MAX_POINTS),
        ram:  [...prev.ram,  ram].slice(-MAX_POINTS),
        temp: [...prev.temp, temp].slice(-MAX_POINTS),
      };
      (window as any).__ecoSparkHistory = next;
      return next;
    });
  };

  const loadData = async () => {
    try {
      // ── 1. Cache sofort anzeigen ──────────────────────────────────────────
      const cachedDeviceInfo = getApiCache('device-info');
      const cachedHosts = getApiCache('hosts');
      const cachedEcoStats = getApiCache('eco-stats');
      const cachedNetworkStats = getApiCache('network-stats');
      const cachedIpStats = getApiCache('ip-stats');

      if (cachedDeviceInfo) setDeviceInfo(cachedDeviceInfo);
      if (cachedHosts) {
        setHostsTotal(cachedHosts.length);
        setHosts(cachedHosts.filter((h: Host) => h.active));
      }
      if (cachedEcoStats) { setEcoStats(cachedEcoStats); pushEcoPoint(cachedEcoStats); }
      if (cachedNetworkStats) setTraffic(cachedNetworkStats);
      if (cachedIpStats) setIpStats(cachedIpStats);

      if (cachedDeviceInfo && cachedHosts) setLoading(false);

      // ── 2. Schnelle Requests zuerst ─────────────────────────────────────────
      const [infoRes, hostsRes, ipStatsRes] = await Promise.all([
        apiFetch('/api/fritz/device-info', { headers }),
        apiFetch('/api/fritz/hosts', { headers }),
        apiFetch('/api/fritz/ip-stats', { headers }),
      ]);

      const info = await infoRes.json();
      const hostList = await hostsRes.json();
      const ipStatsData = await ipStatsRes.json();

      setApiCache('device-info', info);
      setApiCache('hosts', hostList);
      setApiCache('ip-stats', ipStatsData);

      setDeviceInfo(info);
      setHostsTotal(hostList.length);
      setHosts(hostList.filter((h: Host) => h.active));
      setIpStats(ipStatsData);

      setLoading(false);

      // ── 3. Langsame Requests im Hintergrund ─────────────────────────────────
      apiFetch('/api/fritz/eco-stats', { headers })
        .then(r => r.json())
        .then(stats => { setApiCache('eco-stats', stats); setEcoStats(stats); pushEcoPoint(stats); })
        .catch(() => {});

      apiFetch('/api/fritz/network-stats', { headers })
        .then(r => r.json())
        .then(trafficData => {
          setApiCache('network-stats', trafficData);
          setTraffic(trafficData);

          const toMbps = (b: number) => parseFloat(((b * 8) / 1_000_000).toFixed(2));
          const NET_POINTS = 60;

          const existingHistory = (window as any).__networkHistory as NetworkData[] | undefined;
          if (existingHistory && existingHistory.length > 0) {
            setNetworkData(existingHistory);
          } else {
            const dsHist: number[] = trafficData.dsHistory || [];
            const usHist: number[] = trafficData.usHistory || [];
            const now = Date.now();
            const initial: NetworkData[] = Array.from({ length: NET_POINTS }, (_, i) => {
              const offset = NET_POINTS - i;
              const idx = Math.round(dsHist.length - offset * 3);
              return {
                time: new Date(now - offset * 15000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                download: idx >= 0 ? toMbps(dsHist[idx] || 0) : 0,
                upload: idx >= 0 ? toMbps(usHist[idx] || 0) : 0,
              };
            });
            (window as any).__networkHistory = initial;
            setNetworkData(initial);
          }

          // ── 4. Live-Interval ─────────────────────────────────────────────────
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(async () => {
            try {
              const [s, t] = await Promise.all([
                apiFetch('/api/fritz/eco-stats', { headers }).then(r => r.json()),
                apiFetch('/api/fritz/network-stats', { headers }).then(r => r.json()),
              ]);
              setEcoStats(s);
              pushEcoPoint(s);
              setTraffic(t);
              const toMbps2 = (b: number) => parseFloat(((b * 8) / 1_000_000).toFixed(2));
              const newPoint: NetworkData = {
                time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                download: toMbps2(t.currentDown || 0),
                upload: toMbps2(t.currentUp || 0),
              };
              setNetworkData(prev => {
                const next = [...prev.slice(-(NET_POINTS - 1)), newPoint];
                (window as any).__networkHistory = next;
                return next;
              });
            } catch {}
          }, 15000);
        })
        .catch(() => {});

      apiFetch('/api/fritz/traffic-counters', { headers })
        .then(r => r.json())
        .then(countersData => {
          const monthRow = (countersData.rows || []).find((r: any) =>
            r.name && r.name.toLowerCase().includes('monat') && !r.name.toLowerCase().includes('vor')
          );
          if (monthRow) {
            setMonthlyDown(monthRow.received || 0);
            setMonthlyUp(monthRow.sent || 0);
          }
        })
        .catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(2);
  const formatMbps = (bytes: number) => ((bytes * 8) / 1_000_000).toFixed(1);

  const cpuVal  = Number(ecoStats?.cpu) || 0;
  const ramVal  = Number(ecoStats?.ram) || 0;
  const tempVal = Number(ecoStats?.cpu_temp ?? ecoStats?.temperature) || 0;

  const sparkCpu  = useMemo(() => buildSpark(ecoHistory.cpu),  [ecoHistory.cpu]);
  const sparkRam  = useMemo(() => buildSpark(ecoHistory.ram),  [ecoHistory.ram]);
  const sparkTemp = useMemo(() => buildSpark(ecoHistory.temp), [ecoHistory.temp]);

  if (loading) {
    return (
      <div className="loading">
        <span className="terminal-cursor">$ {t('app.loading')}<span className="blink">▮</span></span>
      </div>
    );
  }

  // IP pool progress colour
  const ipUsedPct = ipStats.total > 0 ? (ipStats.used / ipStats.total) * 100 : 0;
  const ipFreePct = ipStats.total > 0 ? (ipStats.free / ipStats.total) * 100 : 100;
  const ipBarClass = ipFreePct < 10 ? 'danger' : ipFreePct < 25 ? 'warn' : '';

  const totalMonth  = (monthlyDown || traffic.totalDown) + (monthlyUp || traffic.totalUp);
  const downMonthGb = formatGB(monthlyDown || traffic.totalDown);
  const upMonthGb   = formatGB(monthlyUp || traffic.totalUp);

  const isWlan = (h: Host) => {
    if (h.connType === 'WLAN') return true;
    if (h.connType === 'LAN')  return false;
    const s = String(h.interface || '').toLowerCase();
    return s.includes('wlan') || s.includes('802');
  };

  const linkLabel = (h: Host) => {
    if (h.connDisplay) {
      // Versuche nur den Speed-Teil zu extrahieren (z.B. "1.0 G" oder "Wi-Fi 6")
      const m = h.connDisplay.match(/(\d+(?:\.\d+)?\s*[GM])/i) || h.connDisplay.match(/Wi-?Fi\s*\d+/i);
      if (m) return m[0];
    }
    if (h.connSpeed) return h.connSpeed;
    return isWlan(h) ? 'Wi-Fi' : 'LAN';
  };

  return (
    <div>
      {ecoModal && <EcoHistoryModal type={ecoModal} sid={sid} onClose={() => setEcoModal(null)} />}

      <div className="page-header">
        <h2>{t('page.dashboard.title')}</h2>
        <p>── {t('page.dashboard.sub')}</p>
      </div>

      <div className="stats-grid">
        <StatTile
          label={t('tile.model')}
          value={deviceInfo?.NewModelName || '—'}
          hint={<>── fritz.box</>}
        />
        <StatTile
          label={t('tile.cpu')}
          value={cpuVal}
          unit="%"
          accent="var(--warning)"
          sparkPath={sparkCpu?.line}
          sparkFill={sparkCpu?.fill}
          onClick={() => setEcoModal('cpu')}
        />
        <StatTile
          label={t('tile.ram')}
          value={ramVal}
          unit="%"
          accent="var(--info-cyan)"
          sparkPath={sparkRam?.line}
          sparkFill={sparkRam?.fill}
          onClick={() => setEcoModal('ram')}
        />
        <StatTile
          label={t('tile.temp')}
          value={tempVal}
          unit="°C"
          accent="var(--info-pink)"
          sparkPath={sparkTemp?.line}
          sparkFill={sparkTemp?.fill}
          onClick={() => setEcoModal('temp')}
        />
        <StatTile
          label={t('tile.hosts')}
          value={hosts.length}
          unit={t('tile.hosts.online')}
          hint={<>── {hostsTotal} {t('tile.hosts.known')}</>}
        />
        <StatTile
          label={t('tile.ipPool')}
          value={ipStats.free}
          unit={t('tile.ipPool.free')}
          hint={
            ipStats.total > 0 ? (
              <div className="tile-progress">
                <div className="bar">
                  <span className={ipBarClass} style={{ width: `${Math.min(100, ipUsedPct)}%` }} />
                </div>
                <div className="caption">{ipStats.used} / {ipStats.total} {t('tile.ipPool.used')}</div>
              </div>
            ) : null
          }
        />
      </div>

      {/* Throughput + Hosts.Active */}
      <div
        className="dashboard-main-row"
        style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginBottom: 18 }}
      >
        <TerminalPanel
          title={t('panel.throughput')}
          subtitle={<span style={{ fontFamily: 'var(--font-mono)' }}>{t('panel.throughput.sub')}</span>}
          right={
            <span style={{ display: 'flex', gap: 18 }}>
              <span><span style={{ color: 'var(--accent)' }}>▰</span> {t('panel.throughput.down')} <strong style={{ color: 'var(--text-primary)' }}>{formatMbps(traffic.currentDown)} Mbit/s</strong></span>
              <span><span style={{ color: 'var(--success)' }}>▰</span> {t('panel.throughput.up')} <strong style={{ color: 'var(--text-primary)' }}>{formatMbps(traffic.currentUp)} Mbit/s</strong></span>
            </span>
          }
          footer={
            <>
              <span>{t('panel.throughput.month')} ↓ <strong>{downMonthGb} GB</strong> ── ↑ <strong>{upMonthGb} GB</strong>{totalMonth > 0 && <> ── Σ <strong>{formatGB(totalMonth)} GB</strong></>}</span>
              <span>{t('panel.throughput.sample', { n: networkData.length })}</span>
            </>
          }
          bodyPadding={0}
        >
          <div style={{ height: 300, padding: '8px 8px 8px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={networkData} margin={{ top: 10, right: 16, bottom: 6, left: 8 }}>
                <defs>
                  <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 5" stroke={gridColor} vertical={false} />
                <XAxis dataKey="time" stroke={textColor} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} interval={11} />
                <YAxis stroke={textColor} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false}
                  label={{ value: 'Mbit/s', angle: -90, position: 'insideLeft', style: { fill: textColor, fontSize: 10, fontFamily: 'var(--font-mono)' } }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: `1px solid ${gridColor}`, borderRadius: 3, fontSize: 13, fontFamily: 'var(--font-mono)' }}
                  formatter={(value: number, name: string) => [`${value} Mbit/s`, name]}
                />
                <Area type="monotone" dataKey="download" stroke="var(--accent)" fill="url(#colorDown)" strokeWidth={1.6} name="Download" isAnimationActive={false} dot={false} />
                <Area type="monotone" dataKey="upload"   stroke="var(--success)" fill="url(#colorUp)"   strokeWidth={1.6} name="Upload"   isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TerminalPanel>

        <TerminalPanel
          title={t('panel.hosts')}
          subtitle={`${hosts.length} ${t('panel.hosts.of')} ${hostsTotal}`}
          right={<span style={{ color: 'var(--text-muted)' }}>{t('panel.hosts.sort')}</span>}
          bodyPadding={0}
        >
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 78px 70px 36px',
              gap: 10,
              padding: '10px 16px 6px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              letterSpacing: 1.2,
              borderBottom: '1px dashed var(--border)',
              fontWeight: 500,
            }}>
              <span>{t('panel.hosts.col.host')}</span><span>{t('panel.hosts.col.ip')}</span><span>{t('panel.hosts.col.link')}</span><span>·</span>
            </div>
            <div>
              {hosts.slice(0, 12).map((host, i) => {
                const ipTail = host.ip ? `.${host.ip.split('.').pop()}` : '—';
                return (
                  <div key={host.mac || i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 78px 70px 36px',
                    gap: 10,
                    padding: '9px 16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12.5,
                    borderBottom: i === Math.min(hosts.length, 12) - 1 ? 'none' : '1px solid var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}>
                    <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      <span style={{ color: 'var(--success)', marginRight: 9 }}>●</span>
                      {host.name || 'unknown'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>{ipTail}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>{linkLabel(host)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>─</span>
                  </div>
                );
              })}
              {hosts.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  ── {t('panel.hosts.empty')} ──
                </div>
              )}
            </div>
          </div>
        </TerminalPanel>
      </div>
    </div>
  );
}
