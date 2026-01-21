import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Header } from '@/components/layout/Header';
import { IssueList } from '@/components/issues/IssueList';
import { IssueBoard } from '@/components/issues/IssueBoard';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';
import { CommandPalette } from '@/components/CommandPalette';
import { useIssueStore } from '@/store/issueStore';

const Index = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { viewMode } = useIssueStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      
      // C for create issue (when not in an input)
      if (e.key === 'c' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setCreateDialogOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header 
          onCreateIssue={() => setCreateDialogOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        
        <main className="flex-1 overflow-hidden">
          {viewMode === 'list' ? <IssueList /> : <IssueBoard />}
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
    </div>
  );
};

export default Index;
