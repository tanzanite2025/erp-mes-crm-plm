import React from 'react';
import { format } from 'date-fns';
import { 
  History, 
  User, 
  Clock, 
  ArrowRight, 
  Minus, 
  Plus, 
  Hash,
} from 'lucide-react';
import { useAuditTimeline } from '../hooks/use-audit-timeline';
import { type AuditModuleValue } from '../data/audit-modules';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataTimelineProps {
  module: AuditModuleValue;
  targetId?: string;
  targetName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DataTimeline: React.FC<DataTimelineProps> = ({
  module,
  targetId,
  targetName,
  open,
  onOpenChange,
}) => {
  const { data: logs, isLoading } = useAuditTimeline(module, targetId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[72vh] w-full gap-0 rounded-t-[32px] border-t border-dashed border-primary/20 p-0 pt-0 shadow-2xl bg-background/95 backdrop-blur-sm">
        {/* Header - UDS 1.0 Style */}
        <SheetHeader className="p-6 pb-4 border-b border-dashed bg-muted/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-black tracking-tighter italic uppercase">
                Data Timeline
              </SheetTitle>
              <SheetDescription className="text-[9px] font-black uppercase tracking-widest opacity-60">
                {targetId
                  ? `Full-field audit history for ${targetName || targetId}`
                  : `Module-level audit history for ${targetName || module}`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Loading Engine...</span>
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20 border border-dashed rounded-[32px]">
                <Hash className="w-8 h-8" />
                <span className="text-[10px] font-black uppercase tracking-widest">No Records Found</span>
              </div>
            ) : (
              <div className="relative border-l border-dashed border-muted-foreground/30 ml-3 pl-8 space-y-12">
                {logs.map((log) => (
                  <div key={log.id} className="relative group">
                    {/* Timeline Node */}
                    <div className="absolute -left-[37px] top-0 w-4 h-4 rounded-full border-2 border-background bg-muted-foreground/20 group-hover:bg-primary transition-colors" />
                    
                    {/* Log Meta */}
                    <div className="flex flex-col gap-1 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black italic tracking-tighter uppercase text-primary">
                          {log.action}
                        </span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-full">
                          <User className="w-2.5 h-2.5 opacity-50" />
                          <span className="text-[8px] font-mono font-bold uppercase">{log.operator}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-50">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="text-[8px] font-mono">
                          {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                        <span className="text-[8px] font-mono opacity-50">IP: {log.ip}</span>
                      </div>
                    </div>

                    {/* Diff Cards */}
                    <div className="space-y-3">
                      {log.diff?.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="rounded-2xl border border-dashed bg-muted/5 overflow-hidden"
                        >
                          <div className="px-3 py-1.5 bg-muted/20 border-b border-dashed flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
                              {item.a || item.f}
                            </span>
                            <span className="text-[7px] font-mono opacity-30 uppercase">{item.f}</span>
                          </div>
                          <div className="p-3 grid grid-cols-[1fr,auto,1fr] items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Before</span>
                              <div className="text-[10px] font-mono p-2 rounded-xl bg-destructive/5 text-destructive border border-destructive/10 break-all">
                                <Minus className="w-2 h-2 inline mr-1" />
                                {String(item.o)}
                              </div>
                            </div>
                            <ArrowRight className="w-3 h-3 opacity-20" />
                            <div className="flex flex-col gap-1">
                              <span className="text-[7px] font-black uppercase tracking-widest opacity-40">After</span>
                              <div className="text-[10px] font-mono p-2 rounded-xl bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 break-all">
                                <Plus className="w-2 h-2 inline mr-1" />
                                {String(item.n)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - UDS 1.0 */}
        <div className="p-6 border-t border-dashed bg-muted/5">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono opacity-40 uppercase">Archival Policy: 30D Hot / JSON Cold</span>
            <div className="flex gap-2">
               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Engine Active</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
