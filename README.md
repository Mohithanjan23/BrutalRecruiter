# BrutalRecruiter

An AI-powered Chrome extension that reviews your LinkedIn profile and tells you exactly what to fix — section by section.

BrutalRecruiter runs all three leading AI models simultaneously (Google Gemini, OpenAI GPT-4o, and Anthropic Claude 3.5 Sonnet), merges their analysis into one comprehensive report, and delivers clear, actionable feedback directly inside LinkedIn.

---

## Features

### One-Click Profile Review
Click **Scan Me** on any LinkedIn profile. The extension scrapes your profile data, fires all three AI providers in parallel, and delivers a merged, consensus-scored report in around 20–30 seconds.

### Section-by-Section Scoring
Every major profile section is scored individually (0–10) with a status label and specific fix instructions:

| Section | What's evaluated |
|---|---|
| Headline | Keyword richness, value proposition clarity |
| About / Summary | Story quality, call-to-action, "mini sales pitch" |
| Experience | Achievement vs. duty ratio, quantified impact |
| Skills | Alignment with headline, industry relevance |
| Recommendations | Count and presence |
| Featured | Content quality |
| Profile URL | Vanity URL vs. auto-generated slug |

Each card shows the score, a status (Good / Needs Work / Critical), and a specific Why + How instruction for that section.

### Three Headline Scores
- **Profile Score** (0–100) — overall profile quality
- **Algorithm Score** — LinkedIn SEO and recruiter searchability
- **Completeness %** — how complete your profile is

### Recruiter's First Look
A simulation of what a recruiter thinks in the first 7 seconds of viewing your profile.

### Industry Benchmark
Compares your profile against top performers in your detected industry and highlights specific gaps.

### Job Fit Check (1–5 Scale)
Paste any job description. Get a 1–5 job suitability score with:
- Keyword match percentage bar
- Keywords you already have
- Critical keywords you are missing
- Numbered steps to improve your fit score

### Concrete Improvements
- Taplio-formula headline rewrite (pipe-separated, up to 220 characters)
- Bullet point rewrites with before/after and quantified impact
- Networking DM scripts ready to copy and send
- Viral post hooks for LinkedIn content

### Progress History
Every scan is saved locally. Track your score improvements over time.

---

## Triple-AI Consensus

All three providers run in parallel using `Promise.allSettled()`:

```
LinkedIn Profile
      |
      |-- Gemini 2.5 Flash
      |-- GPT-4o
      |-- Claude 3.5 Sonnet
            |
            v
        mergeResults()
        |-- Scores averaged across providers
        |-- Red flags unified and deduplicated
        |-- Headlines collected (up to 9 variants, 3 per model)
        |-- Action plan: 3 best steps per model
```

If one provider hits a rate limit or fails, the other two continue and results are merged from whichever providers succeed.

---

## Installation

### 1. Download or Clone
```bash
git clone https://github.com/your-username/brutalrecruiter.git
```

### 2. Load in Chrome
1. Open `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `BrutalRecruiter` folder

### 3. Add API Keys
Click the extension icon, then open **Settings**. Add keys for any or all providers:

| Provider | Where to get a key |
|---|---|
| Gemini | [aistudio.google.com](https://aistudio.google.com/) |
| OpenAI GPT-4o | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic Claude | [console.anthropic.com](https://console.anthropic.com/settings/keys) |

Keys are stored locally in `chrome.storage.local` — they never leave your browser except in direct API calls to the respective provider.

### 4. Scan a Profile
Navigate to any `linkedin.com/in/...` page and click **Scan Me**.

---

## Project Structure

```
BrutalRecruiter/
|-- manifest.json     Extension config, permissions, content scripts
|-- background.js     Service worker: API calls, triple-AI merge logic
|-- content.js        LinkedIn scraper + sidebar UI renderer
|-- styles.css        Sidebar component styles
|-- popup.html        Extension popup: mode select + API key settings
|-- popup.js          Popup logic: key storage, provider toggle, scan trigger
|-- images/           Extension icons (16px, 48px, 128px)
```

### Key Functions in `background.js`

| Function | Purpose |
|---|---|
| `handleAnalysis()` | Routes to triple or single-provider mode |
| `mergeResults()` | Averages scores, deduplicates flags, collects best headlines |
| `callGeminiAPI()` | Gemini 2.5-flash with model fallback chain |
| `callOpenAIAPI()` | GPT-4o with JSON mode enabled |
| `callClaudeAPI()` | Claude 3.5 Sonnet with markdown fence stripping |
| `buildProfilePrompt()` | Structured prompt with scoring rubric |
| `buildKeywordPrompt()` | Job fit prompt returning 1–5 score and recommendations |

---

## Scoring Rubric

### Profile Score (0–100)

| Factor | Points |
|---|---|
| About section, well-written | +10 |
| Recent activity | +10 |
| Experience with detail | +20 |
| Education | +10 |
| Certifications | +10 |
| Skills populated | +10 |
| Content quality (metrics, impact) | up to +25 |
| No profile picture | -10 |
| Generic or missing headline | -10 |
| No quantified achievements | -20 |
| Buzzwords (passionate, ninja, guru...) | -5 each |

### Job Fit Score (1–5)

| Score | Meaning | Keyword match |
|---|---|---|
| 5 | Excellent | 80%+ |
| 4 | Good | 60–79% |
| 3 | Average | 40–59% |
| 2 | Weak | 20–39% |
| 1 | Poor | Under 20% |

---

## Configuration

All settings are in the extension popup. No environment variables or config files required.

| Setting | Default | Options |
|---|---|---|
| AI Mode | All 3 (Triple) | Triple / Gemini / GPT-4o / Claude |
| API Keys | Pre-seeded | Replaceable via Settings panel |

The default mode uses all available keys simultaneously for the highest quality output.

---

## Privacy and Security

- No data stored on any server. All analysis goes directly from your browser to the AI provider APIs.
- API keys stored locally in `chrome.storage.local`, isolated per browser profile.
- No tracking, no analytics, no data collection.
- Profile data is only transmitted during an active scan and only to the enabled AI provider(s).

---

## Rate Limiting

All API calls use exponential backoff with 3 attempts:

| Attempt | Wait before retry |
|---|---|
| 1st retry | 5 seconds |
| 2nd retry | 15 seconds |
| 3rd (final) | 30 seconds, then error shown |

In Triple mode, a rate-limited provider is skipped and results are merged from the remaining providers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension Platform | Chrome Extension Manifest V3 |
| Background | Service Worker (vanilla JavaScript) |
| UI | Vanilla JS + CSS injected into LinkedIn DOM |
| AI Analysis | Google Gemini, OpenAI GPT-4o, Anthropic Claude 3.5 |
| Storage | `chrome.storage.local`, `localStorage` for score history |

---

## License

MIT — free to use, modify, and distribute.
