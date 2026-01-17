"use client";

import * as Blockly from "blockly";
import "blockly/blocks";

import { useEffect, useRef, useCallback } from "react";

import { toolbox } from "@/blockly/toolbox";
import { forBlock } from "@/blockly/generator";
import { pythonGenerator } from "@/micropython/setup";
import { blocks } from "@/blockly/blocks";
import { OboCategory } from "@/blockly/categories";
import { theme } from "@/blockly/themes";
import {
  save,
  exportJson,
  importJson,
} from "@/blockly/serialization";
import {
  createPinButtonCallback,
  createADCButtonCallback,
  createPWMButtonCallback,
  createI2CButtonCallback,
} from "@/micropython/callback";
import {
  pinCategoryFlyout,
  adcCategoryFlyout,
  pwmCategoryFlyout,
  i2cCategoryFlyout,
} from "@/micropython/flyouts";

interface BlocklyEditorProps {
  onCodeChange: (code: string) => void;
  onEditToggle?: (isEditing: boolean) => void;
  showNotification: (message: string) => void;
}

export function BlocklyEditor({
  onCodeChange,
  showNotification,
}: BlocklyEditorProps) {
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);

  const initBlockly = useCallback(() => {
    if (!blocklyDivRef.current) return;

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
        startScale: 1,
        maxScale: 1.5,
        minScale: 0.7,
        scaleSpeed: 1.2,
      },
      renderer: "zelos",
    };

    const workspace = Blockly.inject(blocklyDivRef.current, options);

    // Register flyout callbacks
    workspace.registerToolboxCategoryCallback("PIN", pinCategoryFlyout);
    workspace.registerToolboxCategoryCallback("ADC", adcCategoryFlyout);
    workspace.registerToolboxCategoryCallback("PWM", pwmCategoryFlyout);
    workspace.registerToolboxCategoryCallback("I2C", i2cCategoryFlyout);

    // Register button callbacks
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

    // Add change listener
    workspace.addChangeListener((e: Blockly.Events.Abstract) => {
      if (
        e.isUiEvent ||
        e.type === Blockly.Events.FINISHED_LOADING ||
        workspace.isDragging()
      ) {
        return;
      }
      save(workspace);
      const code = pythonGenerator.workspaceToCode(workspace);
      onCodeChange(code);
    });

    workspaceRef.current = workspace;
    return workspace;
  }, [onCodeChange]);

  // Initialize Blockly and define blocks
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      Blockly.common.defineBlocks(blocks);
      
      // Merge generator definitions
      const merged = { ...pythonGenerator.forBlock, ...forBlock };
      Object.assign(pythonGenerator.forBlock, merged);

      Blockly.registry.register(
        Blockly.registry.Type.TOOLBOX_ITEM,
        Blockly.ToolboxCategory.registrationName,
        OboCategory,
        true
      );

      initBlockly();

      return () => {
        // Workspace persists for component lifecycle
      };
    } catch (error) {
      console.error("Error initializing Blockly:", error);
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (blocklyDivRef.current && workspaceRef.current) {
        const workspace = workspaceRef.current as any;
        if (workspace.resize) {
          workspace.resize();
        }
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
          if (workspaceRef.current) {
            const imported = importJson(workspaceRef.current, json);
            if (imported) {
              showNotification("Workspace imported");
              const code = pythonGenerator.workspaceToCode(
                workspaceRef.current
              );
              onCodeChange(code);
            } else {
              showNotification("Error importing JSON");
            }
          }
        } catch (err) {
          console.error("Error importing JSON:", err);
          showNotification("Error importing JSON");
        }
      };
      reader.readAsText(file);
    },
    [onCodeChange, showNotification]
  );

  const handleExportJson = useCallback(() => {
    if (workspaceRef.current) {
      const json = exportJson(workspaceRef.current);
      downloadJsonFile(JSON.stringify(json), "workspace.json");
      showNotification("Workspace exported as workspace.json");
    }
  }, [showNotification]);

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
    <div className="blocky-editor">
      <div className="button-row">
        <p className="code-title">Visual Blocks</p>
        <div className="button-group">
          <button className="button" onClick={handleImportClick}>
            <i className="fa fa-file-import" style={{ paddingRight: "2px" }} />
            <span>Import</span>
          </button>
          <button className="button" onClick={handleExportJson}>
            <i
              className="fa fa-file-export"
              style={{ paddingRight: "4px" }}
            />
            <span>Export</span>
          </button>
        </div>
      </div>
      <div className="editor" ref={blocklyDivRef} />
    </div>
  );
}

// Utility function to download JSON
function downloadJsonFile(content: string, filename: string) {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:application/json;charset=utf-8," + encodeURIComponent(content)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
