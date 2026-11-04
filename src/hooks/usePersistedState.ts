import { useState, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';

// Fast in-memory cache so tab switching is 0ms without repeated JSON parsing
const memoryStore = new Map<string, any>();

const STORAGE_PREFIX = 'pos_ui_filter_';

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  const [state, setInternalState] = useState<T>(() => {
    if (memoryStore.has(fullKey)) {
      return memoryStore.get(fullKey) as T;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(fullKey);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as T;
          memoryStore.set(fullKey, parsed);
          return parsed;
        }
      } catch {
        // Ignore storage read errors
      }
    }
    memoryStore.set(fullKey, defaultValue);
    return defaultValue;
  });

  const setState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (valueOrUpdater) => {
      setInternalState((prev) => {
        const nextValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevState: T) => T)(prev)
            : valueOrUpdater;

        memoryStore.set(fullKey, nextValue);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(fullKey, JSON.stringify(nextValue));
          } catch {
            // Ignore storage quota errors
          }
        }
        return nextValue;
      });
    },
    [fullKey]
  );

  return [state, setState];
}

export function usePersistedDateRange(
  key: string,
  defaultRange?: DateRange
): [DateRange | undefined, React.Dispatch<React.SetStateAction<DateRange | undefined>>] {
  const fullKey = `${STORAGE_PREFIX}daterange_${key}`;

  const [range, setInternalRange] = useState<DateRange | undefined>(() => {
    if (memoryStore.has(fullKey)) {
      return memoryStore.get(fullKey) as DateRange | undefined;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(fullKey);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const hydrated: DateRange = {
              from: parsed.from ? new Date(parsed.from) : undefined,
              to: parsed.to ? new Date(parsed.to) : undefined,
            };
            memoryStore.set(fullKey, hydrated);
            return hydrated;
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }
    memoryStore.set(fullKey, defaultRange);
    return defaultRange;
  });

  const setRange: React.Dispatch<React.SetStateAction<DateRange | undefined>> = useCallback(
    (valueOrUpdater) => {
      setInternalRange((prev) => {
        const nextValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevState: DateRange | undefined) => DateRange | undefined)(prev)
            : valueOrUpdater;

        memoryStore.set(fullKey, nextValue);
        if (typeof window !== 'undefined') {
          try {
            if (!nextValue) {
              localStorage.removeItem(fullKey);
            } else {
              localStorage.setItem(
                fullKey,
                JSON.stringify({
                  from: nextValue.from ? nextValue.from.toISOString() : undefined,
                  to: nextValue.to ? nextValue.to.toISOString() : undefined,
                })
              );
            }
          } catch {
            // Ignore storage errors
          }
        }
        return nextValue;
      });
    },
    [fullKey]
  );

  return [range, setRange];
}

