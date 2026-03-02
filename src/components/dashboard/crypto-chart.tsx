'use client';

import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type Time, ColorType, PriceScaleMode } from 'lightweight-charts';
import { calculateRSI } from '@/lib/indicators';

interface CryptoChartProps {
  data: CandlestickData<Time>[];
  showRSI: boolean;
}

export function CryptoChart({ data, showRSI }: CryptoChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Effect for chart initialization
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const getResolvedColor = (variable: string) => {
      if (typeof document === 'undefined') return '';
      const tempEl = document.createElement('div');
      tempEl.style.color = `hsl(var(${variable}))`;
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
    const rsiColor = getResolvedColor('--chart-2');

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
        },
        // Adjust main price scale to leave room for RSI
        rightPriceScale: {
            scaleMargins: { top: 0.1, bottom: 0.25 },
        },
    });

    chartRef.current = chart;

    // Price Series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: upColor,
      downColor: downColor,
      borderDownColor: downColor,
      borderUpColor: upColor,
      wickDownColor: downColor,
      wickUpColor: upColor,
    });
    candlestickSeriesRef.current = candlestickSeries;

    // RSI Series on a separate pane
    const rsiSeries = chart.addLineSeries({
        color: rsiColor,
        lineWidth: 2,
        priceScaleId: 'rsi',
        visible: false,
    });
    // Configure the RSI price scale
    chart.priceScale('rsi').applyOptions({
        mode: PriceScaleMode.Normal,
        visible: false,
        scaleMargins: { top: 0.8, bottom: 0 },
        entireTextOnly: true,
    });
    rsiSeriesRef.current = rsiSeries;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.resize(width, height);
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Effect to update data and RSI visibility
  useEffect(() => {
    const candlestickSeries = candlestickSeriesRef.current;
    const rsiSeries = rsiSeriesRef.current;
    const chart = chartRef.current;

    if (!candlestickSeries || !rsiSeries || !chart) return;

    // Update main candlestick data
    candlestickSeries.setData(data);

    // Update RSI
    const rsiScale = chart.priceScale('rsi');
    if (showRSI && data.length > 14) {
        const rsiData = calculateRSI(data);
        rsiSeries.setData(rsiData);
        rsiSeries.applyOptions({ visible: true });
        rsiScale.applyOptions({ visible: true });
    } else {
        rsiSeries.setData([]);
        rsiSeries.applyOptions({ visible: false });
        rsiScale.applyOptions({ visible: false });
    }
    
  }, [data, showRSI]);


  return <div ref={chartContainerRef} className="absolute inset-0" />;
}
