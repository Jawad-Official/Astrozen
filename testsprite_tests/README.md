# TestSprite Test Suite for Astrozen

This directory contains comprehensive TestSprite test suites for the Astrozen project's backend API and frontend UI.

## Test Files

### 1. Backend API Tests (`backend_api_tests.json`)
Comprehensive API tests covering all endpoints:
- **Authentication** (5 tests): Register, Login, Get Current User, Invalid Credentials, Duplicate Email
- **Organizations** (4 tests): Create, Get My, Get Members, Generate Invite Code
- **Teams** (6 tests): List, Create, Get, Update, Duplicate Validation, Delete
- **Projects** (12 tests): List, Create, Get, Update, Delete, Updates, Resources, Comments, Reactions
- **Features** (8 tests): List, Create, Get, Update, Delete, Milestones (Create, Update, Delete)
- **Issues** (10 tests): List, Create, Get, Update, Delete, Comments, Activities, My Issues, Inbox
- **Notifications** (3 tests): Get, Mark Read, Mark All Read
- **AI** (3 tests): Core Pillars, Doc Order, Project Ideas
- **Health & Default** (2 tests): Root, Health Check
- **Permissions** (2 tests): Unauthorized Access, Other Organization Data
- **Filtering & Pagination** (5 tests): Status, Priority, Search, Pagination, Team Filter
- **Validation** (1 test): Create Project Without Team

Total: 61 Backend API Tests

### 2. Frontend UI Tests (`frontend_ui_tests.json`)
Comprehensive UI tests covering all pages and interactions:
- **Authentication** (8 tests): Login (Load, Validation, Valid Login, Invalid), Register (Load, Valid), Organization Setup (Load, Create)
- **Issues** (13 tests): All Issues (Load, Filters, Search, Create, Click Card, Comment, Update Status/Priority, Activities), My Issues, Inbox
- **Projects** (8 tests): Projects Page (Load, Create, Click Card), Project Detail (Load, Tabs, Create Update, Create Resource)
- **Features** (4 tests): Features Page (Load, Create, Drag & Drop)
- **AI Generator** (4 tests): Load, Submit Idea, Answer Questions, Generate Blueprint
- **Settings** (3 tests): Settings Page (Load, Navigate Tabs, Update Profile)
- **Navigation** (4 tests): Sidebar Menu (Items, Click), User Menu (Toggle, Logout)
- **Dialogs** (2 tests): Command Palette (Open, Search & Navigate)
- **Notifications** (2 tests): Bell Icon, Mark as Read
- **Responsive** (2 tests): Mobile Navigation, Mobile Sidebar

Total: 50 Frontend UI Tests

### 3. Backend Test Plan (Backend Directory)
Located at `Backend/testsprite_tests/testsprite_backend_test_plan.json` - Contains 59 test cases matching the API endpoints.

## How to Run Tests

### Prerequisites

1. **Backend Server Running:**
   ```bash
   cd Backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

2. **Frontend Server Running:**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Database Setup:**
   Ensure PostgreSQL is running and the database is configured in `Backend/.env`

### Running Tests with TestSprite

1. **Install TestSprite CLI:**
   ```bash
   npm install -g testsprite
   ```

2. **Run Backend API Tests:**
   ```bash
   testsprite run testsprite_tests/backend_api_tests.json
   ```

3. **Run Frontend UI Tests:**
   ```bash
   testsprite run testsprite_tests/frontend_ui_tests.json
   ```

4. **Run Backend Test Plan:**
   ```bash
   testsprite run Backend/testsprite_tests/testsprite_backend_test_plan.json
   ```

5. **Run All Tests:**
   ```bash
   testsprite run testsprite_tests/*.json
   ```

### Running Individual Tests

To run a specific test by ID:
```bash
testsprite run testsprite_tests/backend_api_tests.json --filter AUTH001
```

### Test Configuration

The tests use the following default configuration:
- **Backend URL**: `http://localhost:8080`
- **Frontend URL**: `http://localhost:3000`
- **Test User Email**: `testuser@astrozen.com`
- **Test User Password**: `SecurePassword123!`

You can modify these values in the test JSON files.

## Test Dependencies

Some tests depend on others to complete successfully. The tests are ordered and marked with `depends_on` fields:

- Authentication tests must run first to establish a session
- Organization setup depends on successful login
- Team creation depends on organization
- Project/Feature/Issue creation depends on team
- CRUD operations depend on successful creation

## Expected Test Results

### Backend API Tests
- **Total Tests**: 61
- **Expected Pass**: 58
- **Expected Fail/Skip**: 3 (due to test data dependencies)

### Frontend UI Tests
- **Total Tests**: 50
- **Expected Pass**: 45
- **Expected Fail/Skip**: 5 (due to test data dependencies and mock data requirements)

## Troubleshooting

### Tests Fail Due to Authentication Issues
- Ensure you're running tests in order or have a valid access token
- Check that the backend server is running on port 8080

### Frontend Tests Fail to Find Elements
- Ensure the frontend server is running on port 3000
- Check that you have valid test data in the database
- Some tests may require specific data attributes (`data-testid`) to be added to components

### Tests Time Out
- Increase timeout values in the test configuration
- Ensure your backend and frontend are responsive

## Adding New Tests

### Backend API Tests

Add a new test to `backend_api_tests.json`:

```json
{
  "id": "CUSTOM001",
  "title": "Your Custom Test",
  "description": "Test description here",
  "steps": [
    {
      "action": "send_request",
      "method": "GET",
      "url": "http://localhost:8080/api/v1/your-endpoint",
      "headers": {
        "Authorization": "Bearer {{access_token}}"
      }
    },
    {
      "action": "assert",
      "status_code": 200
    }
  ],
  "depends_on": ["TC002"]
}
```

### Frontend UI Tests

Add a new test to `frontend_ui_tests.json`:

```json
{
  "id": "UI_CUSTOM001",
  "title": "Your Custom UI Test",
  "description": "Test description here",
  "steps": [
    {
      "action": "navigate",
      "url": "http://localhost:3000/your-page"
    },
    {
      "action": "wait_for_element",
      "selector": "[data-testid='your-element']"
    },
    {
      "action": "assert",
      "type": "element_visible",
      "selector": "[data-testid='your-element']"
    }
  ],
  "depends_on": ["UI_AUTH003"]
}
```

## Test Coverage

### Backend API Coverage
- ✅ All authentication endpoints
- ✅ All issue management endpoints (CRUD + Comments + Activities)
- ✅ All project management endpoints (CRUD + Updates + Resources + Comments + Reactions)
- ✅ All organization endpoints (CRUD + Members + Invite Codes)
- ✅ All team endpoints (CRUD)
- ✅ All feature endpoints (CRUD + Milestones)
- ✅ All notification endpoints (Read + Mark Read)
- ✅ AI endpoints (Pillars + Doc Order + Ideas)
- ✅ Permission checks (Unauthorized access, org isolation)
- ✅ Filtering and pagination

### Frontend UI Coverage
- ✅ All authentication pages (Login, Register, Organization Setup)
- ✅ All issue pages (All Issues, My Issues, Inbox)
- ✅ All project pages (List, Detail, Tabs)
- ✅ Features page with Kanban board
- ✅ AI Generator page
- ✅ Settings page
- ✅ Navigation (Sidebar, User Menu)
- ✅ Command Palette
- ✅ Notifications
- ✅ Responsive design

## Notes

1. **Data Attributes**: Frontend tests expect `data-testid` attributes on interactive elements. Make sure these are added to your React components.

2. **Test Isolation**: For reliable results, run tests against a clean database or use transactions that rollback after each test.

3. **Performance**: Some tests may have delays (`wait` actions) to allow for API responses and UI updates.

4. **Parallel Execution**: Tests with dependencies cannot be run in parallel. Run them sequentially.

## Support

For issues or questions about the test suite, please refer to the TestSprite documentation or create an issue in the project repository.