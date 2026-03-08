-- Supabase V2 Schema (Academic Command Center - Light Neon / Gamer Edition)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Courses Table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  credits INT NOT NULL DEFAULT 3,
  total_items INT NOT NULL DEFAULT 0,
  finished_items INT NOT NULL DEFAULT 0,
  difficulty INT NOT NULL CHECK (difficulty >= 1 AND difficulty <= 10),
  midterm_date DATE,
  final_date DATE,
  target_grade TEXT DEFAULT 'AA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Study Logs Table
CREATE TABLE public.study_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Note: We assume target GPA tracking can be managed dynamically or added to a user_stats table as before.
-- Provided per user specific request.

-- RLS Setup (Row Level Security)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own courses" ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own courses" ON public.courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own courses" ON public.courses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own study logs" ON public.study_logs FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.courses WHERE courses.id = study_logs.course_id AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own study logs" ON public.study_logs FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.courses WHERE courses.id = study_logs.course_id AND courses.user_id = auth.uid()
));
