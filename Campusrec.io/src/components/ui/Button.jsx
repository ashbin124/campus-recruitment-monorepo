import { forwardRef } from 'react';

function cn(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

const variantClasses = {
  primary:
    'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm hover:-translate-y-0.5 hover:from-brand-700 hover:to-brand-800',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50',
  dark: 'bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-black',
  success: 'bg-emerald-600 text-white hover:-translate-y-0.5 hover:bg-emerald-700',
  danger: 'bg-red-600 text-white hover:-translate-y-0.5 hover:bg-red-700',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

const Button = forwardRef(function Button(
  {
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        isDisabled ? 'cursor-not-allowed opacity-60' : '',
        className
      )}
      {...props}
    >
      {loading && (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/60 border-t-white" />
      )}
      {children}
    </button>
  );
});

export default Button;
