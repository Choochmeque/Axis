import { AppLayout } from './components/layout';
import { HistoryView } from './components/history';
import { WorkspaceView } from './components/workspace';
import { WelcomeView } from './components/WelcomeView';
import { useRepositoryStore } from './store/repositoryStore';
import './index.css';

function App() {
  const { repository, currentView } = useRepositoryStore();

  if (!repository) {
    return <WelcomeView />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'file-status':
        return <WorkspaceView />;
      case 'history':
        return <HistoryView />;
      case 'search':
        return <div style={{ padding: 20, color: 'var(--text-secondary)' }}>Search coming soon...</div>;
      default:
        return <WorkspaceView />;
    }
  };

  return (
    <AppLayout>
      {renderView()}
    </AppLayout>
  );
}

export default App;
