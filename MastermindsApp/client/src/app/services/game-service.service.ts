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
  public socket: Socket;
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

    // Create a simple fetch request to check if the server is available
    fetch(`${environment.apiUrl}/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    })
      .then((response) => {
        if (response.ok) {
          console.log('Server is available, initializing socket');
          this.serverAvailable = true;
          this.initializeSocket();
        } else {
          console.error('Server returned error status:', response.status);
          this.serverAvailable = false;
          this.connectionStatus.next('server_unavailable');
        }
      })
      .catch((error) => {
        console.error('Server health check failed:', error);
        this.serverAvailable = false;
        this.connectionStatus.next('server_unavailable');

        // Initialize socket anyway as a fallback, with limited reconnection attempts
        this.initializeSocket(true);
      });
  }

  private initializeSocket(fallback = false) {
    // Initialize socket with standard configuration
    const options = {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: fallback ? 2 : 5, // Limit reconnection attempts if server is likely down
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
    };

    this.socket = io(environment.apiUrl, options);
    this.setupEventListeners();
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
