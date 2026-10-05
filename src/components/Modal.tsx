import { useEffect, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  zIndex?: number;
  className?: string; // Additional classes for the modal container
}

export function Modal({ isOpen, onClose, children, zIndex = 50, className = "" }: ModalProps) {
  const [render, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300 ${isOpen ? 'bg-black/40 opacity-100' : 'bg-transparent opacity-0'}`}
      style={{ zIndex }}
      onTransitionEnd={handleAnimationEnd}
    >
      {/* Background overlay click handler */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`relative transition-all duration-300 ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
