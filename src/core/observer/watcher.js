/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    // 求值表达式
    expOrFn: string | Function,
    // 回调
    cb: Function,
    // 选项
    options?: ?Object,
    // 是否是渲染watcher
    isRenderWatcher?: boolean
  ) {
    // 该观察者属于哪一个组件
    this.vm = vm
    if (isRenderWatcher) {
      // 将当前渲染watcher 复制给 实例的_watcher
      vm._watcher = this
    }
    // 不管是不是 渲染watcher。 当前this都会复制给_watchers
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep // 是否使用深度观测
      this.user = !!options.user // 用来标识当前观察者实例对象是 开发者定义的 还是 内部定义的
      this.lazy = !!options.lazy // 惰性watcher  第一次不请求
      this.sync = !!options.sync // 当数据变化的时候是否同步求值并执行回调
      this.before = options.before // 在触发更新之前的 调用回调
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb // 回调
    this.id = ++uid // uid for batching 唯一标识
    this.active = true // 激活对象
    this.dirty = this.lazy // for lazy watchers
    // 实现避免重复依赖
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    // ---
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      // expOrFn
      /**
       * const expOrFn = function () {
           return this.obj.a
        }
       */
      this.getter = expOrFn
    } else {
      // 处理表达式 obj.a
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        // Watcher 只接受简单的点(.)分隔路径，如果你要用全部的 js 语法特性直接观察一个函数即可
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 当时计算属性 构造函数是不求值的
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 依赖收集 求值 1. 除非get 拦截器 2. 获得被观察目标的值
   *
   */
  get () {
    // 给Dep.target 赋值 Watcher
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // v执行函数求值  function anonymous()  {width(this){return _c('div', {},[_v(_s(name))])}} this.name  被拦截器读取
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // todo 深度观测
      /**
       * watch: {
       *  'a.b'() {}
       * }
       *
       * 注意value值是 a.b
       */
      if (this.deep) {
        traverse(value)
      }
      // 清除当前 target
      popTarget()
      // 清空依赖
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 避免依赖的重复收集
   * 比如
   * <div id="demo">
      {{name}}{{name}}
    </div>
    如果不做唯一id的判断
    每个name都会进行一次依赖收集
    因此 newDepIds 总是当前所收集到的值
    depIds 总是之前收集到的值
   */
  addDep (dep: Dep) {
    const id = dep.id
    // * 在一次求值中 查看这个唯一id 是否在set中已存在，
    if (!this.newDepIds.has(id)) {
      // 不存在就放进 set里面 然后吧 dep也放到 newdeps里
      // 每次重新求值， newDepIds 都会被清空
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      // * 在 多次求值 中避免收集重复依赖的
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    // 这里就是 移除废弃观察者

    // 首先获取上次dep的长度
    let i = this.deps.length
    while (i--) {
      // 有时候新的已经不监听旧的属性了，这时候就需要删除旧属性的watcher
      // 循环查找dep在newdepids是否不存在
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        // 将该观察者对象从Dep实例中移除
        dep.removeSub(this)
      }
    }
    // 将 newDepIds 赋值给 depIds
    // 清空 newdepids
    // 将 newdeps 赋值给 deps
    // 将 newdeps设置为0
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    // 计算属性值是不参与更新的
    if (this.lazy) {
      this.dirty = true
      // 是否同步更新变化
    } else if (this.sync) {
      this.run()
    } else {
      // 将当前观察者对象放到一个异步更新队列
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    // 观察者是否处于激活状态
    if (this.active) {
      // 重新求值
      const value = this.get()
      // 在渲染函数中 这里永远不会被执行，因为 两次值都是 undefiend
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        // 这里当值相等，可能是对象引用，值改变 引用还是同一个，所以判断是否是对象，
        // 是的话也执行
        isObject(value) ||
        this.deep
      ) {
        // *在渲染watcher中 cb 为空函数
        // set new value
        // 保存旧值， set 新值
        const oldValue = this.value
        this.value = value
        // 观察者是开发者定义 即 watch  $watch
        if (this.user) {
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      // 在组件没有被销毁时，移除所有的watcher对象
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      // 一个观察者可以同时观察多个属性，所以要移除该观察者观察的所有属性
      while (i--) {
        this.deps[i].removeSub(this)
      }
      // 解除观察者的激活状态
      this.active = false
    }
  }
}
