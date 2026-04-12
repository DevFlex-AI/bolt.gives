import { memo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface Development1FeaturePanelProps {
  data: any[];
  viewMode: 'grid' | 'list';
  selectedItems: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: () => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: any) => void;
  features: Record<string, Function>;
}

export const Development1FeaturePanel = memo(({
  data,
  viewMode,
  selectedItems,
  onSelectItem,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort,
  features,
}: Development1FeaturePanelProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  return (
    <div className={classNames(
      'gap-4',
      viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
    )}>
      {data.map((item, index) => (
        <motion.div
          key={item.id}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={classNames(
            'glass-card p-4 cursor-pointer transition-all',
            selectedItems.includes(item.id) && 'border-neural-500/50 shadow-[0_0_15px_rgba(0,255,65,0.2)]',
            expandedId === item.id && 'ring-2 ring-neural-500/30'
          )}
          onClick={() => onSelectItem(item.id)}
          onDoubleClick={() => toggleExpand(item.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => onSelectItem(item.id)}
                className="w-4 h-4 rounded border-white/20 bg-black/50"
              />
              <div>
                <h3 className="font-medium text-bolt-elements-textPrimary">{item.name}</h3>
                <span className={classNames(
                  'text-xs px-2 py-0.5 rounded-full',
                  item.status === 'active' ? 'bg-neural-500/20 text-neural-500' :
                  item.status === 'inactive' ? 'bg-bolt-elements-textTertiary/20 text-bolt-elements-textTertiary' :
                  'bg-yellow-500/20 text-yellow-500'
                )}>
                  {item.status}
                </span>
              </div>
            </div>
          </div>

          {expandedId === item.id && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="grid grid-cols-2 gap-2">
                
                <button
                  key="createButton"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.createButton?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  create Button
                </button>
                <button
                  key="readInput"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.readInput?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  read Input
                </button>
                <button
                  key="updateSelect"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.updateSelect?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  update Select
                </button>
                <button
                  key="deleteCheckbox"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.deleteCheckbox?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  delete Checkbox
                </button>
                <button
                  key="listRadio"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.listRadio?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  list Radio
                </button>
                <button
                  key="searchToggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.searchToggle?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  search Toggle
                </button>
                <button
                  key="filterSlider"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.filterSlider?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  filter Slider
                </button>
                <button
                  key="sortDatePicker"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.sortDatePicker?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  sort DatePicker
                </button>
                <button
                  key="exportTimePicker"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.exportTimePicker?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  export TimePicker
                </button>
                <button
                  key="importColorPicker"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.importColorPicker?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  import ColorPicker
                </button>
                <button
                  key="cloneFileUpload"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.cloneFileUpload?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  clone FileUpload
                </button>
                <button
                  key="duplicateImageCrop"
                  onClick={(e) => {
                    e.stopPropagation();
                    features.duplicateImageCrop?.(item);
                  }}
                  className="neural-btn neural-btn-secondary text-xs py-1"
                >
                  duplicate ImageCrop
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
});

Development1FeaturePanel.displayName = 'Development1FeaturePanel';
