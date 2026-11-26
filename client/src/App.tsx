import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/toast';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import RepositoriesPage from './pages/RepositoriesPage';
import ConnectRepoPage from './pages/ConnectRepoPage';
import RepoDetailPage from './pages/RepoDetailPage';
import FindingsPage from './pages/FindingsPage';
import DependenciesPage from './pages/DependenciesPage';
import AskAiPage from './pages/AskAiPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/repos" element={<RepositoriesPage />} />
        <Route path="/repos/connect" element={<ConnectRepoPage />} />
        <Route path="/repos/:id" element={<RepoDetailPage />} />
        <Route path="/findings" element={<FindingsPage />} />
        <Route path="/dependencies" element={<DependenciesPage />} />
        <Route path="/ask" element={<AskAiPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
