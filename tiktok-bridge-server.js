
// BACKEND - tiktok-live-connector - server.js
// Instala: npm init -y && npm install tiktok-live-connector socket.io express cors
import pkg from 'tiktok-live-connector';
const { WebcastPushConnection } = pkg;
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

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

    // Cuando alguien se une
    tiktokConnection.on('member', data => {
        console.log(`${data.uniqueId} se unio`);
        io.emit('user_joined', {
            username: data.uniqueId,
            nickname: data.nickname,
            photo: data.profilePictureUrl,
            userId: data.userId
        });
    });

    // Cuando mandan regalo
    tiktokConnection.on('gift', data => {
        if(data.giftType === 1 && !data.repeatEnd) return; // solo final de streak
        console.log(`${data.uniqueId} mando ${data.giftName}`);
        io.emit('gift', {
            username: data.uniqueId,
            photo: data.profilePictureUrl,
            giftName: data.giftName,
            giftType: data.giftId, // para saber si es rosa, leon, etc
            diamondCount: data.diamondCount,
            repeatCount: data.repeatCount
        });
    });

    // Cuando alguien se va no hay evento oficial, lo simulamos con desconexion
    tiktokConnection.on('chat', data => {
        io.emit('chat', { username: data.uniqueId, comment: data.comment });
    });
}

app.get('/connect/:username', (req,res) => {
    conectarTikTok(req.params.username);
    res.json({ status: 'conectando', username: req.params.username });
});

server.listen(PORT, () => console.log(`Bridge en http://localhost:${PORT}`));
