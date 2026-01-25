import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, 
  MessageCircle, 
  Smile, 
  Paperclip, 
  X, 
  Reply,
  FileText,
  Image,
  File,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  ProjectUpdate, 
  ProjectHealth, 
  UpdateComment, 
  UpdateAttachment,
  EmojiReaction 
} from '@/types/issue';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const healthOptions: { value: ProjectHealth; label: string; className: string }[] = [
  { value: 'on_track', label: 'On track', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'at_risk', label: 'At risk', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'off_track', label: 'Off track', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'no_updates', label: 'No updates', className: 'bg-muted text-muted-foreground border-border' },
];

const COMMON_EMOJIS = ['👍', '❤️', '🎉', '🚀', '👏', '💯', '🔥', '✅', '👀', '💡'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ProjectUpdateCardProps {
  update: ProjectUpdate;
  onDelete: () => void;
  onUpdate: (updates: Partial<ProjectUpdate>) => void;
  currentUser: string;
}

function CommentItem({ 
  comment, 
  onReply, 
  onDelete,
  currentUser,
  replies,
}: { 
  comment: UpdateComment; 
  onReply: (parentId: string) => void;
  onDelete: (commentId: string) => void;
  currentUser: string;
  replies: UpdateComment[];
}) {
  const [showReplies, setShowReplies] = useState(true);
  
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-3.5 w-3.5" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-3.5 w-3.5" />;
    return <File className="h-3.5 w-3.5" />;
  };

  return (
    <div className="group">
      <div className="flex gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-medium flex-shrink-0">
          {comment.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{comment.author}</span>
            <span className="text-muted-foreground">{format(comment.createdAt, 'MMM d, h:mm a')}</span>
          </div>
          <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{comment.content}</p>
          
          {/* Comment attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {comment.attachments.map((att) => (
                <a 
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 bg-accent/50 rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {getFileIcon(att.type)}
                  <span className="max-w-[120px] truncate">{att.name}</span>
                  <span className="text-[10px]">({(att.size / 1024).toFixed(0)}KB)</span>
                </a>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
            {comment.author === currentUser && (
              <button 
                onClick={() => onDelete(comment.id)}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="ml-8 mt-2 pl-3 border-l border-border/50">
          <button 
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && (
            <div className="space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onDelete={onDelete}
                  currentUser={currentUser}
                  replies={[]}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectUpdateCard({ update, onDelete, onUpdate, currentUser }: ProjectUpdateCardProps) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UpdateAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const health = healthOptions.find(h => h.value === update.health) || healthOptions[3];
  const comments = update.comments || [];
  const reactions = update.reactions || [];
  const topLevelComments = comments.filter(c => !c.parentId);
  
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-3.5 w-3.5" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-3.5 w-3.5" />;
    return <File className="h-3.5 w-3.5" />;
  };

  const handleAddReaction = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    let newReactions: EmojiReaction[];
    
    if (existingReaction) {
      if (existingReaction.users.includes(currentUser)) {
        // Remove user from reaction
        const updatedUsers = existingReaction.users.filter(u => u !== currentUser);
        if (updatedUsers.length === 0) {
          newReactions = reactions.filter(r => r.emoji !== emoji);
        } else {
          newReactions = reactions.map(r => 
            r.emoji === emoji ? { ...r, users: updatedUsers } : r
          );
        }
      } else {
        // Add user to reaction
        newReactions = reactions.map(r => 
          r.emoji === emoji ? { ...r, users: [...r.users, currentUser] } : r
        );
      }
    } else {
      // Create new reaction
      newReactions = [...reactions, { emoji, users: [currentUser] }];
    }
    
    onUpdate({ reactions: newReactions });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast({ 
          title: 'File too large', 
          description: `${file.name} exceeds 10MB limit`,
          variant: 'destructive'
        });
        return;
      }
      
      // Create a local URL for preview (in production, upload to storage)
      const url = URL.createObjectURL(file);
      const newAttachment: UpdateAttachment = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        url,
      };
      setAttachments(prev => [...prev, newAttachment]);
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleAddComment = () => {
    if (!commentText.trim() && attachments.length === 0) return;
    
    const newComment: UpdateComment = {
      id: Math.random().toString(36).substring(2, 9),
      content: commentText.trim(),
      author: currentUser,
      createdAt: new Date(),
      parentId: replyingTo || undefined,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    
    onUpdate({ comments: [...comments, newComment] });
    setCommentText('');
    setAttachments([]);
    setReplyingTo(null);
    toast({ title: replyingTo ? 'Reply added' : 'Comment added' });
  };

  const handleDeleteComment = (commentId: string) => {
    // Also delete any replies to this comment
    const updatedComments = comments.filter(c => c.id !== commentId && c.parentId !== commentId);
    onUpdate({ comments: updatedComments });
    toast({ title: 'Comment deleted' });
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setShowComments(true);
  };

  const replyingToComment = replyingTo ? comments.find(c => c.id === replyingTo) : null;

  return (
    <div className="bg-card/50 rounded-lg border border-border p-4 group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Badge variant="outline" className={cn('gap-1.5 text-xs', health.className)}>
          {health.label}
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1">
          <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
            {update.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <span>{update.author}</span>
          <span>·</span>
          <span>{format(update.createdAt, 'MMM d')}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Content */}
      <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{update.content}</p>
      
      {/* Update attachments */}
      {update.attachments && update.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {update.attachments.map((att) => (
            <a 
              key={att.id}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/50 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              {getFileIcon(att.type)}
              <span className="max-w-[150px] truncate">{att.name}</span>
              <span className="text-[10px]">({(att.size / 1024).toFixed(0)}KB)</span>
            </a>
          ))}
        </div>
      )}
      
      {/* Reactions */}
      <div className="flex items-center gap-2 flex-wrap">
        {reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            onClick={() => handleAddReaction(reaction.emoji)}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
              reaction.users.includes(currentUser)
                ? 'bg-primary/20 border-primary/30 text-primary'
                : 'bg-accent/50 border-border text-muted-foreground hover:border-primary/30'
            )}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.users.length}</span>
          </button>
        ))}
        
        {/* Add reaction button */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
              <Smile className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-popover border-border" align="start">
            <div className="flex gap-1 flex-wrap max-w-[200px]">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(emoji)}
                  className="p-1.5 hover:bg-accent rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Comment toggle */}
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors ml-auto"
        >
          <MessageCircle className="h-3 w-3" />
          {comments.length > 0 && <span>{comments.length}</span>}
        </button>
      </div>
      
      {/* Comments section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-border">
          {/* Comment list */}
          {topLevelComments.length > 0 && (
            <div className="space-y-4 mb-4">
              {topLevelComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  currentUser={currentUser}
                  replies={comments.filter(c => c.parentId === comment.id)}
                />
              ))}
            </div>
          )}
          
          {/* Reply indicator */}
          {replyingToComment && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 bg-accent/30 px-2 py-1 rounded">
              <Reply className="h-3 w-3" />
              <span>Replying to {replyingToComment.author}</span>
              <button 
                onClick={() => setReplyingTo(null)}
                className="ml-auto hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att) => (
                <div 
                  key={att.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-accent/50 rounded text-xs text-muted-foreground group/att"
                >
                  {getFileIcon(att.type)}
                  <span className="max-w-[100px] truncate">{att.name}</span>
                  <button 
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Comment input */}
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-medium flex-shrink-0 mt-1">
              {currentUser.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                className="min-h-[60px] text-sm bg-background/50 border-border resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach
                </Button>
                <span className="text-[10px] text-muted-foreground">Max 10MB</span>
                <div className="flex-1" />
                <Button 
                  size="sm" 
                  className="h-7 text-xs gap-1"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() && attachments.length === 0}
                >
                  <Send className="h-3 w-3" />
                  {replyingTo ? 'Reply' : 'Comment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
