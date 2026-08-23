# @omega-v/observer

Event observation and normalization for Ω∞v Oceanicos.

**Step 1 of the verification loop**: Capture claims and prepare them for verification.

## Installation

```bash
npm install @omega-v/observer
```

## Usage

```typescript
import { Observer } from '@omega-v/observer';

const observer = new Observer();

const observation = observer.observe({
  claim: 'Service X returned HTTP 200',
  category: 'health-check',
  source: {
    system: 'health-check-api',
    version: '1.2.3',
    environment: 'production',
  },
  observedBy: 'monitoring-system',
  metadata: {
    statusCode: 200,
    responseTime: 45,
    attempts: 3,
  },
  confidence: 0.95,
  confidenceReason: '3 consecutive successful checks',
});

console.log(observation.id); // obs-2026-08-07-1
console.log(observation.status); // normalized
```

## Features

### Validation

All observations are validated against the required schema:

- `claim` — Required, must be a string
- `source.system` — Required, identifies the source
- `confidence` — Must be between 0 and 1
- `confidenceReason` — Required, explains the confidence level

### Deduplication

Automatically identifies duplicate observations within a time window (default: 60 seconds).

```typescript
const obs1 = observer.observe({/* ... */});
const obs2 = observer.observe({/* same claim */});

// obs2.id === obs1.id (deduplicated)
// obs2.metadata.deduplicated === true
```

### Normalization

Converts raw observations into a standardized format:

- Adds unique ID
- Adds timestamp
- Clamps confidence to 0-1
- Marks as 'normalized' status

## API

### Constructor

```typescript
new Observer(deduplicationWindow?: number)
```

- `deduplicationWindow` — Time in milliseconds to check for duplicates (default: 60000)

### Methods

#### `observe(input)`

Observe a claim and normalize it for verification.

**Parameters:**

```typescript
{
  claim: string;
  category?: string;
  source: {
    system: string;
    version: string;
    environment: string;
  };
  observedBy: string;
  metadata: Record<string, unknown>;
  confidence: number;        // 0-1
  confidenceReason: string;
}
```

**Returns:** `Observation`

#### `getCacheStats()`

Get information about the deduplication cache.

**Returns:**

```typescript
{
  size: number; // Number of cached observations
  windowMs: number; // Deduplication window in ms
}
```

## Error Handling

Invalid observations throw an error:

```typescript
try {
  observer.observe({
    claim: '', // Empty claim
    source: {/* ... */},
    // ...
  });
} catch (error) {
  console.error(error.message);
  // "Observation validation failed: claim is required and must be a string"
}
```

## Testing

```bash
npm test
```

Tests cover:

- Basic observation creation
- Input validation
- Confidence clamping
- Deduplication
- Cache statistics

---

**Package Status:** Stable (v0.1.0)  
**Part of:** Ω∞v Oceanicos verification loop  
**Last Updated:** 2026-08-07
