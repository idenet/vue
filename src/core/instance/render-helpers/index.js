/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-scoped-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'

export function installRenderHelpers (target: any) {
  target._o = markOnce
  target._n = toNumber
  // 转字符串
  target._s = toString
  // v-for 生成的代码
  target._l = renderList
  // 处理插槽
  target._t = renderSlot
  target._q = looseEqual
  target._i = looseIndexOf
  // 处理静态节点
  target._m = renderStatic
  // 处理过滤器
  target._f = resolveFilter
  target._k = checkKeyCodes
  target._b = bindObjectProps
  // 创建文本vnode
  target._v = createTextVNode
  // 创建空vnode
  target._e = createEmptyVNode
  target._u = resolveScopedSlots
  target._g = bindObjectListeners
  target._d = bindDynamicKeys
  target._p = prependModifier
}
