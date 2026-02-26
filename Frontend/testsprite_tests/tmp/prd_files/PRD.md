Product Requirements Document (PRD)
Astrozen - AI-Powered Software Development Platform
Version: 1.0
Date: February 2, 2026
Status: Active Development
Product Owner: Jawad

---

Executive Summary
Astrozen is a comprehensive, AI-powered software development platform that revolutionizes how teams plan, build, and ship software products. By combining intelligent project planning, collaborative documentation, agile issue management, and an integrated development environment (Zen Studio), Astrozen provides an end-to-end solution that dramatically reduces planning time while improving team alignment and productivity.
Vision
To become the definitive platform for modern software development teams, eliminating the friction between ideation and execution through AI-powered automation and seamless tool integration.
Mission
Empower development teams to transform ideas into shipped products faster by providing intelligent planning tools, collaborative workflows, and integrated development environments that eliminate context switching and manual overhead.

---

Problem Statement
Current Challenges

1. Fragmented Planning Process
   • Teams spend 40-60% of project time on manual planning and documentation
   • Idea validation requires extensive market research and technical analysis
   • Converting concepts to actionable tasks is time-consuming and error-prone
   • No standardized approach to feature prioritization and tech stack selection
2. Documentation Overhead
   • Writing PRDs, RFCs, and design docs is manual and repetitive
   • Keeping documentation synchronized with implementation is difficult
   • Lack of traceability between requirements and code
   • Version control and collaboration on specs is cumbersome
3. Tool Fragmentation
   • Teams use 5-10 different tools (Jira, Confluence, Figma, Slack, VS Code, etc.)
   • Constant context switching reduces productivity
   • Information silos across different platforms
   • Integration overhead and data synchronization issues
4. Collaboration Friction
   • Asynchronous communication leads to delays
   • Difficult to track who's working on what
   • Comment threads scattered across multiple tools
   • No real-time visibility into team activity

---

Target Users
Primary Personas

1. Product Managers
   • Needs: Rapid idea validation, feature prioritization, roadmap planning
   • Pain Points: Manual PRD creation, stakeholder alignment, progress tracking
   • Goals: Ship features faster, improve team alignment, data-driven decisions
2. Engineering Leads
   • Needs: Technical planning, resource allocation, architecture decisions
   • Pain Points: Estimating complexity, managing dependencies, tech debt
   • Goals: Predictable delivery, team efficiency, technical excellence
3. Software Developers
   • Needs: Clear requirements, efficient coding environment, task management
   • Pain Points: Context switching, unclear specs, tool overhead
   • Goals: Focus on coding, understand requirements, ship quality code
4. Startup Founders
   • Needs: Rapid MVP development, lean planning, resource optimization
   • Pain Points: Limited resources, fast iteration, market validation
   • Goals: Validate ideas quickly, build efficiently, scale effectively
   Secondary Personas
5. Engineering Managers
   • Needs: Team performance visibility, capacity planning, process optimization
   • Goals: Team productivity, predictable delivery, resource optimization
6. Designers
   • Needs: Design system integration, feedback loops, implementation tracking
   • Goals: Design-dev collaboration, implementation fidelity, rapid iteration

---

Product Overview
Core Value Propositions

1. 70% Reduction in Planning Time: AI automates blueprint generation, feature extraction, and ticket creation
2. End-to-End Integration: Single platform from idea to code to deployment
3. Real-time Collaboration: Live editing, presence awareness, instant sync
4. Intelligent Automation: AI-powered recommendations for tech stack, pricing, and architecture
5. Developer-First Experience: Keyboard shortcuts, sub-100ms latency, offline support

---

Feature Requirements

1. AI Project Planning Module
   1.1 Idea Capture & Blueprint Generation
   Priority: P0 (Must Have)
   User Story: As a product manager, I want to describe my project idea in free-form text and receive a structured blueprint, so I can quickly validate and refine my concept.
   Functional Requirements:
   ID Requirement Acceptance Criteria
   FR-1.1.1 System shall accept free-form project descriptions with rich text User can enter multi-paragraph descriptions with formatting
   FR-1.1.2 System shall generate visual blueprint within 10 seconds 95% of blueprints generated in <10s
   FR-1.1.3 Blueprint shall include project summary, category, and features All blueprints contain minimum required sections
   FR-1.1.4 System shall handle vague descriptions with guided prompts Users receive helpful prompts for incomplete ideas
   Non-Functional Requirements:
   • Performance: Blueprint generation <10 seconds (p95)
   • Availability: 99.5% uptime for AI services
   • Scalability: Support 1,000 concurrent blueprint generations
   Success Metrics:
   • 90% of users complete blueprint generation
   • 85% user satisfaction with blueprint quality
   • <2 minutes average time from idea to blueprint

---

1.2 AI Idea Validation & Recommendations
Priority: P0 (Must Have)
User Story: As a startup founder, I want AI-powered validation of my idea with strategic recommendations, so I can make informed decisions about tech stack, features, and pricing.
Functional Requirements:
ID Requirement Acceptance Criteria
FR-1.2.1 System shall provide improvement suggestions Validation includes 3-5 actionable suggestions
FR-1.2.2 System shall identify strengths and weaknesses Clear categorization of pros/cons
FR-1.2.3 System shall recommend features by priority (Must/Should/Nice) Features organized in 3 priority tiers
FR-1.2.4 System shall suggest tech stack with rationale Recommendations include frontend, backend, database, infrastructure
FR-1.2.5 System shall recommend pricing models with pros/cons 2-3 pricing strategies with analysis
Success Metrics:
• 85% of users find recommendations helpful
• 70% of users proceed with recommended tech stack
• 60% reduction in tech stack decision time

---

1.3 User Flow Diagram Generation
Priority: P1 (High Priority)
User Story: As an engineering lead, I want to see a visual user flow diagram of all pages and navigation, so I can understand the complete application structure.
Functional Requirements:
ID Requirement Acceptance Criteria
FR-1.3.1 System shall generate interactive flow diagrams Diagram shows all pages with connections
FR-1.3.2 Hovering over nodes shall show page details Tooltip displays page purpose and content
FR-1.3.3 Clicking connections shall show navigation flow Modal shows user action triggering transition
FR-1.3.4 Diagram shall update when features change Real-time updates to flow based on modifications
FR-1.3.5 System shall support export to image formats Export to PNG, SVG, PDF
Success Metrics:
• 75% accuracy of generated flows vs. final implementation
• 80% of users export or share flow diagrams

---

1.4 Auto-Kanban Ticket Generation
Priority: P1 (High Priority)
User Story: As a developer, I want AI to automatically create Kanban tickets from the project plan, so I can start working immediately without manual ticket creation.
Functional Requirements:
ID Requirement Acceptance Criteria
FR-1.4.1 System shall generate tickets from features Each feature produces 1-5 tickets
FR-1.4.2 Tickets shall include title, description, acceptance criteria All tickets have complete information
FR-1.4.3 System shall assign priority based on dependencies Logical ordering of ticket priorities
FR-1.4.4 Tickets shall link to source features Bidirectional traceability
FR-1.4.5 System shall organize by status (Todo/In Progress/Done) Default status is Todo
Success Metrics:
• Generate 20-50 tickets in <30 seconds
• 90% of tickets require <10 minutes of editing
• 80% of users proceed from planning to tickets

---

1.5 Project Progress Tracking
Priority: P1 (High Priority)
User Story: As a project manager, I want to see real-time progress against the AI-generated plan, so I can identify delays and adjust course.
Functional Requirements:
ID Requirement Acceptance Criteria
FR-1.5.1 System shall display completion percentage Real-time calculation from ticket status
FR-1.5.2 System shall compare actual vs. planned progress Visual indicators (ahead/on-track/behind)
FR-1.5.3 System shall track milestone completion Milestone status updated automatically
FR-1.5.4 System shall update within 2 seconds of ticket changes Near real-time progress updates
FR-1.5.5 System shall suggest corrective actions for delays AI recommendations for getting back on track
Success Metrics:
• <2 second latency for progress updates
• 85% of teams use progress tracking weekly
• 40% reduction in project delays

---

2. AI-Powered Documentation
   2.1 Document Templates & AI Generation
   Priority: P0 (Must Have)
   User Story: As a product manager, I want to generate PRDs from feature descriptions using AI, so I can create comprehensive documentation in minutes instead of hours.
   Functional Requirements:
   ID Requirement Acceptance Criteria
   FR-2.1.1 System shall provide PRD, RFC, Design Doc, Decision Log templates 4 built-in templates available
   FR-2.1.2 System shall auto-generate PRD from feature description PRD generated in <30 seconds
   FR-2.1.3 System shall pre-fill sections from AI blueprint Tech stack, features, pricing auto-populated
   FR-2.1.4 System shall suggest appropriate template AI recommends template based on context
   FR-2.1.5 System shall support unlimited documents per feature No limit on document count
   Success Metrics:
   • 80% of PRDs require <10 minutes of editing
   • 30 second average PRD generation time
   • 95% template suggestion accuracy

---

2.2 Real-time Collaboration
Priority: P0 (Must Have)
User Story: As a team member, I want to collaborate on documents in real-time with my colleagues, so we can work together efficiently without version conflicts.
Functional Requirements:
ID Requirement Acceptance Criteria
FR-2.2.1 System shall support simultaneous editing Multiple users edit without conflicts
FR-2.2.2 System shall show live cursors and presence See who's editing and where
FR-2.2.3 Changes shall sync within 500ms Sub-second synchronization
FR-2.2.4 System shall support @mentions in comments Notifications sent to mentioned users
FR-2.2.5 System shall support threaded discussions Nested comment threads
Success Metrics:
• <500ms sync latency (p95)
• 95% of users report improved collaboration
• 50% reduction in document review cycles

---

2.3 Spec Coverage & Traceability
Priority: P1 (High Priority)
User Story: As an engineering lead, I want to see which requirements have corresponding implementation tasks, so I can ensure complete coverage and avoid missing features.
Functional Requirements:
ID Requirement Acceptance Criteria
FR-2.3.1 System shall generate issues from document sections Click-to-create issues from specs
FR-2.3.2 System shall display spec coverage percentage Visual indicator of covered requirements
FR-2.3.3 System shall link issues to specific requirements Bidirectional traceability
FR-2.3.4 System shall highlight uncovered sections Visual warnings for gaps
FR-2.3.5 System shall provide coverage reports Exportable coverage analysis
Success Metrics:
• 90% of requirements have linked issues
• 85% reduction in missing features
• 95% spec coverage before development starts

---

3. Issue & Project Management
   3.1 Issue Management
   Priority: P0 (Must Have)
   User Story: As a developer, I want to manage issues with filtering, search, and organization, so I can efficiently track and complete my work.
   Functional Requirements:
   ID Requirement Acceptance Criteria
   FR-3.1.1 System shall support CRUD operations for issues Create, read, update, delete issues
   FR-3.1.2 System shall filter by status, priority, assignee, labels Multi-criteria filtering
   FR-3.1.3 System shall provide full-text search Search titles and descriptions
   FR-3.1.4 System shall support comments and activity tracking Complete audit trail
   FR-3.1.5 System shall organize by status columns Todo, In Progress, Done
   Success Metrics:
   • <100ms search response time
   • 95% of users find issues via search/filter
   • 80% daily active usage

---

3.2 Project Management
Priority: P0 (Must Have)
User Story: As a project manager, I want to manage projects with milestones and health tracking, so I can monitor progress and identify risks.
Functional Requirements:
ID Requirement Acceptance Criteria
FR-3.2.1 System shall support project creation and management Full project lifecycle
FR-3.2.2 System shall track project health indicators Visual health status
FR-3.2.3 System shall manage milestones with deadlines Milestone CRUD operations
FR-3.2.4 System shall calculate milestone progress Automatic progress from linked issues
FR-3.2.5 System shall support project updates and resources Status updates and resource links
Success Metrics:
• 90% of projects have defined milestones
• 75% milestone completion accuracy
• 60% reduction in project status meetings

---

3.3 Features Management
Priority: P0 (Must Have)
User Story: As a product manager, I want to organize work hierarchically from projects to features to issues, so I can track value delivery and maintain clear traceability from high-level goals to implementation tasks.
Hierarchical Work Organization Model
Astrozen implements a clear hierarchical structure for organizing work:
Project (Container / Coordination Layer)
└─ Feature (Value)
└─ Milestone (Outcome checkpoint) [Optional]
└─ Issue (Work)
└─ Sub-Issue (Work)
Hierarchy Explanation:
• Project: Top-level container providing coordination and context for all work
• Feature: Represents a unit of value or capability delivered to users
• Milestone: Optional outcome checkpoint for tracking feature progress
• Issue: Individual work item or task that contributes to feature completion
• Sub-Issue: Granular breakdown of complex issues into smaller work units
Functional Requirements:
ID Requirement Acceptance Criteria
FR-3.3.1 System shall support feature CRUD operations Create, read, update, delete features
FR-3.3.2 Features shall belong to projects Each feature associated with one project
FR-3.3.3 Features shall contain multiple issues One-to-many relationship
FR-3.3.4 Features shall support optional milestones Milestones can be added to features
FR-3.3.5 Issues shall support sub-issues Nested issue hierarchy
FR-3.3.6 System shall calculate feature progress from issues Automatic progress rollup
FR-3.3.7 System shall track feature status Backlog, Planned, In Progress, Review, Done
FR-3.3.8 System shall filter and search features Multi-criteria filtering and full-text search
FR-3.3.9 System shall link features to specifications Bidirectional feature-spec traceability
FR-3.3.10 System shall visualize feature roadmap Timeline view of planned features
Success Metrics:
• 95% of projects use feature-based organization
• 80% of issues linked to features
• 70% reduction in scope tracking overhead
• 90% feature-to-spec traceability

---

4. Zen Studio - Integrated IDE
   4.1 Core IDE Features
   Priority: P1 (High Priority)
   User Story: As a developer, I want a lightweight, fast IDE integrated with Astrozen, so I can code and manage tasks without switching tools.
   Functional Requirements:
   ID Requirement Acceptance Criteria
   FR-4.1.1 IDE shall be based on VS Code architecture Familiar interface and extensions
   FR-4.1.2 IDE shall have 30% faster startup than VS Code <3 second cold start
   FR-4.1.3 IDE shall use 40% less memory than VS Code <400MB base memory usage
   FR-4.1.4 IDE shall support all major programming languages Syntax highlighting for 50+ languages
   FR-4.1.5 IDE shall provide IntelliSense and code completion Context-aware suggestions

Success Metrics:
• <3 second startup time
• <400MB memory footprint
• 85% user preference over VS Code

---

4.2 Astrozen Integration
Priority: P1 (High Priority)
User Story: As a developer, I want to link code changes to Astrozen issues and view specs while coding, so I maintain context without switching tools.
Functional Requirements:
ID Requirement Acceptance Criteria
FR-4.2.1 IDE shall link commits to Astrozen issues Auto-link via commit messages
FR-4.2.2 IDE shall display feature requirements in sidebar View PRDs and specs in IDE
FR-4.2.3 IDE shall update issue status from IDE Change status without leaving IDE
FR-4.2.4 IDE shall show linked issues for current file Context-aware issue display
FR-4.2.5 IDE shall support quick issue creation Keyboard shortcut to create issues
Success Metrics:
• 80% of commits linked to issues
• 60% reduction in tool switching
• 90% developer satisfaction

---

5. Collaboration & Communication
   5.1 Real-time Multiplayer
   Priority: P0 (Must Have)
   Functional Requirements:
   ID Requirement Acceptance Criteria
   FR-5.1.1 System shall support live collaborative editing Multiple users edit simultaneously
   FR-5.1.2 System shall show presence indicators See who's viewing what
   FR-5.1.3 System shall sync changes instantly <500ms synchronization
   FR-5.1.4 System shall handle conflict resolution Automatic merge of concurrent edits

---

5.2 Notifications & Integrations
Priority: P1 (High Priority)
Functional Requirements:
ID Requirement Acceptance Criteria
FR-5.2.1 System shall provide in-app notification center Centralized notifications
FR-5.2.2 System shall send smart digest emails Configurable email summaries
FR-5.2.3 System shall integrate with Slack/Discord Third-party notifications
FR-5.2.4 System shall support notification preferences User-configurable settings

---

6. Performance & Developer Experience
   6.1 Performance Requirements
   Priority: P0 (Must Have)
   Non-Functional Requirements:
   ID Requirement Target Measurement
   NFR-6.1.1 Interaction latency <100ms p95 response time
   NFR-6.1.2 Search response time <200ms p95 search latency
   NFR-6.1.3 Page load time <1 second p95 initial load
   NFR-6.1.4 API response time <200ms p95 API latency

---

6.2 Keyboard-First Interface
Priority: P1 (High Priority)
Functional Requirements:
ID Requirement Acceptance Criteria
FR-6.2.1 System shall provide command palette (Cmd+K) Access all actions via keyboard
FR-6.2.2 System shall support quick issue creation (C) Single-key issue creation
FR-6.2.3 System shall support universal search (/) Single-key search activation
FR-6.2.4 System shall support custom shortcuts User-configurable shortcuts

---

6.3 Offline Support
Priority: P2 (Medium Priority)
Functional Requirements:
ID Requirement Acceptance Criteria
FR-6.3.1 System shall support offline work Core features work without internet
FR-6.3.2 System shall sync on reconnection Automatic sync when online
FR-6.3.3 System shall resolve offline conflicts Smart conflict resolution
FR-6.3.4 System shall cache data locally IndexedDB for offline storage

---

Technical Architecture
System Architecture
┌─────────────────────────────────────────────────────────────┐
│ Frontend Layer │
│ React 18 + TypeScript + Vite + TanStack Query + Zustand │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ API Gateway │
│ FastAPI + JWT Auth + Rate Limiting │
└─────────────────────────────────────────────────────────────┘
│
┌────────────┼────────────┐
▼ ▼ ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Core API │ │ AI Service│ │ Storage │
│ Services │ │ (OpenRouter│ │ Service │
│ │ │ + GPT) │ │ (R2/S3) │
└────────────┘ └────────────┘ └────────────┘
│
▼
┌────────────────┐
│ PostgreSQL │
│ + SQLAlchemy │
└────────────────┘
Technology Stack
Frontend:
• React 18 with TypeScript
• Vite (build tool)
• TanStack Query (data fetching)
• Zustand (state management)
• Radix UI + shadcn/ui (components)
• Tailwind CSS (styling)
• Framer Motion (animations)
Backend:
• FastAPI (Python web framework)
• PostgreSQL (primary database)
• SQLAlchemy 2.0 (ORM)
• Alembic (migrations)
• JWT (authentication)
• Pydantic v2 (validation)
Infrastructure:
• Cloud object storage (Cloudflare R2 / AWS S3)
• OpenRouter (AI service integration)
• WebSocket (real-time features)
Zen Studio:
• Electron (desktop app framework)
• VS Code core (editor engine)
• Custom UI layer (performance optimizations)

---

Data Model
Core Entities
Team Workspace
• Team metadata and settings
• Role-based access control (Owner, Admin, Editor, Viewer)
• Team member management
Project
• Project details and status
• AI blueprint association
• Features, milestones, and resources
• Progress tracking
Feature
• Feature title, description, and status
• Belongs to project, contains issues
• Optional milestones for outcome checkpoints
• Feature priority and ownership
• Progress calculated from linked issues
• Links to specifications and documents
AI Blueprint
• Generated project summary
• Feature recommendations (Must/Should/Nice)
• Tech stack suggestions
• Pricing model recommendations
• Validation results
Issue (Kanban Ticket)
• Title, description, acceptance criteria
• Status (Todo, In Progress, Done)
• Priority (Low, Medium, High, Critical)
• Assignee and labels
• Links to features and specs
• Parent-child relationships for sub-issues
• Automatic progress rollup from sub-issues
Document
• Title, content (Markdown)
• Template type (PRD, RFC, Design Doc, Decision Log)
• Status (Draft, Review, Approved, Deprecated)
• Version history
• Comments and mentions
Stored File
• File metadata and storage path
• Access control and permissions
• Audit logging

---

Security & Compliance
Authentication & Authorization
Authentication:
• JWT-based token authentication
• Secure password hashing (bcrypt)
• Session management with expiration
• OAuth support for third-party integrations
Authorization:
• Role-based access control (RBAC)
• Team-level permissions
• Resource-level access control
• API key management
Data Security
Encryption:
• HTTPS/TLS for all communications
• Encrypted storage for sensitive data
• Secure file URLs with expiration
Audit & Compliance:
• Comprehensive audit logging
• File access tracking
• Activity history
• GDPR compliance features

---

Scalability & Performance
Scalability Targets
Metric Target Strategy
Concurrent Users 1,000-10,000 Horizontal scaling, caching
Projects 10,000-100,000 Database sharding, indexing
API Requests 100,000/hour Load balancing, rate limiting
Storage Unlimited Cloud object storage (R2/S3)
Performance Targets
Metric Target Measurement
Interaction Latency <100ms p95
Search Response <200ms p95
Page Load <1 second p95
AI Blueprint Generation <10 seconds p95
Uptime 99.5% Monthly SLA

---

Success Metrics & KPIs
Product Metrics
Adoption:
• Monthly Active Users (MAU)
• Daily Active Users (DAU)
• DAU/MAU ratio >40%
• New user activation rate >70%
Engagement:
• Average session duration >15 minutes
• Issues created per user per week >5
• Documents created per team per week >3
• AI features usage rate >80%
Efficiency:
• 70% reduction in planning time
• 50% reduction in documentation time
• 60% reduction in tool switching
• 40% reduction in project delays
Business Metrics
Revenue (Future):
• Monthly Recurring Revenue (MRR)
• Customer Acquisition Cost (CAC)
• Lifetime Value (LTV)
• LTV:CAC ratio >3:1
Retention:
• Monthly retention rate >90%
• Annual retention rate >80%
• Net Promoter Score (NPS) >50
• Customer Satisfaction (CSAT) >4.5/5

---

Roadmap & Milestones
Phase 1: MVP (Months 1-3) ✅ In Progress
Core Features:
• ✅ User authentication and team workspaces
• ✅ AI project planning (blueprint, validation, recommendations)
• ✅ Issue management (CRUD, filtering, search)
• ✅ Project management (projects, milestones)
• ✅ Basic documentation (templates, collaboration)
• 🚧 Auto-kanban ticket generation
• 🚧 User flow diagram generation
Success Criteria:
• 100 beta users
• 50 projects created
• 85% user satisfaction
Phase 2: Enhanced Collaboration (Months 4-6)
Features:
• Real-time collaborative editing
• Advanced notifications (Slack/Discord)
• Spec coverage and traceability
• Document version control
• Analytics dashboard
Success Criteria:
• 500 active users
• 1,000 projects
• 90% retention rate
Phase 3: Zen Studio IDE (Months 7-9)
Features:
• Zen Studio IDE beta release
• Astrozen integration in IDE
• Code-to-issue linking
• In-IDE spec viewing
• Performance optimizations
Success Criteria:
• 1,000 IDE downloads
• 70% IDE adoption among users
• <3 second startup time
Phase 4: Enterprise & Scale (Months 10-12)
Features:
• Advanced RBAC and SSO
• Audit logging and compliance
• Portfolio management
• Advanced analytics
• Mobile apps (iOS/Android)
Success Criteria:
• 5,000 active users
• 10 enterprise customers
• 99.9% uptime

---

Risk Assessment
Technical Risks
Risk Impact Probability Mitigation
AI service downtime High Medium Fallback to manual input, retry logic
Database performance High Medium Indexing, caching, query optimization
Real-time sync conflicts Medium High Operational transformation, conflict resolution
IDE performance issues High Medium Profiling, optimization, lazy loading
Business Risks
Risk Impact Probability Mitigation
Low user adoption High Medium User research, beta testing, iteration
Competition Medium High Differentiation, unique AI features
Pricing model Medium Medium Market research, A/B testing
Resource constraints Medium Low Agile methodology, prioritization

---

Open Questions

1. Pricing Strategy: Freemium vs. paid-only? Per-user or per-team pricing?
2. AI Model Selection: Continue with gpt-oss-120b or explore alternatives?
3. Mobile Priority: Native apps or progressive web app (PWA)?
4. Enterprise Features: Which enterprise features are highest priority?
5. Integration Ecosystem: Which third-party integrations to prioritize?

---

Appendix
Glossary
• AI Blueprint: Structured project summary generated by AI from idea description
• Kanban Ticket: Task item in Todo/In Progress/Done workflow
• PRD: Product Requirements Document
• RFC: Request for Comments (technical design document)
• Spec Coverage: Percentage of requirements with linked implementation tasks
• Zen Studio: Lightweight IDE integrated with Astrozen platform
References
• AI Project Planner Specification
• Data Model Documentation
• Technical Roadmap
• Backend README

---

Document Control:
• Last Updated: February 2, 2026
• Version: 1.0
• Next Review: March 2, 2026
• Owner: Product Team
