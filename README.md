<div align="center">

<img src="https://raw.githubusercontent.com/Mohithanjan23/BrutalRecruiter/main/images/icon128.png" alt="Profile Analyzer Logo" width="96" />

# Profile Analyzer (formerly BrutalRecruiter)

**AI-powered LinkedIn profile strategist. Three models. One executive verdict.**

[![Version](https://img.shields.io/badge/version-2.0-blue?style=for-the-badge)](https://github.com/Mohithanjan23/BrutalRecruiter)
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

**Profile Analyzer** installs as a Chrome extension, injects a professional analysis sidebar into LinkedIn, and calls all three major AI providers simultaneously when you click **Analyze Profile**.

Results from **Gemini**, **GPT-4o**, and **Claude 3.5** are merged into a single consensus report:
- **Impact Score**: A weighted average of your profile's strength.
- **Executive Summary**: A strategic overview of your positioning.
- **Actionable Steps**: Specific "Why" and "How" improvements for every section.

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
       - Scores: averaged (Impact, Algorithmic, Completeness)
       - Strategic advice: best-of-breed selection
       - Headlines: highly optimized options
       - Action plan: prioritized roadmap
            |
            v
    content.js renders sidebar
```

If any provider fails or rate-limits, the others continue. A "Powered by" badge on the result shows which models contributed.

---

## Features

| Feature | Description |
|---|---|
| **Deep Analysis** | Single-click full profile audit |
| **Impact Score** | 0–100 score based on objective keywords, metrics, and clarity |
| **Section Audits** | Detailed breakdown of Headline, About, Experience, Skills, etc. |
| **Fix Suggestions** | Context-aware improvements with strategic reasoning |
| **Market Comparison** | Benchmarks your profile against top performers in your industry |
| **Job Fit Check** | Paste a JD to get a 1–5 fit score and keyword gap analysis |
| **Smart Headlines** | Generates SEO-optimized and authority-building headlines |
| **Impact Rewrites** | Rewrites your experience bullets to focus on results/metrics |
| **Outreach Scripts** | Professional connection request benchmarks |

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

Click the extension icon → Settings. Add keys for at least one provider (Gemini is free-tier friendly):

[![Gemini](https://img.shields.io/badge/Get_Gemini_Key-Google_AI_Studio-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com/)
[![OpenAI](https://img.shields.io/badge/Get_OpenAI_Key-platform.openai.com-412991?style=flat-square&logo=openai&logoColor=white)](https://platform.openai.com/api-keys)
[![Anthropic](https://img.shields.io/badge/Get_Claude_Key-console.anthropic.com-CC785C?style=flat-square&logo=anthropic&logoColor=white)](https://console.anthropic.com/settings/keys)

> **Security Note:** Keys are stored in `chrome.storage.local` sandbox. They are never sent to any middleware server—only directly to the respective AI APIs from your browser.

**Option B — Use `env.js` (Developer Mode)**

If you prefer configuration over clicking, the extension will **automatically** look for keys in `env.js` if they aren't set in the popup.

1. Rename `env.example.js` to `env.js`.
2. Paste your keys inside `env.js`.
3. That's it! The extension will load them on your next analysis.
4. Note: `env.js` is gitignored by default for security.

**Step 4 — Analyze**

Navigate to any `linkedin.com/in/...` profile (yours or others) and click **Analyze Profile**.

---

## Project Structure

```
BrutalRecruiter/
|-- manifest.json       Extension manifest (MV3)
|-- background.js       Service worker — API calls, consensus logic
|-- content.js          Scraper + Sidebar UI renderer
|-- styles.css          Professional theme styles
|-- popup.html          Settings & Key Management
|-- popup.js            Popup logic
|-- images/             Icons
```

### Scoring Reference

**Impact Score (0–100)** determines the overall strength:
- **0-39:** Critical Gaps
- **40-69:** Needs Improvement
- **70-100:** Strong / Executive Level

**Job Fit Score (1–5)**:
- **5:** Excellent Match (>80% keywords)
- **1:** Poor Fit (<20% keywords)

---

## Privacy

- **Local Processing:** Profile data is scraped locally.
- **Direct API Calls:** Data is sent only to the AI providers you configure (Google, OpenAI, Anthropic).
- **No Tracking:** No analytics, no tracking pixels, no 3rd party servers.

---

## License

MIT
