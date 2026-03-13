import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext.jsx';

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`.trim()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
      {!compact && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
