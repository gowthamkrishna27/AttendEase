import React, { useState, useRef, useEffect, useCallback } from 'react';
import './SendButton.css';
import { Check } from 'lucide-react';

export type SendButtonState = 'idle' | 'folding' | 'sent';

export interface SendButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Approximate auto-reset timeout in milliseconds (default: 2500ms) */
  autoReset?: number;
  /** Callback fired when the send animation initiates */
  onSend?: () => void | Promise<void>;
  /** Visual variant styling */
  variant?: 'white' | 'primary' | 'dark' | 'secondary' | 'ghost';
  /** Button sizing */
  size?: 'sm' | 'md' | 'lg';
  /** Default button text label (default: "Send") */
  label?: string;
  /** Label displayed when flight completes (default: "Sent") */
  sentLabel?: string;
  /** Additional custom classnames for the button element */
  className?: string;
  /** Outer container styling */
  containerStyle?: React.CSSProperties;
  /** Show facet mesh debug outline */
  showFacetDebug?: boolean;
}

/**
 * SendButton — Geometric Origami Paper Plane Folding & Flight Animation Component
 *
 * Sequence:
 *   IDLE → FOLDING → TRIANGLE → [EXACT REFERENCE PAPER PLANE] → FLY UP-RIGHT → SENT
 */
export const SendButton: React.FC<SendButtonProps> = ({
  type = 'button',
  autoReset = 2500,
  onSend,
  variant = 'white',
  size = 'md',
  label = 'Send',
  sentLabel = 'Sent',
  className = '',
  containerStyle,
  style,
  disabled = false,
  onClick,
  onKeyDown,
  showFacetDebug = false,
  ...restProps
}) => {
  const [state, setState] = useState<SendButtonState>('idle');
  const resetTimerRef = useRef<number | null>(null);
  const stageTimerRef = useRef<number | null>(null);

  const isSending = state === 'folding';
  const isSent = state === 'sent';

  const clearTimers = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (stageTimerRef.current !== null) {
      window.clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const triggerAnimation = useCallback(async () => {
    if (disabled || isSending || isSent) return;

    clearTimers();
    setState('folding');

    try {
      if (onSend) {
        await Promise.resolve(onSend());
      }
    } catch (err) {
      console.error('Send action error:', err);
    }

    // Animation takes 1.9s: transition to sent state as plane departs
    stageTimerRef.current = window.setTimeout(() => {
      setState('sent');

      if (autoReset > 0) {
        resetTimerRef.current = window.setTimeout(() => {
          setState('idle');
        }, autoReset);
      }
    }, 1850);
  }, [disabled, isSending, isSent, onSend, autoReset, clearTimers]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isSending) {
      e.preventDefault();
      return;
    }
    const form = e.currentTarget.form;
    if (type === 'submit' && form && !form.checkValidity()) {
      return;
    }
    triggerAnimation();
    if (onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (!disabled && !isSending) {
        const form = e.currentTarget.form;
        if (type === 'submit' && form && !form.checkValidity()) {
          return;
        }
        if (type !== 'submit') {
          e.preventDefault();
        }
        triggerAnimation();
      }
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div
      className={[
        'sb-wrap',
        `sb-wrap--variant-${variant}`,
        `sb-wrap--${size}`,
        isSending ? 'sb-wrap--sending' : '',
        isSent ? 'sb-wrap--sent' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...containerStyle,
        ...style,
      }}
    >
      {/* Morphing Geometric Button */}
      <button
        type={type}
        className={[
          'sb-shape',
          `sb-shape--${size}`,
          isSending ? 'sb-shape--sending' : '',
          isSent ? 'sb-shape--sent' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled || state !== 'idle'}
        aria-disabled={disabled || state !== 'idle'}
        aria-busy={isSending}
        aria-label={isSent ? sentLabel : label}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...restProps}
      >
        {/* Idle Label Content ("Send") */}
        <span className="sb-label">
          <span>{label}</span>
        </span>

        {/* Physical Paper Fold Crease (Active while folding & triangle) */}
        <span className="sb-fold-crease" aria-hidden="true" />

        {/* Origami Paper Airplane Facets */}
        <span
          className="sb-facet sb-facet-upper"
          aria-hidden="true"
          style={showFacetDebug ? { outline: '1px dashed #FFFFFF' } : undefined}
        />
        <span
          className="sb-facet sb-facet-keel"
          aria-hidden="true"
          style={showFacetDebug ? { outline: '1px dashed #FFD700' } : undefined}
        />
        <span
          className="sb-facet sb-facet-lower"
          aria-hidden="true"
          style={showFacetDebug ? { outline: '1px dashed #00FFFF' } : undefined}
        />
      </button>

      {/* Flight Motion Trail */}
      <div className="sb-flight-trail" aria-hidden="true" />

      {/* Post-Flight Sent State ("✓ Sent") */}
      <div className="sb-done" aria-live="polite">
        <Check size={16} className="sb-done-check" />
        <span>{sentLabel}</span>
      </div>
    </div>
  );
};

export default SendButton;
