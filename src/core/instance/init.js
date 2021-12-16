/* @flow */

import config from '../config'
import { extend, formatComponentName, mergeOptions } from '../util/index'
import { mark, measure } from '../util/perf'
import { initEvents } from './events'
import { initInjections, initProvide } from './inject'
import { callHook, initLifecycle } from './lifecycle'
import { initProxy } from './proxy'
import { initRender } from './render'
import { initState } from './state'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    // 开始性能检测
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 确定当前是 Vue实例
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 创建组件时才会用到
      initInternalComponent(vm, options)
    } else {
      // 合并选项并赋值给 $options
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        // 用户传进来的options 或者为空
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 设置渲染函数的作用域代理，其目的是为我们提供更好的提示信息
      initProxy(vm)
    } else {
      // 在生产环境中通过，vue-loader 编译后的template 是不 使用 with 语句包裹的 js代码，
      // 所以不需要proxy 的has 去代理 with中的 属性
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化生命周期
    initLifecycle(vm)
    // 初始化事件
    initEvents(vm)
    // 初始化render
    initRender(vm)
    // 生命周期钩子
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    // initProps  initMethods initData initComputed initWatch
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    // 结束性能检测
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

/**
 * Vue.options = {
	components: {
		KeepAlive
		Transition,
    	TransitionGroup
	},
	directives:{
	    model,
        show
	},
	filters: Object.create(null),
	_base: Vue
}
 */
// 解析构造函数的 options
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // Vue.otpions | 子类options const Sub = Vue.extend() const s = new Sub()
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
