-- Phase 3: Trust & Safety Infrastructure
-- Disputes, Reviews, and Admin Tools

-- ============================================
-- DISPUTES SYSTEM
-- ============================================

-- Dispute statuses
CREATE TYPE dispute_status AS ENUM (
  'open',           -- Dispute filed, awaiting admin
  'under_review',   -- Admin assigned, investigating
  'pending_evidence', -- Waiting for more evidence from parties
  'resolved_user_favor', -- Admin ruled in user's favor
  'resolved_merchant_favor', -- Admin ruled in merchant's favor
  'resolved_split', -- Split decision (partial refund, etc.)
  'resolved_no_action', -- No fault found
  'cancelled'       -- Dispute withdrawn
);

-- Dispute reasons
CREATE TYPE dispute_reason AS ENUM (
  'payment_not_received',     -- User: I paid but merchant claims otherwise
  'usdc_not_received',        -- User: Merchant didn't send USDC
  'wrong_amount',             -- Wrong fiat/USDC amount
  'fraud',                    -- Suspected fraudulent activity
  'technical_issue',          -- Platform bug caused problem
  'other'                     -- Other reason
);

-- Disputes table
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Who filed the dispute
  filed_by UUID NOT NULL REFERENCES users(id),
  filed_by_type TEXT NOT NULL CHECK (filed_by_type IN ('user', 'merchant')),
  
  -- Dispute details
  status dispute_status NOT NULL DEFAULT 'open',
  reason dispute_reason NOT NULL,
  description TEXT NOT NULL,
  
  -- Evidence (URLs to uploaded screenshots)
  evidence_urls TEXT[] DEFAULT '{}',
  
  -- Financial details (frozen amounts during dispute)
  disputed_usdc_amount DECIMAL(20, 6),
  disputed_fiat_amount DECIMAL(20, 2),
  
  -- Resolution (filled when resolved)
  resolution_notes TEXT,
  resolution_action TEXT CHECK (resolution_action IN (
    'release_to_user',
    'release_to_merchant', 
    'split_50_50',
    'custom_refund',
    'no_action'
  )),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  filed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soft delete for audit trail
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Dispute messages (back-and-forth communication)
CREATE TABLE dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'merchant', 'admin', 'system')),
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  is_internal_note BOOLEAN DEFAULT FALSE, -- Admin-only visible
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispute audit log (all status changes)
CREATE TABLE dispute_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'merchant', 'admin', 'system')),
  action TEXT NOT NULL,
  old_status dispute_status,
  new_status dispute_status,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REVIEWS & REPUTATION SYSTEM
-- ============================================

-- Reviews table (mutual after completed order)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Reviewer (who's giving the rating)
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('user', 'merchant')),
  
  -- Reviewee (who's being rated)
  reviewee_id UUID NOT NULL REFERENCES users(id),
  reviewee_type TEXT NOT NULL CHECK (reviewee_type IN ('user', 'merchant')),
  
  -- Rating (1-5 stars)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Optional comment
  comment TEXT CHECK (LENGTH(comment) <= 1000),
  
  -- Categorized ratings (optional)
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
  reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
  
  -- Flags
  is_reported BOOLEAN DEFAULT FALSE,
  report_reason TEXT,
  is_hidden BOOLEAN DEFAULT FALSE, -- Hidden by admin moderation
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One review per user per order
  UNIQUE(order_id, reviewer_id)
);

-- User/Merchant aggregated stats (updated via triggers)
CREATE TABLE reputation_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- As a merchant (when others review them as merchant)
  merchant_total_reviews INTEGER DEFAULT 0,
  merchant_avg_rating DECIMAL(3, 2) DEFAULT 0,
  merchant_5_star_count INTEGER DEFAULT 0,
  merchant_1_star_count INTEGER DEFAULT 0,
  
  -- As a user (when merchants review them)
  user_total_reviews INTEGER DEFAULT 0,
  user_avg_rating DECIMAL(3, 2) DEFAULT 0,
  
  -- Order stats
  total_orders_completed INTEGER DEFAULT 0,
  total_volume_usdc DECIMAL(20, 6) DEFAULT 0,
  
  -- Dispute stats
  total_disputes INTEGER DEFAULT 0,
  disputes_lost INTEGER DEFAULT 0,
  
  -- Calculated score (0-100)
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  
  -- Badges earned
  badges TEXT[] DEFAULT '{}',
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Badge definitions (reference table)
CREATE TABLE badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('orders', 'volume', 'rating', 'dispute_free')),
  requirement_value INTEGER NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'))
);

-- Insert badge definitions
INSERT INTO badge_definitions (id, name, description, requirement_type, requirement_value, tier) VALUES
  ('verified', 'Verified', 'Completed KYC verification', 'orders', 1, 'bronze'),
  ('novice_trader', 'Novice Trader', 'Completed 5 orders', 'orders', 5, 'bronze'),
  ('experienced_trader', 'Experienced Trader', 'Completed 25 orders', 'orders', 25, 'silver'),
  ('master_trader', 'Master Trader', 'Completed 100 orders', 'orders', 100, 'gold'),
  ('volume_1k', 'Volume Trader', '$1,000 USDC traded', 'volume', 1000, 'bronze'),
  ('volume_10k', 'High Volume', '$10,000 USDC traded', 'volume', 10000, 'silver'),
  ('volume_100k', 'Whale', '$100,000 USDC traded', 'volume', 100000, 'gold'),
  ('top_rated', 'Top Rated', 'Maintained 4.5+ rating over 20+ orders', 'rating', 20, 'gold'),
  ('dispute_free_10', 'Clean Record', '10 orders without disputes', 'dispute_free', 10, 'silver'),
  ('dispute_free_50', 'Trusted', '50 orders without disputes', 'dispute_free', 50, 'gold');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_disputes_filed_by ON disputes(filed_by);
CREATE INDEX idx_disputes_resolved_at ON disputes(resolved_at) WHERE resolved_at IS NOT NULL;

CREATE INDEX idx_dispute_messages_dispute_id ON dispute_messages(dispute_id, created_at DESC);
CREATE INDEX idx_dispute_audit_dispute_id ON dispute_audit_log(dispute_id, created_at DESC);

CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id, reviewee_type);
CREATE INDEX idx_reviews_rating ON reviews(reviewee_id, rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update reputation stats when a review is added
CREATE OR REPLACE FUNCTION update_reputation_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update reputation stats for reviewee
  INSERT INTO reputation_stats (user_id)
  VALUES (NEW.reviewee_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update stats based on reviewee type
  IF NEW.reviewee_type = 'merchant' THEN
    UPDATE reputation_stats
    SET 
      merchant_total_reviews = merchant_total_reviews + 1,
      merchant_avg_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id AND reviewee_type = 'merchant'
      ),
      merchant_5_star_count = merchant_5_star_count + CASE WHEN NEW.rating = 5 THEN 1 ELSE 0 END,
      merchant_1_star_count = merchant_1_star_count + CASE WHEN NEW.rating = 1 THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE user_id = NEW.reviewee_id;
  ELSE
    UPDATE reputation_stats
    SET 
      user_total_reviews = user_total_reviews + 1,
      user_avg_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id AND reviewee_type = 'user'
      ),
      updated_at = NOW()
    WHERE user_id = NEW.reviewee_id;
  END IF;
  
  -- Recalculate trust score
  UPDATE reputation_stats
  SET trust_score = calculate_trust_score(NEW.reviewee_id)
  WHERE user_id = NEW.reviewee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 50;
  stats reputation_stats%ROWTYPE;
BEGIN
  SELECT * INTO stats FROM reputation_stats WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN 50;
  END IF;
  
  -- Base score from ratings (0-40 points)
  IF stats.merchant_total_reviews > 0 THEN
    score := score + (stats.merchant_avg_rating - 3) * 10; -- 1 star = -20, 5 star = +20
  END IF;
  
  -- Bonus for completed orders (0-20 points)
  score := score + LEAST(stats.total_orders_completed / 5, 20);
  
  -- Penalty for disputes (up to -30 points)
  IF stats.total_disputes > 0 THEN
    score := score - (stats.disputes_lost * 10) - LEAST(stats.total_disputes, 10);
  END IF;
  
  -- Clamp to 0-100
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Trigger on review insert
CREATE TRIGGER trigger_update_reputation_on_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reputation_stats();

-- Function to update order counts
CREATE OR REPLACE FUNCTION update_order_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for both user and merchant
  IF NEW.status = 'completed' THEN
    -- User stats
    INSERT INTO reputation_stats (user_id, total_orders_completed, total_volume_usdc)
    VALUES (NEW.user_id, 1, NEW.usdc_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_orders_completed = reputation_stats.total_orders_completed + 1,
      total_volume_usdc = reputation_stats.total_volume_usdc + NEW.usdc_amount,
      updated_at = NOW();
    
    -- Merchant stats (if assigned)
    IF NEW.merchant_id IS NOT NULL THEN
      -- Get merchant's user_id
      DECLARE
        merchant_user_id UUID;
      BEGIN
        SELECT user_id INTO merchant_user_id FROM merchants WHERE id = NEW.merchant_id;
        IF merchant_user_id IS NOT NULL THEN
          INSERT INTO reputation_stats (user_id, total_orders_completed, total_volume_usdc)
          VALUES (merchant_user_id, 1, NEW.usdc_amount)
          ON CONFLICT (user_id) DO UPDATE
          SET 
            total_orders_completed = reputation_stats.total_orders_completed + 1,
            total_volume_usdc = reputation_stats.total_volume_usdc + NEW.usdc_amount,
            updated_at = NOW();
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on order completion
CREATE TRIGGER trigger_update_stats_on_order_complete
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION update_order_stats();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_stats ENABLE ROW LEVEL SECURITY;

-- Disputes policies
CREATE POLICY "Users can view their own disputes"
  ON disputes FOR SELECT
  USING (
    filed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.user_id = auth.uid() OR o.merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
      ))
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "Users can create disputes for their orders"
  ON disputes FOR INSERT
  WITH CHECK (
    filed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.user_id = auth.uid() OR o.merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
      ))
    )
  );

-- Reviews policies
CREATE POLICY "Reviews are publicly viewable"
  ON reviews FOR SELECT
  USING (is_hidden = FALSE);

CREATE POLICY "Users can review after completed order"
  ON reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.status = 'completed'
    )
  );

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- Active disputes view
CREATE VIEW active_disputes AS
SELECT 
  d.*,
  o.fiat_amount,
  o.usdc_amount,
  o.type as order_type,
  u.email as filed_by_email
FROM disputes d
JOIN orders o ON d.order_id = o.id
JOIN users u ON d.filed_by = u.id
WHERE d.status IN ('open', 'under_review', 'pending_evidence')
  AND d.is_deleted = FALSE;

-- Merchant leaderboard view
CREATE VIEW merchant_leaderboard AS
SELECT 
  u.id as user_id,
  m.id as merchant_id,
  u.email,
  rs.merchant_total_reviews,
  rs.merchant_avg_rating,
  rs.total_orders_completed,
  rs.total_volume_usdc,
  rs.trust_score,
  rs.badges
FROM users u
JOIN merchants m ON u.id = m.user_id
JOIN reputation_stats rs ON u.id = rs.user_id
WHERE rs.merchant_total_reviews > 0
ORDER BY rs.merchant_avg_rating DESC, rs.total_orders_completed DESC;
