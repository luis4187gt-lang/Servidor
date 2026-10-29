// BACKEND - tiktok-live-connector - server.js (CommonJS - Render compatible)
const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3001;

app.get('/', (req,res) => res.send('Centroteo TikTok Bridge Activo'));

io.on('connection', (socket) => {
    console.log('Juego conectado');
});

async function conectarTikTok(username) {
    const tiktokConnection = new WebcastPushConnection(username);
    
    tiktokConnection.connect().then(state => {
        console.log(`Conectado al LIVE de @${username}`);
        io.emit('tiktok_connected', { username });
    }).catch(err => console.error('Error conectando', err));

    tiktokConnection.on('member', data => {
        console.log(`${data.uniqueId} se unio`);
        io.emit('user_joined', {
            username: data.uniqueId,
            nickname: data.nickname,
            photo: data.profilePictureUrl,
            userId: data.userId
        });
    });

    tiktokConnection.on('gift', data => {
        if(data.giftType === 1 && !data.repeatEnd) return;
        console.log(`${data.uniqueId} mando ${data.giftName}`);
        io.emit('gift', {
            username: data.uniqueId,
            photo: data.profilePictureUrl,
            giftName: data.giftName,
            giftType: data.giftId,
            diamondCount: data.diamondCount,
            repeatCount: data.repeatCount
        });
    });

    tiktokConnection.on('chat', data => {
        io.emit('chat', { username: data.uniqueId, comment: data.comment });
    });
}

app.get('/connect/:username', (req,res) => {
    conectarTikTok(req.params.username);
    res.json({ status: 'conectando', username: req.params.username });
});

server.listen(PORT, () => console.log(`Bridge en puerto ${PORT}`));
