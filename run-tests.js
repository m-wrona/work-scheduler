#!/usr/bin/env node

import { spawn } from 'child_process';

// Run bun test
const bunTest = spawn('bun', ['test'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

bunTest.on('close', (code) => {
  process.exit(code);
});

bunTest.on('error', (err) => {
  console.error('Failed to start bun test:', err);
  process.exit(1);
});
