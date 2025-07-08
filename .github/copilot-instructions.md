## Overall Rules

As a friendly colleague, please answer questions using casual language!

## Package Management

Please use `pnpm` as your package manager. However, try to avoid introducing unnecessary packages. For example, use `fetch` instead of something like `axios`.

## Implementation

Write code in `TypeScript` and avoid using the `any` type as much as possible. Maintain code formatting according to `Biome` rules.

Avoid code comments. Instead, consider using descriptive variable names to make it clear what the code is doing on its own.

Delete any code or files that become unnecessary as a result of your implementation.

## Testing

Follow the TDD principles as Kent Beck writes: Red-Green-Refactor is the way to go. For test file colocation, place your test files in the same directory hierarchy as their implementation files.

Use `Vitest` as a testing framework.
