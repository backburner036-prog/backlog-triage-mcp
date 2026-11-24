// Pure, dependency-free triage scoring. No Forge runtime needed, so it
// is unit-testable with plain `node --test` (see test/triage.test.js).
// An issue is "stale" after 30 days without an update.

export const STALE_DAYS = 30;
export const MAX_RESULTS_DEFAULT = 25;
export const MAX_RESULTS_LIMIT = 50;

/**
 * Score one Jira issue (Jira REST `fields` shape) for triage urgency.
 * Returns { score, flags } where flags are short machine-readable codes
 * an agent can quote back to the user.
 */
export function scoreIssue(issue, now = new Date()) {
  const fields = issue.fields || {};
  let score = 0;
  const flags = [];

  if (!fields.assignee) {
    score += 2;
    flags.push('no-assignee');
  }
  const updated = fields.updated ? new Date(fields.updated) : null;
  if (updated && now - updated > STALE_DAYS * 24 * 60 * 60 * 1000) {
    score += 2;
    flags.push('stale');
  }
  if (!fields.description) {
    score += 1;
    flags.push('no-description');
  }
  if (!fields.priority) {
    score += 1;
    flags.push('no-priority');
  }
  if (!fields.labels || fields.labels.length === 0) {
    score += 1;
    flags.push('no-labels');
  }
  return { score, flags };
}

/** Rank issues by triage score (highest first), oldest update first on ties. */
export function rankIssues(issues, now = new Date()) {
  return issues
    .map((issue) => ({ issue, ...scoreIssue(issue, now) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ua = a.issue.fields?.updated || '';
      const ub = b.issue.fields?.updated || '';
      return ua < ub ? -1 : ua > ub ? 1 : 0;
    });
}

/** Group ranked issues into the three triage buckets used by the summary. */
export function groupForSummary(ranked) {
  const groups = { needsOwner: [], goneStale: [], unclear: [] };
  for (const item of ranked) {
    if (item.flags.includes('no-assignee')) groups.needsOwner.push(item);
    if (item.flags.includes('stale')) groups.goneStale.push(item);
    if (item.flags.includes('no-description') || item.flags.includes('no-priority')) {
      groups.unclear.push(item);
    }
  }
  return groups;
}

/** Render the deterministic Markdown triage brief (no LLM call). */
export function renderSummary(projectKey, ranked) {
  const groups = groupForSummary(ranked);
  const line = (item) =>
    `- ${item.issue.key}: ${item.issue.fields?.summary || '(no summary)'} ` +
    `(score ${item.score}: ${item.flags.join(', ')})`;
  const section = (title, items) =>
    items.length
      ? `## ${title}\n${items.slice(0, 10).map(line).join('\n')}\n`
      : `## ${title}\n- Nothing here. Good.\n`;
  return [
    `# Backlog triage — ${projectKey}`,
    `${ranked.length} open issue(s) ranked by urgency.`,
    '',
    section('Needs an owner', groups.needsOwner),
    section('Gone stale (>30 days without an update)', groups.goneStale),
    section('Unclear (missing description or priority)', groups.unclear),
    'Suggested next action: assign the top item in each group, then re-run triage.',
  ].join('\n');
}

/** Clamp maxResults to the documented range. */
export function clampMaxResults(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return MAX_RESULTS_DEFAULT;
  return Math.min(Math.floor(n), MAX_RESULTS_LIMIT);
}
