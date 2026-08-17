# models

Read-only JSON database of LLM providers, built daily from [models.dev/api.json](https://models.dev/api.json) and served via GitHub Pages.

No more fetching a 6 MB file to find a single model. Each provider gets its own JSON file with only its own models.

## Usage

One request per provider, served from the Pages CDN:

```
https://models.pileofthings.top/openrouter.json
https://models.pileofthings.top/anthropic.json
https://models.pileofthings.top/openrouter/
```

Each file is the raw provider object from models.dev (`id`, `env`, `npm`, `name`, `doc`, `api`, `models`).

Every provider is available in two forms with identical content: the flat `/<provider>.json` and the directory URL `/<provider>/` (which 301-redirects from `/<provider>`), so clients can pick either style.

## Index

`index.json` lists every available provider (id, name, npm package, API base URL, model count) and the last build time, so clients can discover the catalog without downloading anything big:

```
https://models.pileofthings.top/index.json
```

## Included providers

Only providers whose provider-level `npm` field is one of:

| npm package | provider example |
| --- | --- |
| `@ai-sdk/openai-compatible` | OpenCode Zen, Zhipu AI, DeepSeek, Hugging Face, ... |
| `@ai-sdk/anthropic` | Anthropic, MiniMax, Kimi For Coding, ... |
| `@ai-sdk/openai` | OpenAI, Meta, Perplexity Agent, ... |
| `@ai-sdk/google` | Google |
| `@openrouter/ai-sdk-provider` | OpenRouter |
| `@ai-sdk/xai` | xAI |
| `@ai-sdk/mistral` | Mistral |

All other providers are excluded.

## How it works

- A [GitHub Actions workflow](.github/workflows/build.yml) runs once a day (UTC 02:30) and on manual `workflow_dispatch`.
- It downloads the latest `api.json` from models.dev, filters to the providers above, and writes one compact JSON file per provider into `docs/`.
- `docs/` is the GitHub Pages publishing source, so the site root maps directly to the provider files.
- Files are only rewritten (and committed) when their content actually changed.
- `api.json` itself is gitignored so the 6 MB source never bloats the repo.
- The build also keeps `docs/CNAME` in sync so the custom domain survives rebuilds.

## Manual run

```
gh workflow run build-db
```

## Setup

In GitHub repo settings: **Settings → Pages → Deploy from a branch → `main` / `docs` → Save**.

Order matters: trigger the workflow first (`Actions → build-db → Run workflow`) so `docs/` exists on `main` before you flip the publishing source to `/docs` — otherwise Pages errors on the missing folder.