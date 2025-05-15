import { RoomService } from "./services/RoomService";
import { WordService } from "./services/WordService";
import { SupabaseService } from "./services/SupabaseService";

// Load environment variables if dotenv is available
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not available, using default environment variables');
}

const PORT = process.env.PORT || 8080;

var express = require("express"),
  app = express(),
  server = require("http").createServer(app),
  path = require("path");

// Configure Socket.IO with proper CORS settings
const io = require("socket.io")(server, {
  cors: {
    origin: "*", // Allow all origins for now to debug
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'], // Explicitly define transports
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000 // Increase ping interval
});

// Add CORS middleware for Express
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all origins for debugging
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Initialize Supabase service
const supabaseService = SupabaseService.getInstance();
supabaseService.initialize();

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Add Socket.IO test endpoint
app.get('/socket-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Socket.IO Test</title>
        <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const socket = io();
            socket.on('connect', () => {
              document.getElementById('status').textContent = 'Connected to Socket.IO';
              document.getElementById('status').style.color = 'green';
            });
            socket.on('connect_error', (err) => {
              document.getElementById('status').textContent = 'Error connecting to Socket.IO: ' + err.message;
              document.getElementById('status').style.color = 'red';
            });
          });
        </script>
      </head>
      <body>
        <h1>Socket.IO Test</h1>
        <p id="status">Connecting to Socket.IO...</p>
      </body>
    </html>
  `);
});

// Serve static files if they exist (for production deployment)
try {
  const clientPath = path.join(__dirname, '../../client/dist/masterminds-app');
  app.use(express.static(clientPath));

  // For any other routes, redirect to index.html (Angular routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  console.log('Serving static files from:', clientPath);
} catch (error) {
  console.log('Not serving static files:', error.message);
}

server.listen(PORT);
console.log("Server Running on Port ", PORT);

const registerRoomHandler = require("./services/EventHandlers/RoomHandler");

var wordService = new WordService();
var roomService = new RoomService(wordService);

// Socket.IO connection handling with detailed logging
io.on("connection", (socket) => {
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);
  console.log(`Client transport: ${socket.conn.transport.name}`);
  console.log(`Client IP: ${socket.handshake.address}`);
  console.log(`Client headers: ${JSON.stringify(socket.handshake.headers)}`);

  // Emit login redirect
  io.to(socket.id).emit("login:redirect");

  // Register room handler
  registerRoomHandler(io, socket, roomService);

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}, Reason: ${reason}`);
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`[${new Date().toISOString()}] Socket error for ${socket.id}:`, error);
  });
});
