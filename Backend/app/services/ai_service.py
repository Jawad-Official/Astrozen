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
    "Scalability",
]

# Document types and their generation order
DOC_ORDER = [
    "PRD",
    "APP_FLOW",
    "TECH_STACK",
    "FRONTEND_GUIDELINES",
    "BACKEND_SCHEMA",
    "IMPLEMENTATION_PLAN",
]

# Doc sections for regeneration
DOC_SECTIONS = {
    "PRD": [
        "Problem Statement",
        "Solution Overview",
        "Target Audience",
        "User Stories",
        "Success Metrics",
        "Pricing Strategy",
    ],
    "APP_FLOW": [
        "Navigation Flow",
        "State Transitions",
        "Screen Definitions",
        "Data Flow",
    ],
    "TECH_STACK": ["Frontend", "Backend", "Database", "Infrastructure", "API Design"],
    "FRONTEND_GUIDELINES": [
        "Component Architecture",
        "State Management",
        "Styling Patterns",
        "UI/UX Standards",
        "Accessibility",
    ],
    "BACKEND_SCHEMA": [
        "Database Models",
        "API Endpoints",
        "Authentication",
        "Data Relationships",
        "Error Handling",
    ],
    "IMPLEMENTATION_PLAN": [
        "Phase 1: MVP",
        "Phase 2: Core Features",
        "Phase 3: Advanced Features",
        "Milestones",
        "Timeline",
    ],
}


class AIService:
    def __init__(self):
        api_key = settings.OPENROUTER_API_KEY
        if api_key:
            # Clean key of common whitespace/quote issues from .env
            api_key = api_key.strip().strip('"').strip("'")

        if not api_key or api_key == "missing_key":
            logger.error(
                "CRITICAL: OPENROUTER_API_KEY is not set or invalid in settings! AI features will fail."
            )

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
            if char == "\\":
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
        json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

        # 3. Balance braces/brackets
        stack = []
        for char in json_str:
            if char == "{":
                stack.append("}")
            elif char == "[":
                stack.append("]")
            elif char == "}" or char == "]":
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

        # Log the raw content for debugging
        logger.info(f"Raw AI response (first 500 chars): {clean_content[:500]}")

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
                logger.error(
                    f"Error snippet (at pos {e.pos}): ...{clean_content[snippet_start:snippet_end]}..."
                )
                # Last resort: try to extract JSON object using regex
                try:
                    import re

                    # Try to find a complete JSON object
                    json_match = re.search(r"\{[\s\S]*\}", clean_content)
                    if json_match:
                        extracted = json_match.group(0)
                        repaired = self._repair_json(extracted)
                        result = json.loads(repaired)
                        logger.info(
                            "Successfully extracted and parsed JSON using regex fallback"
                        )
                        return result
                except Exception as fallback_error:
                    logger.error(f"Regex fallback also failed: {str(fallback_error)}")
                raise e

    async def generate_clarification_questions(
        self, idea: str, max_questions: int = 7
    ) -> List[str]:
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
                max_tokens=2000,
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
                    detail="AI API Configuration Error: The OpenRouter API key provided in the backend is invalid. Please check OPENROUTER_API_KEY in the .env file.",
                )

            # For clarification, we can fallback to no questions if it's not an auth error
            # but still log the error.
            return []

    async def suggest_answer(
        self,
        idea: str,
        question: str,
        previous_qa: List[Dict[str, str]] = [],
        context: Dict[str, Any] = None,
    ) -> str:
        """AI suggests an answer for a clarification question."""
        qa_text = "\n".join(
            [f"Q: {qa['question']}\nA: {qa['answer']}" for qa in previous_qa]
        )
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
                max_tokens=3000,
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
        edited_data: Optional[Dict[str, Any]] = None,
        remaining_improvements: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Validate idea against 6 core pillars.

        Args:
            idea: The raw project idea
            clarifications: List of answered clarification questions
            feedback: Optional user feedback for regeneration
            edited_data: Optional manually edited validation data
            remaining_improvements: Improvements that were not accepted (keep these)
        """
        clarification_text = "\n".join(
            [f"Q: {c['question']}\nA: {c['answer']}" for c in clarifications]
        )
        pillars_text = "\n".join([f"- {pillar}" for pillar in CORE_PILLARS])

        is_revalidation = feedback and (
            "applied these improvements" in feedback.lower()
            or "applied all suggested improvements" in feedback.lower()
        )

        if is_revalidation:
            feedback_text = f"""

        ### MANDATORY RE-VALIDATION AFTER IMPROVEMENTS APPLIED
        {feedback}
        
        CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:
        
        1. The improvements listed above have been SUCCESSFULLY IMPLEMENTED in the project
        2. You MUST recalculate market_feasibility.score - it should be HIGHER than before
        3. For EACH of the 6 pillars, you MUST:
           - Re-evaluate the status (it should improve: Concern→Weak→Moderate→Strong)
           - Update the reason to reflect how the improvement strengthened this pillar
        4. Example: If "Add referral system" was applied, Business Model pillar should improve
        5. If score was 45 before, it should now be 55-70 depending on impact of improvements
        6. Do NOT return the same scores - the project is objectively better now
        
        FAILURE to increase scores means you are NOT properly evaluating the improved project.
        """
        else:
            feedback_text = f"\n\nUser Feedback: {feedback}" if feedback else ""

        edited_text = (
            f"\n\nUser Edited Data: {json.dumps(edited_data, indent=2)}"
            if edited_data
            else ""
        )

        if remaining_improvements is not None:
            remaining_json = json.dumps(remaining_improvements)
            improvements_instruction = f"""2. "improvements": {remaining_json}
        CRITICAL: Use EXACTLY this array. Do NOT add, remove, or modify any improvement. Return it verbatim."""
        elif is_revalidation:
            improvements_instruction = """2. "improvements": ["New Suggestion 1 (max 15 words)", "New Suggestion 2", "New Suggestion 3"] 
        IMPORTANT: Generate 2-4 NEW, DIFFERENT improvements that build upon the already-applied improvements. Do NOT repeat or slightly rephrase the accepted improvements. Focus on next-level enhancements."""
        else:
            improvements_instruction = '2. "improvements": ["Suggestion 1 (max 15 words)", "Suggestion 2", "Suggestion 3"] (Generate 3-5 specific, actionable improvements).'

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

        {improvements_instruction}

        3. "core_features": [
            {{"name": "Feature name", "description": "max 20 words", "type": "Core/Important/Nice-to-have"}}
        ] (Identify 5-8 core features).

        4. "tech_stack": {{
            "frontend": ["Framework", "State Management", "Styling", "Build Tool"],
            "backend": ["Language/Framework", "API Layer", "Authentication", "Job Queue"],
            "database": ["Primary DB", "Cache/Session", "ORM", "Search/Analytics"],
            "infrastructure": ["Cloud Provider", "Container/Orchestration", "CI/CD", "Monitoring"]
        }}

        ### TECH STACK SELECTION RULES (CRITICAL):

        **FRONTEND** - Select 4-5 technologies based on project type:
        - **Web Apps**: Next.js (React), TypeScript, Tailwind CSS, Zustand/Redux, Vite
        - **Mobile Apps**: React Native, Expo, NativeWind, Redux Toolkit
        - **Desktop Apps**: Electron, Tauri, or native (Swift/Kotlin)
        - **E-commerce**: Next.js Commerce, Shopify Hydrogen, Medusa.js
        - **Real-time Apps**: Next.js + Socket.io client, Supabase Realtime
        - **AI/ML Interfaces**: Next.js, Vercel AI SDK, Langchain.js

        **BACKEND** - Select 4-5 technologies based on complexity:
        - **Python Stack**: FastAPI, Pydantic, SQLAlchemy, Celery, Redis Queue
        - **Node.js Stack**: NestJS/Express, Prisma, Bull/BullMQ, Passport.js
        - **Go Stack**: Gin/Fiber, GORM, go-redis, asynq
        - **Real-time**: FastAPI + WebSockets, Socket.io, Supabase
        - **AI/ML**: FastAPI, LangChain, OpenAI SDK, PyTorch/TensorFlow
        - **Microservices**: NestJS, gRPC, Kong, RabbitMQ

        **DATABASE** - Select 4 technologies based on data needs:
        - **Relational (default)**: PostgreSQL, Supabase, Prisma/Drizzle
        - **High-throughput**: PostgreSQL + Redis + Elasticsearch
        - **Document-based**: MongoDB, Mongoose, Redis
        - **Real-time**: Supabase (PostgreSQL + Realtime), Firebase/Firestore
        - **Graph relationships**: Neo4j, ArangoDB
        - **Time-series**: TimescaleDB, InfluxDB
        - **Always include**: Cache layer (Redis/Upstash), ORM (Prisma/Drizzle/SQLAlchemy)

        **INFRASTRUCTURE** - Select 4-5 technologies:
        - **Cloud**: AWS (EC2, Lambda, RDS, S3) OR Vercel + Supabase OR GCP OR Azure
        - **Containers**: Docker, Docker Compose, Kubernetes (for scale)
        - **CI/CD**: GitHub Actions, GitLab CI, Vercel/Netlify auto-deploy
        - **Monitoring**: Sentry, Datadog, Grafana + Prometheus
        - **CDN/Edge**: Cloudflare, Vercel Edge, AWS CloudFront
        - **Secrets**: HashiCorp Vault, AWS Secrets Manager, Doppler

        ### PROJECT TYPE STACK MAPPING:
        - **SaaS Web App**: Next.js + FastAPI + PostgreSQL + Redis + AWS/Vercel
        - **E-commerce**: Next.js + NestJS + PostgreSQL + Elasticsearch + AWS
        - **AI Tool**: Next.js + FastAPI + LangChain + PostgreSQL + Redis + Vercel
        - **Mobile App**: React Native + NestJS + PostgreSQL + Redis + AWS
        - **Marketplace**: Next.js + NestJS + PostgreSQL + Elasticsearch + Stripe
        - **Real-time Chat/Collab**: Next.js + FastAPI + WebSockets + Redis + Supabase
        - **Data Analytics**: Next.js + FastAPI + TimescaleDB + Redis + GCP
        - **Fintech**: Next.js + NestJS + PostgreSQL + Redis + AWS (compliance)

        ### TECH STACK REQUIREMENTS:
        - Frontend: MUST include framework, styling solution, state management
        - Backend: MUST include framework, ORM, auth solution, job queue if async tasks
        - Database: MUST include primary DB, cache (Redis), ORM
        - Infrastructure: MUST include cloud provider, CI/CD, monitoring
        - All selections MUST be justified by project requirements
        - Choose technologies that work well TOGETHER (ecosystem compatibility)

        5. "pricing_model": {{
            "type": "Selected Model (Choose ONE: One-Time Purchase, Subscription, Freemium, Pay-Per-Use / Credits, Pay-Per-User, In-App Purchases)",
            "recommended_type": "Same as 'type'",
            "reasoning": "Project-specific justification (max 40 words)",
            "tiers": [
                {{
                    "name": "Strictly use Tier Names from the Rules below", 
                    "price": "Strictly use Price Format from the Rules below", 
                    "annual_price": "Strictly use Annual Format from the Rules below",
                    "features": ["3-5 SPECIFIC features for THIS project"]
                }}
            ]
        }}

        ### STRICT PRICING RULES (NO EXCEPTIONS)
        | Model Type | Tier Names | Price Format | Annual Format | Logic |
        | :--- | :--- | :--- | :--- | :--- |
        | One-Time Purchase | Basic, Pro, Lifetime | $X (e.g. $49) | null | NO recurring. NO /mo. NO /yr. |
        | Subscription | Starter, Growth, Business | $X / month | $Y / year | Mandatory monthly + annual. |
        | Freemium | Free, Plus, Pro | $0 (Free), $X / month | $Y / year | Free entry + paid upsell. |
        | Pay-Per-Use / Credits | Starter Pack, Standard Pack, Enterprise Pack | $X / [Unit] (e.g. $10 / 1k credits) | null | Credit-based consumption. Use for AI tools, API services. |
        | Pay-Per-User | Team, Business, Enterprise | $X / user / month | $Y / user / year | Per-seat billing. Use for SaaS with team collaboration. |
        | In-App Purchases | Remove Ads, Theme Pack, Pro Bundle | $X one-time OR $X / month | $Y / year (if recurring) | Specific feature unlocks. |

        ### MODEL SELECTION LOGIC:
        - **Pay-Per-Use / Credits**: Best for AI tools, API services, platforms where usage varies (generative AI, data processing, email services).
        - **Pay-Per-User**: Best for SaaS with team collaboration, project management, CRM, tools where each user gets full access.
        - **Subscription**: Best for content platforms, professional tools, services with consistent usage patterns.
        - **Freemium**: Best for consumer apps seeking viral growth, productivity tools, social platforms.
        - **One-Time Purchase**: Best for desktop software, templates, courses, tools with minimal ongoing costs.
        - **In-App Purchases**: Best for mobile apps, games, content apps with premium features.

        ### CRITICAL SANITY CHECK:
        - If model is 'One-Time Purchase', any mention of '/month' or 'annual_price' is a FAILURE.
        - If model is 'Pay-Per-User', price MUST contain '/ user / month' format.
        - If model is 'Pay-Per-Use / Credits', price MUST contain credit unit (e.g. '/ 1k credits').
        - If model is 'Subscription', using 'Free/Plus/Pro' is a FAILURE.
        - If reasoning or features are generic/repeated across models, it is a FAILURE.
        - Every tier MUST have unique, project-specific value.

        CRITICAL: Return ONLY JSON. Be highly specific to the project idea.
        
        IMPORTANT JSON FORMAT:
        - Start your response with {{"market_feasibility":
        - End your response with }}
        - Do NOT include any text before or after the JSON
        - Do NOT use markdown code blocks
        - Ensure all strings are properly quoted
        - Ensure all arrays and objects are properly closed
        """
        try:
            logger.info(f"Calling AI model: {self.model}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=8192,
            )
            logger.info(f"Full response: {response}")
            logger.info(
                f"Response choices count: {len(response.choices) if response.choices else 0}"
            )

            if not response.choices:
                logger.error("AI returned no choices - empty response")
                raise ValueError("AI returned no choices")

            choice = response.choices[0]
            logger.info(f"Finish reason: {choice.finish_reason}")
            content = choice.message.content
            logger.info(
                f"AI validation response length: {len(content) if content else 0} characters"
            )
            if not content:
                logger.error(
                    f"Empty content from AI. Finish reason: {choice.finish_reason}, Message: {choice.message}"
                )
            parsed_data = self._parse_json(content)

            if not parsed_data:
                raise ValueError("AI returned an empty or unparseable response.")

            # --- POST-PROCESSING & CLEANUP ---
            if "pricing_model" in parsed_data:
                pm = parsed_data["pricing_model"]
                p_type = pm.get("type", "")

                # 1. Strict One-Time Purchase Cleanup
                if p_type == "One-Time Purchase":
                    for tier in pm.get("tiers", []):
                        # Strip recurring indicators from price
                        if "price" in tier and isinstance(tier["price"], str):
                            tier["price"] = re.sub(
                                r"(\s*/\s*(month|mo|year|yr|user))",
                                "",
                                tier["price"],
                                flags=re.IGNORECASE,
                            ).strip()
                        # Force annual_price to None
                        tier["annual_price"] = None

                # 2. Subscription/Freemium Formatting
                elif p_type in ["Subscription", "Freemium"]:
                    for tier in pm.get("tiers", []):
                        # Ensure price has / month if it's not $0
                        if (
                            "price" in tier
                            and isinstance(tier["price"], str)
                            and tier["price"] != "$0"
                            and "/" not in tier["price"]
                        ):
                            tier["price"] = f"{tier['price']} / month"

                # 3. Pay-Per-User Formatting
                elif p_type == "Pay-Per-User":
                    for tier in pm.get("tiers", []):
                        # Ensure price has / user / month format
                        if "price" in tier and isinstance(tier["price"], str):
                            if (
                                "/ user" not in tier["price"].lower()
                                and "/user" not in tier["price"].lower()
                            ):
                                tier["price"] = (
                                    tier["price"].replace("/ month", "").strip()
                                    + " / user / month"
                                )
                        tier["annual_price"] = None

                # 4. Pay-Per-Use / Credits Formatting
                elif p_type == "Pay-Per-Use / Credits":
                    for tier in pm.get("tiers", []):
                        tier["annual_price"] = None
            # ---------------------------------

            # Log the parsed data to debug missing fields
            logger.info(f"Validation report keys: {list(parsed_data.keys())}")
            logger.info(
                f"market_feasibility present: {'market_feasibility' in parsed_data}"
            )
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
                    detail="AI API Configuration Error: The OpenRouter API key provided in the backend is invalid. Please check OPENROUTER_API_KEY in the .env file.",
                )

            raise HTTPException(
                status_code=500, detail=f"AI Validation Failed: {error_msg}"
            )

    async def regenerate_validation_field(
        self,
        field_name: str,
        current_value: Any,
        feedback: str,
        context: Dict[str, Any],
    ) -> Any:
        """Regenerate a specific field in the validation report based on user feedback."""

        is_tech_stack_subfield = field_name.startswith("tech_stack.")
        if is_tech_stack_subfield:
            subfield = field_name.split(".", 1)[1]

            tech_guidance = {
                "frontend": """
        FRONTEND RECOMMENDATIONS (select 4-5 that match project needs):
        - Framework: Next.js (React SSR), React + Vite, Vue/Nuxt, Svelte/SvelteKit
        - Styling: Tailwind CSS, CSS Modules, Styled Components
        - State: Zustand, Redux Toolkit, Jotai, React Query/TanStack Query
        - Forms: React Hook Form, Formik
        - Testing: Jest, Vitest, Playwright, Testing Library
        - UI Components: shadcn/ui, Radix UI, Headless UI, Chakra UI""",
                "backend": """
        BACKEND RECOMMENDATIONS (select 4-5 that match project needs):
        - Python: FastAPI, Django, Flask | SQLAlchemy, Pydantic, Celery
        - Node.js: NestJS, Express, Fastify | Prisma, TypeORM, Bull/BullMQ
        - Go: Gin, Fiber, Echo | GORM, sqlx
        - Auth: JWT, OAuth2, Auth0, Supabase Auth, Clerk
        - API: REST, GraphQL (Apollo, Hasura), tRPC
        - Real-time: WebSockets, Socket.io, Server-Sent Events""",
                "database": """
        DATABASE RECOMMENDATIONS (select 4 that match project needs):
        - Primary DB: PostgreSQL, MySQL, MongoDB, Supabase
        - Cache/Session: Redis, Upstash, Memcached
        - ORM/Query: Prisma, Drizzle, SQLAlchemy, TypeORM
        - Search: Elasticsearch, Meilisearch, Algolia, Typesense
        - Analytics: TimescaleDB, ClickHouse
        - Real-time: Supabase Realtime, Firebase, Pusher""",
                "infrastructure": """
        INFRASTRUCTURE RECOMMENDATIONS (select 4-5 that match project needs):
        - Cloud: AWS (EC2/Lambda/RDS/S3), GCP, Azure, Vercel, Railway
        - Containers: Docker, Docker Compose, Kubernetes, ECS
        - CI/CD: GitHub Actions, GitLab CI, CircleCI, Vercel
        - Monitoring: Sentry, Datadog, Grafana, Prometheus, LogRocket
        - CDN: Cloudflare, AWS CloudFront, Vercel Edge
        - Email: Resend, SendGrid, AWS SES, Postmark""",
            }

            field_instruction = f"""
        You are a senior solutions architect. Generate a JSON array of 4-5 SPECIFIC technologies for {subfield}.
        
        {tech_guidance.get(subfield, "")}
        
        CRITICAL RULES:
        1. Return ONLY a JSON array: ["Tech1", "Tech2", "Tech3", "Tech4"]
        2. Each technology must be SPECIFIC (e.g., "FastAPI" not "Python Framework")
        3. Consider the project type and user feedback
        4. Technologies must work TOGETHER (same ecosystem when possible)
        5. Include the most important category items (framework, ORM, auth, etc.)
        
        Do NOT wrap in an object. Return just: ["Tech1", "Tech2", ...]
        """
        else:
            field_instruction = "Return the updated value in the same JSON structure as the current value."

        prompt = f"""
        The user wants to regenerate this field: {field_name}

        Current value:
        {json.dumps(current_value, indent=2) if current_value else "None (empty field)"}

        User feedback: "{feedback}"

        Project context:
        {json.dumps(context, indent=2)}

        {field_instruction}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=3000,
            )
            result = self._parse_json(response.choices[0].message.content)

            if is_tech_stack_subfield and isinstance(result, dict):
                if "value" in result:
                    return result["value"]
                first_key = next(iter(result.keys()), None)
                if first_key:
                    return result[first_key]

            return result
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
                max_tokens=8192,
            )
            return self._parse_json(response.choices[0].message.content)
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Blueprint generation failed: {error_msg}")

            if "401" in error_msg or "User not found" in error_msg:
                raise HTTPException(
                    status_code=400,
                    detail="AI API Configuration Error: The OpenRouter API key provided in the backend is invalid. Please check OPENROUTER_API_KEY in the .env file.",
                )

            raise HTTPException(
                status_code=500, detail=f"AI Blueprint Generation Failed: {error_msg}"
            )

    async def generate_issues_for_blueprint_node(
        self,
        node_details: Dict[str, Any],
        project_context: Dict[str, Any],
        existing_features: List[Dict[str, Any]],
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
        5. LINKING: Ensure all created issues and features are conceptually linked to this node ID: "{node_details.get("id")}".

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
                max_tokens=8192,
            )
            return self._parse_json(response.choices[0].message.content)
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Issue generation for node failed: {error_msg}")

            if "401" in error_msg or "User not found" in error_msg:
                raise HTTPException(
                    status_code=400,
                    detail="AI API Configuration Error: The OpenRouter API key provided in the backend is invalid or has expired. Please update OPENROUTER_API_KEY in the .env file.",
                )

            raise HTTPException(
                status_code=500, detail=f"AI Issue Generation Failed: {error_msg}"
            )

    async def auto_link_issue_to_node(
        self, issue_title: str, issue_description: str, nodes: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Analyze an issue and find the most relevant blueprint node.
        """
        if not nodes:
            return None

        nodes_context = "\n".join(
            [
                f"- ID: {n['id']}, Label: {n['label']}, Type: {n['type']}, Subtasks: {', '.join(n.get('subtasks', []))}"
                for n in nodes
            ]
        )

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
                max_tokens=500,
            )
            data = self._parse_json(response.choices[0].message.content)
            return data.get("node_id")
        except Exception as e:
            logger.error(f"Auto-link issue failed: {str(e)}")
            return None

    async def expand_features_for_creation(
        self, idea_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
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
                max_tokens=4000,
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
        max_questions: int = 10,
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
            "IMPLEMENTATION_PLAN": "Focus on: development phases, milestones, resource needs, risk management",
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
                max_tokens=3000,
            )
            result = self._parse_json(response.choices[0].message.content)

            # Ensure each question has an id
            if result.get("questions"):
                for i, q in enumerate(result["questions"]):
                    if "id" not in q:
                        q["id"] = f"q{i + 1}"

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
        user_answers: List[Dict[str, str]] = None,
    ) -> str:
        """Generate a comprehensive document based on project context and chat history."""
        chat_text = ""
        if chat_history:
            chat_text = "\n\nChat History:\n" + "\n".join(
                [f"{msg['role']}: {msg['content']}" for msg in chat_history]
            )

        answers_text = ""
        if user_answers:
            answers_text = "\n\nUser Answers to Questions:\n" + "\n".join(
                [
                    f"Q: {ans['question']}\nA: {ans.get('answer', ans.get('suggestion', ''))}"
                    for ans in user_answers
                ]
            )

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
            - Pricing Strategy (Provide a detailed, realistic recommendation with annual payment options for recurring models: One-Time Purchase, Subscription, Freemium, Pay-Per-Use/Credits, or IAP)
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
            """,
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
                max_tokens=8000,
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
        project_context: Dict[str, Any],
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
                max_tokens=8000,
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
        chat_history: List[Dict[str, str]] = None,
    ) -> str:
        """Chat about a document and regenerate/refine based on feedback."""
        history_text = ""
        if chat_history:
            history_text = "\n\nChat History:\n" + "\n".join(
                [
                    f"{msg['role']}: {msg['content']}"
                    for msg in chat_history[-10:]  # Last 10 messages
                ]
            )

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
                max_tokens=8000,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Doc chat failed: {str(e)}")
            return current_content

    async def get_progress_dashboard(
        self, idea_id: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate progress dashboard data for the project."""
        docs_completed = context.get("docs_completed", 0)
        return {
            "idea_id": idea_id,
            "phases": {
                "input": {"completed": True, "progress": 100},
                "clarification": {
                    "completed": not context.get("needs_clarification"),
                    "progress": 100 if not context.get("needs_clarification") else 0,
                },
                "validation": {
                    "completed": bool(context.get("validation_report")),
                    "progress": 100 if context.get("validation_report") else 0,
                },
                "blueprint": {
                    "completed": bool(context.get("blueprint")),
                    "progress": 100 if context.get("blueprint") else 0,
                },
                "documentation": {
                    "completed": docs_completed,
                    "total": 6,
                    "progress": round((docs_completed / 6) * 100),
                },
            },
            "overall_progress": 0,  # Will be calculated
            "next_steps": context.get("next_steps", []),
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
