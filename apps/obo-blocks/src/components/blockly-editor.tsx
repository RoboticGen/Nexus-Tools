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
import { useEffect, useRef, useCallback } from "react";

import { useEditorHandlers } from "@/hooks/use-editor-handlers";

interface BlocklyEditorProps {
  onCodeChange: (code: string) => void;
  onEditToggle?: (isEditing: boolean) => void;
  showNotification: (message: string) => void;
  onRegisterImporter?: (importer: (jsonString: string) => boolean) => void;
}

export function BlocklyEditor({
  onCodeChange,
  showNotification,
  onRegisterImporter,
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

    // The div already has real dimensions (guaranteed by the ResizeObserver
    // caller), so we can measure synchronously right after inject.
    Blockly.svgResize(workspace);
    (workspace as any).resize();
    (workspace as any).updateInverseScreenCTM();

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
      
     
      (pythonGenerator as any).definitions_ = {};
      
      const code = pythonGenerator.workspaceToCode(workspace);
      onCodeChange(code);
    });

    workspaceRef.current = workspace;

    // Register the string-based importer for external callers (e.g. chat)
    if (onRegisterImporter) {
      onRegisterImporter((jsonString: string) => {
        try {
          const json = JSON.parse(jsonString);
          const imported = importJson(json);
          if (imported) {
            pythonGenerator.definitions_ = {};
            const code = pythonGenerator.workspaceToCode(workspace);
            onCodeChange(code);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      });
    }

    return workspace;
  }, [onCodeChange, onRegisterImporter]);

  // Initialize Blockly and define blocks
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      Blockly.common.defineBlocks(blocks);
      
      // Merge generator definitions
      const merged = { ...pythonGenerator.forBlock, ...forBlock };
      Object.assign(pythonGenerator.forBlock, merged);

      // Override the finish method to properly handle function definitions
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

      // Use a ResizeObserver to delay inject until the container div has
      // real non-zero pixel dimensions.  A plain rAF or useEffect isn't
      // enough here because Next.js dynamic imports + CSS flex/grid
      // percentage heights can take multiple layout passes to resolve.
      // The observer fires as soon as the element gets its first real size,
      // at which point Blockly can measure the correct viewport immediately.
      const div = blocklyDivRef.current;
      if (!div) return;

      let initialized = false;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && !initialized) {
          initialized = true;
          observer.disconnect();
          initBlockly(div);
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
