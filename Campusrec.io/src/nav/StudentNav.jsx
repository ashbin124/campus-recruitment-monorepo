import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiBriefcase, FiHome, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '@/components/ui/ThemeToggle.jsx';

export default function StudentNav() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navLinkClass = ({ isActive }) =>
    `chip-nav ${isActive ? 'chip-nav-active' : 'chip-nav-idle'}`;

  const onLogout = () => {
    logout();
    window.location.href = '/login';
  };

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, location.hash]);

  return (
    <header className="workspace-header">
      <div className="workspace-header-inner">
        <Link to="/student" className="workspace-brand">
          <span className="workspace-mark">S</span>
          <span className="leading-tight">
            <span className="workspace-title">Campus Workspace</span>
            <span className="workspace-subtitle">Student</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <NavLink to="/student" className={navLinkClass}>
            <FiHome className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink to="/student/jobs" className={navLinkClass}>
            <FiBriefcase className="h-4 w-4" />
            Jobs
          </NavLink>
          <NavLink to="/student/profile" className={navLinkClass}>
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
          onClick={() => setOpen((prev) => !prev)}
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
        <div className="mobile-nav-panel md:hidden">
          <nav className="page-wrap flex flex-col gap-2 py-4 text-sm">
            <NavLink to="/student" className={navLinkClass}>
              <FiHome className="h-4 w-4" />
              Dashboard
            </NavLink>
            <NavLink to="/student/jobs" className={navLinkClass}>
              <FiBriefcase className="h-4 w-4" />
              Jobs
            </NavLink>
            <NavLink to="/student/profile" className={navLinkClass}>
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
