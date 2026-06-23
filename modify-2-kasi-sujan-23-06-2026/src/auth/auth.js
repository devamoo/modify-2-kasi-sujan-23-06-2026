// Lightweight auth state. Backed by localStorage to match the app's
// existing data layer — swap these three functions for real token
// handling when a backend is added.

const AUTH_KEY = "auth_token";

export function login(token = "session") {
  localStorage.setItem(AUTH_KEY, token);
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem(AUTH_KEY));
}
