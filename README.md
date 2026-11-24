# Backlog Triage MCP

A Forge app that exposes Jira backlog triage as tools on the Atlassian MCP
server — so any MCP-compatible AI agent (Rovo Studio, Claude, Cursor, …)
can answer "what in our backlog needs attention first?" with real data
instead of guessing.

Built for **Codegeist 2026** (Atlassian × Devpost), category **Apps for
Software Teams**, targeting the **Best app with Atlassian MCP** bonus
($1,500): the app declares one `rovo:mcp` module (`Backlog Triage MCP`)
with three tools. `skill.md` in this repo is the open-source skill file
agents can add to third-party clients, as the Codegeist rules allow.

## The three tools (max 3 features, by design)

| Tool | What it does |
|---|---|
| `triage-backlog` | Ranks a project's open issues by urgency: +2 unassigned, +2 stale (>30 days without an update), +1 no description, +1 no priority, +1 no labels. |
| `get-issue-context` | One issue's summary, status, assignee, priority, labels, last update, comment count, and linked issues. |
| `draft-triage-summary` | A Markdown triage brief (needs-an-owner / gone-stale / unclear) with a suggested next action. Deterministic — no LLM call, no usage cost. |

Read-only by design: the app never creates, edits, closes, or reassigns
issues. All reads go through `api.asUser()`, so tools only see what the
invoking user may see in Jira.

## Install (for judges)

1. Install the app in your test site from the installation link on the
   Devpost submission (see `docs/INSTALL.md` — or the submission's
   testing instructions).
2. To expose the tools to an external MCP client, a site/org admin
   enables them under **Apps → Sites → your site → Connected apps**
   (per-install opt-in). The endpoint is then
   `https://mcp.atlassian.com/forge/<appId>`.
3. In Rovo Studio the tools appear automatically for custom agents once
   the app is installed. Add `skill.md` to any third-party agent for
   the triage workflow.
4. Seeded demo data: use any Jira project with a few open issues
   (the Codegeist 90-day dev site ships seeded demo data). Example:
   `triage-backlog` with `projectKey` of that project.

## Develop

```bash
npm install
npm test            # pure-logic unit tests (no Atlassian account needed)
forge lint          # manifest + code checks (no login needed)
forge deploy        # needs `forge login` (Atlassian account, see below)
forge install --demo-site   # install on the Codegeist dev site
```

Requirements: Node.js 20+, Forge CLI ≥13.3.0 (`npm install -g @forge/cli`).

## Status

Fase 1 skeleton: manifest + 3 actions + scoring logic + tests + skill file.
`manifest.yml` still carries a placeholder app id — run `forge login`
then `forge register` to get the real id, then `forge deploy` + `forge
install`. Deploy/install needs an Atlassian account + dev site; that
step is intentionally not done by the build lane.

## License

MIT — see `LICENSE`.
