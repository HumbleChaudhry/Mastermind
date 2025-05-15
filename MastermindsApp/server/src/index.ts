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
  io = require("socket.io")(server, {
    cors: {
      origin: ["https://mastermind-client.onrender.com", "http://localhost:4200"],
      methods: ["GET", "POST"],
      credentials: true
    }
  }),
  path = require("path");

// Add CORS middleware for Express
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://mastermind-client.onrender.com");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Initialize Supabase service
const supabaseService = SupabaseService.getInstance();
supabaseService.initialize();

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

io.on("connection", (socket) => {
  console.log(socket.id, ": user connected");
  io.to(socket.id).emit("login:redirect");
  registerRoomHandler(io, socket, roomService);
});
