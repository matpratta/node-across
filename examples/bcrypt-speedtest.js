const { Distributed } = require('../index');

(async () => {
  const someArrayHere = []
  const lX = 100
  const lY = 100
  for (let y = 0; y < lY; y++) {
    for (let x = 0; x < lX; x++) {
      someArrayHere[y * lX + x] = Math.floor(255 * Math.random())
    }
  }

  const kernelSync = {
    prepare () {
      this.bcrypt = require('bcrypt')
    },
    main (value) {
      const data = Math.pow(value, 2).toString()

      return this.bcrypt.hashSync(data, 3)
    }
  }

  const kernelAsync = {
    prepare () {
      this.bcrypt = require('bcrypt')
    },
    main (value) {
      const data = Math.pow(value, 2).toString()

      return new Promise(resolve => {
        this.bcrypt.hash(data, 3, (err, data) => resolve(data))
      })
    }
  }

  // Multi-threaded + async
  console.info('Test:', 'Multi-threaded async')
  let tTest1Start = Date.now()
  let tTest1Results = await Distributed.map(someArrayHere, kernelAsync)
  let tTest1End = Date.now()
  let tTest1Diff = tTest1End - tTest1Start

  // Single-threaded + async
  console.info('Test:', 'Single-threaded async')
  let tTest2Start = Date.now()
  let tTest2Results = await Distributed.map(someArrayHere, kernelAsync, 1)
  let tTest2End = Date.now()
  let tTest2Diff = tTest2End - tTest2Start

  // Multi-threaded + sync
  console.info('Test:', 'Multi-threaded sync')
  let tTest3Start = Date.now()
  let tTest3Results = await Distributed.map(someArrayHere, kernelSync)
  let tTest3End = Date.now()
  let tTest3Diff = tTest3End - tTest3Start

  // Single-threaded + sync
  console.info('Test:', 'Single-threaded sync')
  let tTest4Start = Date.now()
  let tTest4Results = await Distributed.map(someArrayHere, kernelSync, 1)
  let tTest4End = Date.now()
  let tTest4Diff = tTest4End - tTest4Start

  // Standard + sync
  console.info('Test:', 'Array.map sync')
  let tTest5Start = Date.now()
  kernelSync.prepare.apply(kernelSync, [])
  let tTest5Results = someArrayHere.map(data => kernelSync.main.apply(kernelSync, [data]))
  let tTest5End = Date.now()
  let tTest5Diff = tTest5End - tTest5Start

  //console.log(someArrayHere, tTest1Results, tTest2Results)

  // Show results
  console.table([
    ['Multi-threaded', 'async', tTest1Diff],
    ['Multi-threaded', 'sync', tTest3Diff],
    ['Single-threaded', 'async', tTest2Diff],
    ['Single-threaded', 'sync', tTest4Diff],
    ['Array.map()', 'sync', tTest5Diff],
  ])

  // Exit
  process.exit(0)
})()