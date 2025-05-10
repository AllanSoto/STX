import { ArrowDownCircle, ArrowUpCircle, MinusCircle } from 'lucide-react';
import type { TrendAnalysis } from '@/lib/types';

interface TrendArrowProps {
  trend: TrendAnalysis['trend'];
}

export function TrendArrow({ trend }: TrendArrowProps) {
  if (trend === 'upward') {
    return <ArrowUpCircle className="h-5 w-5 text-primary" />;
  }
  if (trend === 'downward') {
    return <ArrowDownCircle className="h-5 w-5 text-destructive" />;
  }
  return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
}
