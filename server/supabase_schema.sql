-- Supabase Database Schema

-- 1. Objectives Table
create table if not exists objectives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline text,
  tag text,
  total_hours integer,
  status text,
  progress integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Key Results (KR) Table
create table if not exists key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid references objectives(id) on delete cascade,
  title text not null,
  target text,
  allocated_hours integer,
  actual_hours integer default 0,
  progress integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Daily Records Table
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  date text,
  time text,
  end_time text,
  title text,
  description text,
  icon text,
  color text,
  okr_kr_id uuid references key_results(id),
  planned_minutes integer,
  duration_minutes integer,
  is_modified boolean default false,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Schedule Items Table
create table if not exists schedule_items (
  id uuid primary key default gen_random_uuid(),
  time text,
  end_time text,
  label text,
  title text,
  description text,
  icon text,
  duration text,
  type text,
  color text,
  okr_kr_id uuid references key_results(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
