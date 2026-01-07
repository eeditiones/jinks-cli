import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'
import { printBanner } from '../index.js'

describe('printBanner', () => {
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

  test('should print banner when quiet is false', () => {
    consoleLogCalls = []
    
    const options = { quiet: false }

    printBanner(options)

    assert.strictEqual(consoleLogCalls.length, 1)
    const output = consoleLogCalls[0][0]
    // Banner should contain "Jinks" text or be non-empty
    assert.ok(String(output).includes('Jinks') || String(output).length > 0)
  })

  test('should not print banner when quiet is true', () => {
    consoleLogCalls = []
    
    const options = { quiet: true }

    printBanner(options)

    assert.strictEqual(consoleLogCalls.length, 0)
  })

  test('should print banner when quiet option is undefined', () => {
    consoleLogCalls = []
    
    const options = {}

    printBanner(options)

    // Should print when quiet is falsy
    assert.strictEqual(consoleLogCalls.length, 1)
  })
})

