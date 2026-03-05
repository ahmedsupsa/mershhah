import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 text-primary group" dir="rtl">
      <span className="text-3xl font-headline font-bold tracking-tighter">مرشح</span>
      <Image 
        src="/logo.png"
        alt="شعار مرشح"
        width={48}
        height={48}
        className="h-12 w-12 rounded-xl object-contain transition-transform group-hover:scale-105"
      />
    </Link>
  );
}
