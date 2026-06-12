'use client';

import { Star, Shield, Award, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MerchantReputation {
  merchantTotalReviews: number;
  merchantAvgRating: number;
  totalOrdersCompleted: number;
  totalVolumeUsdc: number;
  trustScore: number;
  badges: string[];
}

interface MerchantReputationCardProps {
  reputation: MerchantReputation;
  merchantName?: string;
}

const BADGE_INFO: Record<string, { icon: string; color: string; name: string }> = {
  'verified': { icon: 'shield', color: 'text-green-500', name: 'Verified' },
  'novice_trader': { icon: 'award', color: 'text-bronze-500', name: 'Novice Trader' },
  'experienced_trader': { icon: 'award', color: 'text-gray-400', name: 'Experienced' },
  'master_trader': { icon: 'award', color: 'text-yellow-500', name: 'Master Trader' },
  'volume_1k': { icon: 'trending', color: 'text-blue-500', name: 'Volume Trader' },
  'volume_10k': { icon: 'trending', color: 'text-purple-500', name: 'High Volume' },
  'volume_100k': { icon: 'trending', color: 'text-yellow-600', name: 'Whale' },
  'top_rated': { icon: 'star', color: 'text-yellow-400', name: 'Top Rated' },
  'dispute_free_10': { icon: 'shield', color: 'text-green-400', name: 'Clean Record' },
  'dispute_free_50': { icon: 'shield', color: 'text-green-600', name: 'Trusted' },
};

export function MerchantReputationCard({ reputation, merchantName }: MerchantReputationCardProps) {
  const {
    merchantTotalReviews,
    merchantAvgRating,
    totalOrdersCompleted,
    totalVolumeUsdc,
    trustScore,
    badges,
  } = reputation;

  const getTrustColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getTrustLabel = (score: number) => {
    if (score >= 80) return 'Highly Trusted';
    if (score >= 60) return 'Trusted';
    if (score >= 40) return 'Moderate';
    return 'New/Low Trust';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {merchantName ? `${merchantName}'s Reputation` : 'Merchant Reputation'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trust Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Trust Score</span>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${getTrustColor(trustScore)}`}>
              {trustScore}
            </div>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className={`text-sm font-medium ${getTrustColor(trustScore)}`}>
          {getTrustLabel(trustScore)}
        </div>

        {/* Rating */}
        {merchantTotalReviews > 0 && (
          <div className="flex items-center justify-between py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Rating</span>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(merchantAvgRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium">{merchantAvgRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({merchantTotalReviews} reviews)</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-border">
          <div>
            <p className="text-2xl font-bold">{totalOrdersCompleted}</p>
            <p className="text-xs text-muted-foreground">Orders Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalVolumeUsdc.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">USDC Volume</p>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-sm text-muted-foreground mb-2">Badges Earned</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => {
                const info = BADGE_INFO[badge];
                return (
                  <div
                    key={badge}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${info?.color || ''} bg-muted`}
                    title={info?.name || badge}
                  >
                    {info?.icon === 'shield' && <Shield className="w-3 h-3" />}
                    {info?.icon === 'award' && <Award className="w-3 h-3" />}
                    {info?.icon === 'trending' && <TrendingUp className="w-3 h-3" />}
                    {info?.icon === 'star' && <Star className="w-3 h-3" />}
                    {info?.name || badge}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
