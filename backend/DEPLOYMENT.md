# Deployment & Operations Guide

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

### Quick Start

1. **Setup Database with Docker**
```bash
docker-compose up -d postgres
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your values
```

4. **Run Migrations & Seed**
```bash
npm run db:migrate
npm run db:seed
```

5. **Start Development Server**
```bash
npm run start:dev
```

Server runs on `http://localhost:3000`

### Database Commands
```bash
# Run migrations
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:prod

# Seed database
npm run db:seed

# Reset database (dangerous)
npm run db:reset
```

---

## Docker Deployment

### Build Image
```bash
docker build -t shelter-backend:latest .
```

### Run Container
```bash
docker run -d \
  --name shelter-backend \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@postgres:5432/shelter" \
  -e GOOGLE_CLIENT_ID="your-client-id" \
  -e GOOGLE_CLIENT_SECRET="your-client-secret" \
  -e GOOGLE_CALLBACK_URL="https://yourdomain.com/auth/google/callback" \
  -e SESSION_SECRET="secure-random-secret" \
  -e FRONTEND_URL="https://yourdomain.com" \
  shelter-backend:latest
```

### Docker Compose (with PostgreSQL)
```bash
docker-compose up -d
```

---

## Production Deployment

### Environment Variables (Production)
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:securepass@db-host:5432/shelter
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/auth/google/callback
SESSION_COOKIE_NAME=shelter_session
SESSION_SECRET=generate-a-very-long-random-string
SESSION_TTL_HOURS=168
FRONTEND_URL=https://yourdomain.com
ALLOWED_GOOGLE_DOMAIN=yourdomain.com (optional)
```

### Pre-Deployment Checklist
- [ ] Database backed up
- [ ] All tests passing
- [ ] Environment variables set
- [ ] SSL certificate configured
- [ ] CORS configured for frontend domain
- [ ] Session secret generated (32+ random characters)
- [ ] Google OAuth credentials created
- [ ] Database migrations tested

### Deploying to Production

1. **Build the Application**
```bash
npm run build
```

2. **Run Migrations**
```bash
npm run db:migrate:prod
```

3. **Start the Server**
```bash
npm run start:prod
```

### Using PM2 for Process Management
```bash
npm install -g pm2

# Create ecosystem.config.js
pm2 start ecosystem.config.js

# Monitor
pm2 monitor

# Logs
pm2 logs shelter-backend
```

### Nginx Configuration Example
```nginx
upstream shelter_backend {
  server 127.0.0.1:3000;
}

server {
  listen 443 ssl http2;
  server_name api.yourdomain.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://shelter_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cookie_path / "/";
  }
}

server {
  listen 80;
  server_name api.yourdomain.com;
  return 301 https://$server_name$request_uri;
}
```

---

## Monitoring & Logging

### Health Endpoint
```bash
curl http://localhost:3000/health
```

### Structured Logging
Enable JSON logging in production:
```typescript
// In main.ts
if (process.env.NODE_ENV === 'production') {
  // Configure Winston or other structured logger
}
```

### Recommended Monitoring
- Uptime monitoring (Uptime Robot, Newrelic)
- Error tracking (Sentry)
- Performance monitoring (DataDog, New Relic)
- Database monitoring (pgAdmin, AWS RDS Console)

---

## Database Backups

### PostgreSQL Backup
```bash
pg_dump -h localhost -U shelter_user -d shelter > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup
```bash
psql -h localhost -U shelter_user -d shelter < backup_file.sql
```

### Automated Backup Example (Cron)
```bash
# Add to crontab -e
0 2 * * * pg_dump -h localhost -U shelter_user -d shelter | gzip > /backups/shelter_$(date +\%Y\%m\%d).sql.gz
```

---

## Troubleshooting

### Cannot connect to database
```bash
# Check PostgreSQL is running
psql -h localhost -U shelter_user -d shelter -c "SELECT 1"

# Check connection string in .env
echo $DATABASE_URL
```

### Session issues
- Verify `SESSION_SECRET` is set and consistent
- Check database has sessions table
- Clear browser cookies and try again

### OAuth not working
- Verify Google credentials are correct
- Check callback URL matches configuration
- Ensure frontend URL is correct
- Check CORS settings

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

---

## Security Checklist

- [ ] Use HTTPS/SSL in production
- [ ] Set secure session cookie settings
- [ ] Rotate session secrets regularly
- [ ] Use strong, random SESSION_SECRET
- [ ] Enable HSTS headers
- [ ] Implement rate limiting
- [ ] Validate all inputs with class-validator
- [ ] Use environment variables for secrets
- [ ] Implement request logging
- [ ] Monitor for failed login attempts
- [ ] Regular security updates (npm audit)

---

## Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update all dependencies
npm update

# Update to latest major versions
npm install -g npm-check-updates
ncu -u
npm install

# Security audit
npm audit
npm audit fix
```

---

## Performance Optimization

### Database Optimization
- Index frequently queried fields ✓ (already in schema)
- Use connection pooling (Prisma does this)
- Regular VACUUM on PostgreSQL

### Application Optimization
- Enable gzip compression in Nginx/reverse proxy
- Implement caching headers
- Consider Redis for session store (optional)
- Profile with clinic.js

---

## Rollback Procedures

### Rollback Database
```bash
npm run db:migrate:revert
```

### Rollback Application
```bash
git revert <commit-hash>
npm run build
npm run start:prod
```
