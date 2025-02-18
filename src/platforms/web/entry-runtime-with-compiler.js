/* @flow */

import config from 'core/config'
import { cached, warn } from 'core/util/index'
import { mark, measure } from 'core/util/perf'
// 从 ./compiler/index.js 文件导入 compileToFunctions
import { compileToFunctions } from './compiler/index'
import Vue from './runtime/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'
import { query } from './util/index'

// 根据 id 获取元素的 innerHTML
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 缓存 runtime/index.js 中的 $mount 方法
const mount = Vue.prototype.$mount
// 重写 Vue.prototype.$mount 方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 获取挂载点的dom
  el = el && query(el)

  /* istanbul ignore if */
  //挂载点的本意是 组件挂载的占位，它将会被组件自身的模板 替换掉，而 <body> 元素和 <html> 元素显然是不能被替换掉的
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  // 使用 template 或 el 选项构建渲染函数
  if (!options.render) {
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      /**
        * 获取元素的 outerHTML
      */
      template = getOuterHTML(el)
    }
    // 可能存在template为空 拿到的数据为空
    if (template) {
      /* istanbul ignore if */
      //统计编译器性能
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 通过compileToFunction 生成 render 和 静态render
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        // 在模板编译的时候对属性的换行符做处理
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      // 统计编译器性能
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 调用mount
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    // outhtml可能不存在，因为svg， 所以 创建一个div包裹
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}
// 在 Vue 上添加一个全局API `Vue.compile` 其值为上面导入进来的 compileToFunctions
Vue.compile = compileToFunctions

export default Vue
