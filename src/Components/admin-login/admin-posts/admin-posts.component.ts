// admin-posts.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

const API_BASE = 'localhost:5038/api/Post';

export interface Post {
  id:        number;
  text:      string;
  imageUrl?: string;
  createdAt: string;
}

@Component({
  selector:    'app-admin-posts',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './admin-posts.component.html',
  styleUrls:   ['./admin-posts.component.css'],
})
export class AdminPostsComponent implements OnInit {

  // feed
  posts:       Post[] = [];
  loadingPosts = false;

  // composer
  draftText          = '';
  draftImagePreview: string | null = null;
  saving    = false;
  saveError = '';

  // emoji
  showEmojiPicker = false;
  readonly emojiList = [
    '😀','😊','❤️','🙌','👏','💪','🔥','✅','⚠️','💡',
    '📢','📌','🏥','💊','🩺','🩻','👨‍⚕️','👩‍⚕️','🌟','📅',
  ];

  // edit / delete
  editingId:    number | null = null;
  deleteTarget: Post   | null = null;
  deletingId:   number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadPosts(); }

  // ── Load ────────────────────────────────────────────────────

  loadPosts(): void {
    this.loadingPosts = true;
    this.http.get<Post[]>(API_BASE).subscribe({
      next:  data  => { this.posts = data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); this.loadingPosts = false; },
      error: ()    => { this.posts = this.mockPosts(); this.loadingPosts = false; },
    });
  }

  // ── Submit (create or update) ───────────────────────────────

  submitPost(): void {
    if (this.draftText.trim().length === 0 || this.saving) return;
    this.editingId !== null ? this.updatePost() : this.createPost();
  }

  private createPost(): void {
    this.saving = true;
    this.saveError = '';
    const payload = { text: this.draftText.trim(), imageUrl: this.draftImagePreview ?? undefined };

    this.http.post<Post>(API_BASE, payload).subscribe({
      next: created => {
        this.posts.unshift(created);
        this.resetComposer();
        this.saving = false;
      },
      error: () => {
        // optimistic local add
        this.posts.unshift({ id: Date.now(), text: payload.text, imageUrl: payload.imageUrl, createdAt: new Date().toISOString() });
        this.resetComposer();
        this.saving = false;
      },
    });
  }

  private updatePost(): void {
    if (this.editingId === null) return;
    this.saving = true;
    this.saveError = '';
    const id = this.editingId;
    const payload = { id, text: this.draftText.trim(), imageUrl: this.draftImagePreview ?? undefined };

    this.http.put<Post>(`${API_BASE}/${id}`, payload).subscribe({
      next: updated => {
        this.posts = this.posts.map(p => p.id === id ? updated : p);
        this.resetComposer();
        this.saving = false;
      },
      error: () => {
        // optimistic local update
        this.posts = this.posts.map(p => p.id === id ? { ...p, text: payload.text, imageUrl: payload.imageUrl } : p);
        this.resetComposer();
        this.saving = false;
      },
    });
  }

  // ── Edit ────────────────────────────────────────────────────

  startEdit(post: Post): void {
    this.editingId         = post.id;
    this.draftText         = post.text;
    this.draftImagePreview = post.imageUrl ?? null;
    this.saveError         = '';
    this.showEmojiPicker   = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void { this.resetComposer(); }

  // ── Delete ──────────────────────────────────────────────────

  confirmDelete(post: Post): void { this.deleteTarget = post; }
  cancelDelete():            void { this.deleteTarget = null; }

  executeDelete(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.id;
    this.deletingId   = id;
    this.deleteTarget = null;

    this.http.delete(`${API_BASE}/${id}`).subscribe({
      next:  () => { this.posts = this.posts.filter(p => p.id !== id); this.deletingId = null; },
      error: () => { this.posts = this.posts.filter(p => p.id !== id); this.deletingId = null; },
    });
  }

  // ── Image ───────────────────────────────────────────────────

  triggerFileInput(): void {
    document.getElementById('ap-file-input')?.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.draftImagePreview = reader.result as string; };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  removeImage(): void { this.draftImagePreview = null; }

  // ── Emoji ───────────────────────────────────────────────────

  toggleEmoji(): void { this.showEmojiPicker = !this.showEmojiPicker; }

  insertEmoji(emoji: string): void { this.draftText += emoji; }

  // ── Helpers ─────────────────────────────────────────────────

  renderText(text: string): string {
    const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const linked  = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:#3B82F6;text-decoration:underline">$1</a>');
    return linked.replace(/\n/g, '<br>');
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1)  return 'Just now';
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const d = Math.floor(h / 24);
      if (d < 7)  return `${d}d ago`;
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  }

  private resetComposer(): void {
    this.draftText         = '';
    this.draftImagePreview = null;
    this.editingId         = null;
    this.saveError         = '';
    this.showEmojiPicker   = false;
    this.saving            = false;
  }

  private mockPosts(): Post[] {
    return [
      { id: 1, text: '🏥 Welcome to MedFinder!\n\nBook appointments with top-rated specialists 24/7 from any device.', createdAt: new Date(Date.now() - 2*3600000).toISOString() },
      { id: 2, text: '⚠️ Scheduled maintenance: Saturday 2:00 AM – 4:00 AM EET.\nThank you for your patience.', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 3, text: '💡 Health Tip: Regular checkups catch issues early.\nSchedule your annual physical today! 🌟', createdAt: new Date(Date.now() - 3*86400000).toISOString() },
    ];
  }
}