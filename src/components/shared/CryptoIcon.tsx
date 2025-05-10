import { Bitcoin, CircleDollarSign } from 'lucide-react';
import type { CryptoSymbol } from '@/lib/constants';

interface CryptoIconProps {
  symbol: CryptoSymbol;
  className?: string;
}

export function CryptoIcon({ symbol, className }: CryptoIconProps) {
  const baseClassName = "h-6 w-6";
  const combinedClassName = `${baseClassName} ${className || ''}`;

  switch (symbol) {
    case 'BTC':
      return <Bitcoin className={combinedClassName} />;
    // Add more specific icons if available or use generic ones
    case 'ETH':
    case 'SOL':
    case 'BNB':
    case 'XRP':
    default:
      return <CircleDollarSign className={combinedClassName} />;
  }
}
