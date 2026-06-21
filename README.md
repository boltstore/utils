# @boltstore/utils — DEPRECATED

**Deprecated as of Boltstore v0.8.0. Use `@boltstore/client` instead.**

The shared types previously exported by `@boltstore/utils` have moved into
`@boltstore/client`. If you need access to shared types, install the client
package instead:

```
npm install @boltstore/client
```

## Migration

| Old import | New import |
|------------|------------|
| `@boltstore/utils` | `@boltstore/client` |
| `QueryBuilder` | Removed — use simple query helpers in `@boltstore/client` |
| WS types | Removed — realtime is not part of core Boltstore |

## Why?

Boltstore has been simplified from a BaaS platform to a database platform.
The `@boltstore/utils` package was a shared dependency between server, client,
and other packages. With the new architecture, the client SDK is the only
consumer of shared types, so types live there directly.

## Support

This package will receive no further updates. Use `@boltstore/client` instead.
