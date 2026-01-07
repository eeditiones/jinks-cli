import { test, describe, mock } from 'node:test'
import { strict as assert } from 'node:assert'
import { showApplicationLink } from '../index.js'

describe('showApplicationLink', () => {
  let originalConsoleLog
  let consoleLogCalls

  test.before(() => {
    originalConsoleLog = console.log
    consoleLogCalls = []
    // Mock console.log to capture output
    console.log = (...args) => {
      consoleLogCalls.push(args)
    }
  })

  test.after(() => {
    console.log = originalConsoleLog
  })

  test('should generate correct application URL by replacing /jinks with app abbrev', () => {
    consoleLogCalls = []
    
    const config = {
      pkg: { abbrev: 'test-app' }
    }
    const serverUrl = 'http://localhost:8080/exist/apps/jinks'
    const action = 'created'

    showApplicationLink(config, serverUrl, action)

    // Verify console.log was called twice
    assert.strictEqual(consoleLogCalls.length, 2)
    
    // Check that the messages contain expected content
    const firstCall = String(consoleLogCalls[0][0])
    const secondCall = String(consoleLogCalls[1][0])
    
    assert.ok(firstCall.includes('Application created successfully!'))
    assert.ok(secondCall.includes('Access your application:'))
    // Verify the URL construction: /jinks should be replaced with /test-app
    // The baseUrl should be http://localhost:8080/exist/apps
    // The appUrl should be http://localhost:8080/exist/apps/test-app
    assert.ok(secondCall.includes('test-app'))
  })

  test('should handle different server URLs and replace /jinks correctly', () => {
    consoleLogCalls = []
    
    const config = {
      pkg: { abbrev: 'my-app' }
    }
    const serverUrl = 'https://example.com/exist/apps/jinks'
    const action = 'updated'

    showApplicationLink(config, serverUrl, action)

    assert.strictEqual(consoleLogCalls.length, 2)
    const firstCall = String(consoleLogCalls[0][0])
    const secondCall = String(consoleLogCalls[1][0])
    
    assert.ok(firstCall.includes('Application updated successfully!'))
    // Verify URL construction with different server
    assert.ok(secondCall.includes('my-app'))
    // The baseUrl should be https://example.com/exist/apps
    assert.ok(secondCall.includes('example.com'))
  })

  test('should use default action when not provided', () => {
    consoleLogCalls = []
    
    const config = {
      pkg: { abbrev: 'default-app' }
    }
    const serverUrl = 'http://localhost:8080/exist/apps/jinks'

    showApplicationLink(config, serverUrl)

    assert.strictEqual(consoleLogCalls.length, 2)
    const firstCall = consoleLogCalls[0][0]
    assert.ok(String(firstCall).includes('Application created successfully!'))
  })
})

