import { Component, OnInit, OnDestroy, signal, computed,
         ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, IConversation, IMessage } from '../../Core/chat.service';
import { AuthService } from '../../Core/auth.service'; 
import { PatientService } from '../../Core/patient.service';
import * as signalR from '@microsoft/signalr';


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('msgEnd') msgEnd!: ElementRef;

  // ── State ────────────────────────────────────────────────────
  conversations     = signal<IConversation[]>([]);
  activeConv        = signal<IConversation | null>(null);
  loadingConvs      = signal(false);
  loadingMsgs       = signal(false);
  sending           = signal(false);
  text              = signal('');
  patientId         = signal(0);
  errorConvs        = signal<string | null>(null);
  showNewConvModal  = signal(false);
  creatingConv      = signal(false);
  shouldScroll      = false;

  messages = computed(() => this.chatSvc.messages());

  unread = computed(() =>
    this.conversations().reduce((s, c) => s + c.unreadCount, 0)
  );

  constructor(
    public chatSvc: ChatService,
    private auth: AuthService,
    private patientSvc: PatientService,
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId()!;
    this.patientSvc.getPatientProfileByUserId(userId).subscribe({
      next: (p: any) => {
        this.patientId.set(p.id);
        this.loadConversations();
        this.chatSvc.connect();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.activeConv()) {
      this.chatSvc.leaveConversation(this.activeConv()!.id);
    }
    this.chatSvc.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ── Load ─────────────────────────────────────────────────────

  loadConversations(): void {
    this.loadingConvs.set(true);
    this.chatSvc.getConversations(this.patientId()).subscribe({
      next: data => { this.conversations.set(data); this.loadingConvs.set(false); },
      error: ()  => { this.errorConvs.set('Failed to load conversations.'); this.loadingConvs.set(false); },
    });
  }

  openConversation(conv: IConversation): void {
    // Leave previous
    if (this.activeConv()) {
      this.chatSvc.leaveConversation(this.activeConv()!.id);
    }

    this.activeConv.set(conv);
    this.loadingMsgs.set(true);
    this.chatSvc.setMessages([]);

    // Load history
    this.chatSvc.getMessages(conv.id).subscribe({
      next: msgs => {
        this.chatSvc.setMessages(msgs);
        this.loadingMsgs.set(false);
        this.shouldScroll = true;

        // Join SignalR group
        this.chatSvc.joinConversation(conv.id);

        // Mark as read
        this.chatSvc.markRead(conv.id, this.patientId());

        // Reset unread badge
        this.conversations.update(list =>
          list.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
        );
      },
      error: () => { this.loadingMsgs.set(false); }
    });
  }

  send(): void {
    const content = this.text().trim();
    if (!content || !this.activeConv() || this.sending()) return;

    this.sending.set(true);
    this.chatSvc.sendMessage(
      this.activeConv()!.id,
      this.patientId(),
      'Patient',
      content,
    ).then(() => {
      this.text.set('');
      this.sending.set(false);
      this.shouldScroll = true;
    }).catch(() => {
      this.sending.set(false);
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  clearActive(): void {
    if (this.activeConv()) {
      this.chatSvc.leaveConversation(this.activeConv()!.id);
    }
    this.activeConv.set(null);
    this.chatSvc.setMessages([]);
  }

  scrollToBottom(): void {
    try {
      this.msgEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  // ── Helpers ──────────────────────────────────────────────────

  isMine(msg: IMessage): boolean {
    return msg.senderRole === 'Patient';
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const diff  = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  showDateSeparator(msgs: IMessage[], i: number): boolean {
    if (i === 0) return true;
    const a = new Date(msgs[i - 1].sentAt).toDateString();
    const b = new Date(msgs[i].sentAt).toDateString();
    return a !== b;
  }

  getInitials(role: string): string {
    return role === 'Patient' ? 'P' : 'Dr';
  }
}