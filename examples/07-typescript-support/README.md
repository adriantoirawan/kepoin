# 📘 TypeScript Support & The Diagnostics Engine

Kepoin fully supports TypeScript, bringing its zero-config tracing and Local Diagnostics Engine natively into your TS stack.

## Running this Example

This folder contains a `demo.ts` file that uses TypeScript interfaces and static types.
We use **Surgical Tracing** by explicitly importing the `kepoin()` wrapper. Because Kepoin includes a `src/index.d.ts` file, your TypeScript compiler gets full IntelliSense support without throwing errors.

### Execute with `tsx` (Recommended)

`tsx` is the modern, lightning-fast standard for executing TypeScript natively in Node. It automatically handles source-maps, meaning Kepoin's crash autopsies will perfectly map to your original `.ts` files!

```bash
npx tsx demo.ts
```

Watch how the Local Diagnostics Engine intercepts the simulated `is not a function` error and translates the raw arguments into a clean list, while offering a human-readable hint!

## Zero-Config Tracing with TypeScript

If you want to trace an entire TypeScript backend **without changing a line of code**, you can combine Kepoin's global loader with `tsx`!

```bash
# This injects BOTH kepoin and tsx simultaneously!
node --require kepoin/register --import tsx index.ts
```
