import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GitBranch, Play, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { api } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from '../components/shared/Card';
import { StatusBadge } from '../components/shared/StatusBadge';

export function PipelineView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const runIdParam = searchParams.get('run');

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [runId, setRunId] = useState<string | null>(runIdParam);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const { events, isDone } = useWebSocket(runId);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      api.detectPipelines(selectedProject).then(setPipelines).catch(() => setPipelines([]));
    }
  }, [selectedProject]);

  useEffect(() => {
    if (runIdParam && !result) {
      api.getPipeline(runIdParam).then(setResult).catch(() => {});
    }
  }, [runIdParam]);

  useEffect(() => {
    if (isDone && runId) {
      api.getPipeline(runId).then(setResult);
    }
  }, [isDone, runId]);

  const logLines = useMemo(
    () => events.filter((e) => e.type === 'pipeline_log'),
    [events],
  );

  const pipelineEvents = useMemo(
    () => events.filter((e) => e.type === 'pipeline_event'),
    [events],
  );

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logLines.length]);

  const startPipeline = async () => {
    if (!selectedProject) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.runPipeline(selectedProject);
      setRunId(res.run_id);
      setSearchParams({ project: selectedProject, run: res.run_id });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleJob = (name: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failure': return <XCircle className="w-4 h-4 text-danger" />;
      case 'running': return <div className="animate-spin rounded-full h-4 w-4 border-2 border-info border-t-transparent" />;
      case 'skipped': return <Clock className="w-4 h-4 text-text-muted" />;
      default: return <Clock className="w-4 h-4 text-text-muted" />;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pipelines</h1>

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
            onClick={startPipeline}
            disabled={!selectedProject || loading}
            className="flex items-center gap-2 px-5 py-2 bg-success text-white rounded-lg text-sm hover:bg-success/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Starting...' : 'Run Pipeline'}
          </button>
        </div>
        {pipelines.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {pipelines.map((p, i) => (
              <div key={i} className="px-3 py-1.5 bg-bg-tertiary rounded-lg text-xs text-text-secondary">
                <GitBranch className="w-3 h-3 inline mr-1" />
                {p.name} ({p.source_type}) - {p.total_jobs} jobs
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Live Events */}
      {runId && !result && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mb-6">
          {/* Event Feed */}
          <Card title="Pipeline Events">
            <div className="max-h-64 overflow-y-auto space-y-1">
              {pipelineEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1">
                  {statusIcon(e.status || 'running')}
                  <span className="text-text-muted">{e.event}</span>
                  <span className="text-text-primary">{e.target}</span>
                </div>
              ))}
              {pipelineEvents.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />
                  Waiting for events...
                </div>
              )}
            </div>
          </Card>

          {/* Log Stream */}
          <Card title="Log Stream">
            <div className="bg-bg-primary rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs">
              {logLines.map((log, i) => (
                <div key={i} className={`py-0.5 ${log.stream === 'stderr' ? 'text-danger' : 'text-text-secondary'}`}>
                  <span className="text-text-muted">[{log.step}]</span> {log.text}
                </div>
              ))}
              <div ref={logEndRef} />
              {logLines.length === 0 && (
                <p className="text-text-muted">Waiting for output...</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Results */}
      {result && result.stages && (
        <>
          {/* Summary */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
            <Card>
              <p className="text-xs text-text-muted mb-1">Status</p>
              <StatusBadge status={result.status} />
            </Card>
            <Card>
              <p className="text-xs text-text-muted mb-1">Total Jobs</p>
              <p className="text-2xl font-bold text-text-primary">{result.total_jobs}</p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted mb-1">Passed / Failed</p>
              <p className="text-2xl font-bold">
                <span className="text-success">{result.passed_jobs}</span>
                <span className="text-text-muted"> / </span>
                <span className="text-danger">{result.failed_jobs}</span>
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted mb-1">Duration</p>
              <p className="text-2xl font-bold text-text-primary">{result.duration?.toFixed(1)}s</p>
            </Card>
          </div>

          {/* Stages & Jobs */}
          <div className="space-y-4">
            {result.stages.map((stage: any) => (
              <Card key={stage.stage_name} title={stage.stage_name} action={<StatusBadge status={stage.status} />}>
                <div className="space-y-2">
                  {stage.jobs.map((job: any) => (
                    <div key={job.job_name} className="border border-border/50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleJob(job.job_name)}
                        className="w-full flex items-center justify-between p-3 hover:bg-bg-hover/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedJobs.has(job.job_name) ? (
                            <ChevronDown className="w-4 h-4 text-text-muted" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                          )}
                          {statusIcon(job.status)}
                          <span className="text-sm text-text-primary">{job.job_name}</span>
                          {job.matrix_key && (
                            <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded">{job.matrix_key}</span>
                          )}
                        </div>
                        <span className="text-xs text-text-muted">{job.duration?.toFixed(1)}s</span>
                      </button>
                      {expandedJobs.has(job.job_name) && (
                        <div className="border-t border-border/50 p-3 space-y-2">
                          {job.steps.map((step: any) => (
                            <div key={step.step_name} className="flex items-start gap-3">
                              {statusIcon(step.status)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-text-primary">{step.step_name}</span>
                                  <span className="text-xs text-text-muted">{step.duration?.toFixed(2)}s</span>
                                </div>
                                {step.logs?.length > 0 && (
                                  <div className="mt-1 bg-bg-primary rounded p-2 font-mono text-xs max-h-32 overflow-y-auto">
                                    {step.logs.map((log: any, li: number) => (
                                      <div key={li} className={log.stream === 'stderr' ? 'text-danger' : 'text-text-muted'}>
                                        {log.text}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
