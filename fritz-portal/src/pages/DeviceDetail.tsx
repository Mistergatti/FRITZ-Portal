import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { getApiCache } from '../App';
import { useT } from '../lib/i18n';

interface Host {
  mac: string;
  ip: string;
  active: boolean;
  name: string;
  interface: string;
}

interface DeviceDetailProps {
  sid: string;
  mac: string;
  onBack: () => void;
}

export default function DeviceDetail({ sid, mac, onBack }: DeviceDetailProps) {
  const t = useT();
  // Hosts kommen aus dem Cache, der eben auf der Geräte-Seite gefüllt wurde –
  // dadurch hat DeviceDetail das Gerätedatum sofort und blockt nicht auf
  // /api/fritz/hosts. Block-Status und DHCP-Reservierung laden im Hintergrund.
  const cachedHosts: Host[] = getApiCache('hosts') || [];
  const [hosts, setHosts] = useState<Host[]>(cachedHosts);
  const [loading, setLoading] = useState(cachedHosts.length === 0);
  const [blocked, setBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [message, setMessage] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceIp, setDeviceIp] = useState('');
  const [saving, setSaving] = useState(false);
  const [staticDhcp, setStaticDhcp] = useState<{ exists: boolean; ip: string } | null>(null);
  const [staticDhcpInput, setStaticDhcpInput] = useState('');
  const [settingDhcp, setSettingDhcp] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const headers = { 'X-Fritz-SID': sid };

  const handleDeleteDevice = async (host: Host) => {
    if (host.active) return;
    if (!confirm(t('„{n}" dauerhaft aus der FRITZ!Box-Geräteliste entfernen?').replace('{n}', host.name || host.mac))) return;
    setDeleting(true);
    setMessage('');
    try {
      const res = await apiFetch('/api/fritz/device', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ mac: host.mac }),
      });
      const data = await res.json();
      if (data.success) {
        // Cache aufräumen, damit die Liste das Gerät nach onBack() nicht mehr zeigt
        const cur = (window as any).__apiCache?.['hosts']?.data;
        if (Array.isArray(cur)) {
          (window as any).__apiCache['hosts'].data = cur.filter((h: Host) => h.mac !== host.mac);
        }
        onBack();
      } else {
        setMessage(`Fehler: ${data.error || 'Löschen fehlgeschlagen'}`);
      }
    } catch {
      setMessage('Verbindungsfehler');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => { loadDevice(); }, []);

  const loadDevice = async () => {
    // Block-Status und DHCP-Reservierung parallel laden – beides braucht das
    // andere nicht. Hosts-Liste nur nachholen, falls der Cache leer war.
    const hostsP = hosts.length === 0
      ? apiFetch('/api/fritz/hosts', { headers }).then(r => r.json()).then(setHosts).catch(() => {})
      : Promise.resolve();

    // Bekannte IP aus dem Hosts-Cache als Query-Param mitschicken – spart dem
    // Server einen kompletten Hosts-Sweep, wenn der Server-Cache abgelaufen ist.
    const cachedIp = cachedHosts.find((h: Host) => h.mac === mac)?.ip || '';
    const blockUrl = `/api/fritz/device/blockstate?mac=${encodeURIComponent(mac)}${cachedIp ? `&ip=${encodeURIComponent(cachedIp)}` : ''}`;
    apiFetch(blockUrl, { headers })
      .then(r => r.json())
      .then(d => setBlocked(d.blocked === true))
      .catch(() => {});

    apiFetch(`/api/fritz/device/static-dhcp?mac=${encodeURIComponent(mac)}`, { headers })
      .then(r => r.json())
      .then(d => { setStaticDhcp(d); setStaticDhcpInput(d.ip || ''); })
      .catch(() => {});

    try { await hostsP; } finally { setLoading(false); }
  };

  const handleBlock = async () => {
    setBlocking(true);
    setMessage('');
    try {
      const res = await apiFetch('/api/fritz/device/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ mac, blocked: !blocked }),
      });
      const data = await res.json();
      if (data.success) {
        setBlocked(!blocked);
        setMessage(blocked ? 'Gerät freigegeben' : 'Gerät gesperrt');
      } else {
        setMessage(`Fehler: ${data.error || 'Unbekannt'}`);
      }
    } finally {
      setBlocking(false);
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    setMessage('');
    try {
      const body: any = { mac };
      if (deviceName) body.name = deviceName;
      if (deviceIp) body.ip = deviceIp;

      const res = await apiFetch('/api/fritz/device/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(deviceIp ? 'Name und IP gespeichert' : 'Name gespeichert');
        setHosts(prev => prev.map(h => h.mac === mac ? { ...h, name: deviceName || h.name, ip: deviceIp || h.ip } : h));
      } else {
        setMessage(`Fehler: ${data.error || 'Unbekannt'}`);
      }
    } catch (err) {
      setMessage('Verbindungsfehler');
    } finally {
      setSaving(false);
    }
  };

  const handleSetStaticDhcp = async () => {
    if (!staticDhcpInput) return;
    setSettingDhcp(true);
    setMessage('');
    const device = hosts.find(h => h.mac === mac);
    try {
      const res = await apiFetch('/api/fritz/device/static-dhcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ mac, ip: staticDhcpInput, hostname: device?.name || '' }),
      });
      const data = await res.json();
      if (data.success) {
        setStaticDhcp({ exists: true, ip: staticDhcpInput });
        setMessage(`IP ${staticDhcpInput} dauerhaft zugewiesen`);
      } else {
        setMessage(`Fehler: ${data.error || 'Unbekannt'}`);
      }
    } catch {
      setMessage('Verbindungsfehler');
    } finally {
      setSettingDhcp(false);
    }
  };

  const handleRemoveStaticDhcp = async () => {
    setSettingDhcp(true);
    setMessage('');
    try {
      const res = await apiFetch('/api/fritz/device/static-dhcp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ mac }),
      });
      const data = await res.json();
      if (data.success) {
        setStaticDhcp({ exists: false, ip: '' });
        setMessage('DHCP-Reservierung entfernt');
      } else {
        setMessage(`Fehler: ${data.error || 'Unbekannt'}`);
      }
    } catch {
      setMessage('Verbindungsfehler');
    } finally {
      setSettingDhcp(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const device = hosts.find(h => h.mac === mac);

  if (!device) {
    return (
      <div>
        <div className="page-header">
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, marginBottom: 8, padding: 0 }}>{'\u2190 '}{t('Zur\u00fcck')}</button>
          <h2>{t('Ger\u00e4t nicht gefunden')}</h2>
        </div>
      </div>
    );
  }

  const isWlan = (() => { const s = String(device.interface || '').toLowerCase(); return s.includes('wlan') || s.includes('802'); })();

  return (
    <div>
      <div className="page-header">
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, marginBottom: 8, padding: 0 }}>{t('\u2190 Zur\u00fcck zur Liste')}</button>
        <h2>{device.name || t('Unbekannt')}</h2>
        <p>{t('Ger\u00e4tedetails f\u00fcr {mac}').replace('{mac}', device.mac)}</p>
      </div>

      {message && <div className={message.includes('Fehler') ? 'error-message' : 'success-message'}>{message}</div>}

      <div className="card">
        <div className="card-header">
          <h3>{t('Ger\u00e4teinformationen')}</h3>
          <span className={`status-dot ${device.active ? 'online' : 'offline'}`} style={{ marginLeft: 8 }} />
          <span style={{ fontSize: 14 }}>{device.active ? t('Online') : t('Offline')}</span>
        </div>
        <div className="card-body">
          <table>
            <tbody>
              <tr>
                <td style={{ fontWeight: 500, width: 200, color: 'var(--text-secondary)' }}>{t('Name')}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={deviceName}
                        onChange={e => setDeviceName(e.target.value)}
                        placeholder={device.name || t('Ger\u00e4tename')}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: 14,
                          width: 200,
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleSaveName}
                        disabled={saving || !deviceName}
                        style={{ padding: '6px 12px', fontSize: 13 }}
                      >
                        {saving ? '...' : t('Speichern')}
                      </button>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {t('Leerzeichen werden zu Bindestrichen, Umlaute werden umgeschrieben')}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('IP-Adresse')}</td>
                <td>
                  <span style={{ fontFamily: 'monospace' }}>{device.ip}</span>
                  {staticDhcp?.exists && (
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#22c55e', fontWeight: 500 }}>&#x1f512; {t('fest zugewiesen')}</span>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('MAC-Adresse')}</td>
                <td style={{ fontFamily: 'monospace' }}>{device.mac}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Status')}</td>
                <td>
                  <span className={`status-dot ${device.active ? 'online' : 'offline'}`} />
                  {device.active ? t('Online') : t('Offline')}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Verbindung')}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {isWlan ? (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                          <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="#3b82f6" />
                        </svg>
                        <span style={{ color: '#3b82f6', fontWeight: 500 }}>WLAN</span>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                          <rect x="1" y="6" width="22" height="12" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                        <span style={{ color: '#22c55e', fontWeight: 500 }}>LAN</span>
                      </>
                    )}
                  </span>
                </td>
              </tr>
              {device.interface && (
                <tr>
                  <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('Interface')}</td>
                  <td style={{ fontFamily: 'monospace' }}>{device.interface}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <h4 style={{ marginBottom: 12, fontSize: 14 }}>{t('Ger\u00e4tekontrolle')}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                className={`btn ${blocked ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleBlock}
                disabled={blocking}
              >
                {blocking ? t('Wird ausgef\u00fchrt...') : blocked ? t('Internet freigeben') : t('Internet sperren')}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteDevice(device)}
                disabled={deleting || device.active}
                title={device.active ? t('Nur offline-Ger\u00e4te k\u00f6nnen entfernt werden') : t('Aus FRITZ!Box-Liste entfernen')}
              >
                {deleting ? t('Wird entfernt...') : t('Ger\u00e4t entfernen')}
              </button>
              {blocked && (
                <span style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 500 }}>
                  {'\u26d4'} {t('Ger\u00e4t ist gesperrt')}
                </span>
              )}
              {device.active && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('Nur offline-Ger\u00e4te k\u00f6nnen entfernt werden')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('IPv4-Adresse dauerhaft zuweisen')}</h3>
          {staticDhcp?.exists && (
            <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>&#x2713; {t('Reservierung aktiv: {ip}').replace('{ip}', staticDhcp.ip)}</span>
          )}
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
            {t('Weist diesem Gerät immer die gleiche IPv4-Adresse zu (DHCP-Reservierung). Das Gerät erhält diese IP bei jeder Verbindung automatisch.')}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={staticDhcpInput}
              onChange={e => setStaticDhcpInput(e.target.value)}
              placeholder={device.ip || '192.168.178.x'}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 14,
                width: 180,
                fontFamily: 'monospace',
              }}
            />
            <button
              className="btn btn-primary"
              onClick={handleSetStaticDhcp}
              disabled={settingDhcp || !staticDhcpInput}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              {settingDhcp ? '...' : staticDhcp?.exists ? t('Reservierung aktualisieren') : t('Dauerhaft zuweisen')}
            </button>
            {staticDhcp?.exists && (
              <button
                className="btn btn-danger"
                onClick={handleRemoveStaticDhcp}
                disabled={settingDhcp}
                style={{ padding: '6px 14px', fontSize: 13 }}
              >
                {t('Reservierung entfernen')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('Traffic')}</h3>
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
            Die Fritz!Box stellt keinen gerätespezifischen Traffic-Verlauf über die API zur Verfügung.
            Den gesamten Internet-WAN-Traffic (alle Geräte) findest du auf der{' '}
            <strong>Dashboard</strong>-Seite, historische Verbrauchsstatistiken unter{' '}
            <strong>Traffic</strong>.
          </p>
        </div>
      </div>

    </div>
  );
}
