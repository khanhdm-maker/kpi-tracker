const BASE = 'https://kpi-tracker-worker.khanhdm.workers.dev/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const getMe = () => request('/me');

export const getProgress = (year = 2026) =>
  request(`/progress?year=${year}`);

export const saveProgress = (entry) =>
  request('/progress', {
    method: 'POST',
    body: JSON.stringify(entry),
  });

export const getAdminUsers = () => request('/admin/users');
export const getAdminStats = () => request('/admin/stats');
export const getUserProgress = (userId, year = 2026) =>
  request(`/admin/users/${userId}/progress?year=${year}`);
export const updateUserRole = (userId, role) =>
  request(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });

export const getTeam = () => request('/team');
export const createTeam = (name) =>
  request('/team', { method: 'POST', body: JSON.stringify({ name }) });
export const addTeamMember = (email) =>
  request('/team/members', { method: 'POST', body: JSON.stringify({ email }) });
export const removeTeamMember = (user_id) =>
  request('/team/members', { method: 'DELETE', body: JSON.stringify({ user_id }) });
export const getTeamReport = (year = 2026) =>
  request(`/team/report?year=${year}`);