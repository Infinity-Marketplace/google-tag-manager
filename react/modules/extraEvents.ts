import push from './push'
import { PixelMessage } from '../typings/events'
import {
  fetchWithRetry,
  getCustomProfileFieldValueAsMs,
  getIsRegister,
} from './utils'

async function emailToHash(email: string) {
  const msgUint8 = new TextEncoder().encode(email)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

async function checkRegisterEvent(userId: string) {
  // We first check if we already checked for the register event, to avoid unnecessary calls to the API
  const hasCheckedRegisterEvent = localStorage.getItem(
    `hasCheckedRegisterEvent_${userId}`
  )

  if (hasCheckedRegisterEvent) {
    return
  }

  // We fetch createdIn and updatedIn from the profile via vtex.store-graphql
  const result: {
    data: { profile: { customFields: Array<{ key: string; value: string }> } }
  } = await fetchWithRetry('/_v/private/graphql/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
      query Profile {
        profile(customFields: "createdIn,updatedIn") @context(provider: "vtex.store-graphql@2.x") {
          customFields {
              key
              value
          }
        }
      }
    `,
    }),
  })

  const customFields = result?.data?.profile?.customFields

  if (!customFields?.length) {
    return
  }

  const createdIn = getCustomProfileFieldValueAsMs(customFields, 'createdIn')

  const updatedIn = getCustomProfileFieldValueAsMs(customFields, 'updatedIn')

  const isRegisterEvent = getIsRegister(createdIn, updatedIn)

  if (isRegisterEvent) {
    push({
      event: 'sign_up',
      userId,
    })
  }

  // We set a flag in localStorage to avoid checking for the register event again
  localStorage.setItem(`hasCheckedRegisterEvent_${userId}`, 'true')
}

export async function sendExtraEvents(e: PixelMessage) {
  switch (e.data.eventName) {
    case 'vtex:pageView': {
      push({
        event: 'pageView',
        location: e.data.pageUrl,
        page: e.data.pageUrl.replace(e.origin, ''),
        referrer: e.data.referrer,
        ...(e.data.pageTitle && {
          title: e.data.pageTitle,
        }),
      })

      return
    }

    case 'vtex:userData': {
      const { data } = e

      if (!data.isAuthenticated) {
        return
      }

      checkRegisterEvent(data.id as string)

      const emailHash = data.email ? await emailToHash(data.email) : undefined

      push({
        event: 'userData',
        userId: data.id,
        emailHash,
      })

      break
    }

    default: {
      break
    }
  }
}
