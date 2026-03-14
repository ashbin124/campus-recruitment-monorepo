import { api } from '@/lib/axios';

export const getAdminStats = async () => {
  try {
    const { data } = await api.get('/admin/stats');
    return data;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

export const getAdminSettings = async () => {
  const { data } = await api.get('/admin/settings');
  return data;
};

export const updateEligibilitySettings = async (payload) => {
  const { data } = await api.put('/admin/settings/eligibility', payload);
  return data;
};

export const getRecentUsers = async ({ limit = 50, search = '', role = '' } = {}) => {
  try {
    const { data } = await api.get('/admin/users', {
      params: { limit, search, role },
    });
    return data;
  } catch (error) {
    console.error('Error fetching recent users:', error);
    throw error;
  }
};

export const getRecentJobs = async ({ limit = 50, search = '' } = {}) => {
  try {
    const { data } = await api.get('/admin/jobs', {
      params: { limit, search },
    });
    return data;
  } catch (error) {
    console.error('Error fetching recent jobs:', error);
    throw error;
  }
};

export const getAuditLogs = async ({
  limit = 50,
  search = '',
  action = '',
  entityType = '',
} = {}) => {
  try {
    const { data } = await api.get('/admin/audit-logs', {
      params: { limit, search, action, entityType },
    });
    return data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

export const createCompany = async (payload) => {
  const { data } = await api.post('/admin/companies', payload);
  return data;
};

export const deleteUser = async (userId) => {
  const { data } = await api.delete(`/admin/users/${userId}`);
  return data;
};

export const deleteJob = async (jobId) => {
  const { data } = await api.delete(`/admin/jobs/${jobId}`);
  return data;
};

export const updateUser = async (userId, payload) => {
  const { data } = await api.patch(`/admin/users/${userId}`, payload);
  return data;
};

export const bulkDeleteUsers = async (userIds) => {
  const { data } = await api.post('/admin/users/bulk-delete', { userIds });
  return data;
};
