import { useState } from 'react'

const MAX_INT_DIGITS = 9
const MAX_DECIMALS = 2

export function useAmountInput(initial = '0') {
  const [value, setValue] = useState(initial)

  const handleKey = (key: string) => {
    setValue((prev) => {
      if (key === 'clear') return '0'
      if (key === 'del') {
        const next = prev.slice(0, -1)
        return next === '' ? '0' : next
      }
      if (key === '.') {
        return prev.includes('.') ? prev : `${prev}.`
      }
      // digit
      const [intPart, decPart] = prev.split('.')
      if (decPart !== undefined) {
        if (decPart.length >= MAX_DECIMALS) return prev
        return prev + key
      }
      if (intPart === '0') return key === '0' ? prev : key
      if (intPart.length >= MAX_INT_DIGITS) return prev
      return prev + key
    })
  }

  const reset = () => setValue('0')

  return { value, handleKey, setValue, reset, numeric: Number(value) || 0 }
}
