# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server with HMR (node ace serve --hmr)
npm run build            # Production build
npm start                # Run production build (from build/)

# Testing
npm test                 # Run all tests
node ace test --files "tests/unit/**/*.spec.ts"  # Run specific test files
node ace test --tags "users"                      # Run tests by tag

# Code Quality
npm run lint             # Check formatting (Prettier, ESLint, Stylelint)
npm run lint-fix         # Auto-fix lint issues
npm run typecheck        # TypeScript type checking
npm run format           # Format with Prettier
```

## Architecture

### Stack Overview
- **Backend**: AdonisJS 6 with Kysely (type-safe SQL query builder, not ORM)
- **Frontend**: React 19 with Inertia.js (SSR-enabled)
- **Database**: PostgreSQL with Kysely migrations
- **Auth**: Session-based with TOTP 2FA and WebAuthn/passkeys support
- **Testing**: Japa (unit/functional) + Playwright (browser)

### Request Flow
```
HTTP Request → Router (start/routes.ts) → Middleware (start/kernel.ts)
→ Controller → inertia.render(page, props) → Edge template → React hydration
```

### Key Directories
- `app/controllers/` - HTTP handlers, organized by domain (session/, profile/)
- `app/services/` - Shared logic (db.ts for Kysely connection, webauthn.ts)
- `app/validators/` - VineJS input validation schemas
- `app/policies/` - Bouncer authorization rules
- `inertia/pages/` - React page components
- `inertia/components/` - Reusable React components
- `start/routes.ts` - All route definitions
- `start/kernel.ts` - Middleware pipeline configuration

### Database Access
Uses Kysely with a singleton pattern. Always use the `db()` helper:
```typescript
import { db } from '#services/db'

const user = await db()
  .selectFrom('users')
  .where('id', '=', id)
  .executeTakeFirstOrThrow()
```

Database types are auto-generated in `database/types.d.ts` via kysely-codegen.

### Authentication Flow
1. Session-based auth via `@adonisjs/auth` with custom Kysely provider
2. If user has TOTP enabled, redirects to `/session/totp` after password
3. WebAuthn/passkeys as passwordless alternative
4. Sensitive operations require `security.ensureConfirmed()` (re-auth within 5 min)

### Shared Props (Inertia)
All pages receive via `config/inertia.ts`:
- `user` - Current user, if authenticated
- `locale` - For i18n
- `policies` - Permission matrix for UI
- `exceptions` - Form validation errors
- `messages` - Flash messages

### Testing Patterns
- Tests run in transactions that auto-rollback (via `withGlobalTransaction()`)
- Use factories in `tests/support/factories/` to create test data
- Browser tests use Playwright via `@japa/browser-client`
- External HTTP mocked with nock (auto-disabled in test setup)
- The `browser` tests are the main tests
  - Use to test successful paths
  - Use to test important failure paths
  - Use `browserContext.loginAs` to mock being signed in
- Use `functional` tests to cover missing branches in controllers
- Use `unit` tests to cover missing branches in other source files
- Only use unit tests to fill in missing coverage
- DO NOT assign passwords to test users unless the password will be used
- Use `testUtils.createHttpContext()` to create an `HttpContext` for unit tests
- Place unit tests under `tests/unit/[file path relative to app].spec.ts`
- Place functional (request) tests under `tests/functional/[file path relative to app/controllers].spec.ts`

### i18n
- Backend: `@adonisjs/i18n`
- Frontend: `react-i18next` with shared config
- Translations: `resources/lang/en.json`
- Custom interpolation uses `{key}` not `{{key}}`

## Important Patterns

### File naming

- Backend files must be snake case.
- Frontend files (`inertia` folder) must be lower camelCase for pages, PascalCase for components

### Controller → React Data Flow
Controllers return `inertia.render('page/name', { data })`. Props flow to React components with TypeScript types.

### Authorization
Use Bouncer policies for authorization:
```typescript
await ctx.bouncer.with(UserPolicy).authorize('edit', targetUser)
```
Policies also populate `permissions` object on records for frontend UI.

### Encryption
TOTP secrets and recovery codes are encrypted at rest. Use `encryption.decrypt<T>()` to access.

### Node.js Import Aliases
The codebase uses `#` prefix imports defined in package.json:
- `#controllers/*`, `#services/*`, `#validators/*`, `#models/*`, etc.

### Routing conventions
- RESTful routes with resource controllers where applicable
- Use AdonisJS's method naming conventions for resourceful routing:
  - GET /profiles → index
  - GET /profiles/:id → show
  - GET /profiles/create → create
  - POST /profiles → store
  - GET /profiles/:id/edit → edit
  - PUT/PATCH /profiles/:id → update
  - DELETE /profiles/:id → destroy

### Forms and API Calls
- Use Inertia's useForm, whenever possible, for form state management
- Use tuyau for client API calls (only) when Inertia's useForms is not suitable
- In controllers, use FormError for non-validation errors

## PR Workflow

When asked to open a PR:
1. Wait for AI review comments to come in
2. For each comment received, analyze it and respond with either:
   - Confirmation that it's been fixed (with details)
   - Explanation of why it won't be fixed (reasoning)
3. Monitor PR checks using --watch until all pass
4. Post a final comment: 'Ready for review' when complete

Always be thorough in reasoning about each comment's relevance before deciding to implement or decline.
