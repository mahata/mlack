---
description: Build and deploy to Cloudflare Workers (production)
---

IMPORTANT: Before deploying, run the full CI pipeline to make sure everything passes.

```
!`pnpm test:run && pnpm lint && pnpm build`
```

If CI passes, deploy to production:

```
!`pnpm deploy`
```

Report the deployment result including the worker URL.
