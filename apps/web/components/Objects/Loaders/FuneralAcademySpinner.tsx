'use client'

type FuneralAcademySpinnerProps = {
  size?: number
  className?: string
}

function FuneralAcademySpinner({ size = 44, className = '' }: FuneralAcademySpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full animate-spin"
        style={{
          border: '2.5px solid transparent',
          borderTopColor: '#a1a1aa',
          animationDuration: '0.9s',
        }}
      />
    </div>
  )
}

export default FuneralAcademySpinner
