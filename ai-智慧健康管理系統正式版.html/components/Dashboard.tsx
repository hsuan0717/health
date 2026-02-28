import React, { useState, useEffect, useRef } from 'react';
import { Responsive, Layout } from 'react-grid-layout';
import { WidgetConfig, WidgetType, DashboardLayout } from '../types';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  layout: DashboardLayout;
  onLayoutChange: (newLayout: DashboardLayout) => void;
  renderWidget: (type: WidgetType) => React.ReactNode;
  isEditMode: boolean;
  onAddWidget: (type: WidgetType) => void;
  onRemoveWidget: (id: string) => void;
}

const WIDGET_TYPES: { type: WidgetType; label: string; icon: string }[] = [
  { type: 'STEPS_CHART', label: '步數趨勢', icon: 'fa-person-walking' },
  { type: 'NUTRITION_PIE', label: '營養比例', icon: 'fa-carrot' },
  { type: 'SLEEP_BAR', label: '睡眠時數', icon: 'fa-bed' },
  { type: 'ADVICE_LIST', label: '健康建議', icon: 'fa-lightbulb' },
  { type: 'GAMIFICATION', label: '成就與挑戰', icon: 'fa-trophy' },
  { type: 'DAILY_SUMMARY', label: '今日概況', icon: 'fa-calendar-day' },
  { type: 'AI_REPORT', label: 'AI 週報摘要', icon: 'fa-robot' },
];

export const Dashboard: React.FC<DashboardProps> = ({
  layout,
  onLayoutChange,
  renderWidget,
  isEditMode,
  onAddWidget,
  onRemoveWidget,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLayoutChange = (currentLayout: Layout[]) => {
    const updatedWidgets = layout.widgets.map((widget) => {
      const layoutItem = currentLayout.find((item) => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        };
      }
      return widget;
    });

    onLayoutChange({
      ...layout,
      widgets: updatedWidgets,
    });
  };

  const gridLayouts = {
    lg: layout.widgets.map((w) => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: w.minW || 2,
      minH: w.minH || 2,
    })),
  };

  return (
    <div className="relative min-h-screen pb-20" ref={containerRef}>
      {isEditMode && (
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 mb-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800">自訂版面配置</h2>
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus size={18} />
                <span>新增小工具</span>
              </button>
              
              {showAddMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {WIDGET_TYPES.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => {
                        onAddWidget(item.type);
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                    >
                      <i className={cn("fa-solid", item.icon, "w-5 text-center text-primary")}></i>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 italic">拖曳標題欄可移動位置，拖曳右下角可調整大小</p>
        </div>
      )}

      <Responsive
        className="layout"
        layouts={gridLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        width={width}
        draggableHandle=".drag-handle"
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
        margin={[16, 16]}
      >
        {layout.widgets.map((widget) => (
          <div key={widget.id} className="group">
            <div className={cn(
              "h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow",
              isEditMode ? "ring-2 ring-primary/20 shadow-md" : "hover:shadow-md"
            )}>
              {/* Widget Header */}
              <div className={cn(
                "px-4 py-3 flex items-center justify-between border-b border-gray-50",
                isEditMode ? "bg-gray-50/50 cursor-move drag-handle" : ""
              )}>
                <div className="flex items-center gap-2 overflow-hidden">
                  {isEditMode && <GripVertical size={16} className="text-gray-400 shrink-0" />}
                  <h3 className="font-bold text-gray-700 truncate">{widget.title}</h3>
                </div>
                
                {isEditMode && (
                  <button
                    onClick={() => onRemoveWidget(widget.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="移除"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Widget Content */}
              <div className="flex-1 p-4 overflow-auto no-scrollbar">
                {renderWidget(widget.type)}
              </div>
            </div>
          </div>
        ))}
      </Responsive>

      {/* Empty State */}
      {layout.widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus size={40} />
          </div>
          <p className="text-lg">尚未添加任何小工具</p>
          <button
            onClick={() => setShowAddMenu(true)}
            className="mt-4 text-primary font-medium hover:underline"
          >
            立即開始自訂版面
          </button>
        </div>
      )}
    </div>
  );
};
