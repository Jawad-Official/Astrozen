"use client";

import React, { useState } from "react";
import {
  CheckSquare as CheckCircle,
  Square as Circle,
  Warning as CircleAlert,
  ArrowsClockwise as CircleDotDashed,
  XSquare as CircleX,
  Plus,
} from "@phosphor-icons/react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";

// Type definitions - adapted for FeatureMilestone integration
export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tools?: string[]; // Optional array of MCP server tools
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
}

interface AgentPlanProps {
  tasks: Task[];
  onToggleStatus?: (taskId: string, subtaskId?: string) => void;
  onCreateIssue?: (milestoneId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

const RecursiveTask = ({ 
  task, 
  onToggleStatus, 
  onCreateIssue,
  onDeleteTask,
  level = 0
}: { 
  task: Task | Subtask; 
  onToggleStatus?: (taskId: string, subtaskId?: string) => void;
  onCreateIssue?: (milestoneId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  level?: number;
}) => {
  const [expanded, setExpanded] = useState(level === 0);
  const isCompleted = task.status === "completed";
  const hasSubtasks = 'subtasks' in task && task.subtasks && task.subtasks.length > 0;

  const taskVariants = {
    hidden: { opacity: 0, y: -5 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 }
  };

  const subtaskListVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 }
  };

  return (
    <motion.li
      className={cn("list-none", level > 0 && "ml-4 border-l border-white/5 pl-2 mt-1")}
      initial="hidden"
      animate="visible"
      variants={taskVariants}
    >
      <div className="group flex flex-col">
        <motion.div 
          className="flex items-center px-2 py-1.5 rounded-md transition-colors hover:bg-white/[0.03]"
        >
          <motion.div
            className="mr-2 flex-shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus?.(task.id);
            }}
            whileTap={{ scale: 0.9 }}
          >
            {task.status === "completed" ? (
              <CheckCircle weight="fill" className="h-4 w-4 text-emerald-500" />
            ) : task.status === "in-progress" || task.status === "in_build" ? (
              <CircleDotDashed className="h-4 w-4 text-blue-500 animate-spin-slow" />
            ) : (
              <Circle className="text-muted-foreground h-4 w-4" />
            )}
          </motion.div>

          <div 
            className="flex min-w-0 flex-grow cursor-pointer items-center justify-between"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="mr-2 flex-1 truncate">
              <span className={cn(
                "text-sm",
                isCompleted ? "text-muted-foreground line-through font-normal" : "font-medium text-white/80"
              )}>
                {task.title}
              </span>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   console.log('Creating issue for milestone:', task.id);
                   onCreateIssue?.(task.id);
                 }}
                 title="Create issue for this milestone"
                 className="p-1 hover:bg-white/10 rounded transition-all active:scale-95"
               >
                 <Plus className="h-3.5 w-3.5 text-primary/60" weight="bold" />
               </button>
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   if (confirm('Delete this milestone?')) {
                     onDeleteTask?.(task.id);
                   }
                 }}
                 title="Delete milestone"
                 className="p-1 hover:bg-red-500/10 rounded transition-all active:scale-95 text-muted-foreground hover:text-red-400"
               >
                 <CircleX className="h-3.5 w-3.5" />
               </button>
            </div>
          </div>
        </motion.div>

        {task.description && level === 0 && expanded && (
          <p className="text-xs text-muted-foreground ml-8 mb-2 leading-relaxed">{task.description}</p>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            className="relative overflow-hidden"
            variants={subtaskListVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <ul className="space-y-0.5">
              {'subtasks' in task && task.subtasks?.map((subtask) => (
                <RecursiveTask 
                  key={subtask.id} 
                  task={subtask} 
                  onToggleStatus={onToggleStatus}
                  onCreateIssue={onCreateIssue}
                  onDeleteTask={onDeleteTask}
                  level={level + 1}
                />
              ))}
              
              <li className={cn("pl-6 py-1", level > 0 && "ml-4")}>
                 <button
                   onClick={() => onCreateIssue?.(task.id)}
                   className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
                 >
                   + Create Issue
                 </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};

export default function AgentPlan({ tasks: initialTasks, onToggleStatus, onCreateIssue, onDeleteTask }: AgentPlanProps) {
  return (
    <div className="bg-background text-foreground h-full overflow-auto">
      <LayoutGroup>
        <div className="p-4 overflow-hidden">
          <ul className="space-y-2 overflow-hidden">
            {initialTasks.map((task) => (
              <RecursiveTask 
                key={task.id} 
                task={task} 
                onToggleStatus={onToggleStatus}
                onCreateIssue={onCreateIssue}
                onDeleteTask={onDeleteTask}
              />
            ))}
          </ul>
        </div>
      </LayoutGroup>
    </div>
  );
}
