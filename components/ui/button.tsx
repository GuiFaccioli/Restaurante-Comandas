import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type ButtonIntent =
  | 'neutral'
  | 'positive'
  | 'informational'
  | 'warning'
  | 'destructive'

export type ButtonAppearance = 'solid' | 'soft' | 'outline' | 'ghost' | 'link'
export type ButtonSize =
  | 'default'
  | 'xs'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg'

export type LegacyButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'link'

type SharedStyleProps = { size?: ButtonSize; className?: string }
type SemanticStyleProps = {
  intent?: ButtonIntent
  appearance?: ButtonAppearance
  variant?: never
}
type LegacyStyleProps = {
  variant: LegacyButtonVariant
  intent?: never
  appearance?: never
}

export type ButtonStyleProps = SharedStyleProps & (SemanticStyleProps | LegacyStyleProps)
type WithoutClassName<T> = T extends unknown ? Omit<T, 'className'> : never
export type ButtonProps = Omit<ComponentProps<typeof ButtonPrimitive>, 'className'> & WithoutClassName<ButtonStyleProps> & Pick<ComponentProps<typeof ButtonPrimitive>, 'className'>

const legacyVariantMap = {
  default: { intent: 'neutral', appearance: 'solid' },
  outline: { intent: 'neutral', appearance: 'outline' },
  secondary: { intent: 'neutral', appearance: 'soft' },
  ghost: { intent: 'neutral', appearance: 'ghost' },
  destructive: { intent: 'destructive', appearance: 'soft' },
  success: { intent: 'positive', appearance: 'solid' },
  link: { intent: 'neutral', appearance: 'link' },
} as const satisfies Record<
  LegacyButtonVariant,
  { intent: ButtonIntent; appearance: ButtonAppearance }
>

const actionSemantics = cva(
  'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:border-[var(--action-disabled-border)] disabled:bg-[var(--action-disabled)] disabled:text-[var(--action-disabled-foreground)] disabled:opacity-100 data-disabled:border-[var(--action-disabled-border)] data-disabled:bg-[var(--action-disabled)] data-disabled:text-[var(--action-disabled-foreground)] data-disabled:opacity-100 aria-disabled:border-[var(--action-disabled-border)] aria-disabled:bg-[var(--action-disabled)] aria-disabled:text-[var(--action-disabled-foreground)] aria-disabled:opacity-100 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
  {
    variants: {
      intent: {
        neutral:
          '[--button-solid:var(--action-neutral)] [--button-solid-hover:var(--action-neutral-hover)] [--button-solid-foreground:var(--action-neutral-solid-foreground)] [--button-soft:var(--action-neutral-soft)] [--button-soft-hover:var(--action-neutral-soft-hover)] [--button-foreground:var(--action-neutral-foreground)] [--button-outline:var(--action-neutral-outline)]',
        positive:
          '[--button-solid:var(--action-positive)] [--button-solid-hover:var(--action-positive-hover)] [--button-solid-foreground:var(--action-positive-solid-foreground)] [--button-soft:var(--action-positive-soft)] [--button-soft-hover:var(--action-positive-soft-hover)] [--button-foreground:var(--action-positive-foreground)] [--button-outline:var(--action-positive-outline)]',
        informational:
          '[--button-solid:var(--action-informational)] [--button-solid-hover:var(--action-informational-hover)] [--button-solid-foreground:var(--action-informational-solid-foreground)] [--button-soft:var(--action-informational-soft)] [--button-soft-hover:var(--action-informational-soft-hover)] [--button-foreground:var(--action-informational-foreground)] [--button-outline:var(--action-informational-outline)]',
        warning:
          '[--button-solid:var(--action-warning)] [--button-solid-hover:var(--action-warning-hover)] [--button-solid-foreground:var(--action-warning-solid-foreground)] [--button-soft:var(--action-warning-soft)] [--button-soft-hover:var(--action-warning-soft-hover)] [--button-foreground:var(--action-warning-soft-foreground)] [--button-outline:var(--action-warning-outline)]',
        destructive:
          '[--button-solid:var(--action-destructive)] [--button-solid-hover:var(--action-destructive-hover)] [--button-solid-foreground:var(--action-destructive-solid-foreground)] [--button-soft:var(--action-destructive-soft)] [--button-soft-hover:var(--action-destructive-soft-hover)] [--button-foreground:var(--action-destructive-foreground)] [--button-outline:var(--action-destructive-outline)]',
      },
      appearance: {
        solid:
          'bg-[var(--button-solid)] text-[var(--button-solid-foreground)] hover:bg-[var(--button-solid-hover)]',
        soft:
          'bg-[var(--button-soft)] text-[var(--button-foreground)] hover:bg-[var(--button-soft-hover)]',
        outline:
          'border-[var(--button-outline)] bg-background text-[var(--button-outline)] hover:bg-[var(--button-soft)]',
        ghost:
          'bg-transparent text-[var(--button-outline)] hover:bg-[var(--button-soft)]',
        link:
          'bg-transparent text-[var(--button-outline)] underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      intent: 'neutral',
      appearance: 'solid',
    },
  }
)

const buttonGeometry = cva(
  'group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium leading-[1.3] whitespace-nowrap select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed data-disabled:pointer-events-none data-disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      size: {
        default:
          'h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        xs: 'h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*=size-])]:size-3',
        sm: 'h-9 gap-1 rounded-full px-4 text-sm [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-12 gap-1.5 px-6',
        icon: 'size-11',
        'icon-xs': 'size-11 rounded-md [&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'size-11 rounded-md [&_svg:not([class*=size-])]:size-3.5',
        'icon-lg': 'size-11 [&_svg:not([class*=size-])]:size-5',
      },
    },
    defaultVariants: { size: 'default' },
  }
)

function resolveButtonSemantics(props: ButtonStyleProps) {
  if (props.variant) return legacyVariantMap[props.variant]
  return {
    intent: props.intent ?? 'neutral',
    appearance: props.appearance ?? 'solid',
  }
}

function buttonVariants(props: ButtonStyleProps = {}) {
  const { intent, appearance } = resolveButtonSemantics(props)
  return cn(
    buttonGeometry({ size: props.size ?? 'default' }),
    actionSemantics({ intent, appearance }),
    props.className
  )
}

function Button({
  className,
  size = 'default',
  variant,
  intent,
  appearance,
  disabled,
  'aria-busy': ariaBusy,
  ...props
}: ButtonProps) {
  const isBusy = ariaBusy === true || ariaBusy === 'true'
  const classNames = variant
    ? buttonVariants({ variant, size })
    : buttonVariants({ intent, appearance, size })
  const composedClassName =
    typeof className === 'function'
      ? (state: ButtonPrimitive.State) => cn(classNames, className(state))
      : cn(classNames, className)

  return (
    <ButtonPrimitive
      data-slot="button"
      className={composedClassName}
      disabled={disabled || isBusy}
      aria-busy={ariaBusy}
      {...props}
    />
  )
}

export { actionSemantics, Button, buttonVariants }
