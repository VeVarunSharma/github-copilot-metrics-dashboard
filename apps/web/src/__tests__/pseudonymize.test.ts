import { describe, expect, it } from 'vitest';
import { pseudonymize } from '@/lib/pseudonymize';
describe('pseudonymize', () => { it('is stable and salt-sensitive', () => { expect(pseudonymize('octo','a')).toBe(pseudonymize('octo','a')); expect(pseudonymize('octo','a')).not.toBe(pseudonymize('octo','b')); }); });
