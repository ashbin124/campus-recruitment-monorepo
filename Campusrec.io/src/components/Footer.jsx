import { FiGithub, FiLinkedin, FiTwitter } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: FiLinkedin },
  { label: 'GitHub', href: 'https://github.com', icon: FiGithub },
  { label: 'Twitter', href: 'https://x.com', icon: FiTwitter },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-white/75 backdrop-blur">
      <div className="page-wrap py-8">
        <div className="surface-card grid gap-6 bg-gradient-to-r from-white to-slate-50/70 p-6 md:grid-cols-[1.5fr_1fr_auto] md:items-center">
          <div>
            <p className="text-base font-semibold text-gray-900">Campus Recruitment</p>
            <p className="mt-1 text-sm text-gray-600">
              One workspace for students, companies, and admins.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link to="/login" className="btn-soft px-3 py-1.5 text-xs">
              Login
            </Link>
            <Link to="/register" className="btn-soft px-3 py-1.5 text-xs">
              Register
            </Link>
            <Link to="/terms" className="btn-soft px-3 py-1.5 text-xs">
              Terms
            </Link>
            <Link to="/privacy" className="btn-soft px-3 py-1.5 text-xs">
              Privacy
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-col items-start justify-between gap-1 text-xs text-gray-500 md:flex-row md:items-center">
          <span>© {year} Campus Recruitment</span>
          <span>Built for modern campus hiring workflows.</span>
        </div>
      </div>
    </footer>
  );
}
