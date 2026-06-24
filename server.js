const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const API_KEY = process.env.ANTHROPIC_API_KEY;
const ROOT = __dirname;
const SYSTEM_PROMPT_PATH = process.env.SYSTEM_PROMPT_PATH || path.join(ROOT, 'system-prompt.txt');
const FLOWS_PATH = process.env.FLOWS_PATH || path.join(ROOT, 'flows.txt');
const BRAINSTORM_PROMPT_PATH = path.join(ROOT, 'brainstorm-prompt.txt');
const DELIVERABLES_PROMPT_PATH = path.join(ROOT, 'deliverables-prompt.txt');
const RESEARCH_PROMPT_PATH = path.join(ROOT, 'research-prompt.txt');

let SYSTEM_PROMPT = '';
try {
  SYSTEM_PROMPT = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
} catch (err) {
  console.warn(`Warning: failed to load system prompt from ${SYSTEM_PROMPT_PATH}: ${err.message}`);
}

let FLOWS = '';
try {
  FLOWS = fs.readFileSync(FLOWS_PATH, 'utf-8');
} catch (err) {
  console.warn(`Warning: failed to load flows from ${FLOWS_PATH}: ${err.message}`);
}

let BRAINSTORM_PROMPT = '';
try {
  BRAINSTORM_PROMPT = fs.readFileSync(BRAINSTORM_PROMPT_PATH, 'utf-8');
} catch (err) {
  console.warn(`Warning: failed to load brainstorm prompt from ${BRAINSTORM_PROMPT_PATH}: ${err.message}`);
}

let DELIVERABLES_PROMPT = '';
try {
  DELIVERABLES_PROMPT = fs.readFileSync(DELIVERABLES_PROMPT_PATH, 'utf-8');
} catch (err) {
  console.warn(`Warning: failed to load deliverables prompt from ${DELIVERABLES_PROMPT_PATH}: ${err.message}`);
}

let RESEARCH_PROMPT = '';
try {
  RESEARCH_PROMPT = fs.readFileSync(RESEARCH_PROMPT_PATH, 'utf-8');
} catch (err) {
  console.warn(`Warning: failed to load research prompt from ${RESEARCH_PROMPT_PATH}: ${err.message}`);
}

const FULL_SYSTEM_PROMPT = FLOWS
  ? `${SYSTEM_PROMPT}\n\n---\n\n${FLOWS}`
  : SYSTEM_PROMPT;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function handleAnalyze(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, {
      error: {
        message: 'Server missing ANTHROPIC_API_KEY environment variable.',
      },
    });
    return;
  }

  if (!FULL_SYSTEM_PROMPT) {
    sendJson(res, 500, {
      error: {
        message: 'Server missing system prompt content. Check SYSTEM_PROMPT_PATH or system-prompt.txt.',
      },
    });
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk;
  });

  req.on('end', async () => {
    try {
      const body = JSON.parse(rawBody || '{}');
      const userText = String(body.text || '').trim();

      if (!userText) {
        sendJson(res, 400, {
          error: {
            message: 'Missing required field: text',
          },
        });
        return;
      }

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 6000,
          system: FULL_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userText }],
        }),
      });

      const data = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        sendJson(res, upstream.status, {
          error: {
            message: data.error?.message || `Anthropic API error ${upstream.status}`,
          },
        });
        return;
      }

      const text = data.content?.[0]?.text;
      if (!text) {
        sendJson(res, 502, {
          error: {
            message: 'Anthropic response missing content text.',
          },
        });
        return;
      }

      sendJson(res, 200, { text });
    } catch (err) {
      sendJson(res, 400, {
        error: {
          message: `Invalid request body: ${err.message}`,
        },
      });
    }
  });
}

async function handleBrainstorm(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, { error: { message: 'Server missing ANTHROPIC_API_KEY environment variable.' } });
    return;
  }

  if (!BRAINSTORM_PROMPT) {
    sendJson(res, 500, { error: { message: 'Server missing brainstorm prompt.' } });
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => { rawBody += chunk; });

  req.on('end', async () => {
    try {
      const body = JSON.parse(rawBody || '{}');
      const userText = String(body.text || '').trim();

      if (!userText) {
        sendJson(res, 400, { error: { message: 'Missing required field: text' } });
        return;
      }

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: BRAINSTORM_PROMPT,
          messages: [{ role: 'user', content: userText }],
        }),
      });

      const data = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        sendJson(res, upstream.status, { error: { message: data.error?.message || `Anthropic API error ${upstream.status}` } });
        return;
      }

      const text = data.content?.[0]?.text;
      if (!text) {
        sendJson(res, 502, { error: { message: 'Anthropic response missing content text.' } });
        return;
      }

      sendJson(res, 200, { text });
    } catch (err) {
      sendJson(res, 400, { error: { message: `Invalid request body: ${err.message}` } });
    }
  });
}

async function handleDeliverables(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, { error: { message: 'Server missing ANTHROPIC_API_KEY environment variable.' } });
    return;
  }

  if (!DELIVERABLES_PROMPT) {
    sendJson(res, 500, { error: { message: 'Server missing deliverables prompt.' } });
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => { rawBody += chunk; });

  req.on('end', async () => {
    try {
      const body = JSON.parse(rawBody || '{}');
      const userText = String(body.text || '').trim();

      if (!userText) {
        sendJson(res, 400, { error: { message: 'Missing required field: text' } });
        return;
      }

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: DELIVERABLES_PROMPT,
          messages: [{ role: 'user', content: userText }],
        }),
      });

      const data = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        sendJson(res, upstream.status, { error: { message: data.error?.message || `Anthropic API error ${upstream.status}` } });
        return;
      }

      const text = data.content?.[0]?.text;
      if (!text) {
        sendJson(res, 502, { error: { message: 'Anthropic response missing content text.' } });
        return;
      }

      sendJson(res, 200, { text });
    } catch (err) {
      sendJson(res, 400, { error: { message: `Invalid request body: ${err.message}` } });
    }
  });
}

async function handleResearch(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, { error: { message: 'Server missing ANTHROPIC_API_KEY environment variable.' } });
    return;
  }

  if (!RESEARCH_PROMPT) {
    sendJson(res, 500, { error: { message: 'Server missing research prompt.' } });
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => { rawBody += chunk; });

  req.on('end', async () => {
    try {
      const body = JSON.parse(rawBody || '{}');
      const userText = String(body.text || '').trim();

      if (!userText) {
        sendJson(res, 400, { error: { message: 'Missing required field: text' } });
        return;
      }

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1800,
          system: RESEARCH_PROMPT,
          messages: [{ role: 'user', content: userText }],
        }),
      });

      const data = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        sendJson(res, upstream.status, { error: { message: data.error?.message || `Anthropic API error ${upstream.status}` } });
        return;
      }

      const text = data.content?.[0]?.text;
      if (!text) {
        sendJson(res, 502, { error: { message: 'Anthropic response missing content text.' } });
        return;
      }

      sendJson(res, 200, { text });
    } catch (err) {
      sendJson(res, 400, { error: { message: `Invalid request body: ${err.message}` } });
    }
  });
}

function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;

  if (requestPath === '/system-prompt.txt' || requestPath === '/flows.txt' || requestPath === '/brainstorm-prompt.txt' || requestPath === '/deliverables-prompt.txt' || requestPath === '/research-prompt.txt') {
    sendJson(res, 403, { error: { message: 'Forbidden' } });
    return;
  }

  const safePath = path.normalize(requestPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: { message: 'Forbidden' } });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendJson(res, 404, { error: { message: 'Not found' } });
        return;
      }
      sendJson(res, 500, { error: { message: 'Failed to read file' } });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/brainstorm') {
    handleBrainstorm(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/analyze') {
    handleAnalyze(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/deliverables') {
    handleDeliverables(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/research') {
    handleResearch(req, res);
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: { message: 'Method not allowed' } });
});

server.listen(PORT, () => {
  console.log(`PM Brainstorm running at http://localhost:${PORT}`);
});
