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
