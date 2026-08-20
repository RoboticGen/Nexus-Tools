"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@nexus-tools/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@nexus-tools/design-system/components/ui/dialog";
import { Input } from "@nexus-tools/design-system/components/ui/input";
import { Label } from "@nexus-tools/design-system/components/ui/label";

type PromptState = {
  kind: "prompt";
  message: string;
  defaultValue: string;
  respond: (value: string | null) => void;
};

type ConfirmState = {
  kind: "confirm";
  message: string;
  respond: (value: boolean) => void;
};

type AlertState = {
  kind: "alert";
  message: string;
  respond: () => void;
};

type DialogState = PromptState | ConfirmState | AlertState;

/** Routes Blockly's `prompt`/`confirm`/`alert` through the design system. Blockly calls `window.prompt` by default, which is why creating a variable popped a native browser dialog pinned under the address bar — unstyled, unthemed, and visually unrelated to the app around it. */
export function BlocklyDialogs() {
  const [state, setState] = useState<DialogState | null>(null);
  const [value, setValue] = useState("");

  // Imported here rather than at module scope: Next server-renders client components, and on the server `blockly/core` resolves to `core-node.js`, which loads jsdom and crashes.
  useEffect(() => {
    let dialog: typeof import("blockly/core").dialog | undefined;

    import("blockly/core").then((Blockly) => {
      dialog = Blockly.dialog;

      dialog.setPrompt((message, defaultValue, callback) => {
        setValue(defaultValue ?? "");
        setState({ kind: "prompt", message, defaultValue: defaultValue ?? "", respond: callback });
      });

      dialog.setConfirm((message, callback) => {
        setState({ kind: "confirm", message, respond: callback });
      });

      dialog.setAlert((message, callback) => {
        setState({ kind: "alert", message, respond: () => callback?.() });
      });
    });

    return () => {
      // Restore the browser defaults so a remount doesn't leave Blockly holding a callback into an unmounted tree.
      dialog?.setPrompt(undefined);
      dialog?.setConfirm(undefined);
      dialog?.setAlert(undefined);
    };
  }, []);

  const close = useCallback(() => setState(null), []);

  /** Dismissal — Escape, the X, a click outside — counts as cancelling. */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open || !state) return;
      if (state.kind === "prompt") state.respond(null);
      else if (state.kind === "confirm") state.respond(false);
      else state.respond();
      close();
    },
    [state, close]
  );

  const submit = useCallback(() => {
    if (!state) return;
    if (state.kind === "prompt") state.respond(value);
    else if (state.kind === "confirm") state.respond(true);
    else state.respond();
    close();
  }, [state, value, close]);

  if (!state) return null;

  const isPrompt = state.kind === "prompt";

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isPrompt ? "New variable" : "Blocks"}</DialogTitle>
          {!isPrompt && <DialogDescription>{state.message}</DialogDescription>}
        </DialogHeader>

        {isPrompt && (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Label htmlFor="blockly-prompt">{state.message}</Label>
            <Input
              id="blockly-prompt"
              value={value}
              // Blockly's own docs warn that a non-native prompt has to take focus itself; without this the field opens unfocused.
              autoFocus
              onChange={(event) => setValue(event.target.value)}
            />
          </form>
        )}

        <DialogFooter>
          {state.kind !== "alert" && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
          <Button onClick={submit} disabled={isPrompt && value.trim() === ""}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
