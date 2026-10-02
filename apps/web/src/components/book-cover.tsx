import { Feather } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  genre?: string | null;
  coverUrl?: string | null;
  className?: string;
  decorative?: boolean;
};
export function BookCover({
  title,
  genre,
  coverUrl,
  className,
  decorative,
}: Props) {
  const tone =
    Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5;
  return (
    <div
      className={cn("studio-book-cover", `cover-tone-${tone}`, className)}
      aria-hidden={decorative || undefined}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={decorative ? "" : title}
          className="cover-image"
        />
      ) : (
        <>
          <div className="cover-orbit cover-orbit-one" />
          <div className="cover-orbit cover-orbit-two" />
          <div className="cover-orbit cover-orbit-three" />
          <span className="cover-edition">FORGE ORIGINAL</span>
          <div className="cover-lettering">
            <span>{genre || "MANUSCRIPT"}</span>
            <strong>{title}</strong>
          </div>
          <Feather className="cover-feather" size={20} />
        </>
      )}
      <div className="cover-spine" />
    </div>
  );
}
