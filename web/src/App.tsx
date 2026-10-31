import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { QueuePage } from './pages/QueuePage';
import { BuilderPage } from './pages/BuilderPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { VncPage } from './pages/VncPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RequestDetailModal } from './components/RequestDetailModal';
import { VncViewerModal } from './components/VncViewerModal';
import { api } from './lib/api';
import { RotateCw, Activity } from 'lucide-react';
import type { WorkflowTemplate } from './types';

export function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [vncModalOpen, setVncModalOpen] = useState(false);
  const [vncUrl, setVncUrl] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<WorkflowTemplate | null>(null);

  useEffect(() => {
    // Check session validity on startup
    api.getAuthStatus()
      .then(res => {
        if (res.authenticated && res.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecking(false));

    api.getVncInfo()
      .then(res => {
        const host = window.location.hostname || res.host || 'localhost';
        const port = res.port || 8080;
        setVncUrl(`http://${host}:${port}/vnc.html?autoconnect=true`);
      })
      .catch(() => {
        setVncUrl(`http://${window.location.hostname}:8080/vnc.html?autoconnect=true`);
      });
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentTab('overview');
  };

  const handleLoadTemplate = (template: WorkflowTemplate) => {
    setActiveTemplate(template);
    setCurrentTab('builder');
  };

  if (authChecking) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-3 select-none">
        <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Verifying security session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <Layout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onOpenVncModal={() => setVncModalOpen(true)}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {currentTab === 'overview' && (
        <OverviewPage
          onNavigate={setCurrentTab}
          onSelectRequest={setSelectedRequestId}
          onOpenVnc={() => setVncModalOpen(true)}
        />
      )}

      {currentTab === 'queue' && (
        <QueuePage
          onSelectRequest={setSelectedRequestId}
          onOpenVnc={() => setVncModalOpen(true)}
        />
      )}

      {currentTab === 'builder' && (
        <BuilderPage
          onOpenVnc={() => setVncModalOpen(true)}
          activeTemplate={activeTemplate}
          onClearActiveTemplate={() => setActiveTemplate(null)}
        />
      )}

      {currentTab === 'templates' && (
        <TemplatesPage
          onLoadTemplateToBuilder={handleLoadTemplate}
          onNavigate={setCurrentTab}
        />
      )}

      {currentTab === 'schedules' && <SchedulesPage />}

      {currentTab === 'keys' && <ApiKeysPage />}

      {currentTab === 'vnc' && <VncPage />}

      {currentTab === 'settings' && <SettingsPage />}

      {/* Global Request Inspector Modal */}
      <RequestDetailModal
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        onOpenVnc={() => setVncModalOpen(true)}
      />

      {/* Global Embedded VNC Modal */}
      <VncViewerModal
        open={vncModalOpen}
        onClose={() => setVncModalOpen(false)}
        vncUrl={vncUrl}
      />
    </Layout>
  );
}

export default App;
