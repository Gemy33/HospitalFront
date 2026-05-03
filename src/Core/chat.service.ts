import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';

export interface IMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderRole: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface IConversation {
  id: number;
  patientId: number;
  doctorId: number;
  appointmentId: number;
  title: string;
  createdAt: string;
  lastMessage: IMessage | null;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService {

  private baseUrl = 'http://localhost:5038/api/Chat';
  private hubUrl  = 'http://localhost:5038/hubs/chat';
  private hub!: signalR.HubConnection;

  // Signals exposed to components
  messages      = signal<IMessage[]>([]);
  connected     = signal(false);

  constructor(private http: HttpClient) {}

  // ── REST ─────────────────────────────────────────────────────

  createConversation(patientId: number, doctorId: number, appointmentId: number): Observable<IConversation> {
    return this.http.post<IConversation>(`${this.baseUrl}/conversations`,
      { patientId, doctorId, appointmentId });
  }

  getConversations(patientId: number): Observable<IConversation[]> {
    return this.http.get<IConversation[]>(
      `${this.baseUrl}/conversations/patient/${patientId}`);
  }

  getMessages(conversationId: number): Observable<IMessage[]> {
    return this.http.get<IMessage[]>(
      `${this.baseUrl}/conversations/${conversationId}/messages`);
  }

  // ── SignalR ───────────────────────────────────────────────────

  connect(): Promise<void> {
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('ReceiveMessage', (msg: IMessage) => {
      this.messages.update(list => [...list, msg]);
    });

    this.hub.on('MessagesRead', (conversationId: number) => {
      this.messages.update(list =>
        list.map(m => m.conversationId === conversationId
          ? { ...m, isRead: true } : m)
      );
    });

    return this.hub.start().then(() => {
      this.connected.set(true);
    });
  }

  joinConversation(conversationId: number): Promise<void> {
    return this.hub.invoke('JoinConversation', conversationId);
  }

  leaveConversation(conversationId: number): Promise<void> {
    return this.hub.invoke('LeaveConversation', conversationId);
  }

  sendMessage(conversationId: number, senderId: number,
              senderRole: string, content: string): Promise<void> {
    return this.hub.invoke('SendMessage', {
      conversationId, senderId, senderRole, content
    });
  }

  markRead(conversationId: number, userId: number): Promise<void> {
    return this.hub.invoke('MarkRead', conversationId, userId);
  }

  disconnect(): Promise<void> {
    this.connected.set(false);
    return this.hub?.stop();
  }

  setMessages(msgs: IMessage[]): void {
    this.messages.set(msgs);
  }
}