import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FiCheckCircle, FiLock, FiUsers } from 'react-icons/fi';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { getErrorMessage } from '@/lib/errors.js';
import ThemeToggle from '@/components/ui/ThemeToggle.jsx';

export default function Auth({ mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const isLogin = mode === 'login';
  const navigate = useNavigate();

  const { setToken, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [registerRole, setRegisterRole] = useState('STUDENT');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const panelTitle = useMemo(() => (isLogin ? 'Welcome Back' : 'Start Your Workspace'), [isLogin]);

  const panelSubtitle = useMemo(
    () =>
      isLogin
        ? 'Sign in to continue your hiring and application workflow.'
        : 'Create an account for students or companies in under a minute.',
    [isLogin]
  );

  const panelPoints = useMemo(
    () =>
      isLogin
        ? ['Secure sign in', 'Track progress', 'Centralized dashboard']
        : ['Student and company onboarding', 'Verified hiring network', 'Fast profile setup'],
    [isLogin]
  );

  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    navigate(nextMode === 'login' ? '/login' : '/register', { replace: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { data } = await api.post('/auth/login', { email, password });
        if (!data?.token) throw new Error('Login did not return token');

        setToken(data.token);
        setUser(data.user);

        const role = data.user?.role;
        const nextPath = role === 'COMPANY' ? '/company' : role === 'ADMIN' ? '/admin' : '/student';
        toast.success('Logged in successfully.');
        navigate(nextPath, { replace: true });
      } else {
        await api.post('/auth/register', {
          name,
          email,
          password,
          role: registerRole,
          companyName: registerRole === 'COMPANY' ? companyName || name : undefined,
        });

        toast.success('Account created successfully. Please log in.');
        switchMode('login');
      }
    } catch (err) {
      const message = getErrorMessage(
        err,
        isLogin
          ? 'Login failed. Please check your email and password.'
          : 'Registration failed. Please try again.'
      );
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell justify-center px-4 py-8 md:py-12">
      <div className="page-wrap">
        <div className="surface-card mx-auto grid max-w-5xl overflow-hidden md:grid-cols-[1.05fr_1fr]">
          <section className="hero-shell relative hidden rounded-none border-0 p-10 md:block">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-300/10" />
            <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-brand-300/15 blur-2xl" />
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wider text-white/80">
              <FiLock className="h-3.5 w-3.5" />
              Secure Access
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight">{panelTitle}</h1>
            <p className="mt-3 max-w-md text-sm text-white/85">{panelSubtitle}</p>

            <div className="mt-8 space-y-3">
              {panelPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5"
                >
                  <FiCheckCircle className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm text-white/90">{point}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-white/70">Platform</p>
              <div className="mt-2 inline-flex items-center gap-2">
                <FiUsers className="h-4 w-4" />
                <span className="text-sm font-medium">Students • Companies • Admins</span>
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-8 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Access</p>
                <h2 className="mt-1 text-2xl font-semibold text-gray-900">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <div className="segmented-switch w-auto">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`segment-btn ${isLogin ? 'segment-btn-active' : 'segment-btn-idle'}`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`segment-btn ${
                      !isLogin ? 'segment-btn-active' : 'segment-btn-idle'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {!isLogin && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-gray-700">Full Name</span>
                      <input
                        className="input-field"
                        placeholder="Enter full name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-gray-700">Account Type</span>
                      <select
                        className="input-field"
                        value={registerRole}
                        onChange={(event) => setRegisterRole(event.target.value)}
                      >
                        <option value="STUDENT">Student</option>
                        <option value="COMPANY">Company</option>
                      </select>
                    </label>
                  </div>

                  {registerRole === 'COMPANY' && (
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-gray-700">Company Name</span>
                      <input
                        className="input-field"
                        placeholder="Enter company name"
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        required
                      />
                    </label>
                  )}
                </>
              )}

              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Email Address</span>
                <input
                  className="input-field"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Password</span>
                <div className="relative">
                  <input
                    className="input-field pr-10"
                    placeholder="Enter password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-brand w-full py-2.5">
                {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
              </button>
            </form>

            <p className="mt-4 text-sm text-gray-600">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    className="font-medium text-brand-700 hover:underline"
                    onClick={() => switchMode('register')}
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="font-medium text-brand-700 hover:underline"
                    onClick={() => switchMode('login')}
                  >
                    Login
                  </button>
                </>
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
