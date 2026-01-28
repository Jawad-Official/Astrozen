import { IssueStatus } from '@/types/issue';
import { 
  IssueStatusIcon, 
  IssueTypeIcon, 
  IssuePriorityIcon,
  getStatusColorClass
} from './issue/IssueAtomicComponents';
import { IssueRow } from './issue/IssueRow';
import { SubIssueRow } from './issue/SubIssueRow';
import { IssueList } from './issue/IssueList';
import { IssueBoard } from './issue/IssueBoard';
import { CreateIssueDialog } from './issue/CreateIssueDialog';
import { CreateSubIssueDialog } from './issue/CreateSubIssueDialog';
import { IssueDetailSheet } from './issue/IssueDetailSheet';

// Re-export utility function for compatibility
export { getStatusColorClass };

// Export the IssueBar object to maintain compatibility with existing code
export const IssueBar = {
  StatusIcon: IssueStatusIcon,
  TypeIcon: IssueTypeIcon,
  PriorityIcon: IssuePriorityIcon,
  Row: IssueRow,
  SubRow: SubIssueRow,
  List: IssueList,
  Board: IssueBoard,
  Create: CreateIssueDialog,
  CreateSub: CreateSubIssueDialog,
  Detail: IssueDetailSheet
};