type AuthLinkButtonProps = {
  href: string;
  label: string;
};

export function AuthLinkButton({ href, label }: AuthLinkButtonProps) {
  return (
    <a
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20]"
      href={href}
    >
      {label}
    </a>
  );
}
