import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { RoomService } from '../services/room.service';
import { GameStateService } from '../services/game-state.service';
import { GameService } from '../services/game-service.service';
import { Clue, Role, Team, Message } from '../interfaces/GameLogicInterfaces';
import { Subscription } from 'rxjs';

import * as $ from 'jquery';

@Component({
  selector: 'app-join-game',
  templateUrl: './join-game.component.html',
  styleUrls: ['./join-game.component.scss'],
})
export class JoinGameComponent implements OnInit, OnDestroy {
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
          $('#error-message-connection-join').css('visibility', 'visible');
        } else {
          $('#error-message-connection-join').css('visibility', 'hidden');
        }

        // Set a timeout to show an error if connecting takes too long
        if (status === 'connecting') {
          this.clearConnectionTimeout();
          this.connectionTimeout = setTimeout(() => {
            if (this.connectionStatus === 'connecting') {
              this.connectionStatus = 'timeout';
              $('#error-message-connection-join').css('visibility', 'visible');
            }
          }, 10000); // 10 seconds timeout
        } else {
          this.clearConnectionTimeout();
        }
      }
    );

    this.roomService.onJoinedRoom().subscribe((roomCode: string) => {
      this.router.navigate(['/game/' + roomCode]);
      this.gameStateService.setUsername(this.username);
      this.gameStateService.setTeamAndRole(Team.None, Role.None);
    });

    this.roomService.onNicknameUsed().subscribe(() => {
      $('#error-message-nickname').css('visibility', 'visible');
      $('#error-message-nickname').show();
      $('#error-message-no-nickname-join').hide();
      $('#join-game-nickname').css('border', '2px solid #cc0000');
    });

    this.roomService.onNicknameEmptyJoin().subscribe(() => {
      $('#error-message-no-nickname-join').css('visibility', 'visible');
      $('#error-message-no-nickname-join').show();
      $('#error-message-nickname').hide();
      $('#join-game-nickname').css('border', '2px solid #cc0000');
    });

    this.roomService.onNicknameTooLongJoin().subscribe(() => {
      $('#error-message-long-nickname-join').css('visibility', 'visible');
      $('#error-message-long-nickname-join').show();
      $('#error-message-nickname').hide();
      $('#join-game-nickname').css('border', '2px solid #cc0000');
    });

    this.roomService.onRoomDoesNotExist().subscribe(() => {
      $('#error-message-room-code').css('visibility', 'visible');
      $('#error-message-room-code').show();
      $('#error-message-max-capacity').hide();
      $('#room-code').css('border', '2px solid #cc0000');
    });

    this.roomService.onMaxCapacityReached().subscribe(() => {
      $('#error-message-max-capacity').css('visibility', 'visible');
      $('#error-message-max-capacity').show();
      $('#error-message-room-code').hide();
      $('#room-code').css('border', '2px solid #cc0000');
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

  joinRoom() {
    // Only proceed if we're connected
    if (this.connectionStatus !== 'connected') {
      $('#error-message-connection-join').css('visibility', 'visible');
      return;
    }

    this.resetErrorMessages();

    this.username = String($('#join-game-nickname').val()).trim();
    var roomCode = String($('#room-code').val());
    this.roomService.onRequestToJoinRoom(this.username, roomCode);
  }

  resetErrorMessages() {
    $('#error-message-nickname').css('visibility', 'hidden');
    $('#error-message-no-nickname-join').css('visibility', 'hidden');
    $('#error-message-long-nickname-join').css('visibility', 'hidden');
    $('#error-message-nickname').show();
    $('#error-message-no-nickname-join').hide();
    $('#error-message-long-nickname-join').hide();
    $('#error-message-room-code').css('visibility', 'hidden');
    $('#error-message-max-capacity').css('visibility', 'hidden');
    $('#error-message-connection-join').css('visibility', 'hidden');
    $('#error-message-room-code').show();
    $('#error-message-max-capacity').hide();
    $('#join-game-nickname').css('border', '0px');
    $('#room-code').css('border', '0px');
  }

  retryConnection() {
    this.connectionStatus = 'connecting';
    $('#error-message-connection-join').css('visibility', 'hidden');
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
