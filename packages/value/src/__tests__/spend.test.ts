import { describe, expect, it } from 'vitest';
import { classifyCopilotBillingSku } from '../index.js';

describe('classifyCopilotBillingSku', () => {
  it('classifies seat SKUs separately from premium-request SKUs', () => {
    expect(classifyCopilotBillingSku('Copilot Enterprise')).toBe('seat');
    expect(classifyCopilotBillingSku('Copilot Business Seat')).toBe('seat');
    expect(classifyCopilotBillingSku('Premium request')).toBe('premium-request');
  });

  it('treats premium request wording as premium spend even when plan names are present', () => {
    expect(classifyCopilotBillingSku('Copilot Enterprise premium request')).toBe('premium-request');
  });
});
