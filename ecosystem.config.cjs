/**
 * PM2 Configuration for XIVIX XIIM Development
 */
module.exports = {
  apps: [
    {
      name: 'xivix-xiim',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=XIIM_DB --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
