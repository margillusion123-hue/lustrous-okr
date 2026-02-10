
import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService, KeyResult, Objective } from '../services/data.service';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { GoogleGenAI, Type } from "@google/genai";
import { VoiceInputComponent } from '../components/voice-input.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-okr-detail',
  imports: [CommonModule, RouterLink, FormsModule, CdkDropList, CdkDrag, CdkDragHandle, VoiceInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-5 pt-12 pb-24">
      <!-- Back Header -->
      <div class="flex items-center gap-4 mb-8">
        <a routerLink="/okr" class="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-slate-400 active:scale-90 transition-all">
          <span class="material-symbols-outlined">arrow_back</span>
        </a>
        <div>
          <h2 class="text-xl font-black text-slate-800 tracking-tight">目标分解</h2>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">关键结果管理</p>
        </div>
      </div>

      @if (objective(); as obj) {
        <!-- Objective Summary & Resource Chart -->
        <div class="glass-panel rounded-3xl p-6 refraction-shadow border-l-8 mb-8 transition-all relative overflow-hidden" 
          [style.border-left-color]="getStatusColor(obj.status)"
          [class.animate-breathe-amber]="obj.status === 'lagging'">
          
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase">{{ obj.tag }}</span>
            <span class="text-[10px] font-bold text-slate-400 uppercase">截止于 {{ obj.deadline }}</span>
            @if (obj.status === 'lagging') {
              <span class="ml-auto text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">进度严重滞后</span>
            }
          </div>
          <h1 class="text-lg font-black text-slate-800 mb-6">{{ obj.title }}</h1>
          
          <div class="grid grid-cols-2 gap-4">
             <div class="bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100/50">
               <p class="text-[9px] font-bold text-slate-400 uppercase mb-1">投入饱和度</p>
               <p class="text-lg font-black text-indigo-600">{{ getOverallEfficiency(obj) }}%</p>
             </div>
             <div class="bg-teal-50/50 rounded-2xl p-3 border border-teal-100/50">
               <p class="text-[9px] font-bold text-slate-400 uppercase mb-1">平均执行进度</p>
               <p class="text-lg font-black text-teal-600">{{ obj.progress }}%</p>
             </div>
          </div>
        </div>

        <!-- Key Results Section with Drag and Drop -->
        <div class="mb-10">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span class="w-1 h-4 bg-teal-400 rounded-full"></span>
              KR 执行明细
            </h3>
            
            <!-- AI Magic Button -->
            <button (click)="generateAIKrs(obj)" 
              [disabled]="isGenerating()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black uppercase shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
              @if (isGenerating()) {
                <span class="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                思考中...
              } @else {
                <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
                AI 灵感生成
              }
            </button>
          </div>

          <div class="space-y-6" cdkDropList (cdkDropListDropped)="drop($event)">
            @for (kr of obj.krs; track kr.id) {
              <div cdkDrag class="glass-panel rounded-3xl p-5 border-white/60 refraction-shadow relative group">
                <div cdkDragHandle class="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-teal-500 transition-colors opacity-0 group-hover:opacity-100 px-2">
                  <span class="material-symbols-outlined text-lg">drag_indicator</span>
                </div>
                
                <!-- Delete KR Button -->
                <button (click)="deleteKr(obj.id, kr.id)" class="absolute right-4 top-4 text-slate-300 hover:text-red-400 active:scale-90 transition-all z-20">
                   <span class="material-symbols-outlined text-base">close</span>
                </button>

                <div class="pl-6">
                  <div class="flex justify-between items-start mb-3">
                    <h4 class="text-sm font-bold text-slate-800 flex-1 pr-6 leading-snug">{{ kr.title }}</h4>
                  </div>

                  <!-- Time Utilization Bar (Actual vs Allocated) -->
                  <div class="mb-5 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <div class="flex justify-between items-end mb-1.5">
                      <div class="flex items-center gap-1.5">
                         <span class="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                         <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">时间投入</span>
                      </div>
                      <span class="text-[10px] font-bold text-slate-600">
                        <span [class.text-amber-500]="getActualHours(kr) > kr.allocatedHours" class="text-sm">{{ getActualHours(kr) }}h</span> 
                        <span class="text-slate-300 mx-1">/</span> 
                        {{ kr.allocatedHours }}h
                      </span>
                    </div>
                    
                    <div class="h-2.5 w-full bg-slate-200/60 rounded-full overflow-hidden relative shadow-inner">
                      <!-- Striped Pattern for background context -->
                      <div class="absolute inset-0 w-full h-full opacity-20" 
                           style="background-image: linear-gradient(45deg, #94a3b8 25%, transparent 25%, transparent 50%, #94a3b8 50%, #94a3b8 75%, transparent 75%, transparent); background-size: 6px 6px;"></div>
                      
                      <!-- Fill Bar -->
                      <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                        [style.width.%]="Math.min((getActualHours(kr) / (kr.allocatedHours || 1)) * 100, 100)"
                        [class]="getActualHours(kr) > kr.allocatedHours ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.3)]'">
                      </div>

                      <!-- Over-budget marker if needed, or simple visual cue above -->
                    </div>
                  </div>

                  <!-- Suggested Progress Alert -->
                  @let suggestion = getSuggestedProgress(kr);
                  @if (suggestion > kr.progress + 5) {
                    <div class="mb-4 p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-center justify-between animate-in slide-in-from-right duration-500">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-indigo-500 text-sm animate-pulse">auto_awesome</span>
                        <span class="text-[10px] font-bold text-indigo-700">建议进度同步: {{ suggestion }}%</span>
                      </div>
                      <button (click)="dataService.updateKrProgress(kr.id, suggestion)" 
                        class="text-[9px] font-black bg-white text-indigo-600 px-3 py-1 rounded-full shadow-sm hover:bg-indigo-600 hover:text-white transition-colors uppercase">
                        同步
                      </button>
                    </div>
                  }

                  <!-- Progress Bar -->
                  <div class="space-y-1.5">
                    <div class="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                      <span>成果进度</span>
                      <span class="text-teal-600">{{ kr.progress }}%</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-teal-400 transition-all duration-1000" [style.width.%]="kr.progress"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Add KR Form -->
        <div class="glass-panel rounded-3xl p-6 border-dashed border-2 border-slate-200 bg-slate-50/30">
          <h3 class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">add_circle</span>
            新增分解目标
          </h3>
          <div class="space-y-4">
            <div>
              <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">KR 描述</label>
              <div class="relative">
                <input type="text" [(ngModel)]="newKrTitleInput" placeholder="例如：完成竞品分析报告"
                  class="w-full bg-white/80 border border-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-100 pr-10">
                <app-voice-input (transcript)="newKrTitleInput.set($event)"></app-voice-input>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
               <div>
                 <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">目标额度</label>
                 <div class="relative">
                   <input type="text" [(ngModel)]="newKrTargetInput" placeholder="100%"
                     class="w-full bg-white/80 border border-white rounded-xl px-4 py-3 text-sm focus:outline-none pr-10">
                    <app-voice-input (transcript)="newKrTargetInput.set($event)"></app-voice-input>
                 </div>
               </div>
               <div>
                 <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">计划投入 (h)</label>
                 <input type="number" [(ngModel)]="newKrHoursInput"
                   class="w-full bg-white/80 border border-white rounded-xl px-4 py-3 text-sm focus:outline-none">
               </div>
            </div>
            <button 
              (click)="addNewKR(obj.id)"
              [disabled]="!newKrTitleInput() || !newKrHoursInput()"
              class="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 transition-all">
              确认添加
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class OkrDetailComponent {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  public readonly dataService = inject(DataService);
  protected readonly Math = Math;

  objective = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? this.dataService.getObjectiveById(id) : null;
  });

  newKrTitleInput = signal('');
  newKrTargetInput = signal('100%');
  newKrHoursInput = signal<number>(10);
  isGenerating = signal(false);

  drop(event: CdkDragDrop<KeyResult[]>) {
    const obj = this.objective();
    if (obj) {
      this.dataService.reorderKrs(obj.id, event.previousIndex, event.currentIndex);
    }
  }

  deleteKr(objId: string, krId: string) {
    if (confirm('确认删除此执行明细吗？')) {
      this.dataService.deleteKeyResult(objId, krId);
    }
  }

  getActualHours(kr: KeyResult): number {
    return this.dataService.getActualHoursForKr(kr.id);
  }

  getSuggestedProgress(kr: KeyResult): number {
    const actual = this.getActualHours(kr);
    const planned = kr.allocatedHours;
    if (planned === 0) return 0;
    const ratio = Math.round((actual / planned) * 100);
    return Math.min(ratio, 100);
  }

  getTotalActualHours(obj: Objective) {
    let total = 0;
    obj.krs.forEach((kr: KeyResult) => {
      total += this.getActualHours(kr);
    });
    return parseFloat(total.toFixed(1));
  }

  getTotalPlannedHours(obj: Objective) {
    return obj.krs.reduce((acc, kr) => acc + kr.allocatedHours, 0);
  }

  getOverallEfficiency(obj: Objective) {
    const actual = this.getTotalActualHours(obj);
    const planned = this.getTotalPlannedHours(obj);
    if (planned === 0) return 0;
    return Math.min(Math.round((actual / planned) * 100), 100);
  }

  getTimeDeviationClass(kr: KeyResult) {
    const actual = this.getActualHours(kr);
    const planned = kr.allocatedHours;
    if (actual > planned) return 'text-amber-500';
    if (actual < planned * 0.5 && actual > 0) return 'text-indigo-400';
    return 'text-slate-500';
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'active': return '#2dd4bf';
      case 'risk': return '#f59e0b';
      case 'lagging': return '#f59e0b';
      default: return '#94a3b8';
    }
  }

  addNewKR(objId: string) {
    if (!this.newKrTitleInput() || !this.newKrHoursInput()) return;
    this.addKRInternal(objId, {
      title: this.newKrTitleInput(),
      target: this.newKrTargetInput(),
      allocatedHours: this.newKrHoursInput(),
      progress: 0
    });
    this.newKrTitleInput.set('');
    this.newKrTargetInput.set('100%');
    this.newKrHoursInput.set(10);
  }

  private addKRInternal(objId: string, kr: Omit<KeyResult, 'id'>) {
    this.dataService.addKeyResult(objId, kr);
  }

  async generateAIKrs(obj: Objective) {
    this.isGenerating.set(true);
    try {
      const ai = new GoogleGenAI({ apiKey: environment.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Objective: "${obj.title}".
        Context: Tag is ${obj.tag}, Total Goal Hours: ${obj.totalHours}.
        Task: Break this objective down into 3 specific, measurable Key Results (KRs).
        Allocate estimated hours for each so they sum up to roughly 30-50% of the total goal hours (leaving room for others).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Actionable KR title" },
                target: { type: Type.STRING, description: "Measurable target e.g. '100%', '3 docs'" },
                allocatedHours: { type: Type.NUMBER, description: "Estimated hours" }
              },
              required: ["title", "target", "allocatedHours"]
            }
          }
        }
      });

      const krs = JSON.parse(response.text);
      if (Array.isArray(krs)) {
        krs.forEach((k: any) => {
          this.addKRInternal(obj.id, {
            title: k.title,
            target: k.target,
            allocatedHours: k.allocatedHours,
            progress: 0
          });
        });
      }
    } catch (err) {
      console.error(err);
      alert('AI 生成失败，请稍后重试');
    } finally {
      this.isGenerating.set(false);
    }
  }
}
