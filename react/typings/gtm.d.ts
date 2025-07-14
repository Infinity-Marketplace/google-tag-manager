interface AnalyticsEcommerceProduct {
  id: string
  name: string
  category: string
  brand: string
  variant: string
  price: number
  quantity: number
  dimension1: string
  dimension2: string
  dimension3: string
}

interface AnalyticsEcommerceCustomProduct {
  dimension1: string
  dimension2: string
  dimension3: string
  dimension4: string
  item_id: string
  item_variant: string
  item_brand: string
  item_name: string
  item_category?: string
  item_category2?: string
  item_category3?: string
  item_category4?: string
  price: number
  discount?: number | 'N/A'
  quantity: number
  item_list_name?: string
  item_list_id?: string
  index?: number | string
  affiliation?: string
}
