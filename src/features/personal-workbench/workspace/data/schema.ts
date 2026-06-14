export type PersonalWorkspaceItemType = 'note' | 'link'

interface PersonalWorkspaceItemBase {
  id: string
  ownerAccountNo?: string
  ownerUserId?: string
  type: PersonalWorkspaceItemType
  createdAt: string
  updatedAt: string
}

export interface PersonalWorkspaceNoteItem extends PersonalWorkspaceItemBase {
  type: 'note'
  title: string
  content: string
}

export interface PersonalWorkspaceLinkItem extends PersonalWorkspaceItemBase {
  type: 'link'
  title: string
  url: string
  remark: string
}

export type PersonalWorkspaceItem =
  | PersonalWorkspaceNoteItem
  | PersonalWorkspaceLinkItem

export interface PersonalWorkspaceItemDraft {
  title: string
  content?: string
  remark?: string
  type: PersonalWorkspaceItemType
  url?: string
}
