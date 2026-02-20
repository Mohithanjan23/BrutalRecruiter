<div align="center">

# BrutalRecruiter

**AI-powered LinkedIn profile reviewer. Three models. One verdict. Zero fluff.**

[![Version](https://img.shields.io/badge/version-1.3-black?style=for-the-badge)](https://github.com/Mohithanjan23/BrutalRecruiter)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge)](LICENSE)

---

### Powered by

[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-Google-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![GPT-4o](https://img.shields.io/badge/GPT--4o-OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://platform.openai.com/)
[![Claude](https://img.shields.io/badge/Claude_3.5_Sonnet-Anthropic-CC785C?style=for-the-badge&logo=anthropic&logoColor=white)](https://console.anthropic.com/)

</div>

---

## What It Does

BrutalRecruiter installs as a Chrome extension, injects a sidebar into LinkedIn, and calls all three AI providers simultaneously when you click **Scan Me**. Results from Gemini, GPT-4o, and Claude 3.5 are merged into a single consensus report: averaged scores, deduplicated red flags, and the best suggestions from each model combined.

---

## Architecture

```
LinkedIn Profile (scraped in-browser)
            |
            v
     background.js (Service Worker)
            |
    Promise.allSettled()
    /        |         \
Gemini    GPT-4o    Claude 3.5
2.5-flash  (json)   Sonnet
    \        |         /
            v
       mergeResults()
       - Scores: averaged
       - Red flags: union + deduplicated
       - Headlines: up to 9 variants (3 per model)
       - Action plan: 3 best steps per model
            |
            v
    content.js renders sidebar
```

If any provider fails or rate-limits, the others continue. A "Powered by" badge on the result shows which models contributed.

---

## Features

| Feature | Description |
|---|---|
| Single-click scan | Click Scan Me — no configuration required |
| Section scores | Every section scored 0–10 with status (Good / Needs Work / Critical) |
| Fix cards | Per-section Why + How improvement instructions |
| Three overall scores | Profile score, Algorithm score, Completeness % |
| Recruiter view | How a recruiter reads your profile in 7 seconds |
| Industry benchmark | Compared to top performers in your detected industry |
| Job Fit (1–5) | Paste a JD, get a star rating, keyword gap analysis, and fix steps |
| Taplio headline | Pipe-separated formula headline generated per profile |
| Bullet rewrites | Before / after rewrites with quantified impact |
| DM scripts | Ready-to-use networking messages |
| Post hooks | Click-to-copy viral LinkedIn content openers |
| Progress history | Score tracked across multiple scans |

---

## Installation

**Step 1 — Get the code**

```bash
git clone https://github.com/Mohithanjan23/BrutalRecruiter.git
```

**Step 2 — Load into Chrome**

1. Go to `chrome://extensions`
2. Turn on **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `BrutalRecruiter` folder

**Step 3 — Add API keys**

Click the extension icon → Settings. Add keys for any or all providers:

[![Gemini](https://img.shields.io/badge/Get_Gemini_Key-Google_AI_Studio-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com/)
[![OpenAI](https://img.shields.io/badge/Get_OpenAI_Key-platform.openai.com-412991?style=flat-square&logo=openai&logoColor=white)](https://platform.openai.com/api-keys)
[![Anthropic](https://img.shields.io/badge/Get_Claude_Key-console.anthropic.com-CC785C?style=flat-square&logo=anthropic&logoColor=white)](https://console.anthropic.com/settings/keys)

> Keys are stored in `chrome.storage.local` and never sent anywhere except the respective provider's API during a scan.

**Step 4 — Scan**

Go to any `linkedin.com/in/...` profile and click **Scan Me**.

---

## Project Structure

```
BrutalRecruiter/
|-- manifest.json       Extension manifest (MV3), permissions, host rules
|-- background.js       Service worker — API calls, triple-AI merge logic
|-- content.js          Scraper + sidebar renderer injected into LinkedIn
|-- styles.css          All sidebar component styles
|-- popup.html          Popup UI — provider toggle, API key settings
|-- popup.js            Popup logic — storage, provider switching, scan trigger
|-- images/             Extension icons (16 / 48 / 128 px)
```

### Core Functions

| Function | File | Purpose |
|---|---|---|
| `handleAnalysis()` | background.js | Routes to triple or single provider |
| `mergeResults()` | background.js | Merges multi-model output into one report |
| `callGeminiAPI()` | background.js | Gemini with model fallback chain |
| `callOpenAIAPI()` | background.js | GPT-4o with JSON mode |
| `callClaudeAPI()` | background.js | Claude with markdown fence stripping |
| `buildProfilePrompt()` | background.js | Full scoring rubric prompt |
| `buildKeywordPrompt()` | background.js | Job fit prompt (1–5 score output) |
| `scrapeProfile()` | content.js | Extracts all visible profile data from the DOM |
| `mergeResults()` | background.js | Consensus engine across providers |

---

## Scoring Reference

### Profile Score — 0 to 100

| Factor | Points |
|---|---|
| About section present and well-written | +10 |
| Recent activity detected | +10 |
| Experience with detailed entries | +20 |
| Education present | +10 |
| Certifications present | +10 |
| Skills section populated | +10 |
| Content quality — metrics, impact, clarity | up to +25 |
| No profile picture | -10 |
| Generic or missing headline | -10 |
| No numbers or percentages in experience | -20 |
| Buzzwords (passionate, ninja, guru...) | -5 each |

### Job Fit Score — 1 to 5

| Score | Label | Keyword Match |
|---|---|---|
| 5 | Excellent | 80% and above |
| 4 | Good | 60–79% |
| 3 | Average | 40–59% |
| 2 | Weak | 20–39% |
| 1 | Poor | Under 20% |

---

## Rate Limit Handling

| Attempt | Delay before retry |
|---|---|
| 1 | 5 seconds |
| 2 | 15 seconds |
| 3 (final) | 30 seconds, then error |

In Triple mode, a failed provider is skipped and the remaining models' results are merged.

---

## Tech Stack

[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Service Worker](https://img.shields.io/badge/Background-Service_Worker-black?style=flat-square&logo=javascript&logoColor=white)](https://developer.chrome.com/docs/workbox/service-worker-overview/)
[![Vanilla JS](https://img.shields.io/badge/UI-Vanilla_JS_%2B_CSS-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Gemini API](https://img.shields.io/badge/AI-Gemini_API-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![OpenAI API](https://img.shields.io/badge/AI-OpenAI_API-412991?style=flat-square&logo=openai&logoColor=white)](https://platform.openai.com/)
[![Anthropic API](https://img.shields.io/badge/AI-Anthropic_API-CC785C?style=flat-square&logo=anthropic&logoColor=white)](https://anthropic.com/)
[![Local Storage](https://img.shields.io/badge/Storage-chrome.storage.local-34a853?style=flat-square&logo=google&logoColor=white)](https://developer.chrome.com/docs/extensions/reference/storage/)

No build tools. No bundlers. No dependencies. Pure browser APIs.

---

## Privacy

- Profile data is read locally in your browser and sent directly to the AI provider during a scan only.
- API keys are stored in `chrome.storage.local` — isolated per Chrome profile, never synced or sent to any third-party server.
- No telemetry. No analytics. No backend.

---

## License

MIT
