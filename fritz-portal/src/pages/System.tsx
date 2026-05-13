import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { useI18n } from '../i18n';

interface SystemProps {
  sid: string;
}

export default function System({ sid }: SystemProps) {
  const { t } = useI18n();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rebooting, setRebooting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [version] = useState('1.4.2');
  const [fritzHost, setFritzHost] = useState('fritz.box');

  // HA-Sensor-Einstellungen
  const [haSettings, setHaSettings] = useState<{
    ha_sensors: boolean;
    ha_sensors_interval: number;
    ha_sensors_traffic_interval: number;
    ha_available: boolean;
    mqtt_available: boolean;
    debug_logging: boolean;
  } | null>(null);
  const [haSaving, setHaSaving] = useState(false);
  const [haMessage, setHaMessage] = useState('');
  const [haMessageOk, setHaMessageOk] = useState(true);

  const headers = { 'X-Fritz-SID': sid };

  useEffect(() => {
    loadInfo();
    // HA-Einstellungen laden
    apiFetch('/api/fritz/ha-settings', { headers })
      .then(r => r.json())
      .then(d => setHaSettings(d))
      .catch(() => {});
  }, []);

  const loadInfo = async () => {
    try {
      const res = await apiFetch('/api/fritz/device-info', { headers });
      const data = await res.json();
      setDeviceInfo(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleHaSave = async () => {
    if (!haSettings) return;
    setHaSaving(true);
    setHaMessage('');
    try {
      const res = await apiFetch('/api/fritz/ha-settings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ha_sensors:                  haSettings.ha_sensors,
          ha_sensors_interval:         haSettings.ha_sensors_interval,
          ha_sensors_traffic_interval: haSettings.ha_sensors_traffic_interval,
          debug_logging:               haSettings.debug_logging,
        }),
      });
      const data = await res.json();
      if (data.success) { setHaMessageOk(true);  setHaMessage(t('system.ha.saved')); }
      else               { setHaMessageOk(false); setHaMessage(t('system.ha.saveError')); }
    } catch {
      setHaMessageOk(false);
      setHaMessage(t('system.ha.connError'));
    } finally {
      setHaSaving(false);
    }
  };

  const handleReboot = async () => {
    if (!confirm(t('system.reboot.confirm'))) return;
    setRebooting(true);
    setMessage('');
    setError('');
    try {
      const res = await apiFetch('/api/fritz/reboot', { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        setMessage(t('system.reboot.started'));
      } else {
        setError(data.error || t('system.reboot.failed'));
      }
    } catch (err) {
      setError(t('detail.msg.connError'));
    } finally {
      setRebooting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="terminal-cursor">$ loading<span className="blink">▮</span></span>
      </div>
    );
  }

  const upTime = deviceInfo?.NewUpTime
    ? `${Math.floor(deviceInfo.NewUpTime / 86400)}d ${Math.floor((deviceInfo.NewUpTime % 86400) / 3600)}h ${Math.floor((deviceInfo.NewUpTime % 3600) / 60)}m`
    : '-';

  const fritzUrl = `http://${fritzHost}`;

  return (
    <div>
      <div className="page-header">
        <h2>{t('page.system.title')}</h2>
        <p>── {t('page.system.sub')}</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="card">
        <div className="card-header">
          <h3>{t('system.info')}</h3>
        </div>
        <table>
          <tbody>
            <tr>
              <td style={{ width: 200, color: 'var(--text-secondary)' }}>{t('system.model')}</td>
              <td>{deviceInfo?.NewModelName || '—'}</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)' }}>{t('system.hardware')}</td>
              <td>{deviceInfo?.NewHardwareVersion || '—'}</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)' }}>{t('system.portal')}</td>
              <td>v{version || '—'}</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)' }}>{t('system.serial')}</td>
              <td className="device-mac">{deviceInfo?.NewSerialNumber || '—'}</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)' }}>{t('system.uptime')}</td>
              <td>{upTime}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="action-grid">
        <div className="action-card">
          <h4>{t('system.reboot')}</h4>
          <p>{t('system.reboot.desc')}</p>
          <button className="btn btn-danger" onClick={handleReboot} disabled={rebooting}>
            {rebooting ? t('system.reboot.busy') : t('system.reboot.btn')}
          </button>
        </div>

        <div className="action-card">
          <h4>{t('system.firmware')}</h4>
          <p>{t('system.firmware.desc')}</p>
          <button className="btn btn-primary" onClick={() => window.open(fritzUrl, '_blank')}>
            {t('system.firmware.btn')}
          </button>
        </div>

        <div className="action-card">
          <h4>{t('system.webui')}</h4>
          <p>{t('system.webui.desc')}</p>
          <button className="btn btn-outline" onClick={() => window.open(fritzUrl, '_blank')}>
            {t('system.webui.btn')}
          </button>
        </div>
      </div>

      {haSettings && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header">
            <h3>{t('system.ha')}</h3>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 18, lineHeight: 1.6, letterSpacing: 0.2 }}>
              {t('system.ha.desc').split('{code}').map((part, idx, arr) => (
                <span key={idx}>
                  {part}
                  {idx < arr.length - 1 && <code>sensor.fritzportal_*</code>}
                </span>
              ))}
            </p>

            {/* Status-Anzeige */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 18, padding: '10px 14px',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              fontFamily: 'var(--font-mono)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: !haSettings.ha_available ? 'var(--text-muted)' : (haSettings.ha_sensors || haSettings.mqtt_available) ? 'var(--success)' : 'var(--warning)', flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                {!haSettings.ha_available
                  ? t('system.ha.status.noToken')
                  : haSettings.ha_sensors
                  ? t('system.ha.status.rest')
                  : haSettings.mqtt_available
                  ? t('system.ha.status.mqtt')
                  : t('system.ha.status.none')}
              </span>
            </div>

            {/* REST-API Fallback ein/aus */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, fontFamily: 'var(--font-mono)' }}>{t('system.ha.rest')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{t('system.ha.rest.desc')}</div>
              </div>
              <button
                onClick={() => setHaSettings(s => s ? { ...s, ha_sensors: !s.ha_sensors } : s)}
                style={{
                  width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: haSettings.ha_sensors ? 'var(--success)' : 'var(--text-muted)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
                title={haSettings.ha_sensors ? 'Deaktivieren' : 'Aktivieren'}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: haSettings.ha_sensors ? 23 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }} />
              </button>
            </div>

            {/* Systemsensoren-Intervall */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, fontFamily: 'var(--font-mono)' }}>{t('system.ha.intervalSys')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{t('system.ha.intervalSys.desc')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <input
                  type="number" min={10} max={3600}
                  value={haSettings.ha_sensors_interval}
                  onChange={e => setHaSettings(s => s ? { ...s, ha_sensors_interval: parseInt(e.target.value) || 60 } : s)}
                  style={{ width: 72, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, textAlign: 'right' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{t('system.unit.sec')}</span>
              </div>
            </div>

            {/* Traffic-Intervall */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, fontFamily: 'var(--font-mono)' }}>{t('system.ha.intervalTraffic')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{t('system.ha.intervalTraffic.desc')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <input
                  type="number" min={30} max={3600}
                  value={haSettings.ha_sensors_traffic_interval}
                  onChange={e => setHaSettings(s => s ? { ...s, ha_sensors_traffic_interval: parseInt(e.target.value) || 300 } : s)}
                  style={{ width: 72, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, textAlign: 'right' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{t('system.unit.sec')}</span>
              </div>
            </div>

            {/* Debug-Logging */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, fontFamily: 'var(--font-mono)' }}>{t('system.ha.debug')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{t('system.ha.debug.desc')}</div>
              </div>
              <button
                onClick={() => setHaSettings(s => s ? { ...s, debug_logging: !s.debug_logging } : s)}
                style={{
                  width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: haSettings.debug_logging ? 'var(--warning)' : 'var(--text-muted)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
                title={haSettings.debug_logging ? 'Deaktivieren' : 'Aktivieren'}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: haSettings.debug_logging ? 23 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }} />
              </button>
            </div>

            {/* Speichern */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-primary" onClick={handleHaSave} disabled={haSaving}>
                {haSaving ? t('system.ha.saving') : t('system.ha.save')}
              </button>
              {haMessage && (
                <span style={{ fontSize: 13, color: haMessageOk ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{haMessage}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
              {t('system.ha.applied')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
