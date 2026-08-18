# Contributing to NebulaSEO

Thanks for your interest in improving NebulaSEO. This document covers how to set up a
development environment, how to add a tool, and how changes get reviewed.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

You need Python 3.11 or newer, Node.js 20 or newer, and a Gemini API key.

```bash
git clone https://github.com/YOUR_USERNAME/NebulaSeo.git
cd NebulaSeo
cp .env.example .env   # then set GEMINI_API_KEY
```

Agent:

```bash
cd agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pytest ruff
python main.py
```

Dashboard:

```bash
cd dashboard
npm ci
npm run dev
```

You do not need every data source configured to work on the project. Tools whose
credentials are missing report themselves as unconfigured rather than failing the run.

## Before opening a pull request

```bash
# from the repository root
ruff check .

# agent
cd agent && python -m pytest

# dashboard
cd dashboard && npm run lint && npm run build
```

CI runs all of the above plus a Docker build of both services. A pull request that fails
any of them will not be merged.

## Adding a tool

Tools are the main extension point. Adding one takes three steps.

1. **Implement the function** in the appropriate module under `agent/src/tools/`, or a new
   module if it does not fit an existing group. Name it with an `_fn` suffix, accept plain
   keyword arguments, and return a dictionary. Return
   `{"status": "error", "message": ...}` rather than raising, so a failed tool call does
   not end the agent's turn.

2. **Declare it** in `agent/src/agent.py` as a `types.FunctionDeclaration`. The
   description is the only thing the model sees when deciding whether to call your tool,
   so describe when it should be used, not just what it does.

3. **Register it** in the tool function mapping in the same file so the declared name
   routes to your implementation.

Add a test under `agent/tests/`. Mock the external service; tests must not make live
network calls or require credentials.

If your tool writes to a repository, it must open a pull request. Never commit to a
default branch and never merge.

## Guidelines

- Keep each pull request focused on one change.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit subjects:
  `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Update `README.md` and `.env.example` when you add a tool or a configuration variable.
  The README's tool list is expected to match the declarations in `agent/src/agent.py`
  exactly.
- Never commit `.env`, service account JSON, or any credential. Do not paste real
  Search Console or Analytics data into issues.

## Reporting bugs and vulnerabilities

Open a [bug report](https://github.com/Vmnebula/NebulaSeo/issues/new/choose) for
functional problems. For anything security related, use private reporting as described in
[SECURITY.md](SECURITY.md) instead of a public issue.

## License

NebulaSEO is licensed under the GNU General Public License v3.0. By contributing, you
agree that your contributions are licensed under the same terms.
