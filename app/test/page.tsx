'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import Card from '@/components/ui/card'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">shadcn/ui Test Page</h1>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Button Variants</h2>

          <div className="flex flex-wrap gap-4">
            <Button>Default Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Button Sizes</h2>

          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Card Example</h2>

          <Card title={"Sample Card"} description={"This is a sample card using shadcn/ui color tokens. If you can see proper dark theme colors, the styling is working!"}>
            <Button>Action Button</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}