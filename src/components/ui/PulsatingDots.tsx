import React from 'react';
import { motion } from 'framer-motion';

interface PulsatingDotsProps {
  className?: string;
  dotClassName?: string;
}

export default function PulsatingDots({ className = "flex items-center justify-center", dotClassName = "h-3 w-3 rounded-full bg-red-500" }: PulsatingDotsProps) {
  return (
    <div className={className}>
      <div className="flex space-x-2">
        <motion.div
          className={dotClassName}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
        <motion.div
          className={dotClassName}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: 0.3,
          }}
        />
        <motion.div
          className={dotClassName}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: 0.6,
          }}
        />
      </div>
    </div>
  );
}

export { PulsatingDots };
