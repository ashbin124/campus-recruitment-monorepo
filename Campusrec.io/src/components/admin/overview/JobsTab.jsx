import DataTable from '@/components/admin/DataTable';

export default function JobsTab({
  jobSearch,
  jobTypeFilter,
  jobApplicantsFilter,
  jobLifecycleFilter,
  jobScheduleFilter,
  onJobSearchChange,
  onJobTypeFilterChange,
  onJobApplicantsFilterChange,
  onJobLifecycleFilterChange,
  onJobScheduleFilterChange,
  onClearFilters,
  onExportJobs,
  filteredJobs,
  jobColumns,
}) {
  const secondaryButtonClass = 'btn-soft px-3 py-2 text-sm';
  const primaryButtonClass = 'btn-brand px-3 py-2 text-sm';

  return (
    <section className="space-y-3">
      <div className="toolbar-shell flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search jobs by title/company"
          value={jobSearch}
          onChange={(event) => onJobSearchChange(event.target.value)}
          className="min-w-[220px] flex-1 input-field"
        />

        <select
          value={jobTypeFilter}
          onChange={(event) => onJobTypeFilterChange(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Types</option>
          <option value="FULL_TIME">FULL_TIME</option>
          <option value="PART_TIME">PART_TIME</option>
          <option value="INTERNSHIP">INTERNSHIP</option>
          <option value="CONTRACT">CONTRACT</option>
        </select>

        <select
          value={jobApplicantsFilter}
          onChange={(event) => onJobApplicantsFilterChange(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Jobs</option>
          <option value="WITH_APPLICANTS">With Applicants</option>
          <option value="WITHOUT_APPLICANTS">Without Applicants</option>
        </select>

        <select
          value={jobLifecycleFilter}
          onChange={(event) => onJobLifecycleFilterChange(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Lifecycle</option>
          <option value="OPEN">Open</option>
          <option value="EXPIRED">Expired</option>
          <option value="CLOSED">Closed</option>
          <option value="AUTO_CLOSED">Auto Closed</option>
        </select>

        <select
          value={jobScheduleFilter}
          onChange={(event) => onJobScheduleFilterChange(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Schedules</option>
          <option value="READY">Schedule Ready</option>
          <option value="MISSING">Schedule Missing</option>
        </select>

        <button type="button" onClick={onClearFilters} className={secondaryButtonClass}>
          Clear
        </button>
        <button type="button" onClick={onExportJobs} className={primaryButtonClass}>
          Export CSV
        </button>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="empty-shell">No jobs match these filters.</div>
      ) : (
        <DataTable
          title={`Job Management (${filteredJobs.length})`}
          columns={jobColumns}
          data={filteredJobs}
          emptyMessage="No jobs found"
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </section>
  );
}
