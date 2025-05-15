import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private connectionStatus = new BehaviorSubject<string>('connected');
  public connectionStatus$ = this.connectionStatus.asObservable();

  // Initialize socket with a default value to satisfy TypeScript
  public socket: Socket = io(environment.apiUrl, {
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
    path: '/socket.io/',
  });

  constructor() {
    console.log('GameService created with API URL:', environment.apiUrl);
    this.setupEventListeners();
  }

  // No server availability check needed

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
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true,
        path: '/socket.io/',
      });

      this.setupEventListeners();
      this.socket.connect();
    }
  }

  // Method to test the connection
  public testConnection() {
    console.log('Testing connection by emitting a ping event...');
    this.socket.emit('ping', { timestamp: new Date().toISOString() });
  }
}
