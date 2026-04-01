

## Fix: Balburdia still appearing 2x after merge

### Root cause

The previous merge uses `(campaignId || resolvedName).toLowerCase()` as key. When the CRM has both a numeric ID (e.g. `120213456789`) and a text name (e.g. `Balbúrdia Cervejeira`):

- Numeric ID resolves via API/namesMap → merge key = `120213456789::meta_ads`
- Text name may NOT resolve (campaign archived/not in API for that period) → merge key = `balbúrdia cervejeira::meta_ads`

These are different keys, so both survive as separate rows with the same display name.

### Fix

Add a **second merge pass** after the first one: collapse entries in `mergedMap` that share the same `normalizeName(campaignName)::channel`. When two entries collapse, union their Sets and prefer the one that has a `campaignId`.

| File | Change |
|------|--------|
| `src/hooks/useMarketingAttribution.ts` | After the existing mergedMap loop (line ~306), add a second pass that re-groups by `normalizeName(campaignName)::channel`, merging Sets/metrics for entries that resolved to the same display name but different keys |

