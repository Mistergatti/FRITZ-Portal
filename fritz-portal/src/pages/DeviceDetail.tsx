import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [message, setMessage] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceIp, setDeviceIp] = useState('');
  const [saving, setSaving] = useState(false);
  const [staticDhcp, setStaticDhcp] = useState<{ exists: boolean; ip: string } | null>(null);
  const [staticDhcpInput, setStaticDhcpInput] = useState('');
  const [settingDhcp, setSettingDhcp] = useState(false);

  const headers = { 'X-Fritz-SID': sid };

  useEffect(() => { loadDevice(); }, []);

  const loadDevice = async () => {
    try {
      const hostsRes = await apiFetch('/api/fritz/hosts', { headers });
      const hostList = await hostsRes.json();
      setHosts(hostList);

      // Aktuellen Sperrstatus laden
      const blockRes = await apiFetch(`/api/fritz/device/blockstate?mac=${encodeURIComponent(mac)}`, { headers });
      const blockData = await blockRes.json();
      setBlocked(blockData.blocked === true);

      // DHCP-Reservierung laden
      const dhcpRes = await apiFetch(`/api/fritz/device/static-dhcp?mac=${encodeURIComponent(mac)}`, { headers });
      const dhcpData = await dhcpRes.json();
      setStaticDhcp(dhcpData);
      setStaticDhcpInput(dhcpData.ip || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
        setMessage(blocked ? t('detail.msg.unblocked') : t('detail.msg.blocked'));
      } else {
        setMessage(t('detail.msg.error', { error: data.error || t('detail.msg.errorUnknown') }));
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
        setMessage(deviceIp ? t('detail.msg.namedIp') : t('detail.msg.named'));
        setHosts(prev => prev.map(h => h.mac === mac ? { ...h, name: deviceName || h.name, ip: deviceIp || h.ip } : h));
      } else {
        setMessage(t('detail.msg.error', { error: data.error || t('detail.msg.errorUnknown') }));
      }
    } catch (err) {
      setMessage(t('detail.msg.connError'));
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
        setMessage(t('detail.msg.dhcpAssigned', { ip: staticDhcpInput }));
      } else {
        setMessage(t('detail.msg.error', { error: data.error || t('detail.msg.errorUnknown') }));
      }
    } catch {
      setMessage(t('detail.msg.connError'));
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
        setMessage(t('detail.msg.dhcpRemoved'));
      } else {
        setMessage(t('detail.msg.error', { error: data.error || t('detail.msg.errorUnknown') }));
      }
    } catch {
      setMessage(t('detail.msg.connError'));
    } finally {
      setSettingDhcp(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="terminal-cursor">$ loading<span className="blink">▮</span></span>
      </div>
    );
  }

  const device = hosts.find(h => h.mac === mac);

  if (!device) {
    return (
      <div>
        <div className="page-header">
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, marginBottom: 8, padding: 0, fontFamily: 'var(--font-mono)' }}>{t('detail.back')}</button>
          <h2>{t('detail.notFound')}</h2>
        </div>
      </div>
    );
  }

  const isWlan = (() => { const s = String(device.interface || '').toLowerCase(); return s.includes('wlan') || s.includes('802'); })();

  return (
    <div>
      <div className="page-header">
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, marginBottom: 8, padding: 0, fontFamily: 'var(--font-mono)' }}>{t('detail.back')}</button>
        <h2>{device.name || t('devices.lastActivity.unknown')}</h2>
        <p>\u2500\u2500 {t('detail.subtitle', { mac: device.mac })}</p>
      </div>

      {message && <div className={/(fehler|error)/i.test(message) ? 'error-message' : 'success-message'}>{message}</div>}

      <div className="card">
        <div className="card-header">
          <h3>{t('detail.info')}</h3>
          <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <span className={`status-dot ${device.active ? 'online' : 'offline'}`} />
            {device.active ? t('devices.status.online') : t('devices.status.offline')}
          </span>
        </div>
        <div className="card-body">
          <table>
            <tbody>
              <tr>
                <td style={{ fontWeight: 500, width: 200, color: 'var(--text-secondary)' }}>{t('detail.name')}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={deviceName}
                        onChange={e => setDeviceName(e.target.value)}
                        placeholder={device.name || t('detail.placeholder')}
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
                        {saving ? t('detail.saving') : t('detail.save')}
                      </button>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {t('detail.nameHint')}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('detail.ip')}</td>
                <td>
                  <span className="device-mac">{device.ip}</span>
                  {staticDhcp?.exists && (
                    <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--success)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{t('detail.fixedAssigned')}</span>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('detail.mac')}</td>
                <td className="device-mac">{device.mac}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('detail.status')}</td>
                <td>
                  <span className={`status-dot ${device.active ? 'online' : 'offline'}`} />
                  {device.active ? t('devices.status.online') : t('devices.status.offline')}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('detail.connection')}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {isWlan ? (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                          <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="var(--accent)" />
                        </svg>
                        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>WLAN</span>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                          <rect x="1" y="6" width="22" height="12" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>LAN</span>
                      </>
                    )}
                  </span>
                </td>
              </tr>
              {device.interface && (
                <tr>
                  <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('detail.interface')}</td>
                  <td className="device-mac">{device.interface}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <h4 style={{ marginBottom: 12, fontSize: 14, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>{t('detail.control')}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                className={`btn ${blocked ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleBlock}
                disabled={blocking}
              >
                {blocking ? t('detail.block.busy') : blocked ? t('detail.block.unblock') : t('detail.block.block')}
              </button>
              {blocked && (
                <span style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                  \u25cf {t('detail.block.locked')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('detail.dhcp.title')}</h3>
          {staticDhcp?.exists && (
            <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{t('detail.dhcp.active', { ip: staticDhcp.ip })}</span>
          )}
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, fontFamily: 'var(--font-mono)', letterSpacing: 0.2 }}>
            {t('detail.dhcp.desc')}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={staticDhcpInput}
              onChange={e => setStaticDhcpInput(e.target.value)}
              placeholder={device.ip || '192.168.178.x'}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: 14,
                width: 180,
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              className="btn btn-primary"
              onClick={handleSetStaticDhcp}
              disabled={settingDhcp || !staticDhcpInput}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              {settingDhcp ? t('detail.saving') : staticDhcp?.exists ? t('detail.dhcp.update') : t('detail.dhcp.assign')}
            </button>
            {staticDhcp?.exists && (
              <button
                className="btn btn-danger"
                onClick={handleRemoveStaticDhcp}
                disabled={settingDhcp}
                style={{ padding: '6px 14px', fontSize: 13 }}
              >
                {t('detail.dhcp.remove')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('detail.traffic')}</h3>
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            {t('detail.traffic.note')}
          </p>
        </div>
      </div>
    </div>
  );
}
