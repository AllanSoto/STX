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
    const backgroundColor = style.getPropertyValue('--background').trim();
    const textColor = style.getPropertyValue('--foreground').trim();
    const gridColor = style.getPropertyValue('--border').trim();
    const upColor = style.getPropertyValue('--primary').trim();
    const downColor = style.getPropertyValue('--destructive').trim();
    
    const chart = createChart(chartContainerRef.current, {
        layout: {
            background: { type: ColorType.Solid, color: `hsl(${backgroundColor})` },
            textColor: `hsl(${textColor})`,
        },
        grid: {
            vertLines: { color: `hsl(${gridColor})` },
            horzLines: { color: `hsl(${gridColor})` },
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
      upColor: `hsl(${upColor})`,
      downColor: `hsl(${downColor})`,
      borderDownColor: `hsl(${downColor})`,
      borderUpColor: `hsl(${upColor})`,
      wickDownColor: `hsl(${downColor})`,
      wickUpColor: `hsl(${upColor})`,
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
