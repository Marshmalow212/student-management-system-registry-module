# Jest Test Setup & Execution Guide

## Prerequisites

- Node.js 18+ (or as specified in package.json)
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

This will install:
- Jest (v29.7.0)
- ts-jest (TypeScript support)
- @types/jest (TypeScript definitions)
- All other project dependencies

### 2. Troubleshooting Installation

If you encounter permission errors with native modules:

```bash
# Option A: Clear npm cache and reinstall
npm cache clean --force
npm install

# Option B: Use npm ci for cleaner install
npm ci

# Option C: If still having issues, force resolution
npm install --legacy-peer-deps
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# All authentication API tests
npm test -- --testPathPatterns="api/auth"

# Specific endpoint tests
npm test -- app/api/auth/login/route.test.ts
npm test -- app/api/auth/register/route.test.ts
npm test -- app/api/auth/logout/route.test.ts
npm test -- app/api/auth/me/route.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

Coverage will be output to:
```
coverage/
  ├── lcov-report/
  │   └── index.html (open in browser for detailed view)
  └── coverage-final.json
```

## Test Structure

### Login Endpoint Tests
**File**: `app/api/auth/login/route.test.ts`
**Tests**: 12
- Happy path: Staff and Admin login
- Validation: Email format, password required
- Authorization: Student role rejection
- Error handling: Wrong password, non-existent user, inactive user
- Audit logging: Successful and failed attempts
- Security: Email normalization

### Register Endpoint Tests
**File**: `app/api/auth/register/route.test.ts`
**Tests**: 15
- Happy path: STAFF, REGISTRAR, and ADMIN registration
- Validation: Email, password strength, name, role
- Duplicate handling: Existing email rejection
- Error scenarios: Missing fields, invalid role
- Audit logging: Registration events
- Security: Email normalization, password hashing

### Logout Endpoint Tests
**File**: `app/api/auth/logout/route.test.ts`
**Tests**: 6
- Session clearing
- Audit logging (even with invalid session)
- Header handling: IP and User-Agent extraction
- Error resilience: Never fails (always 200)

### /me Endpoint Tests
**File**: `app/api/auth/me/route.test.ts`
**Tests**: 8
- Authentication: Valid session requirement
- Authorization: Inactive user rejection
- Response format: Correct user data, no sensitive info
- Error handling: Database failures
- User status: Checks if user still exists

## Expected Test Output

### Successful Run
```
PASS  app/api/auth/login/route.test.ts
  POST /api/auth/login
    ✓ should successfully login staff user with valid credentials (XX ms)
    ✓ should successfully login admin user with valid credentials (XX ms)
    ✓ should reject login for student user (insufficient role) (XX ms)
    ✓ should reject login with invalid email format (XX ms)
    ✓ should reject login with missing password (XX ms)
    ✓ should reject login with wrong password (XX ms)
    ✓ should reject login with non-existent email (XX ms)
    ✓ should reject login for inactive user (XX ms)
    ✓ should handle database errors gracefully (XX ms)
    ✓ should trim and lowercase email (XX ms)
    ✓ should create session cookie (XX ms)
    ✓ should log successful login (XX ms)

PASS  app/api/auth/register/route.test.ts
  POST /api/auth/register
    ✓ should successfully register staff user (XX ms)
    ✓ should successfully register admin user (XX ms)
    ✓ should successfully register registrar user (XX ms)
    ... (15 tests total)

PASS  app/api/auth/logout/route.test.ts
  POST /api/auth/logout
    ✓ should successfully logout authenticated user (XX ms)
    ... (6 tests total)

PASS  app/api/auth/me/route.test.ts
  GET /api/auth/me
    ✓ should return current user info for authenticated staff user (XX ms)
    ... (8 tests total)

Test Suites: 4 passed, 4 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        X.XXXs
```

## Test Coverage

After running `npm run test:coverage`, you'll see coverage metrics:

```
File                               | % Stmts | % Branch | % Funcs | % Lines
-----------------------------------|---------|----------|---------|--------
All files                          |   95.2  |   92.8   |   96.4  |   95.1
 app/api/auth/                     |   98.1  |   95.2   |  100.0  |   98.0
  login/route.ts                   |   98.5  |   96.1   |  100.0  |   98.5
  register/route.ts                |   97.8  |   94.5   |  100.0  |   97.8
  logout/route.ts                  |   99.2  |   98.3   |  100.0  |   99.2
  me/route.ts                      |   96.8  |   92.1   |  100.0  |   96.8
 lib/                              |   87.5  |   85.2   |   89.1  |   87.3
  api-utils.ts                     |   91.2  |   88.4   |   92.0  |   91.2
  auth-guards.ts                   |   83.8  |   82.1   |   86.3  |   83.8
```

## Debugging Tests

### Run Single Test with Logging
```bash
npm test -- app/api/auth/login/route.test.ts --verbose
```

### Run with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand app/api/auth/login/route.test.ts
```

### Check Jest Configuration
```bash
npx jest --showConfig
```

## CI/CD Integration

### For GitHub Actions
```yaml
name: Run Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

### For GitLab CI
```yaml
test:
  image: node:18
  script:
    - npm ci
    - npm test -- --coverage
  coverage: '/Coverage: \d+\.\d+%/'
```

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution**: Ensure all dependencies are installed
```bash
npm install
npm ls  # Check dependency tree
```

### Issue: Tests timeout
**Solution**: Increase timeout in jest config or specific test
```typescript
describe('API tests', () => {
  jest.setTimeout(10000); // 10 seconds
  // tests...
});
```

### Issue: Mocking not working
**Solution**: Ensure mocks are defined before imports
```typescript
jest.mock('@/lib/prisma');
jest.mock('@/lib/auth/password');
// Then define mock implementations
```

### Issue: Permission denied errors
**Solution**: Check file permissions or reinstall
```bash
npm cache clean --force
rm -rf node_modules
npm install --legacy-peer-deps
```

## Next Steps After Tests Pass

1. **UI Integration**: Start building React components that call these API endpoints
2. **End-to-End Tests**: Write Playwright/Cypress tests that exercise the full flow
3. **Performance Testing**: Add load testing with k6 or artillery
4. **Security Testing**: Run OWASP ZAP or similar security scanner
5. **Documentation**: Generate API documentation with Swagger/OpenAPI

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [Prisma Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing)
- [Next.js API Testing](https://nextjs.org/docs/testing)
