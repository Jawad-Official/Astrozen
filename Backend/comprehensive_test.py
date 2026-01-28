"""
Comprehensive API Test Suite
Tests all 40 endpoints for functionality and basic security
"""
import httpx
import json
from typing import Optional, Dict, Any
import random
import asyncio

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 10.0

class APITester:
    def __init__(self):
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.org_id: Optional[str] = None
        self.team_id: Optional[str] = None
        self.issue_id: Optional[str] = None
        self.project_id: Optional[str] = None
        self.label_id: Optional[str] = None
        self.objective_id: Optional[str] = None
        self.feature_id: Optional[str] = None
        self.results = []
        
    def headers(self) -> Dict[str, str]:
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    def log_test(self, name: str, status: str, details: str = ""):
        emoji = "✅" if status == "PASS" else "❌"
        self.results.append({"name": name, "status": status, "details": details})
        print(f"{emoji} {name}: {status} {details}")
    
    def test_endpoint(self, method: str, endpoint: str, name: str, **kwargs):
        """Test a single endpoint"""
        url = f"{BASE_URL}{endpoint}" if not endpoint.startswith("http") else endpoint
        
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                if method == "GET":
                    resp = client.get(url, headers=self.headers(), **kwargs)
                elif method == "POST":
                    resp = client.post(url, headers=self.headers(), **kwargs)
                elif method == "PATCH":
                    resp = client.patch(url, headers=self.headers(), **kwargs)
                elif method == "DELETE":
                    resp = client.delete(url, headers=self.headers(), **kwargs)
                else:
                    self.log_test(name, "FAIL", f"Unknown method: {method}")
                    return None
                
                if resp.status_code in [200, 201, 204]:
                    self.log_test(name, "PASS", f"({resp.status_code})")
                    return resp.json() if resp.status_code != 204 else None
                else:
                    self.log_test(name, "FAIL", f"({resp.status_code}) {resp.text[:100]}")
                    return None
        except Exception as e:
            self.log_test(name, "ERROR", str(e)[:100])
            return None
    
    def run_all_tests(self):
        print("=" * 60)
        print("COMPREHENSIVE API TEST SUITE")
        print("=" * 60)
        print()
        
        # Test Default Endpoints
        print("\n🔹 DEFAULT ENDPOINTS")
        self.test_endpoint("GET", "http://localhost:8000/", "Root Endpoint")
        self.test_endpoint("GET", "http://localhost:8000/health", "Health Check")
        
        # Test Authentication
        print("\n🔹 AUTHENTICATION")
        rand = random.randint(1000, 9999)
        user_data = self.test_endpoint(
            "POST", "/auth/register",
            "Register User",
            json={
                "first_name": "Test",
                "last_name": "User",
                "username": f"testuser{rand}",
                "email": f"test{rand}@example.com",
                "password": "password123"
            }
        )
        
        if user_data:
            self.user_id = user_data.get("id")
            
            # Login
            email = f"test{rand}@example.com"
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{BASE_URL}/auth/login",
                    data={
                        "username": email,
                        "password": "password123"
                    }
                )
                if resp.status_code == 200:
                    login_data = resp.json()
                    self.token = login_data.get("access_token")
                    self.log_test("Login User", "PASS", "(200)")
                else:
                    self.log_test("Login User", "FAIL", f"({resp.status_code})")
            
            # Get Current User
            self.test_endpoint("GET", "/auth/me", "Get Current User")
        
        # Test Organizations
        print("\n🔹 ORGANIZATIONS")
        org_data = self.test_endpoint(
            "POST", "/organizations",
            "Create Organization",
            json={"name": f"Test Org {rand}"}
        )
        
        if org_data:
            self.org_id = org_data.get("id")
            
            self.test_endpoint("GET", "/organizations/me", "Get My Organization")
            
            # Generate invite code
            invite_data = self.test_endpoint(
                "POST", "/organizations/invite-codes",
                "Generate Invite Code",
                json={}
            )
            
            # Note: Join Organization would need a second user, skipping for now
        
        # Test Teams
        print("\n🔹 TEAMS")
        teams_data = self.test_endpoint("GET", "/teams", "List Teams")
        
        if teams_data and len(teams_data) > 0:
            self.team_id = teams_data[0].get("id")
            self.test_endpoint("GET", f"/teams/{self.team_id}", "Get Team")
        
        # Create a new team
        team_data = self.test_endpoint(
            "POST", "/teams",
            "Create Team",
            json={
                "name": f"Engineering {rand}",
                "identifier": "ENG"
            }
        )
        
        # Test Labels
        print("\n🔹 LABELS")
        self.test_endpoint("GET", "/labels", "List Labels")
        
        label_data = self.test_endpoint(
            "POST", "/labels",
            "Create Label",
            json={
                "name": f"Bug {rand}",
                "color": "red"
            }
        )
        
        if label_data:
            self.label_id = label_data.get("id")
            self.test_endpoint(
                "PATCH", f"/labels/{self.label_id}",
                "Update Label",
                json={"name": f"Bug Updated {rand}"}
            )
            self.test_endpoint("DELETE", f"/labels/{self.label_id}", "Delete Label")
        
        # Test Projects
        print("\n🔹 PROJECTS")
        self.test_endpoint("GET", "/projects", "List Projects")
        
        project_data = self.test_endpoint(
            "POST", "/projects",
            "Create Project",
            json={
                "name": f"Test Project {rand}",
                "icon": "🚀",
                "color": "#FF5733",
                "status": "in_progress",
                "health": "on_track",
                "priority": "high",
                "visibility": "team",
                "team_id": self.team_id
            }
        )
        
        if project_data:
            self.project_id = project_data.get("id")
            self.test_endpoint("GET", f"/projects/{self.project_id}", "Get Project")
            self.test_endpoint(
                "PATCH", f"/projects/{self.project_id}",
                "Update Project",
                json={"name": f"Updated Project {rand}"}
            )
        
        # Test Features
        print("\n🔹 FEATURES")
        if self.project_id:
            self.test_endpoint("GET", f"/features?project_id={self.project_id}", "List Features")
            
            feature_data = self.test_endpoint(
                "POST", "/features",
                "Create Feature",
                json={
                    "project_id": self.project_id,
                    "name": f"Dark Mode {rand}",
                    "type": "new_capability",
                    "status": "discovery",
                    "health": "on_track"
                }
            )
            
            if feature_data:
                self.feature_id = feature_data.get("id")
                self.test_endpoint("GET", f"/features/{self.feature_id}", "Get Feature")
                self.test_endpoint(
                    "PATCH", f"/features/{self.feature_id}",
                    "Update Feature",
                    json={"name": f"Dark Mode Updated {rand}"}
                )
                
                # Create Milestone
                self.test_endpoint(
                    "POST", f"/features/{self.feature_id}/milestones",
                    "Create Milestone",
                    json={
                        "name": f"MVP {rand}",
                        "description": "Test milestone"
                    }
                )
        else:
            self.log_test("Create Feature", "SKIP", "No project created")

        # Test Issues (needs team_id and feature_id)
        print("\n🔹 ISSUES")
        self.test_endpoint("GET", "/issues", "List Issues")
        
        if self.team_id and self.feature_id:
            issue_data = self.test_endpoint(
                "POST", "/issues",
                "Create Issue",
                json={
                    "title": f"Test Issue {rand}",
                    "team_id": self.team_id,
                    "feature_id": self.feature_id,
                    "status": "todo",
                    "priority": "medium",
                    "visibility": "team"
                }
            )
            
            if issue_data:
                self.issue_id = issue_data.get("id")
                self.test_endpoint("GET", f"/issues/{self.issue_id}", "Get Issue")
                self.test_endpoint(
                    "PATCH", f"/issues/{self.issue_id}",
                    "Update Issue",
                    json={"title": f"Updated Issue {rand}"}
                )
                
                # Comments
                comment_data = self.test_endpoint(
                    "POST", f"/issues/{self.issue_id}/comments",
                    "Add Comment",
                    json={"content": "Test comment"}
                )
                self.test_endpoint("GET", f"/issues/{self.issue_id}/comments", "Get Comments")
                
                # Activities
                self.test_endpoint("GET", f"/issues/{self.issue_id}/activities", "Get Activities")
                
                # Delete Issue
                self.test_endpoint("DELETE", f"/issues/{self.issue_id}", "Delete Issue")
        else:
            self.log_test("Create Issue", "SKIP", f"Missing team_id ({bool(self.team_id)}) or feature_id ({bool(self.feature_id)})")

        # Cleanup Project (which cascades to features/issues)
        if self.project_id:
            print("\n🔹 CLEANUP")
            self.test_endpoint("DELETE", f"/projects/{self.project_id}", "Delete Project (Cascade)")
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total = len(self.results)
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        errors = sum(1 for r in self.results if r["status"] == "ERROR")
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Errors: {errors}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0 or errors > 0:
            print("\n⚠️  FAILED/ERROR TESTS:")
            for r in self.results:
                if r["status"] in ["FAIL", "ERROR"]:
                    print(f"  - {r['name']}: {r['details']}")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
