import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'
import { splitConfigurationsResponse } from '../index.js'

describe('splitConfigurationsResponse', () => {
  test('separates invalid-config entries from valid ones', () => {
    const { valid, invalid, parseError } = splitConfigurationsResponse([
      {
        type: 'installed',
        profile: 'p1',
        config: { pkg: { abbrev: 'app1' } },
      },
      {
        type: 'invalid-config',
        profile: 'bad',
        title: 'Invalid config.json',
        error: { message: 'parse error', path: '/x/config.json' },
        config: {},
      },
      {
        type: 'profile',
        profile: 'feat',
        config: { pkg: { abbrev: 'feat' }, type: 'feature' },
      },
    ])

    assert.strictEqual(parseError, null)
    assert.strictEqual(valid.length, 2)
    assert.strictEqual(invalid.length, 1)
    assert.strictEqual(invalid[0].profile, 'bad')
  })

  test('returns parseError when body is not an array', () => {
    const { valid, invalid, parseError } = splitConfigurationsResponse({ foo: 1 })
    assert.ok(parseError.includes('array'))
    assert.strictEqual(valid.length, 0)
    assert.strictEqual(invalid.length, 0)
  })
})
