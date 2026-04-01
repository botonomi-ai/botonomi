const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'botonomi-db.json');

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// ── JSON File Database ───────────────────────────────────────────────────────
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const init = { inquiries: [], chat_logs: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
      return init;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('DB load error:', e.message);
    return { inquiries: [], chat_logs: [] };
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

function nextId(arr) {
  return arr.length === 0 ? 1 : Math.max(...arr.map(r => r.id)) + 1;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fetchWithTimeout(url, options, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

function localBotResponse(message) {
  const msg = message.toLowerCase().trim();

  if (/^(hi|hello|hey|greetings|yo|sup)/.test(msg))
    return "Hello! I'm NOVA, Botonomi's AI assistant. Whether you need chatbots, workflow automation, or custom AI agents — I've got you. What can I help you automate today? 🚀";

  if (/price|cost|pricing|rate|fee|quote|budget/.test(msg))
    return "Our pricing is fully custom based on your automation complexity. Starter projects begin from affordable packages, with enterprise solutions scaled to your needs. Fill out the contact form and we'll send you a free proposal within 24 hours!";

  if (/chatbot|bot|conversational|support bot|ai chat/.test(msg))
    return "We build cutting-edge AI chatbots powered by GPT-4 and Claude — trained on your business data, integrated into your website, CRM, or WhatsApp. They handle sales, support, and lead gen 24/7. Want to deploy one?";

  if (/n8n|make\.com|make|zapier|workflow|automation|automate/.test(msg))
    return "We're certified automation engineers on n8n, Make.com, and Zapier — connecting 1000+ apps to eliminate repetitive tasks. We can automate emails, CRM updates, data pipelines, notifications, and more. What process do you want to kill first? ⚡";

  if (/gpt|openai|claude|anthropic|llm|ai model|language model/.test(msg))
    return "We work with GPT-4, Claude, Gemini, and local LLMs to build custom AI agents. Whether you need document analysis, code generation, or a fully autonomous agent — we engineer it for your exact use case.";

  if (/voice|phone|call|twilio|vapi/.test(msg))
    return "Our Voice AI solutions use real-time LLMs to handle inbound/outbound calls, appointment booking, and customer support — all without a human agent. Want a demo?";

  if (/crm|salesforce|hubspot|pipedrive|airtable/.test(msg))
    return "We integrate AI into your CRM to auto-qualify leads, update records, trigger follow-ups, and generate reports. Which CRM are you using? We'll tailor the solution for you.";

  if (/data|scraping|etl|pipeline|extract|transform|analytics/.test(msg))
    return "We build data pipelines that scrape, clean, transform, and load data automatically — feeding your dashboards and AI models in real time. Scale from hundreds to millions of records.";

  if (/contact|email|reach|talk|speak|meet/.test(msg))
    return "You can reach the Botonomi team through the contact form on this page. We typically respond within 24 hours. Or just keep chatting with me — I'm always here! 😄";

  if (/service|offer|what do you|what can|capability|what you do/.test(msg))
    return "Botonomi offers: 🤖 AI Chatbots, ⚡ Workflow Automation, 🧠 Custom AI Agents, 📊 Data Processing, 🔗 CRM Integration, and 🎙️ Voice AI. Which service interests you most?";

  if (/time|timeline|how long|delivery|turnaround/.test(msg))
    return "Most automation projects take 3–14 days depending on complexity. Simple chatbots can go live in 48 hours. Complex multi-step AI pipelines take 2–3 weeks. We move fast. 🔥";

  if (/team|who|founder|company|about|botonomi/.test(msg))
    return "Botonomi is a gritty AI automation studio running on passion and precision. We're a lean team of automation engineers and AI specialists dedicated to making your business 10x more efficient.";

  if (/thank|thanks|appreciate|great|awesome|cool/.test(msg))
    return "You're very welcome! That's what NOVA is here for. Anything else I can help you automate? The future is waiting. ⚡";

  return "That's an interesting challenge! Our team specializes in building custom AI automation solutions for exactly situations like yours. Would you like to schedule a free consultation? Just use the contact form below and we'll get back to you within 24 hours!";
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  const db = loadDB();
  res.json({
    status: 'ONLINE',
    time: new Date().toISOString(),
    system: 'NOVA Neural Core v2.0',
    inquiries: db.inquiries.length,
    chat_logs: db.chat_logs.length
  });
});

// Contact form
app.post('/api/contact', async (req, res) => {
  const { name, email, message, service, _h } = req.body;

  if (_h) return res.status(400).json({ error: 'Spam detected' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !message)
    return res.status(400).json({ error: 'All fields required' });
  if (!emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email address' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const db = loadDB();

  const inquiry = {
    id: nextId(db.inquiries),
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    service: service || 'general',
    ip_address: ip,
    status: 'new',
    created_at: new Date().toISOString()
  };

  db.inquiries.push(inquiry);
  saveDB(db);
  console.log(`📩 New inquiry #${inquiry.id} from ${inquiry.name} <${inquiry.email}>`);

  // Non-blocking forward to n8n
  fetchWithTimeout('https://botonomi.app.n8n.cloud/webhook/contact-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, message, service })
  }, 6000).catch(e => console.log('n8n forward skipped:', e.message));

  res.json({ success: true, id: inquiry.id });
});

// Chatbot
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  let botResponse = '';
  let source = 'local';

  try {
    const n8nRes = await fetchWithTimeout('https://botonomi.app.n8n.cloud/webhook/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }, 7000);

    if (n8nRes.ok) {
      const data = await n8nRes.json();
      botResponse = data.reply || data.message || data.response || data.output || '';
      if (botResponse) source = 'n8n';
    }
  } catch (e) {
    console.log('n8n chat unavailable, using local AI');
  }

  if (!botResponse) botResponse = localBotResponse(message);

  // Store conversation
  const db = loadDB();
  db.chat_logs.push({
    id: nextId(db.chat_logs),
    session_id: sessionId || 'anon',
    user_message: message,
    bot_response: botResponse,
    source,
    created_at: new Date().toISOString()
  });
  saveDB(db);

  res.json({ reply: botResponse });
});

// Admin: view inquiries
app.get('/api/inquiries', (req, res) => {
  const db = loadDB();
  res.json(db.inquiries.slice().reverse().slice(0, 100));
});

// Admin: view chats
app.get('/api/chats', (req, res) => {
  const db = loadDB();
  res.json(db.chat_logs.slice().reverse().slice(0, 100));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Botonomi Neural Core running at http://localhost:${PORT}`);
  console.log(`📦 Database: botonomi-db.json`);
  console.log(`📡 API: /api/contact | /api/chat | /api/health\n`);
});
