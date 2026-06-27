# Docs tooling

Local setup (one-time):

```bash
npm install                                    # root devDependencies: typedoc, ts-morph, tsx
python3 -m venv .venv && source .venv/bin/activate
pip install -r docs/requirements.txt
```

Regenerate the config reference table in `docs/configuration.md` from `server/src/config/AppConfig.ts`:

```bash
npm run docs:generate-config
```

Check it's not stale (used in CI):

```bash
npm run docs:check-config
```

Adding a new field to one of the `*Config` interfaces in `AppConfig.ts`? Add a matching `section.field` entry to `config-descriptions.yaml` first — the generator errors out if a field has no manifest entry.

The TypeDoc API reference (`server.md`/`frontend.md` link into `docs/reference/`) regenerates automatically on every `mkdocs build`/`mkdocs serve` via the `docs/tooling/generate_typedoc_reference.py` build hook — there's no separate manual step. If you want to generate it standalone (e.g. to inspect the output without a full mkdocs build):

```bash
npm run docs:typedoc
```

We use plain TypeDoc HTML output rather than `mkdocstrings-typescript`/`griffe-typedoc` — that toolchain is still in prototyping phase and its JSON decoder crashes on patterns this codebase actually uses (non-standard JSDoc tags from openapi-generator output, TypeScript type predicates). Revisit inline `:::` rendering once upstream matures; for now `server/typedoc.json` and `frontend/typedoc.json` each `exclude` their generated-DTO directories, both to dodge that issue and because generated client code doesn't need a hand-documented reference page.

Build/preview the full site:

```bash
mkdocs serve   # live-reload preview at http://localhost:8000
mkdocs build --strict   # what CI runs; fails on broken nav/links or a failed TypeDoc/typedoc run
```
