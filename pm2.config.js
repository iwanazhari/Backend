/**
 * PM2 Ecosystem Configuration
 * Production deployment configuration
 * 
 * Usage:
 *   npm start                    - Start with PM2
 *   pm2 start pm2.config.js      - Start with config
 *   pm2 restart backend-starter-kit
 *   pm2 stop backend-starter-kit
 *   pm2 logs backend-starter-kit
 *   pm2 monit                    - Monitor
 */

module.exports = {
  apps: [
    {
      // Application name
      name: process.env.PM2_APP_NAME || 'backend-starter-kit',

      // Entry point
      script: './src/index.js',

      // Number of instances (cluster mode)
      // 'max' = number of CPU cores
      instances: process.env.PM2_INSTANCES || 4,

      // Cluster mode for load balancing
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        APP_PORT: process.env.APP_PORT || 3000,
      },

      // Error log file
      error_file: process.env.PM2_ERROR_FILE || './logs/pm2-error.log',

      // Output log file
      out_file: process.env.PM2_LOG_FILE || './logs/pm2.log',

      // Log date format
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Merge logs
      merge_logs: true,

      // Auto restart on crash
      autorestart: true,

      // Watch mode (disable in production)
      watch: false,

      // Max memory before restart (adjust based on your server)
      max_memory_restart: process.env.PM2_MAX_MEMORY || '500M',

      // Graceful shutdown timeout
      kill_timeout: process.env.PM2_KILL_TIMEOUT || 3000,

      // Time between restarts (avoid restart loop)
      restart_delay: 4000,

      // Min uptime before considering start as success
      min_uptime: process.env.PM2_MIN_UPTIME || '10s',

      // Max number of restarts in a minute before considering app as errored
      max_restarts: 10,

      // Source map support
      source_map_support: true,

      // Disable source map in production for security
      disable_source_map_support: false,

      // Ignore files in watch mode
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],

      // Maximum number of lines in a log file
      max_lines: 100000,

      // Log rotation (requires pm2-logrotate module)
      // pm2 install pm2-logrotate
      log_rotate: true,
    },
  ],
};
