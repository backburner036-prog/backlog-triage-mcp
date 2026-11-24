import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreIssue, rankIssues, renderSummary, clampMaxResults } from '../src/triage.js';

const now = new Date('2026-11-24T00:00:00Z');
const issue = (overrides = {}) => ({
  key: 'PROJ-1',
  fields: {
    summary: 'Fix login',
    status: { name: 'To Do' },
    assignee: { displayName: 'Ana' },
    priority: { name: 'High' },
    labels: ['backend'],
    updated: '2026-11-20T00:00:00.000Z',
    description: 'Steps to reproduce...',
    ...overrides,
  },
});

test('clean issue scores 0 with no flags', () => {
  assert.deepEqual(scoreIssue(issue(), now), { score: 0, flags: [] });
});

test('unassigned + stale + no description + no priority + no labels = 7', () => {
  const got = scoreIssue(issue({
    assignee: null,
    updated: '2026-10-01T00:00:00.000Z',
    description: null,
    priority: null,
    labels: [],
  }), now);
  assert.equal(got.score, 7);
  assert.deepEqual(got.flags, ['no-assignee', 'stale', 'no-description', 'no-priority', 'no-labels']);
});

test('ranking puts highest score first, oldest update first on ties', () => {
  const ranked = rankIssues([
    issue({ updated: '2026-11-20T00:00:00.000Z' }),
    issue({ assignee: null }),
    issue({ assignee: null, updated: '2026-11-01T00:00:00.000Z' }),
  ], now);
  assert.equal(ranked[0].issue.fields.updated, '2026-11-01T00:00:00.000Z');
  assert.equal(ranked[1].score, 2);
  assert.equal(ranked[2].score, 0);
});

test('summary groups issues and names the project', () => {
  const ranked = rankIssues([issue({ assignee: null }), issue()], now);
  const md = renderSummary('PROJ', ranked);
  assert.match(md, /# Backlog triage — PROJ/);
  assert.match(md, /Needs an owner/);
  assert.match(md, /PROJ-1/);
});

test('maxResults clamps to 1..50, defaults to 25', () => {
  assert.equal(clampMaxResults(undefined), 25);
  assert.equal(clampMaxResults(0), 25);
  assert.equal(clampMaxResults(999), 50);
  assert.equal(clampMaxResults(10), 10);
});
