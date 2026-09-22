import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base: pill chip — consistent height, centered text, 600 weight, 180ms transition
  "whitespace-nowrap inline-flex items-center justify-center rounded-sm border " +
  "h-5 px-2 text-xs font-semibold " +
  "transition-all duration-[180ms] ease-out " +
  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 " +
  "hover-elevate",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground " +
          "shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground " +
          "shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
        outline:
          "text-foreground [border-color:var(--badge-outline)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
