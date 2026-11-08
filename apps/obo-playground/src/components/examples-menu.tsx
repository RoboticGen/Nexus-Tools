"use client";

import { Button } from "@nexus-tools/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@nexus-tools/design-system/components/ui/dropdown-menu";
import { ChevronDown, Lightbulb } from "lucide-react";

import { EXAMPLES } from "@/blocks/examples";
import { TRACK_PRESETS } from "@/sim/track";

export type Example = (typeof EXAMPLES)[number];

export function ExamplesMenu({ onPick }: { onPick: (example: Example) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" aria-label="Examples">
          <Lightbulb aria-hidden="true" className="text-brand-gold" />
          <span className="hidden sm:inline">Examples</span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8} className="w-72">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          Each example opens in its own world
        </DropdownMenuLabel>
        {EXAMPLES.map((example) => (
          <DropdownMenuItem key={example.id} onSelect={() => onPick(example)} className="flex-col items-start gap-0.5">
            <span className="flex w-full items-center justify-between gap-2">
              <span className="font-medium">{example.title}</span>
              <span className="text-muted-foreground text-xs">{TRACK_PRESETS[example.track].name}</span>
            </span>
            <span className="text-muted-foreground text-xs whitespace-normal">{example.summary}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
