import { GameStateService } from "./GameStateService";
import { SupabaseService } from "./SupabaseService";

export class SaveGameService
{
    private supabaseService: SupabaseService;

    constructor() {
        this.supabaseService = SupabaseService.getInstance();
        this.supabaseService.initialize();
    }

    async SaveGames(roomGameStates: { [roomCode: string]: GameStateService }) {
        // First try to save to Supabase if it's initialized
        if (this.supabaseService.isSupabaseInitialized()) {
            console.log('Saving games to Supabase...');

            // Save each game state individually
            for (const roomCode in roomGameStates) {
                await this.supabaseService.saveGameState(roomCode, roomGameStates[roomCode]);
            }
        }

        // Always save locally as a backup
        try {
            let fs = require('fs');
            let path = require('path');
            fs.writeFileSync(path.join(__dirname, '../data') + '/past-games.json', JSON.stringify(roomGameStates));
        } catch (error) {
            console.error('Error saving games locally:', error);
        }
    }
}