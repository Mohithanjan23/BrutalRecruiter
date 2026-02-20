# 🔥 BrutalRecruiter

> **An AI-powered Chrome extension that reviews your LinkedIn profile and tells you exactly what to fix — section by section.**

BrutalRecruiter runs all three leading AI models simultaneously (Google Gemini, OpenAI GPT-4o, and Anthropic Claude 3.5 Sonnet), merges their analysis into one comprehensive report, and delivers clear, actionable feedback directly inside LinkedIn.

---

## ✨ Features

### 🔍 One-Click Profile Review
Click **"🔍 Scan Me"** on any LinkedIn profile. No configuration needed. The extension scrapes your profile data, fires all three AI providers in parallel, and delivers a merged, consensus-scored report in ~20–30 seconds.

### 📋 Section-by-Section Scoring
Every major profile section is scored individually (0–10) with a status label and specific fix instructions:

| Section | What's evaluated |
|---|---|
| **Headline** | Keyword richness, value proposition, Taplio formula |
| **About / Summary** | Story quality, call-to-action, "mini sales pitch" |
| **Experience** | Achievement vs. duty ratio, quantified impact |
| **Skills** | Alignment with headline, industry relevance |
| **Recommendations** | Count and presence |
| **Featured** | Content quality |
| **Profile URL** | Vanity URL vs. auto-generated slug |

Each card shows:
```
📝 Headline   Needs Work   6/10
██████░░░░
📌 Why: Recruiters search by keyword — your headline is invisible
⚡ How: Add "| Product Strategy | $2M ARR" before your name
```

### 📊 Three Headline Scores
- **Profile Score** (0–100) — overall quality
- **Algorithm Score** — LinkedIn SEO / recruiter searchability
- **Completeness %** — how full your profile is

### 👔 Recruiter's First Look
A 2-sentence simulation of what a recruiter thinks in the first 7 seconds of viewing your profile.

### 📊 Industry Benchmark
Compares your profile against top performers in your detected industry and highlights the specific gaps.

### 💼 Job Fit Check (1–5 Stars)
Paste any job description. Get a 1–5 star job suitability score with:
- Keyword match percentage bar
- ✅ Keywords you already have
- ❌ Critical keywords you're missing
- Numbered steps to improve your fit score

### ✍️ Concrete Improvements
- **Taplio-formula headline** rewrite (pipe-separated, ≤220 chars)
- **Bullet point rewrites** — before/after with quantified impact
- **Networking DM scripts** — ready-to-copy outreach messages
- **Viral post hooks** — click-to-copy LinkedIn content openers

### 📈 Progress History
Every scan is saved locally. Track your score improvements over time in the Score Card view.

---

## ⚡ Triple-AI Consensus

All three providers run in **parallel** using `Promise.allSettled()`:

```
LinkedIn Profile
      │
      ├── 🔵 Gemini 2.5 Flash
      ├── 🟢 GPT-4o
      └── 🟣 Claude 3.5 Sonnet
            │
            ▼
        mergeResults()
        ├── Scores → averaged
        ├── Red flags → union, deduplicated
        ├── Headlines → up to 9 variants (3 per model)
        └── Action plan → 3 best steps per model
```

If one provider hits a rate limit or fails, the other two continue — you always get a result. Results show a **"POWERED BY"** badge listing which providers contributed.

---

## 🚀 Installation

### 1. Download / Clone
```bash
git clone https://github.com/your-username/brutalrecruiter.git
```

### 2. Load in Chrome
1. Open `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `BrutalRecruiter` folder

### 3. Add API Keys
Click the extension icon → **⚙️ Settings**. Add keys for any or all providers:

| Provider | Where to get a key |
|---|---|
| 🔵 Gemini | [aistudio.google.com](https://aistudio.google.com/) |
| 🟢 OpenAI GPT-4o | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| 🟣 Anthropic Claude | [console.anthropic.com](https://console.anthropic.com/settings/keys) |

> Keys are stored locally in `chrome.storage.local` — they never leave your browser except in direct API calls to the respective provider.

### 4. Scan Your Profile
Navigate to any `linkedin.com/in/…` page and click **🔍 Scan Me**.

---

## 🏗 Project Structure

```
BrutalRecruiter/
├── manifest.json     — Extension config, permissions, content scripts
├── background.js     — Service worker: API calls, triple-AI merge logic
├── content.js        — LinkedIn scraper + sidebar UI renderer
├── styles.css        — Sidebar component styles
├── popup.html        — Extension popup: mode select + API key settings
├── popup.js          — Popup logic: key storage, provider toggle, scan trigger
└── images/           — Extension icons (16px, 48px, 128px)
```

### Key Modules in `background.js`

| Function | Purpose |
|---|---|
| `handleAnalysis()` | Routes to triple or single-provider mode |
| `mergeResults()` | Averages scores, deduplicates flags, collects best headlines |
| `callGeminiAPI()` | Gemini 2.5-flash with model fallback chain |
| `callOpenAIAPI()` | GPT-4o with JSON mode enabled |
| `callClaudeAPI()` | Claude 3.5 Sonnet with markdown fence stripping |
| `buildProfilePrompt()` | Structured prompt with scoring rubric |
| `buildKeywordPrompt()` | Job fit prompt returning 1-5 score + recommendations |

---

## ⚙️ Configuration

All settings are in the extension popup. No environment variables or config files required.

| Setting | Default | Options |
|---|---|---|
| AI Mode | ⚡ All 3 (Triple) | Triple / Gemini / GPT-4o / Claude |
| API Keys | Pre-seeded | Replaceable via Settings panel |

The default mode uses all available keys simultaneously for the highest quality output.

---

## 🔐 Privacy & Security

- **No data stored on any server.** All analysis is sent directly from your browser to the AI provider APIs.
- **API keys stored locally** in `chrome.storage.local` — isolated per browser profile.
- **No tracking, no analytics, no data collection.**
- Profile data is only transmitted during an active scan and only to the enabled AI provider(s).

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Extension Platform | Chrome Extension Manifest V3 |
| Background | Service Worker (vanilla JS) |
| UI | Vanilla JS + CSS injected into LinkedIn DOM |
| AI Analysis | Google Gemini, OpenAI GPT-4o, Anthropic Claude 3.5 |
| Storage | `chrome.storage.local`, `localStorage` (score history) |

---

## 📋 Scoring Rubric

### Profile Score (0–100)
Starts at 0 and adds/subtracts:

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
| Generic/missing headline | -10 |
| No quantified achievements | -20 |
| Buzzwords (passionate, ninja…) | -5 each |

### Job Fit Score (1–5 ⭐)

| Score | Meaning | Keyword match |
|---|---|---|
| ⭐⭐⭐⭐⭐ 5 | Excellent | 80%+ |
| ⭐⭐⭐⭐☆ 4 | Good | 60–79% |
| ⭐⭐⭐☆☆ 3 | Average | 40–59% |
| ⭐⭐☆☆☆ 2 | Weak | 20–39% |
| ⭐☆☆☆☆ 1 | Poor | < 20% |

---

## 🔄 Rate Limiting

All API calls use exponential backoff with 3 attempts:

| Attempt | Wait before retry |
|---|---|
| 1st retry | 5 seconds |
| 2nd retry | 15 seconds |
| 3rd (final) | 30 seconds, then error |

In Triple mode, a rate-limited provider is skipped — results are merged from whichever providers succeed.

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*Built to help professionals build LinkedIn profiles that actually get them noticed.*
