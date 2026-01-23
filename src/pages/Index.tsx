import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Header } from '@/components/layout/Header';
import { IssueList } from '@/components/issues/IssueList';
import { IssueBoard } from '@/components/issues/IssueBoard';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';
import { CommandPalette } from '@/components/CommandPalette';
import { IssueDetailPanel } from '@/components/issues/IssueDetailPanel';
import { FilterBar } from '@/components/filters/FilterBar';
import { InsightsView } from '@/components/insights/InsightsView';
import { InboxView } from '@/components/inbox/InboxView';
import { SettingsView } from '@/components/settings/SettingsView';
import { MyIssuesView } from '@/components/myissues/MyIssuesView';
import { CycleView } from '@/components/cycles/CycleView';
import { ProjectsView } from '@/components/projects/ProjectsView';
import { ProjectDetailView } from '@/components/projects/ProjectDetailView';
import { ViewsListView } from '@/components/views/ViewsListView';
import { CustomViewView } from '@/components/views/CustomViewView';
import { useIssueStore } from '@/store/issueStore';

const Index = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { viewMode, currentView } = useIssueStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      
      if (e.key === 'c' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setCreateDialogOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderMainContent = () => {
    switch (currentView) {
      case 'insights':
        return <InsightsView />;
      case 'inbox':
        return <InboxView />;
      case 'settings':
        return <SettingsView />;
      case 'my-issues':
        return <MyIssuesView />;
      case 'cycle':
        return <CycleView />;
      case 'projects':
        return <ProjectsView />;
      case 'project-detail':
        return <ProjectDetailView />;
      case 'views':
        return <ViewsListView />;
      case 'custom-view':
        return <CustomViewView />;
      case 'all':
      default:
        return (
          <>
            <FilterBar />
            {viewMode === 'list' ? <IssueList /> : <IssueBoard />}
          </>
        );
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar 
        onOpenCommandPalette={() => setCommandPaletteOpen(true)} 
        onOpenCreateDialog={() => setCreateDialogOpen(true)}
      />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {currentView === 'all' && (
          <Header 
            onCreateIssue={() => setCreateDialogOpen(true)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />
        )}
        
        <main className="flex-1 overflow-hidden flex flex-col">
          {renderMainContent()}
        </main>
      </div>

      <CreateIssueDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
      
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen}
        onCreateIssue={() => {
          setCommandPaletteOpen(false);
          setCreateDialogOpen(true);
        }}
      />
      
      <IssueDetailPanel />
    </div>
  );
};

export default Index;