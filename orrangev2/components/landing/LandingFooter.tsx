import Link from 'next/link';

const links = [
  { title: 'Protocol', href: '#' },
  { title: 'Network', href: '#' },
  { title: 'Developers', href: '#' },
  { title: 'Sign In', href: '/auth/login' },
  { title: 'Sign Up', href: '/auth/signup' },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/5 py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <Link href="/" className="mx-auto block w-fit">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
            >
              <span className="text-xs font-black leading-none text-black">O</span>
            </div>
            <span className="font-mono text-sm font-semibold tracking-wide text-white">ORRANGE</span>
          </div>
        </Link>

        <div className="my-8 flex flex-wrap justify-center gap-6 text-sm">
          {links.map(link => (
            <Link
              key={link.title}
              href={link.href}
              className="text-white/30 transition-colors duration-150 hover:text-orange-400"
            >
              {link.title}
            </Link>
          ))}
        </div>

        <p className="block text-center font-mono text-xs text-white/18">
          ORRANGE © 2025 · Peer-to-peer USDC ↔ INR settlements · Built on Ethereum Sepolia
        </p>
      </div>
    </footer>
  );
}
