module.exports = {
  apps: [{
    name: 'luxor-mall',
    script: 'npm',
    args: 'run start',
    env: { NODE_ENV: 'production', PORT: 3000 },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
  }]
};
