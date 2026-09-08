import { describe, expect, it } from 'vitest';
import { shuffleCopy } from './shuffle';

describe('shuffleCopy', () => {
	it('returns items in a shuffled order without changing the source array', () => {
		const source = ['a', 'b', 'c', 'd'];

		const shuffled = shuffleCopy(source, () => 0);

		expect(shuffled).toEqual(['b', 'c', 'd', 'a']);
		expect(source).toEqual(['a', 'b', 'c', 'd']);
	});

	it('keeps every item exactly once', () => {
		const source = ['a', 'b', 'c', 'd'];

		const shuffled = shuffleCopy(source, () => 0.5);

		expect(shuffled).toHaveLength(source.length);
		expect([...shuffled].sort()).toEqual([...source].sort());
	});
});
