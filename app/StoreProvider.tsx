'use client'
import { useState } from 'react'
import { Provider } from 'react-redux'
import { store, RootState} from '@/redux/store'

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // Create the store instance the first time this renders
  return <Provider store={store}>{children}</Provider>
}