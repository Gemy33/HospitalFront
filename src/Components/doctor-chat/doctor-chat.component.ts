import { Component, OnInit, OnDestroy, signal, computed,
         ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, IConversation, IMessage } from '../../Core/chat.service';
import { AuthService } from '../../Core/auth.service';

@Component({
  selector: 'app-doctor-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-chat.component.html',
  styleUrls: ['./doctor-chat.component.css'],
})
export class DoctorChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('msgEnd') msgEnd!: ElementRef;

  conversations  = signal<IConversation[]>([]);
  activeConv     = signal<IConversation | null>(null);
  loadingConvs   = signal(false);
  loadingMsgs    = signal(false);
  sending        = signal(false);
  text           = signal('');
  doctorId       = signal(0);
  errorConvs     = signal<string | null>(null);
  shouldScroll   = false;

  messages = computed(() => this.chatSvc.messages());

  totalUnread = computed(() =>
    this.conversations().reduce((s, c) => s + c.unreadCount, 0)
  );

  // Group by patient
  groupedByPatient = computed(() => {
    const map = new Map<number, IConversation[]>();
    for (const conv of this.conversations()) {
      const list = map.get(conv.patientId) ?? [];
      list.push(conv);
      map.set(conv.patientId, list);
    }
    return map;
  });

  patientIds = computed(() => Array.from(this.groupedByPatient().keys()));

  constructor(
    public chatSvc: ChatService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    // Get doctorId from auth token claims
    // Replace with however your auth service exposes doctorId
    const doctorId = Number(this.auth.Id);
    this.doctorId.set(doctorId);
    this.loadConversations();
    this.chatSvc.connect();
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

  loadConversations(): void {
    this.loadingConvs.set(true);
    this.errorConvs.set(null);
    this.chatSvc.getDoctorConversations(this.doctorId()).subscribe({
      next: data => {
        this.conversations.set(data);
        this.loadingConvs.set(false);
      },
      error: () => {
        this.errorConvs.set('Failed to load conversations.');
        this.loadingConvs.set(false);
      },
    });
  }

  openConversation(conv: IConversation): void {
    if (this.activeConv()) {
      this.chatSvc.leaveConversation(this.activeConv()!.id);
    }

    this.activeConv.set(conv);
    this.loadingMsgs.set(true);
    this.chatSvc.setMessages([]);

    this.chatSvc.getMessages(conv.id).subscribe({
      next: msgs => {
        this.chatSvc.setMessages(msgs);
        this.loadingMsgs.set(false);
        this.shouldScroll = true;
        this.chatSvc.joinConversation(conv.id);
        // Doctor marks patient messages as read
        this.chatSvc.markRead(conv.id, this.doctorId());
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
      this.doctorId(),
      'Doctor',          // ✅ senderRole is Doctor
      content,
    ).then(() => {
      this.text.set('');
      this.sending.set(false);
      this.shouldScroll = true;
    }).catch(() => { this.sending.set(false); });
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
    try { this.msgEnd.nativeElement.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  isMine(msg: IMessage): boolean { return msg.senderRole === 'Doctor'; }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  formatDate(iso: string): string {
    const d     = new Date(iso);
    const today = new Date();
    const diff  = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  showDateSeparator(msgs: IMessage[], i: number): boolean {
    if (i === 0) return true;
    return new Date(msgs[i - 1].sentAt).toDateString() !==
           new Date(msgs[i].sentAt).toDateString();
  }

  getConvsForPatient(patientId: number): IConversation[] {
    return this.groupedByPatient().get(patientId) ?? [];
  }
}