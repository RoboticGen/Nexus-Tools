import * as Blockly from "blockly/core";

export const insertPythonSnippet = (code: string) => {
  const currentCode = localStorage.getItem("pythonCode");
  const newCode = currentCode ? currentCode + "\n" + code : code;
  localStorage.setItem("pythonCode", newCode);
};

export const makeUneditable = (workspace: Blockly.Workspace, disable: boolean) => {
  if (disable) {
    workspace.getAllBlocks(false).forEach((block) => {
      block.setMovable(false);
      block.setEditable(false);
      block.setDeletable(false);
      block.setCollapsed(false);
    });
  } else {
    workspace.getAllBlocks(false).forEach((block) => {
      block.setMovable(true);
      block.setEditable(true);
      block.setDeletable(true);
    });
  }
};

export const saveAsPythonFile = (code: string, fileName: string = "code.py") => {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(code));
  element.setAttribute("download", fileName);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

export const loadModifiedCode = (): string | null => {
  return localStorage.getItem("modifiedCode");
};

export const saveModifideCode = (code: string) => {
  localStorage.setItem("modifiedCode", code);
};
