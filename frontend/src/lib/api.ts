/**
 * Thin fetch wrapper around the NetBot FastAPI backend.
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (set it in .env.local), falling
 * back to localhost:8000 for local dev against `uvicorn app.main:app --reload`.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Use localStorage so the session survives tab/browser close.
// Call setToken(null) explicitly on logout to clear it.
const TOKEN_KEY = "netbot-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore -- storage may be blocked in private mode.
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // Response wasn't JSON -- fall back to statusText.
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.blob()) as unknown as T;
}

function jsonInit(body: unknown, init: RequestInit & { auth?: boolean } = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  return { ...init, method: init.method ?? "POST", headers, body: JSON.stringify(body) };
}

// ---------- Auth ----------

export type AuthResult = { access_token: string; user_id: string };

export async function signup(email: string, password: string, faceImage: Blob): Promise<AuthResult> {
  const form = new FormData();
  form.append("email", email);
  form.append("password", password);
  form.append("face_image", faceImage, "face.jpg");
  return request<AuthResult>("/auth/signup", { method: "POST", body: form, auth: false });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const form = new FormData();
  form.append("email", email);
  form.append("password", password);
  return request<AuthResult>("/auth/login", { method: "POST", body: form, auth: false });
}

export async function faceLogin(
  email: string,
  faceImage: Blob,
): Promise<AuthResult & { similarity: number }> {
  const form = new FormData();
  form.append("email", email);
  form.append("face_image", faceImage, "face.jpg");
  return request<AuthResult & { similarity: number }>("/auth/face-login", {
    method: "POST",
    body: form,
    auth: false,
  });
}

export async function googleAuth(idToken: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/google", jsonInit({ id_token: idToken }, { auth: false }));
}

export async function reEnrollFace(faceImage: Blob): Promise<{ message: string }> {
  const form = new FormData();
  form.append("face_image", faceImage, "face.jpg");
  return request("/auth/re-enroll-face", { method: "POST", body: form });
}

export function deleteAccount(): Promise<{ deleted: string }> {
  return request("/auth/me", { method: "DELETE" });
}

// ---------- Sessions ----------

export type ChatSession = { id: string; title: string; created_at: string };
export type ChatMessage = { role: "user" | "model"; content: string };

export function listSessions(): Promise<ChatSession[]> {
  return request<ChatSession[]>("/sessions/");
}

export function createSession(title = "New Chat"): Promise<ChatSession> {
  return request<ChatSession>("/sessions/", jsonInit({ title }));
}

export function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/sessions/${sessionId}/messages`);
}

export function renameSession(sessionId: string, title: string): Promise<ChatSession> {
  return request<ChatSession>(`/sessions/${sessionId}`, jsonInit({ title }, { method: "PATCH" }));
}

export function deleteSession(sessionId: string): Promise<{ deleted: string }> {
  return request(`/sessions/${sessionId}`, { method: "DELETE" });
}

// ---------- Chat ----------

export type ChatSource = { document_id: string; chunk_index: number; similarity: number };
export type ChatReply = { response: string; tools_used: string[]; sources: ChatSource[] };

export function sendChatMessage(
  sessionId: string,
  message: string,
  opts: { useMemory?: boolean; useTools?: boolean; useDocuments?: boolean } = {},
): Promise<ChatReply> {
  return request<ChatReply>(
    "/chat/",
    jsonInit({
      session_id: sessionId,
      message,
      use_memory: opts.useMemory ?? true,
      use_tools: opts.useTools ?? true,
      use_documents: opts.useDocuments ?? true,
    }),
  );
}

// ---------- Documents ----------

export type DocumentSummary = { id: string; filename: string; status: string; created_at: string };
export type UploadResult = { document_id: string; filename: string; chunks_indexed: number; status: string };
export type AskResult = {
  answer: string;
  sources: { chunk_index: number; similarity: number }[];
};

export function listDocuments(): Promise<DocumentSummary[]> {
  return request<DocumentSummary[]>("/documents/");
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResult>("/documents/upload", { method: "POST", body: form });
}

export function askDocument(documentId: string, question: string): Promise<AskResult> {
  return request<AskResult>(`/documents/${documentId}/ask`, jsonInit({ question }));
}

export function deleteDocument(documentId: string): Promise<{ deleted: string }> {
  return request(`/documents/${documentId}`, { method: "DELETE" });
}

// ---------- Memory ----------

export type MemoryItem = { id: string; content: string; created_at: string };

export function listMemories(): Promise<MemoryItem[]> {
  return request<MemoryItem[]>("/memory/");
}

export function createMemory(content: string): Promise<MemoryItem> {
  return request<MemoryItem>("/memory/", jsonInit({ content }));
}

export function deleteMemory(memoryId: string): Promise<{ deleted: string }> {
  return request(`/memory/${memoryId}`, { method: "DELETE" });
}

// ---------- Audio (optional -- frontend uses browser Speech APIs by default) ----------

export async function transcribeAudio(blob: Blob): Promise<{ text: string; language?: string }> {
  const form = new FormData();
  form.append("file", blob, "clip.webm");
  return request("/audio/transcribe", { method: "POST", body: form });
}

export async function synthesizeSpeech(text: string, lang = "en"): Promise<Blob> {
  const form = new FormData();
  form.append("text", text);
  form.append("lang", lang);
  return request<Blob>("/audio/speak", { method: "POST", body: form });
}

// ---------- Tools ----------

export function invokeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  return request(`/tools/${toolName}/invoke`, jsonInit({ arguments: args }));
}

export { ApiError as NetBotApiError };
