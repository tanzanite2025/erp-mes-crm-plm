export type MoldDrawingTypeApiDTO = '2D' | '3D' | 'TECH_SPEC' | 'OTHER'

export type MoldDrawingStatusApiDTO = 'ACTIVE' | 'DRAFT' | 'OBSOLETE'

export interface MoldDrawingApiDTO {
  id: string
  moldId?: string
  moldSn?: string
  name: string
  type: MoldDrawingTypeApiDTO
  fileUrl: string
  version: string
  sysVersion: number
  status: MoldDrawingStatusApiDTO
  uploadedAt: string
  remarks?: string
  createdAt?: string
  updatedAt?: string
}

export interface MoldDrawingLogApiDTO {
  id: string
  drawingId: string
  action: 'CREATED' | 'BIND' | 'UNBIND' | 'STATUS_CHANGE' | 'VERSION_UPDATE'
  details: string
  operator: string
  timestamp: string
}

export interface SaveMoldDrawingApiDTO {
  id?: string
  moldId?: string
  moldSn?: string
  name: string
  type: MoldDrawingTypeApiDTO
  fileUrl: string
  version: string
  status: MoldDrawingStatusApiDTO
  uploadedAt?: string
  remarks?: string
}

export interface DeleteDrawingAckApiDTO {
  status: string
}
