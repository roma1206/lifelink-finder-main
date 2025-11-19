-- Minimal schema for LifeLink Finder
-- Paste this into Supabase SQL editor (SQL > New query) and run.

create table if not exists user_roles (
  user_id text not null,
  role text not null,
  primary key (user_id)
);

create table if not exists donor_profiles (
  id text primary key,
  user_id text,
  full_name text,
  email text,
  phone text,
  blood_type text,
  is_available boolean default true,
  location_address text,
  location_lat numeric,
  location_lng numeric,
  last_donation_date timestamptz,
  created_at timestamptz default now()
);

create table if not exists blood_requests (
  id text primary key,
  seeker_id text,
  donor_id text,
  blood_type text,
  message text,
  urgency_level text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists notifications (
  id text primary key,
  user_id text,
  title text,
  message text,
  type text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Sample seed data (optional)
insert into donor_profiles (id, user_id, full_name, email, phone, blood_type, is_available, location_address, location_lat, location_lng)
values
('demo_donor_1', 'demo_user_1', 'Alex Johnson', 'alex.johnson@example.com', '555-0101', 'O+', true, 'Downtown Clinic', 37.7749, -122.4194)
on conflict (id) do nothing;

insert into donor_profiles (id, user_id, full_name, email, phone, blood_type, is_available, location_address, location_lat, location_lng)
values
('demo_donor_2', 'demo_user_2', 'Priya Singh', 'priya.singh@example.com', '555-0202', 'A+', true, 'City Hospital', 37.7849, -122.4094)
on conflict (id) do nothing;

insert into user_roles (user_id, role)
values
('demo_user_1', 'donor')
on conflict (user_id) do nothing;

insert into user_roles (user_id, role)
values
('demo_user_2', 'donor')
on conflict (user_id) do nothing;

insert into notifications (id, user_id, title, message, type)
values
('demo_notif_1', 'demo_user_1', 'Welcome', 'Demo data created', 'info')
on conflict (id) do nothing;

-- Seeker profiles (people asking for blood)
create table if not exists seeker_profiles (
  id text primary key,
  user_id text,
  full_name text,
  email text,
  phone text,
  blood_type_needed text,
  urgency_level text,
  location_address text,
  location_lat numeric,
  location_lng numeric,
  needs_by timestamptz,
  message text,
  created_at timestamptz default now()
);

-- Sample seekers (optional)
insert into seeker_profiles (id, user_id, full_name, email, phone, blood_type_needed, urgency_level, location_address, location_lat, location_lng, message)
values
('demo_seeker_1', 'demo_seeker_user_1', 'Ravi Kumar', 'ravi.kumar@example.com', '555-0303', 'O-', 'high', 'Eastside Clinic', 37.7649, -122.4294, 'Urgent — surgery tomorrow')
on conflict (id) do nothing;

insert into seeker_profiles (id, user_id, full_name, email, phone, blood_type_needed, urgency_level, location_address, location_lat, location_lng, message)
values
('demo_seeker_2', 'demo_seeker_user_2', 'Maria Gomez', 'maria.gomez@example.com', '555-0404', 'A-', 'medium', 'North Hospital', 37.7949, -122.3994, 'Needing donation within the week')
on conflict (id) do nothing;
