-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Brands Table
create table brands (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  primary_color text not null,
  secondary_color text not null,
  accent_color text not null,
  body_font text not null,
  heading_font text not null,
  primary_logo text,
  background_pattern text,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- 2. Testimonials Table
create table testimonials (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  customer_name text not null,
  company_title text not null,
  content text not null,
  rating integer not null,
  date timestamp with time zone not null,
  status text check (status in ('Live', 'Unused', 'Processing')) default 'Processing',
  avatar text,
  source text check (source in ('Google', 'LinkedIn', 'Twitter', 'Direct', 'Trustpilot', 'Other')) default 'Direct',
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- 3. Review Sources Table
create table review_sources (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  brand_id uuid references brands(id) on delete cascade,
  type text check (type in ('google', 'trustpilot')) not null,
  url text not null,
  last_updated timestamp with time zone,
  auto_refresh boolean default false,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  unique(brand_id, type) -- Prevent duplicate source types per brand
);

-- 4. Scraped Reviews Table (Linked to Review Sources)
create table scraped_reviews (
  id varchar primary key, -- Keeping original ID from scraper (assuming unique enough or composite)
  source_id uuid references review_sources(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null, -- Denormalized for easier RLS
  author text not null,
  rating integer not null,
  date text not null, -- Keeping as text to match current format, can be cast later
  content text,
  source text check (source in ('Google', 'Trustpilot')) not null,
  url text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- 5. Generated Creatives Table
create table creatives (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  brand_id uuid references brands(id) on delete set null,
  title text not null,
  subtitle text,
  format text not null,
  social_platform text not null,
  image_url text not null,
  timestamp timestamp with time zone default timezone('utc', now()) not null,
  sentiment integer,
  cta text,
  quote text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- RLS Policies (Row Level Security)
-- This ensures users can only see their own data

alter table brands enable row level security;
alter table testimonials enable row level security;
alter table review_sources enable row level security;
alter table scraped_reviews enable row level security;
alter table creatives enable row level security;

-- Policy helper for "Own Data"
-- (You have to create these policies for each table)

create policy "Users can view own brands" on brands for select using (auth.uid() = user_id);
create policy "Users can insert own brands" on brands for insert with check (auth.uid() = user_id);
create policy "Users can update own brands" on brands for update using (auth.uid() = user_id);
create policy "Users can delete own brands" on brands for delete using (auth.uid() = user_id);

create policy "Users can view own testimonials" on testimonials for select using (auth.uid() = user_id);
create policy "Users can insert own testimonials" on testimonials for insert with check (auth.uid() = user_id);
create policy "Users can update own testimonials" on testimonials for update using (auth.uid() = user_id);
create policy "Users can delete own testimonials" on testimonials for delete using (auth.uid() = user_id);

create policy "Users can view own review_sources" on review_sources for select using (auth.uid() = user_id);
create policy "Users can insert own review_sources" on review_sources for insert with check (auth.uid() = user_id);
create policy "Users can update own review_sources" on review_sources for update using (auth.uid() = user_id);
create policy "Users can delete own review_sources" on review_sources for delete using (auth.uid() = user_id);

create policy "Users can view own scraped_reviews" on scraped_reviews for select using (auth.uid() = user_id);
create policy "Users can insert own scraped_reviews" on scraped_reviews for insert with check (auth.uid() = user_id);
create policy "Users can update own scraped_reviews" on scraped_reviews for update using (auth.uid() = user_id);
create policy "Users can delete own scraped_reviews" on scraped_reviews for delete using (auth.uid() = user_id);

create policy "Users can view own creatives" on creatives for select using (auth.uid() = user_id);
create policy "Users can insert own creatives" on creatives for insert with check (auth.uid() = user_id);
create policy "Users can update own creatives" on creatives for update using (auth.uid() = user_id);
create policy "Users can delete own creatives" on creatives for delete using (auth.uid() = user_id);
