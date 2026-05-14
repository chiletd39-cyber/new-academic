# Academic Hub 2026

Welcome to the Academic Hub project - A comprehensive educational platform developed by our engineering team.

## Project Overview

**Academic Hub** is a modern, full-stack educational platform built with cutting-edge web technologies. This project aims to provide educators and students with a seamless learning experience.

**Developed by**: Academic Hub Development Team

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Bun package manager (preferred for this project)

### Installation & Setup

Follow these steps to set up your development environment:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd new-academic

# Step 3: Install the necessary dependencies.
bun install

# Step 4: Start the development server with auto-reloading and instant preview.
bun run dev
```

## Development

### Available Commands

- **`bun run dev`** - Start the development server
- **`bun run build`** - Build the project for production
- **`npm run lint`** - Run ESLint to check code quality
- **`npm run preview`** - Preview the production build locally

### Project Structure

```
src/
├── components/     # Reusable React components
├── contexts/       # React context providers
├── hooks/          # Custom React hooks
├── integrations/   # Third-party integrations (Supabase, etc.)
├── pages/          # Page components
├── types/          # TypeScript type definitions
└── lib/            # Utility functions
```

## Technology Stack

- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase
- **Package Manager**: Bun
- **Linting**: ESLint

## Contributing

Please ensure all changes follow the project's coding standards and pass linting checks before committing.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
