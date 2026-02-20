import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.services.storage_service import storage_service
from app.models.project_idea import ProjectIdea, AssetType
from app.models.feature import Feature
from app.models.issue import Issue
from app.crud import crud_project_idea
import logging

logger = logging.getLogger(__name__)


class ProjectMDService:
    def generate_project_md_content(
        self,
        idea: ProjectIdea,
        features: List[Feature] = None,
        issues: List[Issue] = None,
        assets: List[Any] = None,
    ) -> str:
        content_parts = []

        content_parts.append(f"""# Project: {idea.refined_description or idea.raw_input[:100]}

> **Generated:** {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}
> **Status:** {idea.status}

---

""")

        content_parts.append(self._generate_idea_section(idea))

        if idea.clarification_questions:
            content_parts.append(
                self._generate_clarification_section(idea.clarification_questions)
            )

        if idea.validation_report:
            content_parts.append(
                self._generate_validation_section(idea.validation_report)
            )

        if features:
            content_parts.append(self._generate_features_section(features))

        if issues:
            content_parts.append(self._generate_issues_section(issues))

        if assets:
            content_parts.append(self._generate_docs_section(assets))

        return "".join(content_parts)

    def _generate_idea_section(self, idea: ProjectIdea) -> str:
        section = f"""## Project Idea

### Description
{idea.raw_input}

"""
        if idea.refined_description and idea.refined_description != idea.raw_input:
            section += f"""### Refined Description
{idea.refined_description}

"""
        return section

    def _generate_clarification_section(self, questions: List[Dict]) -> str:
        section = """## Clarification Q&A

"""
        for i, q in enumerate(questions, 1):
            question = q.get("question", "")
            answer = q.get("answer", "Not answered")
            section += f"""### Q{i}: {question}
**Answer:** {answer}

"""
        return section

    def _generate_validation_section(self, report: Any) -> str:
        section = """## Validation Analysis

"""

        mf = report.market_feasibility
        if isinstance(mf, dict):
            score = mf.get("score", 0)
            analysis = mf.get("analysis", "")
            pillars = mf.get("pillars", [])
        else:
            score = getattr(mf, "score", 0)
            analysis = getattr(mf, "analysis", "")
            pillars = getattr(mf, "pillars", [])

        section += f"""### Market Feasibility Score: {score}/100

{analysis}

### 6 Core Pillars

| Pillar | Status | Reason |
|--------|--------|--------|
"""

        for pillar in pillars:
            if isinstance(pillar, dict):
                name = pillar.get("name", "")
                status = pillar.get("status", "")
                reason = pillar.get("reason", "")
            else:
                name = getattr(pillar, "name", "")
                status = getattr(pillar, "status", "")
                reason = getattr(pillar, "reason", "")
            section += f"| {name} | {status} | {reason} |\n"

        section += "\n"

        core_features = report.core_features
        if isinstance(core_features, list) and core_features:
            section += """### Core Features

| Feature | Description | Type |
|---------|-------------|------|
"""
            for f in core_features:
                if isinstance(f, dict):
                    name = f.get("name", "")
                    desc = f.get("description", "")
                    ftype = f.get("type", "")
                else:
                    name = getattr(f, "name", "")
                    desc = getattr(f, "description", "")
                    ftype = getattr(f, "type", "")
                section += f"| {name} | {desc} | {ftype} |\n"
            section += "\n"

        tech_stack = report.tech_stack
        if tech_stack:
            if isinstance(tech_stack, dict):
                frontend = tech_stack.get("frontend", [])
                backend = tech_stack.get("backend", [])
                database = tech_stack.get("database", [])
                infrastructure = tech_stack.get("infrastructure", [])
            else:
                frontend = getattr(tech_stack, "frontend", []) or []
                backend = getattr(tech_stack, "backend", []) or []
                database = getattr(tech_stack, "database", []) or []
                infrastructure = getattr(tech_stack, "infrastructure", []) or []

            section += f"""### Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | {", ".join(frontend) if frontend else "N/A"} |
| Backend | {", ".join(backend) if backend else "N/A"} |
| Database | {", ".join(database) if database else "N/A"} |
| Infrastructure | {", ".join(infrastructure) if infrastructure else "N/A"} |

"""

        pricing = report.pricing_model
        if pricing:
            if isinstance(pricing, dict):
                ptype = pricing.get("type", "")
                tiers = pricing.get("tiers", [])
            else:
                ptype = getattr(pricing, "type", "")
                tiers = getattr(pricing, "tiers", []) or []

            section += f"""### Pricing Model: {ptype}

"""
            if tiers:
                section += """| Tier | Price | Features |
|------|-------|----------|
"""
                for tier in tiers:
                    if isinstance(tier, dict):
                        tname = tier.get("name", "")
                        tprice = tier.get("price", "")
                        tfeatures = ", ".join(tier.get("features", []))
                    else:
                        tname = getattr(tier, "name", "")
                        tprice = getattr(tier, "price", "")
                        tfeatures = ", ".join(getattr(tier, "features", []) or [])
                    section += f"| {tname} | {tprice} | {tfeatures} |\n"
                section += "\n"

        return section

    def _generate_features_section(self, features: List[Feature]) -> str:
        section = """## Project Features

| ID | Name | Status | Priority | Owner |
|----|------|--------|----------|-------|
"""
        for f in features:
            fid = f.identifier or str(f.id)[:8]
            fname = f.name
            fstatus = f.status.value if f.status else "N/A"
            fpriority = f.priority.value if f.priority else "N/A"
            fowner = f.owner.email if f.owner else "Unassigned"
            section += f"| {fid} | {fname} | {fstatus} | {fpriority} | {fowner} |\n"

        section += "\n"
        return section

    def _generate_issues_section(self, issues: List[Issue]) -> str:
        section = """## Project Issues

| ID | Title | Status | Type | Assignee |
|----|-------|--------|------|----------|
"""
        for i in issues[:50]:
            iid = i.identifier or str(i.id)[:8]
            ititle = i.title[:40] + "..." if len(i.title) > 40 else i.title
            istatus = i.status.value if i.status else "N/A"
            itype = i.issue_type.value if i.issue_type else "N/A"
            iassignee = i.assignee.email if i.assignee else "Unassigned"
            section += f"| {iid} | {ititle} | {istatus} | {itype} | {iassignee} |\n"

        if len(issues) > 50:
            section += f"\n> *...and {len(issues) - 50} more issues*\n"

        section += "\n"
        return section

    def _generate_docs_section(self, assets: List[Any]) -> str:
        doc_types = [
            AssetType.PRD,
            AssetType.APP_FLOW,
            AssetType.TECH_STACK,
            AssetType.FRONTEND_GUIDELINES,
            AssetType.BACKEND_SCHEMA,
            AssetType.IMPLEMENTATION_PLAN,
        ]

        section = """## Documentation

| Document | Status | R2 Path |
|----------|--------|---------|
"""

        for asset in assets:
            if asset.asset_type in doc_types:
                status = asset.status.value if asset.status else "N/A"
                r2_path = asset.r2_path or "N/A"
                section += f"| {asset.asset_type.value} | {status} | `{r2_path}` |\n"

        section += "\n"
        return section

    async def save_project_md(
        self,
        db: Session,
        idea_id: str,
        project_id: str = None,
    ) -> str:
        idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
        if not idea:
            raise ValueError(f"Idea {idea_id} not found")

        features = []
        issues = []

        if project_id:
            from app.models.feature import Feature as ProjectFeature
            from app.models.issue import Issue as ProjectIssue

            features = (
                db.query(ProjectFeature)
                .filter(ProjectFeature.project_id == project_id)
                .all()
            )

            issues = (
                db.query(ProjectIssue)
                .filter(ProjectIssue.project_id == project_id)
                .all()
            )

        assets = crud_project_idea.project_idea.get_assets(db, idea_id=idea_id)

        content = self.generate_project_md_content(
            idea=idea,
            features=features,
            issues=issues,
            assets=assets,
        )

        r2_key = f"projects/{idea_id}/project.md"
        await storage_service.upload_content(r2_key, content)

        existing_asset = crud_project_idea.project_idea.get_asset(
            db, idea_id=idea_id, asset_type=AssetType.PROJECT_MD
        )

        if existing_asset:
            existing_asset.content = content
            existing_asset.r2_path = r2_key
            existing_asset.status = "COMPLETED"
        else:
            crud_project_idea.project_idea.create_or_update_asset(
                db,
                idea_id=idea_id,
                asset_type=AssetType.PROJECT_MD.value,
                content=content,
                status="COMPLETED",
                r2_path=r2_key,
            )

        db.commit()
        logger.info(f"Saved project.md for idea {idea_id} to R2")

        return r2_key

    async def update_project_md_features(
        self,
        db: Session,
        idea_id: str,
        project_id: str,
    ) -> str:
        return await self.save_project_md(db, idea_id, project_id)


project_md_service = ProjectMDService()
