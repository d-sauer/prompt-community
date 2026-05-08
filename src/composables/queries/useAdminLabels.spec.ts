import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAdminLabels, validateLabel } from './useAdminLabels'

vi.mock('@/lib/api/admin', () => ({
  createLabel: vi.fn().mockResolvedValue({
    id: '01HLABEL001',
    prefix: 'category',
    value: 'test',
    color: 'abc123',
    description: null,
  }),
  updateLabel: vi.fn().mockResolvedValue({
    id: '01HLABEL001',
    prefix: 'category',
    value: 'updated',
    color: 'abc123',
    description: null,
  }),
  deleteLabel: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/api/queries', () => ({
  getLabels: vi.fn().mockResolvedValue({
    category: [
      { name: 'category:writing', color: 'abc123' },
      { name: 'category:coding', color: 'def456' },
    ],
    status: [{ name: 'status:featured', color: '22c55e' }],
    flag: [{ name: 'flag:review', color: 'e11d48' }],
  }),
}))

import * as adminApi from '@/lib/api/admin'

const mockCreateLabel = vi.mocked(adminApi.createLabel)
const mockUpdateLabel = vi.mocked(adminApi.updateLabel)
const mockDeleteLabel = vi.mocked(adminApi.deleteLabel)

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminLabels> | undefined

  mount(
    {
      setup() {
        composable = useAdminLabels()
        return {}
      },
      template: '<div />',
    },
    {
      global: {
        plugins: [
          [VueQueryPlugin, { queryClient }],
          createTestingPinia({ createSpy: vi.fn, stubActions: false }),
        ],
      },
    },
  )

  return { queryClient, composable: composable! }
}

describe('useAdminLabels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchLabels returns labels grouped by namespace prefix', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      const groups = composable.groupedLabels.value
      expect(Object.keys(groups)).toContain('category')
      expect(Object.keys(groups)).toContain('status')
      expect(Object.keys(groups)).toContain('flag')
      expect(groups['category'].length).toBe(2)
    })
  })

  it('validateLabel rejects names not matching ^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$ pattern', () => {
    expect(validateLabel('invalid')).not.toBeNull()
    expect(validateLabel('Invalid:value')).not.toBeNull()
    expect(validateLabel('ns:Value')).not.toBeNull()
    expect(validateLabel('')).not.toBeNull()
    expect(validateLabel('no-colon')).not.toBeNull()
    expect(validateLabel(':value')).not.toBeNull()
    expect(validateLabel('ns:')).not.toBeNull()
  })

  it('validateLabel accepts valid namespace:value labels', () => {
    expect(validateLabel('category:writing')).toBeNull()
    expect(validateLabel('status:featured')).toBeNull()
    expect(validateLabel('flag:review')).toBeNull()
    expect(validateLabel('my-ns:my-value')).toBeNull()
    expect(validateLabel('ns:value123')).toBeNull()
  })

  it('createLabel blocks save and returns inline error if validation fails', async () => {
    const { composable } = setupTest()

    await expect(
      composable.createLabelMutation.mutateAsync({ prefix: 'invalid', value: '' }),
    ).rejects.toThrow()

    expect(mockCreateLabel).not.toHaveBeenCalled()
    expect(composable.labelError.value).not.toBeNull()
  })

  it('createLabel calls createLabel API with prefix and value fields', async () => {
    const { composable } = setupTest()

    await composable.createLabelMutation.mutateAsync({
      prefix: 'category',
      value: 'test',
      color: 'abc123',
      description: 'Test label',
    })

    expect(mockCreateLabel).toHaveBeenCalledWith({
      prefix: 'category',
      value: 'test',
      color: 'abc123',
      description: 'Test label',
    })
  })

  it('updateLabel calls updateLabel API with id and update fields', async () => {
    const { composable } = setupTest()

    await composable.updateLabelMutation.mutateAsync({
      id: '01HLABEL001',
      prefix: 'category',
      value: 'updated',
      color: 'abc123',
      description: 'Updated',
    })

    expect(mockUpdateLabel).toHaveBeenCalledWith('01HLABEL001', {
      prefix: 'category',
      value: 'updated',
      color: 'abc123',
      description: 'Updated',
    })
  })

  it('deleteLabel calls deleteLabel API with id', async () => {
    const { composable } = setupTest()

    await composable.deleteLabelMutation.mutateAsync('01HLABEL001')

    expect(mockDeleteLabel).toHaveBeenCalledWith('01HLABEL001')
  })
})
