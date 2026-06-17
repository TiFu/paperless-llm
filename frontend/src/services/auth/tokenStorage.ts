const TOKEN_KEY = 'plllm_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export function onUnauthorized(cb: Listener): () => void {
  unauthorizedListeners.add(cb);
  return () => unauthorizedListeners.delete(cb);
}

export function emitUnauthorized(): void {
  unauthorizedListeners.forEach(cb => cb());
}
