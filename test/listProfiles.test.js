import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'
import { listProfiles } from '../index.js'

describe('listProfiles', () => {
  let originalConsoleLog
  let consoleLogCalls

  test.before(() => {
    originalConsoleLog = console.log
    consoleLogCalls = []
    console.log = (...args) => {
      consoleLogCalls.push(args)
    }
  })

  test.after(() => {
    console.log = originalConsoleLog
  })

  test('lists profiles as a table with name, category, label and description, sorted by category then name', () => {
    consoleLogCalls = []

    const allConfigurations = [
      {
        type: 'installed',
        config: { pkg: { abbrev: 'app1' }, label: 'Application 1' },
      },
      {
        type: 'profile',
        profile: 'base10',
        description: 'A base blueprint',
        config: { label: 'Base 10', type: 'blueprint' },
      },
      {
        type: 'profile',
        profile: 'zzz-feature',
        description: 'Last feature alphabetically',
        config: { label: 'ZZZ Feature', type: 'feature' },
      },
      {
        type: 'profile',
        profile: 'annotations',
        description: 'Adds annotation support',
        config: { label: 'Annotations', type: 'feature' },
      },
    ]

    listProfiles(allConfigurations)

    const allText = consoleLogCalls.map((call) => String(call[0])).join('\n')
    assert.ok(allText.includes('Available profiles'))
    assert.ok(allText.includes('Category'))
    assert.ok(allText.includes('base10'))
    assert.ok(allText.includes('blueprint'))
    assert.ok(allText.includes('Base 10'))
    assert.ok(allText.includes('A base blueprint'))
    assert.ok(allText.includes('annotations'))
    assert.ok(allText.includes('feature'))
    assert.ok(allText.includes('Annotations'))
    assert.ok(allText.includes('Adds annotation support'))
    // sorted by category first ('blueprint' < 'feature'), then by name within a category
    assert.ok(allText.indexOf('base10') < allText.indexOf('annotations'))
    assert.ok(allText.indexOf('annotations') < allText.indexOf('zzz-feature'))
    // the installed application is not listed
    assert.ok(!allText.includes('app1'))
  })

  test('omits profiles with category "disabled"', () => {
    consoleLogCalls = []

    const allConfigurations = [
      {
        type: 'profile',
        profile: 'base10',
        description: 'A base blueprint',
        config: { label: 'Base 10', type: 'blueprint' },
      },
      {
        type: 'profile',
        profile: 'old-theme',
        description: 'No longer maintained',
        config: { label: 'Old Theme', type: 'disabled' },
      },
    ]

    listProfiles(allConfigurations)

    const allText = consoleLogCalls.map((call) => String(call[0])).join('\n')
    assert.ok(allText.includes('base10'))
    assert.ok(!allText.includes('old-theme'))
    assert.ok(!allText.includes('Old Theme'))
  })

  test('shows "No profiles found" when only disabled profiles exist', () => {
    consoleLogCalls = []

    listProfiles([
      {
        type: 'profile',
        profile: 'old-theme',
        config: { label: 'Old Theme', type: 'disabled' },
      },
    ])

    assert.strictEqual(consoleLogCalls.length, 1)
    assert.ok(String(consoleLogCalls[0][0]).includes('No profiles found'))
  })

  test('shows a message when no profiles are found', () => {
    consoleLogCalls = []

    listProfiles([{ type: 'installed', config: { pkg: { abbrev: 'app1' } } }])

    assert.strictEqual(consoleLogCalls.length, 1)
    assert.ok(String(consoleLogCalls[0][0]).includes('No profiles found'))
  })

  test('handles an empty configurations array', () => {
    consoleLogCalls = []

    listProfiles([])

    assert.strictEqual(consoleLogCalls.length, 1)
    assert.ok(String(consoleLogCalls[0][0]).includes('No profiles found'))
  })
})
