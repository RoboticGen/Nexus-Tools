# Nexus Tools Monorepo


A modern monorepo containing three Next.js frontend applications with shared packages.

## 📁 Project Structure

```
nexus-tools/
├── apps/
│   ├── obo-code/          # Next.js app (port 3001)
│   ├── obo-blocks/        # Next.js app (port 3002)
│   └── obo-playground/    # Next.js app (port 3003)
├── packages/
│   ├── design-system/            # RoboticGen design system: components, theme, palette
│   ├── auth/                     # NextAuth + Keycloak: config, middleware, routes, session
│   ├── esp32-uploader/           # Headless ESP32: serial, REPL, file manager, flashing
│   ├── monaco-editor/            # Monaco wrapper
│   ├── blockly-python-generator/ # Blocks, generator, theme, toolbox
│   ├── micropython-esp32/        # MicroPython blocks and flyouts
│   ├── pyodide-executor/         # Pyodide worker runner (obo-blocks)
│   ├── skulpt-executor/          # Skulpt runner (obo-code)
│   ├── eslint-config/            # Shared ESLint configurations
│   └── typescript-config/        # Shared TypeScript configurations
├── turbo.json             # Turborepo configuration
├── pnpm-workspace.yaml    # PNPM workspace configuration
└── package.json           # Root package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

1. Install pnpm globally (if not already installed):
   ```bash
   npm install -g pnpm
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development

Run all applications in development mode:
```bash
pnpm dev
```

Run a specific application:
```bash
pnpm dev:obo-code        # http://localhost:3001
pnpm dev:obo-blocks      # http://localhost:3002
pnpm dev:obo-playground  # http://localhost:3003
```

### Building

Build all applications:
```bash
pnpm build
```

Build a specific application:
```bash
pnpm build:obo-code
pnpm build:obo-blocks
pnpm build:obo-playground
```

### Other Commands

```bash
pnpm lint          # Run ESLint across all packages
pnpm lint:fix      # Fix ESLint issues
pnpm type-check    # Run TypeScript type checking
pnpm format        # Format code with Prettier
pnpm format:check  # Check code formatting
pnpm clean         # Clean all build outputs and node_modules
```

## 📦 Shared Packages

### @nexus-tools/design-system

The RoboticGen design system. Source-only: consumers compile it through their own
TypeScript and Tailwind, so an app's `globals.css` must `@source` this package
alongside importing its theme.

```tsx
import { Button } from "@nexus-tools/design-system/components/ui/button";
import { CodeEditor } from "@nexus-tools/design-system/components/code-editor";
```

```css
@import 'tailwindcss';
@import '@nexus-tools/design-system/styles/theme.css';
@source '../../../../packages/design-system/src/**/*.{ts,tsx}';
```

### @nexus-tools/auth

NextAuth + Keycloak. The apps' `middleware.ts`, `[...nextauth]` route, login page
and firmware proxy are one-line re-exports of this package.

```tsx
import { authMiddleware } from "@nexus-tools/auth/middleware";
import { SessionProvider } from "@nexus-tools/auth/session-provider";
```

### @nexus-tools/esp32-uploader

Headless ESP32 support — hooks, serial transport, firmware catalog. No UI.

```tsx
import { useESP32Uploader, serialStreamManager } from "@nexus-tools/esp32-uploader";
```

## 🛠️ Technology Stack

- **Build System**: [Turborepo](https://turbo.build/repo)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Framework**: [Next.js 16](https://nextjs.org/) with React 19
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first, no JS config)
- **Linting**: [ESLint](https://eslint.org/)
- **Formatting**: [Prettier](https://prettier.io/)

## 📝 Best Practices

### Monorepo Guidelines

1. **Shared Code**: Place reusable code in `packages/` directory
2. **App-Specific Code**: Keep application-specific code in `apps/` directory
3. **Consistent Styling**: Use components from `@nexus-tools/design-system`
4. **Auth**: Route protection and session handling belong in `@nexus-tools/auth`
5. **Code Quality**: Run `pnpm lint` and `pnpm type-check` before committing

### Adding a New Package

1. Create a new directory in `packages/`
2. Add a `package.json` with the package name `@nexus-tools/<package-name>`
3. Add the package as a dependency where needed: `"@nexus-tools/<package-name>": "workspace:*"`

### Adding a New App

1. Create a new directory in `apps/`
2. Copy the structure from an existing app
3. Update the `package.json` name and port
4. Add scripts to root `package.json` for convenience

## 🔧 Environment Variables

Each app has an `.env.example` file. Copy it to `.env.local` and fill in the values:

```bash
cp apps/obo-code/.env.example apps/obo-code/.env.local
```

## 📄 License

MIT
