import { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <Toolbar />
      <div className="app-content">
        <PanelGroup direction="horizontal" autoSaveId="main-layout">
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <Sidebar />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel minSize={50}>
            <main className="main-content">{children}</main>
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar />
    </div>
  );
}
