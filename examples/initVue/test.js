const data = {
  name: '霍春阳',
  age: 24
}

function render () {
  return document.write(`姓名：${data.name}; 年龄：${data.age}`)
}

function walk (data) {
  for (const key in data) {
    let dep = []
    let val = data[key]
    const nativeString = Object.prototype.toString.call(val)
    if (nativeString === "[object Object]") {
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
        dep.forEach(fn => {
          fn()
        })
      }
    })
  }
}


walk(data)


let Target = null
function $watch (exp, fn) {
  Target = fn
  // data['b.c']
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



// 调用

$watch(render, render)



// $watch('b.c', () => {
//   console.log('b.c 被修改了');
// })

