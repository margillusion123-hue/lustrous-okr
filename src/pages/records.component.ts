
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, DailyRecord } from '../services/data.service';
import { VoiceInputComponent } from '../components/voice-input.component';

@Component({
  selector: 'app-records',
  imports: [CommonModule, FormsModule, VoiceInputComponent],
  template: `
    <div class="px-5 pt-12 pb-24">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">执行记录</h2>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">时间投射与偏差分析</p>
        </div>
        <button (click)="openModal(null)" class="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-teal-600 shadow-sm active:scale-90 transition-transform">
           <span class="material-symbols-outlined">add</span>
        </button>
      </div>

      <!-- Stats Bar -->
      <div class="glass-panel p-6 rounded-3xl mb-8 crystal-shadow relative overflow-hidden">
        <div class="relative z-10 flex justify-between items-end">
          <div>
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">今日深度投入</h3>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-black text-slate-800">{{ totalMinutes() }}</span>
              <span class="text-xs font-bold text-slate-400 uppercase">min</span>
            </div>
          </div>
          <div class="text-right">
             <span class="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase">OKR 覆盖率 {{ okrRatio() }}%</span>
          </div>
        </div>
        <!-- Progress mini-chart -->
        <div class="mt-6 flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
           @for (stat of krStats(); track stat.id) {
             <div class="h-full" [style.background-color]="stat.color" [style.width.%]="stat.percent"></div>
           }
        </div>
        <div class="absolute -right-6 -top-6 w-24 h-24 bg-teal-400/5 rounded-full blur-2xl"></div>
      </div>

      <!-- Records List -->
      <div class="space-y-4">
        @for (record of dataService.dailyRecords(); track record.id) {
          <div class="relative group">
            <div class="glass-panel rounded-3xl p-5 flex gap-4 items-center crystal-shadow relative transition-all"
              [class.border-l-4]="record.isModified"
              style="border-left-color: #6366f1;">
              
              <!-- Edit/Delete buttons on hover -->
              <div class="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button (click)="openModal(record)" class="w-7 h-7 rounded-full bg-white/60 hover:bg-white text-slate-500 flex items-center justify-center active:scale-90 transition-all">
                      <span class="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button (click)="deleteRecord(record.id)" class="w-7 h-7 rounded-full bg-white/60 hover:bg-white text-red-500 flex items-center justify-center active:scale-90 transition-all">
                      <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
              </div>

              <div class="flex flex-col items-center justify-center w-12 h-12 rounded-2xl shrink-0" 
                [style.background-color]="record.color + '10'" 
                [style.color]="record.color">
                <span class="material-symbols-outlined text-xl">{{ record.icon }}</span>
                <span class="text-[8px] font-black mt-0.5 opacity-60">{{ record.time }}</span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                   <h4 class="text-sm font-bold text-slate-800 truncate">{{ record.title }}</h4>
                   @if (record.isCompleted) {
                     <span class="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                   }
                </div>
                <p class="text-[11px] text-slate-500 line-clamp-1 opacity-70 mb-2">{{ record.description }}</p>
                
                <!-- Deviation Indicator -->
                <div class="flex items-center gap-3">
                   <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden relative">
                     <div class="absolute inset-0 bg-slate-300 opacity-30" [style.width.%]="(record.plannedMinutes / Math.max(record.plannedMinutes, record.durationMinutes)) * 100"></div>
                     <div class="h-full bg-teal-400 transition-all duration-1000" 
                        [style.width.%]="getRatio(record)"></div>
                   </div>
                   <span class="text-[9px] font-black" [class]="getDeviationClass(record)">
                     {{ record.durationMinutes }} / {{ record.plannedMinutes }}m
                   </span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
      
      <!-- Submit Day's Records Button -->
      <div class="mt-10 flex justify-center">
          <button (click)="submitRecords()" class="w-full max-w-xs py-4 rounded-2xl bg-slate-800 text-white font-black uppercase text-sm tracking-widest active:scale-95 transition-transform shadow-2xl shadow-slate-300">
              提交今日记录
          </button>
      </div>

      <!-- Add/Edit Record Modal -->
       @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-5">
           <div (click)="showModal.set(false)" class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200"></div>
           <div class="relative w-full max-w-sm glass-panel bg-white/80 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
               <span class="material-symbols-outlined text-purple-500">edit_note</span>
               {{ editingRecord() ? '编辑记录' : '新增记录' }}
             </h3>
             <div class="space-y-4 mb-6">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">开始时间</label>
                    <input type="time" [(ngModel)]="newTime" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50">
                  </div>
                  <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">持续时长 (min)</label>
                    <input type="number" [(ngModel)]="newDuration" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50">
                  </div>
                </div>
                <div>
                  <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">任务概要</label>
                  <div class="relative">
                    <input type="text" [(ngModel)]="newTitle" placeholder="例如：产品需求评审会" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 pr-10">
                    <app-voice-input (transcript)="newTitle.set($event)"></app-voice-input>
                  </div>
                </div>
                <div>
                  <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">详细描述</label>
                  <div class="relative">
                    <textarea [(ngModel)]="newDesc" placeholder="会议结论、任务备注等" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 pr-10"></textarea>
                    <app-voice-input (transcript)="newDesc.set($event)"></app-voice-input>
                  </div>
                </div>
                <div>
                  <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 pl-1">关联 OKR</label>
                  <select [(ngModel)]="newKrId" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50">
                    <option value="">无关联</option>
                    @for(obj of dataService.objectives(); track obj.id) {
                      <optgroup [label]="obj.title">
                        @for(kr of obj.krs; track kr.id) {
                          <option [value]="kr.id">{{ kr.title }}</option>
                        }
                      </optgroup>
                    }
                  </select>
                </div>
             </div>
             <div class="flex gap-3">
               <button (click)="showModal.set(false)" class="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">取消</button>
               <button (click)="saveRecord()" [disabled]="!newTitle() || !newTime() || !newDuration()" class="flex-1 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-lg disabled:opacity-50">
                  {{ editingRecord() ? '确认修改' : '确认添加' }}
               </button>
             </div>
           </div>
        </div>
      }
    </div>
  `,
})
export class RecordsComponent {
  dataService = inject(DataService);
  showModal = signal(false);
  editingRecord = signal<DailyRecord | null>(null);

  // Form state
  newTime = signal('12:00');
  newTitle = signal('');
  newDesc = signal('');
  newDuration = signal<number>(30);
  newKrId = signal<string>('');
  
  protected readonly Math = Math;

  totalMinutes = computed(() => {
    return this.dataService.dailyRecords().reduce((acc, r) => acc + r.durationMinutes, 0);
  });

  okrRatio = computed(() => {
    const linked = this.dataService.dailyRecords().filter(r => r.okrKrId).length;
    const total = this.dataService.dailyRecords().length;
    return total > 0 ? Math.round((linked / total) * 100) : 0;
  });

  krStats = computed(() => {
    const records = this.dataService.dailyRecords();
    const map = new Map<string, { id: string, mins: number, color: string }>();

    const krColorMap = new Map<string, string>();
    this.dataService.schedule().forEach(item => {
      if (item.okrKrId) {
        krColorMap.set(item.okrKrId, item.color);
      }
    });

    records.forEach(r => {
      if (r.okrKrId) {
        const entry = map.get(r.okrKrId) || { id: r.okrKrId, mins: 0, color: krColorMap.get(r.okrKrId) || '#cbd5e1' };
        entry.mins += r.durationMinutes;
        map.set(r.okrKrId, entry);
      }
    });
    const items = Array.from(map.values());
    const total = this.totalMinutes() || 1;
    return items.map(i => ({ ...i, percent: (i.mins / total) * 100 }));
  });
  
  submitRecords() {
    alert('今日记录已成功提交！');
  }

  openModal(record: DailyRecord | null) {
    this.editingRecord.set(record);
    if (record) {
      // Editing existing record
      this.newTime.set(record.time);
      this.newTitle.set(record.title);
      this.newDesc.set(record.description);
      this.newDuration.set(record.durationMinutes);
      this.newKrId.set(record.okrKrId || '');
    } else {
      // Adding new record
      this.newTime.set(new Date().toTimeString().substring(0,5));
      this.newTitle.set('');
      this.newDesc.set('');
      this.newDuration.set(30);
      this.newKrId.set('');
    }
    this.showModal.set(true);
  }

  saveRecord() {
    if (!this.newTitle() || !this.newTime() || !this.newDuration()) return;
    
    const recordToEdit = this.editingRecord();
    if (recordToEdit) {
      this.dataService.updateDailyRecord(recordToEdit.id, {
        time: this.newTime(),
        title: this.newTitle(),
        description: this.newDesc(),
        durationMinutes: this.newDuration(),
        okrKrId: this.newKrId() || undefined,
      });
    } else {
      this.dataService.addDailyRecord({
        time: this.newTime(),
        title: this.newTitle(),
        description: this.newDesc() || '手动添加的记录',
        durationMinutes: this.newDuration(),
        okrKrId: this.newKrId() || undefined,
      });
    }
    
    this.showModal.set(false);
    this.editingRecord.set(null);
  }

  deleteRecord(id: string) {
    if (confirm('确定要删除这条记录吗？')) {
      this.dataService.deleteDailyRecord(id);
    }
  }

  getRatio(record: DailyRecord) {
    if (record.plannedMinutes === 0) return 100;
    return Math.min((record.durationMinutes / record.plannedMinutes) * 100, 100);
  }

  getDeviationClass(record: DailyRecord) {
    const diff = record.durationMinutes - record.plannedMinutes;
    if (diff > 5) return 'text-amber-500';
    if (diff < -5) return 'text-indigo-500';
    return 'text-slate-400';
  }
}
