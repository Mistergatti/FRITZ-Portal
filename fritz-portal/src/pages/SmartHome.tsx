import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { useI18n } from '../i18n';

interface SmartHomeProps {
  sid: string;
}

export default function SmartHome({ sid }: SmartHomeProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<any[]>([]);
  const headers = { 'X-Fritz-SID': sid };

  useEffect(() => {
    apiFetch('/api/fritz/smartHome', { headers })
      .then(r => r.json())
      .then(setDevices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <span className="terminal-cursor">$ {t('app.loading')}<span className="blink">▮</span></span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>{t('page.smarthome.title')}</h2>
        <p>── {t('page.smarthome.sub')}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('smarthome.devices')}</h3>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>── {t('smarthome.found', { n: devices.length })}</span>
        </div>
        {devices.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontFamily: 'var(--font-mono)' }}>
            ── {t('smarthome.empty')} ──
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('smarthome.col.name')}</th>
                  <th>{t('smarthome.col.type')}</th>
                  <th>{t('smarthome.col.status')}</th>
                  <th>{t('smarthome.col.temp')}</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((dev, i) => (
                  <tr key={i}>
                    <td className="device-name">{dev.name || t('telefonie.calls.label.unknown')}</td>
                    <td>{dev.productname || '—'}</td>
                    <td>
                      <span className={`status-dot ${dev.present === '1' ? 'online' : 'offline'}`} />
                      {dev.present === '1' ? t('devices.status.online') : t('devices.status.offline')}
                    </td>
                    <td>{dev.temperature ? `${dev.temperature / 10} °C` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
