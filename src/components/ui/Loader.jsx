import React from 'react';
import { motion } from 'framer-motion';

// Beautiful loader component with multiple variants
export const Loader = ({ variant = 'spinner', size = 'md', text = '', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  // Spinner variant - Modern gradient spinner
  if (variant === 'spinner') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className="relative">
          <motion.div
            className={`${sizeClasses[size]} rounded-full border-4 border-slate-200`}
            style={{
              borderTopColor: '#10b981',
              borderRightColor: '#059669',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(16, 185, 129, 0.1))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        {text && (
          <motion.p
            className="text-sm font-medium text-slate-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Dots variant - Bouncing dots
  if (variant === 'dots') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className="flex gap-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={`${dotSizes[size]} rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600`}
              animate={{
                y: [-10, 10, -10],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: index * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        {text && (
          <motion.p
            className="text-sm font-medium text-slate-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Pulse variant - Pulsing circle
  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className="relative flex items-center justify-center">
          <motion.div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className={`absolute ${sizeClasses[size]} rounded-full border-4 border-emerald-500`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
        {text && (
          <motion.p
            className="text-sm font-medium text-slate-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Bars variant - Dancing bars
  if (variant === 'bars') {
    const barHeights = size === 'sm' ? 'h-6' : size === 'md' ? 'h-8' : size === 'lg' ? 'h-10' : 'h-12';
    
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className="flex items-end gap-1">
          {[0, 1, 2, 3, 4].map((index) => (
            <motion.div
              key={index}
              className={`w-1.5 ${barHeights} bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full`}
              animate={{
                scaleY: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.1,
                ease: 'easeInOut',
              }}
              style={{ originY: 1 }}
            />
          ))}
        </div>
        {text && (
          <motion.p
            className="text-sm font-medium text-slate-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Ring variant - Rotating rings
  if (variant === 'ring') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className="relative">
          <motion.div
            className={`${sizeClasses[size]} rounded-full border-4 border-transparent border-t-emerald-500 border-r-emerald-400`}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className={`absolute inset-2 rounded-full border-4 border-transparent border-b-blue-500 border-l-blue-400`}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        {text && (
          <motion.p
            className="text-sm font-medium text-slate-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  return null;
};

// Full page loader overlay
export const PageLoader = ({ text = 'Loading...', variant = 'spinner', backdrop = true }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        backdrop ? 'bg-white/80 backdrop-blur-sm' : ''
      }`}
    >
      <div className="text-center">
        <Loader variant={variant} size="lg" text={text} />
      </div>
    </div>
  );
};

// Inline loader for components
export const InlineLoader = ({ text = '', variant = 'spinner', size = 'md', className = '' }) => {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <Loader variant={variant} size={size} text={text} />
    </div>
  );
};

// DataGrid custom loading overlay
export const DataGridLoader = ({ text = 'Loading data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white/95">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-6 p-8"
      >
        {/* Animated logo/icon */}
        <div className="relative">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 flex items-center justify-center"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(16, 185, 129, 0.4)',
                '0 0 0 20px rgba(16, 185, 129, 0)',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          >
            <motion.div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </div>

        {/* Animated dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600"
              animate={{
                y: [-8, 8, -8],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-base font-semibold text-slate-700 mb-1">{text}</p>
          <p className="text-sm text-slate-500">Please wait a moment</p>
        </motion.div>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default Loader;
