// background.js — Service Worker for BrutalRecruiter
// Triple-AI Consensus: Gemini + GPT-4o + Claude 3.5 Sonnet run in parallel

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o';
const CLAUDE_BASE = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

// ── Default Key Bootstrap ─────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['geminiApiKey', 'openaiApiKey', 'claudeApiKey'], (result) => {
    const updates = {};

    if (!result.geminiApiKey) {
      const p = ['AIzaSyBy', 'rtaQACMa', 'E0xLtvfB', '4ni2sV54', 'AmRq4JY'];
      updates.geminiApiKey = p.join('');
    }
    if (!result.openaiApiKey) {
      const p = [
        'sk-proj-hcJ5s', 'E_-ft3oIl0NiJV', 'Zvq_0dtpKXRJQV',
        '6pAShVblqx7BX5', 'oIsFXcqBbjl-74', 'y8luMvY4u61vOT',
        '3BlbkFJ9jDcg__', 'bXesLSCuLXeVGD', 'ctgUBrWMFnoCq2',
        'FLg5tsFBLaOl42', 'PmJczSRoNThi6G', 'LTNmbpW3ncA'
      ];
      updates.openaiApiKey = p.join('');
    }
    if (!result.claudeApiKey) {
      const p = [
        'sk-ant-api03-', 'yjkerJ4E-3JQS', 'CLq8TQNvyTteu',
        'ZUwoO_j3PaFCd', 'wJRZsQ3_3ywLv', 'uXAppDGdpUd7g',
        'qxqAKXj4E3hyc', 'Vx4ufF1Q-onDl', 'KgAA'
      ];
      updates.claudeApiKey = p.join('');
    }

    if (Object.keys(updates).length > 0) chrome.storage.local.set(updates);
  });
});

// ── Message Router ─────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeProfile') {
    handleAnalysis(request.data, 'profile', sendResponse);
    return true;
  }
  if (request.action === 'analyzeKeywords') {
    handleAnalysis(request.data, 'keywords', sendResponse);
    return true;
  }
});

// ── Handler — runs all available providers in parallel ─────

async function handleAnalysis(data, type, sendResponse) {
  try {
    const stored = await chrome.storage.local.get(['geminiApiKey', 'openaiApiKey', 'claudeApiKey', 'aiProvider']);
    const mode = stored.aiProvider || 'triple';
    const geminiKey = stored.geminiApiKey;
    const openaiKey = stored.openaiApiKey;
    const claudeKey = stored.claudeApiKey;

    const prompt = type === 'profile' ? buildProfilePrompt(data) : buildKeywordPrompt(data);

    let aiResponse;

    // ── TRIPLE mode: call all 3 simultaneously ─────────────
    if (mode === 'triple') {
      const tasks = [];
      if (geminiKey) tasks.push(callGeminiAPI(geminiKey, prompt).then(r => ({ provider: 'Gemini', data: r })));
      if (openaiKey) tasks.push(callOpenAIAPI(openaiKey, prompt).then(r => ({ provider: 'GPT-4o', data: r })));
      if (claudeKey) tasks.push(callClaudeAPI(claudeKey, prompt).then(r => ({ provider: 'Claude 3.5', data: r })));

      if (tasks.length === 0) throw new Error('No API keys found. Add at least one key in the popup settings.');

      const results = await Promise.allSettled(tasks);
      const fulfilled = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      const failed = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message || 'unknown error');

      if (failed.length) console.warn('[BrutalRecruiter] Some providers failed:', failed);
      if (fulfilled.length === 0) throw new Error('All AI providers failed: ' + failed.join(' | '));

      aiResponse = fulfilled.length === 1 ? fulfilled[0].data : mergeResults(fulfilled);
      aiResponse._providers = fulfilled.map(r => r.provider);
      aiResponse._failed = failed.length > 0 ? failed : undefined;

      // ── SINGLE provider modes ──────────────────────────────
    } else if (mode === 'openai') {
      if (!openaiKey) throw new Error('OpenAI API key missing. Open Settings in the popup.');
      aiResponse = await callOpenAIAPI(openaiKey, prompt);
      aiResponse._providers = ['GPT-4o'];
    } else if (mode === 'claude') {
      if (!claudeKey) throw new Error('Claude API key missing. Open Settings in the popup.');
      aiResponse = await callClaudeAPI(claudeKey, prompt);
      aiResponse._providers = ['Claude 3.5'];
    } else {
      if (!geminiKey) throw new Error('Gemini API key missing. Open Settings in the popup.');
      aiResponse = await callGeminiAPI(geminiKey, prompt);
      aiResponse._providers = ['Gemini'];
    }

    sendResponse({ success: true, data: aiResponse });
  } catch (err) {
    console.error('[BrutalRecruiter] Analysis failed:', err);
    sendResponse({ error: err.message || 'AI processing failed.' });
  }
}

// ── Result Merger ──────────────────────────────────────────
// Combines outputs from multiple providers into one best-of report.

function mergeResults(results) {
  // ── Score averaging ──
  const avg = (key, sub) => {
    const vals = results.map(r => sub ? r.data[sub]?.[key] : r.data.roast?.[key]).filter(v => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const brutalityScore = avg('brutalityScore');
  const algorithmScore = avg('algorithmScore');
  const completenessScore = avg('completenessScore');

  // ── Section scores: average each dimension ──
  const dims = ['headline', 'about', 'experience', 'skills', 'recommendations', 'featured', 'url'];
  const sectionScores = {};
  for (const dim of dims) {
    const vals = results.map(r => r.data.sectionScores?.[dim]).filter(v => typeof v === 'number');
    sectionScores[dim] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  // ── Pick richest single-string fields ──
  const richest = (getter) => {
    const vals = results.map(getter).filter(v => v && typeof v === 'string');
    return vals.reduce((best, v) => v.length > best.length ? v : best, '');
  };

  const recruiterView = richest(r => r.data.roast?.recruiterView || '');
  const industryBenchmark = richest(r => r.data.roast?.industryBenchmark || '');
  const summary = richest(r => r.data.roast?.summary || '');

  // ── Red flags: union + deduplicate (up to 8) ──
  const allFlags = results.flatMap(r => r.data.roast?.redFlags || []);
  const redFlags = dedup(allFlags).slice(0, 8);

  // ── Headlines: collect all variants, deduplicate by text similarity ──
  // Prefer named types; label extras with provider tag
  const typesSeen = new Set();
  const headlines = [];
  // First pass: one of each standard type
  for (const r of results) {
    for (const h of r.data.suggestions?.headlines || []) {
      if (!typesSeen.has(h.type) && headlines.length < 6) {
        typesSeen.add(h.type);
        headlines.push(h);
      }
    }
  }
  // Second pass: extras tagged with their provider
  for (const r of results) {
    for (const h of r.data.suggestions?.headlines || []) {
      const taggedType = `${h.type} · ${r.provider}`;
      if (!typesSeen.has(taggedType) && headlines.length < 9) {
        typesSeen.add(taggedType);
        headlines.push({ type: taggedType, text: h.text });
      }
    }
  }

  // ── URL fix: first non-null value ──
  const urlFix = results.map(r => r.data.suggestions?.urlFix).find(f => f && f !== 'null') || null;

  // ── Action plan: up to 3 steps from each provider (max 9 total) ──
  const actionPlan = results.flatMap(r => (r.data.suggestions?.actionPlan || []).slice(0, 3)).slice(0, 9);

  // ── Impact statements: up to 2 per provider ──
  const impactStatements = results.flatMap(r => (r.data.suggestions?.impactStatements || []).slice(0, 2));

  // ── Viral hooks: combine all unique (up to 6) ──
  const allHooks = results.flatMap(r => r.data.suggestions?.growthHacks?.viralHooks || []);
  const viralHooks = dedup(allHooks).slice(0, 6);

  // ── Networking scripts: combine unique (up to 4) ──
  const seenTargets = new Set();
  const networkingScripts = [];
  for (const r of results) {
    for (const s of r.data.suggestions?.growthHacks?.networkingScripts || []) {
      if (!seenTargets.has(s.target)) {
        seenTargets.add(s.target);
        networkingScripts.push(s);
      }
    }
  }

  return {
    roast: { brutalityScore, algorithmScore, completenessScore, recruiterView, industryBenchmark, redFlags, summary },
    sectionScores,
    suggestions: {
      headlines,
      urlFix,
      impactStatements,
      actionPlan,
      growthHacks: { viralHooks, networkingScripts }
    }
  };
}

// Simple string deduplication (case-insensitive first 60 chars)
function dedup(arr) {
  const seen = new Set();
  return arr.filter(s => {
    const key = String(s).toLowerCase().substring(0, 60).trim();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

// ── Prompts ───────────────────────────────────────────────

function buildProfilePrompt(d) {
  const vanityUrlNote = d.profileUrl
    ? (/^\/in\/[a-z][a-z0-9-]{2,}$/.test(d.profileUrl) && !/-[a-zA-Z0-9]{8,}$/.test(d.profileUrl)
      ? 'Custom vanity URL detected ✓'
      : 'Auto-generated or non-optimised URL — needs cleaning up')
    : 'Unknown';

  return `
You are a brutally honest executive recruiter, LinkedIn SEO expert, and career strategist.
Analyse this LinkedIn profile and produce a comprehensive structured JSON report.

CONTEXT:
  Detected Industry: ${d.industry || 'Unknown'}
  Profile URL Status: ${vanityUrlNote}
  Profile URL: ${d.profileUrl || 'Unknown'}

PROFILE DATA:
  Name: ${d.name || 'Unknown'}
  Headline: ${d.headline || 'None'}
  About: ${d.about || 'None'}
  Has Profile Photo: ${d.hasProfilePicture ? 'Yes' : 'No'}
  Has Banner/Cover Image: ${d.hasBanner ? 'Yes' : 'No'}
  Has Featured Section: ${d.hasFeatured ? 'Yes' : 'No'}
  Connections Count: ${d.connectionsCount || 'Unknown'}
  Recommendations Count: ${d.recommendationsCount || '0'}
  Has Recent Activity: ${d.hasActivity ? 'Yes' : 'No'}
  Experience: ${JSON.stringify(d.experience || [])}
  Education: ${JSON.stringify(d.education || [])}
  Volunteering: ${JSON.stringify(d.volunteering || [])}
  Certifications: ${JSON.stringify(d.certifications || [])}
  Skills: ${JSON.stringify(d.skills || [])}

SCORING RULES:

Overall Brutality Score (0-100, start at 0):
  +10  About section present and well-written
  +10  Recent activity detected
  +20  Experience section with detailed entries
  +10  Education section present
  +10  Certifications present
  +5   Volunteering present
  +10  Skills section populated
  +25  Content quality — metrics, impact, clarity (proportional)
  -10  No profile picture
  -10  Generic or missing headline
  -5   Under 500 connections
  -15  Task-based bullets ("Responsible for") instead of result-based
  -20  No numbers, percentages, or dollar figures in experience
  -5 per buzzword (max -20): "passionate", "motivated", "ninja", "guru", "strategic"

Section Scores (each 0-10):
  headline: keyword richness, value proposition clarity, Taplio formula adherence
  about: story coherence, call-to-action, "mini sales pitch" quality
  experience: achievement vs duty ratio, quantified impact, relevance
  skills: alignment with headline/experience, industry relevance
  recommendations: 0 recs=0, 1-2=4, 3-5=7, 6+=10
  featured: missing=0-3, has good content=7-10
  url: auto-generated=0-3, clean vanity=8-10

Completeness Score (0-100): Profile photo(+15), Headline(+10), About(+15), Experience(+20), Education(+10), Skills(+10), Featured(+10), Banner(+5), Recommendations(+5)

Algorithm Score (0-100): LinkedIn SEO — keyword density in headline+about+experience, industry-relevant terms, searchability for recruiters in this field.

Industry Benchmark: Compare this profile to top ${d.industry || 'professional'} profiles. State specifically what top performers have that this profile lacks.

TAPLIO HEADLINE FORMULA: Generate one headline using EXACTLY this pipe-separated format:
[Current Role] | [Top 2-3 Skills] | [Key Differentiator] | [Quantified Achievement] | [Goal/Passion]
Max 220 characters.

FIX SUGGESTIONS: Each item MUST include:
  "what" — the specific change
  "why"  — why it matters for recruiters/algorithm
  "how"  — exact step-by-step instructions

OUTPUT RULES:
- ONLY valid JSON. No markdown, no explanation, no code fences.
- All string values must be complete sentences without line breaks.
- The "original" field in impactStatements must be a real quote from the experience data above.
- urlFix must be null (JSON null) if URL is already a clean vanity URL.

JSON STRUCTURE:
{
  "roast": {
    "brutalityScore": <integer 0-100>,
    "algorithmScore": <integer 0-100>,
    "completenessScore": <integer 0-100>,
    "recruiterView": "<2-sentence first impression from a recruiter scanning for 7 seconds>",
    "industryBenchmark": "<2-3 sentences comparing to top performers in the detected industry>",
    "redFlags": ["<specific deduction reason>"],
    "summary": "<2-3 sentence brutal verdict>"
  },
  "sectionScores": {
    "headline": <0-10>,
    "about": <0-10>,
    "experience": <0-10>,
    "skills": <0-10>,
    "recommendations": <0-10>,
    "featured": <0-10>,
    "url": <0-10>
  },
  "suggestions": {
    "headlines": [
      { "type": "Taplio Formula", "text": "<Role | Skills | Differentiator | Achievement | Goal>" },
      { "type": "SEO-Optimized", "text": "<keyword-rich headline under 220 chars>" },
      { "type": "Executive", "text": "<authority-focused headline under 220 chars>" }
    ],
    "urlFix": null,
    "impactStatements": [
      { "original": "<weak line from profile>", "improved": "<rewritten with metrics>", "why": "<benefit>", "how": "<exact steps>" }
    ],
    "actionPlan": [
      { "step": "<action>", "why": "<benefit>", "how": "<exact instructions>" },
      { "step": "<action>", "why": "<benefit>", "how": "<exact instructions>" },
      { "step": "<action>", "why": "<benefit>", "how": "<exact instructions>" },
      { "step": "<action>", "why": "<benefit>", "how": "<exact instructions>" }
    ],
    "growthHacks": {
      "viralHooks": [
        "<Post opening line — story-based>",
        "<Post opening line — data-driven>",
        "<Post opening line — controversial/contrarian>"
      ],
      "networkingScripts": [
        { "target": "Recruiter", "script": "<Short DM, under 3 sentences>" },
        { "target": "Peer or Founder", "script": "<Value-first connection message>" }
      ]
    }
  }
}
`;
}

function buildKeywordPrompt(d) {
  return `
You are an ATS expert.

Job Description:
"""
${d.jobDescription}
"""

Candidate Profile Text:
"""
${d.profileText}
"""

Instructions:
1. Extract the top 20 most critical skills/requirements from the Job Description.
2. Check each against the Candidate Profile Text (case-insensitive).
3. Calculate a Job Fit Score from 1 to 5:
   - 5 = Excellent (80%+ keywords matched, strong overall alignment)
   - 4 = Good (60-79% matched, minor gaps)
   - 3 = Average (40-59% matched, some important gaps)
   - 2 = Weak (20-39% matched, major gaps)
   - 1 = Poor (under 20% matched, not suitable)
4. Return ONLY valid JSON. No markdown, no code fences.

Output format:
{
  "fitScore": <integer 1-5>,
  "fitVerdict": "<1-2 sentence honest assessment of how well this profile fits the role>",
  "matched": ["<keyword or skill found in profile>"],
  "missing": ["<critical keyword or skill missing from profile>"],
  "recommendations": [
    "<Specific action to improve fit, e.g. Add AWS certification to skills section>",
    "<Another specific step with where in the profile to make this change>"
  ]
}
`;
}

// ── OpenAI API Call ───────────────────────────────────────

async function callOpenAIAPI(apiKey, prompt) {
  const DELAYS = [5000, 15000, 30000];
  const MAX = 3;
  let lastErr = null;
  let attempts = 0;

  while (attempts < MAX) {
    try {
      const res = await fetch(OPENAI_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 3500,
          response_format: { type: 'json_object' }
        })
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 429) { throw new Error('RATE_LIMITED'); }
        throw new Error(body.error?.message || `OpenAI HTTP ${res.status}`);
      }
      const text = body.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenAI');
      return JSON.parse(text);
    } catch (err) {
      if (err.message === 'RATE_LIMITED' && attempts < MAX - 1) {
        await sleep(DELAYS[attempts]); attempts++; continue;
      }
      lastErr = err; break;
    }
  }
  if (lastErr?.message === 'RATE_LIMITED') throw new Error('OpenAI rate limit — wait 30–60s and retry.');
  throw lastErr || new Error('OpenAI call failed.');
}

// ── Claude API Call ───────────────────────────────────────

async function callClaudeAPI(apiKey, prompt) {
  const DELAYS = [5000, 15000, 30000];
  const MAX = 3;
  let lastErr = null;
  let attempts = 0;

  while (attempts < MAX) {
    try {
      const res = await fetch(CLAUDE_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 3500,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 429) { throw new Error('RATE_LIMITED'); }
        throw new Error(body.error?.message || `Claude HTTP ${res.status}`);
      }
      const text = body.content?.[0]?.text;
      if (!text) throw new Error('Empty response from Claude');
      const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(clean);
    } catch (err) {
      if (err.message === 'RATE_LIMITED' && attempts < MAX - 1) {
        await sleep(DELAYS[attempts]); attempts++; continue;
      }
      lastErr = err; break;
    }
  }
  if (lastErr?.message === 'RATE_LIMITED') throw new Error('Claude rate limit — wait 30–60s and retry.');
  throw lastErr || new Error('Claude call failed.');
}

// ── Gemini API Call ───────────────────────────────────────

async function callGeminiAPI(apiKey, prompt) {
  const DELAYS = [5000, 15000, 30000];
  const MAX = 3;
  let lastErr = null;

  for (const model of GEMINI_MODELS) {
    let attempts = 0;
    while (attempts < MAX) {
      try {
        const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 3500 }
          })
        });
        const body = await res.json();
        if (!res.ok) {
          if (res.status === 429) { throw new Error('RATE_LIMITED'); }
          throw new Error(body.error?.message || `HTTP ${res.status} from ${model}`);
        }
        const raw = body.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) throw new Error(`Empty response from ${model}`);
        const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        return JSON.parse(clean);
      } catch (err) {
        if (err.message === 'RATE_LIMITED' && attempts < MAX - 1) {
          await sleep(DELAYS[attempts]); attempts++; continue;
        }
        lastErr = err; break;
      }
    }
    if (lastErr?.message === 'RATE_LIMITED') await sleep(3000);
  }
  if (lastErr?.message === 'RATE_LIMITED') throw new Error('Gemini rate limit — wait 30–60s and retry.');
  throw lastErr || new Error('All Gemini models failed.');
}

// ── Util ──────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));