from openai import OpenAI
from fastapi import HTTPException
from app.core.config import settings
import json
import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# 6 Core Pillars for validation
CORE_PILLARS = [
    "Market Demand",
    "Technical Feasibility",
    "Business Model",
    "Competition",
    "User Experience",
    "Scalability"
]

# Document types and their generation order
DOC_ORDER = ["PRD", "APP_FLOW", "TECH_STACK", "FRONTEND_GUIDELINES", "BACKEND_SCHEMA", "IMPLEMENTATION_PLAN"]

# Doc sections for regeneration
DOC_SECTIONS = {
    "PRD": ["Problem Statement", "Solution Overview", "Target Audience", "User Stories", "Success Metrics"],
    "APP_FLOW": ["Navigation Flow", "State Transitions", "Screen Definitions", "Data Flow"],
    "TECH_STACK": ["Frontend", "Backend", "Database", "Infrastructure", "API Design"],
    "FRONTEND_GUIDELINES": ["Component Architecture", "State Management", "Styling Patterns", "UI/UX Standards", "Accessibility"],
    "BACKEND_SCHEMA": ["Database Models", "API Endpoints", "Authentication", "Data Relationships", "Error Handling"],
    "IMPLEMENTATION_PLAN": ["Phase 1: MVP", "Phase 2: Core Features", "Phase 3: Advanced Features", "Milestones", "Timeline"]
}


class AIService:
    def __init__(self):
        api_key = settings.OPENROUTER_API_KEY
        if api_key:
            # Clean key of common whitespace/quote issues from .env
            api_key = api_key.strip().strip('"').strip("'")
            
        if not api_key or api_key == "missing_key":
            logger.error("CRITICAL: OPENROUTER_API_KEY is not set or invalid in settings! AI features will fail.")
            
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key or "missing_key",
        )
        self.model = settings.MODEL_NAME

    def _repair_json(self, json_str: str) -> str:
        """Attempt to repair truncated JSON by balancing braces, quotes, and removing trailing commas."""
        json_str = json_str.strip()

        # 1. Handle truncated string at the end
        # Count non-escaped quotes to check if we are inside a string
        quote_count = 0
        escape = False
        in_string = False
        for i, char in enumerate(json_str):
            if char == '\\':
                escape = not escape
            elif char == '"' and not escape:
                quote_count += 1
                in_string = not in_string
            else:
                escape = False

        if in_string:
            # We are inside a string, close it
            json_str += '"'

        # 2. Remove trailing commas (before closing braces/brackets or end of content)
        # This handles: { "a": 1, } and [ "a", ]
        # Remove trailing comma before } or ]
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)

        # 3. Balance braces/brackets
        stack = []
        for char in json_str:
            if char == '{':
                stack.append('}')
            elif char == '[':
                stack.append(']')
            elif char == '}' or char == ']':
                if stack and stack[-1] == char:
                    stack.pop()

        # Append missing closing characters
        while stack:
            json_str += stack.pop()

        return json_str

    def _parse_json(self, content: str) -> Any:
        """Helper to parse JSON from AI response robustly."""
        if not content:
            logger.error("AI returned an empty response content.")
            return None
            
        clean_content = content.strip()
        # Handle markdown blocks if present
        if clean_content.startswith("```json"):
            clean_content = clean_content[7:]
        if clean_content.endswith("```"):
            clean_content = clean_content[:-3]
        
        clean_content = clean_content.strip()
        
        try:
            return json.loads(clean_content)
        except json.JSONDecodeError:
            # Attempt repair
            logger.warning("JSON parse failed, attempting repair of truncated JSON...")
            try:
                repaired_content = self._repair_json(clean_content)
                return json.loads(repaired_content)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON even after repair. Error: {str(e)}")
                # Log more context about where it failed
                snippet_start = max(0, e.pos - 50)
                snippet_end = min(len(clean_content), e.pos + 50)
                logger.error(f"Error snippet (at pos {e.pos}): ...{clean_content[snippet_start:snippet_end]}...")
                raise e

    async def generate_clarification_questions(self, idea: str, max_questions: int = 7) -> List[str]:
        """
        Generate up to N clarification questions if the idea is unclear.
        These questions cover BOTH the validation phase AND the blueprint phase.
        Returns empty list if idea is clear enough.
        """
        prompt = f"""
        You are an expert product manager and technical architect. A user has a project idea: "{idea}".
        The idea might be vague. If it is clear enough to proceed with a PRD, technical validation, AND blueprint generation (user flow diagrams), return an empty JSON list [].

        If it needs clarification, ask up to {max_questions} targeted questions to understand:
        1. Core value proposition and problem being solved
        2. Target audience and user personas
        3. Key features and functionality
        4. User flows and interactions (for blueprint diagrams)
        5. Technical considerations
        6. Business model and monetization
        7. Any constraints or preferences

        The goal is to gather enough information for BOTH validation analysis AND visual blueprint generation.

        Return a JSON object with a "questions" key containing a list of strings, e.g., {{"questions": ["Question 1?", "Question 2?"]}}.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=2000
            )
            content = response.choices[0].message.content
            try:
                data = self._parse_json(content)
                if isinstance(data, list):
                    return data
                return data.get("questions", [])
            except Exception:
                return []
        except Exception as e:
            error_msg = str(e)
            logger.error(f"AI Clarification failed: {error_msg}")
            
            if "401" in error_msg or "User not found" in error_msg:
                raise HTTPException(
                    status_code=400, 
                    detail="AI API Configuration Error: The OpenRouter API key provided in the backend is invalid. Please check OPENROUTER_API_KEY in the .env file."
                )
            
            # For clarification, we can fallback to no questions if it's not an auth error
            # but still log the error.
            return []
    async def suggest_answer(
        self,
        idea: str,
        question: str,
        previous_qa: List[Dict[str, str]] = [],
        context: Dict[str, Any] = None
    ) -> str:
        """AI suggests an answer for a clarification question."""
        qa_text = "\n".join([f"Q: {qa['question']}\nA: {qa['answer']}" for qa in previous_qa])
        context_text = json.dumps(context) if context else "{}"
        prompt = f"""
        Project Idea: "{idea}"
        Previous Context:
        {qa_text}

        Additional Context:
        {context_text}

        The AI asked this question: "{question}"
        The user wants you to suggest the best answer based on market trends, technical feasibility, and the project context.
        Provide a clear, actionable suggestion. Return ONLY the suggested answer text.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=3000
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI Suggestion failed: {str(e)}")
            return ""

    async def validate_idea(
        self,
        idea: str,
        clarifications: List[Dict[str, str]],
        feedback: Optional[str] = None,
        edited_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Validate idea against 6 core pillars.

        Args:
            idea: The raw project idea
            clarifications: List of answered clarification questions
            feedback: Optional user feedback for regeneration
            edited_data: Optional manually edited validation data
        """
        clarification_text = "\n".join([f"Q: {c['question']}\nA: {c['answer']}" for c in clarifications])
        pillars_text = "\n".join([f"- {pillar}" for pillar in CORE_PILLARS])
        feedback_text = f"\n\nUser Feedback: {feedback}" if feedback else ""
        edited_text = f"\n\nUser Edited Data: {json.dumps(edited_data, indent=2)}" if edited_data else ""

        prompt = f"""
        You are a Startup Validator and CTO. Analyze this project idea:
        Idea: "{idea}"
        Clarifications:
        {clarification_text}
        {feedback_text}
        {edited_text}

        Perform a deep analysis and return a JSON object with the following fields:

        1. "market_feasibility": {{
            "score": (0-100),
            "analysis": "Overall assessment (max 50 words)",
            "pillars": [
                {{"name": "Market Demand", "status": "Strong/Moderate/Weak/Concern", "reason": "reason (max 25 words)"}},
                {{"name": "Technical Feasibility", "status": "...", "reason": "..."}},
                {{"name": "Business Model", "status": "...", "reason": "..."}},
                {{"name": "Competition", "status": "...", "reason": "..."}},
                {{"name": "User Experience", "status": "...", "reason": "..."}},
                {{"name": "Scalability", "status": "...", "reason": "..."}}
            ]
        }}

        2. "improvements": ["Suggestion 1 (max 15 words)", "Suggestion 2", "Suggestion 3"] (Generate 3-5 specific, actionable improvements).

        3. "core_features": [
            {{"name": "Feature name", "description": "max 20 words", "type": "Core/Important/Nice-to-have"}}
        ] (Identify 5-8 core features).

        4. "tech_stack": {{
            "frontend": ["Tech 1", "Tech 2"],
            "backend": ["Tech 1", "Tech 2"],
            "infrastructure": ["Tech 1", "Tech 2"]
        }} (3-5 technologies per category).

        5. "pricing_model": {{
            "type": "e.g. Freemium",
            "tiers": [
                {{"name": "Tier name", "price": "Price/mo", "features": ["Feature 1", "Feature 2"]}}
            ]
        }} (Suggest 2-3 tiers).

        CRITICAL: 
        - Return ONLY the JSON object.
        - Ensure ALL 5 keys are present.
        - Keep text extremely concise to avoid truncation.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=4096
            )
            content = response.choices[0].message.content
            logger.info(f"AI validation response length: {len(content) if content else 0} characters")
            parsed_data = self._parse_json(content)

            if not parsed_data:
                raise ValueError("AI returned an empty or unparseable response.")

            # Log the parsed data to debug missing fields
            logger.info(f"Validation report keys: {list(parsed_data.keys())}")
            logger.info(f"market_feasibility present: {'market_feasibility' in parsed_data}")
            logger.info(f"improvements present: {'improvements' in parsed_data}")
            logger.info(f"core_features present: {'core_features' in parsed_data}")
            logger.info(f"tech_stack present: {'tech_stack' in parsed_data}")
            logger.info(f"pricing_model present: {'pricing_model' in parsed_data}")

            return parsed_data
        except Exception as e:
            error_msg = str(e)
            if "401" in error_msg or "User not found" in error_msg:
                raise HTTPException(
                    status_code=400, 
                    detail="AI API Configuration Error: The OpenRouter API key provided in the backend is invalid. Please check OPENROUTER_API_KEY in the .env file."
                )
            
            raise HTTPException(status_code=500, detail=f"AI Validation Failed: {error_msg}")

    async def regenerate_validation_field(
        self,
        field_name: str,
        current_value: Any,
        feedback: str,
        context: Dict[str, Any]
    ) -> Any:
        """Regenerate a specific field in the validation report based on user feedback."""
        prompt = f"""
        The user wants to regenerate this field: {field_name}

        Current value:
        {json.dumps(current_value, indent=2)}

        User feedback: "{feedback}"

        Project context:
        {json.dumps(context, indent=2)}

        Return the updated value in the same JSON structure as the current value.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=3000
            )
            return self._parse_json(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Field regeneration failed: {str(e)}")
            return current_value

    async def generate_blueprint(self, idea_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate user flow diagram (mermaid + node-based) and kanban features.
        """
        prompt = f"""
        Based on this project validation:
        {json.dumps(idea_context, indent=2)}

        Generate a COMPREHENSIVE and DETAILED technical blueprint.
        
        1. A detailed User Flow Diagram in Mermaid.js syntax.
           CRUCIAL: 
           - Use `flowchart TD` syntax.
           - Start with `%%{{init: {{"flowchart": {{"nodeSpacing": 100, "rankSpacing": 100, "curve": "basis"}}}}}}%%` for better spacing and connected lines.
           - For EVERY node in the flowchart, you MUST add a click handler at the end of the mermaid string: `click [nodeId] call mermaidClick()`.
           - Example:
             flowchart TD
               A[Start] --> B[Process]
               click A call mermaidClick()
               click B call mermaidClick()

        2. A node-based system architecture with nodes, positions, and connections.
        Crucial: Map out EVERY necessary component of the system architecture. Be as granular as possible, covering:
        - All Frontend Pages and major UI components
        - All Backend Services, APIs, and microservices
        - Every Data Store and Cache required
        - Every External Integration and Third-party Service
        
        For each node, provide:
        - id, label, type (entry, action, main, service, database, external)
        - x, y coordinates (layout them logically: Frontend Left/Top -> Backend Middle -> DB/External Right/Bottom)
        - subtasks: specific implementation tasks for this component
        - status: 'pending' (default)
        - completion: 0 (default)

        3. A list of features organized by status for a Kanban board.

        Return JSON:
        {{
            "user_flow_mermaid": "flowchart TD\\n  %%{{init: {{"flowchart": {{"nodeSpacing": 100, "rankSpacing": 100, "curve": "basis"}}}}}}%%\\n  A[Landing] --> B[Login]\\n  B --> C[Dashboard]...\\n  click A call mermaidClick()\\n  click B call mermaidClick()...",
            "nodes": [
                {{"id": "landing", "label": "Landing Page", "type": "entry", "x": 100, "y": 100, "subtasks": ["Hero section", "SEO", "Pricing"], "status": "pending", "completion": 0}},
                {{"id": "api", "label": "API Gateway", "type": "service", "x": 400, "y": 100, "subtasks": ["Rate limiting", "Routing", "Middleware"], "status": "pending", "completion": 0}},
                {{"id": "db", "label": "PostgreSQL", "type": "database", "x": 700, "y": 100, "subtasks": ["Schema design", "Migrations", "Backups"], "status": "pending", "completion": 0}}
            ],
            "edges": [
                {{"from": "landing", "to": "api", "label": "Fetch Data"}}
            ],
            "kanban_features": [
                {{"id": "f1", "title": "User Authentication", "status": "todo", "priority": "High", "description": "Implement login/registration"}}
            ]
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=8192
            )
            return self._parse_json(response.choices[0].message.content)
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Blueprint generation failed: {error_msg}")
            
            if "401" in error_msg or "User not found" in error_msg:
                raise HTTPException(
                    status_code=400, 
                    detail="AI API Configuration Error: The OpenRouter API key provided in the backend is invalid. Please check OPENROUTER_API_KEY in the .env file."
                )
            
            raise HTTPException(status_code=500, detail=f"AI Blueprint Generation Failed: {error_msg}")

    async def generate_issues_for_blueprint_node(
        self,
        node_details: Dict[str, Any],
        project_context: Dict[str, Any],
        existing_features: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        AI generates detailed features, milestones, and issues for a specific blueprint node.
        Includes support for sub-features and sub-issues.
        """
        prompt = f"""
        You are a Technical Lead and Senior Architect.
        Task: Breakdown this blueprint component into a production-ready engineering plan.

        Target Component (Node):
        {json.dumps(node_details, indent=2)}

        Project Context:
        {json.dumps(project_context, indent=2)}

        Existing Project Features:
        {json.dumps(existing_features, indent=2)}

        Requirements:
        1. STRATEGIC LINKING: If the component matches an existing feature, use it. If not, create a New Feature. 
           If it's a specific part of an existing feature, create it as a Sub-Feature.
        2. MILESTONES: Define major milestones for this component.
        3. DETAILED ISSUES: Create all primary technical issues needed to fully implement this component. 
           - Each primary issue MUST have a detailed 'description' with implementation steps.
           - Each primary issue should have all necessary 'sub_issues' providing granular tasks for a developer to follow.
        4. DATA TYPES: Use strict lowercase enum strings:
           Priority: [urgent, high, medium, low, none]
           Issue Type: [bug, task, refactor, chore, technical_debt, investigation]
           Feature Type: [new_capability, enhancement, experiment, infrastructure]
           Status: [discovery, validated, in_build, in_review, shipped, adopted, killed]
        5. LINKING: Ensure all created issues and features are conceptually linked to this node ID: "{node_details.get('id')}".

        Return a JSON object:
        {{
            "new_features": [
                {{ 
                    "name": "Feature Name", 
                    "description": "Detailed spec...", 
                    "type": "new_capability", 
                    "priority": "high",
                    "status": "validated",
                    "parent_feature_name": "Optional: Name of existing feature to nest under" 
                }}
            ],
            "milestones": [
                {{ "name": "Milestone Name", "description": "...", "feature_name": "Name of the feature this belongs to" }}
            ],
            "issues": [
                {{
                    "title": "Primary Task Title",
                    "description": "Detailed implementation guide...",
                    "priority": "high",
                    "type": "task",
                    "feature_name": "Feature Name",
                    "milestone_name": "Milestone Name",
                    "sub_issues": [
                        {{ "title": "Sub-task 1", "priority": "medium", "type": "task" }},
                        {{ "title": "Sub-task 2", "priority": "low", "type": "task" }}
                    ]
                }}
            ]
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=8192
            )
            return self._parse_json(response.choices[0].message.content)
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Issue generation for node failed: {error_msg}")
            
            if "401" in error_msg or "User not found" in error_msg:
                raise HTTPException(
                    status_code=400, 
                    detail="AI API Configuration Error: The OpenRouter API key provided in the backend is invalid or has expired. Please update OPENROUTER_API_KEY in the .env file."
                )
            
            raise HTTPException(status_code=500, detail=f"AI Issue Generation Failed: {error_msg}")

    async def auto_link_issue_to_node(
        self,
        issue_title: str,
        issue_description: str,
        nodes: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Analyze an issue and find the most relevant blueprint node.
        """
        if not nodes:
            return None
            
        nodes_context = "\n".join([f"- ID: {n['id']}, Label: {n['label']}, Type: {n['type']}, Subtasks: {', '.join(n.get('subtasks', []))}" for n in nodes])
        
        prompt = f"""
        You are a Technical Project Manager. 
        A new issue has been created:
        Title: {issue_title}
        Description: {issue_description}

        Available Blueprint Nodes:
        {nodes_context}

        Identify the SINGLE node ID that this issue most likely belongs to. 
        If it doesn't clearly match any node, return {{"node_id": null}}.
        Otherwise, return the ID in a JSON object: {{"node_id": "the_matching_id"}}.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=500
            )
            data = self._parse_json(response.choices[0].message.content)
            return data.get("node_id")
        except Exception as e:
            logger.error(f"Auto-link issue failed: {str(e)}")
            return None

    async def expand_features_for_creation(self, idea_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Expand core features into detailed features and sub-features for DB creation.
        Returns a list of feature objects with properties: name, description, type, status, priority, sub_features.
        """
        prompt = f"""
        You are a Technical Project Manager.
        Based on the validated project idea and core features below, expand them into a detailed feature breakdown for implementation.

        Project Context:
        {json.dumps(idea_context, indent=2)}

        For EACH core feature, make a strategic decision to assign:
        1. A clear, actionable Name.
        2. A detailed Description (Problem Statement/Spec).
        3. Target User: Who is this specifically for?
        4. Expected Outcome: What is the primary benefit?
        5. Success Metric: How will we measure if this feature is successful?
        6. A Priority: 
           - 'urgent': Critical blockers or core value pillars.
           - 'high': Essential for MVP.
           - 'medium': Important but not strictly blocking.
           - 'low': Nice-to-haves.
        7. A Status:
           - 'validated': If it's a core, well-understood requirement from the validation report.
           - 'discovery': If it's a complex area needing more research.
        8. A Feature Type:
           - 'new_capability': Entirely new functionality.
           - 'enhancement': Improving existing flows.
           - 'infrastructure': Backend/DevOps foundations.
           - 'experiment': High-risk/speculative features.
        9. A comprehensive list of Sub-Features (if applicable) with the same structure (name, description, priority, status, type).

        Return a JSON object with a "features" key containing the list.
        Ensure all values strictly match these lowercase enum strings:
        Priority: [urgent, high, medium, low, none]
        Status: [discovery, validated, in_build, in_review, shipped, adopted, killed]
        Type: [new_capability, enhancement, experiment, infrastructure]

        Example:
        {{
            "features": [
                {{
                    "name": "User Authentication",
                    "description": "Secure login/signup flow...",
                    "target_user": "All registered users",
                    "expected_outcome": "Users can securely access their accounts",
                    "success_metric": "99.9% successful login rate",
                    "priority": "high",
                    "status": "validated",
                    "type": "new_capability",
                    "sub_features": [
                        {{ "name": "Email Login", "description": "...", "priority": "high", "status": "validated", "type": "new_capability" }}
                    ]
                }}
            ]
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=4000
            )
            data = self._parse_json(response.choices[0].message.content)
            return data.get("features", [])
        except Exception as e:
            logger.error(f"Feature expansion failed: {str(e)}")
            return []

    async def generate_doc_questions(
        self,
        doc_type: str,
        project_context: Dict[str, Any],
        previous_docs: Dict[str, str] = None,
        max_questions: int = 10
    ) -> Dict[str, Any]:
        """
        Generate clarification questions for a specific document type.
        Returns empty list if enough context exists.
        Each question includes a suggested answer for the "skip" functionality.
        """
        prev_docs_text = ""
        if previous_docs:
            for doc_name, content in previous_docs.items():
                prev_docs_text += f"\n\n=== {doc_name} ===\n{content[:2000]}..."

        # Document-specific guidance for questions
        doc_guidance = {
            "PRD": "Focus on: target audience, user personas, key features, success metrics, timeline",
            "APP_FLOW": "Focus on: navigation structure, user journeys, screen transitions, error handling",
            "TECH_STACK": "Focus on: specific technologies, libraries, frameworks, deployment options",
            "FRONTEND_GUIDELINES": "Focus on: design system components, styling approach, state management, accessibility",
            "BACKEND_SCHEMA": "Focus on: data models, API endpoints, authentication, data relationships",
            "IMPLEMENTATION_PLAN": "Focus on: development phases, milestones, resource needs, risk management"
        }

        guidance = doc_guidance.get(doc_type, "Generate a comprehensive document")

        prompt = f"""
        You are generating a {doc_type} document for a project.

        Project Context:
        {json.dumps(project_context, indent=2)}

        Previous Documents:
        {prev_docs_text}

        Focus Areas:
        {guidance}

        Determine if you have enough information to generate a comprehensive {doc_type}.
        If you have enough context, return {{"has_questions": false, "questions": []}}.
        If you need more information, generate up to {max_questions} targeted questions.

        For each question, provide:
        - The question text
        - A suggested answer based on best practices and modern industry standards (user can skip and use this)

        Return JSON:
        {{
            "has_questions": true/false,
            "questions": [
                {{
                    "id": "q1",
                    "question": "Question text?",
                    "suggestion": "Suggested answer based on best practices...",
                    "optional": false
                }}
            ]
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=3000
            )
            result = self._parse_json(response.choices[0].message.content)

            # Ensure each question has an id
            if result.get("questions"):
                for i, q in enumerate(result["questions"]):
                    if "id" not in q:
                        q["id"] = f"q{i+1}"

            return result
        except Exception as e:
            logger.error(f"Doc questions generation failed: {str(e)}")
            return {"has_questions": False, "questions": []}

    async def generate_doc(
        self,
        doc_type: str,
        context: Dict[str, Any],
        chat_history: List[Dict[str, str]] = None,
        previous_docs: Dict[str, str] = None,
        user_answers: List[Dict[str, str]] = None
    ) -> str:
        """Generate a comprehensive document based on project context and chat history."""
        chat_text = ""
        if chat_history:
            chat_text = "\n\nChat History:\n" + "\n".join([
                f"{msg['role']}: {msg['content']}" for msg in chat_history
            ])

        answers_text = ""
        if user_answers:
            answers_text = "\n\nUser Answers to Questions:\n" + "\n".join([
                f"Q: {ans['question']}\nA: {ans.get('answer', ans.get('suggestion', ''))}" for ans in user_answers
            ])

        prev_docs_text = ""
        if previous_docs:
            for doc_name, content in previous_docs.items():
                prev_docs_text += f"\n\n=== {doc_name} ===\n{content[:3000]}..."

        # Add blueprint context if available
        blueprint_text = ""
        if context.get("blueprint"):
            blueprint_text = "\n\n=== Visual Blueprint ===\n"
            if context["blueprint"].get("user_flow"):
                blueprint_text += f"User Flow Diagram:\n{context['blueprint']['user_flow'][:1000]}...\n"
            if context["blueprint"].get("kanban"):
                blueprint_text += f"Kanban Features: {len(context['blueprint']['kanban'])} features identified\n"

        # Document-specific prompts
        doc_prompts = {
            "PRD": """
            Generate a comprehensive Product Requirements Document (PRD).
            Include sections:
            - Executive Summary
            - Problem Statement
            - Solution Overview
            - Target Audience
            - User Stories
            - Core Features
            - Non-Functional Requirements
            - Success Metrics
            - Risks and Mitigations
            """,
            "APP_FLOW": """
            Generate a comprehensive App Flow Document.
            Include sections:
            - Navigation Flow Overview
            - Screen-by-Screen Flow
            - State Transitions
            - User Journey Maps
            - Error Handling Flows
            """,
            "TECH_STACK": """
            Generate a comprehensive Tech Stack Document.
            Include sections:
            - Architecture Overview
            - Frontend Stack (libraries, frameworks, styling)
            - Backend Stack (frameworks, APIs, services)
            - Database Design (schema, relationships)
            - Infrastructure (deployment, scaling, monitoring)
            - Security Considerations
            """,
            "FRONTEND_GUIDELINES": """
            Generate comprehensive Frontend Guidelines.
            Include sections:
            - Design System
            - Component Architecture
            - State Management
            - Styling Patterns
            - Accessibility Standards
            - Performance Guidelines
            """,
            "BACKEND_SCHEMA": """
            Generate a comprehensive Backend Schema Document.
            Include sections:
            - ER Diagram (in text/mermaid format)
            - Database Models
            - API Endpoints
            - Authentication & Authorization
            - Data Validation Rules
            - Caching Strategy
            """,
            "IMPLEMENTATION_PLAN": """
            Generate a comprehensive Implementation Plan.
            Include sections:
            - Development Phases
            - Milestones and Timeline
            - Task Breakdown
            - Resource Allocation
            - Risk Management
            - Testing Strategy
            - Deployment Plan
            """
        }

        doc_specific = doc_prompts.get(doc_type, "Generate a comprehensive document.")

        # Get standard sections for this doc type
        sections = DOC_SECTIONS.get(doc_type, [])
        sections_text = "\n".join([f"- {section}" for section in sections])

        prompt = f"""
        {doc_specific}

        Include the following sections:
        {sections_text}

        Project Context:
        {json.dumps(context, indent=2)}

        {blueprint_text}

        Previous Documents:
        {prev_docs_text}

        {chat_text}
        {answers_text}

        Use web search knowledge for up-to-date best practices and industry standards.
        Return the COMPLETE Markdown content for the document with proper formatting.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=8000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Doc generation failed: {str(e)}")
            return f"# {doc_type}\n\nError generating document: {str(e)}"

    async def regenerate_doc_section(
        self,
        doc_type: str,
        current_content: str,
        section_content: str,
        user_message: str,
        project_context: Dict[str, Any]
    ) -> str:
        """Regenerate a specific section of a document based on user feedback."""
        prompt = f"""
        You are editing a {doc_type} document.

        Current Document Content:
        {current_content}

        Specific Section to Regenerate:
        {section_content}

        Project Context:
        {json.dumps(project_context, indent=2)}

        User Request: {user_message}

        Regenerate ONLY the specified section based on the user's request.
        Return the complete updated Markdown content for the entire document with the regenerated section.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=8000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Doc section regeneration failed: {str(e)}")
            return current_content

    async def chat_about_doc(
        self,
        doc_type: str,
        current_content: str,
        user_message: str,
        context: Dict[str, Any],
        chat_history: List[Dict[str, str]] = None
    ) -> str:
        """Chat about a document and regenerate/refine based on feedback."""
        history_text = ""
        if chat_history:
            history_text = "\n\nChat History:\n" + "\n".join([
                f"{msg['role']}: {msg['content']}" for msg in chat_history[-10:]  # Last 10 messages
            ])

        prompt = f"""
        You are editing a {doc_type} document.

        Current Document Content:
        {current_content[:6000]}  {current_content[6000:] and "...[truncated]"}

        Project Context:
        {json.dumps(context, indent=2)}

        {history_text}

        User Request: {user_message}

        Return the COMPLETE UPDATED Markdown content for the document, incorporating the user's changes.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=8000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Doc chat failed: {str(e)}")
            return current_content

    async def get_progress_dashboard(self, idea_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate progress dashboard data for the project."""
        docs_completed = context.get("docs_completed", 0)
        return {
            "idea_id": idea_id,
            "phases": {
                "input": {"completed": True, "progress": 100},
                "clarification": {"completed": not context.get("needs_clarification"), "progress": 100 if not context.get("needs_clarification") else 0},
                "validation": {"completed": bool(context.get("validation_report")), "progress": 100 if context.get("validation_report") else 0},
                "blueprint": {"completed": bool(context.get("blueprint")), "progress": 100 if context.get("blueprint") else 0},
                "documentation": {
                    "completed": docs_completed,
                    "total": 6,
                    "progress": round((docs_completed / 6) * 100)
                }
            },
            "overall_progress": 0,  # Will be calculated
            "next_steps": context.get("next_steps", [])
        }

    def get_doc_order(self) -> List[str]:
        """Return the order of document generation."""
        return DOC_ORDER

    def get_doc_index(self, doc_type: str) -> int:
        """Return the index of a document type in the generation order."""
        try:
            return DOC_ORDER.index(doc_type)
        except ValueError:
            return len(DOC_ORDER)

    def get_core_pillars(self) -> List[str]:
        """Return the 6 core pillars for validation."""
        return CORE_PILLARS


ai_service = AIService()