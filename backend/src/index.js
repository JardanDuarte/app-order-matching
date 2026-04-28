import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { subscribeMarketUpdates } from './services/marketEventService.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

export { io };

await subscribeMarketUpdates(event => {
  io.emit('market:updated', event);
});

const port = Number(process.env.PORT || 3000);

server.listen(port, () => {
  console.log(`Server rodando na porta ${port}`);
});
