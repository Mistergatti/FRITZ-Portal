import { useState, useEffect } from 'react';
import Header from './components/Header';
import StatusLine from './components/StatusLine';
import Dashboard from './pages/Dashboard';
import DeviceList from './pages/DeviceList';
import DeviceDetail from './pages/DeviceDetail';
import Network from './pages/Network';
import Traffic from './pages/Traffic';
import Telefonie from './pages/Telefonie';
import SmartHome from './pages/SmartHome';
import System from './pages/System';
import { apiFetch } from './lib/apiFetch';
import { useI18n } from './i18n';

type Page = 'dashboard' | 'devices' | 'device-detail' | 'network' | 'traffic' | 'telefonie' | 'smarthome' | 'system';

interface CacheData {
  data: any;
  timestamp: number;
}

interface AppCache {
  [key: string]: CacheData | undefined;
}

const CACHE_TTL = 600000; // 10 minutes
const APP_VERSION = '1.4.2';

function getApiCache(key: string): any {
  const cached = (window as any).__apiCache?.[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setApiCache(key: string, data: any) {
  const cache: AppCache = (window as any).__apiCache || {};
  cache[key] = { data, timestamp: Date.now() };
  (window as any).__apiCache = cache;
}

export { getApiCache, setApiCache };

interface StatusInfo {
  uptime: number | null;
  firmware: string | null;
  wanIp: string | null;
  load: string | null;
}

function formatLoad(s: { load1?: number; load5?: number; load15?: number } | null | undefined): string | null {
  if (!s) return null;
  const fmt = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : '—');
  if (s.load1 == null && s.load5 == null && s.load15 == null) return null;
  return `${fmt(s.load1)} / ${fmt(s.load5)} / ${fmt(s.load15)}`;
}

export default function App() {
  const { t } = useI18n();
  const [sid, setSid] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusInfo>({ uptime: null, firmware: null, wanIp: null, load: null });

  // HA Add-on: Auto-Session beim Start - KEINE Login-Seite
  useEffect(() => {
    apiFetch('/api/fritz/auto-session')
      .then((r: Response) => r.json())
      .then((data: any) => {
        if (data.active && data.sid) {
          setSid(data.sid);
          setError(null);
        } else {
          setError(t('app.error.notConfigured'));
        }
        setLoading(false);
      })
      .catch(() => {
        setError(t('app.error.server'));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status-Line Daten regelmäßig aktualisieren
  useEffect(() => {
    if (!sid) return;
    const headers = { 'X-Fritz-SID': sid };

    const loadInfo = async () => {
      try {
        const r = await apiFetch('/api/fritz/device-info', { headers });
        const info = await r.json();
        setStatus(s => ({
          ...s,
          uptime: typeof info?.NewUpTime === 'number' ? info.NewUpTime : (parseInt(info?.NewUpTime, 10) || null),
          firmware: info?.NewSoftwareVersion || info?.NewFirmwareVersion || null,
          wanIp: info?.NewExternalIPAddress || s.wanIp,
        }));
      } catch {}
    };

    const loadEco = async () => {
      try {
        const r = await apiFetch('/api/fritz/eco-stats', { headers });
        const eco = await r.json();
        setStatus(s => ({ ...s, load: formatLoad(eco) }));
      } catch {}
    };

    loadInfo();
    loadEco();
    const tInfo = setInterval(loadInfo, 60000);
    const tEco  = setInterval(loadEco, 15000);
    return () => { clearInterval(tInfo); clearInterval(tEco); };
  }, [sid]);

  const handleSelectDevice = (mac: string) => {
    setSelectedDevice(mac);
    setCurrentPage('device-detail');
  };

  const handleBackToList = () => {
    setSelectedDevice(null);
    setCurrentPage('devices');
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-head">
            <span className="title">AUTH</span>
            <span>── fritz.box</span>
          </div>
          <div className="login-body">
            <div className="logo">
              <div className="icon" />
              <h1>fritz<span className="bang">!</span>portal</h1>
              <p>{t('app.init')}</p>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <span className="terminal-cursor">$ {t('app.loading')}<span className="blink">▮</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sid) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-head">
            <span className="title">AUTH</span>
            <span>── fritz.box</span>
          </div>
          <div className="login-body">
            <div className="logo">
              <div className="icon" />
              <h1>fritz<span className="bang">!</span>portal</h1>
              <p>FRITZ!Box Add-On</p>
            </div>
            <div className="error-message">
              {error || t('app.error.fallback')}
            </div>
            <div style={{ padding: '6px 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
              <p><strong style={{ color: 'var(--text-primary)' }}>$ {t('app.config.title')}</strong></p>
              <p>{t('app.config.path')}</p>
              <p>{t('app.config.hint')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        currentPage={currentPage === 'device-detail' ? 'devices' : currentPage}
        onNavigate={(page) => { setCurrentPage(page); setSelectedDevice(null); }}
        version={APP_VERSION}
      />
      <StatusLine
        authenticated={!!sid}
        uptime={status.uptime}
        firmware={status.firmware}
        load={status.load}
        wanIp={status.wanIp}
        recording={true}
      />
      <main className="main-content">
        {currentPage === 'dashboard' && <Dashboard sid={sid} />}
        {currentPage === 'devices' && <DeviceList sid={sid} onSelectDevice={handleSelectDevice} />}
        {currentPage === 'device-detail' && selectedDevice && (
          <DeviceDetail sid={sid} mac={selectedDevice} onBack={handleBackToList} />
        )}
        {currentPage === 'network' && <Network sid={sid} />}
        {currentPage === 'traffic' && <Traffic sid={sid} />}
        {currentPage === 'telefonie' && <Telefonie sid={sid} />}
        {currentPage === 'smarthome' && <SmartHome sid={sid} />}
        {currentPage === 'system' && <System sid={sid} />}
      </main>
      <div className="cmd-hint">
        <span><span className="accent">$</span> {t('app.ready')}</span>
        <span>↑↓ {t('footer.navigate')}</span>
        <span>enter {t('footer.open')}</span>
        <span>/ {t('footer.search')}</span>
        <span className="right">{t('footer.theme')}: <span className="accent">SLATE</span></span>
      </div>
    </div>
  );
}
