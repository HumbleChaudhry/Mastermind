import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  public socket = io(environment.apiUrl, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true
  });

  constructor() {
    console.log('GameService created with API URL:', environment.apiUrl);

    // Add connection event listeners
    this.socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', this.socket.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket
        this.socket.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
    });
  }
}
