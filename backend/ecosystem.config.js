module.exports = {
  apps: [
    {
      name: 'shelter-backend',
      script: './dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/shelter.git',
      path: '/var/www/shelter-backend',
      'post-deploy':
        'npm install && npm run build && npm run db:migrate:prod && pm2 reload ecosystem.config.js --env production',
    },
  },
};
