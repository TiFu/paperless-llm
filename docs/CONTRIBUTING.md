# Contributing Guide

Thank you for considering contributing to Paperless-LLM! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Architecture Guidelines](#architecture-guidelines)
- [Documentation](#documentation)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Acknowledge different viewpoints and experiences
- Accept responsibility and apologize for mistakes
- Prioritize what is best for the community

### Unacceptable Behavior

- Harassment, trolling, or discriminatory language
- Personal attacks or derogatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL client tools (optional)
- Git
- Basic understanding of TypeScript, Node.js, React

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/paperless-llm.git
   cd paperless-llm
   ```

2. **Set up remotes**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/paperless-llm.git
   git fetch upstream
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd server
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. **Start development environment**
   ```bash
   # See DEV_SETUP.md for detailed instructions
   cd docker
   docker compose -f docker-compose.dev.yml up -d
   
   cd ..
   ./dev-start.sh
   ```

5. **Verify setup**
   ```bash
   # Backend should be running on http://localhost:3000
   curl http://localhost:3000/api/health
   
   # Frontend should be running on http://localhost:5173
   open http://localhost:5173
   ```

## Development Workflow

### 1. Create a Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or bugfix branch
git checkout -b fix/issue-123-description
```

**Branch Naming Conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/improvements
- `chore/` - Maintenance tasks

### 2. Make Changes

Follow the [Code Standards](#code-standards) while making your changes.

```bash
# Backend changes
cd server
# Edit files in server/src/

# Frontend changes  
cd frontend
# Edit files in frontend/src/
```

### 3. Write Tests

All new features and bug fixes should include tests:

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd frontend
npm test
```

### 4. Run Linters

```bash
# Backend
cd server
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
```

### 5. Commit Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .

# Format: <type>(<scope>): <subject>
git commit -m "feat(worker): add concurrent step processing"
git commit -m "fix(api): resolve CORS issue with frontend"
git commit -m "docs(readme): update installation instructions"
```

**Commit Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

### 6. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## Code Standards

### TypeScript

**General Rules:**
- Use TypeScript strict mode
- Avoid `any` types (use `unknown` if needed)
- Define interfaces for all data structures
- Use explicit return types for functions
- Prefer `const` over `let`, avoid `var`

**Example:**
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Bad
function getUser(id: any): any {
  // Implementation
}
```

### File Naming

- **Domain/Application/Infrastructure:** PascalCase
  - `JobApplicationService.ts`
  - `StepExecutorApplicationService.ts`
  - `PostgreSQLJobRepository.ts`

- **Utilities:** camelCase
  - `logger.ts`
  - `dateUtils.ts`

- **React Components:** PascalCase
  - `JobsPage.tsx`
  - `DocumentList.tsx`

- **Tests:** Same as file being tested + `.test.ts`
  - `Job.test.ts`
  - `StepExecutor.test.ts`

### Code Organization

#### Backend Structure

```
server/src/
├── domain/           # Domain layer (pure business logic)
│   ├── job/
│   ├── steps/
│   ├── workflows/
│   └── ...
├── application/      # Application layer (orchestration)
│   ├── JobApplicationService.ts
│   ├── StepExecutorApplicationService.ts
│   └── ...
├── infrastructure/   # Infrastructure layer (database, external)
│   ├── Database.ts
│   ├── TransactionManager.ts
│   └── ...
├── repositories/     # Data access
│   └── postgresql/
├── services/         # External service clients
│   ├── PaperlessService.ts
│   └── OllamaService.ts
├── api/             # API layer
│   ├── routes/
│   └── middleware/
└── utils/           # Utilities
    └── logger.ts
```

#### Frontend Structure

```
frontend/src/
├── components/      # Reusable components
│   ├── JobsList.tsx
│   └── DocumentCard.tsx
├── pages/          # Page components
│   ├── JobsPage.tsx
│   └── DocumentsPage.tsx
├── contexts/       # React contexts
│   └── StatsContext.tsx
├── services/       # API clients
│   └── api.ts
└── types/          # TypeScript types
    └── api.ts
```

### Naming Conventions

**Classes:**
- Domain entities: `Job`, `Step`, `Workflow`
- Services: `JobApplicationService`, `PaperlessService`
- Repositories: `PostgreSQLJobRepository`

**Interfaces:**
- Prefix with `I`: `IJobRepository`, `ILLMService`
- Or use descriptive names: `JobData`, `StepResult`

**Functions:**
- Verbs: `createJob`, `executeStep`, `advanceWorkflow`
- Boolean returns: `isCompleted`, `hasErrors`, `canRetry`

**Constants:**
- UPPER_SNAKE_CASE: `MAX_RETRIES`, `DEFAULT_TIMEOUT`

### Comments

**Use comments for:**
- Complex business logic
- Non-obvious design decisions
- TODOs with context

```typescript
// ✅ Good
// External API calls happen outside transactions since they cannot be rolled back.
// We fetch data first, call external service, then update in a new transaction.
const document = await this.fetchDocument(docId);
const result = await this.llmService.generate(document.content);
await this.updateWithResult(result);

// ❌ Bad
// Get document
const document = await this.fetchDocument(docId);
```

**Avoid comments for:**
- Self-explanatory code
- Commented-out code (delete it)
- Redundant documentation

### Error Handling

**Always:**
- Use typed errors when possible
- Log errors with context
- Re-throw or handle appropriately
- Don't swallow errors silently

```typescript
// ✅ Good
try {
  await this.executeStep(stepId);
} catch (error) {
  logger.error('Failed to execute step', { 
    stepId, 
    error: error instanceof Error ? error.message : String(error)
  });
  throw new StepExecutionError(`Step ${stepId} failed`, { cause: error });
}

// ❌ Bad
try {
  await this.executeStep(stepId);
} catch (error) {
  // Silent failure
}
```

### Async/Await

**Prefer async/await over promises:**

```typescript
// ✅ Good
async function processJob(jobId: string): Promise<void> {
  const job = await this.getJob(jobId);
  const result = await this.processSteps(job);
  await this.saveResult(result);
}

// ❌ Bad
function processJob(jobId: string): Promise<void> {
  return this.getJob(jobId)
    .then(job => this.processSteps(job))
    .then(result => this.saveResult(result));
}
```

## Testing Requirements

### Test Coverage

**Minimum coverage requirements:**
- Unit tests: 80% coverage
- Integration tests for critical paths
- E2E tests for main workflows

### Unit Tests

**Location:** Same directory as source, `.test.ts` suffix

**Example:**
```typescript
// server/src/domain/job/Job.test.ts
import { Job } from './Job';

describe('Job', () => {
  describe('advance', () => {
    it('should transition from PENDING to LLM_PROCESSING on success', () => {
      const job = Job.create({ documentId: '123', workflowType: 'AUTOMATED' });
      
      job.advance(Transition.success());
      
      expect(job.state).toBe('LLM_PROCESSING');
    });
    
    it('should transition to FAILED on failure', () => {
      const job = Job.create({ documentId: '123', workflowType: 'AUTOMATED' });
      
      job.advance(Transition.failure());
      
      expect(job.state).toBe('FAILED');
    });
  });
});
```

### Integration Tests

**Location:** `server/tests/integration/`

**Example:**
```typescript
// server/tests/integration/JobWorkflow.test.ts
describe('Job Workflow Integration', () => {
  let db: TestDatabase;
  
  beforeEach(async () => {
    db = await TestDatabase.create();
  });
  
  afterEach(async () => {
    await db.teardown();
  });
  
  it('should complete full automated workflow', async () => {
    // Create job
    const job = await jobService.createJob({
      documentId: '123',
      workflowType: 'AUTOMATED'
    });
    
    // Execute steps
    await stepExecutor.processAll();
    
    // Verify completion
    const finalJob = await jobService.getJob(job.id);
    expect(finalJob.state).toBe('COMPLETED');
  });
});
```

### Running Tests

```bash
# Backend
cd server

# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage

# Specific test file
npm test Job.test.ts

# Integration tests only
npm run test:integration
```

```bash
# Frontend
cd frontend

# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

### Test Best Practices

**DO:**
- Write tests before or alongside code (TDD)
- Test behavior, not implementation
- Use descriptive test names
- Isolate tests (no shared state)
- Mock external dependencies

**DON'T:**
- Test private methods directly
- Write tests that depend on execution order
- Use real external services in tests
- Commit failing tests

## Pull Request Process

### Before Submitting

**Checklist:**
- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

```bash
# Update your branch
git fetch upstream
git rebase upstream/main

# Run checks
npm run lint
npm run type-check
npm test
```

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Fixes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated checks run:**
   - Linting
   - Type checking
   - Tests
   - Build

2. **Code review by maintainers:**
   - Architecture review
   - Code quality
   - Test coverage
   - Documentation

3. **Address feedback:**
   - Make requested changes
   - Push to same branch (PR updates automatically)
   - Respond to review comments

4. **Approval and merge:**
   - Squash merge (default)
   - Maintainer merges after approval

### After Merge

- Delete your feature branch
- Update your local main branch
- Close any related issues

## Architecture Guidelines

### Domain-Driven Design

**Follow DDD principles:**
- Keep domain logic pure (no infrastructure dependencies)
- Use value objects for immutable data
- Encapsulate business rules in entities
- Define clear bounded contexts

**Example:**
```typescript
// ✅ Good - Pure domain logic
class Job {
  advance(transition: Transition): void {
    const workflow = this.getWorkflow();
    const nextState = workflow.getNextState(this.state, transition.result);
    if (nextState) {
      this.state = nextState;
    }
  }
}

// ❌ Bad - Domain mixed with infrastructure
class Job {
  async advance(transition: Transition): Promise<void> {
    const workflow = this.getWorkflow();
    const nextState = workflow.getNextState(this.state, transition.result);
    if (nextState) {
      this.state = nextState;
      await db.save(this);  // ❌ Database call in domain
    }
  }
}
```

### Transaction Boundaries

**Remember:**
- External calls OUTSIDE transactions
- Database writes INSIDE transactions
- Keep transactions short
- Use transaction context pattern

See [Architecture Guide](ARCHITECTURE.md) for details.

### Adding New Features

**When adding a new step type:**

1. Create step class in `server/src/domain/steps/`
2. Implement `execute()` method
3. Add to step factory
4. Add tests
5. Update documentation

**When adding a new workflow:**

1. Create workflow class in `server/src/domain/workflows/`
2. Implement `WorkflowDefinition` interface
3. Define state transitions
4. Add tests
5. Update documentation

## Documentation

### Code Documentation

**JSDoc comments for:**
- Public APIs
- Complex algorithms
- Configuration options

**Example:**
```typescript
/**
 * Executes a step and handles retries on failure.
 * 
 * @param stepId - Unique identifier of the step to execute
 * @returns Promise that resolves when step completes or fails permanently
 * @throws StepExecutionError if step execution fails
 * 
 * @example
 * ```typescript
 * await stepExecutor.executeStep('abc-123');
 * ```
 */
async executeStep(stepId: string): Promise<void> {
  // Implementation
}
```

### User Documentation

**Update when:**
- Adding new features
- Changing configuration
- Modifying APIs
- Fixing bugs that affect usage

**Docs to update:**
- README.md - High-level changes
- Relevant guides in docs/
- API documentation
- Configuration examples

## Issue Guidelines

### Reporting Bugs

**Include:**
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, etc.)
- Logs (sanitize sensitive data)
- Screenshots if applicable

**Example:**
```markdown
## Bug Description
Workers are not processing steps in the queue

## Steps to Reproduce
1. Start application with `docker compose up`
2. Submit job via API: `POST /api/jobs`
3. Observe queue stats: `GET /api/queue/llm/stats`
4. Steps remain in WAITING status

## Expected Behavior
Workers should claim and process steps

## Actual Behavior
Steps stay in WAITING indefinitely

## Environment
- OS: Ubuntu 22.04
- Node: 18.17.0
- Docker: 24.0.5

## Logs
```
[2024-01-15 10:30:45] ERROR: Failed to claim steps
...
```
```

### Requesting Features

**Include:**
- Clear description of the feature
- Use case / motivation
- Proposed solution (if any)
- Alternatives considered
- Willingness to contribute

**Example:**
```markdown
## Feature Request
Support for generating document tags via LLM

## Use Case
Users want to automatically tag documents based on content

## Proposed Solution
1. Add `LLM_GENERATE_TAGS` step type
2. Create new prompt template
3. Parse LLM response as tag list
4. Update document with tags

## Alternatives
- Manual tagging
- Rule-based tagging

## Contributing
I'm willing to implement this feature
```

## Communication

### Channels

- **GitHub Issues:** Bug reports, feature requests
- **GitHub Discussions:** General questions, ideas
- **Pull Requests:** Code reviews
- **Discord/Slack:** Real-time chat (if available)

### Response Times

- Issues: Response within 48 hours
- Pull requests: Initial review within 1 week
- Security issues: Response within 24 hours

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Mentioned in documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

## Questions?

- Check [documentation](../README.md#documentation)
- Search [existing issues](https://github.com/OWNER/paperless-llm/issues)
- Ask in [discussions](https://github.com/OWNER/paperless-llm/discussions)
- Reach out to maintainers

## Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort! 🎉
