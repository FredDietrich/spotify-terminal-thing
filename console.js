const reset = '\x1b[0m'
export const red = ([arg]) => console.log('\x1b[31m' + arg + reset)
export const green = ([arg]) => console.log('\x1b[32m' + arg + reset)
export const yellow = ([arg]) => console.log('\x1b[33m' + arg + reset)
