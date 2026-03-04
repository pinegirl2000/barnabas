import { useRef } from 'react';

interface DateInputProps {
  value: string; // YYYY/MM/DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function toSlash(v: string) {
  return v.replace(/-/g, '/');
}
function toDash(v: string) {
  return v.replace(/\//g, '-');
}

export default function DateInput({ value, onChange, placeholder = 'YYYY/MM/DD', className = '' }: DateInputProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (raw: string) => {
    // 숫자와 슬래시만 허용
    const cleaned = raw.replace(/[^0-9/]/g, '');
    // 자동 슬래시 삽입
    let v = cleaned.replace(/\//g, '');
    if (v.length > 4) v = v.slice(0, 4) + '/' + v.slice(4);
    if (v.length > 7) v = v.slice(0, 7) + '/' + v.slice(7);
    if (v.length > 10) v = v.slice(0, 10);
    onChange(v);
  };

  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(toSlash(e.target.value));
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        value={value}
        onChange={e => handleTextChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm pr-7"
      />
      <button
        type="button"
        onClick={() => hiddenRef.current?.showPicker()}
        className="absolute right-1.5 text-gray-400 hover:text-gray-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
      <input
        ref={hiddenRef}
        type="date"
        value={toDash(value)}
        onChange={handleCalendarChange}
        className="absolute inset-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}
