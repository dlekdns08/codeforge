import { useEffect, useState } from 'react';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Card } from '../components/shared/Card';

export function ProjectSettings() {
  const [projects, setProjects] = useState<any[]>([]);
  const [newPath, setNewPath] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadProjects = () => {
    api.getProjects().then(setProjects);
  };

  useEffect(loadProjects, []);

  const addProject = async () => {
    if (!newPath.trim()) return;
    setError('');
    setLoading(true);
    try {
      await api.createProject(newPath.trim(), newName.trim() || undefined);
      setNewPath('');
      setNewName('');
      loadProjects();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Project Settings</h1>

      {/* Add Project */}
      <Card title="Register Project" className="mb-6">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Project Path (absolute)</label>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/path/to/your/project"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Display Name (optional)</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="My Project"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            onClick={addProject}
            disabled={loading || !newPath.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Adding...' : 'Add Project'}
          </button>
        </div>
      </Card>

      {/* Project List */}
      <Card title="Registered Projects">
        {projects.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">No projects registered yet</p>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-bg-tertiary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{p.name}</p>
                    <p className="text-xs text-text-muted">{p.path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.last_score != null && (
                    <span className={`text-sm font-medium ${
                      p.last_score >= 80 ? 'text-success' : p.last_score >= 60 ? 'text-warning' : 'text-danger'
                    }`}>
                      {p.last_score.toFixed(0)}/100
                    </span>
                  )}
                  <span className="text-xs text-text-muted">{p.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
