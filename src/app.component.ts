
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AiAssistantComponent } from './components/ai-assistant.component';
import { AssistantService } from './services/assistant.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, AiAssistantComponent],
  template: `
    <div class="relative flex flex-col h-screen w-full max-w-md mx-auto overflow-hidden bg-white/20 shadow-2xl border-x border-white/50">
      
      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto no-scrollbar pb-24 relative z-10">
        <router-outlet></router-outlet>
      </main>

      <!-- Global Actions -->
      <div class="fixed bottom-24 right-5 z-[70] flex flex-col gap-3">
        <!-- AI Copilot Button -->
        <button 
          (click)="assistantService.toggleAssistant()"
          class="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-xl hover:scale-105 active:scale-95 transition-all border border-white/40 ring-4 ring-indigo-100/50">
          <span class="material-symbols-outlined text-2xl drop-shadow-md">
            smart_toy
          </span>
        </button>
      </div>

      <!-- AI Assistant Overlay -->
      <app-ai-assistant [isOpen]="assistantService.isAssistantOpen()"></app-ai-assistant>

      <!-- Bottom Navigation Bar (4 Items) -->
      <nav class="absolute bottom-0 z-50 w-full bg-white/70 backdrop-blur-2xl border-t border-white/60 pb-safe pt-2 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        <div class="grid grid-cols-4 h-16">
          <a routerLink="/okr" routerLinkActive="text-teal-600" class="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-teal-500 transition-colors">
            <span class="material-symbols-outlined text-[24px]">track_changes</span>
            <span class="text-[10px] font-bold">目标</span>
          </a>
          <a routerLink="/today" routerLinkActive="text-teal-600" class="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-teal-500 transition-colors">
            <span class="material-symbols-outlined text-[24px]">event_note</span>
            <span class="text-[10px] font-bold">计划</span>
          </a>
          <a routerLink="/records" routerLinkActive="text-teal-600" class="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-teal-500 transition-colors">
            <span class="material-symbols-outlined text-[24px]">history_edu</span>
            <span class="text-[10px] font-bold">记录</span>
          </a>
          <a routerLink="/insights" routerLinkActive="text-teal-600" class="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-teal-500 transition-colors">
            <span class="material-symbols-outlined text-[24px]">monitoring</span>
            <span class="text-[10px] font-bold">洞察</span>
          </a>
        </div>
      </nav>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
  `]
})
export class AppComponent {
  assistantService = inject(AssistantService);
}
