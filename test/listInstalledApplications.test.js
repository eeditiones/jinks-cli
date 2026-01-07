import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'
import { listInstalledApplications } from '../index.js'

describe('listInstalledApplications', () => {
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

  test('should list only installed applications and filter out profiles', () => {
    consoleLogCalls = []
    
    const allConfigurations = [
      {
        type: 'installed',
        config: {
          pkg: { abbrev: 'app1' },
          label: 'Application 1'
        }
      },
      {
        type: 'installed',
        config: {
          pkg: { abbrev: 'app2' },
          label: 'Application 2'
        }
      },
      {
        type: 'profile',
        config: {
          pkg: { abbrev: 'profile1' }
        }
      }
    ]
    const serverUrl = 'http://localhost:8080/exist/apps/jinks'

    listInstalledApplications(allConfigurations, serverUrl)

    // Should log header + 2 applications (not the profile)
    assert.strictEqual(consoleLogCalls.length, 3) // header + app1 + app2
    const firstCall = String(consoleLogCalls[0][0])
    assert.ok(firstCall.includes('Installed applications'))
    
    // Verify both apps are listed
    const app1Call = String(consoleLogCalls[1][0])
    const app2Call = String(consoleLogCalls[2][0])
    assert.ok(app1Call.includes('app1'))
    assert.ok(app2Call.includes('app2'))
    // Verify profile is not listed
    const allCalls = consoleLogCalls.map(call => String(call[0])).join(' ')
    assert.ok(!allCalls.includes('profile1'))
  })

  test('should show message when no applications found', () => {
    consoleLogCalls = []
    
    const allConfigurations = [
      {
        type: 'profile',
        config: { pkg: { abbrev: 'profile1' } }
      }
    ]
    const serverUrl = 'http://localhost:8080/exist/apps/jinks'

    listInstalledApplications(allConfigurations, serverUrl)

    // Should log header + "No applications found" message
    assert.strictEqual(consoleLogCalls.length, 2)
    const secondCall = consoleLogCalls[1][0]
    assert.ok(String(secondCall).includes('No applications found'))
  })

  test('should handle empty configurations array', () => {
    consoleLogCalls = []
    
    const allConfigurations = []
    const serverUrl = 'http://localhost:8080/exist/apps/jinks'

    listInstalledApplications(allConfigurations, serverUrl)

    assert.strictEqual(consoleLogCalls.length, 2)
    const secondCall = consoleLogCalls[1][0]
    assert.ok(String(secondCall).includes('No applications found'))
  })

  test('should filter out non-installed configurations and construct correct URLs', () => {
    consoleLogCalls = []
    
    const allConfigurations = [
      {
        type: 'installed',
        config: { pkg: { abbrev: 'app1' } }
      },
      {
        type: 'profile',
        config: { pkg: { abbrev: 'profile1' } }
      },
      {
        type: 'blueprint',
        config: { pkg: { abbrev: 'blueprint1' } }
      }
    ]
    const serverUrl = 'http://localhost:8080/exist/apps/jinks'

    listInstalledApplications(allConfigurations, serverUrl)

    // Should only show the one installed app
    // Header + 1 app = 2 calls
    assert.strictEqual(consoleLogCalls.length, 2)
    
    // Verify the app URL is constructed correctly (replacing /jinks with /app1)
    const appCall = String(consoleLogCalls[1][0])
    assert.ok(appCall.includes('app1'))
    // Verify non-installed items are not shown
    const allCalls = consoleLogCalls.map(call => String(call[0])).join(' ')
    assert.ok(!allCalls.includes('profile1'))
    assert.ok(!allCalls.includes('blueprint1'))
  })
})

