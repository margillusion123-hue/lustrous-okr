
import { Component, inject, signal, ChangeDetectionStrategy, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, ScheduleItem } from '../services/data.service';
import { GoogleGenAI } from "@google/genai";
import { VoiceInputComponent } from '../components/voice-input.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-today',
  imports: [CommonModule, FormsModule, VoiceInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-5 pt-12 pb-10">
      <!-- AI Strategy Header -->
      <div class="glass-panel p-5 rounded-[2rem] mb-8 iridescent-bg border-indigo-100/30 refraction-shadow relative overflow-hidden group">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <span class="material-symbols-outlined text-sm">tips_and_updates</span>
          </div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日 AI 执行导航</span>
          @if (loadingStrategy()) {
            <span class="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
          }
        </div>
        <p class="text-xs font-medium text-slate-700 leading-relaxed min-h-[3rem]">
          {{ aiStrategy() || '正在为您分析 OKR 进度，规划最佳执行路径...' }}
        </p>
        <div class="absolute -right-6 -bottom-6 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
      </div>

      <!-- User Header -->
      <div class="flex items-center justify-between mb-8 px-1">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">今日节奏</h2>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">深度工作模式 · 保持心流</p>
        </div>
        <div class="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden ring-4 ring-teal-50">
          <img src="https://picsum.photos/100/100?seed=lustrous" alt="Profile" class="w-full h-full object-cover">
        </div>
      </div>
      
      <!-- Template Selector -->
      <div class="mb-10">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">选择时间模版</h3>
        <div class="grid grid-cols-2 gap-4">
            <button (click)="selectTemplate('workday_home')" 
                    class="flex flex-col items-center justify-center gap-2 text-center p-4 rounded-3xl glass-panel refraction-shadow text-slate-600 hover:bg-white active:scale-95 transition-all">
                <span class="material-symbols-outlined text-2xl">home_work</span>
                <span class="text-[10px] font-black uppercase">工作日 · 居家</span>
            </button>
            <button (click)="selectTemplate('workday_out')"
                    class="flex flex-col items-center justify-center gap-2 text-center p-4 rounded-3xl glass-panel refraction-shadow text-slate-600 hover:bg-white active:scale-95 transition-all">
                <span class="material-symbols-outlined text-2xl">work_outline</span>
                <span class="text-[10px] font-black uppercase">工作日 · 外出</span>
            </button>
            <button (click)="selectTemplate('holiday_kids')"
                    class="flex flex-col items-center justify-center gap-2 text-center p-4 rounded-3xl glass-panel refraction-shadow text-slate-600 hover:bg-white active:scale-95 transition-all">
                <span class="material-symbols-outlined text-2xl">child_care</span>
                <span class="text-[10px] font-black uppercase">节假日 · 带娃</span>
            </button>
            <button (click)="selectTemplate('holiday_solo')"
                    class="flex flex-col items-center justify-center gap-2 text-center p-4 rounded-3xl glass-panel refraction-shadow text-slate-600 hover:bg-white active:scale-95 transition-all">
                <span class="material-symbols-outlined text-2xl">self_improvement</span>
                <span class="text-[10px] font-black uppercase">节假日 · 独处</span>
            </button>
        </div>
      </div>


      <!-- Active Timer UI -->
      @if (activeTask(); as task) {
        <div class="glass-panel p-6 rounded-[2.5rem] mb-10 refraction-shadow border-teal-200/50 bg-gradient-to-br from-white/60 to-teal-50/40 animate-in slide-in-from-top duration-700 relative overflow-hidden ring-1 ring-teal-100">
           <!-- Dynamic Background based on State -->
           <div class="absolute -right-4 -top-4 w-24 h-24 bg-teal-400/10 rounded-full blur-2xl transition-all duration-1000"
                [class.animate-pulse]="timerState() === 'running'"
                [class.opacity-20]="timerState() === 'paused'"></div>
           
           <div class="relative z-10">
             <div class="flex items-center justify-between mb-4">
               <div class="flex items-center gap-2">
                 <span class="px-3 py-1 rounded-full text-white text-[9px] font-black uppercase tracking-widest shadow-lg transition-colors"
                   [class.bg-teal-500]="timerState() === 'running'"
                   [class.bg-amber-400]="timerState() === 'paused'"
                   [class.shadow-teal-200]="timerState() === 'running'"
                   [class.shadow-amber-200]="timerState() === 'paused'">
                   {{ timerState() === 'running' ? 'DEEP FOCUS' : 'PAUSED' }}
                 </span>
               </div>
               <span class="text-xl font-black tabular-nums tracking-tight text-slate-700 bg-white/50 px-4 py-1 rounded-xl border border-white/60">
                 {{ currentTime() }}
               </span>
             </div>
             
             <div class="mb-6">
                <h3 class="text-xl font-black text-slate-800 mb-1 tracking-tight">{{ task.title }}</h3>
                <p class="text-[11px] font-medium text-slate-400 leading-relaxed">{{ task.description }}</p>
             </div>

             <div class="flex gap-3">
               <!-- Pause/Resume Button -->
               @if (timerState() === 'running') {
                 <button (click)="pauseTimer()" class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center active:scale-95 transition-all shadow-inner border border-amber-200/50">
                   <span class="material-symbols-outlined text-2xl">pause</span>
                 </button>
               } @else {
                 <button (click)="resumeTimer()" class="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center active:scale-95 transition-all shadow-inner border border-teal-200/50">
                   <span class="material-symbols-outlined text-2xl">play_arrow</span>
                 </button>
               }

               <!-- Stop/Finish Button -->
               <button (click)="stopTimer()" class="flex-1 bg-slate-900 text-white font-black rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-2">
                 <span class="material-symbols-outlined text-lg">stop_circle</span>
                 结束并记录
               </button>
             </div>
           </div>
        </div>
      }

      <!-- Timeline -->
      <div class="mb-10">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xs font-bold text-cyan-600/70 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1 h-4 bg-cyan-400 rounded-full"></span>
            深度任务晶格
          </h3>
          <button (click)="openEditModal(null)" class="flex items-center gap-1 bg-white/50 px-3 py-1.5 rounded-full shadow-sm hover:bg-white transition-all active:scale-95 border border-white/60">
            <span class="material-symbols-outlined text-sm text-teal-600">add</span>
            <span class="text-[9px] font-black text-slate-600 uppercase">插入任务</span>
          </button>
        </div>
        
        <div class="space-y-4 relative">
          <div class="absolute left-6 top-4 bottom-4 w-[2px] bg-slate-100"></div>
          @for (item of dataService.schedule(); track item.id) {
            <div class="relative flex items-start group">
              <div class="w-12 h-12 rounded-xl glass-panel flex flex-col items-center justify-center mr-4 shrink-0 z-10 refraction-shadow bg-white/80 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-sm mb-0.5" [style.color]="item.color">{{ item.icon }}</span>
                <span class="text-[9px] font-black text-slate-400">{{ item.time }}</span>
              </div>
              <div class="flex-1 glass-panel rounded-3xl p-5 transition-all hover:translate-x-1 border-l-4 group relative overflow-hidden refraction-shadow" 
                [style.border-left-color]="item.color"
                [class.opacity-40]="isPast(item.time) && !isActive(item)">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ item.label }}</span>
                  
                  <div class="flex items-center">
                    <button (click)="openEditModal(item)" class="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-500 text-[9px] font-black px-3 py-1.5 rounded-full shadow-sm active:scale-90 mr-2">EDIT</button>
                    @if (activeTask() === null && !isPast(item.time)) {
                      <button (click)="startTimer(item)" 
                        class="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg active:scale-90">
                        START
                      </button>
                    } @else if (isActive(item)) {
                      <span class="text-[9px] font-black text-teal-500 animate-pulse">进行中</span>
                    }
                  </div>
                </div>
                <h4 class="text-sm font-bold text-slate-800 leading-tight mb-1">{{ item.title }}</h4>
                <p class="text-[11px] text-slate-500 leading-relaxed font-medium opacity-80">{{ item.description }}</p>
                @if (isPast(item.time) && !isActive(item)) {
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-30">
                    <span class="material-symbols-outlined text-teal-500 text-xl">check_circle</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
      
      <!-- Submit Day Button -->
      <div class="mt-8 flex justify-center">
          <button (click)="submitDay()" class="w-full max-w-xs py-4 rounded-2xl bg-slate-800 text-white font-black uppercase text-sm tracking-widest active:scale-95 transition-transform shadow-2xl shadow-slate-300">
              提交今日计划
          </button>
      </div>

      <!-- Add/Edit Task Modal -->
      @if (showAddModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-5">
           <div (click)="closeModal()" class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200"></div>
           <div class="relative w-full max-w-sm glass-panel bg-white/80 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
               <span class="material-symbols-outlined text-teal-500">edit_calendar</span>
               {{ editingTask() ? '修改任务' : '插入新任务' }}
             </h3>
             <div class="space-y-4 mb-6">
                <div>
                  <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">开始时间</label>
                  <input type="time" [(ngModel)]="newTaskTime" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
                </div>
                <div>
                  <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">任务名称</label>
                  <div class="relative">
                    <input type="text" [(ngModel)]="newTaskTitle" placeholder="例如：紧急会议" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50 pr-10">
                    <app-voice-input (transcript)="newTaskTitle.set($event)"></app-voice-input>
                  </div>
                </div>
                <div>
                  <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">描述/备注</label>
                  <div class="relative">
                    <input type="text" [(ngModel)]="newTaskDesc" placeholder="简要描述任务内容" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50 pr-10">
                    <app-voice-input (transcript)="newTaskDesc.set($event)"></app-voice-input>
                  </div>
                </div>
             </div>
             <div class="flex gap-3">
               <button (click)="closeModal()" class="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">取消</button>
               <button (click)="saveTask()" [disabled]="!newTaskTitle() || !newTaskTime()" class="flex-1 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-lg disabled:opacity-50">
                 {{ editingTask() ? '确认修改' : '确认插入' }}
               </button>
             </div>
           </div>
        </div>
      }
    </div>
  `,
})
export class TodayComponent implements OnInit, OnDestroy {
  dataService = inject(DataService);
  currentTime = signal('00:00');
  aiStrategy = signal('');
  loadingStrategy = signal(false);
  
  // Modal State
  showAddModal = signal(false);
  editingTask = signal<ScheduleItem | null>(null);
  newTaskTime = signal('12:00');
  newTaskTitle = signal('');
  newTaskDesc = signal('');

  private timerInterval: any;

  activeTask = computed(() => {
    const id = this.dataService.activeTaskId();
    return this.dataService.schedule().find(t => t.id === id) || null;
  });

  timerState = computed(() => this.dataService.timerState());

  ngOnInit() {
    this.generateAIStrategy();
    // Restore timer if running/paused
    if (this.dataService.timerState() !== 'idle') {
      this.startTicker();
    }
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
  }

  selectTemplate(type: 'workday_out' | 'workday_home' | 'holiday_kids' | 'holiday_solo') {
    this.dataService.applyTemplate(type);
  }

  async generateAIStrategy() {
    this.loadingStrategy.set(true);
    try {
      const objectives = this.dataService.objectives().map(o => ({ 
        title: o.title, progress: o.progress, status: o.status, tag: o.tag 
      }));
      const ai = new GoogleGenAI({ apiKey: environment.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `基于 OKR 进度：${JSON.stringify(objectives)}，给出一句简短的今日执行策略（30字内），语气要像一位严厉但富有远见的导师。`,
        config: { thinkingConfig: { thinkingBudget: 0 } }
      });
      this.aiStrategy.set(response.text.trim());
    } catch (err) {
      this.aiStrategy.set('保持专注，每一次深度工作都是对未来的投资。');
    } finally {
      this.loadingStrategy.set(false);
    }
  }

  openEditModal(item: ScheduleItem | null) {
    if (item) {
      // Editing existing task
      this.editingTask.set(item);
      this.newTaskTime.set(item.time);
      this.newTaskTitle.set(item.title);
      this.newTaskDesc.set(item.description);
    } else {
      // Adding new task
      this.editingTask.set(null);
      this.newTaskTime.set('12:00');
      this.newTaskTitle.set('');
      this.newTaskDesc.set('');
    }
    this.showAddModal.set(true);
  }

  closeModal() {
    this.showAddModal.set(false);
    this.editingTask.set(null);
  }

  saveTask() {
    if (!this.newTaskTitle() || !this.newTaskTime()) return;

    const taskToEdit = this.editingTask();
    if (taskToEdit) {
      this.dataService.updateScheduleItem(taskToEdit.id, {
        time: this.newTaskTime(),
        title: this.newTaskTitle(),
        description: this.newTaskDesc()
      });
    } else {
      this.dataService.addScheduleItem({
        time: this.newTaskTime(),
        title: this.newTaskTitle(),
        description: this.newTaskDesc() || '手动添加的任务',
        icon: 'edit_square',
        duration: '52m'
      });
    }
    this.closeModal();
  }
  
  submitDay() {
    alert('今日计划已确认！愿你度过富有成效的一天。');
  }

  startTimer(task: ScheduleItem) {
    this.dataService.activeTaskId.set(task.id);
    this.dataService.timerStartTime.set(Date.now());
    this.dataService.timerAccumulated.set(0);
    this.dataService.timerState.set('running');
    this.startTicker();
  }

  pauseTimer() {
    if (this.dataService.timerState() !== 'running') return;
    const now = Date.now();
    const start = this.dataService.timerStartTime() || now;
    const currentSession = now - start;
    
    this.dataService.timerAccumulated.update(v => v + currentSession);
    this.dataService.timerStartTime.set(null);
    this.dataService.timerState.set('paused');
  }

  resumeTimer() {
    if (this.dataService.timerState() !== 'paused') return;
    this.dataService.timerStartTime.set(Date.now());
    this.dataService.timerState.set('running');
  }

  stopTimer() {
    // Calculate final time
    let totalMs = this.dataService.timerAccumulated();
    if (this.dataService.timerState() === 'running') {
       totalMs += Date.now() - (this.dataService.timerStartTime() || Date.now());
    }
    const elapsedMins = Math.max(1, Math.floor(totalMs / 60000));

    // Update Record
    const activeId = this.dataService.activeTaskId();
    this.dataService.dailyRecords.update(records => records.map(r => {
      if (r.id === `rec-${activeId}`) return { ...r, durationMinutes: elapsedMins, isCompleted: true, isModified: true };
      return r;
    }));

    // Reset State
    clearInterval(this.timerInterval);
    this.dataService.activeTaskId.set(null);
    this.dataService.timerState.set('idle');
    this.dataService.timerStartTime.set(null);
    this.dataService.timerAccumulated.set(0);
    this.currentTime.set('00:00');
  }

  private startTicker() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.dataService.timerState() === 'paused') return;
      
      const now = Date.now();
      const start = this.dataService.timerStartTime() || now;
      const totalMs = this.dataService.timerAccumulated() + (now - start);
      
      const mins = Math.floor(totalMs / 60000);
      const secs = Math.floor((totalMs % 60000) / 1000);
      this.currentTime.set(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
  }

  isPast(time: string) {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    const taskTime = new Date();
    taskTime.setHours(h, m, 0);
    return now > taskTime;
  }

  isActive(item: ScheduleItem) {
    return this.activeTask()?.id === item.id;
  }
}
