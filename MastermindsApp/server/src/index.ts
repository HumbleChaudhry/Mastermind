import { RoomService } from './services/RoomService';
import { WordService } from './services/WordService';
import { SupabaseService } from './services/SupabaseService';

// Load environment variables if dotenv is available
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not available, using default environment variables');
}

const PORT = process.env.PORT || 8080;

// Import required modules properly
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with proper settings
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development/debugging
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'], // Explicitly define transports
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000, // Increase ping interval
  path: '/socket.io/', // Explicitly set the path
});

// Add CORS middleware for Express
app.use((req, res, next) => {
  // Allow all origins for development/debugging
  res.header('Access-Control-Allow-Origin', '*');

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Initialize Supabase service
const supabaseService = SupabaseService.getInstance();
supabaseService.initialize();

// Add root endpoint
app.get('/', (req: any, res: any) => {
  res.status(200).json({
    message: 'Mastermind Express Server',
    status: true,
    socketio_enabled: true,
  });
});

// Add health check endpoint
app.get('/health', (req: any, res: any) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Add Socket.IO test page
app.get('/socket-test', (req: any, res: any) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Socket.IO Test</title>
        <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const socket = io({
              path: '/socket.io/'
            });

            socket.on('connect', () => {
              document.getElementById('status').textContent = 'Connected: ' + socket.id;
              document.getElementById('status').style.color = 'green';
            });

            socket.on('connect_error', (err) => {
              document.getElementById('status').textContent = 'Error: ' + err;
              document.getElementById('status').style.color = 'red';
            });

            socket.on('disconnect', () => {
              document.getElementById('status').textContent = 'Disconnected';
              document.getElementById('status').style.color = 'red';
            });
          });
        </script>
      </head>
      <body>
        <h1>Socket.IO Test</h1>
        <p>Status: <span id="status">Connecting...</span></p>
      </body>
    </html>
  `);
});

// Serve static files if they exist (for production deployment)
try {
  const clientPath = path.join(__dirname, '../../client/dist/masterminds-app');
  app.use(express.static(clientPath));

  // Add a catch-all route AFTER our API routes
  // This should be the LAST route defined
  app.get('/app/*', (req: any, res: any) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  console.log('Serving static files from:', clientPath);
} catch (error) {
  console.log('Not serving static files:', error.message);
}

server.listen(PORT);
console.log('Server Running on Port ', PORT);

const registerRoomHandler = require('./services/EventHandlers/RoomHandler');

var wordService = new WordService();
var roomService = new RoomService(wordService);

// Socket.IO connection handling with detailed logging
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);
  console.log(`Client transport: ${socket.conn.transport.name}`);
  console.log(`Client IP: ${socket.handshake.address}`);
  console.log(`Client headers: ${JSON.stringify(socket.handshake.headers)}`);

  // Emit login redirect
  io.to(socket.id).emit('login:redirect');

  // Register room handler
  registerRoomHandler(io, socket, roomService);

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(
      `[${new Date().toISOString()}] User disconnected: ${
        socket.id
      }, Reason: ${reason}`
    );
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(
      `[${new Date().toISOString()}] Socket error for ${socket.id}:`,
      error
    );
  });
});
