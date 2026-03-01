"use client";

import * as Blockly from "blockly";
import "blockly/blocks";

import { useEffect, useRef, useCallback } from "react";

import { blocks } from "@/blockly/blocks";
import { OboCategory } from "@/blockly/categories";
import { forBlock } from "@/blockly/generator";
import {
  save,
  exportJson,
  importJson,
  getActiveWorkspace,
} from "@/blockly/serialization";
import { theme } from "@/blockly/themes";
import { toolbox } from "@/blockly/toolbox";
import { useEditorHandlers } from "@/hooks/use-editor-handlers";
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
import { pythonGenerator } from "@/micropython/setup";

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
  const { downloadJsonFile } = useEditorHandlers();

  const initBlockly = useCallback(() => {
    if (!blocklyDivRef.current) return;

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

    const workspace = Blockly.inject(blocklyDivRef.current, options);

    // Force workspace metrics initialization.
    // Without this, viewport calculations are stale until first user
    // interaction (zoom/click), which breaks import positioning.
    Blockly.svgResize(workspace);
    const initScale = workspace.scale;
    workspace.setScale(initScale * 1.01);
    workspace.setScale(initScale);

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
      
     
      pythonGenerator.definitions_ = {};
      
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

      // Override the finish method to properly handle function definitions
      const originalFinish = pythonGenerator.finish.bind(pythonGenerator);
      pythonGenerator.finish = function(code: string) {
        // Get all definitions (functions)
        const definitions = Object.values(this.definitions_ || {}).join('\n');
        
        // Prepend definitions to the main code
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
        
        // Update scrolling behavior on resize
        const isMobile = window.innerWidth <= 768;
        if (workspace.scrollbar && workspace.scrollbar.horizontal) {
          workspace.scrollbar.horizontal.setVisible(isMobile);
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
          const imported = importJson(json);
          if (imported) {
            showNotification("Workspace imported successfully");
            const workspace = getActiveWorkspace();
            
            // Initialize generator before generating code
            pythonGenerator.init(workspace);
            pythonGenerator.definitions_ = {};
            
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
