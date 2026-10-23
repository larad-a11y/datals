import { describe, test, expect } from 'bun:test';
import { getNextInstallmentAmount, getRemainingAmount, type Sale } from '../src/types/business';

const magali: Sale = {
  id: 'test-magali', tunnelId: '', clientName: 'Magali Mercat',
  offerId: 'offer-magali-mercat-special', saleDate: '2026-09-08',
  paymentMethod: 'cb', trafficSource: 'ads', basePrice: 3200,
  totalPrice: 3200, numberOfPayments: 5, amountCollected: 1000,
  createdAt: '2026-09-08', paymentHistory: [],
};

describe('Magali special agreement', () => {
  test('deposit is 1000 euros', () => {
    expect(getNextInstallmentAmount({ ...magali, amountCollected: 0 })).toBe(1000);
  });
  test('four subsequent payments are 550 euros each', () => {
    for (const collected of [1000, 1550, 2100, 2650]) {
      expect(getNextInstallmentAmount({ ...magali, amountCollected: collected })).toBe(550);
    }
  });
  test('3200 euro contract has 2200 remaining after the deposit', () => {
    expect(getRemainingAmount(magali)).toBe(2200);
    expect(getRemainingAmount({ ...magali, amountCollected: 3200 })).toBe(0);
  });
});