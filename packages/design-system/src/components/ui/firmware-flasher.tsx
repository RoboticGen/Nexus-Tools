import { CheckCircle2, Upload, Zap } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@nexus-tools/design-system/components/ui/alert"
import { Button } from "@nexus-tools/design-system/components/ui/button"
import { ConfirmDialog } from "@nexus-tools/design-system/components/ui/confirm-dialog"
import { FileInput } from "@nexus-tools/design-system/components/ui/file-input"
import { Progress } from "@nexus-tools/design-system/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nexus-tools/design-system/components/ui/select"
import { cn } from "@nexus-tools/design-system/lib/utils"

type FlasherOption = { id: string; label: string }

type FlasherState = "idle" | "detecting" | "erasing" | "flashing" | "done" | "error"

type FirmwareFlasherProps = Omit<React.ComponentProps<"div">, "children" | "title"> & {
  /** Recovery-mode chip families, e.g. ESP32, ESP32-S3, ESP32-C3. */
  chipFamilies?: FlasherOption[]
  selectedChip?: string
  onChipChange?: (id: string) => void
  /** Auto-detected chip, shown once known. Independent of the manual `selectedChip` override. */
  detectedChip?: string
  /** Firmware versions available for the selected chip. */
  firmwares?: FlasherOption[]
  selectedFirmware?: string
  onFirmwareChange?: (id: string) => void
  /** Called with the picked file when a local `.bin` is chosen instead of a catalog firmware. */
  onFileSelect?: (file: File) => void
  /** 0–100. Shown only while `state` is `erasing`, `flashing`, or `done`. */
  progress?: number
  state?: FlasherState
  /** Shown in the error alert when `state` is `error`. */
  error?: string
  onErase?: () => void
  onFlash?: () => void
}

const BUSY_STATES: FlasherState[] = ["detecting", "erasing", "flashing"]

const PROGRESS_LABEL: Partial<Record<FlasherState, string>> = {
  erasing: "Erasing flash…",
  flashing: "Flashing firmware…",
  done: "Flash complete",
}

/** Firmware selection and flashing controls for a connected ESP32. */
function FirmwareFlasher({
  chipFamilies = [],
  selectedChip,
  onChipChange,
  detectedChip,
  firmwares = [],
  selectedFirmware,
  onFirmwareChange,
  onFileSelect,
  progress = 0,
  state = "idle",
  error,
  onErase,
  onFlash,
  className,
  ...props
}: FirmwareFlasherProps) {
  const [confirming, setConfirming] = useState<"erase" | "flash" | null>(null)
  const busy = BUSY_STATES.includes(state)
  const showProgress = state === "erasing" || state === "flashing" || state === "done"

  return (
    <div data-slot="firmware-flasher" className={cn("flex flex-col gap-4", className)} {...props}>
      {detectedChip && (
        <p className="text-muted-foreground text-sm">
          Detected chip: <span className="text-foreground font-medium">{detectedChip}</span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-foreground text-xs font-medium" id="flasher-chip-label">
            Chip family
          </label>
          <Select value={selectedChip} onValueChange={onChipChange} disabled={busy}>
            <SelectTrigger aria-labelledby="flasher-chip-label" className="w-full">
              <SelectValue placeholder="Select chip family" />
            </SelectTrigger>
            <SelectContent>
              {chipFamilies.map((chip) => (
                <SelectItem key={chip.id} value={chip.id}>
                  {chip.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-foreground text-xs font-medium" id="flasher-firmware-label">
            Firmware version
          </label>
          <Select value={selectedFirmware} onValueChange={onFirmwareChange} disabled={busy}>
            <SelectTrigger aria-labelledby="flasher-firmware-label" className="w-full">
              <SelectValue placeholder="Select firmware" />
            </SelectTrigger>
            <SelectContent>
              {firmwares.map((firmware) => (
                <SelectItem key={firmware.id} value={firmware.id}>
                  {firmware.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FileInput
        accept=".bin"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelect?.(file)
        }}
      >
        <Upload aria-hidden="true" />
        Use a local .bin file
      </FileInput>

      {showProgress && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span id="flasher-progress-label" className="text-sm font-medium">
              {PROGRESS_LABEL[state]}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">{progress}%</span>
          </div>
          <Progress
            value={progress}
            aria-labelledby="flasher-progress-label"
            data-tone={state === "done" ? "success" : "brand"}
          />
        </div>
      )}

      {state === "error" && error && (
        <Alert tone="danger">
          <AlertTitle>Flash failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {state === "done" && (
        <Alert tone="success" icon={<CheckCircle2 />}>
          <AlertTitle>Firmware flashed</AlertTitle>
        </Alert>
      )}

      <div className="mt-auto flex gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => setConfirming("erase")}
        >
          Erase flash
        </Button>
        <Button disabled={busy} onClick={() => setConfirming("flash")}>
          <Zap aria-hidden="true" />
          Flash firmware
        </Button>
      </div>

      <ConfirmDialog
        open={confirming === "erase"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Erase flash?"
        description="This clears everything currently on the device's flash memory, including MicroPython and any saved files. This cannot be undone."
        confirmLabel="Erase"
        tone="danger"
        onConfirm={() => {
          setConfirming(null)
          onErase?.()
        }}
      />

      <ConfirmDialog
        open={confirming === "flash"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Flash firmware?"
        description="The device will be unavailable until flashing finishes. Interrupting it partway can leave the board unable to boot."
        confirmLabel="Flash"
        tone="danger"
        onConfirm={() => {
          setConfirming(null)
          onFlash?.()
        }}
      />
    </div>
  )
}

export { FirmwareFlasher }
export type { FirmwareFlasherProps, FlasherOption, FlasherState }
