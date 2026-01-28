import requests
import uuid
import random
import subprocess
import os
import sys

API_URL = "http://localhost:8000/api/v1"

def test_frontend_payload():
    rand = random.randint(1000, 9999)
    email = f"test{rand}@example.com"
    password = "password123"
    
    # 1. Register
    requests.post(f"{API_URL}/auth/register", json={
        "first_name": "Test",
        "last_name": "User",
        "email": email,
        "password": password
    })
    
    # 2. Make Admin
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.join(os.getcwd(), "Backend")
    subprocess.run([sys.executable, "make_admin.py", email], env=env)
    
    # 3. Login
    login_resp = requests.post(f"{API_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    token = login_resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 4. Create Org
    requests.post(f"{API_URL}/organizations", headers=headers, json={"name": "Test Org"})
    
    # 5. Get Teams
    teams_resp = requests.get(f"{API_URL}/teams", headers=headers)
    team_id = teams_resp.json()[0].get("id")
    
    # 6. Create Project
    project_resp = requests.post(f"{API_URL}/projects", headers=headers, json={
        "name": "Test Project",
        "icon": "🚀",
        "color": "#FF5733",
        "team_id": team_id
    })
    project_id = project_resp.json().get("id")
    
    # 7. EXACT FRONTEND PAYLOAD from page.tsx
    # const [newFeature, setNewFeature] = useState({
    #   name: '',
    #   project_id: '',
    #   type: 'new_capability' as FeatureType,
    #   priority: 'none' as any
    # });
    feature_data = {
        "name": "Frontend Test Feature",
        "project_id": project_id,
        "type": "new_capability",
        "priority": "none"
    }
    
    print(f"Sending payload: {feature_data}")
    feat_resp = requests.post(f"{API_URL}/features", headers=headers, json=feature_data)
    print(f"Status: {feat_resp.status_code}")
    print(f"Response: {feat_resp.text}")

if __name__ == "__main__":
    test_frontend_payload()
