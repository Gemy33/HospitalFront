
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../Core/auth.service';
import { DoctorService } from '../../../Core/doctor.service';

export interface Doctor {
  name: string;
  specialty: string;
  avatarUrl?: string;
  isOnline: boolean;
}

export interface SidebarStats {
  todayAppointments: number;
  totalPatients: number;
  pendingRx: number;
  pendingTasks: number;
}

@Component({
  selector: 'app-doctor-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './doctor-navbar.component.html',
  styleUrls: ['./doctor-navbar.component.css'],
})
export class DoctorNavbarComponent implements OnInit, OnDestroy {

  // ── Inputs ──────────────────────────────────────────────────────────────────

  /** Doctor profile data passed from parent */
   doctor: Doctor = {} as Doctor;

  /** Quick stats shown in the stats strip */
  @Input() stats: SidebarStats = {
    todayAppointments: 7,
    totalPatients: 142,
    pendingRx: 3,
    pendingTasks: 2,
  };

  // ── Outputs ─────────────────────────────────────────────────────────────────

  @Output() signedOut = new EventEmitter<void>();
  @Output() zoomCallStarted = new EventEmitter<void>();
  @Output() zoomCallEnded = new EventEmitter<void>();
 

  // ── State ───────────────────────────────────────────────────────────────────

 
  isInCall = false;

  /** Zoom meeting URL generated from the API — injected via ZoomService in real usage */
  private zoomMeetingUrl = '';

  constructor(private router: Router,private _authservice:AuthService,private _doctorService:DoctorService) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────────
 DoctorId:string=this._authservice.Id;
  ngOnInit(): void {
      this._doctorService.getDoctorProfile(this.DoctorId).subscribe({
        next:(res)=>{
          this.doctor.name=res.name
          this.doctor.specialty=res.speciality;
        },
        error:(err)=>console.log(err)

      })
  }

  ngOnDestroy(): void {
    // End any active call when component is destroyed
    if (this.isInCall) {
      this.endZoomCall();
    }
  }

  // ── Public Methods ───────────────────────────────────────────────────────────

  
  /**
   * Derive initials from a full name for the avatar fallback
   * e.g. "Dr. Sarah Mitchell" → "SM"
   */
  getInitials(name: string): string {
    return name
      .replace(/^Dr\.?\s*/i, '')   // strip "Dr." prefix
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  }

  /**
   * Start or end a Zoom video call.
   *
   * In a real application, wire this to your ZoomService which:
   * 1. Calls POST /api/zoom/create-meeting to generate a meeting URL
   * 2. Opens the meeting in a new tab / Zoom SDK iframe
   * 3. Sets isInCall = true while the session is active
   *
   * Example service injection:
   *   constructor(private zoomService: ZoomService) {}
   *
   *   startZoomCall() {
   *     this.zoomService.createMeeting().subscribe(meeting => {
   *       window.open(meeting.joinUrl, '_blank');
   *       this.isInCall = true;
   *       this.zoomCallStarted.emit();
   *     });
   *   }
   */
  startZoomCall(): void {
    if (this.isInCall) {
      this.endZoomCall();
      return;
    }

    // ─── Replace with real Zoom SDK / API call ───
    console.log('[DoctorSidebar] Initiating Zoom meeting…');
    this.createZoomMeeting()
      .then((meetingUrl) => {
        this.zoomMeetingUrl = meetingUrl;
        window.open(meetingUrl, '_blank', 'noopener,noreferrer');
        this.isInCall = true;
        this.zoomCallStarted.emit();
      })
      .catch((err) => {
        console.error('[DoctorSidebar] Failed to create Zoom meeting:', err);
      });
  }

  /**
   * Sign the doctor out.
   * Clears local state, emits event, then navigates to /login.
   * Replace localStorage.clear() with your AuthService.signOut() in production.
   */
  signOut(): void {
    this.isInCall = false;
    // In production: this.authService.signOut().subscribe(() => { ... });
    localStorage.removeItem('token');
    // localStorage.removeItem('doctor_session');
    this.signedOut.emit();
    this.router.navigate(['/auth']);
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  private endZoomCall(): void {
    this.isInCall = false;
    this.zoomMeetingUrl = '';
    this.zoomCallEnded.emit();
    console.log('[DoctorSidebar] Zoom call ended.');
  }

  /**
   * Stub for Zoom meeting creation.
   *
   * Replace with a real API call to your backend, e.g.:
   *
   *   POST /api/zoom/meetings
   *   Authorization: Bearer <doctor_token>
   *   Body: { topic: "Patient Consultation", duration: 30 }
   *   → { joinUrl: "https://zoom.us/j/xxx?pwd=yyy", meetingId: "..." }
   *
   * Zoom OAuth 2.0 reference:
   * https://developers.zoom.us/docs/api/meetings/#tag/meetings/POST/users/{userId}/meetings
   */
  private createZoomMeeting(): Promise<string> {
    return new Promise((resolve) => {
      // Simulated API delay — remove in production
      setTimeout(() => {
        resolve('https://zoom.us/j/placeholder-meeting-id');
      }, 400);
    });
  }
}
