'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  DatabaseZap,
  Globe2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingUp,
} from 'lucide-react';
import { FiAlertCircle, FiImage, FiLayers } from 'react-icons/fi';
import { toast } from 'sonner';

interface RankedValue {
  label: string;
  value: number;
}

interface TrendDatum {
  date: string;
  count: number;
}

interface RadarDatum {
  metric: string;
  fill: number;
}

interface AnalyticsPayload {
  summary: {
    totalProducts: number;
    withImageTotal: number;
    withImageRate: number;
    avgPrice: number;
    avgAbv: number;
    qualityScore: number;
    recordsAnalyzed: number;
  };
  brandSeries: RankedValue[];
  countrySeries: RankedValue[];
  categorySeries: RankedValue[];
  scrapeTrend: TrendDatum[];
  qualitySeries: RadarDatum[];
}

interface AnalyticsResponse {
  success: boolean;
  data?: AnalyticsPayload;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const emptyAnalytics: AnalyticsPayload = {
  summary: {
    totalProducts: 0,
    withImageTotal: 0,
    withImageRate: 0,
    avgPrice: 0,
    avgAbv: 0,
    qualityScore: 0,
    recordsAnalyzed: 0,
  },
  brandSeries: [],
  countrySeries: [],
  categorySeries: [],
  scrapeTrend: [],
  qualitySeries: [
    { metric: 'Brand', fill: 0 },
    { metric: 'Country', fill: 0 },
    { metric: 'Category', fill: 0 },
    { metric: 'Price', fill: 0 },
    { metric: 'ABV', fill: 0 },
    { metric: 'Volume', fill: 0 },
    { metric: 'Description', fill: 0 },
  ],
};

const pieColors = ['#2271b1', '#135e96', '#72aee6', '#8bc34a', '#f39c12', '#e67e22', '#6b7280'];

const brandChartConfig = {
  count: {
    label: 'Products',
    color: '#2271b1',
  },
} satisfies ChartConfig;

const scrapeChartConfig = {
  count: {
    label: 'Scraped',
    color: '#135e96',
  },
} satisfies ChartConfig;

const qualityChartConfig = {
  fill: {
    label: 'Completeness',
    color: '#8bc34a',
  },
} satisfies ChartConfig;

function formatShortDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parsed);
}

export default function AnalyticsPage() {
  const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(
    '/api/analytics',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 45000,
    }
  );

  const analytics = data?.data ?? emptyAnalytics;

  const brandSeries = useMemo(
    () =>
      analytics.brandSeries.map((item) => ({
        brand: item.label.length > 14 ? `${item.label.slice(0, 14)}...` : item.label,
        count: item.value,
        fullBrand: item.label,
      })),
    [analytics.brandSeries]
  );

  const countrySeries = useMemo(
    () =>
      analytics.countrySeries.map((item) => ({
        country: item.label,
        count: item.value,
      })),
    [analytics.countrySeries]
  );

  const scrapeTrend = useMemo(() => {
    if (analytics.scrapeTrend.length > 0) {
      return analytics.scrapeTrend.map((item) => ({
        date: formatShortDate(item.date),
        count: item.count,
      }));
    }

    return Array.from({ length: 8 }).map((_, index) => ({
      date: `W${index + 1}`,
      count: 0,
    }));
  }, [analytics.scrapeTrend]);

  const insights = useMemo(() => {
    const strongestBrand = analytics.brandSeries[0];
    const leadingCountry = analytics.countrySeries[0];
    const leadingCategory = analytics.categorySeries[0];

    return [
      {
        title: 'Dominant Brand Cluster',
        value: strongestBrand ? `${strongestBrand.label} (${strongestBrand.value})` : 'Insufficient data',
        icon: Tags,
      },
      {
        title: 'Strongest Country Signal',
        value: leadingCountry ? `${leadingCountry.label} (${leadingCountry.value})` : 'Insufficient data',
        icon: Globe2,
      },
      {
        title: 'Lead Category',
        value: leadingCategory ? `${leadingCategory.label} (${leadingCategory.value})` : 'Insufficient data',
        icon: FiLayers,
      },
      {
        title: 'Catalog Quality Score',
        value: `${analytics.summary.qualityScore}% complete`,
        icon: ShieldCheck,
      },
    ];
  }, [analytics.brandSeries, analytics.countrySeries, analytics.categorySeries, analytics.summary.qualityScore]);

  const handleRefresh = async () => {
    await mutate();
    toast.success('Analytics refreshed');
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="wp-topbar z-20 flex h-[74px] shrink-0 items-center justify-between border-b border-slate-200/80 px-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <BarChart3 className="h-4 w-4 text-[#2271b1]" />
            <span>Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900">Analytics</span>
          </div>
          <Badge className="hidden border border-[#2271b1]/30 bg-[#2271b1]/10 text-[11px] font-semibold text-[#135e96] sm:inline-flex">
            Conversion-Ready Reporting UI
          </Badge>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          className="h-10 rounded-xl border-slate-300 bg-white/80 px-4 text-slate-700 shadow-sm hover:bg-white"
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh data
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
          <section className="wp-card animate-rise rounded-[28px] p-6 md:p-8">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2271b1]">Portfolio Intelligence</p>
                <h1 className="wp-heading mt-2 text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
                  Client-Ready Analytics Command Deck
                </h1>
                {/* <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                  A visually rich reporting surface designed to look familiar to WordPress-loving stakeholders while staying meaningful for analysts.
                </p> */}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border border-blue-200 bg-blue-50 text-[#135e96]">
                    Records analyzed: {analytics.summary.recordsAnalyzed.toLocaleString()}
                  </Badge>
                  <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                    {analytics.summary.withImageRate}% media coverage
                  </Badge>
                  <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                    Quality score {analytics.summary.qualityScore}%
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-7">
                <div className="wp-stat-card rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total Products</p>
                    <DatabaseZap className="h-4 w-4 text-[#2271b1]" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">{analytics.summary.totalProducts.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-500">Inventory rows tracked by the index</p>
                </div>

                <div className="wp-stat-card rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">With Images</p>
                    <FiImage className="h-4 w-4 text-[#2271b1]" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">{analytics.summary.withImageTotal.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-500">Products enriched with media assets</p>
                </div>

                <div className="wp-stat-card rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Average Price</p>
                    <TrendingUp className="h-4 w-4 text-[#2271b1]" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">
                    ${Number.isFinite(analytics.summary.avgPrice) ? analytics.summary.avgPrice.toFixed(2) : '0.00'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Computed from parsed visible price data</p>
                </div>

                <div className="wp-stat-card rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Average ABV</p>
                    <Activity className="h-4 w-4 text-[#2271b1]" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">
                    {Number.isFinite(analytics.summary.avgAbv) ? analytics.summary.avgAbv.toFixed(1) : '0.0'}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Signal strength of the catalog profile</p>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <Alert className="wp-card animate-rise-delay-1 rounded-2xl border-amber-200 bg-amber-50/95 text-amber-900">
              <FiAlertCircle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-800">
                Unable to load analytics snapshot. Showing last cached values where available.
              </AlertDescription>
            </Alert>
          )}

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="wp-card animate-rise-delay-1 rounded-3xl p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Top Brands</p>
                  <h2 className="wp-heading mt-1 text-2xl font-semibold text-slate-900">Brand concentration</h2>
                </div>
                <Sparkles className="h-5 w-5 text-[#2271b1]" />
              </div>

              <ChartContainer config={brandChartConfig} className="h-[300px] w-full aspect-auto">
                <BarChart data={brandSeries} barGap={10}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="brand" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[10, 10, 4, 4]} />
                </BarChart>
              </ChartContainer>
            </Card>

            <Card className="wp-card animate-rise-delay-1 rounded-3xl p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Ingestion Pulse</p>
                  <h2 className="wp-heading mt-1 text-2xl font-semibold text-slate-900">Scrape activity trend</h2>
                </div>
                <BrainCircuit className="h-5 w-5 text-[#2271b1]" />
              </div>

              <ChartContainer config={scrapeChartConfig} className="h-[300px] w-full aspect-auto">
                <AreaChart data={scrapeTrend}>
                  <defs>
                    <linearGradient id="scrapeCountFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    strokeWidth={2.5}
                    fill="url(#scrapeCountFill)"
                  />
                </AreaChart>
              </ChartContainer>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="wp-card animate-rise-delay-2 rounded-3xl p-5 md:p-6 xl:col-span-1">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Geo Mix</p>
                  <h2 className="wp-heading mt-1 text-2xl font-semibold text-slate-900">Country composition</h2>
                </div>
                <Globe2 className="h-5 w-5 text-[#2271b1]" />
              </div>

              <ChartContainer config={{ count: { label: 'Products', color: '#2271b1' } }} className="h-[260px] w-full aspect-auto">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={countrySeries}
                    dataKey="count"
                    nameKey="country"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {countrySeries.map((entry, index) => (
                      <Cell key={entry.country} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="mt-3 space-y-2">
                {countrySeries.map((item, index) => (
                  <div key={item.country} className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                      {item.country}
                    </span>
                    <span className="font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="wp-card animate-rise-delay-2 rounded-3xl p-5 md:p-6 xl:col-span-1">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Data Health</p>
                  <h2 className="wp-heading mt-1 text-2xl font-semibold text-slate-900">Completeness radar</h2>
                </div>
                <ShieldCheck className="h-5 w-5 text-[#2271b1]" />
              </div>

              <ChartContainer config={qualityChartConfig} className="h-[300px] w-full aspect-auto">
                <RadarChart data={analytics.qualitySeries} outerRadius={95}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Radar dataKey="fill" stroke="var(--color-fill)" fill="var(--color-fill)" fillOpacity={0.35} />
                </RadarChart>
              </ChartContainer>
            </Card>

            <Card className="wp-card animate-rise-delay-2 rounded-3xl p-5 md:p-6 xl:col-span-1">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Analyst Notes</p>
                  <h2 className="wp-heading mt-1 text-2xl font-semibold text-slate-900">Instant takeaways</h2>
                </div>
                <Sparkles className="h-5 w-5 text-[#2271b1]" />
              </div>

              <div className="space-y-3">
                {insights.map((insight) => {
                  const Icon = insight.icon;
                  return (
                    <div
                      key={insight.title}
                      className="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-1.5 flex items-center gap-2 text-slate-500">
                        <Icon className="h-4 w-4 text-[#2271b1]" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{insight.title}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{insight.value}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
