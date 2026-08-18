# NebulaSEO Dashboard

The web interface for the [NebulaSEO](../README.md) agent. Built with Next.js 14 (App
Router), Tailwind CSS, and shadcn/ui. Authentication is handled by Clerk.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Overview of search performance and recent agent activity. |
| `/chat` | Natural-language chat with the agent. |
| `/audits` | Technical audit results, with a control to open a fix pull request. |
| `/pagespeed` | PageSpeed Insights scores and CrUX field metrics. |
| `/keywords` | Keyword performance and ranking movement. |
| `/competitors` | Competitor and SERP comparison. |
| `/analytics` | Google Analytics 4 traffic reporting. |
| `/schema` | JSON-LD builder and validation. |
| `/content` | Meta tag and content generation. |
| `/indexing` | Indexing API requests and status. |
| `/github` | Repository browsing and open pull requests. |
| `/actions` | Trigger and monitor automation runs. |
| `/logs` | Agent request log. |
| `/settings` | Configured data sources and connection status. |

## Development

```bash
npm ci
npm run dev
```

The dashboard runs at <http://localhost:3000> and expects the agent API to be reachable
at `NEXT_PUBLIC_AGENT_URL`, which defaults to `http://localhost:8080`.

Configuration is read from the `.env` file in the repository root, not from this
directory. See [`.env.example`](../.env.example). The variables this service uses are:

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key. Required at build time as well as at runtime. |
| `CLERK_SECRET_KEY` | yes | Clerk secret key, used by the auth middleware. |
| `NEXT_PUBLIC_AGENT_URL` | no | Agent URL as reached from the browser. |
| `AGENT_INTERNAL_URL` | no | Agent URL as reached from within the container. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | no | Sign-in path. Defaults to `/sign-in`. |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | no | Redirect target after sign-in. |

## Checks

```bash
npm run lint
npm run build
```

Every route except `/sign-in` and `/api/health` requires an authenticated session, which
is enforced in `middleware.ts`.

## License

GNU General Public License v3.0. See the [repository LICENSE](../LICENSE).
