import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { RoomService } from '../services/room.service';
import { GameStateService } from '../services/game-state.service';
import { GameService } from '../services/game-service.service';
import * as $ from 'jquery';
import { Clue, Role, Team, Message } from '../interfaces/GameLogicInterfaces';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-game',
  templateUrl: './create-game.component.html',
  styleUrls: ['./create-game.component.scss'],
})
export class CreateGameComponent implements OnInit, OnDestroy {
  username: string;
  connectionStatus: string = 'connecting';
  private connectionSubscription: Subscription | null = null;
  private connectionTimeout: any;

  constructor(
    private router: Router,
    private roomService: RoomService,
    private gameStateService: GameStateService,
    private gameService: GameService
  ) {
    this.username = '';
  }

  ngOnInit(): void {
    // Subscribe to connection status updates
    this.connectionSubscription = this.gameService.connectionStatus$.subscribe(
      (status) => {
        this.connectionStatus = status;

        if (status === 'error' || status === 'failed') {
          $('#error-message-connection').css('visibility', 'visible');
        } else {
          $('#error-message-connection').css('visibility', 'hidden');
        }

        // Set a timeout to show an error if connecting takes too long
        if (status === 'connecting') {
          this.clearConnectionTimeout();
          this.connectionTimeout = setTimeout(() => {
            if (this.connectionStatus === 'connecting') {
              this.connectionStatus = 'timeout';
              $('#error-message-connection').css('visibility', 'visible');
            }
          }, 10000); // 10 seconds timeout
        } else {
          this.clearConnectionTimeout();
        }
      }
    );

    this.roomService.onJoinedCreatedRoom().subscribe((roomCode: string) => {
      this.update();
      this.router.navigate(['/game/' + roomCode]);
    });

    this.roomService.onNicknameEmptyCreate().subscribe(() => {
      $('#error-message-no-nickname-create').css('visibility', 'visible');
      $('#create-game-nickname').css('border', '2px solid #cc0000');
    });

    this.roomService.onNicknameTooLongCreate().subscribe(() => {
      $('#error-message-long-nickname-create').css('visibility', 'visible');
      $('#create-game-nickname').css('border', '2px solid #cc0000');
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
    this.clearConnectionTimeout();
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  update() {
    this.gameStateService.createdUsername(this.username);
    this.gameStateService.setTeamAndRole(Team.None, Role.None);
  }

  createRoom() {
    // Only proceed if we're connected
    if (this.connectionStatus !== 'connected') {
      $('#error-message-connection').css('visibility', 'visible');
      return;
    }

    this.resetErrorMessage();

    this.username = String($('#create-game-nickname').val()).trim();
    this.roomService.onNewRoomRequested(this.username);
  }

  resetErrorMessage() {
    $('#error-message-no-nickname-create').css('visibility', 'hidden');
    $('#error-message-long-nickname-create').css('visibility', 'hidden');
    $('#error-message-connection').css('visibility', 'hidden');
    $('#create-game-nickname').css('border', '0px');
  }

  retryConnection() {
    this.connectionStatus = 'connecting';
    $('#error-message-connection').css('visibility', 'hidden');
    this.gameService.reconnect();
  }

  getConnectionMessage(): string {
    switch (this.connectionStatus) {
      case 'checking':
        return 'Checking server availability...';
      case 'connecting':
        return 'Connecting to game server...';
      case 'error':
        return 'Error connecting to game server.';
      case 'disconnected':
        return 'Disconnected from game server.';
      case 'failed':
        return 'Failed to connect to game server.';
      case 'timeout':
        return 'Connection to game server timed out.';
      case 'server_unavailable':
        return 'Game server is currently unavailable. Please try again later.';
      default:
        return '';
    }
  }
}
