import React from 'react';

const Label = ({ children, htmlFor, required = false, className = '', ...props }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-slate-700 mb-2 ${className}`} {...props}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

export default Label;
