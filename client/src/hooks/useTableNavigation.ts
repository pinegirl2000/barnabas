import { useRef, useEffect, useCallback } from 'react';

export type ColumnKey =
  | 'name' | 'relation' | 'birthDate' | 'phone' | 'position'
  | 'baptized' | 'baptismYear' | 'previousChurch' | 'livingInSG'
  | 'attending' | 'memo';

type CellInputType = 'text' | 'select' | 'radio';

interface ColumnDef {
  key: ColumnKey;
  inputType: CellInputType;
}

function getVisibleColumns(isSingle: boolean): ColumnDef[] {
  const cols: ColumnDef[] = [
    { key: 'name', inputType: 'text' },
  ];
  if (!isSingle) {
    cols.push({ key: 'relation', inputType: 'select' });
  }
  cols.push(
    { key: 'birthDate', inputType: 'text' },
    { key: 'phone', inputType: 'text' },
    { key: 'position', inputType: 'select' },
    { key: 'baptized', inputType: 'radio' },
    { key: 'baptismYear', inputType: 'select' },
    { key: 'previousChurch', inputType: 'text' },
    { key: 'livingInSG', inputType: 'radio' },
  );
  if (!isSingle) {
    cols.push({ key: 'attending', inputType: 'radio' });
  }
  cols.push({ key: 'memo', inputType: 'text' });
  return cols;
}

function findCell(container: HTMLElement, row: number, colKey: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    `[data-cell-row="${row}"][data-cell-col="${colKey}"]`
  );
}

function findNextNavigableCell(
  container: HTMLElement,
  startRow: number,
  startColIndex: number,
  direction: 'left' | 'right',
  columns: ColumnDef[],
  rowCount: number
): HTMLElement | null {
  const step = direction === 'right' ? 1 : -1;
  let r = startRow;
  let c = startColIndex + step;

  const maxAttempts = columns.length * rowCount;
  for (let i = 0; i < maxAttempts; i++) {
    if (c < 0) { r--; c = columns.length - 1; }
    else if (c >= columns.length) { r++; c = 0; }
    if (r < 0 || r >= rowCount) return null;

    const el = findCell(container, r, columns[c].key);
    if (el && !(el as HTMLInputElement | HTMLSelectElement).disabled) {
      return el;
    }
    c += step;
  }
  return null;
}

export function useTableNavigation(isSingle: boolean, rowCount: number) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // IME 조합 중 무시
    if (e.isComposing || e.keyCode === 229) return;

    const key = e.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;

    const target = e.target as HTMLElement;
    const rowStr = target.getAttribute('data-cell-row');
    const colStr = target.getAttribute('data-cell-col');
    if (rowStr === null || colStr === null) return;

    const row = parseInt(rowStr);
    const columns = getVisibleColumns(isSingle);
    const colIndex = columns.findIndex(c => c.key === colStr);
    if (colIndex === -1) return;

    const cellDef = columns[colIndex];
    const container = tbodyRef.current;
    if (!container) return;

    // Up/Down: 행 간 이동
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const nextRow = key === 'ArrowUp' ? row - 1 : row + 1;
      if (nextRow < 0 || nextRow >= rowCount) return;
      e.preventDefault();
      const nextCell = findCell(container, nextRow, colStr);
      if (nextCell) nextCell.focus();
      return;
    }

    // Left/Right: 셀 간 이동
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const isLeft = key === 'ArrowLeft';

      // text input: 커서 위치 확인
      if (cellDef.inputType === 'text' && target instanceof HTMLInputElement) {
        const { selectionStart, selectionEnd, value } = target;
        const hasSelection = selectionStart !== selectionEnd;
        if (hasSelection) return;
        if (isLeft && selectionStart !== 0) return;
        if (!isLeft && selectionStart !== value.length) return;
      }

      e.preventDefault();
      const direction = isLeft ? 'left' : 'right';
      const nextCell = findNextNavigableCell(container, row, colIndex, direction, columns, rowCount);
      if (nextCell) nextCell.focus();
    }
  }, [isSingle, rowCount]);

  // 안정적인 리스너 (ref로 최신 핸들러 유지)
  const handlerRef = useRef(handleKeyDown);
  handlerRef.current = handleKeyDown;

  useEffect(() => {
    const tbody = tbodyRef.current;
    if (!tbody) return;
    const listener = (e: KeyboardEvent) => handlerRef.current(e);
    tbody.addEventListener('keydown', listener);
    return () => tbody.removeEventListener('keydown', listener);
  }, [rowCount]);

  const cellProps = (row: number, colKey: ColumnKey) => ({
    'data-cell-row': row,
    'data-cell-col': colKey,
  });

  return { tbodyRef, cellProps };
}
