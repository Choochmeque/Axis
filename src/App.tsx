import { AppLayout } from './components/layout';
import { HistoryView } from './components/history';
import { WelcomeView } from './components/WelcomeView';
import { useRepositoryStore } from './store/repositoryStore';
import './index.css';

function App() {
  const { repository } = useRepositoryStore();

  if (!repository) {
    return <WelcomeView />;
  }

  return (
    <AppLayout>
      <HistoryView />
    </AppLayout>
  );
}

export default App;
