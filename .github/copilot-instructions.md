## Overall Rules

- Avoid unnecessary deps; prefer built-ins (e.g., `fetch` over `axios`).
- Use `pnpm` for package management, but only add packages that are truly needed.
- Do not commit unless the tests pass.
- Write tests at the same time as you implement the features.
  - Place test files in the same directory hierarchy as the implementation files, keeping co-location in mind.
- Avoid using code comments. Instead, try to use descriptive variable names so that the code itself explains what it does.
- Follow Conventional Commits for commit messages (e.g, use `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `revert:`, etc.).
- Delete any code or files that become unnecessary as a result of the implementation.
