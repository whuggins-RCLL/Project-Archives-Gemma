#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, 'package.json');
const envExamplePath = path.join(repoRoot, '.env.example');

const strict = process.env.CI_GUARD_STRICT === '1';
const failures = [];
const warnings = [];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function checkLifecycleScripts() {
  const pkg = readJson(packageJsonPath);
  const scripts = pkg.scripts || {};
  const guardedScripts = ['prebuild', 'build', 'postbuild', 'start'];
  const forbiddenTokens = /\b(seed|seeding|migrate|migration|reset|truncate|wipe)\b/i;

  for (const name of guardedScripts) {
    const command = scripts[name];
    if (!command) continue;
    if (forbiddenTokens.test(command)) {
      failures.push(
        `Unsafe token found in package.json script "${name}": "${command}". ` +
        'Do not mutate persistent data in build/start lifecycle scripts.',
      );
    }
  }
}

function checkEnvTemplate() {
  if (!fs.existsSync(envExamplePath)) {
    failures.push('.env.example is missing; cannot verify deployment environment contract.');
    return;
  }

  const envTemplate = fs.readFileSync(envExamplePath, 'utf8');
  const requiredTemplateVars = [
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_DATABASE_ID',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ];

  for (const envVar of requiredTemplateVars) {
    const pattern = new RegExp(`^${envVar}=`, 'm');
    if (!pattern.test(envTemplate)) {
      failures.push(`.env.example is missing "${envVar}=".`);
    }
  }
}

function checkRuntimeEnvAlignment() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const databaseId = process.env.VITE_FIREBASE_DATABASE_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!strict) {
    if (!projectId || !databaseId || !serviceAccountJson) {
      warnings.push(
        'Runtime production env alignment check skipped (set CI_GUARD_STRICT=1 and provide env vars to enforce).',
      );
      return;
    }
  }

  const missing = [];
  if (!projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!databaseId) missing.push('VITE_FIREBASE_DATABASE_ID');
  if (!serviceAccountJson) missing.push('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (missing.length > 0) {
    failures.push(`Missing required env var(s): ${missing.join(', ')}.`);
    return;
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    failures.push('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    return;
  }

  const serviceAccountProjectId = serviceAccount?.project_id;
  if (!serviceAccountProjectId || typeof serviceAccountProjectId !== 'string') {
    failures.push('FIREBASE_SERVICE_ACCOUNT_JSON is missing "project_id".');
    return;
  }

  if (serviceAccountProjectId !== projectId) {
    failures.push(
      `Project mismatch: VITE_FIREBASE_PROJECT_ID="${projectId}" but FIREBASE_SERVICE_ACCOUNT_JSON.project_id="${serviceAccountProjectId}".`,
    );
  }

  if (databaseId !== '(default)' && !/^[A-Za-z0-9-]+$/.test(databaseId)) {
    failures.push(`VITE_FIREBASE_DATABASE_ID="${databaseId}" is invalid.`);
  }
}

checkLifecycleScripts();
checkEnvTemplate();
checkRuntimeEnvAlignment();

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.warn(`⚠️  ${warning}`);
  }
}

if (failures.length > 0) {
  console.error('❌ Persistent-state CI guard failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('✅ Persistent-state CI guard passed.');
