import React from 'react';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StatusGuardProps {
    /** 当前实体的状态 */
    status: string;
    /** 允许编辑的状态列表 */
    allowedStatuses: string[];
    /** 要保护的子组件 */
    children: React.ReactNode;
    /** 是否显示锁定图标提示 */
    showLockIcon?: boolean;
    /** 锁定时的提示文字 */
    message?: string;
}

/**
 * 业务状态守卫组件
 * 根据实体的当前业务状态，自动锁定或禁用内部表单元素。
 * 这实现了 ERP 系统中“状态驱动”而非“版本驱动”的业务安全性。
 */
export function StatusGuard({
    status,
    allowedStatuses,
    children,
    showLockIcon = true,
    message = "当前业务状态下禁止修改核心数据"
}: StatusGuardProps) {
    const isLocked = !allowedStatuses.includes(status);

    if (!isLocked) {
        return <>{children}</>;
    }

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className="relative group cursor-not-allowed">
                        <div className="pointer-events-none opacity-60 filter grayscale-[0.5]">
                            {children}
                        </div>
                        {showLockIcon && (
                            <div className="absolute top-1 right-1 p-1 bg-destructive/10 rounded-full border border-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Lock className="size-3 text-destructive" />
                            </div>
                        )}
                        <div className="absolute inset-0 z-50 bg-transparent" />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-destructive text-destructive-foreground text-[10px] font-black uppercase">
                    {message} (Status: {status})
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
