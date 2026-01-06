import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { loadConfigFromFile } from '../index.js'

describe('loadConfigFromFile', () => {
  let testDir
  let testFile

  test.before(() => {
    // Set NODE_ENV to test to avoid process.exit
    process.env.NODE_ENV = 'test'
    testDir = join(tmpdir(), `jinks-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    testFile = join(testDir, 'config.json')
  })

  test.after(() => {
    try {
      if (testFile) unlinkSync(testFile)
      if (testDir) rmdirSync(testDir)
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  test('should load valid JSON configuration file', () => {
    const config = {
      pkg: { abbrev: 'test-app' },
      label: 'Test App',
      id: 'https://example.org/apps/test-app'
    }
    writeFileSync(testFile, JSON.stringify(config, null, 2), 'utf8')

    const result = loadConfigFromFile(testFile)

    assert.deepStrictEqual(result, config)
  })

  test('should throw error for non-existent file', () => {
    const nonExistentFile = join(testDir, 'nonexistent.json')

    assert.throws(
      () => loadConfigFromFile(nonExistentFile),
      /Error reading or parsing JSON file/
    )
  })

  test('should throw error for invalid JSON file', () => {
    writeFileSync(testFile, '{ invalid json }', 'utf8')

    assert.throws(
      () => loadConfigFromFile(testFile),
      /Error reading or parsing JSON file/
    )
  })

  test('should handle empty JSON object', () => {
    writeFileSync(testFile, '{}', 'utf8')

    const result = loadConfigFromFile(testFile)

    assert.deepStrictEqual(result, {})
  })

  test('should handle complex configuration', () => {
    const config = {
      pkg: { abbrev: 'complex-app' },
      label: 'Complex App',
      id: 'https://example.org/apps/complex-app',
      extends: ['base10', 'theme-base10', 'feature1'],
      overwrite: 'default'
    }
    writeFileSync(testFile, JSON.stringify(config, null, 2), 'utf8')

    const result = loadConfigFromFile(testFile)

    assert.deepStrictEqual(result, config)
    assert.strictEqual(result.extends.length, 3)
  })
})

