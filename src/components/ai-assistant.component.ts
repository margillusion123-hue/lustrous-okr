
import { Component, inject, input, signal, viewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssistantService } from '../services/assistant.service';
import { VoiceService } from '../services/voice.service';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-[80] flex items-end justify-center">
        <div (click)="closeAssistant()" class="absolute inset-0 bg-slate-900/10 backdrop-blur-sm animate-in fade-in"></div>
        <div class="relative w-full max-w-md h-[80%] glass-panel bg-white/80 rounded-t-[2.5rem] p-4 pt-6 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
          
          <!-- Header -->
          <div class="flex-shrink-0 flex items-center justify-between pb-4 px-2 border-b border-slate-200">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-teal-400"></span>
              <h3 class="font-bold text-slate-700">AI 生产力副驾</h3>
            </div>
            <button (click)="closeAssistant()" class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <!-- Chat History -->
          <div #chatContainer class="flex-1 overflow-y-auto py-4 space-y-4 px-2">
            @for (message of assistantService.messages(); track $index) {
              <div class="flex" [class.justify-end]="message.role === 'user'">
                <div class="max-w-[80%] p-3 rounded-2xl" 
                     [class.bg-teal-500]="message.role === 'user'"
                     [class.text-white]="message.role === 'user'"
                     [class.bg-slate-100]="message.role === 'assistant'"
                     [class.text-slate-800]="message.role === 'assistant'">
                  <p class="text-sm leading-relaxed">{{ message.text }}</p>
                </div>
              </div>
            }
            @if (assistantService.status() === 'thinking') {
               <div class="flex">
                  <div class="bg-slate-100 text-slate-800 p-3 rounded-2xl">
                    <div class="flex items-center gap-2">
                      <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" style="animation-delay: 0s;"></span>
                      <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" style="animation-delay: 0.2s;"></span>
                      <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" style="animation-delay: 0.4s;"></span>
                    </div>
                  </div>
               </div>
            }
          </div>

          <!-- Input Area -->
          <div class="flex-shrink-0 flex items-center gap-2 pt-3 border-t border-slate-200">
            <div class="relative flex-1">
              <input type="text" [(ngModel)]="textInput" (keyup.enter)="sendMessage()" 
                 placeholder="输入或点击麦克风说话..."
                 class="w-full flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none pr-10">
            </div>
            <button (click)="toggleDictation()" [disabled]="assistantService.status() !== 'idle'"
              class="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center active:scale-90 transition-transform shadow-sm disabled:opacity-50">
              @if (isListening()) {
                <span class="material-symbols-outlined text-red-500 animate-pulse">mic</span>
              } @else {
                <span class="material-symbols-outlined">mic</span>
              }
            </button>
            <button (click)="sendMessage()" [disabled]="!textInput() || assistantService.status() !== 'idle'" 
              class="w-12 h-12 rounded-xl bg-teal-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg disabled:opacity-50">
              <span class="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AiAssistantComponent {
  assistantService = inject(AssistantService);
  voiceService = inject(VoiceService);

  isOpen = input.required<boolean>();
  textInput = signal('');
  isListening = signal(false);

  chatContainer = viewChild<ElementRef>('chatContainer');

  constructor() {
    effect(() => {
      // Auto-scroll chat to bottom
      if (this.assistantService.messages() && this.chatContainer()) {
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });
  }
  
  closeAssistant() {
    this.assistantService.isAssistantOpen.set(false);
  }

  sendMessage() {
    if (!this.textInput().trim() || this.assistantService.status() !== 'idle') return;
    this.assistantService.sendMessage(this.textInput());
    this.textInput.set('');
  }

  toggleDictation() {
    if (this.isListening()) {
      this.voiceService.stopDictation();
    } else {
      if (this.voiceService.status() !== 'idle') return;
      
      this.isListening.set(true);
      this.voiceService.startDictation(
        (text) => {
          this.textInput.set(text);
          this.sendMessage(); // Send message after successful dictation
        },
        () => this.isListening.set(false),
        () => this.isListening.set(false)
      );
    }
  }

  private scrollToBottom(): void {
    try {
      if(this.chatContainer()) {
        this.chatContainer()!.nativeElement.scrollTop = this.chatContainer()!.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }
}
