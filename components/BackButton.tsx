import Link from "next/link";

/**
 * A consistent back button used at the top of sub-pages.
 *
 * `href` lets each page declare its own parent — for admin pages that's the
 * relevant admin tab, for participant flows it's /join, etc.
 */
export function BackButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-brand-wine"
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}
