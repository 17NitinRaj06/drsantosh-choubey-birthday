import { API_URL } from "./config";

export interface WishMessage {
  id: string;
  name: string;
  department?: string;
  message: string;
  createdAt: string;
  hidden?: boolean;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let body: Record<string, unknown> = {};
      try { body = await res.json(); } catch {}
      return {
        ok: false,
        error: (body.error as string) || `HTTP ${res.status}`,
        status: res.status,
      };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    // Distinguish "cannot reach server" from other errors
    if (msg.includes("fetch") || msg.includes("NetworkError") || msg.includes("Failed to fetch")) {
      return { ok: false, error: "Cannot reach the server (check the realtime service)" };
    }
    return { ok: false, error: msg };
  }
}

// ─── Public (no auth) ───

export async function postMessage(msg: {
  name: string;
  department?: string;
  message: string;
  clientId?: string;
}): Promise<ApiResponse<WishMessage>> {
  return request<WishMessage>("/api/messages", {
    method: "POST",
    body: JSON.stringify(msg),
  });
}

export async function getMessages(): Promise<ApiResponse<WishMessage[]>> {
  return request<WishMessage[]>("/api/messages");
}

// ─── Admin (auth required) ───

export async function adminLogin(
  password: string
): Promise<ApiResponse<{ token: string; expiresIn: number }>> {
  return request<{ token: string; expiresIn: number }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function getAdminMessages(
  token: string
): Promise<ApiResponse<WishMessage[]>> {
  return request<WishMessage[]>("/api/admin/messages", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteMessage(
  token: string,
  id: string
): Promise<ApiResponse<null>> {
  return request<null>(`/api/admin/messages/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function hideMessage(
  token: string,
  id: string,
  hidden: boolean
): Promise<ApiResponse<WishMessage>> {
  return request<WishMessage>(`/api/admin/messages/${id}/hide`, {
    method: "PATCH",
    body: JSON.stringify({ hidden }),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function exportMessages(
  token: string
): Promise<ApiResponse<WishMessage[]>> {
  return request<WishMessage[]>("/api/admin/export", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
