const data = {
  a: 1,
  b: 2,
  c: {
    d: 3
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
        dep.push(Target)
        return val
      },
      set (newval) {
        if (newval === val) return
        val = newval
        dep.forEach(fn=> fn())
      }
    })
  }
}

walk(data)


let Target = null

function $watch (exp, fn) {
  Target = fn
  // exp c.d --> data[c][d]
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


function render () {
  return document.write(`a 被修改了${data.a}`)
}

$watch(render, render)


$watch('a', () => {
  console.log('a 被监听了');
})
$watch('c.d', () => {
  console.log('a 被监听了');
})
$watch('b', () => {
  console.log('b 被监听了');
})
