import React from 'react';

export const AmbientBackground: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      {/* Layer 1: Ambient Floating Liquid Color Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-blue-500/15 dark:bg-blue-600/18 blur-[130px] pointer-events-none ambient-orb-1" />
      <div className="absolute top-[35%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/12 dark:bg-cyan-500/14 blur-[140px] pointer-events-none ambient-orb-2" />
      <div className="absolute bottom-[-15%] left-[20%] w-[48vw] h-[48vw] rounded-full bg-sky-400/14 dark:bg-blue-400/12 blur-[120px] pointer-events-none ambient-orb-3" />
      <div className="absolute top-[10%] right-[30%] w-[35vw] h-[35vw] rounded-full bg-purple-400/10 dark:bg-purple-600/10 blur-[110px] pointer-events-none ambient-orb-1" />

      {/* Layer 2: Moving Subtle Grid Lines (Slow Infinite Drift) */}
      <div className="absolute inset-0 ambient-animated-lines opacity-85 dark:opacity-75" />

      {/* Layer 3: Moving Dotted Matrix (Slow Infinite Drift) */}
      <div className="absolute inset-0 ambient-animated-dots opacity-90 dark:opacity-85" />

      {/* Layer 4: Vignette / Ambient Depth Overlay */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-40 dark:opacity-60" />
    </div>
  );
};

export default AmbientBackground;
