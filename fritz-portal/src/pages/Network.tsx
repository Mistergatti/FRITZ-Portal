import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { getApiCache, setApiCache } from '../App';
import { useT } from '../lib/i18n';

interface NetworkProps {
  sid: string;
}

type NetworkTab = 'overview' | 'lan' | 'wan' | 'wlan' | 'dhcp';

export default function Network({ sid }: NetworkProps) {
  const t = useT();
  const [tab, setTab] = useState<NetworkTab>('overview');
  const [lanInfo, setLanInfo] = useState<any>(getApiCache('network-lan'));
  const [wanInfo, setWanInfo] = useState<any>(getApiCache('network-wan'));
  const [wlanInfo, setWlanInfo] = useState<any[]>(getApiCache('network-wlan') || []);
  const [dhcpInfo, setDhcpInfo] = useState<any>(getApiCache('network-dhcp'));
  const [meshData, setMeshData] = useState<any>(getApiCache('network-mesh'));
  const hasCache = !!(getApiCache('network-lan') || getApiCache('network-wan'));
  const [loading, setLoading] = useState(!hasCache);
  const [meshLoading, setMeshLoading] = useState(false);

  const headers = { 'X-Fritz-SID': sid };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lanRes, wanRes, wlanRes, dhcpRes] = await Promise.all([
        apiFetch('/api/fritz/network/lan', { headers }),
        apiFetch('/api/fritz/network/wan', { headers }),
        apiFetch('/api/fritz/network/wlan', { headers }),
        apiFetch('/api/fritz/network/dhcp', { headers }),
      ]);

      const lan = await lanRes.json();
      const wan = await wanRes.json();
      const wlan = await wlanRes.json();
      const dhcp = await dhcpRes.json();

      setApiCache('network-lan', lan);
      setApiCache('network-wan', wan);
      setApiCache('network-wlan', wlan);
      setApiCache('network-dhcp', dhcp);

      setLanInfo(lan);
      setWanInfo(wan);
      setWlanInfo(wlan);
      setDhcpInfo(dhcp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    // Mesh parallel nachladen. Wenn schon ein gecachter Stand vorhanden ist,
    // bleibt die Topologie sofort sichtbar – der Refresh läuft transparent im
    // Hintergrund. Nur beim allerersten Aufruf (kein Cache) zeigen wir den
    // Spinner; dort spart der 15s-Timeout-Watchdog endlose Wartezeit, falls die
    // Box den Mesh-Aufbau dehnt (s. CHANGELOG 1.4.x).
    const cachedMesh = getApiCache('network-mesh');
    if (!cachedMesh) {
      setMeshLoading(true);
    }
    const meshTimeout = setTimeout(() => setMeshLoading(false), 15000);
    try {
      const meshRes = await apiFetch('/api/fritz/mesh', { headers });
      const mesh = await meshRes.json();
      setApiCache('network-mesh', mesh);
      setMeshData(mesh);
    } catch {}
    finally {
      clearTimeout(meshTimeout);
      setMeshLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const tabs: { id: NetworkTab; label: string }[] = [
    { id: 'overview', label: t('\u00dcbersicht') },
    { id: 'lan', label: t('LAN') },
    { id: 'wan', label: t('WAN') },
    { id: 'wlan', label: t('WLAN') },
    { id: 'dhcp', label: t('DHCP') },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>{t('Netzwerk')}</h2>
        <p>{t('Netzwerk-Konfiguration und Einstellungen')}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${tab === t.id ? 'var(--accent)' : 'var(--border)'}`,
              background: tab === t.id ? 'var(--accent)' : 'var(--bg-card)',
              color: tab === t.id ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <NetworkOverview lanInfo={lanInfo} wanInfo={wanInfo} wlanInfo={wlanInfo} meshData={meshData} meshLoading={meshLoading} sid={sid} />}
      {tab === 'lan' && <LANSettings lanInfo={lanInfo} />}
      {tab === 'wan' && <WANSettings wanInfo={wanInfo} />}
      {tab === 'wlan' && <WLANSettings wlanInfo={wlanInfo} sid={sid} />}
      {tab === 'dhcp' && <DHCPSettings dhcpInfo={dhcpInfo} sid={sid} />}
    </div>
  );
}

function NetworkOverview({ lanInfo, wanInfo, wlanInfo, meshData, meshLoading, sid }: {
  lanInfo: any; wanInfo: any; wlanInfo: any[];
  meshData: any; meshLoading: boolean; sid: string;
}) {
  const t = useT();
  return (
    <div>
      <div className="stats-grid">
        <div className="card">
          <div className="card-header"><h3>{t('LAN')}</h3></div>
          <div className="card-body">
            <table><tbody>
              <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: 180 }}>{t('Router IP')}</td><td>{lanInfo?.NewIPRouters || '-'}</td></tr>
              <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Subnetzmaske')}</td><td>{lanInfo?.NewSubnetMask || '-'}</td></tr>
              <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('DNS-Server')}</td><td>{lanInfo?.NewDNSServers || '-'}</td></tr>
            </tbody></table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>{t('WAN')}</h3></div>
          <div className="card-body">
            <table><tbody>
              <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: 180 }}>{t('Externe IP')}</td><td>{wanInfo?.NewExternalIPAddress || '-'}</td></tr>
              <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Verbindung')}</td><td>{wanInfo?.NewConnectionStatus || '-'}</td></tr>
              <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Typ')}</td><td>{wanInfo?.NewConnectionType || '-'}</td></tr>
            </tbody></table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>{t('WLAN Netzwerke')}</h3></div>
          <div className="card-body">
            {wlanInfo.map((w, i) => (
              <div key={i} style={{ marginBottom: i < wlanInfo.length - 1 ? 16 : 0, paddingBottom: i < wlanInfo.length - 1 ? 16 : 0, borderBottom: i < wlanInfo.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{w.NewSSID || `WLAN ${i + 1}`}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('Kanal')}: {w.NewChannel || '-'} | {t('Status')}: {w.NewStatus || '-'}</div>
              </div>
            ))}
            {wlanInfo.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>{t('Keine WLAN-Daten verfügbar')}</div>}
          </div>
        </div>
      </div>

      <MeshTopology meshData={meshData} loading={meshLoading} sid={sid} />
    </div>
  );
}

// ── Mesh-Topologie / Netzwerk-Visualisierung ────────────────────────────────

interface MeshNode {
  uid: string;
  name: string;
  mac: string;
  ip: string;
  role: 'master' | 'satellite' | 'client';
  is_meshed: boolean;
  model: string;
  interfaces: { type: string; name: string }[];
  connDetail?: string;
  connSpeed?: string;
  connDisplay?: string;
}

interface MeshLink {
  from: string;
  to: string;
  type: string;
  speed: number;
}

const isWlanType = (type: string) => {
  const t = type.toLowerCase();
  return t.includes('wlan') || t.includes('802') || t.includes('wifi') || t.includes('wireless');
};

const isInfraDevice = (name: string) => {
  const n = name.toLowerCase();
  return n.includes('router') || n.includes('repeater') || n.includes('fritz');
};

function MeshTopology({ meshData, loading, sid }: { meshData: any; loading: boolean; sid: string }) {
  const t = useT();
  const [tooltip, setTooltip] = useState<{ node: MeshNode; x: number; y: number } | null>(null);
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);
  const [showNames, setShowNames] = useState(false);
  const isOriginallyHosts = meshData?._source === 'hosts-fallback';
  const [viewMode, setViewMode] = useState<'mesh' | 'hosts'>(isOriginallyHosts ? 'hosts' : 'mesh');
  const [hostsData, setHostsData] = useState<any>(null);
  const [hostsLoading, setHostsLoading] = useState(false);

  useEffect(() => {
    if (meshData) setViewMode(meshData._source === 'hosts-fallback' ? 'hosts' : 'mesh');
  }, [meshData?._source]);

  const fetchHosts = async () => {
    if (hostsData) return;
    setHostsLoading(true);
    try {
      const res = await apiFetch('/api/fritz/mesh?source=hosts', { headers: { 'X-Fritz-SID': sid } });
      setHostsData(await res.json());
    } catch {} finally { setHostsLoading(false); }
  };

  useEffect(() => {
    if (viewMode === 'hosts' && !hostsData && !isOriginallyHosts) fetchHosts();
  }, [viewMode]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header"><h3>Netzwerk-Topologie</h3></div>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const currentData = viewMode === 'hosts'
    ? (hostsData || (isOriginallyHosts ? meshData : null))
    : (!isOriginallyHosts ? meshData : null);

  const nodes: MeshNode[] = currentData?.nodes || [];
  const links: MeshLink[] = currentData?.links || [];
  const showHostsView = viewMode === 'hosts';

  const toggleBtn = (
    <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <button onClick={() => setViewMode('mesh')} style={{
        padding: '4px 14px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
        background: viewMode === 'mesh' ? 'var(--accent)' : 'transparent',
        color: viewMode === 'mesh' ? '#fff' : 'var(--text-secondary)',
        transition: 'all 0.2s',
      }}>{t('Mesh')}</button>
      <button onClick={() => { setViewMode('hosts'); if (!hostsData && !isOriginallyHosts) fetchHosts(); }} style={{
        padding: '4px 14px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
        background: viewMode === 'hosts' ? 'var(--accent)' : 'transparent',
        color: viewMode === 'hosts' ? '#fff' : 'var(--text-secondary)',
        transition: 'all 0.2s',
      }}>{t('Netzwerk')}</button>
    </div>
  );

  const legendDot = (color: string) => ({ width: 12, height: 10, borderRadius: 3, background: color, display: 'inline-block' });
  const legend = showHostsView ? (
    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={legendDot('#06b6d4')} /> {t('Fritz!Box')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={legendDot('#3b82f6')} /> {t('LAN')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={legendDot('#10b981')} /> {t('WLAN')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={legendDot('#f59e0b')} /> {t('Infrastruktur')}</span>
    </div>
  ) : (
    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={legendDot('#06b6d4')} /> {t('Master')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={legendDot('#f59e0b')} /> {t('Infrastruktur')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={legendDot('#3b82f6')} /> {t('LAN-Client')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={legendDot('#10b981')} /> {t('WLAN-Client')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#3b82f6" strokeWidth="2" /></svg> {t('LAN')}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#10b981" strokeWidth="2" strokeDasharray="6 3" /></svg> {t('WLAN')}
      </span>
    </div>
  );

  if (hostsLoading) {
    return (
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><h3>{t('Netzwerk-Topologie')}</h3>{toggleBtn}</div>
          {legend}
        </div>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><h3>{t('Netzwerk-Topologie')}</h3>{toggleBtn}</div>
          {legend}
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}>
            <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
            <line x1="12" y1="7" x2="5" y2="17" /><line x1="12" y1="7" x2="19" y2="17" />
          </svg>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {viewMode === 'mesh' ? t('Keine Mesh-Daten verfügbar') : t('Keine Netzwerk-Daten verfügbar')}
          </div>
          <div style={{ fontSize: 13 }}>
            {viewMode === 'mesh'
              ? t('Dieses Modell unterstützt möglicherweise kein Mesh. Wechsle zur Netzwerk-Ansicht.')
              : t('Die Geräteliste konnte nicht abgerufen werden.')}
          </div>
        </div>
      </div>
    );
  }

  const roleMeta = (node: MeshNode) => {
    if (node.role === 'master') return { label: 'Fritz!Box', color: '#06b6d4' };
    if (node.role === 'satellite' || isInfraDevice(node.name)) return { label: 'Infrastruktur', color: '#f59e0b' };
    return { label: 'Client', color: 'var(--text-primary)' };
  };
  const tooltipEl = tooltip && (
    <div style={{
      position: 'fixed', left: tooltip.x + 20, top: tooltip.y - 10,
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 16px', boxShadow: 'var(--shadow-lg)', zIndex: 9999, fontSize: 13,
      minWidth: 200, pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{tooltip.node.name}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{t('Rolle')}</span>
        <span style={{ color: roleMeta(tooltip.node).color }}>{t(roleMeta(tooltip.node).label)}</span>
        {tooltip.node.mac && <><span style={{ color: 'var(--text-secondary)' }}>{t('MAC')}</span><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{tooltip.node.mac}</span></>}
        {tooltip.node.ip && <><span style={{ color: 'var(--text-secondary)' }}>{t('IP')}</span><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{tooltip.node.ip}</span></>}
        {tooltip.node.model && <><span style={{ color: 'var(--text-secondary)' }}>{t('Modell')}</span><span>{tooltip.node.model}</span></>}
        {tooltip.node.interfaces?.[0]?.type && <><span style={{ color: 'var(--text-secondary)' }}>{t('Verbindung')}</span><span>{isWlanType(tooltip.node.interfaces[0].type) ? t('WLAN') : t('LAN')}</span></>}
      </div>
    </div>
  );

  // ── Radiales Star-Layout (Netzwerk-Ansicht) ──
  if (showHostsView) {
    const masterNode = nodes.find(n => n.role === 'master') || nodes[0];
    const clientNodes = nodes.filter(n => n.uid !== masterNode.uid);
    const totalClients = clientNodes.length;

    // Knotengröße je nach Anzahl
    const nodeR = totalClients <= 15 ? 18 : totalClients <= 40 ? 14 : totalClients <= 80 ? 10 : 7;
    const labelsVisible = showNames && nodeR >= 10;
    const spacing = Math.max(nodeR * 4, labelsVisible ? 55 : 28);

    // LAN/WLAN/Infra Zuordnung für jeden Client
    const clientMeta = clientNodes.map(n => {
      const link = links.find(l => l.to === n.uid || l.from === n.uid);
      const wlan = link ? isWlanType(link.type) : isWlanType(n.interfaces?.[0]?.type || '');
      const infra = isInfraDevice(n.name);
      return { node: n, isWlan: wlan, isInfra: infra };
    });

    // LAN zuerst, dann WLAN, dann Infra
    const lanClients = clientMeta.filter(c => !c.isWlan && !c.isInfra);
    const wlanClients = clientMeta.filter(c => c.isWlan && !c.isInfra);
    const infraClients = clientMeta.filter(c => c.isInfra);
    const ordered = [...lanClients, ...wlanClients, ...infraClients];

    // Ringe berechnen
    const baseRadius = Math.max(nodeR * 7, 70);
    const ringGap = Math.max(spacing, nodeR * 5);
    const rings: { radius: number; startIdx: number; count: number }[] = [];
    let placed = 0;
    let ringR = baseRadius;
    while (placed < totalClients) {
      const cap = Math.max(6, Math.floor(2 * Math.PI * ringR / spacing));
      const cnt = Math.min(cap, totalClients - placed);
      rings.push({ radius: ringR, startIdx: placed, count: cnt });
      placed += cnt;
      ringR += ringGap;
    }

    const maxR = rings.length > 0 ? rings[rings.length - 1].radius : baseRadius;
    const pad = labelsVisible ? 70 : 45;
    const W = 2 * (maxR + pad + nodeR);
    const H = W;
    const cx = W / 2;
    const cy = H / 2;
    const masterR = 34;

    // Summary
    const lanCount = lanClients.length;
    const wlanCount = wlanClients.length;
    const infraCount = infraClients.length;

    return (
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><h3>{t('Netzwerk-Topologie')}</h3>{toggleBtn}</div>
          {legend}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '12px 16px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>{t('{n} Geräte online').replace('{n}', String(totalClients))}</span>
          <span style={{ color: '#3b82f6' }}>● {t('{n} LAN').replace('{n}', String(lanCount))}</span>
          <span style={{ color: '#10b981' }}>● {t('{n} WLAN').replace('{n}', String(wlanCount))}</span>
          {infraCount > 0 && <span style={{ color: '#f59e0b' }}>● {t('{n} Infrastruktur').replace('{n}', String(infraCount))}</span>}
          <button onClick={() => setShowNames(v => !v)} style={{
            marginLeft: 8, padding: '2px 10px', fontSize: 12, borderRadius: 6,
            border: '1px solid var(--border)', cursor: 'pointer',
            background: showNames ? 'var(--accent)' : 'var(--bg-card)',
            color: showNames ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>{showNames ? t('Namen ✓') : t('Namen')}</button>
        </div>
        <div className="card-body" style={{ padding: 0, position: 'relative', overflowX: 'auto' }}
             onMouseLeave={() => { setTooltip(null); setHoveredUid(null); }}>
          <svg
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{ display: 'block', maxHeight: 700, cursor: 'default' }}
          >
            <defs>
              <radialGradient id="glow-master-r" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Verbindungslinien */}
            {ordered.map((c, i) => {
              let ring: { radius: number; startIdx: number; count: number } | undefined;
              let idxInRing = 0;
              for (const r of rings) {
                if (i >= r.startIdx && i < r.startIdx + r.count) {
                  ring = r;
                  idxInRing = i - r.startIdx;
                  break;
                }
              }
              if (!ring) return null;
              const angle = (2 * Math.PI * idxInRing / ring.count) - Math.PI / 2;
              const nx = cx + ring.radius * Math.cos(angle);
              const ny = cy + ring.radius * Math.sin(angle);
              const isHovered = hoveredUid === c.node.uid;
              const color = c.isInfra ? '#f59e0b' : c.isWlan ? '#10b981' : '#3b82f6';
              const dash = c.isWlan ? '6 3' : '0';
              return (
                <line key={`l-${i}`} x1={cx} y1={cy} x2={nx} y2={ny}
                  stroke={color} strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeDasharray={dash}
                  strokeOpacity={hoveredUid ? (isHovered ? 0.9 : 0.06) : 0.18}
                  style={{ transition: 'stroke-opacity 0.2s' }}
                />
              );
            })}

            {/* Master-Knoten */}
            <g transform={`translate(${cx},${cy})`}>
              <circle cx={0} cy={0} r={masterR + 14} fill="url(#glow-master-r)" />
              <circle cx={0} cy={0} r={masterR} fill="#0e7490" stroke="#06b6d4" strokeWidth="2.5" />
              <text y={-4} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                {masterNode.name.length > 12 ? masterNode.name.slice(0, 10) + '…' : masterNode.name}
              </text>
              {masterNode.ip && <text y={10} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)">{masterNode.ip}</text>}
            </g>

            {/* Client-Knoten */}
            {ordered.map((c, i) => {
              let ring: { radius: number; startIdx: number; count: number } | undefined;
              let idxInRing = 0;
              for (const r of rings) {
                if (i >= r.startIdx && i < r.startIdx + r.count) {
                  ring = r;
                  idxInRing = i - r.startIdx;
                  break;
                }
              }
              if (!ring) return null;
              const angle = (2 * Math.PI * idxInRing / ring.count) - Math.PI / 2;
              const nx = cx + ring.radius * Math.cos(angle);
              const ny = cy + ring.radius * Math.sin(angle);
              const isHovered = hoveredUid === c.node.uid;
              const color = c.isInfra ? '#f59e0b' : c.isWlan ? '#10b981' : '#3b82f6';
              const fillColor = c.isInfra ? '#78350f' : c.isWlan ? '#065f46' : '#1e3a5f';
              return (
                <g key={c.node.uid}
                  transform={`translate(${nx},${ny})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => {
                    setHoveredUid(c.node.uid);
                    const svgEl = (e.currentTarget.closest('svg') as SVGSVGElement);
                    const rect = svgEl.getBoundingClientRect();
                    setTooltip({ node: c.node, x: nx * (rect.width / W) + rect.left, y: ny * (rect.height / H) + rect.top });
                  }}
                  onMouseLeave={() => { setHoveredUid(null); setTooltip(null); }}
                >
                  <circle cx={0} cy={0} r={nodeR + 4} fill={color} fillOpacity={isHovered ? 0.25 : 0} style={{ transition: 'fill-opacity 0.2s' }} />
                  <circle cx={0} cy={0} r={nodeR} fill={fillColor} stroke={color} strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{ transition: 'stroke-width 0.2s' }} />
                  {nodeR >= 10 && (
                    <g fill="none" stroke="white" strokeWidth="1" opacity={0.8}>
                      {c.isWlan ? (
                        <>
                          <path d={`M${-nodeR*0.45} ${nodeR*0.1} Q0 ${-nodeR*0.5} ${nodeR*0.45} ${nodeR*0.1}`} strokeLinecap="round" />
                          <circle cx="0" cy={nodeR*0.3} r={nodeR*0.12} fill="white" stroke="none" />
                        </>
                      ) : (
                        <>
                          <rect x={-nodeR*0.45} y={-nodeR*0.45} width={nodeR*0.9} height={nodeR*0.65} rx={nodeR*0.1} />
                          <line x1={-nodeR*0.2} y1={nodeR*0.2} x2={nodeR*0.2} y2={nodeR*0.2} />
                          <line x1={0} y1={nodeR*0.2} x2={0} y2={nodeR*0.45} />
                        </>
                      )}
                    </g>
                  )}
                  {labelsVisible && (
                    <text y={nodeR + 14} textAnchor="middle" fontSize="10" fill="var(--text-primary)" fontWeight="400">
                      {c.node.name.length > 12 ? c.node.name.slice(0, 10) + '…' : c.node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {tooltipEl}
        </div>
      </div>
    );
  }

  // ── Vertikaler Tree (indentierte Baumansicht) ──
  type TreeNode = MeshNode & {
    children: TreeNode[];
    linkType: string;
    depth: number;
    rowIdx: number;
  };

  const NODE_W = 360;
  const NODE_H = 52;
  const ROW_H = 64;
  const INDENT = 28;
  const PAD_X = 20;
  const PAD_Y = 20;
  const CONNECTOR_OFF = 16;  // x-Offset innerhalb des Eltern-Knotens für die Vertikallinie

  const masterNode = nodes.find(n => n.role === 'master') || nodes[0];
  const byUid = new Map<string, TreeNode>(
    nodes.map(n => [n.uid, { ...n, children: [], linkType: 'LAN', depth: 0, rowIdx: 0 }])
  );
  const parentByChild = new Map<string, { parent: string; type: string }>();
  for (const l of links) {
    if (l.from && l.to && l.from !== l.to && !parentByChild.has(l.to)) {
      parentByChild.set(l.to, { parent: l.from, type: l.type });
    }
  }
  const rootTree = byUid.get(masterNode.uid)!;
  for (const n of nodes) {
    if (n.uid === masterNode.uid) continue;
    const t = byUid.get(n.uid)!;
    const p = parentByChild.get(n.uid);
    const parentUid = p?.parent && byUid.has(p.parent) ? p.parent : masterNode.uid;
    t.linkType = p?.type || (isWlanType(n.interfaces?.[0]?.type || '') ? 'WLAN' : 'LAN');
    byUid.get(parentUid)!.children.push(t);
  }

  const isInfraNode = (n: TreeNode) =>
    n.role === 'satellite' || isInfraDevice(n.name) || n.children.length > 0;

  // Sortierung: Infrastruktur zuerst, dann Name – stabil und vorhersagbar
  const sortChildren = (n: TreeNode) => {
    n.children.sort((a, b) => {
      const ai = isInfraNode(a) ? 0 : 1;
      const bi = isInfraNode(b) ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name, 'de');
    });
    n.children.forEach(sortChildren);
  };
  sortChildren(rootTree);

  // Depth-first flachen, rowIdx und depth zuweisen
  const flat: TreeNode[] = [];
  const flatten = (n: TreeNode, depth: number) => {
    n.depth = depth;
    n.rowIdx = flat.length;
    flat.push(n);
    for (const c of n.children) flatten(c, depth + 1);
  };
  flatten(rootTree, 0);

  const maxDepth = flat.reduce((m, n) => Math.max(m, n.depth), 0);
  const svgW = Math.max(600, PAD_X * 2 + maxDepth * INDENT + NODE_W);
  const svgH = flat.length * ROW_H + PAD_Y * 2;

  const xOf = (n: TreeNode) => PAD_X + n.depth * INDENT;
  const yOf = (n: TreeNode) => PAD_Y + n.rowIdx * ROW_H;

  const styleFor = (n: TreeNode) => {
    if (n === rootTree || n.role === 'master') return { fill: '#0e4d6b', stroke: '#06b6d4' };
    if (isInfraNode(n))                         return { fill: '#783d12', stroke: '#f59e0b' };
    return isWlanType(n.linkType)
      ? { fill: '#064e3b', stroke: '#10b981' }
      : { fill: '#1e3a5f', stroke: '#3b82f6' };
  };

  const infraCount = flat.filter(n => n !== rootTree && isInfraNode(n)).length;
  const clientCount = flat.length - 1 - infraCount;

  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><h3>{t('Mesh-Topologie')}</h3>{toggleBtn}</div>
        {legend}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '10px 16px 2px', fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
        <span>{t('{n} Geräte').replace('{n}', String(flat.length))}</span>
        {infraCount > 0 && <span style={{ color: '#f59e0b' }}>● {t('{n} Infrastruktur').replace('{n}', String(infraCount))}</span>}
        <span style={{ color: 'var(--text-primary)' }}>● {t('{n} Clients').replace('{n}', String(clientCount))}</span>
      </div>
      <div className="card-body" style={{ padding: 0, position: 'relative', overflow: 'auto' }}
           onMouseLeave={() => { setTooltip(null); setHoveredUid(null); }}>
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>
          {/* Vertikale "Pipes" pro Elternknoten (ein Strich von Eltern-Bottom zur Mitte des letzten Kindes) */}
          {flat.map(parent => {
            if (parent.children.length === 0) return null;
            const lastChild = parent.children[parent.children.length - 1];
            const px = xOf(parent) + CONNECTOR_OFF;
            const y1 = yOf(parent) + NODE_H;
            const y2 = yOf(lastChild) + NODE_H / 2;
            return (
              <line key={`v-${parent.uid}`}
                x1={px} y1={y1} x2={px} y2={y2}
                stroke="var(--text-secondary)" strokeOpacity="0.35"
                strokeWidth="1.5" />
            );
          })}
          {/* Horizontale L-Abzweige: pro Kind vom Eltern-Connector zur linken Kante der Kind-Box,
              eingefärbt nach Verbindungstyp (LAN blau / WLAN grün gestrichelt) */}
          {flat.flatMap(parent => parent.children.map(child => {
            const wlan = isWlanType(child.linkType);
            const color = wlan ? '#10b981' : '#3b82f6';
            const dash = wlan ? '5 3' : '0';
            const x1 = xOf(parent) + CONNECTOR_OFF;
            const x2 = xOf(child);
            const cy = yOf(child) + NODE_H / 2;
            const isOnHover = hoveredUid === child.uid || hoveredUid === parent.uid;
            const opacity = hoveredUid ? (isOnHover ? 0.95 : 0.12) : 0.75;
            return (
              <line key={`h-${child.uid}`}
                x1={x1} y1={cy} x2={x2} y2={cy}
                stroke={color} strokeWidth={isOnHover ? 2.5 : 1.8}
                strokeDasharray={dash} strokeLinecap="round"
                strokeOpacity={opacity}
                style={{ transition: 'stroke-opacity 0.15s' }}
              />
            );
          }))}

          {/* Knoten als abgerundete Rechtecke, links ausgerichtet */}
          {flat.map(n => {
            const s = styleFor(n);
            const isHovered = hoveredUid === n.uid;
            const isRoot = n === rootTree;
            const connLabel = isWlanType(n.linkType) ? 'WLAN' : 'LAN';
            const connColor = isWlanType(n.linkType) ? '#10b981' : '#3b82f6';
            return (
              <g key={n.uid}
                transform={`translate(${xOf(n)},${yOf(n)})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => {
                  setHoveredUid(n.uid);
                  const svgEl = (e.currentTarget.closest('svg') as SVGSVGElement);
                  const rect = svgEl.getBoundingClientRect();
                  setTooltip({ node: n, x: rect.left + xOf(n) + NODE_W, y: rect.top + yOf(n) });
                }}
                onMouseLeave={() => { setHoveredUid(null); setTooltip(null); }}
              >
                <rect width={NODE_W} height={NODE_H} rx={10} ry={10}
                  fill={s.fill} stroke={s.stroke}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  style={{ transition: 'stroke-width 0.15s, filter 0.15s' }}
                  filter={isHovered ? 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' : undefined}
                />
                {(() => {
                  // Badge-Text vorberechnen (für Root ohne Badge)
                  let badgeTxt = '';
                  if (!isRoot) {
                    badgeTxt = n.connDisplay || '';
                    if (!badgeTxt) {
                      const parts = [n.connDetail ? `${connLabel} ${n.connDetail}` : connLabel];
                      if (n.connSpeed) parts.push(n.connSpeed);
                      badgeTxt = parts.join(' → ');
                    }
                  }
                  const badgeW = isRoot ? 0 : Math.max(44, Math.min(180, badgeTxt.length * 6.5 + 14));
                  const badgeX = NODE_W - badgeW - 12;
                  // Max Breite für Namens- und IP-Text → Platzbedarf des Badges abziehen
                  const nameMaxChars = Math.max(10, Math.floor((badgeX - 24) / 7));
                  const displayName = n.name.length > nameMaxChars ? n.name.slice(0, nameMaxChars - 1) + '…' : n.name;
                  return (
                    <>
                      <text x={16} y={22} fontSize={isRoot ? 14 : 13} fontWeight="600" fill="#fff">
                        {displayName}
                      </text>
                      <text x={16} y={40} fontSize="11" fill="rgba(255,255,255,0.72)" fontFamily="monospace">
                        {n.ip || (isRoot ? 'FRITZ!Box' : '—')}
                      </text>
                      {!isRoot && (
                        <g>
                          <rect x={badgeX} y={NODE_H/2 - 10} width={badgeW} height={20} rx={10}
                            fill="rgba(0,0,0,0.3)" stroke={connColor} strokeOpacity="0.8" strokeWidth="1" />
                          <text x={badgeX + badgeW/2} y={NODE_H/2 + 4} textAnchor="middle" fontSize="10"
                            fontWeight="600" fill={connColor}>{badgeTxt}</text>
                        </g>
                      )}
                    </>
                  );
                })()}
              </g>
            );
          })}
        </svg>
        {tooltipEl}
      </div>
    </div>
  );
}

function LANSettings({ lanInfo }: { lanInfo: any }) {
  const t = useT();
  return (
    <div className="card">
      <div className="card-header"><h3>{t('LAN Einstellungen')}</h3></div>
      <div className="card-body">
        <table>
          <tbody>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: 220 }}>{t('IP-Adresse (Router)')}</td><td>{lanInfo?.NewIPRouters || '-'}</td></tr>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Subnetzmaske')}</td><td>{lanInfo?.NewSubnetMask || '-'}</td></tr>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('DNS-Server')}</td><td>{lanInfo?.NewDNSServers || '-'}</td></tr>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Domainname')}</td><td>{lanInfo?.NewDomainName || '-'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WANSettings({ wanInfo }: { wanInfo: any }) {
  const t = useT();
  return (
    <div className="card">
      <div className="card-header"><h3>{t('WAN Einstellungen')}</h3></div>
      <div className="card-body">
        <table>
          <tbody>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: 220 }}>{t('Externe IP-Adresse')}</td><td>{wanInfo?.NewExternalIPAddress || '-'}</td></tr>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Verbindungsstatus')}</td><td>{wanInfo?.NewConnectionStatus || '-'}</td></tr>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Verbindungstyp')}</td><td>{wanInfo?.NewConnectionType || '-'}</td></tr>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Upstream')}</td><td>{wanInfo?.NewUpstreamMaxBitRate || '-'}</td></tr>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Downstream')}</td><td>{wanInfo?.NewDownstreamMaxBitRate || '-'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WLANSettings({ wlanInfo, sid }: { wlanInfo: any[]; sid: string }) {
  const t = useT();
  const bandLabels = ['2.4 GHz', '5 GHz', '6 GHz / Gast'];
  const bandColors = ['#3b82f6', '#22c55e', '#f59e0b'];
  const bandBg = ['rgba(59,130,246,0.1)', 'rgba(34,197,94,0.1)', 'rgba(245,158,11,0.1)'];
  const headers = { 'X-Fritz-SID': sid };

  const [showPass, setShowPass] = useState<Record<number, boolean>>({});
  const [editPass, setEditPass] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [toggling, setToggling] = useState<Record<number, boolean>>({});
  // Lokale Override-Map für den Enable-Status: Wir können den WLAN-Status erst nach
  // einem Reload aus der Box bestätigen. Bis dahin zeigen wir den optimistisch neuen
  // Stand, damit das Toggle nicht zurückspringt während die Box noch arbeitet.
  const [enableOverride, setEnableOverride] = useState<Record<number, boolean>>({});

  const handleToggleEnable = async (wlanIndex: number, current: boolean) => {
    const next = !current;
    setToggling(s => ({ ...s, [wlanIndex]: true }));
    setMessages(m => ({ ...m, [wlanIndex]: '' }));
    // Optimistisches UI-Update
    setEnableOverride(o => ({ ...o, [wlanIndex]: next }));
    try {
      const res = await apiFetch('/api/fritz/network/wlan/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ index: wlanIndex, enable: next }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(m => ({ ...m, [wlanIndex]: next ? t('WLAN aktiviert') : t('WLAN deaktiviert') }));
      } else {
        // Override zurückrollen, da die Box die Änderung abgelehnt hat
        setEnableOverride(o => { const n = { ...o }; delete n[wlanIndex]; return n; });
        setMessages(m => ({ ...m, [wlanIndex]: t('Fehler: {e}').replace('{e}', data.error || t('Unbekannt')) }));
      }
    } catch {
      setEnableOverride(o => { const n = { ...o }; delete n[wlanIndex]; return n; });
      setMessages(m => ({ ...m, [wlanIndex]: t('Verbindungsfehler') }));
    } finally {
      setToggling(s => ({ ...s, [wlanIndex]: false }));
    }
  };

  const getSecurity = (standard: string) => {
    if (!standard) return t('Keine');
    if (standard.includes('WPA3')) return 'WPA3';
    if (standard.includes('WPA2')) return 'WPA2';
    if (standard.includes('WPA')) return 'WPA';
    if (standard === 'n') return '802.11n (WPA2)';
    if (standard === 'ac') return '802.11ac (WPA2)';
    if (standard === 'ax') return '802.11ax (WPA3)';
    return standard;
  };

  const getFrequency = (channel: string) => {
    const ch = parseInt(channel, 10);
    if (ch >= 1 && ch <= 14) return '2.4 GHz';
    if (ch >= 36) return '5 GHz';
    return '-';
  };

  const handleSavePass = async (wlanIndex: number) => {
    const newPass = editPass[wlanIndex];
    if (!newPass || newPass.length < 8) {
      setMessages(m => ({ ...m, [wlanIndex]: t('Fehler: Mindestens 8 Zeichen erforderlich') }));
      return;
    }
    setSaving(s => ({ ...s, [wlanIndex]: true }));
    setMessages(m => ({ ...m, [wlanIndex]: '' }));
    try {
      const res = await apiFetch('/api/fritz/network/wlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ index: wlanIndex, passphrase: newPass }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(m => ({ ...m, [wlanIndex]: t('Passwort gespeichert') }));
        setEditPass(e => ({ ...e, [wlanIndex]: '' }));
      } else {
        setMessages(m => ({ ...m, [wlanIndex]: t('Fehler: {e}').replace('{e}', data.error || t('Unbekannt')) }));
      }
    } catch {
      setMessages(m => ({ ...m, [wlanIndex]: t('Verbindungsfehler') }));
    } finally {
      setSaving(s => ({ ...s, [wlanIndex]: false }));
    }
  };

  return (
    <div>
      {wlanInfo.map((w, i) => {
        const wlanIdx: number = w._index || (i + 1);
        const isEnabledFromBox = w.NewStatus === 'Up' || w.NewEnable === '1' || w.NewEnable === 1;
        // Optimistisches Override hat Vorrang, bis der nächste Box-Status eintrifft.
        const isEnabled = enableOverride[wlanIdx] !== undefined ? enableOverride[wlanIdx] : isEnabledFromBox;
        const color = bandColors[i % bandColors.length];
        const bg = bandBg[i % bandBg.length];
        const freq = getFrequency(w.NewChannel || '');

        return (
          <div className="card" key={i} style={{ borderLeft: `4px solid ${color}` }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <circle cx="12" cy="20" r="1" fill={color} />
                    </svg>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>{w.NewSSID || `WLAN ${i + 1}`}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {bandLabels[i % bandLabels.length]} {freq !== '-' ? `\u2013 ${freq}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    background: isEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: isEnabled ? '#22c55e' : '#ef4444',
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                    {isEnabled ? t('Aktiv') : t('Inaktiv')}
                  </span>
                  <button
                    onClick={() => handleToggleEnable(wlanIdx, isEnabled)}
                    disabled={!!toggling[wlanIdx]}
                    title={isEnabled ? t('Deaktivieren') : t('Aktivieren')}
                    style={{
                      width: 46, height: 26, borderRadius: 13, border: 'none',
                      cursor: toggling[wlanIdx] ? 'default' : 'pointer',
                      background: isEnabled ? '#22c55e' : '#6b7280',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      opacity: toggling[wlanIdx] ? 0.6 : 1,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3,
                      left: isEnabled ? 23 : 3,
                      width: 20, height: 20, borderRadius: '50%', background: 'white',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ background: bg, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('Kanal')}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{w.NewChannel || '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{freq}</div>
                </div>
                <div style={{ background: bg, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('Standard')}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{w.NewStandard || '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{getSecurity(w.NewStandard || '')}</div>
                </div>
                <div style={{ background: bg, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('Verschl\u00fcsselung')}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{getSecurity(w.NewStandard || '')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{isEnabled ? t('Gesichert') : '-'}</div>
                </div>
                <div style={{ background: bg, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('Status')}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: isEnabled ? '#22c55e' : '#ef4444' }}>
                    {isEnabled ? t('Verbunden') : t('Getrennt')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{w.NewStatus || '-'}</div>
                </div>
              </div>

              {/* WLAN-Passwort */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>{t('WLAN-Passwort (WPA-Schl\u00fcssel)')}</div>

                {/* Aktuelles Passwort anzeigen */}
                {w.NewKeyPassphrase && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100 }}>{t('Aktuell:')}</span>
                    <code style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 14,
                      letterSpacing: showPass[wlanIdx] ? 'normal' : 3,
                      fontFamily: 'monospace',
                    }}>
                      {showPass[wlanIdx] ? w.NewKeyPassphrase : '\u2022'.repeat(Math.min(w.NewKeyPassphrase.length, 16))}
                    </code>
                    <button
                      onClick={() => setShowPass(s => ({ ...s, [wlanIdx]: !s[wlanIdx] }))}
                      style={{
                        background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                        padding: '4px 10px', cursor: 'pointer', fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {showPass[wlanIdx] ? t('Verbergen') : t('Anzeigen')}
                    </button>
                  </div>
                )}
                {!w.NewKeyPassphrase && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{t('Kein Passwort verf\u00fcgbar (Ger\u00e4t offline oder kein Zugriff)')}</div>
                )}

                {/* Neues Passwort setzen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100 }}>{t('Neu setzen:')}</span>
                  <input
                    type="text"
                    value={editPass[wlanIdx] || ''}
                    onChange={e => setEditPass(ep => ({ ...ep, [wlanIdx]: e.target.value }))}
                    placeholder={t('Neues Passwort (min. 8 Zeichen)')}
                    style={{
                      padding: '6px 10px', borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)', color: 'var(--text-primary)',
                      fontSize: 14, width: 260,
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSavePass(wlanIdx)}
                    disabled={saving[wlanIdx] || !editPass[wlanIdx] || (editPass[wlanIdx]?.length || 0) < 8}
                    style={{ padding: '6px 14px', fontSize: 13 }}
                  >
                    {saving[wlanIdx] ? '...' : t('Speichern')}
                  </button>
                </div>
                {messages[wlanIdx] && (
                  <div style={{
                    marginTop: 8, fontSize: 13, padding: '6px 10px', borderRadius: 6,
                    background: messages[wlanIdx].startsWith('Fehler') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    color: messages[wlanIdx].startsWith('Fehler') ? '#ef4444' : '#22c55e',
                  }}>
                    {messages[wlanIdx]}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {wlanInfo.length === 0 && (
        <div className="card">
          <div className="card-body">
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>{t('Keine WLAN-Daten verf\u00fcgbar')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DHCPSettings({ dhcpInfo, sid }: { dhcpInfo: any; sid: string }) {
  const t = useT();
  const [minAddress, setMinAddress] = useState(dhcpInfo?.NewMinAddress || '');
  const [maxAddress, setMaxAddress] = useState(dhcpInfo?.NewMaxAddress || '');
  const [subnetMask, setSubnetMask] = useState(dhcpInfo?.NewSubnetMask || '');
  const [dnsServers, setDnsServers] = useState(dhcpInfo?.NewDNSServers || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMinAddress(dhcpInfo?.NewMinAddress || '');
    setMaxAddress(dhcpInfo?.NewMaxAddress || '');
    setSubnetMask(dhcpInfo?.NewSubnetMask || '');
    setDnsServers(dhcpInfo?.NewDNSServers || '');
  }, [dhcpInfo]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await apiFetch('/api/fritz/network/dhcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fritz-SID': sid,
        },
        body: JSON.stringify({ minAddress, maxAddress, subnetMask, dnsServers }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(t('DHCP-Einstellungen gespeichert'));
      } else {
        setError(data.error || t('Speichern fehlgeschlagen'));
      }
    } catch (err) {
      setError(t('Verbindungsfehler'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, width: 200 };

  return (
    <div className="card">
      <div className="card-header"><h3>{t('DHCP Einstellungen')}</h3></div>
      <div className="card-body">
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        <table>
          <tbody>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: 220 }}>{t('DHCP Server')}</td><td>{dhcpInfo?.NewDHCPServerConfigurable === '1' ? t('Aktiv') : t('Inaktiv')}</td></tr>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('IP-Bereich Start')}</td>
              <td><input type="text" value={minAddress} onChange={e => setMinAddress(e.target.value)} style={inputStyle} /></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('IP-Bereich Ende')}</td>
              <td><input type="text" value={maxAddress} onChange={e => setMaxAddress(e.target.value)} style={inputStyle} /></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Subnetzmaske')}</td>
              <td><input type="text" value={subnetMask} onChange={e => setSubnetMask(e.target.value)} style={inputStyle} /></td>
            </tr>
            <tr><td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Router (Gateway)')}</td><td>{dhcpInfo?.NewIPRouters || '-'}</td></tr>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('DNS-Server')}</td>
              <td><input type="text" value={dnsServers} onChange={e => setDnsServers(e.target.value)} style={inputStyle} placeholder="z.B. 192.168.178.1" /></td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('Speichern...') : t('Einstellungen speichern')}
          </button>
        </div>
      </div>
    </div>
  );
}
