import i18next from 'i18next'
import { getI18n, initReactI18next } from 'react-i18next'
import enUS from './en-us.json'
import zhCN from './zh-cn.json'
import zhTW from './zh-tw.json'
import store from '../../store'

interface CompareResult {
  missingKeys: string[]
  extraKeys: string[]
}
function compareJsonKeys(
  json1: any,
  json2: any,
  path: string = ''
): CompareResult {
  /**
   * 比较两个JSON对象的key差异
   * @param json1 第一个JSON对象
   * @param json2 第二个JSON对象
   * @param path 当前路径（用于嵌套key）
   * @returns { missingKeys: string[], extraKeys: string[] }
   * missingKeys: json1相对于json2缺少的key
   * extraKeys: json1相对于json2多余的key
   */
  const result: CompareResult = { missingKeys: [], extraKeys: [] }

  function recursiveCompare(
    obj1: Record<string, any>,
    obj2: Record<string, any>,
    currentPath: string
  ): void {
    // 确保输入是对象
    if (
      !obj1 ||
      typeof obj1 !== 'object' ||
      !obj2 ||
      typeof obj2 !== 'object'
    ) {
      return
    }

    const keys1 = new Set(Object.keys(obj1))
    const keys2 = new Set(Object.keys(obj2))

    // 找出json1缺少的key（在json2中但不在json1中）
    for (const key of keys2) {
      if (!keys1.has(key)) {
        result.missingKeys.push(currentPath ? `${currentPath}.${key}` : key)
      }
    }

    // 找出json1多余的key（在json1中但不在json2中）
    for (const key of keys1) {
      if (!keys2.has(key)) {
        result.extraKeys.push(currentPath ? `${currentPath}.${key}` : key)
      }
    }

    // 递归比较共同的key
    for (const key of keys1) {
      if (keys2.has(key)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key
        recursiveCompare(obj1[key], obj2[key], newPath)
      }
    }
  }

  recursiveCompare(json1, json2, path)
  return result
}
export const resources = {
  'zh-CN': {
    ...zhCN,
  },
  'zh-TW': {
    ...zhTW,
  },
  'en-US': {
    ...enUS,
  },
}

Object.keys(resources).forEach((k) => {
  Object.keys(resources).forEach((sk) => {
    Object.keys((resources as any)[k]).forEach((ssk) => {
      const keys = compareJsonKeys(
        (resources as any)[k][ssk],
        (resources as any)[sk][ssk]
      )
      if (!(resources as any)[k][ssk] || !(resources as any)[sk][ssk]) {
        console.log('compare_json_keys', k, sk, ssk, keys)
      }
      ;(keys.extraKeys.length || keys.missingKeys.length) &&
        console.log('compare_json_keys', k, sk, ssk, keys)
    })
  })
})

export const languages: Languages[] = Object.keys(resources).map((v: any) => {
  return v
})

export type Languages = keyof typeof resources

export let defaultLanguage: Languages = process.env.DEFAULT_LANGUAGE as any

export const initI18n = (res: typeof resources) => {
  i18next
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      resources: res,
      ns: ['common'],
      defaultNS: 'common',
      fallbackLng: defaultLanguage,
      lng: defaultLanguage,
      // fallbackLng: 'en-US',
      // lng: 'en-US',

      keySeparator: false, // we do not use keys in form messages.welcome

      interpolation: {
        escapeValue: false, // react already safes from xss
      },
    })

  setTimeout(() => {
    const { config } = store.getState()
    config.lang && changeLanguage(config.lang as any)
  })
}
initI18n(resources)

export const i18n = i18next
export const t = i18n.t

export const detectionLanguage = () => {
  if (languages.indexOf(navigator.language as any) >= 0) {
    // getI18n().changeLanguage(navigator.language)
    return navigator.language
  } else {
    switch (navigator.language.substring(0, 2)) {
      case 'ja':
        // getI18n().changeLanguage('en-US')
        return 'ja-JP'
      case 'zh':
        // getI18n().changeLanguage('en-US')
        return 'zh-CN'
      case 'en':
        // getI18n().changeLanguage('en-US')
        return 'en-US'

      default:
        // getI18n().changeLanguage('en-US')
        return 'en-US'
    }
  }
}

export const changeLanguage = (language: any) => {
  // console.log(
  // 	'----------------changeLanguage lang',
  // 	defaultLanguage,
  // 	i18n.language,
  // 	language
  // )
  console.log('SakiI18n store', language)
  process.env.OUTPUT === 'export' && (defaultLanguage = language)
  getI18n().changeLanguage(language)
  // console.log(
  // 	'----------------changeLanguage lang',
  // 	defaultLanguage,
  // 	i18n.language,
  // 	language
  // )
}

export default i18n
