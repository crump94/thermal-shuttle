-- ==============================================================================
-- Supabase Database Initialization for CineVault
-- Run this script in the Supabase SQL Editor to create the required tables.
-- ==============================================================================

-- 1. Create the Profiles table to store public user data
create table public.profiles (
  id uuid references auth.users not null,
  full_name text,
  updated_at timestamp with time zone,

  primary key (id)
);

-- Enable Row Level Security (RLS) for Profiles
alter table public.profiles enable row level security;

-- Create Policies for Profiles
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create a profile when a new user signs up
create function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Create the Movie List table to store user watchlists and watched items
create table public.movie_list (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  movie_id integer not null,
  status text check (status in ('watched', 'watchlist')) not null,
  rating integer default 0,
  movie_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- ensure a user can only have one status record per movie
  unique(user_id, movie_id)
);

-- Enable Row Level Security (RLS) for Movie List
alter table public.movie_list enable row level security;

-- Create Policies for Movie List
create policy "Users can view their own movie list." on movie_list
  for select using (auth.uid() = user_id);

create policy "Users can insert their own movie list." on movie_list
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own movie list." on movie_list
  for update using (auth.uid() = user_id);

create policy "Users can delete their own movie list." on movie_list
  for delete using (auth.uid() = user_id);
