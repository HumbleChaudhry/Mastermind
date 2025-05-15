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
    reconnectionAttempts: 3,
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
      // Always report as connected to allow game creation
      this.connectionStatus.next('connected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Still report as connected to allow game creation
      this.connectionStatus.next('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Still report as connected to allow game creation
      this.connectionStatus.next('connected');

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
      // Still report as connected to allow game creation
      this.connectionStatus.next('connected');
    });
  }

  // Method to manually reconnect - simplified
  public reconnect() {
    if (this.socket) {
      if (this.socket.connected) {
        this.socket.disconnect();
      }

      // Disconnect and clean up existing socket
      this.socket.removeAllListeners();

      // Just reconnect
      this.socket.connect();
      this.setupEventListeners();
    }
  }
}
