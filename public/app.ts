// TWETQ Vue 3 应用的 TypeScript 版本

// 导入必要的模块
import { createApp, defineComponent } from 'vue';
import { 
  createRouter, 
  createWebHistory,
  RouteRecordRaw 
} from 'vue-router';

// 定义类型
interface StockQuote {
  code: string;
  close: number;
  change: number;
  changePct: number;
  volume: number;
}

interface MarketIndex {
  twse?: any;
  tpex?: any;
  taifex?: any;
}

interface PodcastEpisode {
  id: string;
  title: string;
  date: string;
  summary: string;
}

interface FinancialData {
  stockNo: string;
  financials: any[];
}

// 市场数据获取函数
async function fetchMarketSnapshot(): Promise<{ ok: boolean; quotes?: StockQuote[] }> {
  try {
    const response = await fetch('/api/market/snapshot');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch market snapshot:', error);
    return { ok: false };
  }
}

// 即时报价获取函数
async function fetchRealtimeQuotes(channels: string): Promise<{ ok: boolean; quotes?: StockQuote[] }> {
  try {
    const response = await fetch(`/api/realtime-quotes?channels=${encodeURIComponent(channels)}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch real-time quotes:', error);
    return { ok: false };
  }
}

// 市场指数获取函数
async function fetchMarketIndexes(): Promise<{ ok: boolean; indexes?: MarketIndex }> {
  try {
    const response = await fetch('/api/market/indexes');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch market indexes:', error);
    return { ok: false };
  }
}

// MOPS 财务数据获取函数
async function fetchMopsFinancials(stockNo: string): Promise<{ ok: boolean; financials?: FinancialData }> {
  try {
    const response = await fetch(`/api/mops-financials?stockNo=${encodeURIComponent(stockNo)}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch MOPS financials:', error);
    return { ok: false };
  }
}

// 三大法人雷达数据获取函数
async function fetchInstitutionalRadar(): Promise<{ ok: boolean; data?: any }> {
  try {
    const response = await fetch('/api/institutional-radar');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch institutional radar data:', error);
    return { ok: false };
  }
}

// K线图数据获取函数
async function fetchKline(stockNo: string, months?: number): Promise<{ ok: boolean; klines?: any[] }> {
  try {
    const params = new URLSearchParams();
    params.append('stockNo', stockNo);
    if (months) params.append('months', months.toString());
    
    const response = await fetch(`/api/kline?${params}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch kline data:', error);
    return { ok: false };
  }
}

// Podcast 数据获取函数
async function fetchPodcastEpisodes(): Promise<{ ok: boolean; episodes?: PodcastEpisode[] }> {
  try {
    const response = await fetch('/api/podcast/episodes');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch podcast episodes:', error);
    return { ok: false };
  }
}

// 定义路由
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: defineComponent({
      template: '<div>Home Page</div>'
    })
  },
  {
    path: '/market',
    name: 'Market',
    component: defineComponent({
      template: '<div>Market Page</div>'
    })
  },
  {
    path: '/stock/:code',
    name: 'StockDetail',
    component: defineComponent({
      template: '<div>Stock Detail Page</div>'
    })
  },
  {
    path: '/podcast',
    name: 'Podcast',
    component: defineComponent({
      template: '<div>Podcast Page</div>'
    })
  },
  {
    path: '/institutional',
    name: 'Institutional',
    component: defineComponent({
      template: '<div>Institutional Page</div>'
    })
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
});

// 创建 Vue 应用
const app = createApp({
  // 应用根组件
  template: `
    <div id="app">
      <router-view></router-view>
    </div>
  `,
  
  data() {
    return {
      // 应用状态
      marketSnapshot: null as StockQuote[] | null,
      marketIndexes: null as MarketIndex | null,
      loading: false,
      error: null as string | null
    };
  },
  
  methods: {
    // 加载市场快照
    async loadMarketSnapshot() {
      this.loading = true;
      try {
        const result = await fetchMarketSnapshot();
        if (result.ok && result.quotes) {
          this.marketSnapshot = result.quotes;
        }
      } catch (error) {
        this.error = 'Failed to load market snapshot';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    
    // 加载市场指数
    async loadMarketIndexes() {
      this.loading = true;
      try {
        const result = await fetchMarketIndexes();
        if (result.ok && result.indexes) {
          this.marketIndexes = result.indexes;
        }
      } catch (error) {
        this.error = 'Failed to load market indexes';
        console.error(error);
      } finally {
        this.loading = false;
      }
    }
  },
  
  async mounted() {
    // 页面加载时获取数据
    await this.loadMarketSnapshot();
    await this.loadMarketIndexes();
  }
});

// 使用路由
app.use(router);

// 挂载应用到 DOM 元素
app.mount('#app');

export { 
  fetchMarketSnapshot,
  fetchRealtimeQuotes,
  fetchMarketIndexes,
  fetchMopsFinancials,
  fetchInstitutionalRadar,
  fetchKline,
  fetchPodcastEpisodes
};