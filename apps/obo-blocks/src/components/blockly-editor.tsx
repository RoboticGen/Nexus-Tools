"use client";

import {
  blocks,
  theme,
  toolbox,
  OboCategory,
  forBlock,
  save,
  exportJson,
  importJson,
  getActiveWorkspace,
} from "@nexus-tools/blockly-python-generator";
import {
  createPinButtonCallback,
  createADCButtonCallback,
  createPWMButtonCallback,
  createI2CButtonCallback,
  pinCategoryFlyout,
  adcCategoryFlyout,
  pwmCategoryFlyout,
  i2cCategoryFlyout,
  pythonGenerator,
} from "@nexus-tools/micropython-esp32";
import * as Blockly from "blockly";
import "blockly/blocks";
import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";

import { BlocklyPanel } from "@nexus-tools/design-system/components/ui/blockly-panel";
import { Button } from "@nexus-tools/design-system/components/ui/button";
import { useEditorHandlers } from "@/hooks/use-editor-handlers";

interface BlocklyEditorProps {
  onCodeChange: (code: string) => void;
  onEditToggle?: (isEditing: boolean) => void;
  showNotification: (message: string) => void;
  className?: string;
}

export function BlocklyEditor({
  onCodeChange,
  showNotification,
  className,
}: BlocklyEditorProps) {
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const { downloadJsonFile } = useEditorHandlers();

  const initBlockly = useCallback((div: HTMLDivElement) => {
    const isMobile = window.innerWidth <= 768;
    
    const options = {
      toolbox: toolbox,
      theme: theme,
      media: "media",
      grid: {
        spacing: 20,
        length: 1,
        colour: "#888",
        snap: false,
      },
      zoom: {
        controls: true,
        startScale: isMobile ? 0.8 : 1,
        maxScale: isMobile ? 2 : 1.5,
        minScale: isMobile ? 0.5 : 0.7,
        scaleSpeed: 1.2,
      },
      move: {
        scrollbars: {
          horizontal: true,
          vertical: true,
        },
        drag: true,
        wheel: true,
      },
      renderer: "zelos",
    };

    const workspace = Blockly.inject(div, options);

    // The div already has real dimensions (guaranteed by the ResizeObserver caller), so we can measure synchronously right after inject.
    Blockly.svgResize(workspace);
    (workspace as any).resize();
    (workspace as any).updateInverseScreenCTM();

    workspace.registerToolboxCategoryCallback("PIN", pinCategoryFlyout);
    workspace.registerToolboxCategoryCallback("ADC", adcCategoryFlyout);
    workspace.registerToolboxCategoryCallback("PWM", pwmCategoryFlyout);
    workspace.registerToolboxCategoryCallback("I2C", i2cCategoryFlyout);

    workspace.registerButtonCallback(
      "CREATE_PIN_VARIABLE",
      createPinButtonCallback
    );
    workspace.registerButtonCallback(
      "CREATE_ADC_VARIABLE",
      createADCButtonCallback
    );
    workspace.registerButtonCallback(
      "CREATE_PWM_VARIABLE",
      createPWMButtonCallback
    );
    workspace.registerButtonCallback(
      "CREATE_I2C_VARIABLE",
      createI2CButtonCallback
    );

    workspace.updateToolbox(toolbox);

    workspace.addChangeListener((e: Blockly.Events.Abstract) => {
      if (
        e.isUiEvent ||
        e.type === Blockly.Events.FINISHED_LOADING ||
        workspace.isDragging()
      ) {
        return;
      }
      save(workspace);
      
     
      (pythonGenerator as any).definitions_ = {};
      
      const code = pythonGenerator.workspaceToCode(workspace);
      onCodeChange(code);
    });

    workspaceRef.current = workspace;
    return workspace;
  }, [onCodeChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      Blockly.common.defineBlocks(blocks);
      
      const merged = { ...pythonGenerator.forBlock, ...forBlock };
      Object.assign(pythonGenerator.forBlock, merged);

      // Override the finish method to properly handle function definitions
      pythonGenerator.finish = function(code: string) {
        const definitions = Object.values(this.definitions_ || {}).join('\n');
        
        if (definitions) {
          return definitions + '\n' + code;
        }
        return code;
      };

      Blockly.registry.register(
        Blockly.registry.Type.TOOLBOX_ITEM,
        Blockly.ToolboxCategory.registrationName,
        OboCategory,
        true
      );

      // Use a ResizeObserver to delay inject until the container div has real non-zero pixel dimensions. A plain rAF or useEffect isn't enough here because Next.js dynamic imports + CSS flex/grid percentage heights can take multiple layout passes to resolve.
      const div = blocklyDivRef.current;
      if (!div) return;

      let initialized = false;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) return;

        if (!initialized) {
          initialized = true;
          initBlockly(div);
          return;
        }

        // Keep observing after inject: Blockly measures its container itself and
        // only re-measures on `window.resize`, which a splitter drag never fires,
        // so the canvas would stay at its original width inside a resized panel.
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current as Blockly.WorkspaceSvg);
        }
      });
      observer.observe(div);

      return () => {
        observer.disconnect();
      };
    } catch (error) {
      console.error("Error initializing Blockly:", error);
    }
  }, []);

  // Panel resizes are handled by the ResizeObserver above; this only tracks the
  // viewport, where the mobile breakpoint decides whether scrollbars show.
  useEffect(() => {
    const handleResize = () => {
      const workspace = workspaceRef.current as any;
      if (!workspace) return;

      const isMobile = window.innerWidth <= 768;
      if (workspace.scrollbar && workspace.scrollbar.horizontal) {
        workspace.scrollbar.horizontal.setVisible(isMobile);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleImportJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const imported = importJson(json);
          if (imported) {
            showNotification("Workspace imported successfully");
            const workspace = getActiveWorkspace();
            
            pythonGenerator.init(workspace);
            (pythonGenerator as any).definitions_ = {};
            
            const code = pythonGenerator.workspaceToCode(workspace);
            onCodeChange(code);
          } else {
            showNotification("Error importing workspace");
          }
        } catch (err) {
          console.error("Error importing JSON:", err);
          showNotification("Error importing workspace");
        }
      };
      reader.readAsText(file);
    },
    [onCodeChange, showNotification]
  );

  const handleExportJson = useCallback(() => {
    const json = exportJson();
    if (!json || Object.keys(json).length === 0) {
      showNotification("No blocks to export");
      return;
    }
    downloadJsonFile(JSON.stringify(json, null, 2), "workspace.json");
    showNotification("Workspace exported as workspace.json");
  }, [showNotification, downloadJsonFile]);

  const handleImportClick = useCallback(() => {
    const inputElement = document.createElement("input");
    inputElement.type = "file";
    inputElement.accept = ".json";
    inputElement.click();
    inputElement.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImportJson(file);
      }
      inputElement.remove();
    });
  }, [handleImportJson]);

  return (
    <BlocklyPanel
      className={className}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={handleImportClick} title="Import workspace JSON">
            <Upload aria-hidden="true" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportJson} title="Export workspace JSON">
            <Download aria-hidden="true" />
            Export
          </Button>
        </>
      }
    >
      {/* Blockly measures this element, so it needs real dimensions; `min-h-0` stops the flex parent refusing to shrink it below its content. */}
      <div ref={blocklyDivRef} className="h-full min-h-0 w-full overflow-hidden" />
    </BlocklyPanel>
  );
}
