# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-18

First tagged release. Establishes a baseline for the existing codebase.

### Added

- Continuous integration: agent tests on Python 3.11 through 3.13, ruff lint, dashboard
  lint and build, and a Docker build of both services. The repository previously had no
  CI at all.
- CodeQL scanning and Dependabot updates for pip, npm, and GitHub Actions.
- `.env.example` documenting every configuration variable. `docker-compose.yml` declares
  `env_file: .env`, but no example file was present and `.gitignore` would have excluded
  one.
- ESLint configuration for the dashboard. `next lint` previously prompted for
  interactive setup and could not run unattended.
- Security policy, code of conduct, issue templates, and a pull request template.
- Ruff configuration in `pyproject.toml`.

### Changed

- `next` upgraded from 14.2.0 to 14.2.35, along with `eslint-config-next`. The pinned
  version did not satisfy the `@clerk/nextjs` peer range, so `npm ci` failed outright.
- Tool imports in `agent/src/agent.py` and `agent/src/tools/automation.py` moved above
  module-level code.
- `README.md` rewritten. The previous tool table listed 37 tools, most of whose names did
  not exist in the codebase; the agent declares 50, and the list now matches them
  exactly. The quickstart instructed readers to `cd agents`, a directory that does not
  exist, and to copy an `.env.example` that was not present.
- `CONTRIBUTING.md` rewritten with the real development and tool-authoring workflow.

### Fixed

- `.gitignore` excluded `.env.example` through its `.env.*` rule.
- `fix_heading_structure` ignored the result of its commit call and would open a pull
  request even when the commit had failed. It now returns the error, matching
  `fix_meta_tags`.
- `fix_meta_tags` checked a `commit_result` variable that was never assigned.
- Replaced bare `except:` clauses in `github_tool.py` and `web_crawler.py` with targeted
  handlers that log what was skipped.
- Replaced deprecated `datetime.utcnow()` calls with timezone-aware equivalents.
- Escaped unquoted entities in dashboard JSX that failed `react/no-unescaped-entities`.
- Cleared the remaining lint backlog: unused imports, unsorted imports, dead
  assignments, ambiguous variable names, and multiple statements per line.

### Known issues

- `npm audit` reports high severity advisories in `next` and `eslint-config-next` whose
  only fix is Next.js 16, a major upgrade that has not been evaluated against this
  dashboard.

[Unreleased]: https://github.com/Vmnebula/NebulaSeo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Vmnebula/NebulaSeo/releases/tag/v0.1.0
