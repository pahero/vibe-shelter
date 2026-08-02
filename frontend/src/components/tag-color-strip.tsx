import { CatTag } from "@/lib/api";

const MAX_VISIBLE_TAGS = 8;

type TagColorStripProps = {
  tags: CatTag[];
};

export function TagColorStrip({ tags }: TagColorStripProps) {
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);

  return (
    <div className="grid h-1.5 w-full grid-cols-8 overflow-hidden" aria-hidden="true">
      {visibleTags.map((tag) => (
        <span key={tag.id} className="h-full" style={{ backgroundColor: tag.color }} />
      ))}
    </div>
  );
}
