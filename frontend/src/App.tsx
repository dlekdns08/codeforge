import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { AnalysisView } from './pages/AnalysisView';
import { PipelineView } from './pages/PipelineView';
import { ProjectSettings } from './pages/ProjectSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analysis" element={<AnalysisView />} />
          <Route path="/pipelines" element={<PipelineView />} />
          <Route path="/settings" element={<ProjectSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
