/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    // 实例化依赖框, 这个框不属于某个数据
    this.dep = new Dep()
    //依赖计数
    this.vmCount = 0
    // 创建一个不可枚举的 __ob__ 对象，该对象是 Observer本身

    def(value, '__ob__', this)
    // 数组处理方式
    if (Array.isArray(value)) {
      // 判断当前环境是否可以使用 __proto__
      if (hasProto) {
        // 把数组实例与代理原型或与代理原型中定义的函数联系起来，从而拦截数组变异方法
        // 设置value.__proto__ 为 arrayMethods
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      // 对象处理方式
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   * 深度观测 递归调用 解决嵌套内数组的响应
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 返回 value.__ob__
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果观测对象不是 对象或者 vNode 直接return
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // value自身是否有 __ob__ 并且 是 Observer 则已经是响应式数据
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    // 判断开关
    shouldObserve &&
    // 是否是服务端判断
    !isServerRendering() &&
    // 对象必须可扩展，一下几个方法会变为不可扩展 Object.freeze()  Object.preventExtensions() Object.seal()
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    // 避免对vue实例对象进行观测
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 将数据对象的数据属性转换为访问器属性
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 依赖框
  const dep = new Dep()
  // 获取对象中已存在的描述对象
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 不可配置则直接返回
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  // 原本拥有getter就不需要深度监听了 在做属性校验的监听的时候，不需要set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // 深度观测

  // {
  //   a: 1,
  //     __ob__ : Observer,
  //     b: {
  //     3,
  //     __ob__ : Observer,
  //   }
  // }
  // childOb  = data.a.__ob__
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    get: function reactiveGetter () {
      // 如果存在自定义getter 执行自定义的
      const value = getter ? getter.call(obj) : val
      // 要被收集的依赖
      if (Dep.target) {
        // 通过闭包引用了 依赖框
        // 每一个数据字段都通过闭包引用着属于自己的 dep 常量
        dep.depend()
        if (childOb) {
          /**
           * 在 a: {b: 1}中我们已经知道每个属性下面都会有一个 __ob__属性
           * 而childOb 就是这个 __ob__属性
           * 也就是说 我们 还在 __ob__的dep里面再添加了一个依赖，
           * 为什么？
           * 因为 defineproperty 无法监听属性添加的响应式
           * 这是 vue.set 和 vue.delete的原理
           */
          childOb.dep.depend()
          // 解决 get的时候 value 仍旧是一个数组的时候 去做响应式依赖
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      // 拿到属性原来的值
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 处理 NaN 问题
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        // 用来打印辅助信息 在 initRender中有使用
        customSetter()
      }
      // #7981: for accessor properties without setter
      // 同理
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 同上
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 如果 set 函数的第一个参数是 undefined 或 null 或者是原始类型值，那么在非生产环境下会打印警告信息
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 判断 target 和 key
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  // 如果是新添加属性
  const ob = (target: any).__ob__
  //当使用 Vue.set/$set 函数为根数据对象添加属性时，是不被允许的。
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果不存在 __ob__ 他就不是一个响应式，所以直接赋值
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  // 和上面一样 都是 用ob去触发响应式的
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 * 数组是没发给下标做访问器属性的，所以需要dependArray去一个个做依赖收集
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
