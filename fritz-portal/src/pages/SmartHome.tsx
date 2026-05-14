import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { getApiCache, setApiCache } from '../App';
import { useT } from '../lib/i18n';

interface SmartHomeProps {
  sid: string;
}

export default function SmartHome({ sid }: SmartHomeProps) {
  const t = useT();
  const cached: any[] | null = getApiCache('smartHome');
  const [devices, setDevices] = useState<any[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const headers = { 'X-Fritz-SID': sid };

  useEffect(() => {
    apiFetch('/api/fritz/smartHome', { headers })
      .then(r => r.json())
      .then(d => { setApiCache('smartHome', d); setDevices(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2>{t('SmartHome')}</h2>
        <p>{t('Übersicht deiner FRITZ!SmartHome-Geräte')}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('SmartHome-Geräte')}</h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('{n} Geräte').replace('{n}', String(devices.length))}</span>
        </div>
        <div className="card-body">
          {devices.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>
              {t('Keine SmartHome-Geräte gefunden')}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('Name')}</th>
                    <th>{t('Typ')}</th>
                    <th>{t('Status')}</th>
                    <th>{t('Temperatur')}</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((dev, i) => (
                    <tr key={i}>
                      <td className="device-name">{dev.name || t('Unbekannt')}</td>
                      <td>{dev.productname || '-'}</td>
                      <td>
                        <span className={`status-dot ${dev.present === '1' ? 'online' : 'offline'}`} />
                        {dev.present === '1' ? t('Online') : t('Offline')}
                      </td>
                      <td>{dev.temperature ? `${dev.temperature / 10} °C` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
