const toneClassMap = {
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
  info: 'alert-info',
};

export default function InlineAlert({ message, tone = 'info', className = '' }) {
  if (!message) return null;

  return (
    <div className={`inline-alert ${toneClassMap[tone] || toneClassMap.info} ${className}`.trim()}>
      {message}
    </div>
  );
}
