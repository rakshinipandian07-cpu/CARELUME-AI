const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Get the stored auth token.
 */
function getToken() {
  return localStorage.getItem('carelume_token');
}

/**
 * Set the auth token in localStorage.
 */
export function setToken(token) {
  localStorage.setItem('carelume_token', token);
}

/**
 * Remove the auth token from localStorage.
 */
export function removeToken() {
  localStorage.removeItem('carelume_token');
}

/**
 * Core fetch wrapper with auth, JSON handling, and error mapping.
 */
async function request(endpoint, options = {}) {
  const { body, method = 'GET', auth = true, isFormData = false, ...rest } = options;

  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    method,
    headers,
    ...rest,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch (err) {
    throw new Error('Unable to reach the server. Please check your connection and try again.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    if (response.ok) return null;
    throw new Error('An unexpected error occurred. Please try again.');
  }

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
      const message = data?.message || 'Your session has expired. Please log in again.';
      const error = new Error(message);
      error.status = 401;
      throw error;
    }
    if (response.status === 403) {
      throw new Error(data?.message || 'You do not have permission to perform this action.');
    }
    if (response.status === 404) {
      throw new Error(data?.message || 'The requested resource was not found.');
    }
    throw new Error(data?.message || 'Something went wrong. Please try again.');
  }

  return data;
}

/* ── Auth ────────────────────────────────────────────────────────── */

export async function login(identifierOrEmail, password) {
  const body =
    typeof identifierOrEmail === 'object'
      ? identifierOrEmail
      : { identifier: identifierOrEmail, email: identifierOrEmail, password };

  const data = await request('/api/auth/login', {
    method: 'POST',
    body,
    auth: false,
  });
  if (data?.token) {
    setToken(data.token);
  }
  return data;
}

export async function getInvitationByToken(token) {
  return request(`/api/auth/invitation/${encodeURIComponent(token)}`, {
    auth: false,
  });
}

export async function verifyInvitation(token) {
  return request('/api/auth/verify-invitation', {
    method: 'POST',
    body: { token },
    auth: false,
  });
}

export async function signup({ token, password, languagePreference = 'en' }) {
  const data = await request('/api/auth/signup', {
    method: 'POST',
    body: { token, password, languagePreference },
    auth: false,
  });
  if (data?.token) {
    setToken(data.token);
  }
  return data;
}

export async function getMe() {
  return request('/api/auth/me');
}

export async function updateLanguagePreference(languagePreference) {
  return request('/api/auth/preference', {
    method: 'PATCH',
    body: { languagePreference },
  });
}

/* ── Patients ────────────────────────────────────────────────────── */

export async function getPatients() {
  return request('/api/patients');
}

export async function getPatient(patientId) {
  return request(`/api/patients/${encodeURIComponent(patientId)}`);
}

export async function registerPatientInvitation({ name, email, treatmentStage, customPatientId }) {
  return request('/api/patients/register-invitation', {
    method: 'POST',
    body: { name, email, treatmentStage, customPatientId },
  });
}

export async function registerPatient(payload) {
  return registerPatientInvitation(payload);
}

export async function reissueInvitation(patientId, email) {
  return request(`/api/patients/${encodeURIComponent(patientId)}/reissue-invitation`, {
    method: 'POST',
    body: { email },
  });
}

export async function getInvitations() {
  return request('/api/patients/invitations/list');
}

export async function revokeInvitation(id) {
  return request(`/api/patients/invitations/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
  });
}

/* ── Appointments ────────────────────────────────────────────────── */

export async function getAppointments() {
  return request('/api/appointments');
}

export async function bookAppointment({ date, time, reason, notes }) {
  return request('/api/appointments/book', {
    method: 'POST',
    body: { date, time, reason, notes },
  });
}

export async function createAppointment({ patientId, date, time, reason, notes }) {
  return request('/api/appointments', {
    method: 'POST',
    body: { patientId, date, time, reason, notes },
  });
}

export async function approveAppointment(id) {
  return request(`/api/appointments/${encodeURIComponent(id)}/approve`, {
    method: 'PATCH',
  });
}

export async function proposeAppointmentReschedule(id, { proposedDate, proposedTime, staffMessage }) {
  return request(`/api/appointments/${encodeURIComponent(id)}/propose-reschedule`, {
    method: 'PATCH',
    body: { proposedDate, proposedTime, staffMessage },
  });
}

export async function respondAppointmentReschedule(id, { action, date, time, notes }) {
  return request(`/api/appointments/${encodeURIComponent(id)}/respond-reschedule`, {
    method: 'PATCH',
    body: { action, date, time, notes },
  });
}

export async function declineAppointment(id, { reason }) {
  return request(`/api/appointments/${encodeURIComponent(id)}/decline`, {
    method: 'PATCH',
    body: { reason },
  });
}

export async function updateAppointmentStatus(id, status) {
  return request(`/api/appointments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

/* ── Documents ───────────────────────────────────────────────────── */

export async function getDocuments(patientId) {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
  return request(`/api/documents${query}`);
}

export async function uploadDocument(formData) {
  return request('/api/documents/upload', {
    method: 'POST',
    body: formData,
    isFormData: true,
  });
}

export async function createDocumentRequirement({ patientId, name, category }) {
  return request('/api/documents', {
    method: 'POST',
    body: { patientId, name, category },
  });
}

export async function getSecureDocumentView(id) {
  return request(`/api/documents/${encodeURIComponent(id)}/secure-view`);
}

export async function updateDocumentStatus(id, status, reviewNotes) {
  return request(`/api/documents/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status, reviewNotes },
  });
}

/* ── Chat ────────────────────────────────────────────────────────── */

export async function sendChatMessage(question, patientId) {
  const body = { question };
  if (patientId) {
    body.patientId = patientId;
  }
  return request('/api/chat', {
    method: 'POST',
    body,
  });
}

/* ── Tickets ─────────────────────────────────────────────────────── */

export async function getTickets() {
  return request('/api/tickets');
}

export async function getTicket(id) {
  return request(`/api/tickets/${encodeURIComponent(id)}`);
}

export async function createTicket(payload) {
  return request('/api/tickets', {
    method: 'POST',
    body: payload,
  });
}

export async function replyTicket(id, { message, text, status }) {
  return request(`/api/tickets/${encodeURIComponent(id)}/reply`, {
    method: 'POST',
    body: { message, text, status },
  });
}

export async function updateTicketStatus(id, status) {
  return request(`/api/tickets/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

/* ── Notifications ───────────────────────────────────────────────── */

export async function getNotifications() {
  return request('/api/notifications');
}

export async function markNotificationRead(id) {
  return request(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead() {
  return request('/api/notifications/read-all', {
    method: 'PATCH',
  });
}
