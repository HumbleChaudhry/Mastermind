# Deployment Guide for Mastermind Game

This guide will help you deploy your Mastermind game using free hosting options.

## Option 1: Render + Supabase (Recommended)

### Step 1: Set Up Supabase

1. Create a free Supabase account at [https://supabase.com/](https://supabase.com/)
2. Create a new project
3. Create a new table called `game_states` with the following columns:
   - `id` (int8, primary key, auto-increment)
   - `room_code` (varchar, unique)
   - `game_state` (jsonb)
   - `created_at` (timestamp with time zone, default: now())
   - `updated_at` (timestamp with time zone)
4. Get your Supabase URL and anon key from the API settings

### Step 2: Deploy Server to Render

1. Create a free Render account at [https://render.com/](https://render.com/)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - Name: `mastermind-server` (or your preferred name)
   - Root Directory: `MastermindsApp/server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `SUPABASE_URL`: Your Supabase URL
     - `SUPABASE_KEY`: Your Supabase anon key
     - `PORT`: 8080
5. Deploy the service

### Step 3: Deploy Client to Render

1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Configure the service:
   - Name: `mastermind-client` (or your preferred name)
   - Root Directory: `MastermindsApp/client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist/masterminds-app`
   - Environment Variables:
     - Make sure to update the `environment.prod.ts` file with your actual server URL (e.g., `https://mastermind-server.onrender.com`) before deploying
     - If you're using a different domain than `https://mastermind-app.onrender.com`, also update the CORS settings in `server/src/index.ts`

## Option 2: Render + Render PostgreSQL (90-day trial)

If you prefer to use Render's PostgreSQL service instead of Supabase:

1. Create a new PostgreSQL database on Render
2. Note that the free tier is a 90-day trial, after which it costs $7/month
3. Get the connection string and update your environment variables accordingly
4. You'll need to modify the `SupabaseService.ts` to use a PostgreSQL client instead

## Local Development

1. Create a `.env` file in the `server` directory based on `.env.example`
2. Install dependencies:
   ```
   cd MastermindsApp/server
   npm install
   cd ../client
   npm install
   ```
3. Start the server:
   ```
   cd MastermindsApp/server
   npm start
   ```
4. Start the client:
   ```
   cd MastermindsApp/client
   ng serve
   ```

## Important Notes

- The client will automatically connect to the server URL specified in the environment files
- For local development, the client connects to `http://localhost:8080`
- For production, update the `environment.prod.ts` file with your Render server URL
- The server will try to use Supabase if environment variables are set, otherwise it falls back to local file storage
