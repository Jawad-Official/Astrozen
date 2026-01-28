import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Trash, 
  ShieldCheck, 
  IdentificationCard,
  CaretRight,
  UserPlus,
  X,
  CircleNotch,
  Check
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TeamSettingsPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { teams, orgMembers, updateTeam, deleteTeam } = useIssueStore();

  const team = teams.find(t => t.id === teamId);
  
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setIdentifier(team.identifier);
    }
  }, [team]);

  const canManage = useMemo(() => {
    if (!currentUser || !team) return false;
    const isAdmin = currentUser.role === 'admin';
    const isLeader = team.leaders?.some(l => l.id === currentUser.id);
    return isAdmin || isLeader;
  }, [currentUser, team]);

  // Redirect if logic if not allowed
  useEffect(() => {
    if (team && !canManage) {
      toast({ title: 'Access Denied', description: 'You do not have permission to manage this team.', variant: 'destructive' });
      navigate('/all-issues');
    }
  }, [team, canManage, navigate, toast]);

  if (!team || !canManage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <CircleNotch className="h-8 w-8 animate-spin mb-4" />
        <p>Checking permissions...</p>
      </div>
    );
  }

  const handleUpdateBasicInfo = async () => {
    if (!name.trim() || !identifier.trim()) return;
    setIsSaving(true);
    try {
      await updateTeam(team.id, { name: name.trim(), identifier: identifier.trim().toUpperCase() });
      toast({ title: 'Team updated', description: 'Basic information has been saved.' });
    } catch (error: any) {
      toast({ 
        title: 'Update failed', 
        description: error.response?.data?.detail || 'Could not update team info.',
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setIsUpdating(true);
    const updatedMemberIds = team.members?.filter(m => m.id !== userId).map(m => m.id) || [];
    try {
      await updateTeam(team.id, { member_ids: updatedMemberIds });
      toast({ title: 'Member removed' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove member.', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (team.members?.some(m => m.id === userId)) return;
    setIsUpdating(true);
    const currentMemberIds = team.members?.map(m => m.id) || [];
    const updatedMemberIds = [...currentMemberIds, userId];
    try {
      await updateTeam(team.id, { member_ids: updatedMemberIds });
      toast({ title: 'Member added', description: 'The user has been added to the team.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add member.', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleLeader = async (userId: string) => {
    const isLeader = team.leaders?.some(l => l.id === userId);
    let updatedLeaderIds;
    
    if (isLeader) {
       if (team.leaders.length <= 1) {
         toast({ title: 'Action denied', description: 'Team must have at least one leader.', variant: 'destructive' });
         return;
       }
       updatedLeaderIds = team.leaders.filter(l => l.id !== userId).map(l => l.id);
    } else {
       updatedLeaderIds = [...(team.leaders?.map(l => l.id) || []), userId];
    }

    setIsUpdating(true);
    try {
      await updateTeam(team.id, { leader_ids: updatedLeaderIds });
      toast({ title: isLeader ? 'Leader access removed' : 'Leader appointed' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update leader permissions.', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTeam = async () => {
    setIsDeleting(true);
    try {
      await deleteTeam(team.id);
      toast({ title: 'Team deleted', description: `Team ${team.name} has been permanently removed.` });
      navigate('/all-issues');
    } catch (error) {
      toast({ title: 'Error', description: 'Only organization admins can delete teams.', variant: 'destructive' });
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background text-foreground">
      <div className="max-w-4xl mx-auto py-12 px-8 space-y-12 pb-32">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">
            <Users className="h-3 w-3" />
            <span>Team Settings</span>
            <CaretRight className="h-2 w-2" />
            <span className="text-foreground">{team.name}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage team identity, members, and permissions.</p>
        </div>

        <Separator className="bg-white/5" />

        {/* Basic Info Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">General</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Updates to the team name and identifier will reflect across all issues and projects.
            </p>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Team Name</Label>
                <div className="relative">
                  <Input 
                    id="team-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 bg-white/5 border-white/10 focus:border-primary/40 focus:ring-0"
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                   <Label htmlFor="team-id" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Identifier</Label>
                   <IdentificationCard className="h-3 w-3 text-muted-foreground/30" />
                </div>
                <Input 
                  id="team-id"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="h-10 bg-white/5 border-white/10 focus:border-primary/40 focus:ring-0 font-mono tracking-widest"
                  placeholder="ENG"
                />
                <p className="text-[10px] text-muted-foreground/60 italic">Used as a prefix for issue IDs (e.g. {identifier || 'ENG'}-123)</p>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleUpdateBasicInfo} 
                  disabled={isSaving || (name === team.name && identifier === team.identifier)}
                  className="h-9 px-6 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  {isSaving ? <CircleNotch className="h-3 w-3 animate-spin mr-2" /> : <Check className="h-3 w-3 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Separator className="bg-white/5" />

        {/* Leaders Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
               <ShieldCheck className="h-4 w-4 text-primary" />
               Leaders
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Team leaders can manage projects, features, and team settings.
            </p>
          </div>
          <div className="md:col-span-2 space-y-4">
             <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="divide-y divide-white/5">
                  {(team.leaders || []).map((leader) => (
                    <div key={`leader-${leader.id}`} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold border border-primary/20">
                          {leader.firstName?.[0]}{leader.lastName?.[0]}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-medium">{leader.fullName}</span>
                           <span className="text-[10px] text-muted-foreground">{leader.email}</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggleLeader(leader.id)}
                        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        Remove Access
                      </Button>
                    </div>
                  ))}
                </div>
             </div>
             
             <div className="pt-2">
                <Select onValueChange={(val) => { if(val !== "none") handleToggleLeader(val); }} value="none">
                  <SelectTrigger className="w-full h-10 bg-white/5 border-dashed border-white/10 hover:bg-white/10 transition-all text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {isUpdating ? <CircleNotch className="h-4 w-4 animate-spin text-primary" /> : <ShieldCheck className="h-4 w-4" />}
                      <span>Promote a member to leader...</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="none" disabled className="hidden">Select member</SelectItem>
                    {(orgMembers || []).filter(m => 
                      (m.role === 'admin' || m.role === 'leader') && 
                      !team.leaders?.some(l => l.id === m.id)
                    ).map(member => (
                      <SelectItem key={`eligible-leader-${member.id}`} value={member.id} className="text-xs">
                        {member.full_name} ({member.role})
                      </SelectItem>
                    ))}
                    {(!orgMembers || orgMembers.filter(m => (m.role === 'admin' || m.role === 'leader') && !team.leaders?.some(l => l.id === m.id)).length === 0) && (
                      <SelectItem key="no-leaders-found" value="none" disabled className="text-xs italic text-muted-foreground">
                        No eligible leaders found in organization
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
             </div>
          </div>
        </section>

        <Separator className="bg-white/5" />

        {/* Members Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
               <Users className="h-4 w-4" />
               Members ({team.members?.length || 0})
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              User assigned to this team will see its projects and issues in their sidebar.
            </p>
          </div>
          <div className="md:col-span-2 space-y-4">
             <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="divide-y divide-white/5">
                  {(team.members || []).map((member) => (
                    <div key={`member-${member.id}`} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 text-[10px] font-bold border border-white/5">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-medium">{member.fullName}</span>
                           <span className="text-[10px] text-muted-foreground">{member.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {team.leaders?.some(l => l.id === member.id) && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[9px] uppercase tracking-widest bg-primary/10 text-primary border-primary/20">Leader</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveMember(member.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!team.members || team.members.length === 0) && (
                    <div key="empty-members-msg" className="p-8 text-center text-sm text-muted-foreground italic">No members in this team yet.</div>
                  )}
                </div>
             </div>

              <div className="pt-2">
                <Select onValueChange={(val) => { if(val !== "none") handleAddMember(val); }} value="none">
                  <SelectTrigger className="w-full h-10 bg-white/5 border-dashed border-white/10 hover:bg-white/10 transition-all text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {isUpdating ? <CircleNotch className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      <span>Add member from organization...</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="none" disabled className="hidden">Select member</SelectItem>
                    {(orgMembers || []).filter(m => !team.members?.some(tm => tm.id === m.id)).map(member => (
                      <SelectItem key={`add-member-${member.id}`} value={member.id} className="text-xs">
                        {member.full_name}
                      </SelectItem>
                    ))}
                    {(!orgMembers || orgMembers.filter(m => !team.members?.some(tm => tm.id === m.id)).length === 0) && (
                      <SelectItem key="all-members-already-in" value="none" disabled className="text-xs italic text-muted-foreground">
                        All organization members are already in this team
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
             </div>
          </div>
        </section>

        <Separator className="bg-white/5" />

        {/* Danger Zone */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deleting a team is irreversible. All projects and issues belonging to this team will also be permanently deleted.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 space-y-4">
               <div>
                  <h3 className="text-sm font-semibold text-destructive mb-1">Delete this team</h3>
                  <p className="text-xs text-destructive/60 leading-relaxed max-w-sm">
                    Once you delete a team, there is no going back. Please be certain.
                  </p>
               </div>
               
               <AlertDialog>
                 <AlertDialogTrigger asChild>
                   <Button 
                     variant="destructive" 
                     className="h-9 px-6 text-xs font-bold uppercase tracking-widest shadow-lg shadow-destructive/20"
                     disabled={isDeleting || currentUser?.role !== 'admin'}
                   >
                     {isDeleting ? <CircleNotch className="h-3 w-3 animate-spin mr-2" /> : <Trash className="h-3 w-3 mr-2" />}
                     Delete Team
                   </Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent className="bg-zinc-900 border-white/10">
                   <AlertDialogHeader>
                     <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                     <AlertDialogDescription className="text-zinc-400">
                       This action cannot be undone. This will permanently delete the <strong>{team.name}</strong> team
                       and remove all data associated with it, including {team.identifier} issues and projects.
                     </AlertDialogDescription>
                   </AlertDialogHeader>
                   <AlertDialogFooter>
                     <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
                     <AlertDialogAction 
                       onClick={handleDeleteTeam}
                       className="bg-destructive text-white hover:bg-destructive/90"
                     >
                       Delete Team
                     </AlertDialogAction>
                   </AlertDialogFooter>
                 </AlertDialogContent>
               </AlertDialog>
               
               {currentUser?.role !== 'admin' && (
                 <p className="text-[10px] text-destructive/40 font-medium">Only organization administrators can delete teams.</p>
               )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
