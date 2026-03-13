import DataTable from '@/components/admin/DataTable';

export default function UsersTab({
  userSearch,
  userRoleFilter,
  userStatusFilter,
  onUserSearchChange,
  onUserRoleFilterChange,
  onUserStatusFilterChange,
  onClearFilters,
  onExportUsers,
  onSelectAllFiltered,
  onClearSelection,
  onBulkDelete,
  bulkDeleting,
  selectedDeletableCount,
  filteredUsers,
  selectedUserIds,
  userColumns,
}) {
  const secondaryButtonClass = 'btn-soft px-3 py-2 text-sm';
  const primaryButtonClass = 'btn-brand px-3 py-2 text-sm';
  const dangerButtonClass = 'btn-danger px-3 py-2 text-sm disabled:opacity-50';

  return (
    <section className="space-y-3">
      <div className="toolbar-shell flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search users by name/email"
          value={userSearch}
          onChange={(event) => onUserSearchChange(event.target.value)}
          className="min-w-[220px] flex-1 input-field"
        />

        <select
          value={userRoleFilter}
          onChange={(event) => onUserRoleFilterChange(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="COMPANY">Company</option>
          <option value="STUDENT">Student</option>
        </select>

        <select
          value={userStatusFilter}
          onChange={(event) => onUserStatusFilterChange(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <button type="button" onClick={onClearFilters} className={secondaryButtonClass}>
          Clear
        </button>
        <button type="button" onClick={onExportUsers} className={primaryButtonClass}>
          Export CSV
        </button>
      </div>

      <div className="surface-panel flex flex-wrap items-center gap-3 p-4">
        <button type="button" onClick={onSelectAllFiltered} className={secondaryButtonClass}>
          Select Filtered
        </button>
        <button type="button" onClick={onClearSelection} className={secondaryButtonClass}>
          Clear Selection
        </button>
        <button
          type="button"
          onClick={onBulkDelete}
          disabled={!selectedDeletableCount || bulkDeleting}
          className={dangerButtonClass}
        >
          {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedDeletableCount})`}
        </button>
        <span className="ml-auto text-xs text-gray-500">
          Showing {filteredUsers.length} users • Selected {selectedUserIds.length}
        </span>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="empty-shell">No users match these filters.</div>
      ) : (
        <DataTable
          title={`User Management (${filteredUsers.length})`}
          columns={userColumns}
          data={filteredUsers}
          emptyMessage="No users found"
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </section>
  );
}
