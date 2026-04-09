import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Shield, Activity, TrendingUp,
  Play, CheckCircle, XCircle,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api/client';
import { Card } from '../components/shared/Card';
import { StatusBadge } from '../components/shared/StatusBadge';

export function Dashboard() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [projects, setProjects] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getDashboard(projectId).then(setDashboard).finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        {projects.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <Activity className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary mb-2">No projects yet</p>
              <Link to="/settings" className="text-accent hover:text-accent-hover text-sm">
                Register a project to get started
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} to={`/?project=${p.id}`}>
                <Card className="hover:border-accent/50 transition-colors cursor-pointer">
                  <h3 className="font-medium text-text-primary mb-1">{p.name}</h3>
                  <p className="text-xs text-text-muted truncate mb-3">{p.path}</p>
                  {p.last_score != null && (
                    <div className="flex items-center gap-2">
                      <div className={`text-2xl font-bold ${
                        p.last_score >= 80 ? 'text-success' : p.last_score >= 60 ? 'text-warning' : 'text-danger'
                      }`}>
                        {p.last_score.toFixed(0)}
                      </div>
                      <span className="text-xs text-text-muted">/ 100</span>
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>;
  }

  const d = dashboard;
  const score = d?.latest_analysis?.overall_score;
  const scoreColor = score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{d?.project?.name}</h1>
          <p className="text-sm text-text-muted">{d?.project?.path}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/analysis?project=${projectId}`}
            className="flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent rounded-lg text-sm hover:bg-accent/25 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Run Analysis
          </Link>
          <Link
            to={`/pipelines?project=${projectId}`}
            className="flex items-center gap-2 px-4 py-2 bg-success/15 text-success rounded-lg text-sm hover:bg-success/25 transition-colors"
          >
            <Play className="w-4 h-4" />
            Run Pipeline
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${score != null ? (score >= 80 ? 'bg-success/15' : score >= 60 ? 'bg-warning/15' : 'bg-danger/15') : 'bg-bg-tertiary'}`}>
              <TrendingUp className={`w-5 h-5 ${score != null ? scoreColor : 'text-text-muted'}`} />
            </div>
            <div>
              <p className="text-xs text-text-muted">Health Score</p>
              <p className={`text-2xl font-bold ${score != null ? scoreColor : 'text-text-muted'}`}>
                {score != null ? score.toFixed(0) : '--'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/15">
              <Shield className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Findings</p>
              <p className="text-2xl font-bold text-text-primary">
                {d?.latest_analysis?.findings_count ?? '--'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/15">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Pipeline</p>
              <p className="text-lg font-bold">
                {d?.latest_pipeline ? <StatusBadge status={d.latest_pipeline.status} /> : <span className="text-text-muted">--</span>}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/15">
              <Activity className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Files</p>
              <p className="text-2xl font-bold text-text-primary">
                {d?.latest_analysis?.total_files ?? '--'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Score Trend */}
        <Card title="Score Trend">
          {d?.score_history?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={d.score_history}>
                <XAxis dataKey="run_id" tick={false} />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#1a1b26', border: '1px solid #2e3044', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">No analysis history yet</p>
          )}
        </Card>

        {/* Pipeline History */}
        <Card title="Recent Pipelines">
          {d?.pipeline_history?.length > 0 ? (
            <div className="space-y-2">
              {d.pipeline_history.slice(0, 5).map((run: any) => (
                <Link
                  key={run.run_id}
                  to={`/pipelines?run=${run.run_id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {run.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : run.status === 'failure' ? (
                      <XCircle className="w-4 h-4 text-danger" />
                    ) : (
                      <Activity className="w-4 h-4 text-info animate-spin" />
                    )}
                    <span className="text-sm text-text-primary">
                      {run.pipeline_name || 'Pipeline'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    {run.duration && <span>{run.duration.toFixed(1)}s</span>}
                    <StatusBadge status={run.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">No pipeline runs yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}
