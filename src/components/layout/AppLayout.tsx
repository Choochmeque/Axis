import { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { useFileWatcher, useGitProgress } from '../../hooks';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Start file watcher and listen for changes
  useFileWatcher();
  // Listen for git operation progress events
  useGitProgress();

  return (
    <div className="flex flex-col h-full bg-(--bg-primary) text-(--text-primary)">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="main-layout">
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <Sidebar />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel minSize={50}>
            <main className="flex-1 h-full flex flex-col overflow-hidden bg-(--bg-secondary)">
              {children}
            </main>
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar />
    </div>
  );
}
