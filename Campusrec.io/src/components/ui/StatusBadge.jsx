function getStatusClasses(status) {
  const value = String(status || '').toUpperCase();

  if (value === 'ACTIVE') return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200';
  if (value === 'PENDING') return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200';
  if (value === 'INTERVIEW') return 'bg-blue-100 text-blue-900 ring-1 ring-blue-200';
  if (value === 'ACCEPTED' || value === 'APPROVED')
    return 'bg-teal-100 text-teal-900 ring-1 ring-teal-200';
  if (value === 'INACTIVE' || value === 'SUSPENDED')
    return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  if (value === 'REJECTED') return 'bg-red-100 text-red-900 ring-1 ring-red-200';

  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

export default function StatusBadge({ status, className = '' }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)} ${className}`}
    >
      {status || '-'}
    </span>
  );
}
