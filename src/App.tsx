import { useEffect } from 'react';
import { AppLayout } from './components/layout';
import { HistoryView } from './components/history';
import { WorkspaceView } from './components/workspace';
import { WelcomeView } from './components/WelcomeView';
import { ContentSearch } from './components/search/ContentSearch';
import { useRepositoryStore } from './store/repositoryStore';
import { useSettingsStore } from './store/settingsStore';
import './index.css';

function App() {
  const { repository, currentView } = useRepositoryStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
        return <ContentSearch />;
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
