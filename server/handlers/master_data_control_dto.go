package handlers

import (
	"xdfc-server/dto"
	"xdfc-server/models"
)

// MasterDataControlDTO 是 dto.MasterDataControlDTO 的类型别名，保持 handlers 包内引用不变。
type MasterDataControlDTO = dto.MasterDataControlDTO

// MapMasterDataControlToDTO 将 model 层的 MasterDataControl 转换为嵌套 DTO。
func MapMasterDataControlToDTO(mdc models.MasterDataControl) *MasterDataControlDTO {
	return dto.MapMasterDataControl(mdc)
}
