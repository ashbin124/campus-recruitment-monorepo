const toneClassMap = {
  success: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50/90 text-amber-900',
  error: 'border-red-200 bg-red-50/90 text-red-900',
  info: 'border-blue-200 bg-blue-50/90 text-blue-900',
};

export default function InlineAlert({ message, tone = 'info', className = '' }) {
  if (!message) return null;

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${toneClassMap[tone] || toneClassMap.info} ${className}`.trim()}
    >
      {message}
    </div>
  );
}
