import * as React from "react"
import { cn } from "@/lib/utils"

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { title, description, className, children, ...props }: CardProps,
  ref
) {
  return (
    <div ref={ref} className={cn("bg-card rounded-lg p-6 border border-border", className)} {...props}>
      {title && <h3 className="text-xl font-semibold text-card-foreground mb-2">{title}</h3>}
      {description && <p className="text-muted-foreground mb-4">{description}</p>}
      {children}
    </div>
  )
})


export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("leading-none tracking-tight", className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
}

export default Card
