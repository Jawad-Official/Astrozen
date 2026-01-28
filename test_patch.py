import requests
import json
from uuid import uuid4

# Set your project ID and a valid user ID (member)
PROJECT_ID = "52b85110-e73d-44d2-9c5a-5e021a8a25dc" # From user's error log
MEMBER_ID = "086be83c-e906-41c6-a4f1-d83ba4025588" # Just a sample UUID

BASE_URL = "http://localhost:8000/api/v1"

def test_patch():
    # Attempt to login first to get a token
    # (Assuming we have a test user)
    # ... actually I'll just use a dummy token or try without if it allows local access (it doesn't)
    
    # I'll just check the schema validation by calling the endpoint with invalid JSON
    url = f"{BASE_URL}/projects/{PROJECT_ID}"
    
    # Try valid-looking payload
    payload = {
        "member_ids": [MEMBER_ID]
    }
    
    print(f"Testing PATCH {url} with {payload}")
    # Note: This will likely fail with 401, but we can see if it fails with 422 before 401
    # Actually FastAPI checks 401 (Depends) BEFORE 422? 
    # Usually Depends(get_current_active_user) is called before whitelisting check.
    
    # I'll just try to hit the endpoint
    try:
        response = requests.patch(url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_patch()
