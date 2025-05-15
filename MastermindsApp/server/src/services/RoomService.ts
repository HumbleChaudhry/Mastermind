import { LogInfo, Role, Team, User } from "../interfaces/GameLogicInterfaces";
import { GameWord } from "../interfaces/GameWord";
import { GameRetrieverService } from "./GameRetrieverService";
import { GameStateService } from "./GameStateService";
import { WordService } from "./WordService";

export class RoomService {
  roomCodes: string[] = [];
  rooms: { [roomCode: string]: string[] } = {};
  roomGameStates: { [roomCode: string]: GameStateService } = {};
  users: User[] = [];
  roomCodeLength = 8;
  gameLogs: { [roomCode: string]: LogInfo[] } = {};

  constructor(private wordService: WordService) {
    var gameRetrieverService = new GameRetrieverService();

    // Initialize with synchronous method for backward compatibility
    this.roomGameStates = gameRetrieverService.ReadPreviousGames();

    Object.keys(this.roomGameStates).forEach((roomcode) => {
      this.rooms[roomcode] = [];
      this.roomCodes.push(roomcode);
    });

    // Try to load from Supabase asynchronously
    this.loadGamesFromSupabase(gameRetrieverService);
  }

  private async loadGamesFromSupabase(gameRetrieverService: GameRetrieverService) {
    try {
      const supabaseGames = await gameRetrieverService.ReadPreviousGamesAsync();

      if (supabaseGames && Object.keys(supabaseGames).length > 0) {
        console.log('Successfully loaded games from Supabase');
        this.roomGameStates = supabaseGames;

        // Update room codes and rooms
        this.roomCodes = [];
        this.rooms = {};

        Object.keys(this.roomGameStates).forEach((roomcode) => {
          this.rooms[roomcode] = [];
          this.roomCodes.push(roomcode);
        });
      }
    } catch (error) {
      console.error('Error loading games from Supabase:', error);
    }
  }

  GenerateRoomCode(): string {
    let code;
    do {
      code = this.getRandomCode();
    } while (this.roomCodes.includes(code));

    this.roomCodes.push(code);
    this.rooms[code] = [];

    return code;
  }

  GenerateWordSet(code: string): { [word: string]: GameWord } {
    this.roomGameStates[code] = new GameStateService();
    var wordset = this.wordService.GenerateWordSet();

    wordset.forEach((word) => {
      this.roomGameStates[code].words[word.word] = word;
    });

    // console.log(this.roomGameStates);
    return this.roomGameStates[code].words;
  }

  getRandomCode() {
    return Array.from({ length: this.roomCodeLength }, () =>
      String.fromCharCode(Math.floor(Math.random() * 26) + 65)
    ).join("");
  }

  GetGameLogs(roomCode: string): LogInfo[] {
    if (!this.gameLogs[roomCode]) this.gameLogs[roomCode] = [];

    return this.gameLogs[roomCode];
  }

  GetRoomCode(roomCode: string): boolean {
    return this.roomCodes.includes(roomCode);
  }

  GetUser(socketId: string) {
    return this.users.filter((user) => user.socketId === socketId)[0];
  }

  GetUsers(room: string) {
    return this.users.filter((user) => user.room === room);
  }

  AddUser(socketId: string, nickname: string, roomCode: string): User {
    if (this.rooms[roomCode].includes(nickname)) return null;

    let user = {
      socketId,
      username: nickname,
      room: roomCode,
      role: Role.None,
      team: Team.None,
    };
    this.users.push(user);
    this.rooms[roomCode].push(nickname);
    return user;
  }

  RemoveUser(socketId: string): User {
    var user: User = this.GetUser(socketId);
    if (user == null) return;

    var nickname = user.username;
    var roomCode = user.room;

    if (
      this.rooms[roomCode] != null &&
      this.rooms[roomCode].includes(nickname)
    ) {
      this.roomGameStates[roomCode].RemoveUserFromSuggestedWords(nickname);
      const index = this.rooms[roomCode].indexOf(nickname, 0);
      if (index > -1) {
        this.rooms[roomCode].splice(index, 1);
      }
    }

    this.users.splice(this.users.indexOf(user), 1);

    return user;
  }
}
