"use client";

import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@nexus-tools/design-system/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@nexus-tools/design-system/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@nexus-tools/design-system/components/ui/toggle-group"
import { useTheme } from "@nexus-tools/design-system/hooks/use-theme"
import { cn } from "@nexus-tools/design-system/lib/utils"

import type { Theme } from "@nexus-tools/design-system/lib/theme"
import type { LucideIcon } from "lucide-react"

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: LaptopIcon },
]

type ThemeToggleProps = {
  className?: string
}

/** `theme-toggle.tsx`'s two hand-rolled renderings of the same three-way choice — a `sm:hidden` button group and a `hidden sm:inline-flex` dropdown, each tracking the active option with its own `theme === "..."` class check — become `ToggleGroup` and `DropdownMenuRadioGroup`, both already single-selection controls with the current value as real ARIA state (`aria-pressed`, `aria-checked`) instead of a highlight class. */
function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className={cn(className)}>
      <div className="sm:hidden">
        <ToggleGroup
          type="single"
          value={theme}
          onValueChange={(value) => value && setTheme(value as Theme)}
          variant="outline"
          className="w-full"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} aria-label={label} className="gap-1.5">
              <Icon aria-hidden="true" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="hidden sm:inline-flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <SunIcon
                aria-hidden="true"
                className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
              />
              <MoonIcon
                aria-hidden="true"
                className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
              />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              {OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon aria-hidden="true" />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export { ThemeToggle }
export type { ThemeToggleProps }
