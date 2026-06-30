// ─── Mode toggle ─────────────────────────────────────────────────────────────

function setMode(mode) {
  const prebriefPanel = document.getElementById('prebrief-panel');
  const analyzePanel  = document.getElementById('analyze-panel');
  const deliverablesPanel = document.getElementById('deliverables-panel');
  const researchPanel = document.getElementById('research-panel');
  const btnBrainstorm = document.getElementById('mode-brainstorm');
  const btnAnalyze    = document.getElementById('mode-analyze');
  const btnDeliverables = document.getElementById('mode-deliverables');
  const btnResearch = document.getElementById('mode-research');
  const outputSection = document.getElementById('output-section');
  const output = document.getElementById('output');

  setOutputContext(mode);

  if (mode === 'brainstorm') {
    latestReportType = 'analysis';
    prebriefPanel.hidden = false;
    analyzePanel.hidden  = true;
    deliverablesPanel.hidden = true;
    researchPanel.hidden = true;
    btnBrainstorm.classList.add('active');
    btnAnalyze.classList.remove('active');
    btnDeliverables.classList.remove('active');
    btnResearch.classList.remove('active');
    output.innerHTML = '';
    outputSection.classList.remove('visible');
  } else if (mode === 'deliverables') {
    latestReportType = 'deliverables';
    prebriefPanel.hidden = true;
    analyzePanel.hidden  = true;
    deliverablesPanel.hidden = false;
    researchPanel.hidden = true;
    btnBrainstorm.classList.remove('active');
    btnAnalyze.classList.remove('active');
    btnDeliverables.classList.add('active');
    btnResearch.classList.remove('active');
    if (latestDeliverablesResponse) {
      renderDeliverablesOutput(latestDeliverablesResponse, output);
      outputSection.classList.add('visible');
    } else {
      output.innerHTML = '';
      outputSection.classList.remove('visible');
      setDownloadState(false);
    }
  } else if (mode === 'research') {
    latestReportType = 'research';
    prebriefPanel.hidden = true;
    analyzePanel.hidden  = true;
    deliverablesPanel.hidden = true;
    researchPanel.hidden = false;
    btnBrainstorm.classList.remove('active');
    btnAnalyze.classList.remove('active');
    btnDeliverables.classList.remove('active');
    btnResearch.classList.add('active');
    const researchInput = document.getElementById('research-input');
    const researchFocus = document.getElementById('research-focus');
    const researchStatus = document.getElementById('research-status');

    if (researchInput) researchInput.value = '';
    if (researchFocus) researchFocus.value = '';
    if (researchStatus) researchStatus.textContent = '';

    output.innerHTML = '';
    outputSection.classList.remove('visible');
    setDownloadState(false);
  } else {
    latestReportType = 'analysis';
    prebriefPanel.hidden = true;
    analyzePanel.hidden  = false;
    deliverablesPanel.hidden = true;
    researchPanel.hidden = true;
    btnBrainstorm.classList.remove('active');
    btnAnalyze.classList.add('active');
    btnDeliverables.classList.remove('active');
    btnResearch.classList.remove('active');
    if (latestFullAnalysisResponse) {
      renderOutput(
        latestFullAnalysisResponse,
        output,
        latestFullAnalysisBrief,
        latestFullAnalysisNature
      );
      outputSection.classList.add('visible');
    } else {
      output.innerHTML = '';
      outputSection.classList.remove('visible');
      setDownloadState(false);
    }
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
  const extraInfo = document.getElementById('prebrief-extra')?.value.trim() || '';
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
    extraInfo ? `\nAny other relevant info:\n${extraInfo}` : '',
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

const DELIVERABLE_HEADERS = ['DELIVERABLES', 'BUILD ELEMENTS', 'OUTCOMES'];
const RESEARCH_HEADERS = [
  'WHAT SHOULD BE RESEARCHED EXTERNALLY',
  'WHY THIS MATTERS',
  'SUGGESTED SOURCES',
  'ASSUMPTIONS TO CHALLENGE',
  'NEXT VALIDATION QUESTIONS',
];

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
  const html = marked.parse(noTables);
  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll('a').forEach((anchor) => {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  });

  return template.innerHTML;
}

// ─── State ───────────────────────────────────────────────────────────────────

let latestAnalysisText = '';
let latestRenderedSections = [];
let latestReportType = 'analysis';
let latestFullAnalysisResponse = '';
let latestFullAnalysisBrief = '';
let latestFullAnalysisNature = '';
let latestDeliverablesResponse = '';
let latestResearchResponse = '';

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

function parseNamedSections(text, headers) {
  const sections = [];
  const upper = text.toUpperCase();

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const start = upper.indexOf(header);
    if (start === -1) continue;

    let end = text.length;
    for (let j = 0; j < headers.length; j++) {
      if (j === i) continue;
      const next = upper.indexOf(headers[j], start + header.length);
      if (next !== -1 && next < end) end = next;
    }

    sections.push({ header, content: text.slice(start + header.length, end).trim() });
  }

  return sections;
}

function extractSections(text) {
  return parseResponse(text);
}

function extractDeliverableSections(text) {
  return parseNamedSections(text, DELIVERABLE_HEADERS);
}

function extractResearchSections(text) {
  return parseNamedSections(text, RESEARCH_HEADERS);
}

function normalizeDeliverableLine(line) {
  const cleaned = line
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const fullPattern = /as\s+(.+?)\s*,?\s*i\s+want\s+(.+?)\s*,?\s*so\s+that\s+(.+)/i;
  const fullMatch = cleaned.match(fullPattern);
  if (fullMatch) {
    return `AS ${fullMatch[1].trim()} I want ${fullMatch[2].trim()} So that ${fullMatch[3].trim()}`;
  }

  const soThatPattern = /(.+?)\s+so\s+that\s+(.+)/i;
  const soThatMatch = cleaned.match(soThatPattern);
  if (soThatMatch) {
    const wantPart = soThatMatch[1].replace(/^as\s+.+?\s+i\s+want\s+/i, '').trim();
    const outcomePart = soThatMatch[2].trim();
    return `AS stakeholder I want ${wantPart} So that ${outcomePart}`;
  }

  return `AS stakeholder I want ${cleaned} So that we deliver a clear user outcome.`;
}

function parseDeliverableLines(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !/^deliverables:?$/i.test(line));

  const candidates = lines.filter(line => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line));
  const source = candidates.length ? candidates : lines;

  return source
    .map(normalizeDeliverableLine)
    .filter(Boolean);
}

function parseBulletLines(text, sectionHeader) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !new RegExp(`^${sectionHeader}:?$`, 'i').test(line));

  const bullets = lines
    .filter(line => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line))
    .map(line => line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter(Boolean);

  return bullets.length ? bullets : lines;
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

function extractTitledSection(text, title) {
  const lines = String(text || '').split(/\r?\n/);
  const upperTitle = title.toUpperCase();
  const startIdx = lines.findIndex(line => line.trim().toUpperCase() === upperTitle);
  if (startIdx === -1) return '';

  const collected = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^[A-Z][A-Z0-9\s/&()\-]{3,}$/.test(trimmed) && trimmed !== upperTitle) break;
    collected.push(lines[i]);
  }

  return collected.join('\n').trim();
}

function extractBriefUnderstanding(text) {
  const candidates = [
    'BRIEF UNDERSTANDING',
    'UNDERSTANDING OF BRIEF',
    'BRIEF SUMMARY',
  ];

  for (const title of candidates) {
    const content = extractTitledSection(text, title);
    if (content) return content;
  }

  return '';
}

function buildBriefUnderstandingFromInput(inputBrief, natureOfChange) {
  const raw = String(inputBrief || '').trim();
  if (!raw) return '';

  return raw;
}

// ─── Element helper ───────────────────────────────────────────────────────────

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function setOutputContext(mode) {
  const contextEl = document.getElementById('output-context');
  if (!contextEl) return;

  const labels = {
    brainstorm: 'Showing: Pre-brief',
    analyze: 'Showing: Full Analysis',
    deliverables: 'Showing: Deliverables',
    research: 'Showing: Research',
  };

  contextEl.textContent = labels[mode] || 'Showing: Output';
  contextEl.classList.remove('mode-prebrief', 'mode-analyze', 'mode-deliverables', 'mode-research');
  if (mode === 'brainstorm') {
    contextEl.classList.add('mode-prebrief');
  } else if (mode === 'analyze') {
    contextEl.classList.add('mode-analyze');
  } else if (mode === 'deliverables') {
    contextEl.classList.add('mode-deliverables');
  } else if (mode === 'research') {
    contextEl.classList.add('mode-research');
  }
  contextEl.hidden = false;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderOutput(text, container, submittedBrief = '', natureOfChange = '') {
  setOutputContext('analyze');
  const sections = extractSections(text);
  container.innerHTML = '';
  latestAnalysisText = text;
  latestRenderedSections = sections;
  latestReportType = 'analysis';
  setDownloadState(true);

  if (!sections.length) {
    const body = el('div', 'section-body');
    body.innerHTML = renderMarkdown(text);
    container.appendChild(body);
    return;
  }

  const sectionMap = Object.fromEntries(sections.map(s => [s.header, s.content]));
  const briefUnderstanding = buildBriefUnderstandingFromInput(submittedBrief, natureOfChange);

  if (briefUnderstanding) {
    container.appendChild(renderBriefUnderstanding(briefUnderstanding));
  }

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

  if (shouldRecommendResearch(sectionMap)) {
    container.appendChild(renderResearchRecommendation(sectionMap));
  }
}

function countSignalLines(text) {
  if (!text) return 0;
  const lines = String(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const bulletCount = lines.filter(line => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)).length;
  return bulletCount || lines.length;
}

function shouldRecommendResearch(sectionMap) {
  const uncertainty = sectionMap['WHAT IS GENUINELY UNCERTAIN'] || '';
  if (!uncertainty) return false;

  const signalCount = countSignalLines(uncertainty);
  const hasGapSignals = /(BRIEF GAP|UNKNOWN|PM DECISION)/i.test(uncertainty);
  return signalCount >= 3 || hasGapSignals;
}

function renderResearchRecommendation(sectionMap) {
  const card = el('div', 'research-recommendation');
  card.appendChild(el('div', 'subsection-label', 'Recommended Next Step'));

  const text = el('p', 'research-recommendation-text',
    'Uncertainty is high enough that external validation could improve decision quality before locking scope.');
  card.appendChild(text);

  const button = el('button', 'research-recommendation-btn', 'Run Research Next');
  button.type = 'button';
  button.addEventListener('click', () => {
    setMode('research');
    document.getElementById('research-input')?.focus();
  });

  card.appendChild(button);
  return card;
}

function renderDeliverablesOutput(text, container) {
  setOutputContext('deliverables');
  const sections = extractDeliverableSections(text);
  container.innerHTML = '';
  latestAnalysisText = text;
  latestRenderedSections = sections;
  latestReportType = 'deliverables';
  setDownloadState(true);

  if (!sections.length) {
    const body = el('div', 'section-body');
    body.innerHTML = renderMarkdown(text);
    container.appendChild(body);
    return;
  }

  const sectionMap = Object.fromEntries(sections.map(s => [s.header, s.content]));
  const deliverables = parseDeliverableLines(sectionMap['DELIVERABLES'] || '');
  const buildElements = parseBulletLines(sectionMap['BUILD ELEMENTS'] || '', 'BUILD ELEMENTS');
  const outcomes = parseBulletLines(sectionMap['OUTCOMES'] || '', 'OUTCOMES');

  if (!deliverables.length) {
    const fallback = el('div', 'section-body');
    fallback.innerHTML = renderMarkdown(text);
    container.appendChild(fallback);
    return;
  }

  const wrap = el('div', 'deliverables-linked');
  wrap.appendChild(el('div', 'subsection-label', 'Linked Deliverables'));

  const list = el('div', 'deliverables-linked-list');

  deliverables.forEach((deliverable, index) => {
    const card = el('div', 'deliverable-linked-card');

    const title = el('div', 'deliverable-linked-title', `Deliverable ${index + 1}`);
    card.appendChild(title);
    card.appendChild(el('p', 'deliverable-linked-statement', deliverable));

    const buildHeading = el('div', 'deliverable-linked-heading', 'Build Elements');
    card.appendChild(buildHeading);
    const buildList = el('ul', 'deliverable-linked-bullets');
    const buildItemText = buildElements[index] || 'TBD - define build elements for this deliverable.';
    buildList.appendChild(el('li', '', buildItemText));
    card.appendChild(buildList);

    const outcomesHeading = el('div', 'deliverable-linked-heading', 'Outcomes');
    card.appendChild(outcomesHeading);
    const outcomesList = el('ul', 'deliverable-linked-bullets');
    const outcomeItemText = outcomes[index] || 'TBD - define measurable outcome for this deliverable.';
    outcomesList.appendChild(el('li', '', outcomeItemText));
    card.appendChild(outcomesList);

    list.appendChild(card);
  });

  wrap.appendChild(list);
  container.appendChild(wrap);
}

function renderResearchOutput(text, container) {
  setOutputContext('research');
  const sections = extractResearchSections(text);
  container.innerHTML = '';
  latestAnalysisText = text;
  latestRenderedSections = sections;
  latestReportType = 'research';
  setDownloadState(true);

  if (!sections.length) {
    const body = el('div', 'section-body');
    body.innerHTML = renderMarkdown(text);
    container.appendChild(body);
    return;
  }

  const headingMap = {
    'WHAT SHOULD BE RESEARCHED EXTERNALLY': 'What Should Be Researched Externally',
    'WHY THIS MATTERS': 'Why This Matters',
    'SUGGESTED SOURCES': 'Suggested Sources',
    'ASSUMPTIONS TO CHALLENGE': 'Assumptions to Challenge',
    'NEXT VALIDATION QUESTIONS': 'Next Validation Questions',
  };

  const wrap = el('div', 'research-section');
  sections.forEach(({ header, content }) => {
    wrap.appendChild(renderCollapsible(headingMap[header] || header, content));
  });
  container.appendChild(wrap);
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBriefUnderstandingText(content) {
  return String(content || '')
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      const escaped = escapeHtml(line);

      if (/^additional context from pre-brief:?$/i.test(trimmed)) {
        return `<strong class="brief-line-heading">${escaped}</strong>`;
      }

      if (/\?$/.test(trimmed)) {
        return `<strong class="brief-line-question">${escaped}</strong>`;
      }

      return escaped;
    })
    .join('\n');
}

function renderBriefUnderstanding(content) {
  const wrap = el('div', 'brief-understanding');
  wrap.appendChild(el('div', 'subsection-label', 'Brief Understanding'));

  const body = el('div', 'brief-understanding-body');
  body.innerHTML = formatBriefUnderstandingText(content);
  wrap.appendChild(body);

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
  latestReportType = 'analysis';
  setDownloadState(false);
  container.appendChild(el('div', 'section-error', message));
}

// ─── Download ─────────────────────────────────────────────────────────────────

function setDownloadState(enabled) {
  const btn = document.getElementById('download-btn');
  const htmlBtn = document.getElementById('download-html-btn');
  if (!btn || !htmlBtn) return;

  if (enabled) {
    if (latestReportType === 'deliverables') {
      btn.textContent = 'Download deliverables';
    } else if (latestReportType === 'research') {
      btn.textContent = 'Download research';
    } else {
      btn.textContent = 'Download TXT';
    }
  } else {
    btn.textContent = 'Download TXT';
  }

  btn.hidden = !enabled;
  btn.disabled = !enabled;
  htmlBtn.hidden = !enabled;
  htmlBtn.disabled = !enabled;
}

function buildDownloadText(text, sections) {
  const titleMap = {
    analysis: 'PM Brainstorm Analysis',
    deliverables: 'PM Brainstorm Deliverables',
    research: 'PM Brainstorm Research',
  };
  const title = titleMap[latestReportType] || 'PM Brainstorm Report';
  const lines = [`# ${title}`, ''];

  if (latestReportType === 'analysis' && latestFullAnalysisBrief) {
    lines.push('## Brief Understanding', '', latestFullAnalysisBrief.trim(), '');
  }

  if (!sections.length) {
    lines.push(text.trim());
    return lines.join('\n').trim();
  }

  sections.forEach(({ header, content }) => {
    lines.push(`## ${header}`, '', (content || '').trim(), '');
  });

  return lines.join('\n').trim();
}

function buildDownloadHtml(text, sections, options = {}) {
  const { autoPrint = false } = options;
  const titleMap = {
    analysis: 'PM Brainstorm Analysis',
    deliverables: 'PM Brainstorm Deliverables',
    research: 'PM Brainstorm Research',
  };
  const title = titleMap[latestReportType] || 'PM Brainstorm Report';
  const generatedAt = new Date().toLocaleString();

  let bodySections = '';

  if (latestReportType === 'analysis' && latestFullAnalysisBrief) {
    bodySections += `
      <section class="card">
        <h2>Brief Understanding</h2>
        <pre>${escapeHtml(latestFullAnalysisBrief)}</pre>
      </section>
    `;
  }

  if (sections.length) {
    bodySections += sections.map(({ header, content }) => `
      <section class="card">
        <h2>${escapeHtml(header)}</h2>
        <div class="content">${renderMarkdown(content || '')}</div>
      </section>
    `).join('');
  } else {
    bodySections += `
      <section class="card">
        <h2>Output</h2>
        <div class="content">${renderMarkdown(text || '')}</div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f6fb;
      --ink: #0f172a;
      --muted: #475569;
      --card: #ffffff;
      --border: #e2e8f0;
      --accent: #0f766e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      background: linear-gradient(180deg, #f8fafc, var(--bg));
      font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      color: var(--ink);
      line-height: 1.65;
    }
    .container {
      max-width: 980px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      margin: 0;
      font-size: 1.65rem;
      letter-spacing: -0.02em;
    }
    .meta {
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .badge {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 10px;
      font-size: 0.75rem;
      border-radius: 999px;
      color: #fff;
      background: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
      margin: 0 0 12px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
      break-inside: avoid;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 0.88rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #334155;
    }
    .content p { margin: 0 0 0.6em; }
    .content p:last-child { margin-bottom: 0; }
    .content ul, .content ol { margin: 0.2em 0 0.8em; padding-left: 1.2em; }
    .content li { margin-bottom: 0.25em; }
    .content a { color: #0369a1; text-decoration: underline; }
    pre {
      margin: 0;
      padding: 10px 12px;
      white-space: pre-wrap;
      word-break: break-word;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-family: inherit;
      font-size: 0.93rem;
      color: #1e293b;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .container {
        max-width: 100%;
      }
      .card {
        box-shadow: none;
        border-color: #d1d5db;
      }
      a {
        color: #0f172a;
        text-decoration: none;
      }
    }
  </style>
</head>
<body>
  <main class="container">
    <header class="header">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">Generated ${escapeHtml(generatedAt)}<span class="badge">${escapeHtml(latestReportType)}</span></div>
    </header>
    ${bodySections}
  </main>
  ${autoPrint ? `<script>
    window.addEventListener('load', () => {
      window.print();
    });
  </script>` : ''}
</body>
</html>`;
}

function downloadReport() {
  if (!latestAnalysisText) return;
  const reportText = buildDownloadText(latestAnalysisText, latestRenderedSections);
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  if (latestReportType === 'deliverables') {
    link.download = 'pm-brainstorm-deliverables.txt';
  } else if (latestReportType === 'research') {
    link.download = 'pm-brainstorm-research.txt';
  } else {
    link.download = 'pm-brainstorm-analysis.txt';
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadHtmlReport() {
  if (!latestAnalysisText) return;

  const reportHtml = buildDownloadHtml(latestAnalysisText, latestRenderedSections, { autoPrint: false });
  const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  if (latestReportType === 'deliverables') {
    link.download = 'pm-brainstorm-deliverables.html';
  } else if (latestReportType === 'research') {
    link.download = 'pm-brainstorm-research.html';
  } else {
    link.download = 'pm-brainstorm-analysis.html';
  }
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
  const selectedNatureValue = selectedNature?.value || '';
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
    latestFullAnalysisResponse = result;
    latestFullAnalysisBrief = input;
    latestFullAnalysisNature = selectedNatureValue;
    renderOutput(result, output, input, selectedNatureValue);
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

async function handleDeliverablesSubmit() {
  const input = document.getElementById('deliverables-input').value.trim();
  if (!input) return;

  const btn = document.getElementById('deliverables-btn');
  const spinner = document.getElementById('deliverables-spinner');
  const statusText = document.getElementById('deliverables-status');
  const outputSection = document.getElementById('output-section');
  const output = document.getElementById('output');

  btn.disabled = true;
  spinner.classList.add('visible');
  statusText.textContent = 'Building deliverables…';
  outputSection.classList.remove('visible');

  try {
    const result = await buildDeliverables(input);
    latestDeliverablesResponse = result;
    renderDeliverablesOutput(result, output);
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

async function handleResearchSubmit() {
  const brief = document.getElementById('research-input').value.trim();
  if (!brief) return;

  const focus = document.getElementById('research-focus').value.trim();
  const text = focus
    ? `${brief}\n\nResearch focus:\n${focus}`
    : brief;

  const btn = document.getElementById('research-btn');
  const spinner = document.getElementById('research-spinner');
  const statusText = document.getElementById('research-status');
  const outputSection = document.getElementById('output-section');
  const output = document.getElementById('output');

  btn.disabled = true;
  spinner.classList.add('visible');
  statusText.textContent = 'Researching…';
  outputSection.classList.remove('visible');

  try {
    const result = await buildResearch(text);
    latestResearchResponse = result;
    renderResearchOutput(result, output);
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

async function buildDeliverables(text) {
  const response = await fetch('/api/deliverables', {
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

async function buildResearch(text) {
  const response = await fetch('/api/research', {
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

document.getElementById('deliverables-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDeliverablesSubmit();
});

document.getElementById('research-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleResearchSubmit();
});

document.getElementById('research-focus').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleResearchSubmit();
});

document.getElementById('download-btn').addEventListener('click', downloadReport);
document.getElementById('download-html-btn').addEventListener('click', downloadHtmlReport);

document.querySelectorAll('input[name="nature"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const warning = document.getElementById('nature-warning');
    warning.hidden = radio.value !== 'Unknown / not sure';
  });
});

document.getElementById('mode-brainstorm').addEventListener('click', () => setMode('brainstorm'));
document.getElementById('mode-analyze').addEventListener('click', () => setMode('analyze'));
document.getElementById('mode-deliverables').addEventListener('click', () => setMode('deliverables'));
document.getElementById('mode-research').addEventListener('click', () => setMode('research'));
