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

var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  path = require('path');

// Configure Socket.IO with proper CORS settings
const io = require('socket.io')(server, {
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
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    socketio: {
      enabled: true,
      transports: ['websocket', 'polling'],
    },
  });
});

// Add Socket.IO test endpoint
app.get('/socket-test', (req: any, res: any) => {
  const host = req.headers.host || 'localhost:8080';
  const protocol = req.secure ? 'https' : 'http';

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Socket.IO Test</title>
        <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            // Use the current server URL
            const serverUrl = '${protocol}://${host}';
            console.log('Connecting to Socket.IO server at:', serverUrl);

            const socket = io(serverUrl, {
              transports: ['websocket', 'polling'],
              reconnectionAttempts: 5
            });

            socket.on('connect', () => {
              document.getElementById('status').textContent = 'Connected to Socket.IO with ID: ' + socket.id;
              document.getElementById('status').style.color = 'green';
              document.getElementById('server-url').textContent = serverUrl;
              document.getElementById('client-info').textContent = 'Client app should be at: https://mastermind-app.onrender.com';
            });

            socket.on('connect_error', (err) => {
              document.getElementById('status').textContent = 'Error connecting to Socket.IO: ' + err.message;
              document.getElementById('status').style.color = 'red';
              document.getElementById('server-url').textContent = serverUrl;
              console.error('Connection error:', err);
            });
          });
        </script>
      </head>
      <body>
        <h1>Socket.IO Test</h1>
        <p>Server URL: <span id="server-url">Detecting...</span></p>
        <p id="client-info">Client app should be at: https://mastermind-app.onrender.com</p>
        <p id="status">Connecting to Socket.IO...</p>
        <div>
          <h2>CORS Configuration</h2>
          <p>The server is configured to accept connections from:</p>
          <ul>
            <li>https://mastermind-app.onrender.com</li>
            <li>http://localhost:4200</li>
          </ul>
        </div>
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
