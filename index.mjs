module.exports = {
  apps: [
    {
      name: "eclipos-reminder-bot",
      script: "index.mjs",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
