import type { OrgNodeApiDTO, OrgNodeSaveApiDTO } from '../contracts/org-api-dto'
import type { OrgNode } from '../data/org-schema'

export function toOrgNodeContract(dto: OrgNodeApiDTO): OrgNode {
  return {
    id: dto.id,
    name: dto.name,
    parentId: dto.parentId ?? undefined,
    manager: dto.manager?.trim() || undefined,
    description: dto.description?.trim() || undefined,
    type: dto.type,
    children: Array.isArray(dto.children)
      ? dto.children.map(toOrgNodeContract)
      : undefined,
    version: dto.version ?? 1,
  }
}

export function toOrgNodeSaveApiDTO(contract: OrgNode): OrgNodeSaveApiDTO {
  const dto: OrgNodeSaveApiDTO = {
    name: contract.name,
    parentId: contract.parentId ?? null,
    manager: contract.manager?.trim() || undefined,
    description: contract.description?.trim() || undefined,
    type: contract.type,
  }

  const normalizedID = contract.id?.trim()
  if (normalizedID) {
    dto.id = normalizedID
  }

  if (contract.children && contract.children.length > 0) {
    dto.children = contract.children.map(toOrgNodeSaveApiDTO)
  }

  return dto
}

export function toOrgNodeContracts(dtos: OrgNodeApiDTO[]): OrgNode[] {
  return dtos.map(toOrgNodeContract)
}
