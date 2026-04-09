const BASE = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// ── Projects ──
export const api = {
  getProjects: () => request<any[]>('/api/projects'),
  createProject: (path: string, name?: string) =>
    request<any>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ path, name }),
    }),
  getProject: (id: string) => request<any>(`/api/projects/${id}`),

  // ── Analysis ──
  runAnalysis: (projectId: string, agents?: string[]) =>
    request<any>('/api/analysis/run', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, agents }),
    }),
  getAnalysis: (runId: string) => request<any>(`/api/analysis/${runId}`),
  getFindings: (runId: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/api/analysis/${runId}/findings${qs}`);
  },
  analysisHistory: (projectId: string) =>
    request<any[]>(`/api/analysis/history/${projectId}`),

  // ── Pipelines ──
  detectPipelines: (projectId: string) =>
    request<any[]>(`/api/pipelines/detect/${projectId}`),
  runPipeline: (projectId: string, opts?: Record<string, any>) =>
    request<any>('/api/pipelines/run', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, ...opts }),
    }),
  getPipeline: (runId: string) => request<any>(`/api/pipelines/${runId}`),
  pipelineHistory: (projectId: string) =>
    request<any[]>(`/api/pipelines/history/${projectId}`),

  // ── Dashboard ──
  getDashboard: (projectId: string) =>
    request<any>(`/api/dashboard/${projectId}`),
};

// ── WebSocket ──
export function connectWS(
  runId: string,
  onMessage: (data: any) => void,
  onClose?: () => void,
): WebSocket {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}/ws/${runId}`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };
  ws.onclose = () => onClose?.();
  return ws;
}
