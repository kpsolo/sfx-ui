# Deploying SFX UI

Production is a static site on **GitHub Pages**: https://kpsolo.github.io/sfx-ui/ (live since 2026-10-03).

The repository has exactly two branches:

| Branch | Role | Automation |
|---|---|---|
| `main` | development (default branch) | `.github/workflows/ci.yml`: typecheck + production build on every push and PR |
| `release` | production | `.github/workflows/deploy.yml`: build and publish to Pages on every push |

## Files in this folder

| File | Committed | Purpose |
|---|---|---|
| `.env.pages` | yes | Production settings for `--mode pages`: `PAGES_REPO` (base path) and `ORIGIN_TRIAL_TOKEN`. Public values only. |
| `.env.pages.local` | no (`*.local` is gitignored) | Personal overrides for local production builds. |

`vite.config.ts` reads `deploy/.env`, `deploy/.env.<mode>` and `deploy/.env.<mode>.local`. Non-empty environment variables override them (CI passes unset repository variables as empty strings, which are ignored).

## Repository setup (done; kept for reference)

1. **Pages source:** Settings → Pages → Build and deployment → Source: **GitHub Actions**. *Not* "Deploy from a branch" (see Troubleshooting).
2. **Allow the release branch to deploy:** Settings → Environments → `github-pages` → Deployment branches and tags → `release`. The Pages environment only allows the default branch by default.
3. **Release branch:** created with `git push origin main:release`.

## Origin trial (HTML-in-Canvas without chrome://flags)

The HTML-in-Canvas origin-trial token in `.env.pages` lets visitors on Chrome versions covered by the trial use the site without enabling the flag. The build injects it as `<meta http-equiv="origin-trial">`.

| | |
|---|---|
| Origin | `https://kpsolo.github.io:443` |
| Feature | `HTMLInCanvas` |
| **Expires** | **2026-10-20 00:00 UTC** |

**Renewing:** get a new token at https://developer.chrome.com/origintrials (HTML-in-Canvas trial, origin `https://kpsolo.github.io`). Replace `ORIGIN_TRIAL_TOKEN` in `.env.pages`, commit it to `main`, and release. Alternatively, set the repository variable `ORIGIN_TRIAL_TOKEN` (Settings → Secrets and variables → Actions → Variables). A non-empty variable overrides the file without a commit, but still needs a deploy. After expiry the site still works, but only with the flag; other visitors get the gate screen.

To inspect a token, decode the base64: the JSON payload after the 69-byte signature header holds origin, feature and expiry (Unix seconds).

## Releasing

```bash
git checkout main && git pull           # CI must be green on main
git push origin main:release            # fast-forward release to main → deploys
```

Watch the **"Deploy to GitHub Pages"** run in the Actions tab. Its summary links to the live URL, and the site updates about 40 s after the push. A deployment can also be started by hand: Actions → Deploy to GitHub Pages → Run workflow, branch `release`.

Quick check that a release is live (example: the origin-trial meta):

```bash
curl -s "https://kpsolo.github.io/sfx-ui/?nocache=$RANDOM" | grep -o '<meta http-equiv="origin-trial"[^>]\{0,60\}'
```

## Checking a production build locally

```bash
npm run build:pages     # same build as CI: base /sfx-ui/, origin-trial meta
npm run preview:pages   # http://localhost:4173/sfx-ui/
```

Use Chrome with `chrome://flags/#canvas-draw-element` enabled (the origin-trial token is bound to kpsolo.github.io and does nothing on localhost). Other browsers show the gate screen.

## Rolling back

Move `release` back to a known-good commit and push. The workflow redeploys it:

```bash
git push --force-with-lease origin <good-commit>:release
```

Or re-run an earlier successful "Deploy to GitHub Pages" run from the Actions tab.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Live page is blank; the HTML loads `/src/main.tsx` (404) and `/favicon.svg` (404) | The raw repository files were published instead of the build. A run named **"pages build and deployment"** (`pages-build-deployment`) appears in Actions: GitHub's branch publisher, which only exists while the Pages source is **"Deploy from a branch"**. It ran after our deploy and overwrote it (happened on 2026-10-03). | Set the Pages source to **GitHub Actions**, then run **Deploy to GitHub Pages** on `release`. Never re-run `pages-build-deployment`: every run republishes the unbuilt source. |
| Deploy job fails with "Branch release is not allowed to deploy to github-pages" | The environment branch rule is missing | Add `release` under Settings → Environments → `github-pages` → Deployment branches. |
| Assets 404 under `/assets/...` instead of `/sfx-ui/assets/...` | Built without `--mode pages`, or `PAGES_REPO` empty | Build with `npm run build:pages`; check `.env.pages`. |
| Gate screen for visitors who have no flag | Token expired, missing, or the Chrome version isn't covered by the trial | Check the token (above) and renew it. |

## Changing where the site lives

- **Another repository name:** update `PAGES_REPO` in `.env.pages`, and register the new origin for the origin trial if it changes.
- **User/organisation site or custom domain at the root:** set `PAGES_REPO=` (empty), so the base path is `/`. For a custom domain, also add `public/CNAME` with the domain and get an origin-trial token for that origin.
