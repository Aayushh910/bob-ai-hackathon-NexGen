import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

/**
 * Theme-aware tactical dropdown component.
 * Replaces system default browser <select> with a custom-styled,
 * theme-adaptive dropdown menu that respects Dark & Light modes.
 */
export default function ThemeDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  prefixIcon: PrefixIcon,
  style = {},
  buttonStyle = {},
  menuStyle = {},
  disabled = false,
  minWidth = '160px'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Find active option label
  const activeOption = options.find((opt) => {
    const optVal = typeof opt === 'object' ? opt.value : opt;
    return String(optVal) === String(value);
  });

  const activeLabel = activeOption
    ? (typeof activeOption === 'object' ? activeOption.label : activeOption)
    : (placeholder || 'Select...');

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth: minWidth,
        ...style
      }}
    >
      <button
        type="button"
        className="secondary-btn"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        style={{
          width: '100%',
          height: '36px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
          border: isOpen ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md, 6px)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s ease',
          ...buttonStyle
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {PrefixIcon && <PrefixIcon size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeLabel}
          </span>
        </div>
        <ChevronDown
          size={13}
          style={{
            color: 'var(--color-text-muted)',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease'
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            minWidth: minWidth,
            maxHeight: '260px',
            overflowY: 'auto',
            backgroundColor: 'var(--color-surface-elevated, var(--color-surface))',
            border: '1px solid var(--color-border-bright)',
            borderRadius: 'var(--radius-md, 6px)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
            zIndex: 9999,
            padding: '4px',
            boxSizing: 'border-box',
            ...menuStyle
          }}
        >
          {options.map((opt, idx) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const optIcon = typeof opt === 'object' ? opt.icon : null;
            const isSelected = String(optVal) === String(value);

            return (
              <div
                key={idx}
                onClick={() => {
                  onChange(optVal);
                  setIsOpen(false);
                }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                  backgroundColor: isSelected ? 'var(--color-surface-hover)' : 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'background-color 0.12s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {optIcon && React.createElement(optIcon, { size: 13, style: { color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)' } })}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {optLabel}
                  </span>
                </div>
                {isSelected && <CheckCircle2 size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
