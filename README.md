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
│   ├── ui/                # Shared UI components
│   ├── utils/             # Shared utility functions
│   ├── types/             # Shared TypeScript types
│   ├── eslint-config/     # Shared ESLint configurations
│   ├── typescript-config/ # Shared TypeScript configurations
│   └── tailwind-config/   # Shared Tailwind CSS configuration
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

### @nexus-tools/ui

Shared React UI components built with Tailwind CSS.

```tsx
import { Button, Card, Input } from "@nexus-tools/ui";
```

### @nexus-tools/utils

Shared utility functions.

```tsx
import { capitalize, slugify, formatDate, isValidEmail } from "@nexus-tools/utils";
```

### @nexus-tools/types

Shared TypeScript type definitions.

```tsx
import type { User, ApiResponse, Theme } from "@nexus-tools/types";
```

## 🛠️ Technology Stack

- **Build System**: [Turborepo](https://turbo.build/repo)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Framework**: [Next.js 14](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Linting**: [ESLint](https://eslint.org/)
- **Formatting**: [Prettier](https://prettier.io/)

## 📝 Best Practices

### Monorepo Guidelines

1. **Shared Code**: Place reusable code in `packages/` directory
2. **App-Specific Code**: Keep application-specific code in `apps/` directory
3. **Type Safety**: Use shared types from `@nexus-tools/types`
4. **Consistent Styling**: Use shared UI components from `@nexus-tools/ui`
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
