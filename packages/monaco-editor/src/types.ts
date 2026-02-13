export interface MonacoCodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
  language?: "python" | "javascript" | "typescript" | "json";
  theme?: "vs-light" | "vs-dark";
  height?: string;
  showMinimap?: boolean;
}

export interface MonacoCodeEditorWithActionsProps extends MonacoCodeEditorProps {
  onRun?: () => void;
  onCopy?: () => void;
  onExport?: () => void;
}
