import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

interface ShippingPolicyNoteProps {
  className?: string;
}

export function ShippingPolicyNote({ className }: ShippingPolicyNoteProps) {
  return (
    <p className={cn('text-xs text-ig-text-secondary', className)}>
      신선 수산물은 단순 변심 반품이 어렵습니다.{' '}
      <Link to="/info/shipping" className="text-ig-link hover:underline">
        배송·반품 안내
      </Link>
    </p>
  );
}
