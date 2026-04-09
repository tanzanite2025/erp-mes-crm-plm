import type { OrgNode } from '../data/org-schema'
import type { OrgLinkedArchitectureApiDTO, OrgNodeApiDTO } from '../contracts/org-api-dto'

function toLinkedArchitectureContract(items?: OrgLinkedArchitectureApiDTO[] | null): OrgNode['linkedArchitecture'] {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined
  }

  return items.map((item) => ({
    type: item.type,
    id: item.id,
    name: item.name,
  }))
}

export function toOrgNodeContract(dto: OrgNodeApiDTO): OrgNode {
  return {
    id: dto.id,
    name: dto.name,
    parentId: dto.parentId ?? undefined,
    manager: dto.manager?.trim() || undefined,
    description: dto.description?.trim() || undefined,
    type: dto.type,
    linkedArchitecture: toLinkedArchitectureContract(dto.linkedArchitecture),
    children: Array.isArray(dto.children) ? dto.children.map(toOrgNodeContract) : undefined,
    version: dto.version ?? 1,
  }
}

export function toOrgNodeApiDTO(contract: OrgNode): OrgNodeApiDTO {
  return {
    id: contract.id || '',
    name: contract.name,
    parentId: contract.parentId ?? null,
    manager: contract.manager?.trim() || undefined,
    description: contract.description?.trim() || undefined,
    type: contract.type,
    linkedArchitecture: contract.linkedArchitecture?.map((item) => ({
      type: item.type,
      id: item.id,
      name: item.name,
    })),
    children: contract.children?.map(toOrgNodeApiDTO),
    version: contract.version,
  }
}

export function toOrgNodeContracts(dtos: OrgNodeApiDTO[]): OrgNode[] {
  return dtos.map(toOrgNodeContract)
}
