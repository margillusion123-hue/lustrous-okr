
import { Component, output, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from '../services/voice.service';

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      type="button" 
      (click)="toggleDictation()" 
      [disabled]="voiceService.status() !== 'idle' && !isListening()"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
      title="语音输入">
      @if (isListening()) {
        <span class="material-symbols-outlined text-red-500 animate-pulse">mic</span>
      } @else {
        <span class="material-symbols-outlined">mic</span>
      }
    </button>
  `,
})
export class VoiceInputComponent implements OnDestroy {
  voiceService = inject(VoiceService);
  transcript = output<string>();
  isListening = signal(false);

  toggleDictation() {
    if (this.isListening()) {
      this.voiceService.stopDictation();
    } else {
      if (this.voiceService.status() !== 'idle') return;
      
      this.isListening.set(true);
      this.voiceService.startDictation(
        // onResult
        (text) => {
          this.transcript.emit(text);
          // Assuming dictation ends after one successful result
          this.isListening.set(false); 
        },
        // onError
        () => this.isListening.set(false),
        // onEnd
        () => this.isListening.set(false)
      );
    }
  }
  
  ngOnDestroy() {
    // Ensure dictation is stopped if the component is destroyed while listening
    if (this.isListening()) {
      this.voiceService.stopDictation();
    }
  }
}
