# AI Development Rules

This document outlines the rules and conventions for AI-driven development on this project. Adhering to these guidelines ensures consistency, maintainability, and leverages the existing tech stack effectively.

## Tech Stack Overview

This project is built with a modern, type-safe, and efficient technology stack:

- **Framework**: React with Vite for a fast development experience.
- **Language**: TypeScript for type safety and improved developer experience.
- **UI Components**: A comprehensive set of pre-built, accessible components from `shadcn/ui`.
- **Styling**: Tailwind CSS for a utility-first styling approach.
- **Routing**: `react-router-dom` for client-side routing.
- **Data Fetching & Caching**: `Tanstack Query` for managing server state.
- **Forms**: `react-hook-form` and `zod` for robust and type-safe form handling.
- **Icons**: `lucide-react` for a consistent and extensive icon set.
- **Video Processing**: `FFmpeg.wasm` for client-side video manipulation.

## Library Usage and Coding Conventions

### 1. UI and Components

- **Primary Component Library**: **ALWAYS** use components from `shadcn/ui` (`@/components/ui/*`). Do not build custom components for common UI elements like buttons, dialogs, inputs, etc.
- **Component Structure**: Place new reusable components in `src/components/`. Pages, which are top-level components for routes, go in `src/pages/`.
- **Styling**: Use **Tailwind CSS exclusively** for styling. Apply classes directly in the JSX. Use the `cn` utility function from `@/lib/utils` to conditionally apply or merge classes. **Do not write custom CSS files.**

### 2. Routing

- **Router**: Use `react-router-dom` for all navigation and routing.
- **Route Definitions**: All routes **MUST** be defined in `src/App.tsx`.

### 3. State Management

- **Server State**: Use `Tanstack Query` for fetching, caching, and synchronizing data from a server.
- **Client State**: For local component state, use React's built-in hooks (`useState`, `useReducer`). Avoid introducing global state management libraries like Redux or Zustand.

### 4. Forms

- **Form Logic**: Use `react-hook-form` for managing form state, validation, and submissions.
- **Validation**: Use `zod` to define validation schemas for all forms.

### 5. Icons

- **Icon Library**: **ONLY** use icons from the `lucide-react` package. This ensures visual consistency.

### 6. Notifications

- **Toasts**: Use the custom `useToast` hook (`@/hooks/use-toast.ts`) which integrates with the `shadcn/ui` Toaster for user feedback and notifications.

### 7. Code Style and File Organization

- **File Naming**: Use PascalCase for component files (e.g., `MyComponent.tsx`).
- **Directory Structure**:
    - `src/pages/`: For route-level components.
    - `src/components/`: For shared, reusable components.
    - `src/components/ui/`: For `shadcn/ui` base components (do not modify).
    - `src/hooks/`: For custom React hooks.
    - `src/lib/`: For utility functions and library configurations.