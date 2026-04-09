'use client'
import { useState, useEffect, useCallback } from 'react'
const getProvider = () => {
    if (typeof window === 'undefined') return null
    return window.okxwallet || window.ethereum || null
}

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null)
    const [connecting, setConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Check if already connected
    useEffect(() => {
        const provider = getProvider()
        if (!provider) return
        provider.request({ method: 'eth_accounts' })
            .then((accounts: string[]) => {
                if (accounts.length > 0) setAddress(accounts[0])
            })
            .catch(() => { })
    }, [])

    const connect = useCallback(async () => {
        const provider = getProvider()
        if (!provider) {
            setError('OKX Wallet not found. Please install the extension.')
            return
        }
        setConnecting(true)
        setError(null)
        try {
            // Request accounts
            const accounts = await provider.request({ method: 'eth_requestAccounts' })           
             setAddress(accounts[0])

            // Switch to X Layer
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xc4' }], // 196 in hex
        })
      } catch (switchError: any) {
        // Chain not added yet — add it
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xc4',
              chainName: 'X Layer',
              nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
              rpcUrls: ['https://rpc.xlayer.tech'],
              blockExplorerUrls: ['https://web3.okx.com/explorer/x-layer'],
            }],
          })
        }
      }
        } catch (err: any) {
            setError(err.message || 'Failed to connect')
        } finally {
            setConnecting(false)
        }
    }, [])

    const disconnect = useCallback(() => {
        setAddress(null)
    }, [])

    return { address, connecting, error, connect, disconnect }
}