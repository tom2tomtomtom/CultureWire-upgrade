interface ThemeTagsProps {
  themes: string[];
  max?: number;
}

export function ThemeTags({ themes, max = 5 }: ThemeTagsProps) {
  const display = themes.slice(0, max);
  const remaining = themes.length - max;

  return (
    <div className="flex flex-wrap gap-1.5">
      {display.map((theme) => (
        <span
          key={theme}
          className="rounded-full bg-[#8B3F4F]/10 px-2.5 py-0.5 text-xs text-[#8B3F4F]"
        >
          #{theme}
        </span>
      ))}
      {remaining > 0 && (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
