"use client";

import { type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HelpTipProps {
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
}

export default function HelpTip({
  content,
  side = "top",
  align = "end",
  className = "",
}: HelpTipProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={`inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-700 text-[10px] font-bold text-gray-400 transition-colors hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-1 focus:ring-gray-500 ${className}`}
        aria-label="Show help"
      >
        ?
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-72 border-gray-700 bg-gray-900 p-3 text-sm leading-relaxed text-gray-300 shadow-2xl"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
