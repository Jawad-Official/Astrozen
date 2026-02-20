import json
from typing import Any, Dict, List, Optional
from openai import OpenAI
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

DOC_REQUIREMENTS = {
    "PRD": {
        "name": "Product Requirements Document",
        "required_sections": [
            "Executive Summary / Overview",
            "Problem Statement",
            "Goals & Objectives",
            "Target Users / Personas",
            "User Stories / Requirements",
            "Features / Functionality",
            "Success Metrics / KPIs",
            "Timeline / Milestones",
        ],
        "description": "A comprehensive document defining what the product should do, for whom, and why.",
        "min_words": 300,
    },
    "APP_FLOW": {
        "name": "Application Flow",
        "required_sections": [
            "User Journey / Flow",
            "Screens / Pages",
            "Navigation Paths",
            "User Actions",
            "System Responses",
            "Decision Points",
        ],
        "description": "Documents how users navigate through the application.",
        "min_words": 200,
    },
    "TECH_STACK": {
        "name": "Technology Stack",
        "required_sections": [
            "Frontend Technologies",
            "Backend Technologies",
            "Database",
            "Infrastructure / Cloud",
            "Third-party Integrations",
            "Development Tools",
        ],
        "description": "Defines the technologies and tools used to build the application.",
        "min_words": 150,
    },
    "FRONTEND_GUIDELINES": {
        "name": "Frontend Guidelines",
        "required_sections": [
            "Design System / Components",
            "Typography",
            "Color Palette",
            "Layout / Grid",
            "Responsive Design",
            "Accessibility",
            "Code Standards",
        ],
        "description": "Standards and guidelines for frontend development.",
        "min_words": 200,
    },
    "BACKEND_SCHEMA": {
        "name": "Backend Schema",
        "required_sections": [
            "Database Schema / Models",
            "API Endpoints",
            "Authentication / Authorization",
            "Data Validation",
            "Error Handling",
            "Performance Considerations",
        ],
        "description": "Technical documentation for backend architecture.",
        "min_words": 200,
    },
    "IMPLEMENTATION_PLAN": {
        "name": "Implementation Plan",
        "required_sections": [
            "Phases / Sprints",
            "Tasks Breakdown",
            "Dependencies",
            "Resource Allocation",
            "Risk Assessment",
            "Timeline / Deadlines",
        ],
        "description": "Roadmap for implementing the project.",
        "min_words": 200,
    },
}


class DocAnalyzerService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )
        self.model = settings.MODEL_NAME

    async def analyze_document(
        self,
        doc_type: str,
        content: str,
        project_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze an uploaded document for quality and relevance.

        Returns:
            - is_valid: Whether the document is valid for the type
            - quality_score: 0-100 score
            - detected_sections: List of sections found
            - missing_sections: List of important missing sections
            - issues: List of problems found
            - suggestions: List of improvement suggestions
            - ai_can_enhance: Whether AI can meaningfully improve the doc
            - enhancement_preview: Brief preview of what AI would add
        """
        requirements = DOC_REQUIREMENTS.get(doc_type, DOC_REQUIREMENTS["PRD"])

        prompt = f"""
        You are a technical document reviewer. Analyze this {doc_type} ({requirements["name"]}) document.

        DOCUMENT CONTENT:
        {content[:8000]}

        EXPECTED FOR {doc_type}:
        Description: {requirements["description"]}
        Expected Sections: {", ".join(requirements["required_sections"])}
        Minimum Recommended Length: {requirements["min_words"]} words

        PROJECT CONTEXT:
        {json.dumps(project_context, indent=2) if project_context else "Not provided"}

        Analyze the document and return a JSON response with:

        1. "is_valid": true/false - Is this actually a {doc_type} document (not random text, wrong content, or garbage)?
        2. "quality_score": 0-100 - Overall quality score
        3. "detected_sections": [] - List of sections you found in the document
        4. "missing_sections": [] - Important sections that are missing
        5. "issues": [] - List of specific problems (e.g., "Too vague", "No metrics defined", "Missing user personas")
        6. "suggestions": [] - 2-4 specific improvements the user could make
        7. "ai_can_enhance": true/false - Can AI meaningfully enhance this document?
        8. "enhancement_preview": "Brief description of what AI would add/improve (max 100 words)"
        9. "summary": "One-line summary of the document quality (max 20 words)"

        SCORING GUIDELINES:
        - 0-20: Not a valid {doc_type}, wrong content, or garbage
        - 21-40: Valid type but severely lacking content
        - 41-60: Basic content, missing key sections
        - 61-80: Good content, minor improvements needed
        - 81-100: Excellent, comprehensive document

        Be strict about is_valid - only true if it's genuinely attempting to be a {doc_type}.
        Return ONLY valid JSON, no markdown.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=1500,
            )

            result = json.loads(response.choices[0].message.content)

            result["doc_type"] = doc_type
            result["doc_name"] = requirements["name"]

            if result.get("quality_score", 0) < 30:
                result["severity"] = "critical"
            elif result.get("quality_score", 0) < 60:
                result["severity"] = "warning"
            else:
                result["severity"] = "info"

            logger.info(
                f"Document analysis for {doc_type}: score={result.get('quality_score')}, valid={result.get('is_valid')}"
            )

            return result

        except Exception as e:
            logger.error(f"Document analysis failed: {str(e)}")
            return {
                "is_valid": True,
                "quality_score": 50,
                "detected_sections": [],
                "missing_sections": [],
                "issues": ["Could not analyze document - analysis service error"],
                "suggestions": ["Try re-uploading the document"],
                "ai_can_enhance": False,
                "enhancement_preview": "",
                "summary": "Analysis unavailable",
                "severity": "warning",
                "doc_type": doc_type,
                "doc_name": requirements["name"],
            }

    async def generate_enhanced_content(
        self,
        doc_type: str,
        current_content: str,
        analysis: Dict[str, Any],
        project_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate enhanced version of the document based on analysis.
        """
        requirements = DOC_REQUIREMENTS.get(doc_type, DOC_REQUIREMENTS["PRD"])

        prompt = f"""
        You are a technical writer. Enhance this {doc_type} document.

        CURRENT DOCUMENT:
        {current_content[:6000]}

        ANALYSIS FEEDBACK:
        - Missing Sections: {", ".join(analysis.get("missing_sections", []))}
        - Issues: {", ".join(analysis.get("issues", []))}
        - Suggestions: {", ".join(analysis.get("suggestions", []))}

        PROJECT CONTEXT:
        {json.dumps(project_context, indent=2) if project_context else "Not provided"}

        REQUIREMENTS FOR {doc_type}:
        {requirements["description"]}
        Should include: {", ".join(requirements["required_sections"])}

        Generate an ENHANCED version of this document that:
        1. Preserves all existing valid content
        2. Adds missing sections with relevant content
        3. Fixes identified issues
        4. Improves clarity and structure
        5. Adds specific details based on project context

        Use proper markdown formatting with headers, lists, and tables where appropriate.
        Return the complete enhanced document.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=6000,
            )

            enhanced = response.choices[0].message.content
            logger.info(f"Generated enhanced content for {doc_type}")
            return enhanced

        except Exception as e:
            logger.error(f"Enhancement generation failed: {str(e)}")
            raise Exception(f"Failed to generate enhanced content: {str(e)}")


doc_analyzer_service = DocAnalyzerService()
