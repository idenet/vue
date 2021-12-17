const data = {
  a: 1,
  b: 4,
  c: {
    d: 5
  }
}

function walk (data) {
  for (const key in data) {
    let dep = []
    let val = data[key]
    const nativeString = Object.prototype.toString.call(val)
    if (nativeString === '[object Object]') {
      walk(val)
    }
    Object.defineProperty(data, key, {
      get () {
        // 监听了a
        dep.push(Target)
        return val
      },
      set (newval) {
        if (newval === val) return
        val = newval
        // 监听a 的设置
        dep.forEach(fn => fn())
      }
    })
  }
}


walk(data)


function render () {
  return document.write(`修改了a ${data.a}`)
}

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


$watch(render, render)


$watch('a', () => {
  console.log('a 被监听了');
})
$watch('b', () => {
  console.log('b 被监听了');
})

$watch('c.d', () => {
  console.log('c.d 被监听了');
})


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

// arrayMethod.__proto__ = Array.prototype
const arrayMethod = Object.create(Array.prototype)


mutationMethods.forEach(method => {
  arrayMethod[method] = function (...args) {
    const result = arrayproto[method].apply(this, args)
    console.log('这是切面');
    return result
  }
})


