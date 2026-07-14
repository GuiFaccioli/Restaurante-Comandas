'use client'

import type { ComponentProps } from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@/lib/utils'

const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipProvider = TooltipPrimitive.Provider

type TooltipContentProps = ComponentProps<typeof TooltipPrimitive.Popup> & {
  sideOffset?: ComponentProps<
    typeof TooltipPrimitive.Positioner
  >['sideOffset']
}

function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner className="z-50" sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          role="tooltip"
          data-slot="tooltip-content"
          className={cn(
            'max-w-xs rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-sm',
            'transition-[opacity,transform] duration-150 ease-out',
            'data-starting-style:scale-[0.98] data-starting-style:opacity-0',
            'data-ending-style:scale-[0.98] data-ending-style:opacity-0',
            'data-instant:transition-none motion-reduce:transition-none',
            className
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
