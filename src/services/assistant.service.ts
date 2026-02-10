
import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleGenAI, Type } from "@google/genai";
import { DataService } from './data.service';
import { environment } from '../environments/environment';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private dataService = inject(DataService);
  private router = inject(Router);

  isAssistantOpen = signal(false);
  status = signal<'idle' | 'listening' | 'thinking'>('idle');
  messages = signal<ChatMessage[]>([]);

  constructor() {
    this.messages.set([{ role: 'assistant', text: '你好！我是你的 AI 生产力副驾，有什么可以帮你的吗？' }]);
  }

  toggleAssistant() {
    this.isAssistantOpen.update(v => !v);
  }

  public async sendMessage(text: string) {
    if (!text.trim()) return;

    this.status.set('thinking');
    this.messages.update(m => [...m, { role: 'user', text }]);
    
    try {
      const context = this.getAppContext();
      
      const ai = new GoogleGenAI({ apiKey: environment.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
          App Context: ${JSON.stringify(context)}.
          User Request: "${text}".
        `,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `You are an intelligent productivity assistant for an OKR management app.
          - Your goal is to help the user manage their objectives, key results, and daily schedule.
          - Be concise and conversational.
          - Use the provided app context to understand the user's request. For example, if they are on an OKR detail page and say "add a KR", you know which objective to add it to.
          - If you need to perform an action, include an 'action' and 'payload' in your JSON response.
          - Always provide a natural language 'responseText' to communicate back to the user.
          - Possible actions: CREATE_KR, UPDATE_TASK, CREATE_TASK, ADD_RECORD.`,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              responseText: { type: Type.STRING, description: "Your conversational reply to the user." },
              action: { type: Type.STRING, description: "e.g., CREATE_KR, CREATE_TASK" },
              payload: { 
                type: Type.OBJECT,
                properties: {
                  objectiveId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  target: { type: Type.STRING },
                  allocatedHours: { type: Type.NUMBER },
                  time: { type: Type.STRING },
                  description: { type: Type.STRING },
                  durationMinutes: { type: Type.NUMBER }
                }
              }
            },
            required: ["responseText"]
          }
        }
      });
      
      const result = JSON.parse(response.text);

      // Add assistant's reply to chat
      this.messages.update(m => [...m, { role: 'assistant', text: result.responseText }]);
      
      // Perform action if any
      this.executeAction(result.action, result.payload);

    } catch (err) {
      console.error(err);
      this.messages.update(m => [...m, { role: 'assistant', text: '抱歉，我遇到了一些麻烦，请稍后再试。' }]);
    } finally {
      this.status.set('idle');
    }
  }

  private getAppContext() {
    const url = this.router.url;
    const context: any = {
      currentPage: url
    };

    if (url.startsWith('/okr/')) {
      const objId = url.split('/')[2];
      const objective = this.dataService.getObjectiveById(objId);
      if (objective) {
        context.objectiveInView = {
          id: objective.id,
          title: objective.title,
          krs: objective.krs.map(k => ({ id: k.id, title: k.title }))
        };
      }
    } else if (url === '/today') {
      context.schedule = this.dataService.schedule().map(s => ({ time: s.time, title: s.title }));
    }
    
    return context;
  }

  private executeAction(action?: string, payload?: any) {
    if (!action || !payload) return;

    switch(action) {
      case 'CREATE_KR':
        if (payload.objectiveId && payload.title) {
          this.dataService.addKeyResult(payload.objectiveId, {
            title: payload.title,
            target: payload.target || '100%',
            allocatedHours: payload.allocatedHours || 10,
            progress: 0
          });
        }
        break;
      
      case 'CREATE_TASK':
        if (payload.time && payload.title) {
          this.dataService.addScheduleItem({
            time: payload.time,
            title: payload.title,
            description: payload.description || '',
            icon: 'smart_toy',
            duration: '52m'
          });
        }
        break;
      
      case 'ADD_RECORD':
         if (payload.time && payload.title && payload.durationMinutes) {
          this.dataService.addDailyRecord({
            time: payload.time,
            title: payload.title,
            description: payload.description || '',
            durationMinutes: payload.durationMinutes
          });
        }
        break;
    }
  }
}
