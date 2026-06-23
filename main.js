// ─── Mode toggle ─────────────────────────────────────────────────────────────

function setMode(mode) {
  const prebriefPanel = document.getElementById('prebrief-panel');
  const analyzePanel  = document.getElementById('analyze-panel');
  const btnBrainstorm = document.getElementById('mode-brainstorm');
  const btnAnalyze    = document.getElementById('mode-analyze');

  if (mode === 'brainstorm') {
    prebriefPanel.hidden = false;
    analyzePanel.hidden  = true;
    btnBrainstorm.classList.add('active');
    btnAnalyze.classList.remove('active');
  } else {
    prebriefPanel.hidden = true;
    analyzePanel.hidden  = false;
    btnBrainstorm.classList.remove('active');
    btnAnalyze.classList.add('active');
  }
}

// ─── Pre-brief ───────────────────────────────────────────────────────────────

let prebriefQuestions = [];

const CHANGE_TYPES = [
  'Configuration change only',
  'Existing integration change',
  'New integration or connection',
  'Schema or data change',
  'New build / net new capability',
  'Unknown / not sure',
];

function inferChangeTypeFromIdea(ideaText) {
  const text = (ideaText || '').toLowerCase();
  if (!text) return 'Unknown / not sure';

  if (/schema|table|column|field|database|migration|etl|payload|data model/.test(text)) {
    return 'Schema or data change';
  }
  if (/integrat|api|webhook|partner|third[- ]?party|connector|sftp/.test(text)) {
    return 'New integration or connection';
  }
  if (/config|toggle|flag|setting|rule|parameter/.test(text)) {
    return 'Configuration change only';
  }
  if (/new feature|build|create|launch|new capability|greenfield/.test(text)) {
    return 'New build / net new capability';
  }
  if (/existing|modify|update|change/.test(text)) {
    return 'Existing integration change';
  }

  return 'Unknown / not sure';
}

function fallbackQuestions(ideaText) {
  const text = (ideaText || '').trim();
  const about = text ? ` for "${text.slice(0, 120)}${text.length > 120 ? '...' : ''}"` : '';
  return [
    `Who is the primary user impacted${about}, and what outcome should improve for them?`,
    'Which specific systems, services, and data objects are in scope for this change?',
    'What is explicitly out of scope for this first release?',
    'What constraints matter most (deadline, compliance, dependencies, or resourcing)?',
    'How will we measure success after release (metrics, threshold, and timeline)?',
  ];
}

function parseBrainstormResponse(text, ideaText) {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Find a known change type anywhere in the response.
  let changeType = '';
  for (const type of CHANGE_TYPES) {
    const re = new RegExp(type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(raw)) {
      changeType = type;
      break;
    }
  }

  // Collect candidate questions from numbered lines, bullets, or any line ending in '?'.
  const candidates = [];
  for (const line of lines) {
    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    const bulleted = line.match(/^[-*]\s+(.+)/);
    const fromPattern = numbered?.[1] || bulleted?.[1] || line;
    const cleaned = fromPattern
      .replace(/^clarifying questions:?/i, '')
      .replace(/^change type:?/i, '')
      .trim();

    if (!cleaned) continue;
    if (/\?$/.test(cleaned)) {
      candidates.push(cleaned);
      continue;
    }
    if (numbered || bulleted) {
      candidates.push(cleaned.endsWith('?') ? cleaned : `${cleaned}?`);
    }
  }

  // De-duplicate and keep at most 5 useful-looking questions.
  const deduped = [];
  const seen = new Set();
  for (const q of candidates) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(q);
    if (deduped.length === 5) break;
  }

  const questions = deduped.length >= 3
    ? deduped.slice(0, 5)
    : fallbackQuestions(ideaText);

  return {
    changeType: changeType || inferChangeTypeFromIdea(ideaText),
    questions,
  };
}

function renderQuestions(questions) {
  const container = document.getElementById('questions-list');
  container.innerHTML = '';
  prebriefQuestions = questions;

  questions.forEach((q, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'question-item';

    const label = document.createElement('label');
    label.className = 'question-label';
    label.htmlFor = `q-${i}`;
    label.textContent = q;

    const input = document.createElement('textarea');
    input.id = `q-${i}`;
    input.className = 'question-answer';
    input.rows = 2;
    input.placeholder = 'Your answer…';

    wrap.appendChild(label);
    wrap.appendChild(input);
    container.appendChild(wrap);
  });
}

async function handlePreBrief() {
  const input = document.getElementById('prebrief-input').value.trim();
  if (!input) return;

  const btn      = document.getElementById('prebrief-btn');
  const spinner  = document.getElementById('prebrief-spinner');
  const status   = document.getElementById('prebrief-status');
  const qSection = document.getElementById('questions-section');

  btn.disabled = true;
  spinner.classList.add('visible');
  status.textContent = 'Thinking…';
  qSection.hidden = true;

  try {
    const response = await fetch('/api/brainstorm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const { changeType, questions } = parseBrainstormResponse(data.text, input);

    document.getElementById('suggested-type').textContent = changeType || 'Unknown / not sure';
    renderQuestions(questions);
    qSection.hidden = false;
    status.textContent = '';
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
    console.error(err);
  } finally {
    btn.disabled = false;
    spinner.classList.remove('visible');
  }
}

function handleBuildBrief() {
  const roughIdea = document.getElementById('prebrief-input').value.trim();
  const answers = prebriefQuestions.map((q, i) => {
    const val = document.getElementById(`q-${i}`)?.value.trim();
    return val ? `${q}\n${val}` : null;
  }).filter(Boolean);

  // Pre-select nature radio if suggested type matches one of the options
  const suggested = document.getElementById('suggested-type').textContent;
  document.querySelectorAll('input[name="nature"]').forEach(radio => {
    if (radio.value.toLowerCase() === suggested.toLowerCase()) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    }
  });

  // Compose the full brief text
  const brief = [
    roughIdea,
    answers.length ? '\nAdditional context from pre-brief:\n' + answers.join('\n\n') : '',
  ].join('\n').trim();

  document.getElementById('input').value = brief;
  setMode('analyze');
  document.getElementById('input').focus();
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTION_HEADERS = [
  'COMPLEXITY BREAKDOWN',
  'WHAT IS GENUINELY UNCERTAIN',
  'QUESTIONS TO TAKE INTO ENGINEERING',
  'RECOMMENDED ACTION',
];

const ACTION_BADGES = {
  'PROCEED TO ENGINEERING': 'badge-green',
  'REQUEST MORE DETAIL FIRST': 'badge-amber',
  'FLAG FOR SCRUTINY': 'badge-red',
};

const DIMENSIONS = [
  'TOKENISATION LAYER',
  'SCHEME INVOLVEMENT',
  'REGULATORY AND MANDATE SCOPE',
  'PCI SCOPE',
  'INTEGRATION SURFACE',
  'THIRD PARTY DEPENDENCIES',
  'LEGAL AND CONTRACTUAL EXPOSURE',
  'DOWNSTREAM CONSUMERS',
  'ONBOARDING AND MERCHANT IMPACT',
  'TESTING ENVIRONMENT CONSTRAINTS',
  'DATA MIGRATION OR STATE RISK',
  'CONTRACT-DRIVEN DEVELOPMENT AND CROSS-TEAM DEPENDENCIES',
];

const RATING_CLASS = {
  HIGH: 'rating-high',
  MEDIUM: 'rating-medium',
  LOW: 'rating-low',
  UNKNOWN: 'rating-unknown',
};

// ─── Markdown helpers ─────────────────────────────────────────────────────────

function stripAsterisks(text) {
  return text.replace(/\*/g, '');
}

function renderMarkdown(text) {
  // Explicitly convert **bold** before marked sees it — avoids context-dependent failures
  const withBold = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Strip markdown table rows and separator lines
  const noTables = withBold
    .split('\n')
    .filter(line => !/^\s*\|/.test(line) && !/^\s*[-:|\s]{2,}$/.test(line))
    .join('\n');
  return marked.parse(noTables);
}

// ─── State ───────────────────────────────────────────────────────────────────

let latestAnalysisText = '';
let latestRenderedSections = [];

// ─── Parsing ─────────────────────────────────────────────────────────────────

function parseResponse(text) {
  const sections = [];
  const upper = text.toUpperCase();

  for (let i = 0; i < SECTION_HEADERS.length; i++) {
    const header = SECTION_HEADERS[i];
    const start = upper.indexOf(header);
    if (start === -1) continue;
    let end = text.length;
    for (let j = i + 1; j < SECTION_HEADERS.length; j++) {
      const next = upper.indexOf(SECTION_HEADERS[j], start + header.length);
      if (next !== -1 && next < end) end = next;
    }
    sections.push({ header, content: text.slice(start + header.length, end).trim() });
  }
  return sections;
}

function extractSections(text) {
  return parseResponse(text);
}

function parseDimensions(text) {
  const upper = text.toUpperCase();
  const dims = [];

  for (let i = 0; i < DIMENSIONS.length; i++) {
    const name = DIMENSIONS[i];
    const nameIdx = upper.indexOf(name);
    if (nameIdx === -1) continue;

    let contentEnd = text.length;
    for (let j = i + 1; j < DIMENSIONS.length; j++) {
      const next = upper.indexOf(DIMENSIONS[j], nameIdx + name.length);
      if (next !== -1 && next < contentEnd) contentEnd = next;
    }

    const dimText = text.slice(nameIdx + name.length, contentEnd);

    const ratingMatch = /\b(LOW|MEDIUM|HIGH|UNKNOWN)\b/.exec(dimText);
    const rating = ratingMatch ? ratingMatch[1] : 'UNKNOWN';

    const afterRating = ratingMatch
      ? dimText.slice(ratingMatch.index + ratingMatch[0].length)
      : '';
    const confMatch = /\b(HIGH|MEDIUM|LOW)\b/.exec(afterRating);
    const confidence = confMatch ? confMatch[1] : null;

    // Body = everything after the line containing the rating
    let body = dimText.trim();
    if (ratingMatch) {
      const ratingLineEnd = dimText.indexOf('\n', ratingMatch.index);
      if (ratingLineEnd !== -1) body = dimText.slice(ratingLineEnd).trim();
    }

    dims.push({ name, rating, confidence, body });
  }

  return dims;
}

// ─── Element helper ───────────────────────────────────────────────────────────

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderOutput(text, container) {
  const sections = extractSections(text);
  container.innerHTML = '';
  latestAnalysisText = text;
  latestRenderedSections = sections;
  setDownloadState(true);

  if (!sections.length) {
    const body = el('div', 'section-body');
    body.innerHTML = renderMarkdown(text);
    container.appendChild(body);
    return;
  }

  const sectionMap = Object.fromEntries(sections.map(s => [s.header, s.content]));

  if (sectionMap['RECOMMENDED ACTION']) {
    container.appendChild(renderRecommendedAction(sectionMap['RECOMMENDED ACTION']));
  }

  if (sectionMap['COMPLEXITY BREAKDOWN']) {
    const dims = parseDimensions(sectionMap['COMPLEXITY BREAKDOWN']);

    if (dims.length) {
      container.appendChild(renderDimGrid(dims));
    } else {
      // Fallback: plain render if dimensions couldn't be parsed
      const fb = el('div', 'section-body');
      fb.innerHTML = renderMarkdown(sectionMap['COMPLEXITY BREAKDOWN']);
      container.appendChild(fb);
    }
  }

  ['WHAT IS GENUINELY UNCERTAIN', 'QUESTIONS TO TAKE INTO ENGINEERING'].forEach(header => {
    if (sectionMap[header]) {
      container.appendChild(renderCollapsible(header, sectionMap[header]));
    }
  });
}

function renderRecommendedAction(content) {
  const wrap = el('div', 'result-action');

  let explanation = content;
  for (const [action, cls] of Object.entries(ACTION_BADGES)) {
    if (content.includes(action)) {
      const badge = el('div', `badge badge-lg ${cls}`, action);
      wrap.appendChild(badge);
      explanation = content.replace(action, '').replace(/^[\s\n\-–:]+/, '').trim();
      break;
    }
  }

  if (explanation) {
    const p = el('p', 'result-action-text');
    p.innerHTML = marked.parse(stripAsterisks(explanation));
    wrap.appendChild(p);
  }

  return wrap;
}


function renderDimGrid(dims) {
  const section = el('div', 'dim-section');
  section.appendChild(el('div', 'subsection-label', 'Complexity Breakdown'));

  const grid = el('div', 'dim-grid');
  dims.forEach(({ name, rating, confidence, body }) => {
    grid.appendChild(createDimCard(name, rating, confidence, body));
  });

  section.appendChild(grid);
  return section;
}

function createDimCard(name, rating, confidence, body) {
  const card = el('div', 'dim-card');

  card.appendChild(el('div', 'dim-name', name));

  const meta = el('div', 'dim-meta');
  meta.appendChild(el('span', `rating-badge ${RATING_CLASS[rating] || 'rating-unknown'}`, rating));
  if (confidence) {
    meta.appendChild(el('span', 'dim-confidence', `Confidence: ${confidence}`));
  }
  card.appendChild(meta);

  const bodyWrap = el('div', 'dim-body');
  const bodyText = el('div', 'dim-body-text');
  bodyText.innerHTML = body ? renderMarkdown(body) : '';
  bodyWrap.appendChild(bodyText);

  const readMoreBtn = el('button', 'read-more-btn', 'Read more');
  readMoreBtn.type = 'button';
  bodyWrap.appendChild(readMoreBtn);
  card.appendChild(bodyWrap);

  readMoreBtn.addEventListener('click', () => {
    const expanded = bodyText.classList.toggle('expanded');
    readMoreBtn.textContent = expanded ? 'Read less' : 'Read more';
  });

  requestAnimationFrame(() => {
    if (bodyText.scrollHeight <= bodyText.clientHeight + 2) {
      readMoreBtn.hidden = true;
    }
  });

  return card;
}

function renderCollapsible(header, content) {
  const details = document.createElement('details');
  details.className = 'collapsible-section';
  details.open = true;

  const summary = document.createElement('summary');
  summary.textContent = header;
  details.appendChild(summary);

  const body = el('div', 'collapsible-body');
  body.innerHTML = renderMarkdown(content);
  details.appendChild(body);

  return details;
}

function renderError(message, container) {
  container.innerHTML = '';
  latestAnalysisText = '';
  latestRenderedSections = [];
  setDownloadState(false);
  container.appendChild(el('div', 'section-error', message));
}

// ─── Download ─────────────────────────────────────────────────────────────────

function setDownloadState(enabled) {
  const btn = document.getElementById('download-btn');
  if (!btn) return;
  btn.hidden = !enabled;
  btn.disabled = !enabled;
}

function buildDownloadText(text, sections) {
  if (!sections.length) return text.trim();
  const lines = ['PM Brainstorm Analysis', ''];
  sections.forEach(({ header, content }) => {
    lines.push(header, '-'.repeat(header.length), '', content.trim(), '');
  });
  return lines.join('\n').trim();
}

function downloadReport() {
  if (!latestAnalysisText) return;
  const reportText = buildDownloadText(latestAnalysisText, latestRenderedSections);
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pm-brainstorm-analysis.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function handleSubmit() {
  const input = document.getElementById('input').value.trim();
  if (!input) return;

  const selectedNature = document.querySelector('input[name="nature"]:checked');
  const naturePrefix = selectedNature
    ? `Nature of change: ${selectedNature.value}\n\n`
    : '';

  const btn = document.getElementById('submit-btn');
  const spinner = document.getElementById('spinner');
  const statusText = document.getElementById('status-text');
  const outputSection = document.getElementById('output-section');
  const output = document.getElementById('output');

  btn.disabled = true;
  spinner.classList.add('visible');
  statusText.textContent = 'Analyzing…';
  outputSection.classList.remove('visible');

  try {
    const result = await analyze(naturePrefix + input);
    renderOutput(result, output);
    outputSection.classList.add('visible');
    statusText.textContent = '';
  } catch (err) {
    renderError(`Error: ${err.message}`, output);
    outputSection.classList.add('visible');
    statusText.textContent = 'Request failed.';
    console.error(err);
  } finally {
    btn.disabled = false;
    spinner.classList.remove('visible');
  }
}

async function analyze(text) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

// ─── Events ───────────────────────────────────────────────────────────────────

document.getElementById('input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
});

document.getElementById('download-btn').addEventListener('click', downloadReport);

document.querySelectorAll('input[name="nature"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const warning = document.getElementById('nature-warning');
    warning.hidden = radio.value !== 'Unknown / not sure';
  });
});

document.getElementById('mode-brainstorm').addEventListener('click', () => setMode('brainstorm'));
document.getElementById('mode-analyze').addEventListener('click', () => setMode('analyze'));
