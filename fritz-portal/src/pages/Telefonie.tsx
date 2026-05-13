import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { useI18n } from '../i18n';

interface TelefonieProps {
  sid: string;
}

type TelefonieTab = 'dect' | 'calls';

export default function Telefonie({ sid }: TelefonieProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TelefonieTab>('dect');
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<any[]>([]);
  const [dectInfo, setDectInfo] = useState<any>(null);

  const headers = { 'X-Fritz-SID': sid };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [callsRes, dectRes] = await Promise.all([
        apiFetch('/api/fritz/calls', { headers }),
        apiFetch('/api/fritz/dect', { headers }),
      ]);

      setCalls(await callsRes.json());
      setDectInfo(await dectRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="terminal-cursor">$ {t('app.loading')}<span className="blink">▮</span></span>
      </div>
    );
  }

  const tabs: { id: TelefonieTab; key: string }[] = [
    { id: 'dect',  key: 'telefonie.tab.dect' },
    { id: 'calls', key: 'telefonie.tab.calls' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>{t('page.telefonie.title')}</h2>
        <p>── {t('page.telefonie.sub')}</p>
      </div>

      <div className="tab-row">
        {tabs.map(tt => (
          <button
            key={tt.id}
            onClick={() => setTab(tt.id)}
            className={`tab ${tab === tt.id ? 'active' : ''}`}
          >
            {t(tt.key)}
          </button>
        ))}
      </div>

      {tab === 'dect' && <DECTTab dectInfo={dectInfo} />}
      {tab === 'calls' && <CallsTab calls={calls} />}
    </div>
  );
}

function DECTTab({ dectInfo }: { dectInfo: any }) {
  const { t } = useI18n();
  const handsets: any[] = dectInfo?.handsets || [];
  const countLabel = handsets.length === 1
    ? t('telefonie.dect.devices.one',   { n: handsets.length })
    : t('telefonie.dect.devices.other', { n: handsets.length });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-header"><h3>{t('telefonie.dect.base')}</h3></div>
        <table>
          <tbody>
            <tr><td style={{ color: 'var(--text-secondary)', width: 220 }}>{t('telefonie.dect.active')}</td><td>{dectInfo?.NewDECTActive === '1' ? t('telefonie.dect.yes') : t('telefonie.dect.no')}</td></tr>
            <tr><td style={{ color: 'var(--text-secondary)' }}>{t('telefonie.dect.name')}</td><td>{dectInfo?.NewDECTBaseName || '—'}</td></tr>
            <tr><td style={{ color: 'var(--text-secondary)' }}>{t('telefonie.dect.eco')}</td><td>{dectInfo?.NewDECTPowerActive === '1' ? t('telefonie.dect.ecoOn') : t('telefonie.dect.ecoOff')}</td></tr>
            <tr><td style={{ color: 'var(--text-secondary)' }}>{t('telefonie.dect.pin')}</td><td>{dectInfo?.NewDECTPin ? t('telefonie.dect.pinSet') : t('telefonie.dect.pinNone')}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('telefonie.dect.handsets')}</h3>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>── {countLabel}</span>
        </div>
        {handsets.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontFamily: 'var(--font-mono)' }}>{t('telefonie.dect.empty')}</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('telefonie.dect.col.name')}</th>
                  <th>{t('telefonie.dect.col.status')}</th>
                  <th>{t('telefonie.dect.col.battery')}</th>
                </tr>
              </thead>
              <tbody>
                {handsets.map((h: any, i: number) => (
                  <tr key={i}>
                    <td className="device-name">{h.name}</td>
                    <td>
                      <span className={`status-dot ${h.active ? 'online' : 'offline'}`} />
                      {h.active
                        ? (h.connected ? t('telefonie.dect.connected') : t('telefonie.dect.standby'))
                        : t('telefonie.dect.removed')}
                    </td>
                    <td>{h.battery ? `${h.battery}%` : '—'}</td>
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

function CallsTab({ calls }: { calls: any[] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>('all');

  function callLabel(type: string) {
    switch (type) {
      case '1':  return { label: t('telefonie.calls.label.in'),     color: 'var(--success)' };
      case '2':  return { label: t('telefonie.calls.label.out'),    color: 'var(--accent)' };
      case '3':  return { label: t('telefonie.calls.label.missed'), color: 'var(--danger)' };
      case '10': return { label: t('telefonie.calls.label.inAct'),  color: 'var(--success)' };
      case '11': return { label: t('telefonie.calls.label.outAct'), color: 'var(--accent)' };
      default:   return { label: `${type}`,                          color: 'var(--text-secondary)' };
    }
  }

  const filterOptions = [
    { id: 'all',       key: 'telefonie.calls.all' },
    { id: 'incoming',  key: 'telefonie.calls.in' },
    { id: 'outgoing',  key: 'telefonie.calls.out' },
    { id: 'missed',    key: 'telefonie.calls.missed' },
  ];

  const filtered = calls.filter(c => {
    if (filter === 'incoming') return c.type === '1' || c.type === '10';
    if (filter === 'outgoing') return c.type === '2' || c.type === '11';
    if (filter === 'missed')   return c.type === '3';
    return true;
  });

  return (
    <div className="card">
      <div className="card-header">
        <h3>{t('telefonie.calls.title')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {filterOptions.map(opt => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 3,
                  border: `1px solid ${active ? 'var(--accent-soft)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: 0.3,
                }}
              >
                {t(opt.key)}
              </button>
            );
          })}
          <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
            ── {t('telefonie.calls.entries', { n: filtered.length })}
          </span>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontFamily: 'var(--font-mono)' }}>
          {t('telefonie.calls.empty')}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('telefonie.calls.col.date')}</th>
                <th>{t('telefonie.calls.col.name')}</th>
                <th>{t('telefonie.calls.col.number')}</th>
                <th>{t('telefonie.calls.col.type')}</th>
                <th>{t('telefonie.calls.col.duration')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((call, i) => {
                const { label, color } = callLabel(call.type);
                return (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>{call.date || '—'}</td>
                    <td className="device-name">{call.name || t('telefonie.calls.label.unknown')}</td>
                    <td className="device-mac">{call.number || '—'}</td>
                    <td><span style={{ color, fontWeight: 500 }}>{label}</span></td>
                    <td>{call.duration || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
