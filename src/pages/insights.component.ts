
import { Component, inject, computed, AfterViewInit, ElementRef, ViewChild, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';

declare var d3: any;

@Component({
  selector: 'app-insights',
  imports: [CommonModule],
  template: `
    <div class="px-5 pt-12 pb-24">
      <div class="flex items-center justify-between mb-8 px-1">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">数据洞察</h2>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-tighter">基于执行记录的深度分析</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined">monitoring</span>
        </div>
      </div>

      <!-- Crystal Equilibrium Radar Chart -->
      <div (click)="openZoomModal()" class="glass-panel rounded-[2.5rem] p-6 crystal-shadow mb-8 relative overflow-hidden refraction-shadow active:scale-95 transition-transform cursor-pointer">
        <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
           <span class="w-1.5 h-4 rounded-full bg-indigo-400"></span>
           晶体平衡雷达图
           <span class="ml-auto material-symbols-outlined text-slate-300 text-sm">open_in_full</span>
        </h3>
        <div class="flex justify-center items-center py-2">
          <div #radarChartContainer class="w-full aspect-square max-w-[280px] flex items-center justify-center pointer-events-none"></div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-2">
          @for (tag of radarTags; track tag) {
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50/50 border border-white/50">
              <span class="w-1.5 h-1.5 rounded-full" [style.background-color]="getTagColor(tag)"></span>
              <span class="text-[9px] font-black text-slate-500 uppercase">{{ tag }}</span>
            </div>
          }
        </div>
      </div>

      <!-- AI Summary Card -->
      <div class="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-[2rem] p-6 text-white shadow-2xl mb-8 relative overflow-hidden">
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-4">
            <span class="material-symbols-outlined text-indigo-300">auto_awesome</span>
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/70">效率诊断</span>
          </div>
          <p class="text-sm font-medium leading-relaxed mb-6">
            根据投入比例，你的资源分配目前偏向 <span class="text-indigo-300 font-bold uppercase tracking-tight">{{ dominantTag() }}</span>。
            建议关注 <span class="text-teal-300 font-bold tracking-tight">平衡度修复</span>。
          </p>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center bg-white/5 rounded-2xl py-3 border border-white/10">
              <p class="text-[8px] text-indigo-200 font-black uppercase mb-1">总时数</p>
              <p class="text-base font-black">{{ totalActualHours() }}h</p>
            </div>
            <div class="text-center bg-white/5 rounded-2xl py-3 border border-white/10">
              <p class="text-[8px] text-indigo-200 font-black uppercase mb-1">聚焦度</p>
              <p class="text-base font-black">{{ focusScore() }}%</p>
            </div>
            <div class="text-center bg-white/5 rounded-2xl py-3 border border-white/10">
              <p class="text-[8px] text-indigo-200 font-black uppercase mb-1">偏离度</p>
              <p class="text-base font-black">{{ planCoverage() }}%</p>
            </div>
          </div>
        </div>
        <div class="absolute -right-20 -bottom-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px]"></div>
      </div>

      <!-- Zoom Modal -->
      @if (showZoomModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-5">
           <div (click)="showZoomModal.set(false)" class="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"></div>
           <div class="relative w-full max-w-sm glass-panel bg-white/95 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 class="text-lg font-black text-slate-800 mb-6 text-center">平衡雷达详情</h3>
              <div #largeRadarContainer class="w-full aspect-square flex items-center justify-center"></div>
              <button (click)="showZoomModal.set(false)" class="mt-8 w-full py-3 rounded-xl bg-slate-100 font-bold text-slate-500">关闭</button>
           </div>
        </div>
      }
    </div>
  `,
})
export class InsightsComponent implements AfterViewInit {
  @ViewChild('radarChartContainer') radarChartContainer!: ElementRef;
  @ViewChild('largeRadarContainer') set largeRadarContent(content: ElementRef) {
      if(content) {
          this.renderChart(content.nativeElement, 300);
      }
  }

  dataService = inject(DataService);
  // Update tags to match new requirements
  radarTags = ['工作', '工作+', '学习', '生活'];
  showZoomModal = signal(false);

  constructor() {
    effect(() => {
        // Redraw small chart when data changes
        if(this.radarChartContainer) {
            this.renderChart(this.radarChartContainer.nativeElement, 280);
        }
    });
  }

  ngAfterViewInit() {
    this.renderChart(this.radarChartContainer.nativeElement, 280);
  }

  openZoomModal() {
    this.showZoomModal.set(true);
  }

  renderChart(container: HTMLElement, size: number) {
    container.innerHTML = '';

    const data = this.radarTags.map(tag => {
      const actual = this.dataService.objectives()
        .filter(obj => obj.tag === tag)
        .reduce((acc, obj) => {
          let objActual = 0;
          obj.krs.forEach(kr => objActual += this.dataService.getActualHoursForKr(kr.id));
          return acc + objActual;
        }, 0);
      // Scale: Assuming 20 hours is a good baseline for full scale representation in short term
      return { axis: tag, value: Math.min(actual / 20, 1) };
    });

    const width = size, height = size;
    const margin = 45;
    const radius = Math.min(width, height) / 2 - margin;
    const angleSlice = (Math.PI * 2) / this.radarTags.length;

    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 1]);
    const svg = d3.select(container).append("svg")
      .attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Draw Grid
    const levels = 5;
    for (let j = 0; j < levels; j++) {
      const r = (radius / levels) * (j + 1);
      svg.append("circle")
        .attr("r", r)
        .style("fill", "none").style("stroke", "#e2e8f0").style("stroke-width", "0.5");
    }

    // Axes
    const axes = svg.selectAll(".axis").data(this.radarTags).enter().append("g").attr("class", "axis");
    axes.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", (d: any, i: number) => rScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (d: any, i: number) => rScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
      .style("stroke", "#cbd5e1").style("stroke-dasharray", "2,2");

    axes.append("text")
        .attr("class", "legend")
        .style("font-size", "10px")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("x", (d: any, i: number) => rScale(1.25) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (d: any, i: number) => rScale(1.25) * Math.sin(angleSlice * i - Math.PI / 2))
        .text((d: any) => d)
        .style("fill", "#64748b")
        .style("font-weight", "bold");

    // Radar Area
    const radarLine = d3.lineRadial()
      .radius((d: any) => rScale(d.value))
      .angle((d: any, i: number) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    svg.append("path")
      .datum(data)
      .attr("d", radarLine)
      .attr("class", "radar-chart-area")
      .style("fill", "rgba(99, 102, 241, 0.2)")
      .style("stroke", "#6366f1")
      .style("stroke-width", "3");

    // Dots
    svg.selectAll(".dot")
      .data(data).enter().append("circle")
      .attr("cx", (d: any, i: number) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("cy", (d: any, i: number) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("r", 4)
      .style("fill", "#6366f1").style("stroke", "#fff").style("stroke-width", "2");
  }

  getTagColor(tag: string) {
    const colors: any = { '工作': '#2dd4bf', '工作+': '#6366f1', '学习': '#f59e0b', '生活': '#fb7185' };
    return colors[tag] || '#cbd5e1';
  }

  totalActualHours = computed(() => {
    let total = 0;
    this.dataService.objectives().forEach(obj => {
      obj.krs.forEach(kr => total += this.dataService.getActualHoursForKr(kr.id));
    });
    return total.toFixed(1);
  });

  dominantTag = computed(() => {
    const counts: any = {};
    this.dataService.objectives().forEach(obj => {
      let actual = 0;
      obj.krs.forEach(kr => actual += this.dataService.getActualHoursForKr(kr.id));
      counts[obj.tag] = (counts[obj.tag] || 0) + actual;
    });
    const sorted = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]);
    return sorted[0]?.[0] || '均衡';
  });

  focusScore = computed(() => {
    const records = this.dataService.dailyRecords();
    if (records.length === 0) return 0;
    const completed = records.filter(r => r.isCompleted).length;
    return Math.round((completed / records.length) * 100);
  });

  planCoverage = computed(() => {
    const objectives = this.dataService.objectives();
    const planned = objectives.reduce((acc, obj) => acc + obj.totalHours, 0);
    const actual = parseFloat(this.totalActualHours());
    return planned > 0 ? Math.round((actual / planned) * 100) : 0;
  });
}
