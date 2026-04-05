# Contributing Guidelines

## Code Standards

### TypeScript
- Use strict mode: `"strict": true` in tsconfig.json
- Use explicit return types on all functions
- Avoid `any` - use `unknown` or proper types instead
- Use enums for fixed values (role, status)

### Naming Conventions
```typescript
// Classes & Interfaces: PascalCase
class UserService {}
interface IUser {}

// Functions & Variables: camelCase
function getUserById() {}
const userName = 'John';

// Constants: UPPER_SNAKE_CASE
const MAX_SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

// Files: kebab-case
user.service.ts
user.controller.ts
user.module.ts

// Directories: lowercase
src/auth/
src/users/
src/admin/
```

### Code Style
- Max line length: 100 characters
- Indentation: 2 spaces
- Semicolons: required
- Single quotes for strings
- Trailing commas: always

Use Prettier and ESLint:
```bash
npm run lint
npm run format
```

## Project Structure

```
src/
├── feature/
│   ├── feature.module.ts        # Module definition
│   ├── feature.controller.ts    # HTTP endpoints
│   ├── feature.service.ts       # Business logic
│   ├── dto/
│   │   └── index.ts             # DTOs for feature
│   ├── guards/ (if needed)
│   ├── interceptors/ (if needed)
│   └── entities/ (if needed)
```

## Creating New Features

### 1. Create Module Structure
```bash
mkdir -p src/feature/dto
touch src/feature/feature.module.ts
touch src/feature/feature.controller.ts
touch src/feature/feature.service.ts
touch src/feature/dto/index.ts
```

### 2. Create DTO
```typescript
// src/feature/dto/index.ts
import { IsString, IsEmail } from 'class-validator';

export class CreateFeatureDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;
}
```

### 3. Create Service
```typescript
// src/feature/feature.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class FeatureService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateFeatureDto) {
    return this.prisma.feature.create({ data });
  }
}
```

### 4. Create Controller
```typescript
// src/feature/feature.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { SessionAuthGuard } from '@/auth/guards/session-auth.guard';

@Controller('features')
export class FeatureController {
  constructor(private featureService: FeatureService) {}

  @Post()
  @UseGuards(SessionAuthGuard)
  async create(@Body() dto: CreateFeatureDto) {
    return this.featureService.create(dto);
  }
}
```

### 5. Create Module
```typescript
// src/feature/feature.module.ts
import { Module } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { FeatureController } from './feature.controller';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

### 6. Add to AppModule
```typescript
// src/app.module.ts
@Module({
  imports: [
    // ... other imports
    FeatureModule,
  ],
})
export class AppModule {}
```

## Writing Tests

### Unit Test Template
```typescript
// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '@/database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });
});
```

### Run Tests
```bash
npm run test                # Run all tests
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
```

## Git Workflow

### Branch Naming
```
feature/feature-name
fix/bug-description
refactor/refactoring-name
test/testing-name
docs/documentation-name
```

### Commit Messages
```
feat: Add new authentication module
fix: Resolve session validation bug
refactor: Simplify auth service
test: Add user service tests
docs: Update API documentation
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added
- [ ] Tests pass locally
- [ ] Manual testing done

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Performance Guidelines

### Database
- ✅ Use indexes on frequently queried columns
- ✅ Use `select` to limit returned fields
- ✅ Use `include` to eagerly load relations
- ✗ Avoid N+1 queries
- ✗ Avoid unnecessary database calls in loops

```typescript
// ✅ Good: Only select needed fields
const users = await this.prisma.user.findMany({
  select: { id: true, email: true, role: true },
});

// ✅ Good: Eager load relations
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  include: { sessions: true },
});

// ✗ Bad: N+1 query problem
const users = await this.prisma.user.findMany();
for (const user of users) {
  const sessions = await this.prisma.session.findMany({
    where: { userId: user.id },
  });
}
```

### Caching Patterns
```typescript
// Cache frequently accessed data
private userCache = new Map();

async getUserById(id: string) {
  if (this.userCache.has(id)) {
    return this.userCache.get(id);
  }

  const user = await this.prisma.user.findUnique({ where: { id } });
  this.userCache.set(id, user);
  return user;
}
```

## Error Handling

### Exception Types
```typescript
import { 
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

// Use appropriate exceptions
throw new NotFoundException('User not found');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Admin access required');
throw new BadRequestException('Invalid email format');
```

### Error Response Format
```typescript
{
  "statusCode": 400,
  "message": "Invalid input",
  "error": "Bad Request"
}
```

## Logging

### Logging Pattern
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async create(data: CreateUserDto) {
    this.logger.log(`Creating user: ${data.email}`);
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`);
      throw error;
    }
  }
}
```

## Security Checklist

- [ ] All user inputs validated with class-validator
- [ ] Sensitive operations require authentication guard
- [ ] Admin operations require admin role guard
- [ ] No sensitive data logged
- [ ] SQL injection prevention (Prisma handles this)
- [ ] CSRF tokens used for state-changing operations
- [ ] CORS properly configured
- [ ] Secrets never committed to git
- [ ] Environment variables used for all secrets

## Database Migrations

### Creating Migrations
```bash
# Make changes to prisma/schema.prisma, then:
npm run db:migrate

# Name the migration descriptively
# e.g. "add_user_status_field"
```

### Reviewing Migrations
```bash
# Check migration SQL
cat prisma/migrations/<timestamp>_<name>/migration.sql

# Test migration reversibility
npm run db:migrate:revert
npm run db:migrate
```

### Migration Best Practices
- ✅ Make migrations reversible
- ✅ Test migrations before committing
- ✅ Use descriptive migration names
- ✗ Don't modify migrations after applying to production
- ✗ Don't combine multiple changes in one migration

## Documentation

### Code Comments
```typescript
// Only comment non-obvious logic
// Good:
const sessionHash = crypto.createHash('sha256').update(token).digest('hex');

// Unnecessary:
// Create user
const user = await this.createUser(data);
```

### Function Documentation
```typescript
/**
 * Validates user session and returns authenticated user
 * @param sessionId - The session ID from cookie
 * @returns User object if valid
 * @throws UnauthorizedException if session invalid or expired
 */
async validateSession(sessionId: string): Promise<User> {
  // implementation
}
```

## Release Process

### Version Bumping
```bash
# Follow semver:
# Major: Breaking changes
# Minor: New features
# Patch: Bug fixes

npm version patch  # 0.0.1 -> 0.0.2
npm version minor  # 0.0.2 -> 0.1.0
npm version major  # 0.1.0 -> 1.0.0
```

### Release Checklist
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Changelog updated
- [ ] Version number bumped
- [ ] Built successfully
- [ ] Tagged in git
- [ ] Deployed to staging
- [ ] Staging tests pass
- [ ] Deployed to production

## Questions?

Refer to:
- Architecture: ARCHITECTURE.md
- API: API.md
- Deployment: DEPLOYMENT.md
- NestJS Docs: https://docs.nestjs.com
- Prisma Docs: https://www.prisma.io/docs
