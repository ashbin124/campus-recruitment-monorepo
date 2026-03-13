import DataTable from '@/components/admin/DataTable';

export default function AuditTab({
  auditSearch,
  auditActionFilter,
  auditEntityFilter,
  auditActionOptions,
  auditEntityOptions,
  onAuditSearchChange,
  onAuditActionFilterChange,
  onAuditEntityFilterChange,
  onClearFilters,
  onExportAuditLogs,
  filteredAuditLogs,
  auditColumns,
}) {
  const secondaryButtonClass = 'btn-soft px-3 py-2 text-sm';
  const primaryButtonClass = 'btn-brand px-3 py-2 text-sm';

  return (
    <section className="space-y-3">
      <div className="toolbar-shell flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search logs"
          value={auditSearch}
          onChange={(event) => onAuditSearchChange(event.target.value)}
          className="min-w-[220px] flex-1 input-field"
        />

        <select
          value={auditActionFilter}
          onChange={(event) => onAuditActionFilterChange(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Actions</option>
          {auditActionOptions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <select
          value={auditEntityFilter}
          onChange={(event) => onAuditEntityFilterChange(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Entities</option>
          {auditEntityOptions.map((entityType) => (
            <option key={entityType} value={entityType}>
              {entityType}
            </option>
          ))}
        </select>

        <button type="button" onClick={onClearFilters} className={secondaryButtonClass}>
          Clear
        </button>
        <button type="button" onClick={onExportAuditLogs} className={primaryButtonClass}>
          Export CSV
        </button>
      </div>

      {filteredAuditLogs.length === 0 ? (
        <div className="empty-shell">No audit logs match these filters.</div>
      ) : (
        <DataTable
          title={`Audit Log (${filteredAuditLogs.length})`}
          columns={auditColumns}
          data={filteredAuditLogs}
          emptyMessage="No audit logs found"
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </section>
  );
}
