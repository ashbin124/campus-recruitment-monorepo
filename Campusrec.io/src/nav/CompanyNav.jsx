import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiFileText, FiHome, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '@/components/ui/ThemeToggle.jsx';

export default function CompanyNav() {
  const { logout } = useAuth();
  const onLogout = () => {
    logout();
    window.location.href = '/login';
  };
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navLinkClass = ({ isActive }) =>
    `chip-nav ${isActive ? 'chip-nav-active' : 'chip-nav-idle'}`;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, location.hash]);
  return (
    <header className="workspace-header">
      <div className="workspace-header-inner">
        <Link to="/company" className="workspace-brand">
          <span className="workspace-mark">C</span>
          <span className="leading-tight">
            <span className="workspace-title">Campus Workspace</span>
            <span className="workspace-subtitle">Company</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/company" className={navLinkClass}>
            <FiHome className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink to="/company/applications" className={navLinkClass}>
            <FiFileText className="h-4 w-4" />
            Applications
          </NavLink>
          <NavLink to="/company/profile" className={navLinkClass}>
            <FiUser className="h-4 w-4" />
            Profile
          </NavLink>
          <ThemeToggle compact />
          <button
            type="button"
            onClick={onLogout}
            className="btn-dark ml-2 inline-flex items-center gap-1.5"
          >
            <FiLogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
        <button
          type="button"
          className="mobile-nav-toggle md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? (
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
      {open && (
        <div className="mobile-nav-panel text-main md:hidden">
          <nav className="page-wrap flex flex-col gap-2 py-4">
            <NavLink to="/company" className={navLinkClass} onClick={() => setOpen(false)}>
              <FiHome className="h-4 w-4" />
              Dashboard
            </NavLink>
            <NavLink
              to="/company/applications"
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              <FiFileText className="h-4 w-4" />
              Applications
            </NavLink>
            <NavLink to="/company/profile" className={navLinkClass} onClick={() => setOpen(false)}>
              <FiUser className="h-4 w-4" />
              Profile
            </NavLink>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="btn-brand mt-2 inline-flex items-center gap-1.5"
            >
              <FiLogOut className="h-4 w-4" />
              Logout
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
