import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { Server, Socket } from 'socket.io';
import { NewMessageDto } from './dtos/new-messages.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/interfaces';

@WebSocketGateway({ cors: true })
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect{

  @WebSocketServer() wss: Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection( client: Socket, ...args: any[] ) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;
    
    try {
      payload = this.jwtService.verify( token );
      await this.messagesWsService.registerClient( client, payload.id );

    } catch (error) {
      client.disconnect();
      return;
    }

    this.wss.emit('clients-updated', this.messagesWsService.getConnectedClients() );
    // console.log({ conectados: this.messagesWsService.getConnectedClients() });
    // console.log({ payload })
  }

  handleDisconnect( client: Socket ) {
    this.messagesWsService.removeClient( client.id );
    this.wss.emit('clients-updated', this.messagesWsService.getConnectedClients() )
    // console.log({ conectados: this.messagesWsService.getConnectedClients() });
  }

  @SubscribeMessage('message-from-client')
  handleMessageFromClient( client: Socket, payload: NewMessageDto ) {
    
    //! Emite únicamente al cliente.
    // client.emit('message-from-server', {
    //   fullNasme: 'Soy Yo!',
    //   message: payload.message || 'no-message!!'
    // });

    //! Emite a todos MENOS al cliente inicial.
    // client.broadcast.emit('message-from-server', {
    //   fullNasme: 'Soy Yo!',
    //   message: payload.message || 'no-message!!'
    // });

    //Envía a todos
    const userFullName = this.messagesWsService.getUserFullName( client.id );
    
    this.wss.emit('message-from-server', {
      fullName: userFullName,
      message: payload.message || 'no-message!!'
    });

  }
}
