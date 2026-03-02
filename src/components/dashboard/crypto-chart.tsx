
'use client';

import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type Time, ColorType, PriceScaleMode } from 'lightweight-charts';
import { calculateRSI } from '@/lib/indicators';

interface CryptoChartProps {
  data: CandlestickData<Time>[];
  showRsi6: boolean;
  showRsi14: boolean;
  showRsi24: boolean;
}

export function CryptoChart({ data, showRsi6, showRsi14, showRsi24 }: CryptoChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const rsi6SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsi14SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsi24SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);


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
    const rsiColor6 = getResolvedColor('--chart-2');
    const rsiColor14 = getResolvedColor('--chart-3');
    const rsiColor24 = getResolvedColor('--chart-4');

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
    
    // RSI 6 Series
    const rsi6Series = chart.addLineSeries({
        color: rsiColor6,
        lineWidth: 1,
        priceScaleId: 'rsi',
        visible: false,
    });
    rsi6SeriesRef.current = rsi6Series;

    // RSI 14 Series
    const rsi14Series = chart.addLineSeries({
        color: rsiColor14,
        lineWidth: 2,
        priceScaleId: 'rsi',
        visible: false,
    });
    rsi14SeriesRef.current = rsi14Series;
    
    // RSI 24 Series
    const rsi24Series = chart.addLineSeries({
        color: rsiColor24,
        lineWidth: 1,
        priceScaleId: 'rsi',
        visible: false,
    });
    rsi24SeriesRef.current = rsi24Series;

    // RSI Pane and Scale - MUST be configured after a series is assigned to the scale ID
    chart.priceScale('rsi').applyOptions({
        mode: PriceScaleMode.Normal,
        visible: false, // Initially hidden
        scaleMargins: { top: 0.8, bottom: 0 },
        entireTextOnly: true,
    });


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
    const rsi6 = rsi6SeriesRef.current;
    const rsi14 = rsi14SeriesRef.current;
    const rsi24 = rsi24SeriesRef.current;
    const chart = chartRef.current;

    if (!candlestickSeries || !rsi6 || !rsi14 || !rsi24 || !chart) return;

    candlestickSeries.setData(data);

    const rsiScale = chart.priceScale('rsi');
    const anyRsiVisible = showRsi6 || showRsi14 || showRsi24;

    const updateRsi = (series: ISeriesApi<'Line'>, period: number, visible: boolean) => {
        if (visible && data.length > period) {
            const rsiData = calculateRSI(data, period);
            series.setData(rsiData);
            series.applyOptions({ visible: true });
        } else {
            series.setData([]);
            series.applyOptions({ visible: false });
        }
    };
    
    updateRsi(rsi6, 6, showRsi6);
    updateRsi(rsi14, 14, showRsi14);
    updateRsi(rsi24, 24, showRsi24);
    
    rsiScale.applyOptions({ visible: anyRsiVisible });
    
  }, [data, showRsi6, showRsi14, showRsi24]);


  return <div ref={chartContainerRef} className="absolute inset-0" />;
}
