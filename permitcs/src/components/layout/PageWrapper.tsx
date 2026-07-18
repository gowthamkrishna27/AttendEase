import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from './Navbar';

interface PageWrapperProps {
  children: ReactNode;
  role?: 'student' | 'faculty' | 'hod';
}

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export function PageWrapper({ children, role = 'student' }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar role={role} />
      <motion.main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="page-container py-8 md:py-12"
      >
        {children}
      </motion.main>
    </div>
  );
}
