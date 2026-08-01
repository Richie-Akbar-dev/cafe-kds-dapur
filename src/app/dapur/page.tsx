'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Flame,
  CheckCircle2,
  X,
  ChefHat,
  Bell,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  notes: string | null
  menuItem: MenuItem
}

interface Order {
  id: string
  tableNumber: number
  status: string
  customerName: string | null
  notes: string | null
  totalPrice: number
  createdAt: string
  items: OrderItem[]
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; next: string | null; nextLabel: string | null }> = {
  pending: { label: 'Baru', icon: <Bell className="w-4 h-4" />, color: 'bg-yellow-50 border-yellow-300 border-l-4', next: 'preparing', nextLabel: 'Mulai Masak' },
  preparing: { label: 'Dimasak', icon: <Flame className="w-4 h-4" />, color: 'bg-orange-50 border-orange-300 border-l-4', next: 'ready', nextLabel: 'Siap Saji' },
  ready: { label: 'Siap', icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-green-50 border-green-300 border-l-4', next: 'served', nextLabel: 'Selesai Disajikan' },
  served: { label: 'Selesai', icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-gray-50 border-gray-300 border-l-4', next: null, nextLabel: null },
  cancelled: { label: 'Dibatalkan', icon: <X className="w-4 h-4" />, color: 'bg-red-50 border-red-300 border-l-4', next: null, nextLabel: null },
}

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit lalu`
  const hours = Math.floor(diffMins / 60)
  return `${hours} jam ${diffMins % 60} menit lalu`
}

export default function DapurPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<string>('active')
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e)
    }
  }, [])

  useEffect(() => {
    fetch('/api/seed', { method: 'POST' })

    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
    })

    socketRef.current = socketInstance

    socketInstance.on('connect', () => {
      setIsConnected(true)
      socketInstance.emit('kitchen-join')
    })

    socketInstance.on('disconnect', () => setIsConnected(false))

    socketInstance.on('new-order', (order: Order) => {
      setOrders((prev) => [order, ...prev])
    })

    socketInstance.on('order-status-update', () => {
      loadOrders()
    })

    const handleConnectAndLoad = () => {
      loadOrders()
    }
    socketInstance.on('connect', handleConnectAndLoad)

    // Polling fallback
    const pollInterval = setInterval(() => {
      if (!socketInstance.connected) {
        loadOrders()
      }
    }, 10000)

    return () => {
      socketInstance.off('connect', handleConnectAndLoad)
      socketInstance.disconnect()
      clearInterval(pollInterval)
    }
  }, [loadOrders])

  const updateStatus = async (orderId: string, newStatus: string, tableNumber: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        socketRef.current?.emit('order-status-update', { orderId, status: newStatus, tableNumber })
        loadOrders()
      }
    } catch (e) {
      console.error('Failed to update status:', e)
    }
  }

  const cancelOrder = async (orderId: string, tableNumber: number) => {
    await updateStatus(orderId, 'cancelled', tableNumber)
  }

  const activeOrders = orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status))
  const completedOrders = orders.filter((o) => ['served', 'cancelled'].includes(o.status))
  const displayOrders = activeTab === 'active' ? activeOrders : completedOrders

  const stats = {
    pending: activeOrders.filter((o) => o.status === 'pending').length,
    preparing: activeOrders.filter((o) => o.status === 'preparing').length,
    ready: activeOrders.filter((o) => o.status === 'ready').length,
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-600" />
            <h1 className="text-lg font-bold text-stone-800">Dapur</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-1 rounded-full', isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
              {isConnected ? 'Live' : 'Polling'}
            </span>
            <Button variant="ghost" size="icon" onClick={loadOrders}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className={cn('border-l-4', stats.pending > 0 ? 'border-yellow-400 bg-yellow-50' : 'border-stone-200')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              <p className="text-xs text-stone-500">Menunggu</p>
            </CardContent>
          </Card>
          <Card className={cn('border-l-4', stats.preparing > 0 ? 'border-orange-400 bg-orange-50' : 'border-stone-200')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-700">{stats.preparing}</p>
              <p className="text-xs text-stone-500">Dimasak</p>
            </CardContent>
          </Card>
          <Card className={cn('border-l-4', stats.ready > 0 ? 'border-green-400 bg-green-50' : 'border-stone-200')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.ready}</p>
              <p className="text-xs text-stone-500">Siap Saji</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-stone-200 rounded-lg p-1">
          <Button
            variant={activeTab === 'active' ? 'default' : 'ghost'}
            size="sm"
            className={cn('flex-1 rounded-md', activeTab === 'active' && 'bg-white shadow-sm text-stone-800')}
            onClick={() => setActiveTab('active')}
          >
            Aktif ({activeOrders.length})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            size="sm"
            className={cn('flex-1 rounded-md', activeTab === 'completed' && 'bg-white shadow-sm text-stone-800')}
            onClick={() => setActiveTab('completed')}
          >
            Riwayat ({completedOrders.length})
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <main className="max-w-4xl mx-auto px-4 pt-4 pb-8">
        <div className="grid gap-3 md:grid-cols-2">
          {displayOrders.map((order) => {
            const cfg = statusConfig[order.status] || statusConfig.pending
            return (
              <Card key={order.id} className={cn('overflow-hidden', cfg.color)}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Meja {order.tableNumber}</CardTitle>
                      <Badge className={cn('text-xs', statusBadge[order.status])}>
                        {cfg.icon} {cfg.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-stone-400">{timeAgo(order.createdAt)}</span>
                  </div>
                  {order.customerName && (
                    <p className="text-xs text-stone-500 mt-0.5">Pelanggan: {order.customerName}</p>
                  )}
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="space-y-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div className="flex-1">
                          <span className="font-medium text-stone-800">{item.menuItem.name}</span>
                          <span className="text-stone-500 ml-1">x{item.quantity}</span>
                          {item.notes && (
                            <p className="text-xs text-amber-600 mt-0.5">Catatan: {item.notes}</p>
                          )}
                        </div>
                        <span className="text-stone-600 text-xs whitespace-nowrap ml-2">
                          {formatRupiah(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <p className="text-xs text-stone-500 mt-2 italic">Catatan: {order.notes}</p>
                  )}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-stone-800">{formatRupiah(order.totalPrice)}</p>
                    <div className="flex gap-1.5">
                      {order.status !== 'cancelled' && order.status !== 'served' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                          onClick={() => cancelOrder(order.id, order.tableNumber)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Batalkan
                        </Button>
                      )}
                      {cfg.next && cfg.nextLabel && (
                        <Button
                          size="sm"
                          className={cn(
                            'h-7 text-xs',
                            cfg.next === 'preparing' && 'bg-orange-600 hover:bg-orange-700 text-white',
                            cfg.next === 'ready' && 'bg-green-600 hover:bg-green-700 text-white',
                            cfg.next === 'served' && 'bg-stone-600 hover:bg-stone-700 text-white'
                          )}
                          onClick={() => updateStatus(order.id, cfg.next!, order.tableNumber)}
                        >
                          {cfg.next === 'preparing' && <Flame className="w-3 h-3 mr-1" />}
                          {cfg.next === 'ready' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {cfg.next === 'served' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {cfg.nextLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        {displayOrders.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <ChefHat className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Tidak ada pesanan</p>
            <p className="text-sm mt-1">Pesanan baru akan muncul secara real-time</p>
          </div>
        )}
      </main>
    </div>
  )
}
