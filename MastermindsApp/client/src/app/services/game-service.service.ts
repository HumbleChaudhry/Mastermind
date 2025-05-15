import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private connectionStatus = new BehaviorSubject<string>('connecting');
  public connectionStatus$ = this.connectionStatus.asObservable();
  private reconnectTimer: any = null;

  // Initialize socket with a default value to satisfy TypeScript
  public socket: Socket = io(environment.apiUrl, {
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 30000,
    autoConnect: true,
    forceNew: true,
    path: '/socket.io/',
  });

  constructor() {
    console.log('GameService created with API URL:', environment.apiUrl);
    this.setupEventListeners();

    // Ensure we're connected
    this.ensureConnection();
  }

  private ensureConnection() {
    if (!this.socket.connected) {
      console.log('Socket not connected on initialization, connecting...');
      this.socket.connect();

      // Set up a periodic check to ensure we stay connected
      if (!this.reconnectTimer) {
        this.reconnectTimer = setInterval(() => {
          if (!this.socket.connected) {
            console.log('Periodic check: Socket disconnected, reconnecting...');
            this.reconnect();
          }
        }, 10000); // Check every 10 seconds
      }
    }
  }

  private setupEventListeners() {
    // Add connection event listeners
    this.socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', this.socket.id);
      this.connectionStatus.next('connected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionStatus.next('error');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connectionStatus.next('disconnected');

      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket
        this.socket.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.connectionStatus.next('connected');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.connectionStatus.next('error');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
      this.connectionStatus.next('failed');
    });

    // Debug all incoming events
    this.socket.onAny((eventName, ...args) => {
      console.log(`Received event: ${eventName}`, args);
    });
  }

  // Method to manually reconnect
  public reconnect() {
    console.log('Attempting to reconnect socket...');
    if (this.socket) {
      if (this.socket.connected) {
        this.socket.disconnect();
      }

      // Disconnect and clean up existing socket
      this.socket.removeAllListeners();

      // Create a new socket with fresh settings
      this.socket = io(environment.apiUrl, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 30000,
        autoConnect: true,
        forceNew: true,
        path: '/socket.io/',
      });

      this.setupEventListeners();
      this.socket.connect();

      // Return a promise that resolves when connected or rejects after timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve(true);
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }

    return Promise.resolve(false);
  }

  // Method to test the connection
  public testConnection() {
    console.log('Testing connection by emitting a ping event...');
    this.socket.emit('ping', { timestamp: new Date().toISOString() });

    // Also check if we need to reconnect
    if (!this.socket.connected) {
      console.log('Socket not connected during test, reconnecting...');
      this.reconnect();
    }
  }
}
