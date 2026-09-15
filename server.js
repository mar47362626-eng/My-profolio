require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const nodemailer = require('nodemailer');

const port = Number(process.env.PORT) || 3000;
const rootDirectory = __dirname;
const allowedOrigins = new Set([
  'https://mar47362626-eng.github.io',
  'http://localhost:3000',
]);
const dataDirectory = path.join(rootDirectory, 'data');
const messagesFile = path.join(dataDirectory, 'messages.json');
const contactEmail = process.env.CONTACT_EMAIL || 'ayomideoluniyi49@gmail.com';
const smtpTransport = process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY
  ? nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_KEY },
    })
  : null;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const ensureStorage = () => {
  fs.mkdirSync(dataDirectory, { recursive: true });
  if (!fs.existsSync(messagesFile)) fs.writeFileSync(messagesFile, '[]\n', 'utf8');
};

const readMessages = () => {
  ensureStorage();
  try {
    return JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
  } catch {
    return [];
  }
};

const writeMessages = (messages) => {
  ensureStorage();
  fs.writeFileSync(messagesFile, `${JSON.stringify(messages, null, 2)}\n`, 'utf8');
};

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
}[character]));

const sendContactEmail = async ({ name, email, message }) => {
  if (!smtpTransport) return null;
  const result = await smtpTransport.sendMail({
    from: process.env.BREVO_SENDER || process.env.BREVO_SMTP_USER,
    to: contactEmail,
    replyTo: email,
    subject: `New portfolio message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    html: `<div style="background:#061923;color:#e8f2eb;font-family:Arial,sans-serif;padding:32px;max-width:640px"><p style="color:#35ee82;font:12px monospace;letter-spacing:1px">AAO / NEW CONTACT MESSAGE</p><h1 style="font-size:28px;margin:18px 0">New project enquiry</h1><p style="color:#9bb0a4">Someone contacted you through your portfolio.</p><hr style="border:0;border-top:1px solid #29424a;margin:24px 0"><p><strong style="color:#35ee82">Name</strong><br>${escapeHtml(name)}</p><p><strong style="color:#35ee82">Email</strong><br><a href="mailto:${escapeHtml(email)}" style="color:#35ee82">${escapeHtml(email)}</a></p><p><strong style="color:#35ee82">Message</strong></p><p style="background:#102832;padding:18px;line-height:1.6;white-space:pre-wrap">${escapeHtml(message)}</p><p style="color:#9bb0a4;font-size:12px">Reply directly to this email to contact the sender.</p></div>`,
  });
  console.log(`Brevo accepted message ${result.messageId} for ${contactEmail}`);
  return true;
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const setCorsHeaders = (request, response) => {
  const origin = request.headers.origin;
  if (allowedOrigins.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const readRequestBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1024 * 1024) {
      request.destroy();
      reject(new Error('Request body is too large'));
    }
  });
  request.on('end', () => resolve(body));
  request.on('error', reject);
});

const serveFile = (request, response, pathname) => {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const routedPath = requestedPath === '/admin' || requestedPath === '/admin/' ? '/admin.html' : requestedPath;
  const filePath = path.resolve(rootDirectory, `.${routedPath}`);
  if (!filePath.startsWith(rootDirectory) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
};

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const { pathname } = requestUrl;
  setCorsHeaders(request, response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (pathname === '/api/messages' && request.method === 'GET') {
    sendJson(response, 200, readMessages());
    return;
  }

  if (pathname === '/api/messages' && request.method === 'POST') {
    try {
      const body = JSON.parse(await readRequestBody(request));
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();
      const message = String(body.message || '').trim();
      if (!name || !email || !message || !email.includes('@')) {
        sendJson(response, 400, { error: 'Name, valid email, and message are required.' });
        return;
      }
      const newMessage = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, email, message, createdAt: new Date().toISOString() };
      writeMessages([newMessage, ...readMessages()]);
      let emailStatus = smtpTransport ? 'failed' : 'not-configured';
      let emailError = '';
      try {
        const result = await sendContactEmail(newMessage);
        if (result) emailStatus = 'sent';
      } catch (mailError) {
        emailError = mailError.message;
        console.error('Brevo email failed:', mailError.message);
      }
      const statusMessage = emailStatus === 'sent'
        ? 'Message accepted by Brevo. Check Gmail Inbox and Spam.'
        : emailStatus === 'failed'
          ? emailError.includes('Unauthorized IP')
            ? 'Message saved. Brevo is blocking this server IP. Authorize your IP in Brevo SMTP settings.'
            : 'Message saved, but email delivery failed. Check Brevo settings and server logs.'
          : 'Message saved. Email delivery is not configured yet.';
      sendJson(response, 201, { message: statusMessage, item: newMessage });
    } catch {
      sendJson(response, 400, { error: 'The request body must be valid JSON.' });
    }
    return;
  }

  if (pathname === '/api/messages' && request.method === 'DELETE') {
    writeMessages([]);
    sendJson(response, 200, { message: 'All messages deleted.' });
    return;
  }

  const messageMatch = pathname.match(/^\/api\/messages\/([^/]+)$/);
  if (messageMatch && request.method === 'DELETE') {
    const messages = readMessages();
    const remaining = messages.filter((item) => String(item.id) !== decodeURIComponent(messageMatch[1]));
    if (remaining.length === messages.length) {
      sendJson(response, 404, { error: 'Message not found.' });
      return;
    }
    writeMessages(remaining);
    sendJson(response, 200, { message: 'Message deleted.' });
    return;
  }

  if (request.method === 'GET') serveFile(request, response, pathname);
  else sendJson(response, 405, { error: 'Method not allowed.' });
});

ensureStorage();
server.listen(port, () => {
  console.log(`Portfolio server running at http://localhost:${port}`);
});
