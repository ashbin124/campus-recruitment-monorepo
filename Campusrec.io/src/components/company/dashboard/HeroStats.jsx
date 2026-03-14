import { FiBell, FiBriefcase, FiCheckCircle, FiClock, FiUsers } from 'react-icons/fi';

export default function HeroStats({ jobsCount, appCounts, jobHealth }) {
  const cards = [
    { label: 'Open Jobs', value: jobsCount, icon: <FiBriefcase className="h-4 w-4" /> },
    { label: 'Total Apps', value: appCounts.total, icon: <FiUsers className="h-4 w-4" /> },
    { label: 'New', value: appCounts.new || 0, icon: <FiBell className="h-4 w-4" /> },
    { label: 'Pending', value: appCounts.pending, icon: <FiClock className="h-4 w-4" /> },
    {
      label: 'Accepted',
      value: appCounts.accepted,
      icon: <FiCheckCircle className="h-4 w-4" />,
    },
  ];

  return (
    <section className="hero-shell relative overflow-hidden">
      <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="absolute -left-14 bottom-0 h-44 w-44 rounded-full bg-brand-300/15 blur-2xl" />

      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          Company Workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Hiring Dashboard</h1>
        <p className="mt-2 text-sm text-white/80">
          Manage jobs and candidates from one clean control panel.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {cards.map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl border border-white/20 bg-white/10 p-3">
              <div className="flex items-center justify-between text-white/70">
                <p className="text-xs uppercase tracking-wide">{label}</p>
                {icon}
              </div>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {jobHealth && (
          <div className="mt-4 grid gap-2 text-xs md:grid-cols-3">
            <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
              Schedule Ready: {jobHealth.scheduleConfigured}/{jobHealth.total}
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
              Schedule Missing: {jobHealth.scheduleMissing}
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
              Total Interview Slots: {jobHealth.totalSlots}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
