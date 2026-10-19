import { CatTag } from "@/lib/api";

const MAX_VISIBLE_TAGS = 8;

type TagColorStripProps = {
  tags: CatTag[];
  overlay?: boolean;
};

export function TagColorStrip({ tags, overlay = false }: TagColorStripProps) {
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);

  if (visibleTags.length === 0) return null;

  return (
    <div className={`grid h-1.5 w-full overflow-hidden ${overlay ? "absolute bottom-0 left-0 grid-cols-8" : "grid-cols-8"}`} aria-hidden="true">
      {visibleTags.map((tag) => (
        <span key={tag.id} className="h-full" style={{ backgroundColor: tag.color }} />
      ))}
    </div>
  );
}
