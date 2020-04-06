# Welcome to Across

**This tool is currently experimental, DO NOT USE UNDER PRODUCTION ENVIRONMENTS JUST YET.**

This small tool was created as a way of processing large data sets in parallel by using Node's worker threads.

With it, most complexity related to multi-threading is abstracted, so you don't need to worry.

Most of this work is more of a proof-of-concept by now.

## Basic Example

```javascript
// Import our library
const { Distributed } = require('across')

// Let's create a sorta large array to process
const numberArray = Array.from(Array(1000000).keys())

// Our "processing" function will calculate the square-root of the numbers and return it as a string.
const iterator = (number) => `sqrt(${ number }) = ${ Math.sqrt(number).toFixed(2) }`

// Now let's process it!
Distributed.map(numberArray, iterator)
  // Since our map returns a Promise, we can wait for its result by using then()
  .then(results => {
    // Do something with them, in this case print them
    console.log('Results:', results)

    // Exit
    process.exit(0)
  })
```

By running the above snippet your function will be executed across multiple threads, by default, matching your CPU's core count.

Sure, with simple loads there's a big chance Node's built-in Array.map **will** be faster, since there will be no overhead regarding threads.

But, if you're doing something really CPU intensive and without any non-blocking options available, then you should expect your code to run much faster.

## More Examples

Under the `examples` directory you should find some other examples for this. One of them is a small speed test using the `bcrypt` NPM module as reference.

This test will show you how long the processing takes by using the module's provided async version and the sync version, both with single-threaded and multi-threaded variations, plus a basic Array.map of it too.

## To-do

- Add new functions such as `filter` and `reduce`
- Allow functions to be chained
- Reduce Worker creation overhead
- Work with Worker Pools