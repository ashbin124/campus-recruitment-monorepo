import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

function valueByPath(item, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), item);
}

function toSortValue(value, column) {
  if (value == null) return null;
  if (column?.type === 'date') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'number') return value;
  return String(value).toLowerCase();
}

function getVisiblePageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, 5];
  if (currentPage >= totalPages - 2)
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

export default function DataTable({
  title,
  columns,
  data,
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No data available',
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20],
  defaultSort = null,
}) {
  const safePageSize = pageSizeOptions.includes(initialPageSize)
    ? initialPageSize
    : pageSizeOptions[0];
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(safePageSize);
  const [sort, setSort] = useState(defaultSort);

  const normalizedColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        sortable:
          column.sortable !== false &&
          !column.render &&
          column.key !== 'actions' &&
          column.key !== 'select',
      })),
    [columns]
  );

  const sortedData = useMemo(() => {
    if (!sort?.key || !sort?.direction) return data;

    const selectedColumn = normalizedColumns.find((column) => column.key === sort.key);
    const sortAccessor = selectedColumn?.sortAccessor;
    const sorted = [...data].sort((left, right) => {
      const rawLeft = sortAccessor ? sortAccessor(left) : valueByPath(left, sort.key);
      const rawRight = sortAccessor ? sortAccessor(right) : valueByPath(right, sort.key);
      const leftValue = toSortValue(rawLeft, selectedColumn);
      const rightValue = toSortValue(rawRight, selectedColumn);

      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return leftValue - rightValue;
      }

      return String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    return sort.direction === 'desc' ? sorted.reverse() : sorted;
  }, [data, sort, normalizedColumns]);

  const totalPages = Math.max(Math.ceil(sortedData.length / pageSize), 1);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!sort?.key) return;
    const exists = normalizedColumns.some((column) => column.key === sort.key);
    if (!exists) setSort(null);
  }, [normalizedColumns, sort]);

  const toggleSort = (column) => {
    if (!column.sortable) return;
    setCurrentPage(1);
    setSort((previous) => {
      if (!previous || previous.key !== column.key) {
        return { key: column.key, direction: 'asc' };
      }
      return { key: column.key, direction: previous.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const formatCell = (value, column, row) => {
    if (typeof column.render === 'function') {
      return column.render(value, row);
    }
    if (column.type === 'date') {
      return value ? format(new Date(value), 'MMM dd, yyyy') : '-';
    }
    if (column.type === 'status') {
      return <StatusBadge status={value} />;
    }
    if (value === 0 || value === false) return String(value);
    return value || '-';
  };

  const visiblePages = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-main text-lg font-semibold">{title}</h3>
        <label className="text-soft inline-flex items-center gap-2 text-xs">
          Rows
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setCurrentPage(1);
            }}
            className="select-field w-auto px-2 py-1 text-xs"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100/85">
            <tr>
              {normalizedColumns.map((column) => {
                const isSorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className="text-muted inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-left transition hover:border-slate-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                      >
                        <span>{column.title}</span>
                        <span
                          className={`text-[10px] ${isSorted ? 'text-brand-700' : 'text-slate-400'}`}
                        >
                          {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.title
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white/95">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr
                  key={item[keyField]}
                  className={
                    onRowClick
                      ? 'cursor-pointer transition hover:bg-brand-50/35 focus-within:bg-brand-50/35 focus-within:outline-none'
                      : ''
                  }
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {normalizedColumns.map((column) => (
                    <td
                      key={`${item[keyField]}-${column.key}`}
                      className="text-main whitespace-nowrap px-6 py-4 text-sm"
                    >
                      {formatCell(valueByPath(item, column.key), column, item)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={normalizedColumns.length}
                  className="text-soft px-6 py-8 text-center text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sortedData.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted text-sm">
            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(startIndex + pageSize, sortedData.length)}
            </span>{' '}
            of <span className="font-medium">{sortedData.length}</span> results
          </p>

          <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-l-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
                className={`border px-3 py-1.5 text-sm ${
                  currentPage === pageNumber
                    ? 'z-10 border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-r-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
