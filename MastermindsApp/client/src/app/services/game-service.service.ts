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

  // Initialize socket with a default value to satisfy TypeScript
  public socket: Socket = io(environment.apiUrl, { autoConnect: false });
  private serverAvailable = true;

  constructor() {
    console.log('GameService created with API URL:', environment.apiUrl);
    this.checkServerAvailability();
  }

  /**
   * Check if the server is available before attempting to connect
   */
  private checkServerAvailability() {
    this.connectionStatus.next('checking');

    // Try to connect directly to the root URL instead of the health endpoint
    // since the health endpoint might not exist
    fetch(`${environment.apiUrl}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    })
      .then((response) => {
        // If we get any response at all, the server is probably running
        console.log('Server is available, initializing socket');
        this.serverAvailable = true;
        this.initializeSocket();
      })
      .catch((error) => {
        console.error('Server check failed:', error);
        this.serverAvailable = false;
        this.connectionStatus.next('server_unavailable');

        // Try socket connection anyway as a last resort
        console.log('Trying socket connection as fallback');
        this.initializeSocket(true);
      });
  }

  private initializeSocket(fallback = false) {
    try {
      // Initialize socket with standard configuration
      const options = {
        transports: ['polling', 'websocket'], // Try polling first as it's more reliable for initial connection
        reconnectionAttempts: fallback ? 2 : 5, // Limit reconnection attempts if server is likely down
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true,
        path: '/socket.io/', // Explicitly set the path to match server
      };

      // Disconnect existing socket if it exists
      if (this.socket && typeof this.socket.disconnect === 'function') {
        this.socket.disconnect();
        this.socket.removeAllListeners();
      }

      // Create new socket
      this.socket = io(environment.apiUrl, options);
      this.setupEventListeners();

      console.log('Socket initialized with options:', options);
    } catch (error) {
      console.error('Error initializing socket:', error);
      this.connectionStatus.next('error');
    }
  }

  private setupEventListeners() {
    // Add connection event listeners
    this.socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', this.socket.id);
      this.connectionStatus.next('connected');
      this.serverAvailable = true;
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
    });
  }

  // Method to manually reconnect - with server check
  public reconnect() {
    if (this.socket) {
      if (this.socket.connected) {
        this.socket.disconnect();
      }

      // Disconnect and clean up existing socket
      this.socket.removeAllListeners();
      this.socket.close();
    }

    // Check server availability again before reconnecting
    this.checkServerAvailability();
  }
}
