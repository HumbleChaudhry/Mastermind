import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  public socket = io(environment.apiUrl);

  constructor() {
    console.log('GameService created with API URL:', environment.apiUrl);
  }
}
