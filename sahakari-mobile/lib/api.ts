// ============================================================
// Sahakari Mobile - API Client
// Connects to the Sahakari System backend API
// ============================================================

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Get the backend URL - in production, this would be the actual server
// For development, use localhost with the port
const getBaseUrl = () => {
  // In production, replace with your actual server URL
  // e.g., 'https://api.janatasahakari.org.np'
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    return `http://${debuggerHost.split(':')[0]}:3000`;
  }
  return 'http://localhost:3000';
};

const BASE_URL = getBaseUrl();

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BASE_URL;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await SecureStore.getItemAsync('session_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `next-auth.session-token=${token}` } : {}),
    };
  }

  async get<T = any>(path: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (response.status === 401) {
        await SecureStore.deleteItemAsync('session_token');
        return { error: 'Authentication required', status: 401 };
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error: any) {
      return { error: error.message || 'Network error', status: 0 };
    }
  }

  async post<T = any>(path: string, body: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Save session token from Set-Cookie header
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/next-auth\.session-token=([^;]+)/);
        if (match) {
          await SecureStore.setItemAsync('session_token', match[1]);
        }
      }

      return { data, status: response.status };
    } catch (error: any) {
      return { error: error.message || 'Network error', status: 0 };
    }
  }

  async put<T = any>(path: string, body: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return { data, status: response.status };
    } catch (error: any) {
      return { error: error.message || 'Network error', status: 0 };
    }
  }

  async delete<T = any>(path: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      return { data, status: response.status };
    } catch (error: any) {
      return { error: error.message || 'Network error', status: 0 };
    }
  }

  // Auth-specific methods
  async login(email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        credentials: 'include',
      });

      // Extract session token from response cookies
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/next-auth\.session-token=([^;]+)/);
        if (match) {
          await SecureStore.setItemAsync('session_token', match[1]);
          return { data: { success: true }, status: 200 };
        }
      }

      // Alternative: use the CSRF token flow
      if (response.ok) {
        return { data: { success: true }, status: 200 };
      }

      return { error: 'Invalid credentials', status: 401 };
    } catch (error: any) {
      return { error: error.message || 'Network error', status: 0 };
    }
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('session_token');
    await SecureStore.deleteItemAsync('user_data');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const api = new ApiClient();
export default api;
