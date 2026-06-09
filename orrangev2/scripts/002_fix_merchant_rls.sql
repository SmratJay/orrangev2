-- Fix RLS: Allow merchants to see unassigned pending orders
-- Run this in Supabase SQL Editor

-- Drop existing merchant order policies
DROP POLICY IF EXISTS "merchants_select_assigned_orders" ON public.orders;

-- Create new policy: Merchants can see:
-- 1. Orders assigned to them
-- 2. Unassigned pending orders (so they can accept them)
CREATE POLICY "merchants_select_orders"
  ON public.orders FOR SELECT
  USING (
    -- Case 1: Order is assigned to this merchant
    EXISTS (
      SELECT 1 FROM public.merchants 
      WHERE merchants.user_id = auth.uid() 
      AND merchants.id = orders.merchant_id
    )
    OR
    -- Case 2: Order is pending and unassigned (available to accept)
    (
      orders.status = 'pending' 
      AND orders.merchant_id IS NULL
    )
  );

-- Policy for merchants to update orders (to accept them)
DROP POLICY IF EXISTS "merchants_update_assigned_orders" ON public.orders;

CREATE POLICY "merchants_update_orders"
  ON public.orders FOR UPDATE
  USING (
    -- Can update orders assigned to them
    EXISTS (
      SELECT 1 FROM public.merchants 
      WHERE merchants.user_id = auth.uid() 
      AND merchants.id = orders.merchant_id
    )
    OR
    -- Can update unassigned pending orders (to accept them)
    (
      orders.status = 'pending' 
      AND orders.merchant_id IS NULL
    )
  );

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'orders';
