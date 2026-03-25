import { describe, it } from 'vitest'
// import { useAdminActions } from './useAdminActions' // will exist after plan 02
describe('useAdminActions', () => {
  it.todo('approve: calls removeLabelFromIssue(flag:review) then postModerationComment(Approved)')
  it.todo('hide: calls addLabelToIssue(status:hidden) then postModerationComment(Hidden)')
  it.todo('delete: calls deleteIssueGraphQL with nodeId (not issue number)')
  it.todo('feature: calls addLabelToIssue(status:featured); unfeature removes it')
  it.todo('bulk approve: iterates over all selected issue numbers sequentially')
  it.todo('bulk delete: accepts array of nodeIds and deletes each')
  it.todo('each action invalidates admin queue query cache on success')
})
