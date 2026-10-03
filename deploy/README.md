# Deploying SFX UI

Production is a static site on **GitHub Pages**: https://kpsolo.github.io/sfx-ui/

| Branch | Role | Automation |
|---|---|---|
| `main` | development | `.github/workflows/ci.yml`: typecheck + production build on every push and PR |
| `release` | production | `.github/workflows/deploy.yml`: build and publish to Pages on every push |

## Files in this folder

| File | Committed | Purpose |
|---|---|---|
| `.env.pages` | yes | Production settings for `--mode pages`: `PAGES_REPO` (base path) and an optional `ORIGIN_TRIAL_TOKEN`. Public values only. |
| `.env.pages.local` | no (`*.local` is gitignored) | Personal overrides for local production builds. |

`vite.config.ts` reads `deploy/.env`, `deploy/.env.<mode>` and `deploy/.env.<mode>.local`. Non-empty environment variables override them (CI passes unset repository variables as empty strings, which are ignored).

## One-time setup

1. **Pages source:** repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. **Allow the release branch to deploy:** Settings → Environments → `github-pages` → Deployment branches and tags → add `release`. The environment created for Pages only allows the default branch, so without this rule the deploy job is rejected.
3. **Create the branch:** `git push origin main:release`.
4. *(Optional)* **Origin trial**, so visitors don't need `chrome://flags`: register `https://kpsolo.github.io` for the HTML-in-Canvas trial at https://developer.chrome.com/origintrials, then add the token as the repository **variable** `ORIGIN_TRIAL_TOKEN` (Settings → Secrets and variables → Actions → Variables). Tokens are public by design, so a variable rather than a secret. It only helps on Chrome versions the trial covers.

## Releasing

```bash
git checkout main && git pull           # CI must be green on main
git push origin main:release            # fast-forward release to main → deploys
```

The Actions tab shows the "Deploy to GitHub Pages" run. Its summary links to the live URL. A deployment can also be started by hand (Actions → Deploy to GitHub Pages → Run workflow, on `release`).

## Checking a production build locally

```bash
npm run build:pages     # same build as CI: base /sfx-ui/, origin-trial meta if configured
npm run preview:pages   # http://localhost:4173/sfx-ui/
```

Use Chrome with `chrome://flags/#canvas-draw-element` enabled. Other browsers show the gate screen.

## Rolling back

Move `release` back to a known-good commit and push. The workflow redeploys it:

```bash
git push --force-with-lease origin <good-commit>:release
```

Or re-run an earlier successful "Deploy to GitHub Pages" run from the Actions tab.

## Changing where the site lives

- **Another repository name:** update `PAGES_REPO` in `.env.pages`.
- **User/organisation site or custom domain at the root:** set `PAGES_REPO=` (empty), so the base path is `/`. For a custom domain, also add `public/CNAME` with the domain.
