import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:8000/api/v1"
LOGIN_ENDPOINT = f"{BASE_URL}/login"
TIMEOUT = 30

def test_tc002_login_and_obtain_jwt_access_token():
    valid_credentials = {"username": "user@example.com", "password": "string"}
    invalid_credentials_list = [
        {"username": "user@example.com", "password": "wrongpassword"},
        {"username": "wronguser@example.com", "password": "string"},
        {"username": "", "password": "string"},
        {"username": "user@example.com", "password": ""},
        {"username": "", "password": ""},
    ]

    headers = {
        "Content-Type": "application/json"
    }

    # Test valid login
    try:
        response = requests.post(LOGIN_ENDPOINT, json=valid_credentials, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        json_resp = response.json()
        assert "access_token" in json_resp, "access_token not found in response"
        assert isinstance(json_resp["access_token"], str) and len(json_resp["access_token"]) > 0, "access_token is empty or invalid"
        assert "token_type" in json_resp, "token_type not found in response"
        assert json_resp["token_type"].lower() == "bearer", f"Expected token_type Bearer, got {json_resp['token_type']}"
    except requests.RequestException as e:
        assert False, f"Valid login request failed: {e}"
    except ValueError:
        assert False, "Response is not valid JSON for valid login"

    # Test invalid logins
    for creds in invalid_credentials_list:
        try:
            resp = requests.post(LOGIN_ENDPOINT, json=creds, headers=headers, timeout=TIMEOUT)
            # Expecting a 401 Unauthorized or 400 Bad Request depending on API behavior
            assert resp.status_code in (400, 401), f"Expected 400 or 401 for invalid creds {creds}, got {resp.status_code}"
            # Optionally check error message structure
            try:
                err_json = resp.json()
                assert "detail" in err_json, "Error response missing 'detail' field"
            except ValueError:
                # If response is not JSON, just pass
                pass
        except requests.RequestException as e:
            assert False, f"Invalid login request failed for creds {creds}: {e}"

test_tc002_login_and_obtain_jwt_access_token()