import type { ButtonProps, ButtonStyleProps } from '../../components/ui/button'

const semantic: ButtonProps = {
  intent: 'positive',
  appearance: 'solid',
}
const legacy: ButtonProps = { variant: 'success' }
const variantInput: ButtonStyleProps = { className: 'type-fixture' }

// @ts-expect-error legacy aliases cannot be mixed with semantic props
const mixedIntent: ButtonProps = { variant: 'success', intent: 'positive' }

const mixedAppearance: ButtonProps = {
  variant: 'outline',
  // @ts-expect-error legacy aliases cannot be mixed with semantic appearance
  appearance: 'outline',
}

void [semantic, legacy, variantInput, mixedIntent, mixedAppearance]
