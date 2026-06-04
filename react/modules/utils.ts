/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/naming-convention */
import {
  CartItem,
  Impression,
  Order,
  ProductOrder,
  Seller,
} from '../typings/events'
import { customDimensions } from './customDimensions'

export function getSeller(sellers: Seller[]) {
  const defaultSeller = sellers.find(seller => seller.sellerDefault)

  if (!defaultSeller) {
    return sellers[0]
  }

  return defaultSeller
}

export function getPrice(seller: Seller) {
  let price

  try {
    price = seller.commertialOffer.Price
  } catch {
    price = undefined
  }

  return price
}

function formatCategoriesHierarchy(
  categories: { [key: string]: string },
  value: string,
  index: number
) {
  const categoryHierarchyNumber = index + 1
  const isFirstCategory = categoryHierarchyNumber === 1
  const key = `item_category${isFirstCategory ? '' : categoryHierarchyNumber}`

  categories[key] = value
}

export const slugify = (text: string) => {
  return text.replace(/\s+/g, '-')
}

export function isProductPage() {
  return window.__RUNTIME__?.page === 'store.product'
}

export function getCategoriesWithHierarchy(categoriesArray: string[]) {
  if (!categoriesArray || !categoriesArray.length) return

  const categoryString = getCategory(categoriesArray)
  const categories = splitIntoCategories(categoryString)

  if (!categories || !categoryString) return {}

  const categoriesFormatted: { [key: string]: string } = {}

  if (!categories || !categories.length) {
    formatCategoriesHierarchy(categoriesFormatted, categoryString, 0)
  } else {
    categories.forEach((category, index) => {
      formatCategoriesHierarchy(categoriesFormatted, category, index)
    })
  }

  if (!categoriesFormatted.item_category3) {
    categoriesFormatted.item_category3 = 'N/A'
  }

  if (!categoriesFormatted.item_category4) {
    categoriesFormatted.item_category4 = 'N/A'
  }

  return categoriesFormatted
}

function getCategoriesHierarchyByKey(
  categories: Record<string, string> | null,
  keysArray?: string[]
) {
  if (!keysArray || !keysArray.length || !categories) return []
  const categoriesFormatted: string[] = []
  const categoriesHierarchyFormatted: Record<string, string> = {}

  keysArray.forEach(key => {
    if (key) categoriesFormatted.push(categories[key])
  })

  categoriesFormatted.forEach((category, index) => {
    formatCategoriesHierarchy(categoriesHierarchyFormatted, category, index)
  })

  if (!categoriesHierarchyFormatted.item_category3) {
    categoriesHierarchyFormatted.item_category3 = 'N/A'
  }

  if (!categoriesHierarchyFormatted.item_category4) {
    categoriesHierarchyFormatted.item_category4 = 'N/A'
  }

  return categoriesHierarchyFormatted
}

export function getQuantity(seller: Seller) {
  const isAvailable = seller.commertialOffer.AvailableQuantity > 0

  return isAvailable ? 1 : 0
}

export function getImpressions(impressions: Impression[], listName = 'N/A') {
  if (!impressions || !impressions.length) return []

  const formattedImpressions = impressions.map(impression => {
    const { product, position } = impression
    const {
      productId,
      productReference,
      sku,
      brand,
      categories,
      categoryTree,
    } = product

    let { itemId, seller, sellers, referenceId, name } = sku

    if (!seller?.sellerDefault && sellers?.length > 1) {
      const defaultSeller = sellers.find(s => s.sellerDefault)

      if (defaultSeller) {
        seller = defaultSeller
      }
    }

    const price = getPrice(seller)
    const discount = getDiscount(seller)
    const quantity = getQuantity(seller)

    let productCategories = categories

    if (!productCategories && categoryTree?.length) {
      let newCategories = '/'

      categoryTree.forEach(category => {
        newCategories += `${category.name}/`
      })
      productCategories = [newCategories]
    }

    const categoriesHierarchy = getCategoriesWithHierarchy(productCategories)

    return {
      item_id: productId,
      item_name: name,
      item_variant: itemId,
      item_brand: brand,
      index: position,
      item_list_name: listName,
      item_list_id: slugify(listName),
      discount: discount ?? 'N/A',
      coupon: 'N/A',
      price,
      quantity,
      affiliation: seller.sellerName,
      ...categoriesHierarchy,
      ...customDimensions({
        productReference,
        skuReference: referenceId?.Value,
        skuName: name,
        quantity,
      }),
    }
  })

  return formattedImpressions
}

export function getDiscount(seller: Seller) {
  if (!seller.commertialOffer.PriceWithoutDiscount) return 0

  const { commertialOffer } = seller
  const { Price, PriceWithoutDiscount } = commertialOffer

  if (PriceWithoutDiscount <= Price) return 0

  let price

  try {
    price = PriceWithoutDiscount - Price
  } catch {
    price = 0
  }

  return price
}

export function getCategory(rawCategories: string[]) {
  if (!rawCategories || !rawCategories.length) {
    return
  }
  /*
    Example of rawCategories:
    [
      "/PC, gaming si accesorii/Robotica si accesorii/Kit Roboti/",
      "/PC, gaming si accesorii/Robotica si accesorii/",
      "/PC, gaming si accesorii/"
    ]
   Sometimes, on production, the categories are reversed, so we sort them by length
   to ensure we always get the most specific category.
  */

  const sortedByLength = rawCategories.sort((a, b) => b.length - a.length)

  return removeStartAndEndSlash(sortedByLength[0])
}

// Transform this: "/Apparel & Accessories/Clothing/Tops/"
// To this: "Apparel & Accessories/Clothing/Tops"
function removeStartAndEndSlash(category?: string) {
  return category?.replace(/^\/|\/$/g, '')
}

function splitIntoCategories(category?: string) {
  if (!category) return

  const splitted = category.split('/')

  return splitted
}

export function getPurchaseObjectData(order: Order) {
  return {
    affiliation: order.transactionAffiliation,
    coupon: order.coupon ? order.coupon : null,
    id: order.orderGroup,
    revenue: order.transactionTotal,
    shipping: order.transactionShipping,
    tax: order.transactionTax,
  }
}

export function getProductNameWithoutVariant(
  productNameWithVariant: string,
  variant: string
) {
  const indexOfVariant = productNameWithVariant.lastIndexOf(variant)

  if (indexOfVariant === -1 || indexOfVariant === 0) {
    return productNameWithVariant
  }

  return productNameWithVariant.substring(0, indexOfVariant - 1) // Removes the variant and the whitespace
}

function formatPurchaseProduct(product: ProductOrder) {
  const {
    name,
    skuName,
    id,
    brand,
    sku,
    price,
    quantity,
    categoryTree,
    productRefId,
    skuRefId,
    seller,
  } = product

  const productName = getProductNameWithoutVariant(name, skuName)

  const item: AnalyticsEcommerceCustomProduct = {
    item_id: id,
    item_name: productName,
    item_brand: brand,
    item_variant: sku,
    price,
    quantity,
    affiliation: seller,
    ...getCategoriesWithHierarchy([categoryTree.join('/')]),
    ...customDimensions({
      productReference: productRefId,
      skuReference: skuRefId,
      skuName,
      quantity,
    }),
  }

  // Enhance with data from localStorage that might be missing
  const localStorageItems = localStorage.getItem('gtm_products')

  let items: AnalyticsEcommerceCustomProduct[] = []

  if (localStorageItems) {
    try {
      items = JSON.parse(localStorageItems)
    } catch (e) {
      // do nothing
    }
  }

  const lcItem = items.find(
    (i: AnalyticsEcommerceCustomProduct) => i.item_variant === sku
  )

  if (lcItem) {
    item.item_list_name = lcItem.item_list_name
    item.item_list_id = lcItem.item_list_id
    item.index = lcItem.index
  }

  return item
}

export function formatCartItemsAndValue(
  cartItems: CartItem[],
  options?: {
    dividePrice: boolean
  }
): { items: AnalyticsEcommerceCustomProduct[]; totalValue: number } {
  let totalValue = 0.0

  if (!cartItems.length) return { items: [], totalValue }

  const items: AnalyticsEcommerceCustomProduct[] = cartItems.map(
    (item: CartItem) => {
      const productName = item.variant ?? item.name

      const shouldFormatPrice = item.priceIsInt ?? options?.dividePrice

      const formattedPrice = shouldFormatPrice ? item.price / 100 : item.price

      // The information necessary to calculate the discount is not available for the add_to_cart event
      // so we get it from the upper event from the datalayer.
      const previousDataLayerProduct = getProductsDataFromDataLayer(
        item.skuId,
        isProductPage() ? 'view_item' : 'select_item'
      )

      const {
        discount = 0,
        item_list_name = 'N/A',
        item_list_id = 'N/A',
        index = 'N/A',
      } = previousDataLayerProduct ?? {}

      const itemBrand = item.brand ? item.brand : item.additionalInfo?.brandName

      const categoryIds = splitIntoCategories(item.productCategoryIds)
      const formattedCategories = item.category
        ? getCategoriesWithHierarchy([item.category])
        : getCategoriesHierarchyByKey(item.productCategories, categoryIds)

      totalValue += formattedPrice * item.quantity

      // For the remove_from_cart event, the affiliation is not available, so we try and get it from the add_to_cart event
      let affiliation = item.sellerName

      if (!affiliation) {
        const previousDataLayerAddedProduct = getProductsDataFromDataLayer(
          item.skuId,
          'add_to_cart'
        )

        if (previousDataLayerAddedProduct?.affiliation) {
          affiliation = previousDataLayerAddedProduct.affiliation
        }
      }

      return {
        item_id: item.productId,
        item_brand: itemBrand ?? 'N/A',
        item_name: productName,
        item_variant: item.skuId,
        quantity: item.quantity,
        price: formattedPrice,
        affiliation: affiliation ?? 'N/A',
        coupon: 'N/A',
        discount: discount || 'N/A',
        item_list_name,
        item_list_id,
        index,
        ...formattedCategories,
        ...customDimensions({
          productReference: item.productRefId,
          skuReference: item.referenceId,
          skuName: item.variant,
          quantity: item.quantity,
        }),
      }
    }
  )

  return { items, totalValue }
}

export function getPurchaseItems(orderProducts: ProductOrder[]) {
  return orderProducts.map(formatPurchaseProduct)
}

// Utility function to access nested object properties using a string path
// Example: getNestedProperty(obj, 'ecommerce.items') or getNestedProperty(obj, 'user.profile.name')
export function getNestedProperty(
  obj: Record<string, unknown>,
  path: string
): unknown {
  if (!obj || !path) return undefined

  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && current !== null) {
      return (current as Record<string, unknown>)[key]
    }

    return undefined
  }, obj)
}

export function getProductsDataFromDataLayer(
  skuId: string,
  eventName: string
): AnalyticsEcommerceCustomProduct | null {
  const previousDataLayerEvent = window.dataLayer
    .reverse()
    .find(({ event }: { event: string }) => event === eventName)

  if (!previousDataLayerEvent) {
    return null
  }

  const productsData = getNestedProperty(
    previousDataLayerEvent,
    'ecommerce.items'
  )

  if (!productsData || !Array.isArray(productsData)) {
    return null
  }

  return productsData.find((product: { item_variant: string }) => {
    return product.item_variant === skuId
  })
}

export function updateProductsInLocalStorage(
  items: AnalyticsEcommerceCustomProduct[]
) {
  const existingProductsStr = localStorage.getItem('gtm_products')

  let newProducts: AnalyticsEcommerceCustomProduct[] = []

  try {
    if (existingProductsStr) {
      newProducts = JSON.parse(existingProductsStr)
    }
  } catch (e) {
    // do nothing
  }

  items.forEach(item => {
    const existingProductIndex = newProducts.findIndex(
      existingItem => existingItem.item_variant === item.item_variant
    )

    if (existingProductIndex !== -1) {
      newProducts[existingProductIndex] = item
    } else {
      newProducts.push(item)
    }
  })
  localStorage.setItem('gtm_products', JSON.stringify(newProducts))
}

export function getCustomProfileFieldValueAsMs(
  fields: Array<{ key: string; value: string }>,
  key: string
) {
  const date = fields.find(item => item.key === key)

  if (!date?.value) {
    return 0
  }

  return new Date(date.value).getTime()
}

/*
  If the current user doesn't have updatedIn on the profile, we check if the account was created in the last 30 minutes.
  If it has, because it's possible that he has logged out and logged in again, we only check if it happened in the last 5 minute.
*/
const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000

export function getIsRegister(
  profileCreatedIn: number,
  profileUpdatedIn: number
) {
  const now = new Date().getTime()

  return profileUpdatedIn
    ? now - profileCreatedIn < FIVE_MINUTES_IN_MS
    : now - profileCreatedIn < THIRTY_MINUTES_IN_MS
}

// eslint-disable-next-line max-params
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  timeout = 30000
): Promise<any> {
  let lastError = ''

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const jsonResponse = await response.json()

      if (!response.ok || jsonResponse.errors) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return jsonResponse
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      lastError = errorMessage

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = 2 ** (attempt - 1) * 1000

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  const finalError = `Fetch failed after ${maxRetries} attempts for ${url}: ${lastError}`

  throw new Error(finalError)
}
