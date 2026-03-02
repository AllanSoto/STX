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

    // Determine colors from CSS variables
    const style = getComputedStyle(document.body);
    
    // Helper to convert space-separated HSL from CSS vars to comma-separated for the library
    const getHslColor = (variable: string) => {
        const value = style.getPropertyValue(variable).trim();
        return `hsl(${value.split(' ').join(',')})`;
    }

    const backgroundColor = getHslColor('--background');
    const textColor = getHslColor('--foreground');
    const gridColor = getHslColor('--border');
    const upColor = getHslColor('--primary');
    const downColor = getHslColor('--destructive');
    
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
