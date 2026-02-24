import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { CommandPalette } from '@/components/CommandPalette';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useIssueStore } from '@/store/issueStore';
import { IssueBar } from '@/components/IssueBar';
import { CreateTeamDialog } from '@/components/dialogs/CreateTeamDialog';
import { AIPlannerDialog } from '@/components/dialogs/AIPlannerDialog';
import { useAuth } from '@/context/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { List, SidebarSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team');
  
  const { 
    selectedIssueId, 
    setSelectedIssue, 
    getIssueById, 
    updateIssue, 
    getIssueComments, 
    getIssueActivities, 
    addComment, 
    projects, 
    features,
    teams, 
    addIssue,
    deleteIssue,
    addTeam,
    selectedProjectId,
    fetchData,
    setCurrentUser,
    orgMembers
  } = useIssueStore();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [initialIdeaName, setInitialIdeaName] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createSubIssueParentId, setCreateSubIssueParentId] = useState<string | undefined>();

  // Load initial data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync current user to store for legacy components
  useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
    }
  }, [user?.id, setCurrentUser]);

  // ... (keyboard shortcuts and effects)

    return (
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* ... (sidebar and mobile sidebar remain unchanged) */}
        
        {/* Desktop Sidebar */}
        <div 
          className={cn(
            "hidden md:block transition-all duration-300 ease-in-out shrink-0",
            sidebarVisible ? "w-[260px]" : "w-0"
          )}
        >
          <div className={cn(
            "h-full transition-opacity duration-300",
            sidebarVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
                                                <AppSidebar 
                                                  onOpenCommandPalette={() => setCommandPaletteOpen(true)} 
                                                  onOpenCreateDialog={() => setCreateDialogOpen(true)}
                                                  onOpenCreateTeamDialog={() => setCreateTeamDialogOpen(true)}
                                                  onToggle={() => setSidebarVisible(false)}
                                                />
                                              </div>
                                            </div>
                                      
                                            {/* Mobile Sidebar (Sheet) */}
                                            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                                              <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-none outline-none">
                                                <SheetHeader className="sr-only">
                                                  <SheetTitle>Navigation Menu</SheetTitle>
                                                  <SheetDescription>Access your Inbox, Issues, Projects, and Teams.</SheetDescription>
                                                </SheetHeader>
                                                <AppSidebar 
                                                  onOpenCommandPalette={() => { setCommandPaletteOpen(true); setMobileMenuOpen(false); }} 
                                                  onOpenCreateDialog={() => { setCreateDialogOpen(true); setMobileMenuOpen(false); }} 
                                                  onOpenCreateTeamDialog={() => { setCreateTeamDialogOpen(true); setMobileMenuOpen(false); }} 
                                                  isMobile={true}
                                                  closeMobileMenu={() => setMobileMenuOpen(false)}
                                                />          </SheetContent>
        </Sheet>
        
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* ... (floating toggle button remains unchanged) */}
          {!sidebarVisible && (
            <div className="hidden md:block absolute bottom-8 left-8 z-50">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-95"
                      onClick={() => setSidebarVisible(true)}
                    >
                      <SidebarSimple className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Show sidebar ⌘\</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Mobile Header */}
          <div className="md:hidden flex items-center h-14 px-4 border-b border-white/5 bg-background shrink-0">
            <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setMobileMenuOpen(true)}>
              <List className="h-5 w-5" />
            </Button>
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800">
                    <div className="h-3 w-3 rounded-full bg-white"></div>
                  </div>
                  <span className="font-semibold ml-2 text-zinc-100">Astrozen</span>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden p-2 md:p-4">
            <main className="h-full w-full overflow-hidden flex flex-col relative rounded-xl md:rounded-2xl border border-white/5 bg-sidebar/30 backdrop-blur-xl shadow-2xl">
              <Outlet context={{ 
                onCreateIssue: () => setCreateDialogOpen(true),
                onCreateSubIssue: (parentId: string) => {
                  setCreateSubIssueParentId(parentId);
                  setCreateDialogOpen(true);
                },
                onOpenCommandPalette: () => setCommandPaletteOpen(true),
                onOpenAIPlanner: (name?: string) => {
                  if (name) setInitialIdeaName(name);
                  setAiPlannerOpen(true);
                }
              }} />
            </main>
          </div>
        </div>

        <CommandPalette 
          open={commandPaletteOpen} 
          onOpenChange={setCommandPaletteOpen}
          onCreateIssue={() => {
            setCommandPaletteOpen(false);
            setCreateDialogOpen(true);
          }}
        />
        
        <IssueBar.Detail 
          issueId={selectedIssueId}
          onClose={() => setSelectedIssue(null)}
          onUpdateIssue={updateIssue}
          onDeleteIssue={async (id) => {
            await deleteIssue(id);
            setSelectedIssue(null);
          }}
          onCreateSubIssue={(parentId) => {
            setCreateSubIssueParentId(parentId);
            setCreateDialogOpen(true);
          }}
        />

        <IssueBar.Create 
          open={createDialogOpen && !createSubIssueParentId}
          onOpenChange={setCreateDialogOpen}
          projects={projects}
          features={features}
          teams={teams}
          orgMembers={orgMembers}
          selectedProjectId={selectedProjectId}
          selectedTeamId={teamId}
          onAddIssue={async (data) => {
            await addIssue(data);
            setCreateDialogOpen(false);
          }}
        />

        {createSubIssueParentId && (() => {
          const parent = getIssueById(createSubIssueParentId);
          return parent ? (
            <IssueBar.CreateSub
              open={createDialogOpen && !!createSubIssueParentId}
              onOpenChange={(open) => {
                setCreateDialogOpen(open);
                if (!open) setCreateSubIssueParentId(undefined);
              }}
              parentIssue={parent}
              projects={projects}
              features={features}
              teams={teams}
              orgMembers={orgMembers}
              onAddIssue={async (data) => {
                await addIssue(data);
                setCreateDialogOpen(false);
                setCreateSubIssueParentId(undefined);
              }}
            />
          ) : null;
        })()}

        <CreateTeamDialog 
          open={createTeamDialogOpen} 
          onOpenChange={setCreateTeamDialogOpen} 
          onCreateTeam={addTeam} 
          teams={teams}
        />

        <AIPlannerDialog 
          open={aiPlannerOpen} 
          onOpenChange={setAiPlannerOpen}
          initialIdeaName={initialIdeaName}
        />
      </div>
    );
}