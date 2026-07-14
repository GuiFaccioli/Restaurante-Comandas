import { describe, expect, it } from 'vitest'

import { nextCategoryIdAfterDeletion } from '@/lib/admin/category-selection'

const categories = [{ id: 'cat-1' }, { id: 'cat-2' }, { id: 'cat-3' }]

describe('nextCategoryIdAfterDeletion', () => {
  it('uses the next category when the selected category is deleted', () => {
    expect(nextCategoryIdAfterDeletion(categories, 'cat-2', 'cat-2')).toBe('cat-3')
  })

  it('uses the previous category when the deleted selection was last', () => {
    expect(nextCategoryIdAfterDeletion(categories, 'cat-3', 'cat-3')).toBe('cat-2')
  })

  it('clears selection when the deleted category was the only category', () => {
    expect(
      nextCategoryIdAfterDeletion([{ id: 'cat-1' }], 'cat-1', 'cat-1')
    ).toBe('')
  })

  it('preserves selection when a different category is deleted', () => {
    expect(nextCategoryIdAfterDeletion(categories, 'cat-1', 'cat-3')).toBe('cat-3')
  })
})
