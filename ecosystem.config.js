/**
 * File: ecosystem.config.js
 * Path: /
 * Author: Saša Kojadinović
 */

module.exports = {
  apps: [
    {
      name: "pametna-skola-backend",
      cwd: "./backend",                    // << radi iz backend foldera
      script: "src/app.js",                // tvoj ulazni fajl
      node_args: "-r dotenv/config",       // učitaj dotenv automatski
      env: {
        DOTENV_CONFIG_PATH: "./.env.development",  // default (pm2 start bez --env)
        NODE_ENV: "development"
      },
      env_production: {
        DOTENV_CONFIG_PATH: "./.env.production",   // pm2 --env production
        NODE_ENV: "production"
      },
      // Stabilnost
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      // Logovi (PM2 sam brine o streamovanju)
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      // Performanse (ostavi 1 instancu ako koristiš GPIO i lokalne fajlove)
      instances: 1,
      exec_mode: "fork",
      // Health checks
      watch: false,             // za prod isključi; u dev možeš watch:true
      // Opciono: odloži start dok se mreža podigne (nije obavezno)
      // wait_ready: false
    }
  ]
};
