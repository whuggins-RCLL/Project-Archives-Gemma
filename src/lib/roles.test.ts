import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageSettings, canViewSettings, normalizeRoleFromClaims } from './roles';

test('canViewSettings includes all supported roles', () => {
  assert.equal(canViewSettings('owner'), true);
  assert.equal(canViewSettings('admin'), true);
  assert.equal(canViewSettings('collaborator'), true);
  assert.equal(canViewSettings('viewer'), true);
});

test('canManageSettings stays restricted to owner/admin', () => {
  assert.equal(canManageSettings('owner'), true);
  assert.equal(canManageSettings('admin'), true);
  assert.equal(canManageSettings('collaborator'), false);
  assert.equal(canManageSettings('viewer'), false);
});

test('normalizeRoleFromClaims preserves admin fallback compatibility', () => {
  assert.equal(normalizeRoleFromClaims({ role: 'collaborator' }), 'collaborator');
  assert.equal(normalizeRoleFromClaims({ admin: true }), 'admin');
  assert.equal(normalizeRoleFromClaims({}), 'viewer');
});
