const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());

let sock;

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({
        version,
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Scan this QR code to connect:');
            require('qrcode-terminal').generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            if (shouldReconnect) {
                startSock();
            }
} else if (connection === 'open') {
    console.log('✅ WhatsApp connected.');
    console.log('Socket user:', sock.user);
    console.log('Socket creds.me.id:', sock.authState?.creds?.me?.id);
}
    });

    sock.ev.on('creds.update', saveCreds);

    
}

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }
    try {
        if (!sock) {
            return res.status(500).json({ error: 'WhatsApp socket not initialized yet' });
        }
        if (!sock.authState?.creds?.me?.id) {
            return res.status(500).json({ error: 'WhatsApp is not connected. Please scan the QR code again.' });
        }
        
        // Anti-spam basic rate limiting
        if (!global.msgCount) {
            global.msgCount = 0;
            global.startDate = new Date();
        }
        const now = new Date();
        const daysSinceStart = Math.floor((now - global.startDate) / (1000 * 60 * 60 * 24));
        const limitPerDay = daysSinceStart < 14 ? 100 : 500; // New accounts: 100/day, warmed up: 500/day

        if (now.toDateString() !== global.startDate.toDateString()) {
            global.msgCount = 0;
            global.startDate = now;
        }

        if (global.msgCount >= limitPerDay) {
            return res.status(429).json({ error: `Daily limit of ${limitPerDay} messages reached. Avoid getting banned.` });
        }

        global.msgCount++;

        const jid = number.includes('@s.whatsapp.net') ? number : number.replace(/^\+?/, '') + '@s.whatsapp.net';
        console.log('Normalized number for JID:', jid);
        console.log('Attempting to send message:');
        console.log('sock.user:', sock.user);
        console.log('Connected creds.me.id:', sock.authState?.creds?.me?.id);
        console.log('Target JID:', jid);
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true, message: 'Message sent', dailyCount: global.msgCount, limit: limitPerDay });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
    startSock();
});