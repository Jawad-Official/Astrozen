import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { useIssueStore } from '@/store/issueStore';
import { Notification } from '@/services/notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from '@/components/ui/empty-state';
import { 
  Tray as InboxIcon, 
  Check, 
  DotsThree,
  ChatTeardropText,
  UserPlus,
  ArrowClockwise,
  Bell,
  ChartBar,
  Layout,
  FileText,
  Lightning,
  Users,
  ShieldCheck
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const NotificationItem = ({ notification, onMarkRead, onNavigate }: { notification: Notification; onMarkRead: (id: string) => void; onNavigate: (type: string, id: string) => void }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'ISSUE_COMMENT': return <ChatTeardropText className="h-4 w-4 text-blue-400" />;
      case 'ISSUE_ASSIGNED': return <UserPlus className="h-4 w-4 text-purple-400" />;
      case 'ISSUE_STATUS_CHANGED': return <ArrowClockwise className="h-4 w-4 text-orange-400" />;
      case 'ISSUE_MENTION': return <ChatTeardropText className="h-4 w-4 text-emerald-400" />;
      case 'ISSUE_PRIORITY_UPGRADE': return <Lightning className="h-4 w-4 text-red-400" weight="fill" />;
      case 'AI_VALIDATION_READY': return <ChartBar className="h-4 w-4 text-amber-400" />;
      case 'AI_BLUEPRINT_READY': return <Layout className="h-4 w-4 text-primary" />;
      case 'AI_DOC_GENERATED': return <FileText className="h-4 w-4 text-zinc-300" />;
      case 'AI_ISSUES_CREATED': return <Lightning className="h-4 w-4 text-amber-500" />;
      case 'TEAM_INVITE': return <Users className="h-4 w-4 text-blue-500" />;
      case 'ORG_ROLE_CHANGED': return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
      default: return <Bell className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div 
      className={cn(
        "group relative flex items-start gap-4 px-4 py-4 cursor-pointer transition-all duration-300 border-b border-white/[0.02] last:border-none hover:bg-white/5",
        !notification.is_read && "bg-primary/[0.02]"
      )}
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
        if (notification.target_type && notification.target_id) {
          onNavigate(notification.target_type, notification.target_id);
        }
      }}
    >
      {!notification.is_read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
      )}
      
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/5 shrink-0 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {notification.actor_name && (
              <span className="text-sm font-semibold text-white/90">{notification.actor_name}</span>
            )}
            <span className="text-sm text-white/90 font-medium">{notification.title}</span>
          </div>
          <span className="text-[10px] text-white/20 whitespace-nowrap font-mono">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>
        
        <p className="text-sm text-white/40 leading-relaxed">{notification.content}</p>
        
        {!notification.is_read && (
          <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10 text-white/60"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark as read
            </Button>
          </div>
        )}
      </div>

      <div className="w-8 flex justify-end opacity-0 group-hover:opacity-100">
        <button className="p-1 hover:bg-white/10 rounded-md transition-colors">
          <DotsThree className="h-4 w-4 text-white/40" />
        </button>
      </div>
    </div>
  );
};

const InboxPage = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    isLoading
  } = useNotificationStore();

  const { setSelectedIssue } = useIssueStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNavigate = (type: string, id: string) => {
    switch (type) {
      case 'issue':
        setSelectedIssue(id);
        navigate('/all-issues');
        break;
      case 'ai_idea':
        // For AI ideas, we might need a specific page or open the validator
        navigate(`/ai-generator?idea=${id}`);
        break;
      case 'team':
        navigate('/settings'); // Or team settings
        break;
    }
  };
  
  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-[#090909]">
      <div className="border-b border-white/5 px-6 h-14 flex items-center justify-between shrink-0 bg-black/20 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <InboxIcon className="h-5 w-5" weight="bold" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Inbox</h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground font-black text-[10px] h-5 min-w-5 flex items-center justify-center px-1.5 uppercase tracking-tighter">
              {unreadCount} New
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[11px] font-bold text-white/30 hover:text-white"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 max-w-4xl mx-auto w-full pt-4 pb-20 px-4">
        {isLoading && notifications.length === 0 ? (
          <LoadingState message="Loading notifications..." />
        ) : notifications.length > 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/[0.02]">
            {notifications.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                onMarkRead={markAsRead} 
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<InboxIcon className="h-10 w-10 text-white/15" weight="thin" />}
            title="You're all caught up"
            description="When something important happens in your projects, you'll find those notifications here."
            size="lg"
          />
        )}
      </div>
    </div>
  );
};

export default InboxPage;
