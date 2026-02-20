/**
 * content.js — BrutalRecruiter
 * Clean, single-action UX: one "Scan Me" button → clear improvement cards
 */

(function () {
  'use strict';
  if (window.__brutalRecruiterLoaded) return;
  window.__brutalRecruiterLoaded = true;

  const STATE = { tab: 'review', lastData: null, scrapedMeta: null };
  const HISTORY_KEY = 'brutalRecruiter_scoreHistory';

  // ── Inject "Scan Me" button on profile page ──────────────

  function injectScanButton() {
    if (document.getElementById('brutal-scan-btn')) return;
    const bar =
      document.querySelector('.pvs-profile-actions') ||
      document.querySelector('.pv-top-card--list') ||
      document.querySelector('.ph5.pb5');
    if (!bar) return;
    const btn = document.createElement('button');
    btn.id = 'brutal-scan-btn';
    btn.textContent = 'Analyze Profile';
    btn.onclick = () => { mountSidebar(); showSidebar(); };
    bar.prepend(btn);
  }

  const obs = new MutationObserver(injectScanButton);
  obs.observe(document.body, { childList: true, subtree: true });
  injectScanButton();

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.action === 'triggerScan') { mountSidebar(); showSidebar(); sendResponse({ status: 'ok' }); }
    return true;
  });

  // ── Sidebar shell ────────────────────────────────────────

  function mountSidebar() {
    if (document.getElementById('brutal-recruiter-sidebar')) return;
    const root = document.createElement('div');
    root.id = 'brutal-recruiter-sidebar';
    root.innerHTML = `
      <div class="br-header">
        <span class="br-title">Profile Analysis</span>
        <button class="br-close-btn" aria-label="Close">×</button>
      </div>
      <div class="br-toggle-container">
        <button class="br-toggle-btn active" data-tab="review">Review</button>
        <button class="br-toggle-btn" data-tab="jobfit">Job Fit</button>
      </div>
      <div id="br-content-area" class="br-content">
        <div class="br-idle">
          <div class="br-scan-hero">
            <div class="br-scan-icon"></div> 
            <h3>Ready to Analyze</h3>
            <p>Get a comprehensive AI-powered breakdown of your LinkedIn profile with clear, data-driven actionable steps.</p>
            <button class="br-scan-btn-main" id="main-analyze-trigger">Start Analysis</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);

    root.querySelector('.br-close-btn').onclick = hideSidebar;
    root.querySelectorAll('.br-toggle-btn').forEach(btn => {
      btn.onclick = () => {
        root.querySelectorAll('.br-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.tab = btn.dataset.tab;
        render();
      };
    });
    root.addEventListener('click', e => {
      if (e.target.id === 'main-analyze-trigger') runFullAnalysis();
      if (e.target.id === 'run-jobfit-check') runJobFitCheck();
    });
  }

  function showSidebar() {
    document.getElementById('brutal-recruiter-sidebar')?.classList.add('open');
  }
  function hideSidebar() {
    document.getElementById('brutal-recruiter-sidebar')?.classList.remove('open');
  }
  function setContent(html) {
    const a = document.getElementById('br-content-area');
    if (a) a.innerHTML = html;
  }

  // ── Scraper ──────────────────────────────────────────────

  function scrapeProfile() {
    function getText(sels) {
      for (const s of sels) {
        try { const el = document.querySelector(s); if (el?.innerText?.trim()) return el.innerText.trim(); } catch (_) { }
      }
      return '';
    }
    function findCard(kws) {
      for (const card of document.querySelectorAll('section')) {
        const h = card.querySelector('h2, [class*="pvs-header__title"]');
        if (h && kws.some(k => h.innerText.trim().toLowerCase().includes(k))) return card;
      }
      return null;
    }
    function cardItems(card, max) {
      if (!card) return [];
      const items = [];
      card.querySelectorAll('[data-view-name="profile-component-entity"]').forEach(el => {
        const t = el.innerText.replace(/\n+/g, ' | ').trim();
        if (t.length > 10) items.push(t);
      });
      if (!items.length) card.querySelectorAll('li').forEach(li => {
        const t = li.innerText.replace(/\n+/g, ' | ').trim();
        if (t.length > 10) items.push(t);
      });
      return items.slice(0, max || 8);
    }

    const name = getText(['h1', '.text-heading-xlarge']);
    const headline = getText(['.text-body-medium[data-generated-suggestion-target]', '.text-body-medium']);
    const profileUrl = window.location.pathname.replace(/\/$/, '');
    const hasProfilePicture = !!document.querySelector('img.evi-image[src*="profile-displayphoto"]');

    let connectionsCount = 'Unknown';
    const cm = document.body.innerText.match(/([\d,]+)\+?\s*connections?/i);
    if (cm) connectionsCount = cm[1].replace(/,/g, '');

    let about = '';
    const aboutCard = findCard(['about']);
    if (aboutCard) {
      const inline = aboutCard.querySelector('.inline-show-more-text span[aria-hidden="true"]');
      about = inline ? inline.innerText.trim() : (aboutCard.innerText || '').replace(/^About\s*/i, '').trim().substring(0, 1500);
    }

    const hasFeatured = !!findCard(['featured'])?.querySelectorAll('li,[data-view-name]').length;
    const hasBanner = !!document.querySelector('img[class*="cover"],.profile-background-image img');

    let recommendationsCount = '0';
    const recCard = findCard(['recommendations']);
    if (recCard) {
      const rm = recCard.innerText.match(/(\d+)\s+recommendation/i);
      recommendationsCount = rm ? rm[1] : String(recCard.querySelectorAll('[data-view-name="profile-component-entity"]').length || 0);
    }

    let industry = '';
    document.querySelectorAll('.pv-text-details__left-panel span[aria-hidden="true"]').forEach(s => {
      const t = s.innerText.trim();
      if (t && t.length > 3 && !t.includes('·') && !/\d/.test(t) && !industry) industry = t;
    });
    if (!industry) industry = document.querySelector('[data-field="industry"]')?.innerText.trim() || '';

    return {
      name, headline, about, hasProfilePicture, profileUrl, hasBanner, hasFeatured,
      recommendationsCount, connectionsCount, hasActivity: !!document.querySelector('a[href*="recent-activity"]'), industry,
      experience: cardItems(findCard(['experience'])),
      education: cardItems(findCard(['education'])),
      volunteering: cardItems(findCard(['volunteering'])),
      certifications: cardItems(findCard(['licenses', 'certifications'])),
      skills: cardItems(findCard(['skills']))
    };
  }

  // ── Score history ─────────────────────────────────────────

  function saveHistory(b, c, a) {
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      h.push({ date: new Date().toLocaleDateString(), brutality: b, completeness: c, algorithm: a });
      if (h.length > 10) h.shift();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    } catch (_) { }
  }
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) { return []; }
  }

  // ── Analysis Runners ─────────────────────────────────────

  function runFullAnalysis() {
    setContent(`
      <div class="br-loading">
        <div class="br-spinner"></div>
        <p><strong>Analyzing profile data...</strong></p>
        <div style="display:flex;justify-content:center;gap:6px;margin-top:10px;flex-wrap:wrap;">
          <span class="br-ai-chip chip-g">Gemini</span>
          <span class="br-ai-chip chip-o">GPT-4o</span>
          <span class="br-ai-chip chip-c">Claude 3.5</span>
        </div>
        <p style="margin-top:12px;"><small>Processing all sections.<br>Estimated time: 20–30 seconds.</small></p>
      </div>`);

    let profileData;
    try { profileData = scrapeProfile(); }
    catch (err) { setContent(`<div class="br-error">Failed to read profile: ${esc(err.message)}</div>`); return; }

    chrome.runtime.sendMessage({ action: 'analyzeProfile', data: profileData }, (res) => {
      if (chrome.runtime.lastError) { setContent(`<div class="br-error">${esc(chrome.runtime.lastError.message)}</div>`); return; }
      if (!res || res.error) { setContent(`<div class="br-error">${esc(res?.error || 'No response.')}</div>`); return; }
      if (!res.data?.roast || !res.data?.suggestions) { setContent(`<div class="br-error">Unexpected format from AI. Try again.</div>`); return; }
      STATE.lastData = res.data;
      STATE.scrapedMeta = profileData;
      saveHistory(res.data.roast.brutalityScore, res.data.roast.completenessScore, res.data.roast.algorithmScore);
      render();
    });
  }

  function runJobFitCheck() {
    const jdEl = document.getElementById('jd-input');
    const resEl = document.getElementById('jfit-results');
    const jd = jdEl?.value?.trim() || '';
    if (!jd) { if (resEl) resEl.innerHTML = `<div class="br-error">Paste a job description first.</div>`; return; }
    if (resEl) resEl.innerHTML = `<div class="br-loading"><div class="br-spinner"></div><p>Analysing job fit…</p></div>`;

    const p = scrapeProfile();
    const profileText = [p.headline, p.about, ...p.experience, ...p.skills].join(' ').substring(0, 8000);
    chrome.runtime.sendMessage({ action: 'analyzeKeywords', data: { jobDescription: jd, profileText } }, (res) => {
      if (!resEl) return;
      if (chrome.runtime.lastError || !res || res.error) {
        resEl.innerHTML = `<div class="br-error">${esc(res?.error || 'Job fit check failed.')}</div>`; return;
      }
      renderJobFit(res.data, resEl);
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function scoreBadge(val, max) {
    const pct = (val / max) * 100;
    const color = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
    const bg = pct >= 70 ? '#dcfce7' : pct >= 40 ? '#fef3c7' : '#fee2e2';
    return `<span class="br-score-badge" style="background:${bg};color:${color};">${val}/${max}</span>`;
  }

  function miniBar(val, max) {
    const pct = Math.round((val / max) * 100);
    const color = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
    return `<div class="br-mini-bar-wrap"><div class="br-mini-bar" style="width:${pct}%;background:${color};"></div></div>`;
  }

  function starRating(score) {
    // score 1-5
    const filled = '★'.repeat(score);
    const empty = '☆'.repeat(5 - score);
    const color = score >= 4 ? '#059669' : score >= 3 ? '#d97706' : '#dc2626';
    return `<span style="font-size:1.6rem;color:${color};letter-spacing:2px;">${filled}${empty}</span>`;
  }

  // ── Renderer ─────────────────────────────────────────────

  function render() {
    if (STATE.tab === 'review') renderReview();
    else if (STATE.tab === 'jobfit') renderJobFitTab();
  }

  // ── REVIEW TAB ───────────────────────────────────────────

  function renderReview() {
    if (!STATE.lastData) {
      setContent(`
        <div class="br-idle">
          <div class="br-scan-hero">
            <div class="br-scan-icon"></div>
            <h3>Ready to Analyze</h3>
            <p>Get a comprehensive AI-powered breakdown of your LinkedIn profile with clear, data-driven actionable steps.</p>
            <button class="br-scan-btn-main" id="main-analyze-trigger">Start Analysis</button>
          </div>
        </div>`);
      return;
    }

    const r = STATE.lastData.roast;
    const s = STATE.lastData.suggestions;
    const ss = STATE.lastData.sectionScores || {};
    const meta = STATE.scrapedMeta || {};
    const sc = r.brutalityScore; // We'll keep the internal variable name but display as "Profile Impact Score"
    const scColor = sc >= 70 ? '#059669' : sc >= 40 ? '#d97706' : '#dc2626';
    const scBg = sc >= 70 ? '#dcfce7' : sc >= 40 ? '#fef3c7' : '#fee2e2';

    // Provider badge (triple mode)
    const providerBadge = (STATE.lastData._providers?.length) ?
      `<div class="br-powered-by">
        <span class="br-powered-label">ANALYZED BY</span>
        ${(STATE.lastData._providers || []).map(p => {
        const styles = { 'Gemini': 'chip-g', 'GPT-4o': 'chip-o', 'Claude 3.5': 'chip-c' };
        return `<span class="br-ai-chip ${styles[p] || ''}">${esc(p)}</span>`;
      }).join('')}
      </div>` : '';

    // Recruiter first look
    const recruiterBlock = r.recruiterView ? `
      <div class="br-recruiter-card">
        <div class="br-rec-label">Recruiter Impression</div>
        <p class="br-rec-text">${esc(r.recruiterView)}</p>
      </div>` : '';

    // Section improvement cards
    const sectionDefs = [
      { key: 'headline', label: 'Headline Strategy' },
      { key: 'about', label: 'Summary / About' },
      { key: 'experience', label: 'Experience Depth' },
      { key: 'skills', label: 'Skills Relevance' },
      { key: 'recommendations', label: 'Social Proof' },
      { key: 'featured', label: 'Featured Content' },
      { key: 'url', label: 'Profile URL' }
    ];

    // Match section scores to action plan items where possible
    const actionBySection = {};
    (s.actionPlan || []).forEach(item => {
      const text = (item.step || item.what || '').toLowerCase();
      if (text.includes('headline')) actionBySection.headline = item;
      else if (text.includes('about') || text.includes('summary')) actionBySection.about = item;
      else if (text.includes('experience') || text.includes('bullet')) actionBySection.experience = item;
      else if (text.includes('skill')) actionBySection.skills = item;
      else if (text.includes('recommend')) actionBySection.recommendations = item;
      else if (text.includes('feature')) actionBySection.featured = item;
      else if (text.includes('url') || text.includes('vanity')) actionBySection.url = item;
    });

    // Best headline suggestion
    const headlineSuggestion = (s.headlines || []).find(h => h.type === 'Taplio Formula') || s.headlines?.[0];

    const sectionCards = sectionDefs.map(({ key, label }) => {
      const val = ss[key] ?? 0;
      const pct = val * 10;
      const statusColor = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
      const statusBg = pct >= 70 ? '#f0fdf4' : pct >= 40 ? '#fffbeb' : '#fff1f2';
      const status = pct >= 70 ? 'Strong' : pct >= 40 ? 'Needs Improvement' : 'Critical Issue';
      const action = actionBySection[key];

      let fixContent = '';
      if (key === 'headline' && headlineSuggestion) {
        fixContent = `<div class="br-fix-row"><span class="br-fix-label">Recommended:</span><div class="br-fix-suggestion">${esc(headlineSuggestion.text)}</div></div>`;
      }
      if (key === 'url' && s.urlFix && s.urlFix !== 'null') {
        fixContent = `<div class="br-fix-row"><span class="br-fix-label">Suggested URL:</span><code class="br-fix-url">linkedin.com/in/${esc(s.urlFix)}</code></div>`;
      }
      if (action) {
        fixContent += `
          ${action.why ? `<div class="br-fix-row"><span class="br-fix-label">Why:</span><span class="br-fix-detail">${esc(action.why)}</span></div>` : ''}
          ${action.how ? `<div class="br-fix-row"><span class="br-fix-label">Action:</span><span class="br-fix-detail">${esc(action.how)}</span></div>` : ''}`;
      }

      return `
        <div class="br-section-card" style="border-left-color:${statusColor};background:${statusBg};">
          <div class="br-sc-header">
            <span class="br-sc-label">${esc(label)}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="br-status-pill" style="background:${statusColor}20;color:${statusColor};">${status}</span>
              ${scoreBadge(val, 10)}
            </div>
          </div>
          ${miniBar(val, 10)}
          ${fixContent ? `<div class="br-sc-body">${fixContent}</div>` : ''}
        </div>`;
    }).join('');

    // Checklist (scraped, no AI)
    const isVanity = /^\/in\/[a-z][a-z0-9-]{2,}$/.test(meta.profileUrl || '') && !/-[a-zA-Z0-9]{8,}$/.test(meta.profileUrl || '');
    const conns = parseInt(meta.connectionsCount) || 0;
    const checks = [
      { label: 'Profile Photo', pass: !!meta.hasProfilePicture },
      { label: 'Banner Image', pass: !!meta.hasBanner },
      { label: 'Vanity URL', pass: isVanity },
      { label: 'Featured Section', pass: !!meta.hasFeatured },
      { label: '500+ Connections', pass: conns >= 500 },
      { label: 'Recent Activity', pass: !!meta.hasActivity },
      { label: 'Recommendations', pass: parseInt(meta.recommendationsCount || 0) > 0 }
    ];
    const checklistHTML = checks.map(c =>
      `<div class="br-check-item ${c.pass ? 'pass' : 'fail'}">
        <span class="br-check-icon">${c.pass ? '✓' : '!'}</span>
        <span>${esc(c.label)}</span>
      </div>`).join('');

    // Bullet rewrites
    const rewritesHTML = (s.impactStatements || []).slice(0, 3).map(item => `
      <div class="br-rewrite-card">
        <div class="br-rw-before">Original: ${esc((item.original || '').substring(0, 120))}</div>
        <div class="br-rw-after">Improved: ${esc(item.improved || '')}</div>
      </div>`).join('');

    // Viral hooks -> Strategic Hooks
    const hooksHTML = (s.growthHacks?.viralHooks || []).slice(0, 3).map(h =>
      `<div class="br-hook-card" onclick="navigator.clipboard.writeText(${JSON.stringify(h)})" title="Click to copy">
        "${esc(h)}"<span class="br-copy-hint">copy</span>
       </div>`).join('');

    // Networking scripts
    const scriptsHTML = (s.growthHacks?.networkingScripts || []).map(sc =>
      `<div class="br-script-card">
        <span class="br-script-target">${esc(sc.target)}</span>
        <div class="br-script-text">"${esc(sc.script)}"</div>
       </div>`).join('');

    // Score history
    const history = getHistory();
    const historyHTML = history.length > 1 ? `
      <div class="br-card-section">
        <div class="br-card-section-title">History Trend</div>
        <table class="br-history-table">
          <thead><tr><th>Date</th><th>Score</th><th>Complete</th><th>Algo</th></tr></thead>
          <tbody>${history.slice().reverse().map(h => {
      const c = h.brutality >= 70 ? '#059669' : h.brutality >= 40 ? '#d97706' : '#dc2626';
      return `<tr>
              <td>${h.date}</td>
              <td style="font-weight:700;color:${c};">${h.brutality}</td>
              <td>${h.completeness ?? '—'}%</td>
              <td>${h.algorithm ?? '—'}</td>
            </tr>`;
    }).join('')}</tbody>
        </table>
      </div>` : '';

    setContent(`
      ${providerBadge}

      <!-- Overall Scores -->
      <div class="br-score-row">
        <div class="br-big-score" style="background:${scBg};color:${scColor};">
          <div class="br-big-num">${sc}</div>
          <div class="br-big-label">Impact Score</div>
        </div>
        <div class="br-mini-scores">
          <div class="br-mini-score-item">
            <div class="br-mini-val" style="color:${r.algorithmScore >= 70 ? '#059669' : r.algorithmScore >= 40 ? '#d97706' : '#dc2626'};">${r.algorithmScore ?? '—'}</div>
            <div class="br-mini-lbl">SEO</div>
          </div>
          <div class="br-mini-score-item">
            <div class="br-mini-val" style="color:${(r.completenessScore ?? 0) >= 70 ? '#059669' : (r.completenessScore ?? 0) >= 40 ? '#d97706' : '#dc2626'};">${r.completenessScore ?? '—'}%</div>
            <div class="br-mini-lbl">Completeness</div>
          </div>
        </div>
      </div>

      <!-- Verdict -->
      <div class="br-verdict-card">
        <div class="br-verdict-label">Executive Summary</div>
        <p class="br-verdict-text">${esc(r.summary)}</p>
      </div>

      ${recruiterBlock}

      ${r.industryBenchmark ? `
      <div class="br-benchmark-card">
        <div class="br-benchmark-label">Market Comparison (vs. Top ${esc(meta.industry || 'Industry')} Profiles)</div>
        <p class="br-benchmark-text">${esc(r.industryBenchmark)}</p>
      </div>` : ''}

      <!-- Section-by-section improvement cards -->
      <div class="br-card-section">
        <div class="br-card-section-title">Detailed Analysis by Section</div>
        ${sectionCards}
      </div>

      <!-- Profile Checklist -->
      <div class="br-card-section">
        <div class="br-card-section-title">Essential Checklist</div>
        <div class="br-checklist-grid">${checklistHTML}</div>
      </div>

      <!-- Bullet rewrites -->
      ${rewritesHTML ? `
      <div class="br-card-section">
        <div class="br-card-section-title">Impact Statement Rewrites</div>
        ${rewritesHTML}
      </div>` : ''}

      <!-- Viral hooks -->
      ${hooksHTML ? `
      <div class="br-card-section">
        <div class="br-card-section-title">Strategic Content Hooks</div>
        ${hooksHTML}
      </div>` : ''}

      <!-- Networking scripts -->
      ${scriptsHTML ? `
      <div class="br-card-section">
        <div class="br-card-section-title">Outreach Templates</div>
        ${scriptsHTML}
      </div>` : ''}

      ${historyHTML}

      <div style="text-align:center;margin-top:1rem;padding-top:1rem;border-top:1px solid #f3f4f6;">
        <button class="br-rescan-btn" id="main-analyze-trigger">Refresh Analysis</button>
      </div>
    `);
  }

  // ── JOB FIT TAB ──────────────────────────────────────────

  function renderJobFitTab() {
    const hasResult = !!STATE.lastData?.jobFit;
    const resultBlock = hasResult ? buildJobFitHTML(STATE.lastData.jobFit) : '';

    setContent(`
      <div class="br-card-section">
        <div class="br-jf-intro">Paste a job description below. We'll score your LinkedIn profile's fit on a <strong>1–5 scale</strong> and tell you exactly what to add.</div>
        <textarea id="jd-input" class="br-textarea" placeholder="Paste the job description here…" rows="7"></textarea>
        <button class="br-scan-btn-main" id="run-jobfit-check">Check My Job Fit</button>
      </div>
      <div id="jfit-results">${resultBlock}</div>
    `);
  }

  function renderJobFit(data, el) {
    // Cache the result
    if (STATE.lastData) STATE.lastData.jobFit = data;
    el.innerHTML = buildJobFitHTML(data);
  }

  function buildJobFitHTML(data) {
    const fit = Math.min(5, Math.max(1, Math.round(data.fitScore || 1)));
    const fitColor = fit >= 4 ? '#059669' : fit >= 3 ? '#d97706' : '#dc2626';
    const fitBg = fit >= 4 ? '#dcfce7' : fit >= 3 ? '#fef3c7' : '#fee2e2';
    const fitLabel = ['', 'Poor Fit', 'Weak Fit', 'Average Fit', 'Good Fit', 'Excellent Fit'][fit];

    const matchedHTML = (data.matched || []).map(k =>
      `<span class="br-kw-tag br-kw-match">${esc(k)}</span>`).join('');
    const missingHTML = (data.missing || []).map(k =>
      `<span class="br-kw-tag br-kw-miss">${esc(k)}</span>`).join('');

    const recsHTML = (data.recommendations || []).map((r, i) =>
      `<div class="br-jf-rec"><span class="br-jf-rec-num">${i + 1}</span><span>${esc(r)}</span></div>`).join('');

    const total = (data.matched || []).length + (data.missing || []).length;
    const matchPct = total ? Math.round(((data.matched || []).length / total) * 100) : 0;

    return `
      <div class="br-jf-score-card" style="background:${fitBg};border-color:${fitColor}40;">
        <div class="br-jf-stars">${starRating(fit)}</div>
        <div class="br-jf-score-num" style="color:${fitColor};">${fit}/5</div>
        <div class="br-jf-label" style="color:${fitColor};">${fitLabel}</div>
        ${data.fitVerdict ? `<p class="br-jf-verdict">${esc(data.fitVerdict)}</p>` : ''}
      </div>

      <div class="br-jf-match-row">
        <div class="br-jf-match-bar-wrap">
          <div class="br-jf-match-bar" style="width:${matchPct}%;background:${fitColor};"></div>
        </div>
        <span class="br-jf-match-pct">${matchPct}% keyword match</span>
      </div>

      ${matchedHTML ? `
      <div class="br-card-section">
        <div class="br-card-section-title">Matches (${(data.matched || []).length})</div>
        <div class="br-kw-grid">${matchedHTML}</div>
      </div>` : ''}

      ${missingHTML ? `
      <div class="br-card-section">
        <div class="br-card-section-title">Missing Keywords (${(data.missing || []).length})</div>
        <div class="br-kw-grid">${missingHTML}</div>
      </div>` : ''}

      ${recsHTML ? `
      <div class="br-card-section">
        <div class="br-card-section-title">How to Improve Your Fit</div>
        ${recsHTML}
      </div>` : ''}
    `;
  }

})();