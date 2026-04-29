const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getProfile() {
  return request('/api/profile');
}

export async function getAdmin() {
  return request('/api/admin');
}
