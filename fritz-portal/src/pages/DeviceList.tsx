import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { getApiCache, setApiCache } from '../App';
import StatTile from '../components/StatTile';
import { useI18n } from '../i18n';

interface Host {
  mac: string;
  ip: string;
  active: boolean;
  name: string;
  interface: string;
  addressSource?: string;
  lastActivity?: string;
  connType?: 'LAN' | 'WLAN';
  connDetail?: string;
  connSpeed?: string;
  connDisplay?: string;
}

interface IpStats {
  total: number;
  used: number;
  free: number;
  minAddress: string;
  maxAddress: string;
}

interface DeviceListProps {
  sid: string;
  onSelectDevice: (mac: string) => void;
}

export default function DeviceList({ sid, onSelectDevice }: DeviceListProps) {
  const { t } = useI18n();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [ipStats, setIpStats] = useState<IpStats>({ total: 0, used: 0, free: 0, minAddress: '', maxAddress: '' });
  const [freeIpNumbers, setFreeIpNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'status' | 'ip' | 'connection'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const headers = { 'X-Fritz-SID': sid };

  const handleSort = (field: 'name' | 'status' | 'ip' | 'connection') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getSortIndicator = (field: string) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  useEffect(() => {
    if (!dataLoaded) {
      loadDevices();
    }
  }, [dataLoaded]);

  const loadDevices = async () => {
    try {
      const cachedHosts = getApiCache('hosts');
      const cachedIpStats = getApiCache('ip-stats');

      if (cachedHosts) {
        const usedNumbers = new Set(
          cachedHosts
            .filter((h: Host) => h.ip)
            .map((h: Host) => {
              const parts = h.ip.split('.');
              return parseInt(parts[parts.length - 1], 10);
            })
        );
        setHosts(cachedHosts);
        
        if (cachedIpStats) {
          setIpStats(cachedIpStats);
          const minNum = parseInt(cachedIpStats.minAddress?.split('.')[3] || '0', 10);
          const maxNum = parseInt(cachedIpStats.maxAddress?.split('.')[3] || '255', 10);
          const freeIps: number[] = [];
          for (let i = minNum; i <= maxNum && freeIps.length < 5; i++) {
            if (!usedNumbers.has(i)) {
              freeIps.push(i);
            }
          }
          setFreeIpNumbers(freeIps);
        }
      }

      const [hostsRes, ipRes] = await Promise.all([
        apiFetch('/api/fritz/hosts', { headers }),
        apiFetch('/api/fritz/ip-stats', { headers }),
      ]);
      const [data, ipData] = await Promise.all([hostsRes.json(), ipRes.json()]);

      setApiCache('hosts', data);
      setApiCache('ip-stats', ipData);

      setHosts(data);
      setIpStats(ipData);
      setDataLoaded(true);
      const usedNumbers = new Set(
        data
          .filter((h: Host) => h.ip)
          .map((h: Host) => {
            const parts = h.ip.split('.');
            return parseInt(parts[parts.length - 1], 10);
          })
      );
      
      const getLastOctet = (ip: string) => {
        const parts = ip.split('.');
        return parseInt(parts[parts.length - 1], 10);
      };
      
      const minNum = getLastOctet(ipData.minAddress);
      const maxNum = getLastOctet(ipData.maxAddress);
      const freeIps: number[] = [];
      
      for (let i = minNum; i <= maxNum && freeIps.length < 5; i++) {
        if (!usedNumbers.has(i)) {
          freeIps.push(i);
        }
      }
      
      setFreeIpNumbers(freeIps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = hosts.filter(h =>
    (h.name || '').toLowerCase().includes(search.toLowerCase()) ||
    h.ip.includes(search) ||
    h.mac.toLowerCase().includes(search.toLowerCase())
  );

  const formatLastActivity = (ts: string | undefined) => {
    if (!ts) return '';
    const n = parseInt(ts, 10);
    if (!n) return '';
    const diff = Math.floor((Date.now() / 1000) - n);
    if (diff < 60)    return t('devices.lastActivity.now');
    if (diff < 3600)  return t('devices.lastActivity.min', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('devices.lastActivity.h',   { n: Math.floor(diff / 3600) });
    return t('devices.lastActivity.d', { n: Math.floor(diff / 86400) });
  };

  const isWlan = (h: Host) => {
    if (h.connType === 'WLAN') return true;
    if (h.connType === 'LAN')  return false;
    const s = String(h.interface || '').toLowerCase();
    return s.includes('wlan') || s.includes('802');
  };

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'name':
        cmp = (a.name || 'Unbekannt').localeCompare(b.name || 'Unbekannt');
        break;
      case 'status':
        cmp = (a.active ? 1 : 0) - (b.active ? 1 : 0);
        break;
      case 'ip': {
        const ipNum = (ip: string) =>
          ip.split('.').reduce((acc, p) => acc * 256 + (parseInt(p, 10) || 0), 0);
        cmp = ipNum(a.ip || '0.0.0.0') - ipNum(b.ip || '0.0.0.0');
        break;
      }
      case 'connection':
        cmp = (isWlan(a) ? 'wlan' : 'lan').localeCompare(isWlan(b) ? 'wlan' : 'lan');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const onlineCount = hosts.filter(h => h.active).length;
  const offlineCount = hosts.filter(h => !h.active).length;

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
        <h2>{t('page.devices.title')}</h2>
        <p>
          {ipStats.total > 0
            ? <>\u2500\u2500 {t('page.devices.sub.ip', { total: ipStats.total, used: ipStats.used, free: ipStats.free })}</>
            : <>\u2500\u2500 {t('page.devices.sub.hosts', { total: hosts.length, online: onlineCount, offline: offlineCount })}</>
          }
        </p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatTile label={t('tile.total')}   value={hosts.length} />
        <StatTile label={t('tile.online')}  value={onlineCount}  accent="var(--success)" />
        <StatTile label={t('tile.offline')} value={offlineCount} accent="var(--warning)" />
        <StatTile
          label={t('tile.freeIps')}
          value={freeIpNumbers.length > 0 ? freeIpNumbers.join(' ') : '\u2014'}
          accent="var(--info-cyan)"
          style={{ wordBreak: 'break-word' }}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('devices.all')}</h3>
          <input
            type="text"
            placeholder={t('devices.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 3,
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              width: 260,
              letterSpacing: 0.3,
            }}
          />
        </div>
        <div className="card-body">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>{t('devices.col.status')}{getSortIndicator('status')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>{t('devices.col.name')}{getSortIndicator('name')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ip')}>{t('devices.col.ip')}{getSortIndicator('ip')}</th>
                  <th>{t('devices.col.mac')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('connection')}>{t('devices.col.conn')}{getSortIndicator('connection')}</th>
                  <th>{t('devices.col.lastSeen')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((host, i) => (
                  <tr key={i} onClick={() => onSelectDevice(host.mac)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className={`status-dot ${host.active ? 'online' : 'offline'}`} />
                      {host.active ? t('devices.status.online') : t('devices.status.offline')}
                    </td>
                    <td className="device-name">{host.name || t('devices.lastActivity.unknown')}</td>
                    <td>
                      {host.ip ? (
                        <>
                          <a
                            href={`http://${host.ip}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                            title={`${host.ip} im Browser öffnen`}
                          >
                            {host.ip}
                          </a>
                          {host.addressSource === 'Static' && (
                            <span title="Feste IP-Adresse" style={{
                              marginLeft: 6, fontSize: 10, fontWeight: 600, padding: '1px 5px',
                              borderRadius: 3, background: 'var(--accent-dim)', color: 'var(--accent)',
                              border: '1px solid var(--accent-soft)', verticalAlign: 'middle',
                              fontFamily: 'var(--font-mono)', letterSpacing: 0.5,
                            }}>{t('devices.fixed')}</span>
                          )}
                        </>
                      ) : '—'}
                    </td>
                    <td className="device-mac">{host.mac}</td>
                    <td>
                      {(() => {
                        const wlan = isWlan(host);
                        const color = wlan ? 'var(--info-cyan)' : 'var(--accent)';
                        const icon = wlan ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill={color} />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                            <rect x="1" y="6" width="22" height="12" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                        );
                        // Anzeigetext: vorgeformatierter connDisplay aus netDev hat Vorrang
                        let label = host.connDisplay || '';
                        if (!label) {
                          const prefix = wlan ? 'WLAN' : 'LAN';
                          const parts = [host.connDetail ? `${prefix} ${host.connDetail}` : prefix];
                          if (host.connSpeed) parts.push(host.connSpeed);
                          label = parts.join(' → ');
                        }
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color }}>
                            {icon}
                            <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {host.active
                        ? (formatLastActivity(host.lastActivity) || '—')
                        : (formatLastActivity(host.lastActivity) || t('devices.lastActivity.unknown'))}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>
                      {t('devices.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
