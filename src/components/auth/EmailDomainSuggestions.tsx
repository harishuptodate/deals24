const EMAIL_DOMAINS = ['@gmail.com', '@outlook.com', '@yahoo.com'] as const;

type EmailDomainSuggestionsProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function EmailDomainSuggestions({ value, onChange }: EmailDomainSuggestionsProps) {
  const username = value.trim();

  if (!username || username.includes('@')) return null;

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Email provider suggestions">
      {EMAIL_DOMAINS.map((domain) => (
        <button
          key={domain}
          type="button"
          onClick={() => onChange(`${username}${domain}`)}
          className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 dark:border-gray-800 dark:bg-zinc-900 dark:text-gray-400 dark:hover:border-violet-800 dark:hover:bg-violet-950/50 dark:hover:text-violet-300"
        >
          {domain}
        </button>
      ))}
    </div>
  );
}
