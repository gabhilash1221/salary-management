export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) throw await readError(response);
  return response.json() as Promise<T>;
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token?: string | null,
): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { method: 'POST', body, headers });
  if (!response.ok) throw await readError(response);
  return response.json() as Promise<T>;
}

export async function apiDownload(
  path: string,
  filename: string,
  token?: string | null,
): Promise<void> {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { headers });
  if (!response.ok) throw await readError(response);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function readError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return new ApiError(body?.message ?? response.statusText, response.status);
}
