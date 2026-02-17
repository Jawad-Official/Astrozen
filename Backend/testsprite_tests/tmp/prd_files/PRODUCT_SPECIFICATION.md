# Product Specification: Astrozen (The Visionary Issue Tracker)

## 1. Product Purpose

Astrozen is a high-performance, developer-first issue tracking system designed to bridge the gap between **High-Level Strategy** and **Low-Level Execution**.

Unlike traditional trackers where projects are just flat lists of tasks, Astrozen enforces a hierarchical delivery model that ensures every individual code change (Issue) contributes to a tangible business value (Feature), which roll up into strategic initiatives (Projects).

## 2. Core Architecture: The "Success Chain"

Astrozen operates on a strict 4-tier hierarchy to maintain maximum clarity and data integrity:

1.  **Strategic Project**: A broad objective for the organization (e.g., "Mobile Growth Q1").
2.  **Domain Feature**: A specific capability or improvement within that project (e.g., "In-App Referral System").
    - _Note:_ Features have health states (On Track, At Risk) based on their underlying work.
3.  **Milestone**: A temporal marker within a Feature used to track progress phases (e.g., "MVP Launch", "Beta Refinement").
4.  **Actionable Issue**: The atomic unit of work (Bug, Task, or Improvement).
    - _Hard Constraint:_ An Issue must belong to a Feature to exist. There are no "orphan" tasks.

## 3. Key Feature Modules

### 3.1 Strategy & Roadmap (Features)

- **Visual Roadmap**: Grouping of Features by Project with health indicators.
- **Problem Statement Driven**: Features are defined by a "Problem Statement," "Success Metric," and "Target User" to prevent aimless development.
- **Delivery Confidence**: A metric tracking the likelihood of a Feature shipping on time.

### 3.2 Execution Engine (Issues)

- **High-Speed Interface**: Keyboard-first navigation (Cmd+K palette) and instant state updates.
- **Triage Flow**: A dedicated workspace for incoming issues that haven't been prioritized.
- **Cycles**: Automated time-boxed sprints to maintain team momentum.
- **Relationships**: Parent/Child issues and blocking dependencies.

### 3.3 Intelligence & Insights

- **Automatic Health Reporting**: Features automatically detect delays based on aging urgent issues.
- **Assigned Workload**: Real-time view of team capacity and burn-down.
- **Cycle Governance**: Automated transition of unfinished tasks between cycles.

## 4. How It Works: The Workflow

### Step 1: Strategic Planning

The Product Manager creates a **Project** and defines the **Features** that will make it successful. Every feature is linked to a specific project.

### Step 2: Breaking Down Work

Engineers and Designers break down a **Feature** into atomic **Issues**. Because every issue is linked to a feature, the system can automatically calculate how much of the "In-App Referral System" (Feature) is actually coded.

### Step 3: Fast Execution

Teams work in **Cycles**. The command palette allows developers to move between issues, update statuses (Todo -> Done), and add comments without leaving the keyboard.

### Step 4: Automated Monitoring

The system monitors the "Health" of the Feature. If an "Urgent" Issue stays in "In Progress" for too long, the Feature health automatically flips to "At Risk," alerting stakeholders.

## 5. User Roles

- **Admins**: Manage organization settings, teams, and integrations (Stripe, GitHub).
- **Product Owners**: Define Features and Projects; monitor delivery confidence and health metrics.
- **Contributors**: Create, update, and resolve Issues. Focus on high-speed execution.

## 6. Technical Foundations

- **Frontend**: React (Vite) + Tailwind CSS + Radix UI (Shadcn) for a premium, buttery-smooth UX.
- **Backend**: FastAPI (Python) for high-performance schema-driven APIs.
- **State**: Zustand for global frontend state with optimistic updates.
- **Security**: JWT-based session management with OAuth2 protocols.
