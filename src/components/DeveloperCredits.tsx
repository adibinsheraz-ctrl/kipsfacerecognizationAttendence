import { Box, Mail, Share2 } from "lucide-react";

function InstagramIcon({ size = 16, strokeWidth = 1.75 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const links = [
  {
    href: "mailto:adi.binsheraz@gmail.com",
    label: "Email",
    icon: Mail,
  },
  {
    href: "https://instagram.com/adibinsheraz",
    label: "Instagram",
    icon: InstagramIcon,
  },
  {
    href: "https://adi3d.vercel.app",
    label: "adi3d.vercel.app",
    icon: Box,
  },
  {
    href: "https://adisocial.vercel.app",
    label: "adisocial.vercel.app",
    icon: Share2,
  },
] as const;

export function DeveloperCredits({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={className}>
      {!compact ? (
        <div className="space-y-1">
          <p className="text-sm text-[var(--muted)]">
            Developed by <span className="text-[var(--ink)]">Adi Bin Sheraz</span>
          </p>
          <p className="text-xs text-[var(--muted)]/80">
            © {new Date().getFullYear()} Kips College G-9. All Rights Reserved. Protected under international copyright & software protection laws.
          </p>
        </div>
      ) : (
        <p className="text-center text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} Kips College G-9. All Rights Reserved.
        </p>
      )}
      <div className={`flex items-center gap-2 ${compact ? "justify-center mt-2" : "mt-3"}`}>
        {links.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel={href.startsWith("mailto:") ? undefined : "noreferrer"}
            aria-label={label}
            title={label}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Icon size={16} strokeWidth={1.75} />
          </a>
        ))}
      </div>
    </div>
  );
}
