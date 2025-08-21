/**
* File: ws.js
* Path: /src/realtime
* Author: Saša Kojadinović
*/
import { Server } from 'socket.io';


export function initSocket(httpServer) {
const io = new Server(httpServer, { cors: { origin: process.env.CORS_ORIGIN || '*' } });
io.on('connection', (socket) => {
socket.on('join', (room) => socket.join(room));
});
return io;
}