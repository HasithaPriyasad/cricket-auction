'use client'
import s from '@/features/report/report.module.css'

export default function PrintButton() {
  return (
    <button className={s.printBtn} onClick={() => window.print()}>
      Print / Save PDF
    </button>
  )
}
