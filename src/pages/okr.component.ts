
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { VoiceInputComponent } from '../components/voice-input.component';

@Component({
  selector: 'app-okr',
  imports: [CommonModule, RouterLink, FormsModule, VoiceInputComponent],
  template: `
    <div class="px-5 pt-12 pb-10">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-black text-slate-800 tracking-tight">我的 OKR</h2>
        <button (click)="showModal.set(true)" class="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-teal-600 shadow-sm active:scale-90 transition-transform">
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>

      <!-- Progress Visualization -->
      <div class="flex flex-col items-center justify-center py-6 mb-10">
        <div class="relative w-52 h-52">
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="transparent" stroke="#f1f5f9" stroke-width="8" />
            <circle cx="50" cy="50" r="42" fill="transparent" stroke="url(#okr-grad)" stroke-width="8"
              stroke-dasharray="263.8" [attr.stroke-dashoffset]="263.8 * (1 - dataService.totalProgress() / 100)" stroke-linecap="round" class="transition-all duration-1000 ease-out" />
            <defs>
              <linearGradient id="okr-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#2dd4bf" />
                <stop offset="100%" stop-color="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-5xl font-black text-gradient">{{ dataService.totalProgress() }}%</span>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">总达成度</span>
          </div>
        </div>
      </div>

      <!-- Objectives List -->
      <div class="space-y-6">
        @for (obj of dataService.objectives(); track obj.id) {
          <div [routerLink]="['/okr', obj.id]" 
            class="glass-panel rounded-3xl p-5 crystal-shadow relative group overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 cursor-pointer active:scale-95 transition-all">
            <div class="flex justify-between items-start mb-4 relative z-10">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-600 text-[9px] font-black uppercase">{{ obj.tag }}</span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase">截止于 {{ obj.deadline }}</span>
                </div>
                <h4 class="text-base font-bold text-slate-800 leading-snug">{{ obj.title }}</h4>
              </div>
              
              <!-- Delete Action -->
              <button (click)="$event.stopPropagation(); deleteOkr(obj.id)" class="w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-300 flex items-center justify-center transition-all z-20">
                <span class="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>

            <div class="space-y-3 relative z-10">
              <div class="flex justify-between items-end">
                <div class="flex items-center gap-1">
                   <span class="text-xs font-bold text-slate-400">计划投入</span>
                   <span class="text-xs font-black text-slate-700">{{ obj.totalHours }}h</span>
                </div>
                <span class="text-sm font-black text-teal-600">{{ obj.progress }}%</span>
              </div>
              <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(45,212,191,0.3)] transition-all duration-700"
                  [style.width.%]="obj.progress"></div>
              </div>
            </div>
            
            <!-- Decoration -->
            <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-teal-400/5 rounded-full blur-2xl"></div>
          </div>
        }
      </div>

      <!-- Add OKR Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-5">
          <!-- Backdrop -->
          <div (click)="showModal.set(false)" class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200"></div>
          
          <!-- Modal Panel -->
          <div class="relative w-full max-w-sm glass-panel bg-white/80 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-teal-500">add_circle</span>
              新建目标
            </h3>
            
            <div class="space-y-4 mb-6">
              <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">目标标题</label>
                <div class="relative">
                  <input type="text" [(ngModel)]="newTitle" placeholder="例如：重构后端 API"
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:bg-white transition-all pr-10">
                  <app-voice-input (transcript)="newTitle.set($event)"></app-voice-input>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                 <div>
                   <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">标签</label>
                   <select [(ngModel)]="newTag" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
                     <option value="工作">工作</option>
                     <option value="工作+">工作+</option>
                     <option value="学习">学习</option>
                     <option value="生活">生活</option>
                   </select>
                 </div>
                 <div>
                   <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">截止日期</label>
                   <div class="relative">
                     <input type="text" [(ngModel)]="newDeadline" placeholder="2个月后"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:bg-white transition-all pr-10">
                     <app-voice-input (transcript)="newDeadline.set($event)"></app-voice-input>
                   </div>
                 </div>
              </div>

              <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">预计投入总工时 (h)</label>
                <input type="number" [(ngModel)]="newTotalHours" placeholder="100"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:bg-white transition-all">
              </div>
            </div>

            <div class="flex gap-3">
              <button (click)="showModal.set(false)" class="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all">取消</button>
              <button (click)="addOkr()" 
                [disabled]="!newTitle() || !newTotalHours()"
                class="flex-1 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:active:scale-100">
                创建
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class OkrComponent {
  dataService = inject(DataService);
  
  showModal = signal(false);
  newTitle = signal('');
  newTag = signal('工作');
  newDeadline = signal('');
  newTotalHours = signal<number | null>(null);

  addOkr() {
    if (!this.newTitle() || !this.newTotalHours()) return;

    this.dataService.addObjective({
      title: this.newTitle(),
      tag: this.newTag(),
      deadline: this.newDeadline() || '2个月后',
      totalHours: this.newTotalHours() || 0,
      status: 'active'
    });

    // Reset and Close
    this.newTitle.set('');
    this.newTag.set('工作');
    this.newDeadline.set('');
    this.newTotalHours.set(null);
    this.showModal.set(false);
  }

  deleteOkr(id: string) {
    if(confirm('确定要删除这个目标及其所有分解任务吗？')) {
      this.dataService.deleteObjective(id);
    }
  }
}
