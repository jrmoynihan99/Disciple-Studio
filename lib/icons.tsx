import {
  Heart,
  Droplets,
  Users,
  BookOpen,
  HandHelping,
  HandHeart,
  Church,
  Music,
  Globe,
  Sparkles,
  Flame,
  GraduationCap,
  Compass,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "./types";

/** Maps the constrained IconName set to lucide components. Keep in sync with
 *  the IconName union in `types.ts`. */
export const ICON_MAP: Record<IconName, LucideIcon> = {
  heart: Heart,
  droplets: Droplets,
  users: Users,
  "book-open": BookOpen,
  "hand-helping": HandHelping,
  "hand-heart": HandHeart,
  church: Church,
  music: Music,
  globe: Globe,
  sparkles: Sparkles,
  flame: Flame,
  "graduation-cap": GraduationCap,
  compass: Compass,
  star: Star,
};

/** All selectable icon names — handy for the admin picker. */
export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[];

/** Render a step icon by name at a given size (Tailwind class). Returns null
 *  for unknown/absent names so callers can fall back to a generic dot. */
export function StepIcon({
  name,
  className = "h-4 w-4",
}: {
  name?: IconName;
  className?: string;
}) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}
