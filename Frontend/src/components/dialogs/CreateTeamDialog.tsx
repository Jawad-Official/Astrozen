import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CreateTeamData, Team } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import { organizationService } from '@/services/organization';
import { cn } from '@/lib/utils';
import { Users, IdentificationCard, ShieldCheck, Database, Check } from '@phosphor-icons/react';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTeam: (data: CreateTeamData) => void;
  teams: Team[];
}

export function CreateTeamDialog({ open, onOpenChange, onCreateTeam, teams }: CreateTeamDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [leaderId, setLeaderId] = useState<string>('');
  const [importFromTeamId, setImportFromTeamId] = useState<string>('none');
  const [members, setMembers] = useState<any[]>([]);
  const [isIdentifierDirty, setIsIdentifierDirty] = useState(false);

  useEffect(() => {
    if (user?.id && !leaderId) {
      setLeaderId(user.id);
    }
  }, [user, leaderId]);

  useEffect(() => {
    if (open) {
      organizationService.getMembers().then(setMembers).catch(console.error);
    }
  }, [open]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    
    if (!isIdentifierDirty) {
      const autoId = newName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
      setIdentifier(autoId);
    }
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value.toUpperCase());
    setIsIdentifierDirty(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    
    onCreateTeam({ 
      name: name.trim(),
      identifier: identifier.trim() || undefined,
      leaderId: leaderId || undefined,
      importFromTeamId: importFromTeamId === 'none' ? undefined : importFromTeamId
    });
    
    setName('');
    setIdentifier('');
    setLeaderId(user?.id || '');
    setImportFromTeamId('none');
    setIsIdentifierDirty(false);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  const leaderMember = members.find(m => m.id === leaderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 gap-0 bg-[#080808] border-white/[0.08] overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.7)] outline-none rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Set up a new team for your organization to manage issues and projects.
          </DialogDescription>
        </DialogHeader>
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col"
        >
          <div className="px-6 py-3 border-b border-white/[0.03] flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] bg-white/[0.01]">
            <span className="hover:text-white/40 cursor-default transition-colors">Organization</span>
            <span className="opacity-30">/</span>
            <span className="text-primary/60">New Team</span>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <div className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-1">
                  <input 
                    placeholder="Team name (e.g. Engineering)" 
                    value={name} 
                    onChange={handleNameChange} 
                    className="w-full text-3xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-white/5 text-white/90 selection:bg-primary/30 tracking-tight" 
                    autoFocus 
                  />
                  <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <IdentificationCard className="h-3.5 w-3.5 text-white/20" />
                      <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Identifier</h3>
                    </div>
                    <input 
                      value={identifier}
                      onChange={handleIdentifierChange}
                      placeholder="ENG"
                      maxLength={5}
                      className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3 text-white/80 focus:outline-none focus:border-primary/30 transition-colors font-mono uppercase tracking-widest"
                    />
                    <p className="text-[10px] text-white/20 leading-relaxed px-1 italic">
                      Prefix for issue IDs (e.g. ENG-123).
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-white/20" />
                      <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Team Leader</h3>
                    </div>
                    <Select value={leaderId} onValueChange={setLeaderId}>
                      <SelectTrigger className="h-12 bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05] rounded-xl px-4 transition-all focus:ring-1 focus:ring-primary/20">
                        <SelectValue placeholder="Select leader" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10 max-h-[250px]">
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id} className="text-xs focus:bg-white/5 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-white/80">{member.full_name}</span>
                              <span className="text-[10px] text-white/30">{member.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/[0.03]">
                  <div className="flex items-center gap-2 px-1">
                    <Database className="h-3.5 w-3.5 text-white/20" />
                    <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Import Data (Optional)</h3>
                  </div>
                  <Select value={importFromTeamId} onValueChange={setImportFromTeamId}>
                    <SelectTrigger className="h-12 bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05] rounded-xl px-4 transition-all focus:ring-1 focus:ring-primary/20">
                      <SelectValue placeholder="No import" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0C0C0C] border-white/10">
                      <SelectItem value="none" className="text-xs focus:bg-white/5 py-2.5 text-white/40">No Import</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} className="text-xs focus:bg-white/5 py-2.5">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 opacity-40" />
                            <span className="font-semibold">{team.name}</span>
                            <span className="text-[10px] text-white/30 ml-auto font-mono">({team.identifier})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-white/20 leading-relaxed px-1 italic">
                    Imports all existing issues and projects from the selected team.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-white/[0.03] flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-4 text-white/10 select-none">
                <div className="flex items-center gap-1.5 opacity-50">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                    <span className="text-[9px] font-black">⌘</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                    <span className="text-[9px] font-black">ENTER</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Create Team</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="glass" 
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-[11px] font-bold px-5 transition-all uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="glass-primary"
                  disabled={!name.trim()}
                  className="h-9 px-6 text-[11px] font-black transition-all disabled:opacity-20 disabled:shadow-none uppercase tracking-widest"
                >
                  Create Team
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
