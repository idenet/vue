const data = {
  a: 1,
  b: 2,
  c: {
    d: 5
  }
}


function walk (data) {
  for (const key in data) {
    let val = data[key]
    let dep = []
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
        dep.forEach(fn => fn())
      }
    })
  }
}

walk(data)

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
      return
    })
  }
  data[exp]

}

function render () {
  return document.write(`我是a ${data.a}`)
}

$watch(render, render)

$watch('a', () => {
  console.log('a 被触发了');
})
