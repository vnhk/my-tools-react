import React from 'react'
import React from 'react'
import React from 'react'

type RowSelectCheckboxProps = {
  checked: boolean
  onChange: () => void
  title?: string
}

export function RowSelectCheckbox({ checked, onChange, title = 'Select' }: RowSelectCheckboxProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} title={title}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, cursor: 'pointer' }}
      />
    </label>
  )
}

export default RowSelectCheckbox
type RowSelectCheckboxProps = {
  checked: boolean
  onChange: () => void
  title?: string
}

export function RowSelectCheckbox({ checked, onChange, title = 'Select' }: RowSelectCheckboxProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} title={title}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, cursor: 'pointer' }}
      />
    </label>
  )
}

export default RowSelectCheckbox
type RowSelectCheckboxProps = {
  checked: boolean
  onChange: () => void
  title?: string
}

export function RowSelectCheckbox({ checked, onChange, title = 'Select' }: RowSelectCheckboxProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} title={title}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, cursor: 'pointer' }}
      />
    </label>
  )
}

export default RowSelectCheckbox
