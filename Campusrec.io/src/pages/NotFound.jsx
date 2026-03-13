import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';

function roleHome(role) {
  if (role === 'COMPANY') return '/company';
  if (role === 'ADMIN') return '/admin';
  return '/student';
}

export default function NotFound() {
  const { token, user } = useAuth();
  const homePath = token && user ? roleHome(user.role) : '/login';

  return (
    <div className="app-shell justify-center px-4 py-16">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <section className="hero-shell text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Error</p>
          <h1 className="mt-2 text-5xl font-semibold">404</h1>
          <p className="mt-2 text-sm text-white/80">Page Not Found</p>
        </section>

        <section className="section-shell text-center">
          <p className="text-sm text-slate-600">
            The page you requested does not exist or may have been moved.
          </p>
          <div className="mt-6">
            <Link to={homePath} className="btn-brand inline-flex">
              Back To Dashboard
            </Link>
          </div>
        </section>
        <p className="text-center text-xs text-gray-500">
          Check the URL or use dashboard navigation.
        </p>
      </div>
    </div>
  );
}
