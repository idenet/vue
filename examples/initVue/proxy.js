// 首先我们要实现什么

// const ins = new Vue({
//   data: {
//     a: 1
//   }
// })

// ins.$watch('a', () => {
//   console.log('修改了 a');
// })


// const data = {
//   a: 1,
//   b: 2
// }

const data = {
  a: 1
}

// for (const key in data) {
//   let dep = []
//   let val = data[key]
//   Object.defineProperty(data, key, {
//     get () {
//       // 收集依赖
//       dep.push(Target)
//       return val
//     },
//     set (newVal, val) {
//       // 触发依赖
//       // 如果值没有变什么都不做
//       if (newVal === val) return
//       // 使用新值替换旧值
//       val = newVal
//       dep.forEach(fn => fn())
//     }
//   })
// }

function walk (data) {
  for (const key in data) {
  let dep = []
  let val = data[key]
  // 如果val 还是对象 递归调用walk函数将其转化成访问属性
  const nativeString = Object.prototype.toString.call(val)
  if (nativeString === '[object Object]') {
    walk(val)
  }
  Object.defineProperty(data, key, {
    get () {
      // 收集依赖
      dep.push(Target)
      return val
    },
    set (newVal) {
      // 触发依赖
      // 如果值没有变什么都不做
      if (newVal === val) return
      // 使用新值替换旧值
      val = newVal
      dep.forEach(fn => fn())
    }
  })
}
}

walk(data)

// 全局变量 存放 回调fn
let Target = null
function $watch (exp, fn) {
  // 将 Target 的值设置为 fn
  Target = fn
  let pathArr,
  obj = data
  // 如果 exp 是函数，直接执行该函数
  if (typeof exp === 'function') {
    exp()
    return
  }
  if (/\./.test(exp)) {
    // 将字符串转化成数组
    pathArr = exp.split('.')
    // 使用循环读取到data.a.b
    pathArr.forEach(p => {
      obj = obj[p]
    })
    return
  }
  // 读取字段值，触发 get 函数
  data[exp]
}

$watch('a', () => {
  console.log('第一个依赖')
})
$watch('a', () => {
  console.log('第二个依赖')
})

$watch('b', () => {
  console.log('第三个依赖')
})

$watch('a.b', () => {
  console.log('第四个依赖')
})
