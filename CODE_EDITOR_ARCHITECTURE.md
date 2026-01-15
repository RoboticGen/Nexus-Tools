# Code Editor Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Monorepo (Nexus Tools)                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──────┐ ┌──▼────────┐ ┌─▼──────────┐
            │  obo-code    │ │obo-      │ │obo-      │
            │              │ │playground │ │blocks    │
            └───────┬──────┘ └──┬────────┘ └─┬────────┘
                    │            │            │
                    │ imports    │ imports   │ imports
                    │            │            │
        ┌───────────▼────────────▼────────────▼──────────┐
        │  apps/*/src/components/code-editor.tsx         │
        │  (Wrapper - Re-exports shared component)       │
        └───────────┬────────────────────────────────────┘
                    │ re-exports
                    │
        ┌───────────▼─────────────────────────────────────┐
        │  packages/ui/src/components/code-editor.tsx     │
        │  (Shared Monaco Editor Implementation)          │
        │                                                  │
        │  Features:                                       │
        │  • Monaco Editor                                │
        │  • Python/JS/TS support                         │
        │  • Dark/Light themes                            │
        │  • SSR safe                                     │
        │  • Run/Copy/Export actions                      │
        └───────────┬─────────────────────────────────────┘
                    │ depends on
                    │
        ┌───────────▼─────────────────────────────────────┐
        │  @monaco-editor/react                           │
        │  (Monaco Editor React Wrapper)                  │
        └───────────┬─────────────────────────────────────┘
                    │
        ┌───────────▼─────────────────────────────────────┐
        │  Monaco Editor (VS Code Editor)                 │
        └─────────────────────────────────────────────────┘
```

## Component Hierarchy

```
CodeEditor (Shared Package)
├── Props Interface
│   ├── code: string
│   ├── onChange: (code: string) => void
│   ├── onRun: () => void
│   ├── onCopy: () => void
│   ├── onExport: () => void
│   ├── language?: 'python' | 'javascript' | 'typescript'
│   ├── readOnly?: boolean
│   ├── theme?: 'light' | 'dark'
│   └── height?: string
│
├── UI Structure
│   ├── Container (flex, full-width)
│   │   ├── Header (optional)
│   │   │   ├── Title
│   │   │   └── Actions
│   │   │       ├── Run Button
│   │   │       ├── Copy Button
│   │   │       └── Export Button
│   │   │
│   │   └── Editor Area
│   │       └── MonacoEditor
│   │           ├── Syntax Highlighting
│   │           ├── Line Numbers
│   │           ├── Minimap
│   │           └── IntelliSense
│   │
│   └── State Management
│       ├── editorRef (useRef)
│       ├── handleChange (useCallback)
│       ├── handleCopy (useCallback)
│       └── handleEditorMount (useCallback)
```

## File Organization

```
Nexus-Tools/
│
├── packages/
│   └── ui/
│       ├── src/
│       │   ├── components/
│       │   │   ├── code-editor.tsx         ◄─── SHARED IMPLEMENTATION
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   └── input.tsx
│       │   ├── hooks/
│       │   ├── utils/
│       │   ├── index.ts                    ◄─── EXPORTS CodeEditor
│       │   └── ...
│       ├── CODE_EDITOR.md                  ◄─── COMPONENT DOCS
│       ├── package.json                    ◄─── ADDS @monaco-editor/react
│       └── tsconfig.json
│
├── apps/
│   ├── obo-code/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── code-editor.tsx         ◄─── WRAPPER (re-export)
│   │   │   │   ├── index.ts                ◄─── EXPORTS CodeEditor
│   │   │   │   ├── navbar.tsx
│   │   │   │   ├── output-terminal.tsx
│   │   │   │   └── ...
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx                ◄─── USES CodeEditor
│   │   │   └── ...
│   │   ├── package.json                    ◄─── REMOVES CodeMirror deps
│   │   └── ...
│   │
│   ├── obo-playground/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── code-editor.tsx         ◄─── NEW: WRAPPER
│   │   │   │   └── index.ts                ◄─── NEW: EXPORTS
│   │   │   ├── app/
│   │   │   └── ...
│   │   └── package.json                    ◄─── ALREADY HAS @nexus-tools/ui
│   │
│   └── obo-blocks/
│       ├── src/
│       │   ├── components/
│       │   │   ├── code-editor.tsx         ◄─── NEW: WRAPPER
│       │   │   └── index.ts                ◄─── NEW: EXPORTS
│       │   ├── app/
│       │   └── ...
│       └── package.json                    ◄─── ALREADY HAS @nexus-tools/ui
│
├── MIGRATION_GUIDE.md                      ◄─── DEVELOPER GUIDE
└── CODE_EDITOR_CONSOLIDATION.md            ◄─── THIS SUMMARY
```

## Data Flow

### Editing Flow
```
User Types in Editor
        │
        ▼
MonacoEditor onChange event
        │
        ▼
handleChange callback (useCallback)
        │
        ▼
call onChange prop with new code
        │
        ▼
Parent component updates state (setCode)
        │
        ▼
CodeEditor re-renders with new code value
        │
        ▼
Monaco Editor updates display
```

### Action Flow
```
User clicks Run/Copy/Export button
        │
        ▼
Button onClick handler fires
        │
        ▼
Call onRun/onCopy/onExport callback
        │
        ▼
Parent component handles action
```

## Dependency Graph

```
obo-code → @nexus-tools/ui → @monaco-editor/react → monaco-editor
obo-playground → @nexus-tools/ui → @monaco-editor/react → monaco-editor
obo-blocks → @nexus-tools/ui → @monaco-editor/react → monaco-editor
```

## Installation & Initialization

### Step 1: Install Workspace Dependencies
```bash
pnpm install
```
This installs `@monaco-editor/react` in packages/ui

### Step 2: Use in Components
```typescript
import { CodeEditor } from "@/components/code-editor";
// or
import { CodeEditor } from "@nexus-tools/ui";
```

### Step 3: Render Component
```tsx
<CodeEditor
  code={code}
  onChange={setCode}
  onRun={handleRun}
  onCopy={handleCopy}
  onExport={handleExport}
/>
```

## Configuration

### Monaco Editor Options
Located in `packages/ui/src/components/code-editor.tsx`:

```typescript
const monacoOptions = {
  minimap: { enabled: true },      // Show minimap
  fontSize: 14,                     // Font size
  lineHeight: 20,                   // Line height
  padding: { top: 16, bottom: 16 }, // Padding
  formatOnPaste: true,              // Auto-format on paste
  formatOnType: true,               // Auto-format while typing
  autoIndent: "full",               // Smart indentation
  tabSize: 4,                       // Tab width
  wordWrap: "on",                   // Word wrap
  scrollBeyondLastLine: false,      // Don't scroll beyond content
  automaticLayout: true,            // Auto-resize with container
  readOnly: false,                  // Editable by default
};
```

## Theme Configuration

### Available Themes
```typescript
theme="dark"   // VS Code Dark (default)
theme="light"  // VS Code Light
```

### Custom Themes (Future)
Can be extended to support:
- Custom color schemes
- Brand-specific theming
- User preferences

## Performance Considerations

### Optimization Techniques
1. **Dynamic Import**: Component loads on-demand
2. **useCallback**: Prevents unnecessary function recreations
3. **useRef**: Avoids re-renders when accessing editor instance
4. **Lazy Loading**: Monaco loads only when needed

### Bundle Size Impact
- **Added**: ~500KB (Monaco Editor)
- **Removed**: ~100KB (CodeMirror packages)
- **Net**: +400KB (justified by feature gains)

### Memory Usage
- Monaco typically uses 20-30MB per instance
- Suitable for modern browsers
- Consider for memory-constrained environments

## Browser Support

Monaco Editor supports:
- Chrome/Edge 91+
- Firefox 89+
- Safari 14+
- Opera 77+

## Accessibility Features

- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus management
- ARIA labels on buttons

## Security Considerations

- No external CDN dependencies
- All code bundled with app
- No execution of arbitrary code
- Input sanitization through React

## Troubleshooting Reference

| Issue | Cause | Solution |
|-------|-------|----------|
| Editor not showing | No height set | Set `height="400px"` or ensure parent has height |
| "Module not found" | Missing dependency | Run `pnpm install` in workspace root |
| Code not syncing | onChange not bound | Check prop is passed correctly |
| Slow performance | Large code files | Implement virtualization or pagination |
| SSR errors | Component on server | Already handled with `"use client"` and dynamic import |

## Future Roadmap

### Q1 2026
- [ ] Custom theme support
- [ ] Plugin system
- [ ] Code formatting integration

### Q2 2026
- [ ] Collaboration features
- [ ] Debugging support
- [ ] Real-time sync

### Q3 2026
- [ ] AI-powered suggestions
- [ ] Advanced refactoring tools
- [ ] Performance analytics

## Related Documentation

- [CODE_EDITOR.md](./packages/ui/CODE_EDITOR.md) - Component API
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration details
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
- [@monaco-editor/react GitHub](https://github.com/suren-atoyan/monaco-react)

---

**Architecture Version**: 1.0  
**Last Updated**: January 15, 2026  
**Status**: ✅ Production Ready
