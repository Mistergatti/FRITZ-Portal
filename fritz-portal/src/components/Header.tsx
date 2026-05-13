import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';

type Page = 'dashboard' | 'devices' | 'device-detail' | 'network' | 'traffic' | 'telefonie' | 'smarthome' | 'system';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  version?: string;
}

const navItems: { page: Page; key: string }[] = [
  { page: 'dashboard', key: 'nav.dashboard' },
  { page: 'devices',   key: 'nav.devices' },
  { page: 'network',   key: 'nav.network' },
  { page: 'traffic',   key: 'nav.traffic' },
  { page: 'telefonie', key: 'nav.telefonie' },
  { page: 'smarthome', key: 'nav.smarthome' },
  { page: 'system',    key: 'nav.system' },
];

export default function Header({ currentPage, onNavigate, version = '1.4.2' }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { lang, t, toggleLang } = useI18n();
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
              {t(item.key)}
            </button>
          );
        })}
      </nav>

      <div className="header-actions">
        <button
          className="header-pill"
          onClick={toggleLang}
          title={lang === 'de' ? 'Switch to English' : 'Sprache wechseln'}
        >
          {lang.toUpperCase()}
        </button>
        <button
          className="header-theme-toggle"
          onClick={toggleTheme}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
        >
          ◐ {isDark ? t('header.dark') : t('header.light')}
        </button>
      </div>
    </header>
  );
}
