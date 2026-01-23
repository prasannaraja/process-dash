# Metrics Definition

## Intent Block

A contiguous period with one primary intent.

## Reporting Metrics

### Reported Duration Buckets

For external reporting, actual duration is mapped to approximate buckets to avoid false precision.
See [Time Capture and Reporting](time-capture-and-reporting.md) for the mapping table.

### Focus Block

A block is considered a "Focus Block" if:

- `interrupted` is `false`
- `durationMinutes` >= 30 (uses actual internal duration)

## Fragmentation Rate

Interrupted Blocks / Total Blocks

## Efficiency

Efficiency = Focused Intent Time / Available Cognitive Time

This system does NOT measure hours worked or busyness.

## Recovery Time

Intentional non-work pauses (Coffee, Lunch).

- **Excluded** from "Active Work" / "Focus Blocks".
- **Reported** separately with bucketed labels.
