import React from 'react';
import { cn } from 'utils';

const Input = React.forwardRef(({ className = '', type = 'text', error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100 disabled:cursor-not-allowed',
        error && 'border-red-500 focus:border-red-600 focus:ring-red-200',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
