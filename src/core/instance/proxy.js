/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

let initProxy

if (process.env.NODE_ENV !== 'production') {
  // 浏览器内置
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt,' +
    'require' // for Webpack/Browserify
  )

  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  const warnReservedPrefix = (target, key) => {
    // 在渲染的时候引用了 key，但是在实例对象上并没有定义 key 这个属性或方法”
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals. ' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    // isBuiltInModifier 函数用来检测是否是内置的修饰符
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    // 为 config.keyCodes 设置 set 代理，防止内置修饰符被覆盖
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }
  /**
   * 查看 mdn中 关于 proxy has的操作可以发现 它拦截以下操作
   * 属性查询： foo in proxy
   * 继承属性查询 foo in Object.create(proxy)
   * with检查 with(proxy){foo}
   * Relfect.has()
   */
  const hasHandler = {
    has (target, key) {
      // has 常量是真实经过 in 运算符得来的结果
      const has = key in target
      // 如果 key 在 allowedGlobals 之内，或者 key 是以下划线 _ 开头的字符串，则为真
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
       // 如果 has 和 isAllowed 都为假，使用 warnNonPresent 函数打印错误
      // -!has  你访问了一个没有定义在实例对象上(或原型链上)的属性
      // -!isAllowed 虽然不在实例对象上(或原型链上)的属性，但如果你访问的是全局对象
      if (!has && !isAllowed) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return has || !isAllowed
    }
  }

  const getHandler = {
    get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return target[key]
    }
  }

  initProxy = function initProxy (vm) {
    if (hasProxy) {
      // determine which proxy handler to use
      // options 就是 vm.$options 的引用
      const options = vm.$options
      // handlers 可能是 getHandler 也可能是 hasHandler // options.render._withStripped 测试代码中才会出现
      // 所以一般只会是 hashandler
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      // 代理 vm 对象
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
