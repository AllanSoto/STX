'use client';

import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type CandlestickData, type Time, ColorType } from 'lightweight-charts';

interface CryptoChartProps {
  data: CandlestickData<Time>[];
}

export function CryptoChart({ data }: CryptoChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // To ensure lightweight-charts can parse the colors, we get the computed
    // style of a temporary element that uses the CSS variables. This converts
    // the HSL values to a parsable RGB format.
    const getResolvedColor = (variable: string) => {
      // The element must be in the DOM to have a computed style.
      if (typeof document === 'undefined') return '';
      const tempEl = document.createElement('div');
      // Use a color property and the CSS variable.
      tempEl.style.color = `hsl(var(${variable}))`;
      // Keep it hidden and out of the layout flow.
      tempEl.style.position = 'absolute';
      tempEl.style.display = 'none';
      document.body.appendChild(tempEl);
      const color = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);
      return color;
    };

    const backgroundColor = getResolvedColor('--background');
    const textColor = getResolvedColor('--foreground');
    const gridColor = getResolvedColor('--border');
    const upColor = getResolvedColor('--primary');
    const downColor = getResolvedColor('--destructive');
    
    const chart = createChart(chartContainerRef.current, {
        layout: {
            background: { type: ColorType.Solid, color: backgroundColor },
            textColor: textColor,
        },
        grid: {
            vertLines: { color: gridColor },
            horzLines: { color: gridColor },
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
        }
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: upColor,
      downColor: downColor,
      borderDownColor: downColor,
      borderUpColor: upColor,
      wickDownColor: downColor,
      wickUpColor: upColor,
    });
    seriesRef.current = candlestickSeries;
    
    // Handle resizing
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.resize(width, height);
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []); // Only run once to initialize chart

  useEffect(() => {
    if (seriesRef.current && data) {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]); // Update data when it changes

  return <div ref={chartContainerRef} className="absolute inset-0" />;
}
