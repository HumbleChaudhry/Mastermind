import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private connectionStatus = new BehaviorSubject<string>('disconnected');
  public connectionStatus$ = this.connectionStatus.asObservable();

  public socket: Socket;
  private isConnecting = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

  constructor() {
    console.log('GameService created with API URL:', environment.apiUrl);
    this.initializeSocket();
  }

  private initializeSocket() {
    // Initialize socket with improved configuration
    this.socket = io(environment.apiUrl, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000, // Increased timeout
      autoConnect: true,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Add connection event listeners
    this.socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', this.socket.id);
      this.connectionStatus.next('connected');
      this.connectionAttempts = 0;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionStatus.next('error');

      // If we've tried too many times, try a different approach
      if (
        ++this.connectionAttempts >= this.maxConnectionAttempts &&
        !this.isConnecting
      ) {
        this.tryAlternativeConnection();
      }
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

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
      this.connectionStatus.next('connecting');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.connectionStatus.next('error');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
      this.connectionStatus.next('failed');

      // Try alternative connection method if all reconnection attempts fail
      if (!this.isConnecting) {
        this.tryAlternativeConnection();
      }
    });
  }

  private tryAlternativeConnection() {
    this.isConnecting = true;
    console.log('Trying alternative connection method...');

    // Disconnect current socket
    if (this.socket.connected) {
      this.socket.disconnect();
    }

    // Try with different transport options
    this.socket = io(environment.apiUrl, {
      transports: ['polling'], // Try only polling as a fallback
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 40000, // Even longer timeout
      autoConnect: true,
      forceNew: true,
    });

    this.setupEventListeners();
    this.isConnecting = false;
  }

  // Method to manually reconnect
  public reconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }

    this.connectionAttempts = 0;
    this.initializeSocket();
  }
}
