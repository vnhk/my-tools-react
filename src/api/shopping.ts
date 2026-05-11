import client from './client'

export interface PriceDto {
  date: string | null
  formattedDate: string | null
  price: number | null
}

export interface ProductDto {
  id: number
  name: string
  shop: string
  offerLink: string | null
  imgSrc: string | null
  categories: string[]
  minPrice: PriceDto | null
  maxPrice: PriceDto | null
  avgPrice: number | null
  discount: number | null
  prices: PriceDto[]
}

export interface SearchResponse {
  allFound: number
  page: number
  pageSize: number
  allPages: number
  currentFound: number
  items: ProductDto[]
}

export interface ProductAlertDto {
  id?: number
  name: string
  priceMin: number | null
  priceMax: number | null
  discountMin: number | null
  discountMax: number | null
  productName: string | null
  productCategories: string[]
  emails: string[]
}

export interface ShopConfigDto {
  id?: number
  shopName: string
  baseUrl: string | null
}

export interface ProductConfigDto {
  id?: number
  name: string
  url: string | null
  minPrice: number | null
  maxPrice: number | null
  scrapTime: string | null
  categories: string[]
  shopId: number | null
  shopName: string | null
}

export interface ScrapAuditDto {
  id: number
  date: string | null
  savedProducts: number
  productDetails: string | null
}

export const shoppingApi = {
  searchProducts: (params: {
    category?: string; shop?: string; name?: string; page?: number; size?: number
  }) => client.get<SearchResponse>('/shopping/products', { params }),

  getProduct: (id: number) =>
    client.get<SearchResponse>(`/shopping/products/${id}`),

  getCategories: () =>
    client.get<string[]>('/shopping/products/categories'),

  getBestOffers: (params: {
    discountMin?: number; discountMax?: number; months?: number;
    categories?: string[]; shop?: string; name?: string;
    prevPriceMin?: number; prevPriceMax?: number;
    page?: number; size?: number
  }) => client.get<SearchResponse>('/shopping/best-offers', {
    params,
    paramsSerializer: (p) => {
      const sp = new URLSearchParams()
      for (const [k, v] of Object.entries(p)) {
        if (v === undefined || v === null || v === '') continue
        if (Array.isArray(v)) v.forEach((item) => sp.append(k, item))
        else sp.append(k, String(v))
      }
      return sp.toString()
    },
  }),

  getProductAlerts: () => client.get<ProductAlertDto[]>('/shopping/product-alerts'),
  createProductAlert: (dto: ProductAlertDto) => client.post<ProductAlertDto>('/shopping/product-alerts', dto),
  updateProductAlert: (id: number, dto: ProductAlertDto) => client.put<ProductAlertDto>(`/shopping/product-alerts/${id}`, dto),
  deleteProductAlert: (id: number) => client.delete(`/shopping/product-alerts/${id}`),

  getShopConfigs: () => client.get<ShopConfigDto[]>('/shopping/shop-configs'),
  createShopConfig: (dto: ShopConfigDto) => client.post<ShopConfigDto>('/shopping/shop-configs', dto),
  updateShopConfig: (id: number, dto: ShopConfigDto) => client.put<ShopConfigDto>(`/shopping/shop-configs/${id}`, dto),
  deleteShopConfig: (id: number) => client.delete(`/shopping/shop-configs/${id}`),

  getProductConfigs: (shopId?: number) => client.get<ProductConfigDto[]>('/shopping/product-configs', { params: shopId ? { shopId } : {} }),
  createProductConfig: (dto: ProductConfigDto) => client.post<ProductConfigDto>('/shopping/product-configs', dto),
  updateProductConfig: (id: number, dto: ProductConfigDto) => client.put<ProductConfigDto>(`/shopping/product-configs/${id}`, dto),
  deleteProductConfig: (id: number) => client.delete(`/shopping/product-configs/${id}`),

  getScrapAudits: (date?: string) => client.get<ScrapAuditDto[]>('/shopping/scrap-audits', { params: date ? { date } : {} }),
  deleteScrapAudit: (id: number) => client.delete(`/shopping/scrap-audits/${id}`),
}
