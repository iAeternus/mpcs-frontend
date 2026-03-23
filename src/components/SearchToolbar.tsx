import type { FC } from "react";
import { Select, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

interface SearchToolbarProps<T extends string = string> {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  searchPlaceholder?: string;
  sortValue?: T;
  onSortChange?: (value: T) => void;
  sortOptions?: Array<{ label: string; value: T }>;
  onRefresh?: () => void;
}

export const SearchToolbar: FC<SearchToolbarProps> = ({
  searchValue,
  onSearchChange,
  onSearch,
  searchPlaceholder = "搜索",
  sortValue,
  onSortChange,
  sortOptions,
  onRefresh,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)',
      backgroundColor: 'var(--color-surface-secondary)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border-default)',
    }}>
      <input
        type="text"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={searchPlaceholder}
        style={{
          flex: 1,
          minWidth: 180,
          maxWidth: 400,
          height: 36,
          padding: '0 12px',
          border: '1px solid var(--color-border-default)',
          borderRadius: 4,
          fontSize: 14,
          outline: 'none',
          backgroundColor: 'var(--color-surface-primary)',
          color: 'var(--color-text-primary)',
        }}
      />
      <Button 
        type="primary" 
        onClick={onSearch}
        style={{ height: 36, padding: '0 16px' }}
      >
        搜索
      </Button>
      {sortOptions && onSortChange && sortValue !== undefined && (
        <Select
          value={sortValue}
          onChange={onSortChange}
          style={{ width: 110, height: 36 }}
          options={sortOptions}
        />
      )}
      {onRefresh && (
        <Button 
          icon={<ReloadOutlined />} 
          onClick={onRefresh}
          style={{ height: 36 }}
        >
          刷新
        </Button>
      )}
    </div>
  );
};

export default SearchToolbar;