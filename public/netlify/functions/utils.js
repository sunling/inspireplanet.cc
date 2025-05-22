export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  } else if (process && process.env && process.env.URL) {
    return process.env.URL;
  } else {
    return 'http://localhost:8888'; // fallback for local dev
  }
} 