const data = {
  a: 1,
  b: 2,
  c: {
    d: 2
  }
}


function walk (data) {
  for (let key in data) {
    let dep = []
    let val = data[key]
    const nativeString = Object.prototype.toString.call(val)
    if (nativeString === '[object Object]') {
      walk(val)
    }
    Object.defineProperty(data, key, {
      get () {
        dep.push(Target)
        return val
      },
      set (newval) {
        if (newval === val) return
        val = newval
        dep.forEach(fn=>fn())
      }
    })
  }
}

walk(data)


// 又一个全局的Target 来缓存fn
let Target = null
function $watch (exp, fn) {
  Target = fn
  let patharr,
    obj = data
  if (typeof exp === 'function') {
    exp()
    return
  }
  if (/\./.test(exp)) {
    patharr = exp.split('.')
    patharr.forEach(p => {
      obj = obj[p]
    })
    return
  }
  data[exp]
}

$watch('c.d', () => {
  console.log('c.d 被触发了');
})

$watch('a', () => {
  console.log('a 被触发了');
})

function render () {
  document.write(JSON.stringify(data))
}

$watch(render, render)

const mutationMethods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

const arrayproto = Array.prototype

let arraymethod = Object.create(Array.prototype)

mutationMethods.forEach(method => {
  arraymethod[method] = function (...args) {
    const result = arrayproto[method].aplly(this, args)

    console.log('执行了代理函数');

    return result
  }
})


let sayhello = function () {
  console.log('hello');
}

let cach = sayhello

sayhello = function () {
  console.log('ctnm');
  cach()
}

