---
name: backlog-triage
description: Triage a Jira backlog through the Backlog Triage MCP server — rank open issues by urgency, read one issue with full context, or draft a triage brief. Use when the user asks what needs attention in a Jira project, which backlog items are stale or unassigned, or for a triage summary to share with the team.
---

# Backlog Triage

You have three tools from the `Backlog Triage MCP` server
(`https://mcp.atlassian.com/forge/<appId>` after install):

1. `triage-backlog` — inputs: `projectKey` (required, e.g. `PROJ`),
   `maxResults` (optional, default 25, max 50). Returns open issues
   ranked by triage score: +2 unassigned, +2 stale (>30 days without
   an update), +1 no description, +1 no priority, +1 no labels.
2. `get-issue-context` — inputs: `issueKey` (required, e.g. `PROJ-123`).
   Returns summary, status, assignee, priority, labels, last update,
   comment count, and linked issues.
3. `draft-triage-summary` — inputs: `projectKey` (required). Returns a
   Markdown brief with three groups (needs an owner / gone stale /
   unclear) and a suggested next action.

## How to triage

1. Call `triage-backlog` for the project. Never invent issue keys,
   statuses, or assignees — if the tool returns nothing, say so.
2. For any issue the user asks about, call `get-issue-context` first.
3. When the user wants something to share, call
   `draft-triage-summary` and paste the Markdown as-is; do not
   embellish the numbers.
4. Suggested next action is always: assign the top item in each
   group, then re-run triage. Do not close, reassign, or edit issues
   yourself — this server is read-only by design.
