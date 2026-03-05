import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getServiceTimeLabel(time: string): string {
  switch (time) {
    case 'FIRST': return '1부후';
    case 'SECOND': return '2부후';
    case 'BOTH': return '1·2부후';
    default: return time;
  }
}

export function getFamilyTypeLabel(type: string): string {
  return type === 'NEW' ? '신규' : '재등록';
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE': return '진행';
    case 'ON_HOLD': return '보류';
    case 'COMPLETED': return '완료';
    default: return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'ON_HOLD': return 'bg-red-100 text-red-700';
    case 'COMPLETED': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
