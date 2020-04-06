// Import our library
const { Distributed } = require('../')

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