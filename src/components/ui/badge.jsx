import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm",
        secondary:
          "border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700",
        outline: "text-emerald-900 border-emerald-300",
        success: "border-transparent bg-green-600 text-white",
        warning: "border-transparent bg-yellow-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
