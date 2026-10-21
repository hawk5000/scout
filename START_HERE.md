# SCOUT by SalesHospitality
Your hotel’s market research assistant.

## Start the local build
1. Extract this ZIP. Place the contents of its SCOUT folder in your chosen project folder, for example `C:\Users\Admin\Documents\Playground\SCOUT`.
2. Open that folder in Codex. Confirm `AGENTS.md`, `docs`, `prompts`, and `.agents` are present. Do not copy just the visible Markdown files.
3. Open `prompts/START_BUILD.txt`, copy its complete contents, and submit it in Codex.
4. Codex should inspect the folder, read the supplied specifications, and implement Build Pass 1. Use `prompts/CONTINUE_BUILD.txt` for subsequent passes.

This package contains the agreed specification, build instructions, reusable skill, configuration examples, research prompts, and acceptance criteria. It is not a running app and has no package.json, installed dependencies, live API connections, customer records, or deployment configuration yet. Codex creates those during implementation using current supported tooling.

No API credentials are included. Do not paste secrets into the documents or commit them to source control. Actual hotels, source access, repository, and deployment destinations remain to be configured when needed.

## File guide
- AGENTS.md: persistent rules for Codex.
- docs/PRODUCT.md: scope, brand, commercial assumptions.
- docs/BUILD_PLAN.md: four implementation passes.
- docs/UI_SPEC.md: customer, admin and public-site layout.
- docs/RESEARCH_SPEC.md: evidence, market memory, category coverage.
- docs/DATA_CONTRACT.md: records and relationships to implement.
- docs/ARCHITECTURE.md: stack direction and access boundaries.
- docs/COST_CONTROLS.md: usage accounting and hard limits.
- docs/ACCEPTANCE.md: functional, quality and isolation checks.
- docs/INTEGRATIONS.md: external setup dependencies and decisions.
- docs/PROJECT_STATUS.md: honest starting status and continuation notes.
- prompts: starting/continuing Codex instructions and three research playbooks.
- config: non-secret examples; inactive until confirmed.
- .agents/skills/hotel-market-intelligence-builder: portable build skill and detailed references.

The project documents hold approved SCOUT branding. The earlier First Call skill is a different product and is not bundled.
