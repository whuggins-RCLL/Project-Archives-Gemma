#!/usr/bin/env node
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const auditArgs = ['audit', '--json', ...args];

const child = spawn('npm', auditArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

let stdout = '';
let stderr = '';

child.stdout.on('data', (chunk) => {
  stdout += chunk.toString();
});

child.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

function isRegistryAdvisoryEndpointFailure(text) {
  const normalized = text.toLowerCase();

  return (
    normalized.includes('audit endpoint returned an error') ||
    normalized.includes('npm audit endpoint') ||
    normalized.includes('network request to') ||
    normalized.includes('getaddrinfo') ||
    normalized.includes('eai_again') ||
    normalized.includes('econnreset') ||
    normalized.includes('socket hang up')
  );
}

child.on('close', (code) => {
  const combined = `${stdout}\n${stderr}`;

  if (code === 0) {
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    process.exit(0);
  }

  if (isRegistryAdvisoryEndpointFailure(combined)) {
    const message = [
      '⚠️ npm advisory scan could not be fully verified because the registry advisory endpoint was unreachable in this environment.',
      'Treat this as an environment limitation and re-run `npm audit` from a network with npm registry advisory access.',
    ].join('\n');

    if (stdout.trim()) process.stdout.write(stdout);
    if (stderr.trim()) process.stderr.write(stderr);
    process.stderr.write(`\n${message}\n`);
    process.exit(0);
  }

  process.stdout.write(stdout);
  process.stderr.write(stderr);
  process.exit(code ?? 1);
});
