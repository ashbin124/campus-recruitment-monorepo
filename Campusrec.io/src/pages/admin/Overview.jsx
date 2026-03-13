import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext.jsx';
import {
  bulkDeleteUsers,
  createCompany,
  deleteJob,
  deleteUser,
  getAdminStats,
  getAuditLogs,
  getRecentJobs,
  getRecentUsers,
  updateUser,
} from '@/services/adminService';
import HeaderTabs from '@/components/admin/overview/HeaderTabs.jsx';
import DashboardTab from '@/components/admin/overview/DashboardTab.jsx';
import UsersTab from '@/components/admin/overview/UsersTab.jsx';
import JobsTab from '@/components/admin/overview/JobsTab.jsx';
import AuditTab from '@/components/admin/overview/AuditTab.jsx';
import CompanyTab from '@/components/admin/overview/CompanyTab.jsx';
import LoadingSkeleton from '@/components/admin/overview/LoadingSkeleton.jsx';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InlineAlert from '@/components/ui/InlineAlert.jsx';
import { useToast } from '@/context/ToastContext.jsx';

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Overview() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    approvedApplications: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [userBusyIds, setUserBusyIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [pendingDeleteJob, setPendingDeleteJob] = useState(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState([]);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');

  const [jobSearch, setJobSearch] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('ALL');
  const [jobApplicantsFilter, setJobApplicantsFilter] = useState('ALL');

  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    password: '',
    website: '',
  });

  const setUserBusy = (userId, isBusy) => {
    setUserBusyIds((prev) => {
      if (isBusy) return prev.includes(userId) ? prev : [...prev, userId];
      return prev.filter((id) => id !== userId);
    });
  };

  const isUserBusy = (userId) => userBusyIds.includes(userId);

  const fetchData = async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [statsData, usersData, jobsData, auditData] = await Promise.all([
        getAdminStats(),
        getRecentUsers({ limit: 150 }),
        getRecentJobs({ limit: 150 }),
        getAuditLogs({ limit: 150 }),
      ]);

      setStats(statsData);
      setRecentUsers(usersData);
      setRecentJobs(jobsData);
      setAuditLogs(auditData);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return recentUsers.filter((user) => {
      const matchesRole = userRoleFilter === 'ALL' || user.role === userRoleFilter;
      const matchesStatus =
        userStatusFilter === 'ALL' ||
        (userStatusFilter === 'ACTIVE' ? user.isActive : !user.isActive);
      const matchesSearch =
        !search ||
        String(user.name || '')
          .toLowerCase()
          .includes(search) ||
        String(user.email || '')
          .toLowerCase()
          .includes(search);
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [recentUsers, userSearch, userRoleFilter, userStatusFilter]);

  const filteredJobs = useMemo(() => {
    const search = jobSearch.trim().toLowerCase();
    return recentJobs.filter((job) => {
      const matchesSearch =
        !search ||
        String(job.title || '')
          .toLowerCase()
          .includes(search) ||
        String(job.company?.name || '')
          .toLowerCase()
          .includes(search) ||
        String(job.company?.email || '')
          .toLowerCase()
          .includes(search);
      const matchesType = jobTypeFilter === 'ALL' || String(job.type || '') === jobTypeFilter;
      const applicationCount = Number(job.applicationCount || 0);
      const matchesApplicants =
        jobApplicantsFilter === 'ALL' ||
        (jobApplicantsFilter === 'WITH_APPLICANTS' ? applicationCount > 0 : applicationCount === 0);
      return matchesSearch && matchesType && matchesApplicants;
    });
  }, [recentJobs, jobSearch, jobTypeFilter, jobApplicantsFilter]);

  const filteredAuditLogs = useMemo(() => {
    const search = auditSearch.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;
      const matchesEntity = auditEntityFilter === 'ALL' || log.entityType === auditEntityFilter;
      const matchesSearch =
        !search ||
        String(log.action || '')
          .toLowerCase()
          .includes(search) ||
        String(log.entityType || '')
          .toLowerCase()
          .includes(search) ||
        String(log.entityId || '')
          .toLowerCase()
          .includes(search) ||
        String(log.actor?.name || '')
          .toLowerCase()
          .includes(search) ||
        String(log.actor?.email || '')
          .toLowerCase()
          .includes(search);
      return matchesAction && matchesEntity && matchesSearch;
    });
  }, [auditLogs, auditSearch, auditActionFilter, auditEntityFilter]);

  const auditActionOptions = useMemo(
    () =>
      [...new Set(auditLogs.map((log) => String(log.action || '').trim()).filter(Boolean))].sort(),
    [auditLogs]
  );
  const auditEntityOptions = useMemo(
    () =>
      [
        ...new Set(auditLogs.map((log) => String(log.entityType || '').trim()).filter(Boolean)),
      ].sort(),
    [auditLogs]
  );

  useEffect(() => {
    const visibleIds = new Set(filteredUsers.map((user) => user.id));
    setSelectedUserIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [filteredUsers]);

  const handleRefresh = async () => {
    await fetchData({ silent: true });
  };

  const handleToggleUserSelect = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFilteredUsers = () => {
    const ids = filteredUsers.map((user) => user.id).filter((id) => id !== currentUser?.id);
    setSelectedUserIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleUpdateUser = async (row, payload) => {
    if (!row?.id || row.id === currentUser?.id) return;
    try {
      setUserBusy(row.id, true);
      await updateUser(row.id, payload);
      await fetchData({ silent: true });
      toast.success('User updated successfully.');
    } catch (err) {
      toast.apiError(err, 'Failed to update user.');
    } finally {
      setUserBusy(row.id, false);
    }
  };

  const handleDeleteUser = (row) => {
    if (!row?.id || row.id === currentUser?.id) return;
    setPendingDeleteUser(row);
  };

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser?.id) return;
    try {
      setDeletingUserId(pendingDeleteUser.id);
      await deleteUser(pendingDeleteUser.id);
      setSelectedUserIds((prev) => prev.filter((id) => id !== pendingDeleteUser.id));
      await fetchData({ silent: true });
      toast.success('User deleted successfully.');
    } catch (err) {
      toast.apiError(err, 'Failed to delete user.');
    } finally {
      setDeletingUserId(null);
      setPendingDeleteUser(null);
    }
  };

  const handleBulkDeleteUsers = () => {
    const deletableIds = selectedUserIds.filter((id) => id !== currentUser?.id);
    if (!deletableIds.length) return;
    setPendingBulkDeleteIds(deletableIds);
  };

  const confirmBulkDeleteUsers = async () => {
    if (!pendingBulkDeleteIds.length) return;
    try {
      setBulkDeleting(true);
      await bulkDeleteUsers(pendingBulkDeleteIds);
      setSelectedUserIds([]);
      await fetchData({ silent: true });
      toast.success(`Deleted ${pendingBulkDeleteIds.length} users.`);
    } catch (err) {
      toast.apiError(err, 'Failed to bulk delete users.');
    } finally {
      setBulkDeleting(false);
      setPendingBulkDeleteIds([]);
    }
  };

  const handleDeleteJob = (row) => {
    if (!row?.id) return;
    setPendingDeleteJob(row);
  };

  const confirmDeleteJob = async () => {
    if (!pendingDeleteJob?.id) return;
    try {
      setDeletingJobId(pendingDeleteJob.id);
      await deleteJob(pendingDeleteJob.id);
      await fetchData({ silent: true });
      toast.success('Job deleted successfully.');
    } catch (err) {
      toast.apiError(err, 'Failed to delete job.');
    } finally {
      setDeletingJobId(null);
      setPendingDeleteJob(null);
    }
  };

  const handleExportUsers = () => {
    const rows = filteredUsers.map((user) => [
      user.id,
      user.name,
      user.email,
      user.role,
      user.isActive ? 'ACTIVE' : 'INACTIVE',
      user.createdAt,
    ]);
    downloadCsv('admin-users.csv', ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined'], rows);
  };

  const handleExportJobs = () => {
    const rows = filteredJobs.map((job) => [
      job.id,
      job.title,
      job.company?.name || '',
      job.company?.email || '',
      job.type,
      job.status,
      job.applicationCount,
      job.createdAt,
    ]);
    downloadCsv(
      'admin-jobs.csv',
      ['ID', 'Title', 'Company', 'Company Email', 'Type', 'Status', 'Applications', 'Posted'],
      rows
    );
  };

  const handleExportAuditLogs = () => {
    const rows = filteredAuditLogs.map((log) => [
      log.id,
      log.createdAt,
      log.actor?.name || 'System',
      log.actor?.email || '',
      log.action,
      log.entityType,
      log.entityId || '',
    ]);
    downloadCsv(
      'admin-audit-logs.csv',
      ['ID', 'CreatedAt', 'Actor', 'Actor Email', 'Action', 'Entity Type', 'Entity ID'],
      rows
    );
  };

  const userColumns = [
    {
      key: 'select',
      title: '',
      render: (_value, row) => {
        const isSelf = row.id === currentUser?.id;
        return (
          <input
            type="checkbox"
            disabled={isSelf}
            checked={selectedUserIds.includes(row.id)}
            onChange={(event) => {
              event.stopPropagation();
              handleToggleUserSelect(row.id);
            }}
            className="h-4 w-4"
          />
        );
      },
    },
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    {
      key: 'role',
      title: 'Role',
      render: (value, row) => {
        const isSelf = row.id === currentUser?.id;
        const busy = isUserBusy(row.id);
        if (isSelf) return <span className="capitalize">{String(value || '').toLowerCase()}</span>;

        return (
          <select
            value={value}
            disabled={busy}
            onChange={(event) => handleUpdateUser(row, { role: event.target.value })}
            className="select-field w-auto px-2.5 py-1.5 text-xs font-medium"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="COMPANY">COMPANY</option>
            <option value="STUDENT">STUDENT</option>
          </select>
        );
      },
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value, row) => {
        const isSelf = row.id === currentUser?.id;
        const busy = isUserBusy(row.id);
        const active = Boolean(value);
        return (
          <button
            type="button"
            disabled={isSelf || busy}
            onClick={() => handleUpdateUser(row, { isActive: !active })}
            className={`status-pill transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${
              active
                ? 'border-green-200 bg-green-100 text-green-800 hover:bg-green-200'
                : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isSelf || busy ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {active ? 'Active' : 'Suspended'}
          </button>
        );
      },
    },
    { key: 'createdAt', title: 'Joined', type: 'date' },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value, row) => {
        const isSelf = row.id === currentUser?.id;
        const busy = deletingUserId === row.id;
        return (
          <button
            type="button"
            disabled={isSelf || busy}
            onClick={(event) => {
              event.stopPropagation();
              handleDeleteUser(row);
            }}
            className={`px-2.5 py-1.5 text-xs ${
              isSelf || busy
                ? 'btn-soft cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'btn-danger'
            }`}
          >
            {isSelf ? 'Current Admin' : busy ? 'Deleting...' : 'Delete'}
          </button>
        );
      },
    },
  ];

  const jobColumns = [
    { key: 'title', title: 'Job Title' },
    { key: 'company.name', title: 'Company' },
    {
      key: 'type',
      title: 'Type',
      render: (value) => <span className="capitalize">{value?.toLowerCase() || '-'}</span>,
    },
    { key: 'status', title: 'Status', type: 'status' },
    { key: 'applicationCount', title: 'Applications' },
    { key: 'createdAt', title: 'Posted', type: 'date' },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value, row) => (
        <button
          type="button"
          disabled={deletingJobId === row.id}
          onClick={(event) => {
            event.stopPropagation();
            handleDeleteJob(row);
          }}
          className={`px-2.5 py-1.5 text-xs ${
            deletingJobId === row.id
              ? 'btn-soft cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
              : 'btn-danger'
          }`}
        >
          {deletingJobId === row.id ? 'Deleting...' : 'Delete'}
        </button>
      ),
    },
  ];

  const auditColumns = [
    { key: 'createdAt', title: 'Time', type: 'date' },
    {
      key: 'actor',
      title: 'Actor',
      render: (_value, row) => row.actor?.name || 'System',
    },
    { key: 'action', title: 'Action' },
    { key: 'entityType', title: 'Entity' },
    { key: 'entityId', title: 'Entity ID' },
  ];

  const handleFormChange = (field, value) => {
    setCompanyForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCompany = async (event) => {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!companyForm.companyName.trim() || !companyForm.email.trim() || !companyForm.password) {
      setCreateError('Company name, email, and password are required.');
      return;
    }

    try {
      setCreateLoading(true);
      await createCompany({
        companyName: companyForm.companyName.trim(),
        contactName: companyForm.contactName.trim(),
        email: companyForm.email.trim(),
        password: companyForm.password,
        website: companyForm.website.trim(),
      });

      setCreateSuccess('Company account created successfully.');
      setCompanyForm({
        companyName: '',
        contactName: '',
        email: '',
        password: '',
        website: '',
      });
      await fetchData({ silent: true });
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Failed to create company account.');
    } finally {
      setCreateLoading(false);
    }
  };

  const selectedDeletableCount = selectedUserIds.filter((id) => id !== currentUser?.id).length;
  const activeUsersCount = recentUsers.filter((user) => Boolean(user.isActive)).length;
  const suspendedUsersCount = recentUsers.filter((user) => !user.isActive).length;
  const jobsWithApplicationsCount = recentJobs.filter(
    (job) => Number(job.applicationCount) > 0
  ).length;
  const latestAuditTime = auditLogs[0]?.createdAt
    ? new Date(auditLogs[0].createdAt).toLocaleString()
    : 'No entries yet';
  const lastSyncedLabel = lastSyncedAt ? lastSyncedAt.toLocaleString() : 'Not synced yet';

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users', badge: filteredUsers.length },
    { id: 'jobs', label: 'Jobs', badge: filteredJobs.length },
    { id: 'audit', label: 'Audit', badge: filteredAuditLogs.length },
    { id: 'company', label: 'Add Company' },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <InlineAlert message={error} tone="error" />

      <HeaderTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lastSyncedLabel={lastSyncedLabel}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {activeTab === 'dashboard' && (
        <DashboardTab
          stats={stats}
          activeUsersCount={activeUsersCount}
          suspendedUsersCount={suspendedUsersCount}
          jobsWithApplicationsCount={jobsWithApplicationsCount}
          latestAuditTime={latestAuditTime}
          onTabChange={setActiveTab}
        />
      )}

      {activeTab === 'users' && (
        <UsersTab
          userSearch={userSearch}
          userRoleFilter={userRoleFilter}
          userStatusFilter={userStatusFilter}
          onUserSearchChange={setUserSearch}
          onUserRoleFilterChange={setUserRoleFilter}
          onUserStatusFilterChange={setUserStatusFilter}
          onClearFilters={() => {
            setUserSearch('');
            setUserRoleFilter('ALL');
            setUserStatusFilter('ALL');
          }}
          onExportUsers={handleExportUsers}
          onSelectAllFiltered={handleSelectAllFilteredUsers}
          onClearSelection={handleClearSelection}
          onBulkDelete={handleBulkDeleteUsers}
          bulkDeleting={bulkDeleting}
          selectedDeletableCount={selectedDeletableCount}
          filteredUsers={filteredUsers}
          selectedUserIds={selectedUserIds}
          userColumns={userColumns}
        />
      )}

      {activeTab === 'jobs' && (
        <JobsTab
          jobSearch={jobSearch}
          jobTypeFilter={jobTypeFilter}
          jobApplicantsFilter={jobApplicantsFilter}
          onJobSearchChange={setJobSearch}
          onJobTypeFilterChange={setJobTypeFilter}
          onJobApplicantsFilterChange={setJobApplicantsFilter}
          onClearFilters={() => {
            setJobSearch('');
            setJobTypeFilter('ALL');
            setJobApplicantsFilter('ALL');
          }}
          onExportJobs={handleExportJobs}
          filteredJobs={filteredJobs}
          jobColumns={jobColumns}
        />
      )}

      {activeTab === 'audit' && (
        <AuditTab
          auditSearch={auditSearch}
          auditActionFilter={auditActionFilter}
          auditEntityFilter={auditEntityFilter}
          auditActionOptions={auditActionOptions}
          auditEntityOptions={auditEntityOptions}
          onAuditSearchChange={setAuditSearch}
          onAuditActionFilterChange={setAuditActionFilter}
          onAuditEntityFilterChange={setAuditEntityFilter}
          onClearFilters={() => {
            setAuditSearch('');
            setAuditActionFilter('ALL');
            setAuditEntityFilter('ALL');
          }}
          onExportAuditLogs={handleExportAuditLogs}
          filteredAuditLogs={filteredAuditLogs}
          auditColumns={auditColumns}
        />
      )}

      {activeTab === 'company' && (
        <CompanyTab
          companyForm={companyForm}
          createLoading={createLoading}
          createError={createError}
          createSuccess={createSuccess}
          onFormChange={handleFormChange}
          onSubmit={handleCreateCompany}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteUser)}
        title="Delete User"
        description={`Delete "${pendingDeleteUser?.name || ''}" (${pendingDeleteUser?.email || ''})?`}
        confirmText="Delete User"
        confirmVariant="danger"
        busy={Boolean(deletingUserId)}
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={confirmDeleteUser}
      />

      <ConfirmDialog
        open={pendingBulkDeleteIds.length > 0}
        title="Bulk Delete Users"
        description={`Delete ${pendingBulkDeleteIds.length} selected user(s)? This action cannot be undone.`}
        confirmText="Delete Selected"
        confirmVariant="danger"
        busy={bulkDeleting}
        onCancel={() => setPendingBulkDeleteIds([])}
        onConfirm={confirmBulkDeleteUsers}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteJob)}
        title="Delete Job"
        description={`Delete job "${pendingDeleteJob?.title || ''}"?`}
        confirmText="Delete Job"
        confirmVariant="danger"
        busy={Boolean(deletingJobId)}
        onCancel={() => setPendingDeleteJob(null)}
        onConfirm={confirmDeleteJob}
      />
    </div>
  );
}
