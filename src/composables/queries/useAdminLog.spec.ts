import { describe, it } from 'vitest'
// import { useAdminLog } from './useAdminLog' // will exist after plan 02
describe('useAdminLog', () => {
  it.todo('filters issue comments to only those matching /^✓ (Approved|Hidden|Deleted|Featured|Unfeatured) by @/')
  it.todo('excludes version comments starting with "## Version"')
  it.todo('date range filter: fromDate and toDate props narrow returned entries')
  it.todo('each log entry exposes: timestamp, action, promptTitle, maintainerLogin')
})
