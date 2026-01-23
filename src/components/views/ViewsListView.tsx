import { useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Eye,
  Columns3,
  ChevronDown,
  CircleDot,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ViewsListView() {
  const { customViews, setCurrentView, setSelectedCustomView } = useIssueStore();
  const [activeTab, setActiveTab] = useState<'views' | 'issues' | 'projects'>('views');
  
  const personalViews = customViews.filter(v => v.visibility === 'personal');

  const handleViewClick = (viewId: string) => {
    setSelectedCustomView(viewId);
    setCurrentView('custom-view');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-white/5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('views')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'views' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Views
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'issues' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Issues
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'projects' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Projects
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Columns3 className="h-3.5 w-3.5" />
            Display
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New view
          </Button>
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-1 flex-1">
          Name
          <ChevronDown className="h-3 w-3" />
        </div>
        <div className="w-40">Owner</div>
      </div>

      {/* Views list */}
      <div className="flex-1 overflow-y-auto">
        {/* Personal views section */}
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center gap-2 text-xs">
            <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
              J
            </div>
            <span className="font-medium text-primary">Personal views</span>
            <span className="text-muted-foreground">· Only visible to you</span>
            <div className="flex-1" />
            <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
          </div>
        </div>

        {personalViews.map(view => (
          <div 
            key={view.id}
            onClick={() => handleViewClick(view.id)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{view.name}</span>
            </div>
            <div className="w-40 flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
                {view.owner.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-xs text-muted-foreground">{view.owner}</span>
            </div>
          </div>
        ))}

        {/* Default views if no custom ones */}
        {personalViews.length === 0 && (
          <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">All Issues</span>
            </div>
            <div className="w-40 flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
                J
              </div>
              <span className="text-xs text-muted-foreground">jawadcoder0</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}