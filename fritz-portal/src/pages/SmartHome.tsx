import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';

interface SmartHomeProps {
  sid: string;
}

export default function SmartHome({ sid }: SmartHomeProps) {
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

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2>SmartHome</h2>
        <p>FRITZ!DECT und smarte Geräte</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>SmartHome Geräte</h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{devices.length} Geräte</span>
        </div>
        <div className="card-body">
          {devices.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>
              Keine SmartHome Geräte gefunden
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Typ</th>
                    <th>Status</th>
                    <th>Temperatur</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((dev, i) => (
                    <tr key={i}>
                      <td className="device-name">{dev.name || 'Unbekannt'}</td>
                      <td>{dev.productname || '-'}</td>
                      <td>
                        <span className={`status-dot ${dev.present === '1' ? 'online' : 'offline'}`} />
                        {dev.present === '1' ? 'Online' : 'Offline'}
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
