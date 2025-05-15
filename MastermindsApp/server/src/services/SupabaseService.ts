import { createClient } from '@supabase/supabase-js';

export class SupabaseService {
    private static instance: SupabaseService;
    private supabase: any;
    private isInitialized: boolean = false;

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    /**
     * Get the singleton instance of SupabaseService
     */
    public static getInstance(): SupabaseService {
        if (!SupabaseService.instance) {
            SupabaseService.instance = new SupabaseService();
        }
        return SupabaseService.instance;
    }

    /**
     * Initialize the Supabase client
     * @returns true if initialization was successful, false otherwise
     */
    public initialize(): boolean {
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_KEY;

            if (!supabaseUrl || !supabaseKey) {
                console.log('Supabase URL or key not provided. Using local storage.');
                return false;
            }

            this.supabase = createClient(supabaseUrl, supabaseKey);
            this.isInitialized = true;
            console.log('Supabase client initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Supabase client:', error);
            return false;
        }
    }

    /**
     * Check if Supabase client is initialized
     */
    public isSupabaseInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Get the Supabase client
     */
    public getClient(): any {
        if (!this.isInitialized) {
            this.initialize();
        }
        return this.supabase;
    }

    /**
     * Save game data to Supabase
     * @param roomCode The room code
     * @param gameState The game state to save
     */
    public async saveGameState(roomCode: string, gameState: any): Promise<boolean> {
        if (!this.isInitialized) {
            return false;
        }

        try {
            const { data, error } = await this.supabase
                .from('game_states')
                .upsert({ 
                    room_code: roomCode, 
                    game_state: gameState,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'room_code' 
                });

            if (error) {
                console.error('Error saving game state to Supabase:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Exception saving game state to Supabase:', error);
            return false;
        }
    }

    /**
     * Get all game states from Supabase
     */
    public async getAllGameStates(): Promise<{ [roomCode: string]: any } | null> {
        if (!this.isInitialized) {
            return null;
        }

        try {
            const { data, error } = await this.supabase
                .from('game_states')
                .select('room_code, game_state');

            if (error) {
                console.error('Error retrieving game states from Supabase:', error);
                return null;
            }

            const gameStates: { [roomCode: string]: any } = {};
            data.forEach((item: any) => {
                gameStates[item.room_code] = item.game_state;
            });

            return gameStates;
        } catch (error) {
            console.error('Exception retrieving game states from Supabase:', error);
            return null;
        }
    }
}
