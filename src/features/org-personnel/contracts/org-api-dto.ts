export interface OrgNodeApiDTO {
  id: string
  name: string
  parentId?: string | null
  manager?: string
  description?: string
  type: 'company' | 'department' | 'team'
  children?: OrgNodeApiDTO[]
  createdAt?: string
  updatedAt?: string
  version?: number
}

export type OrgNodeSaveApiDTO = Omit<
  OrgNodeApiDTO,
  'id' | 'children' | 'createdAt' | 'updatedAt' | 'version'
> & {
  id?: string
  children?: OrgNodeSaveApiDTO[]
}
