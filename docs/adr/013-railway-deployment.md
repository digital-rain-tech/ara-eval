# ADR-013: Railway Deployment

**Status:** Accepted
**Date:** 2026-03-17

## Context

The web interface needs to be deployable for professor demos and student access without requiring each user to run `npm run dev` locally. The primary constraint: the app uses `better-sqlite3` (a native Node module that writes to disk), which rules out serverless platforms like Vercel.

## Decision

Deploy to **Railway** — a container-based platform with persistent disk storage.

### Why Railway Over Alternatives

| Platform | SQLite works? | Code changes needed | Notes |
|----------|--------------|-------------------|-------|
| **Railway** | Yes (persistent disk) | None | Free tier, auto-deploy from GitHub |
| Fly.io | Yes (persistent volume) | None | More setup (volume config) |
| Render | Yes (persistent disk) | None | Free tier spins down (cold starts) |
| Vercel | No (ephemeral functions) | Swap to Turso/Postgres | Major refactor |
| VPS | Yes | None | Manual setup, no CI/CD |

Railway was chosen for zero code changes, simple CLI workflow, and free tier sufficient for class use.

### Infrastructure

- **Project:** `ara-eval`
- **Service:** `ara-eval-web`
- **Build:** Dockerfile at `web/Dockerfile` with repo root as build context
- **Environment variables:** `OPENROUTER_API_KEY` (set via `railway variables set`)
- **Persistence:** SQLite database at `/app/results/ara-eval.db`

### Dockerfile Architecture

Multi-stage build from `web/Dockerfile`:

1. **Base stage** (node:20-alpine): installs native deps (python3, make, g++ for better-sqlite3), copies shared data files (`shared/`, `prompts/`, `scenarios/`), installs npm deps, builds Next.js
2. **Runner stage** (node:20-alpine): copies built app + shared data, creates `/app/results/` for SQLite persistence

The build context is the repo root (`.`), configured in `railway.json`, so the Dockerfile can copy `shared/`, `prompts/`, and `scenarios/` from the parent directory.

### Deployment Workflow

```bash
# First time setup
railway login
railway init              # create project
railway add --service ara-eval-web  # create service
railway service ara-eval-web        # link to service
railway variables set OPENROUTER_API_KEY=sk-or-v1-...

# Deploy
railway up                # push and build
railway domain            # generate public URL

# Subsequent deploys
railway up                # from repo root

# Or connect GitHub for auto-deploy:
# Railway dashboard → Service → Settings → Connect Repo
# Requires granting Railway GitHub App access to the org
```

### GitHub Integration (Optional)

For auto-deploy on push, Railway needs GitHub App access to the `digital-rain-tech` organization:

1. Railway dashboard → Account → Connected Accounts → GitHub → Configure
2. Grant access to the `digital-rain-tech` organization
3. In the service settings, connect to `digital-rain-tech/ara-eval`
4. Set root directory to `/` (Dockerfile handles the build context)

Without GitHub integration, `railway up` deploys manually from the local machine.

### Volume Persistence

Railway containers have ephemeral filesystems by default. For SQLite to persist across deploys:

1. Railway dashboard → Service → Settings → Volumes
2. Add a volume mounted at `/app/results`
3. This ensures `ara-eval.db` survives container restarts and redeploys

Without a volume, the database resets on each deploy (acceptable for demos, not for persistent data).

## Consequences

- Professor can share a URL for demos — no local setup required
- Students can access the web interface from any browser
- Free tier covers small-class usage (~$5/month of compute)
- `railway up` deploys in ~2-3 minutes
- Without GitHub integration, deploys require manual `railway up` from a machine with the CLI
- SQLite data persists only with a Railway volume configured
