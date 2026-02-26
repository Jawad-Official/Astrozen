
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** Backend
- **Date:** 2026-02-24
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 post api v1 auth register user registration
- **Test Code:** [TC001_post_api_v1_auth_register_user_registration.py](./TC001_post_api_v1_auth_register_user_registration.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 36, in <module>
  File "<string>", line 28, in test_post_api_v1_auth_register_user_registration
AssertionError: Expected 201 Created, got 404

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/c0c1d011-fe67-444f-8a34-31a6c9e3ede8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 post api v1 auth login user login
- **Test Code:** [TC002_post_api_v1_auth_login_user_login.py](./TC002_post_api_v1_auth_login_user_login.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 45, in <module>
  File "<string>", line 25, in test_post_api_v1_auth_login_user_login
AssertionError: Expected 201 Created but got 404

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/ad317a2d-2f26-4fd3-b68e-a30a3d9dde3c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 get api v1 auth me get current user info
- **Test Code:** [TC003_get_api_v1_auth_me_get_current_user_info.py](./TC003_get_api_v1_auth_me_get_current_user_info.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 63, in <module>
  File "<string>", line 26, in test_get_api_v1_auth_me_get_current_user_info
AssertionError: Registration failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/781ecd2a-f22c-411e-a8a8-086167eb7a8c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 post api v1 organizations create organization
- **Test Code:** [TC004_post_api_v1_organizations_create_organization.py](./TC004_post_api_v1_organizations_create_organization.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 55, in <module>
  File "<string>", line 25, in test_create_organization
AssertionError: Registration failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/9bf7daff-788a-4045-8f0f-2cc1a679327c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 get api v1 organizations me get my organization
- **Test Code:** [TC005_get_api_v1_organizations_me_get_my_organization.py](./TC005_get_api_v1_organizations_me_get_my_organization.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 82, in <module>
  File "<string>", line 35, in test_get_my_organization
AssertionError: Registration failed: 404, 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/4e8c235c-09cb-4bcd-be27-c3de66253676
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 post api v1 teams create team
- **Test Code:** [TC006_post_api_v1_teams_create_team.py](./TC006_post_api_v1_teams_create_team.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 74, in <module>
  File "<string>", line 25, in test_post_api_v1_teams_create_team
AssertionError: User registration failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/3c0df693-338b-4747-a95a-b8827ca91105
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 post api v1 projects create project
- **Test Code:** [TC007_post_api_v1_projects_create_project.py](./TC007_post_api_v1_projects_create_project.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 114, in <module>
  File "<string>", line 22, in test_tc007_post_api_v1_projects_create_project
AssertionError: User registration failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/49548395-2aa0-4e55-8375-b45aebea7ac1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 post api v1 features create feature
- **Test Code:** [TC008_post_api_v1_features_create_feature.py](./TC008_post_api_v1_features_create_feature.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 117, in <module>
  File "<string>", line 28, in test_post_api_v1_features_create_feature
AssertionError: User registration failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/7f769853-9e20-4c42-8bc3-50df619baddd
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 post api v1 issues create issue
- **Test Code:** [TC009_post_api_v1_issues_create_issue.py](./TC009_post_api_v1_issues_create_issue.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 219, in <module>
  File "<string>", line 37, in test_post_api_v1_issues_create_issue
AssertionError: User registration failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/ab100265-d2de-40bf-914b-9677e8dd1c44
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 get api v1 notifications get notifications
- **Test Code:** [TC010_get_api_v1_notifications_get_notifications.py](./TC010_get_api_v1_notifications_get_notifications.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 215, in <module>
  File "<string>", line 169, in test_tc010_get_notifications
  File "<string>", line 32, in register_user
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 404 Client Error: Not Found for url: http://localhost:8080/api/v1/auth/register

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/562f244f-87f5-4c2e-a4f2-e70d7526d2eb/e11fbd54-d60f-4882-becd-8c8d00acf47f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---