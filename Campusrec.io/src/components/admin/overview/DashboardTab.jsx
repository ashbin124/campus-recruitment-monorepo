import StatCard from '@/components/admin/StatCard';

export default function DashboardTab({
  stats,
  activeUsersCount,
  suspendedUsersCount,
  jobsWithApplicationsCount,
  openJobsCount,
  expiredJobsCount,
  closedJobsCount,
  autoClosedJobsCount,
  scheduleMissingJobsCount,
  latestAuditTime,
  onTabChange,
}) {
  const primaryButtonClass = 'btn-brand';
  const darkButtonClass = 'btn-dark';
  const secondaryButtonClass = 'btn-soft';

  return (
    <section className="space-y-6">
      <div className="metric-grid">
        <StatCard title="Total Users" value={stats.totalUsers} icon="users" />
        <StatCard title="Total Jobs" value={stats.totalJobs} icon="jobs" />
        <StatCard title="Applications" value={stats.totalApplications} icon="applications" />
        <StatCard title="Approved" value={stats.approvedApplications} icon="approved" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="metric-tile">
          <p className="metric-label">Active Users</p>
          <p className="metric-value">{activeUsersCount}</p>
          <p className="metric-note">From loaded users list</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Suspended Users</p>
          <p className="metric-value">{suspendedUsersCount}</p>
          <p className="metric-note">From loaded users list</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Jobs With Applicants</p>
          <p className="metric-value">{jobsWithApplicationsCount}</p>
          <p className="metric-note">From loaded jobs list</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Latest Audit Event</p>
          <p className="mt-2 break-words text-sm font-semibold text-slate-900">{latestAuditTime}</p>
          <p className="metric-note">Most recent activity record</p>
        </div>
      </div>

      <div className="surface-card p-5">
        <p className="section-kicker">Job Lifecycle Health</p>
        <h3 className="section-title mt-2 text-xl">Operations Snapshot</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="metric-tile">
            <p className="metric-label">Open</p>
            <p className="metric-value">{openJobsCount}</p>
          </div>
          <div className="metric-tile">
            <p className="metric-label">Expired</p>
            <p className="metric-value">{expiredJobsCount}</p>
          </div>
          <div className="metric-tile">
            <p className="metric-label">Closed</p>
            <p className="metric-value">{closedJobsCount}</p>
          </div>
          <div className="metric-tile">
            <p className="metric-label">Auto Closed</p>
            <p className="metric-value">{autoClosedJobsCount}</p>
          </div>
          <div className="metric-tile">
            <p className="metric-label">Schedule Missing</p>
            <p className="metric-value">{scheduleMissingJobsCount}</p>
          </div>
        </div>
        <p className="metric-note mt-3">
          Jobs with missing schedules can block automatic interview flow.
        </p>
      </div>

      <div className="section-shell">
        <h3 className="section-title text-xl">Quick Actions</h3>
        <p className="section-description mt-1">
          Jump directly into frequently used admin sections.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => onTabChange('users')} className={primaryButtonClass}>
            Manage Users
          </button>
          <button type="button" onClick={() => onTabChange('jobs')} className={darkButtonClass}>
            Review Jobs
          </button>
          <button
            type="button"
            onClick={() => onTabChange('audit')}
            className={secondaryButtonClass}
          >
            View Audit Logs
          </button>
          <button
            type="button"
            onClick={() => onTabChange('company')}
            className={secondaryButtonClass}
          >
            Create Company
          </button>
        </div>
      </div>
    </section>
  );
}
