import React, { useRef, useContext, useEffect } from 'react';
import { TreeContext, TreeContextType } from '../types';

const TouchInput: React.FC = () => {
    const {
        state,
        setState,
        setRotationBoost,
        setPanOffset,
        setZoomOffset,
        setPointer,
        setClickTrigger,
        selectedPhotoUrl,
        setSelectedPhotoUrl,
    } = useContext(TreeContext) as TreeContextType;

    // Refs for tracking touch state
    const lastTouchRef = useRef<{ x: number; y: number }[]>([]);
    const lastDistRef = useRef<number | null>(null);
    const touchStartTimeRef = useRef<number>(0);
    const startTouchPosRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef<boolean>(false);

    // Constants
    const TAP_THRESHOLD = 10; // Pixels
    const TAP_TIMEOUT = 300; // ms

    const handleTouchStart = (e: React.TouchEvent) => {
        // Prevent default to disable scrolling/zooming by browser
        // e.preventDefault(); // Note: Passive listener issue might occur if done in React, but we'll try standard behavior first or add CSS 'touch-action: none'

        const touches = Array.from(e.touches).map((t: React.Touch) => ({ x: t.clientX, y: t.clientY }));
        lastTouchRef.current = touches;
        touchStartTimeRef.current = Date.now();
        isDraggingRef.current = false;

        if (touches.length === 1) {
            startTouchPosRef.current = touches[0];
            // Update pointer for potential selection
            const x = touches[0].x / window.innerWidth;
            const y = touches[0].y / window.innerHeight;
            setPointer({ x, y });
        } else if (touches.length === 2) {
            lastDistRef.current = Math.hypot(
                touches[0].x - touches[1].x,
                touches[0].y - touches[1].y
            );
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const touches = Array.from(e.touches).map((t: React.Touch) => ({ x: t.clientX, y: t.clientY }));

        // 1. Single Finger Interaction
        if (touches.length === 1 && lastTouchRef.current.length === 1) {
            const dx = touches[0].x - lastTouchRef.current[0].x;
            const dy = touches[0].y - lastTouchRef.current[0].y;

            // Check if moved enough to consider it a drag
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                isDraggingRef.current = true;
            }

            if (state === 'FORMED') {
                // Rotate Tree
                // Map screen delta to rotation boost
                // Sensitivity factor
                const sensitivity = 0.5;
                const boost = dx * sensitivity * 0.05; // Adjust magnitude
                setRotationBoost((prev) => {
                    // Add momentum logic if needed, simplify for now
                    return Math.max(Math.min(prev - boost, 3.0), -3.0); // Inverset direction matches natural swipe
                });

            } else {
                // Chaos Mode: Pan
                setPanOffset(prev => ({
                    x: prev.x + dx * 0.05, // Adjust sensitivity
                    y: prev.y - dy * 0.05 // Invert Y for natural drag
                }));
            }

            // Update pointer position for continuously tracking (optional)
            const x = touches[0].x / window.innerWidth;
            const y = touches[0].y / window.innerHeight;
            setPointer({ x, y });
        }

        // 2. Pinch Zoom
        if (touches.length === 2 && lastTouchRef.current.length === 2 && lastDistRef.current !== null) {
            isDraggingRef.current = true;
            const dist = Math.hypot(
                touches[0].x - touches[1].x,
                touches[0].y - touches[1].y
            );

            const deltaDist = dist - lastDistRef.current;

            // Zoom logic
            setZoomOffset(prev => {
                const next = prev - deltaDist * 0.05; // Zoom in (negative offset moves camera closer? Check Rig)
                // In Rig: targetZ = baseZ + zoomOffset. 
                // If we want to zoom IN, z should get smaller.
                // If current Z is 20, and we pinch out (delta > 0), we want to get closer (smaller Z).
                // So zooming out (fingers spread) -> delta > 0 -> reduce Z -> subtract delta.
                // Wait, normally pinch OUT means zoom IN (display gets bigger).
                // So delta > 0 => Zoom In => Camera moves closer => Z decreases.
                // So `prev - delta` adds to negative offset?
                return Math.max(-20, Math.min(next, 40));
            });

            lastDistRef.current = dist;
        }

        lastTouchRef.current = touches;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const timeSinceStart = Date.now() - touchStartTimeRef.current;

        // Check for Tap
        if (!isDraggingRef.current && timeSinceStart < TAP_TIMEOUT && lastTouchRef.current.length === 1) {
            // This was a tap
            // Trigger click
            setClickTrigger(Date.now());

            if (selectedPhotoUrl) {
                // If photo is open, tap might close it (handled by App.tsx click handler on backdrop usually, 
                // but we also send a signal globally via clickTrigger)
            }
        }

        if (e.touches.length === 0) {
            lastDistRef.current = null;
        }
    };

    return (
        <div
            className="absolute inset-0 z-50 touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        />
    );
};

export default TouchInput;
