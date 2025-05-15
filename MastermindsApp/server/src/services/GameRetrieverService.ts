import { GameStateService } from "./GameStateService";
import { SupabaseService } from "./SupabaseService";

export class GameRetrieverService
{
    private supabaseService: SupabaseService;

    constructor() {
        this.supabaseService = SupabaseService.getInstance();
        this.supabaseService.initialize();
    }

    async ReadPreviousGamesAsync() : Promise<{ [roomCode: string]: GameStateService }>
    {
        // First try to get games from Supabase
        if (this.supabaseService.isSupabaseInitialized()) {
            console.log('Retrieving games from Supabase...');
            const supabaseGameStates = await this.supabaseService.getAllGameStates();

            if (supabaseGameStates) {
                let gameStates : { [roomCode: string]: GameStateService } = {};

                Object.keys(supabaseGameStates).forEach((roomcode) => {
                    let gameState = new GameStateService();
                    Object.assign(gameState, supabaseGameStates[roomcode]);
                    gameStates[roomcode] = gameState;
                });

                console.log(`Retrieved ${Object.keys(gameStates).length} games from Supabase`);
                return gameStates;
            }
        }

        // Fall back to local file if Supabase retrieval failed or not initialized
        return this.ReadPreviousGamesFromFile();
    }

    ReadPreviousGames() : { [roomCode: string]: GameStateService }
    {
        // For backward compatibility, we'll try to read from Supabase first
        // but fall back to local file immediately if needed
        try {
            if (this.supabaseService.isSupabaseInitialized()) {
                // Try to get from Supabase, but since this is a synchronous method,
                // we'll need to fall back to local file if Supabase is configured
                console.log('Supabase is configured, but using local file for synchronous method');
            }

            return this.ReadPreviousGamesFromFile();
        } catch (error) {
            console.error('Error reading previous games:', error);
            return {};
        }
    }

    private ReadPreviousGamesFromFile() : { [roomCode: string]: GameStateService }
    {
        try {
            let fs = require('fs');
            let path = require('path');
            let text = fs.readFileSync(path.join(__dirname, '../data') + '/past-games.json');
            let json = JSON.parse(text);

            let gameStates : { [roomCode: string]: GameStateService } = {};
            Object.keys(json).forEach((roomcode) => {
                let gameState = new GameStateService();
                Object.assign(gameState, json[roomcode]);

                gameStates[roomcode] = gameState;
            });

            console.log(`Retrieved ${Object.keys(gameStates).length} games from local file`);
            return gameStates;
        } catch (error) {
            console.error('Error reading games from file:', error);
            return {};
        }
    }
}