interface FormulaInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function FormulaInput({ value, onChange, placeholder }: FormulaInputProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="formula-input font-mono text-sm min-h-[80px] resize-y"
      rows={3}
    />
  )
}
