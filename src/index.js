// Backlog Triage MCP — Forge resolvers behind the three `rovo:mcp` tools.
// Every read goes through `api.asUser()` so the tools only ever see what
// the invoking user is allowed to see in Jira. No data leaves Atlassian
// except as a tool result to the calling agent; no LLM is called.

import api, { route } from '@forge/api';
import { rankIssues, renderSummary, clampMaxResults } from './triage.js';

const ISSUE_FIELDS = 'summary,status,assignee,priority,labels,updated,description,comment,issuelinks';

async function searchOpenIssues(projectKey, maxResults) {
  const jql = `project = ${projectKey} AND statusCategory != Done ORDER BY updated ASC`;
  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=${ISSUE_FIELDS}`);
  if (!res.ok) {
    throw new Error(`Jira search failed (${res.status}). Check the project key and permissions.`);
  }
  return (await res.json()).issues || [];
}

function publicIssue(item) {
  const f = item.issue.fields || {};
  return {
    key: item.issue.key,
    summary: f.summary || null,
    status: f.status?.name || null,
    assignee: f.assignee?.displayName || null,
    priority: f.priority?.name || null,
    labels: f.labels || [],
    updated: f.updated || null,
    triageScore: item.score,
    flags: item.flags,
  };
}

export async function triageBacklog({ projectKey, maxResults }) {
  if (!projectKey) throw new Error('projectKey is required, e.g. PROJ.');
  const limit = clampMaxResults(maxResults);
  const issues = await searchOpenIssues(projectKey, limit);
  const ranked = rankIssues(issues);
  return {
    projectKey,
    openIssues: ranked.length,
    topIssue: ranked[0] ? publicIssue(ranked[0]) : null,
    ranked: ranked.map(publicIssue),
  };
}

export async function getIssueContext({ issueKey }) {
  if (!issueKey) throw new Error('issueKey is required, e.g. PROJ-123.');
  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueKey}?fields=${ISSUE_FIELDS}`);
  if (!res.ok) {
    throw new Error(`Could not read ${issueKey} (${res.status}). Check the key and permissions.`);
  }
  const issue = await res.json();
  const f = issue.fields || {};
  return {
    key: issue.key,
    summary: f.summary || null,
    status: f.status?.name || null,
    assignee: f.assignee?.displayName || null,
    priority: f.priority?.name || null,
    labels: f.labels || [],
    updated: f.updated || null,
    commentCount: f.comment?.total ?? f.comment?.comments?.length ?? 0,
    linkedIssues: (f.issuelinks || []).map((l) => ({
      type: l.type?.name || null,
      key: (l.outwardIssue || l.inwardIssue || {}).key || null,
    })),
  };
}

export async function draftTriageSummary({ projectKey }) {
  if (!projectKey) throw new Error('projectKey is required, e.g. PROJ.');
  const issues = await searchOpenIssues(projectKey, 50);
  const ranked = rankIssues(issues);
  return { projectKey, markdown: renderSummary(projectKey, ranked) };
}

// Each `action` in manifest.yml maps to its own Forge function above;
// the handler receives the action's inputs as its payload. No dispatcher
// is needed (and Forge does not pass an action key to handlers).
