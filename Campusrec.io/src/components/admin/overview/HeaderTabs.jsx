import { FiActivity, FiBriefcase, FiGrid, FiUsers } from 'react-icons/fi';

const tabIconById = {
  dashboard: FiGrid,
  users: FiUsers,
  jobs: FiBriefcase,
  audit: FiActivity,
  company: FiBriefcase,
};

export default function HeaderTabs({
  tabs,
  activeTab,
  onTabChange,
  lastSyncedLabel,
  refreshing,
  onRefresh,
}) {
  return (
    <section className="hero-shell relative overflow-hidden">
      <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-brand-300/15 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Admin Workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Control Center</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/80">
            Manage users, jobs, audit, and companies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-white/70">Last synced: {lastSyncedLabel}</p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-soft border-white/30 bg-white/10 text-white hover:bg-white/20 disabled:opacity-60"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div
          className="segmented-switch min-w-full border-white/20 bg-white/10 sm:min-w-0"
          role="tablist"
          aria-label="Admin sections"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tabIconById[tab.id] || FiGrid;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`segment-btn inline-flex items-center gap-2 px-4 py-2 ${
                  isActive
                    ? 'segment-btn-active'
                    : 'segment-btn-idle text-white/80 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive ? 'bg-brand-100 text-brand-700' : 'bg-white text-gray-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
