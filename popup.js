document.addEventListener('DOMContentLoaded', () => {
    const geminiKeyInput = document.getElementById('geminiKey');
    const openaiKeyInput = document.getElementById('openaiKey');
    const claudeKeyInput = document.getElementById('claudeKey');
    const saveBtn = document.getElementById('saveBtn');
    const scanBtn = document.getElementById('scanBtn');
    const statusEl = document.getElementById('status');
    const saveStatusEl = document.getElementById('save-status');
    const providerBtns = document.querySelectorAll('.provider-btn');

    let currentProvider = 'triple';

    // ── Load saved settings ──────────────────────────────────
    chrome.storage.local.get(['geminiApiKey', 'openaiApiKey', 'claudeApiKey', 'aiProvider'], (result) => {
        if (result.geminiApiKey) geminiKeyInput.value = result.geminiApiKey;
        if (result.openaiApiKey) openaiKeyInput.value = result.openaiApiKey;
        if (result.claudeApiKey) claudeKeyInput.value = result.claudeApiKey;
        setProvider(result.aiProvider || 'triple', false);
    });

    // ── Provider toggle ──────────────────────────────────────
    providerBtns.forEach(btn => {
        btn.addEventListener('click', () => setProvider(btn.dataset.provider, true));
    });

    function setProvider(provider, saveNow) {
        currentProvider = provider;
        providerBtns.forEach(b => b.classList.toggle('active', b.dataset.provider === provider));

        if (saveNow) {
            chrome.storage.local.set({ aiProvider: provider });
            const labels = {
                triple: '⚡ All 3 AIs ✓',
                gemini: 'Gemini ✓',
                openai: 'GPT-4o ✓',
                claude: 'Claude 3.5 ✓'
            };
            setStatus(saveStatusEl, `Mode: ${labels[provider]}`, 'success');
            setTimeout(() => setStatus(saveStatusEl, '', ''), 2500);
        }
    }

    // ── Save API keys ────────────────────────────────────────
    saveBtn.addEventListener('click', () => {
        const updates = { aiProvider: currentProvider };
        const geminiVal = geminiKeyInput.value.trim();
        const openaiVal = openaiKeyInput.value.trim();
        const claudeVal = claudeKeyInput.value.trim();

        if (geminiVal) updates.geminiApiKey = geminiVal;
        if (openaiVal) updates.openaiApiKey = openaiVal;
        if (claudeVal) updates.claudeApiKey = claudeVal;

        // Triple mode: need at least one key
        if (currentProvider === 'triple' && !geminiVal && !openaiVal && !claudeVal) {
            setStatus(saveStatusEl, 'Enter at least one API key.', 'error'); return;
        }
        if (currentProvider === 'gemini' && !geminiVal) {
            setStatus(saveStatusEl, 'Enter a Gemini API key.', 'error'); return;
        }
        if (currentProvider === 'openai' && !openaiVal) {
            setStatus(saveStatusEl, 'Enter an OpenAI API key.', 'error'); return;
        }
        if (currentProvider === 'claude' && !claudeVal) {
            setStatus(saveStatusEl, 'Enter an Anthropic API key.', 'error'); return;
        }

        chrome.storage.local.set(updates, () => {
            const savedCount = [geminiVal, openaiVal, claudeVal].filter(Boolean).length;
            setStatus(saveStatusEl, `${savedCount} key${savedCount !== 1 ? 's' : ''} saved ✓`, 'success');
            setTimeout(() => setStatus(saveStatusEl, '', ''), 3000);
        });
    });

    // ── Scan current tab ─────────────────────────────────────
    scanBtn.addEventListener('click', async () => {
        setStatus(statusEl, 'Opening sidebar…', '');

        let tab;
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            tab = tabs[0];
        } catch (err) {
            setStatus(statusEl, 'Could not access tab: ' + err.message, 'error');
            return;
        }

        if (!tab?.url) { setStatus(statusEl, 'No active tab found.', 'error'); return; }
        if (!tab.url.includes('linkedin.com/in/')) {
            setStatus(statusEl, 'Navigate to a LinkedIn profile page first.', 'error'); return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'triggerScan' }, () => {
            if (chrome.runtime.lastError) {
                setStatus(statusEl, 'Refresh the LinkedIn page and try again.', 'error'); return;
            }
            window.close();
        });
    });

    function setStatus(el, message, type) {
        if (!el) return;
        el.textContent = message;
        el.className = 'status' + (type ? ' ' + type : '');
    }
});