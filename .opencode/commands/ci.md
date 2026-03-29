---
description: Run the full CI pipeline (test, lint, build)
---

Run the same checks CI runs, in order:

```
!`pnpm test:run`
```

```
!`pnpm lint`
```

```
!`pnpm build`
```

Report the result of each step. If any step fails, stop and analyze the error.
