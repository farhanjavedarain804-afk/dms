module.exports = {
  apps: [
    {
      name: "dms",
      script: ".output/server/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
        DB_HOST: "127.0.0.1",
        DB_PORT: "3306",
        DB_NAME: "u168718068_dms",
        DB_USER: "u168718068_dms_user",
        DB_PASS: "Furhan@4457&899aBc",
      },
    },
  ],
};
