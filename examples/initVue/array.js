// 面向切面变成

let sayhello = function () {
  console.log('hello');
}

// 先说 hi

let cachesay = sayhello

sayhello = function () {
  console.log('hi');
  cachesay()
}

sayhello()


const mutationMethods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

const arrayMethods = Object.create(Array.prototype)

const arrayprototype = Array.prototype

mutationMethods.forEach(method => {
  arrayMethods[method] = function (...args) {
    const result = arrayprototype[method].apply(this, args)

    console.log(`执行了代理原型的 ${method} 函数`)

    return result
  }
})
