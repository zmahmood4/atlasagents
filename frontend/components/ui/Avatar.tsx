import { DEPARTMENT_COLOR, initials } from "@/lib/utils";
import type { Department } from "@/lib/types";

export function AgentAvatar({
  name,
  department,
  size = 28,
}: {
  name: string;
  department: Department;
  size?: number;
}) {
  const bg = DEPARTMENT_COLOR[department];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-mono text-[10px] font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: `color-mix(in oklab, ${bg} 75%, #000 25%)`,
        border: `1px solid color-mix(in oklab, ${bg} 60%, #000 40%)`,
      }}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
