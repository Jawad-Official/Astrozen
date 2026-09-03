import { Dispatch, SetStateAction } from 'react';
import {
  Database,
  ArrowSquareOut,
  Layout,
  Plus,
  Trash,
  X,
  XCircle,
  Rocket,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { BlueprintNode, Blueprint } from './types';
import { BlueprintCanvas } from './BlueprintCanvas';

export const BlueprintModal = ({
  blueprintModalOpen,
  setBlueprintModalOpen,
  blueprint,
  selectedNode,
  setSelectedNode,
  handleSaveBlueprint,
  nodeDetails,
  isLinkingIssue,
  setIsLinkingIssue,
  issueSearchQuery,
  setIssueSearchQuery,
  projectIssues,
  handleLinkIssue,
  handleUnlinkIssue,
  ideaId,
  generatingIssues,
  setGeneratingIssues,
}: {
  blueprintModalOpen: boolean;
  setBlueprintModalOpen: (open: boolean) => void;
  blueprint: Blueprint | null;
  selectedNode: BlueprintNode | null;
  setSelectedNode: Dispatch<SetStateAction<BlueprintNode | null>>;
  handleSaveBlueprint: (updatedNodes: BlueprintNode[]) => Promise<void>;
  nodeDetails: any;
  isLinkingIssue: boolean;
  setIsLinkingIssue: Dispatch<SetStateAction<boolean>>;
  issueSearchQuery: string;
  setIssueSearchQuery: Dispatch<SetStateAction<string>>;
  projectIssues: any[];
  handleLinkIssue: (issueId: string) => Promise<void>;
  handleUnlinkIssue: (issueId: string) => Promise<void>;
  ideaId: string | null;
  generatingIssues: boolean;
  setGeneratingIssues: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <Dialog open={blueprintModalOpen} onOpenChange={setBlueprintModalOpen}>
      <DialogContent
        className="!max-w-none bg-background border-border w-[98vw] md:w-[95vw] h-[98vh] md:h-[90vh] p-0 overflow-hidden flex flex-col"
        key={blueprintModalOpen ? 'open' : 'closed'}
      >
        <VisuallyHidden>
          <DialogTitle>Blueprint Viewer</DialogTitle>
          <DialogDescription>
            Interactive blueprint canvas with node details and issue generation
          </DialogDescription>
        </VisuallyHidden>
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Full Canvas Area */}
          <div className="flex-1 relative overflow-hidden min-w-0 h-full flex flex-col">
            <BlueprintCanvas
              className="flex-1 border-0 rounded-none"
              nodes={blueprint?.nodes || []}
              edges={blueprint?.edges || []}
              onNodeClick={(node) => {
                setSelectedNode(node);
              }}
              onNodesChange={handleSaveBlueprint}
            />
            {/* Close Button - positioned inside canvas area for mobile */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-md hover:bg-muted text-muted-foreground hover:text-foreground z-[60] border border-border"
              onClick={() => {
                setBlueprintModalOpen(false);
                setSelectedNode(null);
              }}
            >
              <X size={16} />
            </Button>
          </div>

          {/* Sidebar / Bottom Sheet */}
          <div className={cn(
              "w-full md:w-[350px] lg:w-[400px] border-t md:border-t-0 md:border-l border-border bg-card p-4 md:p-6 overflow-y-auto flex-shrink-0 transition-all duration-300 shadow-xl",
              "h-1/2 md:h-full", // Takes more space on mobile if node is selected
              !selectedNode && "hidden md:flex" // Hide on mobile if no node selected
          )}>
            {selectedNode ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300">
                {/* Node Header */}
                <div className="flex items-center justify-between md:block">
                  <div className="flex items-center gap-3 mb-0 md:mb-4">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0",
                      selectedNode.type === 'entry' ? "from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400" :
                      selectedNode.type === 'action' ? "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400" :
                      selectedNode.type === 'service' ? "from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400" :
                      selectedNode.type === 'database' ? "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400" :
                      selectedNode.type === 'external' ? "from-pink-500/20 to-pink-500/5 text-pink-600 dark:text-pink-400" :
                      "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                    )}>
                      {selectedNode.type === 'database' ? <Database size={20} weight="duotone" /> :
                       selectedNode.type === 'external' ? <ArrowSquareOut size={20} weight="duotone" /> :
                       <Layout size={20} weight="duotone" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-foreground truncate">{selectedNode.label}</h3>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-bold">{selectedNode.type}</p>
                    </div>
                  </div>

                  <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8 text-muted-foreground/40"
                      onClick={() => setSelectedNode(null)}
                  >
                      <XCircle size={20} />
                  </Button>
                </div>

                {/* Completion */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] sm:text-xs font-bold text-muted-foreground/60">
                    <span>COMPLETION</span>
                    <span>{(nodeDetails?.completion ?? selectedNode.completion) || 0}%</span>
                  </div>
                  <div className="h-1.5 sm:h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        ((nodeDetails?.completion ?? selectedNode.completion) || 0) === 100 ? "bg-emerald-500" :
                        selectedNode.type === 'database' ? "bg-amber-500" :
                        selectedNode.type === 'service' ? "bg-cyan-500" :
                        "bg-primary"
                      )}
                      style={{ width: `${(nodeDetails?.completion ?? selectedNode.completion) || 0}%` }}
                    />
                  </div>
                  {nodeDetails?.stats && (
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground/40 text-right font-medium">
                      {nodeDetails.stats.done_issues} / {nodeDetails.stats.total_issues} issues completed
                    </p>
                  )}
                </div>

                {/* Issues Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Linked Issues</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                      onClick={() => setIsLinkingIssue(!isLinkingIssue)}
                    >
                      {isLinkingIssue ? 'Cancel' : <><Plus className="mr-1" size={12} /> Add Issue</>}
                    </Button>
                  </div>

                  {/* Add Issue Search/List */}
                  <AnimatePresence>
                    {isLinkingIssue && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 sm:p-3 rounded-lg bg-muted/30 border border-border space-y-3">
                          <Input
                            placeholder="Search project issues..."
                            value={issueSearchQuery}
                            onChange={(e) => setIssueSearchQuery(e.target.value)}
                            className="h-8 text-xs bg-background/50 border-border"
                          />
                          <div className="max-h-[150px] sm:max-h-[200px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {projectIssues
                              .filter(i => i.title.toLowerCase().includes(issueSearchQuery.toLowerCase()))
                              .filter(i => !nodeDetails?.issues.some((ni: any) => ni.id === i.id))
                              .map(issue => (
                                <div
                                  key={issue.id}
                                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent group cursor-pointer transition-colors"
                                  onClick={() => handleLinkIssue(issue.id)}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-mono text-muted-foreground/40">{issue.identifier}</span>
                                    <span className="text-[11px] text-foreground/70 truncate">{issue.title}</span>
                                  </div>
                                  <Plus size={12} className="text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
                                </div>
                              ))}
                            {projectIssues.length === 0 && <p className="text-[10px] text-muted-foreground/40 text-center py-4">No other issues found</p>}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Linked Issues List */}
                  <div className="space-y-2">
                    {nodeDetails?.issues && nodeDetails.issues.length > 0 ? (
                      nodeDetails.issues.map((issue: any) => (
                        <div key={issue.id} className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-all shadow-sm">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-mono text-muted-foreground/40">{issue.identifier}</span>
                              <Badge variant="outline" className={cn(
                                "text-[7px] h-3.5 px-1 uppercase font-black",
                                issue.status === 'done' ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                                issue.status === 'in_progress' ? "text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5" :
                                "text-muted-foreground/40 border-border bg-muted"
                              )}>
                                {issue.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <span className="text-[11px] sm:text-xs font-medium text-foreground/80 truncate">{issue.title}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleUnlinkIssue(issue.id)}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      ))
                    ) : !isLinkingIssue && (
                      <div className="py-6 sm:py-8 text-center space-y-2">
                        <p className="text-[11px] text-muted-foreground/40">No issues linked to this component.</p>
                        <p className="text-[9px] text-muted-foreground/20 italic">Generate issues or link existing ones to track progress.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate Issues Button */}
                <div className="pt-4 border-t border-border">
                  <Button
                    onClick={async () => {
                      if (!ideaId || !selectedNode) return;
                      setGeneratingIssues(true);
                      try {
                        const response = await aiService.generateIssuesForNode(ideaId, selectedNode.id);
                        toast.success(response.data?.message || 'Issues generated successfully!');
                        setTimeout(() => {
                          setBlueprintModalOpen(false);
                          setSelectedNode(null);
                        }, 1500);
                      } catch (error: any) {
                        toast.error(error.response?.data?.detail || 'Failed to generate issues');
                      } finally {
                        setGeneratingIssues(false);
                      }
                    }}
                    disabled={generatingIssues}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 h-10 sm:h-11"
                  >
                    {generatingIssues ? (
                      <>
                        <ArrowClockwise className="mr-2 animate-spin" size={16} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2" weight="duotone" size={18} />
                        Generate Issues
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground/40 mt-2 text-center font-medium">
                    AI will create tasks, features, and milestones
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/20">
                <Layout size={40} weight="thin" className="mb-4 opacity-50" />
                <p className="text-xs uppercase tracking-widest font-black">Select a node</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
