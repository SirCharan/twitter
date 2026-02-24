# Project Instructions

## Landing Page Deployment

The `stocky-landing/` directory in this monorepo maps to a **separate GitHub repo**: https://github.com/SirCharan/stocky-landing

Whenever you make changes to any files under `stocky-landing/`, you MUST:

1. Clone `https://github.com/SirCharan/stocky-landing.git` to a temp directory
2. Copy the changed files from `stocky-landing/` into the cloned repo
3. Commit and push to `main` on `SirCharan/stocky-landing`
4. Trigger a Vercel production redeploy:
   ```bash
   gh api -X POST repos/SirCharan/stocky-landing/dispatches -f event_type=redeploy
   ```
   Or if that doesn't work, use:
   ```bash
   cd <cloned-repo> && npx vercel --prod
   ```

**Never skip the push + redeploy step.** The user expects to see changes live on Vercel after every landing page update.
