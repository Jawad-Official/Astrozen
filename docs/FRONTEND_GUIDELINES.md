# Frontend Guidelines

## 1. Project Structure (`Frontend/src`)

- **`components/`**: Reusable UI components.
  - `ui/`: Base UI primitives (buttons, inputs) - typically from `shadcn/ui`.
  - `layout/`: Layout components (Sidebar, Header).
  - `features/`: Complex domain-specific components (e.g., `BoardView`, `IssueCard`).
- **`pages/`**: Route components representing full views.
- **`services/`**: API integration layers (Axios instances, endpoint definitions).
- **`hooks/`**: Custom React hooks (e.g., `useAuth`, `useProject`).
- **`context/`**: React Context providers (try to prefer Zustand for global state).
- **`store/`**: Zustand stores.
- **`types/`**: Global TypeScript definitions.
- **`lib/`**: Utility functions (`cn`, formatters).

## 2. Component Guidelines

- **Functional Components:** Use React Functional Components with Hooks.
- **Props:** Define interfaces for all component props.
- **Export:** Use named exports (`export function Button...`).
- **Separation of Concerns:** Keep logic (hooks) separate from UI (JSX) where complex.

## 3. Styling with Tailwind CSS

- **Utility First:** Use utility classes for layout, spacing, colors.
- **`cn` Utility:** Use the `cn()` helper (clsx + tailwind-merge) for conditional class names.
  ```tsx
  <div className={cn("flex items-center", isActive && "bg-blue-500")} />
  ```
- **Theming:** Use CSS variables defined in `index.css` (e.g., `bg-background`, `text-foreground`) to support dark mode automatically.

## 4. State Management

- **Server State:** Use **TanStack Query** for all API data. Do not store API data in Redux/Zustand unless strictly necessary.
- **Client State:** Use **Zustand** for global UI state (e.g., Sidebar open/close, User session).
- **Local State:** Use `useState` for component-local interactions.

## 5. Forms

- Use **React Hook Form** for form state management.
- Use **Zod** for schema validation.
- patterns:
  ```tsx
  const form = useForm<z.infer<typeof formSchema>>({...})
  ```

## 6. Naming Conventions

- **Components:** PascalCase (e.g., `ProjectCard.tsx`).
- **Hooks:** camelCase, prefixed with `use` (e.g., `useDebounce.ts`).
- **Utilities:** camelCase (e.g., `formatDate.ts`).
- **Interfaces/Types:** PascalCase (e.g., `Project`, `User`).

## 7. Performance

- **Lazy Loading:** Use `React.lazy` for route-level code splitting.
- **Optimization:** Use `useMemo` and `useCallback` for expensive computations or stable references, but don't optimize prematurely.
