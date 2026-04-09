import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { api } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from '../components/shared/Card';
import { SeverityBadge } from '../components/shared/SeverityBadge';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f87171',
  medium: '#f59e0b',
  low: '#10b981',
  info: '#3b82f6',
};

export function AnalysisView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const runIdParam = searchParams.get('run');

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [runId, setRunId] = useState<string | null>(runIdParam);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const { events, isDone } = useWebSocket(runId);

  useEffect(() => {
    api.getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (runIdParam && !result) {
      api.getAnalysis(runIdParam).then(setResult).catch(() => {});
    }
  }, [runIdParam]);

  useEffect(() => {
    if (isDone && runId) {
      api.getAnalysis(runId).then(setResult);
    }
  }, [isDone, runId]);

  const startAnalysis = async () => {
    if (!selectedProject) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.runAnalysis(selectedProject);
      setRunId(res.run_id);
      setSearchParams({ project: selectedProject, run: res.run_id });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = useMemo(() => {
    const progressEvents = events.filter((e) => e.type === 'analysis_progress');
    return progressEvents[progressEvents.length - 1] || null;
  }, [events]);

  const findings = result?.findings || [];
  const filtered = findings.filter((f: any) => {
    if (filterSeverity && f.severity !== filterSeverity) return false;
    if (filterCategory && f.category !== filterCategory) return false;
    return true;
  });

  const severityData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of findings) {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
    }
    return ['critical', 'high', 'medium', 'low', 'info']
      .filter((s) => counts[s])
      .map((s) => ({ severity: s, count: counts[s] }));
  }, [findings]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    findings.forEach((f: any) => set.add(f.category));
    return Array.from(set);
  }, [findings]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Code Analysis</h1>

      {/* Controls */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary flex-1"
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} - {p.path}</option>
            ))}
          </select>
          <button
            onClick={startAnalysis}
            disabled={!selectedProject || loading}
            className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Starting...' : 'Run Analysis'}
          </button>
        </div>
      </Card>

      {/* Progress */}
      {runId && !result && (
        <Card className="mb-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent" />
            <div className="flex-1">
              <p className="text-sm text-text-primary">{progress?.message || 'Starting analysis...'}</p>
              {progress?.percent != null && (
                <div className="mt-2 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(progress.percent * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          {events.filter((e) => e.type === 'analysis_event').length > 0 && (
            <div className="mt-3 max-h-32 overflow-y-auto">
              {events.filter((e) => e.type === 'analysis_event').slice(-10).map((e, i) => (
                <p key={i} className="text-xs text-text-muted py-0.5">
                  [{e.sender}] {e.msg_type}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
            <Card>
              <p className="text-xs text-text-muted mb-1">Health Score</p>
              <p className={`text-3xl font-bold ${
                result.overall_score >= 80 ? 'text-success' : result.overall_score >= 60 ? 'text-warning' : 'text-danger'
              }`}>
                {result.overall_score.toFixed(1)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted mb-1">Files Analyzed</p>
              <p className="text-3xl font-bold text-text-primary">{result.total_files}</p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted mb-1">Total Findings</p>
              <p className="text-3xl font-bold text-text-primary">{result.findings_count}</p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted mb-1">Duration</p>
              <p className="text-3xl font-bold text-text-primary">{result.duration_seconds.toFixed(1)}s</p>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mb-6">
            {/* Severity Chart */}
            <Card title="Severity Distribution">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={severityData}>
                  <XAxis dataKey="severity" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1a1b26', border: '1px solid #2e3044', borderRadius: 8 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {severityData.map((entry) => (
                      <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Language Breakdown */}
            <Card title="Languages" className="col-span-2">
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.language_breakdown || {})
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .map(([lang, lines]: any) => (
                    <div key={lang} className="px-3 py-2 bg-bg-tertiary rounded-lg">
                      <p className="text-xs text-text-muted">{lang}</p>
                      <p className="text-sm font-medium text-text-primary">{lines.toLocaleString()} lines</p>
                    </div>
                  ))}
              </div>
            </Card>
          </div>

          {/* Findings Table */}
          <Card
            title={`Findings (${filtered.length})`}
            action={
              <div className="flex gap-2">
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-secondary"
                >
                  <option value="">All Severities</option>
                  {['critical', 'high', 'medium', 'low', 'info'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-secondary"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-xs border-b border-border">
                    <th className="pb-2 pr-3">Severity</th>
                    <th className="pb-2 pr-3">Category</th>
                    <th className="pb-2 pr-3">Title</th>
                    <th className="pb-2 pr-3">File</th>
                    <th className="pb-2">Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.slice(0, 100).map((f: any, i: number) => (
                    <tr key={i} className="hover:bg-bg-hover/50">
                      <td className="py-2 pr-3"><SeverityBadge severity={f.severity} /></td>
                      <td className="py-2 pr-3 text-text-muted text-xs">{f.category}</td>
                      <td className="py-2 pr-3">
                        <p className="text-text-primary">{f.title}</p>
                        {f.suggestion && (
                          <p className="text-xs text-text-muted mt-0.5">{f.suggestion}</p>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-text-muted text-xs font-mono truncate max-w-48">{f.file_path}</td>
                      <td className="py-2 text-text-muted text-xs">{f.line_start || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-text-muted py-8 text-sm">No findings match the filters</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
