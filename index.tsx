

import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation, Routes } from '@angular/router';
import { AppComponent } from './src/app.component';
import { TodayComponent } from './src/pages/today.component';
import { OkrComponent } from './src/pages/okr.component';
import { OkrDetailComponent } from './src/pages/okr-detail.component';
import { InsightsComponent } from './src/pages/insights.component';
import { RecordsComponent } from './src/pages/records.component';

const routes: Routes = [
  { path: '', redirectTo: 'today', pathMatch: 'full' },
  { path: 'today', component: TodayComponent },
  { path: 'okr', component: OkrComponent },
  { path: 'okr/:id', component: OkrDetailComponent },
  { path: 'records', component: RecordsComponent },
  { path: 'insights', component: InsightsComponent },
];

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
  ],
}).catch((err) => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
