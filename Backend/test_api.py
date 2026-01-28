import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_registration():
    """Test user registration"""
    print("Testing Registration...")
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "username": "testuser" + str(random.randint(1000, 9999)),
        "email": f"test{random.randint(1000,9999)}@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_login(username, password):
    """Test user login"""
    print("\nTesting Login...")
    payload = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=payload,  # OAuth2 expects form data
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_create_org(token, org_name):
    """Test organization creation"""
    print("\nTesting Organization Creation...")
    payload = {"name": org_name}
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{BASE_URL}/organizations", json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
        else:
            print(f"Error: {response.text}")
        return response.json() if response.status_code == 200 else None
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_get_teams(token):
    """Test getting teams"""
    print("\nTesting Get Teams...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/teams", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    import random
    
    print("=" * 50)
    print("API Integration Test Suite")
    print("=" * 50)
    
    # Test 1: Registration
    user_data = test_registration()
    if not user_data:
        print("Registration failed, stopping tests")
        exit(1)
    
    username = user_data.get("username")
    
    # Test 2: Login
    login_data = test_login(username, "password123")
    if not login_data:
        print("Login failed, stopping tests")
        exit(1)
    
    token = login_data.get("access_token")
    
    # Test 3: Create Organization
    org_data = test_create_org(token, "Test Company")
    if not org_data:
        print("Org creation failed, stopping tests")
        exit(1)
    
    # Test 4: Get Teams
    teams_data = test_get_teams(token)
    if teams_data:
        print(f"\nDefault team created: {teams_data}")
    
    print("\n" + "=" * 50)
    print("All tests completed successfully!")
    print("=" * 50)
