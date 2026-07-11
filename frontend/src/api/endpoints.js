import apiClient from './client'

/* ── Auth ────────────────────────────────────────────────────────────────── */
export const authAPI = {
  register:  (data) => apiClient.post('/api/auth/register', data),
  login:     (data) => apiClient.post('/api/auth/login', data),
  refresh:   (data) => apiClient.post('/api/auth/refresh', data),
  logout:    ()     => apiClient.post('/api/auth/logout'),
}

/* ── Materials ───────────────────────────────────────────────────────────── */
export const materialsAPI = {
  upload:    (formData) => apiClient.post('/api/materials', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadText:(data)     => apiClient.post('/api/materials', data),
  getAll:    ()         => apiClient.get('/api/materials'),
  getById:   (id)       => apiClient.get(`/api/materials/${id}`),
  delete:    (id)       => apiClient.delete(`/api/materials/${id}`),
}

/* ── Summaries ───────────────────────────────────────────────────────────── */
export const summariesAPI = {
  generate:  (data) => apiClient.post('/api/summaries/generate', data),
  getByMaterial: (materialId) => apiClient.get(`/api/summaries/${materialId}`),
}

/* ── Flashcards ──────────────────────────────────────────────────────────── */
export const flashcardsAPI = {
  generate:     (data) => apiClient.post('/api/flashcards/generate', data),
  getByMaterial:(materialId) => apiClient.get(`/api/flashcards/${materialId}`),
  markKnown:    (id, data) => apiClient.put(`/api/flashcards/${id}/known`, data),
}

/* ── Quizzes ─────────────────────────────────────────────────────────────── */
export const quizzesAPI = {
  generate:         (data)         => apiClient.post('/api/quizzes/generate', data),
  getById:          (id)           => apiClient.get(`/api/quizzes/${id}`),
  getByMaterial:    (materialId)   => apiClient.get(`/api/quizzes/material/${materialId}`),
  submit:           (id, data)     => apiClient.post(`/api/quizzes/${id}/submit`, data),
}

/* ── Study Plans ─────────────────────────────────────────────────────────── */
export const studyPlanAPI = {
  generate: (data) => apiClient.post('/api/study-plan/generate', data),
  get:      ()     => apiClient.get('/api/study-plan'),
}

/* ── Analytics ───────────────────────────────────────────────────────────── */
export const analyticsAPI = {
  get: () => apiClient.get('/api/analytics'),
}
