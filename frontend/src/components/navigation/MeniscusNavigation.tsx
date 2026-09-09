import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clamp,
  smooth,
  reach,
  solveTrough,
  sharedNavMemory,
} from './meniscusPhysics';
import './MeniscusNavigation.css';

export interface MeniscusNavItem {
  id?: string;
  to: string;
  label: string;
  icon: React.ElementType;
  hasBadge?: boolean;
  badgeCount?: number;
}

export interface MeniscusNavigationProps {
  items: MeniscusNavItem[];
  activePath: string;
  className?: string;
  style?: React.CSSProperties;
  onItemClick?: (item: MeniscusNavItem) => void;
  role?: string;
}

export const MeniscusNavigation: React.FC<MeniscusNavigationProps> = ({
  items,
  activePath,
  className = '',
  style,
  onItemClick,
  role,
}) => {
  const navigate = useNavigate();

  const dockRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fillPathRef = useRef<SVGPathElement>(null);
  const beadRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Physics and interaction state stored in ref so it survives re-renders
  const stateRef = useRef({
    x: 0,
    v: 0,
    target: 0,
    dragging: false,
    isPointerDown: false,
    suppressClick: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    dockLeft: 0,
    lastDragTime: 0,
    rafId: 0,
    lastTime: 0,
    G: {
      W: 0,
      H: 0,
      R: 17,
      D: 54,
      RB: 33,
      S: 14,
      CY: 0,
      slots: [] as number[],
      span: 80,
    },
    currentIndex: 0,
    startIndex: 0,
    pressedIndex: null as number | null,
  });

  const prefersReducedMotion = useCallback(() => {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }, []);

  // Determine active item index based on activePath
  const getActiveIndex = useCallback(() => {
    if (!items || items.length === 0) return 0;

    const matchedIndex = items.findIndex((item) => {
      if (!item.to) return false;
      const isRoot =
        item.to === '/student' ||
        item.to === '/faculty' ||
        item.to === '/hod' ||
        item.to === '/admin';
      return isRoot
        ? activePath === item.to || activePath === `${item.to}/`
        : activePath.startsWith(item.to);
    });

    return matchedIndex >= 0 ? matchedIndex : 0;
  }, [items, activePath]);

  // Paint the SVG trough, bead transform, and icon elevations
  const paint = useCallback(() => {
    const { x, v, target, dragging, G } = stateRef.current;
    if (!fillPathRef.current || !beadRef.current || G.W <= 0) return;

    // q is signed velocity factor: -1..1
    const q = clamp(v / 1100, -1, 1) * (dragging ? 0.7 : 1);
    const mag = Math.abs(q);

    // Trailing shoulder draws out long, leading shoulder tightens
    const sL = clamp(G.S * (1 + 0.06 * mag + 0.40 * q), G.S * 0.55, G.S * 2.1);
    const sR = clamp(G.S * (1 + 0.06 * mag - 0.40 * q), G.S * 0.55, G.S * 2.1);

    const pathD = solveTrough(G.W, G.H, G.R, x, G.CY, G.RB, sL, sR);
    fillPathRef.current.setAttribute('d', pathD);

    // Drop bubble squash & stretch:
    // Elongates slightly along velocity axis during rapid travel,
    // and produces a soft bubble stick squash when landing into the socket.
    const distToTarget = Math.abs(x - target);
    const isSettling = !dragging && distToTarget < 14 && Math.abs(v) > 2;
    const stickSquash = isSettling ? (1 - distToTarget / 14) * 0.07 : 0;

    const sx = clamp(1 + 0.08 * mag - stickSquash, 0.93, 1.15);
    const sy = 1 / sx;
    beadRef.current.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;

    // Dynamic icon elevations and labels
    tabRefs.current.forEach((tabEl, i) => {
      if (!tabEl || typeof G.slots[i] !== 'number') return;
      const dx = Math.abs(x - G.slots[i]);
      const t = smooth(clamp(1 - dx / (G.span * 0.55), 0, 1));
      tabEl.style.setProperty('--t', t.toFixed(3));
    });
  }, []);

  // Animation frame loop for spring settling and tab transitions
  const loop = useCallback(
    (now: number) => {
      stateRef.current.rafId = 0;
      const dt = Math.min(
        (now - (stateRef.current.lastTime || now)) / 1000,
        1 / 30
      );
      stateRef.current.lastTime = now;

      const { dragging, target } = stateRef.current;

      if (!dragging) {
        // High-fidelity liquid settlement spring (zeta = 0.81 critically damped)
        const K = 210;
        const C = 23.5;

        let step = dt;
        while (step > 0) {
          const h = Math.min(step, 1 / 240);
          stateRef.current.v +=
            (-K * (stateRef.current.x - target) - C * stateRef.current.v) * h;
          stateRef.current.x += stateRef.current.v * h;
          step -= h;
        }

        paint();

        // Keep shared memory updated across route changes
        sharedNavMemory.x = stateRef.current.x;
        sharedNavMemory.v = stateRef.current.v;
        sharedNavMemory.role = role || 'default';

        const moving =
          Math.abs(stateRef.current.x - target) > 0.05 ||
          Math.abs(stateRef.current.v) > 0.8;

        if (moving) {
          if (!stateRef.current.rafId) {
            stateRef.current.rafId = requestAnimationFrame(loop);
          }
        } else {
          stateRef.current.x = target;
          stateRef.current.v = 0;
          paint();
        }
      }
    },
    [paint, role]
  );

  const run = useCallback(() => {
    if (stateRef.current.rafId) return;
    stateRef.current.lastTime = performance.now();
    stateRef.current.rafId = requestAnimationFrame(loop);
  }, [loop]);

  const jump = useCallback(
    (to: number) => {
      stateRef.current.target = to;
      if (prefersReducedMotion()) {
        stateRef.current.x = to;
        stateRef.current.v = 0;
        paint();
        return;
      }
      run();
    },
    [paint, prefersReducedMotion, run]
  );

  // Measure dock and compute slots from rendered tab centers
  const measure = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return false;

    const r = dock.getBoundingClientRect();
    const W = Math.round(r.width);
    const H = Math.round(r.height);
    if (W < 40 || H < 30) return false;

    const slots: number[] = [];
    let allMeasured = true;
    tabRefs.current.forEach((t, i) => {
      if (t && i < items.length) {
        const b = t.getBoundingClientRect();
        slots.push(b.left - r.left + b.width / 2);
      } else if (i < items.length) {
        allMeasured = false;
      }
    });

    // If any tab couldn't be measured, discard partial data and use uniform fallback
    if (!allMeasured || slots.length !== items.length) {
      slots.length = 0;
      const step = W / items.length;
      for (let i = 0; i < items.length; i++) {
        slots.push(step * i + step / 2);
      }
    }

    const span = slots.length > 1 ? slots[1] - slots[0] : W;
    const R = clamp(H * 0.20, 13, 20);
    const CY = 2; // Nestled comfortably inside the notch

    let D = Math.min(H * 0.65, span * 0.72);
    const room = (slots[0] || 40) - R - 6;
    for (let i = 0; i < 3; i++) {
      const hw = reach(D * 0.22, D / 2 + 5, CY);
      if (hw <= room) break;
      D *= room / hw;
    }
    D = Math.max(Math.round(D), 34);
    const S = D * 0.22;
    const RB = D / 2 + 5;

    stateRef.current.G = { W, H, R, D, RB, S, CY, slots, span };

    if (svgRef.current) {
      svgRef.current.setAttribute('viewBox', `0 0 ${W} ${H}`);
    }

    dock.style.setProperty('--dock-r', `${R.toFixed(1)}px`);
    dock.style.setProperty('--bead-d', `${D}px`);
    dock.style.setProperty('--bead-cy', `${CY}px`);
    dock.style.setProperty('--rise', `${(H / 2 - CY).toFixed(1)}px`);

    return true;
  }, [items.length]);

  const layout = useCallback(
    (animate = false) => {
      if (!measure()) return;
      const targetIndex = getActiveIndex();
      stateRef.current.currentIndex = targetIndex;
      const slotX = stateRef.current.G.slots[targetIndex] || 0;

      // Check if resuming from a previous page navigation with the same role
      const canResume =
        sharedNavMemory.role === (role || 'default') &&
        typeof sharedNavMemory.x === 'number' &&
        Math.abs(sharedNavMemory.x - slotX) > 1;

      if (canResume) {
        stateRef.current.x = sharedNavMemory.x!;
        stateRef.current.v = sharedNavMemory.v || 0;
        stateRef.current.target = slotX;
        paint();
        jump(slotX);
      } else if (animate) {
        jump(slotX);
      } else {
        stateRef.current.x = slotX;
        stateRef.current.target = slotX;
        stateRef.current.v = 0;
        paint();
      }

      if (dockRef.current) {
        dockRef.current.classList.add('is-ready');
      }
    },
    [measure, getActiveIndex, jump, paint, role]
  );

  // ResizeObserver for responsive measurement across desktop, tablet, and mobile
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    layout(false);

    const ro = new ResizeObserver(() => {
      layout(false);
    });
    ro.observe(dock);

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => layout(false));
    }

    return () => {
      ro.disconnect();
      if (stateRef.current.rafId) {
        cancelAnimationFrame(stateRef.current.rafId);
      }
      sharedNavMemory.x = stateRef.current.x;
      sharedNavMemory.v = stateRef.current.v;
      sharedNavMemory.role = role || 'default';
    };
  }, [layout, role]);

  // Follow activePath changes automatically
  useEffect(() => {
    const idx = getActiveIndex();
    stateRef.current.currentIndex = idx;
    const slotX = stateRef.current.G.slots[idx];
    if (typeof slotX === 'number') {
      jump(slotX);
    }
  }, [activePath, getActiveIndex, jump]);

  // Select tab programmatically or on click
  const selectTab = useCallback(
    (index: number, item: MeniscusNavItem) => {
      // Use live DOM measurement for pixel-perfect bubble placement
      let slotX = stateRef.current.G.slots[index];
      const dock = dockRef.current;
      const tabEl = tabRefs.current[index];
      if (dock && tabEl) {
        const dockRect = dock.getBoundingClientRect();
        const tabRect = tabEl.getBoundingClientRect();
        slotX = tabRect.left - dockRect.left + tabRect.width / 2;
        // Update cached slot to keep it in sync
        stateRef.current.G.slots[index] = slotX;
      }

      // Prevent redundant / duplicate trigger if already at this tab
      if (
        stateRef.current.currentIndex === index &&
        typeof slotX === 'number' &&
        Math.abs(stateRef.current.x - slotX) < 1
      ) {
        return;
      }

      stateRef.current.currentIndex = index;
      if (typeof slotX === 'number') {
        jump(slotX);
      }

      sharedNavMemory.x = stateRef.current.x;
      sharedNavMemory.v = stateRef.current.v;
      sharedNavMemory.role = role || 'default';

      if (onItemClick) {
        onItemClick(item);
      } else if (item.to) {
        navigate(item.to);
      }
    },
    [jump, onItemClick, navigate, role]
  );

  // Tab button click handler (clean single-tap activation)
  const handleTabClick = useCallback(
    (index: number, item: MeniscusNavItem) => {
      if (stateRef.current.dragging) return;
      selectTab(index, item);
    },
    [selectTab]
  );

  // Keyboard navigation (ArrowLeft, ArrowRight, Home, End)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const cur = stateRef.current.currentIndex;
      let next: number | null = null;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (cur + 1) % items.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (cur - 1 + items.length) % items.length;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = items.length - 1;
      }

      if (next !== null) {
        e.preventDefault();
        const item = items[next];
        selectTab(next, item);
        tabRefs.current[next]?.focus();
      }
    },
    [items, selectTab]
  );

  // Robust Native Pointer Drag Implementation
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    // Prevent HTML5 element drag on dock and all descendants
    const onDragStart = (e: DragEvent) => e.preventDefault();
    dock.addEventListener('dragstart', onDragStart);

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      // Cancel any active spring settling loop immediately so pointer has exclusive control
      if (stateRef.current.rafId) {
        cancelAnimationFrame(stateRef.current.rafId);
        stateRef.current.rafId = 0;
      }

      stateRef.current.isPointerDown = true;
      stateRef.current.pointerId = e.pointerId;
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
      stateRef.current.dragging = false;
      stateRef.current.suppressClick = false;
      stateRef.current.lastDragTime = performance.now();

      // Find which tab button was pressed directly (if any)
      const tabTarget = (e.target as HTMLElement)?.closest('.meniscus-tab');
      let targetIdx = -1;
      if (tabTarget) {
        targetIdx = tabRefs.current.indexOf(tabTarget as HTMLButtonElement);
      }
      stateRef.current.pressedIndex = targetIdx >= 0 ? targetIdx : null;
      stateRef.current.startIndex = targetIdx >= 0 ? targetIdx : stateRef.current.currentIndex;

      // Fresh measurement on press
      measure();

      const rect = dock.getBoundingClientRect();
      stateRef.current.dockLeft = rect.left;

      // NOTE: Do not call setPointerCapture here!
      // Delaying pointer capture until drag threshold is exceeded ensures
      // that single taps activate immediately without click suppression.

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { passive: false });
      window.addEventListener('pointercancel', onPointerUp, { passive: false });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!stateRef.current.isPointerDown) return;

      const dx = Math.abs(e.clientX - stateRef.current.startX);
      const dy = Math.abs(e.clientY - stateRef.current.startY);
      const dragThreshold = e.pointerType === 'touch' ? 14 : 7;

      if (!stateRef.current.dragging) {
        // Only enter drag mode if displacement clearly exceeds tap slop
        if (dx < dragThreshold && dy < dragThreshold) return;

        stateRef.current.dragging = true;
        stateRef.current.suppressClick = true;
        dock.classList.add('is-dragging');

        // Now activate pointer capture for continuous dragging
        try {
          if (stateRef.current.pointerId !== null) {
            dock.setPointerCapture(stateRef.current.pointerId);
          }
        } catch {
          // Safe fallback
        }
      }

      e.preventDefault();

      const { slots } = stateRef.current.G;
      if (slots.length === 0) return;

      const rawTarget = e.clientX - stateRef.current.dockLeft;
      const targetX = clamp(rawTarget, slots[0], slots[slots.length - 1]);

      // Butter-smooth 1:1 direct tracking with smoothed physical velocity
      const now = performance.now();
      const dt = Math.max((now - stateRef.current.lastDragTime) / 1000, 0.008);
      stateRef.current.lastDragTime = now;

      const instantV = (targetX - stateRef.current.x) / dt;
      // Exponential moving average for velocity eliminates noise and keeps shoulders silky
      stateRef.current.v = stateRef.current.v * 0.35 + instantV * 0.65;
      stateRef.current.x = targetX;
      stateRef.current.target = targetX;

      // Keep shared memory updated live
      sharedNavMemory.x = targetX;
      sharedNavMemory.v = stateRef.current.v;

      // Dynamically fade pages during drag in direct proportion to displacement
      const curSlot = slots[stateRef.current.currentIndex] ?? slots[0];
      const dist = Math.abs(targetX - curSlot);
      const dragFade = Math.max(1 - (dist / Math.max(stateRef.current.G.span, 1)) * 0.42, 0.58);
      document.documentElement.style.setProperty('--nav-drag-fade', dragFade.toFixed(3));

      paint();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!stateRef.current.isPointerDown) return;
      stateRef.current.isPointerDown = false;

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      try {
        if (stateRef.current.pointerId !== null && dock.hasPointerCapture(stateRef.current.pointerId)) {
          dock.releasePointerCapture(stateRef.current.pointerId);
        }
      } catch {
        // Safe fallback
      }

      document.documentElement.style.removeProperty('--nav-drag-fade');

      // ─── 1-TAP ACTIVATION ───
      if (!stateRef.current.dragging) {
        stateRef.current.suppressClick = false;

        // If a specific tab was tapped, activate it instantly on the first tap!
        const { pressedIndex } = stateRef.current;
        if (pressedIndex !== null && pressedIndex >= 0 && items[pressedIndex]) {
          selectTab(pressedIndex, items[pressedIndex]);
          return;
        }

        // If tapped on dock plate near a tab:
        const tapX = e.clientX - stateRef.current.dockLeft;
        const { slots, span } = stateRef.current.G;
        let tapped = -1;
        let minD = Infinity;
        slots.forEach((s, idx) => {
          const d = Math.abs(tapX - s);
          if (d < minD && d < span * 0.6) {
            minD = d;
            tapped = idx;
          }
        });
        if (tapped >= 0 && items[tapped]) {
          selectTab(tapped, items[tapped]);
        }
        return;
      }

      // ─── DRAG RELEASE SETTLEMENT ───
      stateRef.current.dragging = false;
      dock.classList.remove('is-dragging');

      // Check if user paused before release (decay stale drag velocity)
      const timeSinceLastDrag = performance.now() - stateRef.current.lastDragTime;
      if (timeSinceLastDrag > 60) {
        stateRef.current.v = 0;
      }

      const { x, v, G, startIndex } = stateRef.current;
      const slots = G.slots;
      if (slots.length === 0) return;

      let targetIndex = startIndex;

      // Determine movement direction relative to start tab and velocity
      const originX = slots[startIndex] ?? x;
      const overallDelta = x - originX;
      const isMovingRight = v > 35 || (v >= -35 && overallDelta > 4);
      const isMovingLeft = v < -35 || (v <= 35 && overallDelta < -4);

      // Find which slot interval [k, k+1] the bead currently sits between
      let k = 0;
      while (k < slots.length - 2 && x > slots[k + 1]) {
        k++;
      }

      const leftSlot = slots[k];
      const rightSlot = slots[k + 1] ?? leftSlot;
      const intervalSpan = Math.max(rightSlot - leftSlot, 1);
      const progress = clamp((x - leftSlot) / intervalSpan, 0, 1);

      // Drop bubble stick resolution:
      // When dragging towards a side and reaching ~38% or more, fit decisively into the next tab on that side
      if (isMovingRight) {
        if (progress >= 0.38 || v > 100) {
          targetIndex = Math.min(k + 1, slots.length - 1);
        } else {
          targetIndex = k;
        }
      } else if (isMovingLeft) {
        if (progress <= 0.62 || v < -100) {
          targetIndex = k;
        } else {
          targetIndex = Math.min(k + 1, slots.length - 1);
        }
      } else {
        // Exact midpoint balance fallback
        targetIndex = progress >= 0.5 ? Math.min(k + 1, slots.length - 1) : k;
      }

      const slotX = slots[targetIndex];
      stateRef.current.target = slotX;
      stateRef.current.currentIndex = targetIndex;

      // Retain the current dynamic position and velocity in sharedNavMemory
      // so if a page route transition occurs, the incoming page starts from
      // this exact half-moved coordinate and finishes the liquid spring animation seamlessly.
      sharedNavMemory.x = stateRef.current.x;
      sharedNavMemory.v = stateRef.current.v;
      sharedNavMemory.role = role || 'default';

      // Start spring settling loop into target slot
      stateRef.current.lastTime = performance.now();
      run();

      const targetItem = items[targetIndex];
      if (targetItem) {
        if (onItemClick) {
          onItemClick(targetItem);
        } else if (targetItem.to) {
          navigate(targetItem.to);
        }
      }

      // Suppress the follow-up synthetic click from release
      setTimeout(() => {
        stateRef.current.suppressClick = false;
      }, 120);
    };

    dock.addEventListener('pointerdown', onPointerDown, { passive: false });

    return () => {
      dock.removeEventListener('dragstart', onDragStart);
      dock.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.documentElement.style.removeProperty('--nav-drag-fade');
    };
  }, [items, onItemClick, navigate, run, measure, role, paint]);

  const activeIndex = getActiveIndex();

  return (
    <div className={`meniscus-wrapper ${className}`} style={style}>
      <nav
        ref={dockRef}
        className="meniscus-dock"
        aria-label="Navigation"
        onKeyDown={handleKeyDown}
      >
        {/* Soft Ambient Ground Shadow */}
        <span className="meniscus-dock__cast" aria-hidden="true" />

        {/* Single Continuous SVG Surface */}
        <svg
          ref={svgRef}
          className="meniscus-dock__skin"
          aria-hidden="true"
          focusable="false"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="meniscusPlateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop className="meniscus-dock__plate-hi" offset="0%" />
              <stop className="meniscus-dock__plate-lo" offset="100%" />
            </linearGradient>
            <linearGradient id="meniscusRimGrad" x1="0" y1="0" x2="0" y2="1">
              <stop className="meniscus-dock__rim-hi" offset="0%" />
              <stop className="meniscus-dock__rim-lo" offset="100%" />
            </linearGradient>
          </defs>
          <path ref={fillPathRef} className="meniscus-dock__fill" />
        </svg>

        {/* Liquid Indicator Bead */}
        <span ref={beadRef} className="meniscus-dock__bead" aria-hidden="true" />

        {/* Tab Items with Existing Icons and Routing */}
        <div className="meniscus-dock__tabs" role="tablist">
          {items.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;

            return (
              <button
                key={item.id || item.to || index}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`meniscus-tab ${isActive ? 'is-active' : ''}`}
                onClick={() => handleTabClick(index, item)}
              >
                <span className="meniscus-tab__icon-wrap">
                  <Icon className="meniscus-tab__icon" />
                  {item.hasBadge && (
                    <span className="meniscus-tab__badge" aria-hidden="true" />
                  )}
                </span>
                <span className="meniscus-tab__label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
