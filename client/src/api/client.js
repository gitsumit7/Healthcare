import axios from 'axios';

export const TOKEN_KEY = 'medicare_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// While the backend is starting or restarting, retry reads instead of failing the page.
const MAX_RETRIES = 6;
const isServerStarting = (err) => {
  if (axios.isCancel(err)) return false;
  if (!err.response) return true;
  return Boolean(err.response.data?.starting) || [502, 503, 504].includes(err.response.status);
};

api.interceptors.response.use(undefined, async (err) => {
  const { config } = err;
  if (!config || config.method !== 'get' || !isServerStarting(err) || (config.retries ?? 0) >= MAX_RETRIES) {
    throw err;
  }
  config.retries = (config.retries ?? 0) + 1;
  await new Promise((resolve) => setTimeout(resolve, 500 * config.retries));
  return api(config);
});

export const errorMessage = (err) => {
  if (err.response?.data?.message) return err.response.data.message;
  // No API JSON body means the request never reached Express (backend down or still starting).
  if (!err.response || err.response.status >= 500) {
    return 'Cannot reach the server. Make sure the backend is running and try again.';
  }
  return err.message || 'Something went wrong';
};

export const authApi = {
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  google: (credential) => api.post('/auth/google', { credential }).then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  checkResetToken: (token) => api.get(`/auth/reset-password/${token}`).then((r) => r.data),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }).then((r) => r.data),
};

export const userApi = {
  updateMe: (data) => api.put('/users/me', data).then((r) => r.data),
  changePassword: (data) => api.put('/users/me/password', data).then((r) => r.data),
};

export const doctorApi = {
  list: (params) => api.get('/doctors', { params }).then((r) => r.data),
  specializations: () => api.get('/doctors/specializations').then((r) => r.data.specializations),
  locations: () => api.get('/doctors/locations').then((r) => r.data.states),
  get: (id) => api.get(`/doctors/${id}`).then((r) => r.data.doctor),
  slots: (id, date) => api.get(`/doctors/${id}/slots`, { params: { date } }).then((r) => r.data),
  myProfile: () => api.get('/doctors/me/profile').then((r) => r.data.doctor),
  updateMyProfile: (data) => api.put('/doctors/me/profile', data).then((r) => r.data.doctor),
};

export const appointmentApi = {
  book: (data) => api.post('/appointments', data).then((r) => r.data.appointment),
  mine: (params) => api.get('/appointments/me', { params }).then((r) => r.data.appointments),
  updateStatus: (id, data) => api.patch(`/appointments/${id}/status`, data).then((r) => r.data.appointment),
  checkOut: (id, data) => api.patch(`/appointments/${id}/checkout`, data).then((r) => r.data.appointment),
};

export const geoApi = {
  reverse: (lat, lon) => api.post('/geo/reverse', { lat, lon }).then((r) => r.data.place),
};

export const hospitalApi = {
  list: (params) => api.get('/hospitals', { params }).then((r) => r.data),
  locations: () => api.get('/hospitals/locations').then((r) => r.data.states),
  get: (id) => api.get(`/hospitals/${id}`).then((r) => r.data),
};

export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  doctors: (params) => api.get('/admin/doctors', { params }).then((r) => r.data.doctors),
  setVerification: (id, data) => api.patch(`/admin/doctors/${id}/verification`, data).then((r) => r.data.doctor),
  checkHpr: (id) => api.post(`/admin/doctors/${id}/hpr-check`).then((r) => r.data),
  importHospitals: (limit) => api.post('/admin/hospitals/import', { limit }).then((r) => r.data),
  appointments: (params) => api.get('/admin/appointments', { params }).then((r) => r.data),
  setAppointmentStatus: (id, status) =>
    api.patch(`/admin/appointments/${id}/status`, { status }).then((r) => r.data.appointment),
};

export default api;
