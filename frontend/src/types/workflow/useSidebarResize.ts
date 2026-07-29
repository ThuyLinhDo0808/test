import { useState, useEffect, useRef } from "react";
import React from "react";

/**
 * useSidebarResize - A custom hook to support both horizontal sidebar resizing
 * and vertical section resizing (like a resizable top panel inside sidebar).
 */
export function useSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const minSidebarWidth = 320;
  const maxSidebarWidth = 520;

  const startSidebarResizing = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(
        Math.max(startWidth + (e.clientX - startX), minSidebarWidth),
        maxSidebarWidth
      );
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const [topHeight, setTopHeight] = useState(160);
  const [minHeight, setMinHeight] = useState(260);
  const [maxHeight, setMaxHeight] = useState(520);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(260);
  const nodePaletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const total = document.body.clientHeight;
      setMaxHeight(total - 200);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (nodePaletteRef.current) {
      setMinHeight(nodePaletteRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientY - startY.current;
      const newHeight = startHeight.current + delta;
      setTopHeight(Math.min(maxHeight, Math.max(minHeight, newHeight)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minHeight, maxHeight]);

  const startDragging = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = topHeight;
  };

  return {
    sidebarWidth,
    startSidebarResizing,
    topHeight,
    startDragging,
    nodePaletteRef,
  };
}
