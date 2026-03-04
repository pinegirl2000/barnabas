const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  getMe: () => request<any>('/auth/me'),
  getUsers: () => request<any[]>('/auth/users'),
  updateUserRole: (id: string, role: string) =>
    request<any>(`/auth/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  requestVolunteer: (name: string, role?: string) => request<any>('/auth/volunteer-request', { method: 'POST', body: JSON.stringify({ name, role }) }),
  dismissFirstLogin: () => request<any>('/auth/dismiss-first-login', { method: 'POST' }),
  getVolunteerRequests: () => request<any[]>('/auth/volunteer-requests'),
  updateVolunteerRequest: (userId: string, data: { volunteerName?: string; availability?: string; role?: string }) =>
    request<any>(`/auth/volunteer-requests/${userId}/update`, { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard
  getDashboard: () => request<any>('/dashboard'),

  // Families
  getFamilies: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/families${query}`);
  },
  getFamily: (id: string) => request<any>(`/families/${id}`),
  createFamily: (data: any) => request<any>('/families', { method: 'POST', body: JSON.stringify(data) }),
  updateFamily: (id: string, data: any) => request<any>(`/families/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFamily: (id: string) => request<void>(`/families/${id}`, { method: 'DELETE' }),
  getGraduatedFamilies: (year?: string) => {
    const query = year ? `?year=${year}` : '';
    return request<any[]>(`/families/graduated${query}`);
  },
  getRegistrationHistory: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString() ? `?${params}` : '';
    return request<any[]>(`/families/registrations${query}`);
  },
  getPhoneVisitFamilies: () => request<any[]>('/families/phone-visits'),

  // Volunteers
  getVolunteers: () => request<any[]>('/volunteers'),
  getVolunteerSchedule: () => request<any>('/volunteers/schedule'),
  getVolunteer: (id: string) => request<any>(`/volunteers/${id}`),
  createVolunteer: (data: any) => request<any>('/volunteers', { method: 'POST', body: JSON.stringify(data) }),
  updateVolunteer: (id: string, data: any) => request<any>(`/volunteers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVolunteer: (id: string) => request<void>(`/volunteers/${id}`, { method: 'DELETE' }),

  // Districts
  getDistricts: () => request<any[]>('/districts'),
  createDistrict: (data: any) => request<any>('/districts', { method: 'POST', body: JSON.stringify(data) }),
  updateDistrict: (id: string, data: any) => request<any>(`/districts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDistrict: (id: string) => request<void>(`/districts/${id}`, { method: 'DELETE' }),

  // Regions
  getRegions: (districtId?: string) => {
    const query = districtId ? `?districtId=${districtId}` : '';
    return request<any[]>(`/regions${query}`);
  },
  createRegion: (data: any) => request<any>('/regions', { method: 'POST', body: JSON.stringify(data) }),
  updateRegion: (id: string, data: any) => request<any>(`/regions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRegion: (id: string) => request<void>(`/regions/${id}`, { method: 'DELETE' }),

  // Zones
  getZones: (regionId?: string) => {
    const query = regionId ? `?regionId=${regionId}` : '';
    return request<any[]>(`/zones${query}`);
  },
  createZone: (data: any) => request<any>('/zones', { method: 'POST', body: JSON.stringify(data) }),
  updateZone: (id: string, data: any) => request<any>(`/zones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteZone: (id: string) => request<void>(`/zones/${id}`, { method: 'DELETE' }),

  // Pastors
  getPastors: () => request<any[]>('/pastors'),
  createPastor: (data: any) => request<any>('/pastors', { method: 'POST', body: JSON.stringify(data) }),
  updatePastor: (id: string, data: any) => request<any>(`/pastors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Members
  updateMember: (id: string, data: any) => request<any>(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: string) => request<void>(`/members/${id}`, { method: 'DELETE' }),

  // Sessions
  getFamilySessions: (familyId: string) => request<any[]>(`/sessions/family/${familyId}`),
  updateSession: (id: string, data: any) => request<any>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  changeVolunteer: (id: string, volunteerId: string | null) =>
    request<any>(`/sessions/${id}/volunteer`, { method: 'PUT', body: JSON.stringify({ volunteerId }) }),
  assignPastor: (id: string, pastorId: string) =>
    request<any>(`/sessions/${id}/pastor`, { method: 'PUT', body: JSON.stringify({ pastorId }) }),

  // Assignments
  getAssignments: (week?: string) => {
    const query = week ? `?week=${week}` : '';
    return request<any>(`/assignments${query}`);
  },
  autoAssign: (week?: string) =>
    request<any>('/assignments/auto', { method: 'POST', body: JSON.stringify({ week }) }),
  updateAssignment: (id: string, data: any) =>
    request<any>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssignment: (id: string) =>
    request<void>(`/assignments/${id}`, { method: 'DELETE' }),
};
