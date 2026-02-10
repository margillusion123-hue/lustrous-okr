
import { Injectable, signal, inject } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";
import { DataService, DailyRecord } from './data.service';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private dataService = inject(DataService);
  status = signal<'idle' | 'listening' | 'processing' | 'error'>('idle');
  transcript = signal<string>('');
  isSupported = signal<boolean>(false);
  dictationActive = signal(false);
  private recognition: any;

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      this.isSupported.set(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-CN';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.restoreDefaultHandlers();
    }
  }

  toggleRecording() {
    if (this.dictationActive()) return;
    this.status() === 'listening' ? this.recognition.stop() : this.startRecording();
  }

  private startRecording() {
    if (!this.recognition) return alert('不支持语音');
    this.status.set('listening');
    this.transcript.set('');
    this.recognition.start();
  }
  
  startDictation(onResultCallback: (text: string) => void, onErrorCallback: () => void, onEndCallback: () => void) {
    if (this.status() !== 'idle') return;
    
    this.dictationActive.set(true);
    this.status.set('listening');

    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResultCallback(text);
    };
    this.recognition.onerror = () => {
      this.status.set('error');
      onErrorCallback();
    };
    this.recognition.onend = () => {
      if (this.status() === 'listening') { // Only transition from listening to idle
        this.status.set('idle');
      }
      this.dictationActive.set(false);
      onEndCallback();
      // Restore default handlers for global commands
      this.restoreDefaultHandlers();
    };
    
    this.recognition.start();
  }
  
  stopDictation() {
    if (this.dictationActive()) {
      this.recognition.stop();
    }
  }

  private restoreDefaultHandlers() {
    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      this.transcript.set(text);
      this.processText(text);
    };
    this.recognition.onerror = () => this.status.set('error');
    this.recognition.onend = () => { if (this.status() === 'listening') this.status.set('processing'); };
  }

  public async processText(text: string) {
    this.status.set('processing');
    this.transcript.set(text); // Ensure the text is visible in UI even if typed
    try {
      const currentRecords = JSON.stringify(this.dataService.dailyRecords().map(r => ({ time: r.time, title: r.title })));
      const okrContext = JSON.stringify(this.dataService.objectives().flatMap(o => o.krs.map(k => ({ id: k.id, title: k.title, objective: o.title }))));
      
      const ai = new GoogleGenAI({ apiKey: environment.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `用户说: "${text}"。
        当前记录流: ${currentRecords}。
        当前可用的 OKR 分解目标 (KR): ${okrContext}。
        任务：识别用户意图。如果是修改现有记录，返回 action: "update" 和对应记录的 time。如果是新增记录（例如“记录一下”或“添加任务”），返回 action: "create" 和新记录的内容。如果用户提到了任务属于哪个项目或目标，请匹配最接近的 okrKrId。`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `你是一个记录审计助手。
          你需要精确匹配记录的时间点。
          如果用户说“今天10点我其实没写代码，而是在做APP的UI重构”，你需要返回 action: "update" 并更新 title。
          如果用户说“记录一下，刚刚开了30分钟产品会”，你需要返回 action: "create" 并设定 durationMinutes: 30。
          返回 JSON。`,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, description: "设为 'create' 或 'update'" },
              time: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              durationMinutes: { type: Type.NUMBER },
              okrKrId: { type: Type.STRING, description: "匹配到的 KR ID" },
              icon: { type: Type.STRING },
              color: { type: Type.STRING }
            },
            required: ["action", "time", "title"]
          }
        }
      });

      const result = JSON.parse(response.text);

      if (result.action === 'create') {
        this.dataService.addDailyRecord({
          time: result.time,
          title: result.title,
          description: result.description || '',
          durationMinutes: result.durationMinutes || 30, // Default duration
          okrKrId: result.okrKrId
        });
      } else { // 'update' is the default assumption
        this.dataService.updateRecordByVoice(result);
      }

      this.status.set('idle');
    } catch (err) {
      console.error(err);
      this.status.set('error');
    }
  }
}
