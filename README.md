# mlack

It's an experiment to create a slack-like app just by vibe coding with GitHub Copilot.

## Features

- **Health Check Endpoint**: A `/health` endpoint built with Hono framework that returns service status
- **TypeScript**: Full TypeScript support with strict type checking
- **Testing**: Comprehensive test suite using Vitest
- **Linting**: ESLint configuration for code quality

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (package manager)

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev

# Build the project
pnpm build

# Run tests
pnpm test

# Run tests once
pnpm test:run

# Lint code
pnpm lint

# Lint and fix code
pnpm lint:fix
```

### API Endpoints

#### GET /health

Health check endpoint that returns the service status.

**Response:**
```json
{
  "status": "ok",
  "message": "Service is running"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

## Project Structure

```
mlack/
├── hono/           # Hono application
│   ├── app.ts      # Main application setup
│   ├── app.test.ts # Application tests
│   └── index.ts    # Server entry point
├── package.json    # Project dependencies and scripts
├── tsconfig.json   # TypeScript configuration
├── vitest.config.ts # Vitest configuration
└── eslint.config.js # ESLint configuration
```

## Technology Stack

- **Framework**: [Hono](https://hono.dev/) - Ultra-fast web framework
- **Runtime**: Node.js with [@hono/node-server](https://github.com/honojs/node-server)
- **Language**: TypeScript
- **Testing**: Vitest
- **Linting**: ESLint with TypeScript support
- **Package Manager**: pnpm
