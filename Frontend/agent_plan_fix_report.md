# Agent Plan UI Fix Report

I have removed the redundant "Create Issue" button from the expanded task view in the roadmap.

## Changes:

1.  **Removed Button**: The "+ Create Issue" button that appeared when expanding a task/milestone in `src/components/ui/agent-plan.tsx` has been removed.
2.  **Conditional Rendering**: Updated the hover action buttons (add issue, delete task) to only render if the corresponding callback function is provided. This improves component robustness.

The "Create Issue" functionality is still available via the hover `+` button on the task item itself if needed.
