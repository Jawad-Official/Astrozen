"""The model's issue plan for a blueprint node is normalised before use.

A plan with 'title' instead of 'name', a missing milestone_name, or a bare
string entry used to raise KeyError and 500 after the AI call had already
been paid for.
"""
from app.api.v1.ai.blueprint import _normalize_issue_plan


def test_aliases_and_missing_fields_are_tolerated():
    plan = _normalize_issue_plan({
        "new_features": [
            {"title": "Auth", "summary": "Login and sessions"},   # title, not name
            "Billing",                                             # bare string
            {"description": "no name at all"},                     # dropped
        ],
        "milestones": [{"name": "MVP", "feature": "Auth"}],
        "issues": [
            {"name": "Build login form", "feature": "Auth", "subtasks": ["Add validation", {"title": "Style it"}]},
            {"title": "Orphan task"},                              # no feature/milestone
            {"description": "no title"},                           # dropped
        ],
    })

    assert [f["name"] for f in plan["new_features"]] == ["Auth", "Billing"]
    assert plan["new_features"][0]["description"] == "Login and sessions"
    assert plan["milestones"][0]["feature_name"] == "Auth"
    assert plan["issues"][0]["title"] == "Build login form"
    assert plan["issues"][0]["feature_name"] == "Auth"
    assert plan["issues"][0]["milestone_name"] is None
    assert [s["title"] for s in plan["issues"][0]["sub_issues"]] == ["Add validation", "Style it"]
    assert plan["issues"][1]["feature_name"] is None
    assert len(plan["issues"]) == 2


def test_empty_or_garbage_plan_yields_empty_lists():
    assert _normalize_issue_plan({}) == {"new_features": [], "milestones": [], "issues": []}
    assert _normalize_issue_plan({"issues": "nope", "milestones": None}) == {
        "new_features": [], "milestones": [], "issues": []
    }
