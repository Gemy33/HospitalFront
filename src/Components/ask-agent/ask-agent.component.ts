// chat.component.ts
import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked,
  inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { OPENROUTER_KEY_ai } from '../../Core/openRouterKey';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
  loading?:  boolean;
  error?:    boolean;
}

export interface OpenRouterMessage {
  role:    'user' | 'assistant' | 'system';
  content: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector:    'app-chat',
  standalone:  true,
  imports:     [CommonModule, FormsModule, HttpClientModule],
   templateUrl: './ask-agent.component.html',
  styleUrl: './ask-agent.component.css'
})
export class AskAgentComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;
  @ViewChild('inputRef')    private inputRef!:    ElementRef;

  private http  = inject(HttpClient);
  private route = inject(ActivatedRoute);

  // ── State ───────────────────────────────────────────────────────────────────

  messages    = signal<ChatMessage[]>([]);
  inputText   = '';
  isSending   = false;
  sidebarOpen = false;

  patientName = '';
  chatContext = '';

  // ── OpenRouter config ───────────────────────────────────────────────────────
  // Replace API_KEY with your own key
  private readonly API_KEY   = OPENROUTER_KEY_ai;
  private readonly API_URL   = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly MODEL     = 'openai/gpt-oss-20b:free';
  private readonly MAX_TOKENS = 1024;

  // ── System prompt ───────────────────────────────────────────────────────────
  private get systemPrompt(): string {
    const base = `You are a helpful medical assistant for MediLink, a digital healthcare platform.
You assist doctors with patient consultations, medical questions, and clinical decision support.
Always be professional, empathetic, and evidence-based.
Never replace professional medical judgment — always recommend consulting a qualified physician for diagnoses.
Keep responses concise and structured when possible.`;

    if (this.patientName) {
      return `${base}\n\nCurrent consultation is with patient: ${this.patientName}.${this.chatContext ? `\nContext: ${this.chatContext}` : ''}`;
    }
    return base;
  }

  readonly suggestions: string[] = [
    'What are common causes of persistent headaches?',
    'Explain type 2 diabetes management',
    'Review medication interaction risks',
    'Suggest follow-up questions for hypertension',
    'What does elevated CRP indicate?',
    'Draft a patient discharge summary',
  ];

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? '';
    this.chatContext = this.route.snapshot.queryParamMap.get('context')     ?? '';

    this.messages.set([{
      id:        this.uid(),
      role:      'assistant',
      content:   this.patientName
        ? `Hello! I'm ready to assist with ${this.patientName}'s consultation. What would you like to know?`
        : `Hello! I'm your MediLink AI assistant. I can help with clinical questions, patient summaries, medication queries, and more. How can I help you today?`,
      timestamp: new Date(),
    }]);
  }

  ngOnDestroy(): void {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  // ── Send ────────────────────────────────────────────────────────────────────

  send(text?: string): void {
    const content = (text ?? this.inputText).trim();
    if (!content || this.isSending) return;

    this.inputText = '';
    this.isSending = true;

    // Add user message
    this.messages.update(m => [...m, {
      id: this.uid(), role: 'user', content, timestamp: new Date(),
    }]);

    // Add loading placeholder
    const loadingId = this.uid();
    this.messages.update(m => [...m, {
      id: loadingId, role: 'assistant', content: '', timestamp: new Date(), loading: true,
    }]);

    // Build history — OpenRouter uses OpenAI format
    // System message goes first, then conversation history
    const history: OpenRouterMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...this.messages()
        .filter(m => !m.loading && m.id !== loadingId)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    // ── OpenRouter only needs Authorization + Content-Type ─────────────────
    // No Anthropic-specific headers — those caused the CORS error
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.API_KEY}`,
      'Content-Type':  'application/json',
      // Optional but recommended by OpenRouter for rate-limit attribution
      'HTTP-Referer':  'http://localhost:4200',
      'X-Title':       'MediLink Chat',
    });

    const body = {
      model:      this.MODEL,
      max_tokens: this.MAX_TOKENS,
      messages:   history,
    };

    this.http.post<any>(this.API_URL, body, { headers }).subscribe({
      next: (res) => {
        // OpenRouter returns OpenAI-compatible response format:
        // res.choices[0].message.content
        const reply =
          res?.choices?.[0]?.message?.content ??
          'Sorry, I could not generate a response.';

        this.messages.update(msgs =>
          msgs.map(m => m.id === loadingId
            ? { ...m, content: reply, loading: false, timestamp: new Date() }
            : m
          )
        );
        this.isSending = false;
        this.focusInput();
      },
      error: (err) => {
        console.error('[Chat] API error:', err);

        // Extract OpenRouter / OpenAI error message if available
        const errMsg =
          err?.error?.error?.message ??
          err?.error?.message ??
          'Failed to connect. Please try again.';

        this.messages.update(msgs =>
          msgs.map(m => m.id === loadingId
            ? { ...m, content: errMsg, loading: false, error: true, timestamp: new Date() }
            : m
          )
        );
        this.isSending = false;
      },
    });
  }

  useSuggestion(s: string): void { this.send(s); }

  clearChat(): void {
    this.messages.set([{
      id: this.uid(), role: 'assistant',
      content: 'Chat cleared. How can I help you?',
      timestamp: new Date(),
    }]);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  get hasMessages(): boolean {
    return this.messages().filter(m => m.role === 'user').length > 0;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private scrollToBottom(): void {
    try { this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); }
    catch {}
  }

  private focusInput(): void {
    setTimeout(() => this.inputRef?.nativeElement?.focus(), 100);
  }

  private uid(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  formatContent(content: string): string {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  trackById(_: number, m: ChatMessage): string { return m.id; }
}