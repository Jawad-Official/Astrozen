import { useState } from 'react';
import { useIssueStore, Notification } from '@/store/issueStore';
import { Badge } from '@/components/ui/badge';
import { 
  Tray as InboxIcon, 
  Check, 
  DotsThree,
  ChatTeardropText,
  UserPlus,
  ArrowClockwise,
  Bell
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

const NotificationItem = ({ notification, onMarkRead }: { notification: Notification; onMarkRead: (id: string) => void }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'comment': return <ChatTeardropText className="h-4 w-4 text-blue-400" />;
      case 'assignment': return <UserPlus className="h-4 w-4 text-purple-400" />;
      case 'status_change': return <ArrowClockwise className="h-4 w-4 text-orange-400" />;
      default: return <Bell className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div 
      className={cn(
        "group relative flex items-start gap-4 px-4 py-4 cursor-pointer transition-all duration-300 border-b border-white/[0.02] last:border-none hover:bg-white/5",
        !notification.isRead && "bg-primary/[0.02]"
      )}
      onClick={() => onMarkRead(notification.id)}
    >
      {!notification.isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
      )}
      
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/5 shrink-0 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-white/90">{notification.actorName}</span>
            <span className="text-sm text-white/40">{notification.content}</span>
            {notification.issueTitle && (
              <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                {notification.issueTitle}
              </span>
            )}
          </div>
          <span className="text-[10px] text-white/20 whitespace-nowrap font-mono">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
        
        {!notification.isRead && (
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
  const { 
    notifications = [], 
    markNotificationRead,
    clearNotifications
  } = useIssueStore();
  
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
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
              onClick={clearNotifications}
            >
              Clear all
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 max-w-4xl mx-auto w-full pt-4 pb-20">
        {notifications.length > 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/[0.02]">
            {notifications.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                onMarkRead={markNotificationRead} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 rounded-full bg-white/[0.01] border border-white/5 flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 rounded-full bg-primary/5 blur-2xl animate-pulse" />
              <InboxIcon className="h-10 w-10 text-white/10" weight="thin" />
            </div>
            <h3 className="text-2xl font-bold text-white/90 mb-3 tracking-tight">You're all caught up</h3>
            <p className="text-sm text-white/30 max-w-[320px] leading-relaxed">
              When something important happens in your projects, you'll find those notifications here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
