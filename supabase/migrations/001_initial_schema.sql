-- Physics OS initial schema

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  level text default 'beginner' check (level in ('beginner','intermediate','advanced')),
  created_at timestamptz default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  topic text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  hint_level int,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  subtopic text,
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  question_text text not null,
  full_solution jsonb not null,
  hints jsonb not null,
  diagram_svg text,
  created_at timestamptz default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_answer text not null,
  is_correct boolean not null,
  hints_used int default 0,
  gave_up boolean default false,
  time_spent_seconds int,
  created_at timestamptz default now()
);

create table public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  questions_attempted int default 0,
  questions_correct int default 0,
  avg_hints_used float default 0,
  time_spent_seconds int default 0,
  last_studied_at timestamptz,
  unique (user_id, topic)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.topic_progress enable row level security;

create policy "Users can manage own profile"
  on public.profiles for all using (id = auth.uid());

create policy "Users can manage own conversations"
  on public.conversations for all using (user_id = auth.uid());

create policy "Users can manage own messages"
  on public.messages for all
  using (conversation_id in (
    select id from public.conversations where user_id = auth.uid()
  ));

create policy "Users can manage own questions"
  on public.questions for all using (user_id = auth.uid());

create policy "Users can manage own attempts"
  on public.attempts for all using (user_id = auth.uid());

create policy "Users can manage own progress"
  on public.topic_progress for all using (user_id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
