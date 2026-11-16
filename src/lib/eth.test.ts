import { describe, expect, it } from 'vitest'
import { add, cmp, format, mul, ratio, sub, totals } from './eth'

describe('eth', () => {
  it('adds without float error', () => {
    expect(add('0.1', '0.2')).toBe('0.3')
    expect(add('1.19', '0.016')).toBe('1.206')
  })
  it('multiplies by quantity', () => {
    expect(mul('1.19', 3)).toBe('3.57')
    expect(mul('0.000000000000000001', 2)).toBe('0.000000000000000002')
  })
  it('formats with fixed decimals, half up', () => {
    expect(format('1.205', 2)).toBe('1.21')
    expect(format('1.2', 3)).toBe('1.200')
    expect(format('0', 2)).toBe('0.00')
    expect(format('2.5', 0)).toBe('3')
  })
  it('totals a cart plus the network fee', () => {
    expect(totals([{ price: '1.19', qty: 2 }, { price: '0.39', qty: 1 }])).toEqual({ subtotal: '2.77', total: '2.786' })
  })
  it('computes ratios, differences and comparisons', () => {
    expect(ratio('1.19', 10, 100)).toBe('0.119')
    expect(ratio('0.001', 1, 3)).toBe('0.000333333333333333')
    expect(sub('1.206', '0.119')).toBe('1.087')
    expect(cmp('1.2', '1.19')).toBe(1)
    expect(cmp('1', '1.0')).toBe(0)
  })
  it('rejects malformed amounts', () => {
    expect(() => toWeiOf('abc')).toThrow()
    expect(() => toWeiOf('1.0000000000000000001')).toThrow()
  })
})
const toWeiOf = (v: string) => add(v, '0')
