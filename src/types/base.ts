/**
 * 全局基础实体定义
 * 所有业务模块（物料、产品、订单、仓储）应当通过集成/扩展此接口实现标准化
 */
export interface BaseEntity {
    /** 记录唯一标识 (UUID or Nanoid) */
    id: string;
    
    /** 业务状态机状态 */
    status: string;
    
    /** 逻辑删除标记 */
    isDeleted?: boolean;
    
    /** 乐观锁版本号 (用于技术防抖与并发控制) */
    _v?: number;
    
    /** 创建时间 (ISO 8601) */
    createdAt: string;
    
    /** 更新时间 (ISO 8601) */
    updatedAt: string;
    
    /** 创建人姓名/ID */
    createdBy?: string;
    
    /** 最后更新人姓名/ID */
    updatedBy?: string;
}

/**
 * 有限状态机配置接口
 */
export interface FSMConfig {
    /** 允许进行编辑的状态列表 */
    editableStatuses: string[];
    /** 允许进行逻辑删除的状态列表 */
    deletableStatuses: string[];
    /** 允许转换的目标状态映射 */
    transitions: Record<string, string[]>;
}
