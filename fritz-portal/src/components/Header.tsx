import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../lib/i18n';

type Page = 'dashboard' | 'devices' | 'device-detail' | 'network' | 'traffic' | 'telefonie' | 'smarthome' | 'system';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  version?: string;
}

const navItems: { page: Page; label: string }[] = [
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'devices',   label: 'Geräte' },
  { page: 'network',   label: 'Netzwerk' },
  { page: 'traffic',   label: 'Traffic' },
  { page: 'telefonie', label: 'Telefonie' },
  { page: 'smarthome', label: 'SmartHome' },
  { page: 'system',    label: 'System' },
];

export default function Header({ currentPage, onNavigate, version = '1.4.2' }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const isDark = theme === 'dark';

  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-mark">F!</div>
        <div className="header-wordmark">
          <span>fritz<span className="bang">!</span>portal</span>
          <span className="header-version">v{version}</span>
        </div>
      </div>

      <nav className="header-nav">
        {navItems.map(item => {
          const active = currentPage === item.page || (item.page === 'devices' && currentPage === 'device-detail');
          return (
            <button
              key={item.page}
              className={`header-nav-item ${active ? 'active' : ''}`}
              onClick={() => onNavigate(item.page)}
            >
              {t(item.label)}
            </button>
          );
        })}
      </nav>

      <div className="header-actions">
        <button
          className="header-pill"
          onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
          title={t('Sprache')}
        >
          {lang.toUpperCase()}
        </button>
        <button
          className="header-theme-toggle"
          onClick={toggleTheme}
          title={isDark ? t('Light Mode') : t('Dark Mode')}
        >
          ◐ {isDark ? 'DARK' : 'LIGHT'}
        </button>
      </div>
    </header>
  );
}
