// Gui email qua SMTP Gmail (SSL cong 465) - khong can cai them thu vien.
// Can: SMTP_USER (dia chi Gmail gui), SMTP_PASS (Mat khau ung dung 16 ky tu cua Google).
const tls = require('tls');
const crypto = require('crypto');

function isConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function encodeHeader(text) {
  return '=?UTF-8?B?' + Buffer.from(String(text), 'utf8').toString('base64') + '?=';
}

function buildMessage({ from, fromName, to, subject, text }) {
  const body = Buffer.from(text, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  return [
    'From: ' + encodeHeader(fromName) + ' <' + from + '>',
    'To: <' + to + '>',
    'Subject: ' + encodeHeader(subject),
    'Date: ' + new Date().toUTCString(),
    'Message-ID: <' + crypto.randomBytes(12).toString('hex') + '@' + (from.split('@')[1] || 'faw') + '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
    ''
  ].join('\r\n');
}

// conn (tuy chon) chi dung khi kiem thu: { host, port, tlsOptions }
function sendMail({ to, subject, text }, conn = {}) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) return reject(new Error('SMTP chua duoc cau hinh'));
    const user = process.env.SMTP_USER;
    const pass = String(process.env.SMTP_PASS).replace(/\s+/g, '');
    const host = conn.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(conn.port || process.env.SMTP_PORT || 465);

    const socket = tls.connect(Object.assign({ host, port, servername: host }, conn.tlsOptions || {}));
    socket.setEncoding('utf8');
    socket.setTimeout(20000);

    let buffer = '';
    let lines = [];
    const responses = [];
    const waiters = [];
    let finished = false;

    function fail(err) {
      if (finished) return;
      finished = true;
      socket.destroy();
      reject(err);
    }

    function deliver(resp) {
      const waiter = waiters.shift();
      if (waiter) waiter(resp);
      else responses.push(resp);
    }

    socket.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        lines.push(line);
        if (/^\d{3}( |$)/.test(line)) {
          deliver({ code: Number(line.slice(0, 3)), text: lines.join('\n') });
          lines = [];
        }
      }
    });
    socket.on('error', fail);
    socket.on('timeout', () => fail(new Error('SMTP timeout')));
    socket.on('close', () => fail(new Error('SMTP ket noi bi dong')));

    function read() {
      return new Promise((res) => {
        const queued = responses.shift();
        if (queued) res(queued);
        else waiters.push(res);
      });
    }

    async function expect(codes, command) {
      if (command !== undefined) socket.write(command + '\r\n');
      const resp = await read();
      if (codes.indexOf(resp.code) === -1) {
        throw new Error('SMTP ' + resp.code + ': ' + resp.text.replace(/\s+/g, ' ').slice(0, 200));
      }
      return resp;
    }

    socket.once('secureConnect', async () => {
      try {
        await expect([220]);
        await expect([250], 'EHLO faw.local');
        await expect([334], 'AUTH LOGIN');
        await expect([334], Buffer.from(user).toString('base64'));
        await expect([235], Buffer.from(pass).toString('base64'));
        await expect([250], 'MAIL FROM:<' + user + '>');
        await expect([250, 251], 'RCPT TO:<' + to + '>');
        await expect([354], 'DATA');
        const message = buildMessage({ from: user, fromName: 'FAW Admin', to, subject, text });
        await expect([250], message + '\r\n.');
        socket.write('QUIT\r\n');
        finished = true;
        socket.end();
        resolve();
      } catch (err) {
        fail(err);
      }
    });
  });
}

module.exports = { sendMail, isConfigured, buildMessage };
