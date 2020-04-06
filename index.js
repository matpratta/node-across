const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
const os = require('os')
const _ = require('lodash')

class Utils {
  static convertFunctionToString (fn) {
    // Gets the raw function source
    let fnSource = fn.toString()

    // Test for the first bracket
    let fnSourceFirstBracket = fnSource.indexOf('{')

    // Test for arrow functions
    let fnSourceFirstArrow = fnSource.indexOf('=>')

    // Split both parts
    let fnSourceBeforeBracket = fnSource.substr(0, fnSourceFirstBracket)

    // If we have a bracket first, convert the function to a arrow function
    if (!~fnSourceFirstArrow || (~fnSourceFirstBracket && fnSourceFirstBracket < fnSourceFirstArrow)) {
      // On this block we convert the function to arrow function

      // Gets the bracket part
      let fnSourceAfterBracket = fnSource.substr(fnSourceFirstBracket)
      
      if (fn.name && fn.name.length > 0) {
        // If our function has a name, we'll sanitize it first
        fnSourceBeforeBracket = fnSourceBeforeBracket.replace(fn.name, '')
      } else {
        // In case of anonymous functions, we do nothing
      }
      
      // Join both parts again, as anonymous function
      let fnSourceOutput = fnSourceBeforeBracket + (!~fnSourceBeforeBracket.indexOf('=>') ? ' => ' : ' ') + fnSourceAfterBracket
      
      // Returns the proper function
      return fnSourceOutput
    } else {
      // If we don't have a bracket, then we're probably dealing with a inline anonymous function, just skip all of this
      return fnSource
    }
  }

  static convertStringToFunction (fnString) {
    return eval(fnString)
  }
}

class Kernel {
  static fromDefinition (kernelDefinition) {
    // If our Kernel definition is a function, simply generate the structure with our function as the main()
    if ('function' == typeof kernelDefinition) {
      return Kernel.fromDefinition({ main: kernelDefinition })
    }

    // If our Kernel is a object, fill in the proper fields
    if ('object' == typeof kernelDefinition) {
      // Generate a new Kernel instance
      const kernel = new Kernel

      // Fill in the fields
      kernel.main = kernelDefinition.main
      kernel.prepare = kernelDefinition.prepare

      // Return the new instance
      return kernel
    }

    // Fails gracefully
    throw new Error ('Invalid Kernel definition. Please supply either a function for main() or a kernel definition object.')
  }
}

class Distributed {
  static async map (data, kernel, threads) {
    // Prepares the Kernel
    kernel = Kernel.fromDefinition(kernel)

    // How many threads should we spawn? Minimum one, default to CPU core number
    let useThreads = Math.max(1, threads || os.cpus().length)

    // The actual data length
    let dataLength = data.length

    // The optimum data length per thread
    let dataLengthPerThread = Math.ceil(dataLength / useThreads)

    // Partitions data for each thread
    let dataPerThread = _.chunk(data, dataLengthPerThread)

    // Creates the main Promise wrapping our main code
    return await new Promise((resolve, reject) => {
      // Keeps track of how much of the data was processed
      let countFinished = 0

      // Array containing the final, processed, results
      let finalResults = []

      // Loops for each thread we'll create
      for (let iThread = 0; iThread < dataPerThread.length; iThread++) {
        // Defines our thread's Worker
        const worker = new Worker(__filename, { workerData: data })

        // Calculates the memory offset for this worker, where it should start looking at data
        const workerMemoryOffset = iThread * dataLengthPerThread

        // When our setup is done, starts result processing
        worker.once('message', ({ ready }) => {
          if (ready) {
            // Starts listening for results
            worker.on('message', ({ index, data }) => {
              // Copy from the results object to results array
              finalResults[index] = data

              // Account for it
              countFinished++

              // Finally, if our finished threads match the number of threads...
              if (countFinished == dataLength) {
                // Kill the worker thread
                worker.terminate()

                // Resolve the promise
                resolve(finalResults)
              }
            })

            // Sends the data range to our worker
            worker.postMessage({
              index: workerMemoryOffset,
              length: dataPerThread[iThread].length
            })
          }
        })

        // Prepares the kernel
        let stub = (data) => { return data }
        let kernelProcessed = {
          prepare: Utils.convertFunctionToString(kernel.prepare || stub),
          main: Utils.convertFunctionToString(kernel.main || stub),
        }

        // Send setup message
        worker.postMessage({ kernel: kernelProcessed })
      }
    })
  }
}

if (isMainThread) {
  module.exports = {
    Utils,
    Distributed,
  }
} else {
  // Awaits for setup message
  parentPort.once('message', ({ kernel }) => {
    // Bring back our kernel to functions
    kernel.prepare = Utils.convertStringToFunction(kernel.prepare)
    kernel.main = Utils.convertStringToFunction(kernel.main)

    // Prepares our kernel
    kernel.prepare.apply(kernel, [])

    // Awaits for the data messages
    parentPort.on('message', ({ index, length }) => {
      // Processes each of the associated indexes from the workerData shared object
      for (let iData = index; iData < index + length; iData++) {
        // Queues the processing as the next thing on this thread's stack
        setImmediate(async () => {
          // Processes the kernel and gets its result into memory
          let kernelResult = kernel.main.apply(kernel, [workerData[iData]])

          // Handles promises gracefully
          kernelResult = await Promise.resolve(kernelResult)

          // Sends back the results to our caller thread
          parentPort.postMessage({ index: iData, data: kernelResult })
        })
      }
    })

    // Sends setup message just to signal 'ok'
    parentPort.postMessage({ ready: true })
  })
}