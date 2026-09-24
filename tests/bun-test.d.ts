// Minimal types for `bun:test` so `bun run typecheck` covers the tests without
// adding a bun-types dependency.
declare module 'bun:test' {
    type Fn = () => void | Promise<void>;
    export function describe(name: string, fn: () => void): void;
    export function test(name: string, fn: Fn): void;
    export const it: typeof test;
    export function beforeEach(fn: Fn): void;
    export function afterEach(fn: Fn): void;
    interface Matchers {
        not: Matchers;
        toBe(expected: unknown): void;
        toEqual(expected: unknown): void;
        toBeNull(): void;
        toBeTrue(): void;
        toBeFalse(): void;
        toBeCloseTo(expected: number, digits?: number): void;
        toBeGreaterThan(n: number): void;
        toBeLessThan(n: number): void;
        toBeLessThanOrEqual(n: number): void;
        toContain(item: unknown): void;
        toHaveLength(n: number): void;
        toMatch(re: RegExp | string): void;
    }
    export function expect(actual: unknown): Matchers;
}
