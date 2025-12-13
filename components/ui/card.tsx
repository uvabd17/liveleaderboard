import * as React from "react"
import { cn } from "@/lib/utils"

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
}

export function Card({ title, description, className, children, ...props }: CardProps) {
  return (
    <div className={cn("bg-card rounded-lg p-6 border border-border", className)} {...props}>
      {title && <h3 className="text-xl font-semibold text-card-foreground mb-2">{title}</h3>}
      {description && <p className="text-muted-foreground mb-4">{description}</p>}
      {children}
    </div>
  )
}

export default Card
