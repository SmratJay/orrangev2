-- Add UNIQUE constraint on user_id in merchants table
-- This ensures one user can only have one merchant account

ALTER TABLE public.merchants 
ADD CONSTRAINT merchants_user_id_unique UNIQUE (user_id);
