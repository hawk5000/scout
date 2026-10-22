# SCOUT release path

The Vercel project `scout` is connected to `hawk5000/scout`; `main` is the production branch and the stable customer URL is <https://scout-olive-ten.vercel.app>. Git-connected feature branches produce Preview deployments. A Preview URL is for acceptance only and does not update the stable URL.

For each approved release:

1. Keep unrelated working-tree edits out of the release. Run the project tests, type check and production build on the exact release tree.
2. Merge the finished change to `main` and push that commit to `origin/main`.
3. Wait for Vercel to label the exact commit **Production / Ready**. If a Preview was tested, do not mistake that deployment for production and do not promote a different branch's build.
4. Verify the stable URL and the user-facing routes affected by the release. Record the source commit, deployment URL, acceptance checks and any limits in `docs/PROJECT_STATUS.md`.
5. Do not deploy from a feature branch or dirty local checkout with `vercel --prod`; this loses Git source provenance and can make a Preview appear to be the latest deployment without changing the production alias.

Production gates remain closed unless separately authorized: live research, paid API calls, scheduled research and notifications stay disabled. Migrations or Worker changes must be scoped to their approved environment and must not be applied to production merely because application code is merged.
