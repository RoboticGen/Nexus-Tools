"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div style={{ height: "100%", padding: "1rem" }}>Loading editor...</div>,
});

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({
  code,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  return (
    <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      <CodeMirror
        value={code}
        height="100%"
        extensions={[python()]}
        onChange={handleChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        theme="light"
      />
    </div>
  );
}

"use client";

/**
 * Re-export of the shared CodeEditor component from packages/ui
 * This wrapper allows obo-blocks to use the shared editor
 */
export { CodeEditor } from "@nexus-tools/ui";
