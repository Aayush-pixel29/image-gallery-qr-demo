-- Run this in your Supabase SQL Editor

-- 1. Create the images table
create table public.images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  title text not null,
  upload_date timestamp with time zone default now(),
  is_active boolean default true
);

-- Enable RLS on the images table
alter table public.images enable row level security;

-- Only authenticated admins can insert/update/delete images
create policy "Allow authenticated users full access"
  on public.images
  for all
  to authenticated
  using (true);

-- Anyone can read active images
create policy "Allow public read of active images"
  on public.images
  for select
  to anon
  using (is_active = true);


-- 2. Create the private storage bucket
insert into storage.buckets (id, name, public) 
values ('gallery-images', 'gallery-images', false);

-- Enable RLS on the storage.objects table for our bucket
create policy "Allow authenticated users full access to gallery-images"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'gallery-images');
