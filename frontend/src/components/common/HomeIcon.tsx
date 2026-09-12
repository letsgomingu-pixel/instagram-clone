import { cn } from '@/utils/cn';

interface HomeIconProps {
  size?: number;
  className?: string;
  /** Active nav — solid filled house with doorway cutout */
  filled?: boolean;
}

/** Instagram-style home glyph — rounded house with arch doorway */
const HOME_FILLED_PATH =
  'M21.945 10.171a1.003 1.003 0 0 0-.364-.769L12.696 1.677a1 1 0 0 0-1.296-.079l-.092.079-8.884 7.725a1.003 1.003 0 0 0-.364.769V21a1 1 0 0 0 1 1h5.485a1 1 0 0 0 1-1v-4.999a2.995 2.995 0 0 1 2.996-2.996h.029a2.995 2.995 0 0 1 2.996 2.996V21a1 1 0 0 0 1 1h5.485a1 1 0 0 0 1-1V10.171Z';

const HOME_OUTLINE_PATH =
  'M22 23.001h-6.001a.999.999 0 0 1-.999-.999v-5.455a2.997 2.997 0 0 0-2.997-2.997h-2.003a2.997 2.997 0 0 0-2.997 2.997v7.001a1 1 0 0 1-1.001 1H1.999a1 1 0 0 1-1-1v-9.543a1 1 0 0 1 .386-.83l9.385-7.857a1 1 0 0 1 1.229 0l9.385 7.857a1 1 0 0 1 .386.83v9.543a1 1 0 0 1-1.001 1Z';

export function HomeIcon({ size = 24, className, filled = false }: HomeIconProps) {
  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn('shrink-0', className)}
        aria-hidden
      >
        <path d={HOME_FILLED_PATH} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path
        d={HOME_OUTLINE_PATH}
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
