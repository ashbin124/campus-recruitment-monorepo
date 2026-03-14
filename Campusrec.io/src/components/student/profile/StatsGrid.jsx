import { FiAward, FiBriefcase, FiCalendar, FiUser } from 'react-icons/fi';

function StatCard({ label, value, icon }) {
  const IconComponent = icon;
  return (
    <div className="surface-panel p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <IconComponent className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-main text-xl font-semibold">{value}</p>
          <p className="text-soft text-xs uppercase tracking-wide">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function StatsGrid({ stats }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Applications" value={stats.applications} icon={FiBriefcase} />
      <StatCard label="Interviews" value={stats.interviews} icon={FiCalendar} />
      <StatCard label="Offers" value={stats.offers} icon={FiAward} />
      <StatCard label="Skills" value={stats.skills} icon={FiUser} />
    </section>
  );
}
