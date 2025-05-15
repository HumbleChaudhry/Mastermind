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
  io = require("socket.io")(server, { cors: { origin: "*" } }),
  path = require("path");

// Initialize Supabase service
const supabaseService = SupabaseService.getInstance();
supabaseService.initialize();

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
